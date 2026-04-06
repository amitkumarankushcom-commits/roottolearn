// ============================================================
//  routes/coupons.js - Coupon Management Routes
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

// ── POST /api/coupons/validate
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code required' });
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Check if expired
    if (new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Coupon expired' });
    }

    // Check usage limit
    const { data: usageCount } = await supabase
      .from('coupon_usage')
      .select('COUNT(*)', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id);

    if (usageCount >= coupon.max_uses) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountPercentage: coupon.discount_percentage,
        maxUses: coupon.max_uses,
        expiresAt: coupon.expires_at
      }
    });

  } catch (error) {
    console.error('[VALIDATE COUPON ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/coupons/apply
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { code, orderId } = req.body;

    if (!code || !orderId) {
      return res.status(400).json({ error: 'Code and orderId required' });
    }

    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Record usage
    const { error } = await supabase
      .from('coupon_usage')
      .insert([{
        coupon_id: coupon.id,
        user_id: req.user.id,
        order_id: orderId,
        used_at: new Date().toISOString()
      }]);

    if (error) throw error;

    res.json({ success: true, message: 'Coupon applied' });

  } catch (error) {
    console.error('[APPLY COUPON ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
