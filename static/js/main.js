const GRADUATION = new Date(Date.UTC(2026, 7, 8, 0, 0, 0));
const AVATARS = ['🧠','📊','🤖','🐍','📈','🔬','💡','🎯','🦾','📐','🧬','🌐'];
const POLL_INTERVAL = 5000; // ms between live-update checks

let pollVoted = false, pollSelectedId = null, pollId = null;
let pendingFiles = [];
let latestShoutoutId = 0;
let latestGalleryId = 0;

function pad(v) { return String(v).padStart(2,'0'); }

function updateCountdown() {
  const diff = GRADUATION - Date.now();
  if (diff <= 0) {
    ['cd-days','cd-hours','cd-mins'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent='00'; });
    const s = document.getElementById('cd-secs'); if(s) s.textContent='🎉';
    return;
  }
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent=pad(v); };
  set('cd-days',  Math.floor(diff/86400000));
  set('cd-hours', Math.floor((diff%86400000)/3600000));
  set('cd-mins',  Math.floor((diff%3600000)/60000));
  set('cd-secs',  Math.floor((diff%60000)/1000));
}

function showToast(msg, isError=false) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.background = isError ? 'var(--red)' : 'var(--green)';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── SHOUTOUTS ────────────────────────────────────────────

function renderShoutoutItem(s) {
  const div = document.createElement('div');
  div.className = 'shoutout-item';
  if (s.id) { div.dataset.id = s.id; if (s.id > latestShoutoutId) latestShoutoutId = s.id; }
  div.innerHTML = `
    <div class="shoutout-avatar">${AVATARS[Math.floor(Math.random()*AVATARS.length)]}</div>
    <div>
      <div class="shoutout-name">${escapeHtml(s.name).toUpperCase()}</div>
      <div class="shoutout-text">${escapeHtml(s.message)}</div>
      <div class="shoutout-time">${s.time}</div>
    </div>`;
  return div;
}

async function submitShoutout() {
  if (!IS_LOGGED_IN) { window.location.href='/login'; return; }
  const msgEl = document.getElementById('shoutMsg');
  const btn   = document.getElementById('shoutSubmit');
  const message = msgEl?.value.trim();
  if (!message) { showToast('اكتب رسالتك أولاً', true); return; }
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = '...جاري الإرسال';
  try {
    const res = await fetch('/api/shoutouts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message }),
    });
    if (res.status===401) { window.location.href='/login'; return; }
    if (!res.ok) throw new Error();
    document.getElementById('shoutoutsFeed')?.prepend(renderShoutoutItem(await res.json()));
    msgEl.value='';
    msgEl.focus();
    showToast('✓ تم التسجيل في السجل التاريخي');
  } catch { showToast('حدث خطأ، حاول مرة ثانية', true); }
  finally { btn.disabled=false; btn.textContent=orig; }
}

// ─── POLLS ────────────────────────────────────────────────

function renderPoll(data) {
  pollId = data.id;
  document.getElementById('pollQuestion').textContent = data.question;
  const c = document.getElementById('pollOptions');
  c.innerHTML = '';
  data.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'poll-option' + (pollVoted?' voted':'') + (pollSelectedId===opt.id?' selected':'');
    btn.style.setProperty('--pct', opt.pct+'%');
    btn.dataset.optionId = opt.id;
    btn.innerHTML = `<span class="poll-text">${escapeHtml(opt.text)}</span><span class="poll-pct">${opt.pct}%</span>`;
    c.appendChild(btn);
  });
  document.getElementById('pollTotal').textContent = `${data.total} صوت · اختر بحكمة`;
}

async function castVote(optionId) {
  if (pollVoted||!pollId) return;
  pollVoted=true; pollSelectedId=optionId;
  try {
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ option_id: optionId }),
    });
    if (res.status===400) { showToast('صوّتت مسبقاً ✓'); return; }
    if (!res.ok) throw new Error();
    renderPoll(await res.json());
    showToast('✓ تم تسجيل صوتك');
  } catch { pollVoted=false; pollSelectedId=null; showToast('خطأ في التصويت', true); }
}

// ─── GALLERY UPLOAD ───────────────────────────────────────

function setupUploadZone() {
  const zone  = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');
  if (!zone||!input) return;

  zone.addEventListener('click', e => { if(e.target===zone||e.target.classList.contains('upload-text')||e.target.classList.contains('upload-icon')) input.click(); });
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', ()=> zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles([...e.dataTransfer.files]);
  });
  input.addEventListener('change', () => handleFiles([...input.files]));
}

function handleFiles(files) {
  if (!files.length) return;
  pendingFiles = files;
  const modal = document.getElementById('captionModal');
  if (modal) modal.classList.add('open');
  document.getElementById('captionInput')?.focus();
}

window.confirmUpload = async function() {
  const caption = document.getElementById('captionInput')?.value.trim() || '';
  document.getElementById('captionModal')?.classList.remove('open');
  if (document.getElementById('captionInput')) document.getElementById('captionInput').value = '';

  const progress = document.getElementById('uploadProgress');
  const bar      = document.getElementById('uploadBar');
  if (progress) progress.style.display='block';

  for (let i = 0; i < pendingFiles.length; i++) {
    const f = pendingFiles[i];
    const fd = new FormData();
    fd.append('file', f);
    fd.append('caption', caption);
    if (bar) bar.style.width = Math.round(((i+0.5)/pendingFiles.length)*100)+'%';
    try {
      const res = await fetch('/api/gallery/upload', { method:'POST', body: fd });
      if (!res.ok) { showToast('خطأ في رفع '+f.name, true); continue; }
      const item = await res.json();
      prependGalleryItem(item);
      hideGalleryEmpty();
    } catch { showToast('خطأ في رفع الملف', true); }
  }
  if (bar) bar.style.width='100%';
  setTimeout(() => { if(progress) progress.style.display='none'; if(bar) bar.style.width='0%'; }, 800);
  pendingFiles = [];
  showToast('✓ تم رفع الملفات بنجاح');
};

window.cancelUpload = function() {
  pendingFiles = [];
  document.getElementById('captionModal')?.classList.remove('open');
  if (document.getElementById('captionInput')) document.getElementById('captionInput').value='';
};

function hideGalleryEmpty() {
  const el = document.getElementById('galleryEmpty');
  if (el) el.style.display='none';
}

function prependGalleryItem(item) {
  if (item.id > latestGalleryId) latestGalleryId = item.id;
  let grid = document.getElementById('galleryGrid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'real-gallery-grid';
    grid.id = 'galleryGrid';
    const gallerySection = document.getElementById('gallery');
    if (gallerySection) gallerySection.appendChild(grid);
  }
  const div = document.createElement('div');
  div.className = 'real-gallery-item';
  div.dataset.id   = item.id;
  div.dataset.mine = 'true';
  const media = item.ftype==='video'
    ? `<video src="${item.url}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause()"></video>`
    : `<img src="${item.url}" alt="${escapeHtml(item.caption)}" loading="lazy">`;
  div.innerHTML = `
    ${media}
    <div class="gallery-overlay"></div>
    <div class="gallery-info">
      ${item.caption?`<div class="gallery-caption">${escapeHtml(item.caption)}</div>`:''}
      <div class="gallery-uploader">${escapeHtml(item.uploader)}</div>
    </div>
    <button class="gallery-delete" onclick="deleteGalleryItem(${item.id},this)" title="حذف">✕</button>`;
  grid.prepend(div);
}

window.deleteGalleryItem = async function(id, btn) {
  if (!confirm('حذف هذه الصورة؟')) return;
  try {
    const res = await fetch(`/api/gallery/${id}`, { method:'DELETE' });
    if (!res.ok) throw new Error();
    btn.closest('.real-gallery-item')?.remove();
    showToast('✓ تم الحذف');
  } catch { showToast('خطأ في الحذف', true); }
};

// ─── LIVE UPDATES (polling) ───────────────────────────────

function scanInitialIds() {
  // Track highest shoutout id already on the page
  document.querySelectorAll('#shoutoutsFeed .shoutout-item[data-id]').forEach(el => {
    const id = parseInt(el.dataset.id || 0);
    if (id > latestShoutoutId) latestShoutoutId = id;
  });
  // Track highest gallery id already on the page
  document.querySelectorAll('#galleryGrid .real-gallery-item[data-id]').forEach(el => {
    const id = parseInt(el.dataset.id || 0);
    if (id > latestGalleryId) latestGalleryId = id;
  });
}

async function pollShoutouts() {
  if (!latestShoutoutId) return;      // nothing on page yet, skip (avoid spamming)
  try {
    const res = await fetch(`/api/shoutouts?since=${latestShoutoutId}`);
    if (!res.ok) return;
    const items = await res.json();
    if (!items.length) return;
    const feed = document.getElementById('shoutoutsFeed');
    if (!feed) return;
    // Items come newest-first from the server; prepend in reverse so oldest-new appears first
    [...items].reverse().forEach(s => {
      const el = renderShoutoutItem(s, s.id);
      feed.prepend(el);
      el.classList.add('shoutout-new');
      setTimeout(() => el.classList.remove('shoutout-new'), 2000);
      if (s.id > latestShoutoutId) latestShoutoutId = s.id;
    });
  } catch { /* silent */ }
}

async function pollGallery() {
  if (!document.getElementById('gallery')) return;
  try {
    const res = await fetch(`/api/gallery?since=${latestGalleryId}`);
    if (!res.ok) return;
    const items = await res.json();
    if (!items.length) return;
    hideGalleryEmpty();
    [...items].reverse().forEach(item => {
      // Don't double-add our own fresh uploads
      if (document.querySelector(`#galleryGrid [data-id="${item.id}"]`)) return;
      prependGalleryItem(item, false);   // false = not mine (server says the truth anyway)
      if (item.id > latestGalleryId) latestGalleryId = item.id;
    });
  } catch { /* silent */ }
}

async function pollPolls() {
  if (!pollId) return;
  try {
    const res = await fetch(`/api/polls/${pollId}`);
    if (!res.ok) return;
    const pollData = await res.json();
    // Only update if there are changes (avoid unnecessary re-renders)
    const currentTotal = document.getElementById('pollTotal')?.textContent;
    const newTotal = `${pollData.total} صوت · اختر بحكمة`;
    if (currentTotal !== newTotal) {
      renderPoll(pollData);
    }
  } catch { /* silent */ }
}

function startLiveUpdates() {
  scanInitialIds();
  setInterval(pollShoutouts, POLL_INTERVAL);
  setInterval(pollGallery,   POLL_INTERVAL);
  setInterval(pollPolls,     POLL_INTERVAL);
}

// ─── SCROLL / NAV ─────────────────────────────────────────

function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold:0.08, rootMargin:'0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach((el,i) => {
    el.style.transitionDelay = (i%5)*0.07+'s';
    obs.observe(el);
  });
}

function initNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('nav a[href^="#"]');
  sections.forEach(s => new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href')==='#'+s.id));
  }, { threshold:0.35 }).observe(s));
}

// ─── INIT ─────────────────────────────────────────────────

function init() {
  updateCountdown();
  setInterval(updateCountdown, 1000);

  document.getElementById('shoutSubmit')?.addEventListener('click', submitShoutout);
  document.getElementById('shoutMsg')?.addEventListener('keydown', e => { if(e.key==='Enter'&&e.ctrlKey) submitShoutout(); });

  const pollEl = document.getElementById('pollOptions');
  if (pollEl) {
    pollId   = parseInt(pollEl.dataset.pollId);
    pollVoted= pollEl.dataset.voted==='true';
    pollEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-option-id]');
      if (btn) castVote(parseInt(btn.dataset.optionId));
    });
  }

  setupUploadZone();
  initScrollReveal();
  initNavHighlight();
  startLiveUpdates();
}

document.addEventListener('DOMContentLoaded', init);
