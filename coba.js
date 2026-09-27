/* =================================================================
   DEVMODE.JS — HMTP Ewedan
   Dev Mode (tambah/edit/hapus berita, galeri, proyek) + GitHub

   ╔══════════════════════════════════════════════════════════════╗
   ║                  ⚡  KREDENSIAL DEV MODE  ⚡                ║
   ║   Ganti username & password di bawah sesuai keinginan Anda  ║
   ╠══════════════════════════════════════════════════════════════╣
   ║  DEV_USERNAME → 'admin'                                      ║
   ║  DEV_PASSWORD → 'hmtp2025'                                   ║
   ╚══════════════════════════════════════════════════════════════╝
================================================================= */

var DEV_USERNAME = 'admin';       // ← GANTI USERNAME DI SINI
var DEV_PASSWORD = 'hmtp2025';    // ← GANTI PASSWORD DI SINI

/* ================================================================
   GITHUB REPO CONFIG — HARDCODED
   Ubah nilai di bawah lalu upload ulang file ini ke repo.
   Token TIDAK disimpan di sini (agar tidak di-revoke GitHub).
   Token diisi 1x lewat tombol GitHub di Dev Badge → tersimpan lokal.
================================================================ */
var GH_REPO_CONFIG = {
  owner:    'faizfirdaus505',
  repo:     'hmtptest2',
  branch:   'main',
  pagesUrl: 'https://faizfirdaus505.github.io/hmtptest2/'
};

/* ================================================================ */

(function () {
  'use strict';

  var SESSION_KEY         = 'hmtp_dev_active';
  var GH_TOKEN_KEY        = 'hmtp_gh_token';   /* hanya token yang disimpan lokal */
  var PROYEK_DYN_KEY      = 'hmtp_proyek_dynamic';
  var PROYEK_STATIC_DEL   = 'hmtp_proyek_static_deleted'; /* FIX: kartu statis yg dihapus */
  var PROYEK_PER_PAGE     = 6;

  var isDevMode  = sessionStorage.getItem(SESSION_KEY) === '1';
  var clickCount = 0;
  var clickTimer = null;
  var proyekPage = 0;

  /* ──────────────────────────────────────────────────────────────
     GITHUB API
  ────────────────────────────────────────────────────────────── */
  function getGHConfig() {
    /* Repo config dari hardcoded GH_REPO_CONFIG, token dari localStorage */
    var token = '';
    try { token = localStorage.getItem(GH_TOKEN_KEY) || ''; } catch (e) {}
    return {
      token:    token,
      owner:    GH_REPO_CONFIG.owner,
      repo:     GH_REPO_CONFIG.repo,
      branch:   GH_REPO_CONFIG.branch   || 'main',
      pagesUrl: GH_REPO_CONFIG.pagesUrl || ''
    };
  }
  function saveGHConfig(cfg) {
    /* Hanya simpan token — repo config sudah hardcoded */
    try { if (cfg && cfg.token) localStorage.setItem(GH_TOKEN_KEY, cfg.token); } catch (e) {}
  }
  function ghHeaders(token) {
    return { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
  }
  async function ghGet(path) {
    var cfg = getGHConfig();
    if (!cfg.token || !cfg.owner || !cfg.repo) return null;
    try {
      var r = await fetch('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + path, { headers: ghHeaders(cfg.token) });
      return r.ok ? r.json() : null;
    } catch (e) { return null; }
  }
  async function ghGetSHA(path) { var d = await ghGet(path); return d ? d.sha : null; }
  function toBase64(str) {
    try { return btoa(unescape(encodeURIComponent(str))); } catch (e) { return btoa(str); }
  }
  async function ghPut(filePath, b64, message, sha) {
    var cfg = getGHConfig();
    if (!cfg.token || !cfg.owner || !cfg.repo) return null;
    var body = { message: message || 'Update ' + filePath, content: b64, branch: cfg.branch || 'main' };
    if (sha) body.sha = sha;
    try {
      var r = await fetch('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + filePath,
        { method: 'PUT', headers: ghHeaders(cfg.token), body: JSON.stringify(body) });
      return r.ok ? r.json() : null;
    } catch (e) { return null; }
  }
  async function ghPushJSON(filePath, data, msg) {
    var sha = await ghGetSHA(filePath);
    return ghPut(filePath, toBase64(JSON.stringify(data, null, 2)), msg || 'Update ' + filePath, sha);
  }
  async function ghUploadImage(id, dataUrl) {
    var cfg = getGHConfig();
    if (!cfg.token) return null;
    var ext  = (dataUrl.match(/^data:image\/([^;]+)/) || [,'jpg'])[1];
    var path = 'galeri/' + id + '.' + ext;
    var b64  = dataUrl.split(',')[1];
    var sha  = await ghGetSHA(path);
    var res  = await ghPut(path, b64, 'Upload foto ' + id, sha);
    if (!res) return null;
    var branch = cfg.branch || 'main';
    return cfg.pagesUrl
      ? cfg.pagesUrl.replace(/\/$/, '') + '/' + path
      : 'https://raw.githubusercontent.com/' + cfg.owner + '/' + cfg.repo + '/' + branch + '/' + path;
  }
  async function ghFetchRaw(path) {
    var cfg = getGHConfig();
    if (!cfg.owner || !cfg.repo) return null;
    var base = cfg.pagesUrl
      ? cfg.pagesUrl.replace(/\/$/, '')
      : 'https://raw.githubusercontent.com/' + cfg.owner + '/' + cfg.repo + '/' + (cfg.branch || 'main');
    try {
      var r = await fetch(base + '/' + path + '?t=' + Date.now());
      return r.ok ? r.json() : null;
    } catch (e) { return null; }
  }

  /* ──────────────────────────────────────────────────────────────
     GLOBAL hmtpGH
  ────────────────────────────────────────────────────────────── */
  window.hmtpGH = {
    isConfigured: function () { var c = getGHConfig(); return !!(c.token && c.owner && c.repo); },
    pushBerita: async function (data) {
      if (!isDevMode || !this.isConfigured()) return;
      showToast('Menyimpan berita ke GitHub…', 'info');
      /* FIX: upload base64 gambar ke GitHub sebagai file terpisah (sama dengan galeri) */
      var prepared = [];
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if (item.image && item.image.startsWith('data:')) {
          var cfg    = getGHConfig();
          var ext    = (item.image.match(/^data:image\/([^;]+)/) || [,'jpg'])[1];
          var path   = 'berita/' + item.id + '.' + ext;
          var b64    = item.image.split(',')[1];
          var sha    = await ghGetSHA(path);
          var res    = await ghPut(path, b64, 'Upload foto berita ' + item.id, sha);
          if (res) {
            var branch = cfg.branch || 'main';
            var url = cfg.pagesUrl
              ? cfg.pagesUrl.replace(/\/$/, '') + '/' + path
              : 'https://raw.githubusercontent.com/' + cfg.owner + '/' + cfg.repo + '/' + branch + '/' + path;
            prepared.push(Object.assign({}, item, { image: url }));
            try { localStorage.setItem('hmtp_berita', JSON.stringify(prepared.concat(data.slice(i + 1)))); } catch(e) {}
          } else {
            prepared.push(item);
          }
        } else {
          prepared.push(item);
        }
      }
      var ok = await ghPushJSON('data/berita.json', prepared, 'Update berita');
      showToast(ok ? '✓ Berita tersimpan ke GitHub' : '✗ Gagal simpan ke GitHub', ok ? 'ok' : 'err');
    },
    pushGaleri: async function (data) {
      if (!isDevMode || !this.isConfigured()) return;
      showToast('Menyimpan foto ke GitHub…', 'info');
      var prepared = [];
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if (item.src && item.src.startsWith('data:')) {
          var url = await ghUploadImage(item.id, item.src);
          prepared.push(url ? Object.assign({}, item, { src: url }) : item);
        } else { prepared.push(item); }
      }
      try { localStorage.setItem('hmtp_galeri', JSON.stringify(prepared)); } catch (e) {}
      var ok = await ghPushJSON('data/galeri.json', prepared, 'Update galeri');
      showToast(ok ? '✓ Galeri tersimpan ke GitHub' : '✗ Gagal simpan ke GitHub', ok ? 'ok' : 'err');
      return prepared;
    },
    pushProyek: async function (data) {
      if (!isDevMode || !this.isConfigured()) return;
      var ok = await ghPushJSON('data/proyek_dynamic.json', data, 'Update proyek');
      showToast(ok ? '✓ Proyek tersimpan ke GitHub' : '✗ Gagal simpan ke GitHub', ok ? 'ok' : 'err');
    },
    testConnection: async function (cfg) {
      try {
        var r = await fetch('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo, { headers: ghHeaders(cfg.token) });
        if (r.ok) { var d = await r.json(); return { ok: true, name: d.full_name }; }
        return { ok: false, status: r.status };
      } catch (e) { return { ok: false, status: 0 }; }
    },
    syncAll: async function () {
      var cfg = getGHConfig();
      if (!cfg.owner || !cfg.repo) return;
      var pairs = [
        { path: 'data/berita.json', key: 'hmtp_berita' },
        { path: 'data/galeri.json', key: 'hmtp_galeri' },
        { path: 'data/proyek_dynamic.json', key: PROYEK_DYN_KEY }
      ];
      for (var i = 0; i < pairs.length; i++) {
        var gh = await ghFetchRaw(pairs[i].path);
        if (gh && Array.isArray(gh)) { try { localStorage.setItem(pairs[i].key, JSON.stringify(gh)); } catch (e) {} }
      }
      if (window.hmtpRerender) {
        window.hmtpRerender.berita && window.hmtpRerender.berita();
        window.hmtpRerender.galeri && window.hmtpRerender.galeri();
      }
      renderDynamicProyek();
      updateAllCounts();
    }
  };
  window.devModeOpenProyek = function () { openProyekModal(null); };

  /* ──────────────────────────────────────────────────────────────
     TOAST
  ────────────────────────────────────────────────────────────── */
  function showToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'dev-toast dev-toast--' + (type || 'ok');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('is-visible'); }); });
    setTimeout(function () { t.classList.remove('is-visible'); setTimeout(function () { t.remove(); }, 420); }, 3200);
  }

  /* ──────────────────────────────────────────────────────────────
     DEV MODE ON/OFF
  ────────────────────────────────────────────────────────────── */
  function activateDevMode(withToast) {
    isDevMode = true;
    sessionStorage.setItem(SESSION_KEY, '1');
    document.body.classList.add('dev-mode');
    var badge = document.getElementById('devBadge');
    if (badge) badge.removeAttribute('aria-hidden');
    if (withToast) showToast('⚡ Dev Mode aktif', 'ok');
    updateAllCounts();
  }
  function deactivateDevMode() {
    isDevMode = false;
    sessionStorage.removeItem(SESSION_KEY);
    document.body.classList.remove('dev-mode');
    var badge = document.getElementById('devBadge');
    if (badge) badge.setAttribute('aria-hidden', 'true');
    showToast('Dev Mode dinonaktifkan', 'ok');
  }

  /* ──────────────────────────────────────────────────────────────
     COUNT BADGES
  ────────────────────────────────────────────────────────────── */
  function updateAllCounts() {
    updateBeritaCount();
    updateGaleriCount();
    updateProyekCount();
  }
  function updateBeritaCount() {
    var el = document.getElementById('beritaCount');
    if (!el) return;
    try {
      var data = JSON.parse(localStorage.getItem('hmtp_berita') || '[]');
      el.textContent = data.length || '';
    } catch (e) { el.textContent = ''; }
  }
  function updateGaleriCount() {
    var el = document.getElementById('galeriCount');
    if (!el) return;
    try {
      var data = JSON.parse(localStorage.getItem('hmtp_galeri') || '[]');
      el.textContent = data.length || '';
    } catch (e) { el.textContent = ''; }
  }
  function updateProyekCount() {
    var el = document.getElementById('proyekCount');
    if (!el) return;
    var grid = document.getElementById('proyekGrid');
    var n = grid ? grid.querySelectorAll('.proyek-card').length : 0;
    el.textContent = n || '';
  }
  /* Hook untuk script.js — dipanggil setelah berita/galeri render */
  window.hmtpOnRender = {
    berita: function () { updateBeritaCount(); },
    galeri: function () { updateGaleriCount(); }
  };

  /* ──────────────────────────────────────────────────────────────
     5-CLICK TRIGGER COPYRIGHT
  ────────────────────────────────────────────────────────────── */
  function initTrigger() {
    var trigger = document.getElementById('devTrigger');
    if (!trigger) return;
    trigger.addEventListener('click', function () {
      if (isDevMode) return;
      clickCount++;
      clearTimeout(clickTimer);
      trigger.style.opacity = String(0.3 + clickCount * 0.14);
      if (clickCount >= 5) {
        clickCount = 0; trigger.style.opacity = ''; openLoginModal();
      } else {
        clickTimer = setTimeout(function () { clickCount = 0; trigger.style.opacity = ''; }, 2800);
      }
    });
  }

  /* ──────────────────────────────────────────────────────────────
     LOGIN MODAL
  ────────────────────────────────────────────────────────────── */
  function openLoginModal() {
    var modal = document.getElementById('devLoginModal');
    if (!modal) return;
    modal.removeAttribute('aria-hidden'); modal.classList.add('is-open');
    document.documentElement.classList.add('no-scroll');
    setTimeout(function () { var inp = document.getElementById('devUsername'); if (inp) inp.focus(); }, 100);
  }
  function closeLoginModal() {
    var modal = document.getElementById('devLoginModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true'); modal.classList.remove('is-open');
    document.documentElement.classList.remove('no-scroll');
    var form = document.getElementById('devLoginForm'); if (form) form.reset();
    var err  = document.getElementById('devLoginError'); if (err)  err.textContent = '';
  }
  function initLoginModal() {
    var modal = document.getElementById('devLoginModal');
    var form  = document.getElementById('devLoginForm');
    if (!modal) return;
    var close = document.getElementById('devModalClose');
    var back  = document.getElementById('devModalBackdrop');
    if (close) close.addEventListener('click', closeLoginModal);
    if (back)  back.addEventListener('click',  closeLoginModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeLoginModal(); });
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var u = (document.getElementById('devUsername') || {}).value || '';
        var p = (document.getElementById('devPassword') || {}).value || '';
        if (u.trim() === DEV_USERNAME && p === DEV_PASSWORD) {
          closeLoginModal(); activateDevMode(true);
        } else {
          var err = document.getElementById('devLoginError');
          if (err) err.textContent = 'Username atau password salah.';
          form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
        }
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────
     DEV BADGE
  ────────────────────────────────────────────────────────────── */
  function initDevBadge() {
    var logout = document.getElementById('devLogoutBtn');
    var ghBtn  = document.getElementById('devGithubBtn');
    if (logout) logout.addEventListener('click', deactivateDevMode);
    if (ghBtn)  ghBtn.addEventListener('click',  openGithubModal);
  }

  /* ──────────────────────────────────────────────────────────────
     GITHUB SETTINGS MODAL
  ────────────────────────────────────────────────────────────── */
  function openGithubModal() {
    var modal = document.getElementById('devGithubModal');
    if (!modal) return;
    var cfg = getGHConfig();

    /* Helper: isi field biasa (editable) */
    var set = function (id, v) {
      var el = document.getElementById(id);
      if (el) el.value = v || '';
    };
    /* Helper: isi field readonly (hardcoded — tidak bisa diubah dari UI) */
    var setReadonly = function (id, v) {
      var el = document.getElementById(id);
      if (!el) return;
      el.value = v || '';
      el.setAttribute('readonly', 'readonly');
      el.style.opacity = '0.55';
      el.style.cursor  = 'not-allowed';
    };

    /* Token → editable (disimpan lokal, tidak ada di kode) */
    set('ghToken', cfg.token);

    /* Repo info → readonly dari GH_REPO_CONFIG */
    setReadonly('ghOwner',    cfg.owner);
    setReadonly('ghRepo',     cfg.repo);
    setReadonly('ghBranch',   cfg.branch);
    setReadonly('ghPagesUrl', cfg.pagesUrl);

    /* Pastikan tombol Simpan tampil (hanya untuk token) */
    var saveBtn   = document.getElementById('devGhSave');
    var cancelBtn = document.getElementById('devGhCancel');
    if (saveBtn)   { saveBtn.style.display   = ''; saveBtn.disabled = false; }
    if (cancelBtn)   cancelBtn.style.display = '';

    modal.removeAttribute('aria-hidden'); modal.classList.add('is-open');
    document.documentElement.classList.add('no-scroll');
  }
  function closeGithubModal() {
    var modal = document.getElementById('devGithubModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true'); modal.classList.remove('is-open');
    document.documentElement.classList.remove('no-scroll');
  }
  function initGithubModal() {
    var modal   = document.getElementById('devGithubModal');
    var saveBtn = document.getElementById('devGhSave');
    var testBtn = document.getElementById('devGhTest');
    var status  = document.getElementById('devGhTestStatus');
    if (!modal) return;
    ['devGhClose','devGhBackdrop','devGhCancel'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.addEventListener('click', closeGithubModal);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeGithubModal(); });
    /* Simpan hanya token — repo config diambil dari GH_REPO_CONFIG (hardcoded) */
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var tokenEl = document.getElementById('ghToken');
        var token   = tokenEl ? tokenEl.value.trim() : '';
        if (!token) { showToast('✗ Masukkan Personal Access Token dulu', 'err'); return; }
        saveGHConfig({ token: token });
        closeGithubModal();
        showToast('✓ Token GitHub tersimpan', 'ok');
      });
    }
    if (testBtn) {
      testBtn.addEventListener('click', async function () {
        /* Token dari input (yang baru diketik), repo info dari GH_REPO_CONFIG */
        var tokenEl = document.getElementById('ghToken');
        var cfg = {
          token:  tokenEl ? tokenEl.value.trim() : getGHConfig().token,
          owner:  GH_REPO_CONFIG.owner,
          repo:   GH_REPO_CONFIG.repo,
          branch: GH_REPO_CONFIG.branch || 'main'
        };
        if (!cfg.token) { if (status) { status.textContent = '✗ Masukkan token dulu'; status.className = 'dev-gh-status dev-gh-status--err'; } return; }
        if (!cfg.owner || !cfg.repo) { if (status) { status.textContent = '✗ GH_REPO_CONFIG belum diisi di devmode.js'; status.className = 'dev-gh-status dev-gh-status--err'; } return; }
        testBtn.disabled = true; testBtn.textContent = 'Menghubungkan…';
        if (status) { status.textContent = ''; status.className = 'dev-gh-status'; }
        var res = await window.hmtpGH.testConnection(cfg);
        testBtn.disabled = false; testBtn.textContent = 'TEST KONEKSI';
        if (res.ok) { if (status) { status.textContent = '✓ Terhubung ke ' + res.name; status.className = 'dev-gh-status dev-gh-status--ok'; } }
        else {
          var msg = res.status === 401 ? '✗ Token tidak valid' : res.status === 404 ? '✗ Repo tidak ditemukan' : '✗ Gagal terhubung';
          if (status) { status.textContent = msg; status.className = 'dev-gh-status dev-gh-status--err'; }
        }
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────
     PROYEK — DATA DINAMIS
  ────────────────────────────────────────────────────────────── */
  function loadDynProyek() {
    try { return JSON.parse(localStorage.getItem(PROYEK_DYN_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveDynProyek(data) {
    try { localStorage.setItem(PROYEK_DYN_KEY, JSON.stringify(data)); } catch (e) {}
    window.hmtpGH.pushProyek(data);
  }
  function uid() { return 'dp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* FIX: static proyek delete tracking */
  function getDeletedStatic() {
    try { return JSON.parse(localStorage.getItem(PROYEK_STATIC_DEL) || '[]'); } catch (e) { return []; }
  }
  function saveDeletedStatic(arr) {
    try { localStorage.setItem(PROYEK_STATIC_DEL, JSON.stringify(arr)); } catch (e) {}
  }
  function applyDeletedStatic(grid) {
    var deleted = getDeletedStatic();
    if (!deleted.length) return;
    deleted.forEach(function (id) {
      var card = grid.querySelector('.proyek-card:not(.proyek-card--dynamic)[data-proyek-id="' + id + '"]');
      if (card) card.remove();
    });
  }

  function renderDynamicProyek() {
    var grid = document.getElementById('proyekGrid');
    if (!grid) return;
    grid.querySelectorAll('.proyek-card--dynamic').forEach(function (c) { c.remove(); });
    var items = loadDynProyek();
    items.forEach(function (p, i) {
      var card = document.createElement('article');
      card.className = 'proyek-card proyek-card--dynamic';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Proyek: ' + p.title);
      var imgContent = p.imageSrc
        ? '<img src="' + p.imageSrc + '" alt="' + p.title + '" style="width:100%;height:100%;object-fit:cover;opacity:.5;">'
        : '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.1"><path d="M18 4L4 11v14l14 7 14-7V11L18 4z"/><path d="M4 11l14 7 14-7"/><line x1="18" y1="18" x2="18" y2="32"/></svg>';
      card.innerHTML =
        '<div class="proyek-card__bg" style="background:' + (p.color || '#0a0a1a') + '">' + imgContent + '</div>' +
        '<div class="proyek-card__overlay"></div>' +
        '<span class="proyek-card__tag">' + (p.prodi || 'DEA') + '</span>' +
        '<div class="proyek-card__info"><p class="proyek-card__name">' + p.title + '</p>' +
        '<p class="proyek-card__author">' + (p.author || '') + '</p></div>' +
        '<div class="proyek-card__dev-acts dev-btn" style="display:none">' +
        '<button class="proyek-card__dev-btn proyek-card__dev-btn--edit" type="button" title="Edit">&#9998;</button>' +
        '<button class="proyek-card__dev-btn proyek-card__dev-btn--del" type="button" title="Hapus">&times;</button></div>';

      /* Show/hide dev actions in dev mode */
      var devActs = card.querySelector('.proyek-card__dev-acts');

      card.addEventListener('mouseenter', function () {
        if (isDevMode && devActs) devActs.style.display = 'flex';
      });
      card.addEventListener('mouseleave', function () {
        if (devActs) devActs.style.display = 'none';
      });

      var editBtn = card.querySelector('.proyek-card__dev-btn--edit');
      var delBtn  = card.querySelector('.proyek-card__dev-btn--del');
      if (editBtn) editBtn.addEventListener('click', (function (pid) { return function (e) { e.stopPropagation(); openProyekModal(pid); }; }(p.id)));
      if (delBtn)  delBtn.addEventListener('click',  (function (pid) { return function (e) {
        e.stopPropagation();
        if (!confirm('Hapus proyek "' + p.title + '"?')) return;
        var arr = loadDynProyek().filter(function (x) { return x.id !== pid; });
        saveDynProyek(arr); renderDynamicProyek(); paginateProyekGrid(); updateProyekCount();
      }; }(p.id)));

      /* Klik kartu → buka modal proyek yang sama dengan proyek statis */
      card.addEventListener('click', (function (proj, idx) {
        return function (e) {
          if (e.target.closest('.proyek-card__dev-acts')) return;
          if (window.proyekOpenModal) {
            window.proyekOpenModal({
              num:    String(idx + 1).padStart(2, '0'),
              prodi:  proj.prodi  || 'DEA',
              title:  proj.title,
              author: proj.author || '',
              desc:   proj.desc   || '',
              color:  proj.color  || '#0a0a1a',
              media:  proj.imageSrc
                ? [{ type: 'image', src: proj.imageSrc, label: proj.title }]
                : [{ type: 'placeholder', icon: 'cube', label: proj.title }]
            });
          }
        };
      }(p, i)));
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });

      /* blur-in on intersect */
      if ('IntersectionObserver' in window) {
        card.style.opacity = '0'; card.style.transform = 'translateY(16px)'; card.style.transition = 'opacity .4s ease, transform .4s ease';
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { e.target.style.opacity = ''; e.target.style.transform = ''; io.unobserve(e.target); } });
        }, { threshold: 0.1 });
        io.observe(card);
      }
      grid.appendChild(card);
    });

    paginateProyekGrid();
    updateProyekCount();
  }

  /* ──────────────────────────────────────────────────────────────
     PROYEK PAGINATION — max 6 per halaman (3+3)
  ────────────────────────────────────────────────────────────── */
  function paginateProyekGrid() {
    var grid    = document.getElementById('proyekGrid');
    var pagNav  = document.getElementById('proyekPagination');
    var prevBtn = document.getElementById('proyekPagPrev');
    var nextBtn = document.getElementById('proyekPagNext');
    var info    = document.getElementById('proyekPagInfo');
    if (!grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.proyek-card'));
    var total = cards.length;
    var pages = Math.max(1, Math.ceil(total / PROYEK_PER_PAGE));

    /* Clamp current page */
    proyekPage = Math.min(proyekPage, pages - 1);

    /* Assign data-page and show/hide */
    cards.forEach(function (card, i) {
      var page = Math.floor(i / PROYEK_PER_PAGE);
      card.setAttribute('data-pag-page', page);
      card.style.display = (page === proyekPage) ? '' : 'none';
    });

    /* Show/hide pagination nav */
    if (pagNav) {
      pagNav.removeAttribute('aria-hidden');
      pagNav.style.display = (pages > 1) ? 'flex' : 'none';
    }

    if (info) info.textContent = (proyekPage + 1) + ' / ' + pages;
    if (prevBtn) prevBtn.disabled = (proyekPage <= 0);
    if (nextBtn) nextBtn.disabled = (proyekPage >= pages - 1);

    /* Trigger p-in animation on visible cards */
    cards.forEach(function (card) {
      if (card.getAttribute('data-pag-page') === String(proyekPage)) {
        card.classList.remove('p-in'); void card.offsetWidth;
        requestAnimationFrame(function () { card.classList.add('p-in'); });
      } else {
        card.classList.remove('p-in');
      }
    });
  }

  function initProyekPagination() {
    var prevBtn = document.getElementById('proyekPagPrev');
    var nextBtn = document.getElementById('proyekPagNext');
    if (prevBtn) prevBtn.addEventListener('click', function () {
      proyekPage = Math.max(0, proyekPage - 1); paginateProyekGrid();
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      var grid  = document.getElementById('proyekGrid');
      var total = grid ? grid.querySelectorAll('.proyek-card').length : 0;
      var pages = Math.ceil(total / PROYEK_PER_PAGE);
      proyekPage = Math.min(pages - 1, proyekPage + 1); paginateProyekGrid();
    });
  }

  /* ──────────────────────────────────────────────────────────────
     PROYEK MODAL (Tambah / Edit)
  ────────────────────────────────────────────────────────────── */
  var editingProyekId = null;
  var proyekImageSrc  = null; /* base64 atau URL hasil pilih file */

  function openProyekModal(id) {
    var modal = document.getElementById('devProyekModal');
    if (!modal) return;
    editingProyekId = id || null;
    proyekImageSrc  = null;

    var heading = document.getElementById('devProyekHeading');
    if (heading) heading.textContent = id ? 'Edit Proyek' : 'Tambah Proyek';

    var form = document.getElementById('devProyekForm');
    if (form && !id) form.reset();

    if (id) {
      var items = loadDynProyek();
      var item  = items.find(function (x) { return x.id === id; });
      if (item) {
        var sv = function (eid, v) { var el = document.getElementById(eid); if (el) el.value = v || ''; };
        sv('dpTitle', item.title); sv('dpAuthor', item.author); sv('dpDesc', item.desc);
        sv('dpProdi', item.prodi); sv('dpColor', item.color || '#0a0a1a'); sv('dpImageUrl', item.imageUrl || '');
        proyekImageSrc = item.imageSrc || null;
        var prev = document.getElementById('dpPreviewImg');
        var inner = document.getElementById('dpUploadInner');
        if (prev && proyekImageSrc) { prev.src = proyekImageSrc; prev.style.display = 'block'; if (inner) inner.style.display = 'none'; }
      }
    } else {
      resetUploadArea();
    }

    modal.removeAttribute('aria-hidden'); modal.classList.add('is-open');
    document.documentElement.classList.add('no-scroll');
    setTimeout(function () { var inp = document.getElementById('dpTitle'); if (inp) inp.focus(); }, 80);
  }
  function closeProyekModal() {
    var modal = document.getElementById('devProyekModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true'); modal.classList.remove('is-open');
    document.documentElement.classList.remove('no-scroll');
    editingProyekId = null; proyekImageSrc = null;
  }
  function resetUploadArea() {
    var prev  = document.getElementById('dpPreviewImg');
    var inner = document.getElementById('dpUploadInner');
    var inp   = document.getElementById('dpImageFile');
    if (prev)  { prev.style.display = 'none'; prev.src = ''; }
    if (inner) inner.style.display = '';
    if (inp)   inp.value = '';
    proyekImageSrc = null;
  }

  function initProyekModal() {
    var modal    = document.getElementById('devProyekModal');
    var form     = document.getElementById('devProyekForm');
    var fileInp  = document.getElementById('dpImageFile');
    var upArea   = document.getElementById('dpUploadArea');
    var prevImg  = document.getElementById('dpPreviewImg');
    var upInner  = document.getElementById('dpUploadInner');

    if (!modal) return;

    ['devProyekClose','devProyekBackdrop','devProyekCancel'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.addEventListener('click', closeProyekModal);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeProyekModal(); });

    /* File upload handling */
    if (upArea && fileInp) {
      upArea.addEventListener('click', function (e) { if (e.target !== prevImg) fileInp.click(); });
      upArea.addEventListener('dragover',  function (e) { e.preventDefault(); upArea.classList.add('drag-over'); });
      upArea.addEventListener('dragleave', function ()  { upArea.classList.remove('drag-over'); });
      upArea.addEventListener('drop', function (e) {
        e.preventDefault(); upArea.classList.remove('drag-over');
        var file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleProyekFile(file, prevImg, upInner);
      });
      fileInp.addEventListener('change', function () {
        if (fileInp.files[0]) handleProyekFile(fileInp.files[0], prevImg, upInner);
      });
    }
    if (prevImg) {
      prevImg.addEventListener('click', function (e) { e.stopPropagation(); resetUploadArea(); });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
        var title = g('dpTitle'); if (!title) { showToast('Isi judul proyek dulu!', 'err'); return; }

        var imageUrl = proyekImageSrc || g('dpImageUrl') || '';

        var items = loadDynProyek();
        if (editingProyekId) {
          var item = items.find(function (x) { return x.id === editingProyekId; });
          if (item) {
            item.title = title; item.author = g('dpAuthor'); item.desc = g('dpDesc');
            item.prodi = g('dpProdi'); item.color = g('dpColor');
            if (imageUrl) { item.imageSrc = imageUrl; item.imageUrl = imageUrl; }
          }
        } else {
          items.push({ id: uid(), title: title, author: g('dpAuthor'), desc: g('dpDesc'),
            prodi: g('dpProdi') || 'DEA', color: g('dpColor') || '#0a0a1a',
            imageSrc: imageUrl, imageUrl: imageUrl });
        }
        saveDynProyek(items);
        closeProyekModal();
        renderDynamicProyek();
        showToast('✓ Proyek ' + (editingProyekId ? 'diperbarui' : 'ditambahkan'), 'ok');
      });
    }
  }

  function handleProyekFile(file, prevImg, upInner) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      proyekImageSrc = ev.target.result;
      if (prevImg) { prevImg.src = proyekImageSrc; prevImg.style.display = 'block'; }
      if (upInner) upInner.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  /* ──────────────────────────────────────────────────────────────
     FIX: STATIC PROYEK — Edit & Hapus kartu template
  ────────────────────────────────────────────────────────────── */
  function initStaticProyekActions() {
    var grid = document.getElementById('proyekGrid');
    if (!grid) return;

    /* Sembunyikan kartu statis yang sudah dihapus sebelumnya */
    applyDeletedStatic(grid);

    /* Pasang tombol edit/hapus ke semua kartu statis (non-dynamic) */
    var staticCards = grid.querySelectorAll('.proyek-card:not(.proyek-card--dynamic)');
    staticCards.forEach(function (card) {
      var pid = card.getAttribute('data-proyek-id');
      if (!pid) return;

      /* Buat overlay dev-actions (sama dengan dynamic) */
      var devActs = document.createElement('div');
      devActs.className = 'proyek-card__dev-acts';
      devActs.style.display = 'none';
      devActs.innerHTML =
        '<button class="proyek-card__dev-btn proyek-card__dev-btn--edit" type="button" title="Edit">&#9998;</button>' +
        '<button class="proyek-card__dev-btn proyek-card__dev-btn--del"  type="button" title="Hapus">&times;</button>';
      card.appendChild(devActs);

      /* Tampilkan saat hover (hanya di dev mode) */
      card.addEventListener('mouseenter', function () {
        if (isDevMode) devActs.style.display = 'flex';
      });
      card.addEventListener('mouseleave', function () {
        devActs.style.display = 'none';
      });

      var editBtn = devActs.querySelector('.proyek-card__dev-btn--edit');
      var delBtn  = devActs.querySelector('.proyek-card__dev-btn--del');

      /* ── EDIT: konversi kartu statis → dinamis lalu buka modal ── */
      if (editBtn) {
        editBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var staticData = window.hmtpProyekStaticData || [];
          var item = staticData.find(function (x) { return x.id === pid; });
          if (!item) return;

          /* Tambahkan ke daftar dinamis jika belum ada */
          var dynItems = loadDynProyek();
          if (!dynItems.find(function (x) { return x.id === pid; })) {
            dynItems.push({
              id:       pid,
              title:    item.title,
              author:   item.author  || '',
              desc:     item.desc    || '',
              prodi:    item.prodi   || 'DEA',
              color:    item.color   || '#0a0a1a',
              imageSrc: '',
              imageUrl: ''
            });
            saveDynProyek(dynItems);
          }

          /* Tandai statis sebagai "dihapus" supaya tidak muncul lagi */
          var deleted = getDeletedStatic();
          if (deleted.indexOf(pid) === -1) { deleted.push(pid); saveDeletedStatic(deleted); }
          card.remove();

          /* Render ulang dinamis (termasuk kartu yang baru dikonversi) */
          renderDynamicProyek();
          openProyekModal(pid);
        });
      }

      /* ── HAPUS: simpan ID ke daftar deleted, lalu remove dari DOM ── */
      if (delBtn) {
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var staticData = window.hmtpProyekStaticData || [];
          var item = staticData.find(function (x) { return x.id === pid; });
          var title = item ? item.title : 'proyek ini';
          if (!confirm('Hapus proyek "' + title + '"?')) return;
          var deleted = getDeletedStatic();
          if (deleted.indexOf(pid) === -1) { deleted.push(pid); saveDeletedStatic(deleted); }
          card.remove();
          paginateProyekGrid();
          updateProyekCount();
        });
      }
    });
  }

  /* ──────────────────────────────────────────────────────────────
     INISIALISASI
  ────────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (isDevMode) activateDevMode(false);

    initTrigger();
    initLoginModal();
    initDevBadge();
    initGithubModal();
    initProyekModal();
    initProyekPagination();

    /* Tunggu sedikit agar script.js selesai render proyek dulu */
    setTimeout(function () {
      initStaticProyekActions(); /* FIX: pasang edit/hapus di kartu statis */
      renderDynamicProyek();     /* ini juga memanggil paginateProyekGrid() */
      updateAllCounts();
      window.hmtpGH.syncAll();
    }, 150);
  });

}());
