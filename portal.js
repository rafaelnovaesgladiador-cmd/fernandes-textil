// ==================== PORTAL DO CLIENTE ====================
// Controle de pedidos, entregas e pagamentos de clientes específicos (atacado),
// com link de acompanhamento compartilhável e atualização em tempo real (SSE).
//
// Lado da empresa:  /portal            (login do sistema, perfis admin/gerente)
// Lado do cliente:  /p/<token>         (sem login, acesso apenas aos próprios dados)

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const STATUS_PEDIDO = ['Recebido', 'Em produção', 'Pronto para entrega', 'Entregue parcialmente', 'Entregue', 'Cancelado'];
const FORMAS_PAGAMENTO = ['Pix', 'Transferência', 'Boleto', 'Dinheiro', 'Cheque', 'Cartão', 'Outro'];
const EMPRESA = 'Fernandes Têxtil';

module.exports = function criarPortal({ db, verifyToken, requirePerfil, jwt, JWT_SECRET, baseDir, dataDir = baseDir }) {
  const router = express.Router();
  const somenteGestao = [verifyToken, requirePerfil('admin', 'gerente')];

  // ---------- SCHEMA ----------
  db.exec(`
  CREATE TABLE IF NOT EXISTS portal_clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    contato TEXT,
    telefone TEXT,
    observacoes TEXT,
    token TEXT UNIQUE NOT NULL,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS portal_produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    unidade TEXT DEFAULT 'peças',
    preco REAL DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES portal_clientes(id)
  );
  CREATE TABLE IF NOT EXISTS portal_pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    data_pedido DATE NOT NULL,
    previsao_entrega DATE,
    status TEXT DEFAULT 'Recebido',
    observacoes TEXT,
    valor_total REAL DEFAULT 0,
    qtd_total REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cliente_id, numero),
    FOREIGN KEY (cliente_id) REFERENCES portal_clientes(id)
  );
  CREATE TABLE IF NOT EXISTS portal_pedido_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    produto_id INTEGER,
    produto_nome TEXT NOT NULL,
    unidade TEXT DEFAULT 'peças',
    quantidade REAL NOT NULL,
    preco_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES portal_pedidos(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS portal_entregas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    pedido_id INTEGER NOT NULL,
    data DATE NOT NULL,
    quantidade REAL NOT NULL,
    observacao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES portal_pedidos(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS portal_pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    pedido_id INTEGER,
    data DATE NOT NULL,
    valor REAL NOT NULL,
    forma TEXT,
    observacao TEXT,
    status TEXT DEFAULT 'Confirmado',
    informado_por TEXT DEFAULT 'empresa',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES portal_clientes(id)
  );
  CREATE TABLE IF NOT EXISTS portal_anexos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    ref_id INTEGER NOT NULL,
    arquivo TEXT NOT NULL,
    nome_original TEXT,
    mime TEXT,
    enviado_por TEXT DEFAULT 'empresa',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS portal_historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    pedido_id INTEGER,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    autor TEXT DEFAULT 'empresa',
    autor_nome TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_portal_pedidos_cliente ON portal_pedidos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_portal_hist_cliente ON portal_historico(cliente_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_portal_anexos_ref ON portal_anexos(tipo, ref_id);
  `);

  // ---------- UPLOADS ----------
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
  // Envolve o multer para devolver erros em JSON
  const receberArquivo = (req, res, next) => upload.single('arquivo')(req, res, err => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande (máx. 15 MB)' : err.message });
    next();
  });

  // ---------- TEMPO REAL (Server-Sent Events) ----------
  const ouvintes = new Set(); // { clienteId: number|null (null = gestão, recebe tudo), res }
  function abrirStream(req, res, clienteId, token = null) {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write('retry: 5000\nevent: ping\ndata: {}\n\n');
    const ouvinte = { clienteId, token, res };
    ouvintes.add(ouvinte);
    const ping = setInterval(() => res.write('event: ping\ndata: {}\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); ouvintes.delete(ouvinte); });
  }
  function notificar(clienteId, evento) {
    const dados = `event: atualizacao\ndata: ${JSON.stringify({ cliente_id: clienteId, ...evento })}\n\n`;
    for (const o of ouvintes) {
      if (o.clienteId === null || o.clienteId === clienteId) o.res.write(dados);
    }
  }

  // ---------- HELPERS ----------
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

  function registrar(clienteId, { pedidoId = null, tipo, descricao, autor = 'empresa', autorNome = EMPRESA }) {
    db.prepare('INSERT INTO portal_historico (cliente_id, pedido_id, tipo, descricao, autor, autor_nome) VALUES (?, ?, ?, ?, ?, ?)')
      .run(clienteId, pedidoId, tipo, descricao, autor, autorNome);
  }

  function apagarArquivosDe(tipo, refIds) {
    if (!refIds.length) return;
    const marcadores = refIds.map(() => '?').join(',');
    const anexos = db.prepare(`SELECT * FROM portal_anexos WHERE tipo = ? AND ref_id IN (${marcadores})`).all(tipo, ...refIds);
    for (const a of anexos) fs.rm(path.join(pastaUploads, a.arquivo), { force: true }, () => {});
    db.prepare(`DELETE FROM portal_anexos WHERE tipo = ? AND ref_id IN (${marcadores})`).run(tipo, ...refIds);
  }

  function salvarAnexo(clienteId, tipo, refId, file, enviadoPor) {
    if (!file) return null;
    const r = db.prepare('INSERT INTO portal_anexos (cliente_id, tipo, ref_id, arquivo, nome_original, mime, enviado_por) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(clienteId, tipo, refId, file.filename, texto(file.originalname, 200), file.mimetype, enviadoPor);
    return r.lastInsertRowid;
  }

  function descartarUpload(req) {
    if (req.file) fs.rm(req.file.path, { force: true }, () => {});
  }

  // Recalcula o status do pedido a partir das entregas (sem mexer em pedidos cancelados)
  function atualizarStatusPorEntregas(pedidoId) {
    const p = db.prepare('SELECT * FROM portal_pedidos WHERE id = ?').get(pedidoId);
    if (!p || p.status === 'Cancelado') return null;
    const entregue = db.prepare('SELECT COALESCE(SUM(quantidade), 0) AS q FROM portal_entregas WHERE pedido_id = ?').get(pedidoId).q;
    let novo = p.status;
    if (entregue >= p.qtd_total && p.qtd_total > 0) novo = 'Entregue';
    else if (entregue > 0) novo = 'Entregue parcialmente';
    else if (['Entregue', 'Entregue parcialmente'].includes(p.status)) novo = 'Pronto para entrega';
    if (novo !== p.status) {
      db.prepare('UPDATE portal_pedidos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(novo, pedidoId);
      return novo;
    }
    return null;
  }

  // Monta todos os dados de um cliente (usado pela gestão e pelo link do cliente)
  function painel(clienteId) {
    const cliente = db.prepare('SELECT * FROM portal_clientes WHERE id = ?').get(clienteId);
    if (!cliente) return null;
    const pedidos = db.prepare('SELECT * FROM portal_pedidos WHERE cliente_id = ? ORDER BY numero DESC').all(clienteId);
    const itens = db.prepare('SELECT i.* FROM portal_pedido_itens i JOIN portal_pedidos p ON p.id = i.pedido_id WHERE p.cliente_id = ? ORDER BY i.id').all(clienteId);
    const entregas = db.prepare('SELECT * FROM portal_entregas WHERE cliente_id = ? ORDER BY data DESC, id DESC').all(clienteId);
    const pagamentos = db.prepare('SELECT * FROM portal_pagamentos WHERE cliente_id = ? ORDER BY data DESC, id DESC').all(clienteId);
    const anexos = db.prepare('SELECT id, tipo, ref_id, nome_original, mime, enviado_por, created_at FROM portal_anexos WHERE cliente_id = ? ORDER BY id').all(clienteId);
    const historico = db.prepare('SELECT * FROM portal_historico WHERE cliente_id = ? ORDER BY created_at DESC, id DESC LIMIT 300').all(clienteId);
    const produtos = db.prepare('SELECT * FROM portal_produtos WHERE cliente_id = ? ORDER BY ativo DESC, nome').all(clienteId);

    const anexosDe = (tipo, id) => anexos.filter(a => a.tipo === tipo && a.ref_id === id);
    for (const p of pedidos) {
      p.itens = itens.filter(i => i.pedido_id === p.id);
      p.entregas = entregas.filter(e => e.pedido_id === p.id);
      p.qtd_entregue = p.entregas.reduce((s, e) => s + e.quantidade, 0);
      p.valor_pago = pagamentos.filter(g => g.pedido_id === p.id && g.status === 'Confirmado').reduce((s, g) => s + g.valor, 0);
      p.anexos = anexosDe('pedido', p.id);
    }
    for (const e of entregas) {
      e.anexos = anexosDe('entrega', e.id);
      const p = pedidos.find(x => x.id === e.pedido_id);
      e.pedido_numero = p ? p.numero : null;
    }
    for (const g of pagamentos) {
      g.anexos = anexosDe('pagamento', g.id);
      const p = pedidos.find(x => x.id === g.pedido_id);
      g.pedido_numero = p ? p.numero : null;
    }

    const validos = pedidos.filter(p => p.status !== 'Cancelado');
    const totalPedidos = validos.reduce((s, p) => s + p.valor_total, 0);
    const totalPago = pagamentos.filter(g => g.status === 'Confirmado').reduce((s, g) => s + g.valor, 0);
    const resumo = {
      total_pedidos: totalPedidos,
      total_pago: totalPago,
      saldo: totalPedidos - totalPago,
      pedidos_abertos: validos.filter(p => p.status !== 'Entregue').length,
      qtd_a_entregar: validos.reduce((s, p) => s + Math.max(0, p.qtd_total - p.qtd_entregue), 0),
      pagamentos_pendentes: pagamentos.filter(g => g.status === 'Aguardando confirmação').length
    };
    return { cliente, resumo, pedidos, entregas, pagamentos, historico, produtos, status_pedido: STATUS_PEDIDO, formas_pagamento: FORMAS_PAGAMENTO };
  }

  // Dados que o cliente pode ver pelo link
  function painelPublico(clienteId) {
    const d = painel(clienteId);
    const { cliente } = d;
    d.cliente = { nome: cliente.nome, contato: cliente.contato };
    // O cliente vê a empresa, não o nome de quem da equipe fez o registro
    d.historico = d.historico.map(h => (h.autor === 'cliente' ? h : { ...h, autor_nome: EMPRESA }));
    d.produtos = d.produtos.filter(p => p.ativo).map(p => ({ id: p.id, nome: p.nome, descricao: p.descricao, unidade: p.unidade, preco: p.preco }));
    d.empresa = EMPRESA;
    return d;
  }

  function lerItens(clienteId, itensBrutos) {
    if (!Array.isArray(itensBrutos) || !itensBrutos.length) throw new Error('Adicione pelo menos um item ao pedido');
    return itensBrutos.map(i => {
      const quantidade = numero(i.quantidade);
      const preco = numero(i.preco_unitario);
      if (!(quantidade > 0)) throw new Error('Quantidade inválida');
      if (!(preco >= 0)) throw new Error('Preço inválido');
      let nome = texto(i.produto_nome, 120);
      let unidade = texto(i.unidade, 20) || 'peças';
      let produtoId = null;
      if (i.produto_id) {
        const prod = db.prepare('SELECT * FROM portal_produtos WHERE id = ? AND cliente_id = ?').get(i.produto_id, clienteId);
        if (!prod) throw new Error('Produto não encontrado');
        produtoId = prod.id;
        nome = nome || prod.nome;
        unidade = prod.unidade || unidade;
      }
      if (!nome) throw new Error('Informe o produto');
      return { produto_id: produtoId, produto_nome: nome, unidade, quantidade, preco_unitario: preco, subtotal: Math.round(quantidade * preco * 100) / 100 };
    });
  }

  function gravarItens(pedidoId, itens) {
    db.prepare('DELETE FROM portal_pedido_itens WHERE pedido_id = ?').run(pedidoId);
    const ins = db.prepare('INSERT INTO portal_pedido_itens (pedido_id, produto_id, produto_nome, unidade, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const i of itens) ins.run(pedidoId, i.produto_id, i.produto_nome, i.unidade, i.quantidade, i.preco_unitario, i.subtotal);
    const valor = itens.reduce((s, i) => s + i.subtotal, 0);
    const q = itens.reduce((s, i) => s + i.quantidade, 0);
    db.prepare('UPDATE portal_pedidos SET valor_total = ?, qtd_total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(valor, q, pedidoId);
    return { valor, q };
  }

  const resumoItens = itens => itens.map(i => `${qtd(i.quantidade)} ${i.unidade} de ${i.produto_nome}`).join(', ');

  function unidadeDoPedido(pedidoId) {
    const i = db.prepare('SELECT unidade FROM portal_pedido_itens WHERE pedido_id = ? ORDER BY id LIMIT 1').get(pedidoId);
    return (i && i.unidade) || 'peças';
  }

  function clienteDoPedido(pedidoId) {
    return db.prepare('SELECT * FROM portal_pedidos WHERE id = ?').get(pedidoId);
  }

  // Executa uma ação, convertendo erros de validação em 400
  const acao = fn => (req, res) => {
    try {
      fn(req, res);
    } catch (e) {
      descartarUpload(req);
      res.status(400).json({ error: e.message || 'Erro' });
    }
  };

  // ==================== ROTAS DA GESTÃO ====================
  router.get('/api/portal/clientes', ...somenteGestao, (req, res) => {
    const clientes = db.prepare('SELECT * FROM portal_clientes ORDER BY ativo DESC, nome').all();
    res.json(clientes.map(c => ({ ...c, resumo: painel(c.id).resumo })));
  });

  router.post('/api/portal/clientes', ...somenteGestao, acao((req, res) => {
    const nome = texto(req.body.nome, 120);
    if (!nome) throw new Error('Informe o nome do cliente');
    const r = db.prepare('INSERT INTO portal_clientes (nome, contato, telefone, observacoes, token) VALUES (?, ?, ?, ?, ?)')
      .run(nome, texto(req.body.contato, 120), texto(req.body.telefone, 40), texto(req.body.observacoes), novoToken());
    const id = Number(r.lastInsertRowid);
    registrar(id, { tipo: 'cliente', descricao: 'Acompanhamento de pedidos criado', autorNome: req.usuario.nome });
    res.json(db.prepare('SELECT * FROM portal_clientes WHERE id = ?').get(id));
  }));

  router.put('/api/portal/clientes/:id', ...somenteGestao, acao((req, res) => {
    const c = db.prepare('SELECT * FROM portal_clientes WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
    const nome = texto(req.body.nome, 120) || c.nome;
    db.prepare('UPDATE portal_clientes SET nome = ?, contato = ?, telefone = ?, observacoes = ?, ativo = ? WHERE id = ?')
      .run(nome, texto(req.body.contato, 120), texto(req.body.telefone, 40), texto(req.body.observacoes), req.body.ativo === false ? 0 : 1, c.id);
    notificar(c.id, { tipo: 'cliente' });
    res.json({ success: true });
  }));

  router.post('/api/portal/clientes/:id/novo-link', ...somenteGestao, acao((req, res) => {
    const c = db.prepare('SELECT * FROM portal_clientes WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
    const token = novoToken();
    db.prepare('UPDATE portal_clientes SET token = ? WHERE id = ?').run(token, c.id);
    registrar(c.id, { tipo: 'cliente', descricao: 'Link de acompanhamento foi renovado (o link antigo deixou de funcionar)', autorNome: req.usuario.nome });
    // Derruba conexões abertas com o link antigo
    for (const o of ouvintes) if (o.clienteId === c.id && o.token === c.token) o.res.end();
    notificar(c.id, { tipo: 'cliente' });
    res.json({ token });
  }));

  router.get('/api/portal/clientes/:id/painel', ...somenteGestao, (req, res) => {
    const d = painel(Number(req.params.id));
    if (!d) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(d);
  });

  // ----- Produtos -----
  router.post('/api/portal/clientes/:id/produtos', ...somenteGestao, acao((req, res) => {
    const c = db.prepare('SELECT * FROM portal_clientes WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
    const nome = texto(req.body.nome, 120);
    if (!nome) throw new Error('Informe o nome do produto');
    const preco = numero(req.body.preco || 0);
    if (!(preco >= 0)) throw new Error('Preço inválido');
    db.prepare('INSERT INTO portal_produtos (cliente_id, nome, descricao, unidade, preco) VALUES (?, ?, ?, ?, ?)')
      .run(c.id, nome, texto(req.body.descricao), texto(req.body.unidade, 20) || 'peças', preco);
    registrar(c.id, { tipo: 'produto', descricao: `Produto cadastrado: ${nome} — ${brl(preco)} (${texto(req.body.unidade, 20) || 'peças'})`, autorNome: req.usuario.nome });
    notificar(c.id, { tipo: 'produto' });
    res.json({ success: true });
  }));

  router.put('/api/portal/produtos/:id', ...somenteGestao, acao((req, res) => {
    const p = db.prepare('SELECT * FROM portal_produtos WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
    const nome = texto(req.body.nome, 120) || p.nome;
    const preco = req.body.preco === undefined ? p.preco : numero(req.body.preco);
    if (!(preco >= 0)) throw new Error('Preço inválido');
    const ativo = req.body.ativo === undefined ? p.ativo : (req.body.ativo ? 1 : 0);
    db.prepare('UPDATE portal_produtos SET nome = ?, descricao = ?, unidade = ?, preco = ?, ativo = ? WHERE id = ?')
      .run(nome, req.body.descricao === undefined ? p.descricao : texto(req.body.descricao), texto(req.body.unidade, 20) || p.unidade, preco, ativo, p.id);
    if (preco !== p.preco) registrar(p.cliente_id, { tipo: 'produto', descricao: `Preço de ${nome} alterado de ${brl(p.preco)} para ${brl(preco)}`, autorNome: req.usuario.nome });
    notificar(p.cliente_id, { tipo: 'produto' });
    res.json({ success: true });
  }));

  // ----- Pedidos -----
  router.post('/api/portal/clientes/:id/pedidos', ...somenteGestao, acao((req, res) => {
    const c = db.prepare('SELECT * FROM portal_clientes WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
    const itens = lerItens(c.id, req.body.itens);
    const status = STATUS_PEDIDO.includes(req.body.status) ? req.body.status : 'Recebido';
    const pedido = db.transaction(() => {
      const prox = db.prepare('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM portal_pedidos WHERE cliente_id = ?').get(c.id).n;
      const r = db.prepare('INSERT INTO portal_pedidos (cliente_id, numero, data_pedido, previsao_entrega, status, observacoes) VALUES (?, ?, ?, ?, ?, ?)')
        .run(c.id, prox, dataValida(req.body.data_pedido) || hoje(), dataValida(req.body.previsao_entrega), status, texto(req.body.observacoes));
      const id = Number(r.lastInsertRowid);
      const { valor } = gravarItens(id, itens);
      const previsao = dataValida(req.body.previsao_entrega);
      registrar(c.id, {
        pedidoId: id, tipo: 'pedido', autorNome: req.usuario.nome,
        descricao: `Pedido #${prox} registrado: ${resumoItens(itens)} — total ${brl(valor)}${previsao ? `. Previsão de entrega: ${dataBR(previsao)}` : ''}`
      });
      return { id, numero: prox };
    })();
    notificar(c.id, { tipo: 'pedido', descricao: `Novo pedido #${pedido.numero}` });
    res.json(pedido);
  }));

  router.put('/api/portal/pedidos/:id', ...somenteGestao, acao((req, res) => {
    const p = clienteDoPedido(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pedido não encontrado' });
    db.transaction(() => {
      const mudancas = [];
      if (req.body.itens) {
        const itens = lerItens(p.cliente_id, req.body.itens);
        const { valor } = gravarItens(p.id, itens);
        mudancas.push(`itens atualizados (${resumoItens(itens)} — total ${brl(valor)})`);
      }
      if (req.body.previsao_entrega !== undefined) {
        const prev = dataValida(req.body.previsao_entrega);
        if (prev !== p.previsao_entrega) {
          db.prepare('UPDATE portal_pedidos SET previsao_entrega = ? WHERE id = ?').run(prev, p.id);
          mudancas.push(prev ? `previsão de entrega: ${dataBR(prev)}` : 'previsão de entrega removida');
        }
      }
      if (req.body.data_pedido !== undefined && dataValida(req.body.data_pedido) && req.body.data_pedido !== p.data_pedido) {
        db.prepare('UPDATE portal_pedidos SET data_pedido = ? WHERE id = ?').run(req.body.data_pedido, p.id);
        mudancas.push(`data do pedido: ${dataBR(req.body.data_pedido)}`);
      }
      if (req.body.observacoes !== undefined && texto(req.body.observacoes) !== (p.observacoes || '')) {
        db.prepare('UPDATE portal_pedidos SET observacoes = ? WHERE id = ?').run(texto(req.body.observacoes), p.id);
        mudancas.push('observações atualizadas');
      }
      if (mudancas.length) {
        db.prepare('UPDATE portal_pedidos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(p.id);
        registrar(p.cliente_id, { pedidoId: p.id, tipo: 'pedido', descricao: `Pedido #${p.numero}: ${mudancas.join('; ')}`, autorNome: req.usuario.nome });
      }
      if (req.body.status !== undefined && req.body.status !== p.status) {
        if (!STATUS_PEDIDO.includes(req.body.status)) throw new Error('Status inválido');
        db.prepare('UPDATE portal_pedidos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.body.status, p.id);
        registrar(p.cliente_id, { pedidoId: p.id, tipo: 'status', descricao: `Pedido #${p.numero}: ${p.status} → ${req.body.status}`, autorNome: req.usuario.nome });
      } else if (req.body.itens) {
        const novo = atualizarStatusPorEntregas(p.id);
        if (novo) registrar(p.cliente_id, { pedidoId: p.id, tipo: 'status', descricao: `Pedido #${p.numero}: ${p.status} → ${novo}`, autorNome: req.usuario.nome });
      }
    })();
    notificar(p.cliente_id, { tipo: 'pedido' });
    res.json({ success: true });
  }));

  router.delete('/api/portal/pedidos/:id', verifyToken, requirePerfil('admin'), (req, res) => {
    const p = clienteDoPedido(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pedido não encontrado' });
    db.transaction(() => {
      const entregas = db.prepare('SELECT id FROM portal_entregas WHERE pedido_id = ?').all(p.id).map(e => e.id);
      apagarArquivosDe('entrega', entregas);
      apagarArquivosDe('pedido', [p.id]);
      db.prepare('UPDATE portal_pagamentos SET pedido_id = NULL WHERE pedido_id = ?').run(p.id);
      db.prepare('DELETE FROM portal_entregas WHERE pedido_id = ?').run(p.id);
      db.prepare('DELETE FROM portal_pedido_itens WHERE pedido_id = ?').run(p.id);
      db.prepare('DELETE FROM portal_pedidos WHERE id = ?').run(p.id);
      db.prepare('UPDATE portal_historico SET pedido_id = NULL WHERE pedido_id = ?').run(p.id);
      registrar(p.cliente_id, { tipo: 'pedido', descricao: `Pedido #${p.numero} foi excluído`, autorNome: req.usuario.nome });
    })();
    notificar(p.cliente_id, { tipo: 'pedido' });
    res.json({ success: true });
  });

  // ----- Entregas -----
  router.post('/api/portal/pedidos/:id/entregas', ...somenteGestao, receberArquivo, acao((req, res) => {
    const p = clienteDoPedido(req.params.id);
    if (!p) throw new Error('Pedido não encontrado');
    if (p.status === 'Cancelado') throw new Error('Pedido cancelado');
    const quantidade = numero(req.body.quantidade);
    if (!(quantidade > 0)) throw new Error('Informe a quantidade entregue');
    const data = dataValida(req.body.data) || hoje();
    db.transaction(() => {
      const r = db.prepare('INSERT INTO portal_entregas (cliente_id, pedido_id, data, quantidade, observacao) VALUES (?, ?, ?, ?, ?)')
        .run(p.cliente_id, p.id, data, quantidade, texto(req.body.observacao));
      const anexo = salvarAnexo(p.cliente_id, 'entrega', Number(r.lastInsertRowid), req.file, 'empresa');
      const entregue = db.prepare('SELECT SUM(quantidade) AS q FROM portal_entregas WHERE pedido_id = ?').get(p.id).q;
      const un = unidadeDoPedido(p.id);
      registrar(p.cliente_id, {
        pedidoId: p.id, tipo: 'entrega', autorNome: req.usuario.nome,
        descricao: `Entrega do pedido #${p.numero} em ${dataBR(data)}: ${qtd(quantidade)} ${un} (${qtd(entregue)} de ${qtd(p.qtd_total)} entregues)${anexo ? ' — com comprovante' : ''}`
      });
      const novo = atualizarStatusPorEntregas(p.id);
      if (novo) registrar(p.cliente_id, { pedidoId: p.id, tipo: 'status', descricao: `Pedido #${p.numero}: ${p.status} → ${novo}`, autorNome: req.usuario.nome });
    })();
    notificar(p.cliente_id, { tipo: 'entrega', descricao: `Entrega registrada no pedido #${p.numero}` });
    res.json({ success: true });
  }));

  router.delete('/api/portal/entregas/:id', ...somenteGestao, (req, res) => {
    const e = db.prepare('SELECT * FROM portal_entregas WHERE id = ?').get(req.params.id);
    if (!e) return res.status(404).json({ error: 'Entrega não encontrada' });
    const p = clienteDoPedido(e.pedido_id);
    db.transaction(() => {
      apagarArquivosDe('entrega', [e.id]);
      db.prepare('DELETE FROM portal_entregas WHERE id = ?').run(e.id);
      registrar(e.cliente_id, { pedidoId: p.id, tipo: 'entrega', descricao: `Entrega de ${qtd(e.quantidade)} ${unidadeDoPedido(p.id)} (${dataBR(e.data)}) do pedido #${p.numero} foi removida`, autorNome: req.usuario.nome });
      const novo = atualizarStatusPorEntregas(p.id);
      if (novo) registrar(e.cliente_id, { pedidoId: p.id, tipo: 'status', descricao: `Pedido #${p.numero}: ${p.status} → ${novo}`, autorNome: req.usuario.nome });
    })();
    notificar(e.cliente_id, { tipo: 'entrega' });
    res.json({ success: true });
  });

  // ----- Pagamentos -----
  function lerPagamento(clienteId, body) {
    const valor = numero(body.valor);
    if (!(valor > 0)) throw new Error('Informe o valor do pagamento');
    let pedidoId = null;
    let pedidoNumero = null;
    if (body.pedido_id) {
      const p = db.prepare('SELECT * FROM portal_pedidos WHERE id = ? AND cliente_id = ?').get(body.pedido_id, clienteId);
      if (!p) throw new Error('Pedido não encontrado');
      pedidoId = p.id;
      pedidoNumero = p.numero;
    }
    const forma = FORMAS_PAGAMENTO.includes(body.forma) ? body.forma : 'Pix';
    return { valor, pedidoId, pedidoNumero, forma, data: dataValida(body.data) || hoje(), observacao: texto(body.observacao) };
  }

  router.post('/api/portal/clientes/:id/pagamentos', ...somenteGestao, receberArquivo, acao((req, res) => {
    const c = db.prepare('SELECT * FROM portal_clientes WHERE id = ?').get(req.params.id);
    if (!c) throw new Error('Cliente não encontrado');
    const g = lerPagamento(c.id, req.body);
    db.transaction(() => {
      const r = db.prepare('INSERT INTO portal_pagamentos (cliente_id, pedido_id, data, valor, forma, observacao, status, informado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(c.id, g.pedidoId, g.data, g.valor, g.forma, g.observacao, 'Confirmado', 'empresa');
      const anexo = salvarAnexo(c.id, 'pagamento', Number(r.lastInsertRowid), req.file, 'empresa');
      registrar(c.id, {
        pedidoId: g.pedidoId, tipo: 'pagamento', autorNome: req.usuario.nome,
        descricao: `Pagamento recebido: ${brl(g.valor)} via ${g.forma} em ${dataBR(g.data)}${g.pedidoNumero ? ` (pedido #${g.pedidoNumero})` : ''}${anexo ? ' — com comprovante' : ''}`
      });
    })();
    notificar(c.id, { tipo: 'pagamento', descricao: `Pagamento de ${brl(g.valor)} registrado` });
    res.json({ success: true });
  }));

  // Confirmar ou recusar pagamento informado pelo cliente
  router.put('/api/portal/pagamentos/:id/status', ...somenteGestao, acao((req, res) => {
    const g = db.prepare('SELECT * FROM portal_pagamentos WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Pagamento não encontrado' });
    const status = req.body.status;
    if (!['Confirmado', 'Recusado', 'Aguardando confirmação'].includes(status)) throw new Error('Status inválido');
    if (status === g.status) return res.json({ success: true });
    const motivo = texto(req.body.motivo, 300);
    db.prepare('UPDATE portal_pagamentos SET status = ? WHERE id = ?').run(status, g.id);
    const verbo = { Confirmado: 'confirmado', Recusado: 'recusado', 'Aguardando confirmação': 'voltou para aguardando confirmação' }[status];
    registrar(g.cliente_id, {
      pedidoId: g.pedido_id, tipo: 'pagamento', autorNome: req.usuario.nome,
      descricao: `Pagamento de ${brl(g.valor)} (${dataBR(g.data)}) ${verbo}${motivo ? `: ${motivo}` : ''}`
    });
    notificar(g.cliente_id, { tipo: 'pagamento', descricao: `Pagamento ${verbo}` });
    res.json({ success: true });
  }));

  router.delete('/api/portal/pagamentos/:id', ...somenteGestao, (req, res) => {
    const g = db.prepare('SELECT * FROM portal_pagamentos WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Pagamento não encontrado' });
    db.transaction(() => {
      apagarArquivosDe('pagamento', [g.id]);
      db.prepare('DELETE FROM portal_pagamentos WHERE id = ?').run(g.id);
      registrar(g.cliente_id, { pedidoId: g.pedido_id, tipo: 'pagamento', descricao: `Pagamento de ${brl(g.valor)} (${dataBR(g.data)}) foi removido`, autorNome: req.usuario.nome });
    })();
    notificar(g.cliente_id, { tipo: 'pagamento' });
    res.json({ success: true });
  });

  // ----- Anexos e mensagens (comum às duas pontas) -----
  function anexar(clienteId, req, autor, autorNome) {
    if (!req.file) throw new Error('Selecione um arquivo');
    const tipo = req.body.tipo;
    const refId = Number(req.body.ref_id);
    let descricao;
    let pedidoId = null;
    if (tipo === 'entrega') {
      const e = db.prepare('SELECT e.*, p.numero FROM portal_entregas e JOIN portal_pedidos p ON p.id = e.pedido_id WHERE e.id = ? AND e.cliente_id = ?').get(refId, clienteId);
      if (!e) throw new Error('Entrega não encontrada');
      pedidoId = e.pedido_id;
      descricao = `Comprovante anexado à entrega de ${dataBR(e.data)} (pedido #${e.numero})`;
    } else if (tipo === 'pagamento') {
      const g = db.prepare('SELECT * FROM portal_pagamentos WHERE id = ? AND cliente_id = ?').get(refId, clienteId);
      if (!g) throw new Error('Pagamento não encontrado');
      pedidoId = g.pedido_id;
      descricao = `Comprovante anexado ao pagamento de ${brl(g.valor)} (${dataBR(g.data)})`;
    } else if (tipo === 'pedido') {
      const p = db.prepare('SELECT * FROM portal_pedidos WHERE id = ? AND cliente_id = ?').get(refId, clienteId);
      if (!p) throw new Error('Pedido não encontrado');
      pedidoId = p.id;
      descricao = `Arquivo anexado ao pedido #${p.numero}`;
    } else {
      throw new Error('Tipo de anexo inválido');
    }
    salvarAnexo(clienteId, tipo, refId, req.file, autor);
    registrar(clienteId, { pedidoId, tipo: 'anexo', descricao, autor, autorNome });
    notificar(clienteId, { tipo: 'anexo', autor, descricao });
  }

  router.post('/api/portal/clientes/:id/anexos', ...somenteGestao, receberArquivo, acao((req, res) => {
    const c = db.prepare('SELECT * FROM portal_clientes WHERE id = ?').get(req.params.id);
    if (!c) throw new Error('Cliente não encontrado');
    anexar(c.id, req, 'empresa', req.usuario.nome);
    res.json({ success: true });
  }));

  router.delete('/api/portal/anexos/:id', ...somenteGestao, (req, res) => {
    const a = db.prepare('SELECT * FROM portal_anexos WHERE id = ?').get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Anexo não encontrado' });
    fs.rm(path.join(pastaUploads, a.arquivo), { force: true }, () => {});
    db.prepare('DELETE FROM portal_anexos WHERE id = ?').run(a.id);
    registrar(a.cliente_id, { tipo: 'anexo', descricao: `Anexo "${a.nome_original || 'arquivo'}" foi removido`, autorNome: req.usuario.nome });
    notificar(a.cliente_id, { tipo: 'anexo' });
    res.json({ success: true });
  });

  router.post('/api/portal/clientes/:id/mensagens', ...somenteGestao, acao((req, res) => {
    const c = db.prepare('SELECT * FROM portal_clientes WHERE id = ?').get(req.params.id);
    if (!c) throw new Error('Cliente não encontrado');
    const msg = texto(req.body.mensagem, 1000);
    if (!msg) throw new Error('Escreva a mensagem');
    const p = req.body.pedido_id ? db.prepare('SELECT id FROM portal_pedidos WHERE id = ? AND cliente_id = ?').get(req.body.pedido_id, c.id) : null;
    registrar(c.id, { pedidoId: p ? p.id : null, tipo: 'mensagem', descricao: msg, autorNome: req.usuario.nome });
    notificar(c.id, { tipo: 'mensagem', autor: 'empresa', descricao: msg });
    res.json({ success: true });
  }));

  // Tempo real para a gestão (EventSource não envia cabeçalhos, então o token vai na URL)
  router.get('/api/portal/eventos', (req, res) => {
    try {
      const u = jwt.verify(String(req.query.t || ''), JWT_SECRET);
      if (!['admin', 'gerente'].includes(u.perfil) || u.trocar_senha) return res.status(403).end();
    } catch (e) {
      return res.status(401).end();
    }
    abrirStream(req, res, null);
  });

  // ==================== ROTAS DO CLIENTE (LINK) ====================
  function porToken(req, res, next) {
    const c = db.prepare('SELECT * FROM portal_clientes WHERE token = ? AND ativo = 1').get(String(req.params.token));
    if (!c) {
      descartarUpload(req);
      return res.status(404).json({ error: 'Link inválido ou desativado. Peça um novo link à Fernandes Têxtil.' });
    }
    req.portalCliente = c;
    next();
  }

  router.get('/p/:token', (req, res) => res.sendFile(path.join(baseDir, 'public', 'acompanhar.html')));

  router.get('/api/p/:token', porToken, (req, res) => res.json(painelPublico(req.portalCliente.id)));

  router.get('/api/p/:token/eventos', porToken, (req, res) => {
    abrirStream(req, res, req.portalCliente.id, req.portalCliente.token);
  });

  router.get('/api/p/:token/arquivos/:id', porToken, (req, res) => {
    const a = db.prepare('SELECT * FROM portal_anexos WHERE id = ? AND cliente_id = ?').get(req.params.id, req.portalCliente.id);
    if (!a) return res.status(404).send('Arquivo não encontrado');
    res.set('Content-Type', a.mime || 'application/octet-stream');
    res.set('Cache-Control', 'private, max-age=86400');
    const nome = encodeURIComponent(a.nome_original || a.arquivo);
    res.set('Content-Disposition', `${req.query.baixar ? 'attachment' : 'inline'}; filename*=UTF-8''${nome}`);
    res.sendFile(path.join(pastaUploads, a.arquivo), err => {
      if (err && !res.headersSent) res.status(404).send('Arquivo não encontrado');
    });
  });

  // Cliente informa um pagamento (fica aguardando confirmação da empresa)
  router.post('/api/p/:token/pagamentos', porToken, receberArquivo, acao((req, res) => {
    const c = req.portalCliente;
    const g = lerPagamento(c.id, req.body);
    db.transaction(() => {
      const r = db.prepare('INSERT INTO portal_pagamentos (cliente_id, pedido_id, data, valor, forma, observacao, status, informado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(c.id, g.pedidoId, g.data, g.valor, g.forma, g.observacao, 'Aguardando confirmação', 'cliente');
      const anexo = salvarAnexo(c.id, 'pagamento', Number(r.lastInsertRowid), req.file, 'cliente');
      registrar(c.id, {
        pedidoId: g.pedidoId, tipo: 'pagamento', autor: 'cliente', autorNome: c.nome,
        descricao: `Pagamento informado: ${brl(g.valor)} via ${g.forma} em ${dataBR(g.data)}${g.pedidoNumero ? ` (pedido #${g.pedidoNumero})` : ''}${anexo ? ' — com comprovante' : ''}. Aguardando confirmação.`
      });
    })();
    notificar(c.id, { tipo: 'pagamento', autor: 'cliente', descricao: `${c.nome} informou um pagamento de ${brl(g.valor)}` });
    res.json({ success: true });
  }));

  router.post('/api/p/:token/anexos', porToken, receberArquivo, acao((req, res) => {
    const c = req.portalCliente;
    anexar(c.id, req, 'cliente', c.nome);
    res.json({ success: true });
  }));

  router.post('/api/p/:token/mensagens', porToken, acao((req, res) => {
    const c = req.portalCliente;
    const msg = texto(req.body.mensagem, 1000);
    if (!msg) throw new Error('Escreva a mensagem');
    let pedidoId = null;
    if (req.body.pedido_id) {
      const p = db.prepare('SELECT id FROM portal_pedidos WHERE id = ? AND cliente_id = ?').get(req.body.pedido_id, c.id);
      pedidoId = p ? p.id : null;
    }
    registrar(c.id, { pedidoId, tipo: 'mensagem', descricao: msg, autor: 'cliente', autorNome: c.nome });
    notificar(c.id, { tipo: 'mensagem', autor: 'cliente', descricao: `${c.nome}: ${msg}` });
    res.json({ success: true });
  }));

  // Página da gestão (os arquivos são abertos pela mesma rota do link do cliente)
  router.get('/portal', (req, res) => res.sendFile(path.join(baseDir, 'public', 'portal.html')));

  return router;
};
