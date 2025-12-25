import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

// Types d'utilisateurs
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'company' | 'driver';
  avatar?: string;
  // Champs spécifiques
  companyName?: string;
  vehicleType?: 'car' | 'bike' | 'truck' | 'scooter';
  licensePlate?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier la session au démarrage
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('delivtrack_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // --- ACTIONS ---

  const login = async (credentials: any) => {
    try {
      // TODO: Remplacer par votre appel API MongoDB
      // const res = await fetch('YOUR_API_URL/auth/login', { ... });
      // const data = await res.json();
      
      // Simulation locale pour le moment
      console.log("Connexion avec:", credentials);
      const fakeUser: User = {
        id: '1',
        name: 'Utilisateur Demo',
        email: credentials.email,
        role: 'driver', // ou 'company' selon la réponse API
        vehicleType: 'car'
      };

      setUser(fakeUser);
      localStorage.setItem('delivtrack_user', JSON.stringify(fakeUser));
      toast.success('Bon retour parmi nous !');
    } catch (error) {
      toast.error('Erreur de connexion');
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      // TODO: Appel API MongoDB '/auth/register'
      console.log("Inscription:", data);
      
      const newUser: User = {
        id: Date.now().toString(),
        name: data.name,
        email: data.email,
        role: data.role,
        companyName: data.companyName,
        vehicleType: data.vehicleType
      };

      setUser(newUser);
      localStorage.setItem('delivtrack_user', JSON.stringify(newUser));
      toast.success('Compte créé avec succès !');
    } catch (error) {
      toast.error("Erreur lors de l'inscription");
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('delivtrack_user');
    toast.info('Vous avez été déconnecté');
    // La redirection se fera via le Router
  };

  const resetPassword = async (email: string) => {
    // TODO: Appel API MongoDB '/auth/forgot-password'
    console.log("Reset password pour:", email);
    toast.success(`Un email de réinitialisation a été envoyé à ${email}`);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    
    // TODO: Appel API MongoDB '/user/update'
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('delivtrack_user', JSON.stringify(updatedUser));
    toast.success('Profil mis à jour');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, resetPassword, updateProfile }}>
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