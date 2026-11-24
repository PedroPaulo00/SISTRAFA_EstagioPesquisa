/* SISTRAFA — geração do relatório em PDF no próprio aparelho (jsPDF + AutoTable) */
'use strict';

const RelatorioPDF = {
  PETROLEO: [5, 97, 75], ESCURO: [2, 14, 14], MENTA: [1, 222, 130], CINZA: [243, 248, 246],
  _logo: null,

  // troca caracteres que não existem nas fontes do PDF (ou que o jsPDF não desenha)
  limparTexto(s) {
    return String(s == null || s === '' ? '—' : s)
      .replace(/·/g, '•')   // com a Frutiger, o jsPDF interrompe o texto no '·'
      .replace(/→/g, '->').replace(/[☑✓]/g, '[x]').replace(/☐/g, '[ ]').replace(/×/g, 'x')
      .replace(/[^\x00-\xFF–—‘’“”•…€]/g, '');
  },

  async _imagemParaDataUrl(src, max, tipo, qualidade) {
    const img = await new Promise((resolver, rejeitar) => { const i = new Image(); i.onload = () => resolver(i); i.onerror = rejeitar; i.src = src; });
    const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * escala); c.height = Math.round(img.naturalHeight * escala);
    const g = c.getContext('2d');
    if (tipo === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(img, 0, 0, c.width, c.height);
    return { url: c.toDataURL(tipo, qualidade), w: c.width, h: c.height };
  },

  /* Frutiger embutida no PDF (arquivos .ttf locais). Se não carregar, usa Helvetica. */
  _fontes: null,
  async _carregarFontes() {
    if (this._fontes !== null) return this._fontes;
    const b64 = async url => {
      const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
      let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192));
      return btoa(s);
    };
    try { this._fontes = { normal: await b64('recursos/fontes/Frutiger.ttf'), bold: await b64('recursos/fontes/Frutiger_bold.ttf') }; }
    catch (e) { console.warn('Frutiger indisponível no PDF, usando Helvetica', e); this._fontes = false; }
    return this._fontes;
  },

  /* As bibliotecas de PDF (cerca de 400 KB) só são carregadas quando o primeiro relatório é gerado:
     o app abre mais rápido, principalmente em celulares simples. Sem internet, vêm do cache do app. */
  _bibliotecas: null,
  carregarBibliotecas() {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) return Promise.resolve();
    if (this._bibliotecas) return this._bibliotecas;
    const script = src => new Promise((ok, erro) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Não foi possível carregar ' + src));
      document.head.appendChild(s);
    });
    this._bibliotecas = script('js/bibliotecas/jspdf.umd.min.js').then(() => script('js/bibliotecas/jspdf.plugin.autotable.min.js'))
      .catch(e => { this._bibliotecas = null; throw e; });
    return this._bibliotecas;
  },

  async logo() {
    if (!this._logo) this._logo = await this._imagemParaDataUrl('recursos/logo.png', 220, 'image/png');
    return this._logo;
  },

  async gerar(ocorr, fotos) {
    await this.carregarBibliotecas();
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Biblioteca de PDF não carregada.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const T = this.limparTexto.bind(this);
    const M = 14, L = 210 - 2 * M;
    const u = ocorr.usuario || {}, r = ocorr.respostas || {}, E = ocorr.encaminhamento;
    const logo = await this.logo().catch(() => null);
    const ativas = fotos.filter(f => !f.excluida), excluidas = fotos.filter(f => f.excluida);
    const fontes = await this._carregarFontes();
    let F = 'helvetica';
    if (fontes) {
      doc.addFileToVFS('Frutiger.ttf', fontes.normal); doc.addFont('Frutiger.ttf', 'Frutiger', 'normal');
      doc.addFileToVFS('Frutiger_bold.ttf', fontes.bold); doc.addFont('Frutiger_bold.ttf', 'Frutiger', 'bold');
      F = 'Frutiger';
    }
    doc.setFont(F, 'normal');

    doc.setProperties({ title: 'SISTRAFA ' + ocorr.numero, subject: 'Ficha auxiliar de ocorrência com fauna silvestre', author: u.nome || '', creator: 'SISTRAFA' });

    const cabecalho = () => {
      doc.setFillColor(...this.ESCURO); doc.rect(0, 0, 210, 22, 'F');
      doc.setFillColor(...this.MENTA); doc.rect(0, 22, 210, 1.2, 'F');
      if (logo) doc.addImage(logo.url, 'PNG', M, 3, 16 * logo.w / logo.h, 16);
      doc.setTextColor(255, 255, 255); doc.setFont(F, 'bold'); doc.setFontSize(12);
      doc.text(T('Ficha auxiliar de ocorrência com fauna silvestre'), M + 24, 10);
      doc.setFont(F, 'normal'); doc.setFontSize(9); doc.setTextColor(...this.MENTA);
      doc.text(T(`Nº ${ocorr.numero}  ·  ${ocorr.status === 'encerrada' ? 'Encerrada em ' + formatarDataHora(ocorr.encerradaEm) : 'Em andamento (rascunho)'}`), M + 24, 16);
      doc.setTextColor(0, 0, 0);
    };

    const tabela = (titulo, linhas, opcoes) => {
      doc.autoTable(Object.assign({
        startY: (doc.lastAutoTable ? doc.lastAutoTable.finalY : 26) + 5,
        margin: { top: 28, left: M, right: M, bottom: 18 },
        head: [[{ content: T(titulo), colSpan: 2 }]],
        body: linhas.map(([k, v]) => [T(k), T(v)]),
        theme: 'grid',
        styles: { font: F, fontSize: 8.5, cellPadding: 1.8, valign: 'top', lineColor: [210, 220, 216], lineWidth: 0.2, textColor: [20, 20, 20] },
        headStyles: { fillColor: this.PETROLEO, textColor: 255, fontStyle: 'bold', fontSize: 10 },
        columnStyles: { 0: { cellWidth: 58, fontStyle: 'bold', fillColor: this.CINZA } },
        didDrawPage: cabecalho
      }, opcoes || {}));
    };
    const perguntas = ps => ps.filter(q => !q.quando || q.quando(r)).map(q => [q.texto, respostaTexto(q, r[q.id]) || 'Sem resposta']);

    cabecalho();
    tabela('1. Identificação', [['Número da ocorrência', ocorr.numero], ['Abertura', formatarDataHora(ocorr.criadaEm)], ['Encerramento', ocorr.encerradaEm ? formatarDataHora(ocorr.encerradaEm) : ''], ['Duração do atendimento', formatarDuracao(resumoTempos(ocorr).total)],
      ['Responsável', u.nome], ['Cargo / função', u.cargo], ['Identificação funcional', u.matricula], ['Instituição', u.instituicao]]);
    tabela('2. Local e contexto', [['Endereço / descrição', ocorr.local.endereco], ['Referência', ocorr.local.referencia],
      ['Coordenadas', ocorr.local.lat != null ? `${ocorr.local.lat.toFixed(6)}, ${ocorr.local.lng.toFixed(6)} (±${ocorr.local.precisao} m)` : 'Não registradas'],
      ['Ambiente', rotuloDe(AMBIENTES, ocorr.ambiente)], ['Motivo do atendimento', ocorr.motivo === 'outro' ? ocorr.motivoOutro : rotuloDe(MOTIVOS, ocorr.motivo)]]);
    tabela('3. Checklist – avaliação de risco', perguntas(PERGUNTAS_RISCO));
    tabela('4. Checklist – contexto', perguntas(PERGUNTAS_CONTEXTO));

    if (ocorr.lotes.length) ocorr.lotes.forEach((l, i) => tabela(`5.${i + 1} ${l.rotulo} – ${l.tipo === 'lote' ? 'Lote' : 'Animal individual'} · ${(GRUPOS[l.grupo] || GRUPOS.naoid).nome}`, [
      ['Espécies e quantidades', (l.especies || []).map(e => `${e.nome}${e.cientifico ? ' (' + e.cientifico + ')' : ''}: ${e.qtd || 0} – identificação ${e.provisoria ? 'provisória' : 'confirmada'}`).join('\n')],
      ['Total', String(totalLote(l))],
      ['Estado', rotuloDe([['vivo', 'Vivo(s)'], ['morto', 'Morto(s)'], ['ambos', 'Vivos e mortos']], l.estado)],
      ['Como foi encontrado', rotuloDe(SITUACOES, l.situacao)],
      ['Condição inicial', rotulosDe(CONDICOES, l.condicoes)],
      ['Comportamento observado', rotulosDe(COMPORTAMENTOS, l.comportamentos)],
      ['Riscos identificados', rotulosDe(RISCOS_ANIMAL, l.riscos)],
      ['Indivíduos destacados', (l.individuos || []).map(x => x.rotulo + (x.obs ? ': ' + x.obs : '')).join('\n')],
      ['Características observadas', l.caracteristicas], ['Observações', l.obs]]));
    else tabela('5. Animais e lotes', [['Registros', 'Nenhum animal cadastrado']]);

    tabela('6. Orientações apresentadas pelo aplicativo', gerarOrientacoes(ocorr).map(o => [o.titulo, o.texto + '\nMotivo: ' + o.motivo]));
    tabela('7. Manejo e procedimentos', CHECKLIST_OPERACIONAL.map(c => ['Checklist: ' + c.titulo.toLowerCase(), c.itens.map(([k, t]) => (ocorr.manejo.checklist[k] ? '[x] ' : '[ ] ') + t).join('\n')]).concat([
      ['Acondicionamento', rotuloDe(ACONDICIONAMENTOS, ocorr.manejo.acondicionamento) + (ocorr.manejo.acondicionamentoObs ? ' – ' + ocorr.manejo.acondicionamentoObs : '')],
      ['Procedimentos realizados', ocorr.manejo.procedimentos]]));
    tabela('8. Encaminhamento e destino', [['Destino', rotuloDe(DESTINOS, E.destino)], ['Instituição', E.instituicaoNome], ['Recebido por', E.responsavel],
      ['Função de quem recebeu', E.responsavelFuncao], ['Registro na instituição', E.responsavelRegistro], ['CRMV ou documento', E.responsavelDoc], ['Data e horário', E.dataHora ? formatarDataHora(E.dataHora) : ''], ['Condição do animal', E.condicao], ['Observações', E.obs],
      ['Verificações no transporte', textoMonitoramento(ocorr)]]);

    // 9. Fotografias em grade de 2 colunas
    let y = doc.lastAutoTable.finalY + 8;
    const tituloSecao = (texto) => {
      if (y > 270) { doc.addPage(); cabecalho(); y = 30; }
      doc.setFillColor(...this.PETROLEO); doc.rect(M, y - 5, L, 7, 'F');
      doc.setTextColor(255); doc.setFont(F, 'bold'); doc.setFontSize(10); doc.text(T(texto), M + 2, y);
      doc.setTextColor(0); y += 6;
    };
    tituloSecao(`9. Fotografias (${ativas.length})`);
    doc.setFont(F, 'normal'); doc.setFontSize(7.5);
    if (!ativas.length) { doc.text(T('Nenhuma fotografia registrada.'), M, y + 3); y += 8; }
    const colW = (L - 6) / 2, imgH = 58;
    let alturaPar = 0;
    for (let i = 0; i < ativas.length; i++) {
      const f = ativas[i];
      const col = i % 2;
      const legenda = [`Foto ${i + 1} – ${f.vinculo}`, `${ETAPAS_FOTO[f.etapa] || ''} · ${formatarDataHora(f.ts)}`,
        f.lat != null ? `GPS: ${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}` : 'GPS: não registrado', `Autor: ${f.autor}`]
        .concat(Exif.resumo(f.exif).filter(([k]) => k !== 'Resolução').map(([k, v]) => `${k}: ${v}`))
        .concat(f.obs ? ['Obs.: ' + f.obs] : [])
        .concat(f.recorte ? [`Cópia recortada (${f.recorte.pixels.w}x${f.recorte.pixels.h} px) em ${formatarDataHora(f.recorte.ts)}; original preservado`] : [])
        .concat(f.hash ? ['SHA-256 do original: ' + f.hash] : []);
      const linhas = doc.splitTextToSize(T(legenda.join('\n')), colW);
      const blocoH = imgH + linhas.length * 3.2 + 4;
      if (col === 0 && y + blocoH > 280) { doc.addPage(); cabecalho(); y = 30; }
      const x = M + col * (colW + 6);
      try {
        const url = URL.createObjectURL(arquivoExibicao(f));
        const im = await this._imagemParaDataUrl(url, 1100, 'image/jpeg', 0.82);
        URL.revokeObjectURL(url);
        const ratio = im.w / im.h;
        let w = colW, h = colW / ratio; if (h > imgH) { h = imgH; w = imgH * ratio; }
        doc.setDrawColor(200); doc.rect(x, y, colW, imgH);
        doc.addImage(im.url, 'JPEG', x + (colW - w) / 2, y + (imgH - h) / 2, w, h);
      } catch (e) { doc.text(T('[imagem indisponível]'), x + 2, y + 10); }
      doc.text(linhas, x, y + imgH + 4);
      if (col === 0) alturaPar = blocoH;
      if (col === 1 || i === ativas.length - 1) { y += Math.max(alturaPar, blocoH) + 2; alturaPar = 0; }
    }
    if (excluidas.length) {
      doc.autoTable({ startY: y + 2, margin: { top: 28, left: M, right: M, bottom: 18 }, theme: 'grid', didDrawPage: cabecalho,
        head: [[T('Fotografias excluídas'), T('Incluída'), T('Excluída'), T('Motivo')]],
        body: excluidas.map(f => [T(f.vinculo), T(formatarDataHora(f.ts)), T(formatarDataHora(f.excluidaEm)), T(f.motivoExclusao)]),
        styles: { font: F, fontSize: 8 }, headStyles: { fillColor: [120, 120, 120] } });
      y = doc.lastAutoTable.finalY + 6;
    }
    doc.lastAutoTable.finalY = y;

    const pend = pendencias(ocorr);
    tabela('10. Observações adicionais', [['Observações', ocorr.observacoes], ['Itens não informados', pend.map(p => p[0]).join('; ') || 'Nenhum']]);
    tabela('11. Horários e histórico de registros', linhasTempos(ocorr));
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 3, margin: { top: 28, left: M, right: M, bottom: 18 }, theme: 'grid', didDrawPage: cabecalho,
      head: [[{ content: T('Histórico de registros'), colSpan: 2 }]],
      body: ocorr.log.map(x => [T(formatarDataHora(x.ts)), T(x.acao + (x.detalhe ? ' – ' + x.detalhe : ''))]),
      styles: { font: F, fontSize: 7.5, cellPadding: 1.2 }, headStyles: { fillColor: this.PETROLEO }, columnStyles: { 0: { cellWidth: 36 } }
    });

    // assinaturas
    y = doc.lastAutoTable.finalY + 26;
    if (y > 265) { doc.addPage(); cabecalho(); y = 60; }
    doc.setDrawColor(60); doc.setFontSize(8.5);
    [[u.nome || 'Responsável pelo registro', u.matricula], [E.responsavel || 'Responsável pelo recebimento', [E.responsavelFuncao, E.responsavelDoc].filter(Boolean).join(' – '), E.instituicaoNome]].forEach(([a, ...resto], i) => {
      const x = M + i * (L / 2 + 4);
      doc.line(x, y, x + L / 2 - 8, y);
      doc.text(T(a), x + (L / 2 - 8) / 2, y + 4, { align: 'center' });
      resto.filter(Boolean).forEach((b, k) => doc.text(T(b), x + (L / 2 - 8) / 2, y + 8 + k * 4, { align: 'center' }));
    });

    // rodapé em todas as páginas
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p);
      doc.setFontSize(6.8); doc.setTextColor(90);
      doc.text(doc.splitTextToSize(T('Documento auxiliar gerado pelo SISTRAFA a partir de informações registradas pelo próprio usuário e armazenadas apenas no aparelho. Não substitui boletins de ocorrência, documentos oficiais, protocolos institucionais ou procedimentos formais de cadeia de custódia. Fotografias originais preservadas no aparelho; o código SHA-256 permite verificar sua integridade. Ref.: IN Ibama nº 5/2021; Lei nº 9.605/1998.'), L - 42), M, 287);
      doc.text(T(`Página ${p} de ${n}`), 210 - M, 287, { align: 'right' });
      doc.text(T('Gerado em ' + formatarDataHora(new Date().toISOString())), 210 - M, 291, { align: 'right' });
    }
    return doc.output('blob');
  }
};
