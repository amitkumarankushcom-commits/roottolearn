// backend/routes/auth.js — User + Admin auth with OTP
const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db        = require('../config/db');
const { sendOTPEmail, verifyOTP } = require('../config/otp');

const otpLim   = rateLimit({ windowMs:15*60*1000, max:5,  message:{error:'Too many OTP requests.'} });
const loginLim = rateLimit({ windowMs:15*60*1000, max:10, message:{error:'Too many login attempts.'} });
const adminLim = rateLimit({ windowMs:15*60*1000, max:20, message:{error:'Too many admin login attempts. Try again in 15 minutes.'} });

// ── Helpers
function sign(payload) {
  const access  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN||'15m' });
  const refresh = jwt.sign({ sub:payload.sub, role:payload.role }, process.env.REFRESH_SECRET, { expiresIn:'7d' });
  return { access, refresh };
}
async function saveRefresh(userId, token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const exp  = new Date(Date.now() + 7*24*60*60*1000);
  await db.execute(`INSERT INTO refresh_tokens (user_id,token_hash,expires_at) VALUES (?,?,?)`, [userId, hash, exp]);
}
function ok(req, res) {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(422).json({ errors: e.array() }); return false; }
  return true;
}

// ════════ USER AUTH ════════

// POST /api/auth/signup
router.post('/signup', otpLim,
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({min:2,max:80}),
  body('password').isLength({min:8}).matches(/[A-Z]/).matches(/[0-9]/),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { name, email, password } = req.body;
    try {
      const [ex] = await db.execute('SELECT id FROM users WHERE email=?', [email]);
      if (ex.length) return res.status(409).json({ error: 'Email already registered.' });
      const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS)||12);
      await db.execute(`INSERT INTO users (name,email,password_hash) VALUES (?,?,?)`, [name, email, hash]);
      await sendOTPEmail(email, 'signup');
      res.status(201).json({ message: 'Account created. Check email for OTP.', step:'verify' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Signup failed.' }); }
  }
);

// POST /api/auth/verify-email
router.post('/verify-email',
  body('email').isEmail().normalizeEmail(),
  body('otp').trim().isLength({min:6,max:6}).isNumeric(),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { email, otp } = req.body;
    try {
      const r = await verifyOTP(email, otp, 'signup');
      if (!r.ok) return res.status(400).json({ error: r.error });
      await db.execute('UPDATE users SET is_verified=1 WHERE email=?', [email]);
      const [[u]] = await db.execute('SELECT id,name,email,plan FROM users WHERE email=?', [email]);
      const payload = { sub:u.id, name:u.name, email:u.email, plan:u.plan, role:'user' };
      const { access, refresh } = sign(payload);
      await saveRefresh(u.id, refresh);
      res.json({ access, refresh, user: payload });
    } catch (e) { res.status(500).json({ error: 'Verification failed.' }); }
  }
);

// POST /api/auth/login — Step 1
router.post('/login', loginLim,
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { email, password } = req.body;
    try {
      const [[u]] = await db.execute('SELECT id,password_hash,is_verified,is_active,plan FROM users WHERE email=?', [email]);
      if (!u || !u.is_active) return res.status(401).json({ error: 'Invalid credentials.' });
      if (!await bcrypt.compare(password, u.password_hash||'')) return res.status(401).json({ error: 'Invalid credentials.' });
      if (!u.is_verified) { await sendOTPEmail(email,'signup'); return res.status(403).json({ error:'Email not verified. OTP resent.', step:'verify' }); }
      await sendOTPEmail(email, 'login');
      res.json({ message:'OTP sent.', step:'otp' });
    } catch (e) { res.status(500).json({ error:'Login failed.' }); }
  }
);

// POST /api/auth/login/verify — Step 2
router.post('/login/verify', loginLim,
  body('email').isEmail().normalizeEmail(),
  body('otp').trim().isLength({min:6,max:6}).isNumeric(),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { email, otp } = req.body;
    try {
      // Check if user is verified; if not, try 'signup' OTP first
      const [[u]] = await db.execute('SELECT id,is_verified FROM users WHERE email=?', [email]);
      let purpose = 'login';
      if (u && !u.is_verified) {
        purpose = 'signup'; // Unverified user completing email verification
      }
      const r = await verifyOTP(email, otp, purpose);
      if (!r.ok) return res.status(400).json({ error: r.error });
      
      // If this was signup verification, mark user as verified
      if (purpose === 'signup') {
        await db.execute('UPDATE users SET is_verified=1 WHERE email=?', [email]);
      }
      
      const [[user]] = await db.execute('SELECT id,name,email,plan FROM users WHERE email=?', [email]);
      const payload = { sub:user.id, name:user.name, email:user.email, plan:user.plan, role:'user' };
      const { access, refresh } = sign(payload);
      await saveRefresh(user.id, refresh);
      res.json({ access, refresh, user: payload });
    } catch (e) { res.status(500).json({ error:'OTP verification failed.' }); }
  }
);

// POST /api/auth/resend-otp
router.post('/resend-otp', otpLim,
  body('email').isEmail().normalizeEmail(),
  body('purpose').isIn(['signup','login','forgot','admin']),
  async (req, res) => {
    try { await sendOTPEmail(req.body.email, req.body.purpose); res.json({ message:'OTP resent.' }); }
    catch { res.status(500).json({ error:'Could not send OTP.' }); }
  }
);

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error:'Refresh token required.' });
  try {
    jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const [[stored]] = await db.execute(`SELECT id,user_id FROM refresh_tokens WHERE token_hash=? AND revoked=0 AND expires_at>NOW()`, [hash]);
    if (!stored) return res.status(401).json({ error:'Invalid refresh token.' });
    await db.execute('UPDATE refresh_tokens SET revoked=1 WHERE id=?', [stored.id]);
    const [[u]] = await db.execute('SELECT id,name,email,plan FROM users WHERE id=?', [stored.user_id]);
    const payload = { sub:u.id, name:u.name, email:u.email, plan:u.plan, role:'user' };
    const { access, refresh } = sign(payload);
    await saveRefresh(u.id, refresh);
    res.json({ access, refresh });
  } catch { res.status(401).json({ error:'Refresh failed.' }); }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await db.execute('UPDATE refresh_tokens SET revoked=1 WHERE token_hash=?', [hash]);
  }
  res.json({ message:'Logged out.' });
});

// ════════ FORGOT PASSWORD FLOW ════════

// POST /api/auth/forgot-password — Step 1: Request password reset
router.post('/forgot-password', otpLim,
  body('email').isEmail().normalizeEmail(),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { email } = req.body;
    try {
      const [[u]] = await db.execute('SELECT id FROM users WHERE email=?', [email]);
      if (!u) return res.status(404).json({ error: 'Email not found.' });
      await sendOTPEmail(email, 'forgot');
      res.json({ message: 'Password reset OTP sent to email.', step:'verify' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Request failed.' }); }
  }
);

// POST /api/auth/verify-forgot — Step 2: Verify OTP
router.post('/verify-forgot',
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({min:6,max:6}).isNumeric(),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { email, otp } = req.body;
    try {
      const r = await verifyOTP(email, otp, 'forgot', false);
      if (!r.ok) return res.status(400).json({ error: r.error });
      res.json({ message: 'OTP verified. You can now reset your password.', verified: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'OTP verification failed.' }); }
  }
);

// POST /api/auth/reset-password — Step 3: Set new password
router.post('/reset-password', otpLim,
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({min:6,max:6}).isNumeric(),
  body('newPassword').isLength({min:8}).matches(/[A-Z]/).matches(/[0-9]/),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { email, otp, newPassword } = req.body;
    try {
      // Verify OTP (single-use consumption)
      const r = await verifyOTP(email, otp, 'forgot', true);
      if (!r.ok) return res.status(400).json({ error: r.error });
      // Update password
      const hash = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS)||12);
      await db.execute('UPDATE users SET password_hash=? WHERE email=?', [hash, email]);
      res.json({ message: 'Password reset successfully. Please login.' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Password reset failed.' }); }
  }
);

// ════════ ADMIN AUTH (separate — mandatory 2FA) ════════

// POST /api/auth/admin/login — Step 1
router.post('/admin/login', adminLim,
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { email, password } = req.body;
    try {
      const [[a]] = await db.execute('SELECT id,password_hash,is_active,role FROM admins WHERE email=?', [email]);
      if (!a || !a.is_active) return res.status(401).json({ error:'Invalid admin credentials.' });
      if (!await bcrypt.compare(password, a.password_hash)) return res.status(401).json({ error:'Invalid admin credentials.' });
      await sendOTPEmail(email, 'admin');
      res.json({ message:'Admin OTP sent.', step:'otp' });
    } catch (e) { res.status(500).json({ error:'Admin login failed.' }); }
  }
);

// POST /api/auth/admin/verify — Step 2
router.post('/admin/verify', adminLim,
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({min:6,max:6}).isNumeric(),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { email, otp } = req.body;
    try {
      const r = await verifyOTP(email, otp, 'admin');
      if (!r.ok) return res.status(400).json({ error: r.error });
      const [[a]] = await db.execute('SELECT id,name,email,role FROM admins WHERE email=?', [email]);
      await db.execute('UPDATE admins SET last_login=NOW() WHERE id=?', [a.id]);
      const payload = { sub:a.id, name:a.name, email:a.email, role:'admin', adminRole:a.role };
      const access  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn:'8h' });
      res.json({ access, admin: payload });
    } catch (e) { res.status(500).json({ error:'OTP failed.' }); }
  }
);

// ════════ ADMIN PASSWORD CHANGE (requires authentication) ════════

// POST /api/admin/change-password
router.post('/admin/change-password',
  (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized.' });
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
      next();
    } catch { res.status(401).json({ error: 'Invalid token.' }); }
  },
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({min:8}).matches(/[A-Z]/).matches(/[0-9]/),
  async (req, res) => {
    if (!ok(req,res)) return;
    const { oldPassword, newPassword } = req.body;
    try {
      if (oldPassword === newPassword) return res.status(400).json({ error: 'New password must be different from old password.' });
      const [[a]] = await db.execute('SELECT password_hash FROM admins WHERE id=?', [req.user.sub]);
      if (!a) return res.status(404).json({ error: 'Admin not found.' });
      if (!await bcrypt.compare(oldPassword, a.password_hash||'')) {
        return res.status(401).json({ error: 'Old password is incorrect.' });
      }
      const hash = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS)||12);
      await db.execute('UPDATE admins SET password_hash=? WHERE id=?', [hash, req.user.sub]);
      res.json({ message: 'Admin password changed successfully.' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Password change failed.' }); }
  }
);

module.exports = router;
