/* ============================================================
   PRECIFICAZ — API
   Comunicação com o backend (Google Apps Script Web App)
   Usa GET para evitar bloqueio de CORS do GAS
   ============================================================ */

const API = (() => {

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwMbbUofp6xreEi6IH6PbOHgzvsIOUgaPD-_qXioVtDKywLrKTQnOFyAWcfR0mHtK2h2g/exec';

  /* ── Request base (GET com query string) ────────────────── */
  async function request(action, payload = {}) {
    const token = Auth ? Auth.getToken() : '';

    const params = new URLSearchParams({
      action,
      token: token || '',
    });

    // Adicionar payload (objetos viram JSON encoded)
    Object.entries(payload).forEach(([key, val]) => {
      params.set(key, typeof val === 'object' ? encodeURIComponent(JSON.stringify(val)) : val);
    });

    try {
      const res = await fetch(`${GAS_URL}?${params.toString()}`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Resposta inválida do servidor');
      }

      if (!data.ok) throw new Error(data.error || 'Erro desconhecido');
      return data;

    } catch (err) {
      console.error(`[API] ${action}:`, err.message);
      throw err;
    }
  }

  /* ── Auth ───────────────────────────────────────────────── */
  async function login(senha) {
    return request('login', { senha });
  }

  /* ── Materiais ──────────────────────────────────────────── */
  async function getMateriais() {
    return request('getMateriais');
  }

  async function saveMaterial(material) {
    return request('saveMaterial', { data: material });
  }

  async function deleteMaterial(id) {
    return request('deleteMaterial', { id });
  }

  /* ── Peças ──────────────────────────────────────────────── */
  async function getPecas() {
    return request('getPecas');
  }

  async function savePeca(peca) {
    return request('savePeca', { data: peca });
  }

  async function deletePeca(id) {
    return request('deletePeca', { id });
  }

  /* ── Estoque ────────────────────────────────────────────── */
  async function getEstoque() {
    return request('getEstoque');
  }

  async function movimentarEstoque(mov) {
    return request('movimentarEstoque', { data: mov });
  }

  /* ── Precificação ───────────────────────────────────────── */
  async function calcularCusto(pecaId) {
    return request('calcularCusto', { pecaId });
  }

  async function salvarPreco(pricing) {
    return request('salvarPreco', { data: pricing });
  }

  async function getPrecos() {
    return request('getPrecos');
  }

  /* ── Dashboard ──────────────────────────────────────────── */
  async function getDashboard() {
    return request('getDashboard');
  }

  return {
    login,
    getMateriais, saveMaterial, deleteMaterial,
    getPecas,     savePeca,     deletePeca,
    getEstoque,   movimentarEstoque,
    calcularCusto, salvarPreco, getPrecos,
    getDashboard,
  };
})();
