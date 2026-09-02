/* ZhongSai Mobile Navigation FINAL v3 - addEventListener only, no onclick */
(function () {
  'use strict';

  var MOBILE_BREAKPOINT = 760;

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
    var nav = getNavigation();
    if (!nav.header || !nav.button || !nav.mobileNav) return;

    // 防止重复初始化
    if (nav.button.dataset.navInitialized === 'true') return;
    nav.button.dataset.navInitialized = 'true';

    nav.button.setAttribute('type', 'button');

    // 使用addEventListener绑定点击事件（不使用onclick属性）
    nav.button.addEventListener('click', function (event) {
      event.preventDefault();
      toggleMenu();
    }, false);

    // 移动端菜单链接点击后关闭菜单
    var links = nav.mobileNav.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        setMenu(false);
      });
    }

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
