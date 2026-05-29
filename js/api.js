/* ============================================================
   PRECIFICAZ — API
   Google Apps Script Web App — GET com redirect follow
   ============================================================ */

const API = (() => {

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwMbbUofp6xreEi6IH6PbOHgzvsIOUgaPD-_qXioVtDKywLrKTQnOFyAWcfR0mHtK2h2g/exec';

  async function request(action, payload = {}) {
    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : '';

    const params = new URLSearchParams({ action, token: token || '' });

    Object.entries(payload).forEach(([key, val]) => {
      params.set(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
    });

    const url = `${GAS_URL}?${params.toString()}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });

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

  async function getMateriais()          { return request('getMateriais'); }
  async function saveMaterial(m)         { return request('saveMaterial',      { data: m }); }
  async function deleteMaterial(id)      { return request('deleteMaterial',    { id }); }

  async function getPecas()              { return request('getPecas'); }
  async function savePeca(p)             { return request('savePeca',          { data: p }); }
  async function deletePeca(id)          { return request('deletePeca',        { id }); }

  async function getEstoque()            { return request('getEstoque'); }
  async function movimentarEstoque(mov)  { return request('movimentarEstoque', { data: mov }); }

  async function calcularCusto(pecaId)   { return request('calcularCusto',    { pecaId }); }
  async function salvarPreco(pricing)    { return request('salvarPreco',       { data: pricing }); }
  async function getPrecos()             { return request('getPrecos'); }

  async function getDashboard()          { return request('getDashboard'); }

  return {
    login,
    getMateriais, saveMaterial, deleteMaterial,
    getPecas,     savePeca,     deletePeca,
    getEstoque,   movimentarEstoque,
    calcularCusto, salvarPreco, getPrecos,
    getDashboard,
  };
})();
