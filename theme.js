(() => {
  const root = document.documentElement;
  const storageKey = 'fichaSalabrioTheme';
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  const getTheme = () => {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyTheme = (theme) => {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = normalized;
    root.style.colorScheme = normalized;
    if (metaTheme) metaTheme.content = normalized === 'dark' ? '#0b1118' : '#eef3f7';

    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.textContent = normalized === 'dark' ? '☀ Modo claro' : '☾ Modo oscuro';
      button.setAttribute('aria-label', normalized === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      button.setAttribute('aria-pressed', normalized === 'dark' ? 'true' : 'false');
    });
  };

  applyTheme(getTheme());

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.theme-toggle');
    if (!button) return;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(storageKey, next);
    applyTheme(next);
  });
})();
