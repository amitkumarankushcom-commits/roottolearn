// backend/routes/payments.js — Stripe + Razorpay payment integration
const router   = require('express').Router();
const stripe   = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const db       = require('../config/db');
const { requireUser } = require('../middleware/auth');

const PLANS     = { pro: 999,   enterprise: 2999  }; // USD cents
const PLANS_INR = { pro: 84900, enterprise: 249900 }; // INR paise

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-intent — create Stripe PaymentIntent
router.post('/create-intent', requireUser, async (req, res) => {
  const { plan, couponCode } = req.body;
  const baseAmount = PLANS[plan?.toLowerCase()];
  if (!baseAmount) return res.status(400).json({ error:'Invalid plan.' });

  let amount = baseAmount, couponId = null;

  // Apply coupon if provided
  if (couponCode) {
    const [[c]] = await db.execute(
      `SELECT id,discount_pct FROM coupons WHERE code=? AND is_active=1 AND uses_count<max_uses`,
      [couponCode.toUpperCase()]
    );
    if (c) { amount = Math.round(baseAmount * (1 - c.discount_pct/100)); couponId = c.id; }
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount, currency:'usd',
      metadata:{ userId:String(req.user.sub), plan, couponCode:couponCode||'' }
    });

    // Record pending payment
    await db.execute(
      `INSERT INTO payments (user_id,plan,amount_cents,coupon_id,stripe_pi_id,status) VALUES (?,?,?,?,?,'pending')`,
      [req.user.sub, plan, amount, couponId, intent.id]
    );

    res.json({ clientSecret: intent.client_secret, amount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/payments/webhook — Stripe webhook
router.post('/webhook', require('express').raw({type:'application/json'}), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch { return res.status(400).json({ error:'Webhook signature failed.' }); }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const { userId, plan } = pi.metadata;
    await db.execute(`UPDATE payments SET status='succeeded' WHERE stripe_pi_id=?`, [pi.id]);
    await db.execute(`UPDATE users SET plan=? WHERE id=?`, [plan, userId]);
    // Increment coupon uses if applicable
    if (pi.metadata.couponCode) {
      await db.execute('UPDATE coupons SET uses_count=uses_count+1 WHERE code=?', [pi.metadata.couponCode]);
    }
  }
  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    await db.execute(`UPDATE payments SET status='failed' WHERE stripe_pi_id=?`, [pi.id]);
  }

  res.json({ received: true });
});

// POST /api/payments/create-order — Razorpay order (UPI / card INR)
router.post('/create-order', requireUser, async (req, res) => {
  const { plan, couponCode } = req.body;
  const baseAmount = PLANS_INR[plan?.toLowerCase()];
  if (!baseAmount) return res.status(400).json({ error: 'Invalid plan.' });

  let amount = baseAmount, couponId = null;
  if (couponCode) {
    const [[c]] = await db.execute(
      `SELECT id,discount_pct FROM coupons WHERE code=? AND is_active=1 AND uses_count<max_uses`,
      [couponCode.toUpperCase()]
    );
    if (c) { amount = Math.round(baseAmount * (1 - c.discount_pct / 100)); couponId = c.id; }
  }

  try {
    const order = await razorpay.orders.create({
      amount, currency: 'INR',
      notes: { userId: String(req.user.sub), plan, couponCode: couponCode || '' }
    });
    await db.execute(
      `INSERT INTO payments (user_id,plan,amount_cents,coupon_id,stripe_pi_id,status) VALUES (?,?,?,?,?,'pending')`,
      [req.user.sub, plan, amount, couponId, order.id]
    );
    res.json({ orderId: order.id, amount, key: process.env.RAZORPAY_KEY_ID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/payments/verify-upi — Razorpay signature verification
router.post('/verify-upi', requireUser, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ error: 'Missing payment fields.' });

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');
  if (expected !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature.' });

  await db.execute(`UPDATE payments SET status='succeeded' WHERE stripe_pi_id=?`, [razorpay_order_id]);
  const [[p]] = await db.execute(`SELECT plan,coupon_id FROM payments WHERE stripe_pi_id=?`, [razorpay_order_id]);
  if (p) {
    await db.execute(`UPDATE users SET plan=? WHERE id=?`, [p.plan, req.user.sub]);
    if (p.coupon_id) {
      const [[coupon]] = await db.execute(`SELECT code FROM coupons WHERE id=?`, [p.coupon_id]);
      if (coupon) await db.execute(`UPDATE coupons SET uses_count=uses_count+1 WHERE id=?`, [p.coupon_id]);
    }
  }
  res.json({ success: true });
});

// GET /api/payments/history — user payment history
router.get('/history', requireUser, async (req, res) => {
  const [rows] = await db.execute(
    `SELECT p.id,p.plan,p.amount_cents,p.status,p.created_at,c.code as coupon
     FROM payments p LEFT JOIN coupons c ON p.coupon_id=c.id
     WHERE p.user_id=? ORDER BY p.created_at DESC`,
    [req.user.sub]
  );
  res.json({ payments: rows });
});

module.exports = router;
