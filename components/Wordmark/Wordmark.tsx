import { site, logos } from '@/lib/content';

/**
 * The Marvella lockup, in the ONE place that defines it.
 *
 * Three boxes have to agree on it and they are in two different components:
 * the fixed mark that flies between hero and bar, the hidden slot in the bar
 * that reserves the mark's footprint, and the hidden slot in the hero that
 * marks where it should sit while the hero is on screen. The nav measures the
 * hero's box to compute the flight, so if any of the three differs the mark
 * lands somewhere other than where the layout reserved for it — which is
 * exactly what happened while the hero slot was still the site's NAME in type:
 * a 508px-wide text box against a 341px-wide logo, so the mark floated 84px
 * short of the right margin it was supposed to sit on.
 *
 * The height is in em so the whole thing scales with font-size, which is what
 * the scroll timeline animates. Nothing here needs to know about that.
 */
export default function Wordmark() {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${logos.marvellaFlat}-300.avif 300w, ${logos.marvellaFlat}-600.avif 600w`}
        sizes="(max-width: 767px) 180px, 420px"
      />
      <source
        type="image/webp"
        srcSet={`${logos.marvellaFlat}-300.webp 300w, ${logos.marvellaFlat}-600.webp 600w`}
        sizes="(max-width: 767px) 180px, 420px"
      />
      <img src={`${logos.marvellaFlat}-600.webp`} alt={site.name} width={600} height={212} />
    </picture>
  );
}
