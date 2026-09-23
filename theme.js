// Theme handling: light/dark via <html data-bs-theme>.
// Loaded synchronously in <head> so the theme is set before first paint.
// With no saved choice the theme follows the OS setting; the nav toggle saves an explicit choice.
(function () {
  var KEY = 'theme';
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var THEME_COLOR = { light: '#ffffff', dark: '#121417' };

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function current() {
    return stored() || (mq.matches ? 'dark' : 'light');
  }

  function apply(theme) {
    var root = document.documentElement;
    var changed = root.getAttribute('data-bs-theme') !== theme;
    root.setAttribute('data-bs-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLOR[theme];
    if (changed) {
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    }
  }

  function set(theme) {
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) { /* storage blocked: the choice lasts for this page only */ }
    apply(theme);
  }

  window.siteTheme = {
    get: current,
    toggle: function () { set(current() === 'dark' ? 'light' : 'dark'); },
  };

  apply(current());

  // Follow OS changes only while the user has not chosen explicitly.
  mq.addEventListener('change', function () { if (!stored()) apply(current()); });
  // Keep other tabs (and same-origin iframes) in sync.
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(current()); });
})();
