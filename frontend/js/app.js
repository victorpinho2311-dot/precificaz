/* ============================================================
   PRECIFICAZ — App
   Inicialização do app, registro do Service Worker
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── Service Worker ─────────────────────────────────────── */
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/precificaz/sw.js', {
        scope: '/precificaz/'
      });
      console.log('[SW] Registrado:', reg.scope);
    } catch (err) {
      console.warn('[SW] Falha no registro:', err);
    }
  }

  /* ── Rota inicial ───────────────────────────────────────── */
  const hash = window.location.hash.replace('#', '') || '';
  const startPage = Auth.isAuthenticated() ? (hash || 'dashboard') : 'login';
  Router.go(startPage);

  /* ── PWA Install prompt (Android/Desktop — iOS é automático) */
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    // Botão de instalação pode ser exposto futuramente
  });

  /* ── Detectar iOS para banner de instalação ─────────────── */
  const isIOS     = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInApp   = window.navigator.standalone;
  if (isIOS && !isInApp) {
    showIOSInstallBanner();
  }

});

/* ── Banner de instalação iOS ───────────────────────────────── */
function showIOSInstallBanner() {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0;
    background: white; padding: 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
    box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
    z-index: 9999; font-family: var(--font-body);
    display: flex; align-items: center; gap: 12px;
    border-top: 1px solid var(--color-border);
  `;
  banner.innerHTML = `
    <div style="flex:1">
      <strong style="font-size:14px">Instalar Precificaz</strong>
      <p style="font-size:12px;color:#78786C;margin-top:2px">
        Toque em <strong>Compartilhar</strong> e depois <strong>"Adicionar à Tela de Início"</strong>
      </p>
    </div>
    <button onclick="this.parentElement.remove()" style="
      padding: 6px 14px; border-radius: 99px;
      background: var(--color-primary); color: white;
      font-size:13px; font-weight:700; border:none; cursor:pointer;
    ">OK</button>
  `;
  document.body.appendChild(banner);
}
