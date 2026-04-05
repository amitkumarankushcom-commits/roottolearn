// backend/config/db.js — supports MySQL (phpMyAdmin) and PostgreSQL (Supabase)
// Auto-detects: set DATABASE_URL for Supabase, or DB_HOST/DB_USER/DB_PASS/DB_NAME for MySQL
let db;

if (process.env.DATABASE_URL && process.env.DATABASE_URL !== '') {
  // ── PostgreSQL / Supabase ─────────────────────────────────────
  console.log('[DB] Detected DATABASE_URL → Using PostgreSQL/Supabase');
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
    .then(client => { console.log('[DB] ✓ Supabase (PostgreSQL) connected'); client.release(); })
    .catch(err  => { 
      console.error('[DB] ✗ Supabase connection failed:', err.message);
      console.error('[DB] Check your DATABASE_URL in .env');
      
    });

} else {
  // ── MySQL / phpMyAdmin ────────────────────────────────────────
  console.log('[DB] DATABASE_URL not set → Using MySQL (Local)');
  const mysql = require('mysql2/promise');
  
  const dbConfig = {
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
  };

  console.log(`[DB] Configuration: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const pool  = mysql.createPool(dbConfig);

  db = {
    async execute(sql, params = []) {
      const [rows] = await pool.execute(sql, params);
      return [rows];
    },
  };

  pool.getConnection()
    .then(conn => { 
      console.log('[DB] ✓ MySQL (Local Development) connected');
      conn.release();
    })
    .catch(err  => { 
      console.error('\n[DB] ✗ MySQL connection failed!');
      console.error('[DB] Error:', err.message);
      console.error('\n[DB] Troubleshooting:');
      
      if (err.code === 'ECONNREFUSED') {
        console.error('  → MySQL is not running');
        console.error('  → Start XAMPP and enable MySQL service');
        console.error('  → OR run: "C:\\xampp\\mysql\\bin\\mysqld.exe"');
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('  → MySQL credentials are wrong');
        console.error('  → Check .env: DB_HOST, DB_USER, DB_PASS');
      } else if (err.code === 'ER_NO_DB_ERROR') {
        console.error('  → Database does not exist');
        console.error('  → Run: npm run setup-db');
      }
      
      console.error('\nFor setup help, see: DATABASE_SETUP.md\n');
      process.exit(1);
    });
}

module.exports = db;
