// backend/config/db.js — supports MySQL (phpMyAdmin) and PostgreSQL (Supabase)
// Auto-detects: set DATABASE_URL for Supabase, or DB_HOST/DB_USER/DB_PASS/DB_NAME for MySQL
let db;

if (process.env.DATABASE_URL) {
  // ── PostgreSQL / Supabase ─────────────────────────────────────
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

  function toPostgres(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  db = {
    async execute(sql, params = []) {
      const result = await pool.query(toPostgres(sql), params);
      return [result.rows];
    },
  };

  pool.connect()
    .then(client => { console.log('[DB] Supabase (PostgreSQL) connected ✓'); client.release(); })
    .catch(err  => { console.error('[DB] Supabase connection failed:', err.message); process.exit(1); });

} else {
  // ── MySQL / phpMyAdmin ────────────────────────────────────────
  const mysql = require('mysql2/promise');
  const pool  = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               Number(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASS     || '',
    database:           process.env.DB_NAME     || 'summariq_db',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    timezone:           '+00:00',
    charset:            'utf8mb4',
  });

  db = {
    async execute(sql, params = []) {
      const [rows] = await pool.execute(sql, params);
      return [rows];
    },
  };

  pool.getConnection()
    .then(conn => { console.log('[DB] MySQL (phpMyAdmin) connected ✓'); conn.release(); })
    .catch(err  => { console.error('[DB] MySQL connection failed:', err.message); process.exit(1); });
}

module.exports = db;
