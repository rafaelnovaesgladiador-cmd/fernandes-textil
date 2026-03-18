const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'fernandes_textil_secret_2024';

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads dir exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// Database
const db = new Database(path.join(__dirname, 'database.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- SCHEMA ---
db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL,
  ativo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  telefone TEXT,
  cidade TEXT,
  endereco TEXT,
  saldo_fiado REAL DEFAULT 0,
  observacoes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  unidade TEXT DEFAULT 'un',
  quantidade REAL DEFAULT 0,
  quantidade_minima REAL DEFAULT 5,
  preco_custo REAL DEFAULT 0,
  preco_venda REAL DEFAULT 0,
  ativo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT UNIQUE NOT NULL,
  cliente_id INTEGER,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT,
  local_entrega TEXT,
  cidade_entrega TEXT,
  data_entrega DATE,
  status TEXT DEFAULT 'Pendente',
  tipo_pagamento TEXT DEFAULT 'A Prazo',
  num_volumes INTEGER DEFAULT 0,
  observacoes TEXT,
  desconto REAL DEFAULT 0,
  valor_total REAL DEFAULT 0,
  valor_com_desconto REAL DEFAULT 0,
  custo_total REAL DEFAULT 0,
  foto_separado TEXT,
  comprovante_entrega TEXT,
  comprovante_pagamento TEXT,
  atendente_id INTEGER,
  entregador_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  produto_id INTEGER,
  produto_nome TEXT NOT NULL,
  quantidade REAL NOT NULL,
  preco_unitario REAL NOT NULL,
  preco_custo REAL DEFAULT 0,
  subtotal REAL NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);

CREATE TABLE IF NOT EXISTS estoque_movimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  quantidade REAL NOT NULL,
  preco_custo REAL,
  motivo TEXT,
  pedido_id INTEGER,
  usuario_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE TABLE IF NOT EXISTS reposicoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL,
  produto_nome TEXT NOT NULL,
  quantidade_pedida REAL NOT NULL,
  quantidade_recebida REAL DEFAULT 0,
  fornecedor TEXT,
  status TEXT DEFAULT 'Pendente',
  usuario_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE TABLE IF NOT EXISTS despesas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  data DATE NOT NULL,
  usuario_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fiados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  pedido_id INTEGER,
  tipo TEXT NOT NULL,
  valor REAL NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS comissoes_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL UNIQUE,
  percentual REAL DEFAULT 5.0,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
`);

// ALTER TABLE para novos campos (SQLite não suporta IF NOT EXISTS em ALTER)
try { db.exec("ALTER TABLE pedidos ADD COLUMN vendedora_id INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE pedidos ADD COLUMN metodo_pagamento TEXT DEFAULT 'Dinheiro'"); } catch(e) {}

// --- SEED ---
const seedUsuarios = () => {
  const users = [
    { nome: 'Rafael', username: 'admin', senha: 'fernandes2020', perfil: 'admin' },
    { nome: 'Atendente', username: 'atendente', senha: '123456', perfil: 'atendente' },
    { nome: 'Entregador', username: 'entregador', senha: '123456', perfil: 'entregador' },
  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO usuarios (nome, username, senha_hash, perfil) VALUES (?, ?, ?, ?)');
  for (const u of users) {
    const hash = bcrypt.hashSync(u.senha, 10);
    stmt.run(u.nome, u.username, hash, u.perfil);
  }
};
seedUsuarios();

// --- MULTER ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// --- AUTH MIDDLEWARE ---
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    const token = auth.split(' ')[1];
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function requirePerfil(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.usuario.perfil)) return res.status(403).json({ error: 'Acesso negado' });
    next();
  };
}

// --- HELPERS ---
function gerarNumero() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `PED${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${Date.now().toString().slice(-5)}`;
}

// ==================== ROTAS AUTH ====================
app.post('/api/auth/login', (req, res) => {
  const { username, senha } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE username = ? AND ativo = 1').get(username);
  if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  if (!bcrypt.compareSync(senha, user.senha_hash)) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  const token = jwt.sign({ id: user.id, nome: user.nome, perfil: user.perfil, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, usuario: { id: user.id, nome: user.nome, perfil: user.perfil, username: user.username } });
});

app.get('/api/auth/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, nome, username, perfil, ativo FROM usuarios WHERE id = ?').get(req.usuario.id);
  res.json(user);
});

// ==================== ROTAS USUÁRIOS ====================
app.get('/api/usuarios', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const users = db.prepare('SELECT id, nome, username, perfil, ativo, created_at FROM usuarios ORDER BY nome').all();
  res.json(users);
});

app.post('/api/usuarios', verifyToken, requirePerfil('admin'), (req, res) => {
  const { nome, username, senha, perfil, ativo = 1 } = req.body;
  if (!nome || !username || !senha || !perfil) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  const hash = bcrypt.hashSync(senha, 10);
  try {
    const r = db.prepare('INSERT INTO usuarios (nome, username, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, ?)').run(nome, username, hash, perfil, ativo);
    res.json({ id: r.lastInsertRowid, nome, username, perfil, ativo });
  } catch (e) {
    res.status(400).json({ error: 'Username já existe' });
  }
});

app.put('/api/usuarios/:id', verifyToken, requirePerfil('admin'), (req, res) => {
  const { nome, username, senha, perfil, ativo } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const hash = senha ? bcrypt.hashSync(senha, 10) : user.senha_hash;
  db.prepare('UPDATE usuarios SET nome=?, username=?, senha_hash=?, perfil=?, ativo=? WHERE id=?')
    .run(nome || user.nome, username || user.username, hash, perfil || user.perfil, ativo !== undefined ? ativo : user.ativo, req.params.id);
  res.json({ success: true });
});

app.delete('/api/usuarios/:id', verifyToken, requirePerfil('admin'), (req, res) => {
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== ROTAS CLIENTES ====================
app.get('/api/clientes', verifyToken, (req, res) => {
  const { busca } = req.query;
  let sql = 'SELECT * FROM clientes';
  const params = [];
  if (busca) { sql += ' WHERE nome LIKE ? OR telefone LIKE ? OR cidade LIKE ?'; params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`); }
  sql += ' ORDER BY nome';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/clientes/:id', verifyToken, (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
  const pedidos = db.prepare('SELECT id, numero, status, valor_com_desconto, tipo_pagamento, created_at FROM pedidos WHERE cliente_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  const fiados = db.prepare('SELECT * FROM fiados WHERE cliente_id = ? ORDER BY data DESC').all(req.params.id);
  res.json({ ...cliente, pedidos, fiados });
});

app.post('/api/clientes', verifyToken, (req, res) => {
  const { nome, telefone, cidade, endereco, observacoes } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  const r = db.prepare('INSERT INTO clientes (nome, telefone, cidade, endereco, observacoes) VALUES (?, ?, ?, ?, ?)').run(nome, telefone || null, cidade || null, endereco || null, observacoes || null);
  res.json({ id: r.lastInsertRowid, nome, telefone, cidade, endereco, observacoes, saldo_fiado: 0 });
});

app.put('/api/clientes/:id', verifyToken, (req, res) => {
  const { nome, telefone, cidade, endereco, observacoes } = req.body;
  const c = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  db.prepare('UPDATE clientes SET nome=?, telefone=?, cidade=?, endereco=?, observacoes=? WHERE id=?')
    .run(nome || c.nome, telefone !== undefined ? telefone : c.telefone, cidade !== undefined ? cidade : c.cidade, endereco !== undefined ? endereco : c.endereco, observacoes !== undefined ? observacoes : c.observacoes, req.params.id);
  res.json({ success: true });
});

app.delete('/api/clientes/:id', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== ROTAS PRODUTOS ====================
app.get('/api/produtos', verifyToken, (req, res) => {
  const { categoria, busca, ativos } = req.query;
  let sql = 'SELECT * FROM produtos WHERE 1=1';
  const params = [];
  if (ativos === '1') { sql += ' AND ativo = 1'; }
  if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
  if (busca) { sql += ' AND (nome LIKE ? OR categoria LIKE ?)'; params.push(`%${busca}%`, `%${busca}%`); }
  sql += ' ORDER BY nome';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/produtos/:id', verifyToken, (req, res) => {
  const p = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(p);
});

app.post('/api/produtos', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const { nome, categoria, unidade = 'un', quantidade = 0, quantidade_minima = 5, preco_custo = 0, preco_venda = 0, ativo = 1 } = req.body;
  if (!nome || !categoria) return res.status(400).json({ error: 'Nome e categoria obrigatórios' });
  const r = db.prepare('INSERT INTO produtos (nome, categoria, unidade, quantidade, quantidade_minima, preco_custo, preco_venda, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(nome, categoria, unidade, quantidade, quantidade_minima, preco_custo, preco_venda, ativo);
  const produtoId = r.lastInsertRowid;
  if (quantidade > 0) {
    db.prepare('INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, preco_custo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?, ?)').run(produtoId, 'entrada', quantidade, preco_custo, 'Estoque inicial', req.usuario.id);
  }
  res.json({ id: produtoId, nome, categoria, unidade, quantidade, quantidade_minima, preco_custo, preco_venda, ativo });
});

app.put('/api/produtos/:id', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const p = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
  const { nome, categoria, unidade, quantidade_minima, preco_custo, preco_venda, ativo } = req.body;
  db.prepare('UPDATE produtos SET nome=?, categoria=?, unidade=?, quantidade_minima=?, preco_custo=?, preco_venda=?, ativo=? WHERE id=?')
    .run(nome || p.nome, categoria || p.categoria, unidade || p.unidade, quantidade_minima !== undefined ? quantidade_minima : p.quantidade_minima, preco_custo !== undefined ? preco_custo : p.preco_custo, preco_venda !== undefined ? preco_venda : p.preco_venda, ativo !== undefined ? ativo : p.ativo, req.params.id);
  res.json({ success: true });
});

app.delete('/api/produtos/:id', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  db.prepare('UPDATE produtos SET ativo = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== ROTAS ESTOQUE ====================
app.get('/api/estoque/movimentos', verifyToken, (req, res) => {
  const { produto_id } = req.query;
  let sql = `SELECT em.*, p.nome as produto_nome, u.nome as usuario_nome 
    FROM estoque_movimentos em 
    LEFT JOIN produtos p ON em.produto_id = p.id 
    LEFT JOIN usuarios u ON em.usuario_id = u.id`;
  const params = [];
  if (produto_id) { sql += ' WHERE em.produto_id = ?'; params.push(produto_id); }
  sql += ' ORDER BY em.created_at DESC LIMIT 200';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/estoque/baixo', verifyToken, (req, res) => {
  const produtos = db.prepare('SELECT * FROM produtos WHERE quantidade <= quantidade_minima AND ativo = 1 ORDER BY quantidade ASC').all();
  res.json(produtos);
});

app.post('/api/estoque/entrada', verifyToken, (req, res) => {
  const { produto_id, quantidade, preco_custo, motivo } = req.body;
  if (!produto_id || !quantidade) return res.status(400).json({ error: 'produto_id e quantidade obrigatórios' });
  const p = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
  if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
  db.prepare('UPDATE produtos SET quantidade = quantidade + ?, preco_custo = COALESCE(?, preco_custo) WHERE id = ?').run(quantidade, preco_custo || null, produto_id);
  const r = db.prepare('INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, preco_custo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?, ?)').run(produto_id, 'entrada', quantidade, preco_custo || null, motivo || 'Entrada manual', req.usuario.id);
  const atualizado = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
  res.json({ success: true, produto: atualizado, movimento_id: r.lastInsertRowid });
});

app.post('/api/estoque/ajuste', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const { produto_id, quantidade, motivo } = req.body;
  if (!produto_id || quantidade === undefined) return res.status(400).json({ error: 'produto_id e quantidade obrigatórios' });
  const p = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
  if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
  const diff = quantidade - p.quantidade;
  db.prepare('UPDATE produtos SET quantidade = ? WHERE id = ?').run(quantidade, produto_id);
  db.prepare('INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)').run(produto_id, 'ajuste', diff, motivo || 'Ajuste de inventário', req.usuario.id);
  res.json({ success: true });
});

// ==================== ROTAS PEDIDOS ====================
app.get('/api/pedidos', verifyToken, (req, res) => {
  const { status, busca, data_inicio, data_fim } = req.query;
  let sql = 'SELECT p.*, u.nome as atendente_nome, e.nome as entregador_nome, v.nome as vendedora_nome FROM pedidos p LEFT JOIN usuarios u ON p.atendente_id = u.id LEFT JOIN usuarios e ON p.entregador_id = e.id LEFT JOIN usuarios v ON p.vendedora_id = v.id WHERE 1=1';
  const params = [];
  if (status && status !== 'Todos') { sql += ' AND p.status = ?'; params.push(status); }
  if (busca) { sql += ' AND (p.cliente_nome LIKE ? OR p.numero LIKE ? OR p.local_entrega LIKE ?)'; params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`); }
  if (data_inicio) { sql += ' AND DATE(p.created_at) >= ?'; params.push(data_inicio); }
  if (data_fim) { sql += ' AND DATE(p.created_at) <= ?'; params.push(data_fim); }
  sql += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/pedidos/minhas — pedidos da vendedora logada
app.get('/api/pedidos/minhas', verifyToken, (req, res) => {
  const { data_inicio, data_fim } = req.query;
  let sql = `SELECT p.*, u.nome as atendente_nome, v.nome as vendedora_nome
    FROM pedidos p
    LEFT JOIN usuarios u ON p.atendente_id = u.id
    LEFT JOIN usuarios v ON p.vendedora_id = v.id
    WHERE (p.vendedora_id = ? OR p.atendente_id = ?)`;
  const params = [req.usuario.id, req.usuario.id];
  if (data_inicio) { sql += ' AND DATE(p.created_at) >= ?'; params.push(data_inicio); }
  if (data_fim) { sql += ' AND DATE(p.created_at) <= ?'; params.push(data_fim); }
  sql += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/pedidos/:id', verifyToken, (req, res) => {
  const pedido = db.prepare('SELECT p.*, u.nome as atendente_nome, e.nome as entregador_nome FROM pedidos p LEFT JOIN usuarios u ON p.atendente_id = u.id LEFT JOIN usuarios e ON p.entregador_id = e.id WHERE p.id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
  const itens = db.prepare('SELECT * FROM pedido_itens WHERE pedido_id = ?').all(req.params.id);
  res.json({ ...pedido, itens });
});

app.post('/api/pedidos', verifyToken, (req, res) => {
  const { cliente_id, cliente_nome, cliente_telefone, local_entrega, cidade_entrega, data_entrega, tipo_pagamento = 'A Prazo', num_volumes = 0, observacoes, desconto = 0, itens = [], entregador_id, vendedora_id } = req.body;
  if (!cliente_nome) return res.status(400).json({ error: 'Nome do cliente obrigatório' });
  const numero = gerarNumero();
  let valor_total = 0;
  let custo_total = 0;
  for (const item of itens) {
    valor_total += item.subtotal || (item.quantidade * item.preco_unitario);
    custo_total += (item.preco_custo || 0) * item.quantidade;
  }
  const valor_com_desconto = valor_total - (desconto || 0);
  const vId = vendedora_id || req.usuario.id;
  const r = db.prepare('INSERT INTO pedidos (numero, cliente_id, cliente_nome, cliente_telefone, local_entrega, cidade_entrega, data_entrega, tipo_pagamento, num_volumes, observacoes, desconto, valor_total, valor_com_desconto, custo_total, atendente_id, vendedora_id, entregador_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(numero, cliente_id || null, cliente_nome, cliente_telefone || null, local_entrega || null, cidade_entrega || null, data_entrega || null, tipo_pagamento, num_volumes, observacoes || null, desconto, valor_total, valor_com_desconto, custo_total, req.usuario.id, vId, entregador_id || null);
  const pedidoId = r.lastInsertRowid;
  const stmtItem = db.prepare('INSERT INTO pedido_itens (pedido_id, produto_id, produto_nome, quantidade, preco_unitario, preco_custo, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const item of itens) {
    stmtItem.run(pedidoId, item.produto_id || null, item.produto_nome, item.quantidade, item.preco_unitario, item.preco_custo || 0, item.subtotal || (item.quantidade * item.preco_unitario));
  }
  res.json({ id: pedidoId, numero, status: 'Pendente' });
});

app.put('/api/pedidos/:id', verifyToken, (req, res) => {
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
  const { status, cliente_nome, cliente_telefone, local_entrega, cidade_entrega, data_entrega, tipo_pagamento, num_volumes, observacoes, desconto, entregador_id, itens } = req.body;

  const novoStatus = status || pedido.status;
  const updated_at = new Date().toISOString();

  // Se mudou para Separado, dar baixa no estoque
  if (novoStatus === 'Separado' && pedido.status !== 'Separado') {
    const pedidoItens = db.prepare('SELECT * FROM pedido_itens WHERE pedido_id = ?').all(pedido.id);
    const stmtUpdate = db.prepare('UPDATE produtos SET quantidade = MAX(0, quantidade - ?) WHERE id = ?');
    const stmtMov = db.prepare('INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, motivo, pedido_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of pedidoItens) {
      if (item.produto_id) {
        stmtUpdate.run(item.quantidade, item.produto_id);
        stmtMov.run(item.produto_id, 'saida', item.quantidade, `Pedido ${pedido.numero}`, pedido.id, req.usuario.id);
      }
    }
  }

  let valor_total = pedido.valor_total;
  let custo_total = pedido.custo_total;
  if (itens) {
    valor_total = 0; custo_total = 0;
    for (const item of itens) {
      valor_total += item.subtotal || (item.quantidade * item.preco_unitario);
      custo_total += (item.preco_custo || 0) * item.quantidade;
    }
    db.prepare('DELETE FROM pedido_itens WHERE pedido_id = ?').run(pedido.id);
    const stmtItem = db.prepare('INSERT INTO pedido_itens (pedido_id, produto_id, produto_nome, quantidade, preco_unitario, preco_custo, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const item of itens) {
      stmtItem.run(pedido.id, item.produto_id || null, item.produto_nome, item.quantidade, item.preco_unitario, item.preco_custo || 0, item.subtotal || (item.quantidade * item.preco_unitario));
    }
  }

  const novoDesconto = desconto !== undefined ? desconto : pedido.desconto;
  const valor_com_desconto = valor_total - novoDesconto;

  db.prepare('UPDATE pedidos SET status=?, cliente_nome=?, cliente_telefone=?, local_entrega=?, cidade_entrega=?, data_entrega=?, tipo_pagamento=?, num_volumes=?, observacoes=?, desconto=?, valor_total=?, valor_com_desconto=?, custo_total=?, entregador_id=?, updated_at=? WHERE id=?').run(
    novoStatus, cliente_nome || pedido.cliente_nome, cliente_telefone !== undefined ? cliente_telefone : pedido.cliente_telefone,
    local_entrega !== undefined ? local_entrega : pedido.local_entrega, cidade_entrega !== undefined ? cidade_entrega : pedido.cidade_entrega,
    data_entrega !== undefined ? data_entrega : pedido.data_entrega, tipo_pagamento || pedido.tipo_pagamento,
    num_volumes !== undefined ? num_volumes : pedido.num_volumes, observacoes !== undefined ? observacoes : pedido.observacoes,
    novoDesconto, valor_total, valor_com_desconto, custo_total, entregador_id !== undefined ? entregador_id : pedido.entregador_id, updated_at, pedido.id
  );
  res.json({ success: true, status: novoStatus });
});

app.delete('/api/pedidos/:id', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  db.prepare('DELETE FROM pedido_itens WHERE pedido_id = ?').run(req.params.id);
  db.prepare('DELETE FROM pedidos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Upload de arquivos do pedido
app.post('/api/pedidos/:id/upload', verifyToken, upload.single('arquivo'), (req, res) => {
  const { tipo } = req.body; // foto_separado | comprovante_entrega | comprovante_pagamento
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const campos = ['foto_separado', 'comprovante_entrega', 'comprovante_pagamento'];
  if (!campos.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
  const url = `/uploads/${req.file.filename}`;
  db.prepare(`UPDATE pedidos SET ${tipo} = ? WHERE id = ?`).run(url, req.params.id);
  res.json({ success: true, url });
});

// Nota imprimível
app.get('/pedidos/:id/nota', (req, res) => {
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).send('Pedido não encontrado');
  const itens = db.prepare('SELECT * FROM pedido_itens WHERE pedido_id = ?').all(req.params.id);
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Nota Pedido ${pedido.numero}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
  h1 { text-align: center; font-size: 1.4em; border-bottom: 2px solid #333; padding-bottom: 10px; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 15px 0; font-size: 0.9em; }
  .info span { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.9em; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f0f0f0; }
  .total { text-align: right; font-size: 1.1em; font-weight: bold; margin-top: 10px; }
  .footer { text-align: center; margin-top: 20px; font-size: 0.8em; color: #777; border-top: 1px solid #ccc; padding-top: 10px; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<h1>🧵 Fernandes Têxtil</h1>
<div style="text-align:center; margin-bottom:10px;">
  <strong>Pedido: ${pedido.numero}</strong> | Status: ${pedido.status}
</div>
<div class="info">
  <div>Cliente: <span>${pedido.cliente_nome}</span></div>
  <div>Telefone: <span>${pedido.cliente_telefone || '-'}</span></div>
  <div>Local: <span>${pedido.local_entrega || '-'}</span></div>
  <div>Cidade: <span>${pedido.cidade_entrega || '-'}</span></div>
  <div>Entrega: <span>${pedido.data_entrega || '-'}</span></div>
  <div>Pagamento: <span>${pedido.tipo_pagamento}</span></div>
  <div>Volumes: <span>${pedido.num_volumes}</span></div>
  <div>Data: <span>${new Date(pedido.created_at).toLocaleDateString('pt-BR')}</span></div>
</div>
<table>
  <thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Subtotal</th></tr></thead>
  <tbody>
    ${itens.map(i => `<tr><td>${i.produto_nome}</td><td>${i.quantidade}</td><td>R$ ${Number(i.preco_unitario).toFixed(2)}</td><td>R$ ${Number(i.subtotal).toFixed(2)}</td></tr>`).join('')}
  </tbody>
</table>
<div class="total">Total: R$ ${Number(pedido.valor_total).toFixed(2)}</div>
${pedido.desconto > 0 ? `<div class="total" style="color:#c00">Desconto: -R$ ${Number(pedido.desconto).toFixed(2)}</div>` : ''}
${pedido.desconto > 0 ? `<div class="total" style="color:green">Total com Desconto: R$ ${Number(pedido.valor_com_desconto).toFixed(2)}</div>` : ''}
${pedido.observacoes ? `<p><strong>Observações:</strong> ${pedido.observacoes}</p>` : ''}
<div class="footer">Fernandes Têxtil — Atacado Cama, Mesa e Banho</div>
<br><button onclick="window.print()" style="padding:10px 20px;background:#1a472a;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:1em;">🖨️ Imprimir</button>
</body></html>`;
  res.send(html);
});

// ==================== ROTAS REPOSIÇÕES ====================
app.get('/api/reposicoes', verifyToken, (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT r.*, p.quantidade as estoque_atual, p.quantidade_minima FROM reposicoes r LEFT JOIN produtos p ON r.produto_id = p.id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND r.status = ?'; params.push(status); }
  sql += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/reposicoes', verifyToken, (req, res) => {
  const { produto_id, produto_nome, quantidade_pedida, fornecedor } = req.body;
  if (!produto_id || !produto_nome || !quantidade_pedida) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  const r = db.prepare('INSERT INTO reposicoes (produto_id, produto_nome, quantidade_pedida, fornecedor, usuario_id) VALUES (?, ?, ?, ?, ?)').run(produto_id, produto_nome, quantidade_pedida, fornecedor || null, req.usuario.id);
  res.json({ id: r.lastInsertRowid, status: 'Pendente' });
});

app.put('/api/reposicoes/:id', verifyToken, (req, res) => {
  const rep = db.prepare('SELECT * FROM reposicoes WHERE id = ?').get(req.params.id);
  if (!rep) return res.status(404).json({ error: 'Reposição não encontrada' });
  const { status, quantidade_recebida, fornecedor } = req.body;
  if (status === 'Coletado' && rep.status !== 'Coletado' && quantidade_recebida > 0) {
    db.prepare('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?').run(quantidade_recebida, rep.produto_id);
    db.prepare('INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)').run(rep.produto_id, 'entrada', quantidade_recebida, `Reposição coletada - ${rep.produto_nome}`, req.usuario.id);
  }
  db.prepare('UPDATE reposicoes SET status=?, quantidade_recebida=?, fornecedor=? WHERE id=?').run(status || rep.status, quantidade_recebida !== undefined ? quantidade_recebida : rep.quantidade_recebida, fornecedor !== undefined ? fornecedor : rep.fornecedor, req.params.id);
  res.json({ success: true });
});

app.delete('/api/reposicoes/:id', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  db.prepare('DELETE FROM reposicoes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== ROTAS DESPESAS ====================
app.get('/api/despesas', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const { data_inicio, data_fim, categoria } = req.query;
  let sql = 'SELECT d.*, u.nome as usuario_nome FROM despesas d LEFT JOIN usuarios u ON d.usuario_id = u.id WHERE 1=1';
  const params = [];
  if (data_inicio) { sql += ' AND d.data >= ?'; params.push(data_inicio); }
  if (data_fim) { sql += ' AND d.data <= ?'; params.push(data_fim); }
  if (categoria) { sql += ' AND d.categoria = ?'; params.push(categoria); }
  sql += ' ORDER BY d.data DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/despesas', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const { categoria, descricao, valor, data } = req.body;
  if (!categoria || !descricao || !valor || !data) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  const r = db.prepare('INSERT INTO despesas (categoria, descricao, valor, data, usuario_id) VALUES (?, ?, ?, ?, ?)').run(categoria, descricao, valor, data, req.usuario.id);
  res.json({ id: r.lastInsertRowid, categoria, descricao, valor, data });
});

app.put('/api/despesas/:id', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const d = db.prepare('SELECT * FROM despesas WHERE id = ?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Despesa não encontrada' });
  const { categoria, descricao, valor, data } = req.body;
  db.prepare('UPDATE despesas SET categoria=?, descricao=?, valor=?, data=? WHERE id=?').run(categoria || d.categoria, descricao || d.descricao, valor !== undefined ? valor : d.valor, data || d.data, req.params.id);
  res.json({ success: true });
});

app.delete('/api/despesas/:id', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  db.prepare('DELETE FROM despesas WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== ROTAS FIADOS ====================
app.get('/api/fiados', verifyToken, (req, res) => {
  const { cliente_id } = req.query;
  let sql = 'SELECT * FROM fiados WHERE 1=1';
  const params = [];
  if (cliente_id) { sql += ' AND cliente_id = ?'; params.push(cliente_id); }
  sql += ' ORDER BY data DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/fiados', verifyToken, (req, res) => {
  const { cliente_id, pedido_id, tipo, valor, descricao, data } = req.body;
  if (!cliente_id || !tipo || !valor || !data) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  const r = db.prepare('INSERT INTO fiados (cliente_id, pedido_id, tipo, valor, descricao, data) VALUES (?, ?, ?, ?, ?, ?)').run(cliente_id, pedido_id || null, tipo, valor, descricao || null, data);
  // Atualizar saldo do cliente
  if (tipo === 'debito') {
    db.prepare('UPDATE clientes SET saldo_fiado = saldo_fiado + ? WHERE id = ?').run(valor, cliente_id);
  } else {
    db.prepare('UPDATE clientes SET saldo_fiado = MAX(0, saldo_fiado - ?) WHERE id = ?').run(valor, cliente_id);
  }
  res.json({ id: r.lastInsertRowid, tipo, valor });
});

app.delete('/api/fiados/:id', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const f = db.prepare('SELECT * FROM fiados WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Lançamento não encontrado' });
  // Reverter saldo
  if (f.tipo === 'debito') {
    db.prepare('UPDATE clientes SET saldo_fiado = MAX(0, saldo_fiado - ?) WHERE id = ?').run(f.valor, f.cliente_id);
  } else {
    db.prepare('UPDATE clientes SET saldo_fiado = saldo_fiado + ? WHERE id = ?').run(f.valor, f.cliente_id);
  }
  db.prepare('DELETE FROM fiados WHERE id = ?').run(f.id);
  res.json({ success: true });
});

// ==================== DASHBOARD ====================
app.get('/api/dashboard', verifyToken, (req, res) => {
  const hoje = new Date().toISOString().slice(0, 10);
  const pedidosHoje = db.prepare("SELECT COUNT(*) as total, COALESCE(SUM(valor_com_desconto),0) as faturamento FROM pedidos WHERE DATE(created_at) = ?").get(hoje);
  const pedidosAberto = db.prepare("SELECT COUNT(*) as total FROM pedidos WHERE status NOT IN ('Pago','Enviado','Cancelado')").get();
  const estoqueBaixo = db.prepare("SELECT COUNT(*) as total FROM produtos WHERE quantidade <= quantidade_minima AND ativo = 1").get();
  const statusCounts = db.prepare("SELECT status, COUNT(*) as total FROM pedidos GROUP BY status").all();
  const ultimosPedidos = db.prepare("SELECT id, numero, cliente_nome, status, valor_com_desconto, tipo_pagamento, created_at FROM pedidos ORDER BY created_at DESC LIMIT 10").all();
  const alertasEstoque = db.prepare("SELECT * FROM produtos WHERE quantidade <= quantidade_minima AND ativo = 1 ORDER BY quantidade ASC LIMIT 10").all();
  const totalFiado = db.prepare("SELECT COALESCE(SUM(saldo_fiado),0) as total FROM clientes WHERE saldo_fiado > 0").get();
  res.json({
    pedidosHoje: pedidosHoje.total,
    faturamentoHoje: pedidosHoje.faturamento,
    pedidosAberto: pedidosAberto.total,
    estoqueBaixo: estoqueBaixo.total,
    statusCounts,
    ultimosPedidos,
    alertasEstoque,
    totalFiado: totalFiado.total
  });
});

// ==================== FINANCEIRO ====================
app.get('/api/financeiro/resumo', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const { data_inicio, data_fim } = req.query;
  const di = data_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const df = data_fim || new Date().toISOString().slice(0, 10);
  const pedidos = db.prepare("SELECT COALESCE(SUM(valor_com_desconto),0) as faturamento, COALESCE(SUM(custo_total),0) as custo, status FROM pedidos WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY status").all(di, df);
  const despesas = db.prepare("SELECT COALESCE(SUM(valor),0) as total, categoria FROM despesas WHERE data BETWEEN ? AND ? GROUP BY categoria").all(di, df);
  const totalDespesas = db.prepare("SELECT COALESCE(SUM(valor),0) as total FROM despesas WHERE data BETWEEN ? AND ?").get(di, df);
  const totalFaturamento = pedidos.reduce((acc, p) => acc + (p.faturamento || 0), 0);
  const totalCusto = pedidos.reduce((acc, p) => acc + (p.custo || 0), 0);
  const fiadosAberto = db.prepare("SELECT COALESCE(SUM(saldo_fiado),0) as total FROM clientes WHERE saldo_fiado > 0").get();
  res.json({
    data_inicio: di,
    data_fim: df,
    faturamento: totalFaturamento,
    custo: totalCusto,
    despesas: totalDespesas.total,
    lucro: totalFaturamento - totalCusto - totalDespesas.total,
    pedidos_por_status: pedidos,
    despesas_por_categoria: despesas,
    fiados_aberto: fiadosAberto.total
  });
});

// ==================== PDV — VENDA RÁPIDA ====================
app.post('/api/pdv/venda', verifyToken, (req, res) => {
  const { cliente_id, cliente_nome, itens = [], desconto = 0, metodo_pagamento = 'Dinheiro', tipo_pagamento = 'Pago', data_venda, vendedora_id } = req.body;
  if (!cliente_nome) return res.status(400).json({ error: 'Nome do cliente obrigatório' });
  if (!itens.length) return res.status(400).json({ error: 'Nenhum item informado' });

  const numero = gerarNumero();
  let valor_total = 0;
  let custo_total = 0;
  for (const item of itens) {
    valor_total += (item.subtotal || item.quantidade * item.preco_unitario);
    custo_total += (item.preco_custo || 0) * item.quantidade;
  }
  const valor_com_desconto = Math.max(0, valor_total - (desconto || 0));
  const dataVenda = data_venda || new Date().toISOString().slice(0, 10);
  const vId = vendedora_id || req.usuario.id;

  const r = db.prepare(`INSERT INTO pedidos
    (numero, cliente_id, cliente_nome, tipo_pagamento, metodo_pagamento, status, desconto, valor_total, valor_com_desconto, custo_total, atendente_id, vendedora_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'Pago', ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    numero, cliente_id || null, cliente_nome,
    tipo_pagamento === 'Fiado' ? 'Fiado' : 'À Vista',
    metodo_pagamento,
    desconto, valor_total, valor_com_desconto, custo_total,
    req.usuario.id, vId,
    dataVenda + 'T' + new Date().toTimeString().slice(0, 8),
    new Date().toISOString()
  );
  const pedidoId = r.lastInsertRowid;

  const stmtItem = db.prepare('INSERT INTO pedido_itens (pedido_id, produto_id, produto_nome, quantidade, preco_unitario, preco_custo, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const stmtEst = db.prepare('UPDATE produtos SET quantidade = MAX(0, quantidade - ?) WHERE id = ?');
  const stmtMov = db.prepare('INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, motivo, pedido_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of itens) {
    const sub = item.subtotal || (item.quantidade * item.preco_unitario);
    stmtItem.run(pedidoId, item.produto_id || null, item.produto_nome, item.quantidade, item.preco_unitario, item.preco_custo || 0, sub);
    if (item.produto_id) {
      stmtEst.run(item.quantidade, item.produto_id);
      stmtMov.run(item.produto_id, 'saida', item.quantidade, `PDV ${numero}`, pedidoId, req.usuario.id);
    }
  }

  // Se fiado, lançar no fiado do cliente
  if (tipo_pagamento === 'Fiado' && cliente_id) {
    db.prepare('INSERT INTO fiados (cliente_id, pedido_id, tipo, valor, descricao, data) VALUES (?, ?, ?, ?, ?, ?)').run(
      cliente_id, pedidoId, 'debito', valor_com_desconto, `PDV ${numero}`, dataVenda
    );
    db.prepare('UPDATE clientes SET saldo_fiado = saldo_fiado + ? WHERE id = ?').run(valor_com_desconto, cliente_id);
  }

  res.json({ id: pedidoId, numero, valor_com_desconto });
});

// ==================== COMISSÕES ====================
app.get('/api/comissoes/config', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.nome, u.username, COALESCE(c.percentual, 5.0) as percentual
    FROM usuarios u
    LEFT JOIN comissoes_config c ON c.usuario_id = u.id
    WHERE u.perfil = 'atendente' AND u.ativo = 1
    ORDER BY u.nome
  `).all();
  res.json(rows);
});

app.put('/api/comissoes/config/:usuario_id', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const { percentual } = req.body;
  const uid = req.params.usuario_id;
  if (percentual === undefined) return res.status(400).json({ error: 'percentual obrigatório' });
  db.prepare(`INSERT INTO comissoes_config (usuario_id, percentual) VALUES (?, ?)
    ON CONFLICT(usuario_id) DO UPDATE SET percentual = excluded.percentual`).run(uid, percentual);
  res.json({ success: true });
});

app.get('/api/comissoes/relatorio', verifyToken, requirePerfil('admin', 'gerente'), (req, res) => {
  const { data_inicio, data_fim, vendedora_id } = req.query;
  const hoje = new Date().toISOString().slice(0, 10);
  const di = data_inicio || hoje.slice(0, 8) + '01';
  const df = data_fim || hoje;

  let sql = `SELECT p.*, u.nome as vendedora_nome, COALESCE(c.percentual, 5.0) as percentual
    FROM pedidos p
    LEFT JOIN usuarios u ON p.vendedora_id = u.id
    LEFT JOIN comissoes_config c ON c.usuario_id = p.vendedora_id
    WHERE DATE(p.created_at) BETWEEN ? AND ?
    AND p.status != 'Cancelado'`;
  const params = [di, df];
  if (vendedora_id) { sql += ' AND p.vendedora_id = ?'; params.push(vendedora_id); }
  sql += ' ORDER BY u.nome, p.created_at DESC';

  const pedidos = db.prepare(sql).all(...params);

  // Agrupar por vendedora
  const map = {};
  for (const p of pedidos) {
    const vid = p.vendedora_id || 0;
    if (!map[vid]) {
      map[vid] = {
        vendedora_id: vid,
        vendedora_nome: p.vendedora_nome || 'Sem vendedora',
        percentual: p.percentual || 5.0,
        total_vendido: 0,
        comissao: 0,
        pedidos: []
      };
    }
    map[vid].total_vendido += p.valor_com_desconto || 0;
    map[vid].pedidos.push(p);
  }
  for (const k of Object.keys(map)) {
    map[k].comissao = map[k].total_vendido * map[k].percentual / 100;
  }

  res.json({ data_inicio: di, data_fim: df, vendedoras: Object.values(map) });
});

// ==================== DASHBOARD VENDEDORA ====================
app.get('/api/dashboard/vendedora', verifyToken, (req, res) => {
  const uid = req.usuario.id;
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = hoje.slice(0, 8) + '01';

  const pedidosHoje = db.prepare(`
    SELECT COUNT(*) as total, COALESCE(SUM(valor_com_desconto), 0) as faturamento
    FROM pedidos
    WHERE (vendedora_id = ? OR atendente_id = ?) AND DATE(created_at) = ? AND status != 'Cancelado'
  `).get(uid, uid, hoje);

  const pedidosMes = db.prepare(`
    SELECT COALESCE(SUM(valor_com_desconto), 0) as faturamento
    FROM pedidos
    WHERE (vendedora_id = ? OR atendente_id = ?) AND DATE(created_at) >= ? AND status != 'Cancelado'
  `).get(uid, uid, inicioMes);

  const config = db.prepare('SELECT percentual FROM comissoes_config WHERE usuario_id = ?').get(uid);
  const percentual = config ? config.percentual : 5.0;
  const comissaoMes = (pedidosMes.faturamento || 0) * percentual / 100;

  const ultimosPedidos = db.prepare(`
    SELECT p.*, u.nome as vendedora_nome FROM pedidos p
    LEFT JOIN usuarios u ON p.vendedora_id = u.id
    WHERE (p.vendedora_id = ? OR p.atendente_id = ?)
    ORDER BY p.created_at DESC LIMIT 5
  `).all(uid, uid);

  res.json({
    pedidos_hoje: pedidosHoje.total,
    faturamento_hoje: pedidosHoje.faturamento,
    faturamento_mes: pedidosMes.faturamento,
    percentual_comissao: percentual,
    comissao_mes: comissaoMes,
    ultimos_pedidos: ultimosPedidos
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧵 Fernandes Têxtil rodando na porta ${PORT}`);
});
