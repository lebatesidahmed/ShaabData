const GRADUATION = new Date(Date.UTC(2025, 5, 30, 0, 0, 0));
const AVATARS = ['🧠','📊','🤖','🐍','📈','🔬','💡','🎯','🦾','📐','🧬','🌐'];

let pollVoted = false;
let pollSelectedId = null;
let pollId = null;

function pad(v) { return String(v).padStart(2,'0'); }

function updateCountdown() {
  const diff = GRADUATION - Date.now();
  if (diff <= 0) {
    document.getElementById('cd-days').textContent  = '00';
    document.getElementById('cd-hours').textContent = '00';
    document.getElementById('cd-mins').textContent  = '00';
    document.getElementById('cd-secs').textContent  = '🎉';
    return;
  }
  document.getElementById('cd-days').textContent  = pad(Math.floor(diff / 86400000));
  document.getElementById('cd-hours').textContent = pad(Math.floor((diff % 86400000) / 3600000));
  document.getElementById('cd-mins').textContent  = pad(Math.floor((diff % 3600000) / 60000));
  document.getElementById('cd-secs').textContent  = pad(Math.floor((diff % 60000) / 1000));
}

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderShoutoutItem(s) {
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const div = document.createElement('div');
  div.className = 'shoutout-item';
  div.innerHTML = `
    <div class="shoutout-avatar">${avatar}</div>
    <div>
      <div class="shoutout-name">${escapeHtml(s.name).toUpperCase()}</div>
      <div class="shoutout-text">${escapeHtml(s.message)}</div>
      <div class="shoutout-time">${s.time}</div>
    </div>`;
  return div;
}

async function submitShoutout() {
  const nameEl = document.getElementById('shoutName');
  const msgEl  = document.getElementById('shoutMsg');
  const btn    = document.getElementById('shoutSubmit');
  const name   = nameEl.value.trim();
  const message = msgEl.value.trim();
  if (!name || !message) { showToast('أدخل اسمك ورسالتك أولاً'); return; }

  btn.disabled = true;
  btn.textContent = '...جاري الإرسال';
  try {
    const res = await fetch('/api/shoutouts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name, message }),
    });
    if (!res.ok) throw new Error();
    const shoutout = await res.json();
    const feed = document.getElementById('shoutoutsFeed');
    feed.prepend(renderShoutoutItem(shoutout));
    nameEl.value = '';
    msgEl.value = '';
    nameEl.focus();
    showToast('✓ تم التسجيل في السجل التاريخي');
  } catch {
    showToast('حدث خطأ، حاول مرة ثانية');
  } finally {
    btn.disabled = false;
    btn.textContent = 'إرسال إلى السجل ←';
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
    if (!res.ok) throw new Error();
    const data = await res.json();
    renderPoll(data);
    showToast('✓ تم تسجيل صوتك');
  } catch {
    pollVoted = false;
    pollSelectedId = null;
    showToast('خطأ في التصويت، حاول مرة ثانية');
  }
}

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el, i) => {
    el.style.transitionDelay = (i % 6) * 0.07 + 's';
    observer.observe(el);
  });
}

function initNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('nav a[href^="#"]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { threshold: 0.35 });
  sections.forEach(s => obs.observe(s));
}

function init() {
  updateCountdown();
  setInterval(updateCountdown, 1000);

  document.getElementById('shoutSubmit')?.addEventListener('click', submitShoutout);
  document.getElementById('shoutMsg')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) submitShoutout();
  });

  const pollOptionsEl = document.getElementById('pollOptions');
  if (pollOptionsEl?.dataset.pollId) {
    pollId = parseInt(pollOptionsEl.dataset.pollId);
    pollOptionsEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-option-id]');
      if (btn) castVote(parseInt(btn.dataset.optionId));
    });
  }

  initScrollReveal();
  initNavHighlight();
}

document.addEventListener('DOMContentLoaded', init);
