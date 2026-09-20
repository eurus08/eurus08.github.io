// Loads shared HTML partials (nav, sidebar, footer) into placeholder elements,
// then highlights the nav link for the current page.
// Note: uses fetch(), so pages must be served over http(s) — e.g. GitHub Pages,
// or `python -m http.server` locally. Opening the file directly (file://) won't work.

async function loadInclude(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    el.innerHTML = await res.text();
  } catch (err) {
    console.error('Failed to load include "' + url + '":', err);
  }
}

function normalizePath(path) {
  if (!path) return '/';
  // Treat "/foo/index.html" and "/foo/" as the same page.
  return path.replace(/index\.html$/, '');
}

function setActiveNavLink() {
  const current = normalizePath(window.location.pathname);
  document.querySelectorAll('#site-nav .nav-link').forEach((link) => {
    const target = normalizePath(new URL(link.href).pathname);
    if (target === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

// mailto: does nothing without a desktop mail client, so offer a copy button too.
function wireCopyEmail() {
  document.querySelectorAll('[data-copy-email]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(btn.dataset.copyEmail);
        btn.textContent = 'Copied';
      } catch (err) {
        btn.textContent = 'Press Ctrl+C';
        window.prompt('Copy email address:', btn.dataset.copyEmail);
      }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadInclude('#site-nav', '/partials/nav.html'),
    loadInclude('#site-sidebar', '/partials/sidebar.html'),
    loadInclude('#site-footer', '/partials/footer.html'),
  ]);
  setActiveNavLink();
  wireCopyEmail();
});
