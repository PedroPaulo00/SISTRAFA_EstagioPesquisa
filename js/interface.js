/* SISTRAFA — utilitários de interface */
'use strict';

const ICONES = {
  mais: '<path d="M12 5v14M5 12h14"/>',
  casa: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  prancheta: '<path d="M9 2h6v4H9z"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
  livro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 19.5"/>',
  telefone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  imagem: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  certo: '<path d="M20 6 9 17l-5-5"/>',
  direita: '<path d="m9 18 6-6-6-6"/>',
  esquerda: '<path d="m15 18-6-6 6-6"/>',
  fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
  busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  marcador: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  arquivo: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  lixeira: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  editar: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  compartilhar: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  imprimir: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  cadeado: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  estrada: '<path d="M4 21 8 3M20 21 16 3M12 5v2M12 11v2M12 17v2"/>',
  caveira: '<path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5 3 6v3h10v-3c1.5-1 3-3 3-6a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10 22v-3M14 22v-3"/>',
  grande: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  ave: '<path d="M16 7h.01M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20M20 7l2 .5-2 .5M10 18v3M14 17.75V21M7 18a6 6 0 0 0 3.84-10.61"/>',
  pata: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
  cobra: '<path d="M3 18c2.5 2.5 7 2.5 8.5-.5S9.5 12 12.5 10.5 19 11 19 7.5 15.5 3 13 4"/><path d="M13 4l-1.6-1.2M13 4l-1.2 1.6"/>',
  sapo: '<path d="M4 17c0-4 3.5-7 8-7s8 3 8 7"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><path d="m4 17-2 3M20 17l2 3M9 15c1.5 1 4.5 1 6 0"/>',
  inseto: '<path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  ajuda: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  predio: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 10h.01M15 10h.01"/>',
  camadas: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  texto: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  contraste: '<circle cx="12" cy="12" r="10"/><path d="M12 2v20" /><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor"/>',
  iniciar: '<path d="m6 3 14 9-14 9z"/>',
  recortar: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>'
};

function icone(nome, extra) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra ? ' ' + extra : ''}>${ICONES[nome] || ICONES.ajuda}</svg>`;
}

function escaparHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const formatarData = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
const formatarHora = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
const formatarDataHora = iso => iso ? formatarData(iso) + ' às ' + formatarHora(iso) : '—';
const rotuloDe = (lista, v) => { const x = lista.find(o => o[0] === v); return x ? x[1] : (v || ''); };
const rotulosDe = (lista, arr) => (arr || []).map(v => rotuloDe(lista, v)).join(', ');
const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p);

/* campos de um formulário como objeto (substitui Object.fromEntries, ausente em navegadores antigos) */
function dadosFormulario(form) {
  const d = {};
  new FormData(form).forEach((v, k) => { d[k] = v; });
  return d;
}

function lerCaminho(obj, caminho) { return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function gravarCaminho(obj, caminho, valor) {
  const ks = caminho.split('.'); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = valor;
}

/* ---------- Notificações rápidas ----------
   tipo: 'sucesso' (padrão), 'erro', 'aviso' ou 'info'. Erros ficam mais tempo na tela
   e são anunciados imediatamente por leitores de tela. Tocar na notificação a fecha. */
let _temporizadorNotificacao;
function notificar(msg, tipo) {
  tipo = tipo || 'sucesso';
  document.querySelectorAll('.notificacao').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'notificacao' + (tipo === 'sucesso' ? '' : ' ' + tipo);
  t.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  const nomeIcone = { sucesso: 'certo', erro: 'alerta', aviso: 'alerta', info: 'info' }[tipo] || 'info';
  t.innerHTML = icone(nomeIcone) + `<span>${escaparHtml(msg)}</span>`;
  t.addEventListener('click', () => t.remove());
  document.body.appendChild(t);
  clearTimeout(_temporizadorNotificacao);
  _temporizadorNotificacao = setTimeout(() => t.remove(), tipo === 'erro' ? 6000 : tipo === 'aviso' ? 4000 : 2800);
}

/* ---------- Janela (folha inferior) ----------
   O foco fica preso dentro da janela enquanto ela está aberta e volta
   para o elemento de origem ao fechar (uso por teclado e leitor de tela). */
let _modalAoFechar = null;
let _modalOrigemFoco = null;
const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
function abrirModal(titulo, corpoHtml, aoFechar) {
  const origem = document.querySelector('.modal-fundo') ? _modalOrigemFoco : document.activeElement;
  fecharModal(true);
  _modalOrigemFoco = origem;
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `<div class="modal vidro" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div class="alca" aria-hidden="true"></div>
      <div class="modal-cab"><h2 id="modal-titulo">${escaparHtml(titulo)}</h2>
        <button class="botao botao-icone" data-acao="modal-fechar" aria-label="Fechar">${icone('fechar')}</button></div>
      <div class="modal-corpo">${corpoHtml}</div></div>`;
  fundo.addEventListener('click', e => { if (e.target === fundo) fecharModal(); });
  fundo.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const itens = [...fundo.querySelectorAll(FOCAVEIS)].filter(el => el.offsetParent !== null);
    if (!itens.length) return;
    const primeiro = itens[0], ultimo = itens[itens.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });
  document.body.appendChild(fundo);
  document.body.style.overflow = 'hidden';
  _modalAoFechar = aoFechar || null;
  rotularGrupos(fundo);
  const foco = fundo.querySelector('input, textarea, select') || fundo.querySelector('.botao');
  if (foco) setTimeout(() => foco.focus({ preventScroll: true }), 50);
  return fundo.querySelector('.modal');
}
function fecharModal(silencioso) {
  const f = document.querySelector('.modal-fundo');
  if (!f) return;
  f.remove();
  document.body.style.overflow = '';
  const cb = _modalAoFechar; _modalAoFechar = null;
  const origem = _modalOrigemFoco; _modalOrigemFoco = null;
  if (origem && origem.isConnected && typeof origem.focus === 'function') origem.focus({ preventScroll: true });
  if (cb && !silencioso) cb();
}

/* ---------- Acessibilidade de grupos e campos ---------- */
let _contadorRotulos = 0;
/* liga cada grupo de opções (fichas, opções grandes, respostas) ao seu rótulo visível */
function rotularGrupos(raiz) {
  (raiz || document).querySelectorAll('[role="radiogroup"], [role="group"]').forEach(grupo => {
    if (grupo.getAttribute('aria-label') || grupo.getAttribute('aria-labelledby')) return;
    const campo = grupo.closest('.campo, .pergunta, .cartao');
    const rotulo = campo && (campo.querySelector(':scope > .rotulo, :scope > label') || campo.querySelector(':scope > h3, :scope > h2'));
    if (!rotulo) return;
    if (!rotulo.id) rotulo.id = 'rotulo-' + (++_contadorRotulos);
    grupo.setAttribute('aria-labelledby', rotulo.id);
  });
}

/* mensagem de erro ao lado do campo (em vez de só um aviso passageiro) */
function marcarErroCampo(entrada, mensagem) {
  limparErroCampo(entrada);
  const id = (entrada.id || 'campo-' + (++_contadorRotulos)) + '-erro';
  const p = document.createElement('p');
  p.className = 'erro-campo'; p.id = id; p.textContent = mensagem;
  entrada.insertAdjacentElement('afterend', p);
  entrada.setAttribute('aria-invalid', 'true');
  entrada.setAttribute('aria-describedby', id);
  entrada.addEventListener('input', () => limparErroCampo(entrada), { once: true });
}
function limparErroCampo(entrada) {
  const id = entrada.getAttribute('aria-describedby');
  if (id && id.endsWith('-erro')) { const p = document.getElementById(id); if (p) p.remove(); entrada.removeAttribute('aria-describedby'); }
  entrada.removeAttribute('aria-invalid');
}

function confirmar(titulo, texto, opcoes) {
  opcoes = opcoes || {};
  return new Promise(resolver => {
    let resolvido = false;
    const m = abrirModal(titulo, `<p>${escaparHtml(texto)}</p>
      ${opcoes.motivo ? `<div class="campo"><label for="conf-motivo">${escaparHtml(opcoes.motivo)}</label><textarea id="conf-motivo" class="entrada" rows="3"></textarea></div>` : ''}
      <div class="linha-btns">
        <button class="botao" data-r="nao">${escaparHtml(opcoes.cancelar || 'Cancelar')}</button>
        <button class="botao ${opcoes.perigo ? 'botao-perigo' : 'botao-primario'}" data-r="sim">${escaparHtml(opcoes.ok || 'Confirmar')}</button>
      </div>`, () => { if (!resolvido) resolver(false); });
    m.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.r === 'sim' && opcoes.motivo) {
        const v = m.querySelector('#conf-motivo').value.trim();
        if (!v) { marcarErroCampo(m.querySelector('#conf-motivo'), 'Informe o motivo para continuar.'); m.querySelector('#conf-motivo').focus(); return; }
        resolvido = true; fecharModal(true); resolver(v); return;
      }
      resolvido = true; fecharModal(true); resolver(b.dataset.r === 'sim');
    }));
  });
}

/* ---------- Componentes ---------- */
/* aviso de orientação: além da cor, perigo e atenção têm ícone próprio e rótulo escrito */
const NIVEIS_AVISO = { perigo: 'Perigo', atencao: 'Atenção' };
function avisoHtml(o) {
  const nomeIcone = o.nivel === 'perigo' ? 'alerta' : o.nivel === 'atencao' ? 'escudo' : o.nivel === 'ok' ? 'certo' : 'info';
  const nivel = NIVEIS_AVISO[o.nivel];
  return `<div class="aviso ${o.nivel}" role="note">${icone(nomeIcone)}<div>
    ${nivel ? `<span class="aviso-nivel">${nivel}</span>` : ''}<strong>${escaparHtml(o.titulo)}</strong><p>${escaparHtml(o.texto)}</p>${o.motivo ? `<p class="motivo">Por quê: ${escaparHtml(o.motivo)}</p>` : ''}</div></div>`;
}

function fichasHtml(lista, valor, attrs, multi, segmentado) {
  const grupo = `<div class="fichas" role="${multi ? 'group' : 'radiogroup'}">` + lista.map(([v, r]) => {
    const ativo = multi ? (valor || []).includes(v) : valor === v;
    return `<button type="button" class="ficha" ${multi ? `aria-pressed="${ativo}"` : `role="radio" aria-checked="${ativo}"`} ${attrs} data-valor="${escaparHtml(v)}">${escaparHtml(r)}</button>`;
  }).join('') + '</div>';
  // poucas opções fixas viram um seletor segmentado (largura igual, uma linha)
  return segmentado ? `<div class="segmentado">${grupo}</div>` : grupo;
}

function marcacaoHtml(texto, ativo, attrs) {
  return `<button type="button" class="marcacao" role="checkbox" aria-checked="${!!ativo}" ${attrs}><span class="quadro">${icone('certo')}</span><span>${escaparHtml(texto)}</span></button>`;
}

/* logo do órgão (fundo branco, como nos materiais oficiais); contatos sem logo usam o ícone do tipo */
function logoContatoHtml(c) {
  if (c && c.logo) return `<span class="logo-contato"><img src="recursos/logos/${escaparHtml(c.logo)}.png" alt=""></span>`;
  return `<span class="icone">${icone(c && c.tipo === 'emergencia' ? 'alerta' : 'predio')}</span>`;
}

function grupoIcone(g, tamanho) {
  const G = GRUPOS[g] || GRUPOS.naoid;
  return `<span style="color:${G.cor}" aria-hidden="true">${icone(G.icone)}</span>`;
}

function etiquetaRisco(r) {
  return `<span class="etiqueta ${r}">Risco ${r === 'alto' ? 'alto' : r === 'medio' ? 'médio' : 'baixo'}</span>`;
}
