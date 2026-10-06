// ===== Fernandes Têxtil — funções compartilhadas (admin e cliente) =====

// ---------- Formatação ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const qtd = v => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const dataBR = s => (s ? s.split('-').reverse().join('/') : '—');
const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0);
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
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}
// Aceita 1500 | 1500.5 | 1.500 | 1.500,50 (mesma regra do servidor)
function lerNumero(v) {
  let t = String(v ?? '').replace(/[R$\s]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return t && Number.isFinite(n) ? n : NaN;
}
const numParaCampo = v => (v == null || v === '' ? '' : String(v).replace('.', ','));
const precoParaCampo = v => (v == null || v === '' || !Number.isFinite(Number(v)) ? '' : Number(v).toFixed(2).replace('.', ','));
const unidadeSing = u => ({ 'peças': 'peça', 'metros': 'metro', 'unidades': 'unidade', 'pares': 'par', 'jogos': 'jogo' }[u] || u || 'peça');
const iniciais = s => String(s || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

const local = {
  ler(k, padrao) { try { const v = localStorage.getItem(k); return v === null ? padrao : JSON.parse(v); } catch (e) { return padrao; } },
  gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
};

// ---------- Ícones (traço, no estilo SF Symbols) ----------
const ICONES = {
  inicio: '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.8H9.2v5.8H5A1.5 1.5 0 0 1 3.5 19z"/>',
  pedidos: '<path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  estoque: '<path d="m12 3.2 8.8 4.6L12 12.4 3.2 7.8z"/><path d="m3.2 12 8.8 4.6 8.8-4.6"/><path d="m3.2 16.2 8.8 4.6 8.8-4.6"/>',
  financeiro: '<rect x="2.8" y="5.5" width="18.4" height="13" rx="2.6"/><path d="M2.8 10h18.4M6.5 14.8h4"/>',
  ajustes: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  atividade: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.2V12l3.2 2"/>',
  sacola: '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  seta: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  fechar: '<path d="M7 7l10 10M17 7 7 17"/>',
  clipe: '<path d="M20 11.5 12.2 19.3a5 5 0 0 1-7.1-7.1l8.3-8.3a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6"/>',
  caminhao: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  entrada: '<path d="M12 3.5v11m0 0-4.2-4.2M12 14.5l4.2-4.2"/><path d="M4 14.5v4A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-4"/>',
  receber: '<path d="M12 3.5v17M16.5 7.8c0-1.7-2-2.8-4.5-2.8s-4.5 1.1-4.5 3 1.8 2.6 4.5 3.1 4.5 1.3 4.5 3.2-2 2.9-4.5 2.9-4.5-1.1-4.5-2.9"/>',
  pagar: '<path d="M7 17 17 7M9 7h8v8"/>',
  comissao: '<path d="M18.5 5.5 5.5 18.5"/><circle cx="7.2" cy="7.2" r="2.4"/><circle cx="16.8" cy="16.8" r="2.4"/>',
  lixo: '<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5h10L18 7M9 7V4.5h6V7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  mensagem: '<path d="M4 5.5h16v10H9.5L4 19.5z"/>',
  cadeado: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  sair: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h10"/>',
  usuario: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.6 3.8-5.8 7.5-5.8s6.7 2.2 7.5 5.8"/>',
  fabrica: '<path d="M3 20.5V10l5 3V10l5 3V10l5 3V4h3v16.5z"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  foto: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/>',
  alerta: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.3"/>',
  compartilhar: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6 11H5.5A1.5 1.5 0 0 0 4 12.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H18"/>'
};
const icone = (n, t = 20) => `<svg class="ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n] || ''}</svg>`;

// ---------- Estrutura (barra lateral no computador, abas no celular) ----------
function montarNavegacao({ itens, ativo, rodape = '' }) {
  const item = (i, classe) => `<a class="${classe} ${i.id === ativo ? 'on' : ''}" href="#${i.id}" ${i.id === ativo ? 'aria-current="page"' : ''}>
      ${icone(i.icone, classe === 'aba' ? 24 : 20)}<span>${esc(i.rotulo)}</span>${i.badge ? `<em class="badge">${i.badge > 99 ? '99+' : i.badge}</em>` : ''}</a>`;
  document.getElementById('navLateral').innerHTML = itens.map(i => item(i, 'nav-item')).join('') + rodape;
  document.getElementById('abasInf').innerHTML = itens.filter(i => !i.soLateral).map(i => item(i, 'aba')).join('');
}

// ---------- Avisos e folhas ----------
function toast(msg, tipo = '') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.setAttribute('role', 'status');
  el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => el.classList.add('saindo'), tipo === 'erro' ? 4500 : 3000);
  setTimeout(() => el.remove(), tipo === 'erro' ? 5000 : 3500);
}

let aoFecharFolha = null;
function abrirFolha({ titulo, corpo, larga = false, aoFechar = null }) {
  fecharFolha(true);
  const fundo = document.createElement('div');
  fundo.className = 'fundo';
  fundo.id = 'folha';
  fundo.innerHTML = `<div class="folha ${larga ? 'larga' : ''}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <div class="folha-topo"><h2>${esc(titulo)}</h2><button class="fechar" data-fechar aria-label="Fechar">${icone('fechar', 18)}</button></div>
      <div class="folha-corpo">${corpo}</div></div>`;
  fundo.addEventListener('click', e => { if (e.target === fundo || e.target.closest('[data-fechar]')) fecharFolha(); });
  document.body.appendChild(fundo);
  document.body.classList.add('travado');
  aoFecharFolha = aoFechar;
  ligarCamposArquivo(fundo);
  return fundo.querySelector('.folha');
}
function fecharFolha(silencioso) {
  const f = document.getElementById('folha');
  if (f) f.remove();
  document.body.classList.remove('travado');
  const cb = aoFecharFolha;
  aoFecharFolha = null;
  if (cb && !silencioso) cb();
}
const corpoFolha = () => document.querySelector('#folha .folha-corpo');
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharFolha(); });

// ---------- Rede ----------
async function requisicao(url, { metodo = 'GET', corpo, cabecalhos = {} } = {}) {
  const opts = { method: metodo, headers: { ...cabecalhos }, credentials: 'same-origin' };
  if (corpo instanceof FormData) opts.body = corpo;
  else if (corpo !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(corpo); }
  let resp;
  try { resp = await fetch(url, opts); } catch (e) { throw new Error('Sem conexão. Verifique a internet e tente novamente.'); }
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(dados.error || 'Não foi possível concluir. Tente novamente.');
    err.status = resp.status;
    throw err;
  }
  return dados;
}

async function comBotao(btn, fn) {
  const txt = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner pequeno"></span>';
  try { await fn(); } finally { btn.disabled = false; btn.innerHTML = txt; }
}

// Envia um formulário da folha: valida, trava o botão, mostra erro sem fechar
function aoEnviar(folha, seletor, fn) {
  const form = folha.querySelector(seletor);
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    await comBotao(form.querySelector('[type=submit]'), async () => {
      try { await fn(form); } catch (e) { toast(e.message, 'erro'); }
    });
  });
  return form;
}

// ---------- Arquivos ----------
function campoArquivoHTML(rotulo = 'Anexar comprovante', obrigatorio = false) {
  return `<label class="arquivo-campo">
    <span class="prev">${icone('clipe', 20)}</span>
    <span class="nome"><b>${esc(rotulo)}</b><small>${obrigatorio ? 'Foto ou PDF' : 'Foto ou PDF · opcional'}</small></span>
    <input type="file" name="arquivo" accept="image/*,application/pdf" ${obrigatorio ? 'required' : ''}>
  </label>`;
}
function ligarCamposArquivo(raiz) {
  raiz.querySelectorAll('.arquivo-campo input[type=file]').forEach(inp => {
    inp.addEventListener('change', () => {
      const f = inp.files[0];
      const lab = inp.closest('.arquivo-campo');
      lab.querySelector('.nome b').textContent = f ? f.name : 'Anexar comprovante';
      lab.classList.toggle('com-arquivo', !!f);
      const prev = lab.querySelector('.prev');
      if (f && f.type.startsWith('image/')) prev.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`;
      else if (f) prev.innerHTML = '<b class="pdf">PDF</b>';
    });
  });
}
// Reduz fotos grandes do celular antes de enviar
async function comprimirImagem(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.2 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const fator = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * fator);
    canvas.height = Math.round(bmp.height * fator);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (e) { return file; }
}
async function dadosDoForm(form) {
  const fd = new FormData(form);
  const arq = fd.get('arquivo');
  if (arq && arq.size) fd.set('arquivo', await comprimirImagem(arq));
  else fd.delete('arquivo');
  return fd;
}

// ---------- Status ----------
const COR_STATUS = {
  'Solicitado': 'p-amarelo', 'Recebido': 'p-azul', 'Em produção': 'p-laranja', 'Pronto para entrega': 'p-roxo',
  'Entregue parcialmente': 'p-teal', 'Entregue': 'p-verde', 'Cancelado': 'p-cinza'
};
const COR_PAGAMENTO = { 'Confirmado': 'p-verde', 'Aguardando confirmação': 'p-laranja', 'Recusado': 'p-vermelho' };
const pillStatus = s => `<span class="pill ${COR_STATUS[s] || 'p-cinza'}">${esc(s)}</span>`;
const pillPagamento = s => `<span class="pill ${COR_PAGAMENTO[s] || 'p-cinza'}">${esc(s)}</span>`;
const dot = (hex, t = 12) => `<span class="dot" style="background:${esc(hex || '#c7c7cc')};width:${t}px;height:${t}px"></span>`;

function etapasHTML(status) {
  if (status === 'Cancelado') return '';
  if (status === 'Solicitado') return `<div class="aviso aviso-amarelo">${icone('atividade')}<span>Pedido solicitado pelo cliente. Aguardando aprovação da Fernandes Têxtil.</span></div>`;
  const etapas = ['Recebido', 'Em produção', 'Pronto', 'Entregue'];
  const idx = { 'Recebido': 0, 'Em produção': 1, 'Pronto para entrega': 2, 'Entregue parcialmente': 3, 'Entregue': 3 }[status] ?? 0;
  const completo = status === 'Entregue';
  return `<div class="etapas">${etapas.map((e, i) => {
    const feita = i < idx || (i === idx && (completo || i < 3));
    const rot = i === 3 && status === 'Entregue parcialmente' ? 'Entregando' : e;
    return `<div class="etapa ${feita ? 'feita' : ''} ${i === idx ? 'atual' : ''}"><i>${feita ? icone('check', 12) : ''}</i><span>${rot}</span></div>`;
  }).join('')}</div>`;
}

// Itens de um pedido agrupados por produto, com cor, entregue e falta
function itensPedidoHTML(p, { mostrarEntrega = true } = {}) {
  const grupos = new Map();
  for (const i of p.itens) {
    if (!grupos.has(i.produto_nome)) grupos.set(i.produto_nome, []);
    grupos.get(i.produto_nome).push(i);
  }
  return [...grupos].map(([nome, itens]) => `<div class="tabela-itens">
      <div class="ti-cab"><b>${esc(nome)}</b>${mostrarEntrega ? '<span>Pedido</span><span>Entregue</span><span>Falta</span>' : '<span>Qtd</span><span></span><span>Valor</span>'}</div>
      ${itens.map(i => `<div class="ti-linha">
        <span class="ti-cor">${i.cor ? dot(i.hex) + esc(i.cor) : `<span class="muted">${esc(i.unidade)}</span>`}</span>
        <span class="num">${qtd(i.quantidade)}</span>
        ${mostrarEntrega
          ? `<span class="num">${qtd(i.entregue)}</span><span class="num ${i.falta > 0 ? 'forte' : 'muted'}">${i.falta > 0 ? qtd(i.falta) : icone('check', 14)}</span>`
          : `<span></span><span class="num">${brl(i.subtotal)}</span>`}
      </div>`).join('')}
    </div>`).join('');
}

// "Toalha: ● 250 · ● 100" compacto para listas
function resumoCoresHTML(itens) {
  return itens.slice(0, 6).map(i => `<span class="mini-cor">${i.cor ? dot(i.hex, 9) : ''}${qtd(i.quantidade)}</span>`).join('') + (itens.length > 6 ? `<span class="mini-cor">+${itens.length - 6}</span>` : '');
}

function anexosHTML(lista, tipo, refId, { urlArquivo, podeAnexar = true, gestao = false }) {
  const thumbs = (lista || []).map(a => {
    const url = urlArquivo(a.id);
    const img = (a.mime || '').startsWith('image/') && !/heic|heif/.test(a.mime);
    const conteudo = img ? `<img src="${url}" alt="${esc(a.nome_original)}" loading="lazy">` : `<b class="pdf">${(a.mime || '').includes('pdf') ? 'PDF' : 'ARQ'}</b>`;
    const quem = a.enviado_por === 'cliente' ? '<em>cliente</em>' : '';
    return gestao
      ? `<button class="anexo" data-acao="ver-anexo" data-id="${a.id}" title="${esc(a.nome_original)}">${conteudo}${quem}</button>`
      : `<a class="anexo" href="${url}" target="_blank" rel="noopener" title="${esc(a.nome_original)}">${conteudo}${quem}</a>`;
  }).join('');
  const add = podeAnexar ? `<button class="anexo anexo-add" data-acao="anexar" data-tipo="${tipo}" data-id="${refId}" aria-label="Anexar comprovante">${icone('clipe', 18)}<span>Anexar</span></button>` : '';
  return thumbs || add ? `<div class="anexos">${thumbs}${add}</div>` : '';
}

const ICONE_EVENTO = { pedido: 'pedidos', status: 'pedidos', entrega: 'caminhao', pagamento: 'receber', anexo: 'clipe', mensagem: 'mensagem', produto: 'sacola', compra: 'entrada', pagfornecedor: 'pagar', retirada: 'comissao', estoque: 'estoque', cliente: 'usuario' };
function historicoHTML(historico, { nomeAutor, destaqueAte = null, privados = false }) {
  if (!historico.length) return `<div class="vazio">${icone('atividade', 28)}<p>Nada registrado ainda.</p></div>`;
  let dia = '';
  let html = '';
  for (const h of historico) {
    const d = lerTS(h.created_at);
    const rot = diaRotulo(d);
    if (rot !== dia) { html += `${dia ? '</div>' : ''}<div class="dia">${esc(rot)}</div><div class="lista">`; dia = rot; }
    const novo = destaqueAte != null && h.id > destaqueAte ? 'novo' : '';
    html += `<div class="evento ev-${esc(h.tipo)} ${h.autor === 'cliente' ? 'do-cliente' : ''} ${novo}">
      <span class="ev-ico">${icone(ICONE_EVENTO[h.tipo] || 'atividade', 16)}</span>
      <div class="ev-texto">
        <div class="ev-cab"><b>${esc(h.autor === 'cliente' ? h.autor_nome : nomeAutor(h))}</b><span>${horaBR(d)}</span>${privados && h.privado ? `<span class="privado">${icone('cadeado', 12)} só você vê</span>` : ''}</div>
        <div class="ev-desc">${esc(h.descricao)}</div>
      </div></div>`;
  }
  return html + '</div>';
}

// Simula a baixa automática: o valor quita os pedidos em aberto do mais antigo para o mais novo
function previaBaixaHTML(valor, pedidos) {
  let livre = valor;
  const abertos = pedidos.filter(p => p.falta_pagar > 0.004)
    .sort((a, b) => (a.data_pedido < b.data_pedido ? -1 : a.data_pedido > b.data_pedido ? 1 : a.numero - b.numero));
  if (!(valor > 0)) {
    if (!abertos.length) return '<span class="muted">Nenhum pedido com valor em aberto.</span>';
    return `<b>Em aberto:</b> ${abertos.map(p => `Pedido #${p.numero} ${brl(p.falta_pagar)}`).join(' · ')}`;
  }
  const linhas = [];
  for (const p of abertos) {
    if (livre <= 0.004) break;
    const v = Math.min(livre, p.falta_pagar);
    livre -= v;
    linhas.push(v >= p.falta_pagar - 0.004 ? `${icone('check', 14)} Quita o pedido #${p.numero} (${brl(v)})` : `Abate ${brl(v)} do pedido #${p.numero} (faltarão ${brl(p.falta_pagar - v)})`);
  }
  if (livre > 0.004) linhas.push(`Sobra ${brl(livre)} de crédito para os próximos pedidos`);
  return `<b>Baixa automática:</b><br>${linhas.join('<br>')}`;
}
function ligarPreviaBaixa(folha, pedidos) {
  const campo = folha.querySelector('[name=valor]');
  const caixa = folha.querySelector('#previaBaixa');
  if (!campo || !caixa) return;
  const atualizar = () => { caixa.innerHTML = previaBaixaHTML(lerNumero(campo.value), pedidos); };
  campo.addEventListener('input', atualizar);
  atualizar();
}
// "Abateu: Pedido #1 ✓ R$ 7.803,00 · Pedido #2 R$ 1.197,00"
function aplicacoesHTML(g) {
  if (g.status !== 'Confirmado') return g.status === 'Aguardando confirmação' ? '<div class="aplicacoes muted">A baixa nos pedidos acontece quando a Fernandes Têxtil confirmar.</div>' : '';
  if (!g.aplicacoes || (!g.aplicacoes.length && !g.credito)) return '';
  return `<div class="aplicacoes">${g.aplicacoes.map(a => `<span class="${a.quitou ? 'quitou' : ''}">${a.quitou ? icone('check', 13) : ''}Pedido #${a.numero} · ${brl(a.valor)}${a.quitou ? ' · quitado' : ''}</span>`).join('')}${g.credito > 0.004 ? `<span>Crédito ${brl(g.credito)}</span>` : ''}</div>`;
}
// Envios de um pedido (parciais até completar), numerados do primeiro para o último
function enviosHTML(p, ctx, { excluir = false } = {}) {
  const falta = Math.max(0, p.qtd_total - p.qtd_entregue);
  const resumo = `<div class="resumo-entrega"><div class="barra verde"><i style="width:${pct(p.qtd_entregue, p.qtd_total).toFixed(1)}%"></i></div>
      <span>${qtd(p.qtd_entregue)} de ${qtd(p.qtd_total)} entregues${falta > 0 ? ` · <b style="color:var(--laranja)">faltam ${qtd(falta)}</b>` : ' · <b style="color:var(--verde)">completo</b>'}</span></div>`;
  const total = p.entregas.length;
  const lista = total ? p.entregas.map((e, i) => `<div class="cartao-sub">
      <div class="cab-sub"><b><span class="envio-num">${total - i}º</span>${dataBR(e.data)} · ${qtd(e.quantidade)} peças</b>
        ${excluir ? `<button class="btn btn-texto" style="color:var(--vermelho)" data-acao="excluir-envio" data-id="${e.id}">Excluir</button>` : ''}</div>
      ${e.itens.length ? `<div class="linhas-cor">${e.itens.map(it => `<span>${it.cor ? dot(it.hex) + esc(it.cor) : esc(it.produto_nome)} <b>${qtd(it.quantidade)}</b></span>`).join('')}</div>` : ''}
      ${e.observacao ? `<div class="txt">${esc(e.observacao)}</div>` : ''}
      ${anexosHTML(e.anexos, 'entrega', e.id, ctx)}
    </div>`).join('') : `<p class="muted" style="margin:0 4px">${excluir ? 'Nenhum envio ainda. Você pode enviar em partes até completar o pedido.' : 'Nenhuma entrega ainda. O pedido pode ser entregue em partes.'}</p>`;
  return resumo + `<div style="margin-top:12px">${lista}</div>`;
}
// Pagamentos que deram baixa neste pedido
function pagamentosDoPedidoHTML(p, recebimentos) {
  const usados = recebimentos.map(g => ({ g, a: (g.aplicacoes || []).find(x => x.pedido_id === p.id) })).filter(x => x.a);
  const resumo = `<div class="info-grade" style="margin-bottom:10px"><div><span>Pago</span><b style="color:var(--verde)">${brl(p.valor_pago)}</b></div>
      <div><span>Falta pagar</span><b style="${p.falta_pagar > 0.004 ? 'color:var(--laranja)' : ''}">${p.falta_pagar > 0.004 ? brl(p.falta_pagar) : 'Nada ✓'}</b></div></div>`;
  return resumo + (usados.length ? usados.map(({ g, a }) => `<div class="cartao-sub"><div class="cab-sub"><b>${brl(a.valor)}</b>${a.quitou ? '<span class="pill p-verde">Quitou</span>' : ''}</div>
      <div class="txt">de um pagamento de ${brl(g.valor)} · ${esc(g.forma || '')} · ${dataBR(g.data)}</div></div>`).join('') : '');
}
const pillPagoPedido = p => (['Solicitado', 'Cancelado'].includes(p.status) ? '' : p.quitado ? '<span class="pill p-verde">Pago</span>' : p.valor_pago > 0 ? '<span class="pill p-laranja">Pago em parte</span>' : '');

function formPagamentoHTML({ formas, pedidos = [], botao = 'Salvar', comPrevia = true, valor = '' }) {
  return `<form id="form-pagamento" class="form">
      <div class="grupo">
        <div class="duas">
          <div class="campo"><label>Valor (R$)</label><input name="valor" inputmode="decimal" placeholder="0,00" required autocomplete="off" value="${esc(valor)}"></div>
          <div class="campo"><label>Data</label><input type="date" name="data" value="${hojeISO()}" required></div>
        </div>
        ${formas ? `<div class="campo"><label>Forma de pagamento</label><select name="forma">${formas.map(f => `<option>${esc(f)}</option>`).join('')}</select></div>` : ''}
        ${comPrevia ? '<div class="previa-baixa" id="previaBaixa"></div>' : ''}
        <div class="campo"><label>Observação</label><textarea name="observacao" rows="2" placeholder="Opcional"></textarea></div>
        ${campoArquivoHTML()}
      </div>
      <button class="btn btn-bloco" type="submit">${esc(botao)}</button>
    </form>`;
}

function vazioHTML(ico, titulo, texto = '', acao = '') {
  return `<div class="vazio"><span class="vazio-ico">${icone(ico, 26)}</span><h3>${esc(titulo)}</h3>${texto ? `<p>${texto}</p>` : ''}${acao}</div>`;
}

// ---------- Montador de itens por cor (cesto) ----------
// Escolhe produto → toca na cor → digita a quantidade → adiciona. Ao trocar de cor a quantidade zera.
class Montador {
  constructor(o) {
    this.produtos = (o.produtos || []).filter(p => p.ativo === undefined || p.ativo);
    this.campoPreco = o.campoPreco || 'preco';
    this.editarPreco = !!o.editarPreco;
    this.mostrarPreco = o.mostrarPreco !== false;
    this.escolhaProduto = o.escolhaProduto !== false;
    this.rotuloAdd = o.rotuloAdd || 'Adicionar';
    this.vazio = o.vazio || 'Nenhum item adicionado.';
    this.aviso = o.aviso || 'no cesto';
    this.linhas = (o.linhas || []).map(l => ({ ...l }));
    this.aoMudar = o.aoMudar || (() => {});
    this.prodId = o.prodId ?? (this.produtos[0] ? this.produtos[0].id : null);
    this.reiniciar();
  }
  get produto() { return this.produtos.find(p => p.id === this.prodId) || null; }
  reiniciar() {
    const p = this.produto;
    this.cor = p && p.cores.length === 1 ? p.cores[0].nome : (p && !p.cores.length ? '' : null);
    this.qtd = '';
    this.preco = p ? precoParaCampo(p[this.campoPreco]) : '';
  }
  hexDe(id, cor) {
    const p = this.produtos.find(x => x.id === id);
    const c = p && p.cores.find(x => x.nome === cor);
    return c ? c.hex : null;
  }
  escolherProduto(id) { this.prodId = id; this.reiniciar(); this.renderSel(); }
  atualizarProdutos(produtos) {
    this.produtos = produtos.filter(p => p.ativo === undefined || p.ativo);
    this.linhas = this.linhas.filter(l => this.produtos.some(p => p.id === l.produto_id));
    if (!this.produto) { this.prodId = this.produtos[0] ? this.produtos[0].id : null; this.reiniciar(); }
    this.renderSel(); this.renderLin();
  }
  montar(elSel, elLin) {
    this.elSel = elSel;
    this.elLin = elLin;
    for (const el of [elSel, elLin].filter(Boolean)) {
      el.addEventListener('click', e => this.clique(e));
      el.addEventListener('input', e => this.digitar(e));
      el.addEventListener('change', e => this.mudar(e));
    }
    if (elSel) elSel.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-m-qtd]')) { e.preventDefault(); this.adicionar(); } });
    this.renderSel();
    this.renderLin();
  }
  clique(e) {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    e.preventDefault();
    const a = b.dataset.m;
    if (a === 'prod') this.escolherProduto(Number(b.dataset.id));
    else if (a === 'cor') {
      this.cor = b.dataset.cor;
      this.qtd = '';
      this.renderSel();
      const inp = this.elSel.querySelector('[data-m-qtd]');
      if (inp && window.matchMedia('(pointer: fine)').matches) inp.focus();
    } else if (a === 'soma') {
      this.qtd = String((lerNumero(this.qtd) || 0) + Number(b.dataset.n));
      const inp = this.elSel.querySelector('[data-m-qtd]');
      if (inp) inp.value = this.qtd;
    } else if (a === 'zerar') {
      this.qtd = '';
      const inp = this.elSel.querySelector('[data-m-qtd]');
      if (inp) inp.value = '';
    } else if (a === 'add') this.adicionar();
    else if (a === 'rem') { this.linhas.splice(Number(b.dataset.i), 1); this.renderLin(); this.aoMudar(); }
  }
  digitar(e) {
    if (e.target.matches('[data-m-qtd]')) this.qtd = e.target.value;
    else if (e.target.matches('[data-m-preco]')) this.preco = e.target.value;
  }
  mudar(e) {
    if (!e.target.matches('[data-m-lqtd]')) return;
    const i = Number(e.target.dataset.mLqtd);
    const v = lerNumero(e.target.value);
    if (v > 0) this.linhas[i].quantidade = v; else this.linhas.splice(i, 1);
    this.renderLin();
    this.aoMudar();
  }
  adicionar() {
    const p = this.produto;
    if (!p) return;
    if (p.cores.length && !this.cor) return toast('Escolha a cor', 'erro');
    const q = lerNumero(this.qtd);
    if (!(q > 0)) return toast('Informe a quantidade', 'erro');
    let preco = p[this.campoPreco] || 0;
    if (this.editarPreco) {
      const v = lerNumero(this.preco);
      if (!(v >= 0)) return toast('Preço inválido', 'erro');
      preco = v;
    }
    const cor = this.cor || '';
    const existente = this.linhas.find(l => l.produto_id === p.id && (l.cor || '') === cor && l.preco_unitario === preco);
    if (existente) existente.quantidade += q;
    else this.linhas.push({ produto_id: p.id, produto_nome: p.nome, unidade: p.unidade, cor, hex: this.hexDe(p.id, cor), quantidade: q, preco_unitario: preco });
    this.qtd = '';
    this.renderSel();
    this.renderLin();
    this.aoMudar();
    toast(`${qtd(q)} ${cor ? cor : p.unidade} ${this.aviso}`);
  }
  get total() { return this.linhas.reduce((s, l) => s + l.quantidade * l.preco_unitario, 0); }
  get totalQtd() { return this.linhas.reduce((s, l) => s + l.quantidade, 0); }
  itensParaEnvio() { return this.linhas.map(l => ({ produto_id: l.produto_id, cor: l.cor, quantidade: l.quantidade, preco_unitario: l.preco_unitario })); }
  renderSel() {
    if (!this.elSel) return;
    const p = this.produto;
    if (!p) { this.elSel.innerHTML = '<p class="muted">Nenhum produto disponível.</p>'; return; }
    const pilulas = this.escolhaProduto && this.produtos.length > 1
      ? `<div class="seg seg-bloco">${this.produtos.map(x => `<button type="button" data-m="prod" data-id="${x.id}" class="${x.id === p.id ? 'on' : ''}">${esc(x.nome)}</button>`).join('')}</div>` : '';
    const cores = p.cores.length ? `<div class="m-rot">Cor ${this.cor ? `<b>${esc(this.cor)}</b>` : '<span class="muted">— toque para escolher</span>'}</div>
      <div class="cores">${p.cores.map(c => `<button type="button" class="cor ${this.cor === c.nome ? 'on' : ''}" data-m="cor" data-cor="${esc(c.nome)}" aria-pressed="${this.cor === c.nome}">
        <i style="background:${esc(c.hex)}"></i><span>${esc(c.nome)}</span></button>`).join('')}</div>` : '';
    const podeQtd = !p.cores.length || this.cor;
    const precoInfo = this.editarPreco
      ? `<div class="campo"><label>${this.campoPreco === 'custo' ? 'Custo' : 'Preço'} por ${esc(unidadeSing(p.unidade))} (R$)</label><input data-m-preco inputmode="decimal" value="${esc(this.preco)}"></div>`
      : (this.mostrarPreco ? `<p class="m-preco">${brl(p[this.campoPreco])} por ${esc(unidadeSing(p.unidade))}</p>` : '');
    const qtdHTML = podeQtd ? `<div class="m-qtd">
        <div class="m-rot">Quantidade${this.cor ? ` de <b>${esc(this.cor)}</b>` : ''} <span class="muted">(${esc(p.unidade)})</span></div>
        <input class="qtd-grande" data-m-qtd inputmode="numeric" placeholder="0" value="${esc(this.qtd)}" autocomplete="off" aria-label="Quantidade">
        <div class="chips">${[10, 50, 100, 500].map(n => `<button type="button" class="chip" data-m="soma" data-n="${n}">+${n}</button>`).join('')}<button type="button" class="chip chip-x" data-m="zerar">Limpar</button></div>
        ${precoInfo}
        <button type="button" class="btn btn-bloco" data-m="add">${icone('mais', 18)} ${esc(this.rotuloAdd)}</button>
      </div>` : '';
    this.elSel.innerHTML = pilulas + cores + qtdHTML;
  }
  renderLin() {
    if (!this.elLin) return;
    if (!this.linhas.length) { this.elLin.innerHTML = `<p class="m-vazio">${esc(this.vazio)}</p>`; return; }
    const grupos = new Map();
    this.linhas.forEach((l, i) => {
      if (!grupos.has(l.produto_nome)) grupos.set(l.produto_nome, []);
      grupos.get(l.produto_nome).push({ ...l, i });
    });
    this.elLin.innerHTML = [...grupos].map(([nome, ls]) => `<div class="m-grupo"><div class="m-gnome">${esc(nome)}</div>
        ${ls.map(l => `<div class="m-linha">
          <span class="m-cor">${l.cor ? dot(l.hex, 14) + esc(l.cor) : esc(l.unidade)}</span>
          <input class="m-lqtd" data-m-lqtd="${l.i}" value="${numParaCampo(l.quantidade)}" inputmode="numeric" aria-label="Quantidade de ${esc(l.cor || nome)}">
          ${this.mostrarPreco ? `<span class="m-sub num">${brl(l.quantidade * l.preco_unitario)}</span>` : ''}
          <button type="button" class="m-rem" data-m="rem" data-i="${l.i}" aria-label="Remover ${esc(l.cor || nome)}">${icone('fechar', 14)}</button>
        </div>`).join('')}</div>`).join('') +
      `<div class="m-total"><span>${qtd(this.totalQtd)} ${esc(this.linhas[0].unidade || 'peças')} · ${this.linhas.length} ${this.linhas.length === 1 ? 'cor' : 'cores'}</span>${this.mostrarPreco ? `<b class="num">${brl(this.total)}</b>` : ''}</div>`;
  }
}

// ---------- Tempo real ----------
// SSE com reconexão. O servidor manda "ping" a cada 20 s; sem sinal por 50 s
// (queda ou hospedagem que segura a conexão), a tela se atualiza a cada 15 s.
function tempoReal(url, aoAtualizar) {
  let es;
  let espera;
  let ultimoSinal = 0;
  const sinal = () => { ultimoSinal = Date.now(); indicadorAoVivo(true); };
  const conectar = () => {
    if (es) es.close();
    es = new EventSource(url, { withCredentials: true });
    es.addEventListener('ping', sinal);
    es.onerror = () => {
      indicadorAoVivo(false);
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
    if (document.visibilityState !== 'visible') return;
    aoAtualizar({});
    if (!es || es.readyState === EventSource.CLOSED) conectar();
  });
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const aoVivo = Date.now() - ultimoSinal < 50000;
    indicadorAoVivo(aoVivo);
    if (!aoVivo) aoAtualizar({ silencioso: true });
  }, 15000);
}
function indicadorAoVivo(on) {
  document.querySelectorAll('.aovivo').forEach(el => {
    el.classList.toggle('on', on);
    el.lastElementChild.textContent = on ? 'Ao vivo' : 'Reconectando';
  });
}
