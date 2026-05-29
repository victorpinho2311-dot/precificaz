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
  const hash      = window.location.hash.replace('#', '') || '';
  const startPage = Auth.isAuthenticated() ? (hash || 'dashboard') : 'login';

  if (Auth.isAuthenticated() && Auth.isBiometricEnrolled()) {
    mostrarBloqueio(() => Router.go(startPage));
  } else {
    Router.go(startPage);
  }

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

/* ── Tela de bloqueio biométrico ────────────────────────────── */
function mostrarBloqueio(onDesbloquear) {
  const overlay = document.createElement('div');
  overlay.id = 'lock-overlay';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:9999;',
    'background:var(--color-bg);',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'padding:var(--space-8);gap:var(--space-5);',
  ].join('');

  overlay.innerHTML = `
    <div style="text-align:center;margin-bottom:var(--space-2);">
      <div style="width:80px;height:80px;background:var(--color-primary);border-radius:60% 40% 30% 70%/60% 30% 70% 40%;display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);color:var(--color-primary-fg);">
        <i data-lucide="lock" width="32" height="32"></i>
      </div>
      <div style="font-family:var(--font-heading);font-size:var(--text-2xl);font-weight:700;">Precificaz</div>
      <div style="font-size:var(--text-sm);color:var(--color-muted-fg);margin-top:var(--space-1);">Desbloqueie para continuar</div>
    </div>
    <button class="btn btn--primary btn--full" id="bio-unlock-btn" style="max-width:320px;">
      <i data-lucide="fingerprint" width="20" height="20"></i>
      Desbloquear com biometria
    </button>
    <p id="bio-error" style="color:var(--color-destructive);font-size:var(--text-sm);text-align:center;display:none;margin:0;"></p>
    <button class="btn btn--ghost" id="bio-senha-btn" style="font-size:var(--text-sm);color:var(--color-muted-fg);">
      Usar senha
    </button>
  `;

  document.body.appendChild(overlay);
  if (window.lucide) lucide.createIcons();

  document.getElementById('bio-unlock-btn').addEventListener('click', async () => {
    const btn   = document.getElementById('bio-unlock-btn');
    const errEl = document.getElementById('bio-error');
    btn.disabled = true;
    errEl.style.display = 'none';
    try {
      await Auth.authenticateBiometric();
      overlay.remove();
      onDesbloquear();
    } catch {
      btn.disabled = false;
      errEl.textContent = 'Autenticação falhou. Tente novamente ou use a senha.';
      errEl.style.display = 'block';
    }
  });

  document.getElementById('bio-senha-btn').addEventListener('click', () => {
    overlay.remove();
    Auth.logout();
    Router.go('login');
  });

  // Dispara biometria automaticamente ao abrir
  setTimeout(() => document.getElementById('bio-unlock-btn')?.click(), 400);
}

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
