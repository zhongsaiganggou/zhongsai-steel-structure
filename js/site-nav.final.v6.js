/* ZhongSai Mobile Navigation FINAL v6 - event delegation on document */
(function () {
  'use strict';

  var MOBILE_BREAKPOINT = 760;
  var initialized = false;

  function getNavigation() {
    return {
      header: document.querySelector('[data-header]'),
      button: document.querySelector('[data-menu]'),
      mobileNav: document.querySelector('[data-mobile-nav]')
    };
  }

  function isMenuOpen() {
    var nav = getNavigation();
    return nav.header ? nav.header.classList.contains('open') : false;
  }

  function setMenu(open) {
    var nav = getNavigation();
    if (!nav.header || !nav.button || !nav.mobileNav) return;

    nav.header.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    nav.button.setAttribute('aria-expanded', String(open));
    nav.button.setAttribute(
      'aria-label',
      open ? '关闭菜单' : '打开菜单'
    );
  }

  function toggleMenu() {
    setMenu(!isMenuOpen());
  }

  function initSiteNavigation() {
    if (initialized) return;
    initialized = true;

    var nav = getNavigation();
    if (!nav.header || !nav.button || !nav.mobileNav) return;

    nav.button.setAttribute('type', 'button');
    nav.button.dataset.navInitialized = 'true';

    // 使用事件委托，在document上绑定点击事件
    // 这样无论点击的是button还是里面的i元素，都能触发菜单切换
    document.addEventListener('click', function (event) {
      // 检查点击的是否是菜单按钮或其子元素
      var menuButton = event.target.closest('[data-menu]');
      if (menuButton) {
        event.preventDefault();
        toggleMenu();
        return;
      }

      // 检查点击的是否是移动端菜单中的链接
      if (event.target.closest('[data-mobile-nav] a')) {
        setMenu(false);
      }
    }, false);

    // Escape键关闭菜单
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setMenu(false);
    });

    // 窗口放大到桌面尺寸时自动关闭菜单
    window.addEventListener('resize', function () {
      if (window.innerWidth > MOBILE_BREAKPOINT) setMenu(false);
    });

    // 页头滚动效果
    function updateHeader() {
      var header = document.querySelector('[data-header]');
      if (header) header.classList.toggle('scrolled', window.scrollY > 24);
    }
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiteNavigation, { once: true });
  } else {
    initSiteNavigation();
  }
})();
