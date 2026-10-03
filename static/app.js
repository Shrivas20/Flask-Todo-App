/* ============================================================
   TASKFLOW – APP.JS
   All API calls target FastAPI running on same origin.
   ============================================================ */

const API = '';   // same-origin; change to 'http://127.0.0.1:8000' if needed

// ── State ──────────────────────────────────────────────────────────────────
let token    = localStorage.getItem('tf_token') || null;
let currentUser = null;
let allTodos = [];
let currentFilter = 'all';
let deleteCandidateId = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const authWrapper  = document.getElementById('authWrapper');
const dashboard    = document.getElementById('dashboard');
const todoList     = document.getElementById('todoList');
const emptyState   = document.getElementById('emptyState');
const modalOverlay = document.getElementById('modalOverlay');
const deleteOverlay= document.getElementById('deleteOverlay');
const descTextarea = document.getElementById('todoDesc');

// ─────────────────────────────────────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────────────────────────────────────
(function initParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      animation-duration:${Math.random()*18+12}s;
      animation-delay:${Math.random()*10}s;
      opacity:0;
      background: hsl(${Math.random()>0.5?246:280},80%,70%);
    `;
    container.appendChild(p);
  }
})();

// ─────────────────────────────────────────────────────────────────────────
//  AUTH HELPERS
// ─────────────────────────────────────────────────────────────────────────
function showCard(id) {
  document.querySelectorAll('.form-card').forEach(c => c.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  clearAlerts();
}

function showAlert(id, msg, type='error') {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `alert ${type} show`;
}

function clearAlerts() {
  document.querySelectorAll('.alert').forEach(el => {
    el.className = 'alert'; el.textContent = '';
  });
}

function setLoading(btn, loading) {
  const txt = btn.querySelector('.btn-text');
  const spn = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  if (txt) txt.style.display = loading ? 'none' : '';
  if (spn) spn.classList.toggle('spinning', loading);
}

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.style.opacity = input.type === 'text' ? '1' : '0.5';
}

// ─────────────────────────────────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) return showAlert('loginAlert', 'Please fill in all fields.');

  setLoading(btn, true);
  try {
    const form = new URLSearchParams({ username, password, grant_type: 'password' });
    const res  = await fetch(`${API}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid credentials.');
    }
    const data = await res.json();
    token = data.access_token;
    localStorage.setItem('tf_token', token);
    await enterDashboard();
  } catch (err) {
    showAlert('loginAlert', err.message);
  } finally {
    setLoading(btn, false);
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  REGISTER
// ─────────────────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');

  const payload = {
    username:   document.getElementById('regUsername').value.trim(),
    email:      document.getElementById('regEmail').value.trim(),
    first_name: document.getElementById('regFirstName').value.trim(),
    last_name:  document.getElementById('regLastName').value.trim(),
    password:   document.getElementById('regPassword').value,
    role:       document.getElementById('regRole').value
  };

  if (Object.values(payload).some(v => !v))
    return showAlert('registerAlert', 'Please fill in all fields.');

  setLoading(btn, true);
  try {
    const res = await fetch(`${API}/auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed.');
    }
    showAlert('registerAlert', '✓ Account created! Please sign in.', 'success');
    setTimeout(() => showCard('loginCard'), 1800);
  } catch (err) {
    showAlert('registerAlert', err.message);
  } finally {
    setLoading(btn, false);
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  DASHBOARD INIT
// ─────────────────────────────────────────────────────────────────────────
async function enterDashboard() {
  try {
    const res = await apiFetch('/users/');
    if (!res.ok) throw new Error('Session expired.');
    currentUser = await res.json();
    populateUserUI();
    authWrapper.classList.add('hidden');
    dashboard.hidden = false;
    await loadTodos();
    setView('todos');
  } catch (err) {
    logout();
  }
}

function populateUserUI() {
  const initial = (currentUser.first_name?.[0] || currentUser.username?.[0] || 'U').toUpperCase();
  document.getElementById('sidebarAvatar').textContent  = initial;
  document.getElementById('topbarAvatar').textContent   = initial;
  document.getElementById('profileAvatar').textContent  = initial;
  document.getElementById('sidebarUsername').textContent = currentUser.username;
  document.getElementById('sidebarRole').textContent     = currentUser.role || 'member';
  document.getElementById('profileFullName').textContent = `${currentUser.first_name} ${currentUser.last_name}`;
  document.getElementById('profileEmail').textContent    = currentUser.email;
  document.getElementById('profileUsername').textContent = currentUser.username;
  document.getElementById('profileEmailDetail').textContent = currentUser.email;
  document.getElementById('profileRoleDetail').textContent  = currentUser.role || 'member';
  document.getElementById('profileRoleBadge').textContent   = currentUser.role || 'member';
}

function logout() {
  token = null; currentUser = null; allTodos = [];
  localStorage.removeItem('tf_token');
  dashboard.hidden = true;
  authWrapper.classList.remove('hidden');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  showCard('loginCard');
  toast('Signed out successfully.', 'info');
}

// ─────────────────────────────────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────────────────────────────────
function setView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (view === 'todos') {
    document.getElementById('todoView').classList.add('active');
    document.getElementById('navTodos').classList.add('active');
    document.getElementById('topbarTitle').textContent = 'My Tasks';
  } else if (view === 'profile') {
    document.getElementById('profileView').classList.add('active');
    document.getElementById('navProfile').classList.add('active');
    document.getElementById('topbarTitle').textContent = 'Profile';
  }
  closeSidebar();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

// ─────────────────────────────────────────────────────────────────────────
//  API HELPER
// ─────────────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...options, headers });
}

// ─────────────────────────────────────────────────────────────────────────
//  TODOS – LOAD
// ─────────────────────────────────────────────────────────────────────────
async function loadTodos() {
  try {
    const res = await apiFetch('/');
    if (res.status === 401) { logout(); return; }
    allTodos = await res.json();
    updateStats();
    renderTodos();
  } catch (err) {
    toast('Failed to load tasks.', 'error');
  }
}

function updateStats() {
  const total   = allTodos.length;
  const done    = allTodos.filter(t => t.complete).length;
  const pending = total - done;
  const pct     = total ? Math.round((done/total)*100) : 0;

  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statDone').textContent    = done;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('progressPct').textContent = `${pct}%`;
  document.getElementById('progressFill').style.width= `${pct}%`;
}

// ─────────────────────────────────────────────────────────────────────────
//  TODOS – RENDER
// ─────────────────────────────────────────────────────────────────────────
function filterTodos(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`filter${f.charAt(0).toUpperCase()+f.slice(1)}`).classList.add('active');
  renderTodos();
}

function renderTodos() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  let list = allTodos.filter(t => {
    const matchFilter = currentFilter === 'all'
      || (currentFilter === 'done'    &&  t.complete)
      || (currentFilter === 'pending' && !t.complete);
    const matchSearch = !query || t.title.toLowerCase().includes(query)
      || (t.description || '').toLowerCase().includes(query);
    return matchFilter && matchSearch;
  });

  // Sort: pending first, then by priority desc
  list.sort((a,b) => a.complete - b.complete || b.priority - a.priority);

  todoList.innerHTML = '';

  if (list.length === 0) {
    todoList.appendChild(emptyState);
    emptyState.style.display = '';
    return;
  }
  emptyState.style.display = 'none';

  list.forEach(todo => todoList.appendChild(makeTodoCard(todo)));
}

function makeTodoCard(todo) {
  const card = document.createElement('div');
  card.className = `todo-card pri-${todo.priority} ${todo.complete ? 'done' : ''}`;
  card.innerHTML = `
    <div class="todo-check ${todo.complete ? 'checked' : ''}"
         onclick="toggleTodo(${todo.id}, ${!todo.complete}, this)"
         title="${todo.complete ? 'Mark pending' : 'Mark done'}">
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
        <path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="todo-body">
      <div class="todo-title">${escHtml(todo.title)}</div>
      <div class="todo-desc">${escHtml(todo.description || '')}</div>
      <div class="todo-meta">
        ${priorityBadge(todo.priority)}
        <span class="status-chip ${todo.complete ? 'done' : 'pending'}">
          ${todo.complete ? '✓ Done' : '● Pending'}
        </span>
      </div>
    </div>
    <div class="todo-actions">
      <button class="icon-btn edit-btn" onclick="openEditModal(${todo.id})" title="Edit">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="icon-btn del-btn" onclick="openDeleteModal(${todo.id}, '${escHtml(todo.title)}')" title="Delete">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `;
  return card;
}

function priorityBadge(p) {
  const labels = ['','Critical','High','Medium','Low','Minimal'];
  const cls    = ['','p1','p2','p3','p4','p5'];
  return `<span class="pri-badge ${cls[p]}">P${p} · ${labels[p]}</span>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────────────────────────────────
//  TODOS – TOGGLE COMPLETE
// ─────────────────────────────────────────────────────────────────────────
async function toggleTodo(id, newComplete, el) {
  const todo = allTodos.find(t => t.id === id);
  if (!todo) return;

  el.classList.toggle('checked', newComplete);
  const card = el.closest('.todo-card');
  card.classList.toggle('done', newComplete);

  try {
    const res = await apiFetch(`/todo/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...todo, complete: newComplete })
    });
    if (!res.ok) throw new Error();
    todo.complete = newComplete;
    updateStats();
    renderTodos();
    toast(newComplete ? 'Task marked as done!' : 'Task marked as pending.', 'success');
  } catch {
    // revert
    el.classList.toggle('checked', !newComplete);
    card.classList.toggle('done', !newComplete);
    toast('Failed to update task.', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  MODAL – ADD / EDIT
// ─────────────────────────────────────────────────────────────────────────
let selectedPriority = 3;

function openModal() {
  document.getElementById('modalTitle').textContent = 'Add Task';
  document.getElementById('editTodoId').value = '';
  document.getElementById('todoTitle').value  = '';
  document.getElementById('todoDesc').value   = '';
  document.getElementById('todoComplete').checked = false;
  document.getElementById('descCount').textContent = '0';
  document.getElementById('saveTodoBtn').querySelector('.btn-text').textContent = 'Save Task';
  setPriority(3);
  clearAlerts();
  modalOverlay.classList.add('open');
  setTimeout(() => document.getElementById('todoTitle').focus(), 100);
}

function openEditModal(id) {
  const todo = allTodos.find(t => t.id === id);
  if (!todo) return;
  document.getElementById('modalTitle').textContent = 'Edit Task';
  document.getElementById('editTodoId').value = todo.id;
  document.getElementById('todoTitle').value  = todo.title;
  document.getElementById('todoDesc').value   = todo.description || '';
  document.getElementById('todoComplete').checked = todo.complete;
  document.getElementById('descCount').textContent = (todo.description||'').length;
  document.getElementById('saveTodoBtn').querySelector('.btn-text').textContent = 'Update Task';
  setPriority(todo.priority);
  clearAlerts();
  modalOverlay.classList.add('open');
}

function closeModal() { modalOverlay.classList.remove('open'); }
function closeModalOnOverlay(e) { if (e.target === modalOverlay) closeModal(); }

function setPriority(val) {
  selectedPriority = val;
  document.getElementById('todoPriority').value = val;
  document.querySelectorAll('.pri-btn').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.val) === val);
  });
}

// Character count
descTextarea.addEventListener('input', () => {
  document.getElementById('descCount').textContent = descTextarea.value.length;
});

// Save todo
document.getElementById('todoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('saveTodoBtn');
  const id  = document.getElementById('editTodoId').value;

  const payload = {
    title:       document.getElementById('todoTitle').value.trim(),
    description: document.getElementById('todoDesc').value.trim(),
    priority:    selectedPriority,
    complete:    document.getElementById('todoComplete').checked
  };

  if (payload.title.length < 3)
    return showAlert('modalAlert', 'Title must be at least 3 characters.');
  if (payload.description.length < 3)
    return showAlert('modalAlert', 'Description must be at least 3 characters.');

  setLoading(btn, true);
  try {
    let res;
    if (id) {
      res = await apiFetch(`/todo/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      res = await apiFetch('/todo', { method: 'POST', body: JSON.stringify(payload) });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save task.');
    }
    closeModal();
    await loadTodos();
    toast(id ? 'Task updated!' : 'Task created!', 'success');
  } catch (err) {
    showAlert('modalAlert', err.message);
  } finally {
    setLoading(btn, false);
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  MODAL – DELETE
// ─────────────────────────────────────────────────────────────────────────
function openDeleteModal(id, title) {
  deleteCandidateId = id;
  document.getElementById('deleteTodoTitle').textContent = title;
  deleteOverlay.classList.add('open');
}
function closeDeleteModal() { deleteOverlay.classList.remove('open'); deleteCandidateId = null; }
function closeDeleteOnOverlay(e) { if (e.target === deleteOverlay) closeDeleteModal(); }

async function confirmDelete() {
  if (!deleteCandidateId) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true; btn.textContent = 'Deleting…';

  try {
    const res = await apiFetch(`/todo/${deleteCandidateId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    closeDeleteModal();
    await loadTodos();
    toast('Task deleted.', 'info');
  } catch {
    toast('Failed to delete task.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Delete';
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  PROFILE – CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────────────────
document.getElementById('changePwForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('changePwBtn');
  const payload = {
    password:     document.getElementById('currentPw').value,
    new_password: document.getElementById('newPw').value
  };
  if (!payload.password || !payload.new_password)
    return showAlert('pwAlert', 'Please fill in both fields.');

  setLoading(btn, true);
  try {
    const res = await apiFetch('/users/user/password_change', {
      method: 'PUT', body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Password change failed.');
    }
    showAlert('pwAlert', '✓ Password updated successfully!', 'success');
    document.getElementById('currentPw').value = '';
    document.getElementById('newPw').value = '';
  } catch (err) {
    showAlert('pwAlert', err.message);
  } finally {
    setLoading(btn, false);
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${escHtml(msg)}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

// ─────────────────────────────────────────────────────────────────────────
//  KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
    closeSidebar();
  }
  // Ctrl/Cmd + K → focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput')?.focus();
  }
  // Ctrl/Cmd + N → new task (when dashboard visible)
  if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !dashboard.hidden) {
    e.preventDefault();
    openModal();
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  BOOT – auto-login if token present
// ─────────────────────────────────────────────────────────────────────────
(async function boot() {
  if (token) {
    try {
      await enterDashboard();
    } catch {
      token = null;
      localStorage.removeItem('tf_token');
    }
  }
})();
