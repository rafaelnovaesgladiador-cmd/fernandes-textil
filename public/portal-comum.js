// ===== Portal do Cliente — funções compartilhadas (gestão e link do cliente) =====

// ---------- Formatação ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const qtd = v => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const dataBR = s => (s ? s.split('-').reverse().join('/') : '—');
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Datas gravadas pelo SQLite (CURRENT_TIMESTAMP) estão em UTC
const lerTS = s => new Date(String(s).replace(' ', 'T') + (String(s).endsWith('Z') ? '' : 'Z'));
const horaBR = d => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
function diaRotulo(d) {
  const ini = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dif = Math.round((ini(new Date()) - ini(d)) / 86400000);
  if (dif === 0) return 'Hoje';
  if (dif === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}
// Aceita 1500 | 1500.5 | 1.500 | 1.500,50 (mesma regra do servidor)
function lerNumero(v) {
  let t = String(v ?? '').replace(/[R$\s]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return t && Number.isFinite(n) ? n : NaN;
}
const precoParaCampo = v => (v == null || v === '' || !Number.isFinite(Number(v)) ? '' : Number(v).toFixed(2).replace('.', ','));
const numParaCampo = v => (v == null || v === '' ? '' : String(v).replace('.', ','));
const unidadeDe = p => (p.itens && p.itens[0] && p.itens[0].unidade) || 'peças';

// ---------- Armazenamento local (opcional) ----------
const local = {
  ler(k, padrao) { try { const v = localStorage.getItem(k); return v === null ? padrao : JSON.parse(v); } catch (e) { return padrao; } },
  gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
};

// ---------- Avisos e folhas ----------
function toast(msg, tipo = '') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), tipo === 'erro' ? 5000 : 3500);
}

function abrirFolha(html) {
  fecharFolha();
  const fundo = document.createElement('div');
  fundo.className = 'fundo';
  fundo.id = 'folha';
  fundo.innerHTML = `<div class="folha" role="dialog" aria-modal="true"><div class="pegador"></div>${html}</div>`;
  fundo.addEventListener('click', e => { if (e.target === fundo || e.target.closest('[data-fechar]')) fecharFolha(); });
  document.body.appendChild(fundo);
  document.body.style.overflow = 'hidden';
  ligarCamposArquivo(fundo);
  return fundo.querySelector('.folha');
}
function fecharFolha() {
  const f = document.getElementById('folha');
  if (f) f.remove();
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharFolha(); });

// ---------- Arquivos ----------
function campoArquivoHTML(rotulo = 'Anexar comprovante (foto ou PDF)', obrigatorio = false) {
  return `<div class="campo"><label class="arquivo-campo">
    <span class="prev">📎</span><span class="nome">${esc(rotulo)}${obrigatorio ? '' : ' — opcional'}</span>
    <input type="file" name="arquivo" accept="image/*,application/pdf" ${obrigatorio ? 'required' : ''}>
  </label></div>`;
}
function ligarCamposArquivo(raiz) {
  raiz.querySelectorAll('.arquivo-campo input[type=file]').forEach(inp => {
    inp.addEventListener('change', () => {
      const f = inp.files[0];
      const lab = inp.closest('.arquivo-campo');
      const prev = lab.querySelector('.prev');
      lab.querySelector('.nome').textContent = f ? f.name : 'Anexar comprovante';
      if (f && f.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.className = 'prev';
        img.src = URL.createObjectURL(f);
        prev.replaceWith(img);
      } else if (f) {
        prev.textContent = '📄';
      }
    });
  });
}

// Reduz fotos grandes do celular antes de enviar (economiza dados e espaço)
async function comprimirImagem(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.2 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 1800;
    const fator = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * fator);
    canvas.height = Math.round(bmp.height * fator);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (e) {
    return file;
  }
}

// Monta FormData a partir de um formulário, comprimindo a imagem anexada
async function dadosDoForm(form) {
  const fd = new FormData(form);
  const arq = fd.get('arquivo');
  if (arq && arq.size) fd.set('arquivo', await comprimirImagem(arq));
  else fd.delete('arquivo');
  return fd;
}

async function requisicao(url, { metodo = 'GET', corpo, cabecalhos = {} } = {}) {
  const opts = { method: metodo, headers: { ...cabecalhos } };
  if (corpo instanceof FormData) opts.body = corpo;
  else if (corpo !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(corpo); }
  let resp;
  try {
    resp = await fetch(url, opts);
  } catch (e) {
    throw new Error('Sem conexão. Verifique a internet e tente novamente.');
  }
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(dados.error || 'Não foi possível concluir. Tente novamente.');
    err.status = resp.status;
    throw err;
  }
  return dados;
}

// Trava o botão de envio enquanto a ação roda
async function comBotao(btn, fn) {
  const txt = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Enviando...';
  try { await fn(); } finally { btn.disabled = false; btn.innerHTML = txt; }
}

// ---------- Status ----------
const COR_STATUS = {
  'Recebido': 'b-azul', 'Em produção': 'b-ambar', 'Pronto para entrega': 'b-roxo',
  'Entregue parcialmente': 'b-teal', 'Entregue': 'b-verde', 'Cancelado': 'b-cinza'
};
const COR_PAGAMENTO = { 'Confirmado': 'b-verde', 'Aguardando confirmação': 'b-ambar', 'Recusado': 'b-vermelho' };
const badgeStatus = s => `<span class="badge ${COR_STATUS[s] || 'b-cinza'}">${esc(s)}</span>`;
const badgePagamento = s => `<span class="badge ${COR_PAGAMENTO[s] || 'b-cinza'}">${s === 'Confirmado' ? '✓ ' : ''}${esc(s)}</span>`;

function etapasHTML(status) {
  if (status === 'Cancelado') return '';
  const etapas = ['Recebido', 'Em produção', 'Pronto', 'Entregue'];
  const idx = { 'Recebido': 0, 'Em produção': 1, 'Pronto para entrega': 2, 'Entregue parcialmente': 3, 'Entregue': 3 }[status] ?? 0;
  const completo = status === 'Entregue';
  return `<div class="etapas">${etapas.map((e, i) => {
    const feita = i < idx || (i === idx && (completo || i < 3));
    const rot = i === 3 && status === 'Entregue parcialmente' ? 'Entregando' : e;
    return `<div class="etapa ${feita ? 'feita' : ''} ${i === idx ? 'atual' : ''}"><i>${feita ? '✓' : ''}</i>${rot}</div>`;
  }).join('')}</div>`;
}

// ---------- Blocos de tela ----------
function resumoHTML(r) {
  const pct = r.total_pedidos > 0 ? Math.min(100, (r.total_pago / r.total_pedidos) * 100) : 0;
  return `<div class="resumo">
    <div class="stat destaque">
      <div class="rot">${r.saldo > 0.004 ? 'Saldo a pagar' : r.saldo < -0.004 ? 'Crédito do cliente' : 'Tudo pago'}</div>
      <div class="val num">${brl(Math.abs(r.saldo))}</div>
      <div class="sub">Pago ${brl(r.total_pago)} de ${brl(r.total_pedidos)}</div>
      <div class="barra"><span style="width:${pct.toFixed(1)}%"></span></div>
    </div>
    <div class="stat"><div class="rot">Pedidos em aberto</div><div class="val num">${r.pedidos_abertos}</div></div>
    <div class="stat"><div class="rot">A entregar</div><div class="val num">${qtd(r.qtd_a_entregar)}</div><div class="sub">peças</div></div>
  </div>`;
}

function anexosHTML(lista, tipo, refId, ctx) {
  const thumbs = (lista || []).map(a => {
    const url = ctx.arquivoUrl(a.id);
    const quem = a.enviado_por === 'cliente' ? '<span class="quem">cliente</span>' : '';
    const conteudo = (a.mime || '').startsWith('image/') && !/heic|heif/.test(a.mime)
      ? `<img src="${url}" alt="${esc(a.nome_original)}" loading="lazy">`
      : `<span class="pdf">${(a.mime || '').includes('pdf') ? 'PDF' : 'ARQ'}</span>`;
    return ctx.modo === 'gestao'
      ? `<button class="anexo" data-acao="ver-anexo" data-id="${a.id}" title="${esc(a.nome_original)}">${conteudo}${quem}</button>`
      : `<a class="anexo" href="${url}" target="_blank" rel="noopener" title="${esc(a.nome_original)}">${conteudo}${quem}</a>`;
  }).join('');
  const add = ctx.podeAnexar === false ? '' : `<button class="anexo-add" data-acao="anexar" data-tipo="${tipo}" data-id="${refId}">＋<br>Anexar</button>`;
  return thumbs || add ? `<div class="anexos">${thumbs}${add}</div>` : '';
}

function pedidoHTML(p, ctx) {
  const aberto = ctx.abertos.has(p.id);
  const un = unidadeDe(p);
  const pct = p.qtd_total > 0 ? Math.min(100, (p.qtd_entregue / p.qtd_total) * 100) : 0;
  const itensTxt = p.itens.map(i => `${qtd(i.quantidade)} ${esc(i.unidade)} · ${esc(i.produto_nome)}`).join(' + ');
  const pagoTxt = p.status === 'Cancelado' ? '' : p.valor_pago >= p.valor_total - 0.004 && p.valor_total > 0 ? 'Quitado ✓' : p.valor_pago > 0 ? `Pago ${brl(p.valor_pago)}` : '';
  const pagamentos = ctx.pagamentos.filter(g => g.pedido_id === p.id);

  let detalhe = '';
  if (aberto) {
    detalhe = `<div class="detalhe">
      ${etapasHTML(p.status)}
      <h4>Itens</h4>
      <table class="itens">${p.itens.map(i => `<tr>
        <td><strong>${esc(i.produto_nome)}</strong><br><span class="muted">${qtd(i.quantidade)} ${esc(i.unidade)} × ${brl(i.preco_unitario)}</span></td>
        <td class="num">${brl(i.subtotal)}</td></tr>`).join('')}
        <tr><td><strong>Total</strong></td><td class="num"><strong>${brl(p.valor_total)}</strong></td></tr>
      </table>
      ${p.observacoes ? `<h4>Observações</h4><div class="obs">${esc(p.observacoes)}</div>` : ''}
      <h4>Entregas (${p.entregas.length})</h4>
      <div class="sublista">${p.entregas.length ? p.entregas.map(e => `<div class="subitem">
          <div class="cab"><strong>${dataBR(e.data)} · ${qtd(e.quantidade)} ${esc(un)}</strong>
          ${ctx.modo === 'gestao' ? `<button class="btn btn-peq btn-perigo" data-acao="excluir-entrega" data-id="${e.id}" aria-label="Excluir entrega">Excluir</button>` : ''}</div>
          ${e.observacao ? `<div class="txt">${esc(e.observacao)}</div>` : ''}
          ${anexosHTML(e.anexos, 'entrega', e.id, ctx)}
        </div>`).join('') : '<div class="vazio-mini">Nenhuma entrega registrada ainda.</div>'}</div>
      <h4>Pagamentos deste pedido</h4>
      <div class="sublista">${pagamentos.length ? pagamentos.map(g => `<div class="subitem"><div class="cab">
          <strong class="num">${brl(g.valor)}</strong>${badgePagamento(g.status)}</div>
          <div class="txt">${esc(g.forma || '')} · ${dataBR(g.data)}</div></div>`).join('') : '<div class="vazio-mini">Nenhum pagamento vinculado a este pedido.</div>'}</div>
      <h4>Arquivos do pedido</h4>
      ${anexosHTML(p.anexos, 'pedido', p.id, ctx) || '<div class="vazio-mini">Nenhum arquivo.</div>'}
      ${ctx.acoesPedido ? ctx.acoesPedido(p) : ''}
    </div>`;
  }

  return `<div class="cartao ${aberto ? 'aberto' : ''}" id="pedido-${p.id}">
    <button class="cartao-topo" data-acao="alternar" data-id="${p.id}" aria-expanded="${aberto}">
      <div class="info">
        <h3>Pedido #${p.numero} ${badgeStatus(p.status)}</h3>
        <div class="linha">Feito em ${dataBR(p.data_pedido)}${p.previsao_entrega && p.status !== 'Entregue' ? ` · Previsão ${dataBR(p.previsao_entrega)}` : ''}</div>
        <div class="linha">${itensTxt}</div>
      </div>
      <div class="valor"><strong class="num">${brl(p.valor_total)}</strong><small>${pagoTxt}</small><div class="seta">▼</div></div>
    </button>
    ${p.status === 'Cancelado' ? '' : `<div class="progresso">
      <div class="trilho"><span style="width:${pct.toFixed(1)}%"></span></div>
      <div class="legenda"><span>Entregue ${qtd(p.qtd_entregue)} de ${qtd(p.qtd_total)} ${esc(un)}</span><span>${Math.floor(pct)}%</span></div>
    </div>`}
    ${detalhe}
  </div>`;
}

function pagamentoHTML(g, ctx) {
  const quem = g.informado_por === 'cliente' ? 'Informado pelo cliente' : 'Registrado pela Fernandes Têxtil';
  return `<div class="cartao" id="pagamento-${g.id}"><div class="cartao-topo" style="cursor:default">
      <div class="info">
        <h3><span class="num">${brl(g.valor)}</span> ${badgePagamento(g.status)}</h3>
        <div class="linha">${esc(g.forma || '—')} · ${dataBR(g.data)}${g.pedido_numero ? ` · Pedido #${g.pedido_numero}` : ''}</div>
        <div class="linha">${quem}</div>
        ${g.observacao ? `<div class="obs" style="margin-top:8px">${esc(g.observacao)}</div>` : ''}
        ${anexosHTML(g.anexos, 'pagamento', g.id, ctx)}
        ${ctx.acoesPagamento ? ctx.acoesPagamento(g) : ''}
      </div>
    </div></div>`;
}

function historicoHTML(historico, ctx) {
  if (!historico.length) return '<div class="vazio"><div class="ico">🕒</div>Nada registrado ainda.</div>';
  let dia = '';
  let html = '<div class="linha-tempo">';
  for (const h of historico) {
    const d = lerTS(h.created_at);
    const rot = diaRotulo(d);
    if (rot !== dia) { dia = rot; html += `<div class="dia">${esc(rot)}</div>`; }
    const novo = ctx.vistoAte != null && h.id > ctx.vistoAte ? 'novo' : '';
    html += `<div class="evento t-${esc(h.tipo)} ${h.autor === 'cliente' ? 'do-cliente' : ''} ${novo}">
      <div class="quando"><span>${horaBR(d)}</span>·<b>${esc(h.autor === 'cliente' ? h.autor_nome : ctx.nomeEmpresa(h))}</b></div>
      <div class="desc">${esc(h.descricao)}</div>
    </div>`;
  }
  return html + '</div>';
}

function abasHTML(aba, novidades, pendentes) {
  const b = (id, rot, n) => `<button data-acao="aba" data-aba="${id}" class="${aba === id ? 'ativa' : ''}">${rot}${n ? `<span class="contador">${n > 99 ? '99+' : n}</span>` : ''}</button>`;
  return `<nav class="abas">${b('pedidos', 'Pedidos')}${b('pagamentos', 'Pagamentos', pendentes)}${b('historico', 'Histórico', novidades)}</nav>`;
}

function formPagamentoHTML(dados, { titulo, ajuda, pedidoId }) {
  const pedidos = dados.pedidos.filter(p => p.status !== 'Cancelado');
  return `<h2>${esc(titulo)}</h2><p class="ajuda">${esc(ajuda)}</p>
    <form id="form-pagamento">
      <div class="duas">
        <div class="campo"><label>Valor (R$)</label><input name="valor" inputmode="decimal" placeholder="0,00" required autocomplete="off"></div>
        <div class="campo"><label>Data</label><input type="date" name="data" value="${hojeISO()}" required></div>
      </div>
      <div class="campo"><label>Forma de pagamento</label><select name="forma">${dados.formas_pagamento.map(f => `<option>${esc(f)}</option>`).join('')}</select></div>
      <div class="campo"><label>Referente ao pedido</label><select name="pedido_id">
        <option value="">Pagamento geral (sem pedido específico)</option>
        ${pedidos.map(p => `<option value="${p.id}" ${p.id === pedidoId ? 'selected' : ''}>Pedido #${p.numero} — ${brl(p.valor_total)}${p.valor_pago > 0 ? ` (pago ${brl(p.valor_pago)})` : ''}</option>`).join('')}
      </select></div>
      <div class="campo"><label>Observação</label><textarea name="observacao" placeholder="Opcional"></textarea></div>
      ${campoArquivoHTML('Anexar comprovante (foto ou PDF)')}
      <button class="btn btn-bloco" type="submit">Salvar pagamento</button>
      <button class="btn btn-sec btn-bloco" type="button" data-fechar style="margin-top:8px">Cancelar</button>
    </form>`;
}

function formAnexoHTML(titulo) {
  return `<h2>${esc(titulo)}</h2><p class="ajuda">Tire uma foto ou escolha um arquivo (foto ou PDF).</p>
    <form id="form-anexo">
      ${campoArquivoHTML('Escolher foto ou PDF', true)}
      <button class="btn btn-bloco" type="submit">Enviar</button>
      <button class="btn btn-sec btn-bloco" type="button" data-fechar style="margin-top:8px">Cancelar</button>
    </form>`;
}

function tituloAnexo(dados, tipo, id) {
  if (tipo === 'entrega') {
    const e = dados.entregas.find(x => x.id === id);
    return e ? `Comprovante da entrega de ${dataBR(e.data)}` : 'Anexar comprovante';
  }
  if (tipo === 'pagamento') {
    const g = dados.pagamentos.find(x => x.id === id);
    return g ? `Comprovante do pagamento de ${brl(g.valor)}` : 'Anexar comprovante';
  }
  const p = dados.pedidos.find(x => x.id === id);
  return p ? `Arquivo do pedido #${p.numero}` : 'Anexar arquivo';
}

// ---------- Tempo real ----------
// Abre uma conexão SSE; em caso de queda o navegador reconecta sozinho.
// O servidor manda um "ping" a cada 20 s: se nada chegar em 50 s (queda ou
// hospedagem que segura a conexão), a tela passa a se atualizar a cada 15 s.
function tempoReal(url, aoAtualizar, aoMudarConexao) {
  let es;
  let espera;
  let ultimoSinal = 0;
  const sinal = () => { ultimoSinal = Date.now(); aoMudarConexao(true); };
  const conectar = () => {
    if (es) es.close();
    es = new EventSource(url);
    es.addEventListener('ping', sinal);
    es.onerror = () => {
      aoMudarConexao(false);
      if (es.readyState === EventSource.CLOSED) { clearTimeout(espera); espera = setTimeout(conectar, 8000); }
    };
    es.addEventListener('atualizacao', ev => {
      sinal();
      let dados = {};
      try { dados = JSON.parse(ev.data); } catch (e) { /* ignora */ }
      aoAtualizar(dados);
    });
  };
  conectar();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      aoAtualizar({});
      if (!es || es.readyState === EventSource.CLOSED) conectar();
    }
  });
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const aoVivo = Date.now() - ultimoSinal < 50000;
    aoMudarConexao(aoVivo);
    if (!aoVivo) aoAtualizar({ silencioso: true });
  }, 15000);
}

function indicadorAoVivo(on) {
  const el = document.getElementById('aovivo');
  if (!el) return;
  el.classList.toggle('on', on);
  el.lastChild.textContent = on ? 'Ao vivo' : 'Reconectando';
}
