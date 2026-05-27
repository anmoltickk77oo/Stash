const express = require('express');
const cors = require('cors');
const http = require('http'); // Native Node utility
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const { pool } = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
const { initSocket } = require('./src/sockets/socketHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Create raw HTTP server wrapper around our Express instance
const server = http.createServer(app);

// Initialize Socket.IO with broad Cross-Origin Resource Sharing rules
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust to specific frontend URL during deep deployment production cycles
        methods: ["GET", "POST"]
    }
});

// Attach Socket infrastructure and pass global io reference downward
initSocket(io);
app.set('io', io); // Makes our global socket server accessible within our API endpoints

// Standard Application Middleware
app.use(cors());
app.use(express.json());

// Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

// Serve static frontend files from 'public' folder in production
app.use(express.static(path.join(__dirname, 'public')));

// Fallback non-API router calls back to React Client app (supporting SPA routing)
app.get('*', (req, res) => {
    // Only serve index.html if the request isn't an API query
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: 'Endpoint not found' });
    }
});

// Base System Health Check Route
app.get('/health', async (req, res) => {
    try {
        const dbCheck = await pool.query('SELECT NOW()');
        res.status(200).json({ status: 'healthy', db_time: dbCheck.rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'unhealthy', error: err.message });
    }
});

// Boot listening execution via server wrapper instance rather than app instance
server.listen(PORT, () => {
    console.log(`🚀 Real-Time Stash Backend Ledger listening smoothly on port ${PORT}`);
});