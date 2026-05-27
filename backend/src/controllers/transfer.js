// ... Keep your existing imports at top
const { pool } = require('../config/db');

exports.executeTransfer = async (req, res) => {
    const { receiver_wallet_id, amount, category, memo } = req.body;
    const sender_user_id = req.user.id;
    const transferAmount = parseFloat(amount);

    const client = await pool.connect();

    try {
        // 1. Fetch sender's wallet details first
        const senderWalletCheck = await client.query('SELECT id FROM wallets WHERE user_id = $1', [sender_user_id]);
        if (senderWalletCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Sender wallet structure not found.' });
        }
        const sender_wallet_id = senderWalletCheck.rows[0].id;

        if (sender_wallet_id === parseInt(receiver_wallet_id)) {
            return res.status(400).json({ error: 'Self-transfers are mathematically prohibited by database invariant.' });
        }

        await client.query('BEGIN');

        // Deadlock Prevention ordering logic
        const firstLockId = Math.min(sender_wallet_id, receiver_wallet_id);
        const secondLockId = Math.max(sender_wallet_id, receiver_wallet_id);
        await client.query('SELECT balance FROM wallets WHERE id = $1 FOR UPDATE', [firstLockId]);
        await client.query('SELECT balance FROM wallets WHERE id = $1 FOR UPDATE', [secondLockId]);

        const senderBalanceQuery = await client.query('SELECT balance FROM wallets WHERE id = $1', [sender_wallet_id]);
        const currentSenderBalance = parseFloat(senderBalanceQuery.rows[0].balance);

        if (currentSenderBalance < transferAmount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient ledger balance to complete transfer execution.' });
        }

        // Deduct from Sender
        await client.query(
            'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
            [transferAmount, sender_wallet_id]
        );

        // Credit to Receiver. Retrieve receiver user_id during this update query to trace their socket room!
        const receiverUpdate = await client.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING user_id',
            [transferAmount, receiver_wallet_id]
        );

        if (receiverUpdate.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Target receiver wallet does not exist.' });
        }
        const receiver_user_id = receiverUpdate.rows[0].user_id;

        const crypto = require('crypto');

        // Fetch preceding cryptographic link signature from transactions ledger
        const lastTxResult = await client.query('SELECT transaction_hash FROM transactions ORDER BY id DESC LIMIT 1');
        const previous_hash = lastTxResult.rows.length > 0 && lastTxResult.rows[0].transaction_hash
            ? lastTxResult.rows[0].transaction_hash
            : '0000000000000000000000000000000000000000000000000000000000000000';

        // Calculate secure SHA-256 seal for new block row
        const hashInput = `${sender_wallet_id}:${receiver_wallet_id}:${transferAmount.toFixed(2)}:${previous_hash}`;
        const transaction_hash = crypto.createHash('sha256').update(hashInput).digest('hex');

        // Log append-only transaction history row with cryptographic seals
        const auditLogQuery = `
          INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, previous_hash, transaction_hash, category, memo)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, sender_wallet_id, receiver_wallet_id, amount, previous_hash, transaction_hash, category, memo, created_at;
        `;
        const auditLogResult = await client.query(auditLogQuery, [
            sender_wallet_id,
            receiver_wallet_id,
            transferAmount,
            previous_hash,
            transaction_hash,
            category || 'Transfer',
            memo || null
        ]);
        const transactionRecord = auditLogResult.rows[0];

        // Atomically save to disk
        await client.query('COMMIT');

        // --- NEW REAL-TIME SOCKET DISPATCH LAYER ---
        // Extract the global Socket Server reference we mounted in server.js
        const io = req.app.get('io');

        // Dispatch instant execution notification details to the sender's secure room
        io.to(`user_room_${sender_user_id}`).emit('ledger_update', {
            type: 'DEBIT',
            amount: transferAmount,
            transaction: transactionRecord,
            message: `You successfully transferred $${transferAmount.toFixed(2)}.`
        });

        // Dispatch instant execution notification details to the receiver's secure room
        io.to(`user_room_${receiver_user_id}`).emit('ledger_update', {
            type: 'CREDIT',
            amount: transferAmount,
            transaction: transactionRecord,
            message: `You received a transfer of $${transferAmount.toFixed(2)}.`
        });
        // -------------------------------------------

        res.status(200).json({
            success: true,
            message: 'Atomic P2P transfer settled and live sync event propagated.',
            transaction: transactionRecord
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Core transfer failure rollback issued:', err);
        res.status(500).json({ error: 'Ledger processing engine failed to execute transaction safely.' });
    } finally {
        client.release();
    }
};

// Simple historical log viewer endpoint
exports.getHistory = async (req, res) => {
    const user_id = req.user.id;
    try {
        const historyQuery = `
      SELECT t.id, t.amount, t.created_at, t.previous_hash, t.transaction_hash, t.category, t.memo,
             w_sig.id as sender_id, u_sig.username as sender_name,
             w_rec.id as receiver_id, u_rec.username as receiver_name
      FROM transactions t
      JOIN wallets w_sig ON t.sender_wallet_id = w_sig.id
      JOIN users u_sig ON w_sig.user_id = u_sig.id
      JOIN wallets w_rec ON t.receiver_wallet_id = w_rec.id
      JOIN users u_rec ON w_rec.user_id = u_rec.id
      WHERE w_sig.user_id = $1 OR w_rec.user_id = $1
      ORDER BY t.created_at DESC;
    `;
        const results = await pool.query(historyQuery, [user_id]);
        res.status(200).json({ history: results.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to extract ledger historical rows.' });
    }
};

// Balance fetcher endpoint
exports.getBalance = async (req, res) => {
    const user_id = req.user.id;
    try {
        const result = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [user_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Wallet profile not found.' });
        }
        res.status(200).json({ balance: result.rows[0].balance });
    } catch (err) {
        console.error('Balance retrieval error:', err);
        res.status(500).json({ error: 'Failed to retrieve ledger balance.' });
    }
};

// Public ledger audit validation endpoint
exports.verifyLedger = async (req, res) => {
    const crypto = require('crypto');
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY id ASC');
        const transactions = result.rows;
        
        let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
        
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            
            // 1. Check matching preceding hashes link
            if (tx.previous_hash !== previousHash) {
                return res.status(200).json({
                    success: false,
                    error: 'Ledger broken',
                    details: `Cryptographic link broken: Transaction #${tx.id} previous link does not match preceding transaction.`,
                    failedTxId: tx.id
                });
            }
            
            // 2. Validate row SHA-256 seal signature
            const transferAmount = parseFloat(tx.amount);
            const hashInput = `${tx.sender_wallet_id}:${tx.receiver_wallet_id}:${transferAmount.toFixed(2)}:${tx.previous_hash}`;
            const calculatedHash = crypto.createHash('sha256').update(hashInput).digest('hex');
            
            if (tx.transaction_hash !== calculatedHash) {
                return res.status(200).json({
                    success: false,
                    error: 'Ledger tampered',
                    details: `Cryptographic signature mismatch: Transaction #${tx.id} transaction_hash seal has been altered.`,
                    failedTxId: tx.id
                });
            }
            
            previousHash = tx.transaction_hash;
        }
        
        res.status(200).json({
            success: true,
            verifiedCount: transactions.length,
            message: 'Mathematical blockchain-grade proof-of-work validated. Ledger integrity is secure.'
        });
    } catch (err) {
        console.error('Ledger verification error:', err);
        res.status(500).json({ error: 'Core ledger auditing validation failed.' });
    }
};

// Sandbox developer faucet minting endpoint
exports.executeFaucet = async (req, res) => {
    const user_id = req.user.id;
    const amount = 500.00;
    
    const client = await pool.connect();
    
    try {
        // 1. Fetch user's wallet ID
        const userWalletCheck = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user_id]);
        if (userWalletCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User wallet structure not found.' });
        }
        const receiver_wallet_id = userWalletCheck.rows[0].id;
        
        // Fetch System Faucet wallet ID dynamically
        const faucetUserCheck = await client.query("SELECT id FROM users WHERE username = 'system_faucet'");
        if (faucetUserCheck.rows.length === 0) {
            return res.status(404).json({ error: 'System Faucet user not found.' });
        }
        const faucet_user_id = faucetUserCheck.rows[0].id;
        
        const faucetWalletCheck = await client.query('SELECT id FROM wallets WHERE user_id = $1', [faucet_user_id]);
        if (faucetWalletCheck.rows.length === 0) {
            return res.status(404).json({ error: 'System Faucet wallet structure not found.' });
        }
        const sender_wallet_id = faucetWalletCheck.rows[0].id;
        
        if (sender_wallet_id === receiver_wallet_id) {
            return res.status(400).json({ error: 'System Faucet cannot transfer to itself.' });
        }
        
        await client.query('BEGIN');
        
        // Deadlock Prevention ordering logic
        const firstLockId = Math.min(sender_wallet_id, receiver_wallet_id);
        const secondLockId = Math.max(sender_wallet_id, receiver_wallet_id);
        await client.query('SELECT balance FROM wallets WHERE id = $1 FOR UPDATE', [firstLockId]);
        await client.query('SELECT balance FROM wallets WHERE id = $1 FOR UPDATE', [secondLockId]);
        
        // Verify Faucet balance
        const faucetBalanceQuery = await client.query('SELECT balance FROM wallets WHERE id = $1', [sender_wallet_id]);
        const faucetBalance = parseFloat(faucetBalanceQuery.rows[0].balance);
        
        if (faucetBalance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'System Faucet liquidity exhausted.' });
        }
        
        // Deduct from Faucet
        await client.query(
            'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
            [amount, sender_wallet_id]
        );
        
        // Credit to active user
        await client.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
            [amount, receiver_wallet_id]
        );
        
        const crypto = require('crypto');
        
        // Fetch preceding cryptographic link signature
        const lastTxResult = await client.query('SELECT transaction_hash FROM transactions ORDER BY id DESC LIMIT 1');
        const previous_hash = lastTxResult.rows.length > 0 && lastTxResult.rows[0].transaction_hash
            ? lastTxResult.rows[0].transaction_hash
            : '0000000000000000000000000000000000000000000000000000000000000000';
            
        // Calculate secure SHA-256 seal for new block row
        const hashInput = `${sender_wallet_id}:${receiver_wallet_id}:${amount.toFixed(2)}:${previous_hash}`;
        const transaction_hash = crypto.createHash('sha256').update(hashInput).digest('hex');
        
        // Log transaction
        const auditLogQuery = `
            INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, previous_hash, transaction_hash, category, memo)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, sender_wallet_id, receiver_wallet_id, amount, previous_hash, transaction_hash, category, memo, created_at;
        `;
        
        const auditLogResult = await client.query(auditLogQuery, [
            sender_wallet_id,
            receiver_wallet_id,
            amount,
            previous_hash,
            transaction_hash,
            'Salary', // Categorize as Salary/Income for budgeting graphs!
            'Sandbox Faucet Refill'
        ]);
        const transactionRecord = auditLogResult.rows[0];
        
        await client.query('COMMIT');
        
        // Emit live syncs
        const io = req.app.get('io');
        
        // Notify the receiving user
        io.to(`user_room_${user_id}`).emit('ledger_update', {
            type: 'CREDIT',
            amount: amount,
            transaction: transactionRecord,
            message: `You successfully minted $${amount.toFixed(2)} from Developer Faucet.`
        });
        
        res.status(200).json({
            success: true,
            message: 'Developer Faucet minted atomic funds successfully.',
            transaction: transactionRecord
        });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Faucet minting collapse:', err);
        res.status(500).json({ error: 'Faucet processing failed.' });
    } finally {
        client.release();
    }
};