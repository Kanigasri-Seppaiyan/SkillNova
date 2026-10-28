import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, account_type?: string) => Promise<User>;
  googleLogin: (credential: string, account_type?: string) => Promise<User>;
  register: (data: { email: string; password: string; full_name: string; role?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('skillnova_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (token) {
        const userData = await authAPI.getMe();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      localStorage.removeItem('skillnova_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (email: string, password: string, account_type?: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await authAPI.login(email, password, account_type);
      const access_token = res.access_token;
      localStorage.setItem('skillnova_token', access_token);
      setToken(access_token);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (credential: string, account_type?: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await authAPI.googleLogin(credential, account_type);
      const access_token = res.access_token;
      localStorage.setItem('skillnova_token', access_token);
      setToken(access_token);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; full_name: string; role?: string }) => {
    setLoading(true);
    try {
      await authAPI.register(data);
      // Auto login after registration
      await login(data.email, data.password);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('skillnova_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, googleLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
