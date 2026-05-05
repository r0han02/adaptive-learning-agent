const STATE = loadState();
function defaultState() { return { level: 1, xp: 0, streak: 0, lastQuizDate: null, user: null, theme: 'dark', topicStats: {}, sessions: [], achievements: {} } }
function loadState() { try { const s = JSON.parse(localStorage.getItem('adaptiq_state')); return s || defaultState() } catch { return defaultState() } }
function saveState() { localStorage.setItem('adaptiq_state', JSON.stringify(STATE)) }

let quizState = { topic: 'javascript', mode: 'adaptive', manualDiff: 'medium', totalQ: 5, questions: [], currentQ: 0, correct: 0, startTime: 0, currentDiff: 'medium', answered: false };
const TOPIC_NAMES = { javascript: 'JavaScript', python: 'Python', datastructures: 'Data Structures', algorithms: 'Algorithms', databases: 'Databases', networking: 'Networking', generalknowledge: 'General Knowledge' };

// ===== THEME =====
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  STATE.theme = t; saveState();
  if (window.lucide) lucide.createIcons();
}
applyTheme('dark');

// ===== LOGIN =====
if (STATE.user) { showApp() }
document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('login-name').value.trim();
  const email = document.getElementById('login-email').value.trim();
  if (!name || !email) return;
  STATE.user = { name, email }; saveState(); showApp();
});

function showApp() {
  document.getElementById('page-login').classList.remove('active');
  document.getElementById('main-header').style.display = 'flex';
  switchPage('home');
  const u = STATE.user;
  if (u) {
    const initial = u.name.charAt(0).toUpperCase();
    document.getElementById('header-avatar').textContent = initial;
    document.getElementById('profile-avatar').textContent = initial;
    document.getElementById('profile-name').textContent = u.name;
    document.getElementById('profile-email').textContent = u.email;
    const sName = document.getElementById('sidebar-user-name');
    if (sName) sName.textContent = u.name;
  }
  updateHomePage();
}

// ===== NAVIGATION =====
document.querySelectorAll('.nav-item').forEach(tab => { tab.addEventListener('click', () => switchPage(tab.dataset.page)) });
function switchPage(page) {
  document.querySelectorAll('.nav-item').forEach(t => t.classList.toggle('active', t.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => {
    if (p.id === 'page-login') return;
    p.classList.toggle('active', p.id === 'page-' + page);
  });
  if (page === 'dashboard') renderDashboard();
  if (page === 'profile') renderProfile();
  // Close mobile sidebar
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('open');
}

// ===== HOME =====
document.getElementById('start-btn').addEventListener('click', () => switchPage('quiz'));
document.querySelectorAll('.topic-card').forEach(card => { card.addEventListener('click', () => { document.getElementById('quiz-topic-select').value = card.dataset.topic; switchPage('quiz') }) });
document.getElementById('header-user-badge').addEventListener('click', () => switchPage('profile'));

// ===== QUIZ SETUP =====
const modeBtns = document.querySelectorAll('.mode-btn');
modeBtns.forEach(btn => { btn.addEventListener('click', () => { modeBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); quizState.mode = btn.dataset.mode; document.getElementById('manual-difficulty-card').style.display = btn.dataset.mode === 'manual' ? 'block' : 'none' }) });
document.querySelectorAll('.diff-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); quizState.manualDiff = btn.dataset.diff }) });
document.getElementById('count-minus').addEventListener('click', () => { const el = document.getElementById('question-count'); el.textContent = Math.max(3, parseInt(el.textContent) - 1) });
document.getElementById('count-plus').addEventListener('click', () => { const el = document.getElementById('question-count'); el.textContent = Math.min(15, parseInt(el.textContent) + 1) });

// ===== BEGIN QUIZ =====
document.getElementById('begin-quiz-btn').addEventListener('click', startQuiz);
function startQuiz() {
  const topic = document.getElementById('quiz-topic-select').value;
  const totalQ = parseInt(document.getElementById('question-count').textContent);
  let diff = 'medium';
  if (quizState.mode === 'adaptive') { const s = STATE.topicStats[topic]; diff = s ? s.currentDiff : 'medium' } else { diff = quizState.manualDiff }
  quizState = { ...quizState, topic, totalQ, currentQ: 0, correct: 0, currentDiff: diff, startTime: Date.now(), questions: [], answered: false };
  generateQuestions();
  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-results').style.display = 'none';
  document.getElementById('quiz-active').style.display = 'block';
  renderQuestion();
}

function generateQuestions() {
  const bank = QUESTIONS[quizState.topic]; if (!bank) return;
  const pool = [...bank[quizState.currentDiff]];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]] }
  quizState.questions = pool.slice(0, quizState.totalQ).map(q => shuffleQuestion(q));
}

// ===== RENDER QUESTION =====
function renderQuestion() {
  const { questions, currentQ, totalQ } = quizState;
  if (currentQ >= questions.length) { showResults(); return }
  quizState.answered = false;
  const q = questions[currentQ];
  document.getElementById('q-number').textContent = (currentQ + 1) + '.';
  document.getElementById('q-text').textContent = q.q;
  document.getElementById('quiz-counter').textContent = (currentQ + 1) + ' / ' + totalQ;
  const pct = Math.round(((currentQ) / totalQ) * 100);
  document.getElementById('quiz-progress-bar').style.width = pct + '%';
  document.getElementById('quiz-pct').textContent = pct + '%';

  const grid = document.getElementById('options-grid'); grid.innerHTML = '';
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button'); btn.className = 'option-btn';
    btn.innerHTML = '<span class="opt-radio"></span><span>' + opt + '</span>';
    btn.addEventListener('click', () => handleAnswer(i)); grid.appendChild(btn);
  });
  document.getElementById('feedback-box').style.display = 'none';
  document.getElementById('next-btn').style.display = 'none';
  const wrap = document.querySelector('.quiz-card-wrap');
  wrap.style.animation = 'none'; wrap.offsetHeight; wrap.style.animation = 'slideIn 0.3s ease';
}

// ===== HANDLE ANSWER =====
function handleAnswer(selected) {
  if (quizState.answered) return; quizState.answered = true;
  const q = quizState.questions[quizState.currentQ]; const isCorrect = selected === q.ans;
  if (isCorrect) quizState.correct++;
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => { btn.disabled = true; if (i === q.ans) btn.classList.add('correct'); else if (i === selected && !isCorrect) btn.classList.add('wrong'); if (i === selected) btn.classList.add('selected') });
  const fb = document.getElementById('feedback-box'); fb.style.display = 'block';
  fb.className = 'feedback-box ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
  fb.innerHTML = (isCorrect ? '<i data-lucide="check-circle" class="icon-sm"></i> Correct! ' : '<i data-lucide="x-circle" class="icon-sm"></i> Incorrect. ') + q.explain;
  if (window.lucide) lucide.createIcons();
  document.getElementById('next-btn').style.display = 'inline-block';
}
document.getElementById('next-btn').addEventListener('click', () => { quizState.currentQ++; renderQuestion() });
document.addEventListener('keydown', e => {
  // Don't interfere with chat input or other form fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Enter' && quizState.answered && document.getElementById('quiz-active').style.display !== 'none') { quizState.currentQ++; renderQuestion() }
});

// ===== RESULTS =====
function showResults() {
  const { topic, correct, totalQ: total, startTime, currentDiff, mode } = quizState;
  const score = Math.round((correct / total) * 100); const timeS = Math.round((Date.now() - startTime) / 1000);
  STATE.sessions.unshift({ topic, diff: currentDiff, score, correct, total, time: timeS, date: new Date().toISOString() });
  if (STATE.sessions.length > 50) STATE.sessions.length = 50;
  if (!STATE.topicStats[topic]) STATE.topicStats[topic] = { quizzes: 0, totalScore: 0, currentDiff: 'medium', bestScore: 0 };
  const ts = STATE.topicStats[topic]; ts.quizzes++; ts.totalScore += score; if (score > ts.bestScore) ts.bestScore = score;
  STATE.xp += correct * 10 + (currentDiff === 'hard' ? 20 : currentDiff === 'medium' ? 10 : 5);
  STATE.level = Math.floor(STATE.xp / 100) + 1;
  const today = new Date().toDateString();
  if (STATE.lastQuizDate !== today) { const yest = new Date(Date.now() - 864e5).toDateString(); STATE.streak = (STATE.lastQuizDate === yest) ? STATE.streak + 1 : 1; STATE.lastQuizDate = today }
  let adaptMsg = '';
  if (mode === 'adaptive') {
    if (score >= 80 && currentDiff !== 'hard') { const n = currentDiff === 'easy' ? 'medium' : 'hard'; ts.currentDiff = n; adaptMsg = '<i data-lucide="rocket" class="icon-sm"></i> Difficulty increased to ' + n.toUpperCase() + ' next time!' }
    else if (score < 40 && currentDiff !== 'easy') { const n = currentDiff === 'hard' ? 'medium' : 'easy'; ts.currentDiff = n; adaptMsg = '<i data-lucide="book-open" class="icon-sm"></i> Difficulty adjusted to ' + n.toUpperCase() + ' for practice.' }
    else { adaptMsg = '<i data-lucide="bar-chart-2" class="icon-sm"></i> Staying at ' + currentDiff.toUpperCase() + '. Keep it up!' }
  }
  checkAchievements(); saveState();
  document.getElementById('quiz-active').style.display = 'none';
  document.getElementById('quiz-results').style.display = 'flex';
  document.getElementById('results-emoji').innerHTML = score >= 80 ? '<i data-lucide="party-popper" style="width:48px;height:48px;"></i>' : score >= 50 ? '<i data-lucide="thumbs-up" style="width:48px;height:48px;"></i>' : '<i data-lucide="book" style="width:48px;height:48px;"></i>';
  document.getElementById('results-title').textContent = score >= 80 ? 'Excellent Work!' : score >= 50 ? 'Good Effort!' : 'Keep Practicing!';
  document.getElementById('ring-score').textContent = score + '%';
  document.getElementById('res-correct').textContent = correct;
  document.getElementById('res-wrong').textContent = total - correct;
  document.getElementById('res-time').textContent = timeS + 's';
  document.getElementById('res-diff').textContent = currentDiff.charAt(0).toUpperCase() + currentDiff.slice(1);
  document.getElementById('adaptation-msg').innerHTML = adaptMsg;
  document.getElementById('adaptation-msg').style.display = adaptMsg ? 'block' : 'none';
  if (window.lucide) lucide.createIcons();
  const c = document.getElementById('score-ring-circle');
  setTimeout(() => { c.style.transition = 'stroke-dashoffset 1.2s ease'; c.style.strokeDashoffset = 314 - (314 * (score / 100)) }, 100);
  updateHomePage();
}

// ===== ACHIEVEMENTS =====
const ACHIEVEMENTS = [
  { id: 'first_quiz', icon: 'graduation-cap', name: 'First Quiz', desc: 'Complete your first quiz', check: () => STATE.sessions.length >= 1 },
  { id: 'perfect', icon: 'award', name: 'Perfectionist', desc: 'Score 100%', check: () => STATE.sessions.some(s => s.score === 100) },
  { id: 'five_quizzes', icon: 'book', name: 'Dedicated', desc: 'Complete 5 quizzes', check: () => STATE.sessions.length >= 5 },
  { id: 'ten_quizzes', icon: 'medal', name: 'Quiz Master', desc: 'Complete 10 quizzes', check: () => STATE.sessions.length >= 10 },
  { id: 'hard_pass', icon: 'flame', name: 'Hard Hero', desc: 'Pass hard quiz (≥60%)', check: () => STATE.sessions.some(s => s.diff === 'hard' && s.score >= 60) },
  { id: 'streak_3', icon: 'zap', name: '3-Day Streak', desc: '3-day streak', check: () => STATE.streak >= 3 },
  { id: 'level_5', icon: 'star', name: 'Level 5', desc: 'Reach level 5', check: () => STATE.level >= 5 },
  { id: 'all_topics', icon: 'globe', name: 'Explorer', desc: 'Try all 7 topics', check: () => Object.keys(STATE.topicStats).length >= 7 },
];
function checkAchievements() { ACHIEVEMENTS.forEach(a => { if (!STATE.achievements[a.id] && a.check()) STATE.achievements[a.id] = true }) }

// ===== RESULT BUTTONS =====
document.getElementById('retry-btn').addEventListener('click', () => { document.getElementById('quiz-results').style.display = 'none'; document.getElementById('quiz-setup').style.display = 'block' });
document.getElementById('dashboard-btn').addEventListener('click', () => { document.getElementById('quiz-results').style.display = 'none'; document.getElementById('quiz-setup').style.display = 'block'; switchPage('dashboard') });

// ===== DASHBOARD =====
function renderDashboard() {
  const total = STATE.sessions.length; const avg = total ? Math.round(STATE.sessions.reduce((a, s) => a + s.score, 0) / total) : 0;
  document.getElementById('stat-total-quizzes').textContent = total;
  document.getElementById('stat-avg-score').textContent = avg + '%';
  document.getElementById('stat-streak').textContent = STATE.streak;
  document.getElementById('stat-level').textContent = STATE.level;
  document.getElementById('user-level-badge').textContent = 'Level ' + STATE.level;
  renderScoreChart(); renderMasteryBars(); renderSessions(); renderAchievements();
  if (window.lucide) lucide.createIcons();
}

function renderScoreChart() {
  const canvas = document.getElementById('score-chart'); const empty = document.getElementById('score-chart-empty');
  const sessions = STATE.sessions.slice(0, 20).reverse();
  if (!sessions.length) { canvas.style.display = 'none'; empty.style.display = 'block'; return }
  canvas.style.display = 'block'; empty.style.display = 'none';
  const ctx = canvas.getContext('2d'); const W = canvas.width = canvas.parentElement.clientWidth - 48; const H = canvas.height = 200;
  ctx.clearRect(0, 0, W, H); const pad = { top: 20, right: 20, bottom: 30, left: 40 }; const cW = W - pad.left - pad.right; const cH = H - pad.top - pad.bottom;
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
  ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = pad.top + (cH / 4) * i; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke(); ctx.fillStyle = textColor; ctx.font = '11px Inter'; ctx.textAlign = 'right'; ctx.fillText((100 - i * 25) + '%', pad.left - 8, y + 4) }
  if (sessions.length < 2) return;
  const stepX = cW / (sessions.length - 1);
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim();
  ctx.beginPath(); sessions.forEach((s, i) => { const x = pad.left + i * stepX; const y = pad.top + cH - (s.score / 100) * cH; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) });
  ctx.lineTo(pad.left + (sessions.length - 1) * stepX, pad.top + cH); ctx.lineTo(pad.left, pad.top + cH); ctx.closePath();
  const aG = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH); aG.addColorStop(0, accentColor + '33'); aG.addColorStop(1, accentColor + '00'); ctx.fillStyle = aG; ctx.fill();
  const lG = ctx.createLinearGradient(pad.left, 0, W - pad.right, 0); lG.addColorStop(0, accentColor); lG.addColorStop(1, accent2);
  ctx.beginPath(); sessions.forEach((s, i) => { const x = pad.left + i * stepX; const y = pad.top + cH - (s.score / 100) * cH; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }); ctx.strokeStyle = lG; ctx.lineWidth = 2.5; ctx.stroke();
  sessions.forEach((s, i) => { const x = pad.left + i * stepX; const y = pad.top + cH - (s.score / 100) * cH; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = s.score >= 80 ? '#34d399' : s.score >= 50 ? '#fbbf24' : '#f87171'; ctx.fill() });
}

function renderMasteryBars() {
  const c = document.getElementById('mastery-bars'); const topics = Object.entries(STATE.topicStats);
  if (!topics.length) { c.innerHTML = '<div class="mastery-empty">No data yet.</div>'; return }
  c.innerHTML = topics.map(([k, v]) => { const avg = v.quizzes ? Math.round(v.totalScore / v.quizzes) : 0; return '<div class="mastery-row"><div class="mastery-topic"><span>' + (TOPIC_NAMES[k] || k) + '</span><span>' + avg + '%</span></div><div class="mastery-bar-bg"><div class="mastery-bar-fill" style="width:' + avg + '%"></div></div></div>' }).join('');
}

function renderSessions() {
  const c = document.getElementById('sessions-list'); const ss = STATE.sessions.slice(0, 10);
  if (!ss.length) { c.innerHTML = '<div class="mastery-empty">No sessions yet.</div>'; return }
  const dc = { easy: 'var(--easy)', medium: 'var(--medium)', hard: 'var(--hard)' };
  c.innerHTML = ss.map(s => { const d = new Date(s.date); return '<div class="session-row"><span class="session-topic">' + (TOPIC_NAMES[s.topic] || s.topic) + '</span><span style="color:' + dc[s.diff] + ';font-size:12px;font-weight:600">' + s.diff.toUpperCase() + '</span><span class="session-score" style="color:' + (s.score >= 80 ? 'var(--easy)' : s.score >= 50 ? 'var(--medium)' : 'var(--hard)') + '">' + s.score + '%</span><span class="session-meta">' + s.correct + '/' + s.total + ' · ' + s.time + 's · ' + d.toLocaleDateString() + '</span></div>' }).join('');
}

function renderAchievements() {
  const c = document.getElementById('achievements-grid');
  c.innerHTML = ACHIEVEMENTS.map(a => { const u = STATE.achievements[a.id]; return '<div class="achievement ' + (u ? 'unlocked' : 'locked') + '"><span class="achievement-icon"><i data-lucide="' + a.icon + '"></i></span><div><div class="achievement-name">' + a.name + '</div><div class="achievement-desc">' + a.desc + '</div></div></div>' }).join('');
}

// ===== PROFILE =====
function renderProfile() {
  const total = STATE.sessions.length; const avg = total ? Math.round(STATE.sessions.reduce((a, s) => a + s.score, 0) / total) : 0;
  const best = total ? Math.max(...STATE.sessions.map(s => s.score)) : 0;
  document.getElementById('profile-level').textContent = STATE.level;
  const xpInLevel = STATE.xp % 100;
  document.getElementById('profile-xp-fill').style.width = xpInLevel + '%';
  document.getElementById('profile-xp-text').textContent = xpInLevel + ' / 100 XP';
  document.getElementById('prof-quizzes').textContent = total;
  document.getElementById('prof-avg').textContent = avg + '%';
  document.getElementById('prof-streak').textContent = STATE.streak + ' days';
  document.getElementById('prof-xp').textContent = STATE.xp;
  document.getElementById('prof-topics').textContent = Object.keys(STATE.topicStats).length;
  document.getElementById('prof-best').textContent = best + '%';
}

document.getElementById('logout-btn').addEventListener('click', () => { STATE.user = null; saveState(); location.reload() });
document.getElementById('clear-data-btn').addEventListener('click', () => { if (confirm('Clear all progress data? This cannot be undone.')) { localStorage.removeItem('adaptiq_state'); location.reload() } });

// ===== UPDATE HOME =====
function updateHomePage() {
  Object.keys(TOPIC_NAMES).forEach(t => {
    const s = STATE.topicStats[t]; const m = document.getElementById('meta-' + t); const p = document.getElementById('prog-' + t);
    if (s && m && p) { m.textContent = s.quizzes + ' quizzes taken'; p.style.width = Math.round(s.totalScore / s.quizzes) + '%' }
  });
  document.getElementById('user-level-badge').textContent = 'Level ' + STATE.level;
}
updateHomePage();

// ============================================================
// AI TUTOR CHAT — Powered by Groq (llama3-8b-8192)
// ============================================================
// SETUP:
//   1. Go to https://console.groq.com → sign up free → create API key
//   2. Open config.js and set your GROQ_API_KEY
//   Then the AI Tutor will work automatically.
// ============================================================
(function () {
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  function getGroqKey() {
    return (typeof ADAPTIQ_CONFIG !== 'undefined' && ADAPTIQ_CONFIG.GROQ_API_KEY)
      ? ADAPTIQ_CONFIG.GROQ_API_KEY
      : '';
  }
  function getGroqModel() {
    return (typeof ADAPTIQ_CONFIG !== 'undefined' && ADAPTIQ_CONFIG.GROQ_MODEL)
      ? ADAPTIQ_CONFIG.GROQ_MODEL
      : 'llama-3.1-8b-instant';
  }
  function getGroqMaxTokens() {
    return (typeof ADAPTIQ_CONFIG !== 'undefined' && ADAPTIQ_CONFIG.GROQ_MAX_TOKENS)
      ? ADAPTIQ_CONFIG.GROQ_MAX_TOKENS
      : 1024;
  }

  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatTopicSelect = document.getElementById('chat-topic');
  if (!chatForm) return;

  // Full conversation history — sent to Groq for context
  let chatHistory = [];

  // Simple markdown to HTML converter
  function mdToHtml(text) {
    let html = text
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    html = html.split('\n\n').map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<ul') || block.startsWith('<ol') || block.startsWith('<blockquote')) return block;
      return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
    }).join('');
    return html;
  }

  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + role;
    const avatarContent = role === 'ai'
      ? '<i data-lucide="bot"></i>'
      : (STATE.user ? STATE.user.name.charAt(0).toUpperCase() : 'U');
    bubble.innerHTML = `
      <div class="chat-bubble-avatar">${avatarContent}</div>
      <div class="chat-bubble-content">
        <div class="chat-bubble-name">${role === 'ai' ? 'AdaptIQ AI' : 'You'}</div>
        <div class="chat-bubble-text">${role === 'ai' ? mdToHtml(text) : text}</div>
      </div>`;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (window.lucide) lucide.createIcons();
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chat-bubble ai';
    el.id = 'typing-bubble';
    el.innerHTML = `
      <div class="chat-bubble-avatar"><i data-lucide="bot"></i></div>
      <div class="chat-bubble-content">
        <div class="chat-bubble-name">AdaptIQ AI</div>
        <div class="typing-indicator"><span></span><span></span><span></span></div>
      </div>`;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (window.lucide) lucide.createIcons();
  }

  function hideTyping() {
    const el = document.getElementById('typing-bubble');
    if (el) el.remove();
  }

  async function sendMessage(message) {
    // Check for API key before sending
    const apiKey = getGroqKey();
    if (!apiKey || apiKey === 'your_key_here') {
      addMessage('user', message);
      chatInput.value = '';
      addMessage('ai', '⚠️ **Groq API key not configured.**\n\nTo use the AI Tutor:\n\n1. Go to [console.groq.com](https://console.groq.com) and sign up (free)\n2. Create an API key\n3. Open `config.js` and replace `your_key_here` with your API key\n4. Refresh the page\n\nThat\'s it — no downloads needed!');
      return;
    }

    addMessage('user', message);
    chatInput.value = '';
    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    // Build Groq-compatible messages with AdaptIQ system prompt
    const topic = chatTopicSelect.value;
    const systemMsg = {
      role: 'system',
      content: 'You are an AI tutor inside AdaptIQ, a learning platform. '
        + 'Help users understand quiz topics, explain wrong answers, '
        + 'suggest what to study next, and motivate them to keep learning. '
        + (topic !== 'general' ? 'The user is currently studying: ' + topic + '. Focus your answers on this topic when relevant. ' : '')
        + 'Explain concepts clearly with examples and code snippets when appropriate. Use markdown formatting.'
    };

    chatHistory.push({ role: 'user', content: message });

    showTyping();

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: getGroqModel(),
          messages: [systemMsg, ...chatHistory],
          max_tokens: getGroqMaxTokens()
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        if (res.status === 401) throw new Error('Invalid API key. Please check your key in config.js.');
        if (res.status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        throw new Error('Groq API returned status ' + res.status + ': ' + errBody);
      }

      const data = await res.json();
      hideTyping();
      const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
        ? data.choices[0].message.content
        : 'Sorry, I received an empty response.';
      addMessage('ai', reply);
      chatHistory.push({ role: 'assistant', content: reply });
    } catch (err) {
      hideTyping();
      const errorMsg = (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))
        ? '⚠️ **Could not connect to Groq API.** Please check your internet connection and try again.'
        : '⚠️ **Error:** ' + err.message;
      addMessage('ai', errorMsg);
    }
    chatSendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }

  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (!msg) return;
    sendMessage(msg);
  });

  // Suggestion chips — powered by Groq
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q');
      if (q) sendMessage(q);
    });
  });
})();

// ============================================================
// AI-POWERED QUIZ GENERATION (enhances existing quiz)
// ============================================================
(function () {
  const beginBtn = document.getElementById('begin-quiz-btn');
  if (!beginBtn) return;

  // Override the startQuiz function to try AI generation first
  const originalStartQuiz = window.startQuiz || startQuiz;

  // Replace the begin quiz button handler
  beginBtn.removeEventListener('click', originalStartQuiz);
  beginBtn.addEventListener('click', async function () {
    const topic = document.getElementById('quiz-topic-select').value;
    const totalQ = parseInt(document.getElementById('question-count').textContent);
    let diff = 'medium';
    if (quizState.mode === 'adaptive') {
      const s = STATE.topicStats[topic];
      diff = s ? s.currentDiff : 'medium';
    } else {
      diff = quizState.manualDiff;
    }

    quizState = { ...quizState, topic, totalQ, currentQ: 0, correct: 0, currentDiff: diff, startTime: Date.now(), questions: [], answered: false };

    // Show loading state
    document.getElementById('quiz-setup').style.display = 'none';
    document.getElementById('quiz-results').style.display = 'none';
    document.getElementById('quiz-active').style.display = 'block';
    document.getElementById('q-text').textContent = 'Generating AI questions...';
    document.getElementById('options-grid').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="typing-indicator" style="justify-content:center"><span></span><span></span><span></span></div><p style="margin-top:16px">AI is crafting personalized questions...</p></div>';

    let useAI = false;
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: TOPIC_NAMES[topic] || topic, difficulty: diff, count: totalQ })
      });
      const data = await res.json();
      if (data.status === 'ok' && data.questions && data.questions.length > 0) {
        quizState.questions = data.questions.map(q => shuffleQuestion(q));
        useAI = true;
      }
    } catch (e) { /* fallback to static */ }

    if (!useAI) {
      // Fallback to static question bank
      generateQuestions();
    }

    // Add AI badge to quiz title if AI-generated
    const titleEl = document.querySelector('.quiz-card-title');
    if (titleEl) {
      titleEl.innerHTML = 'Student Quiz' + (useAI ? ' <span class="ai-badge"><i data-lucide="sparkles"></i> AI Generated</span>' : '');
    }

    renderQuestion();
    if (window.lucide) lucide.createIcons();
  });
})();
