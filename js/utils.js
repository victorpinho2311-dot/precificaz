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
  function resizeImage(file, maxWidth = 300, quality = 0.6) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        let currentWidth = maxWidth;
        let currentQuality = quality;
        let base64 = '';
        
        // Loop de otimização para garantir que caiba no limite de 50k caracteres do Google Sheets
        let attempts = 0;
        do {
          const ratio   = Math.min(currentWidth / img.width, 1);
          const canvas  = document.createElement('canvas');
          canvas.width  = img.width  * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          base64 = canvas.toDataURL('image/jpeg', currentQuality);
          
          if (base64.length < 45000) {
            break;
          }
          
          // Reduz dimensões e qualidade se ultrapassar o limite
          currentWidth = Math.floor(currentWidth * 0.85);
          currentQuality = Math.max(0.2, currentQuality - 0.1);
          attempts++;
        } while (currentWidth > 50 && currentQuality >= 0.2 && attempts < 10);
        
        if (base64.length >= 48000) {
          reject(new Error('Imagem muito grande, mesmo após compressão. Escolha outra foto.'));
        } else {
          resolve(base64);
        }
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

  /* ── Categorias (localStorage) ─────────────────────────── */
  const CAT_DEFAULTS = {
    materiais: ['Alça','Botão','Elástico','Entretela','Forro','Linha','Manta','Outros','Tecido','Ziper'],
    pecas:     ['Bolsa','Carteira','Estojo','Mochila','Nécessaire','Outros','Porta-documentos','Toalha'],
  };

  function getCategorias(tipo) {
    try {
      const saved = JSON.parse(localStorage.getItem(`pz_cat_${tipo}`));
      return Array.isArray(saved) ? saved : [...CAT_DEFAULTS[tipo]];
    } catch {
      return [...CAT_DEFAULTS[tipo]];
    }
  }

  function setCategorias(tipo, lista) {
    localStorage.setItem(`pz_cat_${tipo}`, JSON.stringify(lista));
  }

  /* ── Plataformas de Venda (localStorage) ────────────────── */
  const PLATAFORMAS_DEFAULTS = [
    {
      id: 'enjoei',
      nome: 'Enjoei',
      cor: '#FF6B2B',
      corTexto: '#FFFFFF',
      icone: 'ej',
      comissao: 0,
      taxaFixa: 0,
      ativo: true,
    },
    {
      id: 'elo7',
      nome: 'Elo7',
      cor: '#00A68A',
      corTexto: '#FFFFFF',
      icone: 'e7',
      comissao: 0,
      taxaFixa: 0,
      ativo: true,
    },
  ];

  function getPlataformas() {
    try {
      const saved = JSON.parse(localStorage.getItem('pz_plataformas'));
      return Array.isArray(saved) ? saved : JSON.parse(JSON.stringify(PLATAFORMAS_DEFAULTS));
    } catch {
      return JSON.parse(JSON.stringify(PLATAFORMAS_DEFAULTS));
    }
  }

  function setPlataformas(lista) {
    localStorage.setItem('pz_plataformas', JSON.stringify(lista));
  }

  function calcularPrecoPlataforma(custo, outros, margem, plataforma) {
    const base = custo + outros + (parseFloat(plataforma.taxaFixa) || 0);
    const divisor = 1 - (margem / 100) - ((parseFloat(plataforma.comissao) || 0) / 100);
    if (divisor <= 0) return null;
    return base / divisor;
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
    getCategorias,
    setCategorias,
    getPlataformas,
    setPlataformas,
    calcularPrecoPlataforma,
  };
})();
