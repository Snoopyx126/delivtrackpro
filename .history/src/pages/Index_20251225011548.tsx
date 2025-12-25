import React, { useState } from 'react';
import { useDeliveries } from '@/hooks/useDeliveries';
import DeliveryMap from '@/components/DeliveryMap';
import DeliveryCard from '@/components/DeliveryCard';
import AddDeliveryForm from '@/components/AddDeliveryForm';
import RouteStats from '@/components/RouteStats';
import DriverStatus from '@/components/DriverStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, List, Map, RefreshCw, Package, Settings, AlertTriangle } from 'lucide-react';

const Index = () => {
  const {
    deliveries,
    driverLocation,
    routeInfo,
    addDelivery,
    updateDeliveryStatus,
    removeDelivery,
    optimizeRoute,
    checkScheduleConstraint,
    setConfiguration,
    config
  } = useDeliveries();

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | undefined>();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showConfig, setShowConfig] = useState(false); // Pour afficher le menu réglages
  const [view, setView] = useState<'map' | 'list'>('map');

  // États locaux pour le formulaire de configuration
  const [endTimeInput, setEndTimeInput] = useState(config.workEndTime);
  // Pour faire simple, on simule la saisie d'adresse d'arrivée par coordonnées ici
  // Dans une vraie version, on réutiliserait le composant Google Places
  const [homeCoords, setHomeCoords] = useState<{lat: number, lng: number} | null>(config.endLocation);

  const handleAddDelivery = (data: any) => {
    // 1. Vérifier si ça dépasse l'horaire
    const check = checkScheduleConstraint(data.estimatedTime || 15); // 15 min par défaut
    
    if (check.exceeds) {
      const confirm = window.confirm(
        `⚠️ ATTENTION : Ajouter cette course vous fera terminer vers ${check.projectedEnd?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}, ce qui dépasse votre limite de ${config.workEndTime}.\n\nVoulez-vous quand même l'ajouter ?`
      );
      if (!confirm) return;
    }

    addDelivery(data);
    setShowAddForm(false);
  };

  const saveConfig = () => {
    setConfiguration(homeCoords ? { ...homeCoords, address: "Maison / Dépôt" } : null, endTimeInput);
    setShowConfig(false);
  };

  const activeDeliveries = deliveries.filter(
    d => d.status !== 'completed' && d.status !== 'cancelled'
  );
  const completedDeliveries = deliveries.filter(d => d.status === 'completed');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card sticky top-0 z-40 border-b border-border shadow-soft">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-primary">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">DelivTrack</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                  GPS Actif
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowConfig(!showConfig)}
                className={config.workEndTime ? "text-primary border-primary" : ""}
                title="Configuration (Horaires & Maison)"
              >
                <Settings className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={optimizeRoute}
                title="Recalculer l'itinéraire"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Panel Configuration */}
        {showConfig && (
          <div className="container py-4 bg-secondary/20 border-b border-border animate-in slide-in-from-top-2">
            <div className="bg-card p-4 rounded-xl shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" /> Configuration Course
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Fin de journée (Heure max)</label>
                  <Input 
                    type="time" 
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Vous serez alerté si une course dépasse cet horaire.</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Retour Dépôt / Maison</label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setHomeCoords({ lat: driverLocation.lat, lng: driverLocation.lng })}
                    >
                      <Map className="w-4 h-4 mr-2" />
                      Utiliser ma position actuelle comme fin
                    </Button>
                  </div>
                  {homeCoords && (
                    <p className="text-xs text-success mt-1">
                      Point de retour enregistré ({homeCoords.lat.toFixed(4)}, {homeCoords.lng.toFixed(4)})
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button onClick={saveConfig}>Enregistrer</Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 container py-4 flex flex-col lg:flex-row gap-4">
        {/* Map section */}
        <div className={`lg:flex-1 lg:min-h-[600px] ${view === 'list' ? 'hidden md:block' : ''}`}>
          <div className="h-[50vh] lg:h-full relative">
            <DeliveryMap
              deliveries={deliveries}
              driverLocation={driverLocation}
              selectedDeliveryId={selectedDeliveryId}
              onSelectDelivery={setSelectedDeliveryId}
            />
            {/* Indicateur visuel d'horaire */}
            {config.workEndTime && (
              <div className="absolute top-4 right-4 bg-card/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg text-xs font-medium border border-border">
                Fin prévue : {config.workEndTime}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className={`lg:w-96 space-y-4 ${view === 'map' ? 'hidden md:block' : ''}`}>
          <DriverStatus driverLocation={driverLocation} />
          <RouteStats routeInfo={routeInfo} deliveries={deliveries} />

          {/* Add delivery */}
          {showAddForm ? (
            <div className="bg-card rounded-2xl p-4 shadow-card border border-border slide-up">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Nouvelle livraison
              </h3>
              <AddDeliveryForm
                onAdd={handleAddDelivery}
                onClose={() => setShowAddForm(false)}
              />
            </div>
          ) : (
            <Button onClick={() => setShowAddForm(true)} className="w-full" size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Ajouter une livraison
            </Button>
          )}

          {/* Listes des livraisons... (code inchangé ici) */}
           <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center justify-between">
              <span>Livraisons ({activeDeliveries.length})</span>
            </h3>

            {activeDeliveries.length === 0 ? (
              <div className="bg-card rounded-xl p-8 text-center shadow-card border border-border">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Aucune livraison</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeDeliveries
                  .sort((a, b) => a.priority - b.priority)
                  .map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      isSelected={selectedDeliveryId === delivery.id}
                      onSelect={() => setSelectedDeliveryId(delivery.id)}
                      onUpdateStatus={(status) => updateDeliveryStatus(delivery.id, status)}
                      onRemove={() => removeDelivery(delivery.id)}
                    />
                  ))}
              </div>
            )}
            
            {/* Completed list */}
            {completedDeliveries.length > 0 && (
              <div className="pt-4 opacity-75">
                 <h4 className="text-sm font-medium text-muted-foreground mb-3">Terminées</h4>
                 {completedDeliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      isSelected={selectedDeliveryId === delivery.id}
                      onSelect={() => setSelectedDeliveryId(delivery.id)}
                      onUpdateStatus={(status) => updateDeliveryStatus(delivery.id, status)}
                      onRemove={() => removeDelivery(delivery.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 md:hidden z-50">
        {!showAddForm && (
          <Button
            size="xl"
            onClick={() => { setShowAddForm(true); setView('list'); }}
            className="rounded-full shadow-glow-primary"
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Index;