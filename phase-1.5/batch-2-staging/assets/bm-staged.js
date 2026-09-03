/* Bricks Marvella — Phase 1.5 BATCH 2 JS (staging; deferred).
   A) hero-video gate: skip the stream where it hurts (saveData / <=4 cores /
      reduced motion) — poster stays, layout untouched.
   B) YouTube click-to-load facades (the iframes are LiteSpeed-lazy already;
      this defers the ~1 MB player until intent and keeps the layout box).
   Both replace existing behaviour — verify on staging: hero still plays on a
   normal desktop connection, and each video plays on click. */
(function () {
  'use strict';

  /* ---------- A. hero video gate ---------- */
  var gate =
    (navigator.connection && navigator.connection.saveData) ||
    (navigator.hardwareConcurrency || 8) <= 4 ||
    (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function killHeroVideo() {
    try {
      var v = document.querySelector('rs-module video, .edgtf-slider video');
      if (!v) { return; }
      v.pause();
      v.removeAttribute('src');
      Array.prototype.forEach.call(v.querySelectorAll('source'), function (s) { s.remove(); });
      v.load();
      v.style.display = 'none';
    } catch (e) { /* revslider not ready yet; later timer retries */ }
  }
  if (gate) {
    // revslider builds the video element late; retry across its init window.
    [0, 2500, 6000, 12000].forEach(function (t) { setTimeout(killHeroVideo, t); });
  }

  /* ---------- B. YouTube facades ---------- */
  function buildFacades() {
    var frames = document.querySelectorAll('iframe[data-src*="youtube.com/embed"], iframe[src*="youtube.com/embed"]');
    Array.prototype.forEach.call(frames, function (f) {
      var src = f.getAttribute('data-src') || f.getAttribute('src') || '';
      var m = src.match(/embed\/([\w-]{6,})/);
      if (!m) { return; }
      var id = m[1];
      var label = 'Play video: ' + (f.title || 'YouTube video');

      var box = document.createElement('button');
      box.type = 'button';
      box.className = 'bm-yt-facade';
      box.setAttribute('aria-label', label);
      box.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + id + '/hqdefault.jpg)';
      box.style.aspectRatio = (f.width && f.height) ? (f.width + ' / ' + f.height) : '16 / 9';
      var play = document.createElement('span');
      play.className = 'bm-yt-play';
      play.setAttribute('aria-hidden', 'true');
      box.appendChild(play);

      f.parentNode.insertBefore(box, f);
      f.remove(); // removed before LiteSpeed lazyload would ever activate it

      box.addEventListener('click', function () {
        var n = document.createElement('iframe');
        n.src = src + (src.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1';
        n.title = label;
        n.className = 'bm-yt-iframe';
        n.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        n.setAttribute('allowfullscreen', '');
        box.replaceWith(n);
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildFacades);
  } else {
    buildFacades();
  }
})();
