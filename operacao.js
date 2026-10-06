// ==================== OPERAÇÃO: FORNECEDOR → FERNANDES TÊXTIL → CLIENTE ====================
//
// Compras (entradas do fornecedor) .... somam no estoque e geram valor A PAGAR
// Pedidos do cliente .................. geram valor A RECEBER e peças A ENTREGAR
// Envios ao cliente (por cor) ......... baixam do estoque
// Comissão ............................ (preço de venda − custo) dos pedidos aceitos − retiradas
//
// Lado da empresa:  "/" (admin)          Lado do cliente:  "/p/<token>" (sem senha)

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const STATUS_PEDIDO = ['Solicitado', 'Recebido', 'Em produção', 'Pronto para entrega', 'Entregue parcialmente', 'Entregue', 'Cancelado'];
const FORMAS_PAGAMENTO = ['Pix', 'Transferência', 'Boleto', 'Dinheiro', 'Cheque', 'Cartão', 'Outro'];
const EMPRESA = 'Fernandes Têxtil';
const ANEXOS_CLIENTE = ['pedido', 'entrega', 'pagamento'];            // o cliente vê
const ANEXOS_PRIVADOS = ['compra', 'pagfornecedor', 'retirada'];       // só o admin vê
const FORA_DO_SALDO = ['Solicitado', 'Cancelado'];                     // não contam até serem aceitos

module.exports = function criarOperacao({ db, exigirAdmin, exigirAdminGet, baseDir, dataDir }) {
  const router = express.Router();

  // ==================== SCHEMA ====================
  // As tabelas portal_* vêm da versão anterior e continuam valendo (dados preservados).
  db.exec(`
  CREATE TABLE IF NOT EXISTS portal_clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL, contato TEXT, telefone TEXT, observacoes TEXT,
    token TEXT UNIQUE NOT NULL, ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS portal_pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL, numero INTEGER NOT NULL,
    data_pedido DATE NOT NULL, previsao_entrega DATE,
    status TEXT DEFAULT 'Recebido', observacoes TEXT,
    valor_total REAL DEFAULT 0, qtd_total REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cliente_id, numero)
  );
  CREATE TABLE IF NOT EXISTS portal_pedido_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL, produto_id INTEGER, produto_nome TEXT NOT NULL,
    unidade TEXT DEFAULT 'peças', quantidade REAL NOT NULL,
    preco_unitario REAL NOT NULL, subtotal REAL NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES portal_pedidos(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS portal_entregas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL, pedido_id INTEGER NOT NULL,
    data DATE NOT NULL, quantidade REAL NOT NULL, observacao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES portal_pedidos(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS portal_pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL, pedido_id INTEGER,
    data DATE NOT NULL, valor REAL NOT NULL, forma TEXT, observacao TEXT,
    status TEXT DEFAULT 'Confirmado', informado_por TEXT DEFAULT 'empresa',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS portal_anexos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL, tipo TEXT NOT NULL, ref_id INTEGER NOT NULL,
    arquivo TEXT NOT NULL, nome_original TEXT, mime TEXT,
    enviado_por TEXT DEFAULT 'empresa',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS portal_historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL, pedido_id INTEGER,
    tipo TEXT NOT NULL, descricao TEXT NOT NULL,
    autor TEXT DEFAULT 'empresa', autor_nome TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS op_config (chave TEXT PRIMARY KEY, valor TEXT);
  CREATE TABLE IF NOT EXISTS op_produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL, descricao TEXT, unidade TEXT DEFAULT 'peças',
    preco REAL DEFAULT 0,          -- venda ao cliente
    custo REAL DEFAULT 0,          -- compra do fornecedor
    cores TEXT DEFAULT '[]',       -- [{"nome":"Azul","hex":"#1e63d6"}]
    foto TEXT, ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS op_envio_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entrega_id INTEGER NOT NULL, produto_id INTEGER, produto_nome TEXT NOT NULL,
    cor TEXT DEFAULT '', quantidade REAL NOT NULL,
    FOREIGN KEY (entrega_id) REFERENCES portal_entregas(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS op_compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data DATE NOT NULL, nota TEXT, observacao TEXT,
    valor_total REAL DEFAULT 0, qtd_total REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS op_compra_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compra_id INTEGER NOT NULL, produto_id INTEGER, produto_nome TEXT NOT NULL,
    cor TEXT DEFAULT '', quantidade REAL NOT NULL, custo_unitario REAL NOT NULL, subtotal REAL NOT NULL,
    FOREIGN KEY (compra_id) REFERENCES op_compras(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS op_pagamentos_fornecedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data DATE NOT NULL, valor REAL NOT NULL, forma TEXT, observacao TEXT, compra_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS op_retiradas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data DATE NOT NULL, valor REAL NOT NULL, observacao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS op_ajustes_estoque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER, produto_nome TEXT NOT NULL, cor TEXT DEFAULT '',
    quantidade REAL NOT NULL, motivo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_portal_pedidos_cliente ON portal_pedidos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_portal_hist ON portal_historico(created_at);
  CREATE INDEX IF NOT EXISTS idx_portal_anexos_ref ON portal_anexos(tipo, ref_id);
  `);
  const novaColuna = sql => { try { db.exec(sql); } catch (e) { /* já existe */ } };
  novaColuna("ALTER TABLE portal_pedido_itens ADD COLUMN cor TEXT DEFAULT ''");
  novaColuna('ALTER TABLE portal_pedido_itens ADD COLUMN custo_unitario REAL DEFAULT 0');
  novaColuna('ALTER TABLE portal_historico ADD COLUMN privado INTEGER DEFAULT 0');

  // Migração: produtos da versão anterior (portal_produtos) → op_produtos, mantendo os ids
  const temTabela = n => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(n);
  if (temTabela('portal_produtos') && !db.prepare('SELECT 1 FROM op_produtos LIMIT 1').get()) {
    db.exec(`INSERT INTO op_produtos (id, nome, descricao, unidade, preco, ativo, created_at)
             SELECT id, nome, descricao, unidade, preco, ativo, created_at FROM portal_produtos`);
  }

  // ==================== UPLOADS ====================
  const pastaUploads = path.join(dataDir, 'uploads', 'portal');
  fs.mkdirSync(pastaUploads, { recursive: true });
  const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'application/pdf'];
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, pastaUploads),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6);
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
      }
    }),
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      if (MIMES.includes(file.mimetype)) cb(null, true);
      else cb(new Error('Envie uma foto (JPG, PNG) ou PDF'));
    }
  });
  const receberArquivo = (req, res, next) => upload.single('arquivo')(req, res, err => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande (máx. 15 MB)' : err.message });
    next();
  });
  const descartarUpload = req => { if (req.file) fs.rm(req.file.path, { force: true }, () => {}); };
  const apagarArquivo = nome => { if (nome) fs.rm(path.join(pastaUploads, nome), { force: true }, () => {}); };

  // ==================== TEMPO REAL (SSE) ====================
  const ouvintes = new Set(); // { admin: bool, token, res }
  function abrirStream(req, res, ouvinte) {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write('retry: 5000\nevent: ping\ndata: {}\n\n');
    const o = { ...ouvinte, res };
    ouvintes.add(o);
    const ping = setInterval(() => res.write('event: ping\ndata: {}\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); ouvintes.delete(o); });
  }
  // Eventos privados (fornecedor, comissão, estoque) só vão para o admin
  function notificar(evento = {}) {
    const dados = `event: atualizacao\ndata: ${JSON.stringify(evento)}\n\n`;
    for (const o of ouvintes) if (o.admin || !evento.privado) o.res.write(dados);
  }

  // ==================== HELPERS ====================
  const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const qtd = v => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const dataBR = s => (s ? s.split('-').reverse().join('/') : '');
  const hoje = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const novoToken = () => crypto.randomBytes(18).toString('base64url');
  const texto = (v, max = 500) => (v == null ? '' : String(v).trim().slice(0, max));
  // Aceita 1500 | 1500.5 | 1.500 | 1.500,50 | "R$ 1.500,50"
  const numero = v => {
    if (typeof v === 'number') return v;
    let t = String(v ?? '').replace(/[R$\s]/g, '');
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    const n = Number(t);
    return t && Number.isFinite(n) ? n : NaN;
  };
  const dataValida = s => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : null);
  const arred = v => Math.round(v * 100) / 100;
  const lerJSON = (s, padrao) => { try { const v = typeof s === 'string' ? JSON.parse(s) : s; return v ?? padrao; } catch (e) { return padrao; } };
  const lerCores = s => lerJSON(s, []).filter(c => c && c.nome).map(c => ({ nome: String(c.nome), hex: /^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : '#8e8e93' }));
  const chave = (produtoId, cor) => `${produtoId}|${(cor || '').toLowerCase()}`;
  const config = k => { const r = db.prepare('SELECT valor FROM op_config WHERE chave = ?').get(k); return r ? r.valor : ''; };
  const definirConfig = (k, v) => db.prepare('INSERT INTO op_config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').run(k, v);

  // O cliente da operação (o mais usado, caso existam registros de testes antigos)
  function clienteAtual() {
    return db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM portal_pedidos p WHERE p.cliente_id = c.id) AS n
                       FROM portal_clientes c ORDER BY c.ativo DESC, n DESC, c.id LIMIT 1`).get() || null;
  }
  const idCliente = () => { const c = clienteAtual(); return c ? c.id : 0; };

  function registrar({ pedidoId = null, tipo, descricao, autor = 'empresa', autorNome = EMPRESA, privado = false }) {
    db.prepare('INSERT INTO portal_historico (cliente_id, pedido_id, tipo, descricao, autor, autor_nome, privado) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(idCliente(), pedidoId, tipo, descricao, autor, autorNome, privado ? 1 : 0);
  }

  function salvarAnexo(tipo, refId, file, enviadoPor = 'empresa') {
    if (!file) return null;
    const dono = ANEXOS_PRIVADOS.includes(tipo) ? 0 : idCliente();
    return db.prepare('INSERT INTO portal_anexos (cliente_id, tipo, ref_id, arquivo, nome_original, mime, enviado_por) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(dono, tipo, refId, file.filename, texto(file.originalname, 200), file.mimetype, enviadoPor).lastInsertRowid;
  }
  function apagarAnexosDe(tipo, ids) {
    if (!ids.length) return;
    const m = ids.map(() => '?').join(',');
    for (const a of db.prepare(`SELECT arquivo FROM portal_anexos WHERE tipo = ? AND ref_id IN (${m})`).all(tipo, ...ids)) apagarArquivo(a.arquivo);
    db.prepare(`DELETE FROM portal_anexos WHERE tipo = ? AND ref_id IN (${m})`).run(tipo, ...ids);
  }

  function produto(id) {
    const p = db.prepare('SELECT * FROM op_produtos WHERE id = ?').get(id);
    return p ? { ...p, cores: lerCores(p.cores) } : null;
  }

  // Valida itens {produto_id, cor, quantidade, preco_unitario?}. "campoPreco" diz de onde vem o
  // preço padrão (preco = venda, custo = compra); "permitirPreco" aceita o preço informado.
  function lerItens(brutos, { campoPreco = 'preco', permitirPreco = false, exigirAtivo = false } = {}) {
    if (typeof brutos === 'string') brutos = lerJSON(brutos, []);
    if (!Array.isArray(brutos) || !brutos.length) throw new Error('Adicione pelo menos um item');
    if (brutos.length > 60) throw new Error('Máximo de 60 itens');
    const mapa = new Map();
    for (const b of brutos) {
      const p = produto(b.produto_id);
      if (!p || (exigirAtivo && !p.ativo)) throw new Error('Produto indisponível. Atualize a página e tente de novo.');
      let cor = '';
      if (p.cores.length) {
        const c = p.cores.find(x => x.nome.toLowerCase() === String(b.cor || '').trim().toLowerCase());
        if (!c) throw new Error(`Escolha uma cor válida para ${p.nome}`);
        cor = c.nome;
      }
      const quantidade = numero(b.quantidade);
      if (!(quantidade > 0) || quantidade > 10000000) throw new Error('Quantidade inválida');
      let preco = p[campoPreco] || 0;
      const informado = b.preco_unitario ?? b.custo_unitario;
      if (permitirPreco && informado !== undefined && informado !== null && informado !== '') {
        preco = numero(informado);
        if (!(preco >= 0)) throw new Error('Preço inválido');
      }
      const k = `${chave(p.id, cor)}|${preco}`;
      const atual = mapa.get(k);
      if (atual) atual.quantidade += quantidade;
      else mapa.set(k, { produto_id: p.id, produto_nome: p.nome, unidade: p.unidade || 'peças', cor, quantidade, preco_unitario: preco, custo_unitario: p.custo || 0 });
    }
    return [...mapa.values()].map(i => ({ ...i, subtotal: arred(i.quantidade * i.preco_unitario) }));
  }

  // "Toalha 70x140: 250 Azul, 100 Vermelho"
  function resumoItens(itens) {
    const grupos = new Map();
    for (const i of itens) {
      if (!grupos.has(i.produto_nome)) grupos.set(i.produto_nome, []);
      grupos.get(i.produto_nome).push(`${qtd(i.quantidade)}${i.cor ? ' ' + i.cor : ` ${i.unidade || 'peças'}`}`);
    }
    return [...grupos].map(([n, l]) => `${n}: ${l.join(', ')}`).join(' · ');
  }

  function gravarItensPedido(pedidoId, itens) {
    db.prepare('DELETE FROM portal_pedido_itens WHERE pedido_id = ?').run(pedidoId);
    const ins = db.prepare('INSERT INTO portal_pedido_itens (pedido_id, produto_id, produto_nome, unidade, cor, quantidade, preco_unitario, custo_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const i of itens) ins.run(pedidoId, i.produto_id, i.produto_nome, i.unidade, i.cor, i.quantidade, i.preco_unitario, i.custo_unitario, i.subtotal);
    const valor = arred(itens.reduce((s, i) => s + i.subtotal, 0));
    const q = itens.reduce((s, i) => s + i.quantidade, 0);
    db.prepare('UPDATE portal_pedidos SET valor_total = ?, qtd_total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(valor, q, pedidoId);
    return valor;
  }

  function atualizarStatusPorEntregas(pedidoId) {
    const p = db.prepare('SELECT * FROM portal_pedidos WHERE id = ?').get(pedidoId);
    if (!p || FORA_DO_SALDO.includes(p.status)) return null;
    const entregue = db.prepare('SELECT COALESCE(SUM(quantidade), 0) AS q FROM portal_entregas WHERE pedido_id = ?').get(pedidoId).q;
    let novo = p.status;
    if (entregue >= p.qtd_total && p.qtd_total > 0) novo = 'Entregue';
    else if (entregue > 0) novo = 'Entregue parcialmente';
    else if (['Entregue', 'Entregue parcialmente'].includes(p.status)) novo = 'Pronto para entrega';
    if (novo === p.status) return null;
    db.prepare('UPDATE portal_pedidos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(novo, pedidoId);
    registrar({ pedidoId, tipo: 'status', descricao: `Pedido #${p.numero}: ${p.status} → ${novo}` });
    return novo;
  }

  // ==================== CÁLCULOS ====================
  function calcular() {
    const cli = clienteAtual();
    const cid = cli ? cli.id : -1;
    const produtos = db.prepare('SELECT * FROM op_produtos ORDER BY ativo DESC, id').all().map(p => ({
      ...p, cores: lerCores(p.cores), foto_url: p.foto ? `/foto-produto/${p.id}?v=${encodeURIComponent(p.foto.slice(0, 13))}` : null
    }));
    const hexDe = (produtoId, cor) => {
      const p = produtos.find(x => x.id === produtoId);
      const c = p && p.cores.find(x => x.nome.toLowerCase() === (cor || '').toLowerCase());
      return c ? c.hex : null;
    };

    const pedidos = db.prepare('SELECT * FROM portal_pedidos WHERE cliente_id = ? ORDER BY numero DESC').all(cid);
    const itens = db.prepare('SELECT i.* FROM portal_pedido_itens i JOIN portal_pedidos p ON p.id = i.pedido_id WHERE p.cliente_id = ? ORDER BY i.id').all(cid);
    const entregas = db.prepare('SELECT * FROM portal_entregas WHERE cliente_id = ? ORDER BY data DESC, id DESC').all(cid);
    const envioItens = db.prepare('SELECT ei.*, e.pedido_id FROM op_envio_itens ei JOIN portal_entregas e ON e.id = ei.entrega_id WHERE e.cliente_id = ? ORDER BY ei.id').all(cid);
    const recebimentos = db.prepare('SELECT * FROM portal_pagamentos WHERE cliente_id = ? ORDER BY data DESC, id DESC').all(cid);
    const compras = db.prepare('SELECT * FROM op_compras ORDER BY data DESC, id DESC').all();
    const compraItens = db.prepare('SELECT * FROM op_compra_itens ORDER BY id').all();
    const pagFornecedor = db.prepare('SELECT * FROM op_pagamentos_fornecedor ORDER BY data DESC, id DESC').all();
    const retiradas = db.prepare('SELECT * FROM op_retiradas ORDER BY data DESC, id DESC').all();
    const ajustes = db.prepare('SELECT * FROM op_ajustes_estoque ORDER BY id DESC').all();
    const anexos = db.prepare('SELECT id, tipo, ref_id, nome_original, mime, enviado_por, created_at FROM portal_anexos WHERE cliente_id IN (?, 0) ORDER BY id').all(cid);
    const anexosDe = (tipo, id) => anexos.filter(a => a.tipo === tipo && a.ref_id === id);

    for (const e of entregas) {
      e.itens = envioItens.filter(i => i.entrega_id === e.id).map(i => ({ ...i, hex: hexDe(i.produto_id, i.cor) }));
      e.anexos = anexosDe('entrega', e.id);
      const p = pedidos.find(x => x.id === e.pedido_id);
      e.pedido_numero = p ? p.numero : null;
    }
    for (const g of recebimentos) {
      g.anexos = anexosDe('pagamento', g.id);
      const p = pedidos.find(x => x.id === g.pedido_id);
      g.pedido_numero = p ? p.numero : null;
    }
    for (const p of pedidos) {
      p.itens = itens.filter(i => i.pedido_id === p.id).map(i => {
        const entregue = envioItens.filter(x => x.pedido_id === p.id && chave(x.produto_id, x.cor) === chave(i.produto_id, i.cor)).reduce((s, x) => s + x.quantidade, 0);
        return { ...i, hex: hexDe(i.produto_id, i.cor), entregue, falta: Math.max(0, i.quantidade - entregue) };
      });
      p.entregas = entregas.filter(e => e.pedido_id === p.id);
      p.qtd_entregue = p.entregas.reduce((s, e) => s + e.quantidade, 0);
      p.valor_pago = recebimentos.filter(g => g.pedido_id === p.id && g.status === 'Confirmado').reduce((s, g) => s + g.valor, 0);
      // Itens de versões antigas não têm custo gravado: usa o custo atual do produto
      for (const i of p.itens) if (!i.custo_unitario) i.custo_unitario = (produtos.find(x => x.id === i.produto_id) || {}).custo || 0;
      p.custo_total = arred(p.itens.reduce((s, i) => s + i.quantidade * i.custo_unitario, 0));
      p.comissao = arred(p.valor_total - p.custo_total);
      p.anexos = anexosDe('pedido', p.id);
    }
    for (const c of compras) {
      c.itens = compraItens.filter(i => i.compra_id === c.id).map(i => ({ ...i, hex: hexDe(i.produto_id, i.cor) }));
      c.anexos = anexosDe('compra', c.id);
    }
    for (const g of pagFornecedor) g.anexos = anexosDe('pagfornecedor', g.id);
    for (const r of retiradas) r.anexos = anexosDe('retirada', r.id);

    // Estoque por produto/cor = entradas − envios + ajustes
    const est = new Map();
    const linhaEst = (produtoId, nome, cor) => {
      const k = chave(produtoId, cor);
      if (!est.has(k)) est.set(k, { produto_id: produtoId, produto_nome: nome, cor: cor || '', hex: hexDe(produtoId, cor), entradas: 0, saidas: 0, ajustes: 0, a_entregar: 0 });
      return est.get(k);
    };
    for (const p of produtos) {
      if (p.cores.length) p.cores.forEach(c => linhaEst(p.id, p.nome, c.nome));
      else linhaEst(p.id, p.nome, '');
    }
    for (const i of compraItens) linhaEst(i.produto_id, i.produto_nome, i.cor).entradas += i.quantidade;
    for (const i of envioItens) linhaEst(i.produto_id, i.produto_nome, i.cor).saidas += i.quantidade;
    for (const a of ajustes) linhaEst(a.produto_id, a.produto_nome, a.cor).ajustes += a.quantidade;
    const aceitos = pedidos.filter(p => !FORA_DO_SALDO.includes(p.status));
    for (const p of aceitos) for (const i of p.itens) if (i.falta > 0) linhaEst(i.produto_id, i.produto_nome, i.cor).a_entregar += i.falta;
    const estoque = [...est.values()].map(l => {
      const saldo = l.entradas - l.saidas + l.ajustes;
      return { ...l, saldo, falta_comprar: Math.max(0, l.a_entregar - Math.max(0, saldo)) };
    });

    const soma = (lista, f) => arred(lista.reduce((s, x) => s + (typeof f === 'function' ? f(x) : x[f]), 0));
    const totalVendas = soma(aceitos, 'valor_total');
    const recebido = soma(recebimentos.filter(g => g.status === 'Confirmado'), 'valor');
    const totalCompras = soma(compras, 'valor_total');
    const pago = soma(pagFornecedor, 'valor');
    const comissaoGerada = soma(aceitos, 'comissao');
    const retirado = soma(retiradas, 'valor');
    const resumo = {
      total_vendas: totalVendas,
      recebido,
      a_receber: arred(totalVendas - recebido),
      total_compras: totalCompras,
      pago_fornecedor: pago,
      a_pagar: arred(totalCompras - pago),
      comissao_gerada: comissaoGerada,
      retirado,
      comissao_disponivel: arred(comissaoGerada - retirado),
      caixa: arred(recebido - pago - retirado),
      qtd_a_entregar: aceitos.reduce((s, p) => s + Math.max(0, p.qtd_total - p.qtd_entregue), 0),
      valor_a_entregar: arred(aceitos.reduce((s, p) => s + p.itens.reduce((t, i) => t + i.falta * i.preco_unitario, 0), 0)),
      estoque_total: estoque.reduce((s, l) => s + l.saldo, 0),
      falta_comprar: estoque.reduce((s, l) => s + l.falta_comprar, 0),
      pedidos_abertos: aceitos.filter(p => p.status !== 'Entregue').length,
      pedidos_solicitados: pedidos.filter(p => p.status === 'Solicitado').length,
      pagamentos_pendentes: recebimentos.filter(g => g.status === 'Aguardando confirmação').length
    };
    return { cli, produtos, pedidos, entregas, recebimentos, compras, pagFornecedor, retiradas, ajustes, estoque, resumo };
  }

  function painelAdmin() {
    const c = calcular();
    const historico = db.prepare('SELECT * FROM portal_historico ORDER BY created_at DESC, id DESC LIMIT 400').all();
    return {
      cliente: c.cli,
      fornecedor: { nome: config('fornecedor_nome'), contato: config('fornecedor_contato'), telefone: config('fornecedor_telefone') },
      resumo: c.resumo, produtos: c.produtos, pedidos: c.pedidos, entregas: c.entregas, recebimentos: c.recebimentos,
      compras: c.compras, pagamentos_fornecedor: c.pagFornecedor, retiradas: c.retiradas, ajustes: c.ajustes,
      estoque: c.estoque, historico, status_pedido: STATUS_PEDIDO, formas_pagamento: FORMAS_PAGAMENTO
    };
  }

  // O cliente não vê custo, comissão, fornecedor, estoque nem eventos privados
  function painelCliente(cli) {
    const c = calcular();
    const r = c.resumo;
    const semCusto = ({ custo_unitario, ...resto }) => resto;
    const historico = db.prepare('SELECT * FROM portal_historico WHERE cliente_id = ? AND privado = 0 ORDER BY created_at DESC, id DESC LIMIT 300').all(cli.id)
      .map(h => (h.autor === 'cliente' ? h : { ...h, autor_nome: EMPRESA }));
    return {
      empresa: EMPRESA,
      cliente: { nome: cli.nome, contato: cli.contato },
      resumo: {
        saldo: r.a_receber, total_pedidos: r.total_vendas, total_pago: r.recebido,
        pedidos_abertos: r.pedidos_abertos, qtd_a_entregar: r.qtd_a_entregar, pedidos_solicitados: r.pedidos_solicitados
      },
      produtos: c.produtos.filter(p => p.ativo).map(p => ({ id: p.id, nome: p.nome, descricao: p.descricao, unidade: p.unidade, preco: p.preco, cores: p.cores, foto_url: p.foto_url })),
      pedidos: c.pedidos.map(({ custo_total, comissao, ...p }) => ({ ...p, itens: p.itens.map(semCusto) })),
      entregas: c.entregas,
      recebimentos: c.recebimentos,
      historico,
      formas_pagamento: FORMAS_PAGAMENTO
    };
  }

  // Erros de validação viram 400 (e o upload é descartado)
  const acao = fn => (req, res) => {
    try { fn(req, res); } catch (e) { descartarUpload(req); res.status(400).json({ error: e.message || 'Erro' }); }
  };
  const pedidoDoCliente = id => db.prepare('SELECT * FROM portal_pedidos WHERE id = ? AND cliente_id = ?').get(id, idCliente());
  const exigirCliente = () => { const c = clienteAtual(); if (!c) throw new Error('Cadastre o cliente primeiro (Ajustes)'); return c; };

  // ==================== ADMIN ====================
  router.get('/api/op/painel', exigirAdmin, (req, res) => res.json(painelAdmin()));

  // ----- Cliente e fornecedor -----
  router.put('/api/op/cliente', exigirAdmin, acao((req, res) => {
    const nome = texto(req.body.nome, 120);
    if (!nome) throw new Error('Informe o nome do cliente');
    const c = clienteAtual();
    const campos = [nome, texto(req.body.contato, 120), texto(req.body.telefone, 40), texto(req.body.observacoes)];
    if (c) {
      db.prepare('UPDATE portal_clientes SET nome = ?, contato = ?, telefone = ?, observacoes = ?, ativo = ? WHERE id = ?')
        .run(...campos, req.body.ativo === false ? 0 : 1, c.id);
    } else {
      db.prepare('INSERT INTO portal_clientes (nome, contato, telefone, observacoes, token) VALUES (?, ?, ?, ?, ?)').run(...campos, novoToken());
      registrar({ tipo: 'cliente', descricao: 'Acompanhamento de pedidos criado' });
    }
    notificar({ tipo: 'cliente' });
    res.json({ success: true });
  }));

  router.post('/api/op/cliente/novo-link', exigirAdmin, acao((req, res) => {
    const c = exigirCliente();
    const token = novoToken();
    db.prepare('UPDATE portal_clientes SET token = ? WHERE id = ?').run(token, c.id);
    registrar({ tipo: 'cliente', descricao: 'Link de acompanhamento renovado (o link antigo deixou de funcionar)', privado: true });
    for (const o of ouvintes) if (!o.admin && o.token === c.token) o.res.end();
    notificar({ tipo: 'cliente', privado: true });
    res.json({ token });
  }));

  router.put('/api/op/fornecedor', exigirAdmin, acao((req, res) => {
    definirConfig('fornecedor_nome', texto(req.body.nome, 120));
    definirConfig('fornecedor_contato', texto(req.body.contato, 120));
    definirConfig('fornecedor_telefone', texto(req.body.telefone, 40));
    notificar({ tipo: 'fornecedor', privado: true });
    res.json({ success: true });
  }));

  // ----- Produtos e cores -----
  function lerProduto(body, atual = {}) {
    const nome = texto(body.nome ?? atual.nome, 120);
    if (!nome) throw new Error('Informe o nome do produto');
    const preco = body.preco === undefined ? atual.preco || 0 : numero(body.preco);
    const custo = body.custo === undefined ? atual.custo || 0 : numero(body.custo === '' ? 0 : body.custo);
    if (!(preco >= 0)) throw new Error('Preço de venda inválido');
    if (!(custo >= 0)) throw new Error('Custo inválido');
    let cores = body.cores === undefined ? lerCores(atual.cores || '[]') : lerCores(body.cores);
    const vistos = new Set();
    cores = cores.map(c => ({ nome: texto(c.nome, 40), hex: c.hex })).filter(c => c.nome && !vistos.has(c.nome.toLowerCase()) && vistos.add(c.nome.toLowerCase()));
    if (cores.length > 40) throw new Error('Máximo de 40 cores por produto');
    return {
      nome, preco, custo, cores,
      descricao: body.descricao === undefined ? atual.descricao || '' : texto(body.descricao),
      unidade: texto(body.unidade ?? atual.unidade, 20) || 'peças',
      ativo: body.ativo === undefined ? (atual.ativo ?? 1) : (body.ativo ? 1 : 0)
    };
  }

  router.post('/api/op/produtos', exigirAdmin, acao((req, res) => {
    const p = lerProduto(req.body);
    const r = db.prepare('INSERT INTO op_produtos (nome, descricao, unidade, preco, custo, cores, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(p.nome, p.descricao, p.unidade, p.preco, p.custo, JSON.stringify(p.cores), p.ativo);
    registrar({ tipo: 'produto', descricao: `Produto cadastrado: ${p.nome} — ${brl(p.preco)} (${p.unidade})${p.cores.length ? `. Cores: ${p.cores.map(c => c.nome).join(', ')}` : ''}` });
    notificar({ tipo: 'produto' });
    res.json({ id: Number(r.lastInsertRowid) });
  }));

  router.put('/api/op/produtos/:id', exigirAdmin, acao((req, res) => {
    const atual = db.prepare('SELECT * FROM op_produtos WHERE id = ?').get(req.params.id);
    if (!atual) return res.status(404).json({ error: 'Produto não encontrado' });
    const p = lerProduto(req.body, atual);
    db.prepare('UPDATE op_produtos SET nome = ?, descricao = ?, unidade = ?, preco = ?, custo = ?, cores = ?, ativo = ? WHERE id = ?')
      .run(p.nome, p.descricao, p.unidade, p.preco, p.custo, JSON.stringify(p.cores), p.ativo, atual.id);
    if (p.preco !== atual.preco) registrar({ tipo: 'produto', descricao: `Preço de ${p.nome} alterado de ${brl(atual.preco)} para ${brl(p.preco)}` });
    if (p.custo !== atual.custo) registrar({ tipo: 'produto', descricao: `Custo de ${p.nome} alterado de ${brl(atual.custo)} para ${brl(p.custo)}`, privado: true });
    const antes = lerCores(atual.cores).map(c => c.nome).join(', ');
    const depois = p.cores.map(c => c.nome).join(', ');
    if (antes !== depois) registrar({ tipo: 'produto', descricao: `Cores de ${p.nome}: ${depois || 'nenhuma'}` });
    notificar({ tipo: 'produto' });
    res.json({ success: true });
  }));

  router.delete('/api/op/produtos/:id', exigirAdmin, acao((req, res) => {
    const p = db.prepare('SELECT * FROM op_produtos WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
    const usado = db.prepare('SELECT 1 FROM portal_pedido_itens WHERE produto_id = ? UNION SELECT 1 FROM op_compra_itens WHERE produto_id = ? UNION SELECT 1 FROM op_ajustes_estoque WHERE produto_id = ? LIMIT 1').get(p.id, p.id, p.id);
    if (usado) throw new Error('Este produto já tem pedidos ou estoque. Desative-o em vez de excluir.');
    apagarArquivo(p.foto);
    db.prepare('DELETE FROM op_produtos WHERE id = ?').run(p.id);
    notificar({ tipo: 'produto' });
    res.json({ success: true });
  }));

  router.post('/api/op/produtos/:id/foto', exigirAdmin, receberArquivo, acao((req, res) => {
    const p = db.prepare('SELECT * FROM op_produtos WHERE id = ?').get(req.params.id);
    if (!p) throw new Error('Produto não encontrado');
    if (!req.file || !req.file.mimetype.startsWith('image/')) throw new Error('Envie uma foto (JPG ou PNG)');
    apagarArquivo(p.foto);
    db.prepare('UPDATE op_produtos SET foto = ? WHERE id = ?').run(req.file.filename, p.id);
    notificar({ tipo: 'produto' });
    res.json({ success: true });
  }));

  router.delete('/api/op/produtos/:id/foto', exigirAdmin, (req, res) => {
    const p = db.prepare('SELECT * FROM op_produtos WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
    apagarArquivo(p.foto);
    db.prepare('UPDATE op_produtos SET foto = NULL WHERE id = ?').run(p.id);
    notificar({ tipo: 'produto' });
    res.json({ success: true });
  });

  // Foto do produto é pública (o cliente vê os produtos)
  router.get('/foto-produto/:id', (req, res) => {
    const p = db.prepare('SELECT foto FROM op_produtos WHERE id = ?').get(req.params.id);
    if (!p || !p.foto) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=604800');
    res.sendFile(path.join(pastaUploads, p.foto), err => { if (err && !res.headersSent) res.status(404).end(); });
  });

  // ----- Pedidos do cliente -----
  function novoPedido(cli, itens, { status, dataPedido, previsao, observacoes }) {
    return db.transaction(() => {
      const prox = db.prepare('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM portal_pedidos WHERE cliente_id = ?').get(cli.id).n;
      const r = db.prepare('INSERT INTO portal_pedidos (cliente_id, numero, data_pedido, previsao_entrega, status, observacoes) VALUES (?, ?, ?, ?, ?, ?)')
        .run(cli.id, prox, dataPedido || hoje(), previsao, status, observacoes);
      const id = Number(r.lastInsertRowid);
      const valor = gravarItensPedido(id, itens);
      return { id, numero: prox, valor };
    })();
  }

  router.post('/api/op/pedidos', exigirAdmin, acao((req, res) => {
    const cli = exigirCliente();
    const itens = lerItens(req.body.itens, { permitirPreco: true });
    const previsao = dataValida(req.body.previsao_entrega);
    const p = novoPedido(cli, itens, { status: 'Recebido', dataPedido: dataValida(req.body.data_pedido), previsao, observacoes: texto(req.body.observacoes) });
    registrar({ pedidoId: p.id, tipo: 'pedido', descricao: `Pedido #${p.numero} registrado: ${resumoItens(itens)} — total ${brl(p.valor)}${previsao ? `. Previsão: ${dataBR(previsao)}` : ''}` });
    notificar({ tipo: 'pedido', descricao: `Novo pedido #${p.numero}` });
    res.json(p);
  }));

  router.put('/api/op/pedidos/:id', exigirAdmin, acao((req, res) => {
    const p = pedidoDoCliente(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pedido não encontrado' });
    db.transaction(() => {
      const mud = [];
      if (req.body.itens) {
        const itens = lerItens(req.body.itens, { permitirPreco: true });
        const valor = gravarItensPedido(p.id, itens);
        mud.push(`itens: ${resumoItens(itens)} — total ${brl(valor)}`);
      }
      if (req.body.previsao_entrega !== undefined) {
        const prev = dataValida(req.body.previsao_entrega);
        if (prev !== p.previsao_entrega) {
          db.prepare('UPDATE portal_pedidos SET previsao_entrega = ? WHERE id = ?').run(prev, p.id);
          mud.push(prev ? `previsão de entrega: ${dataBR(prev)}` : 'previsão removida');
        }
      }
      if (req.body.observacoes !== undefined && texto(req.body.observacoes) !== (p.observacoes || '')) {
        db.prepare('UPDATE portal_pedidos SET observacoes = ? WHERE id = ?').run(texto(req.body.observacoes), p.id);
        mud.push('observações atualizadas');
      }
      if (mud.length) registrar({ pedidoId: p.id, tipo: 'pedido', descricao: `Pedido #${p.numero}: ${mud.join('; ')}` });
      if (req.body.status !== undefined && req.body.status !== p.status) {
        if (!STATUS_PEDIDO.includes(req.body.status)) throw new Error('Status inválido');
        db.prepare('UPDATE portal_pedidos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.body.status, p.id);
        const motivo = texto(req.body.motivo, 300);
        let d = `Pedido #${p.numero}: ${p.status} → ${req.body.status}${motivo ? `: ${motivo}` : ''}`;
        if (p.status === 'Solicitado' && req.body.status === 'Cancelado') d = `Solicitação do pedido #${p.numero} recusada${motivo ? `: ${motivo}` : ''}`;
        else if (p.status === 'Solicitado') d = `Pedido #${p.numero} aceito pela ${EMPRESA}`;
        registrar({ pedidoId: p.id, tipo: 'status', descricao: d });
      } else if (req.body.itens) {
        atualizarStatusPorEntregas(p.id);
      }
    })();
    notificar({ tipo: 'pedido' });
    res.json({ success: true });
  }));

  router.delete('/api/op/pedidos/:id', exigirAdmin, (req, res) => {
    const p = pedidoDoCliente(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pedido não encontrado' });
    db.transaction(() => {
      const envios = db.prepare('SELECT id FROM portal_entregas WHERE pedido_id = ?').all(p.id).map(e => e.id);
      apagarAnexosDe('entrega', envios);
      apagarAnexosDe('pedido', [p.id]);
      db.prepare('UPDATE portal_pagamentos SET pedido_id = NULL WHERE pedido_id = ?').run(p.id);
      db.prepare('DELETE FROM portal_entregas WHERE pedido_id = ?').run(p.id);
      db.prepare('DELETE FROM portal_pedido_itens WHERE pedido_id = ?').run(p.id);
      db.prepare('DELETE FROM portal_pedidos WHERE id = ?').run(p.id);
      db.prepare('UPDATE portal_historico SET pedido_id = NULL WHERE pedido_id = ?').run(p.id);
      registrar({ tipo: 'pedido', descricao: `Pedido #${p.numero} foi excluído` });
    })();
    notificar({ tipo: 'pedido' });
    res.json({ success: true });
  });

  // ----- Envios ao cliente (baixam do estoque) -----
  router.post('/api/op/pedidos/:id/envios', exigirAdmin, receberArquivo, acao((req, res) => {
    const p = pedidoDoCliente(req.params.id);
    if (!p) throw new Error('Pedido não encontrado');
    if (p.status === 'Solicitado') throw new Error('Aceite o pedido antes de registrar envios');
    if (p.status === 'Cancelado') throw new Error('Pedido cancelado');
    const brutos = lerJSON(req.body.itens, []);
    const c = calcular();
    const ped = c.pedidos.find(x => x.id === p.id);
    const linhas = [];
    for (const b of brutos) {
      const q = numero(b.quantidade);
      if (!(q > 0)) continue;
      const item = ped.itens.find(i => i.produto_id === Number(b.produto_id) && (i.cor || '').toLowerCase() === String(b.cor || '').toLowerCase());
      if (!item) throw new Error('Item não pertence a este pedido');
      const rotulo = `${item.produto_nome}${item.cor ? ' ' + item.cor : ''}`;
      if (q > item.falta + 1e-9) throw new Error(`${rotulo}: faltam só ${qtd(item.falta)} para entregar`);
      const e = c.estoque.find(l => chave(l.produto_id, l.cor) === chave(item.produto_id, item.cor));
      const disp = e ? e.saldo : 0;
      if (q > disp + 1e-9) throw new Error(`Estoque insuficiente de ${rotulo}: há ${qtd(Math.max(0, disp))}. Lance a entrada do fornecedor antes.`);
      linhas.push({ item, q });
    }
    if (!linhas.length) throw new Error('Informe a quantidade enviada');
    const data = dataValida(req.body.data) || hoje();
    const total = linhas.reduce((s, l) => s + l.q, 0);
    db.transaction(() => {
      const r = db.prepare('INSERT INTO portal_entregas (cliente_id, pedido_id, data, quantidade, observacao) VALUES (?, ?, ?, ?, ?)')
        .run(p.cliente_id, p.id, data, total, texto(req.body.observacao));
      const id = Number(r.lastInsertRowid);
      const ins = db.prepare('INSERT INTO op_envio_itens (entrega_id, produto_id, produto_nome, cor, quantidade) VALUES (?, ?, ?, ?, ?)');
      for (const l of linhas) ins.run(id, l.item.produto_id, l.item.produto_nome, l.item.cor, l.q);
      const anexo = salvarAnexo('entrega', id, req.file);
      registrar({
        pedidoId: p.id, tipo: 'entrega',
        descricao: `Envio do pedido #${p.numero} em ${dataBR(data)}: ${resumoItens(linhas.map(l => ({ ...l.item, quantidade: l.q })))}${anexo ? ' — com comprovante' : ''}`
      });
      atualizarStatusPorEntregas(p.id);
    })();
    notificar({ tipo: 'entrega', descricao: `Envio registrado no pedido #${p.numero}` });
    res.json({ success: true });
  }));

  router.delete('/api/op/envios/:id', exigirAdmin, (req, res) => {
    const e = db.prepare('SELECT * FROM portal_entregas WHERE id = ?').get(req.params.id);
    if (!e) return res.status(404).json({ error: 'Envio não encontrado' });
    const p = db.prepare('SELECT * FROM portal_pedidos WHERE id = ?').get(e.pedido_id);
    db.transaction(() => {
      apagarAnexosDe('entrega', [e.id]);
      db.prepare('DELETE FROM op_envio_itens WHERE entrega_id = ?').run(e.id);
      db.prepare('DELETE FROM portal_entregas WHERE id = ?').run(e.id);
      registrar({ pedidoId: p.id, tipo: 'entrega', descricao: `Envio de ${qtd(e.quantidade)} peças (${dataBR(e.data)}) do pedido #${p.numero} foi removido` });
      atualizarStatusPorEntregas(p.id);
    })();
    notificar({ tipo: 'entrega' });
    res.json({ success: true });
  });

  // ----- Compras / entradas do fornecedor (somam no estoque) -----
  router.post('/api/op/compras', exigirAdmin, receberArquivo, acao((req, res) => {
    const itens = lerItens(req.body.itens, { campoPreco: 'custo', permitirPreco: true });
    const data = dataValida(req.body.data) || hoje();
    const nota = texto(req.body.nota, 60);
    const valor = arred(itens.reduce((s, i) => s + i.subtotal, 0));
    const q = itens.reduce((s, i) => s + i.quantidade, 0);
    db.transaction(() => {
      const r = db.prepare('INSERT INTO op_compras (data, nota, observacao, valor_total, qtd_total) VALUES (?, ?, ?, ?, ?)')
        .run(data, nota, texto(req.body.observacao), valor, q);
      const id = Number(r.lastInsertRowid);
      const ins = db.prepare('INSERT INTO op_compra_itens (compra_id, produto_id, produto_nome, cor, quantidade, custo_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const i of itens) ins.run(id, i.produto_id, i.produto_nome, i.cor, i.quantidade, i.preco_unitario, i.subtotal);
      const anexo = salvarAnexo('compra', id, req.file);
      registrar({ tipo: 'compra', privado: true, descricao: `Entrada do fornecedor${nota ? ` (NF ${nota})` : ''} em ${dataBR(data)}: ${resumoItens(itens)} — ${brl(valor)}${anexo ? ' — com comprovante' : ''}` });
    })();
    notificar({ tipo: 'compra', privado: true });
    res.json({ success: true });
  }));

  router.delete('/api/op/compras/:id', exigirAdmin, (req, res) => {
    const c = db.prepare('SELECT * FROM op_compras WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Entrada não encontrada' });
    db.transaction(() => {
      apagarAnexosDe('compra', [c.id]);
      db.prepare('UPDATE op_pagamentos_fornecedor SET compra_id = NULL WHERE compra_id = ?').run(c.id);
      db.prepare('DELETE FROM op_compra_itens WHERE compra_id = ?').run(c.id);
      db.prepare('DELETE FROM op_compras WHERE id = ?').run(c.id);
      registrar({ tipo: 'compra', privado: true, descricao: `Entrada do fornecedor de ${dataBR(c.data)} (${brl(c.valor_total)}) foi removida` });
    })();
    notificar({ tipo: 'compra', privado: true });
    res.json({ success: true });
  });

  // ----- Ajuste de estoque (contagem) -----
  router.post('/api/op/estoque/contagem', exigirAdmin, acao((req, res) => {
    const p = produto(req.body.produto_id);
    if (!p) throw new Error('Produto não encontrado');
    const cor = p.cores.length ? (p.cores.find(c => c.nome.toLowerCase() === String(req.body.cor || '').toLowerCase()) || {}).nome : '';
    if (cor === undefined) throw new Error('Cor inválida');
    const contagem = numero(req.body.contagem);
    if (!Number.isFinite(contagem) || contagem < 0) throw new Error('Informe a quantidade contada');
    const linha = calcular().estoque.find(l => chave(l.produto_id, l.cor) === chave(p.id, cor));
    const delta = contagem - (linha ? linha.saldo : 0);
    if (Math.abs(delta) < 1e-9) return res.json({ success: true });
    const motivo = texto(req.body.motivo, 200);
    db.prepare('INSERT INTO op_ajustes_estoque (produto_id, produto_nome, cor, quantidade, motivo) VALUES (?, ?, ?, ?, ?)').run(p.id, p.nome, cor, delta, motivo);
    registrar({ tipo: 'estoque', privado: true, descricao: `Estoque de ${p.nome}${cor ? ' ' + cor : ''} ajustado para ${qtd(contagem)} (${delta > 0 ? '+' : ''}${qtd(delta)})${motivo ? `: ${motivo}` : ''}` });
    notificar({ tipo: 'estoque', privado: true });
    res.json({ success: true });
  }));

  // ----- Financeiro -----
  function lerValor(body) {
    const valor = numero(body.valor);
    if (!(valor > 0)) throw new Error('Informe o valor');
    return { valor, data: dataValida(body.data) || hoje(), forma: FORMAS_PAGAMENTO.includes(body.forma) ? body.forma : 'Pix', observacao: texto(body.observacao) };
  }

  // Recebimentos do cliente
  router.post('/api/op/recebimentos', exigirAdmin, receberArquivo, acao((req, res) => {
    const cli = exigirCliente();
    const g = lerValor(req.body);
    const ped = req.body.pedido_id ? pedidoDoCliente(req.body.pedido_id) : null;
    db.transaction(() => {
      const r = db.prepare('INSERT INTO portal_pagamentos (cliente_id, pedido_id, data, valor, forma, observacao, status, informado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(cli.id, ped ? ped.id : null, g.data, g.valor, g.forma, g.observacao, 'Confirmado', 'empresa');
      const anexo = salvarAnexo('pagamento', Number(r.lastInsertRowid), req.file);
      registrar({ pedidoId: ped ? ped.id : null, tipo: 'pagamento', descricao: `Pagamento recebido: ${brl(g.valor)} via ${g.forma} em ${dataBR(g.data)}${ped ? ` (pedido #${ped.numero})` : ''}${anexo ? ' — com comprovante' : ''}` });
    })();
    notificar({ tipo: 'pagamento', descricao: `Pagamento de ${brl(g.valor)} registrado` });
    res.json({ success: true });
  }));

  router.put('/api/op/recebimentos/:id/status', exigirAdmin, acao((req, res) => {
    const g = db.prepare('SELECT * FROM portal_pagamentos WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Pagamento não encontrado' });
    const status = req.body.status;
    if (!['Confirmado', 'Recusado', 'Aguardando confirmação'].includes(status)) throw new Error('Status inválido');
    if (status !== g.status) {
      db.prepare('UPDATE portal_pagamentos SET status = ? WHERE id = ?').run(status, g.id);
      const motivo = texto(req.body.motivo, 300);
      const verbo = { Confirmado: 'confirmado', Recusado: 'recusado', 'Aguardando confirmação': 'voltou para aguardando confirmação' }[status];
      registrar({ pedidoId: g.pedido_id, tipo: 'pagamento', descricao: `Pagamento de ${brl(g.valor)} (${dataBR(g.data)}) ${verbo}${motivo ? `: ${motivo}` : ''}` });
      notificar({ tipo: 'pagamento', descricao: `Pagamento ${verbo}` });
    }
    res.json({ success: true });
  }));

  router.delete('/api/op/recebimentos/:id', exigirAdmin, (req, res) => {
    const g = db.prepare('SELECT * FROM portal_pagamentos WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Pagamento não encontrado' });
    db.transaction(() => {
      apagarAnexosDe('pagamento', [g.id]);
      db.prepare('DELETE FROM portal_pagamentos WHERE id = ?').run(g.id);
      registrar({ pedidoId: g.pedido_id, tipo: 'pagamento', descricao: `Pagamento de ${brl(g.valor)} (${dataBR(g.data)}) foi removido` });
    })();
    notificar({ tipo: 'pagamento' });
    res.json({ success: true });
  });

  // Pagamentos ao fornecedor
  router.post('/api/op/fornecedor/pagamentos', exigirAdmin, receberArquivo, acao((req, res) => {
    const g = lerValor(req.body);
    const compra = req.body.compra_id ? db.prepare('SELECT * FROM op_compras WHERE id = ?').get(req.body.compra_id) : null;
    db.transaction(() => {
      const r = db.prepare('INSERT INTO op_pagamentos_fornecedor (data, valor, forma, observacao, compra_id) VALUES (?, ?, ?, ?, ?)')
        .run(g.data, g.valor, g.forma, g.observacao, compra ? compra.id : null);
      const anexo = salvarAnexo('pagfornecedor', Number(r.lastInsertRowid), req.file);
      registrar({ tipo: 'pagfornecedor', privado: true, descricao: `Pagamento ao fornecedor: ${brl(g.valor)} via ${g.forma} em ${dataBR(g.data)}${anexo ? ' — com comprovante' : ''}` });
    })();
    notificar({ tipo: 'pagfornecedor', privado: true });
    res.json({ success: true });
  }));

  router.delete('/api/op/fornecedor/pagamentos/:id', exigirAdmin, (req, res) => {
    const g = db.prepare('SELECT * FROM op_pagamentos_fornecedor WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Pagamento não encontrado' });
    db.transaction(() => {
      apagarAnexosDe('pagfornecedor', [g.id]);
      db.prepare('DELETE FROM op_pagamentos_fornecedor WHERE id = ?').run(g.id);
      registrar({ tipo: 'pagfornecedor', privado: true, descricao: `Pagamento ao fornecedor de ${brl(g.valor)} (${dataBR(g.data)}) foi removido` });
    })();
    notificar({ tipo: 'pagfornecedor', privado: true });
    res.json({ success: true });
  });

  // Retiradas de comissão
  router.post('/api/op/retiradas', exigirAdmin, receberArquivo, acao((req, res) => {
    const g = lerValor(req.body);
    db.transaction(() => {
      const r = db.prepare('INSERT INTO op_retiradas (data, valor, observacao) VALUES (?, ?, ?)').run(g.data, g.valor, g.observacao);
      const anexo = salvarAnexo('retirada', Number(r.lastInsertRowid), req.file);
      registrar({ tipo: 'retirada', privado: true, descricao: `Retirada de comissão: ${brl(g.valor)} em ${dataBR(g.data)}${anexo ? ' — com comprovante' : ''}` });
    })();
    notificar({ tipo: 'retirada', privado: true });
    res.json({ success: true });
  }));

  router.delete('/api/op/retiradas/:id', exigirAdmin, (req, res) => {
    const g = db.prepare('SELECT * FROM op_retiradas WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Retirada não encontrada' });
    db.transaction(() => {
      apagarAnexosDe('retirada', [g.id]);
      db.prepare('DELETE FROM op_retiradas WHERE id = ?').run(g.id);
      registrar({ tipo: 'retirada', privado: true, descricao: `Retirada de ${brl(g.valor)} (${dataBR(g.data)}) foi removida` });
    })();
    notificar({ tipo: 'retirada', privado: true });
    res.json({ success: true });
  });

  // ----- Anexos e mensagens -----
  const REFERENCIAS = {
    pedido: id => { const p = pedidoDoCliente(id); return p && { pedidoId: p.id, desc: `Arquivo anexado ao pedido #${p.numero}` }; },
    entrega: id => { const e = db.prepare('SELECT e.*, p.numero FROM portal_entregas e JOIN portal_pedidos p ON p.id = e.pedido_id WHERE e.id = ? AND e.cliente_id = ?').get(id, idCliente()); return e && { pedidoId: e.pedido_id, desc: `Comprovante anexado ao envio de ${dataBR(e.data)} (pedido #${e.numero})` }; },
    pagamento: id => { const g = db.prepare('SELECT * FROM portal_pagamentos WHERE id = ? AND cliente_id = ?').get(id, idCliente()); return g && { pedidoId: g.pedido_id, desc: `Comprovante anexado ao pagamento de ${brl(g.valor)} (${dataBR(g.data)})` }; },
    compra: id => { const c = db.prepare('SELECT * FROM op_compras WHERE id = ?').get(id); return c && { desc: `Comprovante anexado à entrada do fornecedor de ${dataBR(c.data)}` }; },
    pagfornecedor: id => { const g = db.prepare('SELECT * FROM op_pagamentos_fornecedor WHERE id = ?').get(id); return g && { desc: `Comprovante anexado ao pagamento ao fornecedor de ${brl(g.valor)}` }; },
    retirada: id => { const g = db.prepare('SELECT * FROM op_retiradas WHERE id = ?').get(id); return g && { desc: `Comprovante anexado à retirada de ${brl(g.valor)}` }; }
  };
  function anexar(req, tiposPermitidos, autor, autorNome) {
    if (!req.file) throw new Error('Selecione um arquivo');
    const tipo = req.body.tipo;
    if (!tiposPermitidos.includes(tipo)) throw new Error('Tipo de anexo inválido');
    const ref = REFERENCIAS[tipo](Number(req.body.ref_id));
    if (!ref) throw new Error('Registro não encontrado');
    salvarAnexo(tipo, Number(req.body.ref_id), req.file, autor);
    const privado = ANEXOS_PRIVADOS.includes(tipo);
    registrar({ pedidoId: ref.pedidoId || null, tipo: 'anexo', descricao: ref.desc, autor, autorNome, privado });
    notificar({ tipo: 'anexo', autor, descricao: autor === 'cliente' ? `${autorNome}: ${ref.desc}` : undefined, privado });
  }

  router.post('/api/op/anexos', exigirAdmin, receberArquivo, acao((req, res) => {
    anexar(req, [...ANEXOS_CLIENTE, ...ANEXOS_PRIVADOS], 'empresa', EMPRESA);
    res.json({ success: true });
  }));

  router.delete('/api/op/anexos/:id', exigirAdmin, (req, res) => {
    const a = db.prepare('SELECT * FROM portal_anexos WHERE id = ?').get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Anexo não encontrado' });
    apagarArquivo(a.arquivo);
    db.prepare('DELETE FROM portal_anexos WHERE id = ?').run(a.id);
    const privado = ANEXOS_PRIVADOS.includes(a.tipo);
    registrar({ tipo: 'anexo', descricao: `Anexo "${a.nome_original || 'arquivo'}" foi removido`, privado });
    notificar({ tipo: 'anexo', privado });
    res.json({ success: true });
  });

  function enviarArquivo(res, a, baixar) {
    res.set('Content-Type', a.mime || 'application/octet-stream');
    res.set('Cache-Control', 'private, max-age=86400');
    res.set('Content-Disposition', `${baixar ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(a.nome_original || a.arquivo)}`);
    res.sendFile(path.join(pastaUploads, a.arquivo), err => { if (err && !res.headersSent) res.status(404).send('Arquivo não encontrado'); });
  }

  router.get('/api/op/arquivos/:id', exigirAdminGet, (req, res) => {
    const a = db.prepare('SELECT * FROM portal_anexos WHERE id = ?').get(req.params.id);
    if (!a) return res.status(404).send('Arquivo não encontrado');
    enviarArquivo(res, a, req.query.baixar);
  });

  router.post('/api/op/mensagens', exigirAdmin, acao((req, res) => {
    exigirCliente();
    const msg = texto(req.body.mensagem, 1000);
    if (!msg) throw new Error('Escreva a mensagem');
    registrar({ tipo: 'mensagem', descricao: msg });
    notificar({ tipo: 'mensagem', descricao: msg });
    res.json({ success: true });
  }));

  // Tempo real da gestão (autenticado pelo cookie da sessão)
  router.get('/api/op/eventos', exigirAdminGet, (req, res) => abrirStream(req, res, { admin: true }));

  // ==================== CLIENTE (LINK) ====================
  function porToken(req, res, next) {
    const c = db.prepare('SELECT * FROM portal_clientes WHERE token = ? AND ativo = 1').get(String(req.params.token));
    if (!c || c.id !== idCliente()) {
      descartarUpload(req);
      return res.status(404).json({ error: 'Link inválido ou desativado. Peça um novo link à Fernandes Têxtil.' });
    }
    req.cliente = c;
    next();
  }

  router.get('/p/:token', (req, res) => res.sendFile(path.join(baseDir, 'public', 'cliente.html')));
  router.get('/api/p/:token', porToken, (req, res) => res.json(painelCliente(req.cliente)));
  router.get('/api/p/:token/eventos', porToken, (req, res) => abrirStream(req, res, { admin: false, token: req.cliente.token }));

  router.get('/api/p/:token/arquivos/:id', porToken, (req, res) => {
    const a = db.prepare(`SELECT * FROM portal_anexos WHERE id = ? AND cliente_id = ? AND tipo IN (${ANEXOS_CLIENTE.map(() => '?').join(',')})`)
      .get(req.params.id, req.cliente.id, ...ANEXOS_CLIENTE);
    if (!a) return res.status(404).send('Arquivo não encontrado');
    enviarArquivo(res, a, req.query.baixar);
  });

  // Cliente monta o pedido no cesto (preço sempre da tabela; fica "Solicitado" até ser aceito)
  router.post('/api/p/:token/pedidos', porToken, acao((req, res) => {
    const c = req.cliente;
    const itens = lerItens(req.body.itens, { exigirAtivo: true });
    const desejada = dataValida(req.body.previsao_entrega);
    const p = novoPedido(c, itens, { status: 'Solicitado', previsao: desejada, observacoes: texto(req.body.observacoes) });
    registrar({
      pedidoId: p.id, tipo: 'pedido', autor: 'cliente', autorNome: c.nome,
      descricao: `Pedido #${p.numero} solicitado: ${resumoItens(itens)} — estimado ${brl(p.valor)}${desejada ? `. Entrega desejada: ${dataBR(desejada)}` : ''}. Aguardando aprovação.`
    });
    notificar({ tipo: 'pedido', autor: 'cliente', descricao: `${c.nome} solicitou o pedido #${p.numero} (${resumoItens(itens)})` });
    res.json(p);
  }));

  router.post('/api/p/:token/pedidos/:id/cancelar', porToken, acao((req, res) => {
    const c = req.cliente;
    const p = db.prepare('SELECT * FROM portal_pedidos WHERE id = ? AND cliente_id = ?').get(req.params.id, c.id);
    if (!p) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (p.status !== 'Solicitado') throw new Error('Este pedido já foi aceito. Fale com a Fernandes Têxtil para alterar.');
    db.prepare("UPDATE portal_pedidos SET status = 'Cancelado', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(p.id);
    registrar({ pedidoId: p.id, tipo: 'status', descricao: `Solicitação do pedido #${p.numero} cancelada pelo cliente`, autor: 'cliente', autorNome: c.nome });
    notificar({ tipo: 'pedido', autor: 'cliente', descricao: `${c.nome} cancelou a solicitação do pedido #${p.numero}` });
    res.json({ success: true });
  }));

  // Cliente informa um pagamento (aguarda confirmação)
  router.post('/api/p/:token/pagamentos', porToken, receberArquivo, acao((req, res) => {
    const c = req.cliente;
    const g = lerValor(req.body);
    const ped = req.body.pedido_id ? db.prepare('SELECT * FROM portal_pedidos WHERE id = ? AND cliente_id = ?').get(req.body.pedido_id, c.id) : null;
    db.transaction(() => {
      const r = db.prepare('INSERT INTO portal_pagamentos (cliente_id, pedido_id, data, valor, forma, observacao, status, informado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(c.id, ped ? ped.id : null, g.data, g.valor, g.forma, g.observacao, 'Aguardando confirmação', 'cliente');
      const anexo = salvarAnexo('pagamento', Number(r.lastInsertRowid), req.file, 'cliente');
      registrar({
        pedidoId: ped ? ped.id : null, tipo: 'pagamento', autor: 'cliente', autorNome: c.nome,
        descricao: `Pagamento informado: ${brl(g.valor)} via ${g.forma} em ${dataBR(g.data)}${ped ? ` (pedido #${ped.numero})` : ''}${anexo ? ' — com comprovante' : ''}. Aguardando confirmação.`
      });
    })();
    notificar({ tipo: 'pagamento', autor: 'cliente', descricao: `${c.nome} informou um pagamento de ${brl(g.valor)}` });
    res.json({ success: true });
  }));

  router.post('/api/p/:token/anexos', porToken, receberArquivo, acao((req, res) => {
    anexar(req, ['entrega', 'pagamento'], 'cliente', req.cliente.nome);
    res.json({ success: true });
  }));

  router.post('/api/p/:token/mensagens', porToken, acao((req, res) => {
    const c = req.cliente;
    const msg = texto(req.body.mensagem, 1000);
    if (!msg) throw new Error('Escreva a mensagem');
    registrar({ tipo: 'mensagem', descricao: msg, autor: 'cliente', autorNome: c.nome });
    notificar({ tipo: 'mensagem', autor: 'cliente', descricao: `${c.nome}: ${msg}` });
    res.json({ success: true });
  }));

  return router;
};
