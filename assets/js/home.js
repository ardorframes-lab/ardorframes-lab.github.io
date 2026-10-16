// Ardor Frames Lab home (promoted from directions/a-monolith).
// Hero: pause the cube's breathing light while the hero is off screen.
// Demo slot: if the <source data-src> values are filled in, load the
//    recording when it nears the viewport, play it only while visible,
//    and offer a play/pause button. Reduced motion: no autoplay, and turning
//    the setting on while playing pauses the video (checked live, not once).
//    With no recording the static placeholder stays.
// The language menu is not handled here: see /assets/js/lang.js.
// Button labels come from data-label-pause / data-label-play on [data-demo]
// (English defaults), so /ko/ can supply Korean.
(function () {
  var hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    var root = document.documentElement;
    new IntersectionObserver(function (entries) {
      root.classList.toggle('is-hero-offscreen', !entries[0].isIntersecting);
    }).observe(hero);
  }

  var demo = document.querySelector('[data-demo]');
  if (!demo) return;
  var video = demo.querySelector('video');
  var button = demo.querySelector('.demo-toggle');
  var sources = Array.prototype.slice.call(video.querySelectorAll('source[data-src]'));
  var filled = sources.filter(function (s) { return s.getAttribute('data-src').trim() !== ''; });
  if (!filled.length) return;   // placeholder only: the empty <video> stays hidden
  sources.forEach(function (s) { if (filled.indexOf(s) < 0) s.remove(); });  // unfilled sources would fire error events

  var labelPause = demo.getAttribute('data-label-pause') || 'Pause demo';
  var labelPlay = demo.getAttribute('data-label-play') || 'Play demo';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var loaded = false;
  var userPaused = false;   // true once the viewer pauses, or when reduced motion is set

  function setState(playing) {
    demo.classList.toggle('is-paused', !playing);
    button.setAttribute('aria-label', playing ? labelPause : labelPlay);
  }
  function load() {
    if (loaded) return;
    loaded = true;
    filled.forEach(function (s) { s.src = s.getAttribute('data-src'); });
    var poster = video.getAttribute('data-poster');
    if (poster) video.poster = poster;
    video.preload = 'auto';
    video.load();
  }
  function play() {
    var p = video.play();
    if (p && p.catch) p.catch(function () { setState(false); });
  }
  function fail() {
    if (!loaded) return;                  // sources without src fire a harmless error before load()
    demo.classList.remove('has-video');   // back to the placeholder
  }

  demo.classList.add('has-video');
  userPaused = reduce.matches;
  setState(false);
  function onReduce() {
    if (!reduce.matches) return;
    userPaused = true;
    if (!video.paused) video.pause();
  }
  if (reduce.addEventListener) reduce.addEventListener('change', onReduce);
  else if (reduce.addListener) reduce.addListener(onReduce);
  video.addEventListener('play', function () { setState(true); });
  video.addEventListener('pause', function () { setState(false); });
  video.addEventListener('error', fail);                        // when no <source> is usable
  filled[filled.length - 1].addEventListener('error', fail);    // last candidate failed

  button.addEventListener('click', function () {
    if (video.paused) { userPaused = false; load(); play(); }
    else { userPaused = true; video.pause(); }
  });
  video.addEventListener('click', function () { button.click(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible) { load(); if (!userPaused && !reduce.matches) play(); }
      else if (!video.paused) video.pause();   // keeps userPaused as it was
    }, { threshold: 0.4 }).observe(video);
  } else {
    load();
  }
})();
