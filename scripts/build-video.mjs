/**
 * The 360 flythrough, cut down to something a homepage can afford.
 *
 * The source render is 1920x1080 for 10 seconds at 24 fps and 10 Mbps —
 * 11.9 MB. CRF is the right control here rather than a bitrate target: a slow
 * drone move over static geometry compresses far better than a constant-rate
 * guess assumes.
 *
 * The audio track is dropped outright. The section autoplays, and autoplay only
 * works muted, so the AAC stream is bytes nobody can ever hear.
 *
 * BOTH rungs are 1920x1080 — they differ only in CRF, not in resolution.
 * That is deliberate and was a correction: the mobile rung used to be 1280x720,
 * but the section covers the viewport, and covering a PORTRAIT phone with
 * landscape footage scales it by the height. A 720-tall file on a 390pt screen
 * at DPR 3 is upscaled about 3.3x, which no CRF setting can compensate for.
 * Full resolution at crf 31 costs 2.6 MB — about what 720p at crf 26 cost — and
 * looks far better, because resolution, not quantisation, was the binding
 * constraint on a phone.
 *
 * The ceiling on all of this is the source: 1920x1080 is all there is, so on a
 * 2x display the film is upscaled roughly 2x no matter what is done here. That
 * needs a larger render from the developer, not a better encode.
 *
 * Run: node scripts/build-video.mjs
 */
import { execFileSync } from 'node:child_process';
import { statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'Sequence 02_gwr_video_mvp.mp4');
const OUT = path.join(ROOT, 'public', 'videos');

const run = (args) => execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const mb = (f) => (statSync(f).size / 1048576).toFixed(2) + ' MB';

/**
 * `veryslow` because this runs once at build time and buys real bytes back on
 * an 8-second clip. `aq-mode=3` biases quantisation toward dark areas, which is
 * most of a night render — it is close to free (+0.02 MB) and is the only x264
 * tuning that measured better than default here; psy-rd and a raised
 * aq-strength both cost more than they returned.
 */
const encode = (crf, name) => {
  const out = path.join(OUT, name);
  run(['-i', SRC,
    '-an',
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryslow',
    '-crf', String(crf), '-g', '48', '-pix_fmt', 'yuv420p',
    '-x264-params', 'aq-mode=3',
    '-movflags', '+faststart',
    out]);
  console.log(name.padEnd(22), mb(out));
};

encode(24, 'views-1080.mp4');    // desktop
encode(31, 'views-mobile.mp4');  // same pixels, cheaper — see the note above

/**
 * Frame 0 as the poster — WebP only, deliberately. The `poster` attribute takes
 * ONE url and has no fallback, so an AVIF here would be a file no browser that
 * failed to decode it could recover from; WebP is understood everywhere this
 * site supports. Frame 0 rather than a prettier frame because the video starts
 * at frame 0, and any other choice shows a visible jump on play.
 *
 * Emitted at the source's full width: it is what the reader looks at until the
 * video has buffered, so downscaling it just puts a soft frame first.
 */
const raw = path.join(OUT, '_frame.png');
run(['-i', SRC, '-frames:v', '1', raw]);
await sharp(raw).webp({ quality: 88 }).toFile(path.join(OUT, 'views-poster.webp'));
console.log('views-poster.webp'.padEnd(22), mb(path.join(OUT, 'views-poster.webp')));
unlinkSync(raw);

console.log('\nsource', mb(SRC));
