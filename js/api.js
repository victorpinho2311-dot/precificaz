/* ============================================================
   PRECIFICAZ — API
   Toda comunicação com o backend (Google Apps Script Web App)
   Substitua GAS_URL pela URL gerada ao publicar o script.
   ============================================================ */

const API = (() => {

  // ⚠️ Substituir após publicar o Google Apps Script
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwMbbUofp6xreEi6IH6PbOHgzvsIOUgaPD-_qXioVtDKywLrKTQnOFyAWcfR0mHtK2h2g/exec';

  /* ── Request base ───────────────────────────────────────── */
  async function request(action, payload = {}) {
    const token = Auth.getToken();

    const body = new URLSearchParams({
      action,
      token: token || '',
      ...payload
    });

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

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
    return request('saveMaterial', { data: JSON.stringify(material) });
  }

  async function deleteMaterial(id) {
    return request('deleteMaterial', { id });
  }

  /* ── Peças ──────────────────────────────────────────────── */
  async function getPecas() {
    return request('getPecas');
  }

  async function savePeca(peca) {
    return request('savePeca', { data: JSON.stringify(peca) });
  }

  async function deletePeca(id) {
    return request('deletePeca', { id });
  }

  /* ── Estoque ────────────────────────────────────────────── */
  async function getEstoque() {
    return request('getEstoque');
  }

  async function movimentarEstoque(mov) {
    return request('movimentarEstoque', { data: JSON.stringify(mov) });
  }

  /* ── Precificação ───────────────────────────────────────── */
  async function calcularCusto(pecaId) {
    return request('calcularCusto', { pecaId });
  }

  async function salvarPreco(pricing) {
    return request('salvarPreco', { data: JSON.stringify(pricing) });
  }

  async function getPrecos() {
    return request('getPrecos');
  }

  /* ── Dashboard stats ────────────────────────────────────── */
  async function getDashboard() {
    return request('getDashboard');
  }

  /* ── Upload de imagem (base64 via GAS) ──────────────────── */
  async function uploadImagem(base64, nome) {
    return request('uploadImagem', { base64, nome });
  }

  return {
    login,
    getMateriais, saveMaterial, deleteMaterial,
    getPecas,     savePeca,     deletePeca,
    getEstoque,   movimentarEstoque,
    calcularCusto, salvarPreco, getPrecos,
    getDashboard,
    uploadImagem,
  };
})();
