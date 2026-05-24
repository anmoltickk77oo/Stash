module.exports = (req, res, next) => {
    const { receiver_wallet_id, amount } = req.body;

    if (!receiver_wallet_id || amount === undefined) {
        return res.status(400).json({ error: 'Receiver wallet ID and amount are strictly required.' });
    }

    // Parse to float for numeric validation checks
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Transfer amount must be a clean, positive number greater than zero.' });
    }

    next();
};