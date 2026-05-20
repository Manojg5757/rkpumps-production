"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { app } from './firebase';

const auth = getAuth(app);

const SESSION_KEY = 'rkpumps_session_ts';
const SESSION_DURATION = 24 * 60 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const sessionTs = localStorage.getItem(SESSION_KEY);
        if (sessionTs && Date.now() - parseInt(sessionTs) > SESSION_DURATION) {
          await signOut(auth);
          localStorage.removeItem(SESSION_KEY);
          setUser(null);
        } else {
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem(SESSION_KEY, Date.now().toString());
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
