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
  acoesPedido: p => p.status === 'Cancelado' ? '' : `<div class="acoes">
      <button class="btn btn-sec" data-acao="informar-pagamento" data-id="${p.id}">Informar pagamento deste pedido</button>
    </div>`
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
      : '<div class="vazio"><div class="ico">📦</div>Nenhum pedido registrado ainda.<br>Assim que a Fernandes Têxtil registrar seu pedido, ele aparece aqui.</div>';
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
  document.getElementById('fab').classList.toggle('oculto', estado.aba === 'historico');
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
