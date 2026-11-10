(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionOff = new URLSearchParams(window.location.search).get('motion') === 'off';
  const stageControllers = new Map();

  for (const group of document.querySelectorAll('[data-tabs]')) {
    const tabList = group.querySelector('[role="tablist"]');
    const tabs = [...tabList.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    const automatic = group.classList.contains('product-tabs') || group.classList.contains('solutions-wrap');
    const rotationDuration = group.classList.contains('solutions-wrap') ? 6200 : 12400;
    let selectedIndex = 0;
    let visible = false;
    let rotationTimer;

    function schedule() {
      window.clearTimeout(rotationTimer);
      const suspended = motionOff || document.hidden || !visible;
      group.dataset.tabMotion = automatic && !suspended ? 'playing' : 'paused';
      if (!automatic || suspended) return;
      rotationTimer = window.setTimeout(() => activate((selectedIndex + 1) % tabs.length), rotationDuration);
    }

    function activate(index) {
      selectedIndex = index;
      tabs.forEach((tab, tabIndex) => {
        const selected = index === tabIndex;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[tabIndex].hidden = !selected;
        panels[tabIndex].classList.toggle('is-entering', selected);
      });
      document.dispatchEvent(new Event('lanyiyun:panelchange'));
      schedule();
    }

    tabs.forEach((tab, index) => tab.addEventListener('click', () => activate(index)));
    tabList.addEventListener('keydown', event => {
      const currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex < 0) return;
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
    group.addEventListener('focusin', schedule);
    group.addEventListener('focusout', () => queueMicrotask(schedule));
    document.addEventListener('visibilitychange', schedule);
    preference.addEventListener('change', schedule);
    if (automatic && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        schedule();
      }, {threshold: 0.15});
      observer.observe(group);
    } else {
      visible = true;
    }
    schedule();
  }

  function mountStages(root) {
    root.querySelectorAll('.demo-stage').forEach(stage => {
      if (stageControllers.has(stage)) return;
      const captions = [...stage.querySelectorAll('.demo-captions span')];
      const rows = [...stage.querySelectorAll('.request-row')];
      const graphic = stage.querySelector('.traffic-scene');
      let visible = false;
      let phase = 0;
      let timer;

      function paintPhase() {
        stage.dataset.phase = String(phase);
        captions.forEach((caption, index) => caption.classList.toggle('is-current', phase === index));
        rows.forEach((row, index) => row.classList.toggle('is-current', phase === index));
      }

      function synchronize() {
        window.clearTimeout(timer);
        const suspended = motionOff || !visible || document.hidden || Boolean(stage.closest('[hidden]'));
        stage.classList.toggle('is-demo-paused', suspended);
        stage.dataset.motionState = suspended ? 'paused' : 'playing';
        if (graphic) {
          const method = suspended ? 'pauseAnimations' : 'unpauseAnimations';
          if (typeof graphic[method] === 'function') graphic[method]();
        }
        if (!suspended) {
          timer = window.setTimeout(() => {
            phase = (phase + 1) % Math.max(captions.length, 1);
            paintPhase();
            synchronize();
          }, 2800);
        }
      }

      const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        synchronize();
      }, {threshold: 0.1}) : null;
      if (observer) observer.observe(stage);
      else visible = true;
      stageControllers.set(stage, {synchronize, dispose() {
        window.clearTimeout(timer);
        observer?.disconnect();
      }});
      paintPhase();
      synchronize();
    });
  }

  function synchronizeStages() {
    stageControllers.forEach((controller, stage) => {
      if (!stage.isConnected) {
        controller.dispose();
        stageControllers.delete(stage);
      } else {
        controller.synchronize();
      }
    });
  }

  document.addEventListener('visibilitychange', synchronizeStages);
  document.addEventListener('lanyiyun:panelchange', synchronizeStages);
  document.addEventListener('lanyiyun:mount', event => {
    mountStages(event.detail.root);
    synchronizeStages();
  });
  preference.addEventListener('change', synchronizeStages);
  document.documentElement.classList.toggle('motion-off', motionOff);
  mountStages(document);
})();
