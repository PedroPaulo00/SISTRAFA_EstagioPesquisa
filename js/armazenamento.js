/* SISTRAFA — armazenamento local (offline, somente no aparelho) */
'use strict';

const ArmazemLocal = {
  ler(chave, padrao) {
    try { const v = localStorage.getItem('sistrafa.' + chave); return v === null ? padrao : JSON.parse(v); }
    catch (e) { return padrao; }
  },
  gravar(chave, valor) {
    try { localStorage.setItem('sistrafa.' + chave, JSON.stringify(valor)); return true; }
    catch (e) {
      console.error(e);
      const cheio = e && (e.name === 'QuotaExceededError' || e.code === 22);
      const msg = cheio ? 'Sem espaço no aparelho: os dados não foram salvos. Libere espaço e tente de novo.' : 'Não foi possível gravar no aparelho: os dados não foram salvos.';
      if (typeof notificar === 'function') notificar(msg, 'erro'); else alert(msg);
      return false;
    }
  },
  apagar(chave) { try { localStorage.removeItem('sistrafa.' + chave); } catch (e) {} }
};

const gerarId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- Perfil e configurações ---------- */
const Perfil = {
  obter: () => ArmazemLocal.ler('perfil', null),
  salvar: p => ArmazemLocal.gravar('perfil', p)
};

const Ajustes = {
  padrao: { fonte: 'normal', contraste: false, localizacaoAuto: true, tema: 'escuro' },
  obter() { return Object.assign({}, this.padrao, ArmazemLocal.ler('config', {})); },
  salvar(c) { ArmazemLocal.gravar('config', c); }
};

/* ---------- Ocorrências ---------- */
const Ocorrencias = {
  todas() { return ArmazemLocal.ler('ocorrencias', []).map(o => this.completar(o)); },
  /* ocorrências gravadas por versões anteriores (ou importadas) recebem os campos que faltam */
  completar(o) {
    if (!o || typeof o !== 'object') return o;
    o.local = Object.assign({ endereco: '', referencia: '', lat: null, lng: null, precisao: null }, o.local);
    o.respostas = o.respostas || {};
    o.lotes = (o.lotes || []).map(l => Object.assign({ grupo: '', especies: [], estado: 'vivo', situacao: '', condicoes: [], comportamentos: [], riscos: [], individuos: [], caracteristicas: '', obs: '' }, l));
    o.manejo = Object.assign({ checklist: {}, acondicionamento: '', acondicionamentoObs: '', procedimentos: '' }, o.manejo);
    o.manejo.checklist = o.manejo.checklist || {};
    o.encaminhamento = Object.assign({ destino: '', instituicaoId: '', instituicaoNome: '', responsavel: '', responsavelFuncao: '', responsavelRegistro: '', responsavelDoc: '', dataHora: '', condicao: '', obs: '', monitoramento: [] }, o.encaminhamento);
    o.encaminhamento.monitoramento = o.encaminhamento.monitoramento || [];
    o.fotosChecklist = o.fotosChecklist || {};
    o.observacoes = o.observacoes || '';
    o.log = o.log || [];
    return o;
  },
  obter(id) { return this.todas().find(o => o.id === id) || null; },
  salvar(ocorr) {
    const lista = this.todas();
    ocorr.atualizadaEm = new Date().toISOString();
    const i = lista.findIndex(o => o.id === ocorr.id);
    if (i >= 0) lista[i] = ocorr; else lista.unshift(ocorr);
    return ArmazemLocal.gravar('ocorrencias', lista);
  },
  excluir(id) { ArmazemLocal.gravar('ocorrencias', this.todas().filter(o => o.id !== id)); },
  proximoNumero() {
    const hoje = new Date();
    const ymd = hoje.getFullYear() + String(hoje.getMonth() + 1).padStart(2, '0') + String(hoje.getDate()).padStart(2, '0');
    const seq = ArmazemLocal.ler('seq', {});
    seq[ymd] = (seq[ymd] || 0) + 1;
    ArmazemLocal.gravar('seq', seq);
    return 'SIS-' + ymd + '-' + String(seq[ymd]).padStart(3, '0');
  },
  criar(perfil) {
    const agora = new Date().toISOString();
    const ocorr = {
      id: gerarId(), numero: this.proximoNumero(), status: 'andamento', etapa: 0,
      criadaEm: agora, atualizadaEm: agora, encerradaEm: null,
      usuario: Object.assign({}, perfil, { pinHash: undefined }),
      local: { endereco: '', referencia: '', lat: null, lng: null, precisao: null },
      ambiente: '', motivo: '', motivoOutro: '',
      respostas: {},
      lotes: [],
      manejo: { checklist: {}, acondicionamento: '', acondicionamentoObs: '', procedimentos: '' },
      encaminhamento: { destino: '', instituicaoId: '', instituicaoNome: '', responsavel: '', responsavelFuncao: '', responsavelRegistro: '', responsavelDoc: '', dataHora: '', condicao: '', obs: '', monitoramento: [] },
      fotosChecklist: {},
      observacoes: '',
      log: [{ ts: agora, acao: 'Ocorrência aberta', usuario: perfil.nome }]
    };
    this.salvar(ocorr);
    return ocorr;
  },
  registrar(ocorr, acao, detalhe) {
    ocorr.log = ocorr.log || [];
    const item = { ts: new Date().toISOString(), acao, detalhe: detalhe || '', usuario: (Perfil.obter() || {}).nome || '' };
    ocorr.log.push(item);
    return item;
  }
};

/* ---------- Contatos personalizados ---------- */
const Contatos = {
  personalizados: () => ArmazemLocal.ler('contatos', []),
  todos() {
    const ocultos = ArmazemLocal.ler('contatosOcultos', []);
    const editados = ArmazemLocal.ler('contatosEditados', {});
    const padrao = CONTATOS_PADRAO.filter(c => !ocultos.includes(c.id)).map(c => Object.assign({}, c, editados[c.id] || {}));
    return padrao.concat(this.personalizados().map(c => Object.assign({ proprio: true }, c)));
  },
  obter(id) { return this.todos().find(c => c.id === id) || null; },
  salvar(c) {
    if (CONTATOS_PADRAO.some(p => p.id === c.id)) {
      const ed = ArmazemLocal.ler('contatosEditados', {}); ed[c.id] = Object.assign({}, c); ArmazemLocal.gravar('contatosEditados', ed); return;
    }
    const lista = this.personalizados();
    const i = lista.findIndex(x => x.id === c.id);
    if (i >= 0) lista[i] = c; else lista.push(c);
    ArmazemLocal.gravar('contatos', lista);
  },
  excluir(id) {
    if (CONTATOS_PADRAO.some(p => p.id === id)) { const o = ArmazemLocal.ler('contatosOcultos', []); o.push(id); ArmazemLocal.gravar('contatosOcultos', o); return; }
    ArmazemLocal.gravar('contatos', this.personalizados().filter(c => c.id !== id));
  },
  restaurarPadrao() { ArmazemLocal.apagar('contatosOcultos'); ArmazemLocal.apagar('contatosEditados'); }
};

/* ---------- Fotografias (IndexedDB — preserva o arquivo original) ---------- */
const Fotos = {
  _db: null,
  abrir() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolver, rejeitar) => {
      const requisicao = indexedDB.open('sistrafa', 1);
      requisicao.onupgradeneeded = () => {
        const deposito = requisicao.result.createObjectStore('fotos', { keyPath: 'id' });
        deposito.createIndex('occId', 'occId');
      };
      requisicao.onsuccess = () => {
        this._db = requisicao.result;
        // outra aba atualizando o banco: fecha esta conexão e reabre na próxima operação
        this._db.onversionchange = () => { this._db.close(); this._db = null; };
        this._db.onclose = () => { this._db = null; };
        resolver(this._db);
      };
      requisicao.onerror = () => rejeitar(requisicao.error);
      requisicao.onblocked = () => rejeitar(new Error('O banco de fotos está em uso em outra aba. Feche as outras abas do SISTRAFA.'));
    });
  },
  async _transacao(modo, fn) {
    const db = await this.abrir();
    return new Promise((resolver, rejeitar) => {
      const tx = db.transaction('fotos', modo);
      const r = fn(tx.objectStore('fotos'));
      tx.oncomplete = () => resolver(r && r.result !== undefined ? r.result : undefined);
      tx.onerror = () => rejeitar(tx.error);
      // falta de espaço cancela a transação sem disparar "error": sem isto a promessa nunca terminaria
      tx.onabort = () => rejeitar(tx.error || new Error('A gravação foi cancelada pelo navegador.'));
    });
  },
  adicionar(foto) { return this._transacao('readwrite', deposito => deposito.add(foto)); },     // add: nunca substitui silenciosamente
  atualizarMeta(foto) { return this._transacao('readwrite', deposito => deposito.put(foto)); },
  obter(id) { return this._transacao('readonly', deposito => deposito.get(id)); },
  todas() { return this._transacao('readonly', deposito => deposito.getAll()); },
  async daOcorrencia(occId) {
    const db = await this.abrir();
    return new Promise((resolver, rejeitar) => {
      const requisicao = db.transaction('fotos').objectStore('fotos').index('occId').getAll(occId);
      requisicao.onsuccess = () => resolver((requisicao.result || []).sort((a, b) => (a.ts || '').localeCompare(b.ts || '')));
      requisicao.onerror = () => rejeitar(requisicao.error);
    });
  },
  async apagarDaOcorrencia(occId) {
    const fotos = await this.daOcorrencia(occId);
    await this._transacao('readwrite', deposito => { fotos.forEach(f => deposito.delete(f.id)); });
  },
  limparTudo() { return this._transacao('readwrite', deposito => deposito.clear()); }
};

/* ---------- Utilidades ---------- */
async function hashTexto(texto) {
  try {
    if (crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  let h = 5381; for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return 'djb2-' + (h >>> 0).toString(16);
}

async function hashArquivo(blob) {
  try {
    if (crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  return '';
}

function obterLocalizacao(timeout) {
  return new Promise(resolver => {
    if (!navigator.geolocation) return resolver(null);
    navigator.geolocation.getCurrentPosition(
      p => resolver({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: Math.round(p.coords.accuracy) }),
      () => resolver(null),
      { enableHighAccuracy: true, timeout: timeout || 10000, maximumAge: 60000 }
    );
  });
}

function distanciaKm(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
