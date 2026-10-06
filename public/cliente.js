// ===== Fernandes Têxtil — página do cliente (link de acompanhamento) =====
const TOKEN = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
const BASE = `/api/p/${encodeURIComponent(TOKEN)}`;
const CH = TOKEN.slice(0, 10);
const PAGINAS = ['comprar', 'pedidos', 'pagamentos', 'atividade'];
const estado = {
  d: null,
  pagina: null,
  detalhe: null,                                  // id do pedido aberto
  vistoAte: local.ler(`cli_visto_${CH}`, null),
  destaqueAte: null,
  montador: null,
  paginaDesenhada: null,
  assinaturaProdutos: ''
};
const arquivoUrl = id => `${BASE}/arquivos/${id}`;
const ctxAnexos = { urlArquivo: arquivoUrl };
const FORA = ['Solicitado', 'Cancelado'];

// ---------- Navegação ----------
function irPara() {
  const p = location.hash.slice(1);
  const nova = PAGINAS.includes(p) ? p : (estado.d && estado.d.pedidos.length ? 'pedidos' : 'comprar');
  estado.detalhe = null;
  fecharFolha(true);
  if (nova === 'atividade' && estado.pagina !== 'atividade') estado.destaqueAte = estado.vistoAte;
  estado.pagina = nova;
  estado.paginaDesenhada = null;
  render();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', irPara);

async function carregar() {
  try {
    const primeira = !estado.d;
    estado.d = await requisicao(BASE);
    const d = estado.d;
    if (primeira) {
      document.title = `Pedidos ${d.cliente.nome} — Fernandes Têxtil`;
      if (estado.vistoAte == null) { estado.vistoAte = d.historico[0] ? d.historico[0].id : 0; local.gravar(`cli_visto_${CH}`, estado.vistoAte); }
      criarMontador();
      irPara();
    } else {
      render();
    }
    renderDetalhe();
  } catch (e) {
    if (e.status === 404) {
      document.getElementById('conteudo').innerHTML = vazioHTML('cadeado', 'Link inválido', esc(e.message));
      document.querySelector('.lateral').classList.add('oculto');
      document.getElementById('abasInf').classList.add('oculto');
    } else if (!estado.d) {
      document.getElementById('conteudo').innerHTML = vazioHTML('alerta', 'Não foi possível carregar', esc(e.message), '<button class="btn" onclick="location.reload()">Tentar novamente</button>');
    }
  }
}

function render() {
  const d = estado.d;
  if (!d || !estado.pagina) return;
  if (estado.pagina === 'atividade') {
    estado.vistoAte = d.historico[0] ? d.historico[0].id : 0;
    local.gravar(`cli_visto_${CH}`, estado.vistoAte);
  }
  const novidades = d.historico.filter(h => h.id > estado.vistoAte && h.autor !== 'cliente').length;
  montarNavegacao({
    ativo: estado.pagina,
    itens: [
      { id: 'comprar', rotulo: 'Fazer pedido', icone: 'sacola' },
      { id: 'pedidos', rotulo: 'Meus pedidos', icone: 'pedidos' },
      { id: 'pagamentos', rotulo: 'Pagamentos', icone: 'financeiro' },
      { id: 'atividade', rotulo: 'Atividade', icone: 'atividade', badge: novidades }
    ]
  });
  document.getElementById('marcaSub').textContent = d.cliente.nome;
  document.getElementById('marcaSubMovel').textContent = d.cliente.nome;

  if (estado.pagina === 'comprar') {
    const assinatura = JSON.stringify(d.produtos);
    if (estado.paginaDesenhada === 'comprar' && assinatura === estado.assinaturaProdutos) return atualizarCesto();
    estado.assinaturaProdutos = assinatura;
    estado.montador.atualizarProdutos(d.produtos);
    document.getElementById('conteudo').innerHTML = pgComprar();
    if (d.produtos.length) {
      estado.montador.montar(document.getElementById('mSel'), document.getElementById('mLin'));
      atualizarTituloProduto();
    }
  } else {
    const paginas = { pedidos: pgPedidos, pagamentos: pgPagamentos, atividade: pgAtividade };
    document.getElementById('conteudo').innerHTML = paginas[estado.pagina]();
  }
  estado.paginaDesenhada = estado.pagina;
  atualizarCesto();
  if (estado.pagina === 'atividade') estado.destaqueAte = estado.vistoAte;
}

const cab = (titulo, sub = '', acoes = '', sobre = 'Fernandes Têxtil') => `<header class="cab"><div>
    ${sobre ? `<p class="sobre">${esc(sobre)}</p>` : ''}<h1>${esc(titulo)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>
    ${acoes ? `<div class="cab-acoes">${acoes}</div>` : ''}</header>`;

// ---------- Fazer pedido (loja com cesto) ----------
function criarMontador() {
  const d = estado.d;
  // Restaura o cesto salvo neste aparelho, com o preço atual da tabela
  const salvo = local.ler(`cesto_${CH}`, []).map(l => {
    const p = d.produtos.find(x => x.id === l.produto_id);
    if (!p) return null;
    const c = p.cores.find(x => x.nome === l.cor);
    if (p.cores.length && !c) return null;
    return { ...l, produto_nome: p.nome, unidade: p.unidade, preco_unitario: p.preco, hex: c ? c.hex : null };
  }).filter(Boolean);
  estado.montador = new Montador({
    produtos: d.produtos, campoPreco: 'preco', escolhaProduto: false, rotuloAdd: 'Adicionar ao cesto',
    vazio: 'Seu cesto está vazio. Escolha uma cor e a quantidade.', linhas: salvo,
    aoMudar: () => { local.gravar(`cesto_${CH}`, estado.montador.linhas); atualizarCesto(); }
  });
}

function pgComprar() {
  const d = estado.d;
  const m = estado.montador;
  const saud = `Olá${d.cliente.contato ? ', ' + d.cliente.contato.split(' ')[0] : ''}`;
  if (!d.produtos.length) return cab('Fazer pedido', '', '', saud) + vazioHTML('sacola', 'Nenhum produto disponível', 'A Fernandes Têxtil ainda não cadastrou os produtos. Volte em breve.');
  return cab('Fazer pedido', 'Escolha o produto, toque na cor e informe a quantidade.', '', saud) +
    `<div class="loja">
      <div>
        <div class="produtos">${d.produtos.map(p => `<button class="prod ${p.id === m.prodId ? 'on' : ''}" data-acao="escolher-produto" data-id="${p.id}" aria-pressed="${p.id === m.prodId}">
            <div class="img">${p.foto_url ? `<img src="${p.foto_url}" alt="${esc(p.nome)}">` : `<span class="sem-foto">${p.cores.slice(0, 5).map(c => `<i style="background:${esc(c.hex)}"></i>`).join('') || icone('sacola', 40)}</span>`}</div>
            <div class="info"><h3>${esc(p.nome)}</h3><div class="preco">${brl(p.preco)} por ${esc(unidadeSing(p.unidade))}</div>
              ${p.descricao ? `<div class="desc">${esc(p.descricao)}</div>` : ''}
              ${p.cores.length ? `<div class="bolinhas">${p.cores.slice(0, 12).map(c => dot(c.hex, 14)).join('')}</div>` : ''}</div>
          </button>`).join('')}</div>
        <div class="card" id="seletor"><div class="seletor-tit" id="selTit"></div><p class="seletor-sub" id="selSub"></p><div id="mSel"></div></div>
      </div>
      <aside class="card cesto-lateral">
        <h2>Seu cesto</h2>
        <p class="muted" style="font-size:14px;margin-bottom:8px">Ajuste a quantidade de cada cor aqui.</p>
        <div id="mLin"></div>
        <button class="btn btn-bloco" data-acao="finalizar" id="btFinalizar" style="margin-top:16px">Finalizar pedido</button>
      </aside>
    </div>`;
}

function atualizarTituloProduto() {
  const p = estado.montador.produto;
  const t = document.getElementById('selTit');
  if (!p || !t) return;
  t.textContent = p.nome;
  document.getElementById('selSub').textContent = `${brl(p.preco)} por ${unidadeSing(p.unidade)}${p.cores.length ? ` · ${p.cores.length} ${p.cores.length === 1 ? 'cor' : 'cores'}` : ''}`;
}

function atualizarCesto() {
  const m = estado.montador;
  const n = m ? m.linhas.length : 0;
  const bt = document.getElementById('btFinalizar');
  if (bt) bt.disabled = !n;
  const barra = document.getElementById('barraCesto');
  const mostrar = estado.pagina === 'comprar' && n > 0;
  document.body.classList.toggle('com-cesto', mostrar);
  barra.innerHTML = mostrar ? `<div class="barra-cesto"><span>${icone('sacola', 22)}</span>
      <div class="bc-info"><b>${n} ${n === 1 ? 'cor' : 'cores'} · ${qtd(m.totalQtd)} peças</b><small>${brl(m.total)}</small></div>
      <button class="bc-bt" data-acao="finalizar">Revisar</button></div>` : '';
}

function resumoCestoHTML(linhas) {
  const grupos = new Map();
  for (const l of linhas) {
    if (!grupos.has(l.produto_nome)) grupos.set(l.produto_nome, []);
    grupos.get(l.produto_nome).push(l);
  }
  return [...grupos].map(([nome, ls]) => `<div class="m-grupo"><div class="m-gnome">${esc(nome)}</div>
      ${ls.map(l => `<div class="m-linha"><span class="m-cor">${l.cor ? dot(l.hex, 14) + esc(l.cor) : esc(l.unidade)}</span>
        <span class="num forte">${qtd(l.quantidade)}</span><span class="m-sub num">${brl(l.quantidade * l.preco_unitario)}</span></div>`).join('')}</div>`).join('');
}

// ---------- Meus pedidos ----------
function linhaPedido(p) {
  const aceito = !FORA.includes(p.status);
  return `<button class="item" data-acao="abrir-pedido" data-id="${p.id}">
    <div class="meio">
      <div class="tit">Pedido #${p.numero} ${pillStatus(p.status)} ${pillPagoPedido(p)}</div>
      <div class="det">${dataBR(p.data_pedido)} · ${resumoCoresHTML(p.itens)}</div>
      ${aceito ? `<div class="barra verde" style="margin-top:9px;max-width:260px"><i style="width:${pct(p.qtd_entregue, p.qtd_total).toFixed(1)}%"></i></div>` : ''}
    </div>
    <div class="dir"><b>${brl(p.valor_total)}</b><small>${aceito ? `${qtd(p.qtd_entregue)} de ${qtd(p.qtd_total)} recebidas` : p.status === 'Solicitado' ? 'aguardando aprovação' : ''}</small></div>
    <span class="chev">${icone('seta', 16)}</span></button>`;
}

function pgPedidos() {
  const d = estado.d;
  const r = d.resumo;
  const h = cab('Meus pedidos', 'Acompanhe status, entregas e pagamentos em tempo real.', `<a class="btn" href="#comprar">${icone('mais', 18)} Fazer pedido</a>`) +
    `<div class="grade">
      <div class="card kpi"><div class="rot"><span class="ico t-verde">${icone('receber', 17)}</span>${r.saldo > 0.004 ? 'Saldo a pagar' : 'Pagamentos'}</div><div class="val">${r.saldo > 0.004 ? brl(r.saldo) : 'Em dia'}</div><div class="sub">Pago ${brl(r.total_pago)} de ${brl(r.total_pedidos)}</div></div>
      <div class="card kpi"><div class="rot"><span class="ico t-laranja">${icone('caminhao', 17)}</span>A receber</div><div class="val">${qtd(r.qtd_a_entregar)} <small style="font-size:16px;color:var(--texto-2)">peças</small></div><div class="sub">${r.pedidos_abertos} pedido(s) em andamento${r.pedidos_solicitados ? ` · ${r.pedidos_solicitados} aguardando aprovação` : ''}</div></div>
    </div>`;
  if (!d.pedidos.length) return h + vazioHTML('pedidos', 'Nenhum pedido ainda', 'Monte seu primeiro pedido escolhendo as cores e quantidades.', '<a class="btn" href="#comprar">Fazer pedido</a>');
  return h + `<div class="secao"><h2>Pedidos</h2></div><div class="lista">${d.pedidos.map(linhaPedido).join('')}</div>`;
}

function detalhePedidoHTML(p) {
  const d = estado.d;
  const acoes = p.status === 'Solicitado'
    ? `<button class="btn btn-perigo" data-acao="cancelar-solicitacao" data-id="${p.id}">Cancelar solicitação</button>`
    : p.status !== 'Cancelado' ? `<button class="btn" data-acao="informar-pagamento" data-id="${p.id}">${icone('receber', 18)} Informar pagamento</button>` : '';
  return `<div style="margin-bottom:16px">${pillStatus(p.status)}</div>
    ${etapasHTML(p.status)}
    <div class="info-grade quatro" style="margin-top:16px">
      <div><span>Feito em</span><b>${dataBR(p.data_pedido)}</b></div>
      <div><span>Previsão</span><b>${dataBR(p.previsao_entrega)}</b></div>
      <div><span>${p.status === 'Solicitado' ? 'Valor estimado' : 'Valor'}</span><b>${brl(p.valor_total)}</b></div>
      <div><span>${p.quitado ? 'Pago ✓' : 'Falta pagar'}</span><b style="color:${p.quitado ? 'var(--verde)' : p.falta_pagar > 0.004 ? 'var(--laranja)' : 'inherit'}">${p.quitado ? brl(p.valor_pago) : brl(p.falta_pagar)}</b></div>
    </div>
    <div class="bloco-tit">Itens</div>
    ${itensPedidoHTML(p, { mostrarEntrega: !FORA.includes(p.status) })}
    ${p.observacoes ? `<div class="bloco-tit">Observações</div><div class="obs">${esc(p.observacoes)}</div>` : ''}
    ${FORA.includes(p.status) ? '' : `<div class="bloco-tit">Entregas (${p.entregas.length})</div>
      ${enviosHTML(p, ctxAnexos)}
      <div class="bloco-tit">Pagamento do pedido</div>
      ${pagamentosDoPedidoHTML(p, d.recebimentos)}`}
    ${p.anexos.length ? `<div class="bloco-tit">Arquivos</div>${anexosHTML(p.anexos, 'pedido', p.id, { ...ctxAnexos, podeAnexar: false })}` : ''}
    ${acoes ? `<div class="rodape-acoes">${acoes}</div>` : ''}`;
}

function abrirPedido(id) {
  const p = estado.d.pedidos.find(x => x.id === id);
  if (!p) return;
  estado.detalhe = id;
  abrirFolha({ titulo: `Pedido #${p.numero}`, corpo: detalhePedidoHTML(p), larga: true, aoFechar: () => { estado.detalhe = null; } });
}
function renderDetalhe() {
  const corpo = corpoFolha();
  if (!estado.detalhe || !corpo) return;
  const p = estado.d.pedidos.find(x => x.id === estado.detalhe);
  if (!p) return fecharFolha();
  const rol = corpo.scrollTop;
  corpo.innerHTML = detalhePedidoHTML(p);
  corpo.scrollTop = rol;
}

// ---------- Pagamentos ----------
function pgPagamentos() {
  const d = estado.d;
  const r = d.resumo;
  const h = cab('Pagamentos', 'Envie o comprovante; a Fernandes Têxtil confirma em seguida.', `<button class="btn" data-acao="informar-pagamento">${icone('mais', 18)} Informar pagamento</button>`) +
    `<div class="card kpi"><div class="rot"><span class="ico t-verde">${icone('receber', 17)}</span>${r.saldo > 0.004 ? 'Saldo a pagar' : r.saldo < -0.004 ? 'Crédito' : 'Tudo pago'}</div>
      <div class="val">${brl(Math.abs(r.saldo))}</div><div class="sub">Pago ${brl(r.total_pago)} de ${brl(r.total_pedidos)} em pedidos aceitos</div>
      <div class="barra verde" style="margin-top:14px"><i style="width:${pct(r.total_pago, r.total_pedidos).toFixed(1)}%"></i></div></div>`;
  if (!d.recebimentos.length) return h + vazioHTML('financeiro', 'Nenhum pagamento ainda', 'Use "Informar pagamento" para enviar o comprovante.');
  return h + `<p class="lista-rot">Histórico de pagamentos</p><div class="lista">${d.recebimentos.map(g => `<div class="item-bloco">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b class="num" style="font-size:17px">${brl(g.valor)}</b>${pillPagamento(g.status)}</div>
      <div class="muted" style="font-size:13.5px;margin-top:2px">${esc(g.forma || '')} · ${dataBR(g.data)}</div>
      ${aplicacoesHTML(g)}
      ${g.observacao ? `<div class="obs" style="margin-top:8px;box-shadow:none;background:var(--fill-2)">${esc(g.observacao)}</div>` : ''}
      ${anexosHTML(g.anexos, 'pagamento', g.id, ctxAnexos)}
    </div>`).join('')}</div>`;
}

// ---------- Atividade ----------
function pgAtividade() {
  const d = estado.d;
  return cab('Atividade', 'Tudo o que acontece com seus pedidos, em tempo real.') +
    `<form class="caixa-msg" id="form-mensagem"><textarea name="mensagem" rows="1" maxlength="1000" placeholder="Mensagem para a Fernandes Têxtil…"></textarea>
      <button class="btn" type="submit">Enviar</button></form>` +
    historicoHTML(d.historico, { nomeAutor: () => 'Fernandes Têxtil', destaqueAte: estado.destaqueAte });
}

// ---------- Ações ----------
const acoes = {
  'escolher-produto'(el) {
    const m = estado.montador;
    m.escolherProduto(Number(el.dataset.id));
    document.querySelectorAll('.prod').forEach(b => { const on = Number(b.dataset.id) === m.prodId; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    atualizarTituloProduto();
    if (!window.matchMedia('(min-width: 1000px)').matches) document.getElementById('seletor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  finalizar() {
    const m = estado.montador;
    if (!m.linhas.length) return toast('Adicione pelo menos uma cor ao cesto', 'erro');
    const folha = abrirFolha({
      titulo: 'Revisar pedido',
      corpo: `<div class="grupo" style="background:var(--elev);border-radius:var(--r-m);padding:8px 16px 14px;box-shadow:var(--sombra);margin-bottom:16px">
          ${resumoCestoHTML(m.linhas)}
          <div class="m-total"><span>${qtd(m.totalQtd)} peças · ${m.linhas.length} ${m.linhas.length === 1 ? 'cor' : 'cores'}</span><b class="num">${brl(m.total)}</b></div>
        </div>
        <form id="form-finalizar" class="form">
          <div class="grupo">
            <div class="campo"><label>Entrega desejada (opcional)</label><input type="date" name="previsao_entrega" min="${hojeISO()}"></div>
            <div class="campo"><label>Observações (opcional)</label><textarea name="observacoes" rows="2" placeholder="Endereço de entrega, embalagem, prazos..."></textarea></div>
          </div>
          <p class="muted" style="font-size:13px;margin:0 4px 16px">Valor pela tabela atual. A Fernandes Têxtil confirma o pedido e o valor final.</p>
          <button class="btn btn-bloco" type="submit">${icone('check', 18)} Enviar pedido</button>
          <a class="btn btn-texto btn-bloco" href="#comprar" data-fechar style="margin-top:8px">Continuar escolhendo</a>
        </form>`
    });
    aoEnviar(folha, '#form-finalizar', async f => {
      const r = await requisicao(`${BASE}/pedidos`, { metodo: 'POST', corpo: { itens: m.itensParaEnvio(), previsao_entrega: f.previsao_entrega.value || null, observacoes: f.observacoes.value } });
      m.linhas = [];
      local.gravar(`cesto_${CH}`, []);
      fecharFolha();
      toast(`Pedido #${r.numero} enviado! Aguarde a confirmação.`);
      location.hash = '#pedidos';
      await carregar();
      abrirPedido(r.id);
    });
  },
  'abrir-pedido'(el) { abrirPedido(Number(el.dataset.id)); },
  async 'cancelar-solicitacao'(el) {
    if (!confirm('Cancelar esta solicitação de pedido?')) return;
    try { await requisicao(`${BASE}/pedidos/${el.dataset.id}/cancelar`, { metodo: 'POST' }); toast('Solicitação cancelada'); await carregar(); } catch (e) { toast(e.message, 'erro'); }
  },
  'informar-pagamento'(el) {
    const d = estado.d;
    const pedidoId = el.dataset.id ? Number(el.dataset.id) : null;
    const ped = pedidoId ? d.pedidos.find(x => x.id === pedidoId) : null;
    const sugestao = ped ? ped.falta_pagar : d.resumo.saldo;
    estado.detalhe = null;
    const folha = abrirFolha({
      titulo: 'Informar pagamento',
      corpo: `<p class="ajuda">Informe o valor pago e envie o comprovante. Não precisa escolher o pedido: depois que a Fernandes Têxtil confirmar, o valor dá baixa sozinho nos pedidos em aberto, do mais antigo para o mais novo.</p>${formPagamentoHTML({ formas: d.formas_pagamento, pedidos: d.pedidos, botao: 'Enviar pagamento', valor: sugestao > 0.004 ? precoParaCampo(sugestao) : '' })}`,
      aoFechar: pedidoId ? () => abrirPedido(pedidoId) : null
    });
    ligarPreviaBaixa(folha, d.pedidos);
    aoEnviar(folha, '#form-pagamento', async f => {
      await requisicao(`${BASE}/pagamentos`, { metodo: 'POST', corpo: await dadosDoForm(f) });
      toast('Pagamento enviado! Aguardando confirmação.');
      await carregar();
      fecharFolha();
    });
  },
  anexar(el) {
    const tipo = el.dataset.tipo;
    const id = Number(el.dataset.id);
    const voltar = estado.detalhe;
    estado.detalhe = null;
    const folha = abrirFolha({
      titulo: 'Anexar comprovante',
      corpo: `<form id="form-anexo" class="form"><div class="grupo">${campoArquivoHTML('Escolher foto ou PDF', true)}</div><button class="btn btn-bloco" type="submit">Enviar</button></form>`,
      aoFechar: voltar ? () => abrirPedido(voltar) : null
    });
    aoEnviar(folha, '#form-anexo', async f => {
      const fd = await dadosDoForm(f);
      fd.set('tipo', tipo);
      fd.set('ref_id', id);
      await requisicao(`${BASE}/anexos`, { metodo: 'POST', corpo: fd });
      toast('Comprovante enviado');
      await carregar();
      fecharFolha();
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
  const f = e.target;
  const msg = f.mensagem.value.trim();
  if (!msg) return;
  await comBotao(f.querySelector('[type=submit]'), async () => {
    try { await requisicao(`${BASE}/mensagens`, { metodo: 'POST', corpo: { mensagem: msg } }); f.mensagem.value = ''; await carregar(); } catch (err) { toast(err.message, 'erro'); }
  });
});

// ---------- Início ----------
let recarga;
tempoReal(`${BASE}/eventos`, info => {
  clearTimeout(recarga);
  recarga = setTimeout(async () => {
    await carregar();
    if (info.descricao && info.autor !== 'cliente') toast(info.descricao, 'info');
  }, 250);
});
carregar();
