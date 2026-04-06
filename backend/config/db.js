// ============================================================
//  config/db.js - Database Connection (MySQL fallback)
// ============================================================

const mysql = require('mysql2/promise');

// Note: Primary DB is Supabase (PostgreSQL)
// This file provides MySQL connection as fallback for compatibility

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'roottolearn',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

module.exports = pool;
