const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Secure Token Generator
const generateToken = (userId, username) => {
    return jwt.sign({ id: userId, username }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All registration parameters are strictly mandatory.' });
    }

    // Get a single dedicated client from the pool to handle our multi-query transaction safely
    const client = await pool.connect();

    try {
        // 1. Begin the atomic transaction block
        await client.query('BEGIN');

        // 2. Insert User profile
        // Note: In a production-deployed app, you would hash the password using bcrypt here
        const userInsertQuery = `
      INSERT INTO users (username, email, password_hash) 
      VALUES ($1, $2, $3) RETURNING id, username, email;
    `;
        const userResult = await client.query(userInsertQuery, [username, email, password]);
        const newUser = userResult.rows[0];

        // 3. Automatically initialize the linked ledger wallet record
        const walletInsertQuery = `
      INSERT INTO wallets (user_id, balance) 
      VALUES ($1, 0.00) RETURNING id;
    `;
        const walletResult = await client.query(walletInsertQuery, [newUser.id]);

        // 4. Commit both operations as a single unit of work
        await client.query('COMMIT');

        // Generate JWT for instant sign-in experience post-registration
        const token = generateToken(newUser.id, newUser.username);

        res.status(201).json({
            message: 'Account and wallet profile synchronized successfully.',
            user: { id: newUser.id, username: newUser.username, email: newUser.email },
            wallet_id: walletResult.rows[0].id,
            token
        });

    } catch (err) {
        // Abort the transaction and wipe intermediate mutations if any step collapsed
        await client.query('ROLLBACK');
        console.error('Registration Rollback Error:', err);

        if (err.code === '23505') {
            return res.status(409).json({ error: 'Username or email identifier already registered.' });
        }
        res.status(500).json({ error: 'Internal core registration transaction failure.' });
    } finally {
        // Release the client back to the pool resource pool immediately
        client.release();
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password parameters required.' });
    }

    try {
        // Query user and pull their structural wallet reference simultaneously via an INNER JOIN
        const userQuery = `
      SELECT u.id, u.username, u.email, u.password_hash, w.id AS wallet_id 
      FROM users u
      INNER JOIN wallets w ON u.id = w.user_id
      WHERE u.email = $1;
    `;
        const result = await pool.query(userQuery, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid authentication credentials.' });
        }

        const user = result.rows[0];

        // Plaintext comparative matching (Swap to bcrypt verification during deep production polish)
        if (password !== user.password_hash) {
            return res.status(401).json({ error: 'Invalid authentication credentials.' });
        }

        const token = generateToken(user.id, user.username);

        res.status(200).json({
            message: 'Authentication validated successfully.',
            user: { id: user.id, username: user.username, email: user.email, wallet_id: user.wallet_id },
            token
        });

    } catch (err) {
        console.error('Login routing failure:', err);
        res.status(500).json({ error: 'Internal system processing authentication failure.' });
    }
};