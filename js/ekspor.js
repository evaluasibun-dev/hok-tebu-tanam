/*
 * Unduh form sebagai Word (.docx, dari template resmi di assets/tpl) dan Excel (.xlsx).
 * Pustaka dimuat saat dibutuhkan: JSZip (Word) dan ExcelJS (Excel).
 */
var EKSPOR = (function () {
  'use strict';
  var LIB = {
    JSZip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    ExcelJS: 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'
  };
  var TITIK = '……………………';

  function muat(nama) {
    if (window[nama]) return Promise.resolve(window[nama]);
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = LIB[nama];
      s.onload = function () { window[nama] ? ok(window[nama]) : no(new Error('Pustaka ' + nama + ' gagal dimuat')); };
      s.onerror = function () { no(new Error('Pustaka ' + nama + ' tidak dapat dimuat. Periksa koneksi internet.')); };
      document.head.appendChild(s);
    });
  }
  function unduh(blob, nama) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }
  function t(v, d) { var s = String(v === null || v === undefined ? '' : v).trim(); return s || (d === undefined ? TITIK : d); }
  function namaBerkas(F, awal, ext) { return awal + '_' + HOK.namaFolder(F.p) + '.' + ext; }

  // ------------------------------------------------------------ nilai untuk semua form
  function nilai(F) {
    var p = F.p, h = p.hit || {}, k = F.keg, kab = F.kab || {}, st = F.setting || {};
    var luasR = U.n(p.real_luas) ? U.ha(p.real_luas) : '……';
    return {
      judul: k.judul, poktan_besar: t(String(p.poktan || '').toUpperCase()), keg_besar: String(k.nama).toUpperCase(), npwp: t(p.npwp), npwp_an: t(p.npwp_an), spk3: k.spk3, sptjm: k.sptjm, frasa: k.frasa, biaya: k.biaya, jenis: k.jenis,
      tahun: t(st.tahun, '2026'), no_dipa: t(st.no_dipa), tgl_dipa: U.tgl(st.tgl_dipa), kpa: t(st.kpa),
      no_spk: t(p.no_spk), kalimat_spk: U.kalimatHari(p.tgl_spk), tempat_spk: t(p.tempat_spk), jalan_spk: t(p.jalan_spk),
      tgl_spk: U.tgl(p.tgl_spk), spk_sd: U.tgl(p.spk_sd),
      ppk: t(kab.ppk), nip_ppk: t(kab.nip_ppk), unit: t(kab.unit), bendahara: t(kab.bendahara), nip_bendahara: t(kab.nip_bendahara),
      tim_teknis: t(kab.tim_teknis), nip_tim_teknis: t(kab.nip_tim_teknis),
      jabatan_ppk: 'Pejabat Pembuat Komitmen ' + t(kab.unit) + ', yang diangkat berdasarkan Keputusan ' + t(kab.penetap) + ' Nomor: ' + t(kab.sk_ppk) +
        ' dalam hal ini bertindak untuk dan atas nama ' + t(st.kpa) + ' DIPA Tahun ' + t(st.tahun) + ' Nomor: ' + t(st.no_dipa) +
        ' tanggal ' + U.tgl(st.tgl_dipa) + ', yang berkedudukan di ' + t(kab.kedudukan),
      ketua: t(p.ketua), nik_ketua: t(p.nik_ketua), poktan: t(p.poktan), lembaga: FORM.lembaga(p.poktan), lembaga_kalimat: FORM.lembagaKalimat(p.poktan),
      desa: t(p.desa), kec: t(p.kec), kab: t(p.kab), prov: t(kab.provinsi),
      luas: U.n(p.luas) ? U.ha(p.luas) : '……', luas_real: luasR,
      rp_spk: U.rp(h.tBiaya), terbilang_spk: U.terbilang(h.tBiaya) + ' rupiah', hok_spk: U.angka(h.tHOK),
      norek: t(p.norek), bank: t(p.bank, ''), namarek: t(p.namarek, FORM.lembaga(p.poktan)),
      tgl_sptjm: U.tgl(p.tgl_sptjm), no_bast: t(p.no_bast), kalimat_bast: U.kalimatHari(p.tgl_bast), no_bap: t(p.no_bap), tgl_bap: U.tgl(p.tgl_bap),
      hok_real: U.angka(h.rHOK), rp_real: U.rp(h.rBiaya), terbilang_real: U.terbilang(h.rBiaya) + ' rupiah', terbilang_rp: U.terbilangRp(h.rBiaya),
      tgl_pelaksanaan: FORM.tglPelaksanaan(p, F.jenis), no_kw: t(p.no_kw), tgl_kw: U.tgl(p.tgl_kw),
      jenis_lc: String(k.jenis).toLowerCase(), dok3: k.dok3,
      hok_spk_olah: U.angka(h.per ? h.per.olah.tHOK : 0), hok_spk_tanam: U.angka(h.per ? h.per.tanam.tHOK : 0),
      hok_real_olah: U.angka(h.per ? h.per.olah.rHOK : 0), hok_real_tanam: U.angka(h.per ? h.per.tanam.rHOK : 0),
      hokha_olah: String((h.hok || {}).olah || 15), hokha_tanam: String((h.hok || {}).tanam || 25)
    };
  }

  // ------------------------------------------------------------ WORD (template resmi)
  var WORD = {
    F01: ['F01_SPK.docx', 'SPK'], F02: ['F02_SPTJM.docx', 'SPTJM'], F08: ['F08_BAST.docx', 'BAST'],
    F10a: ['F10_Dokumentasi.docx', 'Dokumentasi_Pengolahan'], F10b: ['F10_Dokumentasi.docx', 'Dokumentasi_Penanaman'], F11: ['F11_Kwitansi.docx', 'Kwitansi'], F12: ['F12_KTP_Rekening_NPWP.docx', 'KTP_Rekening_NPWP'], F14: ['F14_KTP_Pekerja.docx', 'KTP_Pekerja']
  };
  function xmlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ukuranGambar(url) {
    return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok({ w: im.naturalWidth, h: im.naturalHeight }); }; im.onerror = function () { ok({ w: 4, h: 3 }); }; im.src = url; });
  }
  var EMU = 635; // per twip

  function gambarInline(rid, id, w, h) {
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + w + '" cy="' + h + '"/><wp:docPr id="' + id + '" name="Foto ' + id + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="foto' + id + '.jpeg"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + w + '" cy="' + h + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>' +
      '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  function parKecil(teks) {
    return '<w:p><w:pPr><w:spacing w:before="40" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">' + xmlEsc(teks) + '</w:t></w:r></w:p>';
  }
  // tabel 2 kolom berisi foto geotag satu tahap
  function tabelFoto(sel) {
    var satu = sel.length === 1, kolom = satu ? 8600 : 4650, maxW = (kolom - 200) * EMU, maxH = (satu ? 5600 : 3150) * EMU;
    var b = '<w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/>';
    return '<w:tbl><w:tblPr><w:tblW w:w="' + kolom * sel.length + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' + b + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
      '<w:tblGrid>' + sel.map(function () { return '<w:gridCol w:w="' + kolom + '"/>'; }).join('') + '</w:tblGrid><w:tr><w:trPr><w:trHeight w:val="' + (satu ? 5900 : 3400) + '"/></w:trPr>' +
      sel.map(function (c) {
        var isi;
        if (c && c.teks) {
          isi = '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">' + xmlEsc(c.teks) + '</w:t></w:r></w:p>';
        } else if (c) {
          var k = Math.min(maxW / c.w, maxH / c.h), w = Math.round(c.w * k), h = Math.round(c.h * k);
          isi = '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>' + gambarInline(c.rid, c.id, w, h) + '</w:p>' + (c.ket ? parKecil(c.ket) : '');
        } else {
          isi = '<w:p><w:pPr><w:jc w:val="center"/></w:pPr></w:p>';
        }
        return '<w:tc><w:tcPr><w:tcW w:w="' + kolom + '" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' + isi + '</w:tc>';
      }).join('') + '</w:tr></w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>';
  }
  // F14: 8 KTP per halaman (2 kolom × 4 baris), kepala dokumen diulang tiap halaman
  function halamanKtp(kepala, daftar) {
    var kolom = 4800, maxW = 4600 * EMU, maxH = 2650 * EMU, PER = 8, out = [];
    var b = '<w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/>';
    var sel = function (c) {
      var isi;
      if (!c) isi = '<w:p/>';
      else if (c.teks) isi = '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">' + xmlEsc(c.teks) + '</w:t></w:r></w:p>' + parKecil(c.nama);
      else {
        var k = Math.min(maxW / c.w, maxH / c.h), w = Math.round(c.w * k), h = Math.round(c.h * k);
        isi = '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>' + gambarInline(c.rid, c.id, w, h) + '</w:p>' + parKecil(c.nama);
      }
      return '<w:tc><w:tcPr><w:tcW w:w="' + kolom + '" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' + isi + '</w:tc>';
    };
    for (var i = 0; i < Math.max(daftar.length, 1); i += PER) {
      var isiHal = daftar.slice(i, i + PER), baris = '';
      for (var j = 0; j < Math.max(isiHal.length, 1); j += 2) baris += '<w:tr><w:trPr><w:trHeight w:val="3050" w:hRule="exact"/></w:trPr>' + sel(isiHal[j]) + sel(isiHal[j + 1]) + '</w:tr>';
      out.push((i ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' + kepala : '') +
        '<w:tbl><w:tblPr><w:tblW w:w="' + kolom * 2 + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' + b + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
        '<w:tblGrid><w:gridCol w:w="' + kolom + '"/><w:gridCol w:w="' + kolom + '"/></w:tblGrid>' + baris + '</w:tbl>');
    }
    return out.join('') + '<w:p/>';
  }

  function gantiParagraf(xml, penanda, pengganti) {
    var i = xml.indexOf(penanda);
    if (i < 0) return xml;
    var a = Math.max(xml.lastIndexOf('<w:p>', i), xml.lastIndexOf('<w:p ', i));
    var b = xml.indexOf('</w:p>', i) + 6;
    return xml.slice(0, a) + pengganti + xml.slice(b);
  }

  // F10a/F10b: dokumentasi per jenis pekerjaan (pengolahan lahan / penanaman) dari template yang sama
  function formUntuk(kode, F) { return kode === 'F10a' || kode === 'F05a' || kode === 'F09a' ? FORM.untukJenis(F, 'olah') : kode === 'F10b' || kode === 'F05b' || kode === 'F09b' ? FORM.untukJenis(F, 'tanam') : F; }
  function isiWord(kode, F, JSZip) {
    F = formUntuk(kode, F);
    var nv = nilai(F);
    return fetch('assets/tpl/' + WORD[kode][0], { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Template ' + WORD[kode][0] + ' tidak ditemukan di situs (folder assets/tpl).');
      return r.arrayBuffer();
    }).then(function (buf) { return JSZip.loadAsync(buf); }).then(function (zip) {
      return zip.file('word/document.xml').async('string').then(function (xml) {
        xml = xml.replace(/\{\{([a-z0-9_]+)\}\}/g, function (m, k) { return xmlEsc(nv[k] === undefined ? TITIK : nv[k]); });
        if (!/^F10/.test(kode) && kode !== 'F12' && kode !== 'F14') return { zip: zip, xml: xml };
        if (kode === 'F14') {
          var nK = 0, relK = '', daftarK = FORM.fotoKtpPekerja(F);
          var a0 = xml.indexOf('<w:body>') + 8, iPen = xml.indexOf('{{KTP_HALAMAN}}'), aPen = Math.max(xml.lastIndexOf('<w:p>', iPen), xml.lastIndexOf('<w:p ', iPen));
          var kepala = xml.slice(a0, aPen);
          return Promise.all(daftarK.map(function (x) {
            if (x.f && x.f.pdf) return { teks: 'KTP berupa PDF, lampirkan terpisah', nama: x.w.nama };
            if (!x.f || !x.f.url) return { teks: 'Foto KTP belum diunggah', nama: x.w.nama };
            nK++;
            var rid = 'rIdKtp' + nK, berkas = 'media/ktp_' + nK + '.jpeg';
            zip.file('word/' + berkas, x.f.url.split(',')[1], { base64: true });
            relK += '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="' + berkas + '"/>';
            return ukuranGambar(x.f.url).then(function (u) { return { rid: rid, id: 9500 + nK, w: u.w, h: u.h, nama: x.w.nama }; });
          })).then(function (sel) {
            xml = gantiParagraf(xml, '{{KTP_HALAMAN}}', halamanKtp(kepala, sel));
            var tugas = [];
            if (relK) tugas.push(zip.file('word/_rels/document.xml.rels').async('string').then(function (r) { zip.file('word/_rels/document.xml.rels', r.replace('</Relationships>', relK + '</Relationships>')); }));
            tugas.push(zip.file('[Content_Types].xml').async('string').then(function (c) {
              if (!/Extension="jpeg"/i.test(c)) c = c.replace('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="jpeg" ContentType="image/jpeg"/>');
              zip.file('[Content_Types].xml', c);
            }));
            return Promise.all(tugas).then(function () { return { zip: zip, xml: xml }; });
          });
        }
        // foto: F10 dua foto geotag per tahap, F12 satu foto per penanda (KTP ketua, rekening halaman depan, NPWP)
        var foto = F.foto || {}, n = 0, tambahRel = '', jobs = [];
        var penanda = (xml.match(/\{\{FOTO:[a-z0-9_]+\}\}/g) || []).map(function (m) { return m.slice(7, -2); });
        penanda.forEach(function (nama) {
          var kunci = /^F10/.test(kode) ? [nama + '_1', nama + '_2'] : [nama];
          jobs.push(Promise.all(kunci.map(function (kk) {
            var f = foto[kk];
            if (f && f.pdf) return { teks: 'Berkas berupa PDF (' + f.nama + '), lampirkan terpisah' };
            if (!f || !f.url) return kode === 'F12' ? { teks: 'Foto belum diunggah' } : null;
            n++;
            var id = 9000 + n, rid = 'rIdFoto' + n, berkas = 'media/foto_' + kk + '.jpeg';
            zip.file('word/' + berkas, f.url.split(',')[1], { base64: true });
            tambahRel += '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="' + berkas + '"/>';
            var m = f.meta || {}, ket = /^F10/.test(kode) ? [m.tanggal ? m.tanggal.replace('T', ' ') : '', m.lat ? m.lat + ', ' + m.lng : ''].filter(Boolean).join(' · ') : '';
            return ukuranGambar(f.url).then(function (u) { return { rid: rid, id: id, w: u.w, h: u.h, ket: ket }; });
          })).then(function (sel) { xml = gantiParagraf(xml, '{{FOTO:' + nama + '}}', tabelFoto(sel)); }));
        });
        return Promise.all(jobs).then(function () {
          var tugas = [];
          if (tambahRel) tugas.push(zip.file('word/_rels/document.xml.rels').async('string').then(function (r) { zip.file('word/_rels/document.xml.rels', r.replace('</Relationships>', tambahRel + '</Relationships>')); }));
          tugas.push(zip.file('[Content_Types].xml').async('string').then(function (c) {
            if (!/Extension="jpeg"/i.test(c)) c = c.replace('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="jpeg" ContentType="image/jpeg"/>');
            zip.file('[Content_Types].xml', c);
          }));
          return Promise.all(tugas).then(function () { return { zip: zip, xml: xml }; });
        });
      }).then(function (o) {
        o.zip.file('word/document.xml', o.xml);
        return o.zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      });
    });
  }

  function word(kode, F) {
    return muat('JSZip').then(function (JSZip) { return isiWord(kode, F, JSZip); }).then(function (blob) { unduh(blob, namaBerkas(F, WORD[kode][1], 'docx')); });
  }
  function wordSemua(F) {
    return muat('JSZip').then(function (JSZip) {
      var zip = new JSZip(), kodes = Object.keys(WORD);
      return Promise.all(kodes.map(function (k) { return isiWord(k, F, JSZip).then(function (b) { zip.file(namaBerkas(F, k + '_' + WORD[k][1], 'docx'), b); }); }))
        .then(function () { return zip.generateAsync({ type: 'blob' }); });
    }).then(function (blob) { unduh(blob, namaBerkas(F, 'Word_HOK', 'zip')); });
  }

  // ------------------------------------------------------------ EXCEL (tata letak mengikuti form Excel resmi)
  var FONT = { name: 'Arial', size: 12 }, FONT_K = { name: 'Arial', size: 11 };
  var TIPIS = { style: 'thin', color: { argb: 'FF000000' } };
  var BINGKAI = { top: TIPIS, left: TIPIS, bottom: TIPIS, right: TIPIS };
  var ABU = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
  var RP = '#,##0';

  function lembar(wb, nama, lebar, lanskap) {
    var ws = wb.addWorksheet(nama.slice(0, 31), {
      pageSetup: { paperSize: 9, orientation: lanskap ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
      views: [{ showGridLines: false }]
    });
    ws.columns = lebar.map(function (w) { return { width: w }; });
    ws.properties.defaultRowHeight = 16;
    return ws;
  }
  function sel(ws, ref, v, o) {
    var c = ws.getCell(ref); c.value = v; o = o || {};
    c.font = Object.assign({}, o.kecil ? FONT_K : FONT, o.bold ? { bold: true } : {}, o.italic ? { italic: true } : {}, o.underline ? { underline: true } : {});
    c.alignment = { horizontal: o.h || 'left', vertical: o.v || 'middle', wrapText: !!o.wrap };
    if (o.border) c.border = BINGKAI;
    if (o.fill) c.fill = ABU;
    if (o.fmt) c.numFmt = o.fmt;
    return c;
  }
  function gabung(ws, r1, c1, r2, c2) { ws.mergeCells(r1, c1, r2, c2); }
  function kol(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function judulLembar(ws, baris, nKol) {
    baris.forEach(function (t, i) { gabung(ws, i + 1, 1, i + 1, nKol); sel(ws, 'A' + (i + 1), t, { h: 'center', bold: i === 0 }); });
    return baris.length + 1;
  }
  function wilayah(F, nv) { return 'DI KABUPATEN ' + String(F.p.kab).toUpperCase() + ' PROVINSI ' + String(nv.prov).toUpperCase(); }
  function identitas(ws, r, data) {
    data.forEach(function (d) { gabung(ws, r, 1, r, 2); sel(ws, 'A' + r, d[0]); sel(ws, 'C' + r, ': ' + d[1]); r++; });
    return r;
  }
  // blok tanda tangan: kiri tim teknis, kanan ketua
  function ttd(ws, r, nKol, F, nv, tgl, kiri) {
    var tengah = Math.floor(nKol / 2) + 1;
    var tulis = function (row, c1, c2, v, o) { gabung(ws, row, c1, row, c2); sel(ws, kol(c1) + row, v, Object.assign({ h: 'center', kecil: true }, o || {})); };
    if (kiri !== false) { tulis(r, 1, tengah - 1, 'Mengetahui,'); tulis(r + 1, 1, tengah - 1, 'Tim Teknis Kabupaten'); }
    tulis(r, tengah, nKol, nv.kab + ', ' + U.tgl(tgl)); tulis(r + 1, tengah, nKol, 'Ketua ' + nv.lembaga);
    tulis(r + 3, tengah, nKol, 'TTD dan stempel', { italic: true });
    if (kiri !== false) { tulis(r + 5, 1, tengah - 1, nv.tim_teknis, { bold: true, underline: true }); tulis(r + 6, 1, tengah - 1, 'NIP. ' + nv.nip_tim_teknis); }
    tulis(r + 5, tengah, nKol, nv.ketua, { bold: true, underline: true });
    return r + 7;
  }

  function xF00(wb, F, nv) {
    var ws = lembar(wb, 'Daftar Periksa', [6, 70, 14, 40], false), h = F.p.hit || {}, d = F.dok || {}, p = F.p;
    var r = judulLembar(ws, ['DAFTAR DOKUMEN PELAKSANAAN PENYALURAN HOK', nv.judul, wilayah(F, nv), 'TAHUN ANGGARAN ' + nv.tahun], 4);
    r = identitas(ws, r, [['Kelompok Tani', nv.poktan], ['Desa / Kecamatan', nv.desa + ' / ' + nv.kec]]) + 1;
    ['NO', 'DOKUMEN KEGIATAN', 'CHECK LIST', 'KETERANGAN'].forEach(function (x, i) { sel(ws, kol(i + 1) + r, x, { h: 'center', bold: true, border: true, fill: true }); });
    var docs = [
      ['Surat Perjanjian Kerjasama dengan Kelompok Tani', p.no_spk && p.tgl_spk], ['SPTJM Kelompok Tani', p.tgl_sptjm], ['Rencana Usaha Kegiatan Kelompok (RUKK)', p.tgl_rukk],
      ['Buku rekening atas nama Kelompok Tani', (d.rek || []).length >= 3], ['Foto KTP Ketua dan NPWP Kelompok Tani / Ketua', h.dok && h.dok.idn >= 2], ['Daftar hadir kerja', h.nPek > 0], ['Laporan Hasil Pekerjaan Ketua Kelompok ke PPK', p.tgl_lap],
      ['Berita Acara Pemeriksaan Hasil Pekerjaan oleh Tim Teknis', p.no_bap && p.tgl_bap], ['BAST Petani ke PPK', p.no_bast && p.tgl_bast], ['Bukti Pembayaran Petani', p.tgl_tt],
      ['Foto/Dokumentasi Kegiatan Geotagging (sebelum, proses, sesudah)', (d.geo || []).length >= HOK.SLOT.geo.length], ['Kwitansi Pembayaran ke Petani', p.tgl_kw],
      ['Foto KTP Petani Pekerja', h.dok && h.nPek > 0 && h.dok.ktp >= h.nPek], ['List Data Kelompok Tani (alamat sesuai buku rekening)', p.norek && p.desa]
    ];
    docs.forEach(function (x, i) {
      r++;
      sel(ws, 'A' + r, i + 1, { h: 'center', border: true }); sel(ws, 'B' + r, x[0], { border: true }); sel(ws, 'C' + r, x[1] ? '✔' : '', { h: 'center', border: true }); sel(ws, 'D' + r, '', { border: true });
    });
  }

  function xF03(wb, F, nv) {
    var ws = lembar(wb, 'RUKK', [6, 30, 16, 16, 16, 20], true), p = F.p, h = p.hit || {};
    var r = judulLembar(ws, ['RENCANA USULAN KERJA KELOMPOK', F.keg.bantuan.toUpperCase(), nv.judul, wilayah(F, nv), 'TAHUN ANGGARAN ' + nv.tahun], 6);
    r = identitas(ws, r, [['KELOMPOK TANI', nv.poktan], ['DESA', nv.desa], ['KECAMATAN', nv.kec], ['LUAS AREA', nv.luas + ' ha']]) + 1;
    var a = r;
    gabung(ws, a, 1, a + 1, 1); gabung(ws, a, 2, a + 1, 2); gabung(ws, a, 3, a, 5); gabung(ws, a, 6, a + 1, 6);
    sel(ws, 'A' + a, 'NO', { h: 'center', bold: true, border: true }); sel(ws, 'B' + a, 'KEGIATAN', { h: 'center', bold: true, border: true });
    sel(ws, 'C' + a, F.keg.bantuan, { h: 'center', bold: true, border: true }); sel(ws, 'F' + a, 'JUMLAH (Rp)', { h: 'center', bold: true, border: true });
    ['Luas Lahan (ha)', 'Jumlah HOK/ha', 'Satuan (Rp)'].forEach(function (x, i) { sel(ws, kol(3 + i) + (a + 1), x, { h: 'center', bold: true, border: true, wrap: true }); });
    ['A', 'B', 'D', 'E', 'F'].forEach(function (c) { ws.getCell(c + (a + 1)).border = BINGKAI; });
    ['D', 'E'].forEach(function (c) { ws.getCell(c + a).border = BINGKAI; });
    var b1 = a + 2, b2 = a + 3, bj = a + 2 + 1 + HOK.DAFTAR_JENIS.length;
    sel(ws, 'A' + b1, 1, { h: 'center', border: true }); sel(ws, 'B' + b1, 'Tenaga Kerja', { border: true });
    ['C', 'D', 'E', 'F'].forEach(function (c) { sel(ws, c + b1, '', { border: true }); });
    HOK.DAFTAR_JENIS.forEach(function (jn, i) {
      var rr = b2 + i;
      sel(ws, 'A' + rr, '', { border: true }); sel(ws, 'B' + rr, '- ' + HOK.JENIS[jn].label, { border: true });
      sel(ws, 'C' + rr, U.n(p.luas), { h: 'center', border: true, fmt: '0.00#' }); sel(ws, 'D' + rr, U.n((h.hok || {})[jn]), { h: 'center', border: true });
      sel(ws, 'E' + rr, U.n(h.upah), { h: 'right', border: true, fmt: RP });
      sel(ws, 'F' + rr, { formula: 'ROUND(C' + rr + '*D' + rr + ',0)*E' + rr, result: h.per[jn].tHOK * h.upah }, { h: 'right', border: true, fmt: RP });
    });
    b2 = bj - 1;
    gabung(ws, bj, 1, bj, 5); sel(ws, 'A' + bj, 'JUMLAH', { h: 'center', bold: true, border: true });
    ['B', 'C', 'D', 'E'].forEach(function (c) { ws.getCell(c + bj).border = BINGKAI; });
    sel(ws, 'F' + bj, { formula: 'SUM(F' + b1 + ':F' + b2 + ')', result: h.tBiaya }, { h: 'right', bold: true, border: true, fmt: RP });
    gabung(ws, bj + 1, 1, bj + 1, 6);
    sel(ws, 'A' + (bj + 1), '*Keterangan: Biaya lain yang timbul untuk kegiatan ' + F.keg.swadaya + ' dibiayai secara swadaya oleh petani.', { italic: true, kecil: true });
    ttd(ws, bj + 3, 6, F, nv, p.tgl_rukk, false);
  }

  function periode(F) {
    var p = F.p, h = p.hit || {};
    var pr = HOK.periode(p, F.jenis || 'olah'), m0 = pr.awal; // periode daftar hadir jenis pekerjaan ini
    if (!m0) return null;
    var akhir = pr.akhir || m0;
    if (h.hadirAkhir && h.hadirAkhir > akhir) akhir = h.hadirAkhir;
    return { mulai: m0, jumlah: HOK.hari(akhir) - HOK.hari(m0) + 1 };
  }
  function xF05(wb, F, nv) {
    var per = periode(F), HARI = 15, pek = F.pekerja || [];
    var namaJ = F.jenis === 'tanam' ? 'Penanaman' : 'Pengolahan';
    if (!per) { var w0 = lembar(wb, 'Hadir ' + namaJ, [60], true); sel(w0, 'A1', 'Isi tanggal ' + F.keg.jenis.toLowerCase() + ' terlebih dahulu.'); return; }
    var nPer = Math.ceil(per.jumlah / HARI);
    for (var a = 0; a < nPer; a++) {
      var tgl = [];
      for (var k = 0; k < HARI && a * HARI + k < per.jumlah; k++) tgl.push(U.tambahHari(per.mulai, a * HARI + k));
      var n = tgl.length, nKol = 3 + n + 1;
      var ws = lembar(wb, 'Hadir ' + namaJ + (nPer > 1 ? ' ' + (a + 1) : ''), [5, 26, 20].concat(tgl.map(function () { return 6.5; })).concat([10]), true);
      var r = judulLembar(ws, ['DAFTAR HADIR', nv.judul, wilayah(F, nv), 'TAHUN ANGGARAN ' + nv.tahun + (nPer > 1 ? ' · PERIODE ' + (a + 1) + '/' + nPer : '')], nKol);
      r = identitas(ws, r, [['KELOMPOK TANI', nv.poktan], ['DESA', nv.desa], ['KECAMATAN', nv.kec], ['JENIS PEKERJAAN', F.keg.jenis], ['LUAS AREA', nv.luas + ' ha']]) + 1;
      var h1 = r, h2 = r + 1, h3 = r + 2;
      [[1, 'NO'], [2, 'NAMA LENGKAP'], [3, 'NIK'], [nKol, 'TOTAL HARI']].forEach(function (x) { gabung(ws, h1, x[0], h3, x[0]); sel(ws, kol(x[0]) + h1, x[1], { h: 'center', bold: true, border: true, wrap: true, kecil: true }); });
      gabung(ws, h1, 4, h1, 3 + n); sel(ws, 'D' + h1, 'WAKTU PELAKSANAAN PEKERJAAN', { h: 'center', bold: true, border: true, kecil: true });
      tgl.forEach(function (d, i) {
        sel(ws, kol(4 + i) + h2, U.namaHari(d).slice(0, 3), { h: 'center', border: true, kecil: true, bold: true });
        sel(ws, kol(4 + i) + h3, d.slice(8) + '/' + d.slice(5, 7), { h: 'center', border: true, kecil: true });
      });
      for (var c = 1; c <= nKol; c++) [h1, h2, h3].forEach(function (rr) { ws.getCell(kol(c) + rr).border = BINGKAI; });
      r = h3 + 1;
      var r0 = r;
      pek.forEach(function (w, i) {
        var set = {}; (w.hadir || []).forEach(function (x) { set[x] = 1; });
        sel(ws, 'A' + r, i + 1, { h: 'center', border: true, kecil: true }); sel(ws, 'B' + r, w.nama, { border: true, kecil: true });
        sel(ws, 'C' + r, String(w.nik), { border: true, kecil: true, fmt: '@' });
        tgl.forEach(function (d, j) { sel(ws, kol(4 + j) + r, set[d] ? 1 : null, { h: 'center', border: true, kecil: true }); });
        sel(ws, kol(nKol) + r, { formula: 'SUM(D' + r + ':' + kol(3 + n) + r + ')', result: tgl.filter(function (d) { return set[d]; }).length }, { h: 'center', border: true, bold: true, kecil: true });
        r++;
      });
      gabung(ws, r, 1, r, 3 + n); sel(ws, 'A' + r, 'JUMLAH HOK', { h: 'center', bold: true, border: true, kecil: true });
      for (var c2 = 2; c2 <= 3 + n; c2++) ws.getCell(kol(c2) + r).border = BINGKAI;
      var tot = pek.reduce(function (s, w) { return s + (w.hadir || []).filter(function (x) { return tgl.indexOf(x) >= 0; }).length; }, 0);
      sel(ws, kol(nKol) + r, { formula: pek.length ? 'SUM(' + kol(nKol) + r0 + ':' + kol(nKol) + (r - 1) + ')' : '0', result: tot }, { h: 'center', bold: true, border: true, kecil: true });
      ttd(ws, r + 2, nKol, F, nv, tgl[tgl.length - 1]);
    }
  }

  function xRealisasi(wb, F, nv, ba) {
    var p = F.p, h = p.hit || {}, rl = U.n(p.real_luas), tglP = FORM.tglPelaksanaan(p);
    var ws = lembar(wb, ba ? 'BA Pemeriksaan' : 'Laporan Pelaksanaan', [5, 24, 22, 11, 14, 16, 22, 9, 9, 10, 9, 16, 9, 16], true);
    var r = judulLembar(ws, (ba ? ['BERITA ACARA PEMERIKSAAN PEKERJAAN', 'Nomor : ' + nv.no_bap] : ['LAPORAN PELAKSANAAN KEGIATAN']).concat([nv.judul, wilayah(F, nv), 'TAHUN ANGGARAN ' + nv.tahun]), 14);
    r = identitas(ws, r, [['KELOMPOK TANI', nv.poktan], ['DESA', nv.desa], ['KECAMATAN', nv.kec], ['LUAS AREA', nv.luas + ' ha']]) + 1;
    var a = r, b = r + 1, c = r + 2, d = r + 3, nJ = HOK.DAFTAR_JENIS.length, j = d + nJ, dA = d + nJ - 1;
    var H = function (ref, v) { sel(ws, ref, v, { h: 'center', bold: true, border: true, fill: true, wrap: true, kecil: true }); };
    gabung(ws, a, 1, c, 1); H('A' + a, 'No'); gabung(ws, a, 2, c, 2); H('B' + a, 'Jenis Pekerjaan');
    gabung(ws, a, 3, a, 6); H('C' + a, 'TARGET PELAKSANAAN'); gabung(ws, a, 7, a, 13); H('G' + a, 'REALISASI PELAKSANAAN');
    gabung(ws, a, 14, c, 14); H('N' + a, ba ? 'SESUAI / TIDAK SESUAI' : 'Keterangan');
    [['C', 'Tanggal Pelaksanaan'], ['D', 'Luas areal (ha)'], ['E', 'Penggunaan Tenaga Kerja (HOK)'], ['F', 'Total Biaya (Rp)'], ['G', 'Tanggal Pelaksanaan']].forEach(function (x) { gabung(ws, b, x[0].charCodeAt(0) - 64, c, x[0].charCodeAt(0) - 64); H(x[0] + b, x[1]); });
    gabung(ws, b, 8, b, 9); H('H' + b, 'Luas areal'); gabung(ws, b, 10, b, 11); H('J' + b, 'Tenaga Kerja'); gabung(ws, b, 12, b, 13); H('L' + b, 'Total Biaya');
    [['H', 'ha'], ['I', '%'], ['J', 'HOK'], ['K', '%'], ['L', 'Rp'], ['M', '%']].forEach(function (x) { H(x[0] + c, x[1]); });
    ws.getRow(a).height = 18; ws.getRow(b).height = 46; ws.getRow(c).height = 16;
    for (var k = 1; k <= 14; k++) [a, b, c].forEach(function (rr) { ws.getCell(kol(k) + rr).border = BINGKAI; ws.getCell(kol(k) + rr).fill = ABU; });
    var o = { border: true, kecil: true, h: 'center', wrap: true };
    HOK.DAFTAR_JENIS.forEach(function (jn, i) {
      var rr = d + i, pj = h.per[jn], tB = pj.tHOK * h.upah, rB = pj.rHOK * h.upah, prJ = HOK.periode(p, jn), tglJ = U.rentang(pj.awal || prJ.awal, pj.akhir || prJ.akhir);
      var sesuai = pj.rHOK && pj.rHOK <= pj.tHOK && rl <= U.n(p.luas) ? 'SESUAI' : (pj.rHOK ? 'TIDAK SESUAI' : '');
      sel(ws, 'A' + rr, i + 1, o); sel(ws, 'B' + rr, HOK.JENIS[jn].label, Object.assign({}, o, { h: 'left' })); sel(ws, 'C' + rr, tglJ, o);
      sel(ws, 'D' + rr, U.n(p.luas), Object.assign({}, o, { fmt: '0.00#' })); sel(ws, 'E' + rr, pj.tHOK, Object.assign({}, o, { fmt: RP }));
      sel(ws, 'F' + rr, tB, Object.assign({}, o, { h: 'right', fmt: RP })); sel(ws, 'G' + rr, tglJ, o);
      sel(ws, 'H' + rr, rl || null, Object.assign({}, o, { fmt: '0.00#' }));
      sel(ws, 'I' + rr, { formula: 'IF(D' + rr + '=0,"",H' + rr + '/D' + rr + ')', result: U.n(p.luas) ? rl / U.n(p.luas) : '' }, Object.assign({}, o, { fmt: '0%' }));
      sel(ws, 'J' + rr, pj.rHOK, Object.assign({}, o, { fmt: RP }));
      sel(ws, 'K' + rr, { formula: 'IF(E' + rr + '=0,"",J' + rr + '/E' + rr + ')', result: pj.tHOK ? pj.rHOK / pj.tHOK : '' }, Object.assign({}, o, { fmt: '0%' }));
      sel(ws, 'L' + rr, rB, Object.assign({}, o, { h: 'right', fmt: RP }));
      sel(ws, 'M' + rr, { formula: 'IF(F' + rr + '=0,"",L' + rr + '/F' + rr + ')', result: tB ? rB / tB : '' }, Object.assign({}, o, { fmt: '0%' }));
      sel(ws, 'N' + rr, ba ? sesuai : '', Object.assign({}, o, { bold: true }));
      ws.getRow(rr).height = 34;
    });
    gabung(ws, j, 1, j, 4); sel(ws, 'A' + j, 'JUMLAH', { h: 'center', bold: true, border: true, kecil: true });
    for (var z = 2; z <= 14; z++) ws.getCell(kol(z) + j).border = BINGKAI;
    sel(ws, 'E' + j, { formula: 'SUM(E' + d + ':E' + dA + ')', result: h.tHOK }, { h: 'center', bold: true, border: true, kecil: true, fmt: RP });
    sel(ws, 'F' + j, { formula: 'SUM(F' + d + ':F' + dA + ')', result: h.tBiaya }, { h: 'right', bold: true, border: true, kecil: true, fmt: RP });
    sel(ws, 'J' + j, { formula: 'SUM(J' + d + ':J' + dA + ')', result: h.rHOK }, { h: 'center', bold: true, border: true, kecil: true, fmt: RP });
    sel(ws, 'L' + j, { formula: 'SUM(L' + d + ':L' + dA + ')', result: h.rBiaya }, { h: 'right', bold: true, border: true, kecil: true, fmt: RP });
    sel(ws, 'M' + j, { formula: 'IF(F' + j + '=0,"",L' + j + '/F' + j + ')', result: h.tBiaya ? h.rBiaya / h.tBiaya : '' }, { h: 'center', bold: true, border: true, kecil: true, fmt: '0%' });
    sel(ws, 'A' + (j + 2), 'Catatan :', { kecil: true });
    sel(ws, 'B' + (j + 3), ba ? '- Dilampiri dokumentasi foto geotag pemeriksaan hasil pekerjaan.' : '- Dilampiri dokumentasi foto geotag kondisi awal, proses pelaksanaan dan hasil akhir.', { kecil: true });
    ttd(ws, j + 5, 14, F, nv, ba ? p.tgl_bap : p.tgl_lap);
  }

  function xF09(wb, F, nv) {
    var p = F.p, h = p.hit || {}, upah = U.n(h.upah), pek = F.pekerja || [];
    var ws = lembar(wb, 'Tanda Terima ' + (F.jenis === 'tanam' ? 'Penanaman' : 'Pengolahan'), [6, 28, 22, 14, 16, 20, 18, 18], true);
    var r = judulLembar(ws, ['TANDA TERIMA PEMBAYARAN', nv.judul, wilayah(F, nv), 'TAHUN ANGGARAN ' + nv.tahun], 8);
    r = identitas(ws, r, [['KELOMPOK TANI', nv.poktan], ['DESA', nv.desa], ['KECAMATAN', nv.kec], ['JENIS PEKERJAAN', F.keg.jenis], ['LUAS AREA', nv.luas + ' ha']]) + 1;
    var H = function (ref, v) { sel(ws, ref, v, { h: 'center', bold: true, border: true, wrap: true, kecil: true }); };
    ['NO', 'NAMA LENGKAP', 'NIK', 'TOTAL HADIR (HARI)', 'UPAH KERJA PERHARI (Rp)', 'JUMLAH UPAH DITERIMA (Rp)'].forEach(function (x, i) { H(kol(i + 1) + r, x); });
    gabung(ws, r, 7, r, 8); H('G' + r, 'TANDA TANGAN'); ws.getCell('H' + r).border = BINGKAI; ws.getRow(r).height = 32;
    var r0 = r + 1; r++;
    pek.forEach(function (w, i) {
      var no = i + 1, hr = (w.hadir || []).length, o = { border: true, kecil: true };
      sel(ws, 'A' + r, no, Object.assign({ h: 'center' }, o)); sel(ws, 'B' + r, w.nama, o); sel(ws, 'C' + r, String(w.nik), Object.assign({ fmt: '@' }, o));
      sel(ws, 'D' + r, hr, Object.assign({ h: 'center' }, o)); sel(ws, 'E' + r, upah, Object.assign({ h: 'right', fmt: RP }, o));
      sel(ws, 'F' + r, { formula: 'D' + r + '*E' + r, result: hr * upah }, Object.assign({ h: 'right', fmt: RP }, o));
      sel(ws, 'G' + r, no % 2 ? no + '. ……………' : '', o); sel(ws, 'H' + r, no % 2 ? '' : no + '. ……………', o);
      ws.getRow(r).height = 22; r++;
    });
    gabung(ws, r, 1, r, 3); sel(ws, 'A' + r, 'JUMLAH', { h: 'center', bold: true, border: true, kecil: true }); ['B', 'C', 'E', 'G', 'H'].forEach(function (c) { ws.getCell(c + r).border = BINGKAI; });
    var totH = pek.reduce(function (s, w) { return s + (w.hadir || []).length; }, 0);
    sel(ws, 'D' + r, { formula: pek.length ? 'SUM(D' + r0 + ':D' + (r - 1) + ')' : '0', result: totH }, { h: 'center', bold: true, border: true, kecil: true });
    sel(ws, 'F' + r, { formula: pek.length ? 'SUM(F' + r0 + ':F' + (r - 1) + ')' : '0', result: totH * upah }, { h: 'right', bold: true, border: true, kecil: true, fmt: RP });
    ttd(ws, r + 2, 8, F, nv, p.tgl_tt);
  }

  var perJ = function (fn, kode) { return function (wb, F) { var Fj = formUntuk(kode, F); fn(wb, Fj, nilai(Fj)); }; };
  var EXCEL = { F00: xF00, F03: xF03, F05a: perJ(xF05, 'F05a'), F05b: perJ(xF05, 'F05b'), F06: function (wb, F, nv) { xRealisasi(wb, F, nv, false); }, F07: function (wb, F, nv) { xRealisasi(wb, F, nv, true); }, F09a: perJ(xF09, 'F09a'), F09b: perJ(xF09, 'F09b') };
  var NAMA_X = { F00: 'Daftar_Periksa', F03: 'RUKK', F05a: 'Daftar_Hadir_Pengolahan', F05b: 'Daftar_Hadir_Penanaman', F06: 'Laporan_Pelaksanaan', F07: 'BA_Pemeriksaan', F09a: 'Tanda_Terima_Pengolahan', F09b: 'Tanda_Terima_Penanaman' };

  function excel(kodes, F) {
    return muat('ExcelJS').then(function (ExcelJS) {
      var wb = new ExcelJS.Workbook(), nv = nilai(F);
      wb.creator = 'Sistem HOK Tebu'; wb.created = new Date();
      kodes.forEach(function (k) { EXCEL[k](wb, F, nv); });
      return wb.xlsx.writeBuffer();
    }).then(function (buf) {
      unduh(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), namaBerkas(F, kodes.length > 1 ? 'Form_Excel_HOK' : NAMA_X[kodes[0]], 'xlsx'));
    });
  }

  // F13 alamat poktan per kabupaten
  function excelAlamat(kab, keg, daftar) {
    return muat('ExcelJS').then(function (ExcelJS) {
      var wb = new ExcelJS.Workbook(), ws = lembar(wb, 'List Data Kelompok Tani', [5, 28, 22, 20, 22, 16, 16, 14, 16, 20, 26, 26], true);
      var r = judulLembar(ws, ['LIST DATA KELOMPOK TANI PENERIMA BANTUAN'].concat(keg ? [HOK.KEG[keg].judul] : []).concat(['KABUPATEN ' + kab.kab.toUpperCase() + ' PROVINSI ' + String(kab.provinsi || '').toUpperCase()]), 12);
      ['NO', 'NAMA KELOMPOK TANI', 'KETUA KELOMPOK TANI', 'NIK', 'JALAN', 'DESA', 'KECAMATAN', 'KABUPATEN', 'PROVINSI', 'NO REKENING', 'NAMA REKENING', 'NOMOR NPWP (KT/KETUA KT)']
        .forEach(function (x, i) { sel(ws, kol(i + 1) + r, x, { h: 'center', bold: true, border: true, wrap: true, kecil: true, fill: true }); });
      ws.getRow(r).height = 32;
      daftar.forEach(function (p, i) {
        r++;
        [i + 1, p.poktan, p.ketua, String(p.nik_ketua || ''), p.jalan, p.desa, p.kec, p.kab, kab.provinsi, String(p.norek || ''), p.namarek, String(p.npwp || '') + (p.npwp && p.npwp_an ? ' (' + p.npwp_an + ')' : '')]
          .forEach(function (v, j) { sel(ws, kol(j + 1) + r, v === undefined ? '' : v, { border: true, kecil: true, wrap: true, h: j === 0 ? 'center' : 'left', fmt: [3, 9, 11].indexOf(j) >= 0 ? '@' : undefined }); });
      });
      return wb.xlsx.writeBuffer();
    }).then(function (buf) { unduh(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'F13_List_Data_Poktan_' + kab.kab.replace(/\s+/g, '-') + (keg ? '_' + HOK.kodeKeg(keg) : '') + '.xlsx'); });
  }

  return { WORD: WORD, EXCEL: EXCEL, word: word, wordSemua: wordSemua, excel: excel, excelAlamat: excelAlamat, nilai: nilai };
})();
