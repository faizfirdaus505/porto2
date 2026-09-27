/* ================================================================
   FAIZ PORTFOLIO — script.js  (versi final)
   ================================================================
   PERUBAHAN UTAMA:
   - Animasi loading: CLONE nav logo asli → zoom besar di tengah
     → typewriter → shrink kembali ke posisi nav (pixel-perfect)
   - GitHub button ditambahkan via JS (tidak butuh ubah HTML)
   - Semua element access dicek null-safe (tidak ada crash lagi)
   ================================================================ */


/* ================================================================
   00. CUSTOM DIALOG — Pengganti prompt() / confirm()
   ================================================================ */
function showCustomDialog(type, message, defaultVal = '') {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
    const box = document.createElement('div');
    box.style.cssText = 'background:#111;border:1px solid rgba(255,187,0,0.4);border-radius:14px;padding:36px 40px;width:min(400px,90vw);font-family:gothic,Arial;letter-spacing:2px;color:#fff;';
    const msg = document.createElement('p');
    msg.textContent = message;
    msg.style.cssText = 'font-size:.82rem;color:rgba(255,255,255,.8);margin-bottom:22px;line-height:1.7;white-space:pre-line;';
    box.appendChild(msg);
    const close = r => { if (document.body.contains(ov)) document.body.removeChild(ov); resolve(r); };
    const mk = (txt, gold) => {
      const b = document.createElement('button');
      b.textContent = txt;
      b.style.cssText = gold
        ? 'background:#ffbb00;color:#000;border:none;padding:9px 28px;border-radius:7px;cursor:pointer;font-size:.68rem;letter-spacing:3px;font-weight:bold;'
        : 'background:none;border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.5);padding:9px 22px;border-radius:7px;cursor:pointer;font-size:.68rem;letter-spacing:3px;';
      return b;
    };
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
    if (type === 'prompt') {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.value = defaultVal; inp.placeholder = 'Ketik di sini...';
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:11px 14px;color:#fff;font-size:.85rem;outline:none;margin-bottom:20px;font-family:inherit;letter-spacing:0;';
      inp.onfocus = () => inp.style.borderColor = '#ffbb00';
      inp.onblur  = () => inp.style.borderColor = 'rgba(255,255,255,.18)';
      const can = mk('CANCEL', false), ok = mk('OK', true);
      can.onclick = () => close(null);
      ok.onclick  = () => close(inp.value.trim() || null);
      inp.onkeydown = e => { if(e.key==='Enter') ok.click(); if(e.key==='Escape') close(null); };
      box.appendChild(inp); row.appendChild(can); row.appendChild(ok); box.appendChild(row);
      ov.appendChild(box); document.body.appendChild(ov); setTimeout(() => inp.focus(), 60);
    } else {
      const can = mk('CANCEL', false), ok = mk('OK', true);
      can.onclick = () => close(false); ok.onclick = () => close(true);
      ov.setAttribute('tabindex','0');
      ov.onkeydown = e => { if(e.key==='Enter') close(true); if(e.key==='Escape') close(false); };
      row.appendChild(can); row.appendChild(ok); box.appendChild(row);
      ov.appendChild(box); document.body.appendChild(ov); setTimeout(() => ov.focus(), 60);
    }
  });
}
const customPrompt  = (msg, def) => showCustomDialog('prompt',  msg, def);
const customConfirm = msg         => showCustomDialog('confirm', msg);


/* ================================================================
   01. KONSTANTA & DEFAULT DATA
   ================================================================ */
const DEV_USER = 'faizdev';
const DEV_PASS = 'wakadubret05';

const CYCLE_WORDS    = ['Inovation','Precision','Evolution','Ambition','Creation'];
const CYCLE_INTERVAL = 3000;

const DEFAULT_DATA = {
  categories:[
    { id:'cad',     title:'CAD & Mechanical Design', type:'mixed', projects:[
      {src:'img/7.png',lbl:'Mechanical Assembly 01',type:'image',modelId:null},
      {src:'img/8.png',lbl:'Mechanical Assembly 02',type:'image',modelId:null},
      {src:'img/9.png',lbl:'Machine Component 01',  type:'image',modelId:null},
    ]},
    { id:'digital', title:'Digital Art',              type:'image', projects:[
      {src:'img/4.jpg',lbl:'Digital Art 01',type:'image'},
      {src:'img/5.png',lbl:'Digital Art 02',type:'image'},
    ]},
    { id:'graphic', title:'Graphic Design',           type:'image', projects:[
      {src:'img/1.png',lbl:'Graphic Design 01',type:'image'},
      {src:'img/2.png',lbl:'Graphic Design 02',type:'image'},
      {src:'img/3.png',lbl:'Graphic Design 03',type:'image'},
    ]},
    { id:'web',     title:'Front-End Development',    type:'image', projects:[
      {src:'img/6.png',lbl:'Web Project 01',type:'image'},
    ]},
  ],
  skills:[
    {title:'Mechanical Design', desc:'Designing efficient mechanical systems through engineering principles.',              items:['Mechanical Design','Machine Design','Manufacturing Process','SolidWorks','AutoCAD 2D&3D','Technical Drawing']},
    {title:'Digital Artist',    desc:'Transforming imagination into detailed illustrations with strong visual storytelling.',items:['Concept Art','Character Design','Digital Painting','Paint Tool Sai2']},
    {title:'Graphic Design',    desc:'Crafting impactful visual communication through branding, layout, and digital media.',items:['Branding','Poster Design','Social Media Design','Typography','Photo Manipulation','Photoshop']},
    {title:'Front-End Learner', desc:'Building responsive web interfaces while expanding front-end development knowledge.', items:['HTML','CSS','Responsive Design','UI Layout']},
  ],
  socials:[
    {name:'Instagram',url:'https://www.instagram.com/faiz_qoiz/',ico:'IG'},
    {name:'LinkedIn', url:'https://www.linkedin.com/in/muhammad-faiz-firdaus-286714258/',ico:'LI'},
  ],
  texts:{}
};

let ST      = JSON.parse(JSON.stringify(DEFAULT_DATA));
let cursors = [];


/* ================================================================
   02. GITHUB API
   ================================================================ */
/* Konfigurasi repo GitHub — owner/repo/branch/pagesUrl BUKAN rahasia,
   jadi aman ditulis langsung di source. Ganti sesuai repo kamu.
   Dengan ini SEMUA perangkat (termasuk pengunjung biasa) otomatis tahu
   harus baca data.json dari mana — tidak perlu isi GitHub Settings
   satu-satu di tiap perangkat hanya untuk MELIHAT update. */
const GH_REPO_CONFIG = {
  owner:    'faizfirdaus505',                 // ganti dengan username GitHub kamu
  repo:     'porto2',              // ganti dengan nama repo kamu
  branch:   'main',
  pagesUrl: 'https://faizfirdaus505.github.io/porto2/'
};

let GH = { ...GH_REPO_CONFIG };
try {
  const saved = JSON.parse(localStorage.getItem('gh_settings') || '{}');
  GH = { ...GH_REPO_CONFIG, ...saved };  // token (rahasia) tetap dari localStorage per-perangkat
} catch(e) {}

/* Baca data.json: repo publik, TIDAK butuh token → otomatis siap di semua perangkat */
const ghCanRead  = () => !!(GH.owner && GH.repo && GH.branch);
/* Simpan/upload ke repo: butuh token pribadi → tetap harus diisi manual per-perangkat demi keamanan */
const ghCanWrite = () => !!(GH.token && GH.owner && GH.repo && GH.branch);

function toB64(str) {
  const b = new TextEncoder().encode(str);
  return btoa(Array.from(b, c => String.fromCharCode(c)).join(''));
}

async function ghAPI(method, path, body) {
  const res = await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path}`, {
    method,
    headers:{ 'Authorization':`token ${GH.token}`, 'Content-Type':'application/json', 'Accept':'application/vnd.github.v3+json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(`GitHub ${res.status}: ${e.message||res.statusText}`); }
  return res.json();
}

async function ghSHA(path) {
  try { return (await ghAPI('GET', `${path}?ref=${GH.branch}`)).sha; } catch(e) { return null; }
}

async function ghPut(path, b64, msg) {
  const sha = await ghSHA(path);
  const body = { message:msg, content:b64, branch:GH.branch };
  if (sha) body.sha = sha;
  return ghAPI('PUT', path, body);
}

async function ghUploadImage(file, dataUrl) {
  setLoadingMsg('Mengupload ke GitHub...');
  try {
    const name = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const path = `img/uploads/${name}`;
    await ghPut(path, dataUrl.split(',')[1], `Add: ${name}`);
    const base = GH.pagesUrl
      ? GH.pagesUrl.replace(/\/$/,'') + '/' + path
      : `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.branch}/${path}`;
    return base;
  } finally { hideLoading(); }
}

async function ghSaveData() {
  const j = JSON.stringify({categories:ST.categories,skills:ST.skills,socials:ST.socials,texts:ST.texts},null,2);
  await ghPut('data.json', toB64(j), 'Update portfolio data');
}

async function ghLoadData() {
  if (!ghCanRead()) return null;
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.branch}/data.json?t=${Date.now()}`);
    return res.ok ? res.json() : null;
  } catch(e) { return null; }
}

async function ghTest() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}`,{headers:{'Authorization':`token ${GH.token}`}});
    if (!res.ok) throw new Error(`${res.status}`);
    const d = await res.json();
    return {ok:true, msg:`✓ Terhubung: ${d.full_name}`};
  } catch(e) { return {ok:false, msg:`✗ Gagal: ${e.message}`}; }
}

/* GitHub Settings Modal */
function buildGHModal() {
  const m = document.createElement('div');
  m.id = 'gh-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.92);display:none;align-items:center;justify-content:center;backdrop-filter:blur(10px);overflow-y:auto;padding:20px;';
  const iS = 'width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:10px 14px;color:#fff;font-size:.82rem;outline:none;margin-bottom:14px;font-family:monospace;letter-spacing:0;';
  const lS = 'display:block;font-size:.65rem;letter-spacing:4px;color:rgba(255,187,0,.7);margin-bottom:6px;font-family:gothic,Arial;';
  m.innerHTML = `
    <div style="background:#111;border:1px solid rgba(255,187,0,.35);border-radius:16px;padding:40px;width:min(500px,100%);position:relative;">
      <h3 style="font-family:gothic,Arial;color:#ffbb00;letter-spacing:6px;font-size:.85rem;margin-bottom:8px;">⚙ GITHUB SETTINGS</h3>
      <p style="font-size:.72rem;color:rgba(255,255,255,.45);margin-bottom:28px;line-height:1.8;font-family:Arial;letter-spacing:0;">
        Hubungkan ke GitHub agar foto yang diupload langsung tersimpan di repository.<br><br>
        <strong style="color:rgba(255,187,0,.6);">Cara buat token:</strong> GitHub → Settings → Developer Settings → Personal Access Tokens → Generate → centang "repo" → copy.
      </p>
      <label style="${lS}">PERSONAL ACCESS TOKEN</label>
      <input id="gh-tok"    type="password" placeholder="ghp_..." style="${iS}" value="">
      <label style="${lS}">USERNAME GITHUB (owner)</label>
      <input id="gh-own"   type="text"     placeholder="faizfirdaus" style="${iS}" value="">
      <label style="${lS}">NAMA REPOSITORY</label>
      <input id="gh-rep"   type="text"     placeholder="faiz-portfolio" style="${iS}" value="">
      <label style="${lS}">BRANCH</label>
      <input id="gh-bra"   type="text"     placeholder="main" style="${iS}" value="main">
      <label style="${lS}">GITHUB PAGES URL (opsional)</label>
      <input id="gh-pag"   type="text"     placeholder="https://faizfirdaus.github.io/faiz-portfolio" style="${iS}" value="">
      <p style="font-size:.65rem;color:rgba(255,255,255,.3);margin-top:-10px;margin-bottom:20px;font-family:Arial;letter-spacing:0;">Isi ini agar URL gambar pakai domain GitHub Pages. Kosongkan jika belum punya.</p>
      <p id="gh-st" style="font-size:.72rem;min-height:18px;margin-bottom:16px;font-family:Arial;letter-spacing:0;"></p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="gh-tb" style="background:rgba(255,187,0,.1);border:1px solid rgba(255,187,0,.4);color:rgba(255,187,0,.8);padding:9px 20px;border-radius:7px;cursor:pointer;font-size:.68rem;letter-spacing:3px;">TEST KONEKSI</button>
        <button id="gh-sb" style="background:#ffbb00;color:#000;border:none;padding:9px 24px;border-radius:7px;cursor:pointer;font-size:.68rem;letter-spacing:3px;font-weight:bold;">SIMPAN</button>
        <button id="gh-cb" style="background:none;border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.5);padding:9px 20px;border-radius:7px;cursor:pointer;font-size:.68rem;letter-spacing:3px;">BATAL</button>
      </div>
    </div>`;
  document.body.appendChild(m);

  /* Isi nilai tersimpan */
  if (GH.token)    document.getElementById('gh-tok').value = GH.token;
  if (GH.owner)    document.getElementById('gh-own').value = GH.owner;
  if (GH.repo)     document.getElementById('gh-rep').value = GH.repo;
  if (GH.branch)   document.getElementById('gh-bra').value = GH.branch;
  if (GH.pagesUrl) document.getElementById('gh-pag').value = GH.pagesUrl;

  const getSt = () => document.getElementById('gh-st');
  const getV  = () => ({
    token:    document.getElementById('gh-tok').value.trim(),
    owner:    document.getElementById('gh-own').value.trim(),
    repo:     document.getElementById('gh-rep').value.trim(),
    branch:   document.getElementById('gh-bra').value.trim() || 'main',
    pagesUrl: document.getElementById('gh-pag').value.trim(),
  });

  document.getElementById('gh-tb').onclick = async () => {
    const v = getV(); GH = v;
    getSt().style.color = 'rgba(255,187,0,.7)'; getSt().textContent = 'Mengecek...';
    const r = await ghTest();
    getSt().style.color = r.ok ? '#88ff99' : '#ff7777'; getSt().textContent = r.msg;
  };
  document.getElementById('gh-sb').onclick = () => {
    const v = getV();
    if (!v.token||!v.owner||!v.repo) { getSt().style.color='#ff7777'; getSt().textContent='✗ Token, Owner, dan Repo wajib diisi.'; return; }
    GH = v; localStorage.setItem('gh_settings', JSON.stringify(GH));
    getSt().style.color = '#88ff99'; getSt().textContent = '✓ Tersimpan!';
    setTimeout(closeGHModal, 1200);
  };
  document.getElementById('gh-cb').onclick = closeGHModal;
}

function openGHModal()  { document.getElementById('gh-modal').style.display='flex'; }
function closeGHModal() { document.getElementById('gh-modal').style.display='none'; }

/* Loading overlay untuk proses upload */
function buildLoadingOv() {
  const el = document.createElement('div');
  el.id = 'up-ov';
  el.style.cssText = 'position:fixed;inset:0;z-index:99997;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;flex-direction:column;gap:16px;';
  el.innerHTML = `<div style="width:36px;height:36px;border:2px solid rgba(255,187,0,.2);border-top-color:#ffbb00;border-radius:50%;animation:vspin .8s linear infinite;"></div><p id="up-msg" style="font-family:gothic,Arial;font-size:.75rem;letter-spacing:4px;color:rgba(255,187,0,.8);">UPLOADING...</p>`;
  document.body.appendChild(el);
}
function setLoadingMsg(t) { const e=document.getElementById('up-ov'),m=document.getElementById('up-msg'); if(e)e.style.display='flex'; if(m)m.textContent=t; }
function hideLoading()    { const e=document.getElementById('up-ov'); if(e)e.style.display='none'; }


/* ================================================================
   03. MANAJEMEN DATA
   ================================================================ */
async function loadData() {
  if (ghCanRead()) {
    const d = await ghLoadData();
    if (d) { console.log('✓ Data dari GitHub'); return d; }
  }
  try { const s=localStorage.getItem('fp_v5'); if(s) return JSON.parse(s); } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

async function saveData() {
  const payload = {categories:ST.categories,skills:ST.skills,socials:ST.socials,texts:ST.texts};
  localStorage.setItem('fp_v5', JSON.stringify(payload));
  if (ghCanWrite()) {
    setLoadingMsg('Menyimpan ke GitHub...');
    try { await ghSaveData(); } catch(e) { hideLoading(); showToast('⚠ Gagal simpan GitHub — tersimpan lokal', true); return; }
    hideLoading();
  }
  showToast();
}

function applyTexts()   { document.querySelectorAll('[data-ck]').forEach(el=>{const k=el.dataset.ck;if(ST.texts[k]!==undefined)el.innerHTML=ST.texts[k];}); }
function collectTexts() { document.querySelectorAll('[data-ck]').forEach(el=>{ST.texts[el.dataset.ck]=el.innerHTML;}); }


/* ================================================================
   04. INDEXEDDB
   ================================================================ */
let modelDB=null;
async function getModelDB(){ if(modelDB)return modelDB;return new Promise((res,rej)=>{const r=indexedDB.open('fp_3d',1);r.onupgradeneeded=e=>e.target.result.createObjectStore('models',{keyPath:'id'});r.onsuccess=e=>{modelDB=e.target.result;res(modelDB);};r.onerror=e=>rej(e.target.error);}); }
async function dbSave(id,buf){ const db=await getModelDB();return new Promise((res,rej)=>{const tx=db.transaction('models','readwrite');tx.objectStore('models').put({id,data:buf,ts:Date.now()});tx.oncomplete=res;tx.onerror=rej;}); }
async function dbLoad(id){ const db=await getModelDB();return new Promise((res,rej)=>{const tx=db.transaction('models','readonly');const q=tx.objectStore('models').get(id);q.onsuccess=e=>res(e.target.result?.data);q.onerror=rej;}); }


/* ================================================================
   05. LOADING SCREEN — Clone nav logo (pixel-perfect)
   ================================================================
   CARA KERJA:
   1. Progress bar berjalan 0→100%
   2. Clone nav logo asli → posisikan di tengah layar dengan scale besar
   3. Typewriter pada clone
   4. Animate: transform → translate(0,0) scale(1)
      = clone kembali ke posisi nav logo persis sama
   5. Tampilkan nav logo asli, fade out loader
   ================================================================ */

(function initLoader() {
  /* Gunakan null-check agar tidak crash jika elemen tidak ada */
  const fill  = document.getElementById('ld-fill');
  const pct   = document.getElementById('ld-pct');
  const ldr   = document.getElementById('loader');
  const nav   = document.getElementById('nav-logo');
  if (!fill || !pct || !ldr || !nav) return;

  let p = 0;
  const timer = setInterval(() => {
    const s = p<50 ? 2.2+Math.random()*2.8 : p<85 ? 1+Math.random()*1.6 : p<96 ? .4+Math.random()*.6 : .1;
    p = Math.min(p+s, 100);
    fill.style.width = p+'%';
    pct.textContent  = Math.floor(p)+'%';
    if (p >= 100) {
      clearInterval(timer);
      fill.style.width = '100%'; pct.textContent = '100%';
      setTimeout(() => startLogoAnim(nav, ldr), 400);
    }
  }, 28);
})();

function startLogoAnim(navEl, loaderEl) {
  /* Inject style kursor ketik jika belum ada */
  if (!document.getElementById('type-cursor-css')) {
    const s = document.createElement('style');
    s.id = 'type-cursor-css';
    s.textContent = `
      @keyframes tcBlink { 50% { opacity: 0; } }
      .tc { border-right: 3px solid #ffbb00; animation: tcBlink .6s step-end infinite; }
    `;
    document.head.appendChild(s);
  }

  /* Ambil posisi nav logo yang sudah ada di DOM (walaupun opacity:0) */
  const nr = navEl.getBoundingClientRect();

  /* Clone nav logo — hasilnya identik 100% */
  const clone = navEl.cloneNode(true);
  clone.removeAttribute('id');

  /* Hitung skala tampil di tengah layar */
  const scaleUp = Math.min(
    (window.innerWidth  * 0.45) / Math.max(nr.width,  1),
    (window.innerHeight * 0.35) / Math.max(nr.height, 1)
  );

  /* Translate agar pusat clone = pusat layar */
  const tx = window.innerWidth  / 2 - nr.left - (nr.width  * scaleUp) / 2;
  const ty = window.innerHeight / 2 - nr.top  - (nr.height * scaleUp) / 2;

  /* Clone diletakkan di posisi nav logo asli (top, left persis sama)
     lalu di-transform ke tengah layar dengan scale besar */
  Object.assign(clone.style, {
    position       : 'fixed',
    left           : nr.left + 'px',
    top            : nr.top  + 'px',
    width          : nr.width + 'px',
    transformOrigin: 'top left',
    transform      : `translate(${tx}px, ${ty}px) scale(${scaleUp})`,
    zIndex         : '10001',
    pointerEvents  : 'none',
    transition     : 'none',
    opacity        : '1',
  });

  loaderEl.appendChild(clone);

  /* Ambil elemen teks di dalam clone */
  const cl1 = clone.querySelector('.n1');
  const cl2 = clone.querySelector('.n2');
  const t1  = cl1 ? cl1.textContent : 'FAIZ';
  const t2  = cl2 ? cl2.textContent : 'Portofolio';

  if (cl1) cl1.textContent = '';
  if (cl2) { cl2.textContent = ''; cl2.style.visibility = 'hidden'; }

  /* Typewriter baris 1 */
  typeWrite(cl1, t1, 75, () => {
    setTimeout(() => {
      if (cl2) cl2.style.visibility = 'visible';
      /* Typewriter baris 2 */
      typeWrite(cl2, t2, 60, () => {
        /* Setelah selesai ketik → terbang ke posisi nav */
        setTimeout(() => {
          clone.style.transition = 'transform .85s cubic-bezier(0.22,1,0.36,1)';
          /* translate(0,0) scale(1) = posisi nav logo asli */
          clone.style.transform  = 'translate(0px, 0px) scale(1)';

          setTimeout(() => {
            navEl.style.opacity = '1';     /* Tampilkan nav logo asli */
            loaderEl.classList.add('out'); /* Fade out seluruh loader */
            setTimeout(() => {
              loaderEl.style.display = 'none';
              startReveal(); revealHero(); startWordCycle();
            }, 950);
          }, 880);
        }, 500);
      });
    }, 200);
  });
}

function typeWrite(el, text, speed, onDone) {
  if (!el) { onDone?.(); return; }
  el.textContent = ''; el.classList.add('tc');
  let i = 0;
  const t = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) { clearInterval(t); el.classList.remove('tc'); onDone?.(); }
  }, speed);
}


/* ================================================================
   06. JAM DIGITAL
   ================================================================ */
function tickClock() {
  const n=new Date();
  const h=document.getElementById('nc-h'), m=document.getElementById('nc-m');
  if(h) h.textContent=String(n.getHours()).padStart(2,'0');
  if(m) m.textContent=String(n.getMinutes()).padStart(2,'0');
}
tickClock(); setInterval(tickClock, 1000);


/* ================================================================
   07. WORD CYCLING
   ================================================================ */
let wIdx = 0;
function startWordCycle() {
  const el = document.getElementById('cycle-w'); if(!el) return;
  setInterval(() => {
    el.classList.add('blur-out');
    setTimeout(() => {
      wIdx = (wIdx+1) % CYCLE_WORDS.length;
      el.textContent = CYCLE_WORDS[wIdx];
      el.classList.remove('blur-out'); el.classList.add('blur-in');
      setTimeout(() => el.classList.remove('blur-in'), 560);
    }, 500);
  }, CYCLE_INTERVAL);
}


/* ================================================================
   08. SCROLL REVEAL — Dua arah (masuk & keluar)
   ================================================================ */
let rObs = null; const shownSet = new WeakSet();
function startReveal() {
  rObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const el = e.target;
      if (e.isIntersecting) { el.classList.remove('exit-up','exit-down'); el.classList.add('shown'); shownSet.add(el); }
      else if (shownSet.has(el)) { el.classList.remove('shown'); el.classList.add(e.boundingClientRect.top<0?'exit-up':'exit-down'); }
    });
  }, {threshold:.08, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.rev:not(.shown)').forEach(el => rObs.observe(el));
}
function reObs() { document.querySelectorAll('.rev:not(.shown)').forEach(el=>{if(rObs)rObs.observe(el);}); }
function revealHero() { const h=document.getElementById('hero-blk'); if(h) setTimeout(()=>{h.classList.add('shown');shownSet.add(h);},80); }


/* ================================================================
   09. NAV AKTIF
   ================================================================ */
const SIDS = ['home','about','project','skills','contact'];
window.addEventListener('scroll', () => {
  const mid = window.scrollY + window.innerHeight*.34; let cur='home';
  SIDS.forEach(id=>{const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top+window.scrollY<=mid)cur=id;});
  document.querySelectorAll('nav ul li a').forEach(a=>a.classList.toggle('act',a.dataset.s===cur));
}, {passive:true});


/* ================================================================
   10. HAMBURGER
   ================================================================ */
document.getElementById('hbg')?.addEventListener('click', () => {
  document.getElementById('hbg').classList.toggle('open');
  document.getElementById('nav-ul')?.classList.toggle('open');
});
document.querySelectorAll('nav ul li a').forEach(a => a.addEventListener('click', () => {
  document.getElementById('hbg')?.classList.remove('open');
  document.getElementById('nav-ul')?.classList.remove('open');
}));


/* ================================================================
   11. SLIDER MULTI-KATEGORI
   ================================================================ */
let devPCat=null, devPSlide=null;

function buildAllCategories() {
  const wrap = document.getElementById('proj-cats'); if(!wrap) return;
  wrap.innerHTML = '';
  ST.categories.forEach((cat, ci) => {
    const div = document.createElement('div'); div.className='proj-cat'; div.id=`cat-${ci}`;
    const num = String(ci+1).padStart(2,'0'), badge = cat.type==='mixed'?'<span class="cat-badge">IMG + 3D MODEL</span>':'';
    div.innerHTML = `
      <div class="cat-head bkt">
        <span class="cat-num">${num}</span>
        <h3 class="cat-title" data-ck="ct-${ci}">${ST.texts['ct-'+ci]||cat.title}</h3>
        <div class="cat-rule"></div>${badge}
      </div>
      <div class="cat-dev-bar" id="cdb-${ci}">
        <button class="db-btn" id="bi-${ci}">＋ ADD IMAGE</button>
        ${cat.type==='mixed'?`<button class="db-btn" id="b3-${ci}">⬡ ADD 3D MODEL</button>`:''}
        <button class="db-btn red" id="bd-${ci}">DELETE CATEGORY</button>
      </div>
      <div class="slider-outer" id="so-${ci}"></div>
      <div class="dots-row" id="dr-${ci}"></div>`;
    wrap.appendChild(div);
    document.getElementById(`bi-${ci}`)?.addEventListener('click', () => { devPCat=ci; devPSlide=-1; document.getElementById('dev-img-file')?.click(); });
    document.getElementById(`bd-${ci}`)?.addEventListener('click', () => delCat(ci));
    document.getElementById(`b3-${ci}`)?.addEventListener('click', () => { devPCat=ci; devPSlide=-1; document.getElementById('dev-3d-file')?.click(); });
    if (cursors[ci]===undefined) cursors[ci]=0;
    buildSlider(ci);
  });
  reObs(); if(document.body.classList.contains('dev-on')) activateEdit();
}

function buildSlider(ci) {
  const cat=ST.categories[ci], so=document.getElementById(`so-${ci}`), dr=document.getElementById(`dr-${ci}`);
  if(!so||!dr) return; so.innerHTML=''; dr.innerHTML='';
  const N=cat.projects.length;
  if(!N){so.innerHTML='<div class="cat-empty">Belum ada proyek.</div>';return;}
  if(cursors[ci]>=N) cursors[ci]=Math.max(0,N-1);

  cat.projects.forEach((proj,si)=>{
    const sld=document.createElement('div'); sld.className='sld';
    if(proj.type==='model3d'&&proj.modelId){
      const t=document.createElement('div'); t.className='m3d-thumb';
      t.innerHTML=`<div class="m3d-icon">⬡</div><div class="m3d-name">${proj.lbl}</div><div class="m3d-badge">3D MODEL</div>`;
      sld.appendChild(t);
    } else {
      const img=document.createElement('img'); img.src=proj.src; img.alt=proj.lbl; img.draggable=false; sld.appendChild(img);
    }
    const ov=document.createElement('div'); ov.className='sld-ov';
    ov.innerHTML=`<span>${proj.type==='model3d'?'⬡ VIEW 3D':'🔍 VIEW FULL'}</span>`; sld.appendChild(ov);

    const del=document.createElement('button'); del.className='sld-del'; del.textContent='✕';
    del.addEventListener('click',async e=>{e.stopPropagation();if(!await customConfirm(`Hapus "${proj.lbl}"?`))return;cat.projects.splice(si,1);cursors[ci]=Math.min(cursors[ci],Math.max(0,cat.projects.length-1));buildSlider(ci);saveData();});
    sld.appendChild(del);

    if(cat.type==='mixed'){
      const m3=document.createElement('button'); m3.className='add-model-btn'; m3.textContent='⬡ SET 3D';
      m3.addEventListener('click',e=>{e.stopPropagation();devPCat=ci;devPSlide=si;document.getElementById('dev-3d-file')?.click();});
      sld.appendChild(m3);
    }
    so.appendChild(sld);

    sld.addEventListener('click',()=>{
      const c=sld.className;
      if(c.includes('sa')){if(proj.type==='model3d'&&proj.modelId)view3D(proj.modelId,proj.lbl);else openLB(ci,si);}
      else if(c.includes('sp')){cursors[ci]=(cursors[ci]-1+N)%N;updateSld(ci);}
      else{cursors[ci]=(cursors[ci]+1)%N;updateSld(ci);}
    });
    const dot=document.createElement('div'); dot.className='dot';
    dot.addEventListener('click',()=>{cursors[ci]=si;updateSld(ci);}); dr.appendChild(dot);
  });

  let sx=0;
  so.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});
  so.addEventListener('touchend',e=>{const d=sx-e.changedTouches[0].clientX;if(Math.abs(d)>50){cursors[ci]=d>0?(cursors[ci]+1)%N:(cursors[ci]-1+N)%N;updateSld(ci);}},{passive:true});
  updateSld(ci);
}

function updateSld(ci){
  const slds=document.querySelectorAll(`#so-${ci} .sld`),dots=document.querySelectorAll(`#dr-${ci} .dot`),N=slds.length;if(!N)return;
  slds.forEach((el,i)=>{const o=((i-cursors[ci])%N+N)%N;let c='sh';
    if(o===0)c='sa';else if(o===1)c='sn1';else if(o===2)c='sn2';else if(o===3)c='sn3';else if(o===4)c='sn4';
    else if(o===N-1)c='sp1';else if(o===N-2)c='sp2';else if(o===N-3)c='sp3';else if(o===N-4)c='sp4';
    el.className='sld '+c;
  });
  dots.forEach((d,i)=>d.classList.toggle('on',i===cursors[ci]));
}

async function delCat(ci){
  if(!await customConfirm(`Hapus kategori "${ST.categories[ci].title}"?`)) return;
  ST.categories.splice(ci,1); cursors.splice(ci,1); buildAllCategories(); saveData();
}

document.getElementById('dev-img-file')?.addEventListener('change', async function(e){
  const f=e.target.files[0]; if(!f) return;
  const ci=devPCat, si=devPSlide;
  const r=new FileReader();
  r.onload=async ev=>{
    let src=ev.target.result;
    if(ghCanWrite()){try{src=await ghUploadImage(f,ev.target.result);}catch(err){hideLoading();await customConfirm(`Upload GitHub gagal:\n${err.message}\n\nGambar disimpan lokal sementara.`);}}
    if(si>=0){ST.categories[ci].projects[si].src=src;ST.categories[ci].projects[si].type='image';}
    else ST.categories[ci].projects.push({src,lbl:f.name.replace(/\.[^.]+$/,''),type:'image',modelId:null});
    cursors[ci]=ST.categories[ci].projects.length-1; buildSlider(ci); saveData();
  };
  r.readAsDataURL(f); this.value='';
});

document.getElementById('dev-3d-file')?.addEventListener('change', async function(e){
  const f=e.target.files[0]; if(!f) return;
  const ci=devPCat, si=devPSlide;
  const r=new FileReader();
  r.onload=async ev=>{
    const mid='m_'+Date.now(); await dbSave(mid,ev.target.result);
    if(si>=0){ST.categories[ci].projects[si].type='model3d';ST.categories[ci].projects[si].modelId=mid;}
    else ST.categories[ci].projects.push({src:'',lbl:f.name.replace(/\.[^.]+$/,''),type:'model3d',modelId:mid});
    cursors[ci]=ST.categories[ci].projects.length-1; buildSlider(ci); saveData();
  };
  r.readAsArrayBuffer(f); this.value='';
});

document.getElementById('add-cat-btn')?.addEventListener('click', async()=>{
  const title=await customPrompt('Nama kategori baru:'); if(!title) return;
  const has3D=await customConfirm('Kategori ini mendukung model 3D?\nOK = Ya  |  Cancel = Hanya gambar');
  ST.categories.push({id:'cat_'+Date.now(),title,type:has3D?'mixed':'image',projects:[]}); cursors.push(0);
  buildAllCategories(); saveData();
  const el=document.getElementById(`cat-${ST.categories.length-1}`);
  if(el) setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),150);
});


/* ================================================================
   12. LIGHTBOX — Tombol tersembunyi saat tidak aktif
   ================================================================ */
(function(){
  const s=document.createElement('style');
  s.textContent='#lb .lb-x,#lb .lb-nav{opacity:0;pointer-events:none;transition:opacity .3s;}#lb.on .lb-x,#lb.on .lb-nav{opacity:1;pointer-events:all;}';
  document.head.appendChild(s);
})();

let lbCat=0,lbSld=0;
function openLB(ci,si){
  lbCat=ci; lbSld=si;
  const img=document.getElementById('lb-img');
  if(img){
    img.style.opacity='';           /* FIX: hapus inline opacity dari navLB sebelumnya */
    img.style.transform='';         /* FIX: hapus inline transform juga */
    img.src=ST.categories[ci].projects[si].src;
  }
  document.getElementById('lb')?.classList.add('on');
  document.body.style.overflow='hidden';
}
function closeLB(){
  document.getElementById('lb')?.classList.remove('on');
  document.body.style.overflow='';
  const img=document.getElementById('lb-img');
  if(img){ img.style.opacity=''; img.style.transform=''; } /* FIX: reset inline styles */
}
function navLB(d){const cat=ST.categories[lbCat],imgs=cat.projects.filter(p=>p.type!=='model3d');if(!imgs.length)return;const ri=imgs.findIndex(p=>p===cat.projects[lbSld]),ni=(ri+d+imgs.length)%imgs.length;lbSld=cat.projects.indexOf(imgs[ni]);const img=document.getElementById('lb-img');if(img){img.style.opacity='0';setTimeout(()=>{img.src=cat.projects[lbSld].src;img.style.opacity='1';},220);}}
document.getElementById('lb-x')?.addEventListener('click',closeLB);
document.getElementById('lb-pv')?.addEventListener('click',()=>navLB(-1));
document.getElementById('lb-nx')?.addEventListener('click',()=>navLB(1));
document.getElementById('lb')?.addEventListener('click',e=>{if(e.target.id==='lb')closeLB();});


/* ================================================================
   13. 3D VIEWER — Three.js + Fix SolidWorks orientation
   ================================================================ */
let tR=null,tA=null,tM=null,isWF=false;
function view3D(id,title){
  if(typeof THREE==='undefined'){alert('3D Viewer butuh internet untuk Three.js.');return;}
  const vt=document.getElementById('v3d-title'); if(vt)vt.textContent=title.toUpperCase();
  const vl=document.getElementById('v3d-loading'); if(vl)vl.style.display='flex';
  document.getElementById('v3d')?.classList.add('open'); document.body.style.overflow='hidden';
  if(tR){cancelAnimationFrame(tA);tR.dispose();tR=null;}
  dbLoad(id).then(buf=>{if(!buf){if(vl)vl.innerHTML='<p style="color:#f55">Model tidak ditemukan.</p>';return;}if(vl)vl.style.display='none';setup3D(buf);}).catch(err=>{if(vl)vl.innerHTML='<p style="color:#f55">Error.</p>';});
}
function setup3D(buf){
  const cv=document.getElementById('v3d-canvas'); if(!cv) return;
  const W=cv.clientWidth,H=cv.clientHeight;
  const sc=new THREE.Scene(); sc.background=new THREE.Color(0x040404);
  sc.add(new THREE.GridHelper(300,30,0x1a1a00,0x111100));
  const ax=new THREE.AxesHelper(40);ax.material.opacity=.22;ax.material.transparent=true;sc.add(ax);
  sc.add(new THREE.AmbientLight(0xffffff,.35));
  const dl1=new THREE.DirectionalLight(0xffffff,.65);dl1.position.set(2,4,3);sc.add(dl1);
  const dl2=new THREE.DirectionalLight(0xffbb00,.3);dl2.position.set(-2,1,-3);sc.add(dl2);
  const geo=parseSTL(buf);geo.computeBoundingBox();geo.computeVertexNormals();
  const bb=geo.boundingBox,c=new THREE.Vector3(),sz=new THREE.Vector3();bb.getCenter(c);geo.translate(-c.x,-c.y,-c.z);bb.getSize(sz);
  const ns=100/Math.max(sz.x,sz.y,sz.z);
  const mat=new THREE.MeshPhongMaterial({color:0xb8b8b8,specular:0xffbb00,shininess:85,side:THREE.DoubleSide});
  tM=new THREE.Mesh(geo,mat);tM.scale.setScalar(ns);
  tM.rotation.x=-Math.PI/2; /* Fix: SolidWorks Z-up → Three.js Y-up */
  sc.add(tM);
  const cam=new THREE.PerspectiveCamera(45,W/H,.1,10000);let sp={theta:0,phi:Math.PI/4,r:160};
  function cu(){cam.position.x=sp.r*Math.sin(sp.phi)*Math.sin(sp.theta);cam.position.y=sp.r*Math.cos(sp.phi);cam.position.z=sp.r*Math.sin(sp.phi)*Math.cos(sp.theta);cam.lookAt(0,0,0);}cu();
  tR=new THREE.WebGLRenderer({canvas:cv,antialias:true});tR.setSize(W,H);tR.setPixelRatio(Math.min(devicePixelRatio,2));
  let drag=false,pv={x:0,y:0};
  cv.addEventListener('mousedown',e=>{drag=true;pv={x:e.clientX,y:e.clientY};});
  window.addEventListener('mouseup',()=>drag=false);
  cv.addEventListener('mousemove',e=>{if(!drag)return;sp.theta-=(e.clientX-pv.x)*.012;sp.phi=Math.max(.05,Math.min(Math.PI-.05,sp.phi+(e.clientY-pv.y)*.012));pv={x:e.clientX,y:e.clientY};cu();});
  cv.addEventListener('wheel',e=>{sp.r=Math.max(30,Math.min(600,sp.r+e.deltaY*.25));cu();e.preventDefault();},{passive:false});
  let lt=[];
  cv.addEventListener('touchstart',e=>{lt=[...e.touches];drag=true;pv={x:e.touches[0].clientX,y:e.touches[0].clientY};});
  cv.addEventListener('touchmove',e=>{e.preventDefault();if(e.touches.length===1&&drag){sp.theta-=(e.touches[0].clientX-pv.x)*.012;sp.phi=Math.max(.05,Math.min(Math.PI-.05,sp.phi+(e.touches[0].clientY-pv.y)*.012));pv={x:e.touches[0].clientX,y:e.touches[0].clientY};cu();}else if(e.touches.length===2&&lt.length===2){const d0=Math.hypot(lt[1].clientX-lt[0].clientX,lt[1].clientY-lt[0].clientY),d1=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY);sp.r=Math.max(30,Math.min(600,sp.r*(d0/d1)));lt=[...e.touches];cu();}},{passive:false});
  cv.addEventListener('touchend',()=>drag=false);
  window.addEventListener('resize',()=>{const w2=cv.clientWidth,h2=cv.clientHeight;cam.aspect=w2/h2;cam.updateProjectionMatrix();tR.setSize(w2,h2);});
  document.getElementById('v3d-reset')?.addEventListener('click',()=>{sp={theta:0,phi:Math.PI/4,r:160};cu();});
  document.getElementById('v3d-wire')?.addEventListener('click',()=>{isWF=!isWF;tM.material.wireframe=isWF;const w=document.getElementById('v3d-wire');if(w)w.textContent=isWF?'● SOLID':'⬡ WIREFRAME';});
  function anim(){tA=requestAnimationFrame(anim);tR.render(sc,cam);}anim();
}
function parseSTL(buf){
  const geo=new THREE.BufferGeometry(),rd=new DataView(buf),N=rd.getUint32(80,true);
  if(buf.byteLength===84+N*50){const pos=new Float32Array(N*9),nor=new Float32Array(N*9);for(let i=0;i<N;i++){const o=84+i*50,nx=rd.getFloat32(o,true),ny=rd.getFloat32(o+4,true),nz=rd.getFloat32(o+8,true);for(let v=0;v<3;v++){const vo=o+12+v*12,b=(i*3+v)*3;pos[b]=rd.getFloat32(vo,true);pos[b+1]=rd.getFloat32(vo+4,true);pos[b+2]=rd.getFloat32(vo+8,true);nor[b]=nx;nor[b+1]=ny;nor[b+2]=nz;}}geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));}else{const txt=new TextDecoder().decode(buf),ps=[],vr=/vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi;let m;while((m=vr.exec(txt)))ps.push(parseFloat(m[1]),parseFloat(m[2]),parseFloat(m[3]));geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));}return geo;
}
function close3D(){document.getElementById('v3d')?.classList.remove('open');document.body.style.overflow='';if(tR){cancelAnimationFrame(tA);tR.dispose();tR=null;}const w=document.getElementById('v3d-wire');if(w)w.textContent='⬡ WIREFRAME';isWF=false;}
document.getElementById('v3d-cls')?.addEventListener('click',close3D);


/* ================================================================
   14. SKILLS
   ================================================================ */
function buildSkills(){
  const g=document.getElementById('sk-grid'); if(!g) return; g.innerHTML='';
  ST.skills.forEach((sk,si)=>{
    const card=document.createElement('div');card.className='sk-card rev';
    const del=document.createElement('button');del.className='card-del';del.textContent='✕';
    del.addEventListener('click',async()=>{if(!await customConfirm(`Hapus "${sk.title}"?`))return;ST.skills.splice(si,1);buildSkills();saveData();});
    const h3=document.createElement('h3');h3.dataset.ck=`sk-${si}-t`;h3.textContent=ST.texts[`sk-${si}-t`]||sk.title;
    const p=document.createElement('p');p.dataset.ck=`sk-${si}-d`;p.textContent=ST.texts[`sk-${si}-d`]||sk.desc;
    const ul=document.createElement('ul');const lb=document.createElement('li');lb.className='xp';lb.textContent='Expertise:';ul.appendChild(lb);
    sk.items.forEach((item,ii)=>{
      const li=document.createElement('li'),sp=document.createElement('span'),di=document.createElement('span');
      sp.dataset.ck=`sk-${si}-i-${ii}`;sp.textContent=ST.texts[`sk-${si}-i-${ii}`]||item;
      di.className='del-i';di.textContent='✕';
      di.addEventListener('click',async()=>{if(!await customConfirm(`Hapus "${item}"?`))return;sk.items.splice(ii,1);buildSkills();saveData();});
      li.appendChild(sp);li.appendChild(di);ul.appendChild(li);
    });
    const ai=document.createElement('button');ai.className='add-i-btn';ai.textContent='＋ ADD SKILL';
    ai.addEventListener('click',async()=>{const v=await customPrompt('Skill baru:');if(v){sk.items.push(v);buildSkills();saveData();}});
    card.appendChild(del);card.appendChild(h3);card.appendChild(p);card.appendChild(ul);card.appendChild(ai);g.appendChild(card);
  });
  const ac=document.createElement('div');ac.className='add-card-btn';ac.innerHTML='<div class="acp">+</div><p>ADD SKILL CARD</p>';
  ac.addEventListener('click',()=>{ST.skills.push({title:'New Skill',desc:'Tulis deskripsi.',items:['Skill 1','Skill 2']});buildSkills();saveData();});
  g.appendChild(ac);reObs();if(document.body.classList.contains('dev-on'))activateEdit();
}


/* ================================================================
   15. SOCIAL MEDIA
   ================================================================ */
function buildSocials(){
  const list=document.getElementById('social-list'); if(!list) return; list.innerHTML='';
  ST.socials.forEach((s,i)=>{
    const row=document.createElement('div');row.className='social-item';
    const ico=document.createElement('span');ico.className='social-ico';ico.textContent=s.ico;
    const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener';a.dataset.ck=`sc-${i}`;a.textContent=ST.texts[`sc-${i}`]||s.name;
    const del=document.createElement('span');del.className='del-social';del.textContent='✕';
    del.addEventListener('click',async()=>{if(!await customConfirm(`Hapus "${s.name}"?`))return;ST.socials.splice(i,1);buildSocials();saveData();});
    row.appendChild(ico);row.appendChild(a);row.appendChild(del);list.appendChild(row);
  });
  if(document.body.classList.contains('dev-on'))activateEdit();
}

document.getElementById('add-social-btn')?.addEventListener('click', async()=>{
  const name=await customPrompt('Nama platform:');if(!name)return;
  const url=await customPrompt('URL:');if(!url)return;
  const ico=await customPrompt('Label singkat (2-3 huruf):',name.slice(0,2).toUpperCase());
  ST.socials.push({name,url,ico:ico||name.slice(0,2).toUpperCase()});buildSocials();saveData();
});
document.getElementById('db-addsocial')?.addEventListener('click',()=>document.getElementById('add-social-btn')?.click());


/* ================================================================
   16. DEVELOPER MODE
   ================================================================ */
let ckN=0, ckT=null;
document.getElementById('copy-trg')?.addEventListener('click',()=>{
  ckN++;clearTimeout(ckT);ckT=setTimeout(()=>ckN=0,2600);
  if(ckN>=5){ckN=0;document.getElementById('dev-modal')?.classList.add('on');setTimeout(()=>document.getElementById('dm-u')?.focus(),100);}
});

document.getElementById('dm-x')?.addEventListener('click',closeDM);
document.getElementById('dm-u')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('dm-p')?.focus();});
document.getElementById('dm-p')?.addEventListener('keydown',e=>{if(e.key==='Enter')tryLogin();});
document.getElementById('dm-enter')?.addEventListener('click',tryLogin);

function closeDM(){document.getElementById('dev-modal')?.classList.remove('on');const u=document.getElementById('dm-u'),p=document.getElementById('dm-p'),er=document.getElementById('dm-err');if(u)u.value='';if(p)p.value='';if(er)er.classList.remove('on');}
function tryLogin(){
  const u=document.getElementById('dm-u')?.value.trim(),p=document.getElementById('dm-p')?.value;
  if(u===DEV_USER&&p===DEV_PASS){closeDM();enterDev();}
  else{const er=document.getElementById('dm-err');if(er){er.classList.add('on');setTimeout(()=>er.classList.remove('on'),3200);}const pi=document.getElementById('dm-p');if(pi){pi.value='';document.getElementById('dm-u')?.select();}}
}
function enterDev(){document.body.classList.add('dev-on');document.getElementById('dev-bar')?.classList.add('on');activateEdit();}
function exitDev() {document.body.classList.remove('dev-on');document.getElementById('dev-bar')?.classList.remove('on');deactivateEdit();}
function activateEdit()  {document.querySelectorAll('[data-ck]').forEach(el=>el.contentEditable='true');}
function deactivateEdit(){document.querySelectorAll('[data-ck]').forEach(el=>el.contentEditable='false');}

function saveAll(){
  collectTexts();
  ST.skills.forEach((sk,si)=>{const t=document.querySelector(`[data-ck="sk-${si}-t"]`),d=document.querySelector(`[data-ck="sk-${si}-d"]`);if(t)sk.title=t.textContent;if(d)sk.desc=d.textContent;sk.items.forEach((_,ii)=>{const el=document.querySelector(`[data-ck="sk-${si}-i-${ii}"]`);if(el)sk.items[ii]=el.textContent;});});
  ST.categories.forEach((_,ci)=>{const el=document.querySelector(`[data-ck="ct-${ci}"]`);if(el)ST.categories[ci].title=el.textContent;});
  ST.socials.forEach((_,i)=>{const el=document.querySelector(`[data-ck="sc-${i}"]`);if(el)ST.socials[i].name=el.textContent;});
  saveData();
}

document.getElementById('db-save')?.addEventListener('click',saveAll);
document.getElementById('db-exit')?.addEventListener('click',exitDev);
document.getElementById('db-addcard')?.addEventListener('click',()=>{ST.skills.push({title:'New Skill',desc:'Deskripsi.',items:['Skill 1']});buildSkills();saveData();});
document.getElementById('db-reset')?.addEventListener('click',async()=>{if(await customConfirm('Reset semua konten?\nTidak bisa dibatalkan.')){localStorage.removeItem('fp_v5');location.reload();}});

document.addEventListener('keydown',e=>{
  if(document.getElementById('lb')?.classList.contains('on')){if(e.key==='Escape')closeLB();if(e.key==='ArrowLeft')navLB(-1);if(e.key==='ArrowRight')navLB(1);return;}
  if(document.getElementById('v3d')?.classList.contains('open')){if(e.key==='Escape')close3D();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='s'&&document.body.classList.contains('dev-on')){e.preventDefault();saveAll();}
});


/* ================================================================
   17. TOAST
   ================================================================ */
function showToast(msg, err) {
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent = msg||'✓ TERSIMPAN';
  t.style.borderColor = err?'#f77':'#4f6';
  t.style.color       = err?'#f99':'#8f9';
  t.classList.add('on'); setTimeout(()=>t.classList.remove('on'),2800);
}


/* ================================================================
   18. INISIALISASI — async, tidak ada top-level DOM crash
   ================================================================ */

/* ================================================================
   PROJECT ENTRANCE ANIMATION
   Animasi masuk saat scroll ke section project
   ================================================================ */

function injectProjectAnim() {
  const s = document.createElement('style');
  s.textContent = `
    /* Tiap kategori project mulai tersembunyi */
    .proj-cat {
      opacity: 0;
      transform: translateY(55px);
      transition: opacity 0.82s cubic-bezier(0.16,1,0.3,1),
                  transform 0.82s cubic-bezier(0.16,1,0.3,1);
    }
    .proj-cat.cat-in { opacity: 1; transform: none; }

    /* Header kategori */
    .proj-cat .cat-head {
      opacity: 0;
      transform: translateX(-40px);
      transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1),
                  transform 0.7s cubic-bezier(0.16,1,0.3,1);
      transition-delay: 0.1s;
    }
    .proj-cat.cat-in .cat-head { opacity: 1; transform: none; }

    /* Slider outer */
    .proj-cat .slider-outer,
    .proj-cat .dots-row {
      opacity: 0;
      transform: translateY(30px) scale(0.97);
      transition: opacity 0.75s cubic-bezier(0.16,1,0.3,1),
                  transform 0.75s cubic-bezier(0.16,1,0.3,1);
      transition-delay: 0.22s;
    }
    .proj-cat.cat-in .slider-outer,
    .proj-cat.cat-in .dots-row { opacity: 1; transform: none; }
  `;
  document.head.appendChild(s);
}

function observeProjectCats() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        /* Stagger tiap kategori 150ms */
        setTimeout(() => e.target.classList.add('cat-in'), i * 150);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('#proj-cats .proj-cat')
    .forEach(el => obs.observe(el));
}

document.addEventListener('DOMContentLoaded', async () => {

  /* Build modal GitHub dan loading overlay */
  buildGHModal();
  buildLoadingOv();

  /* ── Tambahkan tombol GitHub Settings ke dev toolbar ──
     Dilakukan di sini (DOMContentLoaded) bukan top-level
     agar tidak crash jika elemen belum ada */
  const devBar  = document.getElementById('dev-bar');
  const exitBtn = document.getElementById('db-exit');
  if (devBar && !document.getElementById('db-gh')) {
    const ghBtn = document.createElement('button');
    ghBtn.id = 'db-gh'; ghBtn.className = 'db-btn';
    ghBtn.textContent = '⚙ GITHUB SETTINGS';
    devBar.insertBefore(ghBtn, exitBtn || null);
    ghBtn.addEventListener('click', openGHModal);
  }

  /* Load data (GitHub dulu, fallback localStorage) */
  ST      = await loadData();
  cursors = ST.categories.map(() => 0);

  /* Render semua section */
  applyTexts();
  buildAllCategories();
  injectProjectAnim();          /* Inject CSS animasi project */
  setTimeout(observeProjectCats, 100); /* Observe setelah DOM dirender */
  buildSkills();
  buildSocials();

  console.log(ghCanWrite()
    ? `✓ GitHub: ${GH.owner}/${GH.repo} (${GH.branch}) — baca & tulis aktif`
    : ghCanRead()
      ? `✓ GitHub: ${GH.owner}/${GH.repo} (${GH.branch}) — baca aktif, isi token di dev mode untuk bisa menyimpan`
      : 'ℹ GitHub belum dikonfigurasi.');
});
