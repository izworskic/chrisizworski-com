/* River cameras: a click-to-play facade for operators' YouTube live streams. Nothing loads from
 * YouTube until the visitor presses play, then a privacy-enhanced (youtube-nocookie) player opens
 * muted. Without JavaScript the static link to the stream still works. */
(function () {
  'use strict';
  document.querySelectorAll('[data-river-cam]').forEach(function (box) {
    var id = box.getAttribute('data-yt');
    var title = box.getAttribute('data-title') || 'Live river camera';
    var stage = box.querySelector('[data-river-cam-stage]');
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id) || !stage) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rsw-cam-play';
    btn.innerHTML = '<span class="rsw-cam-glyph" aria-hidden="true">▶</span><span><strong>Play the live camera</strong><small>Opens a muted YouTube player</small></span>';
    btn.setAttribute('aria-label', 'Play live camera: ' + title);
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&playsinline=1&rel=0';
      f.title = title;
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.loading = 'lazy';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      stage.innerHTML = '';
      stage.appendChild(f);
      box.setAttribute('data-state', 'playing');
      f.focus();
    });
    stage.innerHTML = '';
    stage.appendChild(btn);
    box.setAttribute('data-js', '');
  });
})();
