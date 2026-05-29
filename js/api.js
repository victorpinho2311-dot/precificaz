/* ============================================================
   PRECIFICAZ — API
   Google Apps Script Web App — GET com redirect follow
   ============================================================ */

const API = (() => {

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwMbbUofp6xreEi6IH6PbOHgzvsIOUgaPD-_qXioVtDKywLrKTQnOFyAWcfR0mHtK2h2g/exec';

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

  async function getMateriais()          { return request('getMateriais'); }
  async function saveMaterial(m)         { return request('saveMaterial',      { data: m },   'POST'); }
  async function deleteMaterial(id)      { return request('deleteMaterial',    { id },        'POST'); }

  async function getPecas()              { return request('getPecas'); }
  async function savePeca(p)             { return request('savePeca',          { data: p },   'POST'); }
  async function deletePeca(id)          { return request('deletePeca',        { id },        'POST'); }

  async function getEstoque()            { return request('getEstoque'); }
  async function movimentarEstoque(mov)  { return request('movimentarEstoque', { data: mov }, 'POST'); }

  async function calcularCusto(pecaId)   { return request('calcularCusto',    { pecaId }); }
  async function salvarPreco(pricing)    { return request('salvarPreco',       { data: pricing }, 'POST'); }
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
