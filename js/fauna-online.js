/* SISTRAFA — dados on-line de fauna (API pública do iNaturalist, com resumo da Wikipédia em pt-BR)
   Tudo o que for consultado fica guardado no aparelho para uso posterior sem internet. */
'use strict';

const FaunaOnline = {
  BASE: 'https://api.inaturalist.org/v1',
  CACHE_IMAGENS: 'sistrafa-fauna-img',
  // grupos iNaturalist → grupos do SISTRAFA
  ICONICOS: { Aves: 'aves', Mammalia: 'mamiferos', Reptilia: 'repteis', Amphibia: 'anfibios', Arachnida: 'outros', Insecta: 'outros', Mollusca: 'outros' },
  ICONICOS_POR_GRUPO: { aves: 'Aves', mamiferos: 'Mammalia', repteis: 'Reptilia', anfibios: 'Amphibia', outros: 'Arachnida,Insecta' },
  SITUACAO_CONSERVACAO: { LC: 'Pouco preocupante', NT: 'Quase ameaçada', VU: 'Vulnerável', EN: 'Em perigo', CR: 'Criticamente em perigo', EW: 'Extinta na natureza', EX: 'Extinta', DD: 'Dados insuficientes', NE: 'Não avaliada' },
  REGIAO_PADRAO: { lat: -25.3935, lng: -51.4562, nome: 'Guarapuava - PR' },

  _cacheLer(chave) { try { return JSON.parse(localStorage.getItem('sistrafa.api.' + chave)); } catch (e) { return null; } },
  /* Só os campos usados pelo app vão para o aparelho: a resposta completa da API chega a dezenas de
     vezes esse tamanho e enchia o localStorage, que também guarda as ocorrências. */
  CAMPOS_CACHE: new Set(['ts', 'dados', 'results', 'total_results', 'id', 'name', 'preferred_common_name', 'rank', 'iconic_taxon_name',
    'default_photo', 'observations_count', 'taxon_photos', 'photo', 'url', 'medium_url', 'square_url', 'attribution', 'license_code',
    'wikipedia_summary', 'wikipedia_url', 'ancestors', 'conservation_statuses', 'status', 'authority', 'place', 'display_name', 'count', 'taxon']),
  _cacheGravar(chave, dados) {
    const campos = this.CAMPOS_CACHE;
    const texto = JSON.stringify({ ts: Date.now(), dados }, function (k, v) { return k === '' || Array.isArray(this) || campos.has(k) ? v : undefined; });
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      try { localStorage.setItem('sistrafa.api.' + chave, texto); return; }
      catch (e) {
        // sem espaço: apaga a consulta salva mais antiga (nunca a lista de fotos do guia) e tenta de novo
        const antigas = Object.keys(localStorage).filter(k => k.startsWith('sistrafa.api.') && k !== 'sistrafa.api.guia.lista' && k !== 'sistrafa.api.' + chave)
          .map(k => [k, (this._cacheLer(k.slice(13)) || {}).ts || 0]).sort((x, y) => x[1] - y[1]);
        if (!antigas.length) return;
        localStorage.removeItem(antigas[0][0]);
      }
    }
  },
  limparCache() { Object.keys(localStorage).filter(k => k.startsWith('sistrafa.api.')).forEach(k => localStorage.removeItem(k)); },
  tamanhoCache() { return Object.keys(localStorage).filter(k => k.startsWith('sistrafa.api.')).length; },

  /* GET com cache: usa o cache se for recente; sem internet, devolve o último dado salvo */
  async _buscarJson(caminho, chave, validadeHoras) {
    const c = this._cacheLer(chave);
    if (c && Date.now() - c.ts < (validadeHoras || 168) * 3600e3) return Object.assign({ _cache: true }, { dados: c.dados });
    try {
      // tempo-limite de 15 s (AbortController não existe em navegadores muito antigos)
      const controle = typeof AbortController === 'function' ? new AbortController() : null;
      const tempo = setTimeout(() => controle && controle.abort(), 15000);
      const r = await fetch(this.BASE + caminho, { signal: controle ? controle.signal : undefined, headers: { Accept: 'application/json' } });
      clearTimeout(tempo);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      this._cacheGravar(chave, j);
      return { dados: j };
    } catch (e) {
      if (c) return { dados: c.dados, _cache: true, _offline: true };
      throw new Error(navigator.onLine ? 'Não foi possível consultar a base on-line.' : 'Sem conexão com a internet.');
    }
  },

  _textoHtml(html) {
    if (!html) return '';
    return (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
  },

  _foto(p) {
    if (!p) return null;
    const url = p.medium_url || (p.url || '').replace('/square.', '/medium.');
    return { url, grande: (p.url || url).replace(/\/(square|small|medium)\./, '/large.'), mini: p.square_url || p.url, atribuicao: this._creditoPt(p.attribution || ''), licenca: p.license_code || 'todos os direitos reservados' };
  },

  /* crédito da foto em português (a API devolve em inglês) */
  _creditoPt(t) {
    return t.replace(/no rights reserved/i, 'sem direitos reservados').replace(/some rights reserved/i, 'alguns direitos reservados')
      .replace(/all rights reserved/i, 'todos os direitos reservados').replace(/uploaded by/i, 'enviada por');
  },

  _taxonLeve(t) {
    return {
      id: t.id, nome: t.preferred_common_name || t.name, cientifico: t.name, rank: t.rank,
      iconico: t.iconic_taxon_name, grupo: this.ICONICOS[t.iconic_taxon_name] || 'naoid',
      foto: this._foto(t.default_photo), observacoes: t.observations_count
    };
  },

  async buscar(termo) {
    const q = encodeURIComponent(termo.trim());
    const r = await this._buscarJson(`/taxa/autocomplete?q=${q}&locale=pt-BR&per_page=20&is_active=true`, 'busca.' + termo.trim().toLowerCase(), 72);
    return (r.dados.results || [])
      .filter(t => this.ICONICOS[t.iconic_taxon_name] && ['species', 'subspecies', 'genus'].includes(t.rank))
      .map(t => this._taxonLeve(t));
  },

  async taxon(id) {
    const r = await this._buscarJson(`/taxa/${id}?locale=pt-BR`, 'taxon.' + id, 720);
    const t = (r.dados.results || [])[0];
    if (!t) throw new Error('Espécie não encontrada na base on-line.');
    const leve = this._taxonLeve(t);
    const anc = (t.ancestors || []).reduce((o, a) => { o[a.rank] = a.preferred_common_name ? `${a.preferred_common_name} (${a.name})` : a.name; return o; }, {});
    return Object.assign(leve, {
      fotos: (t.taxon_photos || []).slice(0, 8).map(tp => this._foto(tp.photo)).filter(Boolean),
      resumo: this._textoHtml(t.wikipedia_summary),
      wikipedia: t.wikipedia_url || '',
      classificacao: { classe: anc.class, ordem: anc.order, familia: anc.family },
      status: (t.conservation_statuses || []).map(s => ({
        codigo: (s.status || '').toUpperCase(), texto: this.SITUACAO_CONSERVACAO[(s.status || '').toUpperCase()] || s.status,
        fonte: s.authority || '', local: s.place ? s.place.display_name || s.place.name : 'Global'
      })).slice(0, 5),
      url: 'https://www.inaturalist.org/taxa/' + t.id,
      offline: !!r._offline
    });
  },

  async porNomeCientifico(nome) {
    const chave = 'nome.' + nome.toLowerCase();
    const salvo = this._cacheLer(chave);
    let id = salvo && salvo.dados;
    if (!id) {
      const r = await this._buscarJson(`/taxa?q=${encodeURIComponent(nome)}&per_page=5&is_active=true`, 'q.' + nome.toLowerCase(), 720);
      const lista = r.dados.results || [];
      const t = lista.find(x => x.name.toLowerCase() === nome.toLowerCase()) || lista[0];
      if (!t) throw new Error('Espécie não encontrada na base on-line.');
      id = t.id; this._cacheGravar(chave, id);
    }
    return this.taxon(id);
  },

  /* Fotos de referência de todas as espécies do guia em UMA consulta leve (cerca de 35 KB),
     guardada por 30 dias. As imagens ficam no cache do aparelho depois de vistas uma vez. */
  _fotosGuia: null,
  fotoGuia(especie) {
    if (!especie || !especie.inat) return null;
    if (!this._fotosGuia) {
      const c = this._cacheLer('guia.lista');
      if (c && c.dados) this._fotosGuia = this._mapaFotos(c.dados);
    }
    return this._fotosGuia ? this._fotosGuia[especie.inat] || null : null;
  },
  _mapaFotos(dados) {
    const mapa = {};
    (dados.results || []).forEach(t => { const f = this._foto(t.default_photo); if (f) mapa[t.id] = f; });
    return mapa;
  },
  async carregarFotosGuia() {
    const ids = ESPECIES.map(e => e.inat).filter(Boolean);
    const r = await this._buscarJson(`/taxa?id=${ids.join(',')}&per_page=${ids.length}&locale=pt-BR`, 'guia.lista', 720);
    this._fotosGuia = this._mapaFotos(r.dados);
    return this._fotosGuia;
  },

  async daRegiao(posicao, grupo, raioKm) {
    const icon = grupo ? this.ICONICOS_POR_GRUPO[grupo] : 'Aves,Mammalia,Reptilia,Amphibia';
    const lat = posicao.lat.toFixed(2), lng = posicao.lng.toFixed(2), raio = raioKm || 50;
    const r = await this._buscarJson(`/observations/species_counts?lat=${lat}&lng=${lng}&radius=${raio}&iconic_taxa=${icon}&quality_grade=research&locale=pt-BR&per_page=60`,
      `regiao.${lat}.${lng}.${raio}.${grupo || 'todos'}`, 168);
    return { total: r.dados.total_results, offline: !!r._offline, lista: (r.dados.results || []).map(x => Object.assign(this._taxonLeve(x.taxon), { registros: x.count })) };
  },

  /* guarda imagens no aparelho para exibição sem internet */
  async guardarImagens(urls) {
    if (!window.caches) return 0;
    const c = await caches.open(this.CACHE_IMAGENS);
    let n = 0;
    for (const u of urls.filter(Boolean)) {
      try {
        // cache.add recusa imagens de outro site (resposta opaca); fetch + put guarda mesmo assim
        if (!(await c.match(u))) await c.put(u, await fetch(u, { mode: 'no-cors', referrerPolicy: 'no-referrer' }));
        n++;
      } catch (e) {}
    }
    return n;
  },

  /* baixa dados e fotos das espécies do catálogo local para uso em campo */
  async baixarCatalogo(aoProgredir) {
    let ok = 0;
    // primeiro as fotos principais da lista do guia (miniatura e tamanho médio)
    try {
      const mapa = await this.carregarFotosGuia();
      await this.guardarImagens(Object.keys(mapa).reduce((urls, k) => urls.concat([mapa[k].mini, mapa[k].url]), []));
    } catch (err) {}
    for (let i = 0; i < ESPECIES.length; i++) {
      const e = ESPECIES[i];
      try {
        const nome = e.cientifico.replace(/ spp\.?$/, '').replace(/^Ordem /, '');
        const t = await this.porNomeCientifico(nome);
        await this.guardarImagens(t.fotos.slice(0, 3).map(f => f.url));
        ok++;
      } catch (err) {}
      if (aoProgredir) aoProgredir(i + 1, ESPECIES.length);
    }
    return ok;
  }
};

/* versões anteriores guardavam a resposta completa da API: na primeira abertura desta versão, cada consulta
   salva é regravada só com os campos usados (o que já foi baixado continua disponível sem internet).
   Ocorrências e perfil não são tocados. */
(function enxugarCacheAntigo() {
  try {
    if (localStorage.getItem('sistrafa.formato-cache') === '2') return;
    const campos = FaunaOnline.CAMPOS_CACHE;
    Object.keys(localStorage).filter(k => k.startsWith('sistrafa.api.')).forEach(k => {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        localStorage.setItem(k, JSON.stringify(v, function (c, x) { return c === '' || Array.isArray(this) || campos.has(c) ? x : undefined; }));
      } catch (e) { localStorage.removeItem(k); }
    });
    localStorage.setItem('sistrafa.formato-cache', '2');
  } catch (e) {}
})();
