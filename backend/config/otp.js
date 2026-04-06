// ============================================================
// OTP SYSTEM (Supabase + Email)
// ============================================================

const crypto = require('crypto');
const supabase = require('./supabase');
const nodemailer = require('nodemailer');

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

    // Expiry check
    if (new Date(row.expires_at).getTime() < Date.now()) {
        return { ok: false, error: 'OTP expired. Request a new one.' };
    }

    // Wrong OTP
    if (row.token !== hash) {
        await supabase
            .from('otp_tokens')
            .update({ attempts: row.attempts + 1 })
            .eq('id', row.id);

        return { ok: false, error: 'Invalid OTP.' };
    }

    // Mark used
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
    const titles = {
        signup: 'Verify Your Email',
        login: 'Your Login Code',
        forgot: 'Reset Password'
    };

    return `
    <html>
    <body style="font-family:Arial;background:#111;color:#fff;padding:20px">
        <h2>${titles[purpose] || 'Your OTP'}</h2>
        <p>Your OTP is:</p>
        <h1 style="color:#F7B731;letter-spacing:8px">${otp}</h1>
        <p>Expires in ${process.env.OTP_EXPIRY_MINUTES || 15} minutes</p>
    </body>
    </html>
    `;
}

// ============================================================
// EMAIL SETUP
// ============================================================

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ============================================================
// SEND OTP EMAIL
// ============================================================

async function sendOTPEmail(email, purpose) {
    const otp = await createOTP(email, purpose);

    const subjects = {
        signup: 'Verify your RootToLearn email',
        login: 'Your login OTP',
        forgot: 'Reset password OTP'
    };

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: subjects[purpose] || 'OTP Code',
            html: emailHTML(otp, purpose),
            text: `Your OTP is ${otp}`
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