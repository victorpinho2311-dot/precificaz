/**
 * PRECIFICAZ — Backend (Google Apps Script)
 *
 * SETUP:
 * 1. Cole este código no Apps Script
 * 2. O SPREADSHEET_ID já está preenchido
 * 3. Execute definirSenha() uma vez para configurar a senha
 * 4. Implante como App da Web: Executar como "Eu mesmo", Acesso "Qualquer pessoa"
 */

const SPREADSHEET_ID = '1dLxowHGnZEyvEqR8q6TEWR8TH6NRo0BBkSwPsge5ZDc';
const SENHA_HASH_KEY = 'precificaz_senha_hash';

const SHEETS = {
  MATERIAIS: 'Materiais',
  PECAS:     'Peças',
  ESTOQUE:   'Estoque',
  PRECOS:    'Preços',
  SESSOES:   'Sessões',
};

// ── ENTRY POINTS ──────────────────────────────────────────────
function doGet(e) {
  const params = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(key => {
      params[key] = e.parameter[key];
    });
  }

  if (e && e.postData && e.postData.contents) {
    try {
      const postBody = JSON.parse(e.postData.contents);
      if (postBody && typeof postBody === 'object') {
        Object.keys(postBody).forEach(key => {
          const val = postBody[key];
          params[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
        });
      }
    } catch (err) {
      console.warn("Could not parse postData contents as JSON:", err.toString());
    }
  }

  const action = params.action || '';
  const token  = params.token  || '';
  const PUBLIC_ACTIONS = ['login', 'ping'];

  try {
    if (!PUBLIC_ACTIONS.includes(action) && !validarToken(token)) {
      return jsonResponse({ ok: false, error: 'Sessão expirada. Faça login novamente.' });
    }

    switch (action) {
      case 'ping':              return jsonResponse({ ok: true, message: 'Precificaz API online' });
      case 'login':             return handleLogin(params);
      case 'getMateriais':      return handleGetMateriais();
      case 'saveMaterial':      return handleSaveMaterial(params);
      case 'deleteMaterial':    return handleDeleteMaterial(params);
      case 'getPecas':          return handleGetPecas();
      case 'savePeca':          return handleSavePeca(params);
      case 'deletePeca':        return handleDeletePeca(params);
      case 'getEstoque':        return handleGetEstoque();
      case 'movimentarEstoque': return handleMovimentarEstoque(params);
      case 'calcularCusto':     return handleCalcularCusto(params);
      case 'salvarPreco':       return handleSalvarPreco(params);
      case 'getPrecos':         return handleGetPrecos();
      case 'getDashboard':      return handleGetDashboard();
      default:
        return jsonResponse({ ok: false, error: 'Ação desconhecida: ' + action });
    }
  } catch (err) {
    console.error('PRECIFICAZ ERROR:', err.toString());
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  return doGet(e);
}

// ── SENHA ─────────────────────────────────────────────────────
// A senha NÃO fica no código (o repositório é público).
// Para definir/trocar a senha:
//   1. No editor do Apps Script → ⚙ Configurações do projeto
//      → Propriedades do script → adicionar:
//         propriedade: precificaz_nova_senha   valor: <a senha>
//   2. Rode esta função UMA VEZ.
//   3. (Opcional) apague a propriedade precificaz_nova_senha depois.
function definirSenha() {
  const props     = PropertiesService.getScriptProperties();
  const NOVA_SENHA = props.getProperty('precificaz_nova_senha');
  if (!NOVA_SENHA) {
    throw new Error('Defina a propriedade de script "precificaz_nova_senha" antes de rodar definirSenha().');
  }
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, NOVA_SENHA)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  props.setProperty(SENHA_HASH_KEY, hash);
  props.deleteProperty('precificaz_nova_senha');
  Logger.log('✅ Senha definida.');
}

// ── AUTENTICAÇÃO ──────────────────────────────────────────────
function handleLogin(params) {
  const senhaDigitada = params.senha || '';
  const senhaHash     = PropertiesService.getScriptProperties().getProperty(SENHA_HASH_KEY);

  if (!senhaHash) {
    return jsonResponse({ ok: false, error: 'Senha não configurada. Execute definirSenha() no Apps Script.' });
  }

  const hashDigitado = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senhaDigitada)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

  if (hashDigitado !== senhaHash) {
    return jsonResponse({ ok: false, error: 'Senha incorreta.' });
  }

  const token = criarToken();
  return jsonResponse({ ok: true, token, user: 'Artesã' });
}

function criarToken() {
  const sheet  = getOrCreateSheet(SHEETS.SESSOES, ['token', 'expiry']);
  limparSessoesExpiradas(sheet);
  const token  = Utilities.getUuid();
  const expiry = Date.now() + (7 * 24 * 60 * 60 * 1000);
  sheet.appendRow([token, expiry]);
  return token;
}

function limparSessoesExpiradas(sheet) {
  if (sheet.getLastRow() < 2) return;
  const now  = Date.now();
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (Number(data[i][1]) <= now) sheet.deleteRow(i + 2);
  }
}

function validarToken(token) {
  if (!token) return false;
  const sheet = getOrCreateSheet(SHEETS.SESSOES, ['token', 'expiry']);
  if (sheet.getLastRow() < 2) return false;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const now  = Date.now();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(token) && Number(data[i][1]) > now) return true;
  }
  return false;
}

// ── MATERIAIS ─────────────────────────────────────────────────
function handleGetMateriais() {
  const sheet = getOrCreateSheet(SHEETS.MATERIAIS,
    ['id','nome','categoria','preco','unidade','qtd','fornecedor','obs','foto','criadoEm']);
  return jsonResponse({ ok: true, data: sheetToObjects(sheet) });
}

function handleSaveMaterial(params) {
  const mat   = JSON.parse(params.data || '{}');
  const sheet = getOrCreateSheet(SHEETS.MATERIAIS,
    ['id','nome','categoria','preco','unidade','qtd','fornecedor','obs','foto','criadoEm']);
  const row   = findRowById(sheet, mat.id);
  const now   = new Date().toISOString();
  const values = [mat.id, mat.nome||'', mat.categoria||'', mat.preco||0, mat.unidade||'',
    mat.qtd||0, mat.fornecedor||'', mat.obs||'', mat.foto||'',
    row ? sheet.getRange(row, 10).getValue() : now];
  if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else     sheet.appendRow(values);
  return jsonResponse({ ok: true });
}

function handleDeleteMaterial(params) {
  const sheet = getOrCreateSheet(SHEETS.MATERIAIS, []);
  const row   = findRowById(sheet, params.id);
  if (row) sheet.deleteRow(row);
  return jsonResponse({ ok: true });
}

// ── PEÇAS ─────────────────────────────────────────────────────
function handleGetPecas() {
  const sheet = getOrCreateSheet(SHEETS.PECAS,
    ['id','nome','categoria','desc','horas','valorHora','materiais','custoTotal','foto','criadoEm']);
  return jsonResponse({ ok: true, data: sheetToObjects(sheet) });
}

function handleSavePeca(params) {
  const peca  = JSON.parse(params.data || '{}');
  const sheet = getOrCreateSheet(SHEETS.PECAS,
    ['id','nome','categoria','desc','horas','valorHora','materiais','custoTotal','foto','criadoEm']);
  const row   = findRowById(sheet, peca.id);
  const now   = new Date().toISOString();
  const values = [peca.id, peca.nome||'', peca.categoria||'', peca.desc||'',
    peca.horas||0, peca.valorHora||0, peca.materiais||'[]', peca.custoTotal||0,
    peca.foto||'', row ? sheet.getRange(row, 10).getValue() : now];
  if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else     sheet.appendRow(values);
  return jsonResponse({ ok: true });
}

function handleDeletePeca(params) {
  const sheet = getOrCreateSheet(SHEETS.PECAS, []);
  const row   = findRowById(sheet, params.id);
  if (row) sheet.deleteRow(row);
  return jsonResponse({ ok: true });
}

// ── ESTOQUE ───────────────────────────────────────────────────
function handleGetEstoque() {
  const sheet = getOrCreateSheet(SHEETS.ESTOQUE,
    ['id','tipo','materialId','quantidade','data','obs','registradoEm']);
  return jsonResponse({ ok: true, data: sheetToObjects(sheet) });
}

function handleMovimentarEstoque(params) {
  const mov   = JSON.parse(params.data || '{}');
  const sheet = getOrCreateSheet(SHEETS.ESTOQUE,
    ['id','tipo','materialId','quantidade','data','obs','registradoEm']);
  sheet.appendRow([mov.id, mov.tipo, mov.materialId, mov.quantidade,
    mov.data, mov.obs||'', new Date().toISOString()]);
  return jsonResponse({ ok: true });
}

// ── PRECIFICAÇÃO ──────────────────────────────────────────────
function handleCalcularCusto(params) {
  const pecaSheet = getOrCreateSheet(SHEETS.PECAS, []);
  const matSheet  = getOrCreateSheet(SHEETS.MATERIAIS, []);
  const pecaRow   = findRowById(pecaSheet, params.pecaId);
  if (!pecaRow) return jsonResponse({ ok: false, error: 'Peça não encontrada.' });
  const peca    = rowToObject(pecaSheet, pecaRow);
  const mats    = JSON.parse(peca.materiais || '[]');
  const allMats = sheetToObjects(matSheet);
  let custoMats = 0;
  mats.forEach(item => {
    const mat = allMats.find(m => m.id === item.materialId);
    if (mat) custoMats += (parseFloat(mat.preco)||0) * (parseFloat(item.quantidade)||0);
  });
  const custoMO    = (parseFloat(peca.horas)||0) * (parseFloat(peca.valorHora)||0);
  return jsonResponse({ ok: true, custoMats, custoMO, custoTotal: custoMats + custoMO });
}

function handleSalvarPreco(params) {
  const preco = JSON.parse(params.data || '{}');
  const sheet = getOrCreateSheet(SHEETS.PRECOS,
    ['id','pecaId','pecaNome','custoTotal','outros','margem','taxa','precoFinal','data','criadoEm']);
  sheet.appendRow([preco.id, preco.pecaId, preco.pecaNome, preco.custoTotal,
    preco.outros, preco.margem, preco.taxa, preco.precoFinal, preco.data,
    new Date().toISOString()]);
  return jsonResponse({ ok: true });
}

function handleGetPrecos() {
  const sheet = getOrCreateSheet(SHEETS.PRECOS,
    ['id','pecaId','pecaNome','custoTotal','outros','margem','taxa','precoFinal','data','criadoEm']);
  return jsonResponse({ ok: true, data: sheetToObjects(sheet).reverse() });
}

// ── DASHBOARD ─────────────────────────────────────────────────
function handleGetDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const count = (name) => {
    const s = ss.getSheetByName(name);
    return s ? Math.max(0, s.getLastRow() - 1) : 0;
  };
  return jsonResponse({
    ok: true,
    materiais: count(SHEETS.MATERIAIS),
    pecas:     count(SHEETS.PECAS),
    estoque:   count(SHEETS.ESTOQUE),
    precos:    count(SHEETS.PRECOS),
  });
}

// ── HELPERS ───────────────────────────────────────────────────
function getOrCreateSheet(name, headers) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers.length) sheet.appendRow(headers);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows    = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(obj => obj.id);
}

function rowToObject(sheet, rowNum) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values  = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  const obj     = {};
  headers.forEach((h, i) => { obj[h] = values[i]; });
  return obj;
}

function findRowById(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return null;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return null;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
