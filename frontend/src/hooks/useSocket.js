import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (token) => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }

    // Connect to Socket.IO server passing the JWT securely in the connection handshake auth payload
    const socket = io({
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ Real-time Socket.IO link active.');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Real-time Socket.IO link deactivated.');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('⚠️ Real-time link authentication failure:', err.message);
      setConnected(false);
    });

    // Cleanup hook on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection...');
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  return {
    socket: socketRef.current,
    connected,
  };
};
