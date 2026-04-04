// ============================================================
//  setup-db.js — Initialize MySQL database for local development
// ============================================================
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'summariq_db',
};

async function setupDatabase() {
  console.log('[SETUP] Starting database initialization...');
  console.log('[CONFIG]', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
  });

  let conn;
  try {
    // Step 1: Connect without database to create it
    console.log('\n[STEP 1] Connecting to MySQL server...');
    conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });
    console.log('✓ Connected to MySQL');

    // Step 2: Create database if not exists
    console.log('\n[STEP 2] Creating database...');
    const createDbSql = `CREATE DATABASE IF NOT EXISTS ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
    await conn.execute(createDbSql);
    console.log(`✓ Database '${config.database}' ready`);

    // Step 3: Switch to the database
    console.log('\n[STEP 3] Switching to database...');
    await conn.changeUser({ database: config.database });
    console.log(`✓ Using database '${config.database}'`);

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

    console.log('\n✅ Database setup completed successfully!');
    console.log('\nYou can now run: npm run dev');

  } catch (err) {
    console.error('\n❌ Database setup failed!');
    console.error('Error:', err.message);
    console.error('\nTroubleshooting:\n');

    if (err.code === 'ECONNREFUSED') {
      console.error('→ MySQL is not running. Start XAMPP and enable MySQL service.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('→ MySQL credentials are wrong. Check .env file:');
      console.error(`  DB_HOST=${config.host}`);
      console.error(`  DB_USER=${config.user}`);
      console.error(`  DB_PORT=${config.port}`);
    } else if (err.code === 'ER_NO_DB_ERROR') {
      console.error('→ Database does not exist. Try creating it manually.');
    }

    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

setupDatabase();
