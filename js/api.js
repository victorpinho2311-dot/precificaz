/* ============================================================
   PRECIFICAZ — API
   Google Apps Script Web App — GET com redirect follow
   ============================================================ */

const API = (() => {

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwMbbUofp6xreEi6IH6PbOHgzvsIOUgaPD-_qXioVtDKywLrKTQnOFyAWcfR0mHtK2h2g/exec';

  // Cache em memória: chave → { data, ts }
  const CACHE_TTL = 5 * 60_000; // 5 minutos (alinhado ao CacheService do GAS)
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

  // Fila de revalidações em background para não duplicar requests simultâneos
  const _revalidating = new Set();

  const REQUEST_TIMEOUT = 20_000; // 20 segundos

  async function request(action, payload = {}, method = 'GET') {
    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : '';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      let res;
      if (method === 'POST') {
        const url = `${GAS_URL}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(token || '')}`;
        res = await fetch(url, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } else {
        const params = new URLSearchParams({ action, token: token || '' });
        Object.entries(payload).forEach(([key, val]) => {
          params.set(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        });
        res = await fetch(`${GAS_URL}?${params.toString()}`, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
        });
      }
      clearTimeout(timeoutId);

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('[API] Resposta não é JSON:', text.substring(0, 300));
        throw new Error('Resposta inválida do servidor');
      }

      if (!data.ok) {
        const msg = data.error || 'Erro desconhecido';
        if (msg.toLowerCase().includes('sess') && msg.toLowerCase().includes('expir')) {
          // Sessão expirada: redireciona para login automaticamente
          if (typeof Auth !== 'undefined') Auth.logout();
        }
        throw new Error(msg);
      }
      return data;

    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err.name === 'AbortError' ? 'Servidor demorou demais para responder.' : err.message;
      console.error(`[API] ${action}:`, msg);
      throw new Error(msg);
    }
  }

  // Stale-while-revalidate: retorna cache imediatamente (se existir) e
  // atualiza em background. onUpdate é chamado quando os dados frescos chegam.
  async function _staleRequest(key, action, onUpdate) {
    const stale = _cacheGet(key);

    if (stale) {
      // Agenda revalidação em background sem bloquear o retorno
      if (!_revalidating.has(key)) {
        _revalidating.add(key);
        request(action).then(fresh => {
          _cacheSet(key, fresh);
          _revalidating.delete(key);
          if (onUpdate) onUpdate(fresh);
        }).catch(() => _revalidating.delete(key));
      }
      return stale;
    }

    // Sem cache: aguarda normalmente (primeira carga)
    const fresh = await request(action);
    _cacheSet(key, fresh);
    return fresh;
  }

  // ── Ping de warmup — chama ao iniciar o app para acordar o GAS ──
  function warmup() {
    request('ping').catch(() => {}); // ignora erro — é só aquecimento
  }

  async function login(senha) {
    return request('login', { senha });
  }

  async function getMateriais(onUpdate) {
    return _staleRequest('getMateriais', 'getMateriais', onUpdate);
  }
  async function saveMaterial(m) {
    invalidateCache('getMateriais', 'getDashboard');
    return request('saveMaterial', { data: m }, 'POST');
  }
  async function deleteMaterial(id) {
    invalidateCache('getMateriais', 'getDashboard');
    return request('deleteMaterial', { id }, 'POST');
  }

  async function getPecas(onUpdate) {
    return _staleRequest('getPecas', 'getPecas', onUpdate);
  }
  async function savePeca(p) {
    invalidateCache('getPecas', 'getDashboard');
    return request('savePeca', { data: p }, 'POST');
  }
  async function deletePeca(id) {
    invalidateCache('getPecas', 'getDashboard');
    return request('deletePeca', { id }, 'POST');
  }

  async function getEstoque(onUpdate) {
    return _staleRequest('getEstoque', 'getEstoque', onUpdate);
  }
  async function movimentarEstoque(mov) {
    invalidateCache('getEstoque', 'getDashboard');
    return request('movimentarEstoque', { data: mov }, 'POST');
  }

  async function calcularCusto(pecaId) { return request('calcularCusto', { pecaId }); }
  async function salvarPreco(pricing) {
    invalidateCache('getPrecos', 'getDashboard');
    return request('salvarPreco', { data: pricing }, 'POST');
  }
  async function getPrecos(onUpdate) {
    return _staleRequest('getPrecos', 'getPrecos', onUpdate);
  }

  async function getDashboard(onUpdate) {
    return _staleRequest('getDashboard', 'getDashboard', onUpdate);
  }

  return {
    warmup,
    login,
    getMateriais, saveMaterial, deleteMaterial,
    getPecas,     savePeca,     deletePeca,
    getEstoque,   movimentarEstoque,
    calcularCusto, salvarPreco, getPrecos,
    getDashboard,
    invalidateCache,
  };
})();
