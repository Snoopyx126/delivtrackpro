// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'company' | 'driver';
  companyName?: string;
  vehicleType?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('delivtrack_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // --- VRAI LOGIN ---
  const login = async (credentials: any) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Erreur de connexion');

      setUser(data.user);
      localStorage.setItem('delivtrack_user', JSON.stringify(data.user));
      toast.success(`Bienvenue ${data.user.name} !`);
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  // --- VRAIE INSCRIPTION ---
  const register = async (formData: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Erreur d'inscription");

      toast.success('Compte créé ! Veuillez vous connecter.');
      // Optionnel : Connecter l'utilisateur directement après inscription
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('delivtrack_user');
    toast.info('Déconnexion réussie');
    window.location.href = '/login';
  };

  // --- VRAI EMAIL (RESEND) ---
  const resetPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!res.ok) throw new Error('Erreur envoi email');
      
      toast.success(`Email envoyé à ${email}`);
    } catch (error) {
      toast.error("Impossible d'envoyer l'email");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};