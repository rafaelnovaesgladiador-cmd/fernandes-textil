// ===== Fernandes Têxtil — painel do admin =====
const JWT = (() => { try { return localStorage.getItem('ft_token'); } catch (e) { return null; } })();
if (!JWT) location.replace('/login.html');

function sair() {
  try { localStorage.removeItem('ft_token'); localStorage.removeItem('ft_usuario'); } catch (e) { /* ok */ }
  fetch('/api/auth/sair', { method: 'POST' }).finally(() => location.replace('/login.html'));
}
const api = (url, opts = {}) => requisicao('/api/op' + url, { ...opts, cabecalhos: { Authorization: 'Bearer ' + JWT } })
  .catch(e => { if (e.status === 401 || (e.status === 403 && /senha/i.test(e.message))) sair(); throw e; });

const PAGINAS = ['inicio', 'pedidos', 'estoque', 'financeiro', 'ajustes', 'atividade'];
const estado = {
  d: null,
  pagina: 'inicio',
  filtroPedidos: 'abertos',
  abaFin: 'cliente',
  detalhe: null,                      // folha de detalhe aberta: { tipo: 'pedido' | 'compra', id }
  vistoAte: local.ler('adm_visto', null),
  destaqueAte: null
};
const arquivoUrl = id => `/api/op/arquivos/${id}`;
const ctxAnexos = { urlArquivo: arquivoUrl, gestao: true };
const FORA = ['Solicitado', 'Cancelado'];

// ---------- Navegação ----------
function irPara() {
  const p = (location.hash.slice(1) || 'inicio').split('?')[0];
  const nova = PAGINAS.includes(p) ? p : 'inicio';
  estado.detalhe = null;
  fecharFolha(true);
  if (nova === 'atividade' && estado.pagina !== 'atividade') estado.destaqueAte = estado.vistoAte;
  estado.pagina = nova;
  render();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', irPara);

async function carregar() {
  try {
    estado.d = await api('/painel');
    if (estado.vistoAte == null) {
      estado.vistoAte = estado.d.historico[0] ? estado.d.historico[0].id : 0;
      local.gravar('adm_visto', estado.vistoAte);
    }
    render();
    renderDetalhe();
  } catch (e) {
    if (!estado.d) document.getElementById('conteudo').innerHTML = vazioHTML('alerta', 'Não foi possível carregar', esc(e.message), '<button class="btn" onclick="location.reload()">Tentar novamente</button>');
    else toast(e.message, 'erro');
  }
}

function render() {
  const d = estado.d;
  if (!d) return;
  const r = d.resumo;
  if (estado.pagina === 'atividade') {
    estado.vistoAte = d.historico[0] ? d.historico[0].id : 0;
    local.gravar('adm_visto', estado.vistoAte);
  }
  const novidades = d.historico.filter(h => h.id > estado.vistoAte && h.autor === 'cliente').length;
  montarNavegacao({
    ativo: estado.pagina,
    itens: [
      { id: 'inicio', rotulo: 'Início', icone: 'inicio' },
      { id: 'pedidos', rotulo: 'Pedidos', icone: 'pedidos', badge: r.pedidos_solicitados },
      { id: 'estoque', rotulo: 'Estoque', icone: 'estoque' },
      { id: 'financeiro', rotulo: 'Financeiro', icone: 'financeiro', badge: r.pagamentos_pendentes },
      { id: 'ajustes', rotulo: 'Ajustes', icone: 'ajustes' },
      { id: 'atividade', rotulo: 'Atividade', icone: 'atividade', badge: novidades, soLateral: true }
    ]
  });
  const sub = d.cliente ? `Cliente: ${d.cliente.nome}` : 'Controle da operação';
  document.getElementById('marcaSub').textContent = sub;
  document.getElementById('marcaSubMovel').textContent = sub;
  const paginas = { inicio: pgInicio, pedidos: pgPedidos, estoque: pgEstoque, financeiro: pgFinanceiro, ajustes: pgAjustes, atividade: pgAtividade };
  document.getElementById('conteudo').innerHTML = paginas[estado.pagina]();
  document.title = `${{ inicio: 'Visão geral', pedidos: 'Pedidos', estoque: 'Estoque', financeiro: 'Financeiro', ajustes: 'Ajustes', atividade: 'Atividade' }[estado.pagina]} — Fernandes Têxtil`;
  if (estado.pagina === 'atividade') estado.destaqueAte = estado.vistoAte;
}

const cab = (titulo, sub = '', acoes = '', sobre = 'Fernandes Têxtil') => `<header class="cab"><div>
    ${sobre ? `<p class="sobre">${esc(sobre)}</p>` : ''}<h1>${esc(titulo)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>
    ${acoes ? `<div class="cab-acoes">${acoes}</div>` : ''}</header>`;
const kpi = ({ rot, ico, tom, val, sub, ir }) => `<button class="card kpi" ${ir ? `data-ir="${ir}"` : ''}>
    <div class="rot"><span class="ico ${tom}">${icone(ico, 17)}</span>${esc(rot)}</div>
    <div class="val">${val}</div><div class="sub">${sub}</div></button>`;
const capital = s => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Início ----------
function pgInicio() {
  const d = estado.d;
  const r = d.resumo;
  const hoje = capital(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
  let h = cab('Visão geral', hoje, `
      <button class="btn btn-cinza" data-acao="nova-entrada">${icone('entrada', 18)} Entrada</button>
      <button class="btn" data-acao="novo-pedido">${icone('mais', 18)} Pedido</button>`, '');

  const passos = [];
  if (!d.cliente) passos.push(['Cadastre o seu cliente', 'editar-cliente']);
  if (!d.produtos.length) passos.push(['Cadastre os produtos e as cores', 'novo-produto']);
  if (!d.fornecedor.nome) passos.push(['Informe o fornecedor', 'editar-fornecedor']);
  if (d.cliente && d.produtos.length && !d.pedidos.length) passos.push(['Envie o link para o cliente montar o pedido', 'compartilhar']);
  if (passos.length) {
    h += `<div class="lista" style="margin-bottom:18px"><div class="item-bloco"><b style="font-size:17px">Comece por aqui</b><p class="muted" style="font-size:14px">Configure a operação em poucos passos.</p></div>
      ${passos.map(([t, a]) => `<button class="item" data-acao="${a}"><span class="ico-q t-azul">${icone('mais', 17)}</span><span class="meio tit">${esc(t)}</span><span class="chev">${icone('seta', 16)}</span></button>`).join('')}</div>`;
  }

  const avisos = [];
  if (r.pedidos_solicitados) avisos.push(`<button class="aviso aviso-amarelo" data-acao="ir-aprovar">${icone('pedidos')}<span>${r.pedidos_solicitados} pedido(s) do cliente para aprovar</span>${icone('seta', 16)}</button>`);
  if (r.pagamentos_pendentes) avisos.push(`<button class="aviso aviso-azul" data-ir="#financeiro">${icone('receber')}<span>${r.pagamentos_pendentes} pagamento(s) informado(s) pelo cliente para confirmar</span>${icone('seta', 16)}</button>`);
  if (r.falta_comprar > 0) avisos.push(`<button class="aviso aviso-laranja" data-ir="#estoque">${icone('alerta')}<span>Faltam ${qtd(r.falta_comprar)} peças em estoque para atender os pedidos</span>${icone('seta', 16)}</button>`);
  if (avisos.length) h += `<div class="avisos">${avisos.join('')}</div>`;

  h += `<div class="grade">
    ${kpi({ rot: 'A entregar', ico: 'caminhao', tom: 't-laranja', val: `${qtd(r.qtd_a_entregar)} <small style="font-size:16px;color:var(--texto-2)">peças</small>`, sub: `${brl(r.valor_a_entregar)} em mercadoria`, ir: '#pedidos' })}
    ${kpi({ rot: 'A receber do cliente', ico: 'receber', tom: 't-verde', val: brl(r.a_receber), sub: `Recebido ${brl(r.recebido)} de ${brl(r.total_vendas)}`, ir: '#financeiro' })}
    ${kpi({ rot: 'A pagar ao fornecedor', ico: 'pagar', tom: 't-vermelho', val: brl(r.a_pagar), sub: `Pago ${brl(r.pago_fornecedor)} de ${brl(r.total_compras)}`, ir: '#financeiro-fornecedor' })}
    ${kpi({ rot: 'Comissão disponível', ico: 'comissao', tom: 't-roxo', val: brl(r.comissao_disponivel), sub: `Gerada ${brl(r.comissao_gerada)} · retirada ${brl(r.retirado)}`, ir: '#financeiro-comissao' })}
  </div>
  <div class="mini-stats">
    <div><b>${qtd(r.estoque_total)}</b><span>Em estoque</span></div>
    <div><b style="${r.falta_comprar > 0 ? 'color:var(--laranja)' : ''}">${qtd(r.falta_comprar)}</b><span>Falta comprar</span></div>
    <div><b>${r.pedidos_abertos}</b><span>Pedidos em andamento</span></div>
    <div><b>${brl(r.caixa)}</b><span>Em caixa</span></div>
  </div>`;

  const ativos = d.produtos.filter(p => p.ativo);
  const estoqueHTML = ativos.length ? ativos.map(p => {
    const linhas = d.estoque.filter(l => l.produto_id === p.id);
    return `<div class="item-bloco"><b>${esc(p.nome)}</b><div class="est-cores" style="margin-top:10px">
      ${linhas.map(l => `<span class="est-chip ${l.saldo < 0 ? 'neg' : ''}">${l.cor ? dot(l.hex, 14) + esc(l.cor) : 'Estoque'} <b>${qtd(l.saldo)}</b></span>`).join('')}</div></div>`;
  }).join('') : '<div class="item-bloco muted">Cadastre os produtos em Ajustes.</div>';

  const andamento = d.pedidos.filter(p => !['Entregue', 'Cancelado'].includes(p.status)).slice(0, 6);
  h += `<div class="duas-col">
    <section><div class="secao"><h2>Estoque por cor</h2><a class="lnk" href="#estoque">Ver estoque ${icone('seta', 14)}</a></div>
      <div class="lista">${estoqueHTML}</div></section>
    <section><div class="secao"><h2>Pedidos em andamento</h2><a class="lnk" href="#pedidos">Ver todos ${icone('seta', 14)}</a></div>
      <div class="lista">${andamento.length ? andamento.map(linhaPedido).join('') : '<div class="item-bloco muted">Nenhum pedido em andamento.</div>'}</div></section>
  </div>
  <div class="secao"><h2>Atividade recente</h2><a class="lnk" href="#atividade">Ver tudo ${icone('seta', 14)}</a></div>
  ${historicoHTML(d.historico.slice(0, 6), { nomeAutor: h2 => h2.autor_nome || 'Fernandes Têxtil', privados: true })}`;
  return h;
}

// ---------- Pedidos ----------
function linhaPedido(p) {
  const aceito = !FORA.includes(p.status);
  return `<button class="item" data-acao="abrir-pedido" data-id="${p.id}">
    <div class="meio">
      <div class="tit">Pedido #${p.numero} ${pillStatus(p.status)}</div>
      <div class="det">${dataBR(p.data_pedido)} · ${resumoCoresHTML(p.itens)}</div>
      ${aceito ? `<div class="barra verde" style="margin-top:9px;max-width:260px"><i style="width:${pct(p.qtd_entregue, p.qtd_total).toFixed(1)}%"></i></div>` : ''}
    </div>
    <div class="dir"><b>${brl(p.valor_total)}</b><small>${aceito ? `${qtd(p.qtd_entregue)} de ${qtd(p.qtd_total)} entregues` : qtd(p.qtd_total) + ' peças'}</small></div>
    <span class="chev">${icone('seta', 16)}</span></button>`;
}

function pgPedidos() {
  const d = estado.d;
  // Depois de aprovar tudo, a lista volta para "Em aberto" em vez de ficar vazia
  if (estado.filtroPedidos === 'aprovar' && !d.resumo.pedidos_solicitados) estado.filtroPedidos = 'abertos';
  const filtros = {
    abertos: p => !['Entregue', 'Cancelado'].includes(p.status),
    aprovar: p => p.status === 'Solicitado',
    concluidos: p => ['Entregue', 'Cancelado'].includes(p.status),
    todos: () => true
  };
  const lista = d.pedidos.filter(filtros[estado.filtroPedidos]);
  const b = (id, rot, n) => `<button data-acao="filtro-pedidos" data-f="${id}" class="${estado.filtroPedidos === id ? 'on' : ''}">${rot}${n ? `<em class="badge">${n}</em>` : ''}</button>`;
  return cab('Pedidos', `${d.resumo.pedidos_abertos} em andamento · ${qtd(d.resumo.qtd_a_entregar)} peças a entregar`, `<button class="btn" data-acao="novo-pedido">${icone('mais', 18)} Novo pedido</button>`) +
    `<div class="barra-filtros"><div class="seg">${b('abertos', 'Em aberto')}${b('aprovar', 'Para aprovar', d.resumo.pedidos_solicitados)}${b('concluidos', 'Concluídos')}${b('todos', 'Todos')}</div></div>` +
    (lista.length ? `<div class="lista">${lista.map(linhaPedido).join('')}</div>`
      : vazioHTML('pedidos', estado.filtroPedidos === 'aprovar' ? 'Nada para aprovar' : 'Nenhum pedido aqui', 'Os pedidos que o cliente montar pelo link aparecem em "Para aprovar".'));
}

function detalhePedidoHTML(p) {
  const d = estado.d;
  const recs = d.recebimentos.filter(g => g.pedido_id === p.id);
  const margemPct = p.valor_total > 0 ? (p.comissao / p.valor_total) * 100 : 0;
  let acoes;
  if (p.status === 'Solicitado') {
    acoes = `<button class="btn btn-ok" data-acao="aceitar-pedido" data-id="${p.id}">${icone('check', 18)} Aceitar pedido</button>
      <button class="btn btn-cinza" data-acao="editar-pedido" data-id="${p.id}">Ajustar</button>
      <button class="btn btn-perigo" data-acao="recusar-pedido" data-id="${p.id}">Recusar</button>`;
  } else if (p.status === 'Cancelado') {
    acoes = `<button class="btn btn-cinza" data-acao="status-pedido" data-id="${p.id}">Mudar status</button>
      <button class="btn btn-perigo" data-acao="excluir-pedido" data-id="${p.id}">Excluir</button>`;
  } else {
    const falta = p.itens.some(i => i.falta > 0);
    acoes = `${falta ? `<button class="btn" data-acao="novo-envio" data-id="${p.id}">${icone('caminhao', 18)} Registrar envio</button>` : ''}
      <button class="btn btn-cinza" data-acao="novo-recebimento" data-id="${p.id}">${icone('receber', 18)} Recebimento</button>
      <button class="btn btn-cinza" data-acao="status-pedido" data-id="${p.id}">Status</button>
      <button class="btn btn-cinza" data-acao="editar-pedido" data-id="${p.id}">Editar</button>
      <button class="btn btn-perigo" data-acao="excluir-pedido" data-id="${p.id}" aria-label="Excluir pedido">${icone('lixo', 18)}</button>`;
  }
  return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">${pillStatus(p.status)}</div>
    ${etapasHTML(p.status)}
    <div class="info-grade quatro" style="margin-top:16px">
      <div><span>Feito em</span><b>${dataBR(p.data_pedido)}</b></div>
      <div><span>Previsão</span><b>${dataBR(p.previsao_entrega)}</b></div>
      <div><span>Valor</span><b>${brl(p.valor_total)}</b></div>
      <div><span>Recebido</span><b>${brl(p.valor_pago)}</b></div>
    </div>
    <div class="bloco-tit">Itens</div>
    ${itensPedidoHTML(p, { mostrarEntrega: !FORA.includes(p.status) })}
    <div class="info-grade">
      <div><span>Custo do fornecedor</span><b>${brl(p.custo_total)}</b></div>
      <div><span>Sua comissão</span><b style="color:var(--verde)">${brl(p.comissao)} <small style="font-size:12px">(${margemPct.toFixed(0)}%)</small></b></div>
    </div>
    ${p.observacoes ? `<div class="bloco-tit">Observações</div><div class="obs">${esc(p.observacoes)}</div>` : ''}
    <div class="bloco-tit">Envios ao cliente (${p.entregas.length})</div>
    ${p.entregas.length ? p.entregas.map(e => `<div class="cartao-sub">
        <div class="cab-sub"><b>${dataBR(e.data)} · ${qtd(e.quantidade)} peças</b>
          <button class="btn btn-texto" style="color:var(--vermelho)" data-acao="excluir-envio" data-id="${e.id}">Excluir</button></div>
        ${e.itens.length ? `<div class="linhas-cor">${e.itens.map(i => `<span>${i.cor ? dot(i.hex) + esc(i.cor) : esc(i.produto_nome)} <b>${qtd(i.quantidade)}</b></span>`).join('')}</div>` : ''}
        ${e.observacao ? `<div class="txt">${esc(e.observacao)}</div>` : ''}
        ${anexosHTML(e.anexos, 'entrega', e.id, ctxAnexos)}
      </div>`).join('') : '<p class="muted" style="margin:0 4px">Nenhum envio registrado.</p>'}
    <div class="bloco-tit">Recebimentos deste pedido</div>
    ${recs.length ? recs.map(g => `<div class="cartao-sub"><div class="cab-sub"><b>${brl(g.valor)}</b>${pillPagamento(g.status)}</div><div class="txt">${esc(g.forma || '')} · ${dataBR(g.data)}</div></div>`).join('') : '<p class="muted" style="margin:0 4px">Nenhum recebimento vinculado.</p>'}
    <div class="bloco-tit">Arquivos do pedido</div>
    ${anexosHTML(p.anexos, 'pedido', p.id, ctxAnexos)}
    <div class="rodape-acoes">${acoes}</div>`;
}

function abrirPedido(id) {
  const p = estado.d.pedidos.find(x => x.id === id);
  if (!p) return;
  estado.detalhe = { tipo: 'pedido', id };
  abrirFolha({ titulo: `Pedido #${p.numero}`, corpo: detalhePedidoHTML(p), larga: true, aoFechar: () => { estado.detalhe = null; } });
}

function renderDetalhe() {
  const det = estado.detalhe;
  const corpo = corpoFolha();
  if (!det || !corpo) return;
  const lista = det.tipo === 'pedido' ? estado.d.pedidos : estado.d.compras;
  const obj = lista.find(x => x.id === det.id);
  if (!obj) { fecharFolha(); return; }
  const rolagem = corpo.scrollTop;
  corpo.innerHTML = det.tipo === 'pedido' ? detalhePedidoHTML(obj) : detalheCompraHTML(obj);
  corpo.scrollTop = rolagem;
}

function formPedido(p) {
  const d = estado.d;
  if (!d.cliente) { toast('Cadastre o cliente primeiro', 'erro'); return acoes['editar-cliente'](); }
  if (!d.produtos.some(x => x.ativo)) { toast('Cadastre um produto primeiro', 'erro'); return acoes['novo-produto'](); }
  estado.detalhe = null;
  const folha = abrirFolha({
    titulo: p ? `Editar pedido #${p.numero}` : 'Novo pedido', larga: true,
    corpo: `<form id="form-pedido" class="form">
      <div class="grupo"><div id="mSel"></div></div>
      <div class="bloco-tit">Itens do pedido</div>
      <div class="grupo"><div id="mLin"></div><div class="margem" id="margemPrev"></div></div>
      <div class="grupo">
        <div class="duas">
          <div class="campo"><label>Data do pedido</label><input type="date" name="data_pedido" value="${p ? p.data_pedido : hojeISO()}" ${p ? 'disabled' : ''}></div>
          <div class="campo"><label>Previsão de entrega</label><input type="date" name="previsao_entrega" value="${p && p.previsao_entrega ? p.previsao_entrega : ''}"></div>
        </div>
        <div class="campo"><label>Observações (o cliente vê)</label><textarea name="observacoes" rows="2">${esc(p ? p.observacoes || '' : '')}</textarea></div>
      </div>
      <button class="btn btn-bloco" type="submit">${p ? 'Salvar alterações' : 'Registrar pedido'}</button>
    </form>`
  });
  const m = new Montador({
    produtos: d.produtos, campoPreco: 'preco', editarPreco: true, rotuloAdd: 'Adicionar ao pedido', aviso: 'no pedido', vazio: 'Escolha a cor e a quantidade acima.',
    linhas: p ? p.itens.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, unidade: i.unidade, cor: i.cor, hex: i.hex, quantidade: i.quantidade, preco_unitario: i.preco_unitario })) : [],
    aoMudar: () => margem()
  });
  const margem = () => {
    const custo = m.linhas.reduce((s, l) => s + l.quantidade * ((d.produtos.find(x => x.id === l.produto_id) || {}).custo || 0), 0);
    const el = folha.querySelector('#margemPrev');
    el.classList.toggle('oculto', !m.linhas.length);
    el.textContent = `Comissão estimada: ${brl(m.total - custo)} (custo do fornecedor ${brl(custo)})`;
  };
  m.montar(folha.querySelector('#mSel'), folha.querySelector('#mLin'));
  margem();
  aoEnviar(folha, '#form-pedido', async form => {
    if (!m.linhas.length) throw new Error('Adicione pelo menos uma cor ao pedido');
    const corpo = { itens: m.itensParaEnvio(), previsao_entrega: form.previsao_entrega.value || null, observacoes: form.observacoes.value };
    if (p) await api(`/pedidos/${p.id}`, { metodo: 'PUT', corpo });
    else corpo.data_pedido = form.data_pedido.value;
    const r = p ? null : await api('/pedidos', { metodo: 'POST', corpo });
    fecharFolha();
    toast(p ? 'Pedido atualizado' : `Pedido #${r.numero} registrado`);
    await carregar();
    abrirPedido(p ? p.id : r.id);
  });
}

function formEnvio(p) {
  const d = estado.d;
  const linhas = p.itens.filter(i => i.falta > 0).map(i => {
    const e = d.estoque.find(l => l.produto_id === i.produto_id && (l.cor || '').toLowerCase() === (i.cor || '').toLowerCase());
    return { ...i, saldo: e ? e.saldo : 0 };
  });
  const semEstoque = linhas.every(l => l.saldo <= 0);
  estado.detalhe = null;
  const folha = abrirFolha({
    titulo: `Envio · Pedido #${p.numero}`,
    corpo: `<p class="ajuda">Informe quanto de cada cor está saindo agora. O estoque é baixado automaticamente.</p>
      ${semEstoque ? `<div class="aviso aviso-laranja" style="margin-bottom:14px">${icone('alerta')}<span>Sem estoque para este pedido. Lance a entrada do fornecedor antes de enviar.</span></div>` : ''}
      <form id="form-envio" class="form">
        <div class="grupo">${linhas.map((l, i) => `<div class="envio-linha">
            <div class="meio"><b>${l.cor ? dot(l.hex, 14) + ' ' + esc(l.cor) : esc(l.produto_nome)}</b>
              <small>${esc(l.produto_nome)} · falta ${qtd(l.falta)} · estoque ${qtd(l.saldo)}</small></div>
            <input name="q${i}" inputmode="numeric" value="${numParaCampo(Math.max(0, Math.min(l.falta, l.saldo)))}" aria-label="Quantidade de ${esc(l.cor || l.produto_nome)}">
          </div>`).join('')}</div>
        <div class="grupo">
          <div class="campo"><label>Data do envio</label><input type="date" name="data" value="${hojeISO()}" required></div>
          <div class="campo"><label>Observação</label><textarea name="observacao" rows="2" placeholder="Nota fiscal, transportadora, quem recebeu..."></textarea></div>
          ${campoArquivoHTML('Comprovante de entrega')}
        </div>
        <button class="btn btn-bloco" type="submit">${icone('caminhao', 18)} Registrar envio</button>
      </form>`,
    aoFechar: () => abrirPedido(p.id)
  });
  aoEnviar(folha, '#form-envio', async form => {
    const itens = linhas.map((l, i) => ({ produto_id: l.produto_id, cor: l.cor, quantidade: lerNumero(form[`q${i}`].value) || 0 })).filter(x => x.quantidade > 0);
    if (!itens.length) throw new Error('Informe a quantidade enviada');
    const fd = await dadosDoForm(form);
    linhas.forEach((l, i) => fd.delete(`q${i}`));
    fd.set('itens', JSON.stringify(itens));
    await api(`/pedidos/${p.id}/envios`, { metodo: 'POST', corpo: fd });
    toast('Envio registrado · estoque atualizado');
    await carregar();
    fecharFolha();
  });
}

// ---------- Estoque ----------
function pgEstoque() {
  const d = estado.d;
  const r = d.resumo;
  let h = cab('Estoque', 'Entradas do fornecedor somam no estoque. Envios ao cliente baixam.', `<button class="btn" data-acao="nova-entrada">${icone('entrada', 18)} Nova entrada</button>`) +
    `<div class="mini-stats" style="margin-top:0">
      <div><b>${qtd(r.estoque_total)}</b><span>Em estoque</span></div>
      <div><b>${qtd(r.qtd_a_entregar)}</b><span>A entregar</span></div>
      <div><b style="${r.falta_comprar > 0 ? 'color:var(--laranja)' : ''}">${qtd(r.falta_comprar)}</b><span>Falta comprar</span></div>
      <div><b>${brl(r.total_compras)}</b><span>Total comprado</span></div>
    </div>`;
  if (!d.produtos.length) return h + vazioHTML('estoque', 'Nenhum produto', 'Cadastre os produtos e as cores em Ajustes.', `<button class="btn" data-acao="novo-produto">Cadastrar produto</button>`);
  h += '<div style="display:grid;gap:14px;margin-top:22px">';
  for (const p of d.produtos) {
    const linhas = d.estoque.filter(l => l.produto_id === p.id && (p.cores.some(c => c.nome.toLowerCase() === (l.cor || '').toLowerCase()) || !p.cores.length || l.saldo || l.a_entregar));
    if (!p.ativo && !linhas.some(l => l.saldo || l.a_entregar)) continue;
    h += `<div class="card est-prod">
      <div class="est-cab"><span class="foto">${p.foto_url ? `<img src="${p.foto_url}" alt="">` : icone('sacola', 20)}</span>
        <div><h3>${esc(p.nome)} ${p.ativo ? '' : '<span class="pill p-cinza">Inativo</span>'}</h3><small>${p.cores.length} cores · custo ${brl(p.custo)} por ${esc(unidadeSing(p.unidade))}</small></div></div>
      <div class="est-linha cab-col"><span>Cor</span><span>Em estoque</span><span>A entregar</span><span>Falta comprar</span><span></span></div>
      ${linhas.map(l => `<div class="est-linha">
        <span class="ti-cor">${l.cor ? dot(l.hex, 14) + esc(l.cor) : '—'}</span>
        <span class="saldo ${l.saldo < 0 ? 'neg' : ''}">${qtd(l.saldo)}</span>
        <span>${l.a_entregar ? qtd(l.a_entregar) : '—'}</span>
        <span class="${l.falta_comprar > 0 ? 'falta' : 'muted'}">${l.falta_comprar > 0 ? qtd(l.falta_comprar) : '—'}</span>
        <button class="bt-aj" data-acao="ajustar-estoque" data-p="${l.produto_id}" data-cor="${esc(l.cor)}" aria-label="Ajustar estoque de ${esc(l.cor || p.nome)}">${icone('editar', 14)}</button>
      </div>`).join('')}
    </div>`;
  }
  h += '</div>';
  h += `<div class="secao"><h2>Entradas do fornecedor</h2></div>`;
  h += d.compras.length ? `<div class="lista">${d.compras.map(c => `<button class="item" data-acao="abrir-compra" data-id="${c.id}">
      <span class="ico-q t-roxo">${icone('entrada', 17)}</span>
      <div class="meio"><div class="tit">${dataBR(c.data)}${c.nota ? ` · NF ${esc(c.nota)}` : ''}</div><div class="det">${resumoCoresHTML(c.itens)}${c.anexos.length ? icone('clipe', 13) : ''}</div></div>
      <div class="dir"><b>${brl(c.valor_total)}</b><small>${qtd(c.qtd_total)} peças</small></div>
      <span class="chev">${icone('seta', 16)}</span></button>`).join('')}</div>`
    : vazioHTML('entrada', 'Nenhuma entrada ainda', 'Quando o fornecedor entregar a mercadoria, lance aqui. Ela entra direto no estoque e no valor a pagar.');
  return h;
}

function detalheCompraHTML(c) {
  return `<div class="info-grade quatro">
      <div><span>Data</span><b>${dataBR(c.data)}</b></div>
      <div><span>Nota fiscal</span><b>${esc(c.nota || '—')}</b></div>
      <div><span>Peças</span><b>${qtd(c.qtd_total)}</b></div>
      <div><span>Valor</span><b>${brl(c.valor_total)}</b></div>
    </div>
    <div class="bloco-tit">Itens</div>
    <div class="cartao-sub">${c.itens.map(i => `<div class="m-linha"><span class="m-cor">${i.cor ? dot(i.hex, 14) + esc(i.cor) : ''} <span class="muted">${esc(i.produto_nome)}</span></span>
      <span class="num">${qtd(i.quantidade)} × ${brl(i.custo_unitario)}</span><b class="num" style="width:96px;text-align:right">${brl(i.subtotal)}</b></div>`).join('')}</div>
    ${c.observacao ? `<div class="bloco-tit">Observação</div><div class="obs">${esc(c.observacao)}</div>` : ''}
    <div class="bloco-tit">Comprovantes</div>
    ${anexosHTML(c.anexos, 'compra', c.id, ctxAnexos)}
    <div class="rodape-acoes">
      <button class="btn" data-acao="novo-pag-fornecedor" data-compra="${c.id}">${icone('pagar', 18)} Registrar pagamento</button>
      <button class="btn btn-perigo" data-acao="excluir-compra" data-id="${c.id}">Excluir entrada</button>
    </div>`;
}

function formEntrada() {
  const d = estado.d;
  if (!d.produtos.some(x => x.ativo)) { toast('Cadastre um produto primeiro', 'erro'); return acoes['novo-produto'](); }
  const folha = abrirFolha({
    titulo: 'Entrada do fornecedor', larga: true,
    corpo: `<p class="ajuda">Mercadoria recebida${d.fornecedor.nome ? ` de ${esc(d.fornecedor.nome)}` : ''}. Entra direto no estoque e no valor a pagar.</p>
      <form id="form-entrada" class="form">
        <div class="grupo"><div id="mSel"></div></div>
        <div class="bloco-tit">Itens recebidos</div>
        <div class="grupo"><div id="mLin"></div></div>
        <div class="grupo">
          <div class="duas">
            <div class="campo"><label>Data</label><input type="date" name="data" value="${hojeISO()}" required></div>
            <div class="campo"><label>Nota fiscal</label><input name="nota" placeholder="Opcional" autocomplete="off"></div>
          </div>
          <div class="campo"><label>Observação</label><textarea name="observacao" rows="2"></textarea></div>
          ${campoArquivoHTML('Foto da nota / comprovante')}
        </div>
        <button class="btn btn-bloco" type="submit">${icone('entrada', 18)} Lançar no estoque</button>
      </form>`
  });
  const m = new Montador({ produtos: d.produtos, campoPreco: 'custo', editarPreco: true, rotuloAdd: 'Adicionar à entrada', aviso: 'na entrada', vazio: 'Escolha a cor e a quantidade recebida acima.' });
  m.montar(folha.querySelector('#mSel'), folha.querySelector('#mLin'));
  aoEnviar(folha, '#form-entrada', async form => {
    if (!m.linhas.length) throw new Error('Adicione pelo menos uma cor recebida');
    const fd = await dadosDoForm(form);
    fd.set('itens', JSON.stringify(m.itensParaEnvio()));
    await api('/compras', { metodo: 'POST', corpo: fd });
    fecharFolha();
    toast('Entrada lançada · estoque atualizado');
    await carregar();
  });
}

// ---------- Financeiro ----------
function pgFinanceiro() {
  const d = estado.d;
  const r = d.resumo;
  const aba = estado.abaFin;
  const b = (id, rot, n) => `<button data-acao="aba-fin" data-a="${id}" class="${aba === id ? 'on' : ''}">${rot}${n ? `<em class="badge">${n}</em>` : ''}</button>`;
  const botao = { cliente: ['novo-recebimento', 'Registrar recebimento'], fornecedor: ['novo-pag-fornecedor', 'Pagar fornecedor'], comissao: ['nova-retirada', 'Retirar comissão'] }[aba];
  let h = cab('Financeiro', 'Todos os valores e comprovantes da operação.', `<button class="btn" data-acao="${botao[0]}">${icone('mais', 18)} ${botao[1]}</button>`) +
    `<div class="barra-filtros"><div class="seg">${b('cliente', 'Cliente', r.pagamentos_pendentes)}${b('fornecedor', 'Fornecedor')}${b('comissao', 'Comissão')}</div></div>`;

  if (aba === 'cliente') {
    h += `<div class="grade">
      ${kpi({ rot: 'A receber', ico: 'receber', tom: 't-verde', val: brl(r.a_receber), sub: 'Pedidos aceitos menos o recebido' })}
      ${kpi({ rot: 'Recebido', ico: 'check', tom: 't-cinza', val: brl(r.recebido), sub: `de ${brl(r.total_vendas)} vendidos` })}
    </div>`;
    const pend = d.recebimentos.filter(g => g.status === 'Aguardando confirmação');
    const outros = d.recebimentos.filter(g => g.status !== 'Aguardando confirmação');
    if (pend.length) h += `<p class="lista-rot">Para confirmar</p><div class="lista">${pend.map(blocoRecebimento).join('')}</div>`;
    h += `<p class="lista-rot">Recebimentos do cliente</p>` + (outros.length ? `<div class="lista">${outros.map(blocoRecebimento).join('')}</div>` : '<div class="lista"><div class="item-bloco muted">Nenhum recebimento registrado.</div></div>');
  } else if (aba === 'fornecedor') {
    h += `<div class="grade">
      ${kpi({ rot: 'A pagar', ico: 'pagar', tom: 't-vermelho', val: brl(r.a_pagar), sub: d.fornecedor.nome ? esc(d.fornecedor.nome) : 'Fornecedor' })}
      ${kpi({ rot: 'Pago', ico: 'check', tom: 't-cinza', val: brl(r.pago_fornecedor), sub: `de ${brl(r.total_compras)} comprados` })}
    </div>
    <p class="lista-rot">Pagamentos ao fornecedor</p>` +
      (d.pagamentos_fornecedor.length ? `<div class="lista">${d.pagamentos_fornecedor.map(g => blocoSimples(g, 'pagfornecedor', 'excluir-pag-fornecedor', `${esc(g.forma || '')} · ${dataBR(g.data)}`)).join('')}</div>`
        : '<div class="lista"><div class="item-bloco muted">Nenhum pagamento ao fornecedor.</div></div>');
  } else {
    h += `<div class="grade">
      ${kpi({ rot: 'Disponível para retirar', ico: 'comissao', tom: 't-roxo', val: brl(r.comissao_disponivel), sub: `Gerada ${brl(r.comissao_gerada)} · retirada ${brl(r.retirado)}` })}
      ${kpi({ rot: 'Em caixa agora', ico: 'financeiro', tom: 't-cinza', val: brl(r.caixa), sub: 'Recebido − pago ao fornecedor − retiradas' })}
    </div>
    <p class="lista-nota" style="margin-top:12px">A comissão é a diferença entre o preço de venda e o custo do fornecedor de cada pedido aceito. Se o "Em caixa" estiver abaixo do disponível, o cliente ainda não pagou toda a parte da comissão.</p>
    <p class="lista-rot">Retiradas</p>` +
      (d.retiradas.length ? `<div class="lista">${d.retiradas.map(g => blocoSimples(g, 'retirada', 'excluir-retirada', dataBR(g.data))).join('')}</div>`
        : '<div class="lista"><div class="item-bloco muted">Nenhuma retirada registrada.</div></div>');
  }
  return h;
}

function blocoRecebimento(g) {
  return `<div class="item-bloco">
    <div class="cab-sub" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b class="num" style="font-size:17px">${brl(g.valor)}</b>${pillPagamento(g.status)}</div>
    <div class="muted" style="font-size:13.5px;margin-top:2px">${esc(g.forma || '')} · ${dataBR(g.data)}${g.pedido_numero ? ` · Pedido #${g.pedido_numero}` : ''} · ${g.informado_por === 'cliente' ? 'informado pelo cliente' : 'registrado por você'}</div>
    ${g.observacao ? `<div class="obs" style="margin-top:8px;box-shadow:none;background:var(--fill-2)">${esc(g.observacao)}</div>` : ''}
    ${anexosHTML(g.anexos, 'pagamento', g.id, ctxAnexos)}
    <div class="acoes" style="margin-top:12px">
      ${g.status === 'Aguardando confirmação' ? `<button class="btn btn-ok btn-peq" data-acao="rec-status" data-status="Confirmado" data-id="${g.id}">${icone('check', 16)} Confirmar</button>
        <button class="btn btn-perigo btn-peq" data-acao="rec-status" data-status="Recusado" data-id="${g.id}">Recusar</button>` : ''}
      ${g.status === 'Recusado' ? `<button class="btn btn-cinza btn-peq" data-acao="rec-status" data-status="Confirmado" data-id="${g.id}">Confirmar mesmo assim</button>` : ''}
      <button class="btn btn-texto" style="color:var(--vermelho);flex:0 0 auto" data-acao="excluir-recebimento" data-id="${g.id}">Excluir</button>
    </div>
  </div>`;
}
function blocoSimples(g, tipo, acaoExcluir, detalhe) {
  return `<div class="item-bloco">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b class="num" style="font-size:17px">${brl(g.valor)}</b>
      <button class="btn btn-texto" style="color:var(--vermelho)" data-acao="${acaoExcluir}" data-id="${g.id}">Excluir</button></div>
    <div class="muted" style="font-size:13.5px">${detalhe}</div>
    ${g.observacao ? `<div class="obs" style="margin-top:8px;box-shadow:none;background:var(--fill-2)">${esc(g.observacao)}</div>` : ''}
    ${anexosHTML(g.anexos, tipo, g.id, ctxAnexos)}
  </div>`;
}

// ---------- Ajustes ----------
function pgAjustes() {
  const d = estado.d;
  const c = d.cliente;
  const f = d.fornecedor;
  return cab('Ajustes') +
    `<p class="lista-rot" style="margin-top:0">Cliente</p><div class="lista">
      ${c ? `<button class="item" data-acao="editar-cliente"><span class="avatar">${esc(iniciais(c.nome))}</span>
          <div class="meio"><div class="tit">${esc(c.nome)} ${c.ativo ? '' : '<span class="pill p-cinza">Link desativado</span>'}</div><div class="det">${esc([c.contato, c.telefone].filter(Boolean).join(' · ') || 'Toque para completar o cadastro')}</div></div><span class="chev">${icone('seta', 16)}</span></button>
        <button class="item" data-acao="compartilhar"><span class="ico-q t-azul">${icone('link', 17)}</span><div class="meio"><div class="tit">Link de acompanhamento</div><div class="det">Enviar pelo WhatsApp, copiar ou abrir</div></div><span class="chev">${icone('seta', 16)}</span></button>
        <button class="item" data-acao="novo-link"><span class="ico-q t-cinza">${icone('cadeado', 17)}</span><div class="meio"><div class="tit">Gerar novo link</div><div class="det">Desativa o link atual</div></div></button>`
        : `<button class="item acao-item" data-acao="editar-cliente"><span class="ico-q t-azul">${icone('mais', 17)}</span>Cadastrar cliente</button>`}
    </div>
    <p class="lista-rot">Fornecedor</p><div class="lista">
      <button class="item" data-acao="editar-fornecedor"><span class="avatar" style="background:linear-gradient(145deg,#a2845e,#7a5c3a)">${icone('fabrica', 18)}</span>
        <div class="meio"><div class="tit">${esc(f.nome || 'Cadastrar fornecedor')}</div><div class="det">${esc([f.contato, f.telefone].filter(Boolean).join(' · ') || 'Nome e contato do fornecedor')}</div></div><span class="chev">${icone('seta', 16)}</span></button>
    </div>
    <p class="lista-rot">Produtos e cores</p><div class="lista">
      ${d.produtos.map(p => `<button class="item" data-acao="editar-produto" data-id="${p.id}">
          <span class="avatar" style="border-radius:11px">${p.foto_url ? `<img src="${p.foto_url}" alt="">` : icone('sacola', 20)}</span>
          <div class="meio"><div class="tit">${esc(p.nome)} ${p.ativo ? '' : '<span class="pill p-cinza">Inativo</span>'}</div>
            <div class="det">${p.cores.slice(0, 8).map(c2 => dot(c2.hex, 10)).join('')} ${p.cores.length} cores · venda ${brl(p.preco)} · custo ${brl(p.custo)}</div></div>
          <span class="chev">${icone('seta', 16)}</span></button>`).join('')}
      <button class="item acao-item" data-acao="novo-produto"><span class="ico-q t-azul">${icone('mais', 17)}</span>Adicionar produto</button>
    </div>
    <p class="lista-nota">O cliente vê os produtos ativos com preço de venda, cores e foto. Custo, comissão, estoque e fornecedor só você vê.</p>
    <p class="lista-rot">Conta</p><div class="lista">
      <button class="item" data-acao="trocar-senha"><span class="ico-q t-cinza">${icone('cadeado', 17)}</span><div class="meio tit">Alterar senha</div><span class="chev">${icone('seta', 16)}</span></button>
      <button class="item destrutivo" data-acao="sair"><span class="ico-q t-vermelho">${icone('sair', 17)}</span><div class="meio tit">Sair</div></button>
    </div>`;
}

const PRESETS = [['Branco', '#f5f5f0'], ['Preto', '#1d1d1f'], ['Cinza', '#8e8e93'], ['Azul', '#1e63d6'], ['Marinho', '#1b2a4a'], ['Vermelho', '#d62d20'],
  ['Verde', '#2e9e52'], ['Amarelo', '#f2c230'], ['Rosa', '#ef7fb0'], ['Bege', '#d9c3a5'], ['Marrom', '#7a4e2d'], ['Lilás', '#b38be0']];

function formProduto(p) {
  const cores = p ? p.cores.map(c => ({ ...c })) : [];
  let novaFoto = null;
  const folha = abrirFolha({
    titulo: p ? p.nome : 'Novo produto',
    corpo: `<form id="form-produto" class="form">
      <div class="grupo">
        <div class="foto-prod" style="margin-bottom:16px"><span class="foto" id="fotoPrev">${p && p.foto_url ? `<img src="${p.foto_url}" alt="">` : icone('foto', 28)}</span>
          <div><label class="btn btn-sec btn-peq">${icone('foto', 16)} Escolher foto<input type="file" accept="image/*" id="fotoInput" hidden></label>
          ${p && p.foto_url ? '<button type="button" class="btn btn-texto" id="removerFoto" style="display:block;margin-top:6px">Remover foto</button>' : ''}</div></div>
        <div class="campo"><label>Nome do produto</label><input name="nome" required value="${esc(p ? p.nome : '')}" placeholder="Ex.: Toalha de banho 70x140"></div>
        <div class="campo"><label>Descrição (o cliente vê)</label><input name="descricao" value="${esc(p ? p.descricao || '' : '')}" placeholder="Gramatura, tamanho, acabamento..."></div>
        <div class="duas">
          <div class="campo"><label>Preço de venda (R$)</label><input name="preco" inputmode="decimal" required value="${p ? precoParaCampo(p.preco) : ''}"></div>
          <div class="campo"><label>Custo do fornecedor (R$)</label><input name="custo" inputmode="decimal" value="${p ? precoParaCampo(p.custo) : ''}"></div>
        </div>
        <div class="campo" style="margin-top:14px"><label>Unidade</label><input name="unidade" value="${esc(p ? p.unidade : 'peças')}"></div>
        <div class="margem" id="margemProd"></div>
      </div>
      <div class="bloco-tit">Cores</div>
      <div class="grupo"><div class="cores-edit" id="coresEdit"></div>
        <p class="muted" style="font-size:13px;margin:12px 0 0">Toque para adicionar rápido:</p>
        <div class="presets">${PRESETS.map(([n, hx]) => `<button type="button" class="preset" data-preset="${n}" data-hex="${hx}">${dot(hx, 16)}${n}</button>`).join('')}
          <button type="button" class="preset" data-preset="" data-hex="#8e8e93">${icone('mais', 14)} Outra</button></div>
      </div>
      <div class="grupo"><label class="interruptor">Disponível para o cliente<input type="checkbox" name="ativo" ${!p || p.ativo ? 'checked' : ''}></label></div>
      <button class="btn btn-bloco" type="submit">Salvar produto</button>
      ${p ? `<button class="btn btn-texto btn-bloco" type="button" data-acao="excluir-produto" data-id="${p.id}" style="color:var(--vermelho);margin-top:10px">Excluir produto</button>` : ''}
    </form>`
  });
  const caixa = folha.querySelector('#coresEdit');
  const desenharCores = () => {
    caixa.innerHTML = cores.length ? cores.map((c, i) => `<div class="cor-edit">
        <input type="color" value="${esc(c.hex)}" data-i="${i}" aria-label="Cor">
        <input class="cor-nome" value="${esc(c.nome)}" data-i="${i}" placeholder="Nome da cor" aria-label="Nome da cor">
        <button type="button" class="m-rem" data-rem="${i}" aria-label="Remover cor">${icone('fechar', 14)}</button></div>`).join('')
      : '<p class="muted" style="font-size:14px">Nenhuma cor. Sem cores, o cliente escolhe só a quantidade.</p>';
  };
  desenharCores();
  caixa.addEventListener('input', e => {
    const i = Number(e.target.dataset.i);
    if (e.target.type === 'color') cores[i].hex = e.target.value;
    else if (e.target.classList.contains('cor-nome')) cores[i].nome = e.target.value;
  });
  caixa.addEventListener('click', e => {
    const b = e.target.closest('[data-rem]');
    if (b) { cores.splice(Number(b.dataset.rem), 1); desenharCores(); }
  });
  folha.querySelector('.presets').addEventListener('click', e => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    if (b.dataset.preset && cores.some(c => c.nome.toLowerCase() === b.dataset.preset.toLowerCase())) return toast('Essa cor já está na lista', 'erro');
    cores.push({ nome: b.dataset.preset, hex: b.dataset.hex });
    desenharCores();
    if (!b.dataset.preset) caixa.querySelectorAll('.cor-nome')[cores.length - 1].focus();
  });
  const margem = () => {
    const f = folha.querySelector('#form-produto');
    const v = lerNumero(f.preco.value) || 0;
    const c = lerNumero(f.custo.value) || 0;
    const el = folha.querySelector('#margemProd');
    el.classList.toggle('oculto', !(v > 0));
    el.textContent = `Sua comissão: ${brl(v - c)} por ${unidadeSing(f.unidade.value)}${v > 0 ? ` (${(((v - c) / v) * 100).toFixed(0)}%)` : ''}`;
  };
  folha.querySelector('#form-produto').addEventListener('input', e => { if (['preco', 'custo', 'unidade'].includes(e.target.name)) margem(); });
  margem();
  folha.querySelector('#fotoInput').addEventListener('change', e => {
    novaFoto = e.target.files[0] || null;
    if (novaFoto) folha.querySelector('#fotoPrev').innerHTML = `<img src="${URL.createObjectURL(novaFoto)}" alt="">`;
  });
  const rem = folha.querySelector('#removerFoto');
  if (rem) rem.addEventListener('click', async () => {
    try { await api(`/produtos/${p.id}/foto`, { metodo: 'DELETE' }); toast('Foto removida'); await carregar(); fecharFolha(); } catch (e) { toast(e.message, 'erro'); }
  });
  aoEnviar(folha, '#form-produto', async f => {
    const nomes = cores.map(c => c.nome.trim());
    if (nomes.some(n => !n)) throw new Error('Dê um nome para cada cor');
    const corpo = { nome: f.nome.value, descricao: f.descricao.value, preco: f.preco.value, custo: f.custo.value || 0, unidade: f.unidade.value, ativo: f.ativo.checked, cores: cores.map(c => ({ nome: c.nome.trim(), hex: c.hex })) };
    let id = p ? p.id : null;
    if (p) await api(`/produtos/${p.id}`, { metodo: 'PUT', corpo });
    else id = (await api('/produtos', { metodo: 'POST', corpo })).id;
    if (novaFoto) {
      const fd = new FormData();
      fd.set('arquivo', await comprimirImagem(novaFoto));
      await api(`/produtos/${id}/foto`, { metodo: 'POST', corpo: fd });
    }
    fecharFolha();
    toast('Produto salvo');
    await carregar();
  });
}

function compartilharLink() {
  const d = estado.d;
  if (!d.cliente) return acoes['editar-cliente']();
  const url = `${location.origin}/p/${d.cliente.token}`;
  const texto = `Olá${d.cliente.contato ? ' ' + d.cliente.contato : ''}! Por este link você monta seus pedidos e acompanha entregas e pagamentos com a Fernandes Têxtil: ${url}`;
  const fone = (d.cliente.telefone || '').replace(/\D/g, '');
  const wa = `https://wa.me/${fone ? (fone.length <= 11 ? '55' + fone : fone) : ''}?text=${encodeURIComponent(texto)}`;
  const folha = abrirFolha({
    titulo: 'Link do cliente',
    corpo: `<p class="ajuda">Com este link, ${esc(d.cliente.nome)} monta pedidos e acompanha entregas e pagamentos, sem senha.</p>
      <div class="link-box">${esc(url)}</div>
      <div style="display:grid;gap:10px">
        <a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>
        <button class="btn btn-cinza" id="copiarLink">Copiar link</button>
        ${navigator.share ? `<button class="btn btn-cinza" id="nativo">${icone('compartilhar', 18)} Compartilhar…</button>` : ''}
        <a class="btn btn-cinza" href="${esc(url)}" target="_blank" rel="noopener">Ver como o cliente vê</a>
      </div>`
  });
  folha.querySelector('#copiarLink').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copiado'); } catch (e) { prompt('Copie o link:', url); }
  });
  const n = folha.querySelector('#nativo');
  if (n) n.addEventListener('click', () => navigator.share({ title: 'Seus pedidos — Fernandes Têxtil', text: texto }).catch(() => {}));
}

// ---------- Atividade ----------
function pgAtividade() {
  const d = estado.d;
  return cab('Atividade', 'Tudo o que aconteceu na operação. Itens com cadeado só você vê.') +
    (d.cliente ? `<form class="caixa-msg" id="form-mensagem"><textarea name="mensagem" rows="1" maxlength="1000" placeholder="Mensagem para ${esc(d.cliente.nome)}…"></textarea>
      <button class="btn" type="submit">Enviar</button></form>` : '') +
    historicoHTML(d.historico, { nomeAutor: h => h.autor_nome || 'Fernandes Têxtil', destaqueAte: estado.destaqueAte, privados: true });
}

// ---------- Ações ----------
const achar = (lista, el) => estado.d[lista].find(x => x.id === Number(el.dataset.id));
async function executar(fn, msg) {
  try { await fn(); if (msg) toast(msg); await carregar(); } catch (e) { toast(e.message, 'erro'); }
}

const acoes = {
  sair,
  'ir-aprovar'() { estado.filtroPedidos = 'aprovar'; location.hash = '#pedidos'; if (estado.pagina === 'pedidos') render(); },
  'filtro-pedidos'(el) { estado.filtroPedidos = el.dataset.f; render(); },
  'aba-fin'(el) { estado.abaFin = el.dataset.a; render(); },
  'abrir-pedido'(el) { abrirPedido(Number(el.dataset.id)); },
  'abrir-compra'(el) {
    const c = achar('compras', el);
    estado.detalhe = { tipo: 'compra', id: c.id };
    abrirFolha({ titulo: `Entrada de ${dataBR(c.data)}`, corpo: detalheCompraHTML(c), aoFechar: () => { estado.detalhe = null; } });
  },
  'novo-pedido'() { formPedido(null); },
  'editar-pedido'(el) { formPedido(achar('pedidos', el)); },
  'novo-envio'(el) { formEnvio(achar('pedidos', el)); },
  'nova-entrada'() { formEntrada(); },
  async 'aceitar-pedido'(el) {
    const p = achar('pedidos', el);
    await executar(() => api(`/pedidos/${p.id}`, { metodo: 'PUT', corpo: { status: 'Recebido' } }), `Pedido #${p.numero} aceito`);
  },
  async 'recusar-pedido'(el) {
    const p = achar('pedidos', el);
    const motivo = prompt(`Recusar o pedido #${p.numero}. Motivo (o cliente verá):`, '');
    if (motivo === null) return;
    await executar(() => api(`/pedidos/${p.id}`, { metodo: 'PUT', corpo: { status: 'Cancelado', motivo } }), `Pedido #${p.numero} recusado`);
  },
  'status-pedido'(el) {
    const p = achar('pedidos', el);
    estado.detalhe = null;
    const folha = abrirFolha({
      titulo: `Status do pedido #${p.numero}`,
      corpo: `<p class="ajuda">O cliente vê a mudança na hora. "Entregue parcialmente" e "Entregue" também mudam sozinhos com os envios.</p>
        <div class="lista">${estado.d.status_pedido.filter(s => s !== 'Solicitado').map(s => `<button class="item" data-novo-status="${esc(s)}">${pillStatus(s)}<span class="meio"></span>${s === p.status ? `<span style="color:var(--acento)">${icone('check', 18)}</span>` : ''}</button>`).join('')}</div>`,
      aoFechar: () => abrirPedido(p.id)
    });
    folha.addEventListener('click', async e => {
      const b = e.target.closest('[data-novo-status]');
      if (!b) return;
      const s = b.dataset.novoStatus;
      if (s === p.status) return fecharFolha();
      if (s === 'Cancelado' && !confirm(`Cancelar o pedido #${p.numero}?`)) return;
      await executar(() => api(`/pedidos/${p.id}`, { metodo: 'PUT', corpo: { status: s } }), `Pedido #${p.numero}: ${s}`);
      fecharFolha();
    });
  },
  async 'excluir-pedido'(el) {
    const p = achar('pedidos', el);
    if (!confirm(`Excluir o pedido #${p.numero} com seus envios e anexos? Para manter o registro, prefira o status "Cancelado".`)) return;
    estado.detalhe = null;
    fecharFolha(true);
    await executar(() => api(`/pedidos/${p.id}`, { metodo: 'DELETE' }), 'Pedido excluído');
  },
  async 'excluir-envio'(el) {
    if (!confirm('Excluir este envio? As peças voltam para o estoque.')) return;
    await executar(() => api(`/envios/${el.dataset.id}`, { metodo: 'DELETE' }), 'Envio excluído');
  },
  async 'excluir-compra'(el) {
    if (!confirm('Excluir esta entrada? As peças saem do estoque e o valor sai do "a pagar".')) return;
    await executar(() => api(`/compras/${el.dataset.id}`, { metodo: 'DELETE' }), 'Entrada excluída');
  },
  'ajustar-estoque'(el) {
    const pid = Number(el.dataset.p);
    const cor = el.dataset.cor;
    const p = estado.d.produtos.find(x => x.id === pid);
    const l = estado.d.estoque.find(x => x.produto_id === pid && (x.cor || '') === cor);
    const folha = abrirFolha({
      titulo: `Ajustar ${cor || p.nome}`,
      corpo: `<p class="ajuda">Use para corrigir o estoque depois de uma contagem (ex.: estoque inicial, perda, sobra). Hoje o sistema mostra <b>${qtd(l ? l.saldo : 0)}</b>.</p>
        <form id="form-ajuste" class="form"><div class="grupo">
          <div class="campo"><label>Quantidade contada de ${esc(cor || p.nome)}</label><input name="contagem" class="qtd-grande" inputmode="numeric" required value="${numParaCampo(l ? Math.max(0, l.saldo) : 0)}"></div>
          <div class="campo"><label>Motivo</label><input name="motivo" placeholder="Ex.: estoque inicial, contagem do mês"></div>
        </div><button class="btn btn-bloco" type="submit">Salvar contagem</button></form>`
    });
    aoEnviar(folha, '#form-ajuste', async f => {
      await api('/estoque/contagem', { metodo: 'POST', corpo: { produto_id: pid, cor, contagem: f.contagem.value, motivo: f.motivo.value } });
      fecharFolha();
      toast('Estoque ajustado');
      await carregar();
    });
  },
  'novo-recebimento'(el) {
    const d = estado.d;
    if (!d.cliente) return toast('Cadastre o cliente primeiro', 'erro');
    const pedidoId = el.dataset.id ? Number(el.dataset.id) : null;
    estado.detalhe = null;
    const folha = abrirFolha({
      titulo: 'Recebimento do cliente',
      corpo: `<p class="ajuda">Entra como confirmado e abate do valor a receber.</p>${formPagamentoHTML({ formas: d.formas_pagamento, pedidos: d.pedidos, pedidoId, botao: 'Salvar recebimento' })}`,
      aoFechar: pedidoId ? () => abrirPedido(pedidoId) : null
    });
    aoEnviar(folha, '#form-pagamento', async f => {
      await api('/recebimentos', { metodo: 'POST', corpo: await dadosDoForm(f) });
      toast('Recebimento registrado');
      await carregar();
      fecharFolha();
    });
  },
  'novo-pag-fornecedor'(el) {
    const d = estado.d;
    const compra = el.dataset.compra ? d.compras.find(c => c.id === Number(el.dataset.compra)) : null;
    estado.detalhe = null;
    const folha = abrirFolha({
      titulo: 'Pagamento ao fornecedor',
      corpo: `<p class="ajuda">Abate do valor a pagar${d.fornecedor.nome ? ` a ${esc(d.fornecedor.nome)}` : ''}. Hoje: <b>${brl(d.resumo.a_pagar)}</b>.</p>
        ${formPagamentoHTML({ formas: d.formas_pagamento, comPedido: false, botao: 'Salvar pagamento', valor: compra ? precoParaCampo(compra.valor_total) : '' })}`
    });
    aoEnviar(folha, '#form-pagamento', async f => {
      const fd = await dadosDoForm(f);
      if (compra) fd.set('compra_id', compra.id);
      await api('/fornecedor/pagamentos', { metodo: 'POST', corpo: fd });
      fecharFolha();
      toast('Pagamento registrado');
      estado.abaFin = 'fornecedor';
      await carregar();
    });
  },
  'nova-retirada'() {
    const r = estado.d.resumo;
    const folha = abrirFolha({
      titulo: 'Retirar comissão',
      corpo: `<p class="ajuda">Disponível: <b>${brl(r.comissao_disponivel)}</b> · em caixa: <b>${brl(r.caixa)}</b>.</p>
        <form id="form-pagamento" class="form"><div class="grupo">
          <div class="duas">
            <div class="campo"><label>Valor (R$)</label><input name="valor" inputmode="decimal" required value="${r.comissao_disponivel > 0 ? precoParaCampo(Math.min(r.comissao_disponivel, Math.max(r.caixa, 0)) || r.comissao_disponivel) : ''}"></div>
            <div class="campo"><label>Data</label><input type="date" name="data" value="${hojeISO()}" required></div>
          </div>
          <div class="campo" style="margin-top:14px"><label>Observação</label><textarea name="observacao" rows="2" placeholder="Opcional"></textarea></div>
          ${campoArquivoHTML()}
        </div><button class="btn btn-bloco" type="submit">Registrar retirada</button></form>`
    });
    aoEnviar(folha, '#form-pagamento', async f => {
      await api('/retiradas', { metodo: 'POST', corpo: await dadosDoForm(f) });
      fecharFolha();
      toast('Retirada registrada');
      estado.abaFin = 'comissao';
      await carregar();
    });
  },
  async 'rec-status'(el) {
    const status = el.dataset.status;
    let motivo = '';
    if (status === 'Recusado') {
      motivo = prompt('Motivo da recusa (o cliente verá):', 'Valor não identificado na conta');
      if (motivo === null) return;
    }
    await executar(() => api(`/recebimentos/${el.dataset.id}/status`, { metodo: 'PUT', corpo: { status, motivo } }), status === 'Confirmado' ? 'Pagamento confirmado' : 'Pagamento recusado');
  },
  async 'excluir-recebimento'(el) { if (confirm('Excluir este recebimento e seus comprovantes?')) await executar(() => api(`/recebimentos/${el.dataset.id}`, { metodo: 'DELETE' }), 'Excluído'); },
  async 'excluir-pag-fornecedor'(el) { if (confirm('Excluir este pagamento e seus comprovantes?')) await executar(() => api(`/fornecedor/pagamentos/${el.dataset.id}`, { metodo: 'DELETE' }), 'Excluído'); },
  async 'excluir-retirada'(el) { if (confirm('Excluir esta retirada e seus comprovantes?')) await executar(() => api(`/retiradas/${el.dataset.id}`, { metodo: 'DELETE' }), 'Excluída'); },
  anexar(el) {
    const tipo = el.dataset.tipo;
    const id = Number(el.dataset.id);
    const voltar = estado.detalhe ? { ...estado.detalhe } : null;
    estado.detalhe = null;
    const folha = abrirFolha({
      titulo: 'Anexar comprovante',
      corpo: `<form id="form-anexo" class="form"><div class="grupo">${campoArquivoHTML('Escolher foto ou PDF', true)}</div><button class="btn btn-bloco" type="submit">Enviar</button></form>`,
      aoFechar: voltar ? () => (voltar.tipo === 'pedido' ? abrirPedido(voltar.id) : acoes['abrir-compra']({ dataset: { id: voltar.id } })) : null
    });
    aoEnviar(folha, '#form-anexo', async f => {
      const fd = await dadosDoForm(f);
      fd.set('tipo', tipo);
      fd.set('ref_id', id);
      await api('/anexos', { metodo: 'POST', corpo: fd });
      toast('Comprovante anexado');
      await carregar();
      fecharFolha();
    });
  },
  'ver-anexo'(el) {
    const id = Number(el.dataset.id);
    const d = estado.d;
    const todos = [...d.pedidos.flatMap(p => p.anexos), ...d.entregas.flatMap(e => e.anexos), ...d.recebimentos.flatMap(g => g.anexos),
      ...d.compras.flatMap(c => c.anexos), ...d.pagamentos_fornecedor.flatMap(g => g.anexos), ...d.retiradas.flatMap(g => g.anexos)];
    const a = todos.find(x => x.id === id);
    if (!a) return;
    const url = arquivoUrl(id);
    const img = (a.mime || '').startsWith('image/') && !/heic|heif/.test(a.mime);
    const voltar = estado.detalhe ? { ...estado.detalhe } : null;
    estado.detalhe = null;
    const folha = abrirFolha({
      titulo: a.nome_original || 'Comprovante',
      corpo: `<p class="ajuda">Enviado ${a.enviado_por === 'cliente' ? 'pelo cliente' : 'por você'} em ${lerTS(a.created_at).toLocaleString('pt-BR')}</p>
        ${img ? `<img src="${url}" alt="" style="width:100%;border-radius:14px;margin-bottom:14px">` : ''}
        <div style="display:grid;gap:10px"><a class="btn" href="${url}" target="_blank" rel="noopener">Abrir</a>
          <a class="btn btn-cinza" href="${url}?baixar=1">Baixar</a>
          <button class="btn btn-perigo" id="excluirAnexo">Excluir arquivo</button></div>`,
      aoFechar: voltar ? () => (voltar.tipo === 'pedido' ? abrirPedido(voltar.id) : acoes['abrir-compra']({ dataset: { id: voltar.id } })) : null
    });
    folha.querySelector('#excluirAnexo').addEventListener('click', async () => {
      if (!confirm('Excluir este arquivo?')) return;
      await executar(() => api(`/anexos/${id}`, { metodo: 'DELETE' }), 'Arquivo excluído');
      fecharFolha();
    });
  },
  'editar-cliente'() {
    const c = estado.d.cliente || {};
    const folha = abrirFolha({
      titulo: estado.d.cliente ? 'Cliente' : 'Cadastrar cliente',
      corpo: `<form id="form-cliente" class="form"><div class="grupo">
          <div class="campo"><label>Nome do cliente / empresa</label><input name="nome" required value="${esc(c.nome || '')}" autocomplete="off"></div>
          <div class="campo"><label>Pessoa de contato</label><input name="contato" value="${esc(c.contato || '')}" autocomplete="off"></div>
          <div class="campo"><label>WhatsApp</label><input name="telefone" type="tel" inputmode="tel" placeholder="(00) 00000-0000" value="${esc(c.telefone || '')}"></div>
          <div class="campo"><label>Observações internas (o cliente não vê)</label><textarea name="observacoes" rows="2">${esc(c.observacoes || '')}</textarea></div>
        </div>
        ${estado.d.cliente ? `<div class="grupo"><label class="interruptor">Link de acompanhamento ativo<input type="checkbox" name="ativo" ${c.ativo ? 'checked' : ''}></label></div>` : ''}
        <button class="btn btn-bloco" type="submit">Salvar</button></form>`
    });
    aoEnviar(folha, '#form-cliente', async f => {
      await api('/cliente', { metodo: 'PUT', corpo: { nome: f.nome.value, contato: f.contato.value, telefone: f.telefone.value, observacoes: f.observacoes.value, ativo: f.ativo ? f.ativo.checked : true } });
      fecharFolha();
      toast('Cliente salvo');
      await carregar();
    });
  },
  'editar-fornecedor'() {
    const f0 = estado.d.fornecedor;
    const folha = abrirFolha({
      titulo: 'Fornecedor',
      corpo: `<p class="ajuda">Só você vê os dados do fornecedor.</p><form id="form-forn" class="form"><div class="grupo">
          <div class="campo"><label>Nome do fornecedor</label><input name="nome" required value="${esc(f0.nome || '')}"></div>
          <div class="campo"><label>Contato</label><input name="contato" value="${esc(f0.contato || '')}"></div>
          <div class="campo"><label>Telefone / WhatsApp</label><input name="telefone" type="tel" value="${esc(f0.telefone || '')}"></div>
        </div><button class="btn btn-bloco" type="submit">Salvar</button></form>`
    });
    aoEnviar(folha, '#form-forn', async f => {
      await api('/fornecedor', { metodo: 'PUT', corpo: { nome: f.nome.value, contato: f.contato.value, telefone: f.telefone.value } });
      fecharFolha();
      toast('Fornecedor salvo');
      await carregar();
    });
  },
  compartilhar: compartilharLink,
  async 'novo-link'() {
    if (!confirm('Gerar um novo link? O link atual para de funcionar e você precisará enviar o novo ao cliente.')) return;
    try { await api('/cliente/novo-link', { metodo: 'POST' }); await carregar(); compartilharLink(); } catch (e) { toast(e.message, 'erro'); }
  },
  'novo-produto'() { formProduto(null); },
  'editar-produto'(el) { formProduto(achar('produtos', el)); },
  async 'excluir-produto'(el) {
    if (!confirm('Excluir este produto?')) return;
    try { await api(`/produtos/${el.dataset.id}`, { metodo: 'DELETE' }); fecharFolha(); toast('Produto excluído'); await carregar(); } catch (e) { toast(e.message, 'erro'); }
  },
  'trocar-senha'() {
    const folha = abrirFolha({
      titulo: 'Alterar senha',
      corpo: `<form id="form-senha" class="form"><div class="grupo">
          <div class="campo"><label>Senha atual</label><input type="password" name="atual" required autocomplete="current-password"></div>
          <div class="campo"><label>Nova senha (mínimo 8 caracteres)</label><input type="password" name="nova" required minlength="8" autocomplete="new-password"></div>
          <div class="campo"><label>Repita a nova senha</label><input type="password" name="nova2" required autocomplete="new-password"></div>
        </div><button class="btn btn-bloco" type="submit">Alterar senha</button></form>`
    });
    aoEnviar(folha, '#form-senha', async f => {
      if (f.nova.value !== f.nova2.value) throw new Error('As duas senhas não são iguais');
      const r = await requisicao('/api/auth/trocar-senha', { metodo: 'POST', corpo: { senha_atual: f.atual.value, nova_senha: f.nova.value }, cabecalhos: { Authorization: 'Bearer ' + JWT } });
      try { localStorage.setItem('ft_token', r.token); } catch (e) { /* ok */ }
      fecharFolha();
      toast('Senha alterada');
      setTimeout(() => location.reload(), 800);
    });
  }
};

document.addEventListener('click', e => {
  const ir = e.target.closest('[data-ir]');
  if (ir) {
    const [pg, aba] = ir.dataset.ir.slice(1).split('-');
    if (aba) estado.abaFin = aba;
    else if (pg === 'financeiro') estado.abaFin = 'cliente';
    if (location.hash === '#' + pg) render(); else location.hash = '#' + pg;
    return;
  }
  const el = e.target.closest('[data-acao]');
  if (el && acoes[el.dataset.acao]) { e.preventDefault(); acoes[el.dataset.acao](el); }
});

document.addEventListener('submit', async e => {
  if (e.target.id !== 'form-mensagem') return;
  e.preventDefault();
  const f = e.target;
  const msg = f.mensagem.value.trim();
  if (!msg) return;
  await comBotao(f.querySelector('[type=submit]'), async () => {
    try { await api('/mensagens', { metodo: 'POST', corpo: { mensagem: msg } }); f.mensagem.value = ''; await carregar(); } catch (err) { toast(err.message, 'erro'); }
  });
});

// ---------- Início ----------
(async () => {
  if (!JWT) return;
  try {
    await requisicao('/api/auth/me', { cabecalhos: { Authorization: 'Bearer ' + JWT } }); // renova o cookie (comprovantes e tempo real)
  } catch (e) {
    if (e.status === 401 || e.status === 403) return sair();
  }
  irPara();
  await carregar();
  let recarga;
  tempoReal('/api/op/eventos', info => {
    if (info.autor === 'cliente' && info.descricao) {
      toast(info.descricao, 'info');
      if (navigator.vibrate) navigator.vibrate(100);
    }
    clearTimeout(recarga);
    recarga = setTimeout(carregar, 250);
  });
})();
