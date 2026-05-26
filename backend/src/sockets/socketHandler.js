const jwt = require('jsonwebtoken');

// A shared dictionary object to map user IDs to active connection socket IDs
const userSocketMap = {};

const initSocket = (io) => {
    // Authentication Middleware running directly inside the WebSocket handshake connection layer
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];

        if (!token) {
            return next(new Error('Authentication failed. Missing token validation parameters.'));
        }

        // Strip out the 'Bearer ' string prefix if passed through the header layout
        const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

        try {
            const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
            socket.user = decoded; // Bind the authenticated user profile metadata directly onto the socket instance
            next();
        } catch (err) {
            return next(new Error('Connection aborted. Cryptographic session signature is invalid.'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user.id;

        // Save connection mapping parameters
        userSocketMap[userId] = socket.id;
        console.log(`🔌 Secure socket established: User ID ${userId} tied to Socket ${socket.id}`);

        // Join a isolated, user-specific secure private room based purely on their structural user id
        socket.join(`user_room_${userId}`);

        socket.on('disconnect', () => {
            console.log(`❌ Socket connection closed for User ID ${userId}`);
            delete userSocketMap[userId];
        });
    });
};

module.exports = {
    initSocket,
    userSocketMap
};