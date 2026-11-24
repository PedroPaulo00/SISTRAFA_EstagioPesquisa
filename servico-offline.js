/* SISTRAFA — service worker: mantém o app disponível offline */
const VERSAO = 'sistrafa-v19';
const CACHE_IMAGENS = 'sistrafa-fauna-img';   // fotos de referência do guia (mesmo nome usado em js/fauna-online.js)
const CACHE_DADOS = 'sistrafa-fauna-api';
const ARQUIVOS = [
  './', './index.html', './manifest.webmanifest', './css/estilos.css',
  './recursos/logo.png', './recursos/fundo-floresta.jpg',
  './recursos/logos/pmpr.png', './recursos/logos/cbmpr.png', './recursos/logos/samu.png', './recursos/logos/sus.png', './recursos/logos/anvisa.png', './recursos/logos/ibama.png', './recursos/logos/unicentro.png', './recursos/logos/iat.png',
  './recursos/fontes/Frutiger.woff', './recursos/fontes/Frutiger_bold.woff', './recursos/fontes/Frutiger.ttf', './recursos/fontes/Frutiger_bold.ttf', './recursos/icone-192.png', './recursos/icone-512.png',
  './js/bibliotecas/jspdf.umd.min.js', './js/bibliotecas/jspdf.plugin.autotable.min.js',
  './js/dados.js', './js/armazenamento.js', './js/exif.js', './js/fauna-online.js', './js/interface.js', './js/relatorio-pdf.js', './js/ocorrencia.js', './js/aplicativo.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  const manter = [VERSAO, CACHE_IMAGENS, CACHE_DADOS];
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !manter.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const ehImagemFauna = url => /(^|\.)inaturalist\.org$|inaturalist-open-data\.s3\.amazonaws\.com$|wikimedia\.org$/.test(url.hostname) && !url.hostname.startsWith('api.');
const ehDadosFauna = url => url.hostname === 'api.inaturalist.org';

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // fotos de referência: cache primeiro (não mudam), rede se faltar
  if (ehImagemFauna(url)) {
    e.respondWith(caches.open(CACHE_IMAGENS).then(async c => {
      const salvo = await c.match(e.request);
      if (salvo) return salvo;
      try {
        const r = await fetch(e.request);
        if (r.ok || r.type === 'opaque') c.put(e.request, r.clone());   // não guarda respostas de erro
        return r;
      } catch (err) { return Response.error(); }
    }));
    return;
  }

  // API de fauna: rede primeiro, cache como reserva
  if (ehDadosFauna(url)) {
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE_DADOS).then(c => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || Response.error())));
    return;
  }

  // arquivos do app: rede primeiro (recebe atualizações), cache quando offline
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(e.request).then(r => {
      // só respostas válidas substituem a cópia offline (um 404 ou 500 não apaga o arquivo bom)
      if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })
      .then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
  }
});
