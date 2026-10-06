// ===== Link do cliente: acompanhamento de pedidos, entregas e pagamentos =====
const TOKEN = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
const BASE = `/api/p/${encodeURIComponent(TOKEN)}`;
const CHAVE_VISTO = `pc_visto_${TOKEN.slice(0, 10)}`;

const estado = {
  dados: null,
  aba: local.ler('pc_aba', 'pedidos'),
  abertos: new Set(),
  vistoAte: local.ler(CHAVE_VISTO, null), // último evento do histórico já visto (persistido)
  destaqueAte: null                       // eventos acima deste id aparecem destacados
};
estado.destaqueAte = estado.vistoAte;

const ctx = () => ({
  modo: 'cliente',
  abertos: estado.abertos,
  pagamentos: estado.dados.pagamentos,
  arquivoUrl: id => `${BASE}/arquivos/${id}`,
  nomeEmpresa: () => 'Fernandes Têxtil',
  vistoAte: estado.destaqueAte,
  acoesPedido: p => {
    if (p.status === 'Solicitado') return `<div class="acoes">
      <button class="btn btn-perigo" data-acao="cancelar-solicitacao" data-id="${p.id}">Cancelar solicitação</button></div>`;
    if (p.status === 'Cancelado') return '';
    return `<div class="acoes">
      <button class="btn btn-sec" data-acao="informar-pagamento" data-id="${p.id}">Informar pagamento deste pedido</button></div>`;
  }
});

async function carregar() {
  try {
    const dados = await requisicao(BASE);
    const primeiraVez = !estado.dados;
    estado.dados = dados;
    if (primeiraVez) {
      document.getElementById('nomeCliente').textContent = dados.cliente.nome;
      document.title = `Pedidos ${dados.cliente.nome} — Fernandes Têxtil`;
      // Abre automaticamente o pedido em andamento mais recente
      const emAndamento = dados.pedidos.find(p => !['Entregue', 'Cancelado'].includes(p.status));
      if (emAndamento) estado.abertos.add(emAndamento.id);
      // Primeira visita: nada conta como novidade
      if (estado.vistoAte == null) {
        estado.vistoAte = estado.destaqueAte = dados.historico[0] ? dados.historico[0].id : 0;
        local.gravar(CHAVE_VISTO, estado.vistoAte);
      }
    }
    render();
  } catch (e) {
    if (e.status === 404) {
      document.getElementById('conteudo').innerHTML = `<div class="erro-tela"><div style="font-size:44px">🔒</div>
        <h2>Link inválido</h2><p class="muted">${esc(e.message)}</p></div>`;
      document.getElementById('fab').classList.add('oculto');
    } else if (!estado.dados) {
      document.getElementById('conteudo').innerHTML = `<div class="erro-tela"><div style="font-size:44px">📶</div>
        <h2>Não foi possível carregar</h2><p class="muted">${esc(e.message)}</p>
        <button class="btn" style="margin-top:16px" onclick="location.reload()">Tentar novamente</button></div>`;
    }
  }
}

function render() {
  const d = estado.dados;
  if (!d) return;
  const ultimo = d.historico[0] ? d.historico[0].id : 0;
  if (estado.aba === 'historico') {
    estado.vistoAte = ultimo;
    local.gravar(CHAVE_VISTO, ultimo);
  }
  const novidades = estado.vistoAte == null ? 0 : d.historico.filter(h => h.id > estado.vistoAte && h.autor !== 'cliente').length;
  const c = ctx();

  let corpo = '';
  if (estado.aba === 'pedidos') {
    corpo = d.pedidos.length
      ? d.pedidos.map(p => pedidoHTML(p, c)).join('')
      : `<div class="vazio"><div class="ico">📦</div>Nenhum pedido ainda.<br>${d.produtos.length ? 'Toque em <strong>Solicitar pedido</strong> para fazer o primeiro.' : 'Assim que a Fernandes Têxtil registrar seu pedido, ele aparece aqui.'}</div>`;
  } else if (estado.aba === 'pagamentos') {
    corpo = d.pagamentos.length
      ? d.pagamentos.map(g => pagamentoHTML(g, c)).join('')
      : '<div class="vazio"><div class="ico">💳</div>Nenhum pagamento registrado.<br>Use o botão abaixo para informar um pagamento e enviar o comprovante.</div>';
  } else {
    corpo = `<form class="mensagem-box" id="form-mensagem">
        <textarea name="mensagem" rows="1" placeholder="Escreva uma mensagem..." maxlength="1000"></textarea>
        <button class="btn" type="submit" aria-label="Enviar mensagem">Enviar</button>
      </form>${historicoHTML(d.historico, c)}`;
  }

  document.getElementById('conteudo').innerHTML = resumoHTML(d.resumo) + abasHTML(estado.aba, novidades, 0) + corpo;
  const fab = document.getElementById('fab');
  if (estado.aba === 'pedidos' && d.produtos.length) {
    fab.dataset.acao = 'solicitar-pedido';
    fab.innerHTML = '<span>＋</span> Solicitar pedido';
  } else if (estado.aba === 'pagamentos') {
    fab.dataset.acao = 'informar-pagamento';
    fab.innerHTML = '<span>＋</span> Informar pagamento';
  }
  fab.classList.toggle('oculto', estado.aba === 'historico' || (estado.aba === 'pedidos' && !d.produtos.length));
  if (estado.aba === 'historico') estado.destaqueAte = ultimo;
}

// ---------- Ações ----------
const acoes = {
  aba(el) {
    if (el.dataset.aba === 'historico' && estado.aba !== 'historico') estado.destaqueAte = estado.vistoAte;
    estado.aba = el.dataset.aba;
    local.gravar('pc_aba', estado.aba);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  alternar(el) {
    const id = Number(el.dataset.id);
    if (estado.abertos.has(id)) estado.abertos.delete(id); else estado.abertos.add(id);
    render();
  },
  'informar-pagamento'(el) {
    const folha = abrirFolha(formPagamentoHTML(estado.dados, {
      titulo: 'Informar pagamento',
      ajuda: 'Envie o comprovante. A Fernandes Têxtil vai conferir e confirmar o pagamento.',
      pedidoId: el.dataset.id ? Number(el.dataset.id) : null
    }));
    folha.querySelector('#form-pagamento').addEventListener('submit', async ev => {
      ev.preventDefault();
      const form = ev.target;
      await comBotao(form.querySelector('[type=submit]'), async () => {
        try {
          await requisicao(`${BASE}/pagamentos`, { metodo: 'POST', corpo: await dadosDoForm(form) });
          fecharFolha();
          toast('Pagamento enviado! Aguardando confirmação.');
          estado.aba = 'pagamentos';
          await carregar();
        } catch (e) { toast(e.message, 'erro'); }
      });
    });
  },
  'solicitar-pedido'() {
    const prods = estado.dados.produtos;
    const linhaItem = () => `<div class="item-form">
        <button type="button" class="remover" data-remover-item aria-label="Remover item">×</button>
        <div class="campo"><label>Produto</label><select name="produto_id">
          ${prods.map(p => `<option value="${p.id}" data-preco="${p.preco}" data-unidade="${esc(p.unidade)}">${esc(p.nome)} — ${brl(p.preco)}</option>`).join('')}
        </select></div>
        <div class="campo"><label>Quantidade (<span class="un">${esc(prods[0].unidade)}</span>)</label>
          <input name="quantidade" inputmode="decimal" required placeholder="Ex.: 500" autocomplete="off"></div>
      </div>`;
    const folha = abrirFolha(`<h2>Solicitar pedido</h2>
      <p class="ajuda">A Fernandes Têxtil recebe na hora e confirma o pedido. Você acompanha tudo por aqui.</p>
      <form id="form-solicitar">
        <div id="itens">${linhaItem()}</div>
        ${prods.length > 1 ? '<button type="button" class="btn btn-sec btn-bloco" id="addItem" style="margin-bottom:12px">＋ Adicionar outro produto</button>' : ''}
        <div class="campo"><label>Entrega desejada (opcional)</label><input type="date" name="previsao_entrega" min="${hojeISO()}"></div>
        <div class="campo"><label>Observações (opcional)</label><textarea name="observacoes" placeholder="Cores, tamanhos, embalagem, endereço de entrega..."></textarea></div>
        <div class="estimado"><span>Valor estimado</span><span class="num" id="totalEstimado">R$ 0,00</span></div>
        <p class="nota">Valor pela tabela atual. A Fernandes Têxtil confirma o valor final ao aceitar o pedido.</p>
        <button class="btn btn-bloco" type="submit">Enviar solicitação</button>
        <button class="btn btn-sec btn-bloco" type="button" data-fechar style="margin-top:8px">Cancelar</button>
      </form>`);
    const caixa = folha.querySelector('#itens');
    const total = () => {
      let t = 0;
      caixa.querySelectorAll('.item-form').forEach(el => {
        const op = el.querySelector('select').selectedOptions[0];
        el.querySelector('.un').textContent = op.dataset.unidade;
        t += (lerNumero(el.querySelector('[name=quantidade]').value) || 0) * Number(op.dataset.preco);
      });
      folha.querySelector('#totalEstimado').textContent = brl(t);
    };
    caixa.addEventListener('input', total);
    caixa.addEventListener('change', total);
    caixa.addEventListener('click', e => {
      if (!e.target.closest('[data-remover-item]')) return;
      if (caixa.querySelectorAll('.item-form').length > 1) { e.target.closest('.item-form').remove(); total(); }
    });
    const add = folha.querySelector('#addItem');
    if (add) add.addEventListener('click', () => { caixa.insertAdjacentHTML('beforeend', linhaItem()); total(); });
    if (caixa.querySelectorAll('.item-form').length === 1 && prods.length === 1) caixa.querySelector('.remover').classList.add('oculto');
    setTimeout(() => caixa.querySelector('[name=quantidade]').focus(), 300);

    folha.querySelector('#form-solicitar').addEventListener('submit', async ev => {
      ev.preventDefault();
      const form = ev.target;
      const itens = [...caixa.querySelectorAll('.item-form')].map(el => ({
        produto_id: Number(el.querySelector('select').value),
        quantidade: lerNumero(el.querySelector('[name=quantidade]').value)
      }));
      if (itens.some(i => !(i.quantidade > 0))) return toast('Informe a quantidade de cada produto', 'erro');
      await comBotao(form.querySelector('[type=submit]'), async () => {
        try {
          const r = await requisicao(`${BASE}/pedidos`, { metodo: 'POST', corpo: {
            itens, previsao_entrega: form.previsao_entrega.value || null, observacoes: form.observacoes.value
          } });
          fecharFolha();
          toast(`Pedido #${r.numero} solicitado! Aguarde a confirmação.`);
          estado.aba = 'pedidos';
          estado.abertos.add(r.id);
          await carregar();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) { toast(e.message, 'erro'); }
      });
    });
  },
  async 'cancelar-solicitacao'(el) {
    if (!confirm('Cancelar esta solicitação de pedido?')) return;
    try {
      await requisicao(`${BASE}/pedidos/${el.dataset.id}/cancelar`, { metodo: 'POST' });
      toast('Solicitação cancelada');
      await carregar();
    } catch (e) { toast(e.message, 'erro'); }
  },
  anexar(el) {
    const tipo = el.dataset.tipo;
    const id = Number(el.dataset.id);
    const folha = abrirFolha(formAnexoHTML(tituloAnexo(estado.dados, tipo, id)));
    folha.querySelector('#form-anexo').addEventListener('submit', async ev => {
      ev.preventDefault();
      const form = ev.target;
      await comBotao(form.querySelector('[type=submit]'), async () => {
        try {
          const fd = await dadosDoForm(form);
          fd.set('tipo', tipo);
          fd.set('ref_id', id);
          await requisicao(`${BASE}/anexos`, { metodo: 'POST', corpo: fd });
          fecharFolha();
          toast('Arquivo enviado!');
          await carregar();
        } catch (e) { toast(e.message, 'erro'); }
      });
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
      await requisicao(`${BASE}/mensagens`, { metodo: 'POST', corpo: { mensagem: msg } });
      form.mensagem.value = '';
      await carregar();
    } catch (err) { toast(err.message, 'erro'); }
  });
});

// Atualizações em tempo real
let recarga;
tempoReal(`${BASE}/eventos`, info => {
  clearTimeout(recarga);
  recarga = setTimeout(async () => {
    await carregar();
    if (info.descricao && info.autor !== 'cliente') toast(info.descricao, 'info');
  }, 250);
}, indicadorAoVivo);

carregar();
