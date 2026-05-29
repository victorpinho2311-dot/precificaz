# Precificaz 🌿

App PWA para precificação de artigos artesanais com controle de materiais e estoque.

---

## Stack

| Camada   | Tecnologia                        |
|----------|-----------------------------------|
| Frontend | HTML + CSS + JS (vanilla)        |
| Backend  | Google Apps Script + Sheets       |
| Deploy   | GitHub Pages                      |
| PWA      | Service Worker + Web App Manifest |

---

## Estrutura do projeto

O frontend fica na **raiz** do repositório (é o que o GitHub Pages publica).

```
precificaz/
├── index.html          ← SPA shell
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker
├── assets/
│   └── icons/          ← Ícones PWA (icon-192.png, icon-512.png)
├── css/
│   ├── tokens.css      ← Design tokens (cores, tipografia, espaçamento)
│   ├── base.css        ← Reset + estilos globais + textura
│   └── components.css  ← Componentes reutilizáveis
├── js/
│   ├── utils.js        ← Helpers (moeda, toast, base64...)
│   ├── api.js          ← Comunicação com o backend (GAS)
│   ├── auth.js         ← Autenticação/sessão
│   ├── router.js       ← Roteamento SPA
│   └── app.js          ← Inicialização + PWA install
├── pages/
│   ├── login.html
│   ├── dashboard.html
│   ├── materiais.html
│   ├── pecas.html
│   ├── estoque.html
│   └── precificacao.html
└── backend/
    └── Code.gs         ← Google Apps Script completo
```

---

## Setup — Passo a passo

### 1. Backend (Google Apps Script)

1. Acesse [script.google.com](https://script.google.com) → **Novo projeto**
2. Cole o conteúdo de `backend/Code.gs`
3. Crie uma **Planilha Google** em branco e copie o ID da URL
   - URL: `docs.google.com/spreadsheets/d/SEU_ID/edit`
4. Coloque esse ID em `SPREADSHEET_ID` no topo do `Code.gs`
5. Defina a senha **sem colocá-la no código** (o repositório é público):
   - ⚙ **Configurações do projeto** → **Propriedades do script** → adicionar
     `precificaz_nova_senha` = a senha desejada
6. Clique no menu **Executar** → **definirSenha** (rode uma única vez).
   A função grava o hash e apaga a propriedade da senha.
7. Em **Implantar** → **Nova implantação**:
   - Tipo: **App da Web**
   - Executar como: **Eu mesmo**
   - Quem tem acesso: **Qualquer pessoa**
8. Copie a URL gerada (ex: `https://script.google.com/macros/s/ABC.../exec`)

### 2. Frontend — conectar ao backend

Abra `js/api.js` e ajuste o `GAS_URL` com a URL da sua implantação:
```javascript
const GAS_URL = 'https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec';
```

### 3. GitHub Pages

```bash
# Clonar / iniciar repositório
git init
git remote add origin https://github.com/victorpinho2311-dot/precificaz.git

# Adicionar todos os arquivos
git add .
git commit -m "feat: projeto inicial Precificaz"
git push -u origin main

# Ativar GitHub Pages
# Em: Settings → Pages → Branch: main → Folder: / (root) → Save
```

A URL final será:
```
https://victorpinho2311-dot.github.io/precificaz/
```

### 4. Ícones PWA (necessário para instalação no iPhone)

Já existem ícones em `assets/icons/` (`icon-192.png` e `icon-512.png`).
Para trocar por um logo próprio, substitua esses dois arquivos mantendo os
mesmos nomes e tamanhos (192×192 e 512×512).

### 5. Instalar no iPhone

1. Acesse a URL no Safari do iPhone
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**
3. O app abrirá em modo standalone (sem barra do Safari)

---

## Design System

Os tokens de design estão em `css/tokens.css`.
O visual final será definido após o prompt de UX.
Por ora, os tokens seguem o sistema **Organic/Natural** como base.

---

## Funcionalidades

| Módulo        | Funcionalidade                                    | Status |
|---------------|---------------------------------------------------|--------|
| Login         | Autenticação por senha + sessão 7 dias           | ✅     |
| Materiais     | CRUD + foto + categoria + unidade + fornecedor   | ✅     |
| Peças         | CRUD + foto + composição de materiais + MO       | ✅     |
| Estoque       | Entrada/saída de materiais + histórico           | ✅     |
| Precificação  | Cálculo com margem + taxa + histórico de preços  | ✅     |
| Dashboard     | Contadores rápidos + atalhos de navegação        | ✅     |
| PWA           | Instalável no iPhone + offline (cache estático)  | ✅     |

---

## Notas técnicas

- **Imagens**: armazenadas como base64 diretamente no Sheets (redimensionadas para 400px antes do upload)
- **Token de sessão**: válido por 7 dias, armazenado no localStorage do iPhone
- **Offline**: assets estáticos em cache via Service Worker; chamadas ao GAS requerem conexão
- **Segurança**: senha com hash SHA-256, token UUID por sessão
