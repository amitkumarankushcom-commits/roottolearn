// ============================================================
//  middleware/auth.js — Shared JWT Authentication
// ============================================================

const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Single-device check: verify session token matches DB
    if (user.ses) {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('session_token')
          .eq('id', user.id)
          .single();

        if (!dbUser || dbUser.session_token !== user.ses) {
          return res.status(403).json({
            error: 'Session expired — logged in on another device',
            code: 'SESSION_REPLACED'
          });
        }
      } catch (e) {
        console.error('[AUTH MIDDLEWARE] Session check error:', e.message);
        // Allow through if DB check fails to avoid lockouts
      }
    }

    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
