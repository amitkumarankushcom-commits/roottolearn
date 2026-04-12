// ============================================================
//  routes/payments.js - Payment Processing Routes
// ============================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

// ── POST /api/payments/create-order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { plan, couponCode } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'Plan required' });
    }

    // Define plan prices (in INR)
    const planPrices = {
      pro: 84900,        // ₹849 = 84900 paise
      enterprise: 249900 // ₹2499 = 249900 paise
    };

    if (!planPrices[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    let finalAmount = planPrices[plan];
    let couponAppliedCode = null;

    console.log('[CREATE ORDER] Plan:', plan, 'Amount:', finalAmount, 'Coupon:', couponCode);

    // Apply coupon if provided
    if (couponCode) {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', 1)
        .single();

      console.log('[CREATE ORDER] Coupon lookup:', { found: !!coupon, error: couponError });

      if (coupon) {
        // Check expiry
        if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
          console.log('[CREATE ORDER] Coupon expired');
        } else {
          // Apply discount (discount_pct is percentage)
          const discountAmount = Math.round(finalAmount * coupon.discount_pct / 100);
          finalAmount = finalAmount - discountAmount;
          couponAppliedCode = coupon.code;
          console.log('[CREATE ORDER] Coupon applied:', coupon.code, 'Discount:', coupon.discount_pct, '%', 'Final:', finalAmount);
        }
      }
    }

    // Create payment record
    const { data: paymentRecord, error } = await supabase
      .from('payments')
      .insert([{
        user_id: req.user.id,
        plan: plan,
        amount_cents: finalAmount,
        status: 'pending',
        coupon_code: couponAppliedCode || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('[CREATE ORDER] ✅ Order created:', paymentRecord.id);

    res.json({
      success: true,
      orderId: paymentRecord.id,
      amount: finalAmount / 100, // Return amount in INR
      key: process.env.RAZORPAY_KEY || 'rzp_test_SYgxg67CSCdmMD'
    });

  } catch (error) {
    console.error('[CREATE ORDER ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/payments/verify
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Payment details required' });
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Signature verification failed' });
    }

    // Find and update payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        completed_at: new Date().toISOString()
      })
      .eq('razorpay_order_id', razorpayOrderId)
      .select()
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Enroll user in course
    await supabase
      .from('user_courses')
      .insert([{
        user_id: payment.user_id,
        course_id: payment.course_id,
        enrolled_at: new Date().toISOString()
      }]);

    res.json({ success: true, message: 'Payment verified and processed' });

  } catch (error) {
    console.error('[VERIFY PAYMENT ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/payments/history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*, courses(title)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, payments: payments || [] });

  } catch (error) {
    console.error('[GET PAYMENT HISTORY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
