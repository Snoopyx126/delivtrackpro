import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Truck, Building2, ArrowRight, Mail, Lock, User, MapPin, Phone, FileText } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // On utilisera notre propre fetch pour register ici
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'driver' | 'company'>('driver');

  // État unifié comme dans votre fichier inscription.tsx
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    siret: "", // Ajouté car présent dans inscription.tsx (Kbis)
    address: "",
    phone: "",
    vehicleType: "car"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    // Petit hack pour gérer les inputs qui n'ont pas d'ID mais un name, ou inversement
    const key = id || e.target.name;
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLoginMode) {
        // --- MODE CONNEXION ---
        await login({ email: formData.email, password: formData.password });
        navigate('/dashboard');
      } else {
        // --- MODE INSCRIPTION (Basé sur votre logique) ---
        const payload = {
            ...formData,
            role: role
        };

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // On lit la réponse texte d'abord pour éviter le crash JSON si erreur 500
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch(err) {
            throw new Error("Erreur serveur (réponse non JSON) : " + text);
        }

        if (!res.ok || !data.success) {
            throw new Error(data.message || "Erreur lors de l'inscription");
        }

        toast.success("Compte créé avec succès ! Connectez-vous.");
        setIsLoginMode(true); // Basculer vers le login
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Une erreur est survenue");
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
            {isLoginMode ? 'Connectez-vous à votre espace' : 'Créer un compte professionnel'}
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-card">
            
            {/* SÉLECTEUR DE RÔLE (Seulement en inscription) */}
            {!isLoginMode && (
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
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* CHAMPS INSCRIPTION SEULEMENT */}
                {!isLoginMode && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Nom complet</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input id="name" placeholder="Jean Dupont" className="pl-9" value={formData.name} onChange={handleChange} required />
                            </div>
                        </div>

                        {role === 'company' && (
                             <>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Nom Société</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input id="companyName" placeholder="Ma Société SAS" className="pl-9" value={formData.companyName} onChange={handleChange} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Numéro SIRET</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input id="siret" placeholder="123 456 789 00012" className="pl-9" value={formData.siret} onChange={handleChange} required />
                                    </div>
                                </div>
                             </>
                        )}

                        {role === 'driver' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Type de véhicule</label>
                                <select 
                                    id="vehicleType"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.vehicleType}
                                    onChange={handleChange}
                                >
                                    <option value="car">Voiture</option>
                                    <option value="scooter">Scooter / Moto</option>
                                    <option value="bike">Vélo</option>
                                    <option value="truck">Camion / Utilitaire</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Téléphone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input id="phone" type="tel" placeholder="06..." className="pl-9" value={formData.phone} onChange={handleChange} required />
                            </div>
                        </div>
                    </>
                )}

                {/* CHAMPS COMMUNS (LOGIN & REGISTER) */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="email@exemple.com" className="pl-9" value={formData.email} onChange={handleChange} required />
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
                        <Input id="password" type="password" placeholder="••••••••" className="pl-9" value={formData.password} onChange={handleChange} required />
                    </div>
                </div>

                <Button type="submit" className="w-full h-11 text-base mt-2" disabled={isLoading}>
                    {isLoading ? "Chargement..." : (
                        <>{isLoginMode ? 'Se connecter' : 'Valider l\'inscription'} <ArrowRight className="w-4 h-4 ml-2" /></>
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