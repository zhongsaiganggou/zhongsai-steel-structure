/**
 * 中赛钢构官网 - 自动主题切换
 * 根据客户电脑时间自动切换深色/浅色主题
 * 白天(6:00-18:00)浅色，晚上深色
 * 同时尊重系统偏好和用户手动选择
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'zhongsai-theme';
  var THEME_LIGHT = 'light';
  var THEME_DARK = 'dark';

  // 获取用户手动选择的主题
  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  // 保存用户选择
  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
  }

  // 根据时间判断主题
  function getThemeByTime() {
    var hour = new Date().getHours();
    // 白天 6:00 - 18:00 浅色，其他时间深色
    return (hour >= 6 && hour < 18) ? THEME_LIGHT : THEME_DARK;
  }

  // 获取系统偏好
  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEME_DARK;
    }
    return THEME_LIGHT;
  }

  // 确定最终主题：用户手动 > 系统偏好 > 时间
  function resolveTheme() {
    var stored = getStoredTheme();
    if (stored === THEME_LIGHT || stored === THEME_DARK) {
      return stored;
    }
    // 没有手动选择时，结合时间和系统偏好
    var timeTheme = getThemeByTime();
    var systemTheme = getSystemTheme();
    // 如果时间和系统偏好一致，用该主题；否则优先时间（因为是B2B网站，晚上访问用深色更舒适）
    return timeTheme;
  }

  // 应用主题
  function applyTheme(theme) {
    var html = document.documentElement;
    if (theme === THEME_DARK) {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.setAttribute('data-theme', 'light');
    }
    updateThemeToggleIcon(theme);
  }

  // 更新切换按钮图标
  function updateThemeToggleIcon(theme) {
    var toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(function (btn) {
      var icon = btn.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = (theme === THEME_DARK) ? '☀️' : '🌙';
      }
      var label = btn.querySelector('.theme-label');
      if (label) {
        label.textContent = (theme === THEME_DARK) ? '浅色' : '深色';
      }
      btn.setAttribute('aria-label', (theme === THEME_DARK) ? '切换到浅色模式' : '切换到深色模式');
    });
  }

  // 切换主题
  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || THEME_LIGHT;
    var next = (current === THEME_DARK) ? THEME_LIGHT : THEME_DARK;
    setStoredTheme(next);
    applyTheme(next);
  }

  // 初始化
  function init() {
    // 立即应用主题（避免闪烁）
    applyTheme(resolveTheme());

    // DOM加载完成后绑定切换按钮
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindToggles);
    } else {
      bindToggles();
    }

    // 监听系统主题变化
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (!getStoredTheme()) {
          applyTheme(resolveTheme());
        }
      });
    }

    // 每小时检查一次时间，自动切换（用户没有手动选择时）
    setInterval(function () {
      if (!getStoredTheme()) {
        var current = document.documentElement.getAttribute('data-theme');
        var expected = resolveTheme();
        if (current !== expected) {
          applyTheme(expected);
        }
      }
    }, 60000); // 每分钟检查一次（轻量）
  }

  function bindToggles() {
    var toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleTheme();
      });
    });
  }

  // 立即执行（在head中同步执行，避免主题闪烁）
  init();
})();
