/* ============================================================
   PRECIFICAZ — Router
   Roteamento SPA simples — carrega páginas HTML via fetch
   ============================================================ */

const Router = (() => {

  const PROTECTED_PAGES = ['dashboard', 'materiais', 'pecas', 'estoque', 'precificacao', 'perfil'];
  const PUBLIC_PAGES    = ['login'];

  let currentPage = null;

  /* ── Navegar para uma página ────────────────────────────── */
  async function go(page, params = {}) {
    // Guarda params na sessão para a página acessar
    window.__routeParams = params;

    // Autenticação
    if (PROTECTED_PAGES.includes(page) && !Auth.isAuthenticated()) {
      return go('login');
    }
    if (page === 'login' && Auth.isAuthenticated()) {
      return go('dashboard');
    }

    // Carrega HTML da página
    try {
      const filePath = `pages/${page}.html`;
      const res      = await fetch(filePath);
      if (!res.ok) throw new Error(`Página não encontrada: ${page}`);
      const html = await res.text();

      // Injeta no container
      const container = document.getElementById('page-container');
      container.innerHTML = html;

      // innerHTML não executa <script> — reinjeta manualmente
      container.querySelectorAll('script').forEach(oldScript => {
        const newScript = document.createElement('script');
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

      // Tab bar
      const tabBar = document.getElementById('tab-bar');
      if (PROTECTED_PAGES.includes(page)) {
        tabBar.style.display = 'flex';
        updateActiveTab(page);
      } else {
        tabBar.style.display = 'none';
      }

      currentPage = page;

      // Atualiza URL (sem reload)
      history.pushState({ page }, '', `#${page}`);

      // Dispara evento para a página inicializar
      document.dispatchEvent(new CustomEvent('pageLoaded', { detail: { page, params } }));

      // Re-renderiza ícones Lucide
      Utils.refreshIcons();

    } catch (err) {
      console.error('[Router]', err);
      Utils.toast('Erro ao carregar a página.', 'error');
    }
  }

  /* ── Atualizar tab ativa ────────────────────────────────── */
  function updateActiveTab(page) {
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.page === page);
    });
  }

  /* ── Rota atual ─────────────────────────────────────────── */
  function current() { return currentPage; }

  /* ── Back (browser history) ─────────────────────────────── */
  function back() { history.back(); }

  /* ── Handle popstate ────────────────────────────────────── */
  window.addEventListener('popstate', (e) => {
    const page = e.state?.page || 'login';
    go(page);
  });

  return { go, current, back, updateActiveTab };
})();
