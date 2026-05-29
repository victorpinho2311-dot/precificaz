/* ============================================================
   PRECIFICAZ — Auth
   Controle de sessão via token simples no localStorage
   ============================================================ */

const Auth = (() => {

  const TOKEN_KEY = 'precificaz_token';
  const USER_KEY  = 'precificaz_user';

  /* ── Verificar se autenticado ───────────────────────────── */
  function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  /* ── Obter token atual ──────────────────────────────────── */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /* ── Fazer login ────────────────────────────────────────── */
  async function login(senha) {
    const res = await API.login(senha);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, res.user || 'usuário');
    return res;
  }

  /* ── Fazer logout ───────────────────────────────────────── */
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    Router.go('login');
  }

  /* ── Obter nome do usuário ──────────────────────────────── */
  function getUser() {
    return localStorage.getItem(USER_KEY) || 'usuário';
  }

  /* ── Guardar rota e redirecionar para login ─────────────── */
  function requireAuth() {
    if (!isAuthenticated()) {
      Router.go('login');
      return false;
    }
    return true;
  }

  return {
    isAuthenticated,
    getToken,
    login,
    logout,
    getUser,
    requireAuth,
  };
})();
