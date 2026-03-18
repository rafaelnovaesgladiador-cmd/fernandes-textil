// ==================== GLOBALS ====================
let TOKEN = localStorage.getItem('ft_token');
let USUARIO = JSON.parse(localStorage.getItem('ft_usuario') || 'null');
let TELA_ATUAL = null;

// Verificar autenticação
if (!TOKEN || !USUARIO) {
  window.location.href = 'login.html';
}

// ==================== API ====================
async function api(method, path, body, isForm) {
  const opts = {
    method,
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  };
  if (body && !isForm) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (isForm) {
    opts.body = body;
  }
  const resp = await fetch('/api' + path, opts);
  if (resp.status === 401) { logout(); return; }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

function logout() {
  localStorage.removeItem('ft_token');
  localStorage.removeItem('ft_usuario');
  window.location.href = 'login.html';
}

// ==================== TOAST ====================
function toast(msg, type = 'success') {
  const tc = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  tc.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ==================== INIT ====================
const NAV_PERFIL = {
  admin: ['dashboard','pedidos','clientes','produtos','estoque','reposicao','financeiro','despesas','usuarios','comissoes'],
  gerente: ['dashboard','pedidos','clientes','produtos','estoque','reposicao','financeiro','despesas','comissoes'],
  atendente: ['pdv','meus-pedidos','clientes','produtos'],
  entregador: ['entregas','reposicao']
};

const NAV_LABELS = {
  dashboard: '📊 Dashboard',
  pedidos: '📦 Pedidos',
  clientes: '👥 Clientes',
  produtos: '🛍️ Produtos',
  estoque: '📦 Estoque',
  reposicao: '🔄 Reposição',
  financeiro: '💰 Financeiro',
  despesas: '💸 Despesas',
  usuarios: '👤 Usuários',
  entregas: '🚚 Entregas',
  'pdv': '🛒 Nova Venda',
  'meus-pedidos': '📋 Minhas Vendas',
  'comissoes': '💰 Comissões'
};

function buildNav() {
  const nav = document.getElementById('mainNav');
  const items = NAV_PERFIL[USUARIO.perfil] || [];
  nav.innerHTML = items.map(k => `<div class="nav-item" data-tela="${k}" onclick="navTo('${k}')">${NAV_LABELS[k]}</div>`).join('');
  const first = items[0];
  if (first) navTo(first);
}

function navTo(tela) {
  TELA_ATUAL = tela;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tela === tela));
  const c = document.getElementById('mainContent');
  c.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>';
  const fns = {
    dashboard: renderDashboard,
    pedidos: renderPedidos,
    clientes: renderClientes,
    produtos: renderProdutos,
    estoque: renderEstoque,
    reposicao: renderReposicao,
    financeiro: renderFinanceiro,
    despesas: renderDespesas,
    usuarios: renderUsuarios,
    entregas: renderEntregas,
    'pdv': renderPDV,
    'meus-pedidos': renderMeusPedidos,
    'comissoes': renderComissoes
  };
  if (fns[tela]) fns[tela]();
}

// ==================== HELPERS ====================
function fmtMoney(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
function fmtDate(s) { if (!s) return '-'; const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('pt-BR'); }
function fmtDateTime(s) { if (!s) return '-'; return new Date(s).toLocaleString('pt-BR'); }
function badgeStatus(s) {
  const map = { Pendente:'pendente', Separando:'separando', Separado:'separado', Pago:'pago', Pronto:'pronto', Enviado:'enviado', Cancelado:'cancelado' };
  return `<span class="badge badge-${map[s]||'pendente'}">${s}</span>`;
}

function showModal(html) {
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.id = 'modalBackdrop';
  bd.innerHTML = `<div class="modal">${html}</div>`;
  bd.addEventListener('click', e => { if (e.target === bd) closeModal(); });
  document.body.appendChild(bd);
}
function closeModal() {
  const m = document.getElementById('modalBackdrop');
  if (m) m.remove();
}

function confirmDialog(msg, onOk) {
  showModal(`
    <div class="modal-header"><h3>⚠️ Confirmar</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body"><p>${msg}</p></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" onclick="closeModal();(${onOk.toString()})()">Confirmar</button>
    </div>
  `);
}

// ==================== DASHBOARD ====================
async function renderDashboard() {
  try {
    const data = await api('GET', '/dashboard');
    const c = document.getElementById('mainContent');
    const statusOrder = ['Pendente','Separando','Separado','Pago','Pronto','Enviado'];
    const statusMap = {};
    (data.statusCounts || []).forEach(s => statusMap[s.status] = s.total);

    c.innerHTML = `
      <div class="page-header"><div><div class="page-title">📊 Dashboard</div><div class="page-sub">Visão geral da operação</div></div></div>

      <div class="stat-grid">
        <div class="stat-card green"><div class="stat-label">Pedidos Hoje</div><div class="stat-value">${data.pedidosHoje}</div></div>
        <div class="stat-card blue"><div class="stat-label">Faturamento Hoje</div><div class="stat-value-sm">${fmtMoney(data.faturamentoHoje)}</div></div>
        <div class="stat-card gold"><div class="stat-label">Em Aberto</div><div class="stat-value">${data.pedidosAberto}</div></div>
        <div class="stat-card ${data.estoqueBaixo>0?'red':'green'}"><div class="stat-label">Estoque Baixo</div><div class="stat-value">${data.estoqueBaixo}</div></div>
      </div>

      <div class="card">
        <div class="card-title">📋 Status dos Pedidos</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px">
          ${statusOrder.map(s=>`<div style="text-align:center;padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
            <div style="font-size:18px;font-weight:800;color:#e8eaf0">${statusMap[s]||0}</div>
            <div>${badgeStatus(s)}</div>
          </div>`).join('')}
        </div>
      </div>

      ${data.totalFiado>0?`<div class="card">
        <div class="card-title">💳 Fiados em Aberto</div>
        <div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
          <span style="color:#8a9bb0">Total a receber</span>
          <span style="font-size:20px;font-weight:800;color:#e74c3c">${fmtMoney(data.totalFiado)}</span>
        </div>
      </div>`:''}

      ${data.alertasEstoque.length?`<div class="card">
        <div class="card-title">⚠️ Estoque Baixo</div>
        ${data.alertasEstoque.map(p=>`<div class="list-row">
          <span class="list-row-label">${p.nome} <span class="tag">${p.categoria}</span></span>
          <span class="badge badge-danger">${p.quantidade} ${p.unidade}</span>
        </div>`).join('')}
      </div>`:''}

      <div class="card">
        <div class="card-title">🕐 Últimos Pedidos</div>
        ${data.ultimosPedidos.map(p=>`
          <div class="item-card" style="margin:8px;border-radius:10px" onclick="navTo('pedidos')">
            <div class="item-card-header"><span class="item-card-id">${p.numero}</span>${badgeStatus(p.status)}</div>
            <div class="item-card-title">${p.cliente_nome}</div>
            <div class="item-card-footer"><span class="item-card-value">${fmtMoney(p.valor_com_desconto||p.valor_total)}</span><span style="font-size:12px;color:#8a9bb0">${fmtDateTime(p.created_at)}</span></div>
          </div>`).join('') || '<div class="empty-state"><p>Nenhum pedido ainda</p></div>'}
      </div>`;
  } catch(e) {
    document.getElementById('mainContent').innerHTML = `<div class="error-state">Erro ao carregar: ${e.message}</div>`;
  }
}

// ==================== PEDIDOS ====================
let pedidosFiltroStatus = 'Todos';
let pedidosBusca = '';

async function renderPedidos() {
  const c = document.getElementById('mainContent');
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>📦 Pedidos</h2>
      <div class="filters">
        <div class="search-bar"><span class="icon">🔍</span><input type="text" placeholder="Buscar pedido..." id="pedidoBusca" oninput="pedidosBusca=this.value;loadPedidos()" value="${pedidosBusca}"></div>
      </div>
    </div>
    <div class="chips">
      ${['Todos','Pendente','Separando','Separado','Pago','Pronto','Enviado'].map(s =>
        `<button class="chip c-${s.toLowerCase()} ${pedidosFiltroStatus===s?'active':''}" onclick="pedidosFiltroStatus='${s}';renderPedidos()">${s}</button>`
      ).join('')}
    </div>
    <div id="pedidosList"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>
  <button class="fab" onclick="abrirNovoPedido()">+</button>`;
  loadPedidos();
}

async function loadPedidos() {
  try {
    const params = new URLSearchParams();
    if (pedidosFiltroStatus !== 'Todos') params.set('status', pedidosFiltroStatus);
    if (pedidosBusca) params.set('busca', pedidosBusca);
    const pedidos = await api('GET', `/pedidos?${params}`);
    const el = document.getElementById('pedidosList');
    if (!el) return;
    if (!pedidos.length) { el.innerHTML = '<div class="empty-state"><span class="emoji">📭</span><p>Nenhum pedido encontrado</p></div>'; return; }
    el.innerHTML = pedidos.map(p => `<div class="pedido-card" onclick="abrirDetalhePedido(${p.id})">
      <div class="pedido-info">
        <div class="num">${p.numero}</div>
        <div class="cliente">${p.cliente_nome}</div>
        <div class="meta">${p.local_entrega||''} ${p.cidade_entrega ? '· '+p.cidade_entrega : ''} ${p.data_entrega ? '· '+fmtDate(p.data_entrega) : ''}</div>
        ${p.vendedora_nome ? `<div style="font-size:0.75rem;color:#8a9bb0;margin-top:2px;">👩‍💼 ${p.vendedora_nome}</div>` : ''}
      </div>
      <div class="pedido-right">
        <div class="valor">${fmtMoney(p.valor_com_desconto)}</div>
        ${badgeStatus(p.status)}
        <div style="font-size:0.75rem;color:#8a9bb0;margin-top:4px;">${p.tipo_pagamento}</div>
      </div>
    </div>`).join('');
  } catch(e) { toast(e.message, 'error'); }
}

// Modal Novo/Editar Pedido
let pedidoItens = [];
let pedidoEditId = null;

async function abrirNovoPedido(pedidoData) {
  pedidoItens = pedidoData ? (pedidoData.itens || []).map(i => ({...i})) : [];
  pedidoEditId = pedidoData ? pedidoData.id : null;

  showModal(`
    <div class="modal-header">
      <h3>${pedidoEditId ? '✏️ Editar Pedido' : '➕ Novo Pedido'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <label class="form-label">Cliente *</label>
        <div class="autocomplete-wrapper">
          <input class="form-control" id="pCliente" placeholder="Buscar cliente..." autocomplete="off"
            oninput="autocompleteCliente(this.value)"
            value="${pedidoData ? pedidoData.cliente_nome : ''}">
          <div class="autocomplete-list" id="clienteAC" style="display:none"></div>
        </div>
        <input type="hidden" id="pClienteId" value="${pedidoData ? pedidoData.cliente_id||'' : ''}">
        <input type="hidden" id="pClienteTel" value="${pedidoData ? pedidoData.cliente_telefone||'' : ''}">
        <a href="#" style="font-size:0.8rem;color:#40c074;margin-top:4px;display:inline-block;" onclick="showNovoClienteInline();return false;">+ Novo cliente</a>
      </div>
      <div id="novoClienteInline" style="display:none;background:#0f1923;border-radius:10px;padding:14px;margin-bottom:12px;">
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Nome *</label><input class="form-control" id="ncNome"></div>
          <div class="form-row"><label class="form-label">Telefone</label><input class="form-control" id="ncTel"></div>
          <div class="form-row"><label class="form-label">Cidade</label><input class="form-control" id="ncCidade"></div>
          <div class="form-row"><label class="form-label">Endereço</label><input class="form-control" id="ncEnd"></div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="salvarNovoClienteInline()">💾 Salvar Cliente</button>
      </div>

      <div class="form-grid">
        <div class="form-row"><label class="form-label">Local de Entrega</label><input class="form-control" id="pLocal" value="${pedidoData ? pedidoData.local_entrega||'' : ''}"></div>
        <div class="form-row"><label class="form-label">Cidade</label><input class="form-control" id="pCidade" value="${pedidoData ? pedidoData.cidade_entrega||'' : ''}"></div>
        <div class="form-row"><label class="form-label">Data Entrega</label><input class="form-control" type="date" id="pData" value="${pedidoData ? pedidoData.data_entrega||'' : ''}"></div>
        <div class="form-row"><label class="form-label">Volumes</label><input class="form-control" type="number" id="pVolumes" value="${pedidoData ? pedidoData.num_volumes||0 : 0}" min="0"></div>
      </div>

      <div class="form-grid">
        <div class="form-row"><label class="form-label">Pagamento</label>
          <select class="form-control" id="pPagamento">
            ${['À Vista','A Prazo','Fiado','PIX'].map(t => `<option value="${t}" ${pedidoData&&pedidoData.tipo_pagamento===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-row"><label class="form-label">Entregador</label>
          <select class="form-control" id="pEntregador"><option value="">-- Selecionar --</option></select>
        </div>
        ${['admin','gerente'].includes(USUARIO.perfil) ? `<div class="form-row"><label class="form-label">Vendedora</label>
          <select class="form-control" id="pVendedora"><option value="">-- Selecionar --</option></select>
        </div>` : `<input type="hidden" id="pVendedora" value="${USUARIO.id}">`}
      </div>

      <div class="divider"></div>
      <h4 style="margin-bottom:12px;">📋 Itens do Pedido</h4>
      <div class="itens-pedido" id="itensPedido"></div>
      <button class="btn btn-secondary btn-add-item" onclick="adicionarItemPedido()">+ Adicionar Item</button>

      <div class="divider"></div>
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Desconto (R$)</label><input class="form-control" type="number" id="pDesconto" step="0.01" min="0" value="${pedidoData ? pedidoData.desconto||0 : 0}" oninput="calcTotalPedido()"></div>
        <div class="total-pedido"><strong id="totalPedidoLabel">${fmtMoney(pedidoData ? pedidoData.valor_com_desconto : 0)}</strong><br><small style="color:#8a9bb0">Total com desconto</small></div>
      </div>

      <div class="form-row"><label class="form-label">Observações</label>
        <textarea class="form-control" id="pObs">${pedidoData ? pedidoData.observacoes||'' : ''}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarPedido()">💾 Salvar</button>
    </div>
  `);

  // Carregar entregadores e atendentes
  try {
    const users = await api('GET', '/usuarios');
    const sel = document.getElementById('pEntregador');
    if (sel) users.filter(u => u.perfil === 'entregador').forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id; opt.textContent = u.nome;
      if (pedidoData && pedidoData.entregador_id == u.id) opt.selected = true;
      sel.appendChild(opt);
    });
    // Vendedora select para admin/gerente
    const selV = document.getElementById('pVendedora');
    if (selV && selV.tagName === 'SELECT') {
      users.filter(u => u.perfil === 'atendente').forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id; opt.textContent = u.nome;
        if (pedidoData && pedidoData.vendedora_id == u.id) opt.selected = true;
        selV.appendChild(opt);
      });
    }
  } catch(e) {}

  renderItensPedido();
  calcTotalPedido();
}

function renderItensPedido() {
  const el = document.getElementById('itensPedido');
  if (!el) return;
  el.innerHTML = pedidoItens.map((item, i) => `
    <div class="item-pedido-row" id="item-row-${i}">
      <div class="ip-nome autocomplete-wrapper">
        <input class="form-control" placeholder="Produto..." autocomplete="off"
          oninput="autocompleteProduto(this.value,${i})"
          value="${item.produto_nome||''}"
          id="ip-nome-${i}">
        <div class="autocomplete-list" id="prodAC-${i}" style="display:none"></div>
      </div>
      <input class="form-control ip-qtd" type="number" step="0.1" min="0.1" value="${item.quantidade||1}"
        oninput="updateItemPedido(${i},'quantidade',this.value)" id="ip-qtd-${i}">
      <input class="form-control ip-preco" type="number" step="0.01" min="0" value="${item.preco_unitario||0}"
        oninput="updateItemPedido(${i},'preco_unitario',this.value)" id="ip-preco-${i}">
      <div class="ip-sub" id="ip-sub-${i}">${fmtMoney((item.quantidade||1)*(item.preco_unitario||0))}</div>
      <button class="btn btn-danger btn-icon btn-sm ip-del" onclick="removerItemPedido(${i})">🗑️</button>
    </div>
  `).join('');
}

function adicionarItemPedido() {
  pedidoItens.push({ produto_nome: '', quantidade: 1, preco_unitario: 0, preco_custo: 0, subtotal: 0 });
  renderItensPedido();
}

function removerItemPedido(i) {
  pedidoItens.splice(i, 1);
  renderItensPedido();
  calcTotalPedido();
}

function updateItemPedido(i, campo, val) {
  pedidoItens[i][campo] = parseFloat(val) || 0;
  pedidoItens[i].subtotal = (pedidoItens[i].quantidade || 1) * (pedidoItens[i].preco_unitario || 0);
  const sub = document.getElementById(`ip-sub-${i}`);
  if (sub) sub.textContent = fmtMoney(pedidoItens[i].subtotal);
  calcTotalPedido();
}

function calcTotalPedido() {
  const total = pedidoItens.reduce((s, i) => s + (i.subtotal || (i.quantidade * i.preco_unitario)), 0);
  const desc = parseFloat(document.getElementById('pDesconto')?.value) || 0;
  const el = document.getElementById('totalPedidoLabel');
  if (el) el.textContent = fmtMoney(Math.max(0, total - desc));
}

let acCliTimer = null;
async function autocompleteCliente(val) {
  clearTimeout(acCliTimer);
  const list = document.getElementById('clienteAC');
  if (!val || val.length < 2) { if(list) list.style.display = 'none'; return; }
  acCliTimer = setTimeout(async () => {
    try {
      const clientes = await api('GET', `/clientes?busca=${encodeURIComponent(val)}`);
      if (!list) return;
      if (!clientes.length) { list.style.display = 'none'; return; }
      list.innerHTML = clientes.slice(0, 8).map(c =>
        `<div class="autocomplete-item" onclick="selecionarCliente(${c.id},'${c.nome.replace(/'/g,"\\'")}','${(c.telefone||'').replace(/'/g,"\\'")}')">
          ${c.nome} ${c.telefone ? '· '+c.telefone : ''}
        </div>`
      ).join('');
      list.style.display = 'block';
    } catch(e) {}
  }, 300);
}

function selecionarCliente(id, nome, tel) {
  document.getElementById('pCliente').value = nome;
  document.getElementById('pClienteId').value = id;
  document.getElementById('pClienteTel').value = tel;
  const list = document.getElementById('clienteAC');
  if (list) list.style.display = 'none';
}

function showNovoClienteInline() {
  const el = document.getElementById('novoClienteInline');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function salvarNovoClienteInline() {
  const nome = document.getElementById('ncNome')?.value?.trim();
  if (!nome) { toast('Nome obrigatório', 'error'); return; }
  try {
    const c = await api('POST', '/clientes', {
      nome,
      telefone: document.getElementById('ncTel')?.value || '',
      cidade: document.getElementById('ncCidade')?.value || '',
      endereco: document.getElementById('ncEnd')?.value || ''
    });
    selecionarCliente(c.id, c.nome, c.telefone || '');
    document.getElementById('novoClienteInline').style.display = 'none';
    toast('Cliente criado!');
  } catch(e) { toast(e.message, 'error'); }
}

let acProdTimers = {};
async function autocompleteProduto(val, idx) {
  clearTimeout(acProdTimers[idx]);
  const list = document.getElementById(`prodAC-${idx}`);
  if (!val || val.length < 1) { if(list) list.style.display = 'none'; return; }
  acProdTimers[idx] = setTimeout(async () => {
    try {
      const prods = await api('GET', `/produtos?busca=${encodeURIComponent(val)}&ativos=1`);
      if (!list) return;
      if (!prods.length) { list.style.display = 'none'; return; }
      list.innerHTML = prods.slice(0, 8).map(p =>
        `<div class="autocomplete-item" onclick="selecionarProduto(${idx},${p.id},'${p.nome.replace(/'/g,"\\'")}',${p.preco_venda},${p.preco_custo})">
          ${p.nome} — ${fmtMoney(p.preco_venda)} (estq: ${p.quantidade})
        </div>`
      ).join('');
      list.style.display = 'block';
    } catch(e) {}
  }, 250);
}

function selecionarProduto(idx, id, nome, preco, custo) {
  pedidoItens[idx].produto_id = id;
  pedidoItens[idx].produto_nome = nome;
  pedidoItens[idx].preco_unitario = preco;
  pedidoItens[idx].preco_custo = custo;
  pedidoItens[idx].subtotal = pedidoItens[idx].quantidade * preco;
  const nEl = document.getElementById(`ip-nome-${idx}`);
  const pEl = document.getElementById(`ip-preco-${idx}`);
  const sEl = document.getElementById(`ip-sub-${idx}`);
  const lEl = document.getElementById(`prodAC-${idx}`);
  if (nEl) nEl.value = nome;
  if (pEl) pEl.value = preco;
  if (sEl) sEl.textContent = fmtMoney(pedidoItens[idx].subtotal);
  if (lEl) lEl.style.display = 'none';
  calcTotalPedido();
}

async function salvarPedido() {
  const clienteNome = document.getElementById('pCliente')?.value?.trim();
  if (!clienteNome) { toast('Cliente obrigatório', 'error'); return; }

  // Sync itens from inputs
  pedidoItens.forEach((item, i) => {
    const nEl = document.getElementById(`ip-nome-${i}`);
    const qEl = document.getElementById(`ip-qtd-${i}`);
    const pEl = document.getElementById(`ip-preco-${i}`);
    if (nEl) item.produto_nome = nEl.value;
    if (qEl) item.quantidade = parseFloat(qEl.value) || 1;
    if (pEl) item.preco_unitario = parseFloat(pEl.value) || 0;
    item.subtotal = item.quantidade * item.preco_unitario;
  });

  const body = {
    cliente_id: document.getElementById('pClienteId')?.value || null,
    cliente_nome: clienteNome,
    cliente_telefone: document.getElementById('pClienteTel')?.value || '',
    local_entrega: document.getElementById('pLocal')?.value || '',
    cidade_entrega: document.getElementById('pCidade')?.value || '',
    data_entrega: document.getElementById('pData')?.value || null,
    tipo_pagamento: document.getElementById('pPagamento')?.value || 'A Prazo',
    num_volumes: parseInt(document.getElementById('pVolumes')?.value) || 0,
    observacoes: document.getElementById('pObs')?.value || '',
    desconto: parseFloat(document.getElementById('pDesconto')?.value) || 0,
    entregador_id: document.getElementById('pEntregador')?.value || null,
    vendedora_id: document.getElementById('pVendedora')?.value || null,
    itens: pedidoItens.filter(i => i.produto_nome)
  };

  try {
    if (pedidoEditId) {
      await api('PUT', `/pedidos/${pedidoEditId}`, body);
      toast('Pedido atualizado!');
    } else {
      const r = await api('POST', '/pedidos', body);
      toast(`Pedido ${r.numero} criado!`);
    }
    closeModal();
    loadPedidos();
  } catch(e) { toast(e.message, 'error'); }
}

// Modal Detalhe do Pedido
const STATUS_ORDER = ['Pendente','Separando','Separado','Pago','Pronto','Enviado'];

async function abrirDetalhePedido(id) {
  try {
    const p = await api('GET', `/pedidos/${id}`);
    const podeEditar = ['admin','gerente','atendente'].includes(USUARIO.perfil);
    const podeAvancar = ['admin','gerente','atendente'].includes(USUARIO.perfil);
    const idxAtual = STATUS_ORDER.indexOf(p.status);
    const prox = STATUS_ORDER[idxAtual + 1];

    const progressHTML = STATUS_ORDER.map((s, i) => {
      const done = i < idxAtual;
      const current = i === idxAtual;
      return `${i > 0 ? `<div class="sp-line ${done ? 'done' : ''}"></div>` : ''}
        <div class="sp-step">
          <div class="sp-dot ${done ? 'done' : ''} ${current ? 'current' : ''}">${done ? '✓' : i+1}</div>
          <div class="sp-label">${s}</div>
        </div>`;
    }).join('');

    const itensHTML = (p.itens || []).map(i => `<tr>
      <td>${i.produto_nome}</td>
      <td>${i.quantidade}</td>
      <td>${fmtMoney(i.preco_unitario)}</td>
      <td>${fmtMoney(i.subtotal)}</td>
    </tr>`).join('');

    showModal(`
      <div class="modal-header">
        <h3>📦 Pedido ${p.numero}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="status-progress">${progressHTML}</div>

        <div class="detail-section">
          <h4>Informações</h4>
          <div class="detail-grid">
            <div class="detail-item"><div class="dl">Cliente</div><div class="dv">${p.cliente_nome}</div></div>
            <div class="detail-item"><div class="dl">Telefone</div><div class="dv">${p.cliente_telefone||'-'}</div></div>
            <div class="detail-item"><div class="dl">Local</div><div class="dv">${p.local_entrega||'-'}</div></div>
            <div class="detail-item"><div class="dl">Cidade</div><div class="dv">${p.cidade_entrega||'-'}</div></div>
            <div class="detail-item"><div class="dl">Data Entrega</div><div class="dv">${fmtDate(p.data_entrega)}</div></div>
            <div class="detail-item"><div class="dl">Pagamento</div><div class="dv">${p.tipo_pagamento}</div></div>
            <div class="detail-item"><div class="dl">Volumes</div><div class="dv">${p.num_volumes}</div></div>
            <div class="detail-item"><div class="dl">Entregador</div><div class="dv">${p.entregador_nome||'-'}</div></div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Itens</h4>
          <div class="table-responsive">
            <table><thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Subtotal</th></tr></thead>
            <tbody>${itensHTML}</tbody></table>
          </div>
          <div style="text-align:right;margin-top:10px;">
            <div style="color:#8a9bb0;font-size:0.85rem;">Total: ${fmtMoney(p.valor_total)}</div>
            ${p.desconto > 0 ? `<div style="color:#ff6b7a;font-size:0.85rem;">Desconto: -${fmtMoney(p.desconto)}</div>` : ''}
            <div style="color:#40c074;font-size:1.1rem;font-weight:700;">Total: ${fmtMoney(p.valor_com_desconto)}</div>
          </div>
        </div>

        ${p.observacoes ? `<div class="detail-section"><h4>Observações</h4><p style="color:#c8d0de;">${p.observacoes}</p></div>` : ''}

        ${p.foto_separado ? `<div class="detail-section"><h4>Foto Separado</h4><img src="${p.foto_separado}" style="max-width:100%;border-radius:8px;"></div>` : ''}
        ${p.comprovante_entrega ? `<div class="detail-section"><h4>Comprovante Entrega</h4><img src="${p.comprovante_entrega}" style="max-width:100%;border-radius:8px;"></div>` : ''}
        ${p.comprovante_pagamento ? `<div class="detail-section"><h4>Comprovante Pagamento</h4><img src="${p.comprovante_pagamento}" style="max-width:100%;border-radius:8px;"></div>` : ''}

        <div class="detail-section">
          <h4>Upload de Arquivos</h4>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${['foto_separado','comprovante_entrega','comprovante_pagamento'].map(t =>
              `<label class="btn btn-secondary btn-sm" style="cursor:pointer;position:relative;">
                📎 ${t.replace('_',' ')}
                <input type="file" style="position:absolute;opacity:0;width:0;height:0;" accept="image/*,application/pdf"
                  onchange="uploadPedido(${p.id},'${t}',this)">
              </label>`
            ).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${podeEditar ? `<button class="btn btn-secondary" onclick="editarPedido(${p.id})">✏️ Editar</button>` : ''}
        <a href="/pedidos/${p.id}/nota" target="_blank" class="btn btn-secondary">🖨️ Nota</a>
        ${podeAvancar && prox ? `<button class="btn btn-gold" onclick="avancarStatus(${p.id},'${prox}')">▶ ${prox}</button>` : ''}
        ${p.status === 'Pago' && p.tipo_pagamento === 'Fiado' ? `<button class="btn btn-primary" onclick="lancaFiadoPedido(${p.id},${p.cliente_id||0},'${p.cliente_nome}',${p.valor_com_desconto})">💳 Lançar Fiado</button>` : ''}
      </div>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function editarPedido(id) {
  closeModal();
  try {
    const p = await api('GET', `/pedidos/${id}`);
    pedidoItens = (p.itens || []).map(i => ({...i}));
    await abrirNovoPedido(p);
  } catch(e) { toast(e.message, 'error'); }
}

async function avancarStatus(id, status) {
  try {
    await api('PUT', `/pedidos/${id}`, { status });
    toast(`Status: ${status}`);
    closeModal();
    loadPedidos();
  } catch(e) { toast(e.message, 'error'); }
}

async function uploadPedido(id, tipo, input) {
  if (!input.files[0]) return;
  const form = new FormData();
  form.append('arquivo', input.files[0]);
  form.append('tipo', tipo);
  try {
    const opts = { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: form };
    const resp = await fetch(`/api/pedidos/${id}/upload`, opts);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error);
    toast('Arquivo enviado!');
    closeModal();
    abrirDetalhePedido(id);
  } catch(e) { toast(e.message, 'error'); }
}

async function lancaFiadoPedido(pedidoId, clienteId, clienteNome, valor) {
  if (!clienteId) { toast('Pedido sem cliente vinculado', 'error'); return; }
  try {
    await api('POST', '/fiados', {
      cliente_id: clienteId,
      pedido_id: pedidoId,
      tipo: 'debito',
      valor,
      descricao: `Pedido lançado no fiado`,
      data: new Date().toISOString().slice(0, 10)
    });
    toast(`Fiado lançado para ${clienteNome}: ${fmtMoney(valor)}`);
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== CLIENTES ====================
async function renderClientes() {
  const c = document.getElementById('mainContent');
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>👥 Clientes</h2>
      <div class="filters">
        <div class="search-bar"><span class="icon">🔍</span><input type="text" placeholder="Buscar..." id="clienteBusca" oninput="loadClientes()"></div>
        ${['admin','gerente'].includes(USUARIO.perfil) ? '<button class="btn btn-primary" onclick="abrirModalCliente()">+ Novo</button>' : ''}
      </div>
    </div>
    <div id="clientesList"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>`;
  loadClientes();
}

async function loadClientes() {
  try {
    const busca = document.getElementById('clienteBusca')?.value || '';
    const data = await api('GET', `/clientes?busca=${encodeURIComponent(busca)}`);
    const el = document.getElementById('clientesList');
    if (!el) return;
    if (!data.length) { el.innerHTML = '<div class="empty-state"><span class="emoji">👥</span><p>Nenhum cliente encontrado</p></div>'; return; }
    el.innerHTML = `<div class="items-grid">${data.map(c => `
      <div class="item-card" onclick="abrirDetalheCliente(${c.id})">
        <div class="item-title">${c.nome}</div>
        <div class="item-meta">
          ${c.telefone ? `📱 ${c.telefone}<br>` : ''}
          ${c.cidade ? `📍 ${c.cidade}<br>` : ''}
          ${c.saldo_fiado > 0 ? `<span style="color:#ff6b7a;font-weight:700;">💳 Fiado: ${fmtMoney(c.saldo_fiado)}</span>` : '<span style="color:#40c074;">✓ Sem fiado</span>'}
        </div>
      </div>`).join('')}</div>`;
  } catch(e) { toast(e.message, 'error'); }
}

function abrirModalCliente(cliente) {
  showModal(`
    <div class="modal-header">
      <h3>${cliente ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Nome *</label><input class="form-control" id="cNome" value="${cliente?.nome||''}"></div>
        <div class="form-row"><label class="form-label">Telefone</label><input class="form-control" id="cTel" value="${cliente?.telefone||''}"></div>
        <div class="form-row"><label class="form-label">Cidade</label><input class="form-control" id="cCidade" value="${cliente?.cidade||''}"></div>
        <div class="form-row"><label class="form-label">Endereço</label><input class="form-control" id="cEnd" value="${cliente?.endereco||''}"></div>
      </div>
      <div class="form-row"><label class="form-label">Observações</label><textarea class="form-control" id="cObs">${cliente?.observacoes||''}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarCliente(${cliente?.id||0})">💾 Salvar</button>
    </div>
  `);
}

async function salvarCliente(id) {
  const nome = document.getElementById('cNome')?.value?.trim();
  if (!nome) { toast('Nome obrigatório', 'error'); return; }
  const body = {
    nome, telefone: document.getElementById('cTel')?.value||'',
    cidade: document.getElementById('cCidade')?.value||'',
    endereco: document.getElementById('cEnd')?.value||'',
    observacoes: document.getElementById('cObs')?.value||''
  };
  try {
    if (id) { await api('PUT', `/clientes/${id}`, body); toast('Cliente atualizado!'); }
    else { await api('POST', '/clientes', body); toast('Cliente criado!'); }
    closeModal(); loadClientes();
  } catch(e) { toast(e.message, 'error'); }
}

async function abrirDetalheCliente(id) {
  try {
    const c = await api('GET', `/clientes/${id}`);
    const podeEditar = ['admin','gerente','atendente'].includes(USUARIO.perfil);
    showModal(`
      <div class="modal-header">
        <h3>👤 ${c.nome}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="detail-grid" style="margin-bottom:16px;">
          ${c.telefone ? `<div class="detail-item"><div class="dl">Telefone</div><div class="dv">${c.telefone}</div></div>` : ''}
          ${c.cidade ? `<div class="detail-item"><div class="dl">Cidade</div><div class="dv">${c.cidade}</div></div>` : ''}
          ${c.endereco ? `<div class="detail-item"><div class="dl">Endereço</div><div class="dv">${c.endereco}</div></div>` : ''}
        </div>

        <div style="text-align:center;padding:16px;background:#0f1923;border-radius:10px;margin-bottom:16px;">
          <div style="color:#8a9bb0;font-size:0.82rem;margin-bottom:4px;">SALDO FIADO</div>
          <div class="saldo-fiado ${c.saldo_fiado==0?'zero':''}">${fmtMoney(c.saldo_fiado)}</div>
        </div>

        ${c.pedidos && c.pedidos.length ? `
        <div class="detail-section">
          <h4>Pedidos Recentes</h4>
          ${c.pedidos.slice(0,5).map(p => `<div class="pedido-card" onclick="closeModal();abrirDetalhePedido(${p.id})">
            <div class="pedido-info"><div class="num">${p.numero}</div><div class="meta">${fmtDateTime(p.created_at)}</div></div>
            <div class="pedido-right"><div class="valor">${fmtMoney(p.valor_com_desconto)}</div>${badgeStatus(p.status)}</div>
          </div>`).join('')}
        </div>` : ''}

        ${c.fiados && c.fiados.length ? `
        <div class="detail-section">
          <h4>Histórico de Fiados</h4>
          ${c.fiados.slice(0,10).map(f => `<div class="fiado-row">
            <div>
              <div style="font-size:0.88rem;">${f.descricao||f.tipo}</div>
              <div style="font-size:0.78rem;color:#8a9bb0;">${fmtDate(f.data)}</div>
            </div>
            <div class="${f.tipo==='debito'?'fiado-debito':'fiado-credito'}">${f.tipo==='debito'?'+':'-'} ${fmtMoney(f.valor)}</div>
          </div>`).join('')}
        </div>` : ''}
      </div>
      <div class="modal-footer">
        ${podeEditar ? `<button class="btn btn-secondary" onclick="closeModal();abrirModalCliente(${JSON.stringify(c).replace(/"/g,'&quot;')})">✏️ Editar</button>` : ''}
        <button class="btn btn-secondary" onclick="modalLancarFiado(${c.id},'${c.nome.replace(/'/g,"\\'")}','debito')">💳 Lançar Fiado</button>
        <button class="btn btn-primary" onclick="modalLancarFiado(${c.id},'${c.nome.replace(/'/g,"\\'")}','credito')">✅ Registrar Pagamento</button>
      </div>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

function modalLancarFiado(clienteId, clienteNome, tipo) {
  closeModal();
  showModal(`
    <div class="modal-header">
      <h3>${tipo==='debito'?'💳 Lançar Fiado':'✅ Registrar Pagamento'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="color:#8a9bb0;margin-bottom:16px;">Cliente: <strong style="color:#e8eaf0;">${clienteNome}</strong></p>
      <div class="form-row"><label class="form-label">Valor (R$) *</label><input class="form-control" type="number" step="0.01" min="0.01" id="fiadoValor"></div>
      <div class="form-row"><label class="form-label">Descrição</label><input class="form-control" id="fiadoDesc" placeholder="Ex: Pedido 1234, pagamento..."></div>
      <div class="form-row"><label class="form-label">Data *</label><input class="form-control" type="date" id="fiadoData" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal();abrirDetalheCliente(${clienteId})">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarFiado(${clienteId},'${tipo}')">💾 Salvar</button>
    </div>
  `);
}

async function salvarFiado(clienteId, tipo) {
  const valor = parseFloat(document.getElementById('fiadoValor')?.value);
  const data = document.getElementById('fiadoData')?.value;
  if (!valor || valor <= 0) { toast('Valor inválido', 'error'); return; }
  if (!data) { toast('Data obrigatória', 'error'); return; }
  try {
    await api('POST', '/fiados', {
      cliente_id: clienteId, tipo, valor,
      descricao: document.getElementById('fiadoDesc')?.value || '',
      data
    });
    toast(tipo === 'debito' ? 'Fiado lançado!' : 'Pagamento registrado!');
    closeModal();
    loadClientes();
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== PRODUTOS ====================
async function renderProdutos() {
  const c = document.getElementById('mainContent');
  const soLeitura = USUARIO.perfil === 'atendente';
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>🛍️ Produtos</h2>
      <div class="filters">
        <div class="search-bar"><span class="icon">🔍</span><input type="text" placeholder="Buscar..." id="prodBusca" oninput="loadProdutos()"></div>
        <select class="form-control" id="prodCat" onchange="loadProdutos()" style="max-width:160px;">
          <option value="">Todas categorias</option>
          ${['Pano de Prato','Manta','Rede','Cama','Mesa','Banho'].map(c => `<option>${c}</option>`).join('')}
        </select>
        ${!soLeitura ? '<button class="btn btn-primary" onclick="abrirModalProduto()">+ Novo</button>' : ''}
      </div>
    </div>
    <div id="produtosList"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>`;
  loadProdutos();
}

async function loadProdutos() {
  try {
    const busca = document.getElementById('prodBusca')?.value || '';
    const cat = document.getElementById('prodCat')?.value || '';
    const data = await api('GET', `/produtos?busca=${encodeURIComponent(busca)}&categoria=${encodeURIComponent(cat)}&ativos=1`);
    const el = document.getElementById('produtosList');
    if (!el) return;
    if (!data.length) { el.innerHTML = '<div class="empty-state"><span class="emoji">🛍️</span><p>Nenhum produto encontrado</p></div>'; return; }
    const soLeitura = USUARIO.perfil === 'atendente';
    el.innerHTML = `<div class="items-grid">${data.map(p => `
      <div class="item-card">
        ${p.quantidade <= p.quantidade_minima ? '<span class="badge badge-pendente badge-low">⚠️ Baixo</span>' : ''}
        <div class="item-title">${p.nome}</div>
        <div class="item-meta">
          📂 ${p.categoria}<br>
          📦 Estoque: <span class="${p.quantidade<=p.quantidade_minima?'estoque-baixo':'estoque-ok'}">${p.quantidade} ${p.unidade}</span><br>
          💰 ${fmtMoney(p.preco_venda)}
        </div>
        ${!soLeitura ? `<div class="item-actions">
          <button class="btn btn-secondary btn-sm" onclick="abrirModalProduto(${JSON.stringify(p).replace(/"/g,'&quot;')})">✏️</button>
        </div>` : ''}
      </div>`).join('')}</div>`;
  } catch(e) { toast(e.message, 'error'); }
}

function abrirModalProduto(prod) {
  showModal(`
    <div class="modal-header">
      <h3>${prod ? '✏️ Editar Produto' : '➕ Novo Produto'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Nome *</label><input class="form-control" id="pNome" value="${prod?.nome||''}"></div>
        <div class="form-row"><label class="form-label">Categoria *</label>
          <input class="form-control" id="pCatNome" list="catList" value="${prod?.categoria||''}">
          <datalist id="catList">${['Pano de Prato','Manta','Rede','Cama','Mesa','Banho'].map(c=>`<option value="${c}">`).join('')}</datalist>
        </div>
        <div class="form-row"><label class="form-label">Unidade</label>
          <select class="form-control" id="pUnidade">${['un','pc','kit','par','jg'].map(u=>`<option value="${u}" ${prod?.unidade===u?'selected':''}>${u}</option>`).join('')}</select>
        </div>
        <div class="form-row"><label class="form-label">Qtd Mínima</label><input class="form-control" type="number" id="pQtdMin" value="${prod?.quantidade_minima??5}" min="0"></div>
        <div class="form-row"><label class="form-label">Preço de Custo (R$)</label><input class="form-control" type="number" id="pCusto" step="0.01" value="${prod?.preco_custo??0}" min="0"></div>
        <div class="form-row"><label class="form-label">Preço de Venda (R$)</label><input class="form-control" type="number" id="pVenda" step="0.01" value="${prod?.preco_venda??0}" min="0"></div>
        ${!prod ? `<div class="form-row"><label class="form-label">Qtd Inicial</label><input class="form-control" type="number" id="pQtdInicial" value="0" min="0"></div>` : ''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarProduto(${prod?.id||0})">💾 Salvar</button>
    </div>
  `);
}

async function salvarProduto(id) {
  const nome = document.getElementById('pNome')?.value?.trim();
  const categoria = document.getElementById('pCatNome')?.value?.trim();
  if (!nome || !categoria) { toast('Nome e categoria obrigatórios', 'error'); return; }
  const body = {
    nome, categoria,
    unidade: document.getElementById('pUnidade')?.value || 'un',
    quantidade_minima: parseFloat(document.getElementById('pQtdMin')?.value) || 5,
    preco_custo: parseFloat(document.getElementById('pCusto')?.value) || 0,
    preco_venda: parseFloat(document.getElementById('pVenda')?.value) || 0,
  };
  if (!id) body.quantidade = parseFloat(document.getElementById('pQtdInicial')?.value) || 0;
  try {
    if (id) { await api('PUT', `/produtos/${id}`, body); toast('Produto atualizado!'); }
    else { await api('POST', '/produtos', body); toast('Produto criado!'); }
    closeModal(); loadProdutos();
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== ESTOQUE ====================
async function renderEstoque() {
  const c = document.getElementById('mainContent');
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>📦 Estoque</h2>
      <div class="filters">
        <div class="search-bar"><span class="icon">🔍</span><input type="text" placeholder="Buscar..." id="estBusca" oninput="loadEstoque()"></div>
      </div>
    </div>
    <div id="estoqueList"><div class="loading-state"><div class="spinner"></div></div></div>
    <div style="margin-top:20px;">
      <div class="section-header"><h2>📋 Últimas Movimentações</h2></div>
      <div id="movsList"><div class="loading-state"><div class="spinner"></div></div></div>
    </div>
  </div>`;
  loadEstoque();
  loadMovimentos();
}

async function loadEstoque() {
  try {
    const busca = document.getElementById('estBusca')?.value || '';
    const data = await api('GET', `/produtos?busca=${encodeURIComponent(busca)}&ativos=1`);
    const el = document.getElementById('estoqueList');
    if (!el) return;
    if (!data.length) { el.innerHTML = '<div class="empty-state"><span class="emoji">📦</span><p>Nenhum produto</p></div>'; return; }
    el.innerHTML = `<div class="table-responsive"><table>
      <thead><tr><th>Produto</th><th>Categoria</th><th>Estoque</th><th>Mínimo</th><th>Custo</th><th>Ação</th></tr></thead>
      <tbody>${data.map(p => `<tr>
        <td>${p.nome}</td>
        <td><span style="color:#8a9bb0;">${p.categoria}</span></td>
        <td><span class="estoque-qtd ${p.quantidade<=p.quantidade_minima?'estoque-baixo':'estoque-ok'}">${p.quantidade} ${p.unidade}</span>${p.quantidade<=p.quantidade_minima?' ⚠️':''}</td>
        <td style="color:#8a9bb0;">${p.quantidade_minima}</td>
        <td>${fmtMoney(p.preco_custo)}</td>
        <td><button class="btn btn-primary btn-sm" onclick="abrirEntradaEstoque(${p.id},'${p.nome.replace(/'/g,"\\'")}')">+ Entrada</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) { toast(e.message, 'error'); }
}

async function loadMovimentos() {
  try {
    const data = await api('GET', '/estoque/movimentos');
    const el = document.getElementById('movsList');
    if (!el) return;
    if (!data.length) { el.innerHTML = '<div class="empty-state"><p>Nenhuma movimentação</p></div>'; return; }
    el.innerHTML = `<div class="table-responsive"><table>
      <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Motivo</th><th>Usuário</th></tr></thead>
      <tbody>${data.slice(0,50).map(m => `<tr>
        <td style="font-size:0.8rem;">${fmtDateTime(m.created_at)}</td>
        <td>${m.produto_nome||'-'}</td>
        <td><span class="badge ${m.tipo==='entrada'?'badge-pago':m.tipo==='saida'?'badge-cancelado':'badge-separando'}">${m.tipo}</span></td>
        <td>${m.quantidade > 0 ? '+' : ''}${m.quantidade}</td>
        <td style="color:#8a9bb0;font-size:0.82rem;">${m.motivo||'-'}</td>
        <td style="color:#8a9bb0;font-size:0.82rem;">${m.usuario_nome||'-'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) {}
}

function abrirEntradaEstoque(produtoId, produtoNome) {
  showModal(`
    <div class="modal-header"><h3>📥 Entrada de Estoque</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <p style="margin-bottom:16px;color:#8a9bb0;">Produto: <strong style="color:#e8eaf0;">${produtoNome}</strong></p>
      <div class="form-row"><label class="form-label">Quantidade *</label><input class="form-control" type="number" id="entQtd" step="0.1" min="0.1"></div>
      <div class="form-row"><label class="form-label">Preço de Custo (R$)</label><input class="form-control" type="number" id="entCusto" step="0.01" min="0"></div>
      <div class="form-row"><label class="form-label">Motivo</label><input class="form-control" id="entMotivo" placeholder="Ex: Compra fornecedor ABC" value="Compra de estoque"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEntrada(${produtoId})">✅ Confirmar</button>
    </div>
  `);
}

async function salvarEntrada(produtoId) {
  const qtd = parseFloat(document.getElementById('entQtd')?.value);
  if (!qtd || qtd <= 0) { toast('Quantidade inválida', 'error'); return; }
  try {
    await api('POST', '/estoque/entrada', {
      produto_id: produtoId,
      quantidade: qtd,
      preco_custo: parseFloat(document.getElementById('entCusto')?.value) || 0,
      motivo: document.getElementById('entMotivo')?.value || 'Entrada manual'
    });
    toast('Entrada registrada!');
    closeModal();
    loadEstoque();
    loadMovimentos();
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== REPOSIÇÃO ====================
async function renderReposicao() {
  const c = document.getElementById('mainContent');
  const isEntregador = USUARIO.perfil === 'entregador';
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>🔄 Reposição</h2>
      ${!isEntregador ? '<button class="btn btn-primary" onclick="abrirModalReposicao()">+ Nova Reposição</button>' : ''}
    </div>
    <div class="chips">
      <button class="chip c-todos active" id="repChipTodos" onclick="loadReposicoes('')">Todos</button>
      <button class="chip c-pendente" id="repChipPend" onclick="loadReposicoes('Pendente')">Pendente</button>
      <button class="chip c-pago" id="repChipCol" onclick="loadReposicoes('Coletado')">Coletado</button>
    </div>
    <div id="repList"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>`;
  loadReposicoes('');
}

async function loadReposicoes(status) {
  // Update chip styles
  ['Todos','Pendente','Coletado'].forEach(s => {
    const el = document.getElementById(`repChip${s==='Todos'?'Todos':s==='Pendente'?'Pend':'Col'}`);
    if (el) el.className = `chip ${s==='Todos'?'c-todos':s==='Pendente'?'c-pendente':'c-pago'} ${((!status && s==='Todos')||(status===s))?'active':''}`;
  });

  try {
    const data = await api('GET', `/reposicoes${status?'?status='+status:''}`);
    const el = document.getElementById('repList');
    if (!el) return;
    const isEntregador = USUARIO.perfil === 'entregador';
    if (!data.length) { el.innerHTML = '<div class="empty-state"><span class="emoji">🔄</span><p>Nenhum item de reposição</p></div>'; return; }
    el.innerHTML = data.map(r => `
      <div class="rep-card ${r.status.toLowerCase()}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <div style="font-weight:700;">${r.produto_nome}</div>
            <div style="color:#8a9bb0;font-size:0.82rem;margin-top:4px;">
              Pedido: ${r.quantidade_pedida} ${r.status === 'Coletado' ? `· Recebido: ${r.quantidade_recebida}` : ''}
              ${r.fornecedor ? ` · ${r.fornecedor}` : ''}
              · ${fmtDateTime(r.created_at)}
              ${r.estoque_atual !== undefined ? ` · Estoque: ${r.estoque_atual}/${r.quantidade_minima}` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
            <span class="badge ${r.status==='Coletado'?'badge-pago':'badge-pronto'}">${r.status}</span>
            ${r.status === 'Pendente' ? `<button class="btn btn-gold btn-sm" onclick="confirmarColeta(${r.id},'${r.produto_nome.replace(/'/g,"\\'")}')">✅ Coletar</button>` : ''}
            ${!isEntregador ? `<button class="btn btn-danger btn-sm" onclick="deletarReposicao(${r.id})">🗑️</button>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch(e) { toast(e.message, 'error'); }
}

async function abrirModalReposicao() {
  try {
    const baixo = await api('GET', '/estoque/baixo');
    showModal(`
      <div class="modal-header"><h3>🔄 Nova Reposição</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row"><label class="form-label">Produto *</label>
          <div class="autocomplete-wrapper">
            <input class="form-control" id="repProdNome" placeholder="Buscar produto..." autocomplete="off" oninput="autocompleteProdutoRep(this.value)">
            <div class="autocomplete-list" id="repProdAC" style="display:none"></div>
          </div>
          <input type="hidden" id="repProdId">
        </div>
        ${baixo.length ? `<div style="margin-bottom:12px;">
          <div style="font-size:0.8rem;color:#8a9bb0;margin-bottom:6px;">Sugestões (estoque baixo):</div>
          ${baixo.map(p => `<button class="btn btn-secondary btn-sm" style="margin:2px;" onclick="selecionarRepProd(${p.id},'${p.nome.replace(/'/g,"\\'")}')">
            ${p.nome} (${p.quantidade})
          </button>`).join('')}
        </div>` : ''}
        <div class="form-row"><label class="form-label">Quantidade *</label><input class="form-control" type="number" id="repQtd" step="0.1" min="0.1"></div>
        <div class="form-row"><label class="form-label">Fornecedor</label><input class="form-control" id="repFornecedor" placeholder="Nome do fornecedor"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="salvarReposicao()">💾 Salvar</button>
      </div>
    `);
  } catch(e) { showModal(`<div class="modal-header"><h3>Erro</h3></div><div class="modal-body">${e.message}</div>`); }
}

async function autocompleteProdutoRep(val) {
  const list = document.getElementById('repProdAC');
  if (!val || val.length < 1) { if(list) list.style.display = 'none'; return; }
  try {
    const prods = await api('GET', `/produtos?busca=${encodeURIComponent(val)}&ativos=1`);
    if (!list) return;
    if (!prods.length) { list.style.display = 'none'; return; }
    list.innerHTML = prods.slice(0,6).map(p => `<div class="autocomplete-item" onclick="selecionarRepProd(${p.id},'${p.nome.replace(/'/g,"\\'")}')">
      ${p.nome} — estq: ${p.quantidade}
    </div>`).join('');
    list.style.display = 'block';
  } catch(e) {}
}

function selecionarRepProd(id, nome) {
  document.getElementById('repProdId').value = id;
  document.getElementById('repProdNome').value = nome;
  const l = document.getElementById('repProdAC');
  if (l) l.style.display = 'none';
}

async function salvarReposicao() {
  const produtoId = document.getElementById('repProdId')?.value;
  const produtoNome = document.getElementById('repProdNome')?.value?.trim();
  const qtd = parseFloat(document.getElementById('repQtd')?.value);
  if (!produtoNome || !qtd) { toast('Preencha produto e quantidade', 'error'); return; }
  try {
    await api('POST', '/reposicoes', {
      produto_id: produtoId || 0,
      produto_nome: produtoNome,
      quantidade_pedida: qtd,
      fornecedor: document.getElementById('repFornecedor')?.value || ''
    });
    toast('Reposição criada!');
    closeModal();
    loadReposicoes('');
  } catch(e) { toast(e.message, 'error'); }
}

function confirmarColeta(id, nome) {
  showModal(`
    <div class="modal-header"><h3>✅ Confirmar Coleta</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <p style="margin-bottom:12px;color:#8a9bb0;">Produto: <strong style="color:#e8eaf0;">${nome}</strong></p>
      <div class="form-row"><label class="form-label">Quantidade Recebida *</label><input class="form-control" type="number" id="coletaQtd" step="0.1" min="0"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarColeta(${id})">✅ Confirmar</button>
    </div>
  `);
}

async function salvarColeta(id) {
  const qtd = parseFloat(document.getElementById('coletaQtd')?.value);
  if (!qtd || qtd < 0) { toast('Quantidade inválida', 'error'); return; }
  try {
    await api('PUT', `/reposicoes/${id}`, { status: 'Coletado', quantidade_recebida: qtd });
    toast('Coleta confirmada! Estoque atualizado.');
    closeModal();
    loadReposicoes('');
  } catch(e) { toast(e.message, 'error'); }
}

async function deletarReposicao(id) {
  if (!confirm('Remover esta reposição?')) return;
  try {
    await api('DELETE', `/reposicoes/${id}`);
    toast('Removido!');
    loadReposicoes('');
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== FINANCEIRO ====================
async function renderFinanceiro() {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = hoje.slice(0, 8) + '01';
  const c = document.getElementById('mainContent');
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>💰 Financeiro</h2>
      <div class="filters">
        <input class="form-control" type="date" id="finInicio" value="${inicioMes}" onchange="loadFinanceiro()">
        <span style="color:#8a9bb0;">até</span>
        <input class="form-control" type="date" id="finFim" value="${hoje}" onchange="loadFinanceiro()">
      </div>
    </div>
    <div id="finContent"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>`;
  loadFinanceiro();
}

async function loadFinanceiro() {
  try {
    const di = document.getElementById('finInicio')?.value;
    const df = document.getElementById('finFim')?.value;
    const data = await api('GET', `/financeiro/resumo?data_inicio=${di}&data_fim=${df}`);
    const el = document.getElementById('finContent');
    if (!el) return;
    el.innerHTML = `
      <div class="cards-grid" style="margin-bottom:24px;">
        <div class="fin-card"><div class="fin-label">📈 Faturamento</div><div class="fin-value fin-positivo">${fmtMoney(data.faturamento)}</div></div>
        <div class="fin-card"><div class="fin-label">📉 Custo</div><div class="fin-value fin-negativo">${fmtMoney(data.custo)}</div></div>
        <div class="fin-card"><div class="fin-label">💸 Despesas</div><div class="fin-value fin-negativo">${fmtMoney(data.despesas)}</div></div>
        <div class="fin-card"><div class="fin-label">💡 Lucro Estimado</div><div class="fin-value ${data.lucro>=0?'fin-positivo':'fin-negativo'}">${fmtMoney(data.lucro)}</div></div>
        <div class="fin-card"><div class="fin-label">💳 Fiados em Aberto</div><div class="fin-value fin-dourado">${fmtMoney(data.fiados_aberto)}</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex-wrap:wrap;">
        <div class="card">
          <h3 style="margin-bottom:14px;">Pedidos por Status</h3>
          ${(data.pedidos_por_status||[]).map(p => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            ${badgeStatus(p.status)}<span style="color:#40c074;font-weight:700;">${fmtMoney(p.faturamento)}</span>
          </div>`).join('') || '<p style="color:#8a9bb0;">Nenhum pedido</p>'}
        </div>
        <div class="card">
          <h3 style="margin-bottom:14px;">Despesas por Categoria</h3>
          ${(data.despesas_por_categoria||[]).map(d => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <span>${d.categoria}</span><span style="color:#ff6b7a;font-weight:700;">${fmtMoney(d.total)}</span>
          </div>`).join('') || '<p style="color:#8a9bb0;">Nenhuma despesa</p>'}
        </div>
      </div>
    `;
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== DESPESAS ====================
async function renderDespesas() {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = hoje.slice(0, 8) + '01';
  const c = document.getElementById('mainContent');
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>💸 Despesas</h2>
      <div class="filters">
        <input class="form-control" type="date" id="despInicio" value="${inicioMes}" onchange="loadDespesas()">
        <input class="form-control" type="date" id="despFim" value="${hoje}" onchange="loadDespesas()">
        <button class="btn btn-primary" onclick="abrirModalDespesa()">+ Nova</button>
      </div>
    </div>
    <div id="despList"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>`;
  loadDespesas();
}

async function loadDespesas() {
  try {
    const di = document.getElementById('despInicio')?.value;
    const df = document.getElementById('despFim')?.value;
    const data = await api('GET', `/despesas?data_inicio=${di}&data_fim=${df}`);
    const el = document.getElementById('despList');
    if (!el) return;
    const total = data.reduce((s, d) => s + d.valor, 0);
    if (!data.length) { el.innerHTML = '<div class="empty-state"><span class="emoji">💸</span><p>Nenhuma despesa</p></div>'; return; }
    el.innerHTML = `
      <div style="text-align:right;margin-bottom:12px;font-size:1.05rem;">
        Total: <strong style="color:#ff6b7a;">${fmtMoney(total)}</strong>
      </div>
      <div class="table-responsive"><table>
        <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Ações</th></tr></thead>
        <tbody>${data.map(d => `<tr>
          <td>${fmtDate(d.data)}</td>
          <td><span style="color:#8a9bb0;">${d.categoria}</span></td>
          <td>${d.descricao}</td>
          <td style="color:#ff6b7a;font-weight:700;">${fmtMoney(d.valor)}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="abrirModalDespesa(${JSON.stringify(d).replace(/"/g,'&quot;')})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deletarDespesa(${d.id})">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`;
  } catch(e) { toast(e.message, 'error'); }
}

function abrirModalDespesa(desp) {
  showModal(`
    <div class="modal-header"><h3>${desp ? '✏️ Editar Despesa' : '➕ Nova Despesa'}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Categoria *</label>
          <input class="form-control" id="dCat" list="despCatList" value="${desp?.categoria||''}">
          <datalist id="despCatList">${['Frete','Embalagem','Combustível','Manutenção','Aluguel','Alimentação','Marketing','Impostos','Outros'].map(c=>`<option value="${c}">`).join('')}</datalist>
        </div>
        <div class="form-row"><label class="form-label">Valor (R$) *</label><input class="form-control" type="number" id="dValor" step="0.01" min="0" value="${desp?.valor||''}"></div>
        <div class="form-row"><label class="form-label">Data *</label><input class="form-control" type="date" id="dData" value="${desp?.data||new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-row"><label class="form-label">Descrição *</label><input class="form-control" id="dDesc" value="${desp?.descricao||''}" placeholder="Descreva a despesa"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarDespesa(${desp?.id||0})">💾 Salvar</button>
    </div>
  `);
}

async function salvarDespesa(id) {
  const cat = document.getElementById('dCat')?.value?.trim();
  const desc = document.getElementById('dDesc')?.value?.trim();
  const val = parseFloat(document.getElementById('dValor')?.value);
  const data = document.getElementById('dData')?.value;
  if (!cat || !desc || !val || !data) { toast('Preencha todos os campos', 'error'); return; }
  try {
    if (id) { await api('PUT', `/despesas/${id}`, { categoria: cat, descricao: desc, valor: val, data }); toast('Despesa atualizada!'); }
    else { await api('POST', '/despesas', { categoria: cat, descricao: desc, valor: val, data }); toast('Despesa registrada!'); }
    closeModal(); loadDespesas();
  } catch(e) { toast(e.message, 'error'); }
}

async function deletarDespesa(id) {
  if (!confirm('Remover esta despesa?')) return;
  try { await api('DELETE', `/despesas/${id}`); toast('Removido!'); loadDespesas(); }
  catch(e) { toast(e.message, 'error'); }
}

// ==================== USUÁRIOS ====================
async function renderUsuarios() {
  const c = document.getElementById('mainContent');
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>👤 Usuários</h2>
      <button class="btn btn-primary" onclick="abrirModalUsuario()">+ Novo</button>
    </div>
    <div id="usersList"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>`;
  loadUsuarios();
}

async function loadUsuarios() {
  try {
    const data = await api('GET', '/usuarios');
    const el = document.getElementById('usersList');
    if (!el) return;
    el.innerHTML = `<div class="table-responsive"><table>
      <thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${data.map(u => `<tr>
        <td>${u.nome}</td>
        <td style="color:#8a9bb0;">${u.username}</td>
        <td><span class="badge ${u.perfil==='admin'?'badge-pronto':u.perfil==='gerente'?'badge-pago':u.perfil==='atendente'?'badge-separando':'badge-enviado'}">${u.perfil}</span></td>
        <td><span class="${u.ativo?'estoque-ok':'estoque-baixo'}">${u.ativo?'✓ Ativo':'✗ Inativo'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="abrirModalUsuario(${JSON.stringify(u).replace(/"/g,'&quot;')})">✏️</button>
          ${u.id !== USUARIO.id ? `<button class="btn btn-danger btn-sm" onclick="deletarUsuario(${u.id})">🗑️</button>` : ''}
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) { toast(e.message, 'error'); }
}

function abrirModalUsuario(user) {
  showModal(`
    <div class="modal-header"><h3>${user ? '✏️ Editar Usuário' : '➕ Novo Usuário'}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Nome *</label><input class="form-control" id="uNome" value="${user?.nome||''}"></div>
        <div class="form-row"><label class="form-label">Username *</label><input class="form-control" id="uUsername" value="${user?.username||''}" ${user?'':''}></div>
        <div class="form-row"><label class="form-label">${user ? 'Nova Senha (opcional)' : 'Senha *'}</label><input class="form-control" type="password" id="uSenha" placeholder="${user?'Deixe em branco para manter':''}"></div>
        <div class="form-row"><label class="form-label">Perfil *</label>
          <select class="form-control" id="uPerfil">
            ${['admin','gerente','atendente','entregador'].map(p => `<option value="${p}" ${user?.perfil===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        ${user ? `<div class="form-row"><label class="form-label">Status</label>
          <select class="form-control" id="uAtivo">
            <option value="1" ${user.ativo?'selected':''}>Ativo</option>
            <option value="0" ${!user.ativo?'selected':''}>Inativo</option>
          </select>
        </div>` : ''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarUsuario(${user?.id||0})">💾 Salvar</button>
    </div>
  `);
}

async function salvarUsuario(id) {
  const nome = document.getElementById('uNome')?.value?.trim();
  const username = document.getElementById('uUsername')?.value?.trim();
  const senha = document.getElementById('uSenha')?.value;
  const perfil = document.getElementById('uPerfil')?.value;
  const ativo = document.getElementById('uAtivo')?.value;
  if (!nome || !username || !perfil) { toast('Nome, username e perfil obrigatórios', 'error'); return; }
  if (!id && !senha) { toast('Senha obrigatória para novo usuário', 'error'); return; }
  const body = { nome, username, perfil };
  if (senha) body.senha = senha;
  if (ativo !== undefined) body.ativo = parseInt(ativo);
  try {
    if (id) { await api('PUT', `/usuarios/${id}`, body); toast('Usuário atualizado!'); }
    else { await api('POST', '/usuarios', body); toast('Usuário criado!'); }
    closeModal(); loadUsuarios();
  } catch(e) { toast(e.message, 'error'); }
}

async function deletarUsuario(id) {
  if (!confirm('Remover este usuário?')) return;
  try { await api('DELETE', `/usuarios/${id}`); toast('Removido!'); loadUsuarios(); }
  catch(e) { toast(e.message, 'error'); }
}

// ==================== MINHAS ENTREGAS ====================
async function renderEntregas() {
  const c = document.getElementById('mainContent');
  c.innerHTML = `<div class="page">
    <div class="section-header"><h2>🚚 Minhas Entregas</h2></div>
    <div id="entregasList"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>`;
  loadEntregas();
}

async function loadEntregas() {
  try {
    const data = await api('GET', '/pedidos?status=Pronto');
    const data2 = await api('GET', '/pedidos?status=Separado');
    const todos = [...data, ...data2].filter((p, i, a) => a.findIndex(x => x.id === p.id) === i);
    todos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const el = document.getElementById('entregasList');
    if (!el) return;
    if (!todos.length) { el.innerHTML = '<div class="empty-state"><span class="emoji">✅</span><p>Sem entregas pendentes</p></div>'; return; }
    el.innerHTML = todos.map(p => `
      <div class="pedido-card" style="flex-direction:column;align-items:flex-start;">
        <div style="display:flex;justify-content:space-between;width:100%;margin-bottom:8px;">
          <div class="num">${p.numero}</div>
          <div>${badgeStatus(p.status)}</div>
        </div>
        <div style="font-size:0.95rem;font-weight:600;">${p.cliente_nome}</div>
        <div style="font-size:0.82rem;color:#8a9bb0;margin:4px 0;">
          ${p.local_entrega ? `📍 ${p.local_entrega}` : ''} ${p.cidade_entrega ? `· ${p.cidade_entrega}` : ''}<br>
          ${p.cliente_telefone ? `📱 ${p.cliente_telefone}` : ''}<br>
          ${p.data_entrega ? `📅 ${fmtDate(p.data_entrega)}` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:8px;">
          <div>
            <span style="font-weight:700;color:#40c074;">${fmtMoney(p.valor_com_desconto)}</span>
            <span style="color:#8a9bb0;font-size:0.82rem;margin-left:8px;">${p.tipo_pagamento}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="confirmarEntrega(${p.id})">✅ Confirmar Entrega</button>
        </div>
      </div>
    `).join('');
  } catch(e) { toast(e.message, 'error'); }
}

function confirmarEntrega(id) {
  showModal(`
    <div class="modal-header"><h3>✅ Confirmar Entrega</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <p style="color:#8a9bb0;margin-bottom:16px;">Anexe um comprovante de entrega (opcional)</p>
      <label class="upload-area" style="display:block;cursor:pointer;">
        📷 Selecionar Foto/Comprovante
        <input type="file" id="compEntr" style="display:none;" accept="image/*">
      </label>
      <div id="prevEntr"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEntrega(${id})">✅ Confirmar</button>
    </div>
  `);
  document.getElementById('compEntr')?.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) {
      const prev = document.getElementById('prevEntr');
      const url = URL.createObjectURL(f);
      if (prev) prev.innerHTML = `<img src="${url}" class="upload-img">`;
    }
  });
}

async function salvarEntrega(id) {
  const fileInput = document.getElementById('compEntr');
  try {
    if (fileInput?.files[0]) {
      const form = new FormData();
      form.append('arquivo', fileInput.files[0]);
      form.append('tipo', 'comprovante_entrega');
      const opts = { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: form };
      await fetch(`/api/pedidos/${id}/upload`, opts);
    }
    await api('PUT', `/pedidos/${id}`, { status: 'Enviado' });
    toast('Entrega confirmada!');
    closeModal();
    loadEntregas();
  } catch(e) { toast(e.message, 'error'); }
}

async function salvarEntrega(id) {
  const fileInput = document.getElementById('compEntr');
  try {
    if (fileInput?.files[0]) {
      const form = new FormData();
      form.append('arquivo', fileInput.files[0]);
      form.append('tipo', 'comprovante_entrega');
      const opts = { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: form };
      await fetch(`/api/pedidos/${id}/upload`, opts);
    }
    await api('PUT', `/pedidos/${id}`, { status: 'Enviado' });
    toast('Entrega confirmada!');
    closeModal();
    loadEntregas();
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== PDV ====================
let pdvItens = [];
let pdvClienteId = null;

async function renderPDV() {
  const c = document.getElementById('mainContent');
  pdvItens = [];
  pdvClienteId = null;
  c.innerHTML = `
  <div style="background:#0a1520;min-height:100vh;padding:0 0 100px 0;">
    <div style="background:#0d1e2e;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:1.3rem;font-weight:800;color:#e8eaf0;">🛒 Nova Venda</div>
        <div style="font-size:0.82rem;color:#40c074;">Vendedora: ${USUARIO.nome}</div>
      </div>
      <div style="font-size:0.8rem;color:#8a9bb0;">${new Date().toLocaleDateString('pt-BR')}</div>
    </div>

    <!-- CLIENTE -->
    <div style="margin:16px;background:#0d1e2e;border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.07);">
      <div style="font-size:0.78rem;font-weight:700;color:#8a9bb0;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">👤 Cliente</div>
      <div class="autocomplete-wrapper">
        <input class="form-control" id="pdvCliente" placeholder="Buscar cliente por nome ou cidade..." autocomplete="off"
          oninput="pdvBuscarCliente(this.value)" style="font-size:1rem;padding:12px 14px;">
        <div class="autocomplete-list" id="pdvClienteAC" style="display:none"></div>
      </div>
      <input type="hidden" id="pdvClienteIdField">
      <a href="#" style="font-size:0.8rem;color:#40c074;margin-top:8px;display:inline-block;" onclick="pdvNovoCliente();return false;">+ Criar novo cliente</a>
      <div id="pdvNovoClienteForm" style="display:none;margin-top:12px;background:#0a1520;border-radius:10px;padding:12px;">
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Nome *</label><input class="form-control" id="pdvNcNome"></div>
          <div class="form-row"><label class="form-label">Telefone</label><input class="form-control" id="pdvNcTel"></div>
          <div class="form-row"><label class="form-label">Cidade</label><input class="form-control" id="pdvNcCidade"></div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="pdvSalvarNovoCliente()">💾 Salvar Cliente</button>
      </div>
    </div>

    <!-- ITENS -->
    <div style="margin:0 16px 16px;background:#0d1e2e;border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.07);">
      <div style="font-size:0.78rem;font-weight:700;color:#8a9bb0;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📋 Itens</div>
      <div class="autocomplete-wrapper" style="margin-bottom:12px;">
        <input class="form-control" id="pdvProdBusca" placeholder="Buscar produto para adicionar..." autocomplete="off"
          oninput="pdvBuscarProduto(this.value)" style="font-size:1rem;padding:12px 14px;">
        <div class="autocomplete-list" id="pdvProdAC" style="display:none"></div>
      </div>
      <div id="pdvItensList"></div>
    </div>

    <!-- PAGAMENTO -->
    <div style="margin:0 16px 16px;background:#0d1e2e;border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.07);">
      <div style="font-size:0.78rem;font-weight:700;color:#8a9bb0;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">💳 Pagamento</div>

      <!-- Toggle Pago/Fiado -->
      <div style="display:flex;gap:0;margin-bottom:16px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
        <button id="pdvTogPago" onclick="pdvSetTipo('Pago')"
          style="flex:1;padding:12px;background:#40c074;color:#fff;border:none;font-weight:700;font-size:0.95rem;cursor:pointer;">✅ Pago</button>
        <button id="pdvTogFiado" onclick="pdvSetTipo('Fiado')"
          style="flex:1;padding:12px;background:rgba(255,255,255,0.04);color:#8a9bb0;border:none;font-weight:700;font-size:0.95rem;cursor:pointer;">💳 A crédito (Fiado)</button>
      </div>

      <!-- Método pagamento -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;" id="pdvMetodos">
        ${[['Dinheiro','💵'],['Cartão','💳'],['Transferência','🏦'],['PIX','💚'],['Outro','💱']].map(([m,i]) =>
          `<div class="pdv-metodo ${m==='Dinheiro'?'active':''}" onclick="pdvSetMetodo('${m}')" data-metodo="${m}"
            style="padding:12px 8px;background:${m==='Dinheiro'?'rgba(64,192,116,0.2)':'rgba(255,255,255,0.04)'};border:2px solid ${m==='Dinheiro'?'#40c074':'rgba(255,255,255,0.1)'};border-radius:10px;text-align:center;cursor:pointer;transition:all .2s;">
            <div style="font-size:1.4rem;">${i}</div>
            <div style="font-size:0.7rem;color:#c8d0de;margin-top:4px;">${m}</div>
          </div>`
        ).join('')}
      </div>

      <!-- Desconto -->
      <div class="form-row">
        <label class="form-label">Desconto (R$)</label>
        <input class="form-control" type="number" id="pdvDesconto" step="0.01" min="0" value="0"
          oninput="pdvCalcTotal()" style="font-size:1rem;padding:12px 14px;">
      </div>
    </div>

    <!-- FOOTER FIXO -->
    <div style="position:fixed;bottom:0;left:0;right:0;background:#0d1e2e;border-top:2px solid rgba(64,192,116,0.3);padding:16px 20px;z-index:100;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="color:#8a9bb0;font-size:0.9rem;">Total</div>
        <div id="pdvTotalLabel" style="font-size:1.6rem;font-weight:900;color:#40c074;">R$ 0,00</div>
      </div>
      <button onclick="pdvConfirmarVenda()"
        style="width:100%;padding:16px;background:linear-gradient(135deg,#40c074,#2ea85e);color:#fff;border:none;border-radius:12px;font-size:1.1rem;font-weight:800;cursor:pointer;letter-spacing:0.5px;">
        ✅ Criar Venda
      </button>
    </div>
  </div>`;

  // Estado PDV
  window.pdvTipoPagamento = 'Pago';
  window.pdvMetodoPagamento = 'Dinheiro';
}

let pdvCliTimer = null;
async function pdvBuscarCliente(val) {
  clearTimeout(pdvCliTimer);
  const list = document.getElementById('pdvClienteAC');
  if (!val || val.length < 2) { if(list) list.style.display = 'none'; return; }
  pdvCliTimer = setTimeout(async () => {
    try {
      const clientes = await api('GET', `/clientes?busca=${encodeURIComponent(val)}`);
      if (!list) return;
      if (!clientes.length) { list.style.display = 'none'; return; }
      list.innerHTML = clientes.slice(0,8).map(c =>
        `<div class="autocomplete-item" onclick="pdvSelecionarCliente(${c.id},'${c.nome.replace(/'/g,"\\'")}')">
          ${c.nome}${c.cidade?' · '+c.cidade:''}${c.telefone?' · '+c.telefone:''}
        </div>`
      ).join('');
      list.style.display = 'block';
    } catch(e) {}
  }, 250);
}

function pdvSelecionarCliente(id, nome) {
  document.getElementById('pdvCliente').value = nome;
  document.getElementById('pdvClienteIdField').value = id;
  pdvClienteId = id;
  const list = document.getElementById('pdvClienteAC');
  if (list) list.style.display = 'none';
}

function pdvNovoCliente() {
  const el = document.getElementById('pdvNovoClienteForm');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function pdvSalvarNovoCliente() {
  const nome = document.getElementById('pdvNcNome')?.value?.trim();
  if (!nome) { toast('Nome obrigatório', 'error'); return; }
  try {
    const c = await api('POST', '/clientes', {
      nome,
      telefone: document.getElementById('pdvNcTel')?.value || '',
      cidade: document.getElementById('pdvNcCidade')?.value || ''
    });
    pdvSelecionarCliente(c.id, c.nome);
    document.getElementById('pdvNovoClienteForm').style.display = 'none';
    toast('Cliente criado!');
  } catch(e) { toast(e.message, 'error'); }
}

let pdvProdTimer = null;
async function pdvBuscarProduto(val) {
  clearTimeout(pdvProdTimer);
  const list = document.getElementById('pdvProdAC');
  if (!val || val.length < 1) { if(list) list.style.display = 'none'; return; }
  pdvProdTimer = setTimeout(async () => {
    try {
      const prods = await api('GET', `/produtos?busca=${encodeURIComponent(val)}&ativos=1`);
      if (!list) return;
      if (!prods.length) { list.style.display = 'none'; return; }
      list.innerHTML = prods.slice(0,8).map(p =>
        `<div class="autocomplete-item" onclick="pdvAdicionarProduto(${p.id},'${p.nome.replace(/'/g,"\\'")}',${p.preco_venda},${p.preco_custo})">
          <strong>${p.nome}</strong> — ${fmtMoney(p.preco_venda)} <span style="color:#8a9bb0;font-size:0.8rem;">(estq: ${p.quantidade})</span>
        </div>`
      ).join('');
      list.style.display = 'block';
    } catch(e) {}
  }, 200);
}

function pdvAdicionarProduto(id, nome, preco, custo) {
  const existing = pdvItens.findIndex(i => i.produto_id === id);
  if (existing >= 0) {
    pdvItens[existing].quantidade++;
    pdvItens[existing].subtotal = pdvItens[existing].quantidade * pdvItens[existing].preco_unitario;
  } else {
    pdvItens.push({ produto_id: id, produto_nome: nome, quantidade: 1, preco_unitario: preco, preco_custo: custo, subtotal: preco });
  }
  const el = document.getElementById('pdvProdBusca');
  if (el) el.value = '';
  const list = document.getElementById('pdvProdAC');
  if (list) list.style.display = 'none';
  pdvRenderItens();
  pdvCalcTotal();
}

function pdvRenderItens() {
  const el = document.getElementById('pdvItensList');
  if (!el) return;
  if (!pdvItens.length) {
    el.innerHTML = '<div style="text-align:center;color:#8a9bb0;padding:20px;font-size:0.85rem;">Nenhum item adicionado</div>';
    return;
  }
  el.innerHTML = pdvItens.map((item, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#0a1520;border-radius:10px;margin-bottom:8px;">
      <div style="flex:1;">
        <div style="font-weight:700;color:#e8eaf0;font-size:0.9rem;">${item.produto_nome}</div>
        <div style="font-size:0.78rem;color:#8a9bb0;">${fmtMoney(item.preco_unitario)} × ${item.quantidade} = <strong style="color:#40c074;">${fmtMoney(item.subtotal)}</strong></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button onclick="pdvQtd(${i},-1)" style="width:30px;height:30px;background:#1a2d3f;color:#e8eaf0;border:none;border-radius:6px;cursor:pointer;font-size:1.1rem;">−</button>
        <input type="number" value="${item.quantidade}" min="0.1" step="0.1"
          onchange="pdvSetQtd(${i},this.value)"
          style="width:50px;text-align:center;background:#1a2d3f;color:#e8eaf0;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px;font-size:0.9rem;">
        <button onclick="pdvQtd(${i},1)" style="width:30px;height:30px;background:#1a2d3f;color:#e8eaf0;border:none;border-radius:6px;cursor:pointer;font-size:1.1rem;">+</button>
        <button onclick="pdvRemover(${i})" style="width:30px;height:30px;background:rgba(231,76,60,0.15);color:#e74c3c;border:none;border-radius:6px;cursor:pointer;">🗑️</button>
      </div>
    </div>
  `).join('');
}

function pdvQtd(i, delta) {
  pdvItens[i].quantidade = Math.max(0.1, (pdvItens[i].quantidade || 1) + delta);
  pdvItens[i].subtotal = pdvItens[i].quantidade * pdvItens[i].preco_unitario;
  pdvRenderItens(); pdvCalcTotal();
}
function pdvSetQtd(i, val) {
  pdvItens[i].quantidade = Math.max(0.1, parseFloat(val) || 1);
  pdvItens[i].subtotal = pdvItens[i].quantidade * pdvItens[i].preco_unitario;
  pdvCalcTotal();
}
function pdvRemover(i) {
  pdvItens.splice(i, 1);
  pdvRenderItens(); pdvCalcTotal();
}

function pdvCalcTotal() {
  const total = pdvItens.reduce((s, i) => s + (i.subtotal || 0), 0);
  const desc = parseFloat(document.getElementById('pdvDesconto')?.value) || 0;
  const final = Math.max(0, total - desc);
  const el = document.getElementById('pdvTotalLabel');
  if (el) el.textContent = fmtMoney(final);
}

function pdvSetTipo(tipo) {
  window.pdvTipoPagamento = tipo;
  const btnPago = document.getElementById('pdvTogPago');
  const btnFiado = document.getElementById('pdvTogFiado');
  if (btnPago) { btnPago.style.background = tipo === 'Pago' ? '#40c074' : 'rgba(255,255,255,0.04)'; btnPago.style.color = tipo === 'Pago' ? '#fff' : '#8a9bb0'; }
  if (btnFiado) { btnFiado.style.background = tipo === 'Fiado' ? 'rgba(231,76,60,0.3)' : 'rgba(255,255,255,0.04)'; btnFiado.style.color = tipo === 'Fiado' ? '#e74c3c' : '#8a9bb0'; }
}

function pdvSetMetodo(metodo) {
  window.pdvMetodoPagamento = metodo;
  document.querySelectorAll('.pdv-metodo').forEach(el => {
    const m = el.dataset.metodo;
    el.style.background = m === metodo ? 'rgba(64,192,116,0.2)' : 'rgba(255,255,255,0.04)';
    el.style.borderColor = m === metodo ? '#40c074' : 'rgba(255,255,255,0.1)';
  });
}

async function pdvConfirmarVenda() {
  const clienteNome = document.getElementById('pdvCliente')?.value?.trim();
  if (!clienteNome) { toast('Selecione um cliente', 'error'); return; }
  if (!pdvItens.length) { toast('Adicione pelo menos um item', 'error'); return; }

  const desconto = parseFloat(document.getElementById('pdvDesconto')?.value) || 0;
  const body = {
    cliente_id: document.getElementById('pdvClienteIdField')?.value || null,
    cliente_nome: clienteNome,
    itens: pdvItens,
    desconto,
    metodo_pagamento: window.pdvMetodoPagamento || 'Dinheiro',
    tipo_pagamento: window.pdvTipoPagamento || 'Pago',
    data_venda: new Date().toISOString().slice(0, 10),
    vendedora_id: USUARIO.id
  };

  try {
    const r = await api('POST', '/pdv/venda', body);
    toast(`✅ Venda ${r.numero} criada! ${fmtMoney(r.valor_com_desconto)}`);
    // Limpar
    pdvItens = [];
    pdvClienteId = null;
    document.getElementById('pdvCliente').value = '';
    document.getElementById('pdvClienteIdField').value = '';
    document.getElementById('pdvDesconto').value = '0';
    pdvRenderItens();
    pdvCalcTotal();
    pdvSetTipo('Pago');
    pdvSetMetodo('Dinheiro');
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== MINHAS VENDAS ====================
async function renderMeusPedidos() {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = hoje.slice(0, 8) + '01';
  const c = document.getElementById('mainContent');
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>📋 Minhas Vendas</h2>
      <div class="filters">
        <input class="form-control" type="date" id="mvInicio" value="${inicioMes}" onchange="loadMeusPedidos()">
        <span style="color:#8a9bb0;">até</span>
        <input class="form-control" type="date" id="mvFim" value="${hoje}" onchange="loadMeusPedidos()">
      </div>
    </div>
    <div id="mvResumo" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;"></div>
    <div id="mvList"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>`;
  loadMeusPedidos();
}

async function loadMeusPedidos() {
  try {
    const di = document.getElementById('mvInicio')?.value;
    const df = document.getElementById('mvFim')?.value;
    const params = new URLSearchParams();
    if (di) params.set('data_inicio', di);
    if (df) params.set('data_fim', df);
    const pedidos = await api('GET', `/pedidos/minhas?${params}`);

    // Dashboard resumo
    const dash = await api('GET', '/dashboard/vendedora');
    const resumo = document.getElementById('mvResumo');
    if (resumo) resumo.innerHTML = `
      <div class="stat-card green"><div class="stat-label">Vendas</div><div class="stat-value">${pedidos.length}</div></div>
      <div class="stat-card blue"><div class="stat-label">Faturamento</div><div class="stat-value-sm">${fmtMoney(pedidos.reduce((s,p) => s+(p.valor_com_desconto||0), 0))}</div></div>
      <div class="stat-card gold"><div class="stat-label">Comissão Est.</div><div class="stat-value-sm">${fmtMoney(dash.comissao_mes)}</div></div>
    `;

    const el = document.getElementById('mvList');
    if (!el) return;
    if (!pedidos.length) { el.innerHTML = '<div class="empty-state"><span class="emoji">📋</span><p>Nenhuma venda no período</p></div>'; return; }
    el.innerHTML = pedidos.map(p => `
      <div class="pedido-card" onclick="abrirDetalhePedido(${p.id})">
        <div class="pedido-info">
          <div class="num">${p.numero}</div>
          <div class="cliente">${p.cliente_nome}</div>
          <div class="meta">${fmtDateTime(p.created_at)}</div>
          ${p.metodo_pagamento ? `<div style="font-size:0.75rem;color:#8a9bb0;">${p.metodo_pagamento}</div>` : ''}
        </div>
        <div class="pedido-right">
          <div class="valor">${fmtMoney(p.valor_com_desconto)}</div>
          ${badgeStatus(p.status)}
          <div style="font-size:0.75rem;color:#8a9bb0;margin-top:4px;">${p.tipo_pagamento}</div>
        </div>
      </div>
    `).join('');
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== COMISSÕES (admin/gerente) ====================
async function renderComissoes() {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = hoje.slice(0, 8) + '01';
  const c = document.getElementById('mainContent');
  c.innerHTML = `<div class="page">
    <div class="section-header">
      <h2>💰 Comissões</h2>
      <div class="filters">
        <input class="form-control" type="date" id="comInicio" value="${inicioMes}" onchange="loadComissoes()">
        <span style="color:#8a9bb0;">até</span>
        <input class="form-control" type="date" id="comFim" value="${hoje}" onchange="loadComissoes()">
      </div>
    </div>
    <div id="comContent"><div class="loading-state"><div class="spinner"></div></div></div>
  </div>`;
  loadComissoes();
}

async function loadComissoes() {
  try {
    const di = document.getElementById('comInicio')?.value;
    const df = document.getElementById('comFim')?.value;
    const [relatorio, configs] = await Promise.all([
      api('GET', `/comissoes/relatorio?data_inicio=${di}&data_fim=${df}`),
      api('GET', '/comissoes/config')
    ]);
    const el = document.getElementById('comContent');
    if (!el) return;

    // Map percentual from configs for input fields
    const configMap = {};
    configs.forEach(c => configMap[c.id] = c.percentual);

    if (!relatorio.vendedoras || !relatorio.vendedoras.length) {
      el.innerHTML = '<div class="empty-state"><span class="emoji">💰</span><p>Nenhuma venda no período</p></div>';
      return;
    }

    el.innerHTML = relatorio.vendedoras.map(v => `
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.07);">
          <div>
            <div style="font-weight:800;font-size:1rem;color:#e8eaf0;">👩‍💼 ${v.vendedora_nome}</div>
            <div style="color:#40c074;font-size:0.9rem;">Total: ${fmtMoney(v.total_vendido)}</div>
          </div>
          <div style="text-align:right;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <input type="number" id="pct-${v.vendedora_id}" value="${v.percentual}" min="0" max="100" step="0.1"
                style="width:65px;background:#1a2d3f;color:#e8eaf0;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 8px;font-size:0.9rem;">
              <span style="color:#8a9bb0;font-size:0.85rem;">%</span>
              <button class="btn btn-secondary btn-sm" onclick="salvarPercentualComissao(${v.vendedora_id})">💾</button>
            </div>
            <div style="color:#f0c040;font-weight:700;">Comissão: ${fmtMoney(v.comissao)}</div>
          </div>
        </div>
        ${v.pedidos.length ? `
        <div style="max-height:250px;overflow-y:auto;">
          ${v.pedidos.map(p => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.04);">
              <div>
                <div style="font-size:0.85rem;color:#e8eaf0;">${p.numero} · ${p.cliente_nome}</div>
                <div style="font-size:0.75rem;color:#8a9bb0;">${fmtDateTime(p.created_at)} · ${p.metodo_pagamento||p.tipo_pagamento}</div>
              </div>
              <div style="text-align:right;">
                <div style="color:#40c074;font-weight:700;font-size:0.9rem;">${fmtMoney(p.valor_com_desconto)}</div>
                ${badgeStatus(p.status)}
              </div>
            </div>
          `).join('')}
        </div>
        ` : '<div style="padding:12px 16px;color:#8a9bb0;font-size:0.85rem;">Nenhum pedido no período</div>'}
      </div>
    `).join('');
  } catch(e) { toast(e.message, 'error'); }
}

async function salvarPercentualComissao(usuarioId) {
  const pct = parseFloat(document.getElementById(`pct-${usuarioId}`)?.value);
  if (isNaN(pct) || pct < 0) { toast('Percentual inválido', 'error'); return; }
  try {
    await api('PUT', `/comissoes/config/${usuarioId}`, { percentual: pct });
    toast('Comissão atualizada!');
    loadComissoes();
  } catch(e) { toast(e.message, 'error'); }
}

// ==================== BOOT ====================
document.addEventListener('DOMContentLoaded', () => {
  if (!TOKEN || !USUARIO) { window.location.href = 'login.html'; return; }
  const headerNome = document.getElementById('headerNome');
  const headerPerfil = document.getElementById('headerPerfil');
  if (headerNome) headerNome.textContent = USUARIO.nome;
  if (headerPerfil) headerPerfil.textContent = USUARIO.perfil.toUpperCase();
  buildNav();
});
