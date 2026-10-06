// ==================== FERNANDES TÊXTIL — CONTROLE DA OPERAÇÃO ====================
// Um fornecedor → Fernandes Têxtil → um cliente.
// Acesso: admin em "/" (login) e cliente pelo link "/p/<token>" (sem senha).

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

// --- CONFIGURAÇÃO (variáveis de ambiente) ---
// PORT        porta HTTP (a hospedagem define sozinha)
// DATA_DIR    pasta onde ficam o banco e os comprovantes (use um disco persistente).
//             Em produção, sem DATA_DIR, usa ~/fernandes-textil-dados (fora da pasta do app,
//             para não ser apagada ao publicar nova versão)
// JWT_SECRET  chave de assinatura do login (se vazia, é gerada e salva em DATA_DIR)
// ADMIN_SENHA senha inicial do usuário "admin" (usada só na criação do banco)
const PORT = Number(process.env.PORT) || 3000;
const PRODUCAO = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(process.env.DATA_DIR || (PRODUCAO ? path.join(os.homedir(), 'fernandes-textil-dados') : __dirname));
fs.mkdirSync(DATA_DIR, { recursive: true });

function carregarSegredo() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!PRODUCAO) return 'fernandes_textil_secret_2024';
  const arq = path.join(DATA_DIR, '.jwt_secret');
  if (!fs.existsSync(arq)) fs.writeFileSync(arq, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(arq, 'utf8').trim();
}
const JWT_SECRET = carregarSegredo();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// Health check para a hospedagem
app.get('/saude', (req, res) => res.json({ ok: true }));

// --- BANCO ---
const db = new Database(path.join(DATA_DIR, 'database.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
`);
try { db.exec('ALTER TABLE usuarios ADD COLUMN trocar_senha INTEGER DEFAULT 0'); } catch (e) { /* já existe */ }

// --- USUÁRIO ADMIN ---
// Único usuário do sistema. Senha de fábrica "admin123" (ou ADMIN_SENHA), com troca
// obrigatória no primeiro acesso. Outros usuários de versões antigas são desativados.
const SENHA_FABRICA = 'admin123';
function prepararAdmin() {
  const admin = db.prepare("SELECT * FROM usuarios WHERE username = 'admin'").get();
  if (!admin) {
    const senha = process.env.ADMIN_SENHA || SENHA_FABRICA;
    db.prepare('INSERT INTO usuarios (nome, username, senha_hash, perfil, ativo, trocar_senha) VALUES (?, ?, ?, ?, 1, ?)')
      .run('Administrador', 'admin', bcrypt.hashSync(senha, 10), 'admin', senha === SENHA_FABRICA ? 1 : 0);
  }
  db.prepare("UPDATE usuarios SET ativo = 0 WHERE username != 'admin'").run();
  db.prepare("UPDATE usuarios SET perfil = 'admin' WHERE username = 'admin'").run();

  // Liberação única: em bancos criados antes da senha de fábrica, o admin volta
  // para "admin123" (com troca obrigatória) uma única vez.
  const marca = path.join(DATA_DIR, '.senha-fabrica-aplicada');
  if (!fs.existsSync(marca)) {
    if (admin) {
      db.prepare("UPDATE usuarios SET senha_hash = ?, ativo = 1, trocar_senha = 1 WHERE username = 'admin'")
        .run(bcrypt.hashSync(SENHA_FABRICA, 10));
      console.log('🔑 Acesso do admin redefinido para a senha de fábrica (admin / admin123). Troque no primeiro acesso.');
    }
    fs.writeFileSync(marca, new Date().toISOString());
  }
}
prepararAdmin();

// --- SESSÃO ---
// O token vai no cabeçalho Authorization nas chamadas da API. Um cookie HttpOnly com o
// mesmo token permite abrir comprovantes (<img>, links) e o tempo real (EventSource),
// que não enviam cabeçalhos. O cookie só é aceito em requisições GET.
const COOKIE = 'ft_sessao';
const DURACAO = 30 * 24 * 3600;
function gravarCookie(res, token) {
  res.append('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=${DURACAO}; HttpOnly; SameSite=Lax${PRODUCAO ? '; Secure' : ''}`);
}
function lerCookie(req) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? m[1] : null;
}
function emitirToken(user, trocar = false) {
  return jwt.sign({ id: user.id, nome: user.nome, perfil: user.perfil, username: user.username, ...(trocar ? { trocar_senha: true } : {}) },
    JWT_SECRET, { expiresIn: trocar ? '1h' : '30d' });
}
const dadosUsuario = u => ({ id: u.id, nome: u.nome, perfil: u.perfil, username: u.username });

function autenticar({ aceitarCookie = false, permitirTroca = false } = {}) {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    let token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token && aceitarCookie && req.method === 'GET') token = lerCookie(req);
    if (!token) return res.status(401).json({ error: 'Faça login novamente' });
    try {
      req.usuario = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente' });
    }
    if (req.usuario.trocar_senha && !permitirTroca) {
      return res.status(403).json({ error: 'Troque a senha de fábrica para continuar', trocar_senha: true });
    }
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    next();
  };
}
const exigirAdmin = autenticar();
const exigirAdminGet = autenticar({ aceitarCookie: true });

// --- ROTAS DE LOGIN ---
app.post('/api/auth/login', (req, res) => {
  const { username, senha } = req.body || {};
  const user = db.prepare('SELECT * FROM usuarios WHERE username = ? AND ativo = 1').get(String(username || '').trim());
  if (!user || !bcrypt.compareSync(String(senha || ''), user.senha_hash)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }
  const trocar = !!user.trocar_senha;
  const token = emitirToken(user, trocar);
  if (!trocar) gravarCookie(res, token);
  res.json({ token, usuario: { ...dadosUsuario(user), trocar_senha: trocar } });
});

// Troca de senha: obrigatória no 1º acesso (sem senha atual) ou pelo menu Ajustes (com senha atual)
app.post('/api/auth/trocar-senha', autenticar({ permitirTroca: true }), (req, res) => {
  const nova = String(req.body.nova_senha || '');
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ? AND ativo = 1').get(req.usuario.id);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
  if (!req.usuario.trocar_senha && !bcrypt.compareSync(String(req.body.senha_atual || ''), user.senha_hash)) {
    return res.status(400).json({ error: 'A senha atual está incorreta' });
  }
  if (nova.length < 8) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 8 caracteres' });
  if (nova === SENHA_FABRICA) return res.status(400).json({ error: 'Escolha uma senha diferente da senha de fábrica' });
  db.prepare('UPDATE usuarios SET senha_hash = ?, trocar_senha = 0 WHERE id = ?').run(bcrypt.hashSync(nova, 10), user.id);
  const token = emitirToken(user);
  gravarCookie(res, token);
  res.json({ token, usuario: dadosUsuario(user) });
});

// Confirma a sessão e renova o cookie (usado ao abrir o sistema)
app.get('/api/auth/me', exigirAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ? AND ativo = 1').get(req.usuario.id);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
  gravarCookie(res, req.headers.authorization.slice(7));
  res.json(dadosUsuario(user));
});

app.post('/api/auth/sair', (req, res) => {
  res.append('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${PRODUCAO ? '; Secure' : ''}`);
  res.json({ success: true });
});

// --- OPERAÇÃO (pedidos, estoque, financeiro, link do cliente) ---
app.use(require('./operacao')({ db, exigirAdmin, exigirAdminGet, baseDir: __dirname, dataDir: DATA_DIR }));

// --- PÁGINAS ---
app.get('/portal', (req, res) => res.redirect('/'));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Start server
const servidor = app.listen(PORT, () => {
  console.log(`🧵 Fernandes Têxtil rodando na porta ${PORT} (dados em ${DATA_DIR})`);
});

// Encerramento limpo ao reiniciar/publicar nova versão (garante o banco gravado)
for (const sinal of ['SIGTERM', 'SIGINT']) {
  process.on(sinal, () => {
    servidor.close();
    try { db.close(); } catch (e) { /* já fechado */ }
    process.exit(0);
  });
}
