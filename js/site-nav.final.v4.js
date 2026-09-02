/* ZhongSai Mobile Navigation FINAL v4 - with debug logging */
(function () {
  'use strict';

  var MOBILE_BREAKPOINT = 760;

  // 全局调试变量
  window.menuDebug = {
    initCount: 0,
    clickCount: 0,
    lastClickTime: null,
    errors: []
  };

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
    if (!nav.header || !nav.button || !nav.mobileNav) {
      window.menuDebug.errors.push('setMenu: missing navigation elements');
      return;
    }

    try {
      nav.header.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      nav.button.setAttribute('aria-expanded', String(open));
      nav.button.setAttribute(
        'aria-label',
        open ? '关闭菜单' : '打开菜单'
      );
    } catch (e) {
      window.menuDebug.errors.push('setMenu error: ' + e.message);
    }
  }

  function toggleMenu() {
    try {
      setMenu(!isMenuOpen());
    } catch (e) {
      window.menuDebug.errors.push('toggleMenu error: ' + e.message);
    }
  }

  function initSiteNavigation() {
    window.menuDebug.initCount++;
    
    var nav = getNavigation();
    if (!nav.header || !nav.button || !nav.mobileNav) {
      window.menuDebug.errors.push('init: missing navigation elements');
      return;
    }

    // 防止重复初始化
    if (nav.button.dataset.navInitialized === 'true') {
      window.menuDebug.errors.push('init: already initialized');
      return;
    }
    nav.button.dataset.navInitialized = 'true';

    nav.button.setAttribute('type', 'button');

    // 使用addEventListener绑定点击事件
    try {
      nav.button.addEventListener('click', function (event) {
        window.menuDebug.clickCount++;
        window.menuDebug.lastClickTime = new Date().toISOString();
        window.menuDebug.eventType = event.type;
        window.menuDebug.eventTarget = event.target.tagName;
        
        event.preventDefault();
        toggleMenu();
      }, false);
    } catch (e) {
      window.menuDebug.errors.push('addEventListener error: ' + e.message);
    }

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
