/* Sistem HOK Tebu 15 + 25 (pengolahan lahan + penanaman) – aplikasi halaman tunggal */
(function () {
  'use strict';
  var CFG = window.HOK_CONFIG || {}, e = U.esc;
  var PROSES = {}, ANTRE = { p: Promise.resolve(), n: 0, ok: 0 };
  var S = { boot: null, detail: null, berkas: null, kotor: false, lastHash: '', filter: { kab: '', keg: '', status: '', q: '' }, hadir: null, temFilter: { kab: '', jenis: '', q: '' } };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function app() { return document.getElementById('app'); }
  function peran() { return S.boot ? S.boot.user.peran : (API.sesi() ? API.sesi().user.peran : ''); }
  function bolehTulis(kab) { var u = S.boot.user; return u.peran === 'pusat' || (u.peran === 'kabupaten' && u.kab === kab); }
  function bisaTambah() { return ['pusat', 'kabupaten'].indexOf(S.boot.user.peran) >= 0; }
  function nikSamar(n) { n = String(n || ''); return n.length >= 12 ? n.slice(0, 4) + '••••••••' + n.slice(-4) : n; }
  function kodeKeg(k) { return HOK.kodeKeg(k); }
  function namaKeg(k) { return k === 'Bongkar Ratoon' ? 'Bongkar Ratoon' : 'Perluasan'; }
  function pillStatus(st) { var c = { 'Ada temuan': 'crit', 'Lengkap & sesuai': 'ok', 'Berjalan': 'warn', 'Belum mulai': 'netral' }[st] || 'netral'; return '<span class="pill ' + c + '">' + e(st) + '</span>'; }
  function langkah(t) { var h = ''; for (var i = 1; i <= 5; i++) h += '<span class="' + (i <= t ? 'on' : '') + '"></span>'; return '<div class="steps" aria-hidden="true">' + h + '</div>'; }
  function galat(res) {
    var r = res && res.rincian, list = [];
    if (Array.isArray(r)) list = r.filter(function (x) { return x.level === 'error'; }).map(function (x) { return x.pesan; });
    else if (r && r.errors) list = r.errors.map(function (x) { return (x.row >= 0 ? 'Baris ' + (x.row + 1) + ': ' : '') + x.pesan; });
    return '<div class="galat"><b>' + e(res.pesan) + '</b>' + (list.length ? '<ul>' + list.slice(0, 12).map(function (m) { return '<li>' + e(m) + '</li>'; }).join('') + (list.length > 12 ? '<li>… ' + (list.length - 12) + ' lainnya</li>' : '') + '</ul>' : '') + '</div>';
  }

  // ------------------------------------------------------------------ routing
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', function (ev) { if (S.kotor) { ev.preventDefault(); ev.returnValue = ''; } });
  document.addEventListener('DOMContentLoaded', route);

  function route() {
    var h = location.hash || '#/dashboard';
    if (!API.sesi()) { if (h !== '#/masuk') { location.replace('#/masuk'); return; } viewMasuk(); return; }
    if (S.kotor && S.lastHash && h !== S.lastHash) {
      if (!confirm('Ada perubahan yang belum disimpan. Tinggalkan halaman ini?')) { history.replaceState(null, '', S.lastHash); return; }
      S.kotor = false;
    }
    S.lastHash = h;
    var parts = h.replace(/^#\/?/, '').split('?')[0].split('/');
    var pg = parts[0] || 'dashboard';
    if (pg === 'masuk') { location.replace('#/dashboard'); return; }
    pastikanBoot().then(function (ok) {
      if (!ok) return;
      if (pg === 'poktan' && !parts[1]) viewPoktanList();
      else if (pg === 'poktan' && parts[1] === 'baru') viewPoktanForm(null);
      else if (pg === 'poktan') viewPoktan(decodeURIComponent(parts[1]), parts[2] || 'data');
      else if (pg === 'temuan') viewTemuan();
      else if (pg === 'pengaturan') viewPengaturan();
      else viewDashboard();
      window.scrollTo(0, 0);
    });
  }

  var bootJalan = null;
  function bootSah(d) { return d && d.user && Array.isArray(d.poktan) && Array.isArray(d.kabupaten) && Array.isArray(d.provinsi) && d.rekap && Array.isArray(d.temuan); }
  function pastikanBoot(paksa) {
    if (S.boot && !paksa) return Promise.resolve(true);
    if (bootJalan) return bootJalan;
    if (!S.boot) app().innerHTML = '<div class="memuat">Memuat data…</div>';
    var coba = function (n) {
      return API.panggil('bootstrap').then(function (r) {
        if (r.ok && !bootSah(r.data)) r = n < 2 ? null : { ok: false, kode: 'FORMAT', pesan: 'Jawaban server tidak lengkap. Klik Muat ulang.' };
        return r || coba(n + 1);
      });
    };
    bootJalan = coba(0).then(function (r) {
      bootJalan = null;
      if (!r.ok) {
        if (r.kode === 'SESI') return false;
        if (!S.boot) app().innerHTML = shellKosong(galat(r) + '<p><button class="btn" onclick="location.reload()">Coba lagi</button></p>');
        else U.toast(r.pesan, true);
        return !!S.boot;
      }
      var b = r.data;
      b.poktanBy = HOK.by(b.poktan, 'id');
      b.kabBy = HOK.by(b.kabupaten, 'kab');
      b.provBy = HOK.by(b.provinsi, 'provinsi');
      S.boot = b;
      return true;
    }, function (er) { bootJalan = null; throw er; });
    return bootJalan;
  }

  // ------------------------------------------------------------------ kerangka
  function shellKosong(isi) { return '<main class="isi">' + isi + '</main>'; }
  function shell(aktif, isi) {
    var u = S.boot.user, nTem = S.boot.temuan.length;
    var nav = [['dashboard', 'Dashboard'], ['poktan', 'Poktan'], ['temuan', 'Temuan' + (nTem ? ' (' + nTem + ')' : '')], ['pengaturan', 'Pengaturan']];
    var wilayah = u.peran === 'pusat' ? 'Pusat' : u.peran === 'provinsi' ? 'Provinsi ' + u.provinsi : 'Kabupaten ' + u.kab;
    return (API.demo ? '<div class="demo-pita"><b>Mode demo.</b> Data contoh fiktif, tersimpan hanya di browser ini dan hilang saat halaman dimuat ulang.</div>' : '') +
      '<header class="top"><div class="top-in"><div class="merek"><b>HOK Tebu ' + e(S.boot.setting.tahun) + '</b><span class="skema-kecil">15 + 25</span><span class="pill biru">' + e(wilayah) + '</span></div>' +
      '<nav class="nav" aria-label="Menu utama">' + nav.map(function (n) { return '<a href="#/' + n[0] + '" class="' + (aktif === n[0] ? 'aktif' : '') + '">' + e(n[1]) + '</a>'; }).join('') + '</nav>' +
      '<div class="akun"><span>' + e(u.nama) + '</span><button class="btn kecil" id="btn-segar" title="Ambil data terbaru dari server">Muat ulang</button><button class="btn kecil" id="btn-keluar">Keluar</button></div></div></header>' +
      '<main class="isi">' + isi + '</main>';
  }
  function pasangShell() {
    $('#btn-keluar').onclick = function () { if (S.kotor && !confirm('Ada perubahan yang belum disimpan. Tetap keluar?')) return; S.kotor = false; API.keluar(); S.boot = null; location.hash = '#/masuk'; viewMasuk(); };
    $('#btn-segar').onclick = function () { pastikanBoot(true).then(function (ok) { if (ok) { S.detail = null; route(); U.toast('Data diperbarui'); } }); };
  }
  function render(aktif, isi, bind) { app().innerHTML = shell(aktif, isi); pasangShell(); if (bind) bind(); }

  // ------------------------------------------------------------------ masuk
  function viewMasuk() {
    app().innerHTML = '<div class="masuk"><section class="kiri"><div style="display:grid;gap:6px"><div class="t1">KEMENTERIAN PERTANIAN · DITJEN PERKEBUNAN</div><div style="color:#CFE3D6">' + e(CFG.UNIT || '') + '</div></div>' +
      '<div style="display:grid;gap:18px"><span class="skema">SKEMA 15 + 25 HOK · PENGOLAHAN LAHAN + PENANAMAN</span><h1>' + e(CFG.NAMA || 'Sistem HOK Tebu') + '</h1><p>Input HOK per kabupaten, validasi langsung saat disimpan, dan pemantauan provinsi serta pusat dari satu tempat.</p>' +
      '<ol><li><b>01</b>Kabupaten mengisi poktan, pekerja dan kehadiran harian: pengolahan lahan 15 HOK/ha dan penanaman 25 HOK/ha</li><li><b>02</b>Sistem menolak NIK salah, tanggal tidak berurutan, HOK melebihi target dan hari ganda</li><li><b>03</b>Provinsi dan pusat memantau progres, dokumen dan temuan tanpa menunggu kiriman file</li></ol></div>' +
      '<div style="color:#CFE3D6;font-size:13px">Uji coba: D.I. Yogyakarta · Kulon Progo, Gunungkidul, Bantul, Sleman</div></section>' +
      '<section class="kanan"><form id="f-masuk" autocomplete="off"><div style="display:grid;gap:6px"><h2 style="font-size:24px">Masuk · Sistem HOK 15 + 25</h2><p class="muted">Gunakan kode akses <b>khusus sistem 15 + 25</b> dari Tim Evaluasi dan Pelaporan (berbeda dengan kode sistem HOK 40). Kode menentukan wilayah yang bisa Anda lihat.</p></div>' +
      '<div class="fld"><label for="kode">Kode akses</label><input id="kode" type="password" autocomplete="off" spellcheck="false" placeholder="mis. BTL-XXXX-XXXX" required><span class="bantu">Tidak membedakan huruf besar dan kecil.</span></div>' +
      '<div id="masuk-galat"></div><button class="btn utama" type="submit" style="min-height:48px">Masuk</button>' +
      (API.demo ? '<div class="info">Mode demo: klik salah satu kode untuk mencoba.</div><div class="demo-kode">' + DEMO.KODE.map(function (k) { return '<button type="button" class="btn kecil" data-kode="' + k.kode + '"><span class="mono">' + k.kode + '</span>&nbsp;· ' + e(k.nama) + '</button>'; }).join('') + '</div>' : '') +
      '<p class="kecil muted">Data tersimpan di akun Google Tim Kerja Evaluasi dan Pelaporan. NIK dan rekening hanya terlihat oleh peran yang berwenang.</p></form></section></div>';
    $$('[data-kode]').forEach(function (b) { b.onclick = function () { $('#kode').value = b.dataset.kode; $('#f-masuk').requestSubmit(); }; });
    $('#f-masuk').onsubmit = function (ev) {
      ev.preventDefault();
      var btn = $('#f-masuk button[type=submit]'); btn.disabled = true; btn.textContent = 'Memeriksa…';
      API.masuk($('#kode').value).then(function (r) {
        btn.disabled = false; btn.textContent = 'Masuk';
        if (!r.ok) { $('#masuk-galat').innerHTML = galat(r); return; }
        S.boot = null; location.hash = '#/dashboard'; route();
      });
    };
    $('#kode').focus();
  }

  // ------------------------------------------------------------------ dashboard
  function viewDashboard() {
    var b = S.boot, r = b.rekap, t = r.total, kab = r.kab;
    var kabJalan = kab.filter(function (k) { return k.rHOK > 0; }).length;
    var temuanUrut = b.temuan.slice().sort(function (a, c) { return (c.rp - a.rp) || (a.level === 'error' ? -1 : 1); }).slice(0, 6);
    var nPoktanTemuan = b.poktan.filter(function (p) { return p.hit.nTemuan; }).length;
    var minggu = r.minggu.slice(-12), maks = Math.max.apply(null, minggu.map(function (m) { return m.hok; }).concat([1]));
    var kpi = function (lbl, v, of, pct, d, alarm) {
      return '<div class="kpi' + (alarm ? ' alarm' : '') + '"><div class="lbl">' + lbl + '</div><div class="v num">' + v + (of ? ' <small>' + of + '</small>' : '') + '</div>' +
        (pct !== null ? '<div class="bar"><i style="width:' + Math.min(100, pct) + '%"></i></div>' : '') + '<div class="d">' + d + '</div></div>';
    };
    var namaTahap = ['', 'SPK terbit', 'Pekerjaan berjalan', 'BA Pemeriksaan', 'BAST', 'Kwitansi / dibayar'];
    var judul = b.user.peran === 'kabupaten' ? 'Progres HOK Kabupaten ' + b.user.kab : b.user.peran === 'provinsi' ? 'Progres HOK Provinsi ' + b.user.provinsi : 'Progres HOK Nasional';
    render('dashboard',
      '<div class="judul"><div><h1>' + e(judul) + '</h1><p>' + U.angka(r.jumlahPoktan) + ' baris poktan · ' + U.ha(t.luas || 0) + ' ha · target ' + U.angka(t.tHOK || 0) + ' HOK (pengolahan ' + U.angka(t.tOlah || 0) + ' + penanaman ' + U.angka(t.tTanam || 0) + ') · nilai SPK ' + U.rp(t.tBiaya || 0) + '</p></div>' +
      '<div class="baris"><button class="btn" id="unduh-rekap">Unduh rekap Excel</button></div></div>' +
      '<section class="kpis" aria-label="Ringkasan">' +
      kpi('Kabupaten dengan HOK masuk', kabJalan, '/ ' + kab.length, kab.length ? kabJalan / kab.length * 100 : 0, kab.filter(function (k) { return !k.n; }).length + ' kabupaten belum ada poktan') +
      kpi('HOK masuk', U.angka(t.rHOK || 0), '/ ' + U.angka(t.tHOK || 0), t.tHOK ? t.rHOK / t.tHOK * 100 : 0, 'pengolahan ' + U.angka(t.rOlah || 0) + '/' + U.angka(t.tOlah || 0) + ' · penanaman ' + U.angka(t.rTanam || 0) + '/' + U.angka(t.tTanam || 0)) +
      kpi('Realisasi biaya', 'Rp' + U.singkat(t.rBiaya || 0), '', t.tBiaya ? t.rBiaya / t.tBiaya * 100 : 0, 'dari nilai SPK ' + U.rp(t.tBiaya || 0)) +
      kpi('Poktan dengan temuan', nPoktanTemuan, 'poktan', null, (t.potensi ? 'potensi kelebihan bayar ' + U.rp(t.potensi) : 'tidak ada potensi kelebihan bayar'), nPoktanTemuan > 0) + '</section>' +
      '<div class="grid2"><section class="panel" style="flex:1 1 380px"><div class="panel-h"><h2>Tahapan dokumen poktan</h2><span class="kecil muted">dari ' + r.jumlahPoktan + ' poktan</span></div>' +
      [1, 2, 3, 4, 5].map(function (i) { var n = r.tahap[i]; return '<div class="tahap-baris"><span>' + namaTahap[i] + '</span><div class="t"><i style="width:' + (r.jumlahPoktan ? n / r.jumlahPoktan * 100 : 0) + '%"></i></div><span class="n num"><b>' + n + '</b> · ' + U.persen(n, r.jumlahPoktan) + '</span></div>'; }).join('') + '</section>' +
      '<section class="panel" style="flex:1 1 520px"><div class="panel-h"><h2>HOK masuk per minggu</h2><span class="kecil muted">dari tanggal hadir pekerja, minggu mulai Senin</span></div>' +
      (minggu.length ? '<div class="minggu">' + minggu.map(function (m) { return '<div title="Minggu ' + U.tglPendek(m.minggu) + ': ' + m.hok + ' HOK"><span class="num">' + U.angka(m.hok) + '</span><i style="height:' + (m.hok / maks * 100) + '%"></i></div>'; }).join('') + '</div>' +
        '<div class="minggu-lbl">' + minggu.map(function (m) { return '<span>' + U.tglPendek(m.minggu).replace(/ \d{4}$/, '') + '</span>'; }).join('') + '</div>' : '<div class="kosong">Belum ada kehadiran pekerja.</div>') + '</section></div>' +
      '<section class="panel" style="padding:0;overflow:hidden"><div class="panel-h" style="padding:14px 18px 0"><h2>Progres per kabupaten</h2><span class="kecil muted">klik baris untuk melihat poktan</span></div><div style="overflow-x:auto"><table class="t" style="min-width:980px">' +
      '<thead><tr><th>Kabupaten</th><th>Status</th><th class="r">Poktan</th><th class="r">Luas (ha)</th><th class="r">Target HOK</th><th>HOK masuk</th><th class="r">Nilai SPK</th><th class="r">Realisasi biaya</th><th class="r">Poktan bertemuan</th><th class="r">Potensi lebih bayar</th><th>Dokumen</th></tr></thead><tbody>' +
      kab.map(function (k) {
        var st = !k.n ? ['netral', 'Belum ada poktan'] : k.temuan ? ['crit', 'Ada temuan'] : k.rHOK >= k.tHOK && k.tHOK ? ['ok', 'HOK 100%'] : k.rHOK ? ['warn', 'Berjalan'] : ['netral', 'Belum mulai'];
        var pct = k.tHOK ? k.rHOK / k.tHOK * 100 : 0;
        return '<tr class="klik" data-kab="' + e(k.kab) + '"><td style="min-width:150px"><b>' + e(k.kab) + '</b><div class="kecil muted">' + e(k.provinsi) + (k.targetLuas ? ' · target ' + U.ha(k.targetLuas) + ' ha' : '') + '</div></td><td><span class="pill ' + st[0] + '">' + st[1] + '</span></td>' +
          '<td class="r">' + k.n + '</td><td class="r">' + U.ha(k.luas) + '</td><td class="r">' + U.angka(k.tHOK) + '</td>' +
          '<td style="min-width:150px"><div style="display:flex;gap:8px;align-items:center"><div class="bar" style="flex:1"><i style="width:' + Math.min(100, pct) + '%"></i></div><span class="num kecil">' + U.persen(k.rHOK, k.tHOK) + '</span></div><div class="kecil muted num">' + U.angka(k.rHOK) + ' HOK · olah ' + U.angka(k.rOlah) + ' · tanam ' + U.angka(k.rTanam) + '</div></td>' +
          '<td class="r">' + U.rp(k.tBiaya) + '</td><td class="r">' + U.rp(k.rBiaya) + '</td><td class="r" style="color:' + (k.temuan ? 'var(--crit)' : 'inherit') + ';font-weight:700">' + k.temuan + '</td>' +
          '<td class="r">' + (k.potensi ? U.rp(k.potensi) : '–') + '</td><td class="num">' + (k.n ? k.dokLengkap + ' / ' + k.n + ' · ' + U.persen(k.dokAda, k.dokButuh) : '–') + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td>Total</td><td></td><td class="r">' + (t.n || 0) + '</td><td class="r">' + U.ha(t.luas || 0) + '</td><td class="r">' + U.angka(t.tHOK || 0) + '</td><td>' + U.angka(t.rHOK || 0) + ' · ' + U.persen(t.rHOK || 0, t.tHOK || 0) + '</td><td class="r">' + U.rp(t.tBiaya || 0) + '</td><td class="r">' + U.rp(t.rBiaya || 0) + '</td><td class="r">' + (t.temuan || 0) + '</td><td class="r">' + U.rp(t.potensi || 0) + '</td><td>' + U.persen(t.dokAda || 0, t.dokButuh || 0) + '</td></tr></tfoot></table></div></section>' +
      '<section class="panel"><div class="panel-h"><h2>Temuan terbesar</h2><a href="#/temuan">Lihat semua temuan</a></div>' +
      (temuanUrut.length ? temuanUrut.map(function (x) {
        return '<div class="tem-baris"><span class="pill ' + (x.level === 'error' ? 'crit' : 'warn') + '" style="justify-self:start">' + e(x.jenis) + '</span>' +
          '<div style="min-width:0"><b>' + e(x.pesan) + '</b><div class="kecil muted"><a href="#/poktan/' + encodeURIComponent(x.id_poktan) + '">' + e(x.id_poktan) + ' · ' + e(x.poktan) + '</a> · ' + e(x.kab) + (/^Pekerja/.test(x.objek) ? ' · ' + e(x.nama) + ' (' + e(x.objek.replace(/^Pekerja /, '')) + ')' : '') + '</div></div>' +
          '<span class="num rp">' + (x.rp ? U.rp(x.rp) : '–') + '</span></div>';
      }).join('') : '<div class="kosong">Tidak ada temuan.</div>') + '</section>',
      function () {
        $$('tr[data-kab]').forEach(function (tr) { tr.onclick = function () { S.filter.kab = tr.dataset.kab; location.hash = '#/poktan'; }; });
        $('#unduh-rekap').onclick = unduhRekap;
      });
  }

  function unduhRekap() {
    var b = S.boot;
    U.unduhXlsx('Rekap_HOK_Tebu_15_25_' + b.hariIni + '.xlsx', [
      { nama: 'Kabupaten', rows: b.rekap.kab.map(function (k) { return { Kabupaten: k.kab, Provinsi: k.provinsi, Poktan: k.n, 'Luas (ha)': k.luas, 'Target HOK': k.tHOK, 'Target pengolahan': k.tOlah, 'Target penanaman': k.tTanam, 'HOK masuk': k.rHOK, 'HOK pengolahan': k.rOlah, 'HOK penanaman': k.rTanam, 'Nilai SPK (Rp)': k.tBiaya, 'Realisasi biaya (Rp)': k.rBiaya, Pekerja: k.nPek, 'Poktan bertemuan': k.temuan, 'Potensi kelebihan bayar (Rp)': k.potensi, 'Poktan dokumen lengkap': k.dokLengkap }; }) },
      { nama: 'Poktan', rows: b.poktan.map(function (p) { var h = p.hit; return { ID: p.id, Kabupaten: p.kab, Kegiatan: p.keg, 'Kelompok tani': p.poktan, Ketua: p.ketua, Desa: p.desa, Kecamatan: p.kec, 'Luas (ha)': HOK.num(p.luas), 'SK CPCL': p.no_cpcl, 'No SPK': p.no_spk, 'Tgl SPK': p.tgl_spk, Mulai: p.mulai, Selesai: p.selesai, 'Mulai pengolahan': p.mulai_olah, 'Selesai pengolahan': p.selesai_olah, 'Mulai penanaman': p.mulai_tanam, Tahapan: h.namaTahap, 'Target HOK': h.tHOK, 'HOK masuk': h.rHOK, 'Target pengolahan': h.per.olah.tHOK, 'HOK pengolahan': h.per.olah.rHOK, 'Target penanaman': h.per.tanam.tHOK, 'HOK penanaman': h.per.tanam.rHOK, 'Upah/HOK': h.upah, 'Nilai SPK': h.tBiaya, 'Realisasi biaya': h.rBiaya, Pekerja: h.nPek, Status: h.status, 'Potensi kelebihan bayar': h.potensi, 'Dokumen %': h.dok.persen }; }) },
      { nama: 'Temuan', rows: b.temuan.map(function (t) { return { Kabupaten: t.kab, ID: t.id_poktan, 'Kelompok tani': t.poktan, Objek: t.objek, Nama: t.nama, NIK: t.nik, Jenis: t.jenis, Tingkat: t.level, Temuan: t.pesan, 'Potensi (Rp)': t.rp }; }) }
    ]);
  }

  // ------------------------------------------------------------------ daftar poktan
  function viewPoktanList() {
    var b = S.boot, f = S.filter;
    var kabs = b.kabupaten.map(function (k) { return k.kab; });
    if (f.kab && kabs.indexOf(f.kab) < 0) f.kab = '';
    render('poktan',
      '<div class="judul"><div><h1>Kelompok tani</h1><p id="ringkas-list"></p></div><div class="baris">' +
      (bisaTambah() ? '<button class="btn" id="btn-impor">Impor dari Excel v2</button><a class="btn utama" href="#/poktan/baru">Tambah poktan</a>' : '') +
      '<button class="btn" id="btn-f13">List data poktan (F13)</button></div></div>' +
      '<div class="filter">' + (kabs.length > 1 ? '<label class="sr" for="f-kab">Kabupaten</label><select id="f-kab"><option value="">Semua kabupaten</option>' + kabs.map(function (k) { return '<option' + (k === f.kab ? ' selected' : '') + '>' + e(k) + '</option>'; }).join('') + '</select>' : '') +
      '<label class="sr" for="f-keg">Kegiatan</label><select id="f-keg"><option value="">Semua kegiatan</option><option' + (f.keg === 'Perluasan Tanaman Tebu' ? ' selected' : '') + '>Perluasan Tanaman Tebu</option><option' + (f.keg === 'Bongkar Ratoon' ? ' selected' : '') + '>Bongkar Ratoon</option></select>' +
      '<label class="sr" for="f-status">Status</label><select id="f-status"><option value="">Semua status</option>' + ['Ada temuan', 'Berjalan', 'Belum mulai', 'Lengkap & sesuai'].map(function (s) { return '<option' + (s === f.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
      '<label class="sr" for="f-q">Cari</label><input id="f-q" type="search" placeholder="Cari ID, poktan, ketua, desa…" value="' + e(f.q) + '"></div>' +
      '<div class="tbl-wrap"><table class="t" style="min-width:1080px"><thead><tr><th>ID</th><th>Kelompok tani</th><th>Kegiatan</th><th>Desa · Kec.</th><th class="r">Luas</th><th>Tahapan</th><th>HOK masuk</th><th>Status</th><th>Dokumen</th></tr></thead><tbody id="tb-poktan"></tbody></table></div>',
      function () {
        var isiTabel = function () {
          var q = f.q.toLowerCase();
          var rows = b.poktan.filter(function (p) {
            return (!f.kab || p.kab === f.kab) && (!f.keg || p.keg === f.keg) && (!f.status || p.hit.status === f.status) &&
              (!q || [p.id, p.poktan, p.ketua, p.desa, p.kec].join(' ').toLowerCase().indexOf(q) >= 0);
          });
          var luas = rows.reduce(function (s, p) { return s + HOK.num(p.luas); }, 0), tH = rows.reduce(function (s, p) { return s + p.hit.tHOK; }, 0), rH = rows.reduce(function (s, p) { return s + p.hit.rHOK; }, 0);
          $('#ringkas-list').textContent = rows.length + ' dari ' + b.poktan.length + ' baris poktan · ' + U.ha(luas) + ' ha · HOK masuk ' + U.angka(rH) + ' / ' + U.angka(tH);
          $('#tb-poktan').innerHTML = rows.length ? rows.map(function (p) {
            var h = p.hit;
            return '<tr class="klik" data-id="' + e(p.id) + '"><td class="mono">' + e(p.id) + '</td><td><b>' + e(p.poktan) + '</b><div class="kecil muted">Ketua: ' + e(p.ketua || '–') + ' · ' + e(String(p.no_cpcl || '').replace(/^.*\((Tahap [IVX]+)\).*$/, '$1')) + '</div></td>' +
              '<td><span class="tag ' + kodeKeg(p.keg) + '">' + namaKeg(p.keg) + '</span></td><td class="muted">' + e(p.desa) + ' · ' + e(p.kec) + '</td><td class="r num">' + U.ha(p.luas) + ' ha</td>' +
              '<td>' + langkah(h.tahap) + '<span class="kecil muted">' + e(h.namaTahap) + '</span></td><td class="num" style="white-space:nowrap">' + U.angka(h.rHOK) + ' / ' + U.angka(h.tHOK) + '<div class="kecil muted">olah ' + U.angka(h.per.olah.rHOK) + '/' + U.angka(h.per.olah.tHOK) + ' · tanam ' + U.angka(h.per.tanam.rHOK) + '/' + U.angka(h.per.tanam.tHOK) + '</div><div class="kecil muted">' + h.nPek + ' pekerja</div></td>' +
              '<td>' + pillStatus(h.status) + (h.potensi ? '<div class="kecil" style="color:var(--crit);font-weight:600;margin-top:3px">' + U.rp(h.potensi) + '</div>' : '') + '</td>' +
              '<td class="num kecil">' + h.dok.persen + '%<div class="muted">KTP ' + h.dok.ktp + '/' + h.nPek + ' · foto ' + h.dok.geo + '/' + HOK.SLOT.geo.length + '</div></td></tr>';
          }).join('') : '<tr><td colspan="9" class="kosong">Tidak ada poktan yang cocok dengan saringan.</td></tr>';
          $$('#tb-poktan tr[data-id]').forEach(function (tr) { tr.onclick = function () { location.hash = '#/poktan/' + encodeURIComponent(tr.dataset.id); }; });
        };
        [['#f-kab', 'kab'], ['#f-keg', 'keg'], ['#f-status', 'status']].forEach(function (x) { var el = $(x[0]); if (el) el.onchange = function () { f[x[1]] = el.value; isiTabel(); }; });
        $('#f-q').oninput = function () { f.q = this.value; isiTabel(); };
        if ($('#btn-impor')) $('#btn-impor').onclick = dialogImpor;
        $('#btn-f13').onclick = dialogF13;
        isiTabel();
      });
  }

  function dialogF13() {
    var kabs = S.boot.kabupaten.map(function (k) { return k.kab; });
    U.dialog('<h2>List data kelompok tani penerima bantuan (F13)</h2><p class="kecil muted">Cukup satu rekapan per kabupaten untuk seluruh kelompok yang diajukan pencairan HOK. Alamat, nomor dan nama rekening mengikuti buku rekening.</p><div class="form-grid"><div class="fld"><label for="f13-kab">Kabupaten</label><select id="f13-kab">' + kabs.map(function (k) { return '<option' + (k === S.filter.kab ? ' selected' : '') + '>' + e(k) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label for="f13-keg">Kegiatan</label><select id="f13-keg"><option value="">Semua kegiatan</option><option>Perluasan Tanaman Tebu</option><option>Bongkar Ratoon</option></select></div></div><div class="baris"><button class="btn utama" id="f13-go">Cetak</button><button class="btn" id="f13-xls">Unduh Excel</button></div>', function (d) {
      var pilih = function () {
        var kab = S.boot.kabBy[$('#f13-kab', d).value], keg = $('#f13-keg', d).value;
        return { kab: kab, keg: keg, daftar: S.boot.poktan.filter(function (p) { return p.kab === kab.kab && (!keg || p.keg === keg); }) };
      };
      $('#f13-xls', d).onclick = function () {
        var x = pilih();
        EKSPOR.excelAlamat(x.kab, x.keg, x.daftar).then(function () { U.tutupDialog(); U.toast('Berkas diunduh'); }, function (er) { U.toast('Gagal: ' + er.message, true); });
      };
      $('#f13-go', d).onclick = function () {
        var x = pilih();
        U.tutupDialog();
        FORM.cetakHTML(FORM.F13(x.kab, x.keg, x.daftar), 'F13_List_Data_Poktan_' + x.kab.kab + (x.keg ? '_' + HOK.kodeKeg(x.keg) : ''));
      };
    });
  }

  // ------------------------------------------------------------------ detail poktan
  function muatDetail(id, paksa) {
    if (!paksa && S.detail && S.detail.poktan.id === id) return Promise.resolve(true);
    return API.panggil('poktan.get', { id: id }).then(function (r) {
      if (!r.ok) { render('poktan', galat(r) + '<p><a href="#/poktan">‹ Kembali ke daftar poktan</a></p>'); return false; }
      S.detail = r.data; S.berkas = null; S.hadir = null;
      return true;
    });
  }

  function viewPoktan(id, tab) {
    if (!S.detail || S.detail.poktan.id !== id) app().innerHTML = shell('poktan', '<div class="memuat">Memuat poktan…</div>');
    muatDetail(id).then(function (ok) {
      if (!ok) return;
      var d = S.detail, p = d.poktan, h = p.hit;
      var tabs = [['data', 'Data poktan'], ['hadir', 'Kehadiran (HOK)'], ['dokumen', 'Dokumen & foto'], ['cetak', 'Cetak form'], ['temuan', 'Temuan' + (d.temuan.length ? ' (' + d.temuan.length + ')' : '')]];
      var head = '<div class="judul"><div><a href="#/poktan" class="kecil" style="font-weight:600">‹ Daftar poktan</a><h1>' + e(p.id) + ' · ' + e(p.poktan) + '</h1>' +
        '<div class="ringkas"><span><span class="tag ' + kodeKeg(p.keg) + '">' + e(p.keg) + '</span></span><span>' + e(p.desa) + ', ' + e(p.kec) + ', ' + e(p.kab) + '</span><span>Luas <b>' + U.ha(p.luas) + ' ha</b></span>' +
        '<span>Target <b>' + U.angka(h.tHOK) + ' HOK</b> · ' + U.rp(h.tBiaya) + '</span><span>Masuk <b>' + U.angka(h.rHOK) + ' HOK</b></span><span>' + pillStatus(h.status) + '</span></div></div>' +
        '<div class="baris">' + langkah(h.tahap) + '<span class="kecil muted">' + e(h.namaTahap) + '</span></div></div>' +
        '<nav class="tab" aria-label="Bagian poktan">' + tabs.map(function (t) { return '<a href="#/poktan/' + encodeURIComponent(p.id) + '/' + t[0] + '" class="' + (t[0] === tab ? 'aktif' : '') + '">' + t[1] + '</a>'; }).join('') + '</nav>';
      if (tab === 'hadir') tabHadir(head);
      else if (tab === 'dokumen') tabDokumen(head);
      else if (tab === 'cetak') tabCetak(head);
      else if (tab === 'temuan') tabTemuan(head);
      else viewPoktanForm(head);
    });
  }

  // ------------------------------------------------------------------ form data poktan
  var FIELD = [
    ['A. Identitas kelompok tani', [
      ['kab', 'Kabupaten', 'kab'], ['keg', 'Kegiatan', 'keg'], ['poktan', 'Nama kelompok tani'], ['ketua', 'Nama ketua'],
      ['nik_ketua', 'NIK ketua', 'nik', '16 digit sesuai KTP'], ['jalan', 'Jalan / alamat'], ['desa', 'Desa', '', 'tanpa kata "Desa"'], ['kec', 'Kecamatan', '', 'tanpa kata "Kec."'],
      ['bank', 'Nama bank'], ['norek', 'Nomor rekening poktan'], ['namarek', 'Nama di rekening'], ['npwp', 'NPWP (KT / ketua KT)', '', 'nomor sesuai kartu NPWP'], ['npwp_an', 'NPWP atas nama', 'npwp_an', 'foto NPWP diunggah di tab Dokumen & foto']]],
    ['B. Rencana dan satuan HOK', [
      ['luas', 'Luas target (ha)', 'angka', 'sesuai SK CPCL'],
      ['upah_khusus', 'Upah/HOK khusus (opsional)', 'angka', 'kosongkan bila mengikuti standar provinsi'], ['_tarif', 'Berlaku', 'info']]],
    ['C. Nomor dan tanggal dokumen', [
      ['no_cpcl', 'No. SK CPCL'], ['tgl_cpcl', 'Tgl SK CPCL', 'date'], ['no_spk', 'No. SPK'], ['tgl_spk', 'Tgl SPK', 'date', 'setelah DIPA dan SK CPCL'],
      ['tempat_spk', 'SPK bertempat di'], ['jalan_spk', 'Jalan tempat SPK'], ['spk_sd', 'SPK berlaku s.d.', 'date'], ['tgl_sptjm', 'Tgl SPTJM', 'date', 'sama/setelah SPK'],
      ['tgl_rukk', 'Tgl RUKK', 'date', 'sama/setelah SPK, sebelum mulai'], ['mulai', 'Tgl mulai pekerjaan (SPK)', 'date', 'setelah tanggal SPK'], ['selesai', 'Tgl selesai pekerjaan (SPK)', 'date', 'dalam masa berlaku SPK; juga akhir penanaman'],
      ['mulai_olah', 'Tgl mulai pengolahan lahan', 'date', 'awal daftar hadir pengolahan (15 HOK/ha)'], ['selesai_olah', 'Tgl selesai pengolahan lahan', 'date', 'akhir daftar hadir pengolahan'],
      ['mulai_tanam', 'Tgl mulai penanaman', 'date', 'awal daftar hadir penanaman (25 HOK/ha); boleh tumpang tindih dengan pengolahan'],
      ['tgl_lap', 'Tgl laporan pelaksanaan', 'date'], ['no_bap', 'No. BA Pemeriksaan'], ['tgl_bap', 'Tgl BA Pemeriksaan', 'date'], ['no_bast', 'No. BAST'], ['tgl_bast', 'Tgl BAST', 'date'],
      ['no_kw', 'No. Kwitansi'], ['tgl_kw', 'Tgl Kwitansi', 'date'], ['tgl_tt', 'Tgl tanda terima upah pekerja', 'date']]],
    ['D. Realisasi', [['real_luas', 'Realisasi luas (ha)', 'angka', 'hasil pemeriksaan tim teknis']]]
  ];

  function ctxLokal(pekerjaDetail) {
    var b = S.boot, pekerjaPer = {};
    if (pekerjaDetail && S.detail) pekerjaPer[S.detail.poktan.id] = pekerjaDetail.map(function (w) { return { id: w.id, nik: w.nik, _hadir: w.hadir, jenis: w.jenis }; });
    return { setting: b.setting, kabBy: b.kabBy, provBy: b.provBy, poktan: b.poktan, poktanBy: b.poktanBy, pekerja: [], pekerjaPer: pekerjaPer };
  }

  function viewPoktanForm(head) {
    var baru = !head, d = S.detail, p = baru ? { kab: S.boot.user.peran === 'kabupaten' ? S.boot.user.kab : (S.filter.kab || S.boot.kabupaten[0].kab), keg: 'Perluasan Tanaman Tebu' } : d.poktan;
    var tulis = baru ? bisaTambah() : bolehTulis(p.kab);
    if (baru && !tulis) { render('poktan', '<div class="galat">Peran Anda tidak bisa menambah poktan.</div>'); return; }
    var isiField = function (f) {
      var k = f[0], tipe = f[2] || '', v = p[k] === undefined ? '' : p[k], dis = tulis ? '' : ' disabled';
      var inp;
      if (tipe === 'info') return '<div class="fld"><label>' + f[1] + '</label><div id="info-tarif" class="kecil" style="padding-top:4px"></div></div>';
      if (tipe === 'kab') {
        var bisaPilih = tulis && S.boot.user.peran === 'pusat';
        inp = '<select id="fld-kab" name="kab"' + (bisaPilih ? '' : ' disabled') + '>' + S.boot.kabupaten.map(function (x) { return '<option' + (x.kab === v ? ' selected' : '') + '>' + e(x.kab) + '</option>'; }).join('') + '</select>';
      } else if (tipe === 'npwp_an') {
        inp = '<select id="fld-npwp_an" name="npwp_an"' + dis + '><option value="">– pilih –</option>' + HOK.NPWP_AN.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>';
      } else if (tipe === 'keg') {
        inp = '<select id="fld-keg" name="keg"' + dis + '>' + Object.keys(HOK.KEG).map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>';
      } else {
        inp = '<input id="fld-' + k + '" name="' + k + '" type="' + (tipe === 'date' ? 'date' : 'text') + '"' + (tipe === 'angka' ? ' inputmode="decimal"' : '') + (tipe === 'nik' ? ' inputmode="numeric" maxlength="20"' : '') + ' value="' + e(v) + '"' + dis + '>';
      }
      return '<div class="fld" data-f="' + k + '"><label for="fld-' + k + '">' + f[1] + '</label>' + inp + (f[3] ? '<span class="bantu">' + f[3] + '</span>' : '') + '<span class="pesan"></span></div>';
    };
    var isi = (head || '<div class="judul"><div><a href="#/poktan" class="kecil" style="font-weight:600">‹ Daftar poktan</a><h1>Tambah kelompok tani</h1><p>Satu baris = satu poktan untuk satu kegiatan dalam satu SK CPCL.</p></div></div>') +
      '<form id="f-poktan" class="panel" novalidate>' + FIELD.map(function (s) { return '<div class="seksi"><h3>' + s[0] + '</h3><div class="form-grid">' + s[1].map(isiField).join('') + '</div></div>'; }).join('') +
      '<div id="f-galat"></div></form>' +
      (tulis ? '<div class="aksi-bawah">' + (!baru && !d.pekerja.length ? '<button class="btn bahaya" id="btn-hapus" type="button">Hapus poktan</button>' : '') + '<span class="kecil muted" id="status-simpan" style="align-self:center"></span><button class="btn utama" id="btn-simpan" type="button">Simpan data poktan</button></div>' :
        '<div class="info">Anda hanya dapat melihat data ini.</div>');
    render('poktan', isi, function () {
      var form = $('#f-poktan');
      var baca = function () {
        var o = Object.assign({}, p);
        $$('input,select', form).forEach(function (el) { if (el.name) o[el.name] = el.value.trim(); });
        return o;
      };
      var periksa = function () {
        var o = baca(), pek = baru ? [] : d.pekerja;
        var hasil = HOK.validasiPoktan(o, ctxLokal(pek), { pekerja: pek.map(function (w) { return { _hadir: w.hadir, jenis: w.jenis }; }) });
        $$('.fld[data-f]', form).forEach(function (fl) { fl.classList.remove('salah'); $('.pesan', fl).textContent = ''; $('.pesan', fl).className = 'pesan'; });
        hasil.forEach(function (x) {
          var fl = $('.fld[data-f="' + x.field + '"]', form);
          if (!fl) return;
          var ps = $('.pesan', fl);
          if (x.level === 'error') { fl.classList.add('salah'); ps.className = 'pesan'; } else if (!ps.textContent) ps.className = 'pesan w';
          ps.textContent = ps.textContent ? ps.textContent + '; ' + x.pesan : x.pesan;
        });
        var t = HOK.tarif(o, ctxLokal()), tHOK = Math.round(HOK.num(o.luas) * t.hokha);
        var lu = HOK.num(o.luas);
        $('#info-tarif').innerHTML = U.angka(t.hokha) + ' HOK/ha (pengolahan ' + t.hok.olah + ' + penanaman ' + t.hok.tanam + ') × ' + U.rp(t.upah) + '/HOK<br><b>Target ' + U.angka(tHOK) + ' HOK (' + U.angka(Math.round(lu * t.hok.olah)) + ' + ' + U.angka(Math.round(lu * t.hok.tanam)) + ') · nilai SPK ' + U.rp(tHOK * t.upah) + '</b>';
        return hasil;
      };
      form.addEventListener('input', function () { if (tulis) { S.kotor = true; $('#status-simpan').textContent = 'Belum disimpan'; } periksa(); });
      form.addEventListener('change', periksa);
      periksa();
      if (!tulis) return;
      $('#btn-simpan').onclick = function () {
        var hasil = periksa(), err = hasil.filter(function (x) { return x.level === 'error'; });
        if (err.length) { $('#f-galat').innerHTML = galat({ pesan: 'Perbaiki ' + err.length + ' isian bertanda merah sebelum menyimpan.', rincian: hasil }); var el = $('.fld.salah', form); if (el) el.scrollIntoView({ block: 'center' }); return; }
        var data = baca(); if (!baru) data.id = p.id;
        var btn = this; btn.disabled = true; btn.textContent = 'Menyimpan…';
        API.panggil('poktan.simpan', { data: data, versi: baru ? '' : d.versi }).then(function (r) {
          btn.disabled = false; btn.textContent = 'Simpan data poktan';
          if (!r.ok && r.kode === 'BENTROK') { dialogBentrok(r, p.id, 'data'); return; }
          if (!r.ok) { $('#f-galat').innerHTML = galat(r); U.toast(r.pesan, true); return; }
          S.kotor = false; $('#f-galat').innerHTML = '';
          U.toast('Data poktan ' + r.data.id + ' tersimpan');
          return pastikanBoot(true).then(function () { S.detail = null; if (baru) location.hash = '#/poktan/' + encodeURIComponent(r.data.id); else viewPoktan(p.id, 'data'); });
        });
      };
      if ($('#btn-hapus')) $('#btn-hapus').onclick = function () {
        if (!confirm('Hapus poktan ' + p.id + ' · ' + p.poktan + '? Tindakan ini tidak bisa dibatalkan.')) return;
        API.panggil('poktan.hapus', { id: p.id }).then(function (r) {
          if (!r.ok) { U.toast(r.pesan, true); return; }
          S.kotor = false; U.toast('Poktan dihapus'); pastikanBoot(true).then(function () { S.detail = null; location.hash = '#/poktan'; });
        });
      };
    });
  }

  // ------------------------------------------------------------------ kehadiran (grid HOK)
  var HARI_PER_LAYAR = 14;

  function tabHadir(head) {
    var d = S.detail, p = d.poktan, tulis = bolehTulis(p.kab);
    var J = S.jenisHadir === 'tanam' ? 'tanam' : 'olah', JN = HOK.JENIS[J], lblJ = JN.label.toLowerCase(), JL = J === 'olah' ? 'tanam' : 'olah';
    var pr = HOK.periode(p, J), awalH = pr.awal, akhirH = pr.akhir;
    var pilihJenis = '<div class="pilih-jenis" role="tablist">' + HOK.DAFTAR_JENIS.map(function (k) {
      var h = p.hit.per[k], jj = HOK.JENIS[k];
      return '<button type="button" role="tab" class="btn' + (k === J ? ' utama' : '') + '" aria-selected="' + (k === J) + '" data-jenis="' + k + '"><span><b>' + jj.label + '</b> · ' + p.hit.hok[k] + ' HOK/ha</span><span class="kecil" style="display:block;opacity:.85;font-weight:500">' + U.angka(h.rHOK) + ' / ' + U.angka(h.tHOK) + ' HOK · ' + h.nPek + ' pekerja</span></button>';
    }).join('') + '</div>';
    var pasangPilih = function () {
      $$('[data-jenis]').forEach(function (bt) {
        bt.onclick = function () {
          if (bt.dataset.jenis === J) return;
          if (S.kotor && !confirm('Perubahan kehadiran ' + lblJ + ' belum disimpan. Pindah tanpa menyimpan?')) return;
          S.kotor = false; S.hadir = null; S.jenisHadir = bt.dataset.jenis; tabHadir(head);
        };
      });
    };
    if (!awalH || !akhirH) {
      render('poktan', head + pilihJenis + '<div class="info">Isi <b>tanggal mulai dan selesai pekerjaan (SPK)</b> serta tanggal <b>' + lblJ + '</b> di tab <a href="#/poktan/' + encodeURIComponent(p.id) + '/data">Data poktan</a> sebelum mengisi kehadiran ' + lblJ + '.</div>', pasangPilih);
      return;
    }
    if (!S.hadir || S.hadir.jenis !== J) S.hadir = { jenis: J, rows: d.pekerja.filter(function (w) { return w.jenis === J; }).map(function (w) { return { id: w.id, nama: w.nama, nik: w.nik, alamat: w.alamat || '', hadir: w.hadir.slice() }; }), hal: 0, serverErr: null };
    var H = S.hadir;
    var nHari = Math.max(1, HOK.hari(akhirH) - HOK.hari(awalH) + 1);
    var maxHal = Math.max(0, Math.ceil(nHari / HARI_PER_LAYAR) - 1);
    if (H.hal > maxHal) H.hal = maxHal;

    render('poktan', head + pilihJenis +
      '<div class="grid2"><div class="utama"><section class="panel" style="padding:0;overflow:hidden">' +
      '<div style="padding:12px 14px;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line)">' +
      '<div class="baris"><button class="btn kecil" id="hal-prev" aria-label="Periode sebelumnya">‹</button><b id="hal-label" class="num"></b><button class="btn kecil" id="hal-next" aria-label="Periode berikutnya">›</button></div>' +
      (tulis ? '<div class="baris">' + (d.pekerja.some(function (w) { return w.jenis === JL; }) ? '<button class="btn kecil" id="btn-salin-jenis">Salin nama dari ' + HOK.JENIS[JL].label.toLowerCase() + '</button>' : '') + '<button class="btn kecil" id="btn-tempel">Tempel daftar pekerja</button><button class="btn kecil" id="btn-tambah">Tambah pekerja</button></div>' : '') + '</div>' +
      '<div class="hadir-wrap"><table class="hadir" id="tbl-hadir"></table></div>' +
      '<div style="padding:10px 14px;border-top:1px solid var(--line)" class="legenda"><span><i style="background:var(--green)"></i>Hadir (1 HOK)</span><span><i style="background:var(--crit)"></i>Bentrok: NIK sama sudah hadir di poktan lain / di luar aturan</span><span><i style="box-shadow:inset 0 0 0 2px var(--crit);background:#F7F9F7"></i>NIK ini sudah hadir di poktan lain atau di ' + HOK.JENIS[JL].label.toLowerCase() + ' pada tanggal itu</span><span><i style="background:#E3E8E5"></i>Di luar masa ' + lblJ + '</span>' +
      (tulis ? '<span>Klik tanggal di kepala kolom untuk menandai semua pekerja.</span>' : '') + '</div></section></div>' +
      '<aside class="samping"><div class="panel" style="display:flex;flex-direction:column;gap:10px"><div class="kecil muted" style="font-weight:600;letter-spacing:.08em">HOK ' + JN.judul + '</div>' +
      '<div><span id="sum-hok" style="font-family:var(--f-disp);font-weight:600;font-size:40px;line-height:1"></span> <span class="muted" id="sum-target"></span></div><div class="bar" style="height:8px"><i id="sum-bar"></i></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px"><div><div class="muted">Sisa HOK</div><b id="sum-sisa"></b></div><div><div class="muted">Realisasi biaya</div><b id="sum-rp"></b></div><div><div class="muted">Upah/HOK</div><b>' + U.rp(p.hit.upah) + '</b></div><div><div class="muted">Pekerja</div><b id="sum-pek"></b></div></div></div>' +
      '<div class="panel" style="display:flex;flex-direction:column;gap:9px"><h2>Pemeriksaan</h2><div id="cek-list"></div></div><div id="hadir-galat"></div>' +
      (tulis ? '<button class="btn utama" id="btn-simpan-hadir" style="min-height:48px">Simpan kehadiran ' + lblJ + '</button><span class="kecil muted" id="status-hadir"></span>' : '<div class="info">Anda hanya dapat melihat data ini.</div>') +
      '</aside></div>', function () {
      pasangPilih();
      gambarHadir();
      $('#hal-prev').onclick = function () { if (H.hal > 0) { H.hal--; gambarHadir(); } };
      $('#hal-next').onclick = function () { if (H.hal < maxHal) { H.hal++; gambarHadir(); } };
      if (!tulis) return;
      $('#btn-tambah').onclick = function () { H.rows.push({ id: '', nama: '', nik: '', alamat: p.desa ? 'Desa ' + p.desa : '', hadir: [] }); ubah(); gambarHadir(); var ins = $$('#tbl-hadir input[data-k="nama"]'); if (ins.length) ins[ins.length - 1].focus(); };
      $('#btn-tempel').onclick = dialogTempel;
      if ($('#btn-salin-jenis')) $('#btn-salin-jenis').onclick = function () {
        var ada = {}, n = 0; H.rows.forEach(function (w) { ada[w.nik] = 1; });
        d.pekerja.filter(function (w) { return w.jenis === JL && !ada[w.nik]; }).forEach(function (w) { H.rows.push({ id: '', nama: w.nama, nik: w.nik, alamat: w.alamat || '', hadir: [] }); ada[w.nik] = 1; n++; });
        ubah(); gambarHadir(); U.toast(n ? n + ' nama disalin. Tandai hari hadirnya: tidak boleh di tanggal yang sama dengan ' + HOK.JENIS[JL].label.toLowerCase() + '.' : 'Semua nama sudah ada di daftar ini');
      };
      $('#btn-simpan-hadir').onclick = simpanHadir;
    });

    function ubah() { S.kotor = true; H.serverErr = null; var st = $('#status-hadir'); if (st) st.textContent = 'Belum disimpan'; }

    function validasi() {
      // bentrok yang sudah diketahui server (NIK yang sama di poktan lain) dijadikan baris pembanding
      var lain = [], poktanBy = Object.assign({}, S.boot.poktanBy);
      Object.keys(d.konflik || {}).forEach(function (nik) {
        var per = {};
        d.konflik[nik].forEach(function (k) { (per[k.id_poktan] = per[k.id_poktan] || []).push(k.tanggal); if (!poktanBy[k.id_poktan]) poktanBy[k.id_poktan] = { id: k.id_poktan, poktan: k.poktan, kab: k.kab }; });
        Object.keys(per).forEach(function (pid) { lain.push({ id: 'x' + pid + nik, id_poktan: pid, nik: nik, _hadir: per[pid] }); });
      });
      // jenis pekerjaan lain di poktan ini juga pembanding (NIK yang sama tidak boleh di dua jenis pada tanggal sama)
      d.pekerja.filter(function (w) { return w.jenis !== J; }).forEach(function (w) { lain.push({ id: 'j' + w.id, id_poktan: p.id, nik: w.nik, _hadir: w.hadir, jenis: w.jenis }); });
      var ctx = { setting: S.boot.setting, kabBy: S.boot.kabBy, provBy: S.boot.provBy, poktanBy: poktanBy, pekerja: lain };
      var v = HOK.validasiPekerja(p, H.rows, ctx, { lama: d.pekerja.filter(function (w) { return w.jenis === J; }), jenis: J });
      if (H.serverErr) v.errors = v.errors.concat(H.serverErr.filter(function (x) { return !v.errors.some(function (y) { return y.row === x.row && y.pesan === x.pesan; }); }));
      return v;
    }

    function gambarHadir() {
      var awal = H.hal * HARI_PER_LAYAR, tgl = [];
      for (var i = 0; i < HARI_PER_LAYAR && awal + i < nHari; i++) tgl.push(U.tambahHari(awalH, awal + i));
      $('#hal-label').textContent = U.rentang(tgl[0], tgl[tgl.length - 1]) + ' · hari ke-' + (awal + 1) + '–' + (awal + tgl.length) + ' dari ' + nHari;
      $('#hal-prev').disabled = H.hal === 0; $('#hal-next').disabled = H.hal === maxHal;
      var v = validasi(), errRow = {}, errTgl = {}, warnRow = {};
      v.errors.forEach(function (x) { (errRow[x.row] = errRow[x.row] || []).push(x.pesan); if (x.tanggal) errTgl[x.row + '|' + x.tanggal] = 1; });
      v.peringatan.forEach(function (x) { (warnRow[x.row] = warnRow[x.row] || []).push(x.pesan); if (x.tanggal) errTgl[x.row + '|' + x.tanggal] = 1; });
      var konf = d.konflik || {};
      var html = '<thead><tr><th class="kiri">Pekerja · NIK · alamat</th>' + tgl.map(function (t) {
        var dow = U.namaHari(t).slice(0, 3), merah = U.namaHari(t) === 'Minggu' ? ' minggu-merah' : '';
        return '<th>' + (tulis ? '<button type="button" class="kol" data-tgl="' + t + '" title="Tandai/hapus semua pekerja pada ' + U.tgl(t) + '">' : '') + '<span class="' + merah + '">' + dow + '</span><br><b style="font-size:12px">' + t.slice(8) + '</b><br>' + U.BULAN[Number(t.slice(5, 7)) - 1].slice(0, 3) + (tulis ? '</button>' : '') + '</th>';
      }).join('') + '<th>Hari</th>' + (tulis ? '<th><span class="sr">Aksi</span></th>' : '') + '</tr></thead><tbody>';
      if (!H.rows.length) html += '<tr><td colspan="' + (tgl.length + 3) + '" class="kosong">Belum ada pekerja. ' + (tulis ? 'Klik <b>Tambah pekerja</b> atau <b>Tempel daftar pekerja</b>.' : '') + '</td></tr>';
      H.rows.forEach(function (w, i) {
        var set = {}; w.hadir.forEach(function (x) { set[x] = 1; });
        var dis = tulis ? '' : ' disabled';
        var lainSet = {}; (konf[w.nik] || []).forEach(function (k) { lainSet[k.tanggal] = k.poktan + ' (' + k.id_poktan + ')'; });
        d.pekerja.forEach(function (o) { if (o.jenis !== J && o.nik === w.nik) o.hadir.forEach(function (x) { lainSet[x] = HOK.JENIS[o.jenis].label.toLowerCase() + ' poktan ini'; }); });
        html += '<tr class="' + (errRow[i] ? 'salah' : '') + '"><td class="kiri"><input data-i="' + i + '" data-k="nama" type="text" value="' + e(w.nama) + '" placeholder="Nama lengkap sesuai KTP" aria-label="Nama pekerja ' + (i + 1) + '"' + dis + '>' +
          '<div class="dua"><input data-i="' + i + '" data-k="nik" type="text" inputmode="numeric" maxlength="20" class="mono" value="' + e(w.nik) + '" placeholder="NIK 16 digit" aria-label="NIK pekerja ' + (i + 1) + '"' + dis + '><input data-i="' + i + '" data-k="alamat" type="text" value="' + e(w.alamat) + '" placeholder="Alamat / desa" aria-label="Alamat pekerja ' + (i + 1) + '"' + dis + '></div>' +
          (errRow[i] ? '<div class="pesan-baris">' + e(errRow[i].join('; ')) + '</div>' : '') + (warnRow[i] ? '<div class="pesan-baris w">' + e(warnRow[i].join('; ')) + '</div>' : '') + '</td>' +
          tgl.map(function (t) {
            var on = !!set[t], bentrok = errTgl[i + '|' + t], lain = lainSet[t];
            return '<td><button type="button" class="sel' + (bentrok ? ' bentrok' : '') + (!on && lain ? ' bentrok-lain' : '') + '" data-i="' + i + '" data-t="' + t + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Hadir' : 'Tidak hadir') + ' ' + U.tgl(t) + '"' + (lain ? ' title="Hadir di ' + e(lain) + '"' : '') + dis + '>' + (on ? '1' : '') + '</button></td>';
          }).join('') + '<td class="num"><b>' + w.hadir.length + '</b></td>' + (tulis ? '<td><button type="button" class="btn kecil bahaya" data-hapus="' + i + '" aria-label="Hapus pekerja ' + (i + 1) + '">Hapus</button></td>' : '') + '</tr>';
      });
      html += '</tbody>';
      $('#tbl-hadir').innerHTML = html;
      ringkasHadir(v);
      if (!tulis) return;
      $$('#tbl-hadir .sel').forEach(function (b) { b.onclick = function () { var w = H.rows[+b.dataset.i], t = b.dataset.t, k = w.hadir.indexOf(t); if (k >= 0) w.hadir.splice(k, 1); else { w.hadir.push(t); w.hadir.sort(); } ubah(); gambarHadir(); }; });
      $$('#tbl-hadir button.kol').forEach(function (b) {
        b.onclick = function () {
          var t = b.dataset.tgl, semua = H.rows.length && H.rows.every(function (w) { return w.hadir.indexOf(t) >= 0; });
          H.rows.forEach(function (w) { var k = w.hadir.indexOf(t); if (semua && k >= 0) w.hadir.splice(k, 1); if (!semua && k < 0) { w.hadir.push(t); w.hadir.sort(); } });
          ubah(); gambarHadir();
        };
      });
      $$('#tbl-hadir input').forEach(function (inp) {
        inp.oninput = function () { H.rows[+inp.dataset.i][inp.dataset.k] = inp.dataset.k === 'nik' ? inp.value.replace(/\s+/g, '') : inp.value; ubah(); ringkasHadir(validasi()); };
        inp.onchange = function () { gambarHadir(); };
      });
      $$('#tbl-hadir [data-hapus]').forEach(function (b) {
        b.onclick = function () { var w = H.rows[+b.dataset.hapus]; if ((w.nama || w.hadir.length) && !confirm('Hapus ' + (w.nama || 'pekerja ini') + ' beserta ' + w.hadir.length + ' hari kehadirannya?')) return; H.rows.splice(+b.dataset.hapus, 1); ubah(); gambarHadir(); };
      });
    }

    function ringkasHadir(v) {
      var t = v.total, tH = v.tHOK || p.hit.per[J].tHOK;
      $('#sum-hok').textContent = U.angka(t); $('#sum-target').textContent = '/ ' + U.angka(tH) + ' HOK';
      $('#sum-bar').style.width = Math.min(100, tH ? t / tH * 100 : 0) + '%'; $('#sum-bar').style.background = t > tH ? 'var(--crit)' : '';
      $('#sum-sisa').textContent = U.angka(tH - t); $('#sum-rp').textContent = U.rp(t * p.hit.upah); $('#sum-pek').textContent = H.rows.length + ' orang';
      var cek = function (okk, judul, ket, w) { return '<div class="cek"><span class="i ' + (okk ? 'ok' : (w ? 'w' : 'no')) + '">' + (okk ? '✓' : '!') + '</span><div><b>' + judul + '</b><div class="kecil muted">' + ket + '</div></div></div>'; };
      var err = v.errors, ada = function (re) { return err.filter(function (x) { return re.test(x.pesan); }).length; };
      var nNik = err.filter(function (x) { return x.field === 'nik'; }).length, wNik = v.peringatan.filter(function (x) { return x.field === 'nik'; }).length, wGanda = v.peringatan.filter(function (x) { return x.bentrok; }).length;
      $('#cek-list').innerHTML =
        cek(!ada(/luar masa/), 'Tanggal dalam masa ' + lblJ, U.rentang(awalH, akhirH)) +
        cek(t <= tH, 'HOK ' + lblJ + ' tidak melebihi target', U.angka(t) + ' dari ' + U.angka(tH) + ' HOK (' + p.hit.hok[J] + ' HOK/ha)') +
        cek(!nNik && !wNik, 'NIK 16 digit dan tidak ganda', nNik ? nNik + ' isian bermasalah' : (wNik ? wNik + ' peringatan struktur NIK' : 'semua NIK valid'), !nNik) +
        cek(!ada(/sudah tercatat hadir/) && !wGanda, 'Tidak ada hari ganda', ada(/sudah tercatat hadir/) ? ada(/sudah tercatat hadir/) + ' tanggal baru bentrok dengan poktan lain atau ' + HOK.JENIS[JL].label.toLowerCase() : (wGanda ? wGanda + ' tanggal lama bentrok, perlu klarifikasi' : 'dicek ulang ke seluruh kabupaten saat disimpan'), !ada(/sudah tercatat hadir/)) +
        cek(!ada(/^Nama/), 'Nama pekerja terisi', ada(/^Nama/) ? ada(/^Nama/) + ' baris tanpa nama' : 'lengkap') +
        (S.boot.setting.batas_hari_bulan ? cek(!ada(/batas/), 'Hari kerja per bulan', 'batas ' + S.boot.setting.batas_hari_bulan + ' hari per NIK') : '');
      $('#hadir-galat').innerHTML = err.length ? '<div class="galat">' + err.length + ' isian perlu diperbaiki sebelum disimpan.</div>' : '';
    }

    function dialogTempel() {
      U.dialog('<h2>Tempel daftar pekerja</h2><p class="kecil muted">Salin dari Excel: satu baris per pekerja dengan kolom <b>Nama ⇥ NIK ⇥ Alamat</b>. NIK yang sudah ada di daftar dilewati.</p>' +
        '<textarea id="tempel-isi" placeholder="Sukarman&#9;3402011505850011&#9;Selopamioro"></textarea><div class="baris"><button class="btn utama" id="tempel-ok">Tambahkan</button></div>', function (dl) {
        $('#tempel-ok', dl).onclick = function () {
          var ada = {}, n = 0; H.rows.forEach(function (w) { ada[w.nik] = 1; });
          $('#tempel-isi', dl).value.split(/\r?\n/).forEach(function (l) {
            var c = l.split(/\t|;/).map(function (x) { return x.trim(); });
            if (!c[0]) return;
            var nik = (c[1] || '').replace(/\D/g, '');
            if (nik && ada[nik]) return;
            H.rows.push({ id: '', nama: c[0], nik: nik, alamat: c[2] || '', hadir: [] }); ada[nik] = 1; n++;
          });
          U.tutupDialog(); ubah(); gambarHadir(); U.toast(n + ' pekerja ditambahkan. Tandai kehadirannya lalu simpan.');
        };
      });
    }

    function simpanHadir() {
      var v = validasi();
      if (v.errors.length) { U.toast('Perbaiki ' + v.errors.length + ' isian bertanda merah dulu', true); var el = $('#tbl-hadir tr.salah'); if (el) el.scrollIntoView({ block: 'center' }); return; }
      var btn = $('#btn-simpan-hadir'); btn.disabled = true; btn.textContent = 'Menyimpan dan memeriksa…';
      API.panggil('pekerja.simpan', { id_poktan: p.id, jenis: J, rows: H.rows, versi: (d.versiPekerja || {})[J] }).then(function (r) {
        btn.disabled = false; btn.textContent = 'Simpan kehadiran ' + lblJ;
        if (!r.ok && r.kode === 'BENTROK') { dialogBentrok(r, p.id, 'hadir'); return; }
        if (!r.ok) {
          if (r.rincian && r.rincian.errors) { H.serverErr = r.rincian.errors; gambarHadir(); }
          $('#hadir-galat').innerHTML = galat(r); U.toast(r.pesan, true); return;
        }
        S.kotor = false;
        U.toast('Kehadiran ' + lblJ + ' tersimpan: ' + r.data.total + ' HOK (' + r.data.berubah + ' baris berubah' + (r.data.dihapus ? ', ' + r.data.dihapus + ' dihapus' : '') + ')');
        var hal = H.hal;
        pastikanBoot(true).then(function () { return muatDetail(p.id, true); }).then(function () { S.hadir = null; viewPoktan(p.id, 'hadir'); if (S.hadir) { S.hadir.hal = hal; } });
      });
    }
  }

  // perubahan bentrok dengan operator lain: tawarkan muat ulang
  function dialogBentrok(r, id, tab) {
    U.dialog('<h2>Data sudah diubah orang lain</h2><div class="galat">' + e(r.pesan) + '</div>' +
      '<p class="kecil muted" style="margin:10px 0">Perubahan Anda di layar ini <b>belum tersimpan</b>. Setelah dimuat ulang, isian terbaru dari rekan Anda tampil; ulangi perubahan Anda di atasnya lalu simpan lagi. ' +
      'Bila perlu, pilih "Tetap di halaman ini" untuk mencatat dulu isian Anda.</p>' +
      '<div class="baris"><button class="btn utama" id="bentrok-muat">Muat ulang data terbaru</button><button class="btn" id="bentrok-tetap">Tetap di halaman ini</button></div>', function (dl) {
      $('#bentrok-tetap', dl).onclick = U.tutupDialog;
      $('#bentrok-muat', dl).onclick = function () {
        U.tutupDialog(); S.kotor = false; S.hadir = null;
        pastikanBoot(true).then(function () { return muatDetail(id, true); }).then(function (okk) { if (okk) viewPoktan(id, tab); });
      };
    });
  }

  // ------------------------------------------------------------------ dokumen & foto
  function tabDokumen(head) {
    var d = S.detail, p = d.poktan, tulis = bolehTulis(p.kab);
    render('poktan', head + '<div id="dok-isi"><div class="memuat">Membaca folder Google Drive…</div></div>', function () {
      var muat = S.berkas ? Promise.resolve({ ok: true, data: { berkas: S.berkas } }) : API.panggil('berkas.daftar', { id_poktan: p.id });
      muat.then(function (r) {
        if (!r.ok) { $('#dok-isi').innerHTML = galat(r); return; }
        S.berkas = r.data.berkas;
        gambarDok();
      });
    });

    function tombolUnggah(g, s, f, accept) {
      var st = PROSES[p.id + '|' + g + '|' + s];
      if (st) return '<span class="btn kecil" aria-busy="true" style="opacity:.75">' + st + '</span>';
      return '<label class="btn kecil">' + (f ? 'Ganti' : 'Unggah') + '<input type="file" accept="' + accept + '" data-grup="' + g + '" data-slot="' + e(s) + '"></label>';
    }

    function gambarDok() {
      if (!$('#dok-isi') || !S.detail || S.detail.poktan.id !== p.id || !S.berkas) return;
      var b = S.berkas, slot = HOK.SLOT, cari = function (g, s) { return b.filter(function (f) { return f.grup === g && f.nama.replace(/\.[a-z]+$/i, '') === s; })[0]; };
      // satu orang bisa tercatat di pengolahan dan penanaman; KTP cukup satu per NIK
      var pekUnik = [], sudah = {};
      d.pekerja.forEach(function (w) { if (!sudah[w.nik]) { sudah[w.nik] = 1; pekUnik.push(w); } });
      var niks = pekUnik.map(function (w) { return w.nik; });
      var ktpLain = b.filter(function (f) { return f.grup === 'ktp' && niks.indexOf(f.nama.slice(0, 16)) < 0; });
      var hitung = function (g, n) { return Math.min(n, slot[g] ? slot[g].filter(function (s) { return cari(g, s[0]); }).length : 0); };
      var fKtpKetua = cari('idn', 'ktp_ketua'), nikKetua = String(p.nik_ketua || '');
      var ktpPekerja = function (w) { return b.filter(function (f) { return f.grup === 'ktp' && f.nama.indexOf(w.nik + '_') === 0; })[0] || (fKtpKetua && w.nik === nikKetua ? fKtpKetua : null); };
      var nIdn = hitung('idn', slot.idn.length), nRek = hitung('rek', slot.rek.length), nGeo = hitung('geo', slot.geo.length), nTtd = hitung('ttd', slot.ttd.length), nKtp = pekUnik.filter(function (w) { return !!ktpPekerja(w); }).length;
      var total = slot.idn.length + slot.rek.length + slot.geo.length + slot.ttd.length + pekUnik.length, ada = nIdn + nRek + nGeo + nTtd + nKtp;
      var kartu = function (g, s, label) {
        var f = cari(g, s), m = f && f.meta, ket = '', salah = false;
        if (f) {
          ket = U.angka(f.ukuran / 1024) + ' KB · diunggah ' + U.tglPendek(String(f.dibuat).slice(0, 10));
          if (g === 'geo') {
            if (m && m.tanggal) { var tg = m.tanggal.slice(0, 10), jg = HOK.jenisW({ jenis: s.split('_')[0] }), prJ = HOK.periode(p, jg); salah = (prJ.awal && tg < prJ.awal) || (prJ.akhir && tg > prJ.akhir); ket += '<br>Diambil ' + e(m.tanggal.replace('T', ' ')) + (salah ? ' · di luar masa ' + HOK.JENIS[jg].label.toLowerCase() : ''); }
            else ket += '<br>Tanpa data tanggal di foto';
            if (m && m.lat) ket += '<br>' + m.lat + ', ' + m.lng;
          }
        }
        return '<div class="slot ' + (f ? 'ada' : 'kurang') + '"><div class="nm">' + e(label) + '</div><div class="ket' + (salah ? ' salah' : '') + '">' + (f ? ket : 'Belum ada berkas') + '</div><div class="act">' +
          (f ? '<button class="btn kecil" data-lihat="' + f.id + '">Lihat</button>' : '') +
          (tulis ? tombolUnggah(g, s, f, 'image/jpeg,image/png' + (g === 'ttd' || g === 'rek' || g === 'idn' ? ',application/pdf' : '')) : '') +
          (f && tulis ? '<button class="btn kecil bahaya" data-hapus-f="' + f.id + '">Hapus</button>' : '') + '</div></div>';
      };
      $('#dok-isi').innerHTML =
        '<section class="panel"><div class="panel-h"><h2>Kelengkapan dokumen</h2><span class="kecil muted">Disimpan di Google Drive: HOK_Tebu_15_25_2026 / ' + e(((S.boot && S.boot.kabBy) || {})[p.kab] ? S.boot.kabBy[p.kab].provinsi : '') + ' / ' + e(p.kab) + ' / ' + e(HOK.namaFolder(p)) + '</span></div>' +
        '<div style="display:flex;gap:14px;align-items:center"><span style="font-family:var(--f-disp);font-size:40px;font-weight:600">' + Math.round(ada / total * 100) + '%</span><div style="flex:1"><div class="bar" style="height:8px"><i style="width:' + (ada / total * 100) + '%"></i></div><div class="kecil muted" style="margin-top:6px">' + ada + ' dari ' + total + ' berkas · KTP ketua & NPWP ' + nIdn + '/2 · rekening ' + nRek + '/' + slot.rek.length + ' · foto geotag ' + nGeo + '/' + slot.geo.length + ' · KTP ' + nKtp + '/' + pekUnik.length + ' · dokumen bertanda tangan ' + nTtd + '/' + slot.ttd.length + '</div></div></div>' +
        (tulis ? '<p class="kecil muted" style="margin-top:8px">Foto dikecilkan otomatis sebelum diunggah (±400 KB). Tanggal dan koordinat foto dibaca dari kamera bila tersedia. Nama berkas dibuat otomatis sesuai aturan.</p>' : '') + '</section>' +
        HOK.DAFTAR_JENIS.map(function (j) {
          var pr = HOK.periode(p, j);
          return '<section class="panel"><div class="panel-h"><h2>Foto geotag ' + HOK.JENIS[j].label.toLowerCase() + ' (0%, 50%, 100%)</h2><span class="kecil muted">' + (pr.awal ? U.rentang(pr.awal, pr.akhir) + ' · ' : '') + 'lahan yang sama, koordinat dan waktu terlihat</span></div><div class="slot-grid">' +
            slot.geo.filter(function (x) { return x[0].indexOf(j + '_') === 0; }).map(function (x) { return kartu('geo', x[0], x[1].replace(/^(Pengolahan|Penanaman) /, '')); }).join('') + '</div></section>';
        }).join('') +
        '<section class="panel"><div class="panel-h"><h2>KTP ketua & NPWP</h2><span class="kecil muted">berwarna, tidak terpotong, tidak buram, jelas terbaca</span></div><div class="slot-grid">' +
          kartu('idn', 'ktp_ketua', 'KTP ketua · ' + (p.ketua || 'nama ketua belum diisi')) +
          kartu('idn', 'npwp', 'NPWP atas nama ' + (p.npwp_an || '… (pilih di Data poktan)')) + '</div>' +
          '<p class="kecil muted" style="margin-top:8px">Bila ketua ikut bekerja dan tercatat di daftar hadir, KTP ketua otomatis dipakai juga sebagai KTP pekerja (tidak perlu unggah dua kali). NPWP boleh atas nama kelompok tani, ketua, atau pengurus lain.</p></section>' +
        '<section class="panel"><div class="panel-h"><h2>Buku rekening poktan</h2><span class="kecil muted">atas nama kelompok · halaman depan dipakai di form F12</span></div><div class="slot-grid">' + slot.rek.map(function (s) { return kartu('rek', s[0], s[1]); }).join('') + '</div></section>' +
        '<section class="panel"><div class="panel-h"><h2>KTP pekerja</h2><span class="kecil muted">dicocokkan dengan NIK di daftar hadir</span></div>' +
        (pekUnik.length ? '<div class="slot-grid">' + pekUnik.map(function (w) {
          var f = b.filter(function (x) { return x.grup === 'ktp' && x.nama.indexOf(w.nik + '_') === 0; })[0], pakaiKetua = !f && fKtpKetua && w.nik === nikKetua;
          var g = f || (pakaiKetua ? fKtpKetua : null);
          return '<div class="slot ' + (g ? 'ada' : 'kurang') + '"><div class="nm">' + e(w.nama) + (w.nik === nikKetua ? ' <span class="pill netral">ketua</span>' : '') + '</div><div class="ket mono">' + e(nikSamar(w.nik)) + '</div><div class="ket">' + (f ? 'KTP ada' : pakaiKetua ? 'Memakai KTP ketua' : 'Belum ada KTP') + '</div><div class="act">' +
            (g ? '<button class="btn kecil" data-lihat="' + g.id + '">Lihat</button>' : '') + (tulis && !pakaiKetua ? tombolUnggah('ktp', w.nik, f, 'image/jpeg,image/png') : '') +
            (f && tulis ? '<button class="btn kecil bahaya" data-hapus-f="' + f.id + '">Hapus</button>' : '') + '</div></div>';
        }).join('') + '</div>' : '<div class="kosong">Belum ada pekerja di daftar hadir.</div>') +
        (ktpLain.length ? '<div class="galat" style="margin-top:10px">' + ktpLain.length + ' berkas KTP tidak cocok dengan NIK di daftar hadir: ' + ktpLain.map(function (f) { return e(f.nama); }).join(', ') + '</div>' : '') + '</section>' +
        '<section class="panel"><div class="panel-h"><h2>Dokumen bertanda tangan (pindaian)</h2><span class="kecil muted">PDF atau foto setelah ditandatangani dan bermaterai</span></div><div class="slot-grid">' + slot.ttd.map(function (s) { return kartu('ttd', s[0], s[1]); }).join('') + '</div></section>';
      $$('#dok-isi [data-lihat]').forEach(function (bt) { bt.onclick = function () { lihatBerkas(bt.dataset.lihat); }; });
      $$('#dok-isi [data-hapus-f]').forEach(function (bt) {
        bt.onclick = function () {
          if (!confirm('Hapus berkas ini dari folder Drive? Berkas dipindahkan ke sampah Drive akun tim.')) return;
          API.panggil('berkas.hapus', { fileId: bt.dataset.hapusF }).then(function (r) { if (!r.ok) { U.toast(r.pesan, true); return; } S.berkas = r.data.berkas; gambarDok(); U.toast('Berkas dihapus'); pastikanBoot(true); });
        };
      });
      $$('#dok-isi input[type=file]').forEach(function (inp) { inp.onchange = function () { if (inp.files[0]) unggah(inp.files[0], inp.dataset.grup, inp.dataset.slot); }; });
    }

    function unggah(file, grup, slot) {
      var mime = file.type, maks = 10 * 1024 * 1024, kunci = p.id + '|' + grup + '|' + slot;
      if (['image/jpeg', 'image/png', 'application/pdf'].indexOf(mime) < 0) { U.toast('Format harus JPG, PNG atau PDF', true); return; }
      if (mime === 'application/pdf' && file.size > maks) { U.toast('PDF maksimal 10 MB', true); return; }
      if (file.size > maks * 3) { U.toast('Berkas terlalu besar (maks. 10 MB setelah dikecilkan)', true); return; }
      if (PROSES[kunci]) return;
      PROSES[kunci] = 'Menunggu…'; gambarDok();
      ANTRE.n++;
      ANTRE.p = ANTRE.p.then(function () {
        PROSES[kunci] = 'Mengunggah…'; gambarDok();
        var siap = mime === 'application/pdf'
          ? U.bacaBuffer(file).then(function (buf) { return { mime: mime, data: U.keBase64(buf), meta: null }; })
          : U.bacaBuffer(file).then(function (buf) {
            var meta = mime === 'image/jpeg' ? U.exif(buf) : null;
            return U.kompres(file).then(function (b64) { return { mime: 'image/jpeg', data: b64, meta: meta }; });
          });
        return siap.then(function (x) {
          if (x.meta) x.meta.asli = file.name.slice(0, 80);
          return API.panggil('berkas.unggah', { id_poktan: p.id, grup: grup, slot: slot, mime: x.mime, data: x.data, meta: x.meta || { asli: file.name.slice(0, 80) } });
        }).then(function (r) {
          delete PROSES[kunci];
          if (!r.ok) { U.toast(r.pesan, true); gambarDok(); return; }
          if (!r.data || !Array.isArray(r.data.berkas)) { U.toast('Jawaban server tidak lengkap; muat ulang tab ini untuk memeriksa berkas.', true); gambarDok(); return; }
          if (S.detail && S.detail.poktan.id === p.id) S.berkas = r.data.berkas;
          ANTRE.ok++; gambarDok();
        }).catch(function (er) { delete PROSES[kunci]; U.toast('Gagal mengunggah: ' + (er && er.message || er), true); gambarDok(); });
      }).then(function () {
        if (--ANTRE.n === 0) {
          if (ANTRE.ok) U.toast(ANTRE.ok + ' berkas tersimpan di Google Drive');
          ANTRE.ok = 0;
          pastikanBoot(true);
        }
      });
    }
  }

  function lihatBerkas(id) {
    U.dialog('<div class="memuat">Mengambil berkas dari Google Drive…</div>');
    API.panggil('berkas.lihat', { fileId: id }).then(function (r) {
      if (!r.ok) { U.dialog(galat(r)); return; }
      var url = U.blobURL(r.data.mime, r.data.data);
      U.dialog('<h2>' + e(r.data.nama) + '</h2>' + (r.data.mime === 'application/pdf' ? '<iframe src="' + url + '" title="' + e(r.data.nama) + '"></iframe>' : '<img src="' + url + '" alt="' + e(r.data.nama) + '">') +
        '<div class="baris"><a class="btn" href="' + url + '" download="' + e(r.data.nama) + '">Unduh</a></div>');
    });
  }

  // ------------------------------------------------------------------ cetak
  function dataForm() {
    var d = S.detail, p = d.poktan;
    return { p: p, pekerja: d.pekerja, kab: d.kabupaten, prov: d.provinsi, setting: S.boot.setting, keg: HOK.KEG[p.keg] || HOK.KEG['Perluasan Tanaman Tebu'], dok: d.dok, foto: {} };
  }
  // jenis: 'F10' foto geotag, 'F12' KTP ketua + rekening halaman depan + NPWP, 'semua' keduanya
  function ambilFoto(F, jenis) {
    jenis = jenis || 'semua';
    var muat = S.berkas ? Promise.resolve(S.berkas) : API.panggil('berkas.daftar', { id_poktan: F.p.id }).then(function (r) { S.berkas = r.ok ? r.data.berkas : []; return S.berkas; });
    return muat.then(function (b) {
      var pilih = b.filter(function (f) {
        var nm = f.nama.replace(/\.[a-z]+$/i, '');
        var semua = jenis === 'semua';
        return ((/^F10/.test(jenis) || semua) && f.grup === 'geo') ||
          ((jenis === 'F12' || semua) && (f.grup === 'idn' || (f.grup === 'rek' && nm === 'depan'))) ||
          ((jenis === 'F14' || semua) && (f.grup === 'ktp' || (f.grup === 'idn' && nm === 'ktp_ketua')));
      }).filter(function (f) { return !F.foto[f.nama.replace(/\.[a-z]+$/i, '')]; });
      if (pilih.length) U.toast('Mengambil ' + pilih.length + ' foto dari Drive…');
      // ambil paling banyak 4 berkas sekaligus agar server tidak kebanjiran permintaan
      var antre = pilih.slice(), kerja = function () {
        var f = antre.shift();
        if (!f) return Promise.resolve();
        var nm = f.nama.replace(/\.[a-z]+$/i, '');
        if (f.mime === 'application/pdf') { F.foto[nm] = { pdf: true, nama: f.nama }; return kerja(); }
        return API.panggil('berkas.lihat', { fileId: f.id }).then(function (r) { if (r.ok) F.foto[nm] = { url: U.dataURL(r.data.mime, r.data.data), meta: f.meta }; }).then(kerja);
      };
      return Promise.all([kerja(), kerja(), kerja(), kerja()]);
    }).then(function () { return F; });
  }
  function tabCetak(head) {
    var d = S.detail, p = d.poktan, val = d.validasi.filter(function (x) { return x.level === 'error'; });
    var kosong = function (kode) {
      var butuh = { F01: ['no_spk', 'tgl_spk', 'nik_ketua', 'norek'], F02: ['tgl_sptjm', 'nik_ketua'], F03: ['tgl_rukk'], F05a: ['mulai_olah', 'selesai_olah'], F05b: ['mulai_tanam', 'selesai'], F09a: ['tgl_tt'], F09b: ['tgl_tt'], F06: ['tgl_lap'], F07: ['no_bap', 'tgl_bap'], F08: ['no_bast', 'tgl_bast', 'no_bap'], F09: ['tgl_tt'], F11: ['no_kw', 'tgl_kw'] }[kode] || [];
      return butuh.filter(function (k) { return !String(p[k] || '').trim(); });
    };
    var namaF = {}; FIELD.forEach(function (s) { s[1].forEach(function (f) { namaF[f[0]] = f[1]; }); });
    render('poktan', head + (val.length ? '<div class="galat">Data poktan masih memiliki ' + val.length + ' kesalahan. Perbaiki di tab Data poktan sebelum mencetak dokumen resmi.</div>' : '') +
      '<section class="panel"><div class="panel-h"><h2>Form siap cetak (A4)</h2><div class="baris"><button class="btn utama" id="cetak-semua">Cetak paket lengkap F00–F14</button>' +
      '<button class="btn" id="word-semua">Unduh semua Word (.zip)</button><button class="btn" id="excel-semua">Unduh semua Excel (.xlsx)</button></div></div>' +
      '<p class="kecil muted" style="margin-bottom:10px"><b>Cetak</b>: pilih printer atau <b>Simpan sebagai PDF</b>. <b>Word</b> dan <b>Excel</b>: berkas mengikuti template resmi dan bisa disunting sebelum dicetak. Isian yang belum ada tampil sebagai titik-titik.</p>' +
      '<div class="tbl-wrap"><table class="t"><tbody>' + FORM.DAFTAR.map(function (f) {
        var k = kosong(f[0]);
        return '<tr><td class="mono" style="width:60px">' + f[0] + '</td><td><b>' + f[1] + '</b>' + (k.length ? '<div class="kecil" style="color:var(--warn)">Belum diisi: ' + k.map(function (x) { return namaF[x] || x; }).join(', ') + '</div>' : '') + '</td><td style="width:220px;white-space:nowrap"><button class="btn kecil" data-cetak="' + f[0] + '">Cetak</button> ' +
          (EKSPOR.WORD[f[0]] ? '<button class="btn kecil" data-word="' + f[0] + '">Word</button>' : '') + (EKSPOR.EXCEL[f[0]] ? '<button class="btn kecil" data-excel="' + f[0] + '">Excel</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>', function () {
      var cetak = function (kode) {
        var F = dataForm();
        var siap = (/^F1[024]/.test(kode) || kode === 'semua') ? ambilFoto(F, kode) : Promise.resolve(F);
        siap.then(function (F) {
          var html = kode === 'semua' ? FORM.DAFTAR.map(function (f) { return f[2](F); }).join('') : FORM.F[kode](F);
          FORM.cetakHTML(html, (kode === 'semua' ? 'Paket_HOK' : kode) + '_' + p.id);
        });
      };
      $$('[data-cetak]').forEach(function (bt) { bt.onclick = function () { cetak(bt.dataset.cetak); }; });
      $('#cetak-semua').onclick = function () { cetak('semua'); };
      var proses = function (bt, kerja) {
        var label = bt.textContent; bt.disabled = true; bt.textContent = 'Menyiapkan…';
        kerja().then(function () { U.toast('Berkas diunduh'); }, function (er) { U.toast('Gagal membuat berkas: ' + (er && er.message || er), true); })
          .then(function () { bt.disabled = false; bt.textContent = label; });
      };
      $$('[data-word]').forEach(function (bt) { bt.onclick = function () { proses(bt, function () { var F = dataForm(); return (/^F1[024]/.test(bt.dataset.word) ? ambilFoto(F, bt.dataset.word) : Promise.resolve(F)).then(function (F) { return EKSPOR.word(bt.dataset.word, F); }); }); }; });
      $$('[data-excel]').forEach(function (bt) { bt.onclick = function () { proses(bt, function () { return EKSPOR.excel([bt.dataset.excel], dataForm()); }); }; });
      $('#word-semua').onclick = function () { var bt = this; proses(bt, function () { return ambilFoto(dataForm()).then(EKSPOR.wordSemua); }); };
      $('#excel-semua').onclick = function () { var bt = this; proses(bt, function () { return EKSPOR.excel(['F00', 'F03', 'F05a', 'F05b', 'F06', 'F07', 'F09a', 'F09b'], dataForm()); }); };
    });
  }

  function tabTemuan(head) {
    var d = S.detail;
    var w = d.validasi.filter(function (x) { return x.level !== 'error'; });
    render('poktan', head + '<section class="panel"><div class="panel-h"><h2>Temuan validasi poktan ini</h2></div>' +
      (d.temuan.length ? tabelTemuan(d.temuan, false) : '<div class="kosong">Tidak ada temuan.</div>') + '</section>' +
      (w.length ? '<section class="panel"><h2 style="margin-bottom:8px">Peringatan</h2><ul>' + w.map(function (x) { return '<li>' + e(x.pesan) + '</li>'; }).join('') + '</ul></section>' : ''));
  }

  function tabelTemuan(list, denganPoktan) {
    return '<div class="tbl-wrap"><table class="t"><thead><tr><th>Tingkat</th>' + (denganPoktan ? '<th>Kabupaten</th><th>Kelompok tani</th>' : '') + '<th>Objek</th><th>Nama · NIK</th><th>Jenis</th><th>Temuan</th><th class="r">Potensi lebih bayar</th></tr></thead><tbody>' +
      list.map(function (t) {
        return '<tr><td><span class="pill ' + (t.level === 'error' ? 'crit' : 'warn') + '">' + (t.level === 'error' ? 'Kesalahan' : 'Peringatan') + '</span></td>' +
          (denganPoktan ? '<td>' + e(t.kab) + '</td><td><a href="#/poktan/' + encodeURIComponent(t.id_poktan) + '">' + e(t.poktan) + '</a><div class="kecil mono muted">' + e(t.id_poktan) + '</div></td>' : '') +
          '<td>' + e(t.objek) + '</td><td>' + e(t.nama || '–') + '<div class="kecil mono muted">' + e(nikSamar(t.nik)) + '</div></td><td>' + e(t.jenis) + '</td><td>' + e(t.pesan) + '</td><td class="r num" style="font-weight:700;color:' + (t.rp ? 'var(--crit)' : 'inherit') + '">' + (t.rp ? U.rp(t.rp) : '–') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  // ------------------------------------------------------------------ temuan (semua)
  function viewTemuan() {
    var b = S.boot, f = S.temFilter, kabs = b.kabupaten.map(function (k) { return k.kab; });
    var jenis = {}; b.temuan.forEach(function (t) { jenis[t.jenis] = (jenis[t.jenis] || 0) + 1; });
    render('temuan', '<div class="judul"><div><h1>Temuan validasi</h1><p>Temuan bersifat indikatif untuk klarifikasi, bukan kesimpulan audit. Data yang disimpan lewat aplikasi sudah divalidasi; temuan muncul dari data impor atau dari perubahan di poktan lain.</p></div><div class="baris"><button class="btn" id="tem-unduh">Unduh Excel</button></div></div>' +
      '<div class="filter">' + (kabs.length > 1 ? '<select id="t-kab"><option value="">Semua kabupaten</option>' + kabs.map(function (k) { return '<option' + (k === f.kab ? ' selected' : '') + '>' + e(k) + '</option>'; }).join('') + '</select>' : '') +
      '<select id="t-jenis"><option value="">Semua jenis (' + b.temuan.length + ')</option>' + Object.keys(jenis).sort().map(function (j) { return '<option value="' + e(j) + '"' + (j === f.jenis ? ' selected' : '') + '>' + e(j) + ' (' + jenis[j] + ')</option>'; }).join('') + '</select>' +
      '<input id="t-q" type="search" placeholder="Cari poktan, nama, NIK…" value="' + e(f.q) + '"></div><div id="t-isi"></div>', function () {
      var isi = function () {
        var q = f.q.toLowerCase();
        var rows = b.temuan.filter(function (t) { return (!f.kab || t.kab === f.kab) && (!f.jenis || t.jenis === f.jenis) && (!q || [t.poktan, t.id_poktan, t.nama, t.nik, t.pesan].join(' ').toLowerCase().indexOf(q) >= 0); })
          .sort(function (a, c) { return (c.rp - a.rp) || (a.level === c.level ? 0 : a.level === 'error' ? -1 : 1); });
        $('#t-isi').innerHTML = rows.length ? tabelTemuan(rows, true) : '<div class="panel kosong">Tidak ada temuan untuk saringan ini.</div>';
      };
      if ($('#t-kab')) $('#t-kab').onchange = function () { f.kab = this.value; isi(); };
      $('#t-jenis').onchange = function () { f.jenis = this.value; isi(); };
      $('#t-q').oninput = function () { f.q = this.value; isi(); };
      $('#tem-unduh').onclick = function () { U.unduhXlsx('Temuan_HOK_' + b.hariIni + '.xlsx', [{ nama: 'Temuan', rows: b.temuan.map(function (t) { return { Kabupaten: t.kab, ID: t.id_poktan, 'Kelompok tani': t.poktan, Objek: t.objek, Nama: t.nama, NIK: t.nik, Jenis: t.jenis, Tingkat: t.level, Temuan: t.pesan, 'Potensi (Rp)': t.rp }; }) }]); };
      isi();
    });
  }

  // ------------------------------------------------------------------ pengaturan
  var FIELD_KAB = [['ppk', 'Nama PPK'], ['nip_ppk', 'NIP PPK'], ['unit', 'Unit kerja PPK'], ['penetap', 'Pejabat penetap SK PPK'], ['sk_ppk', 'Nomor SK PPK'], ['kedudukan', 'Kedudukan PPK'],
    ['bendahara', 'Bendahara pengeluaran'], ['nip_bendahara', 'NIP bendahara'], ['tim_teknis', 'Tim teknis kabupaten'], ['nip_tim_teknis', 'NIP tim teknis']];
  var FIELD_KAB_PUSAT = [['kode', 'Kode (3 huruf, untuk ID poktan)'], ['provinsi', 'Provinsi'], ['upah_pl', 'Upah/HOK khusus Perluasan'], ['upah_br', 'Upah/HOK khusus Bongkar Ratoon'], ['target_luas', 'Target luas kabupaten (ha)']];

  function viewPengaturan() {
    var b = S.boot, u = b.user, st = b.setting;
    var kabPilih = u.peran === 'kabupaten' ? u.kab : (S.kabPengaturan || b.kabupaten[0].kab);
    var formKab = function (kabNama) {
      var k = b.kabBy[kabNama] || { kab: kabNama }, tulis = bolehTulis(kabNama), fields = FIELD_KAB.concat(u.peran === 'pusat' ? FIELD_KAB_PUSAT : []);
      return '<form id="f-kab" class="form-grid">' + fields.map(function (f) {
        if (f[0] === 'provinsi') return '<div class="fld"><label for="k-provinsi">' + f[1] + '</label><select id="k-provinsi" name="provinsi"' + (tulis ? '' : ' disabled') + '>' + b.provinsi.map(function (p) { return '<option' + (p.provinsi === k.provinsi ? ' selected' : '') + '>' + e(p.provinsi) + '</option>'; }).join('') + '</select></div>';
        return '<div class="fld"><label for="k-' + f[0] + '">' + f[1] + '</label><input id="k-' + f[0] + '" name="' + f[0] + '" type="text" value="' + e(k[f[0]] || '') + '"' + (tulis ? '' : ' disabled') + '></div>';
      }).join('') + '</form>' + (tulis ? '<div class="baris" style="margin-top:12px"><button class="btn utama" id="simpan-kab" type="button">Simpan data kabupaten</button></div>' : '');
    };
    var isi = '<div class="judul"><div><h1>Pengaturan</h1><p>Data pejabat dan satuan HOK yang tercetak di SPK, BAST, kwitansi dan form lain.</p></div></div>' +
      '<section class="panel"><div class="panel-h"><h2>Data kabupaten</h2>' + (u.peran !== 'kabupaten' ? '<div class="baris"><select id="pilih-kab">' + b.kabupaten.map(function (k) { return '<option' + (k.kab === kabPilih ? ' selected' : '') + '>' + e(k.kab) + '</option>'; }).join('') + '</select>' + (u.peran === 'pusat' ? '<button class="btn kecil" id="kab-baru">Tambah kabupaten</button>' : '') + '</div>' : '') + '</div><div id="kab-form">' + formKab(kabPilih) + '</div></section>';
    isi += '<section class="panel"><div class="panel-h"><h2>Kode akses saya</h2></div><p class="kecil muted" style="margin-bottom:10px">Ganti kode akses Anda sendiri. Kode baru 8–24 karakter, campuran huruf dan angka (boleh tanda -). Kosongkan kode baru bila ingin dibuatkan kode acak. Setelah diganti, kode lama tidak berlaku dan perangkat lain yang masih masuk dengan kode lama akan keluar otomatis.</p>' +
      '<form id="f-kode" class="form-grid" autocomplete="off"><div class="fld"><label for="kd-lama">Kode akses sekarang</label><input id="kd-lama" type="password" autocomplete="off"></div>' +
      '<div class="fld"><label for="kd-baru">Kode baru (opsional)</label><input id="kd-baru" type="password" autocomplete="off" placeholder="kosongkan = dibuatkan acak"></div>' +
      '<div class="fld"><label for="kd-ulang">Ulangi kode baru</label><input id="kd-ulang" type="password" autocomplete="off"></div></form>' +
      '<div class="baris" style="margin-top:12px"><button class="btn utama" id="kd-simpan" type="button">Ganti kode akses saya</button></div></section>';
    if (u.peran === 'pusat') {
      isi += '<section class="panel"><div class="panel-h"><h2>Pengaturan umum</h2></div><form id="f-set" class="form-grid">' +
        [['tahun', 'Tahun anggaran'], ['no_dipa', 'Nomor DIPA'], ['tgl_dipa', 'Tanggal DIPA', 'date'], ['kpa', 'Pemberi dana (kwitansi)'], ['hokha_olah', 'HOK/ha pengolahan lahan (bawaan 15)'], ['hokha_tanam', 'HOK/ha penanaman (bawaan 25)'], ['batas_hari_bulan', 'Batas hari kerja per pekerja per bulan (kosong = tidak dibatasi)'], ['unit_pusat', 'Unit pengelola']].map(function (f) {
          return '<div class="fld"><label for="s-' + f[0] + '">' + f[1] + '</label><input id="s-' + f[0] + '" name="' + f[0] + '" type="' + (f[2] || 'text') + '" value="' + e(st[f[0]] || '') + '"></div>';
        }).join('') + '</form>' +
        '<h3 style="margin:16px 0 8px">Standar upah HOK per provinsi (Rp/HOK)</h3><div class="tbl-wrap"><table class="t"><thead><tr><th>Provinsi</th><th>Kode</th><th>Perluasan</th><th>Bongkar Ratoon</th></tr></thead><tbody>' +
        b.provinsi.map(function (p, i) { return '<tr><td>' + e(p.provinsi) + '</td><td><input data-pv="' + i + '" data-k="kode" value="' + e(p.kode) + '" style="width:90px"></td><td><input data-pv="' + i + '" data-k="upah_pl" value="' + e(p.upah_pl) + '" inputmode="numeric"></td><td><input data-pv="' + i + '" data-k="upah_br" value="' + e(p.upah_br) + '" inputmode="numeric"></td></tr>'; }).join('') +
        '</tbody></table></div><div class="baris" style="margin-top:12px"><button class="btn utama" id="simpan-set">Simpan pengaturan umum</button></div></section>' +
        '<section class="panel"><div class="panel-h"><h2>Pengguna dan kode akses</h2></div><div id="peng-isi"><div class="memuat">Memuat…</div></div></section>';
    }
    render('pengaturan', isi, function () {
      var pasangKab = function () {
        var bt = $('#simpan-kab');
        if (!bt) return;
        bt.onclick = function () {
          var data = { kab: kabPilih };
          $$('#f-kab input, #f-kab select').forEach(function (x) { data[x.name] = x.value.trim(); });
          API.panggil('kab.simpan', { data: data }).then(function (r) { if (!r.ok) { U.toast(r.pesan, true); return; } U.toast('Data kabupaten ' + kabPilih + ' tersimpan'); pastikanBoot(true).then(viewPengaturan); });
        };
      };
      pasangKab();
      $('#kd-simpan').onclick = function () {
        var lama = $('#kd-lama').value.trim(), baru = $('#kd-baru').value.trim(), ulang = $('#kd-ulang').value.trim();
        if (!lama) { U.toast('Isi kode akses sekarang', true); return; }
        if (baru !== ulang) { U.toast('Ulangan kode baru tidak sama', true); return; }
        API.panggil('akun.gantikode', { kode_lama: lama, kode_baru: baru }).then(function (r) {
          if (!r.ok) { U.toast(r.pesan, true); return; }
          $('#f-kode').reset();
          tampilKode('Kode akses Anda sudah diganti', 'Mulai sekarang masuk dengan kode ini. Kode lama tidak berlaku lagi.', r.data.kode);
        });
      };
      if ($('#pilih-kab')) $('#pilih-kab').onchange = function () { S.kabPengaturan = kabPilih = this.value; $('#kab-form').innerHTML = formKab(kabPilih); pasangKab(); };
      if ($('#kab-baru')) $('#kab-baru').onclick = function () {
        U.dialog('<h2>Tambah kabupaten</h2><div class="form-grid"><div class="fld"><label for="nk-kab">Nama kabupaten</label><input id="nk-kab" type="text"></div><div class="fld"><label for="nk-kode">Kode 3 huruf</label><input id="nk-kode" type="text" maxlength="4"></div>' +
          '<div class="fld"><label for="nk-prov">Provinsi</label><select id="nk-prov">' + b.provinsi.map(function (p) { return '<option>' + e(p.provinsi) + '</option>'; }).join('') + '</select></div></div><div class="baris"><button class="btn utama" id="nk-ok">Simpan</button></div>', function (dl) {
          $('#nk-ok', dl).onclick = function () {
            var data = { kab: $('#nk-kab', dl).value.trim(), kode: $('#nk-kode', dl).value.trim().toUpperCase(), provinsi: $('#nk-prov', dl).value };
            if (!data.kab || !data.kode) { U.toast('Isi nama dan kode kabupaten', true); return; }
            API.panggil('kab.simpan', { data: data }).then(function (r) { if (!r.ok) { U.toast(r.pesan, true); return; } U.tutupDialog(); S.kabPengaturan = data.kab; U.toast('Kabupaten ' + data.kab + ' ditambahkan'); pastikanBoot(true).then(viewPengaturan); });
          };
        });
      };
      if (u.peran !== 'pusat') return;
      $('#simpan-set').onclick = function () {
        var s = {}; $$('#f-set input').forEach(function (x) { s[x.name] = x.value.trim(); });
        var prov = b.provinsi.map(function (p) { return Object.assign({}, p); });
        $$('[data-pv]').forEach(function (x) { prov[+x.dataset.pv][x.dataset.k] = x.value.trim(); });
        API.panggil('setting.simpan', { setting: s, provinsi: prov }).then(function (r) { if (!r.ok) { U.toast(r.pesan, true); return; } U.toast('Pengaturan tersimpan'); pastikanBoot(true).then(viewPengaturan); });
      };
      muatPengguna();
    });
  }

  function tampilKode(judul, ket, kode) {
    U.dialog('<h2>' + e(judul) + '</h2><p>' + ket + '</p><p class="mono" style="font-size:24px;font-weight:700;letter-spacing:2px;user-select:all">' + e(kode) + '</p><p class="kecil muted">Catat dan simpan secara pribadi. Kode ini tidak akan ditampilkan lagi.</p>');
  }

  function dialogGantiKode(x) {
    U.dialog('<h2>Ganti kode akses</h2><p>Untuk <b>' + e(x.nama) + '</b> (' + e(x.peran) + ', ' + e(x.kab || x.provinsi || 'semua wilayah') + '). Kode lama langsung tidak berlaku dan sesi pengguna ini berakhir.</p>' +
      '<div class="fld"><label for="gk-kode">Kode baru (opsional)</label><input id="gk-kode" type="text" autocomplete="off" spellcheck="false" placeholder="kosongkan = dibuatkan acak"><span class="bantu">8–24 karakter, campuran huruf dan angka, boleh tanda -</span></div>' +
      '<div class="baris" style="margin-top:12px"><button class="btn utama" id="gk-ok">Ganti kode</button></div>', function (dl) {
      $('#gk-ok', dl).onclick = function () {
        API.panggil('pengguna.gantikode', { id: x.id, kode: $('#gk-kode', dl).value.trim() }).then(function (r) {
          if (!r.ok) { U.toast(r.pesan, true); return; }
          U.tutupDialog();
          tampilKode('Kode akses baru', 'Untuk <b>' + e(x.nama) + '</b>. Kirim secara pribadi.', r.data.kode);
          muatPengguna();
        });
      };
    });
  }

  function muatPengguna() {
    var b = S.boot;
    API.panggil('pengguna.daftar').then(function (r) {
      if (!r.ok) { $('#peng-isi').innerHTML = galat(r); return; }
      $('#peng-isi').innerHTML = '<p class="kecil muted" style="margin-bottom:10px">Kode akses hanya ditampilkan sekali. Bila kode hilang atau bocor, klik <b>Ganti kode</b>: kode lama langsung tidak berlaku dan sesinya berakhir.</p>' +
        '<div class="tbl-wrap"><table class="t"><thead><tr><th>Nama</th><th>Peran</th><th>Wilayah</th><th>Dibuat</th><th>Terakhir masuk</th><th>Status</th><th></th></tr></thead><tbody>' +
        r.data.pengguna.map(function (x) {
          return '<tr><td>' + e(x.nama) + '</td><td>' + e(x.peran) + '</td><td>' + e(x.kab || x.provinsi || 'Semua') + '</td><td class="kecil">' + e(x.dibuat) + '</td><td class="kecil">' + e(x.terakhir_masuk || '–') + '</td>' +
            '<td>' + (x.aktif === 'Tidak' ? '<span class="pill netral">Nonaktif</span>' : '<span class="pill ok">Aktif</span>') + '</td><td style="white-space:nowrap"><button class="btn kecil" data-gk="' + x.id + '">Ganti kode</button> ' + (x.id !== b.user.id ? '<button class="btn kecil" data-akt="' + x.id + '" data-v="' + (x.aktif === 'Tidak' ? '1' : '') + '">' + (x.aktif === 'Tidak' ? 'Aktifkan' : 'Nonaktifkan') + '</button>' : '<span class="kecil muted">Anda</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<h3 style="margin:16px 0 8px">Buat kode akses baru</h3><div class="form-grid"><div class="fld"><label for="u-nama">Nama pengguna</label><input id="u-nama" type="text" placeholder="mis. Operator Bantul 2"></div>' +
        '<div class="fld"><label for="u-peran">Peran</label><select id="u-peran"><option value="kabupaten">Kabupaten (input)</option><option value="provinsi">Provinsi (pantau)</option><option value="pusat">Pusat (semua)</option></select></div>' +
        '<div class="fld"><label for="u-wil">Wilayah</label><select id="u-wil"></select></div></div><div class="baris" style="margin-top:12px"><button class="btn utama" id="u-buat">Buat kode akses</button></div>';
      var isiWil = function () {
        var pr = $('#u-peran').value;
        $('#u-wil').innerHTML = pr === 'kabupaten' ? b.kabupaten.map(function (k) { return '<option>' + e(k.kab) + '</option>'; }).join('') : pr === 'provinsi' ? b.provinsi.map(function (p) { return '<option>' + e(p.provinsi) + '</option>'; }).join('') : '<option>Semua</option>';
      };
      $('#u-peran').onchange = isiWil; isiWil();
      $('#u-buat').onclick = function () {
        var pr = $('#u-peran').value, w = $('#u-wil').value;
        API.panggil('pengguna.buat', { data: { nama: $('#u-nama').value.trim(), peran: pr, kab: pr === 'kabupaten' ? w : '', provinsi: pr === 'provinsi' ? w : '' } }).then(function (res) {
          if (!res.ok) { U.toast(res.pesan, true); return; }
          U.dialog('<h2>Kode akses baru</h2><p>Untuk <b>' + e(res.data.pengguna.nama) + '</b> (' + e(res.data.pengguna.peran) + ', ' + e(res.data.pengguna.kab || res.data.pengguna.provinsi || 'semua wilayah') + ')</p>' +
            '<p class="mono" style="font-size:24px;font-weight:700;letter-spacing:2px;user-select:all">' + e(res.data.kode) + '</p><p class="kecil muted">Catat dan kirim secara pribadi. Kode ini tidak akan ditampilkan lagi.</p>');
          muatPengguna();
        });
      };
      $$('[data-gk]').forEach(function (bt) { bt.onclick = function () { dialogGantiKode(r.data.pengguna.filter(function (x) { return x.id === bt.dataset.gk; })[0]); }; });
      $$('[data-akt]').forEach(function (bt) { bt.onclick = function () { API.panggil('pengguna.status', { id: bt.dataset.akt, aktif: !!bt.dataset.v }).then(function (res) { if (!res.ok) { U.toast(res.pesan, true); return; } muatPengguna(); }); }; });
    });
  }

  // ------------------------------------------------------------------ impor Excel v2
  function isoDari(v) {
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date && !isNaN(v)) { var d = new Date(v.getTime() + 12 * 3600e3); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    if (typeof v === 'number' && v > 20000 && v < 80000) return HOK.dariHari(Math.round(v) - 25569);
    var t = String(v).trim(), m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    return HOK.isISO(t) ? t : '';
  }
  function teks(v) { if (v === null || v === undefined) return ''; if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v); return String(v).trim(); }

  function bacaExcelV2(wb) {
    var sp = wb.Sheets.DB_POKTAN, sh = wb.Sheets.DB_HADIR;
    if (!sp || !sh) throw new Error('Sheet DB_POKTAN dan DB_HADIR tidak ditemukan. Gunakan file Tool HOK v2.');
    var rp = XLSX.utils.sheet_to_json(sp, { header: 1, raw: true, defval: null }).slice(5);
    var rh = XLSX.utils.sheet_to_json(sh, { header: 1, raw: true, defval: null }).slice(5);
    var C = { id: 0, keg: 1, kab: 2, poktan: 4, ketua: 5, nik_ketua: 6, jalan: 7, desa: 8, kec: 9, bank: 10, norek: 11, namarek: 12, npwp: 13, luas: 14, hokha_khusus: 15, upah_khusus: 16,
      no_cpcl: 21, tgl_cpcl: 22, no_spk: 23, tgl_spk: 24, tempat_spk: 25, jalan_spk: 26, spk_sd: 27, tgl_sptjm: 28, tgl_rukk: 29, mulai: 30, selesai: 31, tgl_lap: 32, no_bap: 33, tgl_bap: 34,
      no_bast: 35, tgl_bast: 36, no_kw: 37, tgl_kw: 38, tgl_tt: 39, real_luas: 40 };
    var poktan = [], mulai = {}, kabHit = {};
    rp.forEach(function (r) {
      if (!r || !r[C.poktan]) return;
      var o = {};
      Object.keys(C).forEach(function (k) { var v = r[C[k]]; o[k] = HOK.FIELD_TANGGAL.indexOf(k) >= 0 ? isoDari(v) : teks(v); });
      poktan.push(o); mulai[o.id] = o.mulai; kabHit[o.kab] = (kabHit[o.kab] || 0) + 1;
    });
    var pekerja = [];
    rh.forEach(function (r) {
      if (!r || !r[0] || !r[1]) return;
      var id = teks(r[0]), m = mulai[id], hd = [];
      if (m) for (var i = 0; i < 90; i++) { var v = r[11 + i]; if (v !== null && v !== '' && HOK.num(v) === 1) hd.push(U.tambahHari(m, i)); }
      pekerja.push({ id_poktan: id, nama: teks(r[1]), nik: typeof r[2] === 'number' ? String(Math.round(r[2])) : teks(r[2]), alamat: teks(r[3]), hadir: hd });
    });
    var kab = Object.keys(kabHit).sort(function (a, b) { return kabHit[b] - kabHit[a]; })[0] || '';
    return { poktan: poktan, pekerja: pekerja, kab: kab };
  }

  function dialogImpor() {
    var b = S.boot, u = b.user;
    U.dialog('<h2>Impor dari Tool HOK Excel v2</h2><p class="kecil muted">Membaca sheet DB_POKTAN dan DB_HADIR. Poktan dengan ID yang sama (P001, P002, …) akan diperbarui, dan daftar pekerjanya diganti dengan isi file. Data impor tidak ditolak; kesalahan muncul di menu Temuan.</p>' +
      '<input type="file" id="imp-file" accept=".xlsx,.xlsm"><div id="imp-hasil"></div>', function (dl) {
      $('#imp-file', dl).onchange = function () {
        var f = this.files[0]; if (!f) return;
        if (typeof XLSX === 'undefined') { $('#imp-hasil', dl).innerHTML = '<div class="galat">Pustaka Excel belum termuat. Periksa koneksi internet lalu muat ulang halaman.</div>'; return; }
        $('#imp-hasil', dl).innerHTML = '<div class="memuat">Membaca file…</div>';
        U.bacaBuffer(f).then(function (buf) {
          var x = bacaExcelV2(XLSX.read(buf, { type: 'array', cellDates: true }));
          var kabTujuan = u.peran === 'kabupaten' ? u.kab : (b.kabBy[x.kab] ? x.kab : b.kabupaten[0].kab);
          var hok = x.pekerja.reduce(function (s, w) { return s + w.hadir.length; }, 0);
          $('#imp-hasil', dl).innerHTML = '<div class="info">Ditemukan <b>' + x.poktan.length + ' poktan</b> dan <b>' + x.pekerja.length + ' pekerja</b> (' + U.angka(hok) + ' HOK). Kabupaten di file: <b>' + e(x.kab || '–') + '</b>.</div>' +
            (u.peran === 'kabupaten' && x.kab && x.kab !== u.kab ? '<div class="galat">Kabupaten di file (' + e(x.kab) + ') berbeda dengan akun Anda (' + e(u.kab) + '). Data akan masuk ke ' + e(u.kab) + '.</div>' : '') +
            '<div class="fld"><label for="imp-kab">Masukkan ke kabupaten</label><select id="imp-kab"' + (u.peran === 'kabupaten' ? ' disabled' : '') + '>' + b.kabupaten.map(function (k) { return '<option' + (k.kab === kabTujuan ? ' selected' : '') + '>' + e(k.kab) + '</option>'; }).join('') + '</select></div>' +
            '<div id="imp-timpa" class="kecil"></div><div class="baris"><button class="btn utama" id="imp-ok">Impor sekarang</button></div>';
          var timpa = function () {
            var k = b.kabBy[$('#imp-kab', dl).value], ada = x.poktan.filter(function (q) { return b.poktanBy[k.kode + '-' + HOK.idLokal(q.id)]; }).length;
            $('#imp-timpa', dl).innerHTML = ada ? '<div class="galat">' + ada + ' poktan dengan ID yang sama sudah ada di ' + e(k.kab) + ' dan akan diperbarui dengan isian dari file (isian kosong di file tidak menghapus data). Poktan yang punya baris pekerja di file akan diganti daftar pekerjanya.</div>' : '<div class="info">Semua poktan di file akan ditambahkan sebagai poktan baru.</div>';
          };
          $('#imp-kab', dl).onchange = timpa; timpa();
          $('#imp-ok', dl).onclick = function () {
            var btn = this; btn.disabled = true; btn.textContent = 'Mengimpor…';
            API.panggil('impor', { kab: $('#imp-kab', dl).value, poktan: x.poktan, pekerja: x.pekerja }).then(function (r) {
              if (!r.ok) { btn.disabled = false; btn.textContent = 'Impor sekarang'; $('#imp-hasil', dl).insertAdjacentHTML('beforeend', galat(r)); return; }
              U.tutupDialog(); U.toast('Impor selesai: ' + r.data.poktan + ' poktan, ' + r.data.pekerja + ' pekerja'); S.detail = null; pastikanBoot(true).then(viewPoktanList);
            });
          };
        }).catch(function (er) { $('#imp-hasil', dl).innerHTML = '<div class="galat">' + e(er.message) + '</div>'; });
      };
    });
  }
})();
