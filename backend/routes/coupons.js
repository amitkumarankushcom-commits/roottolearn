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

// ── Middleware: Check admin role
const requireAdmin = (req, res, next) => {
  const adminRoles = ['super', 'admin', 'editor', 'support'];
  const userRole = req.user.role || 'admin';
  
  if (!adminRoles.includes(userRole)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
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

// ── GET /api/coupons (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, coupons: coupons || [] });

  } catch (error) {
    console.error('[GET COUPONS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/coupons (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { code, discount_pct, max_uses } = req.body;

    if (!code || !discount_pct) {
      return res.status(400).json({ error: 'Code and discount required' });
    }

    if (discount_pct < 1 || discount_pct > 100) {
      return res.status(400).json({ error: 'Discount must be 1-100%' });
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert([{
        code: code.toUpperCase(),
        discount_percentage: discount_pct,
        discount_pct: discount_pct,
        max_uses: max_uses || 9999,
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, coupon });

  } catch (error) {
    console.error('[CREATE COUPON ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /api/coupons/:id/toggle (Admin only)
router.patch('/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current coupon
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Toggle status
    const { data: updated, error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, coupon: updated });

  } catch (error) {
    console.error('[TOGGLE COUPON ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/coupons/:id (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Coupon deleted' });

  } catch (error) {
    console.error('[DELETE COUPON ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
