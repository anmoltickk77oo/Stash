import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync session state from localStorage on load
  useEffect(() => {
    const savedToken = localStorage.getItem('stash_token');
    const savedUser = localStorage.getItem('stash_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse saved user credentials:', err);
        logout();
      }
    }
    setLoading(false);
  }, []);

  // Standard Login Action
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user: userData, token: userToken } = res.data;
      
      const completeUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        wallet_id: userData.wallet_id
      };

      localStorage.setItem('stash_token', userToken);
      localStorage.setItem('stash_user', JSON.stringify(completeUser));
      
      setToken(userToken);
      setUser(completeUser);
      return { success: true };
    } catch (err) {
      console.error('Login action error:', err);
      return {
        success: false,
        error: err.response?.data?.error || 'Authentication server rejected details.'
      };
    }
  };

  // Standard Registration Action
  const register = async (username, email, password) => {
    try {
      const res = await api.post('/auth/register', { username, email, password });
      const { user: userData, wallet_id, token: userToken } = res.data;

      const completeUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        wallet_id: wallet_id
      };

      localStorage.setItem('stash_token', userToken);
      localStorage.setItem('stash_user', JSON.stringify(completeUser));

      setToken(userToken);
      setUser(completeUser);
      return { success: true };
    } catch (err) {
      console.error('Registration action error:', err);
      return {
        success: false,
        error: err.response?.data?.error || 'Account synchronization rejected by core.'
      };
    }
  };

  // Logout/Sign-out Action
  const logout = () => {
    localStorage.removeItem('stash_token');
    localStorage.removeItem('stash_user');
    setToken(null);
    setUser(null);
  };

  // Helper method to let sockets/dashboard update the user structure (such as wallet updates)
  const updateUserProfile = (updatedFields) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...updatedFields };
      localStorage.setItem('stash_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
