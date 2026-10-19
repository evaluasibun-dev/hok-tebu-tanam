/* Fungsi bantu tampilan: format angka/tanggal, terbilang, EXIF foto, kompres gambar, toast, dialog */
var U = (function () {
  'use strict';
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  function esc(v) { return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) { return HOK.num(v); }
  function angka(v, d) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: d === undefined ? 0 : d }).format(Number(v) || 0); }
  function rp(v) { return 'Rp' + angka(Math.round(Number(v) || 0)); }
  function ha(v) { return angka(n(v), 2); }
  function persen(a, b) { return b ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(a / b * 100) + '%' : '–'; }
  function singkat(v) {
    v = Number(v) || 0;
    if (v >= 1e9) return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(v / 1e9) + ' M';
    if (v >= 1e6) return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(v / 1e6) + ' jt';
    return angka(v);
  }
  function tgl(d) { if (!HOK.isISO(d)) return '……………'; var p = d.split('-'); return Number(p[2]) + ' ' + BULAN[Number(p[1]) - 1] + ' ' + p[0]; }
  function tglPendek(d) { return HOK.isISO(d) ? HOK.tglPendek(d) : '–'; }
  function namaHari(d) { return HARI[new Date(HOK.hari(d) * 864e5).getUTCDay()]; }
  function rentang(a, b) {
    if (!HOK.isISO(a) || !HOK.isISO(b)) return '……………';
    if (a === b) return tgl(a);
    if (a.slice(0, 7) === b.slice(0, 7)) return Number(a.slice(8)) + '–' + tgl(b);
    return tgl(a) + ' s.d. ' + tgl(b);
  }
  function tambahHari(d, k) { return HOK.dariHari(HOK.hari(d) + k); }

  // ---------- terbilang
  var SAT = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function tb(x) {
    x = Math.floor(x);
    if (x < 12) return SAT[x];
    if (x < 20) return SAT[x - 10] + ' belas';
    if (x < 100) return SAT[Math.floor(x / 10)] + ' puluh' + (x % 10 ? ' ' + SAT[x % 10] : '');
    if (x < 200) return 'seratus' + (x % 100 ? ' ' + tb(x % 100) : '');
    if (x < 1000) return SAT[Math.floor(x / 100)] + ' ratus' + (x % 100 ? ' ' + tb(x % 100) : '');
    if (x < 2000) return 'seribu' + (x % 1000 ? ' ' + tb(x % 1000) : '');
    if (x < 1e6) return tb(x / 1000) + ' ribu' + (x % 1000 ? ' ' + tb(x % 1000) : '');
    if (x < 1e9) return tb(x / 1e6) + ' juta' + (x % 1e6 ? ' ' + tb(x % 1e6) : '');
    if (x < 1e12) return tb(x / 1e9) + ' miliar' + (x % 1e9 ? ' ' + tb(x % 1e9) : '');
    return tb(x / 1e12) + ' triliun' + (x % 1e12 ? ' ' + tb(x % 1e12) : '');
  }
  function terbilang(x) { x = Math.round(Number(x) || 0); return x === 0 ? 'nol' : tb(x).replace(/\s+/g, ' ').trim(); }
  function terbilangRp(x) { var t = terbilang(x) + ' rupiah'; return t.charAt(0).toUpperCase() + t.slice(1); }
  function kalimatHari(d) {
    if (!HOK.isISO(d)) return 'Pada hari ini …………… tanggal …………… bulan …………… tahun ……………';
    var p = d.split('-');
    return 'Pada hari ini ' + namaHari(d) + ' tanggal ' + terbilang(Number(p[2])) + ' bulan ' + BULAN[Number(p[1]) - 1] + ' tahun ' + terbilang(Number(p[0])) +
      ' (' + p[2] + '-' + p[1] + '-' + p[0] + ')';
  }

  // ---------- notifikasi
  var tId = null;
  function toast(pesan, gagal) {
    var el = document.getElementById('toast');
    el.textContent = pesan; el.className = 'on' + (gagal ? ' crit' : '');
    clearTimeout(tId); tId = setTimeout(function () { el.className = ''; }, gagal ? 6000 : 3000);
  }
  function dialog(html, onBuka) {
    var d = document.getElementById('dialog');
    d.innerHTML = '<div class="dlg"><button type="button" class="btn kecil tutup" aria-label="Tutup">Tutup</button>' + html + '</div>';
    d.querySelector('.tutup').onclick = function () { d.close(); };
    if (!d.open) d.showModal();
    if (onBuka) onBuka(d);
    return d;
  }
  function tutupDialog() { var d = document.getElementById('dialog'); if (d.open) d.close(); }

  // ---------- berkas
  function bacaBuffer(file) { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = no; r.readAsArrayBuffer(file); }); }
  function keBase64(buf) {
    var b = new Uint8Array(buf), s = '', CH = 0x8000;
    for (var i = 0; i < b.length; i += CH) s += String.fromCharCode.apply(null, b.subarray(i, i + CH));
    return btoa(s);
  }
  function dataURL(mime, b64) { return 'data:' + mime + ';base64,' + b64; }
  function blobURL(mime, b64) {
    var bin = atob(b64), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([u], { type: mime }));
  }

  // EXIF (JPEG): tanggal pengambilan dan koordinat GPS
  function exif(buf) {
    try {
      var v = new DataView(buf);
      if (v.getUint16(0) !== 0xFFD8) return null;
      var off = 2;
      while (off < v.byteLength - 4) {
        var m = v.getUint16(off), len = v.getUint16(off + 2);
        if (m === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) return tiff(v, off + 10);
        if ((m & 0xFF00) !== 0xFF00) break;
        off += 2 + len;
      }
    } catch (e) { /* abaikan foto tanpa EXIF */ }
    return null;
  }
  function tiff(v, t) {
    var le = v.getUint16(t) === 0x4949;
    var u16 = function (o) { return v.getUint16(t + o, le); }, u32 = function (o) { return v.getUint32(t + o, le); };
    function ifd(o) { var n = u16(o), m = {}; for (var i = 0; i < n; i++) { var e = o + 2 + i * 12; m[u16(e)] = { type: u16(e + 2), count: u32(e + 4), val: e + 8 }; } return m; }
    function str(en) { var o = en.count > 4 ? u32(en.val) : en.val, s = ''; for (var i = 0; i < en.count - 1; i++) s += String.fromCharCode(v.getUint8(t + o + i)); return s; }
    function rat(en) { var o = u32(en.val), a = []; for (var i = 0; i < en.count; i++) a.push(u32(o + i * 8) / (u32(o + i * 8 + 4) || 1)); return a; }
    var out = {}, ifd0 = ifd(u32(4));
    var dt = null;
    if (ifd0[0x8769]) { var ex = ifd(u32(ifd0[0x8769].val)); if (ex[0x9003]) dt = str(ex[0x9003]); }
    if (!dt && ifd0[0x0132]) dt = str(ifd0[0x0132]);
    if (dt && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}/.test(dt)) out.tanggal = dt.slice(0, 10).replace(/:/g, '-') + 'T' + dt.slice(11, 16);
    if (ifd0[0x8825]) {
      var g = ifd(u32(ifd0[0x8825].val));
      if (g[2] && g[4]) {
        var la = rat(g[2]), lo = rat(g[4]);
        var lat = la[0] + la[1] / 60 + la[2] / 3600, lng = lo[0] + lo[1] / 60 + lo[2] / 3600;
        if (g[1] && String.fromCharCode(v.getUint8(g[1].val)) === 'S') lat = -lat;
        if (g[3] && String.fromCharCode(v.getUint8(g[3].val)) === 'W') lng = -lng;
        out.lat = Math.round(lat * 1e6) / 1e6; out.lng = Math.round(lng * 1e6) / 1e6;
      }
    }
    return out.tanggal || out.lat ? out : null;
  }

  // kecilkan foto agar hemat kuota Drive (sisi terpanjang 1600 px, JPEG kualitas 0.82)
  function kompres(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var maks = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, maks / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(new Error('Gambar tidak bisa dibaca')); };
      img.src = url;
    });
  }

  function unduhXlsx(namaFile, sheets) {
    if (typeof XLSX === 'undefined') { toast('Pustaka Excel belum termuat. Periksa koneksi internet.', true); return; }
    var wb = XLSX.utils.book_new();
    sheets.forEach(function (s) { XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rows), s.nama.slice(0, 31)); });
    XLSX.writeFile(wb, namaFile);
  }

  return { esc: esc, n: n, angka: angka, rp: rp, ha: ha, persen: persen, singkat: singkat, tgl: tgl, tglPendek: tglPendek, namaHari: namaHari,
    rentang: rentang, tambahHari: tambahHari, terbilang: terbilang, terbilangRp: terbilangRp, kalimatHari: kalimatHari, toast: toast,
    dialog: dialog, tutupDialog: tutupDialog, bacaBuffer: bacaBuffer, keBase64: keBase64, dataURL: dataURL, blobURL: blobURL,
    exif: exif, kompres: kompres, unduhXlsx: unduhXlsx, BULAN: BULAN, HARI: HARI };
})();
