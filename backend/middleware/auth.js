// backend/middleware/auth.js — JWT verification for users & admins
const jwt = require('jsonwebtoken');

// ── Authenticated user required
function requireUser(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Login required.' });
    try {
        const p = jwt.verify(token, process.env.JWT_SECRET);
        if (p.role !== 'user') return res.status(403).json({ error: 'Access denied.' });
        req.user = p; next();
    } catch (e) {
        return res.status(401).json({ error: e.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.' });
    }
}

// ── Admin required (separate token, role=admin)
function requireAdmin(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Admin auth required.' });
    try {
        const p = jwt.verify(token, process.env.JWT_SECRET);
        if (p.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
        req.admin = p; next();
    } catch {
        return res.status(401).json({ error: 'Invalid admin token.' });
    }
}

// ── Optional auth (passes through even if no token)
function optionalUser(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (token) { try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch { } }
    next();
}

// ── Plan guard factory
function requirePlan(...plans) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Login required.' });
        if (!plans.includes(req.user.plan)) {
            return res.status(403).json({ error: `Requires ${plans.join('/')} plan.`, upgradeRequired: true });
        }
        next();
    };
}

module.exports = { requireUser, requireAdmin, optionalUser, requirePlan };