// ============================================================
//  setup-db.js — Initialize database (MySQL local or Supabase PostgreSQL)
// ============================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Detect: PostgreSQL (Supabase) vs MySQL (local)
const usePostgres = process.env.DATABASE_URL && process.env.DATABASE_URL !== '';

let runSetup;

if (usePostgres) {
  // ════════════════════════════════════════════════════════════════
  // PostgreSQL / Supabase Setup
  // ════════════════════════════════════════════════════════════════
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  runSetup = async () => {
    console.log('[SETUP] Starting PostgreSQL (Supabase) database initialization...');
    
    let client;
    try {
      client = await pool.connect();
      console.log('✓ Connected to Supabase PostgreSQL');

      // Read schema (using PostgreSQL compatible schema)
      console.log('\n[STEP 1] Loading schema from database/schema.sql...');
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      // Execute schema
      console.log('[STEP 2] Executing schema...');
      await client.query(schema);
      console.log('✓ Schema executed successfully');

      console.log('\n✅ PostgreSQL database setup completed!');

    } catch (err) {
      console.error('\n❌ PostgreSQL setup failed!');
      console.error('Error:', err.message);
      
      if (err.message.includes('ECONNREFUSED')) {
        console.error('\n→ Cannot connect to Supabase. Check DATABASE_URL in .env');
      } else if (err.message.includes('password')) {
        console.error('\n→ Authentication failed. Verify DATABASE_URL credentials.');
      }
      
      process.exit(1);
    } finally {
      if (client) client.release();
      await pool.end();
    }
  };

} else {
  // ════════════════════════════════════════════════════════════════
  // MySQL / Local Development Setup
  // ════════════════════════════════════════════════════════════════
  const mysql = require('mysql2/promise');

  const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'summariq_db',
  };

  runSetup = async () => {
    console.log('[SETUP] Starting MySQL database initialization...');
    console.log('[CONFIG]', {
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      database: mysqlConfig.database,
    });

    let conn;
    try {
      // Step 1: Connect without database to create it
      console.log('\n[STEP 1] Connecting to MySQL server...');
      conn = await mysql.createConnection({
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
      });
      console.log('✓ Connected to MySQL');

      // Step 2: Create database if not exists
      console.log('\n[STEP 2] Creating database...');
      const createDbSql = `CREATE DATABASE IF NOT EXISTS ${mysqlConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
      await conn.execute(createDbSql);
      console.log(`✓ Database '${mysqlConfig.database}' ready`);

      // Step 3: Switch to the database
      console.log('\n[STEP 3] Switching to database...');
      await conn.changeUser({ database: mysqlConfig.database });
      console.log(`✓ Using database '${mysqlConfig.database}'`);

      // Step 4: Read and execute schema
      console.log('\n[STEP 4] Loading schema from database/schema-mysql.sql...');
      const schemaPath = path.join(__dirname, '../database/schema-mysql.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      // Split by SQL statements (simple split by ;)
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

      console.log(`Found ${statements.length} SQL statements to execute`);

      for (let i = 0; i < statements.length; i++) {
        try {
          await conn.execute(statements[i]);
          console.log(`  ✓ Statement ${i + 1}/${statements.length}`);
        } catch (err) {
          console.warn(`  ⚠ Statement ${i + 1} warning: ${err.message.substring(0, 80)}`);
        }
      }

      console.log('\n✅ MySQL database setup completed successfully!');

    } catch (err) {
      console.error('\n❌ MySQL database setup failed!');
      console.error('Error:', err.message);
      console.error('\nTroubleshooting:\n');

      if (err.code === 'ECONNREFUSED') {
        console.error('→ MySQL is not running. Start XAMPP and enable MySQL service.');
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('→ MySQL credentials are wrong. Check .env file:');
        console.error(`  DB_HOST=${mysqlConfig.host}`);
        console.error(`  DB_USER=${mysqlConfig.user}`);
        console.error(`  DB_PORT=${mysqlConfig.port}`);
      } else if (err.code === 'ER_NO_DB_ERROR') {
        console.error('→ Database does not exist. Try creating it manually.');
      }

      process.exit(1);
    } finally {
      if (conn) await conn.end();
    }
  };
}

// ════════════════════════════════════════════════════════════════
// Run Setup
// ════════════════════════════════════════════════════════════════
console.log(`\n🗄️  Database Type: ${usePostgres ? 'PostgreSQL (Supabase)' : 'MySQL (Local)'}\n`);
runSetup();
