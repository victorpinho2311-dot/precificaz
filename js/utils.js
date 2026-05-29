/* ============================================================
   PRECIFICAZ — Utils
   Funções utilitárias globais
   ============================================================ */

const Utils = (() => {

  /* ── Escapar HTML (evita quebra de UI / XSS em innerHTML) ── */
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ── Toast ─────────────────────────────────────────────── */
  function toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  /* ── Formatação de moeda (BRL) ──────────────────────────── */
  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value) || 0);
  }

  /* ── Parse de moeda para número ─────────────────────────── */
  function parseCurrency(str) {
    if (typeof str === 'number') return str;
    return parseFloat(
      String(str).replace(/[^0-9,.-]/g, '').replace(',', '.')
    ) || 0;
  }

  /* ── Formatação de data ─────────────────────────────────── */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR').format(d);
  }

  /* ── Deep clone ─────────────────────────────────────────── */
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* ── Gerar ID único ─────────────────────────────────────── */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── Debounce ───────────────────────────────────────────── */
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* ── Imagem para base64 ─────────────────────────────────── */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ── Redimensionar imagem antes do upload ───────────────── */
  function resizeImage(file, maxWidth = 400, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const ratio   = Math.min(maxWidth / img.width, 1);
        const canvas  = document.createElement('canvas');
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Falha ao processar imagem'));
      };
      img.src = url;
    });
  }

  /* ── Filtrar array por texto ────────────────────────────── */
  function filterByText(arr, text, fields) {
    if (!text) return arr;
    const q = text.toLowerCase();
    return arr.filter(item =>
      fields.some(f => String(item[f] || '').toLowerCase().includes(q))
    );
  }

  /* ── Confirmar ação destrutiva ──────────────────────────── */
  function confirmAction(message) {
    return window.confirm(message);
  }

  /* ── Lazy init de ícones Lucide ─────────────────────────── */
  function refreshIcons() {
    if (window.lucide) lucide.createIcons();
  }

  /* ── Número para unidade de medida ─────────────────────── */
  const UNIDADES = {
    metro:     'm',
    metro2:    'm²',
    cm:        'cm',
    unidade:   'un',
    rolo:      'rolo',
    kg:        'kg',
    g:         'g',
    ml:        'ml',
    litro:     'L',
    peca:      'pç',
  };

  function getUnidades() {
    return Object.entries(UNIDADES).map(([key, label]) => ({ key, label }));
  }

  return {
    escapeHtml,
    toast,
    formatCurrency,
    parseCurrency,
    formatDate,
    clone,
    uid,
    debounce,
    fileToBase64,
    resizeImage,
    filterByText,
    confirmAction,
    refreshIcons,
    getUnidades,
    UNIDADES,
  };
})();
