const GRADUATION = new Date(Date.UTC(2025, 5, 30, 0, 0, 0));
const AVATARS = ['🧠','📊','🤖','🐍','📈','🔬','💡','🎯','🦾','📐'];

let pollVoted = false;
let pollSelectedId = null;
let pollId = null;

function pad(v) { return String(v).padStart(2,'0'); }

function updateCountdown() {
  const diff = GRADUATION - Date.now();
  if (diff <= 0) {
    ['cd-days','cd-hours','cd-mins'].forEach(id => document.getElementById(id).textContent = '00');
    document.getElementById('cd-secs').textContent = '🎉';
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
  setTimeout(() => t.classList.remove('show'), 3000);
}

function renderShoutoutItem(s) {
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const div = document.createElement('div');
  div.className = 'shoutout-item';
  div.innerHTML = `
    <div class="shoutout-avatar">${avatar}</div>
    <div>
      <div class="shoutout-name">${s.name.toUpperCase()}</div>
      <div class="shoutout-text">${escapeHtml(s.message)}</div>
      <div class="shoutout-time">${s.time}</div>
    </div>`;
  return div;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderShoutouts(list) {
  const feed = document.getElementById('shoutoutsFeed');
  feed.innerHTML = '';
  list.forEach(s => feed.appendChild(renderShoutoutItem(s)));
}

async function submitShoutout() {
  const nameEl = document.getElementById('shoutName');
  const msgEl  = document.getElementById('shoutMsg');
  const btn    = document.getElementById('shoutSubmit');
  const name   = nameEl.value.trim();
  const message = msgEl.value.trim();
  if (!name || !message) { showToast('أدخل اسمك ورسالتك'); return; }

  btn.disabled = true;
  try {
    const res = await fetch('/api/shoutouts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name, message }),
    });
    if (!res.ok) throw new Error('server error');
    const shoutout = await res.json();
    const feed = document.getElementById('shoutoutsFeed');
    const item = renderShoutoutItem(shoutout);
    feed.prepend(item);
    nameEl.value = '';
    msgEl.value = '';
    showToast('تم التسجيل في السجل التاريخي ✓');
  } catch (e) {
    showToast('حدث خطأ، حاول مرة ثانية');
  } finally {
    btn.disabled = false;
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
    btn.className = 'poll-option' + (pollVoted ? ' voted' : '') + (pollSelectedId === opt.id ? ' selected' : '');
    btn.style.setProperty('--pct', opt.pct + '%');
    btn.dataset.optionId = opt.id;
    btn.innerHTML = `<span>${escapeHtml(opt.text)}</span><span class="poll-pct">${opt.pct}%</span>`;
    btn.addEventListener('click', () => castVote(opt.id));
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
    showToast('تم تسجيل صوتك ✓');
  } catch {
    pollVoted = false;
    pollSelectedId = null;
    showToast('حدث خطأ في التصويت');
  }
}

function activateNavOnScroll() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => observer.observe(s));
}

function init() {
  updateCountdown();
  setInterval(updateCountdown, 1000);

  const shoutoutsFeed = document.getElementById('shoutoutsFeed');
  if (shoutoutsFeed && shoutoutsFeed.dataset.loaded) {
  }

  document.getElementById('shoutSubmit')?.addEventListener('click', submitShoutout);

  const pollEl = document.getElementById('pollOptions');
  if (pollEl && pollEl.dataset.pollId) {
    pollId = parseInt(pollEl.dataset.pollId);
  }

  document.getElementById('pollOptions')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-option-id]');
    if (!btn) return;
    castVote(parseInt(btn.dataset.optionId));
  });

  activateNavOnScroll();
}

document.addEventListener('DOMContentLoaded', init);
