(() => {
  for (const group of document.querySelectorAll('[data-tabs]')) {
    const tabList = group.querySelector('[role="tablist"]');
    const tabs = [...tabList.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    let activeIndex = -1;

    function activate(index) {
      if (index < 0 || index >= tabs.length || index === activeIndex) return;
      activeIndex = index;
      tabList.style.setProperty('--active-tab', String(index));
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[tabIndex].setAttribute('aria-hidden', String(!selected));
        panels[tabIndex].inert = !selected;
      });
      group.dispatchEvent(new CustomEvent('site-tab-change', {detail: {index}}));
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

    if (!group.classList.contains('solutions-wrap')) continue;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionDisabled = new URLSearchParams(window.location.search).get('motion') === 'off';
    const motionEnabled = new URLSearchParams(window.location.search).get('motion') === 'on';
    let inView = !('IntersectionObserver' in window);
    let pointerInside = false;
    let advanceTimer;

    function scheduleAdvance() {
      window.clearTimeout(advanceTimer);
      const focusedControl = group.querySelector(':focus-visible');
      const focusedAction = group.contains(document.activeElement) && document.activeElement.closest('.solution-detail');
      const paused = motionDisabled || (!motionEnabled && preference.matches) || document.hidden || !inView || pointerInside || focusedControl || focusedAction;
      group.dataset.motionState = paused ? 'paused' : 'playing';
      if (paused) return;
      advanceTimer = window.setTimeout(() => activate((activeIndex + 1) % tabs.length), 7400);
    }

    group.addEventListener('site-tab-change', scheduleAdvance);
    group.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      pointerInside = true;
      scheduleAdvance();
    });
    group.addEventListener('pointerleave', () => {
      pointerInside = false;
      scheduleAdvance();
    });
    group.addEventListener('focusin', scheduleAdvance);
    group.addEventListener('focusout', () => queueMicrotask(scheduleAdvance));
    document.addEventListener('visibilitychange', scheduleAdvance);
    preference.addEventListener('change', scheduleAdvance);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        scheduleAdvance();
      }, {threshold: .2});
      observer.observe(group);
    }
    scheduleAdvance();
  }
})();
