/* ============================================================
   PRECIFICAZ — API
   Google Apps Script Web App — GET com redirect follow
   ============================================================ */

const API = (() => {

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwMbbUofp6xreEi6IH6PbOHgzvsIOUgaPD-_qXioVtDKywLrKTQnOFyAWcfR0mHtK2h2g/exec';

  const CACHE_TTL = 30_000; // 30 segundos
  const _cache = {};

  function _cacheGet(key) {
    const entry = _cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { delete _cache[key]; return null; }
    return entry.data;
  }

  function _cacheSet(key, data) {
    _cache[key] = { data, ts: Date.now() };
  }

  function invalidateCache(...keys) {
    keys.forEach(k => delete _cache[k]);
  }

  async function request(action, payload = {}, method = 'GET') {
    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : '';

    try {
      // Gravações vão por POST: fotos em base64 estouram o limite de URL do GET.
      // O GAS executa doPost, devolve 302 e o browser segue como GET (CORS liberado).
      let res;
      if (method === 'POST') {
        const url = `${GAS_URL}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(token || '')}`;
        res = await fetch(url, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
      } else {
        const params = new URLSearchParams({ action, token: token || '' });
        Object.entries(payload).forEach(([key, val]) => {
          params.set(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        });
        res = await fetch(`${GAS_URL}?${params.toString()}`, {
          method: 'GET',
          redirect: 'follow',
        });
      }

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('[API] Resposta não é JSON:', text.substring(0, 300));
        throw new Error('Resposta inválida do servidor');
      }

      if (!data.ok) throw new Error(data.error || 'Erro desconhecido');
      return data;

    } catch (err) {
      console.error(`[API] ${action}:`, err.message);
      throw err;
    }
  }

  async function login(senha) {
    return request('login', { senha });
  }

  async function getMateriais() {
    const cached = _cacheGet('getMateriais');
    if (cached) return cached;
    const res = await request('getMateriais');
    _cacheSet('getMateriais', res);
    return res;
  }
  async function saveMaterial(m) {
    invalidateCache('getMateriais', 'getDashboard');
    return request('saveMaterial', { data: m }, 'POST');
  }
  async function deleteMaterial(id) {
    invalidateCache('getMateriais', 'getDashboard');
    return request('deleteMaterial', { id }, 'POST');
  }

  async function getPecas() {
    const cached = _cacheGet('getPecas');
    if (cached) return cached;
    const res = await request('getPecas');
    _cacheSet('getPecas', res);
    return res;
  }
  async function savePeca(p) {
    invalidateCache('getPecas', 'getDashboard');
    return request('savePeca', { data: p }, 'POST');
  }
  async function deletePeca(id) {
    invalidateCache('getPecas', 'getDashboard');
    return request('deletePeca', { id }, 'POST');
  }

  async function getEstoque() {
    const cached = _cacheGet('getEstoque');
    if (cached) return cached;
    const res = await request('getEstoque');
    _cacheSet('getEstoque', res);
    return res;
  }
  async function movimentarEstoque(mov) {
    invalidateCache('getEstoque', 'getDashboard');
    return request('movimentarEstoque', { data: mov }, 'POST');
  }

  async function calcularCusto(pecaId)   { return request('calcularCusto', { pecaId }); }
  async function salvarPreco(pricing) {
    invalidateCache('getPrecos', 'getDashboard');
    return request('salvarPreco', { data: pricing }, 'POST');
  }
  async function getPrecos() {
    const cached = _cacheGet('getPrecos');
    if (cached) return cached;
    const res = await request('getPrecos');
    _cacheSet('getPrecos', res);
    return res;
  }

  async function getDashboard() {
    const cached = _cacheGet('getDashboard');
    if (cached) return cached;
    const res = await request('getDashboard');
    _cacheSet('getDashboard', res);
    return res;
  }

  return {
    login,
    getMateriais, saveMaterial, deleteMaterial,
    getPecas,     savePeca,     deletePeca,
    getEstoque,   movimentarEstoque,
    calcularCusto, salvarPreco, getPrecos,
    getDashboard,
    invalidateCache,
  };
})();
