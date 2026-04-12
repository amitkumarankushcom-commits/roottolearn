// ============================================================
// OTP SYSTEM (Supabase + Resend API) - FIXED VERSION
// ============================================================

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const supabase = require('./supabase');

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const senderEmail = process.env.FROM_EMAIL || process.env.SMTP_FROM;

function getSmtpTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

async function removeOTP(email, purpose) {
    await supabase
        .from('otp_tokens')
        .delete()
        .eq('target', email)
        .eq('purpose', purpose);
}

// ============================================================
// HASH OTP
// ============================================================

function hashOTP(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================
// GENERATE OTP (6-digit)
// ============================================================

function generateOTP() {
    const bytes = crypto.randomBytes(6);
    return Array.from(bytes).map(b => b % 10).join('');
}

// ============================================================
// CREATE OTP
// ============================================================

async function createOTP(email, purpose) {
    console.log("🔥 Creating OTP for:", email);

    const token = generateOTP();
    const hash = hashOTP(token);

    const expiryMin = Number(process.env.OTP_EXPIRY_MINUTES) || 15;
    const expiresAt = new Date(Date.now() + expiryMin * 60 * 1000);

    // Delete old OTPs
    await supabase
        .from('otp_tokens')
        .delete()
        .eq('target', email)
        .eq('purpose', purpose);

    // Insert new OTP
    const { error } = await supabase
        .from('otp_tokens')
        .insert([{
            target: email,
            token: hash,
            purpose,
            expires_at: expiresAt,
            attempts: 0,
            used: false,
            created_at: new Date().toISOString() // ✅ important
        }]);

    if (error) {
        console.error("❌ OTP Insert Error:", error.message);
        throw new Error("OTP creation failed");
    }

    console.log("✅ OTP stored");

    return token;
}


// ============================================================
// VERIFY OTP
// ============================================================

async function verifyOTP(email, token, purpose, consume = true) {
    const MAX_ATTEMPTS = 5;
    const hash = hashOTP(token);

    console.log("🔍 VERIFY:", { email, purpose });

    const { data, error } = await supabase
        .from('otp_tokens')
        .select('*')
        .eq('target', email)
        .eq('purpose', purpose)
        .eq('used', false) // Only look at unused OTPs
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error on multiple rows

    console.log("🔍 DB RESULT:", data, error);

    if (error || !data) {
        return { ok: false, error: 'OTP not found' };
    }

    // ❌ Already used
    if (data.used) {
        return { ok: false, error: 'OTP already used' };
    }

    // ❌ Too many attempts
    if (data.attempts >= MAX_ATTEMPTS) {
        await supabase
            .from('otp_tokens')
            .update({ used: true })
            .eq('id', data.id);

        return { ok: false, error: 'Too many attempts' };
    }

    // ❌ Expired
    if (new Date(data.expires_at) < new Date()) {
        return { ok: false, error: 'OTP expired' };
    }

    // ❌ Wrong OTP
    if (data.token !== hash) {
        await supabase
            .from('otp_tokens')
            .update({ attempts: data.attempts + 1 })
            .eq('id', data.id);

        return { ok: false, error: 'Invalid OTP' };
    }

    // ✅ Mark as used
    if (consume) {
        await supabase
            .from('otp_tokens')
            .update({ used: true })
            .eq('id', data.id);
    }

    return { ok: true };
}

// ============================================================
// EMAIL TEMPLATE
// ============================================================

function emailHTML(otp) {
    return `
    <div style="font-family:Arial;padding:20px">
        <h2>Your OTP Code</h2>
        <h1 style="color:#F7B731;letter-spacing:5px">${otp}</h1>
        <p>Expires in 15 minutes</p>
    </div>
    `;
}

// ============================================================
// SEND OTP EMAIL
// ============================================================

async function sendOTPEmail(email, purpose) {
    console.log("📧 Sending OTP to:", email);

    const otp = await createOTP(email, purpose);
    const from = senderEmail ? `RootToLearn <${senderEmail}>` : null;

    try {
        if (resend && from) {
            const response = await resend.emails.send({
                from,
                to: email,
                subject: 'Your OTP Code',
                html: emailHTML(otp)
            });

            if (response.error) {
                throw new Error(response.error.message || 'Resend failed to send email');
            }

            console.log("✅ Email sent via Resend");
            return { ok: true };
        }

        const transporter = getSmtpTransporter();

        if (transporter && from) {
            await transporter.sendMail({
                from,
                to: email,
                subject: 'Your OTP Code',
                html: emailHTML(otp)
            });

            console.log("✅ Email sent via SMTP");
            return { ok: true };
        }

        throw new Error('No email provider configured');
    } catch (err) {
        console.error("❌ Email error:", err.message);
        await removeOTP(email, purpose);

        return {
            ok: false,
            error: 'OTP email could not be sent. Check email provider settings.'
        };
    }
}

// ============================================================

module.exports = {
    sendOTPEmail,
    verifyOTP
};