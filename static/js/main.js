const GRADUATION = new Date(Date.UTC(2025, 5, 30, 0, 0, 0));
const AVATARS = ['🧠','📊','🤖','🐍','📈','🔬','💡','🎯','🦾','📐','🧬','🌐'];

let pollVoted = false;
let pollSelectedId = null;
let pollId = null;

function pad(v) { return String(v).padStart(2,'0'); }

function updateCountdown() {
  const diff = GRADUATION - Date.now();
  if (diff <= 0) {
    ['cd-days','cd-hours','cd-mins'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '00';
    });
    const s = document.getElementById('cd-secs');
    if (s) s.textContent = '🎉';
    return;
  }
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = pad(v); };
  set('cd-days',  Math.floor(diff / 86400000));
  set('cd-hours', Math.floor((diff % 86400000) / 3600000));
  set('cd-mins',  Math.floor((diff % 3600000) / 60000));
  set('cd-secs',  Math.floor((diff % 60000) / 1000));
}

function showToast(msg, isError = false) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = isError ? 'var(--red)' : 'var(--green)';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function randomAvatar() { return AVATARS[Math.floor(Math.random() * AVATARS.length)]; }

function renderShoutoutItem(s) {
  const div = document.createElement('div');
  div.className = 'shoutout-item';
  div.innerHTML = `
    <div class="shoutout-avatar">${randomAvatar()}</div>
    <div>
      <div class="shoutout-name">${escapeHtml(s.name).toUpperCase()}</div>
      <div class="shoutout-text">${escapeHtml(s.message)}</div>
      <div class="shoutout-time">${s.time}</div>
    </div>`;
  return div;
}

async function submitShoutout() {
  if (typeof IS_LOGGED_IN !== 'undefined' && !IS_LOGGED_IN) {
    window.location.href = '/login';
    return;
  }
  const msgEl = document.getElementById('shoutMsg');
  const btn   = document.getElementById('shoutSubmit');
  const message = msgEl?.value.trim();
  if (!message) { showToast('اكتب رسالتك أولاً', true); return; }

  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = '...جاري الإرسال';
  try {
    const res = await fetch('/api/shoutouts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ message }),
    });
    if (res.status === 401) { window.location.href = '/login'; return; }
    if (!res.ok) throw new Error();
    const shoutout = await res.json();
    document.getElementById('shoutoutsFeed')?.prepend(renderShoutoutItem(shoutout));
    msgEl.value = '';
    msgEl.focus();
    showToast('✓ تم التسجيل في السجل التاريخي');
  } catch {
    showToast('حدث خطأ، حاول مرة ثانية', true);
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

function renderPoll(data) {
  pollId = data.id;
  document.getElementById('pollQuestion').textContent = data.question;
  const container = document.getElementById('pollOptions');
  container.innerHTML = '';
  data.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'poll-option'
      + (pollVoted ? ' voted' : '')
      + (pollSelectedId === opt.id ? ' selected' : '');
    btn.style.setProperty('--pct', opt.pct + '%');
    btn.dataset.optionId = opt.id;
    btn.innerHTML = `<span class="poll-text">${escapeHtml(opt.text)}</span><span class="poll-pct">${opt.pct}%</span>`;
    container.appendChild(btn);
  });
  document.getElementById('pollTotal').textContent = `${data.total} صوت · اختر بحكمة`;
}

async function castVote(optionId) {
  if (pollVoted || !pollId) return;
  pollVoted = true;
  pollSelectedId = optionId;
  try {
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ option_id: optionId }),
    });
    if (res.status === 400) { showToast('صوّتت مسبقاً ✓', false); return; }
    if (!res.ok) throw new Error();
    renderPoll(await res.json());
    showToast('✓ تم تسجيل صوتك');
  } catch {
    pollVoted = false;
    pollSelectedId = null;
    showToast('خطأ في التصويت، حاول مرة ثانية', true);
  }
}

function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i % 5) * 0.07 + 's';
    obs.observe(el);
  });
}

function initNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('nav a[href^="#"]');
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting)
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { threshold: 0.35 }).observe && sections.forEach(s =>
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting)
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + s.id));
    }, { threshold: 0.35 }).observe(s)
  );
}

function init() {
  updateCountdown();
  setInterval(updateCountdown, 1000);

  document.getElementById('shoutSubmit')?.addEventListener('click', submitShoutout);
  document.getElementById('shoutMsg')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) submitShoutout();
  });

  const pollEl = document.getElementById('pollOptions');
  if (pollEl) {
    pollId = parseInt(pollEl.dataset.pollId);
    pollVoted = pollEl.dataset.voted === 'true';
    pollEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-option-id]');
      if (btn) castVote(parseInt(btn.dataset.optionId));
    });
  }

  initScrollReveal();
  initNavHighlight();
}

document.addEventListener('DOMContentLoaded', init);
