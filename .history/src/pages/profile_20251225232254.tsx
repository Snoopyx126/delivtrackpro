import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Save, User, Truck, Building2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    companyName: user?.companyName || '',
    vehicleType: user?.vehicleType || 'car',
    licensePlate: user?.licensePlate || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(formData);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
            <Link to="/dashboard">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
            </Link>
            <h1 className="text-2xl font-bold">Mon Profil</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Carte Infos Personnelles */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" /> Informations Personnelles
                    </CardTitle>
                    <CardDescription>Vos informations de connexion et d'identité</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Nom complet</label>
                        <Input 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                value={formData.email} 
                                disabled 
                                className="pl-9 bg-secondary/50" 
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">L'email ne peut pas être modifié.</p>
                    </div>
                </CardContent>
            </Card>

            {/* Carte Infos Professionnelles (Différent selon rôle) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {user.role === 'driver' ? <Truck className="w-5 h-5 text-accent" /> : <Building2 className="w-5 h-5 text-accent" />}
                        {user.role === 'driver' ? 'Informations Véhicule' : 'Informations Société'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {user.role === 'company' ? (
                         <div className="grid gap-2">
                            <label className="text-sm font-medium">Nom de la société</label>
                            <Input 
                                value={formData.companyName} 
                                onChange={e => setFormData({...formData, companyName: e.target.value})} 
                            />
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Type de véhicule</label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={formData.vehicleType}
                                    onChange={(e) => setFormData({...formData, vehicleType: e.target.value as any})}
                                >
                                    <option value="car">Voiture</option>
                                    <option value="scooter">Scooter / Moto</option>
                                    <option value="bike">Vélo</option>
                                    <option value="truck">Camion / Utilitaire</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Immatriculation (Optionnel)</label>
                                <Input 
                                    value={formData.licensePlate} 
                                    onChange={e => setFormData({...formData, licensePlate: e.target.value})} 
                                    placeholder="AB-123-CD"
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" size="lg">
                    <Save className="w-4 h-4 mr-2" /> Enregistrer les modifications
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;