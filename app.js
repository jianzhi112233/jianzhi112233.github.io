const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

const header = document.querySelector('.site-header');
const menu = header.querySelector('.desk-nav');
const menuButton = header.querySelector('.mob-menu-btn');
const navButtons = [...header.querySelectorAll('.nav-btn')];
const compact = window.matchMedia('(max-width: 870px)');
let openButton;

function showMenu(button) {
  navButtons.forEach(navButton => {
    const expanded = navButton === button;
    navButton.setAttribute('aria-expanded', String(expanded));
    document.getElementById(navButton.getAttribute('aria-controls')).hidden = !expanded;
  });
  openButton = button;
}
navButtons.forEach(button => {
  button.addEventListener('click', event => {
    const toggledClosed = openButton === button && (compact.matches || event.detail === 0);
    showMenu(toggledClosed ? null : button);
  });
  button.parentElement.addEventListener('pointerenter', event => {
    if (!compact.matches && event.pointerType === 'mouse') showMenu(button);
  });
});
header.addEventListener('pointerleave', () => {
  if (!compact.matches && !header.contains(document.activeElement)) showMenu(null);
});
menuButton.addEventListener('click', () => {
  const open = menu.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  if (!open) showMenu(null);
});
document.addEventListener('click', event => {
  if (!header.contains(event.target)) showMenu(null);
});
header.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (openButton) {
    const previous = openButton;
    showMenu(null);
    previous.focus();
  } else if (menu.classList.contains('is-open')) {
    menuButton.click();
    menuButton.focus();
  }
});

function showTip(stage, visible) {
  stage.querySelector('.demo-tip').hidden = !visible;
  stage.querySelector('.tip-marker').setAttribute('aria-expanded', String(visible));
}
document.addEventListener('pointerover', event => {
  const marker = event.target.closest('.tip-marker');
  if (marker && event.pointerType === 'mouse') showTip(marker.closest('.demo-stage'), true);
});
document.addEventListener('pointerout', event => {
  const stage = event.target.closest('.demo-stage');
  if (stage && event.pointerType === 'mouse' && !stage.contains(event.relatedTarget) &&
      stage.dataset.tipPinned !== 'true') showTip(stage, false);
});
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  const stage = button?.closest('.demo-stage');
  if (!stage) return;
  if (button.classList.contains('tip-marker')) {
    const pinned = stage.dataset.tipPinned !== 'true';
    stage.dataset.tipPinned = String(pinned);
    showTip(stage, pinned);
  }
  if (button.classList.contains('allow-demo')) {
    button.disabled = true;
    button.textContent = '已模拟放行';
    stage.querySelector('.allow-status').textContent = '仅放行示例链接，其他防护继续运行。';
  }
});

const jumpLinks = [...document.querySelectorAll('.section-links a[href^="#"]')];
const sections = jumpLinks.map(link => document.querySelector(link.getAttribute('href')));
function syncJumpLinks() {
  const active = sections.findLastIndex(section => section.getBoundingClientRect().top <= 145);
  jumpLinks.forEach((link, index) => {
    if (index === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
window.addEventListener('scroll', syncJumpLinks, {passive:true});
syncJumpLinks();
