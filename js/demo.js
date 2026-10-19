/*
 * Mode demo: server tiruan di browser dengan data contoh fiktif.
 * Semua aturan validasi sama dengan server sebenarnya (core.js). Data hilang saat halaman dimuat ulang.
 */
var DEMO = (function () {
  'use strict';
  var env = null;
  var KODE = [
    { kode: 'DEMO-BTL', nama: 'Operator Bantul (demo)', peran: 'kabupaten', kab: 'Bantul' },
    { kode: 'DEMO-SLM', nama: 'Operator Sleman (demo)', peran: 'kabupaten', kab: 'Sleman' },
    { kode: 'DEMO-DIY', nama: 'Provinsi D.I. Yogyakarta (demo)', peran: 'provinsi', provinsi: 'D.I. Yogyakarta' },
    { kode: 'DEMO-PST', nama: 'Tim Evaluasi dan Pelaporan (demo)', peran: 'pusat' }
  ];

  function acak(seed) { return function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }

  function siapkan() {
    env = HOKMem.buatEnv(HOK);
    var ppk = { ppk: 'Nama PPK (contoh)', nip_ppk: '198001012005011001', unit: 'Direktorat Tanaman Semusim dan Tahunan', penetap: 'Direktur Jenderal Perkebunan',
      sk_ppk: '01/Kpts/KU.010/E/01/2026', kedudukan: 'Jakarta', bendahara: 'Nama Bendahara (contoh)', nip_bendahara: '197501012000032001',
      tim_teknis: 'Nama Tim Teknis (contoh)', nip_tim_teknis: '198505052010011002' };
    var kab = [['Bantul', 'BTL', 'D.I. Yogyakarta', 30], ['Sleman', 'SLM', 'D.I. Yogyakarta', 25], ['Kulon Progo', 'KLP', 'D.I. Yogyakarta', 10],
      ['Gunungkidul', 'GKD', 'D.I. Yogyakarta', 15], ['Boyolali', 'BYL', 'Jawa Tengah', 20], ['Purworejo', 'PWR', 'Jawa Tengah', 10]];
    var D = [
      ['Bantul', 'Perluasan Tanaman Tebu', 'KT Contoh Makmur', 'Sukirno', 'Argodadi', 'Sedayu', 4, 5],
      ['Bantul', 'Perluasan Tanaman Tebu', 'KT Contoh Rejeki', 'Pardiman', 'Selopamioro', 'Imogiri', 5, 3],
      ['Bantul', 'Bongkar Ratoon', 'KT Contoh Lestari', 'Wagiyo', 'Sidomulyo', 'Bambanglipuro', 3, 2],
      ['Bantul', 'Bongkar Ratoon', 'KT Contoh Mulyo', 'Suparno', 'Canden', 'Jetis', 2, 1],
      ['Bantul', 'Perluasan Tanaman Tebu', 'KT Contoh Tani Maju', 'Ngadimin', 'Pleret', 'Pleret', 6, 0],
      ['Sleman', 'Bongkar Ratoon', 'KT Contoh Sari', 'Tugiman', 'Purwomartani', 'Kalasan', 8, 4],
      ['Sleman', 'Perluasan Tanaman Tebu', 'KT Contoh Abadi', 'Sutrisno', 'Wedomartani', 'Ngemplak', 6, 2],
      ['Gunungkidul', 'Perluasan Tanaman Tebu', 'KT Contoh Ngudi', 'Sarjono', 'Bendungan', 'Karangmojo', 5, 3],
      ['Gunungkidul', 'Bongkar Ratoon', 'KT Contoh Subur', 'Paijo', 'Sumberwungu', 'Tepus', 2, 1],
      ['Kulon Progo', 'Bongkar Ratoon', 'KT Contoh Rosan', 'Marwan', 'Margosari', 'Pengasih', 3, 2]
    ];
    HOK.setupAwal(env, {
      setting: { unit_pusat: 'Tim Kerja Evaluasi dan Pelaporan' },
      provinsi: [{ provinsi: 'D.I. Yogyakarta', kode: 'DIY', upah_pl: '100000', upah_br: '100000' }, { provinsi: 'Jawa Tengah', kode: 'JTG', upah_pl: '90000', upah_br: '90000' }],
      kabupaten: kab.map(function (k) { return Object.assign({ kab: k[0], kode: k[1], provinsi: k[2], target_luas: String(k[3]) }, ppk); }),
      poktan: []
    });
    var salt = HOK.settingObj(env.store.all('SETTING')).salt;
    env.store.upsert('PENGGUNA', KODE.map(function (u, i) {
      return { id: 'UDEMO' + i, nama: u.nama, peran: u.peran, provinsi: u.provinsi || (u.kab ? 'D.I. Yogyakarta' : ''), kab: u.kab || '', kode_hash: HOK.hashKode(u.kode, salt), aktif: 'Ya', dibuat: '2026-10-01 08:00:00' };
    }));
    var r = acak(20261019), nomor = {}, kodeKab = {}, pekerja = [], waktu = '2026-10-01 08:00:00';
    kab.forEach(function (k) { kodeKab[k[0]] = k[1]; });
    var kodeNIK = { Bantul: '3402', Sleman: '3404', 'Kulon Progo': '3401', Gunungkidul: '3403' };
    var nikBaru = function (d) { return kodeNIK[d[0]] + String(10 + Math.floor(r() * 80)) + ('0' + (1 + Math.floor(r() * 28))).slice(-2) + ('0' + (1 + Math.floor(r() * 12))).slice(-2) + String(60 + Math.floor(r() * 35)) + ('000' + (pekerja.length + 1)).slice(-4); };
    // isi daftar hadir satu jenis pekerjaan: total HOK = isi, hari kerja tiap pekerja berurutan di dalam periode
    var isiJenis = function (id, d, j, awalP, dur, isi, pakai) {
      var nPek = Math.max(3, Math.round(isi / Math.min(dur, 12))), sisa = isi, hasil = [];
      for (var w = 0; w < nPek && sisa > 0; w++) {
        var lama = pakai[w], mulaiW = 0, ruang = dur;
        if (lama) { mulaiW = Math.max(0, HOK.hari(lama.akhir) - HOK.hari(awalP) + 1); ruang = dur - mulaiW; if (ruang <= 0) { lama = null; mulaiW = 0; ruang = dur; } }
        var hari = Math.min(sisa, Math.ceil(isi / nPek), ruang), awal = mulaiW + Math.floor(r() * (ruang - hari + 1)), hd = [];
        for (var x = 0; x < hari; x++) hd.push(U.tambahHari(awalP, awal + x));
        sisa -= hari;
        var o = { id: id + '-' + (j === 'olah' ? 'O' : 'T') + ('00' + (w + 1)).slice(-3), id_poktan: id, kab: d[0], nama: lama ? lama.nama : 'Pekerja Contoh ' + (pekerja.length + 1),
          nik: lama ? lama.nik : nikBaru(d), alamat: 'Desa ' + d[4], hadir: hd.join(','), diubah: waktu, oleh: 'demo', jenis: j };
        pekerja.push(o); hasil.push({ nama: o.nama, nik: o.nik, akhir: hd[hd.length - 1] });
      }
      return hasil;
    };
    var poktan = D.map(function (d, i) {
      nomor[d[0]] = (nomor[d[0]] || 0) + 1;
      var id = kodeKab[d[0]] + '-P' + ('00' + nomor[d[0]]).slice(-3);
      var tahap = d[7], mulai = U.tambahHari('2026-09-14', i * 3), durO = 10 + (i % 3) * 2, durT = 14 + (i % 4) * 2;
      var selesaiO = U.tambahHari(mulai, durO - 1), mulaiT = U.tambahHari(selesaiO, -2), selesai = U.tambahHari(mulaiT, durT - 1);
      var p = { id: id, kab: d[0], keg: d[1], poktan: d[2], ketua: d[3], desa: d[4], kec: d[5], luas: String(d[6]),
        no_cpcl: 'Contoh/SK-CPCL/2026 (Tahap I)', tgl_cpcl: '2026-02-02', diubah: waktu, oleh: 'demo' };
      if (tahap >= 1) Object.assign(p, { nik_ketua: kodeNIK[d[0]] + '0115058' + ('0000' + (100 + i)).slice(-5), bank: 'Bank Contoh', norek: '00' + (1234500 + i), namarek: d[2].toUpperCase(),
        no_spk: (i + 1) + '/SPK-HOK/2026', tgl_spk: U.tambahHari(mulai, -4), tempat_spk: 'Balai Desa ' + d[4], jalan_spk: 'Jl. Contoh No. ' + (i + 1), spk_sd: '2026-11-30',
        tgl_sptjm: U.tambahHari(mulai, -4), tgl_rukk: U.tambahHari(mulai, -3), mulai: U.tambahHari(mulai, -2), mulai_olah: mulai, selesai_olah: selesaiO, mulai_tanam: mulaiT, selesai: selesai });
      if (tahap >= 3) Object.assign(p, { tgl_lap: U.tambahHari(selesai, 1), no_bap: (i + 1) + '/BAP/2026', tgl_bap: U.tambahHari(selesai, 2), real_luas: String(d[6]) });
      if (tahap >= 4) Object.assign(p, { no_bast: (i + 1) + '/BAST/2026', tgl_bast: U.tambahHari(selesai, 4) });
      if (tahap >= 5) Object.assign(p, { no_kw: (i + 1) + '/KW/2026', tgl_kw: U.tambahHari(selesai, 6), tgl_tt: U.tambahHari(selesai, 8) });
      if (tahap >= 2) {
        var tO = d[6] * 15, tT = d[6] * 25, full = tahap >= 3;
        var olah = isiJenis(id, d, 'olah', mulai, durO, full ? tO : Math.round(tO * (0.7 + r() * 0.3)), []);
        // sebagian pekerja pengolahan ikut penanaman di tanggal setelah hari kerja pengolahannya
        isiJenis(id, d, 'tanam', mulaiT, durT, full ? tT : Math.round(tT * (0.2 + r() * 0.4)), olah.slice(0, 2));
      }
      return p;
    });
    // temuan contoh: NIK 15 digit dan pekerja yang tercatat di dua poktan pada tanggal yang sama
    var a = pekerja.filter(function (w) { return w.id_poktan === 'BTL-P001' && w.jenis === 'olah'; }), b = pekerja.filter(function (w) { return w.id_poktan === 'BTL-P002'; });
    if (a[2]) a[2].nik = a[2].nik.slice(0, 15);
    if (a[0] && b[0]) {
      var pB = poktan[1], tg = a[0].hadir.split(',').filter(function (x) { return x >= pB.mulai_olah && x <= pB.selesai_olah; }).slice(0, 2);
      if (tg.length) pekerja.push(Object.assign({}, a[0], { id: 'BTL-P002-O099', id_poktan: 'BTL-P002', diubah: '2026-10-02 09:00:00', hadir: tg.join(',') }));
    }
    poktan[1].upah_khusus = '110000';
    env.store.upsert('POKTAN', poktan);
    env.store.append('PEKERJA', pekerja);
  }

  return {
    KODE: KODE,
    handle: function (req) { if (!env) siapkan(); return HOK.handle(req, env); }
  };
})();
