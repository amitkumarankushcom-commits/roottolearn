// ============================================================
// OTP SYSTEM (Supabase + Gmail SMTP)
// ============================================================

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const supabase = require('./supabase');

// Gmail SMTP Transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


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
// CREATE OTP (Supabase)
// ============================================================

async function createOTP(email, purpose) {
    console.log("🔥 Creating OTP for:", email, "purpose:", purpose);

    const token = generateOTP();
    const hash = hashOTP(token);
    console.log("🔥 OTP hash:", hash);

    const expiryMin = Number(process.env.OTP_EXPIRY_MINUTES) || 15;
    const expiresAt = new Date(Date.now() + expiryMin * 60 * 1000);

    console.log("🔥 Deleting old OTPs for:", email);
    // Delete old OTPs
    const { error: deleteError } = await supabase
        .from('otp_tokens')
        .delete()
        .eq('target', email)
        .eq('purpose', purpose);

    if (deleteError) {
        console.error("❌ OTP Delete Error:", deleteError.message);
    }

    console.log("🔥 Inserting new OTP for:", email);
    // Insert new OTP
    const { error: insertError } = await supabase
        .from('otp_tokens')
        .insert([{
            target: email,
            token: hash,
            purpose,
            expires_at: expiresAt,
            attempts: 0,
            used: false
        }]);

    if (insertError) {
        console.error("❌ OTP Insert Error:", insertError.message);
        throw insertError;
    }

    console.log("✅ OTP stored in DB");

    return token;
}


// ============================================================
// VERIFY OTP
// ============================================================

async function verifyOTP(email, token, purpose, consume = true) {
    const MAX_ATTEMPTS = 5;
    const hash = hashOTP(token);

    const { data, error } = await supabase
        .from('otp_tokens')
        .select('*')
        .eq('target', email)
        .eq('purpose', purpose)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !data.length) {
        return { ok: false, error: 'OTP not found' };
    }

    const row = data[0];

    // Check max attempts
    if (row.attempts >= MAX_ATTEMPTS) {
        await supabase.from('otp_tokens').update({ used: true }).eq('id', row.id);
        return { ok: false, error: 'Too many attempts. Request a new OTP.' };
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
        return { ok: false, error: 'OTP expired' };
    }

    if (row.token !== hash) {
        await supabase
            .from('otp_tokens')
            .update({ attempts: row.attempts + 1 })
            .eq('id', row.id);

        return { ok: false, error: 'Invalid OTP' };
    }

    if (consume) {
        await supabase
            .from('otp_tokens')
            .update({ used: true })
            .eq('id', row.id);
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
// SEND OTP EMAIL (Gmail SMTP)
// ============================================================

async function sendOTPEmail(email, purpose) {
    console.log("📧 Sending OTP to:", email);

    const otp = await createOTP(email, purpose);
    console.log("📧 OTP generated (raw):", otp);

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code - RootToLearn',
            html: emailHTML(otp)
        });

        console.log("✅ Email sent:", info.messageId);
        return { ok: true, messageId: info.messageId };

    } catch (err) {
        console.error("❌ Email Error:", err.message);
        return { ok: false, error: err.message };
    }
}


// ============================================================

module.exports = {
    sendOTPEmail,
    verifyOTP
};
