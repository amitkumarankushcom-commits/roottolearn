// backend/routes/users.js — User profile & account management
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireUser } = require('../middleware/auth');

// GET /api/users/me — fetch logged-in user profile
router.get('/me', requireUser, async (req, res) => {
  try {
    const [[u]] = await db.execute(
      'SELECT id,name,email,plan,is_verified,docs_this_month,total_docs,created_at FROM users WHERE id=?',
      [req.user.sub]
    );
    if (!u) return res.status(404).json({ error:'User not found.' });
    res.json({ user: u });
  } catch { res.status(500).json({ error:'Failed to fetch profile.' }); }
});

// PATCH /api/users/me — update name
router.patch('/me', requireUser,
  body('name').optional().trim().isLength({min:2,max:80}),
  async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error:'No data to update.' });
    try {
      await db.execute('UPDATE users SET name=? WHERE id=?', [name, req.user.sub]);
      res.json({ message:'Profile updated.' });
    } catch { res.status(500).json({ error:'Update failed.' }); }
  }
);

// POST /api/users/change-password
router.post('/change-password', requireUser,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({min:8}).matches(/[A-Z]/).matches(/[0-9]/),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    const { currentPassword, newPassword } = req.body;
    try {
      const [[u]] = await db.execute('SELECT password_hash FROM users WHERE id=?', [req.user.sub]);
      if (!await bcrypt.compare(currentPassword, u.password_hash||'')) return res.status(400).json({ error:'Current password incorrect.' });
      const hash = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS)||12);
      await db.execute('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.sub]);
      res.json({ message:'Password updated.' });
    } catch { res.status(500).json({ error:'Password change failed.' }); }
  }
);

// GET /api/users/me/summaries — user summary history
router.get('/me/summaries', requireUser, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id,file_name,file_type,language,occupation,style,word_count,created_at FROM summaries WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
      [req.user.sub]
    );
    res.json({ summaries: rows });
  } catch { res.status(500).json({ error:'Failed to fetch history.' }); }
});

module.exports = router;
