// ============================================================
//  routes/admin.js - Admin Panel Routes (Moderators/Admins)
// ============================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/admin/dashboard-stats
router.get('/dashboard-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: totalUsers } = await supabase
      .from('users')
      .select('COUNT(*)', { count: 'exact', head: true });

    const { data: totalCourses } = await supabase
      .from('courses')
      .select('COUNT(*)', { count: 'exact', head: true });

    const { data: totalAds } = await supabase
      .from('advertisements')
      .select('COUNT(*)', { count: 'exact', head: true });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCourses,
        totalAdvertisements: totalAds
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

module.exports = router;
