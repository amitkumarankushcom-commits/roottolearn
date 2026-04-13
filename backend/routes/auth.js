// ============================================================
//  routes/auth.js — Complete Auth Routes
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendOTPEmail, verifyOTP } = require('../config/otp');

const OTP_MAX_ATTEMPTS = 5;

const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

const generateToken = (userId, email, name = '', plan = 'free', role = 'user', sessionToken = '') => {
  const payload = { 
    id: userId, 
    email, 
    name: name || '',
    plan: plan || 'free',
    role: role || 'user',
    ses: sessionToken
  };
  console.log('[GENERATE TOKEN] Payload:', payload);
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

// ── Helper: constant-time response to prevent timing attacks
function userNotFoundResponse() {
  return res.json({ success: true });
}


// ============================================================
// SIGNUP
// ============================================================

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('[SIGNUP] inserting user:', { email, name });
    const { error } = await supabase
      .from('users')
      .insert([{
        email,
        password_hash: hashedPassword,
        name,
        created_at: new Date().toISOString()
      }]);

    console.log('[SIGNUP] insert result:', error);
    if (error) throw error;

    await sendOTPEmail(email, 'signup');

    return res.status(201).json({
      success: true,
      step: 'verify',
      message: 'Account created. OTP sent to email.'
    });

  } catch (error) {
    console.error('[SIGNUP ERROR]', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});


// ============================================================
// LOGIN → SEND OTP
// ============================================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const emailResult = await sendOTPEmail(email, 'login');

    if (!emailResult.ok) {
      return res.status(500).json({
        error: emailResult.error || 'Failed to send OTP'
      });
    }

    return res.json({
      step: 'verify',
      message: 'OTP sent to email'
    });
  }

  catch (error) {
    console.error('[LOGIN ERROR]', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});


// ============================================================
// VERIFY OTP → LOGIN SUCCESS
// ============================================================

router.post('/login/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const result = await verifyOTP(email, otp, 'login');

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    // Try to fetch with role column; if it doesn't exist, fall back
    let user;
    let userError;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts && !user) {
      attempts++;
      
      try {
        let query = supabase
          .from('users')
          .select('id, email, name, plan' + (attempts === 1 ? ', role' : ''))
          .eq('email', email);
        
        const result = await query.maybeSingle();
        user = result.data;
        userError = result.error;
        
        console.log(`[VERIFY OTP] Attempt ${attempts} - user lookup:`, { email, userError, user, hasRole: attempts === 1 });
        
        if (!userError && user) {
          break; // Success, exit loop
        }
        
        if (userError && userError.message && userError.message.includes('undefined column')) {
          console.log('[VERIFY OTP] Role column not found, retrying without it');
          continue; // Try again without role
        }
        
        if (userError) {
          console.error('[VERIFY OTP] Query error:', userError);
          break; // Exit on other errors
        }
        
      } catch (e) {
        console.error(`[VERIFY OTP] Attempt ${attempts} catch error:`, e.message);
        if (attempts < maxAttempts) {
          continue;
        }
      }
    }

    if (userError) {
      console.error('[VERIFY OTP] Final user lookup error:', userError.message);
      return res.status(400).json({ error: 'Failed to retrieve user profile' });
    }
    
    if (!user) {
      console.log('[VERIFY OTP] User not found after verification:', email);
      return res.status(400).json({ error: 'User not found after OTP verification' });
    }

    // Ensure user has name and plan (set defaults if missing/null)
    const userName = user.name && user.name.trim() ? user.name : email.split('@')[0];
    const userPlan = user.plan && user.plan.trim() ? user.plan : 'free';
    const userRole = user.role ? user.role : 'user';

    console.log('[VERIFY OTP] Token data:', { userName, userPlan, userRole, originalUser: user });

    // Single-device login: generate session token and store in DB
    let sessionToken = '';
    try {
      sessionToken = generateSessionToken();
      await supabase.from('users').update({ session_token: sessionToken, last_login: new Date().toISOString() }).eq('id', user.id);
    } catch (sesErr) {
      console.warn('[VERIFY OTP] Session token update failed (column may not exist yet):', sesErr.message);
      sessionToken = '';
    }

    const token = generateToken(user.id, user.email, userName, userPlan, userRole, sessionToken);

    return res.json({
      success: true,
      access: token,
      user: {
        id: user.id,
        email: user.email,
        name: userName,
        plan: userPlan,
        role: userRole
      }
    });

  } catch (error) {
    console.error('[VERIFY OTP ERROR]', error.message, error.stack);
    return res.status(500).json({ error: 'Verification failed: ' + error.message });
  }
});


// ============================================================
// RESEND OTP (60s cooldown)
// ============================================================

router.post('/resend', async (req, res) => {
  try {
    const { email, purpose } = req.body;

    console.log('[RESEND] Request body:', { email, purpose });

    if (!email) {
      console.log('[RESEND] ERROR: No email provided');
      return res.status(400).json({ error: 'Email required' });
    }

    const otpPurpose = purpose || 'login';

    const { data } = await supabase
      .from('otp_tokens')
      .select('created_at')
      .eq('target', email)
      .eq('purpose', otpPurpose)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const diff = (Date.now() - new Date(data[0].created_at).getTime()) / 1000;
      if (diff < 60) {
        return res.status(429).json({ error: `Wait ${Math.ceil(60 - diff)}s before retry` });
      }
    }

    const emailResult = await sendOTPEmail(email, otpPurpose);
    console.log('[RESEND] Email result:', emailResult);
    if (!emailResult.ok) {
      console.log('[RESEND] ERROR: Failed to send email');
      return res.status(500).json({ error: 'Failed to resend OTP' });
    }

    console.log('[RESEND] SUCCESS: OTP resent');
    return res.json({ success: true, message: 'OTP resent' });

  } catch (error) {
    console.error('[RESEND ERROR]', error.message);
    res.status(500).json({ error: 'Resend failed' });
  }
});


// ============================================================
// VERIFY EMAIL (Signup OTP)
// ============================================================

router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('[VERIFY EMAIL] body:', { email, otp, otpLen: otp?.length });

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const result = await verifyOTP(email, otp, 'signup');

    console.log('[VERIFY EMAIL] verifyOTP result:', result);

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    // Check if user exists first
    const { data: existingUser, error: checkErr } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    console.log('[VERIFY EMAIL] user check:', existingUser, checkErr);

    const { error: updateError } = await supabase
      .from('users')
      .update({ is_verified: 1 })
      .eq('email', email);

    console.log('[VERIFY EMAIL] update result:', updateError);
    if (updateError) throw updateError;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, plan, role')
      .eq('email', email)
      .maybeSingle();

    console.log('[VERIFY EMAIL] user after update:', user, userError);
    if (userError || !user) {
      return res.status(500).json({ error: 'User not found' });
    }

    // Ensure user has name and plan (set defaults if missing/null)
    const userName = user.name && user.name.trim() ? user.name : email.split('@')[0];
    const userPlan = user.plan && user.plan.trim() ? user.plan : 'free';
    const userRole = user.role ? user.role : 'user';

    console.log('[VERIFY EMAIL] Token data:', { userName, userPlan, userRole, originalUser: user });

    // Single-device login: generate session token and store in DB
    let sessionToken = '';
    try {
      sessionToken = generateSessionToken();
      await supabase.from('users').update({ session_token: sessionToken, last_login: new Date().toISOString() }).eq('id', user.id);
    } catch (sesErr) {
      console.warn('[VERIFY EMAIL] Session token update failed (column may not exist yet):', sesErr.message);
      sessionToken = '';
    }

    const token = generateToken(user.id, user.email, userName, userPlan, userRole, sessionToken);

    return res.json({
      success: true,
      access: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan || 'free',
        role: user.role || 'user'
      }
    });

  } catch (error) {
    console.error('[VERIFY EMAIL ERROR]', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});


// ============================================================
// FORGOT PASSWORD → Send OTP
// ============================================================

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, step: 'verify' });
    }

    const emailResult = await sendOTPEmail(email, 'forgot');
    if (!emailResult.ok) {
      console.error('[FORGOT PASSWORD]', emailResult.error);
      return res.status(500).json({ error: emailResult.error || 'Failed to send OTP' });
    }

    return res.json({ success: true, step: 'verify' });

  } catch (error) {
    console.error('[FORGOT ERROR]', error.message);
    res.status(500).json({ error: 'Request failed' });
  }
});


// ============================================================
// VERIFY FORGOT OTP
// ============================================================

router.post('/verify-forgot', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const result = await verifyOTP(email, otp, 'forgot');

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true });

  } catch (error) {
    console.error('[VERIFY FORGOT ERROR]', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});


// ============================================================
// RESET PASSWORD
// ============================================================

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Verify OTP first
    const result = await verifyOTP(email, otp, 'forgot');
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', email);

    if (error) throw error;

    // Delete used OTP
    await supabase
      .from('otp_tokens')
      .update({ used: true })
      .eq('target', email)
      .eq('purpose', 'forgot');

    return res.json({ success: true });

  } catch (error) {
    console.error('[RESET PASSWORD ERROR]', error.message);
    res.status(500).json({ error: 'Password reset failed' });
  }
});


// ============================================================
// ADMIN LOGIN → SEND OTP
// ============================================================

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, password_hash, role, name, is_active')
      .eq('email', email)
      .single();

    console.log('[ADMIN LOGIN] Query result:', { admin, error });

    if (error || !admin) {
      console.log('[ADMIN LOGIN] Admin not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active (handle both boolean and 0/1)
    const isActive = admin.is_active === true || admin.is_active === 1;
    if (!isActive) {
      console.log('[ADMIN LOGIN] Account disabled:', { email, is_active: admin.is_active });
      return res.status(403).json({ error: 'Account disabled. Contact super admin.' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      console.log('[ADMIN LOGIN] Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const emailResult = await sendOTPEmail(email, 'admin');
    if (!emailResult.ok) {
      console.log('[ADMIN LOGIN] Failed to send OTP:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send OTP' });
    }

    console.log('[ADMIN LOGIN] OTP sent to:', email);
    return res.json({ step: 'verify', message: 'OTP sent to admin email' });

  } catch (error) {
    console.error('[ADMIN LOGIN ERROR]', error.message, error.stack);
    res.status(500).json({ error: 'Admin login failed: ' + error.message });
  }
});


// ============================================================
// ADMIN VERIFY OTP
// ============================================================

router.post('/admin/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const result = await verifyOTP(email, otp, 'admin');

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    const { data: admin } = await supabase
      .from('admins')
      .select('id, email, name, role')
      .eq('email', email)
      .maybeSingle();

    if (!admin) {
      return res.status(500).json({ error: 'Admin not found' });
    }

    const token = generateToken(admin.id, admin.email, admin.name || 'Admin', 'enterprise', admin.role || 'admin');

    return res.json({
      success: true,
      access: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('[ADMIN VERIFY ERROR]', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});


// ============================================================
// REFRESH TOKEN
// ============================================================

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    } catch {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Check session token is still valid in DB (skip if no session token in JWT)
    if (decoded.ses) {
      try {
        const { data: dbUser } = await supabase.from('users').select('session_token').eq('id', decoded.id).single();
        if (dbUser && dbUser.session_token !== decoded.ses) {
          return res.status(403).json({ error: 'Session expired — logged in on another device', code: 'SESSION_REPLACED' });
        }
      } catch (sesErr) {
        console.warn('[REFRESH] Session check failed (column may not exist):', sesErr.message);
      }
    }

    // Issue new access token with same session token
    const access = generateToken(decoded.id, decoded.email, decoded.name || '', decoded.plan || 'free', decoded.role || 'user', decoded.ses || '');

    return res.json({ access });

  } catch (error) {
    console.error('[REFRESH ERROR]', error.message);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});


// ============================================================
// LOGOUT
// ============================================================

router.post('/logout', async (req, res) => {
  try {
    // Clear tokens on client side (server doesn't store tokens)
    // In a more advanced setup, we'd blacklist the token here
    return res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error('[LOGOUT ERROR]', error.message);
    res.status(500).json({ error: 'Logout failed' });
  }
});


// ============================================================

module.exports = router;
