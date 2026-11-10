(() => {
  const heroElement = document.querySelector('[data-carousel]');
  if (!heroElement) return;

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionOff = new URLSearchParams(window.location.search).get('motion') === 'off';
  const heroSlides = [...heroElement.querySelectorAll('.hero-slide')];
  const heroControls = [...heroElement.querySelectorAll('[data-hero-index]')];
  const heroScenes = [...heroElement.querySelectorAll('svg')];
  const themes = ['protection', 'waf', 'network'];
  const dwellDuration = 6200;
  const transitionDuration = 760;
  let selectedIndex = 0;
  let advanceTimer;
  let cleanupTimer;
  let sectionVisible = true;
  let keyboardFocus = false;

  function setSlideAccess(slide, selected) {
    slide.inert = !selected;
    slide.setAttribute('aria-hidden', String(!selected));
  }

  function isSuspended() {
    return motionOff || document.hidden || !sectionVisible || keyboardFocus;
  }

  function scheduleAdvance() {
    window.clearTimeout(advanceTimer);
    if (isSuspended() || heroSlides.length < 2) return;
    advanceTimer = window.setTimeout(advanceSlide, dwellDuration);
  }

  function advanceSlide() {
    if (isSuspended()) return;
    const outgoingSlide = heroSlides[selectedIndex];
    selectedIndex = (selectedIndex + 1) % heroSlides.length;
    const incomingSlide = heroSlides[selectedIndex];

    window.clearTimeout(cleanupTimer);
    heroSlides.forEach(slide => slide.classList.remove('is-leaving'));
    outgoingSlide.classList.add('is-leaving');
    outgoingSlide.classList.remove('is-active');
    setSlideAccess(outgoingSlide, false);
    incomingSlide.classList.add('is-active');
    setSlideAccess(incomingSlide, true);
    heroControls.forEach((control, index) => {
      const selected = index === selectedIndex;
      control.setAttribute('aria-selected', String(selected));
      control.tabIndex = selected ? 0 : -1;
    });
    heroElement.dataset.heroTheme = themes[selectedIndex] || themes[0];
    heroElement.dataset.heroSlide = String(selectedIndex);

    cleanupTimer = window.setTimeout(() => {
      outgoingSlide.classList.remove('is-leaving');
    }, transitionDuration);
    scheduleAdvance();
  }

  function selectSlide(index) {
    if (index < 0 || index >= heroSlides.length || index === selectedIndex) {
      scheduleAdvance();
      return;
    }
    const outgoingSlide = heroSlides[selectedIndex];
    const incomingSlide = heroSlides[index];
    selectedIndex = index;
    window.clearTimeout(cleanupTimer);
    heroSlides.forEach(slide => slide.classList.remove('is-leaving'));
    outgoingSlide.classList.add('is-leaving');
    outgoingSlide.classList.remove('is-active');
    setSlideAccess(outgoingSlide, false);
    incomingSlide.classList.add('is-active');
    setSlideAccess(incomingSlide, true);
    heroElement.dataset.heroTheme = themes[selectedIndex] || themes[0];
    heroElement.dataset.heroSlide = String(selectedIndex);
    heroControls.forEach((control, controlIndex) => {
      const selected = controlIndex === selectedIndex;
      control.setAttribute('aria-selected', String(selected));
      control.tabIndex = selected ? 0 : -1;
    });
    cleanupTimer = window.setTimeout(() => outgoingSlide.classList.remove('is-leaving'), transitionDuration);
    scheduleAdvance();
  }

  function synchronizePlayback() {
    const suspended = isSuspended();
    heroElement.classList.toggle('is-paused', suspended);
    heroElement.dataset.motionState = suspended ? 'paused' : 'playing';
    heroScenes.forEach(svgElement => {
      const animationMethod = suspended ? 'pauseAnimations' : 'unpauseAnimations';
      if (typeof svgElement[animationMethod] === 'function') svgElement[animationMethod]();
    });
    scheduleAdvance();
  }

  heroSlides.forEach((slide, index) => {
    slide.hidden = false;
    slide.classList.remove('is-entering');
    slide.classList.toggle('is-active', index === 0);
    setSlideAccess(slide, index === 0);
  });
  heroControls.forEach((control, index) => {
    control.addEventListener('click', () => selectSlide(index));
    control.addEventListener('keydown', event => {
      const positions = {
        ArrowRight: (index + 1) % heroControls.length,
        ArrowLeft: (index - 1 + heroControls.length) % heroControls.length,
        Home: 0,
        End: heroControls.length - 1
      };
      if (!(event.key in positions)) return;
      event.preventDefault();
      const nextIndex = positions[event.key];
      selectSlide(nextIndex);
      heroControls[nextIndex].focus();
    });
  });
  heroElement.dataset.heroTheme = themes[0];
  heroElement.dataset.heroSlide = '0';
  heroElement.classList.toggle('motion-off', motionOff);
  heroElement.setAttribute('aria-live', 'off');
  heroElement.classList.add('hero-motion-ready');

  heroElement.addEventListener('focusin', () => {
    keyboardFocus = heroElement.matches(':focus-within');
    synchronizePlayback();
  });
  heroElement.addEventListener('focusout', () => {
    queueMicrotask(() => {
      keyboardFocus = heroElement.matches(':focus-within');
      synchronizePlayback();
    });
  });
  document.addEventListener('visibilitychange', synchronizePlayback);
  preference.addEventListener('change', synchronizePlayback);

  if ('IntersectionObserver' in window) {
    const visibilityObserver = new IntersectionObserver(entries => {
      sectionVisible = entries[0].isIntersecting;
      synchronizePlayback();
    }, { threshold: 0.05 });
    visibilityObserver.observe(heroElement);
  }

  synchronizePlayback();
})();
