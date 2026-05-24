const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. Missing token identification structure.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        // Bind token data (id, username) to the request context
        req.user = verified;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired transaction execution token.' });
    }
};