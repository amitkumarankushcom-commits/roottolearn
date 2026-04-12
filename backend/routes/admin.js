// ============================================================
//  routes/admin.js - Admin Panel Routes (Moderators/Admins)
// ============================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

// ── Middleware: Check JWT token and admin role
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    // Check JWT role first (faster than DB lookup for super/admin)
    const adminRoles = ['super', 'admin', 'editor', 'support'];
    if (!adminRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/admin/stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('COUNT(*)', { count: 'exact', head: true });

    const { count: totalSummaries } = await supabase
      .from('summaries')
      .select('COUNT(*)', { count: 'exact', head: true });

    const { data: recentPayments } = await supabase
      .from('payments')
      .select('id, amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalSummaries: totalSummaries || 0,
        recentPayments: recentPayments || []
      }
    });

  } catch (error) {
    console.error('[ADMIN STATS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/admin/users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, users: users || [] });

  } catch (error) {
    console.error('[GET USERS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/admin/users/:id/role
router.put('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, user });

  } catch (error) {
    console.error('[UPDATE USER ROLE ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/admin/users/:id
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'User deleted' });

  } catch (error) {
    console.error('[DELETE USER ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/admin/payments
router.get('/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, user_id, plan, amount_cents, status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, payments: payments || [] });

  } catch (error) {
    console.error('[GET PAYMENTS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/admin/summaries
router.get('/summaries', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: summaries, error } = await supabase
      .from('summaries')
      .select('id, user_id, file_name, summary_text, word_count, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, summaries: summaries || [] });

  } catch (error) {
    console.error('[GET SUMMARIES ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/admin/activity
router.get('/activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: activityLogs, error } = await supabase
      .from('activity_logs')
      .select('id, user_id, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({ success: true, activity: activityLogs || [] });

  } catch (error) {
    console.error('[GET ACTIVITY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/admin/settings
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) throw error;

    res.json({ success: true, settings: settings || [] });

  } catch (error) {
    console.error('[GET SETTINGS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/admin/settings
router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    const { data: setting, error } = await supabase
      .from('system_settings')
      .update({ value, updated_at: new Date() })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, setting });

  } catch (error) {
    console.error('[UPDATE SETTINGS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/admin/change-password
router.post('/change-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get admin from database
    const { data: admin, error: fetchError } = await supabase
      .from('admins')
      .select('id, password')
      .eq('id', req.user.id)
      .single();

    if (fetchError || !admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error: updateError } = await supabase
      .from('admins')
      .update({ password: hashedPassword })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('[CHANGE PASSWORD ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
