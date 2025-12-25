import React, { useState, useEffect } from 'react';
import { useDeliveries } from '@/hooks/useDeliveries';
import DeliveryMap from '@/components/DeliveryMap';
import DeliveryCard from '@/components/DeliveryCard';
import AddDeliveryForm from '@/components/AddDeliveryForm';
import RouteStats from '@/components/RouteStats';
import DriverStatus from '@/components/DriverStatus';
import { Button } from '@/components/ui/button';
import { Plus, List, Map, RefreshCw, Package, Home } from 'lucide-react';

const Index = () => {
  const {
    deliveries,
    driverLocation,
    routeInfo,
    addDelivery,
    updateDeliveryStatus,
    removeDelivery,
    optimizeRoute,
    simulateDriverMovement,
  } = useDeliveries();

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | undefined>();
  const [showAddForm, setShowAddForm] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');

  // Simulate real-time driver movement
  useEffect(() => {
    const interval = setInterval(simulateDriverMovement, 3000);
    return () => clearInterval(interval);
  }, [simulateDriverMovement]);

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
                <p className="text-xs text-muted-foreground">Suivi en temps réel</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle - mobile */}
              <div className="flex bg-secondary rounded-lg p-1 md:hidden">
                <button
                  onClick={() => setView('map')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    view === 'map'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Map className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    view === 'list'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

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
      </header>

      {/* Main content */}
      <main className="flex-1 container py-4 flex flex-col lg:flex-row gap-4">
        {/* Map section */}
        <div className={`lg:flex-1 lg:min-h-[600px] ${view === 'list' ? 'hidden md:block' : ''}`}>
          <div className="h-[50vh] lg:h-full">
            <DeliveryMap
              deliveries={deliveries}
              driverLocation={driverLocation}
              selectedDeliveryId={selectedDeliveryId}
              onSelectDelivery={setSelectedDeliveryId}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className={`lg:w-96 space-y-4 ${view === 'map' ? 'hidden md:block' : ''}`}>
          {/* Driver status */}
          <DriverStatus driverLocation={driverLocation} />

          {/* Route stats */}
          <RouteStats routeInfo={routeInfo} deliveries={deliveries} />

          {/* Add delivery button / form */}
          {showAddForm ? (
            <div className="bg-card rounded-2xl p-4 shadow-card border border-border slide-up">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Nouvelle livraison
              </h3>
              <AddDeliveryForm
                onAdd={addDelivery}
                onClose={() => setShowAddForm(false)}
              />
            </div>
          ) : (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter une livraison
            </Button>
          )}

          {/* Deliveries list */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center justify-between">
              <span>Livraisons ({activeDeliveries.length})</span>
              {activeDeliveries.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  Triées par ordre optimal
                </span>
              )}
            </h3>

            {activeDeliveries.length === 0 ? (
              <div className="bg-card rounded-xl p-8 text-center shadow-card border border-border">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Aucune livraison en cours</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ajoutez une nouvelle livraison pour commencer
                </p>
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

            {/* Completed deliveries */}
            {completedDeliveries.length > 0 && (
              <div className="pt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Terminées ({completedDeliveries.length})
                </h4>
                <div className="space-y-2">
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
            onClick={() => {
              setShowAddForm(true);
              setView('list');
            }}
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
