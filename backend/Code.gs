/**
 * PRECIFICAZ — Backend (Google Apps Script)
 * 
 * SETUP:
 * 1. Acesse script.google.com → Novo projeto → cole este código
 * 2. Crie uma Planilha Google e copie o ID da URL
 * 3. Substitua SPREADSHEET_ID abaixo
 * 4. Em "Implantar" → "Nova implantação":
 *    - Tipo: App da Web
 *    - Executar como: Eu mesmo
 *    - Quem tem acesso: Qualquer pessoa
 * 5. Copie a URL gerada e cole em frontend/js/api.js (GAS_URL)
 * 6. Configure a senha em definirSenha() e execute uma vez
 */

// ── CONFIGURAÇÃO ──────────────────────────────────────────────
const SPREADSHEET_ID = 'SEU_SPREADSHEET_ID_AQUI';
const SENHA_HASH_KEY = 'precificaz_senha_hash'; // salvo em PropertiesService

// Abas da planilha
const SHEETS = {
  MATERIAIS:   'Materiais',
  PECAS:       'Peças',
  ESTOQUE:     'Estoque',
  PRECOS:      'Preços',
  SESSOES:     'Sessões',
};

// ── ENTRY POINT ───────────────────────────────────────────────
function doPost(e) {
  const params = e.parameter;
  const action = params.action || '';
  const token  = params.token  || '';

  // Ações públicas (sem autenticação)
  const PUBLIC_ACTIONS = ['login'];

  try {
    if (!PUBLIC_ACTIONS.includes(action) && !validarToken(token)) {
      return jsonResponse({ ok: false, error: 'Sessão expirada. Faça login novamente.' });
    }

    switch (action) {
      case 'login':           return handleLogin(params);
      case 'getMateriais':    return handleGetMateriais();
      case 'saveMaterial':    return handleSaveMaterial(params);
      case 'deleteMaterial':  return handleDeleteMaterial(params);
      case 'getPecas':        return handleGetPecas();
      case 'savePeca':        return handleSavePeca(params);
      case 'deletePeca':      return handleDeletePeca(params);
      case 'getEstoque':      return handleGetEstoque();
      case 'movimentarEstoque': return handleMovimentarEstoque(params);
      case 'calcularCusto':   return handleCalcularCusto(params);
      case 'salvarPreco':     return handleSalvarPreco(params);
      case 'getPrecos':       return handleGetPrecos();
      case 'getDashboard':    return handleGetDashboard();
      case 'uploadImagem':    return handleUploadImagem(params);
      default:
        return jsonResponse({ ok: false, error: `Ação desconhecida: ${action}` });
    }
  } catch (err) {
    console.error('PRECIFICAZ ERROR:', err);
    return jsonResponse({ ok: false, error: err.message });
  }
}

// GET também suportado (para testes via browser)
function doGet(e) {
  return jsonResponse({ ok: true, message: 'Precificaz API online 🌿' });
}

// ── AUTENTICAÇÃO ──────────────────────────────────────────────
function handleLogin(params) {
  const senhaDigitada = params.senha || '';
  const senhaHash     = PropertiesService.getScriptProperties().getProperty(SENHA_HASH_KEY);

  if (!senhaHash) {
    return jsonResponse({ ok: false, error: 'Senha não configurada. Execute definirSenha() no Apps Script.' });
  }

  if (Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senhaDigitada)
        .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('') !== senhaHash) {
    return jsonResponse({ ok: false, error: 'Senha incorreta.' });
  }

  const token = criarToken();
  return jsonResponse({ ok: true, token, user: 'Artesã' });
}

function criarToken() {
  const token = Utilities.getUuid();
  const expiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 dias
  const sheet  = getOrCreateSheet(SHEETS.SESSOES, ['token', 'expiry']);
  sheet.appendRow([token, expiry]);
  limparTokensExpirados(sheet);
  return token;
}

function validarToken(token) {
  if (!token) return false;
  const sheet = getOrCreateSheet(SHEETS.SESSOES, ['token', 'expiry']);
  const data  = sheet.getDataRange().getValues();
  const now   = Date.now();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token && Number(data[i][1]) > now) return true;
  }
  return false;
}

function limparTokensExpirados(sheet) {
  const data = sheet.getDataRange().getValues();
  const now  = Date.now();
  for (let i = data.length - 1; i >= 1; i--) {
    if (Number(data[i][1]) < now) sheet.deleteRow(i + 1);
  }
}

// Rode esta função uma vez no Apps Script para definir a senha
function definirSenha() {
  const NOVA_SENHA = 'precificaz123'; // ← ALTERE AQUI antes de rodar
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, NOVA_SENHA)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  PropertiesService.getScriptProperties().setProperty(SENHA_HASH_KEY, hash);
  Logger.log('Senha definida com sucesso!');
}

// ── MATERIAIS ─────────────────────────────────────────────────
function handleGetMateriais() {
  const sheet = getOrCreateSheet(SHEETS.MATERIAIS,
    ['id','nome','categoria','preco','unidade','qtd','fornecedor','obs','foto','criadoEm']);
  return jsonResponse({ ok: true, data: sheetToObjects(sheet) });
}

function handleSaveMaterial(params) {
  const mat   = JSON.parse(params.data);
  const sheet = getOrCreateSheet(SHEETS.MATERIAIS,
    ['id','nome','categoria','preco','unidade','qtd','fornecedor','obs','foto','criadoEm']);

  const row = findRowById(sheet, mat.id);
  const values = [
    mat.id, mat.nome || '', mat.categoria || '',
    mat.preco || 0, mat.unidade || '', mat.qtd || 0,
    mat.fornecedor || '', mat.obs || '',
    mat.foto || '',
    row ? sheet.getRange(row, 10).getValue() : new Date().toISOString()
  ];

  if (row) {
    sheet.getRange(row, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }

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
  const peca  = JSON.parse(params.data);
  const sheet = getOrCreateSheet(SHEETS.PECAS,
    ['id','nome','categoria','desc','horas','valorHora','materiais','custoTotal','foto','criadoEm']);

  const row = findRowById(sheet, peca.id);
  const values = [
    peca.id, peca.nome || '', peca.categoria || '', peca.desc || '',
    peca.horas || 0, peca.valorHora || 0,
    peca.materiais || '[]',
    peca.custoTotal || 0,
    peca.foto || '',
    row ? sheet.getRange(row, 10).getValue() : new Date().toISOString()
  ];

  if (row) {
    sheet.getRange(row, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }

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
  const mov   = JSON.parse(params.data);
  const sheet = getOrCreateSheet(SHEETS.ESTOQUE,
    ['id','tipo','materialId','quantidade','data','obs','registradoEm']);
  sheet.appendRow([
    mov.id, mov.tipo, mov.materialId,
    mov.quantidade, mov.data, mov.obs || '',
    new Date().toISOString()
  ]);
  return jsonResponse({ ok: true });
}

// ── PRECIFICAÇÃO ──────────────────────────────────────────────
function handleCalcularCusto(params) {
  const pecaSheet = getOrCreateSheet(SHEETS.PECAS, []);
  const matSheet  = getOrCreateSheet(SHEETS.MATERIAIS, []);
  const pecaRow   = findRowById(pecaSheet, params.pecaId);
  if (!pecaRow) return jsonResponse({ ok: false, error: 'Peça não encontrada.' });

  const peca     = rowToObject(pecaSheet, pecaRow);
  const mats     = JSON.parse(peca.materiais || '[]');
  const allMats  = sheetToObjects(matSheet);

  let custoMats = 0;
  mats.forEach(item => {
    const mat = allMats.find(m => m.id === item.materialId);
    if (mat) custoMats += (parseFloat(mat.preco) || 0) * (parseFloat(item.quantidade) || 0);
  });

  const custoMO    = (parseFloat(peca.horas) || 0) * (parseFloat(peca.valorHora) || 0);
  const custoTotal = custoMats + custoMO;

  return jsonResponse({ ok: true, custoMats, custoMO, custoTotal });
}

function handleSalvarPreco(params) {
  const preco = JSON.parse(params.data);
  const sheet = getOrCreateSheet(SHEETS.PRECOS,
    ['id','pecaId','pecaNome','custoTotal','outros','margem','taxa','precoFinal','data','criadoEm']);
  sheet.appendRow([
    preco.id, preco.pecaId, preco.pecaNome,
    preco.custoTotal, preco.outros, preco.margem,
    preco.taxa, preco.precoFinal, preco.data,
    new Date().toISOString()
  ]);
  return jsonResponse({ ok: true });
}

function handleGetPrecos() {
  const sheet = getOrCreateSheet(SHEETS.PRECOS,
    ['id','pecaId','pecaNome','custoTotal','outros','margem','taxa','precoFinal','data','criadoEm']);
  const data  = sheetToObjects(sheet).reverse(); // mais recentes primeiro
  return jsonResponse({ ok: true, data });
}

// ── DASHBOARD ─────────────────────────────────────────────────
function handleGetDashboard() {
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const getMat  = ss.getSheetByName(SHEETS.MATERIAIS);
  const getPeca = ss.getSheetByName(SHEETS.PECAS);
  const getEst  = ss.getSheetByName(SHEETS.ESTOQUE);
  const getPrec = ss.getSheetByName(SHEETS.PRECOS);

  return jsonResponse({
    ok: true,
    materiais: getMat  ? Math.max(0, getMat.getLastRow()  - 1) : 0,
    pecas:     getPeca ? Math.max(0, getPeca.getLastRow() - 1) : 0,
    estoque:   getEst  ? Math.max(0, getEst.getLastRow()  - 1) : 0,
    precos:    getPrec ? Math.max(0, getPrec.getLastRow() - 1) : 0,
  });
}

// ── UPLOAD DE IMAGEM (Google Drive) ──────────────────────────
function handleUploadImagem(params) {
  // Imagem como base64 já é armazenada direto na célula do Sheets.
  // Esta função é um placeholder para futura migração para Drive se necessário.
  return jsonResponse({ ok: true, url: params.base64 });
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
  }).filter(obj => obj.id); // ignora linhas sem ID
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
