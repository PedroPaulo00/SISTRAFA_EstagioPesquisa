/* SISTRAFA — fluxo da ocorrência */
'use strict';

const ETAPAS = [
  { id: 'abertura', titulo: 'Abertura', desc: 'Dados iniciais da ocorrência. Número, data, hora e responsável são registrados automaticamente.' },
  { id: 'risco', titulo: 'Avaliação de risco', desc: 'Responda uma pergunta por vez. As orientações de segurança aparecem conforme as respostas.' },
  { id: 'contexto', titulo: 'Contexto', desc: 'Informações sobre a situação, a suspeita de crime e a necessidade de atendimento.' },
  { id: 'fotos', titulo: 'Fotos do local', desc: 'Se for seguro, fotografe o local antes de alterar a situação.' },
  { id: 'animais', titulo: 'Animais e lotes', desc: 'Cadastre animais individuais ou lotes por grupo. Não é preciso uma ficha para cada animal de um lote.' },
  { id: 'manejo', titulo: 'Manejo e contenção', desc: 'Orientações para os grupos informados, checklist operacional e acondicionamento.' },
  { id: 'encaminhamento', titulo: 'Encaminhamento', desc: 'Destino dos animais, instituição e dados da entrega.' },
  { id: 'revisao', titulo: 'Revisão e encerramento', desc: 'Confira e corrija as informações antes de encerrar e gerar o relatório.' }
];

const SN = [['sim', 'Sim'], ['nao', 'Não'], ['ns', 'Não sei']];

/* ================= Orientações (motor de regras) ================= */
function lotesComCondicao(ocorr, cond) {
  return ocorr.lotes.filter(l => (l.condicoes || []).includes(cond));
}
function nomeLote(l) {
  return l.rotulo + (l.grupo ? ' (' + (GRUPOS[l.grupo] || GRUPOS.naoid).nome.toLowerCase() + ')' : '');
}
function especiesCatalogo(ocorr) {
  const ids = new Set();
  ocorr.lotes.forEach(l => (l.especies || []).forEach(e => e.id && ids.add(e.id)));
  return ESPECIES.filter(e => ids.has(e.id));
}
function listaTexto(arr) {
  if (arr.length <= 1) return arr.join('');
  return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
}

/* respostas que valem para as regras: a resposta de uma pergunta que deixou de ser exibida
   (porque a resposta que a fazia aparecer foi alterada) é desconsiderada */
function respostasEfetivas(ocorr) {
  const r = Object.assign({}, ocorr.respostas || {});
  PERGUNTAS_RISCO.concat(PERGUNTAS_CONTEXTO).forEach(p => { if (p.quando && !p.quando(r)) delete r[p.id]; });
  return r;
}

const PROBLEMAS_ACONDICIONAMENTO = ['superlotacao', 'ventilacao', 'sol', 'sujeira', 'semAgua', 'semAbrigo'];
/* condições do lote escritas como complemento de "apresenta ..." na justificativa */
const CONDICOES_FRASE = { ferido: 'ferimentos', sangramento: 'sangramento', locomocao: 'dificuldade de locomoção', respiracao: 'dificuldade para respirar',
  debilitado: 'debilidade ou magreza', inconsciente: 'perda de consciência', comportamento: 'comportamento anormal' };

function gerarOrientacoes(ocorr) {
  const r = respostasEfetivas(ocorr);
  const saida = [];
  const incluir = o => { if (!saida.some(x => x.id === o.id)) saida.push(o); };
  const esp = especiesCatalogo(ocorr);
  const lotes = ocorr.lotes || [];
  const grupos = new Set(lotes.map(l => l.grupo).filter(Boolean));
  const opcoesContexto = id => PERGUNTAS_CONTEXTO.find(p => p.id === id).opcoes;

  if (r.riscoImediato === 'sim')
    incluir({ id: 'isolar', tipo: 'seguranca', nivel: 'perigo', titulo: 'Afastar pessoas e isolar o local', texto: 'Antes de qualquer manejo, afaste as pessoas, isole a área e, se necessário, peça uma equipe especializada.', motivo: 'Foi informado risco imediato para pessoas ou outros animais.' });

  const pecResp = r.peconhento === 'sim' || r.peconhento === 'ns';
  const pecEsp = esp.filter(e => e.peconhento).map(e => e.nome);
  const pecLote = lotes.filter(l => (l.riscos || []).includes('peconha')).map(nomeLote);
  if (pecResp || pecEsp.length || pecLote.length) {
    const m = [];
    if (r.peconhento === 'sim') m.push('foi informado que o animal é peçonhento');
    if (r.peconhento === 'ns') m.push('não se sabe se o animal é peçonhento');
    if (pecEsp.length) m.push('a espécie informada (' + listaTexto(pecEsp) + ') é peçonhenta');
    if (pecLote.length) m.push('há risco de envenenamento em ' + listaTexto(pecLote));
    incluir({ id: 'peconha', tipo: 'seguranca', nivel: 'perigo', titulo: 'Conduta para animal peçonhento', texto: 'Mantenha 2 metros de distância e não use as mãos. A contenção só deve ser feita por pessoa capacitada, com gancho ou pinção. Transporte em caixa rígida, vedada, trancada e identificada como "animal perigoso", que só deve ser aberta em local seguro, por pessoal especializado.', motivo: m.join('; ') + '.' });
  }

  if (r.grandePorte === 'sim' || lotes.some(l => l.grupo === 'mamiferos' && (l.especies || []).some(e => ['onca-parda', 'capivara'].includes(e.id))) || esp.some(e => e.id === 'jacare'))
    incluir({ id: 'especializada', tipo: 'seguranca', nivel: 'perigo', titulo: 'Contenção especializada', texto: 'Animal de grande porte. Isole a área e acione uma equipe com equipamento e, se necessário, um médico-veterinário.', motivo: r.grandePorte === 'sim' ? 'Foi informado que o animal é de grande porte ou exige contenção especializada.' : 'A espécie informada é de grande porte.' });

  if (r.manejoSeguro === 'nao' || r.manejoSeguro === 'ns')
    incluir({ id: 'naoManejar', tipo: 'seguranca', nivel: 'perigo', titulo: 'Aguardar apoio especializado', texto: 'Não realize o manejo. Mantenha o isolamento e acompanhe o animal à distância até a chegada do apoio.', motivo: r.manejoSeguro === 'nao' ? 'Foi informado que a equipe presente não consegue manejar o animal com segurança.' : 'Não há certeza de que a equipe consegue manejar o animal com segurança.' });

  const riscosFisicos = ['mordida', 'bicada', 'arranhadura', 'coice'];
  const lotesAgressao = lotes.filter(l => (l.riscos || []).some(x => riscosFisicos.includes(x)) || (l.comportamentos || []).includes('agressividade'));
  if (r.agressivo === 'sim' || lotesAgressao.length) {
    const m = [];
    if (r.agressivo === 'sim') m.push('foi informado risco de mordida, bicada, arranhadura ou coice');
    if (lotesAgressao.length) m.push('há risco de agressão em ' + listaTexto(lotesAgressao.map(nomeLote)));
    incluir({ id: 'epi', tipo: 'seguranca', nivel: 'atencao', titulo: 'Usar EPI e equipamento', texto: 'Use luvas de couro ou raspa, óculos ou viseira e equipamento de contenção (rede, puçá, cambão, caixa). Não encurrale o animal. A lista de EPI por situação está no guia, em "Protocolo de atuação".', motivo: m.join('; ').replace(/^./, c => c.toUpperCase()) + '.' });
  }

  if (r.transito === 'sim')
    incluir({ id: 'via', tipo: 'seguranca', nivel: 'atencao', titulo: 'Sinalizar a via', texto: 'Sinalize com cones ou viatura e use colete refletivo antes de se aproximar.', motivo: 'Foi informado que o animal está em via, com risco para o trânsito.' });

  // condições em que os animais são mantidos (protocolo: avaliação inicial e registro)
  const problemas = (r.condicoesLocal || []).filter(c => PROBLEMAS_ACONDICIONAMENTO.includes(c));
  if (problemas.length) {
    const sensiveis = ['repteis', 'anfibios'].filter(g => grupos.has(g));
    incluir({ id: 'acondicionamento', tipo: 'seguranca', nivel: 'atencao', titulo: 'Melhorar as condições dos animais', texto: 'Fotografe as condições antes de alterá-las, porque podem caracterizar maus-tratos. Em seguida, tire os animais do sol, melhore a ventilação e desfaça a superlotação, sem soltá-los.' + (sensiveis.length && problemas.includes('sol') ? ' Répteis e anfíbios são muito sensíveis ao calor.' : ''),
      motivo: 'Foi informado: ' + rotulosDe(opcoesContexto('condicoesLocal'), problemas).toLowerCase() + '.' });
  }

  // risco biológico: fezes acumuladas, carcaças e espécies com risco de zoonose
  const temMorto = r.vivo === 'morto' || r.vivo === 'ambos' || lotes.some(l => l.estado === 'morto' || l.estado === 'ambos' || (l.condicoes || []).includes('morto'));
  const zoon = esp.filter(e => ['morcego', 'sagui'].includes(e.id)).map(e => e.nome);
  const zoonLote = lotes.filter(l => (l.riscos || []).includes('zoonose')).map(nomeLote);
  if ((r.condicoesLocal || []).includes('sujeira') || temMorto || zoon.length || zoonLote.length) {
    const m = [];
    if ((r.condicoesLocal || []).includes('sujeira')) m.push('há fezes acumuladas ou cheiro de amônia');
    if (temMorto) m.push('há animal morto');
    if (zoon.length || zoonLote.length) m.push('há risco de zoonose (' + listaTexto(zoon.concat(zoonLote)) + ')');
    incluir({ id: 'biologico', tipo: 'seguranca', nivel: 'atencao', titulo: 'Proteção contra risco biológico', texto: 'Use luvas de nitrilo descartáveis (por baixo ou por cima das luvas de proteção) e, em ambiente com fezes acumuladas, amônia ou poeira, máscara P2 ou equivalente. Lave as mãos ao terminar.', motivo: m.join('; ').replace(/^./, c => c.toUpperCase()) + '.' });
  }

  // Atendimento veterinário
  const condVet = ['ferido', 'sangramento', 'locomocao', 'respiracao', 'inconsciente', 'debilitado', 'comportamento'];
  const lotesVet = lotes.filter(l => (l.condicoes || []).some(c => condVet.includes(c)) || (l.comportamentos || []).includes('apatia'));
  if (r.vetUrgente === 'sim' || r.feridos === 'sim' || lotesVet.length) {
    const partes = lotesVet.map(l => nomeLote(l) + ' apresenta ' + listaTexto((l.condicoes || []).filter(c => condVet.includes(c)).map(c => CONDICOES_FRASE[c])
      .concat((l.comportamentos || []).includes('apatia') ? ['apatia ou prostração'] : [])));
    if (r.vetUrgente === 'sim') partes.unshift('foi informada necessidade de atendimento veterinário urgente');
    else if (r.feridos === 'sim' && !partes.length) partes.unshift('foi informado que há animal ferido, debilitado ou com comportamento anormal');
    incluir({ id: 'vet', tipo: 'destino', nivel: r.vetUrgente === 'sim' || lotesVet.some(l => ['sangramento', 'inconsciente', 'respiracao'].some(c => (l.condicoes || []).includes(c))) ? 'perigo' : 'atencao',
      titulo: 'Atendimento veterinário prioritário', texto: 'Reduza a manipulação ao mínimo e encaminhe o animal com prioridade para atendimento veterinário (CETRAS ou clínica parceira).', motivo: partes.join('; ').replace(/^./, c => c.toUpperCase()) + '.' });
  }

  if (r.crime === 'sim') {
    const tipos = rotulosDe(opcoesContexto('tiposCrime'), r.tiposCrime);
    incluir({ id: 'crime', tipo: 'seguranca', nivel: 'atencao', titulo: 'Documentar e preservar vestígios', texto: 'Fotografe o local e os objetos antes de alterá-los, registre anilhas e documentos e evite manusear vestígios sem luvas. Não manipule os animais apenas para fotografar. Use o checklist fotográfico.', motivo: 'Foi informada suspeita de crime ambiental' + (tipos ? ' (' + tipos.toLowerCase() + ')' : '') + '.' });
  }

  // apreensão, cativeiro ou transporte ilegal: sem soltura imediata e com destino em instituição habilitada
  const motivosSemSoltura = [];
  if (r.crime === 'sim') motivosSemSoltura.push('há suspeita de crime ambiental e os animais podem ser objeto de investigação');
  if (ocorr.motivo === 'apreensao') motivosSemSoltura.push('o atendimento é uma apreensão');
  if (['cativeiro', 'transporte'].includes(r.situacao)) motivosSemSoltura.push('os animais estavam ' + (r.situacao === 'cativeiro' ? 'mantidos em cativeiro' : 'sendo transportados'));
  if (motivosSemSoltura.length)
    incluir({ id: 'semSoltura', tipo: 'destino', nivel: 'atencao', titulo: 'Não realizar soltura imediata', texto: 'Encaminhe os animais a uma instituição habilitada (CETAS, CETRAS ou órgão ambiental) e avise o destino antes do transporte. Não deixe os animais sob a guarda de particulares ou de agentes: a destinação final é decidida pelo órgão ambiental, após avaliação técnica.', motivo: motivosSemSoltura.join('; ').replace(/^./, c => c.toUpperCase()) + '.' });

  if (r.filhotes === 'sim' || lotesComCondicao(ocorr, 'filhotes').length)
    incluir({ id: 'filhotes', tipo: 'seguranca', nivel: 'info', titulo: 'Cuidados com filhotes', texto: 'Mantenha os filhotes aquecidos, em local escuro e silencioso, e transporte-os separados dos adultos. Não ofereça alimento. Filhotes sozinhos podem estar sob cuidado dos pais por perto.', motivo: 'Foi informada a presença de filhotes ou animais dependentes.' });

  if (temMorto)
    incluir({ id: 'morto', tipo: 'seguranca', nivel: 'info', titulo: 'Animal morto', texto: 'Manuseie a carcaça somente com luvas. Se houver suspeita de crime, fotografe antes de mover.', motivo: 'Foi informado animal morto na ocorrência.' });

  if (esp.some(e => e.id === 'bugio') && temMorto)
    incluir({ id: 'bugio', tipo: 'destino', nivel: 'atencao', titulo: 'Notificar a vigilância em saúde', texto: 'Primatas mortos devem ser notificados à vigilância em saúde do município (vigilância da febre amarela).', motivo: 'Foi informado bugio na ocorrência e há animal morto.' });

  if (zoon.length || zoonLote.length)
    incluir({ id: 'zoonose', tipo: 'seguranca', nivel: 'atencao', titulo: 'Risco de zoonose', texto: 'Não toque no animal sem luvas. Em caso de mordida ou arranhadura, lave com água e sabão e procure atendimento de saúde (risco de raiva). A vacinação da equipe deve estar em dia, com destaque para raiva, tétano e febre amarela.', motivo: 'Foi informado ' + listaTexto(zoon.concat(zoonLote)) + ', com risco de transmissão de doenças.' });

  if (esp.some(e => e.id === 'sagui'))
    incluir({ id: 'exotica', tipo: 'destino', nivel: 'info', titulo: 'Espécie exótica: não soltar', texto: 'O sagui-de-tufo-preto é exótico no Paraná. Não realize soltura. Encaminhe ao CETRAS ou ao órgão ambiental.', motivo: 'Foi informada espécie exótica invasora.' });

  const naoId = lotes.filter(l => l.grupo === 'naoid' || (l.especies || []).some(e => e.naoIdentificada) || !(l.especies || []).length);
  if (naoId.length)
    incluir({ id: 'naoid', tipo: 'seguranca', nivel: 'info', titulo: 'Identificação provisória', texto: 'Adote a conduta mais cautelosa para o grupo, fotografe de vários ângulos e consulte um especialista. Só confirme a espécie se tiver certeza.', motivo: 'A espécie não foi identificada em ' + listaTexto(naoId.map(nomeLote)) + '.' });

  if (ocorr.manejo && ocorr.manejo.acondicionamento === 'saco' && grupos.has('anfibios'))
    incluir({ id: 'sacoAnfibio', tipo: 'seguranca', nivel: 'atencao', titulo: 'Troque o saco de pano', texto: 'O saco de pano absorve a umidade da pele e desidrata anfíbios. Use recipiente plástico com tampa ventilada e umidade (água do local, musgo ou papel-toalha molhado).', motivo: 'Foi informado acondicionamento em saco de pano e há anfíbios na ocorrência.' });

  // transporte (protocolo: critérios de distribuição dos animais e monitoramento no trajeto)
  const vivos = lotes.filter(l => l.estado !== 'morto');
  const qtdVivos = vivos.reduce((s, l) => s + totalLote(l), 0);
  if (qtdVivos > 1) {
    const varios = new Set(vivos.map(l => l.grupo).filter(g => g && g !== 'naoid')).size > 1;
    incluir({ id: 'transporte', tipo: 'destino', nivel: 'info', titulo: 'Organizar o transporte', texto: 'Separe os animais por espécie, porte e condição clínica (debilitados e filhotes à parte, predadores longe de presas) e não superlote as caixas. Fixe as caixas no veículo, longe do sol e de correntes de ar, e verifique os animais durante o trajeto.',
      motivo: `Há ${qtdVivos} animais vivos cadastrados${varios ? ', de grupos diferentes' : ''}.` });
  }
  const graves = ((ocorr.encaminhamento || {}).monitoramento || []).filter(v => (v.sinais || []).some(s => SINAIS_TRANSPORTE_GRAVES.includes(s)));
  if (graves.length) {
    const ultima = graves[graves.length - 1];
    incluir({ id: 'transporteAlerta', tipo: 'destino', nivel: 'perigo', titulo: 'Piora durante o transporte', texto: 'Avise a instituição de destino e priorize o atendimento veterinário. Mantenha a caixa ventilada, à sombra e com o mínimo de estímulos.',
      motivo: `Na verificação das ${formatarHora(ultima.ts)} foi registrado: ${rotulosDe(SINAIS_TRANSPORTE, ultima.sinais.filter(s => SINAIS_TRANSPORTE_GRAVES.includes(s))).toLowerCase()}.` });
  }

  // Soltura no local (somente quando não há impedimentos)
  const saudaveis = lotes.length > 0 && lotes.every(l => (l.condicoes || []).length && l.condicoes.every(c => c === 'saudavel' || c === 'anilhado') && !['cativeiro', 'transporte'].includes(l.situacao));
  if (saudaveis && !motivosSemSoltura.length && !esp.some(e => e.id === 'sagui') && !naoId.length)
    incluir({ id: 'soltura', tipo: 'destino', nivel: 'ok', titulo: 'Avaliar soltura no local', texto: 'A soltura só deve ser considerada para animal nativo da região, saudável e encontrado livre, fora de situação de apreensão, conforme o protocolo da sua instituição. Na dúvida, encaminhe para avaliação técnica (CETRAS).', motivo: 'Todos os animais foram informados como aparentemente saudáveis, sem suspeita de crime, sem apreensão e sem cativeiro.' });

  if (!saida.length)
    incluir({ id: 'semRisco', tipo: 'seguranca', nivel: 'ok', titulo: 'Nenhum risco crítico informado até agora', texto: 'Siga as orientações gerais e fique atento ao comportamento do animal.', motivo: 'Nenhuma resposta indicou risco elevado.' });

  const ordem = { perigo: 0, atencao: 1, info: 2, ok: 3 };
  return saida.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}

/* ================= Tela da ocorrência ================= */
/* ---------- Horários do atendimento ----------
   Cada etapa registra no histórico quando foi iniciada e concluída, e o atendimento registra
   as pausas (saída da ocorrência, app em segundo plano ou fechado) e as retomadas. */
const nomeEtapa = i => (i + 1) + ' – ' + ((ETAPAS[i] || {}).titulo || '');
const CRONO_ROTULO = { inicio: 'Etapa iniciada', fim: 'Etapa concluída', saida: 'Saída da etapa', retorno: 'Etapa reaberta', pausa: 'Atendimento pausado', retomada: 'Atendimento retomado' };
const Cronologia = {
  atual: null,   // { id, etapa, pausado } da ocorrência aberta nesta sessão do app
  _marca(ocorr, tipo, etapa, extra) {
    const item = Ocorrencias.registrar(ocorr, CRONO_ROTULO[tipo], nomeEtapa(etapa) + (extra ? ' — ' + extra : ''));
    item.crono = tipo; item.etapa = etapa;
  },
  _ultimo: ocorr => (ocorr.log || []).filter(x => x.crono).pop() || null,
  /* chamado ao exibir uma etapa (as telas são redesenhadas a cada alteração: só registra mudanças) */
  entrar(ocorr, etapa) {
    const a = this.atual;
    if (a && a.id === ocorr.id && a.etapa === etapa && !a.pausado) return;
    if (a && a.id === ocorr.id && !a.pausado) this._marca(ocorr, etapa > a.etapa ? 'fim' : 'saida', a.etapa);
    const ultimo = this._ultimo(ocorr);
    const jaIniciada = (ocorr.log || []).some(x => x.crono === 'inicio' && x.etapa === etapa);
    const vemDeFora = !a || a.id !== ocorr.id || a.pausado;
    if (ultimo && vemDeFora) this._marca(ocorr, 'retomada', etapa, ultimo.crono === 'pausa' ? '' : 'o app foi fechado sem registrar a pausa');
    if (!jaIniciada) this._marca(ocorr, 'inicio', etapa);
    else if (!vemDeFora) this._marca(ocorr, 'retorno', etapa);
    this.atual = { id: ocorr.id, etapa, pausado: false };
    Ocorrencias.salvar(ocorr);
  },
  _ocorrAtual() {
    const a = this.atual, c = Aplicativo.contexto && Aplicativo.contexto.ocorr;
    return a ? (c && c.id === a.id ? c : Ocorrencias.obter(a.id)) : null;
  },
  pausar(motivo) {
    const a = this.atual;
    if (!a || a.pausado) return;
    const ocorr = this._ocorrAtual();
    if (!ocorr || ocorr.status !== 'andamento') { this.atual = null; return; }
    this._marca(ocorr, 'pausa', a.etapa, motivo);
    Ocorrencias.salvar(ocorr);
    a.pausado = true;
  },
  /* troca de tela: sair das telas da ocorrência conta como pausa */
  aoNavegar(hash) {
    const a = this.atual;
    if (a && !a.pausado && !(hash || '').startsWith('#/ocorrencia/' + a.id)) this.pausar('saiu da ocorrência');
  },
  /* app voltou ao primeiro plano com a ocorrência na tela */
  aoVoltar() {
    const a = this.atual;
    if (!a || !a.pausado || !location.hash.startsWith('#/ocorrencia/' + a.id)) return;
    const ocorr = this._ocorrAtual();
    if (ocorr && ocorr.status === 'andamento') this.entrar(ocorr, a.etapa);
  },
  /* encerramento: conclui a etapa em andamento */
  concluir(ocorr) {
    const a = this.atual;
    if (a && a.id === ocorr.id && !a.pausado) this._marca(ocorr, 'fim', a.etapa);
    this.atual = null;
  }
};

function formatarDuracao(ms) {
  const min = Math.round(Math.max(0, ms) / 60000);
  if (min < 1) return '< 1 min';
  if (min < 60) return min + ' min';
  return Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0') + ' min';
}
/* hora curta; inclui a data quando o atendimento passou de um dia para outro */
function horarioCurto(ts, ref) {
  if (!ts) return '—';
  return formatarData(ts) === formatarData(ref) ? formatarHora(ts) : formatarData(ts).slice(0, 5) + ' ' + formatarHora(ts);
}
/* tempos por etapa a partir do histórico: início, conclusão e tempo de tela (sem as pausas) */
function resumoTempos(ocorr) {
  const etapas = {}, abrir = ['inicio', 'retomada', 'retorno'], fechar = ['fim', 'saida', 'pausa'];
  const et = i => etapas[i] = etapas[i] || { etapa: i, inicio: null, fim: null, ms: 0 };
  let aberto = null, pausaDesde = null, pausas = 0, msPausa = 0;
  const soma = ate => { if (aberto) et(aberto.etapa).ms += new Date(ate) - new Date(aberto.ts); };
  (ocorr.log || []).filter(x => x.crono).forEach(x => {
    if (abrir.includes(x.crono)) {
      if (x.crono === 'retomada' && pausaDesde) { msPausa += new Date(x.ts) - new Date(pausaDesde); pausaDesde = null; }
      if (!aberto || aberto.etapa !== x.etapa) { soma(x.ts); aberto = { etapa: x.etapa, ts: x.ts }; }
      if (x.crono === 'inicio' && !et(x.etapa).inicio) et(x.etapa).inicio = x.ts;
    } else if (fechar.includes(x.crono)) {
      soma(x.ts); aberto = null;
      if (x.crono === 'fim') et(x.etapa).fim = x.ts;
      if (x.crono === 'pausa') { pausas++; pausaDesde = x.ts; }
    }
  });
  const agora = new Date().toISOString();
  if (aberto && ocorr.status === 'andamento') soma(agora);
  const fimGeral = ocorr.encerradaEm || agora;
  return { etapas: Object.values(etapas).sort((a, b) => a.etapa - b.etapa), pausas, msPausa,
    total: new Date(fimGeral) - new Date(ocorr.criadaEm), emAndamento: !ocorr.encerradaEm };
}
/* linhas [rótulo, valor] usadas na revisão e nos relatórios */
function linhasTempos(ocorr) {
  const t = resumoTempos(ocorr);
  if (!t.etapas.length) return [['Duração total', formatarDuracao(t.total) + (t.emAndamento ? ' (em andamento)' : '')],
    ['Horários por etapa', 'Não registrados (ocorrência aberta em versão anterior do aplicativo)']];
  return t.etapas.map(e => [nomeEtapa(e.etapa), horarioCurto(e.inicio, ocorr.criadaEm) + ' → ' + (e.fim ? horarioCurto(e.fim, ocorr.criadaEm) : 'não concluída') + ' · ' + formatarDuracao(e.ms)])
    .concat([['Duração total', formatarDuracao(t.total) + (t.emAndamento ? ' (em andamento)' : '')],
      ['Pausas', t.pausas ? plural(t.pausas, 'pausa', 'pausas') + ', ' + formatarDuracao(t.msPausa) + ' no total' : 'Nenhuma']]);
}

function telaOcorrencia(id, etapa) {
  const ocorr = Ocorrencias.obter(id);
  if (!ocorr) return telaNaoEncontrada();
  if (ocorr.status === 'encerrada') { location.hash = '#/relatorio/' + ocorr.id; return ''; }
  etapa = etapa == null || isNaN(etapa) ? ocorr.etapa || 0 : Math.max(0, Math.min(ETAPAS.length - 1, etapa));
  if (ocorr.etapa !== etapa) { ocorr.etapa = etapa; Ocorrencias.salvar(ocorr); }
  Cronologia.entrar(ocorr, etapa);
  Aplicativo.contexto = { ocorr, lote: null };
  const E = ETAPAS[etapa];
  const corpo = [etapaAbertura, etapaRisco, etapaContexto, etapaFotos, etapaAnimais, etapaManejo, etapaEncaminhamento, etapaRevisao][etapa](ocorr);
  const ultima = etapa === ETAPAS.length - 1;

  return `<main class="tela sem-navegacao">
    <header class="assistente-cab">
      <div class="topo">
        <a class="botao botao-icone" href="#/inicio" aria-label="Voltar ao início (a ocorrência fica salva)">${icone('casa')}</a>
        <h1>Ocorrência<span class="sub">${escaparHtml(ocorr.numero)}</span></h1>
        <a class="botao botao-icone botao-perigo" href="#/risco" aria-label="Guia rápido de situações de risco">${icone('alerta')}</a>
      </div>
      <div class="etapas" role="progressbar" aria-valuemin="1" aria-valuemax="${ETAPAS.length}" aria-valuenow="${etapa + 1}" aria-valuetext="Etapa ${etapa + 1} de ${ETAPAS.length}: ${escaparHtml(E.titulo)}">
        ${ETAPAS.map((_, i) => `<i class="${i < etapa ? 'feita' : i === etapa ? 'atual' : ''}"></i>`).join('')}
      </div>
      <div class="etapa-info"><span>Etapa ${etapa + 1} de ${ETAPAS.length}</span>${estadoSalvoHtml(ocorr)}</div>
    </header>
    <h2 class="etapa-nome">${escaparHtml(E.titulo)}</h2>
    <p class="etapa-desc">${escaparHtml(E.desc)}</p>
    ${corpo}
  </main>
  <nav class="rodape-assistente vidro" aria-label="Navegação entre etapas">
    <button class="botao" data-acao="etapa-ir" data-etapa="${etapa - 1}" ${etapa === 0 ? 'disabled' : ''}>${icone('esquerda')} Voltar</button>
    ${ultima
      ? `<button class="botao botao-primario" data-acao="encerrar">${icone('certo')} Encerrar</button>`
      : `<button class="botao botao-primario" data-acao="etapa-ir" data-etapa="${etapa + 1}">Próximo ${icone('direita')}</button>`}
  </nav>`;
}

/* indicador de gravação: mostra o que realmente aconteceu com o último salvamento */
function estadoSalvoHtml(ocorr) {
  const quando = ocorr.atualizadaEm ? formatarHora(ocorr.atualizadaEm) : '';
  return `<span id="estado-salvo" class="estado-salvo" role="status" aria-live="polite">Salvo no aparelho${quando ? ' às ' + quando : ''}</span>`;
}
function atualizarEstadoSalvo(estado, ocorr) {
  const el = document.getElementById('estado-salvo');
  if (!el) return;
  el.classList.remove('salvando', 'erro');
  if (estado === 'salvando') { el.classList.add('salvando'); el.textContent = 'Salvando…'; }
  else if (estado === 'erro') { el.classList.add('erro'); el.textContent = 'Erro: não foi salvo'; }
  else el.textContent = 'Salvo no aparelho às ' + formatarHora((ocorr && ocorr.atualizadaEm) || new Date().toISOString());
}

/* ---------- Etapa 1: Abertura ---------- */
function etapaAbertura(ocorr) {
  const u = ocorr.usuario || {};
  const L = ocorr.local;
  return `<section class="cartao vidro">
      <div class="rev-linha"><span>Número</span><span>${escaparHtml(ocorr.numero)}</span></div>
      <div class="rev-linha"><span>Abertura</span><span>${formatarDataHora(ocorr.criadaEm)}</span></div>
      <div class="rev-linha"><span>Responsável</span><span>${escaparHtml(u.nome)}${u.cargo ? ' — ' + escaparHtml(u.cargo) : ''}</span></div>
      <div class="rev-linha"><span>Instituição</span><span>${escaparHtml(u.instituicao || '—')}</span></div>
    </section>
    <section class="cartao vidro">
      <h3>Local da ocorrência</h3>
      ${L.lat != null
        ? `<div class="aviso ok">${icone('marcador')}<div><strong>Localização registrada</strong><p>${L.lat.toFixed(6)}, ${L.lng.toFixed(6)} (precisão ±${L.precisao} m)</p></div></div>
           <button class="botao botao-linha botao-bloco" data-acao="gps">${icone('marcador')} Atualizar localização</button>`
        : `<button class="botao botao-primario botao-bloco" data-acao="gps">${icone('marcador')} Registrar localização (GPS)</button>
           <p class="dica suave pequeno mt-2">Opcional. A localização só é registrada com sua autorização.</p>`}
      <div class="campo mt-4"><label for="f-end">Endereço ou descrição do local</label>
        <input id="f-end" class="entrada" data-campo="local.endereco" value="${escaparHtml(L.endereco)}" placeholder="Rua, bairro, cidade ou km da rodovia" autocomplete="street-address"></div>
      <div class="campo"><label for="f-ref">Ponto de referência</label>
        <input id="f-ref" class="entrada" data-campo="local.referencia" value="${escaparHtml(L.referencia)}" placeholder="Opcional"></div>
    </section>
    <section class="cartao vidro">
      <div class="campo"><span class="rotulo">Tipo de ambiente</span>${fichasHtml(AMBIENTES, ocorr.ambiente, 'data-acao="definir" data-campo="ambiente"')}</div>
      <div class="campo"><span class="rotulo">Motivo do atendimento</span>${fichasHtml(MOTIVOS, ocorr.motivo, 'data-acao="definir" data-campo="motivo"')}</div>
      ${ocorr.motivo === 'outro' ? `<div class="campo"><label for="f-mot">Descreva o motivo</label><input id="f-mot" class="entrada" data-campo="motivoOutro" value="${escaparHtml(ocorr.motivoOutro)}"></div>` : ''}
    </section>
    <button class="botao botao-bloco botao-discreto botao-excluir" data-acao="ocorrencia-descartar" data-id="${ocorr.id}">${icone('lixeira')} Abriu sem querer? Excluir esta ocorrência</button>`;
}

/* ---------- Questionário (uma pergunta por vez) ---------- */
function respostaTexto(p, v) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
  if (p.tipo === 'sn') return rotuloDe(SN, v);
  if (p.tipo === 'escolha') return rotuloDe(p.opcoes, v);
  if (p.tipo === 'multi') return rotulosDe(p.opcoes, v);
  return String(v);
}

function questionario(ocorr, perguntas, chave) {
  const r = ocorr.respostas;
  const vis = perguntas.filter(p => !p.quando || p.quando(r));
  const k = ocorr.id + chave;
  let idx = Aplicativo.indicePergunta[k];
  if (idx == null) { idx = vis.findIndex(p => respostaTexto(p, r[p.id]) === ''); if (idx < 0) idx = vis.length; }
  idx = Math.max(0, Math.min(vis.length, idx));
  Aplicativo.indicePergunta[k] = idx;

  // pontos: alvo de toque de 44 px; o número (ou ✓) fica num círculo menor
  const pontos = `<nav class="pontos" aria-label="Perguntas desta etapa">` + vis.map((p, i) => {
    const respondida = !!respostaTexto(p, r[p.id]);
    return `<button class="${i === idx ? 'atual' : respondida ? 'ok' : ''}" data-acao="pergunta-ir" data-chave="${chave}" data-i="${i}" ${i === idx ? 'aria-current="step"' : ''} aria-label="Pergunta ${i + 1}${respondida ? ', respondida' : ', sem resposta'}"><span class="ponto">${i + 1}</span></button>`;
  }).join('') +
    `<button class="${idx === vis.length ? 'atual' : ''}" data-acao="pergunta-ir" data-chave="${chave}" data-i="${vis.length}" ${idx === vis.length ? 'aria-current="step"' : ''} aria-label="Resumo das respostas"><span class="ponto">${icone('certo')}</span></button></nav>`;

  if (idx === vis.length) {
    const avisos = vis.map(p => p.orientacao && p.orientacao[r[p.id]]).filter(Boolean);
    return pontos + `<section class="cartao vidro">
      <h3>Respostas desta etapa</h3>
      <ul class="resumo-respostas">${vis.map((p, i) => {
        const resposta = respostaTexto(p, r[p.id]);
        return `<li><button class="resumo-item" data-acao="pergunta-ir" data-chave="${chave}" data-i="${i}" aria-label="${escaparHtml(p.texto)} Resposta: ${escaparHtml(resposta || 'sem resposta')}. Toque para alterar.">
          <span class="resumo-pergunta">${escaparHtml(p.texto)}</span>
          <span class="resumo-resposta${resposta ? '' : ' vazia'}">${resposta ? escaparHtml(resposta) : 'Sem resposta'}</span>
          <span class="resumo-alterar">${resposta ? 'Alterar' : 'Responder'}${icone('direita')}</span></button></li>`;
      }).join('')}</ul>
    </section>
    ${avisos.length ? '<h3 class="titulo-secao">Orientações</h3>' + avisos.map(avisoHtml).join('') : ''}`;
  }

  const p = vis[idx];
  const v = r[p.id];
  const orient = p.orientacao && p.orientacao[v];
  let resp = '';
  if (p.tipo === 'sn') {
    resp = `<div class="resp-sn" role="group">${SN.map(([val, rot]) => `<button class="botao" aria-pressed="${v === val}" data-acao="resp" data-chave="${chave}" data-q="${p.id}" data-valor="${val}">${rot}</button>`).join('')}</div>`;
  } else if (p.tipo === 'escolha') {
    resp = `<div class="resp-escolha" role="group">${p.opcoes.map(([val, rot]) => `<button class="botao" aria-pressed="${v === val}" data-acao="resp" data-chave="${chave}" data-q="${p.id}" data-valor="${val}">${escaparHtml(rot)}</button>`).join('')}</div>`;
  } else if (p.tipo === 'multi') {
    resp = `<p class="suave pequeno">Marque todas que se aplicam.</p>` + fichasHtml(p.opcoes, v || [], `data-acao="alternar" data-campo="respostas.${p.id}" data-exclusivo="nenhum"`, true);
  } else if (p.tipo === 'numero') {
    resp = `<div class="contador-num grande">
      <button data-acao="numero" data-campo="respostas.${p.id}" data-delta="-1" aria-label="Diminuir">−</button>
      <input class="entrada" type="number" inputmode="numeric" min="0" data-campo="respostas.${p.id}" value="${escaparHtml(v)}" aria-label="${escaparHtml(p.texto)}">
      <button data-acao="numero" data-campo="respostas.${p.id}" data-delta="1" aria-label="Aumentar">+</button></div>`;
  }

  return pontos + `<section class="cartao vidro pergunta" aria-live="polite">
      <div class="contador">Pergunta ${idx + 1} de ${vis.length}</div>
      <h3>${escaparHtml(p.texto)}</h3>
      ${p.ajuda ? `<p class="ajuda">${escaparHtml(p.ajuda)}</p>` : ''}
      ${resp}
      ${orient ? `<div class="mt-4">${avisoHtml(orient)}</div>` : ''}
      <div class="navegacao-perguntas">
        <button class="botao botao-pequeno" data-acao="pergunta-ir" data-chave="${chave}" data-i="${idx - 1}" ${idx === 0 ? 'disabled' : ''}>${icone('esquerda')} Anterior</button>
        <button class="botao botao-pequeno ${orient || p.tipo === 'multi' || p.tipo === 'numero' ? 'botao-primario' : ''}" data-acao="pergunta-ir" data-chave="${chave}" data-i="${idx + 1}">${respostaTexto(p, v) ? 'Próxima' : 'Pular'} ${icone('direita')}</button>
      </div>
    </section>`;
}

function etapaRisco(ocorr) { return questionario(ocorr, PERGUNTAS_RISCO, 'risco'); }
function etapaContexto(ocorr) { return questionario(ocorr, PERGUNTAS_CONTEXTO, 'contexto'); }

/* ---------- Etapa 4: Fotos do local ---------- */
function etapaFotos(ocorr) {
  const crime = ocorr.respostas.crime === 'sim';
  return `${crime ? avisoHtml({ nivel: 'atencao', titulo: 'Suspeita de crime: checklist fotográfico', texto: 'Antes de mexer em qualquer coisa, fotografe a visão geral, a posição dos animais, as gaiolas, as armadilhas, as anilhas, os documentos e os objetos. Faça fotos gerais e de perto.' }) : ''}
    <section class="cartao vidro">
      <h3>Fotografias do local</h3>
      <p class="suave">Data, hora, usuário, número da ocorrência e localização são registrados automaticamente. A foto original é preservada sem edição.</p>
      ${fotosBloco({ etapa: 'local', vinculo: 'Local', filtro: 'local' })}
      ${crime ? `<h3 class="mt-5">Vestígios e objetos</h3>${fotosBloco({ etapa: 'vestigio', vinculo: 'Vestígio 1', filtro: 'vestigio' })}` : ''}
    </section>
    ${checklistHtml(ocorr, 'fotos')}
    <section class="cartao vidro">
      <h3>Checklist fotográfico</h3>
      <p class="suave pequeno">Marque conforme for registrando ao longo da ocorrência.</p>
      ${FOTOS_RECOMENDADAS.map((t, i) => marcacaoHtml(t, ocorr.fotosChecklist[i], `data-acao="marcar" data-campo="fotosChecklist.${i}"`)).join('')}
    </section>`;
}

/* blocos do checklist operacional exibidos em cada etapa (manejo, fotos ou encaminhamento) */
function checklistHtml(ocorr, etapa) {
  const marcados = ocorr.manejo.checklist;
  return CHECKLIST_OPERACIONAL.filter(c => c.etapa === etapa).map(c => {
    const feitos = c.itens.filter(([k]) => marcados[k]).length;
    return `<section class="cartao vidro">
      <div class="cab"><h3 class="m-0">Checklist: ${escaparHtml(c.titulo.toLowerCase())}</h3><span class="contagem" aria-label="${feitos} de ${c.itens.length} itens marcados">${feitos}/${c.itens.length}</span></div>
      <div class="mt-2">${c.itens.map(([k, t]) => marcacaoHtml(t, marcados[k], `data-acao="marcar" data-campo="manejo.checklist.${k}"`)).join('')}</div>
    </section>`;
  }).join('');
}

/* ---------- Etapa 5: Animais e lotes ---------- */
function totalLote(l) { return (l.especies || []).reduce((s, e) => s + (parseInt(e.qtd, 10) || 0), 0); }
function totalAnimais(ocorr) { return ocorr.lotes.reduce((s, l) => s + totalLote(l), 0); }

function cartaoLoteHtml(ocorr, l) {
  const G = GRUPOS[l.grupo] || GRUPOS.naoid;
  const esp = (l.especies || []).map(e => `${escaparHtml(e.nome)}${e.qtd ? ' (' + escaparHtml(e.qtd) + ')' : ''}${e.provisoria ? ' <span class="etiqueta prov">provisória</span>' : ''}`).join(', ');
  return `<a class="lote-cartao vidro" href="#/ocorrencia/${ocorr.id}/lote/${l.id}">
    <div class="cab"><span class="icone" style="color:${G.cor}" aria-hidden="true">${icone(G.icone)}</span>
      <div><h3>${escaparHtml(l.rotulo)}</h3><small class="suave">${l.tipo === 'individual' ? 'Animal individual' : 'Lote'} · ${escaparHtml(l.grupo ? G.nome : 'Grupo não informado')}</small></div>
      <div class="qtd">${totalLote(l)}<small>${totalLote(l) === 1 ? 'animal' : 'animais'}</small></div></div>
    <p class="lote-especies">${esp || '<span class="pendente">Nenhuma espécie informada</span>'}</p>
    ${(l.condicoes || []).length ? `<div class="etiquetas">${l.condicoes.map(c => `<span class="etiqueta ${['ferido', 'sangramento', 'inconsciente', 'morto'].includes(c) ? 'alto' : c === 'saudavel' ? 'baixo' : 'neutra'}">${escaparHtml(rotuloDe(CONDICOES, c))}</span>`).join('')}</div>` : ''}
  </a>`;
}

function etapaAnimais(ocorr) {
  const total = totalAnimais(ocorr);
  const aprox = parseInt(ocorr.respostas.qtdAprox, 10);
  // sem animais, adicionar é a ação principal da etapa; depois, "Próximo" volta a ser a principal
  const estiloAdicionar = ocorr.lotes.length ? 'botao-linha' : 'botao-primario';
  return `<section class="cartao vidro">
      <strong class="d-bloco">${plural(ocorr.lotes.length, 'registro', 'registros')}</strong>
      <span class="suave">${plural(total, 'animal cadastrado', 'animais cadastrados')}${aprox ? ' · estimativa inicial: ' + aprox : ''}</span>
    </section>
    ${aprox && total && aprox !== total ? avisoHtml({ nivel: 'info', titulo: 'Quantidade diferente da estimativa', texto: `A estimativa inicial era ${aprox} e foram cadastrados ${total}. Confira se todos os animais foram registrados.` }) : ''}
    ${ocorr.lotes.map(l => cartaoLoteHtml(ocorr, l)).join('') || `<div class="vazio vidro cartao">${icone('pata')}<p>Nenhum animal cadastrado ainda. Comece adicionando um animal ou um lote.</p></div>`}
    <div class="linha-btns">
      <button class="botao ${estiloAdicionar}" data-acao="lote-novo" data-tipo="individual">${icone('mais')} Animal individual</button>
      <button class="botao ${estiloAdicionar}" data-acao="lote-novo" data-tipo="lote">${icone('camadas')} Lote (vários)</button>
    </div>
    <p class="nota mt-4">Use <strong>Lote</strong> para vários animais do mesmo grupo (ex.: 30 aves apreendidas). Dentro do lote, você pode destacar apenas os indivíduos que precisam de atenção específica.</p>`;
}

/* ---------- Editor de lote ---------- */
function telaLote(occId, loteId) {
  const ocorr = Ocorrencias.obter(occId);
  if (!ocorr) return telaNaoEncontrada();
  const l = ocorr.lotes.find(x => x.id === loteId);
  if (!l) { location.hash = '#/ocorrencia/' + occId + '/etapa/4'; return ''; }
  Aplicativo.contexto = { ocorr, lote: l };
  const gruposOp = Object.keys(GRUPOS).map(g => `<button type="button" class="opcao-grande" aria-pressed="${l.grupo === g}" data-acao="definir" data-alvo="lote" data-campo="grupo" data-valor="${g}">
      <span style="color:${GRUPOS[g].cor}" aria-hidden="true">${icone(GRUPOS[g].icone)}</span>${escaparHtml(GRUPOS[g].nome)}</button>`).join('');

  const especies = (l.especies || []).map((e, i) => `<div class="especie-linha">
      <div class="texto"><strong>${escaparHtml(e.nome)}</strong>${e.cientifico ? `<br><em>${escaparHtml(e.cientifico)}</em>` : ''}
        <div class="etiquetas"><button type="button" class="ficha ficha-compacta" aria-pressed="${!e.provisoria}" data-acao="esp-confirmar" data-i="${i}">${e.provisoria ? 'Identificação provisória' : 'Identificação confirmada'}</button></div></div>
      <div class="contador-num">
        <button data-acao="numero" data-alvo="lote" data-campo="especies.${i}.qtd" data-delta="-1" aria-label="Diminuir quantidade de ${escaparHtml(e.nome)}">−</button>
        <input class="entrada" type="number" inputmode="numeric" min="0" data-alvo="lote" data-campo="especies.${i}.qtd" value="${escaparHtml(e.qtd)}" aria-label="Quantidade de ${escaparHtml(e.nome)}">
        <button data-acao="numero" data-alvo="lote" data-campo="especies.${i}.qtd" data-delta="1" aria-label="Aumentar quantidade de ${escaparHtml(e.nome)}">+</button>
      </div>
      <button class="botao botao-icone botao-pequeno" data-acao="esp-remover" data-i="${i}" aria-label="Remover ${escaparHtml(e.nome)}">${icone('lixeira')}</button>
    </div>`).join('');

  const individuos = (l.individuos || []).map((ind, i) => `<div class="individuo vidro">
      <div class="linha mb-2">
        <input class="entrada" data-alvo="lote" data-campo="individuos.${i}.rotulo" value="${escaparHtml(ind.rotulo)}" aria-label="Identificação do indivíduo">
        <button class="botao botao-icone" data-acao="ind-remover" data-i="${i}" aria-label="Remover indivíduo">${icone('lixeira')}</button></div>
      <textarea class="entrada" rows="2" data-alvo="lote" data-campo="individuos.${i}.obs" placeholder="Ex.: asa ferida, anilha nº 123, filhote" aria-label="Observação do indivíduo">${escaparHtml(ind.obs)}</textarea>
    </div>`).join('');

  const espGuia = (l.especies || []).map(e => ESPECIES.find(x => x.id === e.id)).filter(Boolean);

  return `<main class="tela sem-navegacao">
    <div class="topo">
      <a class="botao botao-icone" href="#/ocorrencia/${ocorr.id}/etapa/4" aria-label="Voltar para animais e lotes">${icone('esquerda')}</a>
      <h1>${escaparHtml(l.rotulo)}<span class="sub">${escaparHtml(ocorr.numero)}</span></h1>
    </div>

    <section class="cartao vidro">
      <div class="campo"><label for="l-rot">Identificação</label>
        <input id="l-rot" class="entrada" data-alvo="lote" data-campo="rotulo" value="${escaparHtml(l.rotulo)}"></div>
      <div class="campo"><span class="rotulo">Tipo de registro</span>${fichasHtml([['individual', 'Animal individual'], ['lote', 'Lote (vários)']], l.tipo, 'data-acao="definir" data-alvo="lote" data-campo="tipo"', false, true)}</div>
    </section>

    <section class="cartao vidro">
      <h3>Grupo animal</h3>
      <div class="opcoes-grandes" role="group">${gruposOp}</div>
    </section>

    <section class="cartao vidro">
      <div class="cab"><h3>Espécies</h3><span class="contagem" aria-label="Total">${totalLote(l)}</span></div>
      ${especies || '<p class="suave mt-2">Adicione a espécie ou marque "espécie não identificada".</p>'}
      <button class="botao botao-linha botao-bloco mt-3" data-acao="esp-add">${icone('mais')} Adicionar espécie</button>
    </section>

    ${l.grupo ? `<section class="cartao vidro"><h3>Orientações para ${escaparHtml((GRUPOS[l.grupo]).nome.toLowerCase())}</h3>
      <ul class="lista-texto">${ORIENTACOES_GRUPO[l.grupo].map(t => `<li>${escaparHtml(t)}</li>`).join('')}</ul>
      ${espGuia.map(e => `<div class="mt-3">${avisoHtml({ nivel: e.risco === 'alto' ? 'perigo' : e.risco === 'medio' ? 'atencao' : 'info', titulo: e.nome, texto: e.cuidados })}</div>`).join('')}
    </section>` : ''}

    <section class="cartao vidro">
      <div class="campo"><span class="rotulo">Estado</span>${fichasHtml([['vivo', 'Vivo(s)'], ['morto', 'Morto(s)'], ['ambos', 'Vivos e mortos']], l.estado, 'data-acao="definir" data-alvo="lote" data-campo="estado"', false, true)}</div>
      <div class="campo"><span class="rotulo">Como foi encontrado</span>${fichasHtml(SITUACOES, l.situacao, 'data-acao="definir" data-alvo="lote" data-campo="situacao"')}</div>
      <div class="campo"><span class="rotulo">Condição geral</span><p class="dica">Marque todas que se aplicam.</p>${fichasHtml(CONDICOES, l.condicoes, 'data-acao="alternar" data-alvo="lote" data-campo="condicoes"', true)}</div>
      <div class="campo"><span class="rotulo">Comportamento observado</span><p class="dica">Observe à distância, sem manipular o animal.</p>${fichasHtml(COMPORTAMENTOS, l.comportamentos, 'data-acao="alternar" data-alvo="lote" data-campo="comportamentos"', true)}</div>
      <div class="campo"><span class="rotulo">Riscos no manejo</span>${fichasHtml(RISCOS_ANIMAL, l.riscos, 'data-acao="alternar" data-alvo="lote" data-campo="riscos"', true)}</div>
    </section>

    ${l.tipo === 'lote' ? `<section class="cartao vidro">
      <h3>Indivíduos que precisam de atenção</h3>
      <p class="suave pequeno">Destaque apenas animais feridos, debilitados, mortos, filhotes, anilhados ou com característica particular.</p>
      ${individuos}
      <button class="botao botao-linha botao-bloco" data-acao="ind-add">${icone('mais')} Destacar indivíduo</button>
    </section>` : ''}

    <section class="cartao vidro">
      <div class="campo"><label for="l-car">Características observadas</label>
        <p class="dica">Útil principalmente quando a espécie não foi identificada: cor, tamanho, marcas, formato.</p>
        <textarea id="l-car" class="entrada" data-alvo="lote" data-campo="caracteristicas">${escaparHtml(l.caracteristicas)}</textarea></div>
      <div class="campo"><label for="l-obs">Observações</label>
        <textarea id="l-obs" class="entrada" data-alvo="lote" data-campo="obs">${escaparHtml(l.obs)}</textarea></div>
    </section>

    <section class="cartao vidro">
      <h3>Fotos deste ${l.tipo === 'lote' ? 'lote' : 'animal'}</h3>
      ${fotosBloco({ etapa: 'animal', loteId: l.id, vinculo: l.rotulo, filtroLote: l.id })}
    </section>

    <button class="botao botao-bloco botao-excluir" data-acao="lote-excluir">${icone('lixeira')} Excluir este registro</button>
  </main>
  <nav class="rodape-assistente vidro"><a class="botao botao-primario" href="#/ocorrencia/${ocorr.id}/etapa/4">${icone('certo')} Concluir ${l.tipo === 'lote' ? 'lote' : 'animal'}</a></nav>`;
}

function modalEspecie() {
  const l = Aplicativo.contexto.lote;
  const desenhar = termo => {
    const t = (termo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const lista = ESPECIES.filter(e => (!l.grupo || l.grupo === 'naoid' || e.grupo === l.grupo))
      .filter(e => !t || (e.nome + ' ' + e.cientifico).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t));
    return lista.map(e => `<button class="item vidro" data-esp="${e.id}">${fotoEspecieHtml(e)}
      <span class="texto"><strong>${escaparHtml(e.nome)}</strong><small><em>${escaparHtml(e.cientifico)}</em></small></span>${etiquetaRisco(e.risco)}</button>`).join('') ||
      `<p class="suave">Nenhuma espécie encontrada no guia. Use "Informar nome" abaixo.</p>`;
  };
  const m = abrirModal('Adicionar espécie', `
    <button class="botao botao-bloco borda-alerta mb-3" data-nid>${icone('ajuda')} Espécie não identificada</button>
    <div class="busca">${icone('busca')}<input class="entrada" id="esp-busca" placeholder="Buscar nome popular ou científico" aria-label="Buscar espécie"></div>
    <div class="lista" id="esp-lista">${desenhar('')}</div>
    <button class="botao botao-linha botao-bloco mt-3" data-online>${icone('busca')} Buscar na base on-line (iNaturalist)</button>
    <div class="lista mt-3" id="esp-online"></div>
    <div class="campo mt-4"><label for="esp-livre">Ou informe o nome</label>
      <div class="linha"><input class="entrada" id="esp-livre" placeholder="Nome popular informado"><button class="botao botao-primario" data-livre>Adicionar</button></div></div>`);
  const adicionar = e => {
    l.especies = l.especies || [];
    l.especies.push(Object.assign({ qtd: 1, provisoria: true }, e));
    Ocorrencias.registrar(Aplicativo.contexto.ocorr, 'Espécie adicionada', l.rotulo + ': ' + e.nome);
    Ocorrencias.salvar(Aplicativo.contexto.ocorr);
    fecharModal(true); Aplicativo.desenhar();
  };
  m.querySelector('#esp-busca').addEventListener('input', ev => { m.querySelector('#esp-lista').innerHTML = desenhar(ev.target.value); });
  // fotos de referência ajudam a reconhecer o animal; busca uma vez se ainda não estiverem no aparelho
  if (!FaunaOnline.fotoGuia(ESPECIES[0]) && navigator.onLine !== false) FaunaOnline.carregarFotosGuia().then(() => preencherFotosEspecies(m)).catch(() => {});
  let encontrados = [];
  m.addEventListener('click', ev => {
    const b = ev.target.closest('[data-esp]');
    if (b) { const e = ESPECIES.find(x => x.id === b.dataset.esp); if (!l.grupo || l.grupo === 'naoid') l.grupo = e.grupo; adicionar({ id: e.id, nome: e.nome, cientifico: e.cientifico }); }
    if (ev.target.closest('[data-nid]')) adicionar({ nome: 'Espécie não identificada', naoIdentificada: true });
    if (ev.target.closest('[data-livre]')) { const v = m.querySelector('#esp-livre').value.trim(); if (v) adicionar({ nome: v }); else notificar('Digite o nome.', 'aviso'); }
    const bo = ev.target.closest('[data-inat]');
    if (bo) {
      const t = encontrados.find(x => String(x.id) === bo.dataset.inat);
      if (!l.grupo || l.grupo === 'naoid') l.grupo = t.grupo;
      adicionar({ inat: t.id, nome: t.nome, cientifico: t.cientifico });
    }
    if (ev.target.closest('[data-online]')) {
      const termo = m.querySelector('#esp-busca').value.trim();
      const alvoEl = m.querySelector('#esp-online');
      if (termo.length < 3) { notificar('Digite pelo menos 3 letras na busca.', 'aviso'); return; }
      alvoEl.innerHTML = '<p class="carregando">Buscando…</p>';
      FaunaOnline.buscar(termo).then(lista => {
        encontrados = lista.filter(t => !l.grupo || l.grupo === 'naoid' || t.grupo === l.grupo);
        alvoEl.innerHTML = encontrados.map(t => `<button class="item vidro" data-inat="${t.id}">
          ${t.foto ? `<img class="miniatura-especie pequena" src="${escaparHtml(t.foto.mini)}" alt="" referrerpolicy="no-referrer">` : `<span class="icone">${icone(GRUPOS[t.grupo].icone)}</span>`}
          <span class="texto"><strong>${escaparHtml(t.nome)}</strong><small><em>${escaparHtml(t.cientifico)}</em> · iNaturalist</small></span></button>`).join('') ||
          '<p class="suave">Nada encontrado para este grupo.</p>';
      }).catch(e => { alvoEl.innerHTML = `<p class="pendente">${escaparHtml(e.message)}</p>`; });
    }
  });
}

/* ---------- Etapa 6: Manejo ---------- */
function etapaManejo(ocorr) {
  const grupos = [...new Set(ocorr.lotes.map(l => l.grupo || 'naoid'))];
  const esp = especiesCatalogo(ocorr);
  const seg = gerarOrientacoes(ocorr).filter(o => o.tipo === 'seguranca' && o.nivel !== 'ok');
  const M = ocorr.manejo;
  return `${seg.length ? '<h3 class="titulo-secao">Atenção</h3>' + seg.map(avisoHtml).join('') : ''}
    ${grupos.length ? grupos.map(g => `<details class="cartao vidro" ${grupos.length === 1 ? 'open' : ''}>
        <summary>${grupoIcone(g)} Manejo de ${escaparHtml(GRUPOS[g].nome.toLowerCase())}</summary>
        <ul class="lista-texto mt-3">${ORIENTACOES_GRUPO[g].map(t => `<li>${escaparHtml(t)}</li>`).join('')}</ul>
        ${esp.filter(e => e.grupo === g).map(e => `<div class="mt-3">${avisoHtml({ nivel: e.risco === 'alto' ? 'perigo' : e.risco === 'medio' ? 'atencao' : 'info', titulo: e.nome, texto: e.cuidados })}</div>`).join('')}
      </details>`).join('')
      : avisoHtml({ nivel: 'info', titulo: 'Nenhum animal cadastrado', texto: 'Cadastre os animais na etapa anterior para ver as orientações de cada grupo.' })}
    <details class="cartao vidro"><summary>${icone('escudo', 'class="icone-inline"')} EPI recomendados</summary>
      <dl class="dados mt-3">${EPI_RECOMENDADOS.map(([epi, uso]) => `<dt>${escaparHtml(epi)}</dt><dd>${escaparHtml(uso)}</dd>`).join('')}</dl>
      <p class="suave pequeno mb-0">Prefira EPI que protejam sem atrapalhar o uso das mãos, principalmente ao usar ganchos e pinções.</p>
    </details>
    ${checklistHtml(ocorr, 'manejo')}
    <section class="cartao vidro">
      <div class="campo"><span class="rotulo">Acondicionamento / transporte</span>${fichasHtml(ACONDICIONAMENTOS, M.acondicionamento, 'data-acao="definir" data-campo="manejo.acondicionamento"')}</div>
      <div class="campo"><label for="m-ac">Detalhes do acondicionamento</label><input id="m-ac" class="entrada" data-campo="manejo.acondicionamentoObs" value="${escaparHtml(M.acondicionamentoObs)}" placeholder="Ex.: 2 caixas de transporte, aves separadas por espécie"></div>
      <div class="campo"><label for="m-proc">Procedimentos realizados</label><textarea id="m-proc" class="entrada" data-campo="manejo.procedimentos" placeholder="Descreva como foi feita a contenção e o que foi realizado">${escaparHtml(M.procedimentos)}</textarea></div>
    </section>
    <section class="cartao vidro">
      <h3>Fotos após a contenção</h3>
      ${fotosBloco({ etapa: 'contencao', vinculo: 'Após contenção', filtro: 'contencao' })}
    </section>`;
}

/* ---------- Etapa 7: Encaminhamento ---------- */
function contatosAdequados(ocorr) {
  const grupos = new Set(ocorr.lotes.map(l => l.grupo).filter(g => g && g !== 'naoid'));
  const posicao = ocorr.local.lat != null ? { lat: ocorr.local.lat, lng: ocorr.local.lng } : null;
  return Contatos.todos().filter(c => c.tipo !== 'emergencia').map(c => {
    const atende = (c.grupos || []).filter(g => grupos.has(g)).length;
    const dist = posicao && c.lat != null ? distanciaKm(posicao, c) : null;
    return Object.assign({}, c, { _atende: atende, _dist: dist });
  }).sort((a, b) => (b._atende - a._atende) || ((a._dist == null ? 1e9 : a._dist) - (b._dist == null ? 1e9 : b._dist)) || ((b.atende24h ? 1 : 0) - (a.atende24h ? 1 : 0)));
}

const telefoneLink = t => 'tel:' + String(t || '').replace(/[^\d+]/g, '');

function monitoramentoHtml(ocorr) {
  const lista = ocorr.encaminhamento.monitoramento || [];
  return `<section class="cartao vidro">
      <div class="cab"><h3 class="m-0">Monitoramento durante o transporte</h3><span class="contagem" aria-label="${lista.length} verificações">${lista.length}</span></div>
      <p class="suave pequeno mt-2">Em trajetos longos, verifique os animais em intervalos regulares. Cada verificação fica registrada com data e hora.</p>
      ${lista.map(v => `<div class="monit-linha"><span class="hora">${formatarHora(v.ts)}</span>
        <span class="texto"><strong>${escaparHtml(rotulosDe(SINAIS_TRANSPORTE, v.sinais) || '—')}</strong>${v.obs ? `<small>${escaparHtml(v.obs)}</small>` : ''}</span>
        <button class="botao botao-icone botao-pequeno" data-acao="monit-remover" data-id="${v.id}" aria-label="Remover verificação das ${formatarHora(v.ts)}">${icone('lixeira')}</button></div>`).join('')}
      <button class="botao botao-linha botao-bloco mt-3" data-acao="monit-add">${icone('relogio')} Registrar verificação agora</button>
    </section>`;
}

function etapaEncaminhamento(ocorr) {
  const E = ocorr.encaminhamento;
  const orient = gerarOrientacoes(ocorr);
  const dest = orient.filter(o => o.tipo === 'destino');
  const impedeSoltura = orient.find(o => o.id === 'semSoltura' || o.id === 'exotica');
  const contatos = contatosAdequados(ocorr);
  return `${dest.length ? '<h3 class="titulo-secao">Recomendações</h3>' + dest.map(avisoHtml).join('') : ''}
    <p class="nota">As recomendações são de apoio e não substituem os protocolos da sua instituição nem a decisão do agente responsável.</p>
    <section class="cartao vidro mt-4">
      <div class="campo"><span class="rotulo">Destino dos animais</span>${fichasHtml(DESTINOS, E.destino, 'data-acao="definir" data-campo="encaminhamento.destino"')}</div>
      ${E.destino === 'soltura' && impedeSoltura ? avisoHtml({ nivel: 'perigo', titulo: 'Soltura não recomendada nesta ocorrência', texto: 'Revise o destino. Se a soltura for mantida, registre nas observações quem autorizou e o motivo.', motivo: impedeSoltura.motivo }) : ''}
    </section>
    ${E.destino === 'instituicao' ? `<section class="cartao vidro">
      <h3>Instituição de destino</h3>
      <p class="suave pequeno">Ordenadas pelos grupos atendidos${ocorr.local.lat != null ? ' e pela distância' : ''}.</p>
      <div class="lista">${contatos.map(c => `<div class="item vidro estatico">
          <button class="marcacao marcacao-plana" role="radio" aria-checked="${E.instituicaoId === c.id}" data-acao="inst" data-id="${c.id}">
            <span class="quadro">${icone('certo')}</span>
            ${logoContatoHtml(c)}
            <span class="texto"><strong>${escaparHtml(c.nome)}</strong><small>${escaparHtml(c.cidade || '')}${c._dist != null ? ' · ~' + Math.round(c._dist) + ' km' : ''}${c._atende ? ' · atende o grupo' : ''}</small>
            ${c.atende24h ? '<span class="etiqueta baixo">24 h</span>' : ''}</span></button>
          ${c.telefone ? `<a class="botao botao-icone" href="${escaparHtml(telefoneLink(c.telefone))}" aria-label="Ligar para ${escaparHtml(c.nome)}">${icone('telefone')}</a>` : ''}
        </div>`).join('')}</div>
      <div class="campo mt-4"><label for="e-inst">Outra instituição (se não estiver na lista)</label>
        <input id="e-inst" class="entrada" data-campo="encaminhamento.instituicaoNome" data-limpa="encaminhamento.instituicaoId" value="${escaparHtml(E.instituicaoId ? '' : E.instituicaoNome)}" placeholder="Nome da instituição"></div>
    </section>` : ''}
    <section class="cartao vidro">
      <h3>${E.destino === 'instituicao' ? 'Entrega e recebimento' : 'Registro do encaminhamento'}</h3>
      ${E.destino === 'instituicao' ? `<p class="dica suave">Dados de quem recebeu os animais na instituição.</p>
      <div class="campo"><label for="e-resp">Nome de quem recebeu</label><input id="e-resp" class="entrada" data-campo="encaminhamento.responsavel" value="${escaparHtml(E.responsavel)}" placeholder="Nome completo" autocomplete="off"></div>
      <div class="campo"><label for="e-func">Função</label><input id="e-func" class="entrada" data-campo="encaminhamento.responsavelFuncao" value="${escaparHtml(E.responsavelFuncao)}" placeholder="Ex.: médico-veterinário, biólogo, tratador"></div>
      <div class="campo"><label for="e-reg">Registro na instituição</label><input id="e-reg" class="entrada" data-campo="encaminhamento.responsavelRegistro" value="${escaparHtml(E.responsavelRegistro)}" placeholder="Matrícula ou número funcional"></div>
      <div class="campo"><label for="e-doc">CRMV ou documento de identificação</label><input id="e-doc" class="entrada" data-campo="encaminhamento.responsavelDoc" value="${escaparHtml(E.responsavelDoc)}" placeholder="Ex.: CRMV-PR 12345 ou RG"></div>` : ''}
      <div class="campo"><label for="e-dh">Data e horário</label>
        <div class="linha"><input id="e-dh" type="datetime-local" class="entrada" data-campo="encaminhamento.dataHora" value="${escaparHtml(E.dataHora)}"><button class="botao" data-acao="agora" data-campo="encaminhamento.dataHora">Agora</button></div></div>
      <div class="campo"><label for="e-cond">Condição do animal ${E.destino === 'instituicao' ? 'na entrega' : ''}</label><textarea id="e-cond" class="entrada" data-campo="encaminhamento.condicao">${escaparHtml(E.condicao)}</textarea></div>
      <div class="campo"><label for="e-obs">Observações</label><textarea id="e-obs" class="entrada" data-campo="encaminhamento.obs">${escaparHtml(E.obs)}</textarea></div>
    </section>
    ${E.destino === 'instituicao' || (E.monitoramento || []).length ? monitoramentoHtml(ocorr) : ''}
    ${checklistHtml(ocorr, 'encaminhamento')}
    <section class="cartao vidro">
      <h3>Fotos da entrega / destino</h3>
      ${fotosBloco({ etapa: 'entrega', vinculo: 'Entrega', filtro: 'entrega' })}
    </section>`;
}

/* ---------- Etapa 8: Revisão ---------- */
function pendencias(ocorr) {
  const p = [];
  if (!ocorr.local.endereco && ocorr.local.lat == null) p.push(['Local da ocorrência não informado', 0]);
  if (!ocorr.motivo) p.push(['Motivo do atendimento não informado', 0]);
  if (PERGUNTAS_RISCO.filter(q => !q.quando || q.quando(ocorr.respostas)).some(q => !respostaTexto(q, ocorr.respostas[q.id]))) p.push(['Há perguntas de risco sem resposta', 1]);
  if (!ocorr.lotes.length) p.push(['Nenhum animal ou lote cadastrado', 4]);
  if (ocorr.lotes.some(l => !l.grupo)) p.push(['Há registro sem grupo animal', 4]);
  if (!ocorr.encaminhamento.destino) p.push(['Destino dos animais não informado', 6]);
  if (ocorr.encaminhamento.destino === 'instituicao' && !ocorr.encaminhamento.instituicaoNome) p.push(['Instituição de destino não informada', 6]);
  if (ocorr.encaminhamento.destino === 'instituicao' && !ocorr.encaminhamento.responsavel) p.push(['Nome de quem recebeu os animais não informado', 6]);
  if (ocorr.encaminhamento.destino === 'instituicao' && !ocorr.encaminhamento.responsavelDoc) p.push(['CRMV ou documento de quem recebeu não informado', 6]);
  if (ocorr.encaminhamento.destino === 'soltura' && !ocorr.encaminhamento.obs.trim() && gerarOrientacoes(ocorr).some(o => o.id === 'semSoltura' || o.id === 'exotica'))
    p.push(['Soltura registrada sem justificativa, embora não seja recomendada nesta ocorrência', 6]);
  return p;
}

function etapaRevisao(ocorr) {
  const pend = pendencias(ocorr);
  const r = ocorr.respostas;
  const sec = (titulo, etapa, linhas) => `<section class="rev-secao vidro"><div class="cab"><h3>${escaparHtml(titulo)}</h3>
      <button class="botao botao-pequeno" data-acao="etapa-ir" data-etapa="${etapa}" aria-label="Alterar ${escaparHtml(titulo)}">${icone('editar')} Alterar</button></div>
      ${linhas.map(([k, v]) => `<div class="rev-linha"><span>${escaparHtml(k)}</span><span>${v ? escaparHtml(v) : '<span class="pendente">—</span>'}</span></div>`).join('')}</section>`;
  const E = ocorr.encaminhamento;
  return `${pend.length ? `<section class="cartao vidro borda-alerta"><h3>${icone('alerta', 'class="icone-inline pendente"')} Itens pendentes</h3>
      ${pend.map(([t, e]) => `<button class="item pendencia" data-acao="etapa-ir" data-etapa="${e}"><span class="texto"><strong class="pendente">${escaparHtml(t)}</strong></span>${icone('direita', 'class="seta"')}</button>`).join('')}
      <p class="dica suave pequeno mt-2 mb-0">Você pode encerrar mesmo com pendências, mas elas constarão no relatório.</p></section>`
      : avisoHtml({ nivel: 'ok', titulo: 'Tudo preenchido', texto: 'Revise os dados abaixo e encerre a ocorrência para gerar o relatório.' })}
    ${sec('Abertura', 0, [['Local', ocorr.local.endereco || (ocorr.local.lat != null ? ocorr.local.lat.toFixed(5) + ', ' + ocorr.local.lng.toFixed(5) : '')], ['Ambiente', rotuloDe(AMBIENTES, ocorr.ambiente)], ['Motivo', ocorr.motivo === 'outro' ? ocorr.motivoOutro : rotuloDe(MOTIVOS, ocorr.motivo)]])}
    ${sec('Avaliação de risco', 1, PERGUNTAS_RISCO.filter(q => !q.quando || q.quando(r)).map(q => [q.texto, respostaTexto(q, r[q.id])]))}
    ${sec('Contexto', 2, PERGUNTAS_CONTEXTO.filter(q => !q.quando || q.quando(r)).map(q => [q.texto, respostaTexto(q, r[q.id])]))}
    ${sec('Animais e lotes', 4, ocorr.lotes.map(l => [nomeLote(l), totalLote(l) + ' · ' + (l.especies || []).map(e => e.nome).join(', ')]).concat([['Total', String(totalAnimais(ocorr))]]))}
    ${sec('Manejo', 5, [['Checklist operacional', ITENS_CHECKLIST.filter(([k]) => ocorr.manejo.checklist[k]).length + ' de ' + ITENS_CHECKLIST.length + ' itens'], ['Acondicionamento', rotuloDe(ACONDICIONAMENTOS, ocorr.manejo.acondicionamento)], ['Procedimentos', ocorr.manejo.procedimentos]])}
    ${sec('Encaminhamento', 6, [['Destino', rotuloDe(DESTINOS, E.destino)], ['Instituição', E.instituicaoNome], ['Recebido por', [E.responsavel, E.responsavelFuncao].filter(Boolean).join(' — ')], ['Registro / CRMV', [E.responsavelRegistro, E.responsavelDoc].filter(Boolean).join(' · ')], ['Data/hora', E.dataHora ? formatarDataHora(E.dataHora) : '']]
      .concat(E.monitoramento.length ? [['Verificações no transporte', String(E.monitoramento.length)]] : []))}
    <section class="cartao vidro"><h3>Horários do atendimento</h3>
      ${linhasTempos(ocorr).map(([k, v]) => `<div class="rev-linha"><span>${escaparHtml(k)}</span><span>${escaparHtml(v)}</span></div>`).join('')}
      <p class="dica suave pequeno mt-2 mb-0">Início → conclusão de cada etapa. O tempo não conta as pausas; os horários são os do relógio do celular.</p></section>
    <section class="cartao vidro"><div class="cab"><h3 class="m-0">Fotografias</h3><span class="contagem" id="rev-fotos">…</span></div></section>
    <h3 class="titulo-secao">Orientações apresentadas</h3>
    ${gerarOrientacoes(ocorr).map(avisoHtml).join('')}
    <section class="cartao vidro">
      <div class="campo"><label for="r-obs">Observações adicionais</label><textarea id="r-obs" class="entrada" data-campo="observacoes">${escaparHtml(ocorr.observacoes)}</textarea></div>
    </section>
    <details class="cartao vidro"><summary>Histórico de alterações (${ocorr.log.length})</summary>
      ${ocorr.log.slice().reverse().map(x => `<div class="rev-linha"><span>${formatarDataHora(x.ts)}</span><span>${escaparHtml(x.acao)}${x.detalhe ? ' — ' + escaparHtml(x.detalhe) : ''}</span></div>`).join('')}
    </details>
    <button class="botao botao-bloco botao-excluir mt-2" data-acao="ocorrencia-excluir">${icone('lixeira')} Excluir ocorrência</button>`;
}

/* ================= Fotografias ================= */
/* O arquivo original nunca é alterado. O recorte gera uma CÓPIA (f.recorte) usada na exibição e no relatório. */
const arquivoExibicao = f => (f.recorte && f.recorte.blob) || f.blob;
/* nas grades usa a miniatura (até 320 px): decodificar a foto original de vários megapixels
   em cada tela pesa muito em celulares simples */
const arquivoMiniatura = f => f.miniatura || arquivoExibicao(f);

/* gera a miniatura e informa as dimensões reais da imagem; a foto é decodificada uma única vez */
async function gerarMiniatura(blob) {
  try {
    let fonte, w, h;
    if (window.createImageBitmap) { fonte = await createImageBitmap(blob); w = fonte.width; h = fonte.height; }
    else {
      const u = URL.createObjectURL(blob);
      fonte = new Image(); fonte.src = u;
      await new Promise((ok, erro) => { fonte.onload = ok; fonte.onerror = erro; });
      URL.revokeObjectURL(u); w = fonte.naturalWidth; h = fonte.naturalHeight;
    }
    const escala = Math.min(1, 320 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * escala)); c.height = Math.max(1, Math.round(h * escala));
    c.getContext('2d').drawImage(fonte, 0, 0, c.width, c.height);
    if (fonte.close) fonte.close();
    const mini = await new Promise(r => c.toBlob(r, 'image/jpeg', .8));
    return { blob: mini, largura: w, altura: h };
  } catch (e) { return null; }
}

/* fotos gravadas por versões anteriores ganham miniatura aos poucos, sem travar a tela */
let _gerandoMiniaturas = false;
async function completarMiniaturas(fotos) {
  if (_gerandoMiniaturas) return;
  _gerandoMiniaturas = true;
  try {
    for (const f of fotos.filter(x => !x.miniatura)) {
      const m = await gerarMiniatura(arquivoExibicao(f));
      if (!m || !m.blob) continue;
      // relê o registro antes de gravar, para não desfazer uma edição feita enquanto a miniatura era gerada
      const atual = await Fotos.obter(f.id);
      if (!atual || atual.miniatura || (atual.recorte ? atual.recorte.ts : '') !== (f.recorte ? f.recorte.ts : '')) continue;
      atual.miniatura = m.blob;
      await Fotos.atualizarMeta(atual);
    }
  } catch (e) { /* tenta de novo na próxima vez */ }
  _gerandoMiniaturas = false;
}
const MOTIVOS_EXCLUSAO = ['Foto errada ou de outra ocorrência', 'Foto duplicada', 'Foto sem nitidez', 'Enviada por engano'];

function fotosBloco(o) {
  const attrs = `data-etapa="${o.etapa}" data-lote="${o.loteId || ''}" data-vinculo="${escaparHtml(o.vinculo || '')}"`;
  return `<div class="linha-btns">
      <button class="botao botao-primario" data-acao="foto" data-modo="camera" ${attrs}>${icone('camera')} Tirar foto</button>
      <button class="botao" data-acao="foto" data-modo="galeria" ${attrs}>${icone('imagem')} Galeria</button>
    </div>
    <div class="fotos-cab"><span>Fotos registradas</span><span class="contagem" data-fotos-qtd>0</span></div>
    <div class="fotos-grade" data-fotos data-filtro="${o.filtro || ''}" data-filtro-lote="${o.filtroLote || ''}" aria-live="polite">
      <p class="fotos-vazio">Carregando...</p></div>`;
}

const _urls = [];
function urlDe(blob) { const u = URL.createObjectURL(blob); _urls.push(u); return u; }
function liberarUrls() { while (_urls.length) URL.revokeObjectURL(_urls.pop()); }

async function carregarFotos(occId, destacarIds) {
  const conts = document.querySelectorAll('[data-fotos]');
  const rev = document.getElementById('rev-fotos');
  if (!conts.length && !rev) return;
  let fotos = [];
  try { fotos = await Fotos.daOcorrencia(occId); }
  catch (e) {
    console.error(e);
    conts.forEach(c => { c.innerHTML = `<p class="fotos-vazio pendente">Não foi possível ler as fotos deste aparelho (${escaparHtml(e.message || e)}).</p>`; });
    return;
  }
  if (rev) rev.textContent = fotos.filter(f => !f.excluida).length;
  if (fotos.some(f => !f.miniatura)) setTimeout(() => completarMiniaturas(fotos), 600);
  conts.forEach(c => {
    const lista = fotos.filter(f => (c.dataset.filtro ? f.etapa === c.dataset.filtro : true) && (c.dataset.filtroLote ? f.loteId === c.dataset.filtroLote : true));
    const qtd = c.previousElementSibling && c.previousElementSibling.querySelector('[data-fotos-qtd]');
    if (qtd) qtd.textContent = lista.filter(f => !f.excluida).length;
    c.innerHTML = lista.map(f => `<button class="foto-mini${f.excluida ? ' excluida' : ''}${destacarIds && destacarIds.includes(f.id) ? ' nova' : ''}" data-acao="foto-ver" data-id="${f.id}" aria-label="Abrir foto: ${escaparHtml(f.vinculo)}${f.excluida ? ' (excluída)' : ''}">
      <img src="${urlDe(arquivoMiniatura(f))}" alt="" loading="lazy"><span>${escaparHtml(f.vinculo)}</span>${f.recorte && !f.excluida ? '<em class="selo">recortada</em>' : ''}</button>`).join('')
      || '<p class="fotos-vazio">Nenhuma foto ainda. As fotos salvas aparecem aqui, e você pode tocar nelas para recortar, editar ou excluir.</p>';
  });
}

function escolherFoto(botao) {
  // o campo precisa estar na página: alguns navegadores de celular não disparam o evento se ele estiver "solto"
  document.querySelectorAll('input.foto-entrada').forEach(i => i.remove());
  const entrada = document.createElement('input');
  entrada.type = 'file'; entrada.accept = 'image/*'; entrada.className = 'foto-entrada somente-leitor'; entrada.setAttribute('aria-hidden', 'true'); entrada.tabIndex = -1;
  if (botao.dataset.modo === 'camera') entrada.setAttribute('capture', 'environment'); else entrada.multiple = true;
  const dados = { etapa: botao.dataset.etapa, loteId: botao.dataset.lote || '', vinculo: botao.dataset.vinculo || '' };
  entrada.addEventListener('change', () => {
    const arquivos = [...(entrada.files || [])].filter(f => !f.type || f.type.startsWith('image/'));
    entrada.remove();
    if (!arquivos.length) { notificar('Nenhuma imagem foi selecionada.', 'aviso'); return; }
    const promessaPosicao = Aplicativo.ajustes.localizacaoAuto ? obterLocalizacao(6000) : Promise.resolve(null);
    modalNovaFoto(arquivos, dados, promessaPosicao);
  });
  document.body.appendChild(entrada);
  entrada.click();
}

function modalNovaFoto(arquivos, dados, promessaPosicao) {
  const ocorr = Aplicativo.contexto.ocorr;
  const sugestoes = ['Local', 'Gaiola 1', 'Recinto 1', 'Vestígio 1'].concat(ocorr.lotes.map(l => l.rotulo)).concat(ocorr.lotes.reduce((todos, l) => todos.concat((l.individuos || []).map(i => i.rotulo)), []));
  const urls = arquivos.map(f => URL.createObjectURL(f));
  const varias = arquivos.length > 1;
  const m = abrirModal(varias ? `${arquivos.length} fotos selecionadas` : 'Nova foto', `
    ${varias ? `<div class="fotos-grade mt-0">${urls.map(u => `<div class="foto-mini"><img src="${u}" alt="Pré-visualização"></div>`).join('')}</div>`
      : `<div class="foto-grande"><img src="${urls[0]}" alt="Pré-visualização da foto selecionada"></div>`}
    <div class="campo"><label for="nf-vinc">Identificação (animal, lote, gaiola, recinto)</label>
      <input id="nf-vinc" class="entrada" list="nf-sug" value="${escaparHtml(dados.vinculo)}" placeholder="Ex.: Animal 1, Lote de aves 1, Gaiola 1">
      <datalist id="nf-sug">${[...new Set(sugestoes)].map(s => `<option value="${escaparHtml(s)}">`).join('')}</datalist></div>
    <div class="campo"><label for="nf-etapa">Momento</label>
      <select id="nf-etapa" class="entrada">${Object.entries(ETAPAS_FOTO).map(([k, v]) => `<option value="${k}" ${k === dados.etapa ? 'selected' : ''}>${escaparHtml(v)}</option>`).join('')}</select></div>
    <div class="campo"><label for="nf-obs">Observação (opcional)</label>
      <textarea id="nf-obs" class="entrada" rows="2" placeholder="Ex.: lesão na asa esquerda, gaiola sem água"></textarea></div>
    <p class="nota">Data, hora, ${escaparHtml(Aplicativo.perfil.nome)}, ${escaparHtml(ocorr.numero)} e localização (se autorizada) são registrados automaticamente.</p>
    <div class="modal-acoes">
      <button class="botao" id="nf-cancelar">Cancelar</button>
      <button class="botao botao-primario" id="nf-salvar">${icone('certo')} Salvar ${varias ? 'fotos' : 'foto'}</button>
    </div>`,
    () => urls.forEach(u => URL.revokeObjectURL(u)));

  m.querySelector('#nf-cancelar').addEventListener('click', () => fecharModal());
  m.querySelector('#nf-salvar').addEventListener('click', async ev => {
    const botaoSalvar = ev.currentTarget;
    botaoSalvar.disabled = true; botaoSalvar.textContent = 'Salvando...';
    const vinculo = m.querySelector('#nf-vinc').value.trim() || 'Sem identificação';
    const etapa = m.querySelector('#nf-etapa').value;
    const obs = m.querySelector('#nf-obs').value.trim();
    const posicao = await promessaPosicao;
    if (posicao) Aplicativo.ultimaPosicao = posicao;
    const salvas = [];
    try {
      for (const arq of arquivos) {
        const ts = new Date().toISOString();
        const exif = await Exif.ler(arq);
        const mini = await gerarMiniatura(arq);
        if (mini) { exif.largura = mini.largura; exif.altura = mini.altura; }
        // sem GPS do aparelho, usa a posição gravada na própria foto (EXIF), se houver
        const pf = posicao || (exif.gps ? { lat: exif.gps.lat, lng: exif.gps.lng, precisao: null, origem: 'exif' } : null);
        const foto = {
          id: gerarId(), occId: ocorr.id, numero: ocorr.numero, blob: arq, nomeArquivo: arq.name, tipoMime: arq.type, tamanho: arq.size,
          dataArquivo: arq.lastModified ? new Date(arq.lastModified).toISOString() : null, exif,
          hash: await hashArquivo(arq), ts, lat: pf && pf.lat, lng: pf && pf.lng, precisao: pf && pf.precisao, origemLocal: pf ? (pf.origem || 'aparelho') : '',
          autor: Aplicativo.perfil.nome + (Aplicativo.perfil.matricula ? ' (' + Aplicativo.perfil.matricula + ')' : ''),
          miniatura: mini ? mini.blob : null,
          etapa, loteId: dados.loteId || (ocorr.lotes.find(l => l.rotulo === vinculo) || {}).id || '', vinculo, obs, excluida: false, historico: [{ ts, acao: 'Incluída' }]
        };
        await Fotos.adicionar(foto);
        // confirma que a foto foi realmente gravada no aparelho
        if (!(await Fotos.obter(foto.id))) throw new Error('A foto não foi gravada.');
        salvas.push(foto);
        Ocorrencias.registrar(ocorr, 'Foto incluída', vinculo + ' · ' + ETAPAS_FOTO[etapa]);
      }
      Ocorrencias.salvar(ocorr);
      urls.forEach(u => URL.revokeObjectURL(u));
      fecharModal(true);
      await Aplicativo.desenhar();
      carregarFotos(ocorr.id, salvas.map(f => f.id));
      modalFotoSalva(salvas, dados.etapa);
    } catch (e) {
      console.error(e);
      botaoSalvar.disabled = false; botaoSalvar.innerHTML = `${icone('certo')} Tentar de novo`;
      const aviso = m.querySelector('.aviso-erro') || m.querySelector('.modal-acoes').insertAdjacentElement('beforebegin', document.createElement('div'));
      aviso.className = 'aviso-erro';
      aviso.innerHTML = avisoHtml({ nivel: 'perigo', titulo: 'A foto não foi salva', texto: 'Verifique o espaço livre do aparelho e tente de novo. (' + (e.message || e) + ')' });
    }
  });
}

/* confirmação visual logo após salvar */
function modalFotoSalva(salvas, etapaTela) {
  const f = salvas[0];
  const url = URL.createObjectURL(f.blob);
  const outraTela = salvas.some(x => x.etapa !== etapaTela);
  const m = abrirModal(salvas.length > 1 ? `${salvas.length} fotos salvas` : 'Foto salva', `
    ${avisoHtml({ nivel: 'ok', titulo: salvas.length > 1 ? `${salvas.length} fotos gravadas no aparelho` : 'Foto gravada no aparelho', texto: `Registrada em ${formatarDataHora(f.ts)} como "${f.vinculo}" · ${ETAPAS_FOTO[f.etapa]}${f.lat != null ? ' · com localização' : ''}.` })}
    ${outraTela ? avisoHtml({ nivel: 'info', titulo: 'Aparece em outra etapa', texto: `Você escolheu o momento "${ETAPAS_FOTO[f.etapa]}", então a foto aparece na lista dessa etapa.` }) : ''}
    <div class="foto-grande compacta"><img src="${url}" alt="Foto salva: ${escaparHtml(f.vinculo)}"></div>
    ${salvas.length === 1 ? `<div class="foto-ferramentas">
      <button class="botao" data-f="recortar">${icone('recortar')} Recortar</button>
      <button class="botao" data-f="editar">${icone('editar')} Editar dados</button>
      <button class="botao botao-excluir" data-f="excluir">${icone('lixeira')} Excluir</button>
    </div>` : `<p class="nota">Toque em cada foto na lista para recortar, editar ou excluir.</p>`}
    <div class="modal-acoes">
      <button class="botao" data-f="outra">${icone('camera')} Outra foto</button>
      <button class="botao botao-primario" data-f="ok">${icone('certo')} Concluir</button>
    </div>`, () => URL.revokeObjectURL(url));
  m.addEventListener('click', ev => {
    const b = ev.target.closest('[data-f]'); if (!b) return;
    const a = b.dataset.f;
    if (a === 'ok') fecharModal();
    if (a === 'outra') { fecharModal(); const botaoCamera = document.querySelector(`[data-acao="foto"][data-modo="camera"][data-etapa="${etapaTela}"]`) || document.querySelector('[data-acao="foto"][data-modo="camera"]'); if (botaoCamera) escolherFoto(botaoCamera); }
    if (a === 'recortar') { fecharModal(true); modalRecorte(f.id); }
    if (a === 'editar') { fecharModal(true); modalEditarFoto(f.id); }
    if (a === 'excluir') { fecharModal(true); excluirFoto(f.id); }
  });
}

async function modalVerFoto(id) {
  const f = await Fotos.obter(id);
  if (!f) { notificar('Foto não encontrada.', 'erro'); return; }
  const ocorr = Aplicativo.contexto.ocorr || Ocorrencias.obter(f.occId);
  const editavel = !f.excluida && ocorr && ocorr.status !== 'encerrada';
  const url = URL.createObjectURL(arquivoExibicao(f));
  const m = abrirModal(f.vinculo, `
    <div class="foto-grande compacta"><img src="${url}" alt="Fotografia: ${escaparHtml(f.vinculo)}"></div>
    ${f.excluida ? avisoHtml({ nivel: 'perigo', titulo: 'Foto excluída', texto: 'Motivo: ' + (f.motivoExclusao || '—') + ' · ' + formatarDataHora(f.excluidaEm) }) : ''}
    ${f.recorte ? avisoHtml({ nivel: 'info', titulo: 'Exibindo cópia recortada', texto: `Recortada em ${formatarDataHora(f.recorte.ts)}. O arquivo original continua preservado, sem alteração.` }) : ''}
    ${editavel ? `<div class="foto-ferramentas">
      <button class="botao" data-f="recortar">${icone('recortar')} ${f.recorte ? 'Ajustar recorte' : 'Recortar'}</button>
      <button class="botao" data-f="editar">${icone('editar')} Editar dados</button>
      <button class="botao botao-excluir" data-f="excluir">${icone('lixeira')} Excluir</button>
    </div>` : ''}
    <div class="rev-linha"><span>Identificação</span><span>${escaparHtml(f.vinculo)}</span></div>
    <div class="rev-linha"><span>Momento</span><span>${escaparHtml(ETAPAS_FOTO[f.etapa] || f.etapa)}</span></div>
    ${f.obs ? `<div class="rev-linha"><span>Observação</span><span>${escaparHtml(f.obs)}</span></div>` : ''}
    <div class="rev-linha"><span>Data e hora</span><span>${formatarDataHora(f.ts)}</span></div>
    <div class="rev-linha"><span>Autor</span><span>${escaparHtml(f.autor)}</span></div>
    <details class="mt-2"><summary>Metadados e histórico</summary>
      <div class="rev-linha"><span>Ocorrência</span><span>${escaparHtml(f.numero)}</span></div>
      <div class="rev-linha"><span>Localização</span><span>${f.lat != null ? f.lat.toFixed(6) + ', ' + f.lng.toFixed(6) + (f.origemLocal === 'exif' ? ' (EXIF)' : '') : 'Não registrada'}</span></div>
      <div class="rev-linha"><span>Arquivo original</span><span>${escaparHtml(f.nomeArquivo)} · ${(f.tamanho / 1024 / 1024).toFixed(2)} MB</span></div>
      ${Exif.resumo(f.exif).map(([k, v]) => `<div class="rev-linha"><span>${escaparHtml(k)}</span><span>${escaparHtml(v)}</span></div>`).join('')}
      ${f.hash ? `<div class="rev-linha"><span>SHA-256 do original</span><span class="texto-codigo">${escaparHtml(f.hash)}</span></div>` : ''}
      ${(f.historico || []).map(h => `<div class="rev-linha"><span>${formatarDataHora(h.ts)}</span><span>${escaparHtml(h.acao)}${h.motivo ? ' — ' + escaparHtml(h.motivo) : ''}</span></div>`).join('')}
    </details>
    ${f.exif && f.exif.software ? avisoHtml({ nivel: 'info', titulo: 'Software registrado no arquivo', texto: 'O arquivo indica processamento por "' + f.exif.software + '". Verifique se a imagem foi editada antes de anexar.' }) : ''}
    <div class="modal-acoes"><button class="botao botao-primario" data-f="ok">${icone('certo')} Fechar</button></div>`,
    () => URL.revokeObjectURL(url));
  m.addEventListener('click', ev => {
    const b = ev.target.closest('[data-f]'); if (!b) return;
    const a = b.dataset.f;
    if (a === 'ok') fecharModal();
    if (a === 'recortar') { fecharModal(true); modalRecorte(f.id); }
    if (a === 'editar') { fecharModal(true); modalEditarFoto(f.id); }
    if (a === 'excluir') { fecharModal(true); excluirFoto(f.id); }
  });
}

async function modalEditarFoto(id) {
  const f = await Fotos.obter(id);
  if (!f) { notificar('Foto não encontrada.', 'erro'); return; }
  const ocorr = Aplicativo.contexto.ocorr;
  const m = abrirModal('Editar dados da foto', `
    <div class="campo"><label for="ef-vinc">Identificação</label><input id="ef-vinc" class="entrada" value="${escaparHtml(f.vinculo)}"></div>
    <div class="campo"><label for="ef-etapa">Momento</label>
      <select id="ef-etapa" class="entrada">${Object.entries(ETAPAS_FOTO).map(([k, v]) => `<option value="${k}" ${k === f.etapa ? 'selected' : ''}>${escaparHtml(v)}</option>`).join('')}</select></div>
    <div class="campo"><label for="ef-obs">Observação</label><textarea id="ef-obs" class="entrada" rows="3">${escaparHtml(f.obs)}</textarea></div>
    <p class="nota">As alterações ficam registradas no histórico da foto.</p>
    <div class="modal-acoes"><button class="botao" data-f="cancelar">Cancelar</button><button class="botao botao-primario" data-f="salvar">${icone('certo')} Salvar</button></div>`);
  m.querySelector('[data-f="cancelar"]').addEventListener('click', () => { fecharModal(true); modalVerFoto(id); });
  m.querySelector('[data-f="salvar"]').addEventListener('click', async () => {
    const novo = { vinculo: m.querySelector('#ef-vinc').value.trim() || 'Sem identificação', etapa: m.querySelector('#ef-etapa').value, obs: m.querySelector('#ef-obs').value.trim() };
    const mudou = Object.keys(novo).filter(k => (f[k] || '') !== novo[k]);
    if (mudou.length) {
      const ts = new Date().toISOString();
      f.historico = (f.historico || []).concat(mudou.map(k => ({ ts, acao: 'Alterado: ' + k, de: f[k] || '', para: novo[k] })));
      Object.assign(f, novo);
      const l = ocorr.lotes.find(x => x.rotulo === f.vinculo); if (l) f.loteId = l.id;
      await Fotos.atualizarMeta(f);
      Ocorrencias.registrar(ocorr, 'Dados de foto alterados', f.vinculo + ' (' + mudou.join(', ') + ')'); Ocorrencias.salvar(ocorr);
      notificar('Dados da foto salvos');
    }
    fecharModal(true); await Aplicativo.desenhar(); modalVerFoto(id);
  });
}

async function excluirFoto(id) {
  const f = await Fotos.obter(id);
  if (!f) { notificar('Foto não encontrada.', 'erro'); return; }
  const ocorr = Aplicativo.contexto.ocorr;
  const url = URL.createObjectURL(arquivoExibicao(f));
  const m = abrirModal('Excluir foto?', `
    <div class="foto-grande minima"><img class="minima" src="${url}" alt=""></div>
    <p>A foto deixa de aparecer na ocorrência, mas continua no histórico e no relatório, marcada como <strong>excluída</strong>.</p>
    <div class="campo"><span class="rotulo">Motivo</span>
      <div class="fichas">${MOTIVOS_EXCLUSAO.map(t => `<button type="button" class="ficha" data-motivo="${escaparHtml(t)}">${escaparHtml(t)}</button>`).join('')}</div>
      <textarea id="ex-motivo" class="entrada mt-3" rows="2" placeholder="Ou descreva o motivo"></textarea></div>
    <div class="modal-acoes"><button class="botao" data-f="cancelar">Cancelar</button><button class="botao botao-perigo" data-f="excluir">${icone('lixeira')} Excluir foto</button></div>`,
    () => URL.revokeObjectURL(url));
  m.addEventListener('click', async ev => {
    const ficha = ev.target.closest('[data-motivo]');
    if (ficha) { m.querySelector('#ex-motivo').value = ficha.dataset.motivo; m.querySelectorAll('[data-motivo]').forEach(c => c.setAttribute('aria-pressed', String(c === ficha))); return; }
    const b = ev.target.closest('[data-f]'); if (!b) return;
    if (b.dataset.f === 'cancelar') { fecharModal(); return; }
    const motivo = m.querySelector('#ex-motivo').value.trim();
    if (!motivo) { notificar('Escolha ou descreva o motivo.', 'aviso'); return; }
    const ts = new Date().toISOString();
    f.excluida = true; f.motivoExclusao = motivo; f.excluidaEm = ts;
    f.historico = (f.historico || []).concat({ ts, acao: 'Excluída', motivo });
    await Fotos.atualizarMeta(f);
    Ocorrencias.registrar(ocorr, 'Foto excluída', f.vinculo + ' — motivo: ' + motivo); Ocorrencias.salvar(ocorr);
    fecharModal(); notificar('Foto excluída', 'info'); Aplicativo.desenhar();
  });
}

/* ---------- Recorte (gera cópia; original preservado) ---------- */
async function modalRecorte(id) {
  const f = await Fotos.obter(id);
  if (!f) { notificar('Foto não encontrada.', 'erro'); return; }
  const ocorr = Aplicativo.contexto.ocorr;
  const url = URL.createObjectURL(f.blob); // sempre recorta a partir do ORIGINAL
  let caixa = f.recorte && f.recorte.area ? Object.assign({}, f.recorte.area) : { x: .08, y: .08, w: .84, h: .84 };
  let proporcao = 0; // 0 = livre
  const m = abrirModal('Recortar foto', `
    <p class="suave pequeno mb-3">Arraste a área para mover e os cantos para ajustar. O original é mantido intacto.</p>
    <div class="recorte-palco"><div class="recorte-area" id="rc-area">
      <img id="rc-imagem" src="${url}" alt="Foto a recortar" draggable="false">
      <div class="rc-caixa" id="rc-caixa" role="application" aria-label="Área de recorte">
        <span class="rc-alca sup-esq" data-alca="sup-esq"></span><span class="rc-alca sup-dir" data-alca="sup-dir"></span><span class="rc-alca inf-esq" data-alca="inf-esq"></span><span class="rc-alca inf-dir" data-alca="inf-dir"></span>
      </div></div></div>
    <div class="fichas mt-3 mb-3" role="radiogroup" aria-label="Proporção">
      ${[[0, 'Livre'], [1, 'Quadrado'], [4 / 3, '4:3'], [3 / 4, '3:4']].map(([v, r], i) => `<button type="button" class="ficha" role="radio" aria-checked="${i === 0}" data-prop="${v}">${r}</button>`).join('')}
    </div>
    <div class="modal-acoes">
      ${f.recorte ? `<button class="botao" data-f="remover">Desfazer recorte</button>` : `<button class="botao" data-f="cancelar">Cancelar</button>`}
      <button class="botao botao-primario" data-f="aplicar">${icone('certo')} Aplicar recorte</button>
    </div>`, () => URL.revokeObjectURL(url));

  const img = m.querySelector('#rc-imagem'), area = m.querySelector('#rc-area'), quadro = m.querySelector('#rc-caixa');
  // img.decode() não existe em navegadores antigos: nesse caso espera o evento load
  await (img.decode ? img.decode().catch(() => {}) : new Promise(r => { if (img.complete) r(); else img.onload = img.onerror = r; }));
  const nat = { w: img.naturalWidth, h: img.naturalHeight };
  const MIN = .08;
  const limitar = () => {
    caixa.w = Math.min(Math.max(caixa.w, MIN), 1); caixa.h = Math.min(Math.max(caixa.h, MIN), 1);
    caixa.x = Math.min(Math.max(caixa.x, 0), 1 - caixa.w); caixa.y = Math.min(Math.max(caixa.y, 0), 1 - caixa.h);
  };
  const desenhar = () => { limitar(); Object.assign(quadro.style, { left: caixa.x * 100 + '%', top: caixa.y * 100 + '%', width: caixa.w * 100 + '%', height: caixa.h * 100 + '%' }); };
  const aplicarProporcao = () => {
    if (!proporcao) return;
    // altura normalizada que mantém a proporção em pixels reais
    let h = caixa.w * nat.w / (proporcao * nat.h);
    if (h > 1) { h = 1; caixa.w = proporcao * nat.h / nat.w; }
    const cy = caixa.y + caixa.h / 2; caixa.h = h; caixa.y = cy - h / 2;
  };
  desenhar();

  let arrasto = null;
  area.addEventListener('pointerdown', ev => {
    const alvoEl = ev.target.closest('.rc-alca, .rc-caixa'); if (!alvoEl) return;
    ev.preventDefault();
    const r = area.getBoundingClientRect();
    arrasto = { modo: alvoEl.dataset.alca || 'mover', x0: ev.clientX, y0: ev.clientY, c0: Object.assign({}, caixa), r };
    area.setPointerCapture(ev.pointerId);
  });
  area.addEventListener('pointermove', ev => {
    if (!arrasto) return;
    const dx = (ev.clientX - arrasto.x0) / arrasto.r.width, dy = (ev.clientY - arrasto.y0) / arrasto.r.height, c0 = arrasto.c0;
    if (arrasto.modo === 'mover') { caixa.x = c0.x + dx; caixa.y = c0.y + dy; }
    else {
      const alca = arrasto.modo;   // 'sup-esq', 'sup-dir', 'inf-esq' ou 'inf-dir'
      let x1 = c0.x, y1 = c0.y, x2 = c0.x + c0.w, y2 = c0.y + c0.h;
      if (alca.includes('esq')) x1 = Math.min(Math.max(0, c0.x + dx), x2 - MIN);
      if (alca.includes('dir')) x2 = Math.max(Math.min(1, x2 + dx), x1 + MIN);
      if (alca.includes('sup')) y1 = Math.min(Math.max(0, c0.y + dy), y2 - MIN);
      if (alca.includes('inf')) y2 = Math.max(Math.min(1, y2 + dy), y1 + MIN);
      caixa = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
      if (proporcao) {
        const h = caixa.w * nat.w / (proporcao * nat.h);
        if (alca.includes('sup')) caixa.y = y2 - h;
        caixa.h = h;
      }
    }
    desenhar();
  });
  const soltar = () => { arrasto = null; };
  area.addEventListener('pointerup', soltar); area.addEventListener('pointercancel', soltar);

  m.addEventListener('click', async ev => {
    const pb = ev.target.closest('[data-prop]');
    if (pb) {
      proporcao = parseFloat(pb.dataset.prop);
      m.querySelectorAll('[data-prop]').forEach(c => c.setAttribute('aria-checked', String(c === pb)));
      aplicarProporcao(); desenhar(); return;
    }
    const b = ev.target.closest('[data-f]'); if (!b) return;
    const a = b.dataset.f;
    if (a === 'cancelar') { fecharModal(); return; }
    const ts = new Date().toISOString();
    if (a === 'remover') {
      delete f.recorte;
      const miniOriginal = await gerarMiniatura(f.blob); f.miniatura = miniOriginal ? miniOriginal.blob : null;
      f.historico = (f.historico || []).concat({ ts, acao: 'Recorte desfeito (exibindo original)' });
      await Fotos.atualizarMeta(f);
      Ocorrencias.registrar(ocorr, 'Recorte de foto desfeito', f.vinculo); Ocorrencias.salvar(ocorr);
      fecharModal(); notificar('Recorte desfeito', 'info'); await Aplicativo.desenhar(); modalVerFoto(id); return;
    }
    if (a === 'aplicar') {
      b.disabled = true; b.textContent = 'Aplicando...';
      // área do recorte em pixels reais da foto original
      const origemX = Math.round(caixa.x * nat.w), origemY = Math.round(caixa.y * nat.h), largura = Math.round(caixa.w * nat.w), altura = Math.round(caixa.h * nat.h);
      const c = document.createElement('canvas'); c.width = largura; c.height = altura;
      c.getContext('2d').drawImage(img, origemX, origemY, largura, altura, 0, 0, largura, altura);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
      if (!blob) { notificar('Não foi possível recortar esta imagem.', 'erro'); b.disabled = false; return; }
      const miniRecorte = await gerarMiniatura(blob); f.miniatura = miniRecorte ? miniRecorte.blob : null;
      f.recorte = { blob, area: Object.assign({}, caixa), pixels: { x: origemX, y: origemY, w: largura, h: altura }, ts, autor: Aplicativo.perfil.nome, hash: await hashArquivo(blob) };
      f.historico = (f.historico || []).concat({ ts, acao: `Cópia recortada criada (${largura}×${altura} px a partir de x=${origemX}, y=${origemY})` });
      await Fotos.atualizarMeta(f);
      Ocorrencias.registrar(ocorr, 'Foto recortada (cópia; original preservado)', f.vinculo); Ocorrencias.salvar(ocorr);
      fecharModal(); notificar('Recorte aplicado'); await Aplicativo.desenhar(); modalVerFoto(id);
    }
  });
}


/* ================= Relatório ================= */
function textoMonitoramento(ocorr) {
  return (ocorr.encaminhamento.monitoramento || []).map(v => formatarDataHora(v.ts) + ': ' + (rotulosDe(SINAIS_TRANSPORTE, v.sinais) || 'sem sinais marcados') + (v.obs ? ' (' + v.obs + ')' : '')).join('\n');
}

async function telaRelatorio(id) {
  const ocorr = Ocorrencias.obter(id);
  if (!ocorr) return telaNaoEncontrada();
  Aplicativo.contexto = { ocorr, lote: null };
  let fotos = [];
  try { fotos = await Fotos.daOcorrencia(id); } catch (e) {}
  const ativas = fotos.filter(f => !f.excluida);
  const excluidas = fotos.filter(f => f.excluida);
  const r = ocorr.respostas, u = ocorr.usuario || {}, E = ocorr.encaminhamento;
  const tab = linhas => `<table>${linhas.map(([k, v]) => `<tr><th>${escaparHtml(k)}</th><td>${v ? escaparHtml(v) : '—'}</td></tr>`).join('')}</table>`;
  const tabPerg = ps => tab(ps.filter(q => !q.quando || q.quando(r)).map(q => [q.texto, respostaTexto(q, r[q.id]) || 'Sem resposta']));
  const pend = pendencias(ocorr);

  const html = `<div class="relatorio" id="relatorio">
    <div class="rel-cab"><img src="recursos/logo.png" alt="SISTRAFA">
      <div><h1>Ficha auxiliar de ocorrência com fauna silvestre</h1>
      <small>SISTRAFA · Nº ${escaparHtml(ocorr.numero)} · ${ocorr.status === 'encerrada' ? 'Encerrada em ' + formatarDataHora(ocorr.encerradaEm) : 'Em andamento (rascunho)'}</small></div></div>

    <h2>1. Identificação</h2>
    ${tab([['Número da ocorrência', ocorr.numero], ['Abertura', formatarDataHora(ocorr.criadaEm)], ['Encerramento', ocorr.encerradaEm ? formatarDataHora(ocorr.encerradaEm) : ''],
      ['Duração do atendimento', formatarDuracao(resumoTempos(ocorr).total)], ['Responsável', u.nome], ['Cargo / função', u.cargo], ['Identificação funcional', u.matricula], ['Instituição', u.instituicao]])}

    <h2>2. Local e contexto</h2>
    ${tab([['Endereço / descrição', ocorr.local.endereco], ['Referência', ocorr.local.referencia],
      ['Coordenadas', ocorr.local.lat != null ? `${ocorr.local.lat.toFixed(6)}, ${ocorr.local.lng.toFixed(6)} (±${ocorr.local.precisao} m)` : 'Não registradas'],
      ['Ambiente', rotuloDe(AMBIENTES, ocorr.ambiente)], ['Motivo do atendimento', ocorr.motivo === 'outro' ? ocorr.motivoOutro : rotuloDe(MOTIVOS, ocorr.motivo)]])}

    <h2>3. Checklist — avaliação de risco</h2>${tabPerg(PERGUNTAS_RISCO)}
    <h2>4. Checklist — contexto</h2>${tabPerg(PERGUNTAS_CONTEXTO)}

    <h2>5. Animais e lotes (total: ${totalAnimais(ocorr)})</h2>
    ${ocorr.lotes.length ? ocorr.lotes.map(l => `<table>
      <tr><th colspan="2" style="background:#DFF5EC">${escaparHtml(l.rotulo)} — ${l.tipo === 'lote' ? 'Lote' : 'Animal individual'} · ${escaparHtml((GRUPOS[l.grupo] || GRUPOS.naoid).nome)}</th></tr>
      <tr><th>Espécies e quantidades</th><td>${(l.especies || []).map(e => `${escaparHtml(e.nome)}${e.cientifico ? ' (<i>' + escaparHtml(e.cientifico) + '</i>)' : ''}: ${e.qtd || 0} — identificação ${e.provisoria ? 'provisória' : 'confirmada'}`).join('<br>') || '—'}</td></tr>
      <tr><th>Estado</th><td>${escaparHtml(rotuloDe([['vivo', 'Vivo(s)'], ['morto', 'Morto(s)'], ['ambos', 'Vivos e mortos']], l.estado) || '—')}</td></tr>
      <tr><th>Como foi encontrado</th><td>${escaparHtml(rotuloDe(SITUACOES, l.situacao) || '—')}</td></tr>
      <tr><th>Condição inicial</th><td>${escaparHtml(rotulosDe(CONDICOES, l.condicoes) || '—')}</td></tr>
      <tr><th>Comportamento observado</th><td>${escaparHtml(rotulosDe(COMPORTAMENTOS, l.comportamentos) || '—')}</td></tr>
      <tr><th>Riscos identificados</th><td>${escaparHtml(rotulosDe(RISCOS_ANIMAL, l.riscos) || '—')}</td></tr>
      ${(l.individuos || []).length ? `<tr><th>Indivíduos destacados</th><td>${l.individuos.map(i => escaparHtml(i.rotulo) + (i.obs ? ': ' + escaparHtml(i.obs) : '')).join('<br>')}</td></tr>` : ''}
      <tr><th>Características observadas</th><td>${escaparHtml(l.caracteristicas || '—')}</td></tr>
      <tr><th>Observações</th><td>${escaparHtml(l.obs || '—')}</td></tr></table>`).join('') : '<p>Nenhum animal cadastrado.</p>'}

    <h2>6. Orientações apresentadas pelo aplicativo</h2>
    <ul>${gerarOrientacoes(ocorr).map(o => `<li><b>${escaparHtml(o.titulo)}:</b> ${escaparHtml(o.texto)} <i>Motivo: ${escaparHtml(o.motivo)}</i></li>`).join('')}</ul>

    <h2>7. Manejo e procedimentos</h2>
    ${tab(CHECKLIST_OPERACIONAL.map(c => ['Checklist: ' + c.titulo.toLowerCase(), c.itens.map(([k, t]) => (ocorr.manejo.checklist[k] ? '☑ ' : '☐ ') + t).join('\n')]).concat([
      ['Acondicionamento', rotuloDe(ACONDICIONAMENTOS, ocorr.manejo.acondicionamento) + (ocorr.manejo.acondicionamentoObs ? ' — ' + ocorr.manejo.acondicionamentoObs : '')],
      ['Procedimentos realizados', ocorr.manejo.procedimentos]])).replace(/\n/g, '<br>')}

    <h2>8. Encaminhamento e destino</h2>
    ${tab([['Destino', rotuloDe(DESTINOS, E.destino)], ['Instituição', E.instituicaoNome], ['Recebido por', E.responsavel], ['Função de quem recebeu', E.responsavelFuncao], ['Registro na instituição', E.responsavelRegistro], ['CRMV ou documento', E.responsavelDoc],
      ['Data e horário', E.dataHora ? formatarDataHora(E.dataHora) : ''], ['Condição do animal', E.condicao], ['Observações', E.obs],
      ['Verificações no transporte', textoMonitoramento(ocorr)]]).replace(/\n/g, '<br>')}

    <h2>9. Fotografias (${ativas.length})</h2>
    ${ativas.length ? `<div class="rel-fotos">${ativas.map((f, i) => `<figure><img src="${urlDe(arquivoExibicao(f))}" alt="Foto ${i + 1}">
      <figcaption><b>Foto ${i + 1} — ${escaparHtml(f.vinculo)}</b><br>${escaparHtml(ETAPAS_FOTO[f.etapa] || '')} · ${formatarDataHora(f.ts)}<br>
      ${f.lat != null ? f.lat.toFixed(5) + ', ' + f.lng.toFixed(5) + (f.origemLocal === 'exif' ? ' (EXIF)' : '') + '<br>' : ''}Autor: ${escaparHtml(f.autor)}
      ${Exif.resumo(f.exif).filter(([k]) => k !== 'GPS da foto (EXIF)').map(([k, v]) => '<br>' + escaparHtml(k) + ': ' + escaparHtml(v)).join('')}${f.obs ? '<br>Obs.: ' + escaparHtml(f.obs) : ''}${f.recorte ? '<br><i>Cópia recortada em ' + formatarDataHora(f.recorte.ts) + '; original preservado.</i>' : ''}
      ${f.hash ? '<br><span class="hash">SHA-256: ' + escaparHtml(f.hash) + '</span>' : ''}</figcaption></figure>`).join('')}</div>` : '<p>Nenhuma fotografia registrada.</p>'}
    ${excluidas.length ? `<p><b>Fotografias excluídas (${excluidas.length}):</b></p><ul>${excluidas.map(f => `<li>${escaparHtml(f.vinculo)} — incluída em ${formatarDataHora(f.ts)}, excluída em ${formatarDataHora(f.excluidaEm)}. Motivo: ${escaparHtml(f.motivoExclusao)}</li>`).join('')}</ul>` : ''}

    <h2>10. Observações adicionais</h2>
    <p>${escaparHtml(ocorr.observacoes || '—')}</p>
    ${pend.length ? `<p><b>Itens não informados:</b> ${escaparHtml(pend.map(p => p[0]).join('; '))}.</p>` : ''}

    <h2>11. Horários e histórico de registros</h2>
    ${tab(linhasTempos(ocorr))}
    <table>${ocorr.log.map(x => `<tr><td style="width:34%">${formatarDataHora(x.ts)}</td><td>${escaparHtml(x.acao)}${x.detalhe ? ' — ' + escaparHtml(x.detalhe) : ''}</td></tr>`).join('')}</table>

    <div class="assin"><div>${escaparHtml(u.nome || 'Responsável pelo registro')}<br>${escaparHtml(u.matricula || '')}</div><div>${escaparHtml(E.responsavel || 'Responsável pelo recebimento')}<br>${escaparHtml([E.responsavelFuncao, E.responsavelDoc].filter(Boolean).join(' · '))}${E.responsavelFuncao || E.responsavelDoc ? '<br>' : ''}${escaparHtml(E.instituicaoNome || '')}</div></div>

    <p class="aviso-rel">Documento auxiliar gerado pelo aplicativo SISTRAFA a partir das informações registradas pelo próprio usuário, armazenadas apenas no aparelho.
    Não substitui boletins de ocorrência, documentos oficiais, protocolos institucionais ou procedimentos formais de cadeia de custódia.
    As orientações têm caráter de apoio e não substituem a avaliação de profissionais especializados. Gerado em ${formatarDataHora(new Date().toISOString())}.</p>
  </div>`;

  return `<main class="tela">
    <div class="topo">
      <a class="botao botao-icone" href="#/ocorrencias" aria-label="Voltar para ocorrências">${icone('esquerda')}</a>
      <h1>Relatório<span class="sub">${escaparHtml(ocorr.numero)}</span></h1>
    </div>
    <div class="nao-imprimir">
      ${ocorr.status === 'encerrada' ? avisoHtml({ nivel: 'ok', titulo: 'Ocorrência encerrada', texto: 'Salve o PDF e decida se vai compartilhá-lo.' }) : avisoHtml({ nivel: 'atencao', titulo: 'Rascunho', texto: 'Esta ocorrência ainda está em andamento.' })}
      <button class="botao botao-primario botao-bloco mb-3" data-acao="pdf-baixar">${icone('baixar')} Gerar e baixar PDF</button>
      <div class="linha-btns mb-4">
        <button class="botao" data-acao="pdf-compartilhar">${icone('compartilhar')} Compartilhar PDF</button>
        <button class="botao" data-acao="compartilhar">${icone('arquivo')} Resumo em texto</button>
        <button class="botao" data-acao="imprimir">${icone('imprimir')} Imprimir</button>
      </div>
      <p class="nota mb-4">O PDF é gerado no próprio aparelho, sem internet. Você decide se e com quem compartilhá-lo.</p>
      ${ocorr.status === 'encerrada'
        ? `<button class="botao botao-bloco mb-4" data-acao="reabrir">${icone('editar')} Reabrir para correção</button>`
        : `<a class="botao botao-bloco mb-4" href="#/ocorrencia/${ocorr.id}">${icone('editar')} Continuar ocorrência</a>`}
    </div>
    ${html}
  </main>`;
}

function textoResumo(ocorr) {
  const E = ocorr.encaminhamento;
  return [`SISTRAFA — Ocorrência ${ocorr.numero}`,
    `Abertura: ${formatarDataHora(ocorr.criadaEm)}${ocorr.encerradaEm ? ' | Encerramento: ' + formatarDataHora(ocorr.encerradaEm) : ''}`,
    `Responsável: ${ocorr.usuario.nome} (${ocorr.usuario.instituicao || ''})`,
    `Local: ${ocorr.local.endereco || ''}${ocorr.local.lat != null ? ' [' + ocorr.local.lat.toFixed(5) + ', ' + ocorr.local.lng.toFixed(5) + ']' : ''}`,
    `Motivo: ${ocorr.motivo === 'outro' ? ocorr.motivoOutro : rotuloDe(MOTIVOS, ocorr.motivo)}`,
    `Animais (${totalAnimais(ocorr)}): ` + ocorr.lotes.map(l => `${l.rotulo} — ${(l.especies || []).map(e => e.nome + ' x' + (e.qtd || 0)).join(', ')}`).join('; '),
    `Destino: ${rotuloDe(DESTINOS, E.destino)}${E.instituicaoNome ? ' — ' + E.instituicaoNome : ''}${E.responsavel ? ' (recebido por ' + [E.responsavel, E.responsavelFuncao, E.responsavelDoc].filter(Boolean).join(', ') + ')' : ''}`,
    `Duração do atendimento: ${formatarDuracao(resumoTempos(ocorr).total)}`,
    'Documento auxiliar. Não substitui documentos oficiais.'].join('\n');
}
