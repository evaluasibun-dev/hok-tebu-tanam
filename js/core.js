/*
 * HOK Tebu 2026 (skema 15 + 25: pengolahan lahan dan penanaman) – logika inti
 * Dipakai bersama oleh Apps Script (Core.gs), halaman web (validasi langsung) dan mode demo.
 * Jangan mengubah salah satu salinan saja: ubah di sini, lalu salin ulang ke Core.gs.
 */
var HOK = (function () {
  'use strict';

  var VERSI = '2.0.1';

  // ------------------------------------------------------------------ skema tabel
  var TABEL = {
    SETTING: ['kunci', 'nilai'],
    PROVINSI: ['provinsi', 'kode', 'upah_pl', 'upah_br'],
    KABUPATEN: ['kab', 'kode', 'provinsi', 'ppk', 'nip_ppk', 'unit', 'penetap', 'sk_ppk', 'kedudukan',
      'bendahara', 'nip_bendahara', 'tim_teknis', 'nip_tim_teknis', 'upah_pl', 'upah_br', 'hokha_pl', 'hokha_br', 'target_luas'],
    POKTAN: ['id', 'kab', 'keg', 'poktan', 'ketua', 'nik_ketua', 'jalan', 'desa', 'kec', 'bank', 'norek', 'namarek', 'npwp',
      'luas', 'hokha_khusus', 'upah_khusus', 'no_cpcl', 'tgl_cpcl', 'no_spk', 'tgl_spk', 'tempat_spk', 'jalan_spk', 'spk_sd',
      'tgl_sptjm', 'tgl_rukk', 'mulai', 'selesai', 'tgl_lap', 'no_bap', 'tgl_bap', 'no_bast', 'tgl_bast', 'no_kw', 'tgl_kw',
      'tgl_tt', 'real_luas', 'folder_id', 'dok', 'diubah', 'oleh', 'mulai_olah', 'npwp_an', 'selesai_olah', 'mulai_tanam'],
    PEKERJA: ['id', 'id_poktan', 'kab', 'nama', 'nik', 'alamat', 'hadir', 'diubah', 'oleh', 'jenis'],
    PENGGUNA: ['id', 'nama', 'peran', 'provinsi', 'kab', 'kode_hash', 'aktif', 'dibuat', 'terakhir_masuk'],
    LOG: ['waktu', 'pengguna', 'aksi', 'rincian']
  };

  // Teks kegiatan untuk skema 15 + 25 HOK (pengolahan lahan dan penanaman). Sesuaikan dengan juknis bila ada perbedaan istilah.
  var KEG = {
    'Perluasan Tanaman Tebu': {
      kode: 'PL', nama: 'Perluasan Tanaman Tebu', judul: 'KEGIATAN PERLUASAN TANAMAN TEBU',
      bantuan: 'Bantuan Biaya Pengolahan Lahan dan Penanaman', jenis: 'Pengolahan Lahan dan Penanaman',
      frasa: 'Bantuan Biaya Pengolahan Lahan dan Penanaman Kegiatan Perluasan Tanaman Tebu',
      biaya: 'Biaya Pengolahan Lahan dan Penanaman Kegiatan Perluasan Tanaman Tebu',
      spk2: 'BIAYA PENGOLAHAN LAHAN DAN PENANAMAN', spk3: 'KEGIATAN PERLUASAN TANAMAN TEBU',
      sptjm: 'Kegiatan Perluasan Tanaman Tebu', dok3: 'PENGOLAHAN LAHAN DAN PENANAMAN', swadaya: 'Perluasan Tanaman Tebu'
    },
    'Bongkar Ratoon': {
      kode: 'BR', nama: 'Bongkar Ratoon', judul: 'KEGIATAN BONGKAR RATOON',
      bantuan: 'Bantuan Biaya Pengolahan Lahan dan Penanaman', jenis: 'Pengolahan Lahan dan Penanaman',
      frasa: 'Bantuan Biaya Pengolahan Lahan dan Penanaman Kegiatan Bongkar Ratoon',
      biaya: 'Biaya Pengolahan Lahan dan Penanaman Kegiatan Bongkar Ratoon',
      spk2: 'BIAYA PENGOLAHAN LAHAN DAN PENANAMAN', spk3: 'KEGIATAN BONGKAR RATOON TANAMAN TEBU',
      sptjm: 'Kegiatan Bongkar Ratoon', dok3: 'PENGOLAHAN LAHAN DAN PENANAMAN', swadaya: 'Bongkar Ratoon'
    }
  };

  // Jenis pekerjaan: HOK per hektare dibagi 15 untuk pengolahan lahan dan 25 untuk penanaman (diatur di SETTING)
  var JENIS = {
    olah: { kode: 'olah', label: 'Pengolahan Lahan', judul: 'PENGOLAHAN LAHAN', kunci: 'hokha_olah', bawaan: 15 },
    tanam: { kode: 'tanam', label: 'Penanaman', judul: 'PENANAMAN', kunci: 'hokha_tanam', bawaan: 25 }
  };
  var DAFTAR_JENIS = ['olah', 'tanam'];
  function jenisW(w) { return s(w && w.jenis) === 'tanam' ? 'tanam' : 'olah'; }
  function jenisOk(j) { return j === 'tanam' ? 'tanam' : 'olah'; }

  // Struktur folder dokumen per poktan dan slot berkas yang diharapkan
  var SUBFOLDER = { rek: '1_Buku_Rekening', geo: '2_Foto_Geotag', ktp: '3_KTP_Pekerja', ttd: '4_Dokumen_TTD', idn: '5_KTP_Ketua_NPWP' };
  var NPWP_AN = ['Kelompok Tani', 'Ketua Kelompok Tani', 'Pengurus lain'];
  var SLOT = {
    idn: [['ktp_ketua', 'KTP ketua kelompok tani'], ['npwp', 'NPWP kelompok tani / ketua']],
    rek: [['depan', 'Halaman depan'], ['mutasi_sebelum', 'Mutasi sebelum dana masuk'], ['mutasi_sesudah', 'Mutasi setelah ditarik']],
    geo: [['olah_0persen_1', 'Pengolahan 0% · foto 1'], ['olah_0persen_2', 'Pengolahan 0% · foto 2'], ['olah_50persen_1', 'Pengolahan 50% · foto 1'], ['olah_50persen_2', 'Pengolahan 50% · foto 2'],
      ['olah_100persen_1', 'Pengolahan 100% · foto 1'], ['olah_100persen_2', 'Pengolahan 100% · foto 2'],
      ['tanam_0persen_1', 'Penanaman 0% · foto 1'], ['tanam_0persen_2', 'Penanaman 0% · foto 2'], ['tanam_50persen_1', 'Penanaman 50% · foto 1'], ['tanam_50persen_2', 'Penanaman 50% · foto 2'],
      ['tanam_100persen_1', 'Penanaman 100% · foto 1'], ['tanam_100persen_2', 'Penanaman 100% · foto 2']],
    ttd: [['F01_SPK', 'F01 SPK'], ['F02_SPTJM', 'F02 SPTJM'], ['F03_RUKK', 'F03 RUKK'],
      ['F05_Daftar_Hadir_Pengolahan', 'F05 Daftar hadir pengolahan'], ['F05_Daftar_Hadir_Penanaman', 'F05 Daftar hadir penanaman'],
      ['F06_Laporan', 'F06 Laporan pelaksanaan'], ['F07_BAP', 'F07 BA Pemeriksaan'], ['F08_BAST', 'F08 BAST'],
      ['F09_Tanda_Terima_Pengolahan', 'F09 Tanda terima pengolahan'], ['F09_Tanda_Terima_Penanaman', 'F09 Tanda terima penanaman'],
      ['F10_Dokumentasi_Pengolahan', 'F10 Dokumentasi pengolahan'], ['F10_Dokumentasi_Penanaman', 'F10 Dokumentasi penanaman'], ['F11_Kwitansi', 'F11 Kwitansi']]
  };
  var MIME_OK = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };
  var MAX_BASE64 = 14 * 1024 * 1024; // ±10 MB per berkas

  var PROV_NIK = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 31, 32, 33, 34, 35, 36, 51, 52, 53, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 76, 81, 82, 91, 92, 93, 94, 95, 96];
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Kolom POKTAN yang boleh diubah lewat formulir (folder_id, dok, diubah, oleh diatur sistem)
  var FIELD_POKTAN = TABEL.POKTAN.filter(function (k) { return ['id', 'folder_id', 'dok', 'diubah', 'oleh'].indexOf(k) < 0; });
  var FIELD_TANGGAL = ['tgl_cpcl', 'tgl_spk', 'spk_sd', 'tgl_sptjm', 'tgl_rukk', 'mulai', 'mulai_olah', 'selesai_olah', 'mulai_tanam', 'selesai', 'tgl_lap', 'tgl_bap', 'tgl_bast', 'tgl_kw', 'tgl_tt'];
  var FIELD_KAB_OPERATOR = ['ppk', 'nip_ppk', 'unit', 'penetap', 'sk_ppk', 'kedudukan', 'bendahara', 'nip_bendahara', 'tim_teknis', 'nip_tim_teknis'];

  // ------------------------------------------------------------------ util
  function s(v) { return v === null || v === undefined ? '' : String(v).trim(); }
  function num(v) {
    var t = s(v);
    if (!t) return 0;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else if (t.indexOf(',') >= 0 && t.indexOf('.') < 0) t = t.replace(',', '.');
    else t = t.replace(/,/g, '');
    var n = parseFloat(t);
    return isFinite(n) ? n : 0;
  }
  function isISO(d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s(d))) return false;
    var p = d.split('-').map(Number), dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return dt.getUTCFullYear() === p[0] && dt.getUTCMonth() === p[1] - 1 && dt.getUTCDate() === p[2];
  }
  function hari(d) { var p = d.split('-').map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5); }
  function dariHari(n) { return new Date(n * 864e5).toISOString().slice(0, 10); }
  function senin(d) { var n = hari(d), dow = (new Date(n * 864e5).getUTCDay() + 6) % 7; return dariHari(n - dow); }
  function tglPendek(d) { if (!isISO(d)) return '–'; var p = d.split('-'); return Number(p[2]) + ' ' + BULAN[Number(p[1]) - 1].slice(0, 3) + ' ' + p[0]; }
  function hariIni(env) { return new Date(env.now().getTime() + 7 * 3600e3).toISOString().slice(0, 10); }
  function waktuJakarta(env) { return new Date(env.now().getTime() + 7 * 3600e3).toISOString().replace('T', ' ').slice(0, 19); }
  function rp(n) { return 'Rp' + Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function bersih(t) { return s(t).replace(/[\\/:*?"<>|.,]/g, '').replace(/\s+/g, '-'); }
  function kodeKeg(keg) { return KEG[keg] ? KEG[keg].kode : 'PL'; }
  function idLokal(id) { var m = s(id).match(/P\d+$/); return m ? m[0] : s(id); }
  function namaFolder(p) { return idLokal(p.id) + '_' + bersih(p.poktan) + '_' + kodeKeg(p.keg); }
  function parseHadir(t) { return s(t) ? s(t).split(',').map(function (x) { return x.trim(); }).filter(Boolean) : []; }
  function parseJSON(t, def) { try { return t ? JSON.parse(t) : def; } catch (e) { return def; } }
  function by(arr, key) { var o = {}; arr.forEach(function (r) { o[r[key]] = r; }); return o; }

  // ------------------------------------------------------------------ SHA-256 (murni JS, agar sama di semua tempat)
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, maxWord = mp(2, 32), result = '', words = [], i, j;
    var str = unescape(encodeURIComponent(ascii)), asciiBitLength = str.length * 8;
    var hash = [], k = [], primeCounter = 0, isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mp(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mp(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    str += '\x80';
    while (str.length % 64 - 56) str += '\x00';
    for (i = 0; i < str.length; i++) {
      j = str.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var temp1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
    return result;
  }

  // ------------------------------------------------------------------ NIK
  function cekNik(nik) {
    var t = s(nik);
    if (!t) return { error: 'NIK kosong', peringatan: [] };
    if (!/^\d+$/.test(t)) return { error: 'NIK mengandung huruf atau simbol', peringatan: [] };
    if (t.length < 16) return { error: 'NIK kurang dari 16 digit (' + t.length + ' digit)', peringatan: [] };
    if (t.length > 16) return { error: 'NIK lebih dari 16 digit (' + t.length + ' digit)', peringatan: [] };
    var w = [], dd = Number(t.slice(6, 8)), mm = Number(t.slice(8, 10));
    if (PROV_NIK.indexOf(Number(t.slice(0, 2))) < 0) w.push('kode provinsi pada NIK tidak dikenal');
    if (!((dd >= 1 && dd <= 31) || (dd >= 41 && dd <= 71))) w.push('tanggal lahir pada NIK tidak wajar');
    if (mm < 1 || mm > 12) w.push('bulan lahir pada NIK tidak wajar');
    if (t.slice(12) === '0000') w.push('4 digit terakhir NIK 0000');
    return { error: null, peringatan: w };
  }

  // ------------------------------------------------------------------ konteks & perhitungan
  function settingObj(rows) {
    var o = {};
    rows.forEach(function (r) { o[r.kunci] = r.nilai; });
    return o;
  }

  function tarif(p, ctx) {
    var kab = ctx.kabBy[p.kab] || {}, prov = ctx.provBy[kab.provinsi] || {};
    var pl = kodeKeg(p.keg) === 'PL';
    var stdUpah = num(pl ? prov.upah_pl : prov.upah_br);
    var hok = {};
    DAFTAR_JENIS.forEach(function (j) { hok[j] = num(ctx.setting[JENIS[j].kunci]) || JENIS[j].bawaan; });
    var stdHok = hok.olah + hok.tanam;
    var upah = num(p.upah_khusus) || num(pl ? kab.upah_pl : kab.upah_br) || stdUpah;
    return { upah: upah, hokha: stdHok, hok: hok, stdUpah: stdUpah, stdHok: stdHok };
  }

  function konteks(env) {
    var st = env.store;
    var ctx = {
      setting: settingObj(st.all('SETTING')),
      prov: st.all('PROVINSI'),
      kab: st.all('KABUPATEN'),
      poktan: st.all('POKTAN'),
      pekerja: st.all('PEKERJA')
    };
    ctx.provBy = by(ctx.prov, 'provinsi');
    ctx.kabBy = by(ctx.kab, 'kab');
    ctx.poktanBy = by(ctx.poktan, 'id');
    ctx.pekerjaPer = {};
    ctx.pekerja.forEach(function (w) {
      w._hadir = parseHadir(w.hadir);
      (ctx.pekerjaPer[w.id_poktan] = ctx.pekerjaPer[w.id_poktan] || []).push(w);
    });
    return ctx;
  }

  // indeks NIK → tanggal → daftar id_poktan (untuk hari ganda) dan NIK → bulan → set tanggal
  function indeksHadir(pekerja) {
    var idx = {};
    pekerja.forEach(function (w) {
      var nik = s(w.nik);
      if (!nik) return;
      var per = idx[nik] = idx[nik] || {};
      (w._hadir || parseHadir(w.hadir)).forEach(function (d) {
        (per[d] = per[d] || []).push({ pid: w.id_poktan, jenis: jenisW(w) });
      });
    });
    return idx;
  }

  function tahap(p, rHOK) {
    if (isISO(p.tgl_kw) || s(p.no_kw)) return 5;
    if (isISO(p.tgl_bast)) return 4;
    if (isISO(p.tgl_bap)) return 3;
    if (rHOK > 0) return 2;
    if (isISO(p.tgl_spk) || s(p.no_spk)) return 1;
    return 0;
  }
  var NAMA_TAHAP = ['Belum SPK', 'SPK', 'Berjalan', 'BAP', 'BAST', 'Kwitansi'];

  function ringkasDok(p, nPek, niks) {
    var d = parseJSON(p.dok, null) || { rek: [], geo: [], ktp: [], ttd: [], idn: [] };
    var ktpNik = (d.ktp || []).map(function (n) { return n.slice(0, 16); });
    var idnAda = d.idn || [], ktpKetua = idnAda.indexOf('ktp_ketua') >= 0;
    // ketua yang ikut bekerja boleh memakai KTP ketua sebagai KTP pekerja
    var ktpCocok = (niks || []).filter(function (n) { return ktpNik.indexOf(n) >= 0 || (ktpKetua && n && n === s(p.nik_ketua)); }).length;
    var cocok = function (g) { return SLOT[g].filter(function (x) { return (d[g] || []).indexOf(x[0]) >= 0; }).length; };
    var rek = cocok('rek'), geo = cocok('geo'), ttd = cocok('ttd'), idn = cocok('idn');
    var geoJ = {}; DAFTAR_JENIS.forEach(function (j) { geoJ[j] = (d.geo || []).filter(function (n) { return n.indexOf(j + '_') === 0; }).length; });
    var butuh = SLOT.idn.length + SLOT.rek.length + SLOT.geo.length + nPek + SLOT.ttd.length, ada = idn + rek + geo + ktpCocok + ttd;
    return { idn: idn, geoJenis: geoJ, ktpKetua: ktpKetua, npwp: idnAda.indexOf('npwp') >= 0, rek: rek, geo: geo, ktp: ktpCocok, ktpFile: (d.ktp || []).length, ttd: ttd, nPek: nPek,
      persen: butuh ? Math.round(ada / butuh * 100) : 0, ada: ada, butuh: butuh, lengkap: ada === butuh && nPek > 0 };
  }

  // ------------------------------------------------------------------ validasi poktan
  function validasiPoktan(p, ctx, opsi) {
    opsi = opsi || {};
    var out = [];
    function E(field, pesan) { out.push({ level: 'error', field: field, pesan: pesan }); }
    function W(field, pesan) { out.push({ level: 'peringatan', field: field, pesan: pesan }); }
    if (!s(p.poktan)) E('poktan', 'Nama kelompok tani wajib diisi');
    if (!KEG[p.keg]) E('keg', 'Pilih kegiatan: Perluasan Tanaman Tebu atau Bongkar Ratoon');
    if (!ctx.kabBy[p.kab]) E('kab', 'Kabupaten tidak terdaftar');
    if (!(num(p.luas) > 0)) E('luas', 'Luas target harus lebih dari 0 ha');
    FIELD_TANGGAL.forEach(function (f) { if (s(p[f]) && !isISO(p[f])) E(f, 'Format tanggal tidak valid'); });
    if (s(p.nik_ketua)) {
      var nk = cekNik(p.nik_ketua);
      if (nk.error) E('nik_ketua', 'NIK ketua: ' + nk.error);
      nk.peringatan.forEach(function (w) { W('nik_ketua', 'NIK ketua: ' + w); });
    }
    if (s(p.npwp)) {
      var dg = s(p.npwp).replace(/[.\-\s]/g, '');
      if (!/^\d+$/.test(dg) || (dg.length !== 15 && dg.length !== 16)) W('npwp', 'NPWP biasanya 15 digit (format lama) atau 16 digit (sama dengan NIK)');
      if (!s(p.npwp_an)) W('npwp_an', 'Pilih NPWP atas nama kelompok tani, ketua, atau pengurus lain');
    }
    if (s(p.npwp_an) && NPWP_AN.indexOf(s(p.npwp_an)) < 0) E('npwp_an', 'Pilihan NPWP atas nama tidak dikenal');
    var d = function (f) { return isISO(p[f]) ? p[f] : null; };
    var dipa = isISO(ctx.setting.tgl_dipa) ? ctx.setting.tgl_dipa : null;
    if (d('tgl_spk') && dipa && d('tgl_spk') <= dipa) E('tgl_spk', 'SPK harus setelah tanggal DIPA (' + tglPendek(dipa) + ')');
    if (d('tgl_spk') && d('tgl_cpcl') && d('tgl_spk') < d('tgl_cpcl')) E('tgl_spk', 'SPK tidak boleh mendahului SK CPCL');
    if (d('tgl_sptjm') && d('tgl_spk') && d('tgl_sptjm') < d('tgl_spk')) E('tgl_sptjm', 'SPTJM harus sama dengan atau setelah SPK');
    if (d('tgl_rukk') && d('tgl_spk') && d('tgl_rukk') < d('tgl_spk')) E('tgl_rukk', 'RUKK harus sama dengan atau setelah SPK');
    if (d('tgl_rukk') && d('mulai') && d('tgl_rukk') >= d('mulai')) E('tgl_rukk', 'RUKK harus sebelum pekerjaan dimulai');
    if (d('mulai') && d('tgl_spk') && d('mulai') <= d('tgl_spk')) E('mulai', 'Pekerjaan harus dimulai setelah tanggal SPK');
    if (d('selesai') && d('mulai') && d('selesai') < d('mulai')) E('selesai', 'Tanggal selesai sebelum tanggal mulai');
    if (d('selesai') && d('spk_sd') && d('selesai') > d('spk_sd')) E('selesai', 'Pekerjaan selesai melewati masa berlaku SPK');
    if (d('mulai_olah') && d('mulai') && d('mulai_olah') < d('mulai')) E('mulai_olah', 'Pengolahan lahan tidak boleh dimulai sebelum tanggal mulai pekerjaan (SPK)');
    if (d('mulai_olah') && d('selesai') && d('mulai_olah') > d('selesai')) E('mulai_olah', 'Pengolahan lahan harus dimulai sebelum tanggal selesai pekerjaan');
    if (d('selesai_olah') && d('mulai_olah') && d('selesai_olah') < d('mulai_olah')) E('selesai_olah', 'Selesai pengolahan sebelum mulai pengolahan');
    if (d('selesai_olah') && d('mulai') && d('selesai_olah') < d('mulai')) E('selesai_olah', 'Selesai pengolahan sebelum tanggal mulai pekerjaan (SPK)');
    if (d('selesai_olah') && d('selesai') && d('selesai_olah') > d('selesai')) E('selesai_olah', 'Pengolahan lahan harus selesai paling lambat tanggal selesai pekerjaan (SPK)');
    if (d('mulai_tanam') && d('mulai') && d('mulai_tanam') < d('mulai')) E('mulai_tanam', 'Penanaman tidak boleh dimulai sebelum tanggal mulai pekerjaan (SPK)');
    if (d('mulai_tanam') && d('selesai') && d('mulai_tanam') > d('selesai')) E('mulai_tanam', 'Penanaman harus dimulai paling lambat tanggal selesai pekerjaan');
    var batasSpk = num(ctx.setting.batas_hari_spk);
    if (batasSpk > 0 && d('mulai') && d('selesai') && hari(d('selesai')) - hari(d('mulai')) + 1 > batasSpk) E('selesai', 'Rentang pekerjaan lebih dari ' + batasSpk + ' hari (batas diatur pusat di Pengaturan)');
    if (d('tgl_lap') && d('selesai') && d('tgl_lap') < d('selesai')) E('tgl_lap', 'Laporan pelaksanaan harus setelah pekerjaan selesai');
    if (d('tgl_bap') && d('selesai') && d('tgl_bap') < d('selesai')) E('tgl_bap', 'BA Pemeriksaan harus setelah pekerjaan selesai');
    if (d('tgl_bast') && d('tgl_bap') && d('tgl_bast') < d('tgl_bap')) E('tgl_bast', 'BAST harus sama dengan atau setelah BA Pemeriksaan');
    if (d('tgl_kw') && d('tgl_bast') && d('tgl_kw') < d('tgl_bast')) E('tgl_kw', 'Kwitansi harus sama dengan atau setelah BAST');
    if (num(p.real_luas) > num(p.luas)) E('real_luas', 'Realisasi luas melebihi luas target');
    var t = tarif(p, ctx);
    if (t.stdUpah && t.upah > t.stdUpah) W('upah_khusus', 'Upah/HOK ' + rp(t.upah) + ' melebihi standar provinsi ' + rp(t.stdUpah));
    // kehadiran yang sudah tercatat harus tetap di dalam periode jenis pekerjaannya dan tidak melebihi target per jenis
    var pek = opsi.pekerja || ctx.pekerjaPer[p.id] || [];
    if (pek.length) {
      DAFTAR_JENIS.forEach(function (j) {
        var tJ = Math.round(num(p.luas) * t.hok[j]), rJ = 0, luar = 0;
        pek.filter(function (w) { return jenisW(w) === j; }).forEach(function (w) {
          var hd = w._hadir || parseHadir(w.hadir);
          rJ += hd.length;
          hd.forEach(function (x) { if (diLuar(p, j, x)) luar++; });
        });
        if (luar) E(j === 'olah' ? (d('selesai_olah') ? 'selesai_olah' : 'mulai_olah') : 'mulai_tanam', luar + ' hari kehadiran ' + JENIS[j].label.toLowerCase() + ' berada di luar masa ' + JENIS[j].label.toLowerCase());
        if (tJ && rJ > tJ) E('luas', 'Realisasi HOK ' + JENIS[j].label.toLowerCase() + ' (' + rJ + ') melebihi target HOK ' + JENIS[j].label.toLowerCase() + ' (' + tJ + ')');
      });
    }
    // NIK ketua / rekening dipakai poktan lain (nama poktan berbeda)
    if (opsi.lintas !== false) {
      ctx.poktan.forEach(function (o) {
        if (o.id === p.id || s(o.poktan).toLowerCase() === s(p.poktan).toLowerCase()) return;
        if (s(p.nik_ketua) && s(o.nik_ketua) === s(p.nik_ketua)) W('nik_ketua', 'NIK ketua sama dengan ketua ' + o.poktan + ' (' + o.id + ')');
        if (s(p.norek) && s(o.norek) === s(p.norek)) W('norek', 'No. rekening sama dengan ' + o.poktan + ' (' + o.id + ')');
      });
    }
    return out;
  }

  // ------------------------------------------------------------------ validasi pekerja (saat simpan)
  // rows: [{id, nama, nik, alamat, hadir:[iso]}]; others: pekerja poktan lain (seluruh kabupaten)
  // opsi.lama: baris pekerja poktan ini yang sudah tersimpan. Bentrok pada tanggal yang sudah tersimpan sebelumnya
  // tidak memblokir simpan (tetap tercatat sebagai temuan); hanya tanggal baru yang bentrok yang ditolak.
  // awal kehadiran HOK = tgl mulai pengolahan lahan (bila diisi), selain itu tgl mulai pekerjaan SPK; akhirnya = tgl selesai pekerjaan
  function awalHadir(p) { return periode(p, 'olah').awal; }
  // periode kehadiran per jenis pekerjaan. Pengolahan: tgl mulai–selesai pengolahan; penanaman: tgl mulai penanaman–tgl selesai pekerjaan (SPK).
  // Bila belum diisi, memakai tgl mulai/selesai pekerjaan SPK. Kedua periode boleh tumpang tindih.
  function periode(p, j) {
    var m = isISO(p.mulai) ? p.mulai : null, sl = isISO(p.selesai) ? p.selesai : null;
    if (jenisOk(j) === 'tanam') return { awal: isISO(p.mulai_tanam) ? p.mulai_tanam : m, akhir: sl };
    return { awal: isISO(p.mulai_olah) ? p.mulai_olah : m, akhir: isISO(p.selesai_olah) ? p.selesai_olah : sl };
  }
  function diLuar(p, j, x) { var pr = periode(p, j); return (pr.awal && x < pr.awal) || (pr.akhir && x > pr.akhir); }

  // opsi.jenis: 'olah' (pengolahan lahan, bawaan) atau 'tanam' (penanaman). rows = daftar pekerja jenis itu saja.
  // Satu NIK boleh ikut kedua jenis pekerjaan, tetapi tidak boleh tercatat hadir di dua tempat (poktan lain atau jenis lain) pada tanggal yang sama.
  function validasiPekerja(p, rows, ctx, opsi) {
    opsi = opsi || {};
    var j = jenisOk(opsi.jenis), lbl = JENIS[j].label.toLowerCase();
    var errors = [], warns = [], lama = {};
    (opsi.lama || []).forEach(function (w) { var k = s(w.nik); lama[k] = lama[k] || {}; (w._hadir || w.hadir || []).forEach(function (x) { lama[k][x] = 1; }); });
    var t = tarif(p, ctx), tHOK = Math.round(num(p.luas) * t.hok[j]);
    var pr = periode(p, j), mulai = pr.awal, selesai = pr.akhir;
    var lain = ctx.pekerja.filter(function (w) { return !(w.id_poktan === p.id && jenisW(w) === j); });
    var idx = indeksHadir(lain);
    var batas = num(ctx.setting.batas_hari_bulan);
    var seenNik = {}, total = 0;
    if (rows.some(function (r) { return (r.hadir || []).length; }) && (!mulai || !selesai))
      errors.push({ row: -1, field: 'mulai', pesan: 'Isi tanggal mulai dan selesai pekerjaan serta tanggal ' + lbl + ' di Data Poktan sebelum mengisi kehadiran' });
    rows.forEach(function (r, i) {
      var nama = s(r.nama), nik = s(r.nik), hd = r.hadir || [];
      if (!nama) errors.push({ row: i, field: 'nama', pesan: 'Nama pekerja wajib diisi' });
      var nk = cekNik(nik);
      if (nk.error) errors.push({ row: i, field: 'nik', pesan: nk.error });
      nk.peringatan.forEach(function (w) { warns.push({ row: i, field: 'nik', pesan: w }); });
      if (nik && seenNik[nik] !== undefined) errors.push({ row: i, field: 'nik', pesan: 'NIK ganda dengan baris ' + (seenNik[nik] + 1) + ' di daftar ' + lbl + ' ini' });
      if (nik && seenNik[nik] === undefined) seenNik[nik] = i;
      var uniq = {};
      hd.forEach(function (x) {
        if (!isISO(x)) { errors.push({ row: i, field: 'hadir', tanggal: x, pesan: 'Tanggal tidak valid: ' + x }); return; }
        if (uniq[x]) return;
        uniq[x] = 1;
        if ((mulai && x < mulai) || (selesai && x > selesai)) errors.push({ row: i, field: 'hadir', tanggal: x, pesan: 'Hadir ' + tglPendek(x) + ' di luar masa ' + lbl + ' (' + tglPendek(mulai) + ' – ' + tglPendek(selesai) + ')' });
        var bentrok = idx[nik] && idx[nik][x];
        if (bentrok && bentrok.length) {
          var b0 = bentrok[0], m;
          if (b0.pid === p.id) m = 'Pada ' + tglPendek(x) + ' NIK ini sudah tercatat hadir di daftar ' + JENIS[b0.jenis].label.toLowerCase() + ' poktan ini';
          else {
            var o = ctx.poktanBy[b0.pid] || {};
            m = 'Pada ' + tglPendek(x) + ' NIK ini sudah tercatat hadir di ' + (o.poktan || b0.pid) + ' (' + b0.pid + ', ' + (o.kab || '') + ', ' + JENIS[b0.jenis].label.toLowerCase() + ')';
          }
          if (lama[nik] && lama[nik][x]) warns.push({ row: i, field: 'hadir', tanggal: x, bentrok: true, pesan: m + ' (data lama, perlu klarifikasi)' });
          else errors.push({ row: i, field: 'hadir', tanggal: x, pesan: m });
        }
      });
      total += Object.keys(uniq).length;
      if (batas && nik) {
        var perBulan = {};
        Object.keys(uniq).forEach(function (x) { (perBulan[x.slice(0, 7)] = perBulan[x.slice(0, 7)] || {})[x] = 1; });
        Object.keys(idx[nik] || {}).forEach(function (x) { if (perBulan[x.slice(0, 7)]) perBulan[x.slice(0, 7)][x] = 1; });
        Object.keys(perBulan).forEach(function (b) {
          var n = Object.keys(perBulan[b]).length;
          if (n > batas) errors.push({ row: i, field: 'hadir', pesan: 'Total hari kerja NIK ini di ' + BULAN[Number(b.slice(5)) - 1] + ' ' + b.slice(0, 4) + ' = ' + n + ' hari, melebihi batas ' + batas + ' hari' });
        });
      }
    });
    if (tHOK && total > tHOK) errors.push({ row: -1, field: 'hadir', pesan: 'Total HOK ' + lbl + ' (' + total + ') melebihi target HOK ' + lbl + ' (' + tHOK + ' = ' + t.hok[j] + ' HOK/ha × ' + num(p.luas) + ' ha)' });
    return { errors: errors, peringatan: warns, total: total, tHOK: tHOK, jenis: j };
  }

  // ------------------------------------------------------------------ hitung semua poktan (status, temuan, potensi)
  function hitungSemua(ctx) {
    var idx = indeksHadir(ctx.pekerja);
    var batas = num(ctx.setting.batas_hari_bulan);
    var hasil = {}, temuan = [];
    // hari ganda: per NIK per tanggal, baris yang tercatat paling awal (kolom diubah) dianggap sah;
    // hari pada baris yang dicatat belakangan dihitung sebagai kelebihan
    var perTgl = {};
    ctx.pekerja.forEach(function (w) {
      var nik = s(w.nik);
      if (!nik) return;
      w._hadir.forEach(function (x) { (perTgl[nik + '|' + x] = perTgl[nik + '|' + x] || []).push(w); });
    });
    var lebihHari = {}; // id_pekerja → jumlah hari berlebih
    var gandaInfo = {}; // id_pekerja → [{tanggal, poktan lain}]
    // tempat = poktan + jenis pekerjaan; satu NIK di dua tempat pada tanggal yang sama = hari ganda
    var tempat = function (w) { return w.id_poktan + '|' + jenisW(w); };
    var labelTempat = function (q, w) { var a = q.split('|'); return a[0] === w.id_poktan ? JENIS[a[1]].label.toLowerCase() + ' poktan ini' : a[0]; };
    Object.keys(perTgl).forEach(function (k) {
      var list = perTgl[k];
      var beda = {};
      list.forEach(function (w) { beda[tempat(w)] = 1; });
      if (Object.keys(beda).length < 2) return;
      list.sort(function (a, b) { return s(a.diubah) < s(b.diubah) ? -1 : s(a.diubah) > s(b.diubah) ? 1 : (a.id < b.id ? -1 : 1); });
      var tanggal = k.split('|')[1];
      list.forEach(function (w, i) {
        if (i > 0) lebihHari[w.id] = (lebihHari[w.id] || 0) + 1;
        (gandaInfo[w.id] = gandaInfo[w.id] || []).push({ tanggal: tanggal, lain: Object.keys(beda).filter(function (q) { return q !== tempat(w); }).map(function (q) { return labelTempat(q, w); }) });
      });
    });
    // batas bulanan (hari unik NIK lintas poktan)
    var bulanLebih = {};
    if (batas) {
      Object.keys(idx).forEach(function (nik) {
        var perBulan = {};
        Object.keys(idx[nik]).forEach(function (x) { perBulan[x.slice(0, 7)] = (perBulan[x.slice(0, 7)] || 0) + 1; });
        Object.keys(perBulan).forEach(function (b) { if (perBulan[b] > batas) bulanLebih[nik + '|' + b] = { n: perBulan[b], lebih: perBulan[b] - batas }; });
      });
    }
    ctx.poktan.forEach(function (p) {
      var pek = ctx.pekerjaPer[p.id] || [];
      var t = tarif(p, ctx);
      var tHOK = Math.round(num(p.luas) * t.hokha), tBiaya = tHOK * t.upah;
      var rHOK = 0, minD = null, maxD = null, niks = [], seen = {}, potPek = 0, per = {};
      DAFTAR_JENIS.forEach(function (j) { per[j] = { tHOK: Math.round(num(p.luas) * t.hok[j]), rHOK: 0, nPek: 0, awal: null, akhir: null }; });
      var issues = validasiPoktan(p, ctx, { pekerja: pek }).map(function (x) {
        return { objek: 'Poktan', jenis: jenisDari(x), level: x.level, pesan: x.pesan, rp: 0 };
      });
      pek.forEach(function (w) {
        var nik = s(w.nik), j = jenisW(w), pj = per[j];
        if (niks.indexOf(nik) < 0) niks.push(nik);
        rHOK += w._hadir.length; pj.rHOK += w._hadir.length; pj.nPek++;
        w._hadir.forEach(function (x) {
          if (!minD || x < minD) minD = x; if (!maxD || x > maxD) maxD = x;
          if (!pj.awal || x < pj.awal) pj.awal = x; if (!pj.akhir || x > pj.akhir) pj.akhir = x;
        });
        var nk = cekNik(nik), msgs = [], lvl = 'peringatan', extra = 0;
        if (nk.error) { msgs.push(nk.error); lvl = 'error'; }
        nk.peringatan.forEach(function (m) { msgs.push(m); });
        if (nik && seen[nik + '|' + j]) { msgs.push('NIK ganda dalam daftar ' + JENIS[j].label.toLowerCase() + ' yang sama'); lvl = 'error'; }
        seen[nik + '|' + j] = 1;
        var luar = w._hadir.filter(function (x) { return diLuar(p, j, x); }).length;
        if (luar) { msgs.push('hadir ' + luar + ' hari di luar masa ' + JENIS[j].label.toLowerCase()); lvl = 'error'; extra += luar; }
        if (gandaInfo[w.id]) {
          var g = gandaInfo[w.id], lainId = {};
          g.forEach(function (x) { x.lain.forEach(function (q) { lainId[q] = 1; }); });
          msgs.push('hadir pada ' + g.length + ' tanggal yang sama di tempat lain (' + Object.keys(lainId).join(', ') + ')');
          lvl = 'error';
          extra += lebihHari[w.id] || 0;
        }
        if (batas) {
          var perB = {};
          w._hadir.forEach(function (x) { perB[x.slice(0, 7)] = (perB[x.slice(0, 7)] || 0) + 1; });
          Object.keys(perB).forEach(function (b) {
            var bl = bulanLebih[nik + '|' + b];
            if (bl) { msgs.push('hari kerja ' + b + ' = ' + bl.n + ' hari (batas ' + batas + ')'); lvl = 'error'; extra += bl.lebih * perB[b] / bl.n; }
          });
        }
        var rpPek = Math.round(extra * t.upah);
        potPek += rpPek;
        if (msgs.length) temuan.push({ id_poktan: p.id, kab: p.kab, poktan: p.poktan, objek: 'Pekerja ' + JENIS[j].label.toLowerCase(), nama: w.nama, nik: nik,
          jenis: jenisPekerja(msgs), level: lvl, pesan: msgs.join('; '), rp: rpPek });
      });
      var rBiaya = rHOK * t.upah;
      var luasEff = Math.min(num(p.luas), num(p.real_luas) || num(p.luas));
      var wajar = luasEff * Math.min(t.hokha, t.stdHok) * (t.stdUpah ? Math.min(t.upah, t.stdUpah) : t.upah);
      var potensi = Math.round(Math.max(Math.max(0, rBiaya - wajar), potPek));
      issues.forEach(function (x) { temuan.push({ id_poktan: p.id, kab: p.kab, poktan: p.poktan, objek: 'Poktan', nama: p.ketua, nik: p.nik_ketua, jenis: x.jenis, level: x.level, pesan: x.pesan, rp: 0 }); });
      if (potensi - potPek > 0) {
        var tPot = temuan.filter(function (x) { return x.id_poktan === p.id && x.objek === 'Poktan' && x.jenis === 'Kelebihan bayar'; });
        if (tPot.length) tPot[0].rp = potensi - potPek;
        else temuan.push({ id_poktan: p.id, kab: p.kab, poktan: p.poktan, objek: 'Poktan', nama: p.ketua, nik: p.nik_ketua, jenis: 'Kelebihan bayar', level: 'error',
          pesan: 'Realisasi biaya ' + rp(rBiaya) + ' melebihi nilai wajar ' + rp(wajar) + ' (luas × HOK/ha standar × upah standar)', rp: potensi - potPek });
      }
      var st = tahap(p, rHOK);
      var nTem = temuan.filter(function (x) { return x.id_poktan === p.id; }).length;
      var dok = ringkasDok(p, niks.length, niks);
      hasil[p.id] = {
        upah: t.upah, hokha: t.hokha, hok: t.hok, per: per, tHOK: tHOK, tBiaya: tBiaya, rHOK: rHOK, rBiaya: rBiaya, nPek: niks.length,
        tahap: st, namaTahap: NAMA_TAHAP[st], hadirAwal: minD, hadirAkhir: maxD, potensi: potensi, nTemuan: nTem, dok: dok,
        status: nTem ? 'Ada temuan' : (st === 5 && dok.lengkap ? 'Lengkap & sesuai' : (st >= 1 ? 'Berjalan' : 'Belum mulai'))
      };
    });
    return { per: hasil, temuan: temuan };
  }

  function jenisDari(x) {
    var m = x.pesan;
    if (/NIK ketua/.test(m)) return 'NIK ketua';
    if (/rekening/i.test(m)) return 'Rekening';
    if (/Upah|HOK\/ha|HOK \(|Realisasi/.test(m)) return 'Kelebihan bayar';
    if (/SPK|SPTJM|RUKK|BAST|Kwitansi|BA Pemeriksaan|Laporan|dimulai|selesai|tanggal/i.test(m)) return 'Urutan tanggal';
    return 'Data poktan';
  }
  function jenisPekerja(msgs) {
    var m = msgs.join(' ');
    if (/tanggal yang sama/.test(m)) return 'Hari ganda';
    if (/luar masa/.test(m)) return 'Hadir di luar periode';
    if (/batas/.test(m)) return 'Kelebihan hari per bulan';
    if (/luar tanggal|luar masa pengolahan/.test(m)) return 'Hadir di luar periode';
    if (/ganda/.test(m)) return 'NIK ganda';
    return 'NIK tidak valid';
  }

  // ------------------------------------------------------------------ cakupan pengguna
  function cakupanKab(user, ctx) {
    if (user.peran === 'pusat') return ctx.kab.map(function (k) { return k.kab; });
    if (user.peran === 'provinsi') return ctx.kab.filter(function (k) { return k.provinsi === user.provinsi; }).map(function (k) { return k.kab; });
    return [user.kab];
  }
  function bolehTulisKab(user, kab) { return user.peran === 'pusat' || (user.peran === 'kabupaten' && user.kab === kab); }

  // ------------------------------------------------------------------ rekap dashboard
  function rekap(ctx, hit, kabs) {
    var inK = {}; kabs.forEach(function (k) { inK[k] = 1; });
    var pok = ctx.poktan.filter(function (p) { return inK[p.kab]; });
    var perKab = {};
    kabs.forEach(function (k) {
      var kr = ctx.kabBy[k] || {};
      perKab[k] = { kab: k, provinsi: kr.provinsi || '', n: 0, luas: 0, tHOK: 0, tOlah: 0, tTanam: 0, rOlah: 0, rTanam: 0, tBiaya: 0, rHOK: 0, rBiaya: 0, nPek: 0, temuan: 0, potensi: 0, dokAda: 0, dokButuh: 0, dokLengkap: 0, targetLuas: num(kr.target_luas), berjalan: 0 };
    });
    var tahapN = [0, 0, 0, 0, 0, 0], minggu = {};
    pok.forEach(function (p) {
      var h = hit.per[p.id], r = perKab[p.kab];
      r.tOlah += h.per.olah.tHOK; r.tTanam += h.per.tanam.tHOK; r.rOlah += h.per.olah.rHOK; r.rTanam += h.per.tanam.rHOK;
      r.n++; r.luas += num(p.luas); r.tHOK += h.tHOK; r.tBiaya += h.tBiaya; r.rHOK += h.rHOK; r.rBiaya += h.rBiaya; r.nPek += h.nPek;
      r.temuan += h.nTemuan ? 1 : 0; r.potensi += h.potensi; r.dokAda += h.dok.ada; r.dokButuh += h.dok.butuh; r.dokLengkap += h.dok.lengkap ? 1 : 0;
      if (h.tahap >= 2) r.berjalan++;
      for (var i = 1; i <= h.tahap; i++) tahapN[i]++;
      (ctx.pekerjaPer[p.id] || []).forEach(function (w) { w._hadir.forEach(function (x) { var m = senin(x); minggu[m] = (minggu[m] || 0) + 1; }); });
    });
    var rows = kabs.map(function (k) { return perKab[k]; });
    var tot = rows.reduce(function (a, r) {
      ['n', 'luas', 'tHOK', 'tOlah', 'tTanam', 'rOlah', 'rTanam', 'tBiaya', 'rHOK', 'rBiaya', 'nPek', 'temuan', 'potensi', 'dokAda', 'dokButuh', 'dokLengkap', 'targetLuas', 'berjalan'].forEach(function (f) { a[f] = (a[f] || 0) + r[f]; });
      return a;
    }, {});
    var mk = Object.keys(minggu).sort(), seri = [];
    if (mk.length) for (var d = hari(mk[0]); d <= hari(mk[mk.length - 1]); d += 7) seri.push({ minggu: dariHari(d), hok: minggu[dariHari(d)] || 0 });
    return { kab: rows, total: tot, tahap: tahapN, jumlahPoktan: pok.length, minggu: seri, kabAdaData: rows.filter(function (r) { return r.n > 0; }).length };
  }

  // ------------------------------------------------------------------ autentikasi
  var ALFABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function kodeAcak(prefix, env) {
    var b = env.randomBytes(8), t = '';
    for (var i = 0; i < 8; i++) { t += ALFABET[b[i] % 32]; if (i === 3) t += '-'; }
    return prefix + '-' + t;
  }
  function hashKode(kode, salt) { return sha256(s(salt) + '|' + s(kode).toUpperCase().replace(/\s+/g, '')); }

  // status akun (aktif + sidik kode) disimpan di cache agar sesi lama langsung berakhir saat kode diganti atau akun dinonaktifkan
  function statusAkun(id, env, segar) {
    var k = 'akun_' + id, v = segar ? null : env.cache.get(k);
    if (v === null || v === undefined) {
      var u = by(env.store.all('PENGGUNA'), 'id')[id];
      v = !u ? 'x|' : (s(u.aktif) === 'Tidak' ? 'x|' : 'ok|') + s(u.kode_hash).slice(0, 12);
      env.cache.put(k, v, 21600);
    }
    return v;
  }
  function sesi(token, env) {
    if (!token) return null;
    var raw = env.cache.get('sesi_' + token);
    if (!raw) return null;
    var u = JSON.parse(raw);
    if (u.h && statusAkun(u.id, env) !== 'ok|' + u.h) { env.cache.remove('sesi_' + token); return null; }
    env.cache.put('sesi_' + token, raw, 21600);
    return u;
  }
  function publikUser(u) { return { id: u.id, nama: u.nama, peran: u.peran, provinsi: u.provinsi, kab: u.kab }; }

  // kode akses buatan sendiri: 8–24 huruf/angka (boleh tanda -), wajib campuran huruf dan angka, tidak dipakai pengguna lain
  function cekKodeBaru(kode, setting, users, idSendiri) {
    var k = s(kode).toUpperCase().replace(/\s+/g, ''), inti = k.replace(/-/g, '');
    if (!/^[A-Z0-9-]+$/.test(k)) return { error: 'Kode hanya boleh berisi huruf, angka dan tanda -' };
    if (inti.length < 8 || k.length > 24) return { error: 'Panjang kode 8–24 karakter (tanpa menghitung tanda -)' };
    if (!/[A-Z]/.test(inti) || !/[0-9]/.test(inti)) return { error: 'Kode harus campuran huruf dan angka' };
    if (/^(.)\1+$/.test(inti) || /0123|1234|2345|3456|4567|5678|6789|ABCD|QWER|PASS|ADMIN|HOKTEBU/.test(inti)) return { error: 'Kode terlalu mudah ditebak' };
    var h = hashKode(k, setting.salt);
    if (users.some(function (u) { return u.kode_hash === h && u.id !== idSendiri; })) return { error: 'Kode ini tidak bisa dipakai. Pilih kode lain.' };
    return { kode: k, hash: h };
  }
  // ganti kode satu pengguna; kode kosong = dibuatkan acak. Mengembalikan kode baru (ditampilkan sekali)
  function gantiKode(u, kodeBaru, env) {
    var setting = settingObj(env.store.all('SETTING')), users = env.store.all('PENGGUNA');
    var k;
    if (s(kodeBaru)) { k = cekKodeBaru(kodeBaru, setting, users, u.id); if (k.error) return gagal('VALIDASI', k.error); }
    else {
      var prefix = u.peran === 'kabupaten' ? ((by(env.store.all('KABUPATEN'), 'kab')[u.kab] || {}).kode || 'KAB') : u.peran === 'provinsi' ? ((by(env.store.all('PROVINSI'), 'provinsi')[u.provinsi] || {}).kode || 'PRV') : 'PST';
      var kd = kodeAcak(prefix, env); k = { kode: kd, hash: hashKode(kd, setting.salt) };
    }
    u = Object.assign({}, u, { kode_hash: k.hash });
    env.store.upsert('PENGGUNA', [u]);
    statusAkun(u.id, env, true);
    return ok({ kode: k.kode, h: k.hash.slice(0, 12), pengguna: publikUser(u) });
  }

  // ------------------------------------------------------------------ respons
  // versi data untuk mencegah dua operator saling menimpa: sidik isi baris (tanpa berkas)
  function hashTeks(t) { var h = 0x811c9dc5; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function versiPoktan(p) { return hashTeks(TABEL.POKTAN.filter(function (k) { return k !== 'dok' && k !== 'folder_id'; }).map(function (k) { return s(p[k]); }).join('\u0001')); }
  function versiPekerja(list) {
    return hashTeks((list || []).map(function (w) { return [w.id, w.nama, w.nik, w.alamat, s(w.hadir), w.diubah, w.oleh].map(s).join('\u0002'); }).sort().join('\u0001'));
  }
  function pesanBentrok(apa, oleh, diubah) {
    return apa + ' baru saja diubah oleh ' + (oleh || 'operator lain') + (diubah ? ' (' + diubah.slice(11, 16) + ' WIB)' : '') +
      ' setelah layar Anda dibuka. Muat ulang dulu agar perubahannya terlihat, lalu ulangi perubahan Anda.';
  }
  function ok(data) { return { ok: true, data: data }; }
  function gagal(kode, pesan, rincian) { return { ok: false, kode: kode, pesan: pesan, rincian: rincian || null }; }
  function catat(env, user, aksi, rincian) {
    try { (env.store.appendAtomik || env.store.append)('LOG', [{ waktu: waktuJakarta(env), pengguna: user ? (user.nama + ' (' + user.peran + (user.kab ? ' ' + user.kab : user.provinsi ? ' ' + user.provinsi : '') + ')') : '-', aksi: aksi, rincian: s(rincian).slice(0, 500) }]); } catch (e) { /* log tidak boleh menggagalkan aksi */ }
  }

  function publikSetting(st) {
    return { tahun: st.tahun || '2026', no_dipa: st.no_dipa || '', tgl_dipa: st.tgl_dipa || '', kpa: st.kpa || '', std_hokha: String((num(st.hokha_olah) || 15) + (num(st.hokha_tanam) || 25)), hokha_olah: st.hokha_olah || '15', hokha_tanam: st.hokha_tanam || '25', batas_hari_bulan: st.batas_hari_bulan || '', batas_hari_spk: st.batas_hari_spk || '', unit_pusat: st.unit_pusat || '' };
  }

  function poktanKeluar(p, h) {
    var o = {};
    TABEL.POKTAN.forEach(function (k) { if (k !== 'dok') o[k] = p[k]; });
    o.hit = h;
    return o;
  }

  // ------------------------------------------------------------------ aksi
  function aksiLogin(req, env) {
    var kode = s(req.kode).toUpperCase();
    if (!kode) return gagal('LOGIN', 'Masukkan kode akses');
    var prefix = kode.split('-')[0].slice(0, 6);
    var kunciGagal = 'gagal_' + prefix, nGagal = Number(env.cache.get(kunciGagal) || 0);
    if (nGagal >= 10) return gagal('LOGIN', 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.');
    var setting = settingObj(env.store.all('SETTING'));
    var h = hashKode(kode, setting.salt);
    var u = env.store.all('PENGGUNA').filter(function (x) { return x.kode_hash === h && s(x.aktif) !== 'Tidak'; })[0];
    if (!u) { env.cache.put(kunciGagal, String(nGagal + 1), 900); return gagal('LOGIN', 'Kode akses tidak dikenali atau sudah tidak aktif'); }
    var user = publikUser(u);
    var token = env.uuid().replace(/-/g, '') + env.uuid().replace(/-/g, '');
    env.cache.put('sesi_' + token, JSON.stringify(Object.assign({ h: s(u.kode_hash).slice(0, 12) }, user)), 21600);
    statusAkun(u.id, env, true);
    env.lock(function () { env.store.upsert('PENGGUNA', [Object.assign({}, u, { terakhir_masuk: waktuJakarta(env) })]); });
    catat(env, user, 'masuk', '');
    return ok({ token: token, user: user });
  }

  function aksiBootstrap(user, env) {
    var ctx = konteks(env), hit = hitungSemua(ctx), kabs = cakupanKab(user, ctx), inK = {};
    kabs.forEach(function (k) { inK[k] = 1; });
    return ok({
      versi: VERSI, user: publikUser(user), setting: publikSetting(ctx.setting), kegiatan: KEG, jenis: JENIS, slot: SLOT,
      provinsi: ctx.prov,
      kabupaten: ctx.kab.filter(function (k) { return inK[k.kab]; }),
      poktan: ctx.poktan.filter(function (p) { return inK[p.kab]; }).map(function (p) { return poktanKeluar(p, hit.per[p.id]); }),
      rekap: rekap(ctx, hit, kabs),
      temuan: hit.temuan.filter(function (t) { return inK[t.kab]; }),
      hariIni: hariIni(env)
    });
  }

  function cariPoktan(id, user, ctx) {
    var p = ctx.poktanBy[id];
    if (!p) return { err: gagal('TIDAK_ADA', 'Poktan ' + id + ' tidak ditemukan') };
    if (cakupanKab(user, ctx).indexOf(p.kab) < 0) return { err: gagal('AKSES', 'Anda tidak berhak membuka poktan ini') };
    return { p: p };
  }

  function aksiPoktanGet(req, user, env) {
    var ctx = konteks(env), c = cariPoktan(req.id, user, ctx);
    if (c.err) return c.err;
    var p = c.p, hit = hitungSemua(ctx), pek = ctx.pekerjaPer[p.id] || [];
    var niks = {}; pek.forEach(function (w) { niks[s(w.nik)] = 1; });
    var konflik = {};
    ctx.pekerja.forEach(function (w) {
      if (w.id_poktan === p.id || !niks[s(w.nik)]) return;
      var o = ctx.poktanBy[w.id_poktan] || {};
      w._hadir.forEach(function (x) { (konflik[s(w.nik)] = konflik[s(w.nik)] || []).push({ tanggal: x, id_poktan: w.id_poktan, poktan: o.poktan || '', kab: o.kab || '', jenis: jenisW(w) }); });
    });
    return ok({
      poktan: poktanKeluar(p, hit.per[p.id]),
      pekerja: pek.map(function (w) { return { id: w.id, nama: w.nama, nik: w.nik, alamat: w.alamat, hadir: w._hadir, jenis: jenisW(w) }; }),
      konflik: konflik,
      kabupaten: ctx.kabBy[p.kab] || {},
      provinsi: ctx.provBy[(ctx.kabBy[p.kab] || {}).provinsi] || {},
      temuan: hit.temuan.filter(function (t) { return t.id_poktan === p.id; }),
      validasi: validasiPoktan(p, ctx),
      dok: parseJSON(p.dok, { rek: [], geo: [], ktp: [], ttd: [], idn: [] }),
      versi: versiPoktan(p),
      versiPekerja: { olah: versiPekerja(pek.filter(function (w) { return jenisW(w) === 'olah'; })), tanam: versiPekerja(pek.filter(function (w) { return jenisW(w) === 'tanam'; })) }
    });
  }

  // nomor P### berikutnya untuk kabupaten
  function idBaru(kab, ctx) {
    var kode = (ctx.kabBy[kab] || {}).kode || 'KAB', maks = 0;
    ctx.poktan.forEach(function (p) { if (p.kab === kab) { var m = s(p.id).match(/P(\d+)$/); if (m) maks = Math.max(maks, Number(m[1])); } });
    return kode + '-P' + ('00' + (maks + 1)).slice(-3);
  }

  function aksiPoktanSimpan(req, user, env) {
    return env.lock(function () {
      var ctx = konteks(env), d = req.data || {}, lama = null;
      if (d.id) {
        var c = cariPoktan(d.id, user, ctx);
        if (c.err) return c.err;
        lama = c.p;
        if (req.versi && s(req.versi) !== versiPoktan(lama))
          return gagal('BENTROK', pesanBentrok('Data poktan ' + lama.id, lama.oleh, lama.diubah), { oleh: s(lama.oleh), diubah: s(lama.diubah) });
      }
      var kab = lama ? lama.kab : s(d.kab);
      if (user.peran === 'kabupaten') kab = user.kab;
      if (!bolehTulisKab(user, kab)) return gagal('AKSES', 'Peran ' + user.peran + ' tidak boleh mengubah data poktan');
      var p = Object.assign({}, lama || {});
      FIELD_POKTAN.forEach(function (f) { if (d[f] !== undefined) p[f] = s(d[f]); });
      p.kab = kab;
      if (lama && user.peran !== 'pusat') p.kab = lama.kab;
      if (!lama) p.id = idBaru(kab, ctx);
      var val = validasiPoktan(p, ctx);
      var errs = val.filter(function (x) { return x.level === 'error'; });
      if (errs.length) return gagal('VALIDASI', 'Data belum bisa disimpan. Perbaiki ' + errs.length + ' isian yang ditandai.', val);
      p.diubah = waktuJakarta(env); p.oleh = user.nama;
      env.store.upsert('POKTAN', [p]);
      if (lama && lama.kab !== p.kab) {
        var pk = (ctx.pekerjaPer[p.id] || []).map(function (w) { return Object.assign({}, w, { kab: p.kab }); });
        if (pk.length) env.store.upsert('PEKERJA', pk);
      }
      catat(env, user, lama ? 'ubah poktan' : 'tambah poktan', p.id + ' ' + p.poktan);
      return ok({ id: p.id, peringatan: val, versi: versiPoktan(p) });
    });
  }

  function aksiPoktanHapus(req, user, env) {
    return env.lock(function () {
      var ctx = konteks(env), c = cariPoktan(req.id, user, ctx);
      if (c.err) return c.err;
      if (!bolehTulisKab(user, c.p.kab)) return gagal('AKSES', 'Tidak berhak menghapus');
      if ((ctx.pekerjaPer[c.p.id] || []).length) return gagal('VALIDASI', 'Poktan masih punya data pekerja. Hapus pekerja dulu.');
      var dk = parseJSON(c.p.dok, {}), nFile = 0;
      Object.keys(dk || {}).forEach(function (k) { nFile += (dk[k] || []).length; });
      if (nFile) return gagal('VALIDASI', 'Poktan masih punya berkas di folder dokumen. Hapus berkas dulu.');
      env.store.remove('POKTAN', [c.p.id]);
      catat(env, user, 'hapus poktan', c.p.id + ' ' + c.p.poktan);
      return ok({ id: c.p.id });
    });
  }

  // req.jenis: 'olah' atau 'tanam'; hanya daftar pekerja jenis itu yang diganti
  function aksiPekerjaSimpan(req, user, env) {
    var j = jenisOk(req.jenis);
    return env.lock(function () {
      var ctx = konteks(env), c = cariPoktan(req.id_poktan, user, ctx);
      if (c.err) return c.err;
      var p = c.p;
      if (!bolehTulisKab(user, p.kab)) return gagal('AKSES', 'Peran ' + user.peran + ' tidak boleh mengubah kehadiran');
      var pekLama = (ctx.pekerjaPer[p.id] || []).filter(function (w) { return jenisW(w) === j; });
      var kunciUbah = 'pekerja_ubah_' + p.id + '_' + j;
      if (req.versi && s(req.versi) !== versiPekerja(pekLama)) {
        var pu = null;
        try { pu = JSON.parse(env.cache.get(kunciUbah) || 'null'); } catch (x) { pu = null; }
        pu = pu || { oleh: 'operator lain', diubah: '' };
        return gagal('BENTROK', pesanBentrok('Daftar hadir ' + JENIS[j].label.toLowerCase() + ' poktan ' + p.id, pu.oleh, pu.diubah), pu);
      }
      var rows = (req.rows || []).map(function (r) {
        var hd = {}; (r.hadir || []).forEach(function (x) { hd[s(x)] = 1; });
        return { id: s(r.id), nama: s(r.nama), nik: s(r.nik).replace(/\s+/g, ''), alamat: s(r.alamat), hadir: Object.keys(hd).sort() };
      });
      var v = validasiPekerja(p, rows, ctx, { lama: pekLama, jenis: j });
      if (v.errors.length) return gagal('VALIDASI', 'Kehadiran ' + JENIS[j].label.toLowerCase() + ' belum bisa disimpan. Perbaiki ' + v.errors.length + ' isian yang ditandai.', v);
      var lama = by(pekLama, 'id'), simpan = [], dipakai = {};
      rows.forEach(function (r) {
        var id = r.id && lama[r.id] ? r.id : p.id + '-' + (j === 'tanam' ? 'T' : 'O') + env.uuid().replace(/-/g, '').slice(0, 8).toUpperCase();
        dipakai[id] = 1;
        var baru = { id: id, id_poktan: p.id, kab: p.kab, nama: r.nama, nik: r.nik, alamat: r.alamat, hadir: r.hadir.join(','), jenis: j };
        var l = lama[id];
        if (!l || l.nama !== baru.nama || l.nik !== baru.nik || l.alamat !== baru.alamat || l.hadir !== baru.hadir || l.kab !== baru.kab || jenisW(l) !== j) {
          baru.diubah = waktuJakarta(env); baru.oleh = user.nama;
          simpan.push(baru);
        }
      });
      var hapus = Object.keys(lama).filter(function (id) { return !dipakai[id]; });
      if (simpan.length) env.store.upsert('PEKERJA', simpan);
      var baruPer = by(simpan, 'id'), akhir = Object.keys(dipakai).map(function (id) { return baruPer[id] || lama[id]; });
      if (simpan.length || hapus.length) { try { env.cache.put(kunciUbah, JSON.stringify({ oleh: user.nama, diubah: waktuJakarta(env) }), 21600); } catch (x) { /* abaikan */ } }
      if (hapus.length) env.store.remove('PEKERJA', hapus);
      catat(env, user, 'simpan kehadiran ' + JENIS[j].label.toLowerCase(), p.id + ': ' + rows.length + ' pekerja, ' + v.total + ' HOK, ' + simpan.length + ' baris berubah, ' + hapus.length + ' dihapus');
      return ok({ jenis: j, total: v.total, tHOK: v.tHOK, peringatan: v.peringatan, berubah: simpan.length, dihapus: hapus.length, versi: versiPekerja(akhir) });
    });
  }

  // ------------------------------------------------------------------ berkas (Google Drive)
  function folderPoktan(p, ctx, env) {
    if (s(p.folder_id)) return p.folder_id;
    var kab = ctx.kabBy[p.kab] || {};
    var id = env.files.ensureFolder([kab.provinsi || 'Provinsi', p.kab, namaFolder(p)], [SUBFOLDER.rek, SUBFOLDER.geo, SUBFOLDER.ktp, SUBFOLDER.ttd, SUBFOLDER.idn]);
    p.folder_id = id;
    env.store.upsert('POKTAN', [p]);
    return id;
  }

  function ringkasFolder(list) {
    var d = { rek: [], geo: [], ktp: [], ttd: [], idn: [] }, inv = {};
    Object.keys(SUBFOLDER).forEach(function (k) { inv[SUBFOLDER[k]] = k; });
    list.forEach(function (f) { var g = inv[f.sub]; if (g) d[g].push(f.name.replace(/\.[a-z]+$/i, '')); });
    return d;
  }

  function daftarBerkas(p, env) {
    if (!s(p.folder_id)) return [];
    var inv = {};
    Object.keys(SUBFOLDER).forEach(function (k) { inv[SUBFOLDER[k]] = k; });
    return env.files.list(p.folder_id).map(function (f) {
      return { id: f.id, nama: f.name, grup: inv[f.sub] || '', ukuran: f.size, mime: f.mime, dibuat: f.created, meta: parseJSON(f.desc, null) };
    });
  }

  function aksiBerkasDaftar(req, user, env) {
    var ctx = konteks(env), c = cariPoktan(req.id_poktan, user, ctx);
    if (c.err) return c.err;
    return ok({ berkas: daftarBerkas(c.p, env), slot: SLOT });
  }

  function aksiBerkasUnggah(req, user, env) {
    var grup = s(req.grup), slot = s(req.slot), mime = s(req.mime), data = s(req.data);
    if (!SUBFOLDER[grup]) return gagal('VALIDASI', 'Jenis berkas tidak dikenal');
    if (!MIME_OK[mime]) return gagal('VALIDASI', 'Format berkas harus JPG, PNG atau PDF');
    if (!data || data.length > MAX_BASE64) return gagal('VALIDASI', 'Ukuran berkas maksimal 10 MB');
    // Penyimpanan ke Drive (bagian paling lama) dikerjakan di luar antrean kunci agar unggahan dari banyak kabupaten
    // tidak saling menunggu. Kunci hanya dipakai sebentar untuk mencatat ringkasan dokumen di baris poktan.
    var ctx = konteks(env), c = cariPoktan(req.id_poktan, user, ctx);
    if (c.err) return c.err;
    var p = c.p;
    if (!bolehTulisKab(user, p.kab)) return gagal('AKSES', 'Peran ' + user.peran + ' tidak boleh mengunggah berkas');
    var nama, ganti = null;
    if (grup === 'ktp') {
      var w = (ctx.pekerjaPer[p.id] || []).filter(function (x) { return s(x.nik) === slot; })[0];
      if (!w) return gagal('VALIDASI', 'NIK ' + slot + ' tidak ada di daftar pekerja poktan ini. Simpan pekerjanya dulu.');
      nama = slot + '_' + bersih(w.nama).slice(0, 40);
      ganti = slot + '_';
    } else {
      var sah = SLOT[grup].map(function (x) { return x[0]; });
      if (sah.indexOf(slot) < 0) return gagal('VALIDASI', 'Slot berkas tidak dikenal');
      nama = slot;
      ganti = slot + '.';
    }
    nama += '.' + MIME_OK[mime];
    var fid = s(p.folder_id) || env.lock(function () {
      var segar = by(env.store.all('POKTAN'), 'id')[p.id];
      return segar ? folderPoktan(segar, ctx, env) : '';
    });
    if (!fid) return gagal('TIDAK_ADA', 'Poktan ' + p.id + ' tidak ditemukan');
    var meta = req.meta ? JSON.stringify(req.meta).slice(0, 900) : '';
    var f = env.files.save(fid, SUBFOLDER[grup], nama, mime, data, meta, ganti);
    var list = daftarBerkas(Object.assign({}, p, { folder_id: fid }), env);
    env.lock(function () {
      var segar = by(env.store.all('POKTAN'), 'id')[p.id];
      if (segar) {
        var d = parseJSON(segar.dok, null) || {}, inti = nama.replace(/\.[a-z]+$/i, ''), awal = grup === 'ktp' ? ganti : slot;
        ['rek', 'geo', 'ktp', 'ttd', 'idn'].forEach(function (g) { d[g] = d[g] || []; });
        d[grup] = d[grup].filter(function (x) { return grup === 'ktp' ? x.indexOf(awal) !== 0 : x !== awal; }).concat([inti]);
        segar.dok = JSON.stringify(d);
        env.store.upsert('POKTAN', [segar]);
      }
      catat(env, user, 'unggah berkas', p.id + ' ' + grup + '/' + nama + ' (' + Math.round(data.length * 0.75 / 1024) + ' KB)');
    });
    return ok({ berkas: list, id: f.id });
  }

  function poktanDariBerkas(fileId, user, ctx, env) {
    var info = env.files.owner(fileId);
    if (!info) return { err: gagal('TIDAK_ADA', 'Berkas tidak ditemukan') };
    var p = ctx.poktan.filter(function (x) { return s(x.folder_id) && x.folder_id === info.poktanFolderId; })[0];
    if (!p || cakupanKab(user, ctx).indexOf(p.kab) < 0) return { err: gagal('AKSES', 'Anda tidak berhak membuka berkas ini') };
    return { p: p };
  }

  function aksiBerkasLihat(req, user, env) {
    var ctx = konteks(env), c = poktanDariBerkas(s(req.fileId), user, ctx, env);
    if (c.err) return c.err;
    var f = env.files.read(s(req.fileId));
    return ok({ nama: f.name, mime: f.mime, data: f.base64 });
  }

  function aksiBerkasHapus(req, user, env) {
    var ctx = konteks(env), c = poktanDariBerkas(s(req.fileId), user, ctx, env);
    if (c.err) return c.err;
    if (!bolehTulisKab(user, c.p.kab)) return gagal('AKSES', 'Tidak berhak menghapus berkas');
    env.files.trash(s(req.fileId));
    var list = daftarBerkas(c.p, env);
    env.lock(function () {
      var segar = by(env.store.all('POKTAN'), 'id')[c.p.id];
      if (segar) {
        segar.dok = JSON.stringify(ringkasFolder(list.map(function (x) { return { name: x.nama, sub: SUBFOLDER[x.grup] || '' }; })));
        env.store.upsert('POKTAN', [segar]);
      }
      catat(env, user, 'hapus berkas', c.p.id + ' ' + req.fileId);
    });
    return ok({ berkas: list });
  }

  // ------------------------------------------------------------------ ukur kecepatan (dijalankan dari editor, hanya membaca)
  function ukurKecepatan(env) {
    var t0 = Date.now(), jam = function () { var t = Date.now() - t0; t0 = Date.now(); return t; }, h = {};
    var ctx = konteks(env); h.baca_semua_ms = jam();
    h.baris = { poktan: ctx.poktan.length, pekerja: ctx.pekerja.length, hadir: ctx.pekerja.reduce(function (a, w) { return a + w._hadir.length; }, 0) };
    hitungSemua(ctx); h.hitung_rekap_ms = jam();
    var besar = Object.keys(ctx.pekerjaPer).sort(function (a, b) { return ctx.pekerjaPer[b].length - ctx.pekerjaPer[a].length; })[0];
    if (besar) {
      var p = ctx.poktanBy[besar], rows = ctx.pekerjaPer[besar].map(function (w) { return { id: w.id, nama: w.nama, nik: w.nik, alamat: w.alamat, hadir: w._hadir }; });
      validasiPekerja(p, rows, ctx, { lama: ctx.pekerjaPer[besar] }); h.validasi_poktan_terbesar_ms = jam(); h.poktan_terbesar = besar + ' (' + rows.length + ' pekerja)';
    }
    env.lock(function () { return 1; }); h.kunci_ms = jam();
    var adaFolder = ctx.poktan.filter(function (x) { return s(x.folder_id); })[0];
    if (adaFolder) { daftarBerkas(adaFolder, env); h.daftar_berkas_ms = jam(); }
    return h;
  }

  // ------------------------------------------------------------------ master & pengaturan
  function aksiKabSimpan(req, user, env) {
    return env.lock(function () {
      var ctx = konteks(env), d = req.data || {}, k = ctx.kabBy[s(d.kab)];
      if (!k && user.peran !== 'pusat') return gagal('TIDAK_ADA', 'Kabupaten tidak ditemukan');
      if (!bolehTulisKab(user, s(d.kab))) return gagal('AKSES', 'Tidak berhak mengubah data kabupaten ini');
      var row = Object.assign({}, k || { kab: s(d.kab) });
      var boleh = user.peran === 'pusat' ? TABEL.KABUPATEN.slice(1) : FIELD_KAB_OPERATOR;
      boleh.forEach(function (f) { if (d[f] !== undefined) row[f] = s(d[f]); });
      if (!row.kode || !row.provinsi) return gagal('VALIDASI', 'Kode dan provinsi kabupaten wajib diisi');
      if (row.provinsi && !ctx.provBy[row.provinsi]) return gagal('VALIDASI', 'Provinsi belum terdaftar di Pengaturan');
      env.store.upsert('KABUPATEN', [row]);
      catat(env, user, 'ubah kabupaten', row.kab);
      return ok({ kab: row.kab });
    });
  }

  function aksiSettingSimpan(req, user, env) {
    if (user.peran !== 'pusat') return gagal('AKSES', 'Hanya pusat yang boleh mengubah pengaturan');
    return env.lock(function () {
      var d = req.setting || {}, rows = [];
      ['tahun', 'no_dipa', 'tgl_dipa', 'kpa', 'hokha_olah', 'hokha_tanam', 'batas_hari_bulan', 'batas_hari_spk', 'unit_pusat'].forEach(function (k) { if (d[k] !== undefined) rows.push({ kunci: k, nilai: s(d[k]) }); });
      if (d.tgl_dipa && !isISO(d.tgl_dipa)) return gagal('VALIDASI', 'Tanggal DIPA tidak valid');
      if (rows.length) env.store.upsert('SETTING', rows);
      if (req.provinsi && req.provinsi.length) env.store.upsert('PROVINSI', req.provinsi.map(function (r) { return { provinsi: s(r.provinsi), kode: s(r.kode), upah_pl: s(r.upah_pl), upah_br: s(r.upah_br) }; }).filter(function (r) { return r.provinsi; }));
      catat(env, user, 'ubah pengaturan', JSON.stringify(d).slice(0, 300));
      return ok({});
    });
  }

  function buatPengguna(data, env) {
    var setting = settingObj(env.store.all('SETTING')), ctx = { kabBy: by(env.store.all('KABUPATEN'), 'kab'), provBy: by(env.store.all('PROVINSI'), 'provinsi') };
    var peran = s(data.peran);
    if (['kabupaten', 'provinsi', 'pusat'].indexOf(peran) < 0) return gagal('VALIDASI', 'Peran harus kabupaten, provinsi atau pusat');
    var prefix = 'PST';
    if (peran === 'kabupaten') { var k = ctx.kabBy[s(data.kab)]; if (!k) return gagal('VALIDASI', 'Kabupaten tidak terdaftar'); prefix = k.kode; data.provinsi = k.provinsi; }
    if (peran === 'provinsi') { var pv = ctx.provBy[s(data.provinsi)]; if (!pv) return gagal('VALIDASI', 'Provinsi tidak terdaftar'); prefix = pv.kode || 'PRV'; data.kab = ''; }
    if (peran === 'pusat') { data.kab = ''; data.provinsi = ''; }
    var kode = kodeAcak(prefix, env);
    var u = { id: 'U' + env.uuid().replace(/-/g, '').slice(0, 10).toUpperCase(), nama: s(data.nama) || peran, peran: peran, provinsi: s(data.provinsi), kab: s(data.kab),
      kode_hash: hashKode(kode, setting.salt), aktif: 'Ya', dibuat: waktuJakarta(env), terakhir_masuk: '' };
    env.store.upsert('PENGGUNA', [u]);
    return ok({ kode: kode, pengguna: { id: u.id, nama: u.nama, peran: u.peran, provinsi: u.provinsi, kab: u.kab } });
  }

  function aksiPengguna(req, user, env) {
    if (user.peran !== 'pusat') return gagal('AKSES', 'Hanya pusat yang mengelola pengguna');
    if (req.action === 'pengguna.daftar') {
      return ok({ pengguna: env.store.all('PENGGUNA').map(function (u) { return { id: u.id, nama: u.nama, peran: u.peran, provinsi: u.provinsi, kab: u.kab, aktif: u.aktif, dibuat: u.dibuat, terakhir_masuk: u.terakhir_masuk }; }) });
    }
    return env.lock(function () {
      if (req.action === 'pengguna.buat') {
        var r = buatPengguna(req.data || {}, env);
        if (r.ok) catat(env, user, 'buat pengguna', r.data.pengguna.nama + ' ' + r.data.pengguna.peran);
        return r;
      }
      var u = by(env.store.all('PENGGUNA'), 'id')[s(req.id)];
      if (!u) return gagal('TIDAK_ADA', 'Pengguna tidak ditemukan');
      if (req.action === 'pengguna.gantikode') {
        var g = gantiKode(u, req.kode, env);
        if (g.ok) {
          catat(env, user, 'ganti kode pengguna', u.nama);
          if (u.id === user.id) env.cache.put('sesi_' + req.token, JSON.stringify(Object.assign({}, user, { h: g.data.h })), 21600);
          delete g.data.h;
        }
        return g;
      }
      if (u.id === user.id) return gagal('VALIDASI', 'Tidak bisa menonaktifkan akun yang sedang dipakai');
      u.aktif = req.aktif ? 'Ya' : 'Tidak';
      env.store.upsert('PENGGUNA', [u]);
      statusAkun(u.id, env, true);
      catat(env, user, 'status pengguna', u.nama + ' → ' + u.aktif);
      return ok({});
    });
  }

  // pengguna mengganti kode aksesnya sendiri (semua peran): wajib kode lama
  function aksiGantiKodeSendiri(req, user, env) {
    return env.lock(function () {
      var setting = settingObj(env.store.all('SETTING'));
      var u = by(env.store.all('PENGGUNA'), 'id')[user.id];
      if (!u) return gagal('TIDAK_ADA', 'Akun tidak ditemukan');
      if (hashKode(req.kode_lama, setting.salt) !== u.kode_hash) return gagal('VALIDASI', 'Kode akses lama tidak sesuai');
      if (s(req.kode_baru) && s(req.kode_baru).toUpperCase().replace(/\s+/g, '') === s(req.kode_lama).toUpperCase().replace(/\s+/g, '')) return gagal('VALIDASI', 'Kode baru sama dengan kode lama');
      var g = gantiKode(u, req.kode_baru, env);
      if (!g.ok) return g;
      env.cache.put('sesi_' + req.token, JSON.stringify(Object.assign({}, user, { h: g.data.h })), 21600);
      catat(env, user, 'ganti kode sendiri', '');
      return ok({ kode: g.data.kode });
    });
  }

  // ------------------------------------------------------------------ impor dari Tool HOK Excel v2
  function aksiImpor(req, user, env) {
    return env.lock(function () {
      var ctx = konteks(env), kab = s(req.kab);
      if (user.peran === 'kabupaten') kab = user.kab;
      if (!bolehTulisKab(user, kab) || !ctx.kabBy[kab]) return gagal('AKSES', 'Tidak berhak mengimpor untuk kabupaten ' + kab);
      var kode = ctx.kabBy[kab].kode, poktanBaru = [], petaId = {};
      (req.poktan || []).forEach(function (r) {
        var lokal = idLokal(r.id);
        if (!/^P\d+$/.test(lokal) || !s(r.poktan)) return;
        var id = kode + '-' + lokal, lama = ctx.poktanBy[id] || {};
        var p = Object.assign({}, lama, { id: id, kab: kab });
        FIELD_POKTAN.forEach(function (f) { if (f !== 'kab' && r[f] !== undefined && s(r[f]) !== '') p[f] = s(r[f]); });
        if (!KEG[p.keg]) p.keg = /ratoon/i.test(p.keg) ? 'Bongkar Ratoon' : 'Perluasan Tanaman Tebu';
        p.diubah = waktuJakarta(env); p.oleh = user.nama + ' (impor)';
        poktanBaru.push(p); petaId[lokal] = id;
      });
      var pekerjaBaru = [], gantiPoktan = {};
      (req.pekerja || []).forEach(function (w, i) {
        var id = petaId[idLokal(w.id_poktan)];
        if (!id || !s(w.nama)) return;
        gantiPoktan[id] = 1;
        pekerjaBaru.push({ id: id + '-O' + ('000' + (i + 1)).slice(-4) + env.uuid().slice(0, 4).toUpperCase(), id_poktan: id, kab: kab, nama: s(w.nama), nik: s(w.nik), alamat: s(w.alamat),
          hadir: (w.hadir || []).filter(isISO).sort().join(','), diubah: waktuJakarta(env), oleh: user.nama + ' (impor)', jenis: 'olah' });
      });
      // kehadiran dari Excel v2 (satu periode) dimasukkan sebagai pengolahan lahan; daftar penanaman tidak disentuh
      var hapus = ctx.pekerja.filter(function (w) { return gantiPoktan[w.id_poktan] && jenisW(w) === 'olah'; }).map(function (w) { return w.id; });
      if (poktanBaru.length) env.store.upsert('POKTAN', poktanBaru);
      if (hapus.length) env.store.remove('PEKERJA', hapus);
      if (pekerjaBaru.length) env.store.append('PEKERJA', pekerjaBaru);
      catat(env, user, 'impor excel', kab + ': ' + poktanBaru.length + ' poktan, ' + pekerjaBaru.length + ' pekerja');
      return ok({ poktan: poktanBaru.length, pekerja: pekerjaBaru.length });
    });
  }

  // ------------------------------------------------------------------ pemindaian ulang folder (dipanggil trigger malam)
  function pindaiDokumen(env, batasMs) {
    var mulai = env.now().getTime(), n = 0;
    var poktan = env.store.all('POKTAN').filter(function (p) { return s(p.folder_id); });
    for (var i = 0; i < poktan.length; i++) {
      if (batasMs && env.now().getTime() - mulai > batasMs) break;
      var p = poktan[i], list = env.files.list(p.folder_id);
      var dok = JSON.stringify(ringkasFolder(list));
      if (dok !== p.dok) { p.dok = dok; env.lock(function () { env.store.upsert('POKTAN', [p]); }); n++; }
    }
    return n;
  }

  // ------------------------------------------------------------------ penyiapan awal
  function setupAwal(env, seed, opsi) {
    opsi = opsi || {};
    var setting = settingObj(env.store.all('SETTING'));
    var hasil = { kode: [] };
    if (!setting.salt) {
      var b = env.randomBytes(16), salt = '';
      for (var i = 0; i < 16; i++) salt += ('0' + (b[i] & 255).toString(16)).slice(-2);
      var def = Object.assign({ tahun: '2026', no_dipa: 'SP DIPA-018.05.1.238830/2026', tgl_dipa: '2025-12-01',
        kpa: 'Kuasa Pengguna Anggaran Direktorat Jenderal Perkebunan', std_hokha: '40', hokha_olah: '15', hokha_tanam: '25', batas_hari_bulan: '', unit_pusat: 'Tim Kerja Evaluasi dan Pelaporan' }, seed.setting || {});
      def.salt = salt;
      env.store.upsert('SETTING', Object.keys(def).map(function (k) { return { kunci: k, nilai: s(def[k]) }; }));
    }
    if (seed.provinsi) env.store.upsert('PROVINSI', seed.provinsi);
    if (seed.kabupaten) {
      var adaKab = by(env.store.all('KABUPATEN'), 'kab');
      env.store.upsert('KABUPATEN', seed.kabupaten.filter(function (k) { return !adaKab[k.kab]; }));
    }
    if (seed.poktan && seed.poktan.length) {
      var kabBy = by(env.store.all('KABUPATEN'), 'kab'), ada = by(env.store.all('POKTAN'), 'id');
      var rows = seed.poktan.map(function (r) {
        var id = (kabBy[r.kab] || {}).kode + '-' + idLokal(r.id);
        return Object.assign({}, r, { id: id, diubah: waktuJakarta(env), oleh: 'setup' });
      }).filter(function (r) { return !ada[r.id]; });
      if (rows.length) env.store.upsert('POKTAN', rows);
      hasil.poktan = rows.length;
    }
    if (opsi.buatKode) {
      var users = env.store.all('PENGGUNA');
      if (!users.length) {
        var daftar = [{ nama: 'Tim Kerja Evaluasi dan Pelaporan', peran: 'pusat' }];
        env.store.all('PROVINSI').forEach(function (p) { if (env.store.all('KABUPATEN').some(function (k) { return k.provinsi === p.provinsi; })) daftar.push({ nama: 'Provinsi ' + p.provinsi, peran: 'provinsi', provinsi: p.provinsi }); });
        env.store.all('KABUPATEN').forEach(function (k) { daftar.push({ nama: 'Operator ' + k.kab, peran: 'kabupaten', kab: k.kab }); });
        daftar.forEach(function (d) { var r = buatPengguna(d, env); if (r.ok) hasil.kode.push({ nama: r.data.pengguna.nama, peran: d.peran, wilayah: d.kab || d.provinsi || 'Semua', kode: r.data.kode }); });
      }
    }
    return hasil;
  }

  // ------------------------------------------------------------------ salin data dari sistem HOK sebelumnya (40 HOK sekaligus)
  // lama: { setting:[{kunci,nilai}], provinsi:[...], kabupaten:[...], poktan:[...] } dibaca dari spreadsheet sistem lama.
  // Yang disalin: identitas, rekening, NPWP, luas dan SK CPCL. SPK, tanggal, pekerja, kehadiran dan berkas tidak disalin.
  var SALIN_POKTAN = ['kab', 'keg', 'poktan', 'ketua', 'nik_ketua', 'jalan', 'desa', 'kec', 'bank', 'norek', 'namarek', 'npwp', 'npwp_an', 'luas', 'upah_khusus', 'no_cpcl', 'tgl_cpcl'];
  function salinDariLama(env, lama) {
    var hasil = { setting: 0, provinsi: 0, kabupaten: 0, poktan: 0, dilewati: 0 };
    var stLama = settingObj(lama.setting || []), salin = {};
    ['tahun', 'no_dipa', 'tgl_dipa', 'kpa', 'batas_hari_bulan', 'batas_hari_spk', 'unit_pusat'].forEach(function (k) { if (s(stLama[k])) salin[k] = s(stLama[k]); });
    var rowsSet = Object.keys(salin).map(function (k) { return { kunci: k, nilai: salin[k] }; });
    if (rowsSet.length) { env.store.upsert('SETTING', rowsSet); hasil.setting = rowsSet.length; }
    if ((lama.provinsi || []).length) { env.store.upsert('PROVINSI', lama.provinsi.map(function (p) { var o = {}; TABEL.PROVINSI.forEach(function (k) { o[k] = s(p[k]); }); return o; })); hasil.provinsi = lama.provinsi.length; }
    if ((lama.kabupaten || []).length) { env.store.upsert('KABUPATEN', lama.kabupaten.map(function (p) { var o = {}; TABEL.KABUPATEN.forEach(function (k) { o[k] = s(p[k]); }); return o; })); hasil.kabupaten = lama.kabupaten.length; }
    var ada = by(env.store.all('POKTAN'), 'id'), baru = [];
    (lama.poktan || []).forEach(function (p) {
      if (!s(p.id) || !s(p.poktan)) return;
      if (ada[s(p.id)]) { hasil.dilewati++; return; }
      var o = { id: s(p.id), diubah: waktuJakarta(env), oleh: 'salin dari sistem 40 HOK' };
      SALIN_POKTAN.forEach(function (k) { o[k] = s(p[k]); });
      baru.push(o);
    });
    if (baru.length) env.store.upsert('POKTAN', baru);
    hasil.poktan = baru.length;
    return hasil;
  }

  // ------------------------------------------------------------------ pintu masuk
  function handle(req, env) {
    try {
      req = req || {};
      var a = s(req.action);
      if (a === 'ping') return ok({ versi: VERSI, waktu: waktuJakarta(env) });
      if (a === 'login') return aksiLogin(req, env);
      var user = sesi(s(req.token), env);
      if (!user) return gagal('SESI', 'Sesi berakhir. Silakan masuk lagi.');
      switch (a) {
        case 'logout': env.cache.remove('sesi_' + req.token); return ok({});
        case 'bootstrap': return aksiBootstrap(user, env);
        case 'poktan.get': return aksiPoktanGet(req, user, env);
        case 'poktan.simpan': return aksiPoktanSimpan(req, user, env);
        case 'poktan.hapus': return aksiPoktanHapus(req, user, env);
        case 'pekerja.simpan': return aksiPekerjaSimpan(req, user, env);
        case 'berkas.daftar': return aksiBerkasDaftar(req, user, env);
        case 'berkas.unggah': return aksiBerkasUnggah(req, user, env);
        case 'berkas.lihat': return aksiBerkasLihat(req, user, env);
        case 'berkas.hapus': return aksiBerkasHapus(req, user, env);
        case 'kab.simpan': return aksiKabSimpan(req, user, env);
        case 'setting.simpan': return aksiSettingSimpan(req, user, env);
        case 'pengguna.daftar': case 'pengguna.buat': case 'pengguna.status': case 'pengguna.gantikode': return aksiPengguna(req, user, env);
        case 'akun.gantikode': return aksiGantiKodeSendiri(req, user, env);
        case 'impor': return aksiImpor(req, user, env);
        default: return gagal('AKSI', 'Aksi tidak dikenal: ' + a);
      }
    } catch (e) {
      if (e && e.kode === 'SIBUK') return gagal('SIBUK', 'Server sedang melayani banyak simpanan bersamaan. Halaman akan mencoba lagi otomatis; bila tetap gagal, tunggu sebentar lalu klik Simpan lagi. Isian Anda masih ada di layar.');
      try { catat(env, null, 'galat', (req && req.action) + ': ' + (e && e.stack || e)); } catch (x) { /* abaikan */ }
      return gagal('GALAT', 'Terjadi kesalahan di server: ' + (e && e.message || e));
    }
  }

  return {
    VERSI: VERSI, TABEL: TABEL, KEG: KEG, SLOT: SLOT, NPWP_AN: NPWP_AN, SUBFOLDER: SUBFOLDER, BULAN: BULAN, NAMA_TAHAP: NAMA_TAHAP,
    FIELD_TANGGAL: FIELD_TANGGAL, MIME_OK: MIME_OK,
    handle: handle, salinDariLama: salinDariLama, JENIS: JENIS, DAFTAR_JENIS: DAFTAR_JENIS, periode: periode, jenisW: jenisW, ukurKecepatan: ukurKecepatan, setupAwal: setupAwal, pindaiDokumen: pindaiDokumen, buatPengguna: buatPengguna,
    // dipakai juga di browser untuk validasi langsung
    cekNik: cekNik, isISO: isISO, awalHadir: awalHadir, hari: hari, dariHari: dariHari, num: num, tarif: tarif, kodeKeg: kodeKeg, idLokal: idLokal,
    namaFolder: namaFolder, validasiPoktan: validasiPoktan, validasiPekerja: validasiPekerja, sha256: sha256, hashKode: hashKode,
    settingObj: settingObj, by: by, tglPendek: tglPendek, rp: rp
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = HOK;
