(() => {
  const motionOff = new URLSearchParams(window.location.search).get('motion') === 'off';
  document.documentElement.classList.toggle('motion-off', motionOff);

  for (const group of document.querySelectorAll('[data-tabs]')) {
    const tabList = group.querySelector('[role="tablist"]');
    const tabs = [...tabList.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    let activeIndex = -1;

    function activate(index) {
      if (index === activeIndex) return;
      activeIndex = index;
      tabList.style.setProperty('--active-tab', String(index));
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        const panel = panels[tabIndex];
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panel.setAttribute('aria-hidden', String(!selected));
        panel.inert = !selected;
      });
      group.dispatchEvent(new Event('site-tab-change'));
    }

    function linkedIndex() {
      return panels.findIndex(panel => window.location.hash === '#' + panel.id);
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', event => {
        event.preventDefault();
        activate(index);
      });
    });
    tabList.addEventListener('keydown', event => {
      const currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex < 0) return;
      if (event.key === ' ' && tabs[currentIndex].tagName === 'A') {
        event.preventDefault();
        activate(currentIndex);
        return;
      }
      const positions = {
        ArrowRight: (currentIndex + 1) % tabs.length,
        ArrowLeft: (currentIndex - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1
      };
      if (!(event.key in positions)) return;
      event.preventDefault();
      activate(positions[event.key]);
      tabs[positions[event.key]].focus();
    });
    const linked = linkedIndex();
    const initiallySelected = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    activate(linked >= 0 ? linked : Math.max(0, initiallySelected));
    window.addEventListener('hashchange', () => {
      const index = linkedIndex();
      if (index >= 0) activate(index);
    });
  }

  for (const media of document.querySelectorAll('.defense-media')) {
    const video = media.querySelector('.defense-video');
    const panel = media.closest('.tab-panel');
    const group = media.closest('[data-tabs]');
    let inView = !('IntersectionObserver' in window);

    function syncPlayback() {
      const shouldPlay = !motionOff && inView && !panel.inert && !document.hidden;
      video.autoplay = shouldPlay;
      if (!shouldPlay) {
        document.removeEventListener('click', syncPlayback);
        video.pause();
        return;
      }
      if (video.paused) {
        video.play().catch(error => {
          if (error.name === 'NotAllowedError' && video.autoplay) {
            document.addEventListener('click', syncPlayback, { once: true });
          }
        });
      }
    }

    document.addEventListener('visibilitychange', syncPlayback);
    group.addEventListener('site-tab-change', syncPlayback);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        syncPlayback();
      }, {threshold: 0.12});
      observer.observe(video);
    }
    syncPlayback();

    if (!motionOff) {
      function setParallax(x, y) {
        media.style.setProperty('--scene-x', (x * 10).toFixed(1) + 'px');
        media.style.setProperty('--scene-y', (y * 8).toFixed(1) + 'px');
        media.style.setProperty('--label-x', (x * -7).toFixed(1) + 'px');
        media.style.setProperty('--label-y', (y * -5).toFixed(1) + 'px');
      }
      media.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse') return;
        const box = media.getBoundingClientRect();
        setParallax((event.clientX - box.left) / box.width - .5,
                    (event.clientY - box.top) / box.height - .5);
      });
      media.addEventListener('pointerleave', () => setParallax(0, 0));
    }
  }
})();
