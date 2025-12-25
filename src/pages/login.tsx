import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Truck, Building2, ArrowRight, Mail, Lock, User as UserIcon, Car, Info } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/Auhtcontext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Assurez-vous d'avoir ce composant ou utilisez un select natif

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [role, setRole] = useState<'driver' | 'company'>('driver');
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  // Champs spécifiques
  const [companyName, setCompanyName] = useState('');
  const [vehicleType, setVehicleType] = useState('car');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isLoginMode) {
        await login({ email, password });
      } else {
        await register({
            email,
            password,
            name,
            role,
            // Champs conditionnels selon le rôle
            companyName: role === 'company' ? companyName : undefined,
            vehicleType: role === 'driver' ? vehicleType : undefined
        });
      }
      navigate('/dashboard');
    } catch (error) {
        console.error(error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-500">
        
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-primary mx-auto mb-4">
            <Package className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">DelivTrack Pro</h1>
          <p className="text-muted-foreground">
            {isLoginMode ? 'Connectez-vous à votre espace' : 'Rejoignez la plateforme'}
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-card">
            
            {/* Tabs Role */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-lg mb-6">
                <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-md transition-all font-medium text-sm ${
                    role === 'driver' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Truck className="w-4 h-4" /> Livreur
                </button>
                <button
                    type="button"
                    onClick={() => setRole('company')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-md transition-all font-medium text-sm ${
                    role === 'company' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Building2 className="w-4 h-4" /> Entreprise
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                
                {!isLoginMode && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Nom complet</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Jean Dupont" className="pl-9" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                    </div>
                )}

                {/* Champs Spécifiques Inscription */}
                {!isLoginMode && role === 'company' && (
                     <div className="space-y-2 animate-in slide-in-from-top-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Nom de la société</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Express Logistics SAS" className="pl-9" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                        </div>
                     </div>
                )}

                {!isLoginMode && role === 'driver' && (
                     <div className="space-y-2 animate-in slide-in-from-top-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Type de véhicule</label>
                        <div className="relative">
                            {/* Simple select natif si pas de composant UI complexe */}
                            <div className="relative">
                                <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={vehicleType}
                                    onChange={(e) => setVehicleType(e.target.value)}
                                >
                                    <option value="car">Voiture</option>
                                    <option value="scooter">Scooter / Moto</option>
                                    <option value="bike">Vélo</option>
                                    <option value="truck">Camion / Utilitaire</option>
                                </select>
                            </div>
                        </div>
                     </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" placeholder="exemple@email.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Mot de passe</label>
                        {isLoginMode && (
                            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Oublié ?</Link>
                        )}
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" className="pl-9" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                </div>

                <Button type="submit" className="w-full h-11 text-base mt-2" disabled={isLoading}>
                    {isLoading ? "Traitement..." : (
                        <>{isLoginMode ? 'Se connecter' : 'Créer un compte'} <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    type="button"
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-sm text-primary hover:underline font-medium"
                >
                    {isLoginMode ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;