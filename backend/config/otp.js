// ============================================================
// OTP SYSTEM (Supabase + Resend Email API)
// ============================================================

const crypto = require('crypto');
const supabase = require('./supabase');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);


// ── Hash OTP
function hashOTP(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Generate 6-digit OTP
function generateOTP() {
    const bytes = crypto.randomBytes(6);
    return Array.from(bytes).map(b => b % 10).join('');
}


// ============================================================
// CREATE OTP (Supabase)
// ============================================================

async function createOTP(email, purpose) {
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

    console.log("✅ OTP created for:", email);

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
        return { ok: false, error: 'OTP not found. Request a new one.' };
    }

    const row = data[0];

    if (new Date(row.expires_at).getTime() < Date.now()) {
        return { ok: false, error: 'OTP expired.' };
    }

    if (row.token !== hash) {
        await supabase
            .from('otp_tokens')
            .update({ attempts: row.attempts + 1 })
            .eq('id', row.id);

        return { ok: false, error: 'Invalid OTP.' };
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

function emailHTML(otp, purpose) {
    return `
    <div style="font-family:Arial;padding:20px">
        <h2>Your OTP Code</h2>
        <h1 style="color:#F7B731;letter-spacing:5px">${otp}</h1>
        <p>This OTP will expire in 15 minutes</p>
    </div>
    `;
}


// ============================================================
// SEND OTP EMAIL (Resend)
// ============================================================

async function sendOTPEmail(email, purpose) {
    const otp = await createOTP(email, purpose);

    try {
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'Your OTP Code',
            html: emailHTML(otp, purpose),
        });

        console.log("📧 OTP sent to:", email);

    } catch (err) {
        console.error("❌ Email Error:", err.message);
        throw err;
    }

    return true;
}


// ============================================================

module.exports = {
    sendOTPEmail,
    verifyOTP
};