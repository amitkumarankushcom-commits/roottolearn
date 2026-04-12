// ============================================================
//  routes/payments.js - Payment Processing Routes
// ============================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
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

    console.log('[CREATE ORDER] Request:', { userId: req.user.id, plan, couponCode });

    if (!plan) {
      return res.status(400).json({ error: 'Plan required' });
    }

    // Define plan prices (in paise for Razorpay)
    const planPrices = {
      pro: 84900,        // ₹849 in paise
      enterprise: 249900 // ₹2499 in paise
    };

    if (!planPrices[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    let finalAmount = planPrices[plan];
    let couponAppliedCode = null;

    console.log('[CREATE ORDER] Plan:', plan, 'Amount (paise):', finalAmount, 'Coupon:', couponCode);

    // Apply coupon if provided
    if (couponCode && couponCode.trim()) {
      try {
        const { data: coupon, error: couponError } = await supabase
          .from('coupons')
          .select('id, code, discount_pct, valid_until')
          .eq('code', couponCode.toUpperCase().trim())
          .eq('is_active', 1)
          .single();

        console.log('[CREATE ORDER] Coupon lookup:', { found: !!coupon, error: couponError });

        if (coupon) {
          // Check expiry
          if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
            console.log('[CREATE ORDER] Coupon expired:', coupon.valid_until);
          } else if (coupon.discount_pct) {
            // Apply discount (discount_pct is percentage, amount is in paise)
            const discountAmount = Math.round(finalAmount * coupon.discount_pct / 100);
            finalAmount = finalAmount - discountAmount;
            couponAppliedCode = coupon.id; // Store coupon ID, not code
            console.log('[CREATE ORDER] Coupon applied:', coupon.code, 'ID:', coupon.id, 'Discount:', coupon.discount_pct, '%', 'Final (paise):', finalAmount);
          }
        }
      } catch (couponErr) {
        console.error('[CREATE ORDER] Coupon processing error:', couponErr);
        // Continue without coupon on error
      }
    }

    // Create payment record
    console.log('[CREATE ORDER] Creating payment record:', { user_id: req.user.id, plan, amount_cents: finalAmount, coupon_id: couponAppliedCode });

    const { data: paymentRecord, error } = await supabase
      .from('payments')
      .insert([{
        user_id: req.user.id,
        plan: plan,
        amount_cents: finalAmount,
        currency: 'INR',
        status: 'pending',
        coupon_id: couponAppliedCode || null
      }])
      .select()
      .single();

    if (error) {
      console.error('[CREATE ORDER] DB insert error:', error);
      throw error;
    }

    if (finalAmount === 0) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'succeeded' })
        .eq('id', paymentRecord.id);

      if (updateError) {
        console.error('[CREATE ORDER] Free order status update error:', updateError);
      }

      console.log('[CREATE ORDER] ✅ Free order created:', paymentRecord.id);

      return res.json({
        success: true,
        free: true,
        paymentId: paymentRecord.id,
        orderId: paymentRecord.id,
        amount: 0,
        key: process.env.RAZORPAY_KEY || 'rzp_test_SYgxg67CSCdmMD'
      });
    }

    const razorpayKey = process.env.RAZORPAY_KEY || 'rzp_test_SYgxg67CSCdmMD';
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpaySecret) {
      console.error('[CREATE ORDER] Missing RAZORPAY_KEY_SECRET');
      return res.status(500).json({ error: 'Payment gateway not configured' });
    }

    const authHeader = Buffer.from(`${razorpayKey}:${razorpaySecret}`).toString('base64');
    const razorpayOrderPayload = {
      amount: finalAmount,
      currency: 'INR',
      receipt: `payment_${paymentRecord.id}`,
      notes: {
        payment_id: String(paymentRecord.id),
        user_id: String(req.user.id),
        plan
      }
    };

    console.log('[CREATE ORDER] Creating Razorpay order:', razorpayOrderPayload);

    const { data: razorpayOrder } = await axios.post(
      'https://api.razorpay.com/v1/orders',
      razorpayOrderPayload,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('[CREATE ORDER] ✅ Order created:', paymentRecord.id, 'Amount:', finalAmount);

    res.json({
      success: true,
      paymentId: paymentRecord.id,
      orderId: razorpayOrder.id,
      amount: finalAmount / 100, // Return amount in INR for display
      key: razorpayKey
    });

  } catch (error) {
    console.error('[CREATE ORDER ERROR]', error.message, error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// ── POST /api/payments/verify
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const {
      paymentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const orderId = razorpayOrderId || razorpay_order_id;
    const paymentGatewayId = razorpayPaymentId || razorpay_payment_id;
    const signature = razorpaySignature || razorpay_signature;

    if (!paymentId || !orderId || !paymentGatewayId || !signature) {
      return res.status(400).json({ error: 'Payment details required' });
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentGatewayId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Signature verification failed' });
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .update({ status: 'succeeded' })
      .eq('id', paymentId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

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
