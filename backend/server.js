const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middleware
app.use(cors());
app.use(express.json()); // Parses incoming application/json body elements
app.use('/api/auth', authRoutes);

// Health Check Route to test connectivity
app.get('/health', async (req, res) => {
    try {
        const dbCheck = await pool.query('SELECT NOW()');
        res.status(200).json({ status: 'healthy', db_time: dbCheck.rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'unhealthy', error: err.message });
    }
});

// Start the server instance
app.listen(PORT, () => {
    console.log(`🚀 Stash Backend Ledger listening smoothly on port ${PORT}`);
});