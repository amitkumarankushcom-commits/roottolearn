// ============================================================
//  routes/auth.js — SECURE OTP AUTH (FINAL CLEAN VERSION)
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');

const { sendOTPEmail, verifyOTP } = require('../config/otp');

// ── Generate JWT
const generateToken = (userId, email) => {
  return jwt.sign(
    { id: userId, email, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};



// ============================================================
// SIGNUP
// ============================================================

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { error } = await supabase
      .from('users')
      .insert([{
        email,
        password_hash: hashedPassword,
        name,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    // Send OTP verification email
    console.log("📧 Sending signup OTP to:", email);
    const emailResult = await sendOTPEmail(email, 'signup');
    if (!emailResult.ok) {
      console.error("❌ SIGNUP OTP EMAIL ERROR:", emailResult.error);
      // Don't fail signup, but log the error
    }

    return res.status(201).json({
      success: true,
      step: 'verify',
      message: 'Signup successful. OTP sent to email.'
    });

  } catch (error) {
    console.error('[SIGNUP ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});



// ============================================================
// LOGIN → SEND OTP
// ============================================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email & password required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 🔥 DEBUG LOG
    console.log("🚀 Sending OTP to:", email);

    const emailResult = await sendOTPEmail(email, 'login');
    if (!emailResult.ok) {
      console.error("❌ OTP EMAIL ERROR:", emailResult.error);
      return res.status(500).json({ error: 'Failed to send OTP email: ' + emailResult.error });
    }

    return res.json({
      step: 'verify',
      message: 'OTP sent to email'
    });

  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});



// ============================================================
// VERIFY OTP → LOGIN SUCCESS
// ============================================================

router.post('/login/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email & OTP required' });
    }

    console.log("🔐 Verifying OTP for:", email);

    const result = await verifyOTP(email, otp, 'login');

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(500).json({ error: 'User not found' });
    }

    const token = generateToken(user.id, user.email);

    return res.json({
      success: true,
      access: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      }
    });

  } catch (error) {
    console.error('[VERIFY OTP ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});



// ============================================================
// RESEND OTP (60s COOLDOWN)
// ============================================================

router.post('/resend', async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email) {
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
      const lastTime = new Date(data[0].created_at).getTime();
      const now = Date.now();

      const diff = (now - lastTime) / 1000;

      if (diff < 60) {
        return res.status(429).json({
          error: `Wait ${Math.ceil(60 - diff)}s before retry`
        });
      }
    }

    console.log("🔁 Resending OTP to:", email);

    const emailResult = await sendOTPEmail(email, otpPurpose);
    if (!emailResult.ok) {
      console.error("❌ RESEND EMAIL ERROR:", emailResult.error);
      return res.status(500).json({ error: 'Failed to resend OTP email: ' + emailResult.error });
    }

    return res.json({
      success: true,
      message: 'OTP resent'
    });

  } catch (error) {
    console.error('[RESEND ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});



// ============================================================
// VERIFY EMAIL (Signup OTP)
// ============================================================

router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email & OTP required' });
    }

    console.log("🔐 Verifying email OTP for:", email);

    const result = await verifyOTP(email, otp, 'signup');

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    // Mark user as verified
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_verified: 1 })
      .eq('email', email);

    if (updateError) {
      console.error('[VERIFY EMAIL UPDATE ERROR]', updateError);
      throw updateError;
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(500).json({ error: 'User not found' });
    }

    const token = generateToken(user.id, user.email);

    return res.json({
      success: true,
      access: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      }
    });

  } catch (error) {
    console.error('[VERIFY EMAIL ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});



// ============================================================
// FORGOT PASSWORD
// ============================================================

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) return res.json({ success: true });

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    await supabase
      .from('password_resets')
      .insert([{
        user_id: user.id,
        token_hash: hash,
        expires_at: new Date(Date.now() + 3600000)
      }]);

    return res.json({ success: true });

  } catch (error) {
    console.error('[FORGOT ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});



// ============================================================

module.exports = router;