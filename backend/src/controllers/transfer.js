const { pool } = require('../config/db');

exports.executeTransfer = async (req, res) => {
    const { receiver_wallet_id, amount } = req.body;

    // Grab the sender's wallet ID from the verified JWT payload mapped in Phase 2
    const sender_user_id = req.user.id;
    const transferAmount = parseFloat(amount);

    const client = await pool.connect();

    try {
        // 1. Fetch the sender's wallet details first to identify their true wallet ID
        const senderWalletCheck = await client.query('SELECT id FROM wallets WHERE user_id = $1', [sender_user_id]);
        if (senderWalletCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Sender wallet structure not found.' });
        }
        const sender_wallet_id = senderWalletCheck.rows[0].id;

        if (sender_wallet_id === parseInt(receiver_wallet_id)) {
            return res.status(400).json({ error: 'Self-transfers are mathematically prohibited by database invariant.' });
        }

        // 2. Start the isolated ACID Transaction block
        await client.query('BEGIN');

        // 3. DEADLOCK PREVENTION: Order the execution locks by primary key ID sequentially
        const firstLockId = Math.min(sender_wallet_id, receiver_wallet_id);
        const secondLockId = Math.max(sender_wallet_id, receiver_wallet_id);

        // Lock the first wallet row
        await client.query('SELECT balance FROM wallets WHERE id = $1 FOR UPDATE', [firstLockId]);
        // Lock the second wallet row
        await client.query('SELECT balance FROM wallets WHERE id = $1 FOR UPDATE', [secondLockId]);

        // 4. Verify the sender has sufficient liquidity now that the row is locked exclusively to us
        const senderBalanceQuery = await client.query('SELECT balance FROM wallets WHERE id = $1', [sender_wallet_id]);
        const currentSenderBalance = parseFloat(senderBalanceQuery.rows[0].balance);

        if (currentSenderBalance < transferAmount) {
            // Abort immediately if funds are missing
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient ledger balance to complete transfer execution.' });
        }

        // 5. Deduct funds from Sender
        await client.query(
            'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
            [transferAmount, sender_wallet_id]
        );

        // 6. Credit funds to Receiver
        const receiverUpdate = await client.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING id',
            [transferAmount, receiver_wallet_id]
        );

        if (receiverUpdate.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Target receiver wallet does not exist.' });
        }

        // 7. Write immutable event record to the append-only transaction history table
        const auditLogQuery = `
      INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount)
      VALUES ($1, $2, $3)
      RETURNING id, sender_wallet_id, receiver_wallet_id, amount, created_at;
    `;
        const auditLogResult = await client.query(auditLogQuery, [sender_wallet_id, receiver_wallet_id, transferAmount]);
        const transactionRecord = auditLogResult.rows[0];

        // 8. Atomically finalize everything directly onto storage disk
        await client.query('COMMIT');

        // Return receipt payload (we will use this payload for the WebSockets layer in Phase 4!)
        res.status(200).json({
            success: true,
            message: 'Atomic P2P transfer settled successfully.',
            transaction: transactionRecord
        });

    } catch (err) {
        // If anything breaks, abort completely to protect financial balances
        await client.query('ROLLBACK');
        console.error('Core transfer failure rollback issued:', err);
        res.status(500).json({ error: 'Ledger processing engine failed to execute transaction safely.' });
    } finally {
        // Return connection resource to the pool
        client.release();
    }
};

// Simple historical log viewer endpoint
exports.getHistory = async (req, res) => {
    const user_id = req.user.id;
    try {
        const historyQuery = `
      SELECT t.id, t.amount, t.created_at,
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