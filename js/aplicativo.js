/* SISTRAFA — núcleo do aplicativo: rotas, telas e eventos */
'use strict';

const Aplicativo = {
  perfil: null,
  ajustes: null,
  contexto: { ocorr: null, lote: null },
  indicePergunta: {},
  ultimaPosicao: null,
  desbloqueado: false,
  filtroGuia: { grupo: '', termo: '' },
  abaOcorrencias: 'andamento',

  async desenhar() {
    const el = document.getElementById('aplicativo');
    liberarUrls();
    const rota = (location.hash || '#/inicio').slice(2).split('/');
    const [r0, r1, r2, r3] = rota;

    // perfil obrigatório no primeiro acesso
    if (!this.perfil && r0 !== 'boas-vindas') { location.hash = '#/boas-vindas'; return; }
    if (this.perfil && this.perfil.pinHash && !this.desbloqueado && r0 !== 'bloqueio') { location.hash = '#/bloqueio'; return; }

    this.contexto = { ocorr: null, lote: null };
    this._depois = [];
    let html, aba = '';
    switch (r0) {
      case 'boas-vindas': html = telaBoasVindas(); break;
      case 'bloqueio': html = telaBloqueio(); break;
      case 'risco': html = r1 ? telaGuiaRisco(r1) : telaRisco(); aba = 'inicio'; break;
      case 'ocorrencias': html = telaOcorrencias(); aba = 'ocorrencias'; break;
      case 'ocorrencia':
        if (r2 === 'lote') html = telaLote(r1, r3);
        else html = telaOcorrencia(r1, r2 === 'etapa' ? parseInt(r3, 10) : undefined);
        break;
      case 'relatorio': html = await telaRelatorio(r1); break;
      case 'guia':
        html = r1 === 'grupo' ? telaGrupo(r2) : r1 === 'inat' ? telaEspecieOnline(r2) : r1 === 'regiao' ? telaRegiao() : r1 === 'protocolo' ? telaProtocolo() : r1 ? telaEspecie(r1) : telaGuia();
        aba = 'guia'; break;
      case 'sobre': html = telaSobre(); aba = 'perfil'; break;
      case 'contatos': html = telaContatos(); aba = 'contatos'; break;
      case 'contato': html = telaFormularioContato(r1); aba = 'contatos'; break;
      case 'perfil': html = telaPerfil(); aba = 'perfil'; break;
      default: html = telaInicio(); aba = 'inicio';
    }
    if (html === '') return; // redirecionado
    el.innerHTML = html + (aba ? navegacaoHtml(aba) : '');
    if (this.contexto.ocorr && (r0 === 'ocorrencia')) carregarFotos(this.contexto.ocorr.id);
    rotularGrupos(el);
    // título da aba indica a tela atual (histórico do navegador, leitores de tela, troca de apps)
    const h1 = el.querySelector('h1');
    if (h1) h1.setAttribute('tabindex', '-1');
    const nomeTela = h1 ? h1.firstChild && h1.firstChild.textContent.trim() : '';
    document.title = r0 === 'inicio' || !r0 || !nomeTela ? 'SISTRAFA' : `${nomeTela} · SISTRAFA`;
    this._depois.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  },

  /* ao trocar de tela, o foco vai para o título: o leitor de tela anuncia a nova tela */
  focarTitulo() {
    const h1 = document.querySelector('#aplicativo h1');
    if (h1) h1.focus({ preventScroll: true });
  },

  /* tarefas assíncronas executadas depois que a tela é desenhada */
  depois(fn) { this._depois.push(fn); },

  aplicarAjustes() {
    const c = this.ajustes;
    document.documentElement.dataset.fonte = c.fonte;
    document.documentElement.dataset.contraste = c.contraste ? 'alto' : 'normal';
    document.documentElement.dataset.tema = c.tema || 'escuro';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = c.tema === 'claro' ? '#E9F5F0' : '#020E0E';
  }
};

function navegacaoHtml(ativa) {
  const itens = [['inicio', 'casa', 'Início'], ['ocorrencias', 'prancheta', 'Ocorrências'], ['guia', 'livro', 'Guia'], ['contatos', 'telefone', 'Contatos'], ['perfil', 'usuario', 'Perfil']];
  return `<nav class="navegacao vidro" aria-label="Navegação principal">${itens.map(([id, nomeIcone, rot]) =>
    `<a href="#/${id}" ${id === ativa ? 'aria-current="page"' : ''}>${icone(nomeIcone)}<span>${rot}</span></a>`).join('')}</nav>`;
}

function telaNaoEncontrada() {
  return `<main class="tela"><div class="vazio vidro cartao">${icone('ajuda')}<h2>Registro não encontrado</h2>
    <a class="botao botao-primario" href="#/inicio">Voltar ao início</a></div></main>`;
}

/* ================= Boas-vindas / perfil local ================= */
function camposPerfil(p) {
  p = p || {};
  return `<div class="campo"><label for="p-nome">Nome completo *</label><input id="p-nome" class="entrada" name="nome" value="${escaparHtml(p.nome)}" autocomplete="name" required></div>
    <div class="campo"><label for="p-inst">Instituição *</label><input id="p-inst" class="entrada" name="instituicao" value="${escaparHtml(p.instituicao)}" placeholder="Ex.: Polícia Militar do Paraná, Corpo de Bombeiros" required></div>
    <div class="campo"><label for="p-cargo">Cargo ou função</label><input id="p-cargo" class="entrada" name="cargo" value="${escaparHtml(p.cargo)}" placeholder="Ex.: Soldado, Cabo, Sargento, Veterinário"></div>
    <div class="campo"><label for="p-mat">Número de identificação funcional</label><input id="p-mat" class="entrada" name="matricula" value="${escaparHtml(p.matricula)}" inputmode="text"></div>`;
}

function telaBoasVindas() {
  return `<main class="tela sem-navegacao boas-vindas">
    <img class="logo" src="recursos/logo.png" alt="SISTRAFA — logotipo com jaguatirica">
    <p class="chamada">Apoio a ocorrências com fauna silvestre para profissionais de segurança pública e defesa civil.</p>
    <form class="cartao vidro esquerda" id="form-perfil" novalidate>
      <h2>Criar perfil no aparelho</h2>
      <p class="suave pequeno">Sem conta on-line. Os dados ficam somente neste celular e são usados para preencher os relatórios.</p>
      ${camposPerfil()}
      <div class="campo"><label for="p-pin">PIN de acesso (opcional, 4 a 8 números)</label>
        <input id="p-pin" class="entrada entrada-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" autocomplete="new-password"></div>
      <button class="botao botao-primario botao-bloco" type="submit">${icone('certo')} Começar</button>
    </form>
    <p class="nota esquerda">O SISTRAFA é uma ferramenta auxiliar de consulta e organização. Não substitui protocolos institucionais, sistemas oficiais de registro nem a avaliação de profissionais especializados.</p>
  </main>`;
}

function telaBloqueio() {
  if (!Aplicativo.perfil || !Aplicativo.perfil.pinHash || Aplicativo.desbloqueado) { location.hash = '#/inicio'; return ''; }
  return `<main class="tela sem-navegacao boas-vindas">
    <img class="logo menor" src="recursos/logo.png" alt="SISTRAFA">
    <form class="cartao vidro" id="form-pin" novalidate>
      <h2>${icone('cadeado', 'class="icone-inline"')} Digite seu PIN</h2>
      <p class="suave">${escaparHtml(Aplicativo.perfil.nome)}</p>
      <input class="entrada entrada-pin" id="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="current-password" aria-label="PIN" autofocus>
      <button class="botao botao-primario botao-bloco mt-4" type="submit">Entrar</button>
    </form>
  </main>`;
}

/* ================= Início ================= */
function telaInicio() {
  const p = Aplicativo.perfil;
  const todas = Ocorrencias.todas();
  const andamento = todas.filter(o => o.status === 'andamento');
  const primeiroNome = (p.nome || '').trim().split(/\s+/)[0];
  return `<main class="tela">
    <header class="inicio-topo">
      <img src="recursos/logo.png" alt="SISTRAFA">
      <div><strong>Bem-vindo, ${escaparHtml(primeiroNome)}!</strong></div>
    </header>

    <a class="botao-risco" href="#/risco">${icone('alerta')}<div><strong>Situação de risco</strong><span>Peçonhentos, agressivos ou de grande porte</span></div></a>

    <button class="botao-nova" data-acao="nova">
      <span class="icone">${icone('mais')}</span>
      <div><strong>Nova ocorrência</strong><span>Registro guiado passo a passo</span></div>
    </button>

    <div class="grade-acoes">
      <a class="acao vidro" href="#/ocorrencias">
        <span class="icone">${icone('prancheta')}</span><strong>Ocorrências em andamento</strong>
        ${andamento.length ? `<span class="contador-acao"><span class="contagem">${andamento.length}</span>${andamento.length === 1 ? 'aberta' : 'abertas'}</span>` : '<small>Nenhuma aberta</small>'}</a>
      <a class="acao vidro" href="#/guia">
        <span class="icone">${icone('livro')}</span><strong>Espécies e orientações</strong><small>Guia de fauna</small></a>
      <a class="acao vidro" href="#/contatos">
        <span class="icone">${icone('predio')}</span><strong>Contatos e instituições</strong><small>CETRAS, órgãos, emergência</small></a>
      <a class="acao vidro" href="#/perfil">
        <span class="icone">${icone('usuario')}</span><strong>Perfil e ajustes</strong><small>Tamanho do texto, contraste</small></a>
    </div>

    ${andamento.length ? `<h2 class="titulo-secao">Continuar de onde parou</h2>
      <div class="lista">${andamento.slice(0, 3).map(itemOcorrencia).join('')}</div>` : ''}
  </main>`;
}

function itemOcorrencia(o) {
  const href = o.status === 'encerrada' ? '#/relatorio/' + o.id : '#/ocorrencia/' + o.id;
  const total = o.lotes.reduce((s, l) => s + (l.especies || []).reduce((a, e) => a + (parseInt(e.qtd, 10) || 0), 0), 0);
  const link = `<a class="item vidro" href="${href}">
    <span class="icone">${icone(o.status === 'encerrada' ? 'arquivo' : 'relogio')}</span>
    <span class="texto"><strong>${escaparHtml(o.numero)}</strong>
      <small>${formatarDataHora(o.criadaEm)} · ${plural(total, 'animal', 'animais')}</small>
      ${o.local.endereco ? `<small class="uma-linha">${escaparHtml(o.local.endereco)}</small>` : ''}
      <small class="estado-ocorrencia">${o.status === 'encerrada' ? 'Encerrada' : 'Etapa ' + ((o.etapa || 0) + 1) + '/' + ETAPAS.length + ' · ' + ETAPAS[o.etapa || 0].titulo}</small></span>
    ${icone('direita', 'class="seta"')}</a>`;
  if (o.status !== 'andamento') return link;
  // ocorrência em andamento pode ser descartada (ex.: aberta sem querer)
  return `<div class="item-linha">${link}
    <button class="botao botao-icone botao-excluir vidro" data-acao="ocorrencia-descartar" data-id="${o.id}" aria-label="Excluir ocorrência ${escaparHtml(o.numero)}">${icone('lixeira')}</button></div>`;
}

/* ================= Risco ================= */
function telaRisco() {
  return `<main class="tela">
    <div class="topo"><a class="botao botao-icone" href="#/inicio" aria-label="Voltar">${icone('esquerda')}</a><h1>Situação de risco</h1></div>
    <div class="linha-btns mb-4">
      <a class="botao botao-perigo" href="tel:193">${icone('telefone')} 193</a>
      <a class="botao botao-perigo" href="tel:192">${icone('telefone')} 192</a>
      <a class="botao botao-perigo" href="tel:190">${icone('telefone')} 190</a>
    </div>
    <div class="lista">${GUIAS_RISCO.map(g => `<a class="item vidro" href="#/risco/${g.id}">
      <span class="icone" style="background:${g.cor === 'perigo' ? 'var(--perigo-fundo)' : 'var(--alerta-fundo)'};color:${g.cor === 'perigo' ? 'var(--perigo)' : 'var(--alerta)'}">${icone(g.icone)}</span>
      <span class="texto"><strong>${escaparHtml(g.titulo)}</strong><small>${escaparHtml(g.resumo)}</small></span>${icone('direita', 'class="seta"')}</a>`).join('')}</div>
    <button class="botao botao-primario botao-bloco mt-5" data-acao="nova">${icone('mais')} Abrir nova ocorrência</button>
  </main>`;
}

function telaGuiaRisco(id) {
  const g = GUIAS_RISCO.find(x => x.id === id);
  if (!g) return telaNaoEncontrada();
  return `<main class="tela">
    <div class="topo"><a class="botao botao-icone" href="#/risco" aria-label="Voltar">${icone('esquerda')}</a><h1>${escaparHtml(g.titulo)}</h1></div>
    <section class="cartao vidro" style="border-color:${g.cor === 'perigo' ? 'var(--perigo)' : 'var(--alerta)'}">
      <h2>O que fazer</h2>
      <ol class="lista-texto">${g.passos.map(p => `<li>${escaparHtml(p)}</li>`).join('')}</ol>
    </section>
    ${g.acidente ? `<section class="cartao vidro borda-perigo">
      <h2 class="cor-perigo">Se alguém foi picado ou mordido</h2>
      <ol class="lista-texto">${g.acidente.map(p => `<li>${escaparHtml(p)}</li>`).join('')}</ol>
      <a class="botao botao-perigo botao-bloco mt-3" href="tel:192">${icone('telefone')} Ligar 192 — SAMU</a>
    </section>` : ''}
    <div class="linha-btns"><a class="botao" href="tel:193">${icone('telefone')} 193 Bombeiros</a><a class="botao" href="#/contatos">${icone('predio')} Contatos</a></div>
    <button class="botao botao-primario botao-bloco mt-3" data-acao="nova">${icone('mais')} Abrir nova ocorrência</button>
  </main>`;
}

/* ================= Ocorrências ================= */
function telaOcorrencias() {
  const todas = Ocorrencias.todas();
  const aba = Aplicativo.abaOcorrencias;
  const lista = todas.filter(o => o.status === aba);
  return `<main class="tela">
    <div class="topo"><h1>Ocorrências</h1><button class="botao botao-primario botao-pequeno" data-acao="nova">${icone('mais')} Nova</button></div>
    <div class="abas vidro" role="tablist">
      <button role="tab" aria-selected="${aba === 'andamento'}" data-acao="aba-ocorrencias" data-valor="andamento">Em andamento (${todas.filter(o => o.status === 'andamento').length})</button>
      <button role="tab" aria-selected="${aba === 'encerrada'}" data-acao="aba-ocorrencias" data-valor="encerrada">Encerradas (${todas.filter(o => o.status === 'encerrada').length})</button>
    </div>
    <div class="lista">${lista.map(itemOcorrencia).join('') || `<div class="vazio vidro cartao">${icone('prancheta')}<p>Nenhuma ocorrência ${aba === 'andamento' ? 'em andamento' : 'encerrada'}.</p></div>`}</div>
    <p class="nota mt-4">${icone('cadeado', 'class="icone-inline"')} As ocorrências e fotos ficam armazenadas somente neste aparelho.</p>
  </main>`;
}

/* ================= Guia de espécies ================= */
function normalizar(t) { return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

/* Foto de referência da espécie (iNaturalist). Sem a foto (primeiro acesso sem internet),
   aparece o ícone do grupo; quando as fotos chegam, preencherFotosEspecies troca o ícone pela foto. */
function iconeGrupoHtml(g) {
  const G = GRUPOS[g] || GRUPOS.naoid;
  return `<span class="icone" style="color:${G.cor};background:var(--icone-fundo)">${icone(G.icone)}</span>`;
}
function fotoEspecieHtml(e, classe) {
  const f = FaunaOnline.fotoGuia(e);
  return `<span class="foto-especie ${classe || ''}" data-foto-especie="${e.id}">${f
    ? `<img src="${escaparHtml(f.mini)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-grupo="${e.grupo}">`
    : iconeGrupoHtml(e.grupo)}</span>`;
}
function preencherFotosEspecies(raiz) {
  (raiz || document).querySelectorAll('[data-foto-especie]').forEach(el => {
    if (el.querySelector('img')) return;
    const e = ESPECIES.find(x => x.id === el.dataset.fotoEspecie), f = FaunaOnline.fotoGuia(e);
    if (f) el.innerHTML = `<img src="${escaparHtml(f.mini)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-grupo="${e.grupo}">`;
  });
}
/* busca as fotos uma vez (quando ainda não estão no aparelho) e atualiza a tela atual */
function carregarFotosGuiaDepois() {
  Aplicativo.depois(async () => {
    if (FaunaOnline.fotoGuia(ESPECIES[0]) || navigator.onLine === false) return;
    try { await FaunaOnline.carregarFotosGuia(); preencherFotosEspecies(); } catch (e) { /* sem conexão: ficam os ícones */ }
  });
}
/* foto que não carregou (sem internet e fora do cache): volta para o ícone do grupo */
document.addEventListener('error', ev => {
  const img = ev.target;
  if (img && img.tagName === 'IMG' && img.parentNode && img.parentNode.id === 'esp-destaque') { img.parentNode.innerHTML = ''; return; }
  if (img && img.tagName === 'IMG' && img.dataset && img.dataset.grupo && img.parentNode && img.parentNode.dataset.fotoEspecie) img.parentNode.innerHTML = iconeGrupoHtml(img.dataset.grupo);
}, true);

function listaEspeciesHtml() {
  const { grupo, termo } = Aplicativo.filtroGuia;
  const t = normalizar(termo);
  const lista = ESPECIES.filter(e => (!grupo || e.grupo === grupo) && (!t || normalizar(e.nome + ' ' + e.cientifico + ' ' + e.caracteristicas).includes(t)));
  return lista.map(e => `<a class="item vidro" href="#/guia/${e.id}">
      ${fotoEspecieHtml(e)}
      <span class="texto"><strong>${escaparHtml(e.nome)}</strong><small><em>${escaparHtml(e.cientifico)}</em></small>
      <span class="etiquetas">${etiquetaRisco(e.risco)}${e.peconhento ? '<span class="etiqueta alto">Peçonhento</span>' : ''}</span></span>
      ${icone('direita', 'class="seta"')}</a>`).join('') || `<div class="vazio vidro cartao">${icone('busca')}<p>Nenhuma espécie encontrada. Na dúvida, registre como "espécie não identificada" na ocorrência.</p></div>`;
}

function telaGuia() {
  const f = Aplicativo.filtroGuia;
  const grupos = Object.keys(GRUPOS).filter(g => g !== 'naoid');
  carregarFotosGuiaDepois();
  return `<main class="tela">
    <div class="topo"><h1>Guia de fauna</h1></div>
    <div class="busca">${icone('busca')}<input class="entrada" id="guia-busca" type="search" value="${escaparHtml(f.termo)}" placeholder="Nome popular ou científico" aria-label="Buscar espécie"></div>
    <div class="fichas mb-4">
      <button class="ficha" aria-pressed="${!f.grupo}" data-acao="guia-grupo" data-valor="">Todos</button>
      ${grupos.map(g => `<button class="ficha" aria-pressed="${f.grupo === g}" data-acao="guia-grupo" data-valor="${g}"><span style="color:${f.grupo === g ? 'inherit' : GRUPOS[g].cor}">${icone(GRUPOS[g].icone)}</span>${escaparHtml(GRUPOS[g].nome)}</button>`).join('')}
    </div>

    <a class="item vidro mb-3" href="#/guia/protocolo">
      <span class="icone">${icone('prancheta')}</span>
      <span class="texto"><strong>Protocolo de atuação</strong><small>Checklist por etapa, EPI, transporte, registro e destinação</small></span>${icone('direita', 'class="seta"')}</a>

    <a class="item vidro mb-4" href="#/guia/regiao">
      <span class="icone">${icone('marcador')}</span>
      <span class="texto"><strong>Fauna registrada na região</strong><small>Espécies observadas perto de você, com fotos para comparação (iNaturalist)</small></span>${icone('direita', 'class="seta"')}</a>

    <h2 class="titulo-secao">Espécies do guia</h2>
    <div class="lista" id="guia-lista">${listaEspeciesHtml()}</div>
    <p class="nota mt-2">Fotos: iNaturalist. A autoria de cada foto aparece na ficha da espécie.</p>

    <button class="botao botao-linha botao-bloco mt-3" data-acao="guia-online">${icone('busca')} Buscar na base on-line (iNaturalist)</button>
    <div class="lista mt-3" id="guia-online" aria-live="polite"></div>

    <h2 class="titulo-secao">Orientações por grupo</h2>
    <div class="grade-acoes">${Object.keys(GRUPOS).map(g => `<a class="acao vidro acao-curta" href="#/guia/grupo/${g}">
      <span class="icone" style="color:${GRUPOS[g].cor};background:var(--icone-fundo);border-color:var(--vidro-linha)">${icone(GRUPOS[g].icone)}</span><strong>${escaparHtml(GRUPOS[g].nome)}</strong></a>`).join('')}</div>

    <section class="cartao vidro">
      <h3>${icone('baixar', 'class="icone-inline"')} Usar o guia sem internet</h3>
      <p class="suave pequeno">Baixe agora as fotos e descrições on-line das ${ESPECIES.length} espécies do guia. Depois elas aparecem mesmo em campo, sem sinal.</p>
      <button class="botao botao-bloco" data-acao="guia-baixar">${icone('baixar')} Baixar fotos do guia</button>
      <p class="suave pequeno mt-2 mb-0" id="guia-baixar-status" aria-live="polite"></p>
    </section>
    <p class="nota">As orientações de manejo seguem o protocolo operacional da UNICENTRO e da Polícia Militar do Paraná e as fontes de saúde listadas em "Sobre". Fotos e descrições on-line vêm do iNaturalist e da Wikipédia e servem apenas para comparação. Na dúvida, mantenha a identificação como provisória.</p>
  </main>`;
}

/* ---------- Conteúdo on-line (iNaturalist) ---------- */
function itemEspecieOnlineHtml(t, extra) {
  return `<a class="item vidro" href="#/guia/inat/${t.id}">
    ${t.foto ? `<img class="miniatura-especie" src="${escaparHtml(t.foto.mini)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="icone" style="color:${GRUPOS[t.grupo].cor};background:var(--icone-fundo)">${icone(GRUPOS[t.grupo].icone)}</span>`}
    <span class="texto"><strong>${escaparHtml(t.nome)}</strong><small><em>${escaparHtml(t.cientifico)}</em>${extra ? ' · ' + extra : ''}</small></span>
    ${icone('direita', 'class="seta"')}</a>`;
}

function blocoOnlineHtml(t) {
  const fotos = t.fotos || [];
  return `${t.offline ? avisoHtml({ nivel: 'info', titulo: 'Exibindo dados salvos', texto: 'Sem conexão: mostrando a última versão baixada.' }) : ''}
    ${fotos.length ? `<div class="carrossel" role="list" aria-label="Fotos de referência">${fotos.map((f, i) => `<figure role="listitem">
      <img src="${escaparHtml(f.url)}" alt="Foto de referência ${i + 1} de ${escaparHtml(t.nome)}" loading="lazy" referrerpolicy="no-referrer">
      <figcaption>${escaparHtml(f.atribuicao)}</figcaption></figure>`).join('')}</div>` : ''}
    <dl class="dados">
      ${t.resumo ? `<dt>Descrição</dt><dd>${escaparHtml(t.resumo)}</dd>` : ''}
      ${t.classificacao && (t.classificacao.classe || t.classificacao.familia) ? `<dt>Classificação</dt><dd>${[t.classificacao.classe, t.classificacao.ordem, t.classificacao.familia].filter(Boolean).map(escaparHtml).join(' › ')}</dd>` : ''}
      ${t.status && t.status.length ? `<dt>Status de conservação</dt><dd><div class="etiquetas">${t.status.map(s => `<span class="etiqueta ${['CR', 'EN', 'VU', 'EW', 'EX'].includes(s.codigo) ? 'alto' : s.codigo === 'NT' ? 'medio' : 'baixo'}">${escaparHtml(s.texto)} · ${escaparHtml(s.local)}</span>`).join('')}</div></dd>` : ''}
      ${t.observacoes ? `<dt>Registros no iNaturalist</dt><dd>${t.observacoes.toLocaleString('pt-BR')} observações</dd>` : ''}
    </dl>
    <p class="suave pequeno mt-3 mb-0">Fonte: <a href="${escaparHtml(t.url)}" target="_blank" rel="noopener">iNaturalist</a>${t.wikipedia ? ` · <a href="${escaparHtml(t.wikipedia)}" target="_blank" rel="noopener">Wikipédia</a>` : ''}. Fotos de seus respectivos autores.</p>`;
}

function telaEspecie(id) {
  const e = ESPECIES.find(x => x.id === id);
  if (!e) return telaNaoEncontrada();
  const G = GRUPOS[e.grupo];
  // foto de destaque: já salva no aparelho ou buscada junto com as fotos do guia
  const destaque = f => f ? `<img src="${escaparHtml(f.url)}" alt="Foto de referência: ${escaparHtml(e.nome)}" referrerpolicy="no-referrer"><figcaption>${escaparHtml(f.atribuicao)} · iNaturalist</figcaption>` : '';
  Aplicativo.depois(async () => {
    const fig = document.getElementById('esp-destaque');
    if (!fig || fig.innerHTML || navigator.onLine === false) return;
    try { await FaunaOnline.carregarFotosGuia(); fig.innerHTML = destaque(FaunaOnline.fotoGuia(e)); preencherFotosEspecies(); } catch (err) { /* sem conexão */ }
  });
  Aplicativo.depois(async () => {
    const alvoEl = document.getElementById('online-especie');
    if (!alvoEl) return;
    try {
      const t = await FaunaOnline.porNomeCientifico(e.cientifico.replace(/ spp\.?$/, '').replace(/^Ordem /, ''));
      if (document.getElementById('online-especie') === alvoEl) alvoEl.innerHTML = '<h3>Fotos e informações de referência</h3>' + blocoOnlineHtml(t);
    } catch (err) {
      alvoEl.innerHTML = `<h3>Fotos e informações de referência</h3><p class="suave">${escaparHtml(err.message)} Conecte-se uma vez ou use "Baixar fotos do guia" para ter este conteúdo sem internet.</p>`;
    }
  });
  return `<main class="tela">
    <div class="topo"><a class="botao botao-icone" href="#/guia" aria-label="Voltar ao guia">${icone('esquerda')}</a><h1>${escaparHtml(e.nome)}</h1></div>
    <figure class="esp-destaque" id="esp-destaque">${destaque(FaunaOnline.fotoGuia(e))}</figure>
    <section class="cartao vidro">
      <div class="esp-cab"><span class="icone" style="color:${G.cor}">${icone(G.icone)}</span>
        <div><h2 class="m-0">${escaparHtml(e.nome)}</h2><em>${escaparHtml(e.cientifico)}</em>
        <div class="etiquetas">${etiquetaRisco(e.risco)}${e.peconhento ? '<span class="etiqueta alto">Peçonhento</span>' : '<span class="etiqueta neutra">Não peçonhento</span>'}<span class="etiqueta neutra">${escaparHtml(G.singular)}</span></div></div></div>
      <dl class="dados">
        <dt>Porte</dt><dd>${escaparHtml(e.porte)}</dd>
        <dt>Como reconhecer</dt><dd>${escaparHtml(e.caracteristicas)}</dd>
      </dl>
    </section>
    ${avisoHtml({ nivel: e.risco === 'alto' ? 'perigo' : e.risco === 'medio' ? 'atencao' : 'info', titulo: 'Cuidados no manejo', texto: e.cuidados })}
    <section class="cartao vidro" id="online-especie" aria-live="polite"><h3>Fotos e informações de referência</h3><p class="carregando">Carregando…</p></section>
    <details class="cartao vidro"><summary>Orientações gerais para ${escaparHtml(G.nome.toLowerCase())}</summary>
      <ul class="lista-texto mt-3">${ORIENTACOES_GRUPO[e.grupo].map(t => `<li>${escaparHtml(t)}</li>`).join('')}</ul></details>
  </main>`;
}

/* espécie vinda da base on-line (fora do catálogo do SISTRAFA) */
function telaEspecieOnline(id) {
  Aplicativo.depois(async () => {
    const alvoEl = document.getElementById('inat-conteudo');
    try {
      const t = await FaunaOnline.taxon(id);
      const G = GRUPOS[t.grupo] || GRUPOS.naoid;
      const local = ESPECIES.find(e => normalizar(e.cientifico) === normalizar(t.cientifico));
      document.querySelector('.topo h1').textContent = t.nome;
      alvoEl.innerHTML = `<section class="cartao vidro">
          <div class="esp-cab"><span class="icone" style="color:${G.cor}">${icone(G.icone)}</span>
            <div><h2 class="m-0">${escaparHtml(t.nome)}</h2><em>${escaparHtml(t.cientifico)}</em><div class="etiquetas"><span class="etiqueta neutra">${escaparHtml(G.singular)}</span><span class="etiqueta neutra">Base on-line</span></div></div></div>
          ${blocoOnlineHtml(t)}</section>
        ${local ? `<a class="botao botao-primario botao-bloco mb-4" href="#/guia/${local.id}">${icone('livro')} Ver orientações de manejo do SISTRAFA</a>`
          : avisoHtml({ nivel: 'atencao', titulo: 'Espécie fora do guia do SISTRAFA', texto: 'Ainda não há orientação específica do SISTRAFA para esta espécie. Siga as orientações gerais do grupo abaixo e, se houver risco, a conduta mais cautelosa.' })}
        <section class="cartao vidro"><h3>${grupoIcone(t.grupo)} Orientações gerais: ${escaparHtml(G.nome.toLowerCase())}</h3>
          <ul class="lista-texto">${ORIENTACOES_GRUPO[t.grupo].map(x => `<li>${escaparHtml(x)}</li>`).join('')}</ul></section>`;
    } catch (err) {
      alvoEl.innerHTML = `<div class="vazio vidro cartao">${icone('info')}<p>${escaparHtml(err.message)}</p></div>`;
    }
  });
  return `<main class="tela">
    <div class="topo"><a class="botao botao-icone" href="javascript:history.back()" aria-label="Voltar">${icone('esquerda')}</a><h1>Espécie</h1></div>
    <div id="inat-conteudo" aria-live="polite"><p class="carregando">Carregando informações on-line…</p></div>
  </main>`;
}

function telaRegiao() {
  const posicao = Aplicativo.posicaoRegiao || FaunaOnline.REGIAO_PADRAO;
  const g = Aplicativo.filtroRegiao || '';
  Aplicativo.depois(async () => {
    const alvoEl = document.getElementById('regiao-lista');
    try {
      const r = await FaunaOnline.daRegiao(posicao, g, 50);
      alvoEl.innerHTML = (r.offline ? avisoHtml({ nivel: 'info', titulo: 'Exibindo dados salvos', texto: 'Sem conexão: mostrando a última lista baixada.' }) : '') +
        `<p class="suave pequeno">${r.total.toLocaleString('pt-BR')} espécies com registros confirmados. Mostrando as mais observadas.</p>` +
        (r.lista.map(t => itemEspecieOnlineHtml(t, plural(t.registros, 'registro', 'registros'))).join('') || '<p>Nenhum registro encontrado.</p>');
    } catch (err) {
      alvoEl.innerHTML = `<div class="vazio vidro cartao">${icone('info')}<p>${escaparHtml(err.message)}</p></div>`;
    }
  });
  const grupos = ['aves', 'mamiferos', 'repteis', 'anfibios', 'outros'];
  return `<main class="tela">
    <div class="topo"><a class="botao botao-icone" href="#/guia" aria-label="Voltar ao guia">${icone('esquerda')}</a><h1>Fauna da região<span class="sub">Raio de 50 km · ${escaparHtml(posicao.nome || 'sua localização')}</span></h1></div>
    <button class="botao botao-linha botao-bloco mb-3" data-acao="regiao-gps">${icone('marcador')} Usar minha localização</button>
    <div class="fichas mb-4">
      <button class="ficha" aria-pressed="${!g}" data-acao="regiao-grupo" data-valor="">Todos</button>
      ${grupos.map(x => `<button class="ficha" aria-pressed="${g === x}" data-acao="regiao-grupo" data-valor="${x}">${escaparHtml(GRUPOS[x].nome)}</button>`).join('')}
    </div>
    <div class="lista" id="regiao-lista" aria-live="polite"><p class="carregando">Carregando espécies da região…</p></div>
    <p class="nota mt-4">Registros de pesquisa (verificados pela comunidade) do iNaturalist. Útil para comparar fotos durante a identificação inicial.</p>
  </main>`;
}
function telaGrupo(g) {
  const G = GRUPOS[g];
  if (!G) return telaNaoEncontrada();
  const esp = ESPECIES.filter(e => e.grupo === g);
  carregarFotosGuiaDepois();
  return `<main class="tela">
    <div class="topo"><a class="botao botao-icone" href="#/guia" aria-label="Voltar ao guia">${icone('esquerda')}</a><h1>${escaparHtml(G.nome)}</h1></div>
    <section class="cartao vidro"><h2>${grupoIcone(g)} Orientações gerais</h2>
      <ul class="lista-texto">${ORIENTACOES_GRUPO[g].map(t => `<li>${escaparHtml(t)}</li>`).join('')}</ul></section>
    ${esp.length ? `<h2 class="titulo-secao">Espécies deste grupo</h2><div class="lista">${esp.map(e => `<a class="item vidro" href="#/guia/${e.id}">
      ${fotoEspecieHtml(e)}
      <span class="texto"><strong>${escaparHtml(e.nome)}</strong><small><em>${escaparHtml(e.cientifico)}</em></small></span>${etiquetaRisco(e.risco)}</a>`).join('')}</div>` : ''}
  </main>`;
}

/* consulta offline do protocolo operacional (Dallabrida et al., 2026, em elaboração) */
const CRITERIOS_TRANSPORTE = [
  ['Separação por espécie', 'evita interação entre predadores e presas.'],
  ['Compatibilidade de comportamento', 'evita agressões entre indivíduos territoriais.'],
  ['Condição clínica', 'animais debilitados e filhotes vão em compartimentos separados.'],
  ['Densidade adequada', 'superlotação pode causar asfixia, pisoteamento e brigas.'],
  ['Adequação a cada grupo', 'aves com espaço limitado para não se debaterem; mamíferos em postura natural; serpentes em recipiente fechado, opaco e ventilado; anfíbios com umidade e sem superfícies ásperas.']
];
const ITENS_REGISTRO = [
  ['Macro e microambiente', 'contexto geral (residência, veículo, área rural) e detalhes do recinto.'],
  ['Forma de acondicionamento', 'gaiolas, caixas, sacos ou recipientes improvisados; espaço, ventilação e mobilidade.'],
  ['Higiene e nutrição', 'fezes, urina, restos de alimento, água disponível e estado dos recipientes.'],
  ['Sinais de maus-tratos', 'superlotação, contenção traumática, falta de abrigo ou exposição ao sol e à chuva.'],
  ['Avaliação clínica externa', 'lesões, fraturas, parasitas externos e condição corporal, sem manipulação invasiva.'],
  ['Indicadores de comportamento', 'medo, apatia, agressividade ou movimentos repetitivos.']
];

function telaProtocolo() {
  const lista = itens => `<dl class="dados">${itens.map(([t, d]) => `<dt>${escaparHtml(t)}</dt><dd>${escaparHtml(d)}</dd>`).join('')}</dl>`;
  return `<main class="tela">
    <div class="topo"><a class="botao botao-icone" href="#/guia" aria-label="Voltar ao guia">${icone('esquerda')}</a><h1>Protocolo de atuação</h1></div>
    ${avisoHtml({ nivel: 'info', titulo: 'Resumo para consulta em campo', texto: 'Estes itens também aparecem como checklist dentro da ocorrência, na etapa correspondente. Não substituem a avaliação de médico-veterinário, biólogo ou equipe especializada, nem o treinamento prévio da equipe.' })}
    ${CHECKLIST_OPERACIONAL.map(c => `<section class="cartao vidro"><h2>${escaparHtml(c.titulo)}</h2>
      <ul class="lista-texto">${c.itens.map(([, t]) => `<li>${escaparHtml(t)}</li>`).join('')}</ul></section>`).join('')}
    <section class="cartao vidro"><h2>${icone('escudo', 'class="icone-inline"')} EPI recomendados</h2>${lista(EPI_RECOMENDADOS)}
      <p class="suave pequeno mb-0">A vacinação da equipe deve estar em dia, com destaque para raiva, tétano e febre amarela.</p></section>
    <section class="cartao vidro"><h2>Transporte: como distribuir os animais</h2>${lista(CRITERIOS_TRANSPORTE)}</section>
    <section class="cartao vidro"><h2>O que registrar</h2><p class="suave pequeno">Fotografe antes de qualquer intervenção, de forma objetiva e sem manipular os animais apenas para o registro.</p>${lista(ITENS_REGISTRO)}</section>
    <section class="cartao vidro"><h2>Destinação</h2>
      <ul class="lista-texto">
        <li>Encaminhe os animais a uma instituição habilitada: CETAS, CETRAS ou outra autorizada pelo órgão ambiental.</li>
        <li>Não solte os animais no local sem avaliação técnica e não os deixe sob a guarda de particulares ou de agentes.</li>
        <li>Avise a instituição de destino antes de sair, para que a equipe se prepare.</li>
        <li>A destinação final (soltura, reabilitação ou cativeiro) é decidida pelo órgão ambiental, após avaliação técnica.</li>
      </ul></section>
    <p class="nota">Fonte: Dallabrida et al. (2026), Protocolo operacional para atuação policial em apreensões de fauna vitimada (UNICENTRO e Polícia Militar do Paraná).</p>
  </main>`;
}

/* ================= Contatos ================= */
function telaContatos() {
  const todos = Contatos.todos();
  const porTipo = {};
  todos.forEach(c => { (porTipo[c.tipo] = porTipo[c.tipo] || []).push(c); });
  const ordem = ['emergencia', 'cetras', 'orgao', 'zoo', 'santuario', 'vet', 'saude', 'outro'];
  return `<main class="tela">
    <div class="topo"><h1>Contatos e instituições</h1><a class="botao botao-primario botao-pequeno" href="#/contato/novo">${icone('mais')} Adicionar</a></div>
    <div class="busca">${icone('busca')}<input class="entrada" id="cont-busca" type="search" placeholder="Buscar por nome ou cidade" aria-label="Buscar contato" aria-controls="cont-lista"></div>
    <p id="cont-vazio" class="vazio vidro cartao" role="status" hidden>Nenhum contato encontrado. Confira a grafia ou adicione a instituição pelo botão "Adicionar".</p>
    ${(c => c ? `<section class="cartao vidro destaque">
      <span class="etiqueta baixo mb-2">Referência regional · Guarapuava e região</span>
      <div class="contato-cab mt-2 mb-2">${logoContatoHtml(c)}<h2 class="m-0">${escaparHtml(c.nome)}</h2></div>
      <p class="suave mb-2">${escaparHtml(c.descricao)}</p>
      ${c.endereco ? `<p class="mb-3">${icone('marcador', 'class="icone-inline"')} ${escaparHtml(c.endereco)}</p>` : ''}
      <div class="linha-btns">
        ${c.telefone ? `<a class="botao botao-primario" href="${escaparHtml(telefoneLink(c.telefone))}">${icone('telefone')} ${escaparHtml(c.telefone)}</a>` : ''}
        <a class="botao" href="#/contato/${c.id}">${icone('editar')} Editar</a>
      </div>
    </section>` : '')(Contatos.obter('cetras-unicentro'))}
    <p class="nota mb-4">Toque em um contato para editar. Cadastre as instituições da sua região com a localização: na etapa de encaminhamento, o app sugere as mais próximas.</p>
    <div id="cont-lista">${ordem.filter(t => porTipo[t]).map(t => `<section data-secao>
      <h2 class="titulo-secao">${escaparHtml(TIPOS_CONTATO[t])}</h2>
      <div class="lista">${porTipo[t].map(c => `<div class="item vidro" data-busca="${escaparHtml(normalizar(c.nome + ' ' + (c.cidade || '') + ' ' + (c.descricao || '')))}">
        ${logoContatoHtml(c)}
        <a class="texto" href="#/contato/${c.id}"><strong>${escaparHtml(c.nome)}</strong>
          <small>${escaparHtml(c.cidade || '')}${c.telefone ? ' · ' + escaparHtml(c.telefone) : ''}</small>
          ${c.descricao ? `<small>${escaparHtml(c.descricao)}</small>` : ''}
          ${c.atende24h ? '<span class="etiquetas mt-1"><span class="etiqueta baixo">24 h</span></span>' : ''}</a>
        ${c.telefone ? `<a class="botao botao-icone botao-primario" href="${escaparHtml(telefoneLink(c.telefone))}" aria-label="Ligar para ${escaparHtml(c.nome)}">${icone('telefone')}</a>` : ''}
      </div>`).join('')}</div></section>`).join('')}</div>
    <button class="botao botao-bloco mt-5" data-acao="contatos-restaurar">Restaurar contatos padrão</button>
  </main>`;
}

function telaFormularioContato(id) {
  const novo = id === 'novo';
  const c = novo ? { id: gerarId(), nome: '', tipo: 'cetras', telefone: '', cidade: '', endereco: '', grupos: [], descricao: '' } : Contatos.obter(id);
  if (!c) return telaNaoEncontrada();
  Aplicativo.contatoEmEdicao = JSON.parse(JSON.stringify(c));
  const C = Aplicativo.contatoEmEdicao;
  return `<main class="tela">
    <div class="topo"><a class="botao botao-icone" href="#/contatos" aria-label="Voltar">${icone('esquerda')}</a><h1>${novo ? 'Novo contato' : 'Editar contato'}</h1></div>
    <form class="cartao vidro" id="form-contato" novalidate>
      <div class="campo"><label for="c-nome">Nome *</label><input id="c-nome" class="entrada" name="nome" value="${escaparHtml(C.nome)}" required></div>
      <div class="campo"><label for="c-tipo">Tipo</label><select id="c-tipo" class="entrada" name="tipo">${Object.entries(TIPOS_CONTATO).map(([k, v]) => `<option value="${k}" ${k === C.tipo ? 'selected' : ''}>${escaparHtml(v)}</option>`).join('')}</select></div>
      <div class="campo"><label for="c-tel">Telefone</label><input id="c-tel" class="entrada" name="telefone" type="tel" value="${escaparHtml(C.telefone)}"></div>
      <div class="campo"><label for="c-cid">Cidade / região</label><input id="c-cid" class="entrada" name="cidade" value="${escaparHtml(C.cidade)}"></div>
      <div class="campo"><label for="c-end">Endereço</label><input id="c-end" class="entrada" name="endereco" value="${escaparHtml(C.endereco)}"></div>
      <div class="campo"><span class="rotulo">Grupos que recebe</span>${fichasHtml(Object.keys(GRUPOS).filter(g => g !== 'naoid').map(g => [g, GRUPOS[g].nome]), C.grupos, 'data-acao="contato-grupo"', true)}</div>
      ${marcacaoHtml('Atendimento 24 horas', C.atende24h, 'data-acao="contato-24h"')}
      <div class="campo"><label for="c-desc">Descrição / horário de atendimento</label><textarea id="c-desc" class="entrada" name="descricao">${escaparHtml(C.descricao)}</textarea></div>
      <div class="campo"><span class="rotulo">Localização da instituição</span>
        <p class="dica">${C.lat != null ? `Registrada: ${C.lat.toFixed(4)}, ${C.lng.toFixed(4)}` : 'Usada para sugerir as instituições mais próximas.'}</p>
        <button type="button" class="botao botao-linha botao-bloco" data-acao="contato-gps">${icone('marcador')} Usar minha localização atual</button></div>
      <button class="botao botao-primario botao-bloco" type="submit">${icone('certo')} Salvar</button>
    </form>
    ${!novo ? `<button class="botao botao-bloco botao-excluir" data-acao="contato-excluir" data-id="${C.id}">${icone('lixeira')} Remover contato</button>` : ''}
  </main>`;
}

/* ================= Perfil e ajustes ================= */
function telaPerfil() {
  const c = Aplicativo.ajustes;
  Aplicativo.depois(async () => { const d = document.getElementById('dados-aparelho'); if (d) d.innerHTML = await resumoDadosHtml(); });
  return `<main class="tela">
    <div class="topo"><h1>Perfil e ajustes</h1></div>

    <h2 class="titulo-secao">Meu perfil</h2>
    <form class="cartao vidro" id="form-perfil-edit" novalidate>
      ${camposPerfil(Aplicativo.perfil)}
      <button class="botao botao-primario botao-bloco" type="submit">${icone('certo')} Salvar perfil</button>
    </form>

    <h2 class="titulo-secao">Tela e leitura</h2>
    <section class="cartao vidro">
      <div class="campo"><span class="rotulo">${icone('contraste', 'class="icone-inline"')} Tema</span>
        <p class="dica">Use o tema claro (modo sol) para ler melhor sob luz solar forte.</p>
        ${fichasHtml([['escuro', 'Escuro'], ['claro', 'Claro (modo sol)']], c.tema || 'escuro', 'data-acao="ajuste" data-campo="tema"', false, true)}</div>
      <div class="campo"><span class="rotulo">${icone('texto', 'class="icone-inline"')} Tamanho do texto</span>
        ${fichasHtml([['normal', 'Normal'], ['grande', 'Grande'], ['muito-grande', 'Muito grande']], c.fonte, 'data-acao="ajuste" data-campo="fonte"', false, true)}</div>
      ${marcacaoHtml('Alto contraste', c.contraste, 'data-acao="ajuste-alternar" data-campo="contraste"')}
    </section>

    <h2 class="titulo-secao">Fotos</h2>
    <section class="cartao vidro">
      ${marcacaoHtml('Gravar a localização junto com cada foto', c.localizacaoAuto, 'data-acao="ajuste-alternar" data-campo="localizacaoAuto"')}
    </section>

    <h2 class="titulo-secao">Segurança</h2>
    <section class="cartao vidro">
      <p>${Aplicativo.perfil.pinHash ? 'O app pede o PIN ao abrir.' : 'O app abre sem PIN.'}</p>
      <div class="linha-btns">
        <button class="botao" data-acao="pin-definir">${icone('cadeado')} ${Aplicativo.perfil.pinHash ? 'Alterar PIN' : 'Definir PIN'}</button>
        ${Aplicativo.perfil.pinHash ? `<button class="botao" data-acao="pin-remover">Remover PIN</button><button class="botao" data-acao="bloquear">Bloquear agora</button>` : ''}
      </div>
    </section>

    <h2 class="titulo-secao">Dados do aparelho</h2>
    <section class="cartao vidro">
      <div id="dados-aparelho" aria-live="polite"><p class="suave">Os dados ficam apenas neste celular.</p></div>
      <button class="botao botao-bloco mb-3" data-acao="copia-seguranca">${icone('baixar')} Exportar cópia de segurança (sem fotos)</button>
      <button class="botao botao-bloco mb-3" data-acao="importar">${icone('compartilhar')} Importar cópia de segurança</button>
      <button class="botao botao-bloco botao-excluir" data-acao="apagar-tudo">${icone('lixeira')} Apagar todos os dados</button>
    </section>

    <a class="item vidro mb-4" href="#/sobre">
      <span class="icone">${icone('info')}</span>
      <span class="texto"><strong>Sobre o SISTRAFA</strong><small>Projeto, equipe e fontes das orientações</small></span>${icone('direita', 'class="seta"')}</a>
  </main>`;
}

/* resumo simples do que está guardado; o botão de proteger só aparece quando o navegador pode apagar os dados */
async function resumoDadosHtml() {
  let nFotos = 0; try { nFotos = (await Fotos.todas()).filter(f => !f.excluida).length; } catch (e) {}
  let persistente = null;
  try { if (navigator.storage && navigator.storage.persisted) persistente = await navigator.storage.persisted(); } catch (e) {}
  return `<p class="suave">Os dados ficam apenas neste celular: ${plural(Ocorrencias.todas().length, 'ocorrência', 'ocorrências')} e ${plural(nFotos, 'foto', 'fotos')}. Faça cópias de segurança de vez em quando.</p>
    ${persistente === false ? `<p class="suave pequeno">Se o celular ficar sem espaço, o sistema pode apagar os dados do app. Toque abaixo para evitar isso.</p>
      <button class="botao botao-bloco mb-3" data-acao="persistir">${icone('escudo')} Proteger dados</button>` : ''}`;
}

const VERSAO = '0.8.1';

function telaSobre() {
  return `<main class="tela">
    <div class="topo"><a class="botao botao-icone" href="#/perfil" aria-label="Voltar">${icone('esquerda')}</a><h1>Sobre o SISTRAFA</h1></div>
    <section class="cartao vidro centro">
      <img class="logo-sobre" src="recursos/logo.png" alt="SISTRAFA">
      <p>Apoio a ocorrências com fauna silvestre para policiais e bombeiros.</p>
      <p class="suave pequeno mb-0">Versão ${VERSAO}</p>
    </section>
    <section class="cartao vidro">
      <h3>Projeto</h3>
      <dl class="dados">
        <dt>Instituição</dt><dd>Universidade Estadual do Centro-Oeste — UNICENTRO, Departamento de Ciência da Computação (DECOMP), Guarapuava - PR</dd>
        <dt>Desenvolvimento</dt><dd>Pedro Paulo de Lima</dd>
        <dt>Orientação</dt><dd>Profa. Dra. Carolina Paula de Almeida</dd>
        <dt>Coorientação</dt><dd>Prof. Dr. Jayme Augusto Peres</dd>
        <dt>Conteúdo de manejo</dt><dd>Me. Vanessa Eloisa Dallabrida — CETRAS/UNICENTRO (DEVET)</dd>
      </dl>
    </section>
    <details class="cartao vidro"><summary>Fontes das orientações</summary>
      <h3 class="mt-3">Legislação</h3>
      <ul class="lista-texto">
        <li>Lei nº 9.605/1998 (crimes ambientais; destinação de animais apreendidos).</li>
        <li>Decreto nº 6.514/2008 (infrações ambientais; destinação de animais apreendidos).</li>
        <li>Instrução Normativa Ibama nº 5/2021 (centros de triagem e destinação de animais silvestres).</li>
      </ul>
      <h3 class="mt-3">Manejo e saúde</h3>
      <ul class="lista-texto">
        <li>Protocolo operacional para atuação policial em apreensões de fauna vitimada (Dallabrida et al., UNICENTRO e Polícia Militar do Paraná, 2026).</li>
        <li>Guia de animais peçonhentos do Brasil (Ministério da Saúde, 2024).</li>
        <li>Manual de diagnóstico e tratamento de acidentes por animais peçonhentos (Funasa, 2001).</li>
        <li>Guia de vigilância de epizootias em primatas não humanos (Ministério da Saúde, 2014).</li>
      </ul>
      <h3 class="mt-3">Fotos e descrições do guia</h3>
      <p class="mb-0">iNaturalist (fotos de seus autores, indicados em cada imagem) e Wikipédia em português (licença CC BY-SA).</p>
    </details>
    <p class="nota">O SISTRAFA é uma ferramenta de apoio e funciona sem internet. Não substitui boletins de ocorrência, documentos oficiais, protocolos da sua instituição nem a avaliação de profissionais especializados.</p>
  </main>`;
}


/* ================= Ações ================= */
function alvo(el) { return el.dataset.alvo === 'lote' ? Aplicativo.contexto.lote : Aplicativo.contexto.ocorr; }
/* Salvamento da ocorrência.
   A ocorrência é capturada no momento da edição: se a pessoa trocar de tela antes do atraso
   terminar, o que foi digitado ainda é gravado. O indicador mostra o resultado real. */
let _salvarTimer = null;
let _salvarPendente = null;
function salvarOcorrencia(atraso) {
  clearTimeout(_salvarTimer);
  const ocorr = Aplicativo.contexto.ocorr;
  if (!ocorr) { gravarPendente(); return true; }
  if (_salvarPendente && _salvarPendente !== ocorr) gravarPendente();
  const gravar = () => {
    _salvarTimer = null; _salvarPendente = null;
    const ok = Ocorrencias.salvar(ocorr);
    atualizarEstadoSalvo(ok ? 'salvo' : 'erro', ocorr);
    return ok;
  };
  if (atraso) {
    _salvarPendente = ocorr;
    atualizarEstadoSalvo('salvando');
    _salvarTimer = setTimeout(gravar, atraso);
    return true;
  }
  return gravar();
}
/* grava imediatamente uma edição que ainda estava aguardando o atraso */
function gravarPendente() {
  if (!_salvarPendente) return;
  clearTimeout(_salvarTimer);
  const ocorr = _salvarPendente; _salvarPendente = null; _salvarTimer = null;
  Ocorrencias.salvar(ocorr);
}

async function novaOcorrencia() {
  const ocorr = Ocorrencias.criar(Aplicativo.perfil);
  location.hash = '#/ocorrencia/' + ocorr.id + '/etapa/0';
  if (Aplicativo.ajustes.localizacaoAuto) {
    const posicao = await obterLocalizacao(10000);
    if (posicao) {
      const o = Ocorrencias.obter(ocorr.id);
      if (o && o.local.lat == null) {
        Object.assign(o.local, posicao);
        Ocorrencias.registrar(o, 'Localização registrada', posicao.lat.toFixed(5) + ', ' + posicao.lng.toFixed(5));
        Ocorrencias.salvar(o);
        if (Aplicativo.contexto.ocorr && Aplicativo.contexto.ocorr.id === o.id && location.hash.endsWith('/etapa/0')) Aplicativo.desenhar();
      }
    }
  }
}

/* No aplicativo Android (APK), a página roda dentro de um WebView, que não baixa arquivos "blob:",
   não tem a função de compartilhar do navegador e não imprime. Nesse caso a ponte nativa
   window.SistrafaAndroid faz essas tarefas. No navegador ela não existe e nada muda. */
const PonteAndroid = window.SistrafaAndroid || null;
function blobParaBase64(blob) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result).split(',')[1] || '');
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsDataURL(blob);
  });
}
/* devolve a mensagem para o usuário; lança erro se não conseguir salvar */
async function baixarArquivo(blob, nome) {
  if (PonteAndroid) {
    const r = PonteAndroid.salvarArquivo(await blobParaBase64(blob), nome, blob.type || 'application/octet-stream');
    if (String(r).startsWith('erro')) throw new Error(r);
    return r;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return '';
}

const ACOES = {
  'nova': () => novaOcorrencia(),
  'modal-fechar': () => fecharModal(),

  'etapa-ir': el => {
    const ocorr = Aplicativo.contexto.ocorr; const n = parseInt(el.dataset.etapa, 10);
    salvarOcorrencia();
    location.hash = '#/ocorrencia/' + ocorr.id + '/etapa/' + n;
    window.scrollTo(0, 0);
  },

  'definir': el => {
    const obj = alvo(el); const campo = el.dataset.campo; const v = el.dataset.valor;
    const anterior = lerCaminho(obj, campo);
    gravarCaminho(obj, campo, anterior === v && el.dataset.alvo !== 'lote' && campo !== 'tipo' ? '' : v);
    if (el.dataset.alvo === 'lote' && campo === 'grupo' && Aplicativo.contexto.lote) Ocorrencias.registrar(Aplicativo.contexto.ocorr, 'Grupo definido', Aplicativo.contexto.lote.rotulo + ': ' + GRUPOS[v].nome);
    salvarOcorrencia(); Aplicativo.desenhar();
  },
  'alternar': el => {
    const obj = alvo(el); const campo = el.dataset.campo; const v = el.dataset.valor;
    let arr = (lerCaminho(obj, campo) || []).slice();
    const excl = el.dataset.exclusivo;
    if (arr.includes(v)) arr = arr.filter(x => x !== v);
    else { arr.push(v); if (excl) arr = v === excl ? [excl] : arr.filter(x => x !== excl); }
    gravarCaminho(obj, campo, arr);
    salvarOcorrencia(); Aplicativo.desenhar();
  },
  'marcar': el => {
    const obj = alvo(el); const campo = el.dataset.campo;
    gravarCaminho(obj, campo, !lerCaminho(obj, campo));
    salvarOcorrencia();
    el.setAttribute('aria-checked', String(!!lerCaminho(obj, campo)));
    // atualiza o contador do bloco do checklist (ex.: 3/5)
    const bloco = el.closest('section'), cont = bloco && bloco.querySelector('.cab .contagem');
    if (cont && campo.startsWith('manejo.checklist.')) {
      const caixas = bloco.querySelectorAll('[role="checkbox"]'), feitos = bloco.querySelectorAll('[role="checkbox"][aria-checked="true"]').length;
      cont.textContent = feitos + '/' + caixas.length;
      cont.setAttribute('aria-label', `${feitos} de ${caixas.length} itens marcados`);
    }
  },
  'numero': el => {
    const obj = alvo(el); const campo = el.dataset.campo;
    const v = Math.max(0, (parseInt(lerCaminho(obj, campo), 10) || 0) + parseInt(el.dataset.delta, 10));
    gravarCaminho(obj, campo, v); salvarOcorrencia();
    const entrada = el.parentElement.querySelector('input'); if (entrada) entrada.value = v;
    if (el.dataset.alvo === 'lote') { const b = document.querySelector('.contagem[aria-label="Total"]'); if (b) b.textContent = totalLote(Aplicativo.contexto.lote); }
  },
  'agora': el => {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    gravarCaminho(Aplicativo.contexto.ocorr, el.dataset.campo, d.toISOString().slice(0, 16)); salvarOcorrencia(); Aplicativo.desenhar();
  },
  'gps': async el => {
    el.disabled = true; el.textContent = 'Obtendo localização...';
    const posicao = await obterLocalizacao(15000);
    if (!posicao) { notificar('Não foi possível obter a localização. Verifique a permissão e o GPS.', 'erro'); Aplicativo.desenhar(); return; }
    Object.assign(Aplicativo.contexto.ocorr.local, posicao);
    Ocorrencias.registrar(Aplicativo.contexto.ocorr, 'Localização registrada', posicao.lat.toFixed(5) + ', ' + posicao.lng.toFixed(5));
    salvarOcorrencia(); notificar('Localização registrada'); Aplicativo.desenhar();
  },

  /* questionário */
  'resp': el => {
    const ocorr = Aplicativo.contexto.ocorr; const q = el.dataset.q; const v = el.dataset.valor; const chave = el.dataset.chave;
    const lista = chave === 'risco' ? PERGUNTAS_RISCO : PERGUNTAS_CONTEXTO;
    const p = lista.find(x => x.id === q);
    ocorr.respostas[q] = v;
    Ocorrencias.registrar(ocorr, 'Resposta', p.texto + ' → ' + respostaTexto(p, v));
    salvarOcorrencia();
    if (!(p.orientacao && p.orientacao[v])) Aplicativo.indicePergunta[ocorr.id + chave] = (Aplicativo.indicePergunta[ocorr.id + chave] || 0) + 1;
    Aplicativo.desenhar();
  },
  'pergunta-ir': el => { Aplicativo.indicePergunta[Aplicativo.contexto.ocorr.id + el.dataset.chave] = parseInt(el.dataset.i, 10); salvarOcorrencia(); Aplicativo.desenhar(); },

  /* lotes */
  'lote-novo': el => {
    const ocorr = Aplicativo.contexto.ocorr; const tipo = el.dataset.tipo;
    const n = ocorr.lotes.filter(l => l.tipo === tipo).length + 1;
    const l = { id: gerarId(), tipo, rotulo: (tipo === 'lote' ? 'Lote ' : 'Animal ') + n, grupo: '', especies: [], estado: 'vivo', situacao: '', condicoes: [], riscos: [], individuos: [], caracteristicas: '', obs: '' };
    ocorr.lotes.push(l);
    Ocorrencias.registrar(ocorr, 'Registro criado', l.rotulo);
    salvarOcorrencia();
    location.hash = '#/ocorrencia/' + ocorr.id + '/lote/' + l.id;
  },
  'lote-excluir': async () => {
    const { ocorr, lote } = Aplicativo.contexto;
    const motivo = await confirmar('Excluir ' + lote.rotulo + '?', 'Os dados deste registro serão removidos. As fotos continuarão na ocorrência.', { motivo: 'Motivo da exclusão', ok: 'Excluir', perigo: true });
    if (!motivo) return;
    ocorr.lotes = ocorr.lotes.filter(l => l.id !== lote.id);
    Ocorrencias.registrar(ocorr, 'Registro excluído', lote.rotulo + ' — motivo: ' + motivo);
    salvarOcorrencia(); location.hash = '#/ocorrencia/' + ocorr.id + '/etapa/4';
  },
  'esp-add': () => modalEspecie(),
  'esp-remover': el => {
    const { ocorr, lote } = Aplicativo.contexto; const e = lote.especies[el.dataset.i];
    lote.especies.splice(el.dataset.i, 1);
    Ocorrencias.registrar(ocorr, 'Espécie removida', lote.rotulo + ': ' + e.nome);
    salvarOcorrencia(); Aplicativo.desenhar();
  },
  'esp-confirmar': el => {
    const { ocorr, lote } = Aplicativo.contexto; const e = lote.especies[el.dataset.i];
    if (e.naoIdentificada) { notificar('Para confirmar, remova e adicione a espécie identificada.', 'aviso'); return; }
    e.provisoria = !e.provisoria;
    Ocorrencias.registrar(ocorr, 'Identificação ' + (e.provisoria ? 'marcada como provisória' : 'confirmada'), lote.rotulo + ': ' + e.nome);
    salvarOcorrencia(); Aplicativo.desenhar();
  },
  'ind-add': () => {
    const l = Aplicativo.contexto.lote; l.individuos = l.individuos || [];
    l.individuos.push({ id: gerarId(), rotulo: 'Animal ' + (l.individuos.length + 1), obs: '' });
    salvarOcorrencia(); Aplicativo.desenhar();
  },
  'ind-remover': el => { Aplicativo.contexto.lote.individuos.splice(el.dataset.i, 1); salvarOcorrencia(); Aplicativo.desenhar(); },

  /* encaminhamento */
  'inst': el => {
    const E = Aplicativo.contexto.ocorr.encaminhamento; const c = Contatos.obter(el.dataset.id);
    E.instituicaoId = c.id; E.instituicaoNome = c.nome;
    salvarOcorrencia(); Aplicativo.desenhar();
  },

  /* monitoramento durante o transporte: cada verificação fica gravada com data e hora */
  'monit-add': () => {
    const ocorr = Aplicativo.contexto.ocorr;
    const m = abrirModal('Verificação dos animais', `
      <p class="suave pequeno">Registrada com a hora atual. Marque o que observou.</p>
      <div class="campo"><span class="rotulo">Sinais observados</span>${fichasHtml(SINAIS_TRANSPORTE, [], 'data-sinal', true)}</div>
      <div class="campo"><label for="mn-obs">Observação (opcional)</label><textarea id="mn-obs" class="entrada" rows="2" placeholder="Ex.: caixa 2 com ave ofegante; parada à sombra"></textarea></div>
      <div class="modal-acoes"><button class="botao" data-f="cancelar">Cancelar</button><button class="botao botao-primario" data-f="salvar">${icone('certo')} Registrar</button></div>`);
    const marcados = new Set();
    m.addEventListener('click', ev => {
      const s = ev.target.closest('[data-sinal]');
      if (s) {
        const v = s.dataset.valor;
        if (marcados.has(v)) marcados.delete(v);
        else { marcados.add(v); if (v === 'estavel') ['agitacao', 'prostracao', 'respiracao', 'hipertermia', 'obito'].forEach(x => marcados.delete(x)); else marcados.delete('estavel'); }
        m.querySelectorAll('[data-sinal]').forEach(b => b.setAttribute('aria-pressed', String(marcados.has(b.dataset.valor))));
        return;
      }
      const b = ev.target.closest('[data-f]'); if (!b) return;
      if (b.dataset.f === 'cancelar') { fecharModal(); return; }
      if (!marcados.size) { notificar('Marque ao menos um sinal (ou "Estável").', 'aviso'); return; }
      const v = { id: gerarId(), ts: new Date().toISOString(), sinais: SINAIS_TRANSPORTE.map(([k]) => k).filter(k => marcados.has(k)), obs: m.querySelector('#mn-obs').value.trim() };
      ocorr.encaminhamento.monitoramento.push(v);
      Ocorrencias.registrar(ocorr, 'Verificação no transporte', rotulosDe(SINAIS_TRANSPORTE, v.sinais) + (v.obs ? ' — ' + v.obs : ''));
      salvarOcorrencia(); fecharModal(true); notificar('Verificação registrada'); Aplicativo.desenhar();
    });
  },
  'monit-remover': async el => {
    const ocorr = Aplicativo.contexto.ocorr;
    const v = ocorr.encaminhamento.monitoramento.find(x => x.id === el.dataset.id); if (!v) return;
    const motivo = await confirmar('Remover verificação?', `A verificação das ${formatarHora(v.ts)} sai da lista, mas a remoção fica registrada no histórico.`, { motivo: 'Motivo da remoção', ok: 'Remover', perigo: true });
    if (!motivo) return;
    ocorr.encaminhamento.monitoramento = ocorr.encaminhamento.monitoramento.filter(x => x.id !== v.id);
    Ocorrencias.registrar(ocorr, 'Verificação no transporte removida', formatarHora(v.ts) + ' — motivo: ' + motivo);
    salvarOcorrencia(); Aplicativo.desenhar();
  },

  /* fotos */
  'foto': el => escolherFoto(el),
  'foto-ver': el => modalVerFoto(el.dataset.id),

  /* encerramento */
  'encerrar': async () => {
    const ocorr = Aplicativo.contexto.ocorr;
    const pend = pendencias(ocorr);
    const ok = await confirmar('Encerrar ocorrência?', pend.length
      ? (pend.length === 1 ? 'Há 1 item pendente. Ele vai constar como não informado no relatório.' : `Há ${pend.length} itens pendentes. Eles vão constar como não informados no relatório.`) + ' Você pode reabrir a ocorrência depois para corrigir.'
      : 'O relatório será gerado com todas as informações registradas.', { ok: 'Encerrar e gerar relatório' });
    if (!ok) return;
    Cronologia.concluir(ocorr);
    ocorr.status = 'encerrada'; ocorr.encerradaEm = new Date().toISOString();
    Ocorrencias.registrar(ocorr, 'Ocorrência encerrada');
    salvarOcorrencia(); location.hash = '#/relatorio/' + ocorr.id;
  },
  'reabrir': async () => {
    const ocorr = Aplicativo.contexto.ocorr;
    const motivo = await confirmar('Reabrir ocorrência?', 'A reabertura ficará registrada no histórico.', { motivo: 'Motivo da reabertura', ok: 'Reabrir' });
    if (!motivo) return;
    ocorr.status = 'andamento'; ocorr.encerradaEm = null; ocorr.etapa = ETAPAS.length - 1;
    Ocorrencias.registrar(ocorr, 'Ocorrência reaberta', motivo);
    salvarOcorrencia(); location.hash = '#/ocorrencia/' + ocorr.id;
  },
  'ocorrencia-descartar': async el => {
    const ocorr = Ocorrencias.obter(el.dataset.id);
    if (!ocorr || ocorr.status !== 'andamento') return;
    let nFotos = 0; try { nFotos = (await Fotos.daOcorrencia(ocorr.id)).length; } catch (e) {}
    const ok = await confirmar('Excluir ocorrência em andamento?',
      `A ocorrência ${ocorr.numero}, aberta em ${formatarDataHora(ocorr.criadaEm)}${nFotos ? `, e ${plural(nFotos, 'foto', 'fotos')}` : ''} serão apagadas deste aparelho. Use esta opção se ela foi iniciada sem querer. Não pode ser desfeito.`,
      { ok: 'Excluir', perigo: true });
    if (!ok) return;
    await Fotos.apagarDaOcorrencia(ocorr.id);
    Ocorrencias.excluir(ocorr.id);
    notificar('Ocorrência excluída', 'info');
    if (location.hash.startsWith('#/ocorrencia/')) location.hash = '#/inicio'; else Aplicativo.desenhar();
  },
  'ocorrencia-excluir': async () => {
    const ocorr = Aplicativo.contexto.ocorr;
    const ok = await confirmar('Excluir ocorrência?', `A ocorrência ${ocorr.numero} e todas as suas fotos serão apagadas deste aparelho. Esta ação não pode ser desfeita.`, { ok: 'Excluir definitivamente', perigo: true });
    if (!ok) return;
    await Fotos.apagarDaOcorrencia(ocorr.id);
    Ocorrencias.excluir(ocorr.id); Aplicativo.contexto = {};
    notificar('Ocorrência excluída', 'info'); location.hash = '#/ocorrencias';
  },
  'imprimir': () => { if (PonteAndroid) PonteAndroid.imprimir(); else window.print(); },
  'compartilhar': async () => {
    const texto = textoResumo(Aplicativo.contexto.ocorr);
    if (PonteAndroid) { PonteAndroid.compartilharTexto('SISTRAFA ' + Aplicativo.contexto.ocorr.numero, texto); return; }
    try {
      if (navigator.share) { await navigator.share({ title: 'SISTRAFA ' + Aplicativo.contexto.ocorr.numero, text: texto }); return; }
      await navigator.clipboard.writeText(texto); notificar('Resumo copiado');
    } catch (e) { if (e.name !== 'AbortError') notificar('Não foi possível compartilhar.', 'erro'); }
  },
  'aba-ocorrencias': el => { Aplicativo.abaOcorrencias = el.dataset.valor; Aplicativo.desenhar(); },

  /* guia */
  'guia-grupo': el => { Aplicativo.filtroGuia.grupo = el.dataset.valor; Aplicativo.desenhar(); },
  'guia-online': async el => {
    const termo = (document.getElementById('guia-busca').value || '').trim();
    const alvoEl = document.getElementById('guia-online');
    if (termo.length < 3) { notificar('Digite pelo menos 3 letras na busca.', 'aviso'); document.getElementById('guia-busca').focus(); return; }
    alvoEl.innerHTML = '<p class="carregando">Buscando no iNaturalist…</p>';
    try {
      const lista = (await FaunaOnline.buscar(termo)).filter(t => !Aplicativo.filtroGuia.grupo || t.grupo === Aplicativo.filtroGuia.grupo);
      alvoEl.innerHTML = `<h2 class="titulo-secao mt-2">Resultados on-line para "${escaparHtml(termo)}"</h2>` +
        (lista.map(t => itemEspecieOnlineHtml(t, 'iNaturalist')).join('') || '<p class="suave">Nada encontrado.</p>');
    } catch (e) { alvoEl.innerHTML = `<p class="pendente">${escaparHtml(e.message)}</p>`; }
  },
  'guia-baixar': async el => {
    const situacao = document.getElementById('guia-baixar-status');
    if (!navigator.onLine) { notificar('Sem conexão com a internet.', 'aviso'); return; }
    el.disabled = true;
    const ok = await FaunaOnline.baixarCatalogo((i, n) => { if (situacao) situacao.textContent = `Baixando ${i} de ${n}...`; });
    el.disabled = false;
    if (situacao) situacao.textContent = `${ok} de ${ESPECIES.length} espécies salvas para uso sem internet.`;
    notificar('Guia salvo no aparelho');
  },
  'regiao-grupo': el => { Aplicativo.filtroRegiao = el.dataset.valor; Aplicativo.desenhar(); },
  'regiao-gps': async el => {
    el.disabled = true; el.textContent = 'Obtendo localização...';
    const posicao = await obterLocalizacao(15000);
    if (!posicao) { notificar('Não foi possível obter a localização.', 'erro'); Aplicativo.desenhar(); return; }
    Aplicativo.posicaoRegiao = { lat: posicao.lat, lng: posicao.lng, nome: 'sua localização' };
    Aplicativo.desenhar();
  },

  /* relatório em PDF (jsPDF) */
  'pdf-baixar': async el => {
    const ocorr = Aplicativo.contexto.ocorr;
    el.disabled = true; const texto = el.innerHTML; el.textContent = 'Gerando PDF...';
    try {
      const blob = await RelatorioPDF.gerar(ocorr, await Fotos.daOcorrencia(ocorr.id));
      const onde = await baixarArquivo(blob, `SISTRAFA_${ocorr.numero}.pdf`);
      Ocorrencias.registrar(ocorr, 'Relatório PDF gerado'); Ocorrencias.salvar(ocorr);
      notificar(onde ? 'PDF salvo em ' + onde.replace(/^Salvo em /, '') : 'PDF gerado');
    } catch (e) { console.error(e); notificar('Erro ao gerar o PDF. Use "Imprimir" como alternativa.', 'erro'); }
    el.disabled = false; el.innerHTML = texto;
  },
  'pdf-compartilhar': async el => {
    const ocorr = Aplicativo.contexto.ocorr;
    el.disabled = true;
    try {
      const blob = await RelatorioPDF.gerar(ocorr, await Fotos.daOcorrencia(ocorr.id));
      const arq = new File([blob], `SISTRAFA_${ocorr.numero}.pdf`, { type: 'application/pdf' });
      if (PonteAndroid) {
        PonteAndroid.compartilharArquivo(await blobParaBase64(blob), arq.name, 'application/pdf');
        Ocorrencias.registrar(ocorr, 'Relatório PDF compartilhado'); Ocorrencias.salvar(ocorr);
      } else if (navigator.canShare && navigator.canShare({ files: [arq] })) {
        await navigator.share({ files: [arq], title: 'SISTRAFA ' + ocorr.numero });
        Ocorrencias.registrar(ocorr, 'Relatório PDF compartilhado'); Ocorrencias.salvar(ocorr);
      } else notificar('Este aparelho não permite compartilhar arquivos. Use "Gerar e baixar PDF".', 'aviso');
    } catch (e) { if (e.name !== 'AbortError') { console.error(e); notificar('Não foi possível compartilhar.', 'erro'); } }
    el.disabled = false;
  },

  /* diagnóstico */
  'persistir': async () => {
    try { const ok = await navigator.storage.persist(); notificar(ok ? 'Dados protegidos' : 'O navegador não permitiu. Instale o app na tela inicial e tente outra vez.', ok ? 'sucesso' : 'aviso'); } catch (e) {}
    Aplicativo.desenhar();
  },
  'importar': () => {
    const entrada = document.createElement('input'); entrada.type = 'file'; entrada.accept = 'application/json,.json';
    entrada.addEventListener('change', async () => {
      if (!entrada.files || !entrada.files.length) return;   // seleção cancelada
      try {
        const d = JSON.parse(await entrada.files[0].text());
        if (d.app !== 'SISTRAFA' || !Array.isArray(d.ocorrencias)) throw new Error('Arquivo não é uma cópia do SISTRAFA.');
        const atuais = Ocorrencias.todas();
        const novas = d.ocorrencias.filter(o => o && o.id && o.numero && !atuais.some(a => a.id === o.id)).map(o => Ocorrencias.completar(o));
        if (!await confirmar('Importar cópia de segurança?', `${plural(novas.length, 'ocorrência nova será adicionada', 'ocorrências novas serão adicionadas')}. Ocorrências que já existem no aparelho não serão alteradas.`, { ok: 'Importar' })) return;
        novas.forEach(o => { Ocorrencias.registrar(o, 'Importada de cópia de segurança', d.exportadoEm || ''); });
        ArmazemLocal.gravar('ocorrencias', atuais.concat(novas));
        (d.contatos || []).forEach(c => { if (!Contatos.obter(c.id)) Contatos.salvar(c); });
        notificar('Cópia importada'); Aplicativo.desenhar();
      } catch (e) { notificar(e.message || 'Arquivo inválido.', 'erro'); }
    });
    entrada.click();
  },

  /* contatos */
  'contato-grupo': el => {
    const C = Aplicativo.contatoEmEdicao; const v = el.dataset.valor;
    C.grupos = C.grupos.includes(v) ? C.grupos.filter(x => x !== v) : C.grupos.concat(v);
    el.setAttribute('aria-pressed', String(C.grupos.includes(v)));
  },
  'contato-24h': el => {
    const C = Aplicativo.contatoEmEdicao; C.atende24h = !C.atende24h;
    el.setAttribute('aria-checked', String(C.atende24h));
  },
  'contato-gps': async el => {
    el.disabled = true;
    const posicao = await obterLocalizacao(15000);
    el.disabled = false;
    if (!posicao) { notificar('Não foi possível obter a localização.', 'erro'); return; }
    Aplicativo.contatoEmEdicao.lat = posicao.lat; Aplicativo.contatoEmEdicao.lng = posicao.lng;
    el.previousElementSibling.textContent = `Registrada: ${posicao.lat.toFixed(4)}, ${posicao.lng.toFixed(4)}`;
    notificar('Localização registrada');
  },
  'contato-excluir': async el => {
    if (!await confirmar('Remover contato?', 'O contato será removido da sua lista.', { ok: 'Remover', perigo: true })) return;
    Contatos.excluir(el.dataset.id); location.hash = '#/contatos';
  },
  'contatos-restaurar': async () => {
    if (!await confirmar('Restaurar contatos padrão?', 'Os contatos padrão removidos ou editados voltarão ao original. Seus contatos adicionados serão mantidos.')) return;
    Contatos.restaurarPadrao(); Aplicativo.desenhar();
  },

  /* ajustes */
  'ajuste': el => { Aplicativo.ajustes[el.dataset.campo] = el.dataset.valor; Ajustes.salvar(Aplicativo.ajustes); Aplicativo.aplicarAjustes(); Aplicativo.desenhar(); },
  'ajuste-alternar': el => {
    const k = el.dataset.campo; Aplicativo.ajustes[k] = !Aplicativo.ajustes[k]; Ajustes.salvar(Aplicativo.ajustes); Aplicativo.aplicarAjustes();
    el.setAttribute('aria-checked', String(Aplicativo.ajustes[k]));
  },
  'pin-definir': () => {
    const m = abrirModal('Definir PIN', `<form id="f-novo-pin"><div class="campo"><label for="np1">Novo PIN (4 a 8 números)</label><input id="np1" class="entrada entrada-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></div>
      <div class="campo"><label for="np2">Repita o PIN</label><input id="np2" class="entrada entrada-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></div>
      <button class="botao botao-primario botao-bloco" type="submit">Salvar PIN</button></form>`);
    m.querySelector('form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const a = m.querySelector('#np1').value, b = m.querySelector('#np2').value;
      if (!/^\d{4,8}$/.test(a)) { notificar('O PIN deve ter de 4 a 8 números.', 'aviso'); return; }
      if (a !== b) { notificar('Os PINs não conferem.', 'aviso'); return; }
      Aplicativo.perfil.pinHash = await hashTexto('sistrafa:' + a); Perfil.salvar(Aplicativo.perfil); Aplicativo.desbloqueado = true;
      fecharModal(true); notificar('PIN definido'); Aplicativo.desenhar();
    });
  },
  'pin-remover': async () => {
    if (!await confirmar('Remover PIN?', 'O aplicativo poderá ser aberto sem PIN.')) return;
    delete Aplicativo.perfil.pinHash; Perfil.salvar(Aplicativo.perfil); Aplicativo.desenhar();
  },
  'bloquear': () => { Aplicativo.desbloqueado = false; location.hash = '#/bloqueio'; },
  'copia-seguranca': async () => {
    const dados = { app: 'SISTRAFA', versao: 1, exportadoEm: new Date().toISOString(), perfil: Object.assign({}, Aplicativo.perfil, { pinHash: undefined }), ocorrencias: Ocorrencias.todas(), contatos: Contatos.personalizados() };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    try {
      const onde = await baixarArquivo(blob, 'sistrafa-backup-' + new Date().toISOString().slice(0, 10) + '.json');
      if (onde) notificar('Cópia de segurança salva em ' + onde.replace(/^Salvo em /, ''));
    } catch (e) { notificar('Não foi possível salvar a cópia de segurança.', 'erro'); }
  },
  'apagar-tudo': async () => {
    const ok = await confirmar('Apagar todos os dados?', 'Perfil, ocorrências, fotos e contatos serão apagados deste aparelho. Esta ação não pode ser desfeita.', { ok: 'Apagar tudo', perigo: true });
    if (!ok) return;
    try { await Fotos.limparTudo(); } catch (e) {}
    Object.keys(localStorage).filter(k => k.startsWith('sistrafa.')).forEach(k => localStorage.removeItem(k));
    Aplicativo.perfil = null; Aplicativo.ajustes = Ajustes.obter(); Aplicativo.aplicarAjustes();
    location.hash = '#/boas-vindas';
  }
};

/* ---------- Delegação de eventos ---------- */
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-acao]');
  if (!el || el.disabled) return;
  const fn = ACOES[el.dataset.acao];
  if (fn) { ev.preventDefault(); fn(el, ev); }
});

document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.id === 'guia-busca') { Aplicativo.filtroGuia.termo = el.value; document.getElementById('guia-lista').innerHTML = listaEspeciesHtml(); return; }
  if (el.id === 'cont-busca') {
    const t = normalizar(el.value);
    document.querySelectorAll('#cont-lista [data-busca]').forEach(i => { i.hidden = t && !i.dataset.busca.includes(t); });
    document.querySelectorAll('#cont-lista [data-secao]').forEach(s => { s.hidden = ![...s.querySelectorAll('[data-busca]')].some(i => !i.hidden); });
    const vazio = document.getElementById('cont-vazio');
    if (vazio) vazio.hidden = !t || [...document.querySelectorAll('#cont-lista [data-busca]')].some(i => !i.hidden);
    return;
  }
  if (!el.dataset.campo || !Aplicativo.contexto.ocorr || el.closest('.modal')) return;
  const obj = alvo(el);
  let v = el.value;
  if (el.type === 'number') v = v === '' ? '' : Math.max(0, parseInt(v, 10) || 0);
  gravarCaminho(obj, el.dataset.campo, v);
  if (el.dataset.limpa) gravarCaminho(obj, el.dataset.limpa, '');
  if (el.dataset.alvo === 'lote') {
    const b = document.querySelector('.contagem[aria-label="Total"]'); if (b) b.textContent = totalLote(Aplicativo.contexto.lote);
    if (el.dataset.campo === 'rotulo') { const h = document.querySelector('.topo h1'); if (h && h.firstChild) h.firstChild.textContent = v; }
  }
  salvarOcorrencia(400);
});

document.addEventListener('submit', async ev => {
  const f = ev.target;
  if (f.id === 'form-perfil' || f.id === 'form-perfil-edit') {
    ev.preventDefault();
    const d = dadosFormulario(f);
    // erros aparecem junto de cada campo; o foco vai para o primeiro campo a corrigir
    const erros = [];
    if (!d.nome.trim()) erros.push(['nome', 'Informe seu nome completo.']);
    if (!d.instituicao.trim()) erros.push(['instituicao', 'Informe a instituição.']);
    if (d.pin && !/^\d{4,8}$/.test(d.pin)) erros.push(['pin', 'O PIN deve ter de 4 a 8 números.']);
    if (erros.length) {
      erros.forEach(([nome, msg]) => marcarErroCampo(f.elements[nome], msg));
      f.elements[erros[0][0]].focus();
      return;
    }
    const p = Object.assign({}, Aplicativo.perfil || {}, { nome: d.nome.trim(), instituicao: d.instituicao.trim(), cargo: d.cargo.trim(), matricula: d.matricula.trim() });
    if (d.pin) p.pinHash = await hashTexto('sistrafa:' + d.pin);
    if (!Aplicativo.perfil) p.criadoEm = new Date().toISOString();
    if (!Perfil.salvar(p)) return;   // a falha já foi informada pelo armazenamento
    Aplicativo.perfil = p; Aplicativo.desbloqueado = true;
    notificar(f.id === 'form-perfil' ? 'Perfil criado' : 'Perfil salvo');
    location.hash = '#/inicio'; if (f.id === 'form-perfil-edit') Aplicativo.desenhar();
  }
  if (f.id === 'form-pin') {
    ev.preventDefault();
    const campo = f.querySelector('#pin');
    const h = await hashTexto('sistrafa:' + campo.value);
    if (h === Aplicativo.perfil.pinHash) { Aplicativo.desbloqueado = true; location.hash = '#/inicio'; }
    else { campo.value = ''; marcarErroCampo(campo, 'PIN incorreto. Tente de novo.'); campo.focus(); }
  }
  if (f.id === 'form-contato') {
    ev.preventDefault();
    const d = dadosFormulario(f);
    if (!d.nome.trim()) { marcarErroCampo(f.elements.nome, 'Informe o nome da instituição ou contato.'); f.elements.nome.focus(); return; }
    Contatos.salvar(Object.assign(Aplicativo.contatoEmEdicao, d));
    notificar('Contato salvo'); location.hash = '#/contatos';
  }
});

document.addEventListener('keydown', ev => { if (ev.key === 'Escape') fecharModal(); });

/* ---------- Condições de campo ---------- */

/* sem internet: o app continua funcionando; só o conteúdo on-line do guia fica indisponível */
function atualizarConexao() {
  let el = document.getElementById('estado-conexao');
  if (!el) {
    el = document.createElement('div');
    el.id = 'estado-conexao'; el.className = 'estado-conexao'; el.setAttribute('role', 'status');
    el.textContent = 'Sem internet · o app funciona normalmente; só o guia on-line fica indisponível';
    document.body.appendChild(el);
  }
  const offline = navigator.onLine === false;
  el.hidden = !offline;
  document.documentElement.classList.toggle('sem-internet', offline);
}

/* teclado aberto (celular): esconde as barras fixas para não cobrirem o campo em edição */
const ehTextoEditavel = el => el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
  (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color'].includes(el.type)));
const toqueGrosso = matchMedia('(pointer: coarse)');
document.addEventListener('focusin', ev => { if (toqueGrosso.matches && ehTextoEditavel(ev.target)) document.documentElement.classList.add('digitando'); });
document.addEventListener('focusout', () => {
  setTimeout(() => { if (!ehTextoEditavel(document.activeElement)) document.documentElement.classList.remove('digitando'); }, 60);
});

/* ao sair do app ou trocar de aba, grava qualquer edição que ainda esperava o atraso */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { gravarPendente(); Cronologia.pausar('aplicativo em segundo plano ou fechado'); }
  else Cronologia.aoVoltar();
});
window.addEventListener('pagehide', gravarPendente);

/* ---------- Inicialização ---------- */
window.addEventListener('hashchange', () => {
  fecharModal(true);
  gravarPendente();
  Cronologia.aoNavegar(location.hash);
  document.documentElement.classList.remove('digitando');
  Aplicativo.desenhar().then(() => { window.scrollTo(0, 0); Aplicativo.focarTitulo(); });
});
window.addEventListener('online', atualizarConexao);
window.addEventListener('offline', atualizarConexao);
window.addEventListener('DOMContentLoaded', () => {
  Aplicativo.perfil = Perfil.obter();
  Aplicativo.ajustes = Ajustes.obter();
  Aplicativo.aplicarAjustes();
  atualizarConexao();
  // instalado como app (tela cheia), fica sempre na vertical; no navegador comum o pedido é recusado sem efeito
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {}); } catch (e) {}
  Aplicativo.desenhar();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('servico-offline.js').catch(() => {});
});

/* a internet voltou com o guia aberto: busca as fotos que faltam sem precisar trocar de tela */
window.addEventListener('online', () => {
  if (!document.querySelector('[data-foto-especie]') || FaunaOnline.fotoGuia(ESPECIES[0])) return;
  FaunaOnline.carregarFotosGuia().then(() => preencherFotosEspecies()).catch(() => {});
});
