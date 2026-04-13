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


// Helper: Check if token is a valid JWT format (3 parts separated by dots)
function isValidJWT(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

// ── Enhanced Fetch helpers with error handling
async function apiFetch(path, opts={}) {
  opts.headers = opts.headers || {};
  
  // Only set Content-Type for non-FormData requests
  if (!(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
  }
  
  // Add authorization header only if token is valid JWT
  if (_access && isValidJWT(_access)) {
    opts.headers['Authorization'] = `Bearer ${_access}`;
  } else if (_access) {
    // Invalid token format, clear it to prevent 403 errors
    console.warn('[API] Invalid token format detected, clearing tokens');
    clearTokens();
  }
  
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
    
    // Handle 403 (Forbidden) - check for session replaced (logged in on another device)
    if (res.status === 403) {
      try {
        const body = await res.clone().json();
        if (body.code === 'SESSION_REPLACED') {
          console.warn('[API] Session replaced — logged in on another device');
          clearTokens();
          alert('You have been logged out because your account was logged in on another device.');
          window.location.href = '/login.html';
          return null;
        }
      } catch (_) {}
      console.warn('[API 403 FORBIDDEN]', path, '- clearing tokens and redirecting to login');
      clearTokens();
      window.location.href = '/login.html';
      return null;
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
  create: (payload) => apiFetch('/summaries', {
    method:'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload)
  }),
  transcribe: (audioFile) => {
    const fd = new FormData();
    fd.append('audio', audioFile);
    return apiFetch('/summaries/transcribe', {
      method: 'POST',
      body: fd
    });
  },
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

// ── Hide purchase/upgrade UI for paid users (call on every page with navbar)
function hideProPurchaseUI() {
  const u = getUser();
  if (!u) return;
  const plan = u.plan || 'free';
  if (plan === 'pro' || plan === 'enterprise') {
    // Hide pricing nav link
    document.querySelectorAll('.nl').forEach(btn => {
      if (btn.textContent.trim() === 'Pricing') btn.style.display = 'none';
    });
    // Hide any element with these IDs
    ['navPricing', 'upgradeLink', 'upgradeBar', 'limitBanner', 'limitOverlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    // Hide pricing sections, ad slots, upgrade bars
    document.querySelectorAll('.price-grid, .ad-slot, .upgrade-bar, .coupon-box').forEach(el => {
      el.style.display = 'none';
    });
    // Hide "Get Started" / signup buttons in navbar (already logged in + paid)
    document.querySelectorAll('.nav-right .btn-accent').forEach(btn => {
      if (btn.textContent.trim() === 'Get Started') btn.style.display = 'none';
    });
  }
}
