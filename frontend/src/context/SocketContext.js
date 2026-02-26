import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../utils/api';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [latestReading, setLatestReading] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState([]);

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('join_room', user.id);
    });

    newSocket.on('new_reading', (reading) => {
      setLatestReading(reading);
    });

    newSocket.on('new_alert', (alert) => {
      setLiveAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line
  }, [user, token]);

  const clearLiveAlerts = () => setLiveAlerts([]);

  return (
    <SocketContext.Provider value={{ socket, latestReading, liveAlerts, clearLiveAlerts }}>
      {children}
    </SocketContext.Provider>
  );
};
