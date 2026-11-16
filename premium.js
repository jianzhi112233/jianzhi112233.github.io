(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const manualMotionOff = new URLSearchParams(window.location.search).get('motion') === 'off';
  const manualMotionOn = new URLSearchParams(window.location.search).get('motion') === 'on';
  const sceneStates = new Map();
  const stepStates = new Map();

  function syncVideo(scene, playing, motionOff) {
    const video = scene.querySelector('video');
    if (!video || scene.classList.contains('is-video-error')) return;
    video.muted = true;
    video.autoplay = playing;
    if (!playing) {
      video.pause();
      if (motionOff) scene.classList.remove('has-video-frame');
      return;
    }
    if (!video.paused) {
      if (video.readyState >= 2) scene.classList.add('has-video-frame');
      return;
    }
    const playback = video.play();
    playback?.catch(error => {
      if (error.name !== 'AbortError') scene.dataset.videoState = 'poster';
    });
  }

  function syncScenes() {
    const motionOff = manualMotionOff || (!manualMotionOn && preference.matches);
    document.documentElement.classList.toggle('motion-on', manualMotionOn);
    document.documentElement.classList.toggle('motion-off', motionOff);
    for (const [scene, state] of sceneStates) {
      const panel = scene.closest('.tab-panel');
      const playing = state.inView && !panel?.inert && !document.hidden && !motionOff;
      scene.classList.toggle('is-scene-visible', state.inView);
      scene.classList.toggle('is-motion-paused', !playing);
      scene.dataset.motionState = playing ? 'playing' : 'paused';
      syncVideo(scene, playing, motionOff);
    }
    for (const [image, state] of stepStates) {
      const animated = state.inView && !document.hidden && !motionOff;
      const source = animated ? image.dataset.animatedSrc : image.dataset.stillSrc;
      if (image.getAttribute('src') !== source) image.src = source;
      image.dataset.motionState = animated ? 'playing' : 'paused';
    }
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) sceneStates.get(entry.target).inView = entry.isIntersecting;
    syncScenes();
  }, {threshold: .12}) : null;

  for (const scene of document.querySelectorAll('.premium-scene')) {
    sceneStates.set(scene, {inView: !observer, phase: 0});
    scene.querySelector('.scene-steps span')?.classList.add('is-current');
    scene.dataset.phase = '0';
    const video = scene.querySelector('video');
    if (video) {
      video.addEventListener('playing', () => {
        if (scene.dataset.motionState !== 'playing') {
          video.pause();
          return;
        }
        scene.classList.add('has-video-frame');
        scene.dataset.videoState = 'playing';
      });
      video.addEventListener('pause', () => scene.dataset.videoState = 'paused');
      const showFallback = () => {
        scene.classList.add('is-video-error');
        scene.dataset.videoState = 'error';
      };
      video.addEventListener('error', showFallback);
      video.querySelector('source')?.addEventListener('error', showFallback);
    }
    observer?.observe(scene);
  }

  const stepObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) stepStates.get(entry.target).inView = entry.isIntersecting;
    syncScenes();
  }, {threshold: .12}) : null;
  for (const image of document.querySelectorAll('.step-visual[data-animated-src]')) {
    stepStates.set(image, {inView: !stepObserver});
    stepObserver?.observe(image);
  }

  window.setInterval(() => {
    for (const [scene, state] of sceneStates) {
      if (scene.dataset.motionState !== 'playing') continue;
      const steps = [...scene.querySelectorAll('.scene-steps span')];
      if (!steps.length) continue;
      state.phase = (state.phase + 1) % steps.length;
      scene.dataset.phase = String(state.phase);
      steps.forEach((step, index) => step.classList.toggle('is-current', index === state.phase));
    }
  }, 2800);

  for (const group of document.querySelectorAll('[data-tabs]')) group.addEventListener('site-tab-change', syncScenes);
  preference.addEventListener('change', syncScenes);
  document.addEventListener('visibilitychange', syncScenes);
  syncScenes();

  if ('IntersectionObserver' in window) {
    const entranceObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-entered');
        entranceObserver.unobserve(entry.target);
      }
    }, {threshold: .15});
    document.querySelectorAll('.section-title, .section-head, .network-copy').forEach(element => entranceObserver.observe(element));
  }
})();
