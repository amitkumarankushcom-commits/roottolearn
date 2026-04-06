// ============================================================
//  routes/auth.js - Authentication Routes
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendOTPEmail } = require('../config/otp');

// ── Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

// ── POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 12);

    // Create user
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email,
        password_hash: hashedPassword,
        name,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    const token = generateToken(data.id, data.email);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: data.id,
        email: data.email,
        name: data.name
      }
    });

  } catch (error) {
    console.error('[AUTH SIGNUP ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[AUTH LOGIN ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Verify user exists
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.json({ success: true, message: 'If email exists, reset link sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Store reset token
    await supabase
      .from('password_resets')
      .insert([{
        user_id: user.id,
        token_hash: resetTokenHash,
        expires_at: expiresAt.toISOString()
      }]);

    // TODO: Send email with reset link
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    res.json({ success: true, message: 'Reset link sent to email' });

  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find reset token
    const { data: resetRecord } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (!resetRecord || new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS) || 12);

    // Update password
    await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', resetRecord.user_id);

    // Delete reset token
    await supabase
      .from('password_resets')
      .delete()
      .eq('id', resetRecord.id);

    res.json({ success: true, message: 'Password reset successfully' });

  } catch (error) {
    console.error('[RESET PASSWORD ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
