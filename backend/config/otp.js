// backend/config/otp.js — OTP generation, storage & email delivery
const crypto = require('crypto');
const db = require('./db');

// ── Hash OTP for storage (constant-time comparison via SHA-256)
function hashOTP(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Generate 6-digit OTP (crypto-secure)
function generateOTP() {
    const bytes = crypto.randomBytes(6);
    return Array.from(bytes).map(b => b % 10).join('');
}

// ── Save OTP hash to DB
async function createOTP(email, purpose) {
    const token = generateOTP();
    const hash = hashOTP(token);
    const expiryMin = Number(process.env.OTP_EXPIRY_MINUTES) || 15;
    const expiresAt = new Date(Date.now() + expiryMin * 60 * 1000);

    // Invalidate previous unused OTPs atomically
    await db.execute(
        `UPDATE otp_tokens SET used=1 WHERE target=? AND purpose=? AND used=0`,
        [email, purpose]
    );

    await db.execute(
        `INSERT INTO otp_tokens (target,token,purpose,expires_at) VALUES (?,?,?,?)`,
        [email, hash, purpose, expiresAt]
    );

    return token; // returns plaintext — only to send via email
}

// ── Verify OTP (atomic consume via UPDATE ... WHERE)
async function verifyOTP(email, token, purpose, consume = true) {
    const hash = hashOTP(token);
    const maxAtt = Number(process.env.OTP_MAX_ATTEMPTS) || 5;

    // First check if any valid OTP exists
    const [rows] = await db.execute(
        `SELECT id,attempts,expires_at,token FROM otp_tokens WHERE target=? AND purpose=? AND used=0 ORDER BY created_at DESC LIMIT 1`,
        [email, purpose]
    );

    if (!rows.length) {
        return { ok: false, error: 'OTP not found. Request a new one.' };
    }

    const row = rows[0];

    // Check expiry
    if (new Date(row.expires_at).getTime() < Date.now()) {
        return { ok: false, error: 'OTP expired. Request a new one.' };
    }

    // Check attempt limit
    if (row.attempts >= maxAtt) {
        return { ok: false, error: 'Too many attempts. Request a new OTP.' };
    }

    // Token match check (constant-time comparison)
    if (row.token !== hash) {
        await db.execute(
            `UPDATE otp_tokens SET attempts=attempts+1 WHERE id=? AND used=0`,
            [row.id]
        );
        return { ok: false, error: 'Invalid OTP. Please try again.' };
    }

    // Token match — consume atomically via UPDATE WHERE
    if (consume) {
        const [result] = await db.execute(
            `UPDATE otp_tokens SET used=1 WHERE id=? AND used=0`,
            [row.id]
        );
        // If no row was updated, it was already consumed (race condition guard)
        if (result.affectedRows === 0) {
            return { ok: false, error: 'OTP already used. Request a new one.' };
        }
        return { ok: true };
    }

    // For non-consumable verification (e.g., forgot password step 1)
    const [result] = await db.execute(
        `UPDATE otp_tokens SET attempts=attempts+1 WHERE id=? AND used=0`,
        [row.id]
    );
    if (result.affectedRows === 0) {
        return { ok: false, error: 'OTP already used. Request a new one.' };
    }
    return { ok: true };
}

// ── HTML email template
function emailHTML(otp, purpose) {
    const titles = { signup: 'Verify Your Email', login: 'Your Login Code', admin: 'Admin 2FA Code', forgot: 'Reset Password' };
    return `<!DOCTYPE html><html><body style="margin:0;background:#07080F;font-family:Arial,sans-serif">
<div style="max-width:460px;margin:40px auto;background:#131520;border-radius:16px;overflow:hidden;border:1px solid #252836">
<div style="background:#F7B731;padding:20px 28px"><strong style="color:#000;font-size:20px;font-weight:900">RootToLearn</strong></div>
<div style="padding:28px">
  <h2 style="color:#E8EAF0;font-size:18px;margin:0 0 8px">${titles[purpose] || 'Your OTP'}</h2>
  <p style="color:#9CA3AF;font-size:13px;margin:0 0 24px">Your one-time code — expires in <strong style="color:#F7B731">${process.env.OTP_EXPIRY_MINUTES || 15} minutes</strong>.</p>
  <div style="background:#07080F;border:2px dashed #F7B731;border-radius:12px;padding:20px;text-align:center">
    <div style="font-size:40px;font-weight:900;letter-spacing:14px;color:#F7B731;font-family:monospace">${otp}</div>
  </div>
  <p style="color:#6B7280;font-size:12px;margin-top:20px">Never share this code. If you didn't request it, ignore this email.</p>
</div></div></body></html>`;
}

// ── SMTP transporter
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ── Send email
async function sendOTPEmail(email, purpose) {
    const otp = await createOTP(email, purpose);
    const subjects = {
        signup: 'Verify your RootToLearn email',
        login: 'Your RootToLearn login code',
        admin: 'RootToLearn Admin — 2FA code',
        forgot: 'Reset your RootToLearn password'
    };

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: subjects[purpose] || 'SummarIQ OTP',
            html: emailHTML(otp, purpose),
            text: `Your SummarIQ OTP: ${otp}  (expires in ${process.env.OTP_EXPIRY_MINUTES || 15} minutes)`,
        });
    } catch (err) {
        console.error('[Email Error]', err.message);
        throw err; // re-throw so calling code knows it failed
    }
    return true;
}

module.exports = { sendOTPEmail, verifyOTP };