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

  /* ── Biometria (WebAuthn — Face ID / Touch ID) ──────────── */
  async function isBiometricAvailable() {
    if (!window.PublicKeyCredential) return false;
    return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }

  function isBiometricEnrolled() {
    return !!localStorage.getItem('precificaz_biometric_id');
  }

  async function enrollBiometric() {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId    = crypto.getRandomValues(new Uint8Array(16));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp:   { name: 'Precificaz', id: location.hostname },
        user: { id: userId, name: 'artesa', displayName: 'Artesã' },
        pubKeyCredParams: [
          { alg: -7,   type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    });
    const rawId = new Uint8Array(credential.rawId);
    let binary = '';
    rawId.forEach(b => { binary += String.fromCharCode(b); });
    localStorage.setItem('precificaz_biometric_id', btoa(binary));
  }

  async function authenticateBiometric() {
    const b64    = localStorage.getItem('precificaz_biometric_id');
    if (!b64) throw new Error('Biometria não cadastrada.');
    const credId   = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: location.hostname,
        allowCredentials: [{ id: credId, type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
  }

  function disableBiometric() {
    localStorage.removeItem('precificaz_biometric_id');
  }

  return {
    isAuthenticated,
    getToken,
    login,
    logout,
    getUser,
    requireAuth,
    isBiometricAvailable,
    isBiometricEnrolled,
    enrollBiometric,
    authenticateBiometric,
    disableBiometric,
  };
})();
