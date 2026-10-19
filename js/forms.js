/*
 * Form cetak F00–F13 (A4) mengikuti format juknis/berkas form HOK.
 * Data: { p (poktan + hit), pekerja, kab, prov, setting, keg, foto {slot: {url, meta}}, semuaPoktan }
 */
var FORM = (function () {
  'use strict';
  var e = U.esc;
  function isi(v, d) { var t = String(v === null || v === undefined ? '' : v).trim(); return t ? e(t) : (d || '……………………'); }
  function nikTampil(v) { return isi(v, '……………………'); }
  function tempatTgl(F, d) { return e(F.p.kab) + ', ' + U.tgl(d); }
  function luasTeks(v) { return U.n(v) ? U.ha(v) + ' ha' : '…… ha'; }

  // "Kelompok Tani Gandul Mulyo", atau nama lembaga apa adanya bila sudah berbentuk koperasi/kelompok/gapoktan
  function lembaga(nama) {
    var n = String(nama || '').trim();
    if (!n) return 'Kelompok Tani ……………………';
    if (/^(kelompok\s+tani|koperasi|gapoktan|kptr|kttm|kud|lembaga|kelompok)\b/i.test(n)) return n;
    if (/^kt\.?\s+/i.test(n)) return 'Kelompok Tani ' + n.replace(/^kt\.?\s+/i, '');
    return 'Kelompok Tani ' + n;
  }
  // bentuk di tengah kalimat: "kelompok tani Gandul Mulyo" / "Koperasi Tani Tebu Mandiri"
  function lembagaKalimat(nama) { var l = lembaga(nama); return /^Kelompok Tani /.test(l) ? 'kelompok tani ' + l.slice(14) : l; }
  // tanggal pelaksanaan = rentang hadir sebenarnya (sama untuk target dan realisasi)
  function tglPelaksanaan(p, j) { var h = p.hit || {}, pr = j ? HOK.periode(p, j) : { awal: p.mulai, akhir: p.selesai }; return U.rentang(h.hadirAwal || pr.awal, h.hadirAkhir || pr.akhir); }

  // salinan data form untuk satu jenis pekerjaan (olah = pengolahan lahan, tanam = penanaman):
  // pekerja, target/realisasi HOK, foto geotag dan judul jenis pekerjaan disesuaikan
  function untukJenis(F, j) {
    var p = F.p, h = p.hit || {}, pj = (h.per || {})[j] || { tHOK: 0, rHOK: 0, nPek: 0 }, JJ = HOK.JENIS[j], foto = {};
    Object.keys(F.foto || {}).forEach(function (k) { if (k.indexOf(j + '_') === 0) foto[k.slice(j.length + 1)] = F.foto[k]; else if (!/^(olah|tanam)_/.test(k)) foto[k] = F.foto[k]; });
    var hit = Object.assign({}, h, { tHOK: pj.tHOK, rHOK: pj.rHOK, tBiaya: pj.tHOK * (h.upah || 0), rBiaya: pj.rHOK * (h.upah || 0), hokha: (h.hok || {})[j], hadirAwal: pj.awal, hadirAkhir: pj.akhir, nPek: pj.nPek });
    return Object.assign({}, F, { jenis: j, p: Object.assign({}, p, { hit: hit }), pekerja: (F.pekerja || []).filter(function (w) { return w.jenis === j; }),
      keg: Object.assign({}, F.keg, { jenis: JJ.label, dok3: JJ.judul }), foto: foto });
  }
  function rincianHOK(h, kunci) { return HOK.DAFTAR_JENIS.map(function (j) { return U.angka(h.per[j][kunci]) + ' HOK ' + HOK.JENIS[j].label.toLowerCase(); }).join(' dan '); }

  function judulBlok(lines) { return lines.map(function (t, i) { return '<h' + (i === 0 ? 1 : 2) + '>' + t + '</h' + (i === 0 ? 1 : 2) + '>'; }).join(''); }
  function kv(rows) {
    return '<table class="kv">' + rows.map(function (r) { return '<tr><td class="l">' + r[0] + '</td><td class="t">:</td><td>' + r[1] + '</td></tr>'; }).join('') + '</table>';
  }
  function identitas(F, ekstra) {
    var r = [['KELOMPOK TANI', isi(F.p.poktan)], ['DESA', isi(F.p.desa)], ['KECAMATAN', isi(F.p.kec)]];
    return kv(r.concat(ekstra || []));
  }
  function kopWilayah(F, judul) {
    return judulBlok([judul, e(F.keg.judul), 'DI KABUPATEN ' + e(String(F.p.kab).toUpperCase()) + ' PROVINSI ' + e(String(F.kab.provinsi || '').toUpperCase()), 'TAHUN ANGGARAN ' + e(F.setting.tahun || '2026')]);
  }
  function ttd(kiriAtas, kiriJabatan, kiriNama, kiriNip, kananAtas, kananJabatan, kananNama, kananNip, catatanKiri, catatanKanan) {
    return '<div class="jarak"></div><table class="ttd"><tr><td>' + kiriAtas + '<br>' + kiriJabatan + '</td><td>' + kananAtas + '<br>' + kananJabatan + '</td></tr>' +
      '<tr><td><div class="ruang-ttd">' + (catatanKiri || '') + '</div></td><td><div class="ruang-ttd">' + (catatanKanan || '') + '</div></td></tr>' +
      '<tr><td><span class="tebal garis-bawah">' + kiriNama + '</span><br>' + (kiriNip || '') + '</td><td><span class="tebal garis-bawah">' + kananNama + '</span><br>' + (kananNip || '') + '</td></tr></table>';
  }
  function ttdTimKetua(F, tanggal) {
    return ttd('Mengetahui,', 'Tim Teknis Kabupaten', isi(F.kab.tim_teknis), 'NIP. ' + isi(F.kab.nip_tim_teknis),
      tempatTgl(F, tanggal), 'Ketua ' + e(lembaga(F.p.poktan)), isi(F.p.ketua), '', '', 'TTD dan stempel');
  }
  function jabatanPPK(F) {
    return 'Pejabat Pembuat Komitmen ' + isi(F.kab.unit) + ', yang diangkat berdasarkan Keputusan ' + isi(F.kab.penetap) + ' Nomor: ' + isi(F.kab.sk_ppk) +
      ' dalam hal ini bertindak untuk dan atas nama ' + isi(F.setting.kpa) + ' DIPA Tahun ' + isi(F.setting.tahun) + ' Nomor: ' + isi(F.setting.no_dipa) +
      ' tanggal ' + U.tgl(F.setting.tgl_dipa) + ', yang berkedudukan di ' + isi(F.kab.kedudukan);
  }

  // ---------------------------------------------------------------- F00
  function F00(F) {
    var h = F.p.hit, d = F.dok || {};
    var cek = function (b) { return b ? '✔' : '☐'; };
    var docs = [
      ['Surat Perjanjian Kerjasama dengan Kelompok Tani', F.p.no_spk && F.p.tgl_spk, 'Tanggal setelah DIPA dan SK CPCL'],
      ['SPTJM Kelompok Tani', F.p.tgl_sptjm, 'Materai 10.000'],
      ['Rencana Usaha Kegiatan Kelompok (RUKK)', F.p.tgl_rukk, ''],
      ['Buku rekening atas nama Kelompok Tani', (d.rek || []).length >= 3, 'Foto berwarna halaman depan dan mutasi'],
      ['Foto KTP Ketua dan NPWP Kelompok Tani / Ketua', h.dok && h.dok.idn >= 2, 'NPWP atas nama ' + (F.p.npwp_an || '…')],
      ['Daftar hadir kerja', h.per.olah.nPek > 0 && h.per.tanam.nPek > 0, 'pengolahan ' + h.per.olah.rHOK + ' HOK, penanaman ' + h.per.tanam.rHOK + ' HOK'],
      ['Laporan Hasil Pekerjaan Ketua Kelompok ke PPK', F.p.tgl_lap, ''],
      ['Berita Acara Pemeriksaan Hasil Pekerjaan oleh Tim Teknis', F.p.no_bap && F.p.tgl_bap, ''],
      ['BAST Petani ke PPK', F.p.no_bast && F.p.tgl_bast, 'Mencantumkan nominal biaya HOK'],
      ['Bukti Pembayaran Petani (tanda terima pekerja)', F.p.tgl_tt, ''],
      ['Foto/Dokumentasi Kegiatan Geotagging (sebelum, proses, sesudah)', (d.geo || []).length >= HOK.SLOT.geo.length, 'pengolahan lahan dan penanaman, masing-masing 0%, 50%, 100%'],
      ['Kwitansi Pembayaran ke Petani', F.p.tgl_kw, ''],
      ['Foto KTP Petani Pekerja', h.dok && h.dok.ktp >= h.nPek && h.nPek > 0, (h.dok ? h.dok.ktp : 0) + ' dari ' + h.nPek + ' pekerja'],
      ['List Data Kelompok Tani (alamat sesuai buku rekening)', F.p.norek && F.p.desa, 'Rekap per kabupaten (F13)']
    ];
    return '<div class="hal">' + judulBlok(['DAFTAR DOKUMEN PELAKSANAAN PENYALURAN HOK', e(F.keg.judul), 'DI KABUPATEN ' + e(F.p.kab.toUpperCase()) + ' PROVINSI ' + e(String(F.kab.provinsi).toUpperCase()), 'TAHUN ANGGARAN ' + e(F.setting.tahun)]) +
      '<div class="jarak"></div>' + kv([['Kelompok Tani', isi(F.p.poktan)], ['Desa / Kecamatan', isi(F.p.desa) + ' / ' + isi(F.p.kec)]]) +
      '<table class="bingkai"><tr><th style="width:8%">No</th><th>Dokumen Kegiatan</th><th style="width:12%">Check list</th><th style="width:30%">Keterangan</th></tr>' +
      docs.map(function (r, i) { return '<tr><td class="c">' + (i + 1) + '</td><td>' + r[0] + '</td><td class="cek">' + cek(r[1]) + '</td><td class="kecil">' + e(r[2]) + '</td></tr>'; }).join('') + '</table></div>';
  }

  // ---------------------------------------------------------------- F01 SPK
  function F01(F) {
    var p = F.p, h = p.hit, k = F.keg;
    var pasal = [
      ['Maksud dan Tujuan', '<ol class="pasal"><li>Maksud SPK ini adalah sebagai landasan kerjasama yang mengikat secara hukum bagi Pihak Kesatu dan Pihak Kedua dalam melaksanakan Pemanfaatan ' + k.frasa + ' Seluas ' + luasTeks(p.luas) + ' Tahun Anggaran ' + e(F.setting.tahun) + '.</li><li>Tujuan Perjanjian Kerja Sama ini adalah untuk mengatur Pemanfaatan ' + k.frasa + ' Seluas ' + luasTeks(p.luas) + ' Tahun Anggaran ' + e(F.setting.tahun) + '.</li></ol>'],
      ['Ruang Lingkup', '<p>Ruang Lingkup SPK ini meliputi:</p><ol class="huruf"><li>Hak dan Kewajiban Pihak Kesatu dan Pihak Kedua;</li><li>Jenis dan jangka waktu pekerjaan;</li><li>Sumber dan jumlah dana;</li><li>Mekanisme pembayaran;</li><li>Monitoring dan evaluasi.</li></ol>'],
      ['Hak dan Kewajiban', '<ol class="pasal"><li>Pihak Kesatu mempunyai hak dan kewajiban sebagai berikut:<ol class="huruf"><li>mengawasi dan memeriksa pekerjaan yang dilaksanakan oleh Pihak Kedua;</li><li>meminta laporan-laporan mengenai pelaksanaan pekerjaan yang dilakukan oleh Pihak Kedua;</li><li>memberikan fasilitas berupa koordinasi dengan Dinas dan instansi terkait yang dibutuhkan oleh Pihak Kedua untuk pelaksanaan pekerjaan sesuai ketentuan dalam SPK;</li><li>membayar pekerjaan sesuai dengan ketentuan yang tercantum dalam SPK.</li></ol></li>' +
        '<li>Pihak Kedua mempunyai hak dan kewajiban sebagai berikut:<ol class="huruf"><li>menerima pembayaran untuk pelaksanaan pekerjaan sesuai ketentuan yang tercantum dalam SPK;</li><li>melaporkan pelaksanaan pekerjaan kepada Pihak Kesatu;</li><li>melaksanakan dan menyelesaikan pekerjaan sesuai dengan jadwal pelaksanaan pekerjaan yang telah ditetapkan dalam SPK;</li><li>memberikan keterangan-keterangan yang diperlukan oleh Pihak Kesatu;</li><li>menyerahkan hasil pekerjaan sesuai dengan jadwal penyerahan pekerjaan yang telah ditetapkan dalam SPK;</li><li>mengambil langkah-langkah yang cukup memadai untuk melindungi lingkungan tempat kerja dan membatasi perusakan dan gangguan kepada masyarakat maupun miliknya akibat kegiatan Pihak Kedua;</li><li>mengembalikan dana Bantuan Pemerintah ke kas negara jika terdapat sisa dana yang tidak digunakan.</li></ol></li></ol>'],
      ['Jenis dan Jangka Waktu Pekerjaan', '<ol class="pasal"><li>Jenis pekerjaan meliputi pengolahan lahan (' + h.hok.olah + ' HOK/ha) dan penanaman (' + h.hok.tanam + ' HOK/ha).</li><li>SPK ini berlaku sejak tanggal ' + U.tgl(p.tgl_spk) + ' sampai dengan tanggal ' + U.tgl(p.spk_sd) + '.</li></ol>'],
      ['Sumber dan Jumlah Dana', '<ol class="pasal"><li>Sumber dana berasal dari Daftar Isian Pelaksanaan Anggaran (DIPA) Tahun Anggaran ' + e(F.setting.tahun) + ', Nomor: ' + isi(F.setting.no_dipa) + ' tanggal ' + U.tgl(F.setting.tgl_dipa) + '.</li><li>Jumlah dana untuk melaksanakan kegiatan sebagaimana yang disepakati dalam SPK sebesar ' + U.rp(h.tBiaya) + ' (' + U.terbilang(h.tBiaya) + ' rupiah) untuk ' + U.angka(h.tHOK) + ' Hari Orang Kerja (HOK), terdiri atas ' + rincianHOK(h, 'tHOK') + '.</li></ol>'],
      ['Mekanisme Pembayaran', '<ol class="pasal"><li>Pembayaran ' + k.biaya + ' dilakukan Sesuai Progres Pekerjaan.</li><li>Pembayaran dilakukan melalui Nomor Rekening ' + isi(p.norek) + ' ' + isi(p.bank, '') + ' a.n. ' + isi(p.namarek) + '.</li></ol>'],
      ['Monitoring dan Evaluasi', '<p class="rata">Pihak Kesatu mempunyai kewenangan sepenuhnya untuk melaksanakan pengawasan dan evaluasi terhadap seluruh kegiatan pelaksanaan dari Perjanjian Kerja Sama yang dilakukan oleh Pihak Kedua.</p>'],
      ['Larangan Korupsi, Kolusi, dan Nepotisme (KKN)', '<p>Para pihak dilarang untuk:</p><ol class="pasal"><li>menawarkan, menerima atau menjanjikan untuk memberi atau menerima hadiah atau imbalan berupa apa saja atau melakukan tindakan lainnya untuk mempengaruhi siapapun yang diketahui atau patut dapat diduga berkaitan dengan pengadaan ini;</li><li>membuat dan/atau menyampaikan secara tidak benar dokumen dan/atau keterangan lain yang disyaratkan untuk penyusunan dan pelaksanaan surat perjanjian kerjasama ini.</li></ol>'],
      ['Perselisihan', '<ol class="pasal"><li>Apabila terjadi perselisihan antara Pihak Kesatu dan Pihak Kedua, penyelesaian dilakukan secara musyawarah dan mufakat;</li><li>Apabila penyelesaian secara musyawarah dan mufakat tidak tercapai, maka Pihak Kesatu dan Pihak Kedua sepakat untuk menyelesaikannya secara hukum di Pengadilan Negeri setempat.</li></ol>']
    ];
    return '<div class="hal">' + judulBlok(['SURAT PERJANJIAN KERJASAMA (SPK)', e(k.judul), 'NOMOR : ' + isi(p.no_spk)]) + '<div class="jarak"></div>' +
      judulBlok(['TENTANG PEMANFAATAN BANTUAN', e(k.spk2), e(k.spk3), 'TAHUN ANGGARAN ' + e(F.setting.tahun)]) + '<div class="jarak"></div>' +
      '<p class="rata">' + U.kalimatHari(p.tgl_spk) + ' bertempat di ' + isi(p.tempat_spk) + ' Jalan ' + isi(p.jalan_spk) + ', yang bertanda tangan di bawah ini :</p>' +
      kv([['I. Nama', '<b>' + isi(F.kab.ppk) + '</b>'], ['&nbsp;&nbsp;&nbsp;NIP', isi(F.kab.nip_ppk)], ['&nbsp;&nbsp;&nbsp;Jabatan', '<span class="rata">' + jabatanPPK(F) + '</span>']]) +
      '<p>Yang selanjutnya disebut <b>Pihak Kesatu</b> (pihak yang menyerahkan)</p>' +
      kv([['II. Nama', '<b>' + isi(p.ketua) + '</b>'], ['&nbsp;&nbsp;&nbsp;&nbsp;NIK', nikTampil(p.nik_ketua)], ['&nbsp;&nbsp;&nbsp;&nbsp;Jabatan', 'Ketua ' + e(lembaga(p.poktan)) + ', dalam hal ini bertindak atas nama ' + e(lembaga(p.poktan)) + ' yang berkedudukan di Desa ' + isi(p.desa) + ' Kecamatan ' + isi(p.kec) + ' Kabupaten ' + isi(p.kab)]]) +
      '<p>Yang selanjutnya disebut <b>Pihak Kedua</b> (pihak yang menerima)</p>' +
      '<p class="rata">Pihak Kesatu dan Pihak Kedua sepakat mengikatkan diri dalam Surat Perjanjian Kerjasama yang selanjutnya disebut SPK, dengan ini bersepakat dan menyetujui hal-hal sebagai berikut:</p>' +
      pasal.map(function (x, i) { return '<div class="pasal-j">Pasal ' + (i + 1) + '<br>' + x[0] + '</div>' + x[1]; }).join('') +
      ttd('Pihak Kedua,', 'Ketua ' + e(lembaga(p.poktan)), isi(p.ketua), 'NIK. ' + nikTampil(p.nik_ketua), 'Pihak Kesatu,', 'Pejabat Pembuat Komitmen', isi(F.kab.ppk), 'NIP. ' + isi(F.kab.nip_ppk), 'Materai 10.000', 'Materai 10.000') +
      '<p class="kecil miring" style="margin-top:10pt">Keterangan: dibuat 2 rangkap, rangkap pertama bermaterai di pihak kedua untuk pihak kesatu, rangkap kedua bermaterai di pihak kesatu untuk pihak kedua.</p></div>';
  }

  // ---------------------------------------------------------------- F02 SPTJM
  function F02(F) {
    var p = F.p;
    return '<div class="hal">' + judulBlok(['Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)', e(F.keg.sptjm)]) + '<div class="jarak"></div><div class="jarak"></div>' +
      '<p>Yang bertanda tangan di bawah ini :</p>' +
      kv([['1. Nama', isi(p.ketua)], ['2. NIK', nikTampil(p.nik_ketua)], ['3. Jabatan', 'Ketua ' + e(lembaga(p.poktan))], ['4. Alamat', 'Desa ' + isi(p.desa) + ' Kecamatan ' + isi(p.kec) + ' Kabupaten ' + isi(p.kab)]]) +
      '<div class="jarak"></div><p>Dengan ini menyatakan dengan sesungguhnya bahwa saya:</p><ol class="huruf">' +
      '<li>bertanggung jawab penuh atas ' + F.keg.frasa + ' pada Kawasan Tebu TA. ' + e(F.setting.tahun) + ';</li>' +
      '<li>apabila bantuan dimaksud tidak digunakan sesuai peruntukannya sehingga mengakibatkan kerugian Negara, maka saya bersedia mengganti sesuai dengan ketentuan peraturan yang berlaku;</li>' +
      '<li>menyimpan seluruh bukti terkait penggunaan bantuan dimaksud sebagai kelengkapan administrasi untuk keperluan pemeriksaan.</li></ol>' +
      '<p class="rata">Surat pernyataan ini kami buat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.</p><div class="jarak"></div>' +
      '<table class="ttd"><tr><td></td><td>' + tempatTgl(F, p.tgl_sptjm) + '<br>Ketua ' + e(lembaga(p.poktan)) + '<div class="ruang-ttd">Tanda tangan / stempel<br>Materai Rp10.000</div><span class="tebal garis-bawah">' + isi(p.ketua) + '</span></td></tr></table></div>';
  }

  // ---------------------------------------------------------------- F03 RUKK
  function F03(F) {
    var p = F.p, h = p.hit;
    return '<div class="hal">' + judulBlok(['RENCANA USULAN KERJA KELOMPOK', e(F.keg.bantuan.toUpperCase()), e(F.keg.judul), 'DI KABUPATEN ' + e(p.kab.toUpperCase()) + ' PROVINSI ' + e(String(F.kab.provinsi).toUpperCase()), 'TAHUN ANGGARAN ' + e(F.setting.tahun)]) +
      '<div class="jarak"></div>' + identitas(F, [['LUAS AREA', luasTeks(p.luas)]]) + '<div class="jarak"></div>' +
      '<table class="bingkai"><tr><th rowspan="2" style="width:6%">NO</th><th rowspan="2">KEGIATAN</th><th colspan="3">' + e(F.keg.bantuan) + '</th><th rowspan="2" style="width:18%">JUMLAH (Rp)</th></tr>' +
      '<tr><th>Luas Lahan (ha)</th><th>Jumlah HOK/ha</th><th>Satuan (Rp/HOK)</th></tr>' +
      '<tr><td class="c">1</td><td>Tenaga Kerja</td><td></td><td></td><td></td><td></td></tr>' +
      HOK.DAFTAR_JENIS.map(function (j) { return '<tr><td></td><td>- ' + e(HOK.JENIS[j].label) + '</td><td class="c">' + U.ha(p.luas) + '</td><td class="c">' + U.angka(h.hok[j]) + '</td><td class="r">' + U.angka(h.upah) + '</td><td class="r">' + U.angka(h.per[j].tHOK * h.upah) + '</td></tr>'; }).join('') +
      '<tr><td colspan="5" class="c tebal">JUMLAH</td><td class="r tebal">' + U.angka(h.tBiaya) + '</td></tr></table>' +
      '<p class="kecil miring">*Keterangan: Biaya lain yang timbul untuk kegiatan ' + e(F.keg.swadaya) + ' dibiayai secara swadaya oleh petani.</p><div class="jarak"></div>' +
      '<table class="ttd"><tr><td></td><td>' + tempatTgl(F, p.tgl_rukk) + '<br>Ketua ' + e(lembaga(p.poktan)) + '<div class="ruang-ttd">TTD dan stempel</div><span class="tebal garis-bawah">' + isi(p.ketua) + '</span></td></tr></table></div>';
  }

  // ---------------------------------------------------------------- F05 Daftar hadir (15 hari × 20 pekerja per halaman)
  function periodeHadir(F) {
    var p = F.p, h = p.hit;
    var pr = HOK.periode(p, F.jenis || 'olah'), m0 = pr.awal; // periode daftar hadir jenis pekerjaan ini
    if (!m0) return null;
    var akhir = pr.akhir || m0;
    if (h.hadirAkhir && h.hadirAkhir > akhir) akhir = h.hadirAkhir;
    return { mulai: m0, akhir: akhir, jumlah: HOK.hari(akhir) - HOK.hari(m0) + 1 };
  }
  function F05(F) {
    var per = periodeHadir(F), out = '';
    if (!per) return '<div class="hal"><p>Isi tanggal ' + e(F.keg.jenis.toLowerCase()) + ' terlebih dahulu.</p></div>';
    var HARI = 15, BARIS = 20, pek = F.pekerja, nPer = Math.ceil(per.jumlah / HARI), nHal = Math.max(1, Math.ceil(pek.length / BARIS));
    for (var a = 0; a < nPer; a++) {
      var tgl = [];
      for (var k = 0; k < HARI; k++) { var di = a * HARI + k; tgl.push(di < per.jumlah ? U.tambahHari(per.mulai, di) : null); }
      for (var b = 0; b < nHal; b++) {
        var rows = pek.slice(b * BARIS, (b + 1) * BARIS);
        out += '<div class="hal lanskap">' + kopWilayah(F, 'DAFTAR HADIR') +
          '<table class="kv" style="margin-top:4pt"><tr><td class="l" style="width:16%">KELOMPOK TANI</td><td class="t">:</td><td style="width:34%">' + isi(F.p.poktan) + '</td><td class="l" style="width:16%">JENIS PEKERJAAN</td><td class="t">:</td><td>' + e(F.keg.jenis) + '</td></tr>' +
          '<tr><td class="l">DESA / KECAMATAN</td><td class="t">:</td><td>' + isi(F.p.desa) + ' / ' + isi(F.p.kec) + '</td><td class="l">LUAS AREA</td><td class="t">:</td><td>' + luasTeks(F.p.luas) + ' · periode ' + (a + 1) + '/' + nPer + (nHal > 1 ? ' · halaman ' + (b + 1) + '/' + nHal : '') + '</td></tr></table>' +
          '<table class="bingkai kecil"><tr><th rowspan="2" style="width:3%">NO</th><th rowspan="2" style="width:17%">NAMA LENGKAP</th><th rowspan="2" style="width:13%">NIK</th><th colspan="' + HARI + '">WAKTU PELAKSANAAN PEKERJAAN</th><th rowspan="2" style="width:5%">TOTAL HARI</th></tr><tr>' +
          tgl.map(function (d) { return '<th>' + (d ? U.namaHari(d).slice(0, 3) + '<br>' + d.slice(8) + '/' + d.slice(5, 7) : '') + '</th>'; }).join('') + '</tr>' +
          rows.map(function (w, i) {
            var set = {}; w.hadir.forEach(function (x) { set[x] = 1; });
            var tot = tgl.filter(function (d) { return d && set[d]; }).length;
            return '<tr><td class="c">' + (b * BARIS + i + 1) + '</td><td>' + e(w.nama) + '</td><td>' + e(w.nik) + '</td>' + tgl.map(function (d) { return '<td class="c">' + (d && set[d] ? '√' : '') + '</td>'; }).join('') + '<td class="c tebal">' + tot + '</td></tr>';
          }).join('') +
          (b === nHal - 1 ? '<tr><td colspan="' + (3 + HARI) + '" class="c tebal">JUMLAH HOK PERIODE INI</td><td class="c tebal">' + pek.reduce(function (s, w) { return s + w.hadir.filter(function (x) { return tgl.indexOf(x) >= 0; }).length; }, 0) + '</td></tr>' : '') +
          '</table>' + ttdTimKetua(F, tgl.filter(Boolean).slice(-1)[0]) + '</div>';
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- F06 / F07
  function tabelRealisasi(F, kolomAkhir, nilaiAkhir) {
    var p = F.p, h = p.hit, rl = U.n(p.real_luas);
    var pc = function (a, b) { return b ? U.persen(a, b) : '–'; };
    var baris = HOK.DAFTAR_JENIS.map(function (j, i) {
      var pj = h.per[j], tB = pj.tHOK * h.upah, rB = pj.rHOK * h.upah, tg = U.rentang(pj.awal || HOK.periode(p, j).awal, pj.akhir || HOK.periode(p, j).akhir);
      return '<tr><td class="c">' + (i + 1) + '</td><td>' + e(HOK.JENIS[j].label) + '</td><td class="c">' + tg + '</td><td class="c">' + U.ha(p.luas) + '</td><td class="c">' + U.angka(pj.tHOK) + '</td><td class="r">' + U.angka(tB) + '</td>' +
        '<td class="c">' + tg + '</td><td class="c">' + (rl ? U.ha(rl) : '–') + '</td><td class="c">' + pc(rl, U.n(p.luas)) + '</td><td class="c">' + U.angka(pj.rHOK) + '</td><td class="c">' + pc(pj.rHOK, pj.tHOK) + '</td>' +
        '<td class="r">' + U.angka(rB) + '</td><td class="c">' + pc(rB, tB) + '</td><td class="c tebal">' + (nilaiAkhir ? nilaiAkhir(pj) : '') + '</td></tr>';
    }).join('');
    return '<table class="bingkai kecil"><tr><th rowspan="3" style="width:3%">No</th><th rowspan="3">Jenis Pekerjaan</th><th colspan="4">TARGET PELAKSANAAN</th><th colspan="7">REALISASI PELAKSANAAN</th><th rowspan="3">' + kolomAkhir + '</th></tr>' +
      '<tr><th rowspan="2">Tanggal Pelaksanaan</th><th rowspan="2">Luas areal (ha)</th><th rowspan="2">Penggunaan Tenaga Kerja (HOK)</th><th rowspan="2">Total Biaya (Rp)</th><th rowspan="2">Tanggal Pelaksanaan</th><th colspan="2">Luas areal</th><th colspan="2">Tenaga Kerja</th><th colspan="2">Total Biaya</th></tr>' +
      '<tr><th>ha</th><th>%</th><th>HOK</th><th>%</th><th>Rp</th><th>%</th></tr>' + baris +
      '<tr><td colspan="4" class="c tebal">JUMLAH</td><td class="c tebal">' + U.angka(h.tHOK) + '</td><td class="r tebal">' + U.angka(h.tBiaya) + '</td><td colspan="3"></td><td class="c tebal">' + U.angka(h.rHOK) + '</td><td class="c tebal">' + pc(h.rHOK, h.tHOK) + '</td><td class="r tebal">' + U.angka(h.rBiaya) + '</td><td class="c tebal">' + pc(h.rBiaya, h.tBiaya) + '</td><td></td></tr></table>';
  }
  function sesuaiJenis(F) { var rl = U.n(F.p.real_luas); return function (pj) { return pj.rHOK && pj.rHOK <= pj.tHOK && rl <= U.n(F.p.luas) ? 'SESUAI' : (pj.rHOK ? 'TIDAK SESUAI' : ''); }; }
  function F06(F) {
    return '<div class="hal lanskap">' + kopWilayah(F, 'LAPORAN PELAKSANAAN KEGIATAN') + '<div class="jarak"></div>' + identitas(F, [['LUAS AREA', luasTeks(F.p.luas)]]) +
      tabelRealisasi(F, 'Keterangan', null) + '<p class="kecil" style="margin-top:6pt">Catatan: dilampiri dokumentasi foto geotag kondisi awal, proses pelaksanaan dan hasil akhir.</p>' + ttdTimKetua(F, F.p.tgl_lap) + '</div>';
  }
  function F07(F) {
    return '<div class="hal lanskap">' + judulBlok(['BERITA ACARA PEMERIKSAAN PEKERJAAN', 'Nomor : ' + isi(F.p.no_bap), e(F.keg.judul), 'DI KABUPATEN ' + e(F.p.kab.toUpperCase()) + ' PROVINSI ' + e(String(F.kab.provinsi).toUpperCase()), 'TAHUN ANGGARAN ' + e(F.setting.tahun)]) +
      '<div class="jarak"></div>' + identitas(F, [['LUAS AREA', luasTeks(F.p.luas)]]) + tabelRealisasi(F, 'SESUAI / TIDAK SESUAI', sesuaiJenis(F)) +
      '<p class="kecil" style="margin-top:6pt">Catatan: dilampiri dokumentasi foto geotag pemeriksaan hasil pekerjaan.</p>' + ttdTimKetua(F, F.p.tgl_bap) + '</div>';
  }

  // ---------------------------------------------------------------- F08 BAST
  function F08(F) {
    var p = F.p, h = p.hit, luasR = U.n(p.real_luas) ? U.ha(p.real_luas) : '……';
    return '<div class="hal"><img class="kop" src="assets/kop.jpg" alt="">' +
      '<h1 class="garis-bawah">BERITA ACARA SERAH TERIMA HASIL PEKERJAAN</h1><h2>No. ' + isi(p.no_bast) + '</h2><div class="jarak"></div>' +
      '<p class="rata">' + U.kalimatHari(p.tgl_bast) + ' di Desa ' + isi(p.desa) + ' Kecamatan ' + isi(p.kec) + ' Kabupaten ' + isi(p.kab) + ' Provinsi ' + isi(F.kab.provinsi) + ', kami yang bertanda tangan di bawah ini :</p>' +
      kv([['I. Nama', '<b>' + isi(p.ketua) + '</b>'], ['&nbsp;&nbsp;&nbsp;NIK', nikTampil(p.nik_ketua)], ['&nbsp;&nbsp;&nbsp;Jabatan', 'Ketua ' + e(lembaga(p.poktan))]]) +
      '<p>Yang selanjutnya disebut <b>PIHAK KESATU</b> (pihak yang menyerahkan)</p>' +
      kv([['II. Nama', '<b>' + isi(F.kab.ppk) + '</b>'], ['&nbsp;&nbsp;&nbsp;&nbsp;NIP', isi(F.kab.nip_ppk)], ['&nbsp;&nbsp;&nbsp;&nbsp;Jabatan', 'Pejabat Pembuat Komitmen ' + isi(F.kab.unit)]]) +
      '<p>Yang selanjutnya disebut <b>PIHAK KEDUA</b> (pihak yang menerima)</p>' +
      '<p class="rata">Sesuai dengan Berita Acara Pemeriksaan nomor ' + isi(p.no_bap) + ' Tanggal ' + U.tgl(p.tgl_bap) + ', PIHAK KESATU menyerahkan kepada PIHAK KEDUA hasil pekerjaan sebagai berikut :</p>' +
      '<ol class="pasal"><li>PIHAK KESATU telah menyerahkan hasil pelaksanaan kegiatan ' + e(F.keg.jenis) + ' di ' + e(lembagaKalimat(p.poktan)) + ' yang telah selesai dilaksanakan 100 %. Total volume pekerjaan sebanyak ' + U.angka(h.rHOK) + ' HOK (' + rincianHOK(h, 'rHOK') + ') dengan nominal biaya ' + U.rp(h.rBiaya) + ' (' + U.terbilang(h.rBiaya) + ' rupiah) yang mencakup luas area tanam ' + luasR + ' ha;</li>' +
      '<li>PIHAK KEDUA telah menerima sepenuhnya penyerahan dari PIHAK KESATU hasil pelaksanaan kegiatan ' + e(F.keg.jenis.toLowerCase()) + ' di ' + e(lembagaKalimat(p.poktan)) + ' Desa ' + isi(p.desa) + ' Kecamatan ' + isi(p.kec) + ' Kabupaten ' + isi(p.kab) + ' seluas ' + luasR + ' ha.</li></ol>' +
      '<p class="rata">Demikian Berita Acara Serah Terima bantuan ini dibuat, untuk dapat dipergunakan sebagaimana mestinya.</p>' +
      ttd('PIHAK KEDUA', 'Pejabat Pembuat Komitmen', isi(F.kab.ppk), 'NIP. ' + isi(F.kab.nip_ppk), 'PIHAK KESATU', 'Ketua ' + e(lembaga(p.poktan)), isi(p.ketua), '', '', 'TTD dan stempel') + '</div>';
  }

  // ---------------------------------------------------------------- F09 Tanda terima pekerja (25 per halaman)
  function F09(F) {
    var pek = F.pekerja, upah = F.p.hit.upah, BARIS = 25, nHal = Math.max(1, Math.ceil(pek.length / BARIS)), out = '';
    var totH = 0, totR = 0;
    pek.forEach(function (w) { totH += w.hadir.length; totR += w.hadir.length * upah; });
    for (var b = 0; b < nHal; b++) {
      var rows = pek.slice(b * BARIS, (b + 1) * BARIS);
      out += '<div class="hal">' + kopWilayah(F, 'TANDA TERIMA PEMBAYARAN') + '<div class="jarak"></div>' +
        identitas(F, [['JENIS PEKERJAAN', e(F.keg.jenis)], ['LUAS AREA', luasTeks(F.p.luas) + (nHal > 1 ? ' · halaman ' + (b + 1) + '/' + nHal : '')]]) +
        '<table class="bingkai kecil"><tr><th style="width:5%">NO</th><th>NAMA LENGKAP</th><th style="width:19%">NIK</th><th style="width:9%">TOTAL HADIR (HARI)</th><th style="width:12%">UPAH KERJA PER HARI (Rp)</th><th style="width:14%">JUMLAH UPAH DITERIMA (Rp)</th><th colspan="2" style="width:20%">TANDA TANGAN</th></tr>' +
        rows.map(function (w, i) {
          var no = b * BARIS + i + 1, ttdKiri = no % 2 === 1;
          return '<tr style="height:20pt"><td class="c">' + no + '</td><td>' + e(w.nama) + '</td><td>' + e(w.nik) + '</td><td class="c">' + w.hadir.length + '</td><td class="r">' + U.angka(upah) + '</td><td class="r">' + U.angka(w.hadir.length * upah) + '</td>' +
            '<td>' + (ttdKiri ? no + '. ……………' : '') + '</td><td>' + (ttdKiri ? '' : no + '. ……………') + '</td></tr>';
        }).join('') +
        (b === nHal - 1 ? '<tr><td colspan="3" class="c tebal">JUMLAH</td><td class="c tebal">' + totH + '</td><td></td><td class="r tebal">' + U.angka(totR) + '</td><td colspan="2"></td></tr>' : '') +
        '</table>' + ttdTimKetua(F, F.p.tgl_tt) + '</div>';
    }
    return out;
  }

  // ---------------------------------------------------------------- F10 Dokumentasi (foto geotag dari Drive)
  function F10(F) {
    var p = F.p, foto = F.foto || {};
    var kg = e(String(F.keg.nama).toUpperCase());
    var tahap = [['0persen', 'FOTO GEOTAG LAHAN SEBELUM DILAKUKAN KEGIATAN ' + kg], ['50persen', 'FOTO GEOTAG PROSES PEKERJAAN KEGIATAN ' + kg], ['100persen', 'FOTO GEOTAG SETELAH DILAKUKAN PEKERJAAN KEGIATAN ' + kg]];
    function kotak(slot) {
      var f = foto[slot];
      var ket = f && f.meta ? [f.meta.tanggal ? f.meta.tanggal.replace('T', ' ') : '', f.meta.lat ? f.meta.lat + ', ' + f.meta.lng : ''].filter(Boolean).join(' · ') : '';
      return '<div><div class="foto">' + (f && f.url ? '<img src="' + f.url + '" alt="">' : 'Tempel foto geotag<br>(koordinat dan waktu terlihat)') + '</div>' + (ket ? '<div class="foto-ket" style="margin-top:2pt">' + e(ket) + '</div>' : '') + '</div>';
    }
    return '<div class="hal">' + judulBlok(['DOKUMENTASI', 'LAPORAN ' + e(F.keg.judul), e(F.keg.dok3)]) + '<div class="jarak"></div>' +
      kv([['Kelompok Tani', isi(p.poktan)], ['Lokasi lahan', 'Desa ' + isi(p.desa) + ' Kecamatan ' + isi(p.kec)], ['Luas Area', luasTeks(p.luas)], ['Tanggal Pelaksanaan', tglPelaksanaan(p, F.jenis)]]) +
      tahap.map(function (t, i) { return '<p class="tebal kecil" style="margin-top:6pt">' + (i + 1) + '. ' + t[1] + '</p><div class="foto-grid">' + kotak(t[0] + '_1') + kotak(t[0] + '_2') + '</div>'; }).join('') + '</div>';
  }

  // ---------------------------------------------------------------- F11 Kwitansi
  function F11(F) {
    var p = F.p, h = p.hit;
    return '<div class="hal"><div class="bingkai-kw"><h1 class="garis-bawah" style="letter-spacing:4pt">KWITANSI</h1><h2>NO : ' + isi(p.no_kw) + '</h2><div class="jarak"></div>' +
      kv([['Sudah Terima Dari', isi(F.setting.kpa)], ['Jumlah Uang', '<b>' + U.rp(h.rBiaya) + '</b>'], ['Terbilang', '<i>' + U.terbilangRp(h.rBiaya) + '</i>'],
        ['Untuk Pembayaran', e(F.keg.frasa) + ' TA ' + e(F.setting.tahun)], ['', kv([['Kelompok Tani', isi(p.poktan)], ['Desa', isi(p.desa)], ['Kecamatan', isi(p.kec)], ['Kabupaten', isi(p.kab)]])]]) +
      '<div class="jarak"></div><table class="ttd" style="font-size:10pt"><tr><td style="width:36%">SETUJU DIBAYAR<br>Pejabat Pembuat Komitmen<br>' + isi(F.kab.unit) + '</td><td style="width:30%">Lunas<br>Dibayar pada tanggal<br>Bendahara Pengeluaran</td><td style="width:34%">' + tempatTgl(F, p.tgl_kw) + '<br>Yang Menerima</td></tr>' +
      '<tr><td><div class="ruang-ttd"></div></td><td><div class="ruang-ttd"></div></td><td><div class="ruang-ttd">TTD dan stempel<br>Materai 10.000</div></td></tr>' +
      '<tr><td><span class="tebal garis-bawah">' + isi(F.kab.ppk) + '</span><br>NIP. ' + isi(F.kab.nip_ppk) + '</td><td><span class="tebal garis-bawah">' + isi(F.kab.bendahara) + '</span><br>NIP. ' + isi(F.kab.nip_bendahara) + '</td>' +
      '<td style="text-align:left">' + kv([['Nama', '<b>' + isi(p.ketua) + '</b>'], ['Jabatan', 'Ketua ' + e(lembaga(p.poktan))], ['Alamat Desa', isi(p.desa)], ['Kec.', isi(p.kec)], ['Kab.', isi(p.kab)]]) + '</td></tr></table></div></div>';
  }

  // ---------------------------------------------------------------- F12 Foto KTP ketua, buku rekening, NPWP
  function fotoSatu(f, kosong) {
    if (f && f.pdf) return '<div class="foto satu">Berkas berupa PDF (' + e(f.nama) + ').<br>Cetak dari tab Dokumen & foto lalu lampirkan.</div>';
    return '<div class="foto satu">' + (f && f.url ? '<img src="' + f.url + '" alt="">' : kosong) + '</div>';
  }
  function npwpTeks(p) { return String(p.npwp || '').trim() ? e(p.npwp) + (p.npwp_an ? ' (' + e(p.npwp_an) + ')' : '') : ''; }
  function F12(F) {
    var p = F.p, foto = F.foto || {};
    var kepala = judulBlok(['FOTO KTP KETUA, BUKU REKENING KELOMPOK TANI, DAN NPWP KELOMPOK TANI ATAU NPWP KETUA']) + '<p class="c kecil">' + e(F.keg.judul) + ' · Kelompok Tani ' + isi(p.poktan) + ' · Desa ' + isi(p.desa) + ' Kecamatan ' + isi(p.kec) + '</p><div class="jarak"></div>';
    return '<div class="hal">' + kepala +
      '<p class="tebal">1. FOTO KTP KETUA KELOMPOK TANI</p>' + fotoSatu(foto.ktp_ketua, 'FOTO KTP<br>(berwarna, tidak terpotong, tidak buram, jelas terbaca)') +
      kv([['Nama ketua', isi(p.ketua)], ['NIK', isi(p.nik_ketua)]]) + '</div>' +
      '<div class="hal"><p class="tebal">2. FOTO BUKU REKENING</p>' + fotoSatu(foto.depan, 'FOTO BUKU REKENING<br>(halaman depan, atas nama kelompok)') +
      kv([['Nomor rekening', isi(p.norek)], ['Bank', isi(p.bank)], ['Atas nama', isi(p.namarek)]]) + '</div>' +
      '<div class="hal"><p class="tebal">3. FOTO NPWP KELOMPOK TANI ATAU KETUA KELOMPOK TANI</p>' + fotoSatu(foto.npwp, 'FOTO NPWP<br>(berwarna, tidak terpotong, tidak buram, jelas terbaca)') +
      kv([['Nomor NPWP', isi(p.npwp)], ['Atas nama', isi(p.npwp_an)]]) + '</div>';
  }

  // ---------------------------------------------------------------- F14 KTP petani pekerja (8 KTP per halaman)
  // foto KTP tiap pekerja di daftar hadir: berkas KTP pekerja (NIK_Nama) atau KTP ketua bila ketua ikut bekerja
  function fotoKtpPekerja(F) {
    var foto = F.foto || {}, kunci = Object.keys(foto), nikKetua = String(F.p.nik_ketua || '');
    return (F.pekerja || []).map(function (w) {
      var k = kunci.filter(function (x) { return x.indexOf(w.nik + '_') === 0; })[0];
      var f = k ? foto[k] : (w.nik && w.nik === nikKetua ? foto.ktp_ketua : null);
      return { w: w, f: f || null };
    });
  }
  function F14(F) {
    var p = F.p, daftar = fotoKtpPekerja(F), out = '', PER = 8;
    var kepala = judulBlok(['DOKUMENTASI', 'KTP PENERIMA PETANI PEKERJA KEGIATAN', e(String(F.keg.nama).toUpperCase()) + ' TAHUN ANGGARAN ' + e(F.setting.tahun || '2026'), 'KELOMPOK TANI ' + isi(String(p.poktan || '').toUpperCase()) + ' LUAS AREA ' + luasTeks(p.luas).toUpperCase()]);
    if (!daftar.length) return '<div class="hal">' + kepala + '<p>Belum ada pekerja di daftar hadir.</p></div>';
    for (var i = 0; i < daftar.length; i += PER) {
      out += '<div class="hal">' + kepala + '<div class="ktp-grid">' + daftar.slice(i, i + PER).map(function (x) {
        var g = x.f && x.f.pdf ? 'KTP berupa PDF, lampirkan terpisah' : x.f && x.f.url ? '<img src="' + x.f.url + '" alt="">' : 'FOTO KTP PEKERJA<br>(belum diunggah)';
        return '<div class="ktp">' + g + '<div class="nm">' + e(x.w.nama) + '</div></div>';
      }).join('') + '</div></div>';
    }
    return out;
  }

  // ---------------------------------------------------------------- F13 List data kelompok tani penerima bantuan (satu rekap per kabupaten)
  function F13(kab, keg, daftar) {
    return '<div class="hal lanskap"><h1>LIST DATA KELOMPOK TANI PENERIMA BANTUAN</h1><h2>' + (keg ? e(HOK.KEG[keg].judul) + ' · ' : '') + 'KABUPATEN ' + e(kab.kab.toUpperCase()) + ' · PROVINSI ' + e(String(kab.provinsi).toUpperCase()) + '</h2><div class="jarak"></div>' +
      '<table class="bingkai kecil"><tr><th>NO</th><th>NAMA KELOMPOK TANI</th><th>KETUA KELOMPOK TANI</th><th>NIK</th><th>JALAN</th><th>DESA</th><th>KECAMATAN</th><th>KABUPATEN</th><th>PROVINSI</th><th>NO REKENING</th><th>NAMA REKENING</th><th>NOMOR NPWP (KT/KETUA KT)</th></tr>' +
      daftar.map(function (p, i) { return '<tr><td class="c">' + (i + 1) + '</td><td>' + e(p.poktan) + '</td><td>' + e(p.ketua) + '</td><td>' + e(p.nik_ketua) + '</td><td>' + e(p.jalan) + '</td><td>' + e(p.desa) + '</td><td>' + e(p.kec) + '</td><td>' + e(p.kab) + '</td><td>' + e(kab.provinsi) + '</td><td>' + e(p.norek) + '</td><td>' + e(p.namarek) + '</td><td>' + npwpTeks(p) + '</td></tr>'; }).join('') +
      '</table></div>';
  }

  var DAFTAR = [
    ['F00', 'Daftar periksa dokumen (sampul berkas)', F00],
    ['F01', 'Surat Perjanjian Kerjasama (SPK)', F01],
    ['F02', 'SPTJM', F02],
    ['F03', 'RUKK', F03],
    ['F05a', 'Daftar hadir pengolahan lahan', function (F) { return F05(untukJenis(F, 'olah')); }],
    ['F05b', 'Daftar hadir penanaman', function (F) { return F05(untukJenis(F, 'tanam')); }],
    ['F06', 'Laporan pelaksanaan kegiatan', F06],
    ['F07', 'Berita acara pemeriksaan', F07],
    ['F08', 'BAST poktan ke PPK', F08],
    ['F09a', 'Tanda terima upah pengolahan lahan', function (F) { return F09(untukJenis(F, 'olah')); }],
    ['F09b', 'Tanda terima upah penanaman', function (F) { return F09(untukJenis(F, 'tanam')); }],
    ['F10a', 'Dokumentasi foto geotag pengolahan lahan', function (F) { return F10(untukJenis(F, 'olah')); }],
    ['F10b', 'Dokumentasi foto geotag penanaman', function (F) { return F10(untukJenis(F, 'tanam')); }],
    ['F11', 'Kwitansi', F11],
    ['F12', 'Foto KTP ketua, buku rekening & NPWP', F12],
    ['F14', 'Dokumentasi KTP petani pekerja (8 per halaman)', F14]
  ];

  function cetakHTML(html, judul) {
    var el = document.getElementById('cetak');
    el.innerHTML = html;
    var imgs = Array.prototype.slice.call(el.querySelectorAll('img'));
    return Promise.all(imgs.map(function (im) { return im.complete ? null : new Promise(function (ok) { im.onload = im.onerror = ok; }); })).then(function () {
      var lama = document.title;
      if (judul) document.title = judul;
      document.body.classList.add('mencetak');
      var selesai = function () { document.body.classList.remove('mencetak'); document.title = lama; window.removeEventListener('afterprint', selesai); };
      window.addEventListener('afterprint', selesai);
      window.print();
      setTimeout(function () { if (!window.matchMedia('print').matches) selesai(); }, 1500);
    });
  }

  return { untukJenis: untukJenis, fotoKtpPekerja: fotoKtpPekerja, npwpTeks: npwpTeks, lembaga: lembaga, lembagaKalimat: lembagaKalimat, tglPelaksanaan: tglPelaksanaan, DAFTAR: DAFTAR, F13: F13, cetakHTML: cetakHTML, F: (function () { var o = {}; DAFTAR.forEach(function (d) { o[d[0]] = d[2]; }); return o; })() };
})();
