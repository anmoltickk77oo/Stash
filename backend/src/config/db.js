const { Pool } = require('pg');
require('dotenv').config();

// Initialize connection pool to handle multiple concurrent database requests efficiently
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Event listener to monitor successful connection handling
pool.on('connect', () => {
    console.log('⚡ Ledger database pool connected successfully.');
});

// Capture and gracefully handle unexpected database client errors
pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool // Exporting the pool instance directly to manage structural ACID transactions later
};