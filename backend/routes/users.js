// ============================================================
//  routes/users.js - User Profile & Settings Routes
// ============================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// ── Middleware: Check JWT token
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

// ── GET /api/users/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, profile_image')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });

  } catch (error) {
    console.error('[GET PROFILE ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/users/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, profileImage } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({
        name,
        profile_image: profileImage || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, user });

  } catch (error) {
    console.error('[UPDATE PROFILE ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/users/courses
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const { data: courses, error } = await supabase
      .from('user_courses')
      .select('*, courses(*)')
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ success: true, courses: courses || [] });

  } catch (error) {
    console.error('[GET COURSES ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/users/activity
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const { data: activity, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ success: true, activity: activity || [] });

  } catch (error) {
    console.error('[GET ACTIVITY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
