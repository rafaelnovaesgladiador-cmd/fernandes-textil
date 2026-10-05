// ===== Portal do Cliente — tela da gestão (Fernandes Têxtil) =====
const JWT = (() => { try { return localStorage.getItem('ft_token'); } catch (e) { return null; } })();
const USUARIO = local.ler('ft_usuario', null);
if (!JWT || !USUARIO || !['admin', 'gerente'].includes(USUARIO.perfil)) {
  location.href = '/login.html?voltar=/portal';
}

const api = (url, opts = {}) => requisicao('/api/portal' + url, { ...opts, cabecalhos: { Authorization: 'Bearer ' + JWT } })
  .catch(e => {
    if (e.status === 401) location.href = '/login.html?voltar=/portal';
    throw e;
  });

const estado = {
  clientes: [],
  clienteId: null,
  dados: null,
  aba: 'pedidos',
  abertos: new Set(),
  vistoAte: null,
  destaqueAte: null
};

const linkCliente = token => `${location.origin}/p/${token}`;
const chaveVisto = id => `pg_visto_${id}`;

// ---------- Navegação (#  = lista de clientes, #c/ID = cliente) ----------
function rota() {
  const m = location.hash.match(/^#c\/(\d+)/);
  const novoId = m ? Number(m[1]) : null;
  if (novoId !== estado.clienteId) {
    estado.clienteId = novoId;
    estado.dados = null;
    estado.abertos = new Set();
    estado.aba = 'pedidos';
    estado.vistoAte = estado.destaqueAte = novoId ? local.ler(chaveVisto(novoId), null) : null;
  }
  carregar();
}
window.addEventListener('hashchange', rota);

async function carregar() {
  try {
    if (estado.clienteId) {
      const primeiraVez = !estado.dados;
      estado.dados = await api(`/clientes/${estado.clienteId}/painel`);
      if (primeiraVez) {
        const emAndamento = estado.dados.pedidos.find(p => !['Entregue', 'Cancelado'].includes(p.status));
        if (emAndamento) estado.abertos.add(emAndamento.id);
        if (estado.vistoAte == null) {
          estado.vistoAte = estado.destaqueAte = estado.dados.historico[0] ? estado.dados.historico[0].id : 0;
          local.gravar(chaveVisto(estado.clienteId), estado.vistoAte);
        }
      }
      renderCliente();
    } else {
      estado.clientes = await api('/clientes');
      renderLista();
    }
  } catch (e) {
    if (e.status === 404) { location.hash = ''; return; }
    toast(e.message, 'erro');
  }
}

function topo(titulo, sub, comConfig) {
  document.getElementById('topoTitulo').textContent = titulo;
  document.getElementById('topoSub').textContent = sub;
  document.getElementById('btnConfig').classList.toggle('oculto', !comConfig);
  document.title = `${titulo} — Portal do Cliente`;
}

function fab(rotulo, acao) {
  const el = document.getElementById('fab');
  el.classList.toggle('oculto', !rotulo);
  if (rotulo) { el.innerHTML = `<span>＋</span> ${esc(rotulo)}`; el.dataset.acao = acao; }
}

// ---------- Lista de clientes ----------
function renderLista() {
  topo('Portal do Cliente', 'Fernandes Têxtil', false);
  fab('Novo cliente', 'novo-cliente');
  const lista = estado.clientes;
  document.getElementById('conteudo').innerHTML = lista.length
    ? `<p class="muted" style="font-size:14px;margin:0 2px 12px">Toque em um cliente para registrar pedidos, entregas e pagamentos.</p>` +
      lista.map(c => `<div class="cartao"><a class="cliente-item" href="#c/${c.id}">
        <h3>${esc(c.nome)} ${c.ativo ? '' : '<span class="badge b-cinza">Link desativado</span>'}</h3>
        <div class="linha muted" style="font-size:13px">${esc([c.contato, c.telefone].filter(Boolean).join(' · ') || 'Sem contato cadastrado')}</div>
        <div class="meta">
          <span class="badge ${c.resumo.saldo > 0.004 ? 'b-ambar' : 'b-verde'}">${c.resumo.saldo > 0.004 ? 'Deve ' + brl(c.resumo.saldo) : 'Em dia'}</span>
          <span class="badge b-azul">${c.resumo.pedidos_abertos} pedido(s) em aberto</span>
          ${c.resumo.pagamentos_pendentes ? `<span class="badge b-vermelho">${c.resumo.pagamentos_pendentes} pagamento(s) para confirmar</span>` : ''}
        </div></a></div>`).join('')
    : `<div class="vazio"><div class="ico">🤝</div><strong>Nenhum cliente no portal ainda</strong><br>
        Cadastre o cliente para registrar pedidos e gerar o link de acompanhamento que você envia para ele.
        <br><br><button class="btn" data-acao="novo-cliente">Cadastrar cliente</button></div>`;
}

// ---------- Tela do cliente ----------
function ctxCliente() {
  const d = estado.dados;
  return {
    modo: 'gestao',
    abertos: estado.abertos,
    pagamentos: d.pagamentos,
    arquivoUrl: id => `/api/p/${encodeURIComponent(d.cliente.token)}/arquivos/${id}`,
    nomeEmpresa: h => h.autor_nome || 'Fernandes Têxtil',
    vistoAte: estado.destaqueAte,
    acoesPedido: p => `<div class="acoes">
        ${p.status !== 'Cancelado' && p.status !== 'Entregue' ? `<button class="btn" data-acao="nova-entrega" data-id="${p.id}">🚚 Registrar entrega</button>` : ''}
        <button class="btn btn-sec" data-acao="status" data-id="${p.id}">Mudar status</button>
        ${p.status !== 'Cancelado' ? `<button class="btn btn-sec" data-acao="novo-pagamento" data-id="${p.id}">💲 Pagamento</button>` : ''}
        <button class="btn btn-sec" data-acao="editar-pedido" data-id="${p.id}">Editar</button>
        ${USUARIO.perfil === 'admin' ? `<button class="btn btn-perigo" data-acao="excluir-pedido" data-id="${p.id}">Excluir</button>` : ''}
      </div>`,
    acoesPagamento: g => `<div class="acoes">
        ${g.status === 'Aguardando confirmação' ? `<button class="btn btn-ok" data-acao="pag-status" data-status="Confirmado" data-id="${g.id}">✓ Confirmar</button>
          <button class="btn btn-perigo" data-acao="pag-status" data-status="Recusado" data-id="${g.id}">Recusar</button>` : ''}
        ${g.status === 'Recusado' ? `<button class="btn btn-sec btn-peq" data-acao="pag-status" data-status="Confirmado" data-id="${g.id}">Confirmar mesmo assim</button>` : ''}
        <button class="btn btn-sec btn-peq" data-acao="excluir-pagamento" data-id="${g.id}">Excluir</button>
      </div>`
  };
}

function renderCliente() {
  const d = estado.dados;
  if (!d) return;
  topo(d.cliente.nome, 'Portal do Cliente', true);
  const ultimo = d.historico[0] ? d.historico[0].id : 0;
  if (estado.aba === 'historico') {
    estado.vistoAte = ultimo;
    local.gravar(chaveVisto(estado.clienteId), ultimo);
  }
  const novidades = d.historico.filter(h => h.id > (estado.vistoAte ?? Infinity) && h.autor === 'cliente').length;
  const c = ctxCliente();

  const avisoProduto = !d.produtos.some(p => p.ativo)
    ? `<div class="cartao" style="padding:14px"><strong>Cadastre o produto deste cliente</strong>
        <p class="muted" style="font-size:14px;margin:4px 0 10px">Assim os pedidos já vêm com o nome e o preço preenchidos.</p>
        <button class="btn btn-bloco" data-acao="produtos">Cadastrar produto</button></div>` : '';

  const compartilhar = `<div class="cartao" style="padding:12px 14px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1;min-width:0"><strong style="font-size:14px">Link de acompanhamento</strong>
          <div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(linkCliente(d.cliente.token))}</div></div>
        <button class="btn btn-peq" data-acao="compartilhar">Enviar</button>
      </div></div>`;

  let corpo;
  if (estado.aba === 'pedidos') {
    corpo = d.pedidos.length
      ? d.pedidos.map(p => pedidoHTML(p, c)).join('')
      : '<div class="vazio"><div class="ico">📦</div>Nenhum pedido ainda.<br>Toque em <strong>Novo pedido</strong> para registrar o primeiro.</div>';
  } else if (estado.aba === 'pagamentos') {
    const pend = d.pagamentos.filter(g => g.status === 'Aguardando confirmação');
    const outros = d.pagamentos.filter(g => g.status !== 'Aguardando confirmação');
    corpo = (pend.length ? `<div class="secao-titulo">Para confirmar</div>${pend.map(g => pagamentoHTML(g, c)).join('')}<div class="secao-titulo">Todos os pagamentos</div>` : '') +
      (outros.length ? outros.map(g => pagamentoHTML(g, c)).join('') : (pend.length ? '' : '<div class="vazio"><div class="ico">💳</div>Nenhum pagamento registrado.</div>'));
  } else {
    corpo = `<form class="mensagem-box" id="form-mensagem">
        <textarea name="mensagem" rows="1" placeholder="Mensagem para o cliente..." maxlength="1000"></textarea>
        <button class="btn" type="submit">Enviar</button>
      </form>${historicoHTML(d.historico, c)}`;
  }

  document.getElementById('conteudo').innerHTML = compartilhar + avisoProduto + resumoHTML(d.resumo) +
    abasHTML(estado.aba, novidades, d.resumo.pagamentos_pendentes) + corpo;
  if (estado.aba === 'pedidos') fab('Novo pedido', 'novo-pedido');
  else if (estado.aba === 'pagamentos') fab('Registrar pagamento', 'novo-pagamento');
  else fab(null);
  if (estado.aba === 'historico') estado.destaqueAte = ultimo;
}

// ---------- Formulários ----------
function enviarFolha(folha, seletor, fn, msgOk) {
  folha.querySelector(seletor).addEventListener('submit', async ev => {
    ev.preventDefault();
    const form = ev.target;
    await comBotao(form.querySelector('[type=submit]'), async () => {
      try {
        await fn(form);
        fecharFolha();
        if (msgOk) toast(msgOk);
        await carregar();
      } catch (e) { toast(e.message, 'erro'); }
    });
  });
}

function formClienteHTML(c = {}) {
  return `<form id="form-cliente">
    <div class="campo"><label>Nome do cliente / empresa</label><input name="nome" required value="${esc(c.nome || '')}" autocomplete="off"></div>
    <div class="campo"><label>Pessoa de contato</label><input name="contato" value="${esc(c.contato || '')}" autocomplete="off"></div>
    <div class="campo"><label>WhatsApp</label><input name="telefone" type="tel" inputmode="tel" placeholder="(00) 00000-0000" value="${esc(c.telefone || '')}"></div>
    <div class="campo"><label>Observações internas (o cliente não vê)</label><textarea name="observacoes">${esc(c.observacoes || '')}</textarea></div>
    ${c.id ? `<div class="campo"><label><input type="checkbox" name="ativo" ${c.ativo ? 'checked' : ''} style="width:auto;min-height:0;margin-right:6px">Link de acompanhamento ativo</label></div>` : ''}
    <button class="btn btn-bloco" type="submit">Salvar</button>
    <button class="btn btn-sec btn-bloco" type="button" data-fechar style="margin-top:8px">Cancelar</button>
  </form>`;
}

function itemFormHTML(produtos, item = {}) {
  const ativos = produtos.filter(p => p.ativo || p.id === item.produto_id);
  const selecionado = item.produto_id || (ativos[0] && !item.produto_nome ? ativos[0].id : '');
  const prod = ativos.find(p => p.id === selecionado);
  return `<div class="item-form">
    <button type="button" class="remover" data-remover-item aria-label="Remover item">×</button>
    <div class="campo"><label>Produto</label><select name="produto_id">
      ${ativos.map(p => `<option value="${p.id}" data-preco="${p.preco}" data-unidade="${esc(p.unidade)}" ${p.id === selecionado ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
      <option value="" ${!selecionado ? 'selected' : ''}>Outro (digitar nome)</option>
    </select></div>
    <div class="campo campo-nome ${selecionado ? 'oculto' : ''}"><label>Nome do produto</label><input name="produto_nome" value="${esc(selecionado ? '' : item.produto_nome || '')}"></div>
    <div class="duas">
      <div class="campo"><label>Quantidade (<span class="un">${esc(item.unidade || (prod && prod.unidade) || 'peças')}</span>)</label><input name="quantidade" inputmode="decimal" required value="${numParaCampo(item.quantidade)}"></div>
      <div class="campo"><label>Preço unitário (R$)</label><input name="preco_unitario" inputmode="decimal" required value="${precoParaCampo(item.preco_unitario ?? (prod ? prod.preco : ''))}"></div>
    </div>
  </div>`;
}

function abrirFormPedido(p) {
  const d = estado.dados;
  const itens = p ? p.itens : [{}];
  const folha = abrirFolha(`<h2>${p ? `Editar pedido #${p.numero}` : 'Novo pedido'}</h2>
    <p class="ajuda">${p ? 'As alterações aparecem no histórico do cliente.' : `Pedido de ${esc(d.cliente.nome)}. O cliente acompanha tudo pelo link.`}</p>
    <form id="form-pedido">
      <div class="duas">
        <div class="campo"><label>Data do pedido</label><input type="date" name="data_pedido" value="${p ? p.data_pedido : hojeISO()}" required></div>
        <div class="campo"><label>Previsão de entrega</label><input type="date" name="previsao_entrega" value="${p && p.previsao_entrega ? p.previsao_entrega : ''}"></div>
      </div>
      <div id="itens">${itens.map(i => itemFormHTML(d.produtos, i)).join('')}</div>
      <button type="button" class="btn btn-sec btn-bloco" id="addItem" style="margin-bottom:12px">＋ Adicionar outro produto</button>
      <div class="campo"><label>Observações (o cliente vê)</label><textarea name="observacoes" placeholder="Cores, tamanhos, embalagem...">${esc(p ? p.observacoes || '' : '')}</textarea></div>
      <div class="total-form"><span>Total</span><span class="num" id="totalPedido">R$ 0,00</span></div>
      <button class="btn btn-bloco" type="submit">${p ? 'Salvar alterações' : 'Registrar pedido'}</button>
      <button class="btn btn-sec btn-bloco" type="button" data-fechar style="margin-top:8px">Cancelar</button>
    </form>`);

  const caixa = folha.querySelector('#itens');
  const total = () => {
    let t = 0;
    caixa.querySelectorAll('.item-form').forEach(el => {
      t += (lerNumero(el.querySelector('[name=quantidade]').value) || 0) * (lerNumero(el.querySelector('[name=preco_unitario]').value) || 0);
    });
    folha.querySelector('#totalPedido').textContent = brl(t);
  };
  caixa.addEventListener('input', total);
  caixa.addEventListener('change', e => {
    if (e.target.name !== 'produto_id') return;
    const bloco = e.target.closest('.item-form');
    const op = e.target.selectedOptions[0];
    bloco.querySelector('.campo-nome').classList.toggle('oculto', !!e.target.value);
    if (e.target.value) {
      bloco.querySelector('[name=preco_unitario]').value = precoParaCampo(op.dataset.preco);
      bloco.querySelector('.un').textContent = op.dataset.unidade;
    }
    total();
  });
  caixa.addEventListener('click', e => {
    if (!e.target.closest('[data-remover-item]')) return;
    if (caixa.querySelectorAll('.item-form').length > 1) e.target.closest('.item-form').remove();
    else toast('O pedido precisa de pelo menos um item', 'erro');
    total();
  });
  folha.querySelector('#addItem').addEventListener('click', () => {
    caixa.insertAdjacentHTML('beforeend', itemFormHTML(d.produtos));
    total();
  });
  total();

  enviarFolha(folha, '#form-pedido', async form => {
    const lista = [...caixa.querySelectorAll('.item-form')].map(el => {
      const sel = el.querySelector('[name=produto_id]');
      return {
        produto_id: sel.value ? Number(sel.value) : null,
        produto_nome: sel.value ? sel.selectedOptions[0].textContent : el.querySelector('[name=produto_nome]').value,
        unidade: sel.value ? sel.selectedOptions[0].dataset.unidade : 'peças',
        quantidade: lerNumero(el.querySelector('[name=quantidade]').value),
        preco_unitario: lerNumero(el.querySelector('[name=preco_unitario]').value)
      };
    });
    const corpo = {
      data_pedido: form.data_pedido.value,
      previsao_entrega: form.previsao_entrega.value || null,
      observacoes: form.observacoes.value,
      itens: lista
    };
    if (p) await api(`/pedidos/${p.id}`, { metodo: 'PUT', corpo });
    else {
      const r = await api(`/clientes/${estado.clienteId}/pedidos`, { metodo: 'POST', corpo });
      estado.abertos.add(r.id);
    }
  }, p ? 'Pedido atualizado' : 'Pedido registrado — o cliente já pode ver');
}

function abrirFormProduto(prod) {
  const folha = abrirFolha(`<h2>${prod ? 'Editar produto' : 'Novo produto'}</h2>
    <p class="ajuda">Produto vendido para ${esc(estado.dados.cliente.nome)}.</p>
    <form id="form-produto">
      <div class="campo"><label>Nome do produto</label><input name="nome" required value="${esc(prod ? prod.nome : '')}" placeholder="Ex.: Toalha de banho 70x140"></div>
      <div class="campo"><label>Descrição (opcional)</label><input name="descricao" value="${esc(prod ? prod.descricao || '' : '')}" placeholder="Cor, gramatura, acabamento..."></div>
      <div class="duas">
        <div class="campo"><label>Preço (R$)</label><input name="preco" inputmode="decimal" required value="${prod ? precoParaCampo(prod.preco) : ''}"></div>
        <div class="campo"><label>Unidade</label><input name="unidade" value="${esc(prod ? prod.unidade : 'peças')}" placeholder="peças, kg, metros"></div>
      </div>
      ${prod ? `<div class="campo"><label><input type="checkbox" name="ativo" ${prod.ativo ? 'checked' : ''} style="width:auto;min-height:0;margin-right:6px">Disponível para novos pedidos</label></div>` : ''}
      <button class="btn btn-bloco" type="submit">Salvar produto</button>
      <button class="btn btn-sec btn-bloco" type="button" data-acao="produtos" style="margin-top:8px">Voltar</button>
    </form>`);
  enviarFolha(folha, '#form-produto', async form => {
    const corpo = { nome: form.nome.value, descricao: form.descricao.value, preco: lerNumero(form.preco.value), unidade: form.unidade.value };
    if (prod) await api(`/produtos/${prod.id}`, { metodo: 'PUT', corpo: { ...corpo, ativo: form.ativo.checked } });
    else await api(`/clientes/${estado.clienteId}/produtos`, { metodo: 'POST', corpo });
  }, 'Produto salvo');
}

async function compartilharLink() {
  const d = estado.dados;
  const url = linkCliente(d.cliente.token);
  const texto = `Olá${d.cliente.contato ? ' ' + d.cliente.contato : ''}! Acompanhe seus pedidos, entregas e pagamentos com a Fernandes Têxtil em tempo real por este link: ${url}`;
  const fone = (d.cliente.telefone || '').replace(/\D/g, '');
  const wa = `https://wa.me/${fone ? (fone.length <= 11 ? '55' + fone : fone) : ''}?text=${encodeURIComponent(texto)}`;
  const folha = abrirFolha(`<h2>Link do cliente</h2>
    <p class="ajuda">Quem tiver este link vê os pedidos, entregas e pagamentos de ${esc(d.cliente.nome)} — sem precisar de senha.</p>
    <div class="link-box">${esc(url)}</div>
    <div class="acoes" style="flex-direction:column">
      <a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>
      <button class="btn btn-sec" id="copiarLink">Copiar link</button>
      ${navigator.share ? '<button class="btn btn-sec" id="compartilharNativo">Compartilhar...</button>' : ''}
      <a class="btn btn-sec" href="${esc(url)}" target="_blank" rel="noopener">Ver como o cliente vê</a>
    </div>`);
  folha.querySelector('#copiarLink').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copiado!'); }
    catch (e) { prompt('Copie o link:', url); }
  });
  const nativo = folha.querySelector('#compartilharNativo');
  if (nativo) nativo.addEventListener('click', () => navigator.share({ title: 'Acompanhe seus pedidos', text: texto }).catch(() => {}));
}

// ---------- Ações ----------
const acoes = {
  voltar() {
    if (estado.clienteId) location.hash = '';
    else location.href = '/index.html';
  },
  aba(el) {
    if (el.dataset.aba === 'historico' && estado.aba !== 'historico') estado.destaqueAte = estado.vistoAte;
    estado.aba = el.dataset.aba;
    renderCliente();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  alternar(el) {
    const id = Number(el.dataset.id);
    if (estado.abertos.has(id)) estado.abertos.delete(id); else estado.abertos.add(id);
    renderCliente();
  },
  'novo-cliente'() {
    const folha = abrirFolha(`<h2>Novo cliente</h2><p class="ajuda">Depois de salvar, você recebe o link de acompanhamento para enviar a ele.</p>${formClienteHTML()}`);
    folha.querySelector('#form-cliente').addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = ev.target;
      await comBotao(f.querySelector('[type=submit]'), async () => {
        try {
          const c = await api('/clientes', { metodo: 'POST', corpo: { nome: f.nome.value, contato: f.contato.value, telefone: f.telefone.value, observacoes: f.observacoes.value } });
          fecharFolha();
          toast('Cliente cadastrado!');
          location.hash = `#c/${c.id}`;
        } catch (e) { toast(e.message, 'erro'); }
      });
    });
  },
  config() {
    const d = estado.dados;
    abrirFolha(`<h2>${esc(d.cliente.nome)}</h2><p class="ajuda">Configurações deste cliente.</p>
      <div class="acoes" style="flex-direction:column;margin-top:0">
        <button class="btn" data-acao="compartilhar">🔗 Enviar link de acompanhamento</button>
        <button class="btn btn-sec" data-acao="produtos">🧵 Produtos e preços</button>
        <button class="btn btn-sec" data-acao="editar-cliente">✏️ Editar dados do cliente</button>
        <button class="btn btn-sec" data-acao="novo-link">🔄 Gerar novo link (desativa o atual)</button>
        <button class="btn btn-sec" data-fechar>Fechar</button>
      </div>`);
  },
  compartilhar: compartilharLink,
  'editar-cliente'() {
    const c = estado.dados.cliente;
    const folha = abrirFolha(`<h2>Editar cliente</h2>${formClienteHTML(c)}`);
    enviarFolha(folha, '#form-cliente', f => api(`/clientes/${c.id}`, { metodo: 'PUT', corpo: {
      nome: f.nome.value, contato: f.contato.value, telefone: f.telefone.value, observacoes: f.observacoes.value, ativo: f.ativo.checked
    } }), 'Dados salvos');
  },
  async 'novo-link'() {
    if (!confirm('Gerar um novo link? O link atual para de funcionar e você precisará enviar o novo ao cliente.')) return;
    try {
      await api(`/clientes/${estado.clienteId}/novo-link`, { metodo: 'POST' });
      await carregar();
      compartilharLink();
    } catch (e) { toast(e.message, 'erro'); }
  },
  produtos() {
    const d = estado.dados;
    abrirFolha(`<h2>Produtos e preços</h2><p class="ajuda">Produtos que você vende para ${esc(d.cliente.nome)}. O preço vem preenchido nos novos pedidos.</p>
      ${d.produtos.length ? d.produtos.map(p => `<div class="produto-linha">
        <div class="info"><strong>${esc(p.nome)}</strong> ${p.ativo ? '' : '<span class="badge b-cinza">Inativo</span>'}
          <div class="muted" style="font-size:13px">${brl(p.preco)} por ${esc(p.unidade)}${p.descricao ? ' · ' + esc(p.descricao) : ''}</div></div>
        <button class="btn btn-sec btn-peq" data-acao="editar-produto" data-id="${p.id}">Editar</button></div>`).join('')
        : '<div class="vazio-mini">Nenhum produto cadastrado.</div>'}
      <div class="acoes" style="flex-direction:column">
        <button class="btn" data-acao="novo-produto">＋ Novo produto</button>
        <button class="btn btn-sec" data-fechar>Fechar</button>
      </div>`);
  },
  'novo-produto'() { abrirFormProduto(null); },
  'editar-produto'(el) { abrirFormProduto(estado.dados.produtos.find(p => p.id === Number(el.dataset.id))); },
  'novo-pedido'() { abrirFormPedido(null); },
  'editar-pedido'(el) { abrirFormPedido(estado.dados.pedidos.find(p => p.id === Number(el.dataset.id))); },
  status(el) {
    const p = estado.dados.pedidos.find(x => x.id === Number(el.dataset.id));
    const folha = abrirFolha(`<h2>Status do pedido #${p.numero}</h2>
      <p class="ajuda">O cliente vê a mudança na hora. "Entregue parcialmente" e "Entregue" também mudam sozinhos ao registrar entregas.</p>
      <div class="acoes" style="flex-direction:column;margin-top:0">
        ${estado.dados.status_pedido.map(s => `<button class="btn ${s === p.status ? '' : 'btn-sec'}" data-novo-status="${esc(s)}">${esc(s)}${s === p.status ? ' (atual)' : ''}</button>`).join('')}
      </div>`);
    folha.addEventListener('click', async e => {
      const b = e.target.closest('[data-novo-status]');
      if (!b) return;
      const s = b.dataset.novoStatus;
      if (s === p.status) return fecharFolha();
      if (s === 'Cancelado' && !confirm(`Cancelar o pedido #${p.numero}?`)) return;
      try {
        await api(`/pedidos/${p.id}`, { metodo: 'PUT', corpo: { status: s } });
        fecharFolha();
        toast(`Pedido #${p.numero}: ${s}`);
        await carregar();
      } catch (err) { toast(err.message, 'erro'); }
    });
  },
  async 'excluir-pedido'(el) {
    const p = estado.dados.pedidos.find(x => x.id === Number(el.dataset.id));
    if (!confirm(`Excluir o pedido #${p.numero} com suas entregas e anexos? Para manter o registro, prefira mudar o status para "Cancelado".`)) return;
    try { await api(`/pedidos/${p.id}`, { metodo: 'DELETE' }); toast('Pedido excluído'); await carregar(); }
    catch (e) { toast(e.message, 'erro'); }
  },
  'nova-entrega'(el) {
    const p = estado.dados.pedidos.find(x => x.id === Number(el.dataset.id));
    const falta = Math.max(0, p.qtd_total - p.qtd_entregue);
    const un = unidadeDe(p);
    const folha = abrirFolha(`<h2>Entrega — pedido #${p.numero}</h2>
      <p class="ajuda">Faltam ${qtd(falta)} ${esc(un)} de ${qtd(p.qtd_total)}. Anexe a foto do canhoto ou da nota assinada.</p>
      <form id="form-entrega">
        <div class="duas">
          <div class="campo"><label>Quantidade (${esc(un)})</label><input name="quantidade" inputmode="decimal" required value="${numParaCampo(falta)}"></div>
          <div class="campo"><label>Data</label><input type="date" name="data" value="${hojeISO()}" required></div>
        </div>
        <div class="campo"><label>Observação</label><textarea name="observacao" placeholder="Nota fiscal, transportadora, quem recebeu..."></textarea></div>
        ${campoArquivoHTML('Comprovante de entrega (foto ou PDF)')}
        <button class="btn btn-bloco" type="submit">Registrar entrega</button>
        <button class="btn btn-sec btn-bloco" type="button" data-fechar style="margin-top:8px">Cancelar</button>
      </form>`);
    enviarFolha(folha, '#form-entrega', async form => {
      const fd = await dadosDoForm(form);
      fd.set('quantidade', lerNumero(form.quantidade.value));
      await api(`/pedidos/${p.id}/entregas`, { metodo: 'POST', corpo: fd });
    }, 'Entrega registrada');
  },
  async 'excluir-entrega'(el) {
    if (!confirm('Excluir esta entrega e seus comprovantes?')) return;
    try { await api(`/entregas/${el.dataset.id}`, { metodo: 'DELETE' }); toast('Entrega excluída'); await carregar(); }
    catch (e) { toast(e.message, 'erro'); }
  },
  'novo-pagamento'(el) {
    const folha = abrirFolha(formPagamentoHTML(estado.dados, {
      titulo: 'Registrar pagamento recebido',
      ajuda: 'Entra como confirmado e abate do saldo do cliente.',
      pedidoId: el.dataset.id ? Number(el.dataset.id) : null
    }));
    enviarFolha(folha, '#form-pagamento', async form => {
      const fd = await dadosDoForm(form);
      fd.set('valor', lerNumero(form.valor.value));
      await api(`/clientes/${estado.clienteId}/pagamentos`, { metodo: 'POST', corpo: fd });
    }, 'Pagamento registrado');
  },
  async 'pag-status'(el) {
    const status = el.dataset.status;
    let motivo = '';
    if (status === 'Recusado') {
      motivo = prompt('Motivo da recusa (o cliente verá):', 'Valor não identificado na conta');
      if (motivo === null) return;
    }
    try {
      await api(`/pagamentos/${el.dataset.id}/status`, { metodo: 'PUT', corpo: { status, motivo } });
      toast(status === 'Confirmado' ? 'Pagamento confirmado' : 'Pagamento recusado');
      await carregar();
    } catch (e) { toast(e.message, 'erro'); }
  },
  async 'excluir-pagamento'(el) {
    if (!confirm('Excluir este pagamento e seus comprovantes?')) return;
    try { await api(`/pagamentos/${el.dataset.id}`, { metodo: 'DELETE' }); toast('Pagamento excluído'); await carregar(); }
    catch (e) { toast(e.message, 'erro'); }
  },
  anexar(el) {
    const tipo = el.dataset.tipo;
    const id = Number(el.dataset.id);
    const folha = abrirFolha(formAnexoHTML(tituloAnexo(estado.dados, tipo, id)));
    enviarFolha(folha, '#form-anexo', async form => {
      const fd = await dadosDoForm(form);
      fd.set('tipo', tipo);
      fd.set('ref_id', id);
      await api(`/clientes/${estado.clienteId}/anexos`, { metodo: 'POST', corpo: fd });
    }, 'Arquivo anexado');
  },
  'ver-anexo'(el) {
    const id = Number(el.dataset.id);
    const d = estado.dados;
    const todos = [...d.pedidos.flatMap(p => p.anexos), ...d.entregas.flatMap(e => e.anexos), ...d.pagamentos.flatMap(g => g.anexos)];
    const a = todos.find(x => x.id === id);
    const url = ctxCliente().arquivoUrl(id);
    const img = (a.mime || '').startsWith('image/') && !/heic|heif/.test(a.mime);
    const folha = abrirFolha(`<h2>${esc(a.nome_original || 'Arquivo')}</h2>
      <p class="ajuda">Enviado ${a.enviado_por === 'cliente' ? 'pelo cliente' : 'pela Fernandes Têxtil'} em ${lerTS(a.created_at).toLocaleString('pt-BR')}</p>
      ${img ? `<img src="${url}" alt="" style="width:100%;border-radius:12px;margin-bottom:12px">` : ''}
      <div class="acoes" style="flex-direction:column">
        <a class="btn" href="${url}" target="_blank" rel="noopener">Abrir</a>
        <button class="btn btn-perigo" id="excluirAnexo">Excluir arquivo</button>
        <button class="btn btn-sec" data-fechar>Fechar</button>
      </div>`);
    folha.querySelector('#excluirAnexo').addEventListener('click', async () => {
      if (!confirm('Excluir este arquivo?')) return;
      try { await api(`/anexos/${id}`, { metodo: 'DELETE' }); fecharFolha(); toast('Arquivo excluído'); await carregar(); }
      catch (e) { toast(e.message, 'erro'); }
    });
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-acao]');
  if (el && acoes[el.dataset.acao]) { e.preventDefault(); acoes[el.dataset.acao](el); }
});

document.addEventListener('submit', async e => {
  if (e.target.id !== 'form-mensagem') return;
  e.preventDefault();
  const form = e.target;
  const msg = form.mensagem.value.trim();
  if (!msg) return;
  await comBotao(form.querySelector('[type=submit]'), async () => {
    try {
      await api(`/clientes/${estado.clienteId}/mensagens`, { metodo: 'POST', corpo: { mensagem: msg } });
      form.mensagem.value = '';
      await carregar();
    } catch (err) { toast(err.message, 'erro'); }
  });
});

// ---------- Tempo real ----------
let recarga;
tempoReal(`/api/portal/eventos?t=${encodeURIComponent(JWT)}`, info => {
  // Avisa sempre que o cliente fizer algo (mesmo estando em outra tela)
  if (info.autor === 'cliente' && info.descricao) {
    toast('📩 ' + info.descricao, 'info');
    if (navigator.vibrate) navigator.vibrate(120);
  }
  const relevante = !info.cliente_id || !estado.clienteId || info.cliente_id === estado.clienteId;
  if (!relevante) return;
  clearTimeout(recarga);
  recarga = setTimeout(carregar, 250);
}, indicadorAoVivo);

rota();
