// frontend/assets/js/api.js — All API calls to backend
// Use environment variable from config.js (loaded BEFORE this file)
const API = (() => {
  // Try to use config.js value first
  if (typeof window.APP_CONFIG !== 'undefined' && window.APP_CONFIG.apiUrl) {
    return window.APP_CONFIG.apiUrl;
  }
  
  // Fallback based on hostname
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000/api';
  }
  
  // Production default (Render)
  return 'https://roottolearn-backend.onrender.com/api';
})();

// ── Token management (memory + sessionStorage)
let _access = sessionStorage.getItem('siq_access') || null;
let _refresh = sessionStorage.getItem('siq_refresh') || null;

function setTokens(access, refresh) {
  _access = access; _refresh = refresh;
  sessionStorage.setItem('siq_access', access);
  if (refresh) sessionStorage.setItem('siq_refresh', refresh);
}
function clearTokens() {
  _access = null; _refresh = null;
  sessionStorage.removeItem('siq_access');
  sessionStorage.removeItem('siq_refresh');
  localStorage.removeItem('siq_user');
}
function getUser() {
  if (!_access) return null;
  try { return JSON.parse(atob(_access.split('.')[1])); } catch { return null; }
}
function isLoggedIn() {
  const u = getUser();
  return u && u.exp * 1000 > Date.now();
}


// ── Enhanced Fetch helpers with error handling
async function apiFetch(path, opts={}) {
  opts.headers = opts.headers || {};
  
  // Only set Content-Type for non-FormData requests
  if (!(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
  }
  
  // Add authorization header
  if (_access) opts.headers['Authorization'] = `Bearer ${_access}`;
  
  try {
    let res = await fetch(API + path, {
      ...opts,
      credentials: 'include'  // Important for CORS with credentials
    });
    
    // Auto-refresh on 401
    if (res.status === 401 && _refresh) {
      try {
        const rr = await fetch(`${API}/auth/refresh`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: _refresh }),
          credentials: 'include'
        });
        
        if (rr.ok) {
          const d = await rr.json();
          setTokens(d.access, d.refresh);
          opts.headers['Authorization'] = `Bearer ${d.access}`;
          res = await fetch(API + path, { ...opts, credentials: 'include' });
        } else {
          clearTokens();
          window.location.href = '/index.html';
          return null;
        }
      } catch (err) {
        console.error('[REFRESH ERROR]', err);
        clearTokens();
        window.location.href = '/index.html';
        return null;
      }
    }
    
    return res;
  } catch (err) {
    console.error('[FETCH ERROR]', err);
    throw new Error(`Network error: ${err.message}`);
  }
}

function post(path, body) { 
  return apiFetch(path, { method:'POST', body:JSON.stringify(body) }); 
}

function get(path) { 
  return apiFetch(path); 
}

function del(path) { 
  return apiFetch(path, { method:'DELETE' }); 
}

function patch(path, body) { 
  return apiFetch(path, { method:'PATCH', body:JSON.stringify(body) }); 
}

// ── Auth
const auth = {
  signup:         (d) => post('/auth/signup', d),
  verifyEmail:    (d) => post('/auth/verify-email', d),
  login:          (d) => post('/auth/login', d),
  loginVerify:    (d) => post('/auth/login/verify', d),
  resendOTP:      (d) => post('/auth/resend', d),
  forgotPassword: (d) => post('/auth/forgot-password', d),
  verifyForgot:   (d) => post('/auth/verify-forgot', d),
  resetPassword:  (d) => post('/auth/reset-password', d),
  logout:         ()  => post('/auth/logout', { refreshToken: _refresh }),
};

// ── User
const users = {
  me:             ()  => get('/users/me'),
  updateName:     (n) => patch('/users/me', { name:n }),
  changePassword: (d) => post('/users/change-password', d),
  myHistory:      ()  => get('/users/me/summaries'),
};

// ── Summaries
const summaries = {
  create: (formData) => apiFetch('/summaries', { method:'POST', body: formData }),
};

// ── Coupons
const coupons = {
  validate: (code) => post('/coupons/validate', { code }),
};

// ── Payments
const payments = {
  createIntent: (plan, couponCode) => post('/payments/create-intent', { plan, couponCode }),
  createOrder:  (plan, couponCode) => post('/payments/create-order',  { plan, couponCode }),
  verifyUpi:    (d)                => post('/payments/verify', d),
  history:      () => get('/payments/history'),
};

// Global toast (shared)
function toast(icon, msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('tIcon').textContent = icon;
  document.getElementById('tTxt').textContent  = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// Toggle password visibility
function togglePassword(id) {
  const input = document.getElementById(id);
  if (!input) return;
  const type = input.type === 'password' ? 'text' : 'password';
  input.type = type;
  const btn = input.parentElement.querySelector('.toggle-pass');
  if (btn) btn.textContent = type === 'password' ? '👁️' : '🙈';
}
