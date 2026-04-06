// ============================================================
//  routes/summaries.js - Learning Summaries Routes
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

// ── GET /api/summaries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: summaries, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, summaries: summaries || [] });

  } catch (error) {
    console.error('[GET SUMMARIES ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/summaries/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: summary, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json({ success: true, summary });

  } catch (error) {
    console.error('[GET SUMMARY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/summaries
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, courseId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    const { data: summary, error } = await supabase
      .from('summaries')
      .insert([{
        user_id: req.user.id,
        title,
        content,
        course_id: courseId || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, summary });

  } catch (error) {
    console.error('[CREATE SUMMARY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/summaries/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    // Verify ownership
    const { data: existing } = await supabase
      .from('summaries')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data: summary, error } = await supabase
      .from('summaries')
      .update({
        title,
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, summary });

  } catch (error) {
    console.error('[UPDATE SUMMARY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/summaries/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await supabase
      .from('summaries')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('summaries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Summary deleted' });

  } catch (error) {
    console.error('[DELETE SUMMARY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
