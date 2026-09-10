(() => {
  const root = document.documentElement;
  const storageKey = 'fichaSalabrioTheme';

  const getTheme = () => localStorage.getItem(storageKey) || 'light';
  const applyTheme = (theme) => {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = normalized;
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.textContent = normalized === 'dark' ? '☀ Claro' : '☾ Oscuro';
      button.setAttribute('aria-label', normalized === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
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
