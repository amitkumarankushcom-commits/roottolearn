// ============================================================
// OTP SYSTEM (Supabase + Resend API)
// ============================================================

const crypto = require('crypto');
const { Resend } = require('resend');
const supabase = require('./supabase');

// ── Resend Configuration ──
const resendApiKey = process.env.RESEND_API_KEY;
const senderEmail = process.env.FROM_EMAIL || 'support@roottolearn.com';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

console.log('📧 Resend configured:', resend ? 'YES' : 'NO');
console.log('📧 Resend sender:', senderEmail);

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

    let data;
    try {
        const result = await supabase
            .from('otp_tokens')
            .select('*')
            .eq('target', email)
            .eq('purpose', purpose)
            .eq('used', false) // Only look at unused OTPs
            .order('created_at', { ascending: false })
            .maybeSingle(); // Get 0 or 1 row

        console.log("🔍 DB RESULT:", { data: result.data, error: result.error, email, purpose });

        if (result.error) {
            console.error("❌ DB Query Error:", result.error.message);
            return { ok: false, error: 'Database error: ' + result.error.message };
        }

        data = result.data;

        if (!data) {
            console.log("❌ OTP not found for:", email);
            return { ok: false, error: 'OTP not found' };
        }
    } catch (dbError) {
        console.error("❌ Database error in verifyOTP:", dbError.message);
        return { ok: false, error: 'Database error: ' + dbError.message };
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

    try {
        if (!resend) {
            throw new Error('Resend not configured. Set RESEND_API_KEY in Render env.');
        }

        const requestBody = {
            from: `RootToLearn <${senderEmail}>`,
            to: [email],
            subject: 'Your OTP Code',
            html: emailHTML(otp)
        };

        console.log('📧 Resend request body:', JSON.stringify(requestBody));

        const response = await resend.emails.send(requestBody);

        if (response.error) {
            throw new Error(response.error.message || JSON.stringify(response.error));
        }

        console.log("✅ Email sent via Resend, id:", response.data?.id);
        return { ok: true };
    } catch (err) {
        console.error("❌ Email error:", err.message);
        await removeOTP(email, purpose);

        return {
            ok: false,
            error: err.message || 'OTP email could not be sent.'
        };
    }
}

// ============================================================

module.exports = {
    sendOTPEmail,
    verifyOTP
};