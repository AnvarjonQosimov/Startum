import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('stratum_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem('stratum_token');
      if (savedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setLoading(false);
          return;
        } catch (err) {
          console.warn('Session expired or invalid, auto-authenticating with default admin...');
          localStorage.removeItem('stratum_token');
        }
      }

      // Auto-authenticate developer account for seamless demo experience
      try {
        const loginRes = await api.login('admin@stratum.dev', 'admin123456');
        localStorage.setItem('stratum_token', loginRes.token);
        setToken(loginRes.token);
        setUser(loginRes.user);
      } catch (err) {
        console.error('Failed to auto-authenticate developer:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('stratum_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const register = async (email, password, name) => {
    const res = await api.register(email, password, name);
    localStorage.setItem('stratum_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('stratum_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

