/* Penghubung ke server Apps Script (atau ke server tiruan di browser saat mode demo) */
var API = (function () {
  'use strict';
  var CFG = window.HOK_CONFIG || {};
  var qs = new URLSearchParams(location.search);
  var demo = !CFG.API_URL || qs.has('demo');
  var KUNCI = demo ? 'hok1525_demo_sesi' : 'hok1525_sesi'; // beda dari sistem HOK 40 (domain github.io sama)

  function simpanSesi(s) { try { if (s) localStorage.setItem(KUNCI, JSON.stringify(s)); else localStorage.removeItem(KUNCI); } catch (e) { /* abaikan */ } }
  function bacaSesi() { try { return JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch (e) { return null; } }
  var sesi = bacaSesi();

  function kirim(body) {
    if (demo) {
      return new Promise(function (ok) {
        setTimeout(function () { ok(JSON.parse(JSON.stringify(DEMO.handle(JSON.parse(JSON.stringify(body)))))); }, 120);
      });
    }
    // text/plain agar tidak ada preflight CORS; Apps Script membaca e.postData.contents
    // penanda unik per permintaan agar jawaban tidak pernah tertukar atau diambil dari cache
    var url = CFG.API_URL + (CFG.API_URL.indexOf('?') < 0 ? '?' : '&') + 'r=' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return fetch(url, { method: 'POST', body: JSON.stringify(body), redirect: 'follow', cache: 'no-store' })
      .then(function (r) {
        if (r.status === 429) return JSON.stringify({ ok: false, kode: 'SIBUK', pesan: 'Server sedang menerima terlalu banyak permintaan. Coba lagi sebentar.' });
        if (!r.ok) throw new Error('Server menjawab ' + r.status);
        return r.text();
      })
      .then(function (t) {
        try { return JSON.parse(t); } catch (e) { throw new Error('Jawaban server tidak dikenali. Periksa URL Apps Script dan izin akses "Siapa saja".'); }
      });
  }

  // SIBUK = permintaan belum diproses sama sekali (antrean penuh), jadi aman dikirim ulang otomatis
  function kirimUlang(body, ke) {
    return kirim(body).then(function (res) {
      if (res && !res.ok && res.kode === 'SIBUK' && ke < 3) {
        return new Promise(function (ok) { setTimeout(ok, 2000 * (ke + 1) + Math.random() * 1500); }).then(function () { return kirimUlang(body, ke + 1); });
      }
      return res;
    });
  }

  function panggil(action, params) {
    var body = Object.assign({ action: action, token: sesi ? sesi.token : '' }, params || {});
    return kirimUlang(body, 0).then(function (res) {
      if (!res.ok && res.kode === 'SESI') {
        sesi = null; simpanSesi(null);
        if (location.hash !== '#/masuk') location.hash = '#/masuk';
      }
      return res;
    }, function (e) {
      return { ok: false, kode: 'JARINGAN', pesan: 'Tidak dapat terhubung ke server: ' + e.message };
    });
  }

  function masuk(kode) {
    return kirim({ action: 'login', kode: kode }).then(function (res) {
      if (res.ok) { sesi = res.data; simpanSesi(sesi); }
      return res;
    }, function (e) { return { ok: false, kode: 'JARINGAN', pesan: 'Tidak dapat terhubung ke server: ' + e.message }; });
  }

  function keluar() {
    var t = sesi && sesi.token;
    sesi = null; simpanSesi(null);
    if (t) kirim({ action: 'logout', token: t }).catch(function () {});
  }

  return {
    demo: demo,
    panggil: panggil, masuk: masuk, keluar: keluar,
    sesi: function () { return sesi; }
  };
})();
