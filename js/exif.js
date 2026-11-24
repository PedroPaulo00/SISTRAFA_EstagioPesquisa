/* SISTRAFA — extração de metadados EXIF de fotografias JPEG (sem bibliotecas externas) */
'use strict';

const Exif = {
  TAMANHOS: { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 },

  async ler(arquivo) {
    const meta = {};
    try {
      const buf = await arquivo.slice(0, 512 * 1024).arrayBuffer();
      const v = new DataView(buf);
      if (v.byteLength > 4 && v.getUint16(0) === 0xFFD8) {
        let off = 2;
        while (off < v.byteLength - 4) {
          const marcador = v.getUint16(off);
          if ((marcador & 0xFF00) !== 0xFF00 || marcador === 0xFFDA) break;
          const tam = v.getUint16(off + 2);
          if (marcador === 0xFFE1 && this._texto(v, off + 4, 4) === 'Exif') {
            Object.assign(meta, this._tiff(v, off + 10));
            break;
          }
          off += 2 + tam;
        }
      }
    } catch (e) { console.warn('EXIF não lido', e); }

    // as dimensões da imagem são lidas ao gerar a miniatura (gerarMiniatura), para decodificar a foto uma só vez
    return meta;
  },

  _texto(v, off, n) { let s = ''; for (let i = 0; i < n && off + i < v.byteLength; i++) s += String.fromCharCode(v.getUint8(off + i)); return s; },

  _tiff(v, t) {
    const le = v.getUint16(t) === 0x4949;
    const u16 = o => v.getUint16(o, le), u32 = o => v.getUint32(o, le), s32 = o => v.getInt32(o, le);
    const lerIFD = dir => {
      const etiquetas = {};
      if (dir <= 0 || dir + 2 > v.byteLength) return etiquetas;
      const n = u16(dir);
      for (let i = 0; i < n; i++) {
        const e = dir + 2 + i * 12;
        if (e + 12 > v.byteLength) break;
        const etiqueta = u16(e), tipo = u16(e + 2), qtd = u32(e + 4);
        const tam = (this.TAMANHOS[tipo] || 1) * qtd;
        const vo = tam > 4 ? t + u32(e + 8) : e + 8;
        if (vo + tam > v.byteLength) continue;
        let val;
        if (tipo === 2) val = this._texto(v, vo, qtd).replace(/\0+$/, '').trim();
        else if (tipo === 3) val = qtd === 1 ? u16(vo) : Array.from({ length: qtd }, (_, k) => u16(vo + k * 2));
        else if (tipo === 4) val = qtd === 1 ? u32(vo) : Array.from({ length: qtd }, (_, k) => u32(vo + k * 4));
        else if (tipo === 9) val = qtd === 1 ? s32(vo) : Array.from({ length: qtd }, (_, k) => s32(vo + k * 4));
        else if (tipo === 5) val = Array.from({ length: qtd }, (_, k) => u32(vo + k * 8) / (u32(vo + k * 8 + 4) || 1));
        else if (tipo === 10) val = Array.from({ length: qtd }, (_, k) => s32(vo + k * 8) / (s32(vo + k * 8 + 4) || 1));
        else val = qtd === 1 ? v.getUint8(vo) : null;
        etiquetas[etiqueta] = val;
      }
      return etiquetas;
    };

    const ifd0 = lerIFD(t + u32(t + 4));
    const exif = ifd0[0x8769] ? lerIFD(t + ifd0[0x8769]) : {};
    const gps = ifd0[0x8825] ? lerIFD(t + ifd0[0x8825]) : {};
    const m = {};
    if (ifd0[0x010F]) m.fabricante = ifd0[0x010F];
    if (ifd0[0x0110]) m.modelo = ifd0[0x0110];
    if (ifd0[0x0131]) m.software = ifd0[0x0131];
    if (ifd0[0x0112]) m.orientacao = ifd0[0x0112];
    const dt = exif[0x9003] || ifd0[0x0132];
    if (dt) m.dataOriginal = dt + (exif[0x9011] ? ' ' + exif[0x9011] : '');
    if (gps[2] && gps[4] && gps[2].length === 3) {
      const dec = a => a[0] + a[1] / 60 + a[2] / 3600;
      let lat = dec(gps[2]), lng = dec(gps[4]);
      if (gps[1] === 'S') lat = -lat;
      if (gps[3] === 'W') lng = -lng;
      if (isFinite(lat) && isFinite(lng) && (lat || lng)) m.gps = { lat, lng, alt: gps[6] ? gps[6][0] : null };
    }
    return m;
  },

  /* "2026:10:04 22:10:05" → "04/10/2026 22:10:05" */
  formatarData(s) {
    const r = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}:\d{2}:\d{2})(.*)$/.exec(s || '');
    return r ? `${r[3]}/${r[2]}/${r[1]} ${r[4]}${r[5]}` : (s || '');
  },

  resumo(m) {
    if (!m) return [];
    const l = [];
    if (m.dataOriginal) l.push(['Data original (EXIF)', this.formatarData(m.dataOriginal)]);
    if (m.fabricante || m.modelo) l.push(['Câmera', [m.fabricante, m.modelo].filter(Boolean).join(' ')]);
    if (m.largura) l.push(['Resolução', m.largura + ' × ' + m.altura + ' px']);
    if (m.gps) l.push(['GPS da foto (EXIF)', m.gps.lat.toFixed(6) + ', ' + m.gps.lng.toFixed(6)]);
    if (m.software) l.push(['Software', m.software]);
    return l;
  }
};
