// backend/routes/coupons.js — Coupon validation & admin CRUD
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

// POST /api/coupons/validate — public: check a coupon code
router.post('/validate', body('code').trim().toUpperCase(), async (req, res) => {
  const { code } = req.body;
  try {
    const [[c]] = await db.execute(
      `SELECT id,code,discount_pct,max_uses,uses_count FROM coupons WHERE code=? AND is_active=1 AND (valid_until IS NULL OR valid_until>=CURRENT_DATE)`,
      [code]
    );
    if (!c) return res.status(404).json({ error:'Invalid or expired coupon.' });
    if (c.uses_count >= c.max_uses) return res.status(400).json({ error:'Coupon usage limit reached.' });
    res.json({ coupon:{ code:c.code, discount_pct:c.discount_pct } });
  } catch { res.status(500).json({ error:'Coupon check failed.' }); }
});

// ── Admin routes ────────────────────────────────────────────

// GET /api/coupons — list all (admin)
router.get('/', requireAdmin, async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ coupons: rows });
});

// POST /api/coupons — create (admin)
router.post('/', requireAdmin,
  body('code').trim().toUpperCase().isLength({min:3,max:30}),
  body('discount_pct').isInt({min:1,max:100}),
  body('max_uses').optional().isInt({min:1}),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors:errors.array() });
    const { code, discount_pct, max_uses=9999, valid_until=null } = req.body;
    try {
      await db.execute(
        'INSERT INTO coupons (code,discount_pct,max_uses,valid_until,created_by) VALUES (?,?,?,?,?)',
        [code, discount_pct, max_uses, valid_until, req.admin.sub]
      );
      res.status(201).json({ message:`Coupon ${code} created.` });
    } catch (e) {
      if (e.code==='23505') return res.status(409).json({ error:'Code already exists.' });
      res.status(500).json({ error:'Create failed.' });
    }
  }
);

// PATCH /api/coupons/:id/toggle — activate / deactivate
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  await db.execute('UPDATE coupons SET is_active=1-is_active WHERE id=?', [req.params.id]);
  res.json({ message:'Coupon toggled.' });
});

// DELETE /api/coupons/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  await db.execute('DELETE FROM coupons WHERE id=?', [req.params.id]);
  res.json({ message:'Coupon deleted.' });
});

module.exports = router;
