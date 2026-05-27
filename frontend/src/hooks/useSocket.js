import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (token) => {
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      setLatency(null);
      return;
    }

    // Connect to Socket.IO server passing the JWT securely in the connection handshake auth payload
    const socket = io(import.meta.env.VITE_API_URL || undefined, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;
    let pingInterval;

    socket.on('connect', () => {
      console.log('⚡ Real-time Socket.IO link active.');
      setConnected(true);

      // Start pinging heartbeat to calculate socket latency
      const triggerPing = () => {
        socket.emit('ping_check', Date.now());
      };
      triggerPing();
      pingInterval = setInterval(triggerPing, 4000);
    });

    socket.on('pong_check', (sentTime) => {
      const end = Date.now();
      const rtt = end - parseInt(sentTime);
      setLatency(rtt);
    });

    socket.on('disconnect', () => {
      console.log('❌ Real-time Socket.IO link deactivated.');
      setConnected(false);
      setLatency(null);
      if (pingInterval) clearInterval(pingInterval);
    });

    socket.on('connect_error', (err) => {
      console.error('⚠️ Real-time link authentication failure:', err.message);
      setConnected(false);
      setLatency(null);
      if (pingInterval) clearInterval(pingInterval);
    });

    // Cleanup hook on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection...');
      if (pingInterval) clearInterval(pingInterval);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setLatency(null);
    };
  }, [token]);

  return {
    socket: socketRef.current,
    connected,
    latency,
  };
};
