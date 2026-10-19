/*
 * Lingkungan tiruan di memori untuk mode demo (browser) dan pengujian.
 * Antarmuka sama dengan adapter Google Sheets/Drive di Apps Script.
 */
var HOKMem = (function () {
  'use strict';
  function MemoryStore(tabel) {
    var data = {};
    Object.keys(tabel).forEach(function (t) { data[t] = []; });
    function kunci(t) { return tabel[t][0]; }
    function salin(r, t) { var o = {}; tabel[t].forEach(function (k) { o[k] = r[k] === undefined || r[k] === null ? '' : String(r[k]); }); return o; }
    return {
      all: function (t) { return data[t].map(function (r) { return Object.assign({}, r); }); },
      upsert: function (t, rows) {
        var k = kunci(t);
        rows.forEach(function (r) {
          var o = salin(r, t), i = -1;
          for (var j = 0; j < data[t].length; j++) if (data[t][j][k] === o[k]) { i = j; break; }
          if (i >= 0) data[t][i] = o; else data[t].push(o);
        });
      },
      append: function (t, rows) { rows.forEach(function (r) { data[t].push(salin(r, t)); }); },
      remove: function (t, keys) { var k = kunci(t), set = {}; keys.forEach(function (x) { set[x] = 1; }); data[t] = data[t].filter(function (r) { return !set[r[k]]; }); },
      _dump: function () { return data; }
    };
  }

  function MemoryFiles() {
    var folders = { root: { name: 'HOK_Tebu_15_25_2026', parent: null } }, files = {}, n = 0;
    function id(p) { n++; return p + n; }
    function child(parent, name) {
      for (var k in folders) if (folders[k].parent === parent && folders[k].name === name) return k;
      var nid = id('fd'); folders[nid] = { name: name, parent: parent }; return nid;
    }
    return {
      ensureFolder: function (path, subs) {
        var f = 'root';
        path.forEach(function (nm) { f = child(f, nm); });
        (subs || []).forEach(function (sb) { child(f, sb); });
        return f;
      },
      save: function (folderId, sub, name, mime, b64, desc, replacePrefix) {
        var sf = child(folderId, sub);
        Object.keys(files).forEach(function (k) {
          var f = files[k];
          if (f.parent === sf && !f.trashed && (f.name === name || (replacePrefix && f.name.indexOf(replacePrefix) === 0))) f.trashed = true;
        });
        var fid = id('fl');
        files[fid] = { name: name, mime: mime, b64: b64, desc: desc || '', parent: sf, created: new Date().toISOString(), size: Math.round(b64.length * 0.75) };
        return { id: fid, name: name };
      },
      list: function (folderId) {
        var out = [];
        Object.keys(files).forEach(function (k) {
          var f = files[k]; if (f.trashed) return;
          var sf = folders[f.parent];
          if (f.parent === folderId) out.push({ id: k, name: f.name, sub: '', size: f.size, mime: f.mime, created: f.created, desc: f.desc });
          else if (sf && sf.parent === folderId) out.push({ id: k, name: f.name, sub: sf.name, size: f.size, mime: f.mime, created: f.created, desc: f.desc });
        });
        return out;
      },
      owner: function (fileId) {
        var f = files[fileId]; if (!f || f.trashed) return null;
        var sf = folders[f.parent];
        return { poktanFolderId: sf && /^\d_/.test(sf.name) ? sf.parent : f.parent };
      },
      read: function (fileId) { var f = files[fileId]; return { name: f.name, mime: f.mime, base64: f.b64 }; },
      trash: function (fileId) { if (files[fileId]) files[fileId].trashed = true; },
      _dump: function () { return { folders: folders, files: files }; }
    };
  }

  function MemoryCache() {
    var c = {};
    return {
      get: function (k) { var e = c[k]; if (!e) return null; if (e.exp < Date.now()) { delete c[k]; return null; } return e.v; },
      put: function (k, v, ttl) { c[k] = { v: String(v), exp: Date.now() + (ttl || 600) * 1000 }; },
      remove: function (k) { delete c[k]; }
    };
  }

  function randomBytes(n) {
    var a = [];
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) { var u = new Uint8Array(n); crypto.getRandomValues(u); for (var i = 0; i < n; i++) a.push(u[i]); return a; }
    for (var j = 0; j < n; j++) a.push(Math.floor(Math.random() * 256));
    return a;
  }
  function uuid() {
    var b = randomBytes(16), h = b.map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function buatEnv(HOK) {
    return { store: MemoryStore(HOK.TABEL), files: MemoryFiles(), cache: MemoryCache(), lock: function (fn) { return fn(); },
      now: function () { return new Date(); }, uuid: uuid, randomBytes: randomBytes };
  }
  return { MemoryStore: MemoryStore, MemoryFiles: MemoryFiles, MemoryCache: MemoryCache, buatEnv: buatEnv, uuid: uuid, randomBytes: randomBytes };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HOKMem;
