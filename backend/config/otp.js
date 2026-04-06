// ============================================================
// OTP SYSTEM (Supabase + Resend API) — FINAL
// ============================================================

const crypto = require('crypto');
const supabase = require('./supabase');
const { Resend } = require('resend');

// 🔥 Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);


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
            used: false
        }]);

    if (error) {
        console.error("❌ OTP Insert Error:", error.message);
        throw error;
    }

    console.log("✅ OTP stored in DB");

    return token;
}


// ============================================================
// VERIFY OTP
// ============================================================

async function verifyOTP(email, token, purpose, consume = true) {
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
// SEND OTP EMAIL (NO TIMEOUT)
// ============================================================

async function sendOTPEmail(email, purpose) {
    console.log("📧 Sending OTP to:", email);

    const otp = await createOTP(email, purpose);

    try {
        const response = await resend.emails.send({
            from: 'onboarding@resend.dev', // can change later
            to: email,
            subject: 'Your OTP Code',
            html: emailHTML(otp),
        });

        console.log("✅ Email sent:", response);

    } catch (err) {
        console.error("❌ Email Error:", err.message);
        // IMPORTANT: do NOT crash API
    }

    return true;
}


// ============================================================

module.exports = {
    sendOTPEmail,
    verifyOTP
};