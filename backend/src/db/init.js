const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD === 'your_postgres_password_here' ? '' : process.env.DB_PASSWORD,
};

async function init() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting Stash Database Initialization...');
  console.log('----------------------------------------------------');
  console.log(`Connecting to PostgreSQL at ${dbConfig.host}:${dbConfig.port} as user "${dbConfig.user}"...`);

  // 1. Connect to default 'postgres' database to create the app database if needed
  const client = new Client({ ...dbConfig, database: 'postgres' });
  try {
    await client.connect();
    console.log('✅ Connected to default "postgres" database.');
    
    const dbName = process.env.DB_NAME || 'stash_ledger';
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    
    if (res.rowCount === 0) {
      console.log(`🔨 Database "${dbName}" does not exist. Creating database...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`✅ Database "${dbName}" already exists.`);
    }

    // Check and create the 'stash_admin' role so pgAdmin and other connections work as expected
    const roleRes = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'stash_admin'");
    if (roleRes.rowCount === 0) {
      console.log('🔨 Creating role "stash_admin" with password "stash_secure_password123"...');
      await client.query("CREATE ROLE stash_admin WITH LOGIN PASSWORD 'stash_secure_password123' SUPERUSER");
      console.log('✅ Role "stash_admin" created successfully.');
    } else {
      console.log('✅ Role "stash_admin" already exists.');
    }
  } catch (err) {
    console.error('❌ Error checking/creating database:', err.message);
    console.log('\n💡 Tip: Please make sure that:');
    console.log('   1. Your local PostgreSQL service is running.');
    console.log('   2. The password in `backend/.env` is correct.');
    console.log('   3. If you do not have a password, leave the password field blank in `backend/.env`.');
    process.exit(1);
  } finally {
    await client.end();
  }

  // 2. Connect to the newly created 'stash_ledger' database to run migrations
  const dbName = process.env.DB_NAME || 'stash_ledger';
  const appClient = new Client({ ...dbConfig, database: dbName });
  try {
    await appClient.connect();
    console.log(`✅ Connected to database "${dbName}".`);

    // Run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📖 Reading schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await appClient.query(schemaSql);
      console.log('✅ schema.sql applied successfully (Tables and Indexes created).');
    } else {
      console.warn('⚠️ schema.sql not found.');
    }

    // Run seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('📖 Reading seed.sql...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await appClient.query(seedSql);
      console.log('✅ seed.sql applied successfully (Test data populated).');
    } else {
      console.warn('⚠️ seed.sql not found.');
    }

    console.log('----------------------------------------------------');
    console.log('🎉 Stash Database successfully initialized!');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('❌ Error executing SQL migrations:', err.message);
    process.exit(1);
  } finally {
    await appClient.end();
  }
}

init();
