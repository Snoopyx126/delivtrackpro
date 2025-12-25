import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Truck, Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'driver' | 'company'>('driver');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulation d'appel API
    setTimeout(() => {
      setIsLoading(false);
      // On sauvegarde le rôle dans le localStorage pour simuler la session
      localStorage.setItem('delivtrack_role', role);
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-primary mx-auto">
            <Package className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">DelivTrack Pro</h1>
          <p className="text-muted-foreground">La solution logistique intelligente</p>
        </div>

        {/* Sélecteur de rôle */}
        <div className="grid grid-cols-2 gap-4 p-1 bg-secondary rounded-xl">
          <button
            onClick={() => setRole('driver')}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
              role === 'driver' 
                ? 'bg-background shadow-sm text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Truck className="w-6 h-6" />
            <span className="font-medium text-sm">Livreur</span>
          </button>
          <button
            onClick={() => setRole('company')}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
              role === 'company' 
                ? 'bg-background shadow-sm text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-6 h-6" />
            <span className="font-medium text-sm">Entreprise</span>
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-card">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email professionnel</label>
            <Input type="email" placeholder="nom@societe.com" required className="h-12" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Mot de passe</label>
            <Input type="password" placeholder="••••••••" required className="h-12" />
          </div>

          {role === 'company' && (
             <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-medium">Code Entreprise (ID)</label>
                <Input type="text" placeholder="ex: FR-75001" className="h-12" />
             </div>
          )}

          <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
            {isLoading ? (
                "Connexion..."
            ) : (
                <>Se connecter <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          En vous connectant, vous acceptez les CGU de DelivTrack Enterprise v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;