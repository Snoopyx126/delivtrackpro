import React, { useState, useEffect, useRef } from 'react';
import { useDeliveries } from '@/hooks/useDeliveries';
import DeliveryMap from '@/components/DeliveryMap';
import DeliveryCard from '@/components/DeliveryCard';
import AddDeliveryForm from '@/components/AddDeliveryForm';
import RouteStats from '@/components/RouteStats';
import DriverStatus from '@/components/DriverStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Settings, Package, MapPin, Navigation, Loader2, RefreshCw } from 'lucide-react';

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
    config,
    // Récupération des fonctions de favoris
    savedPlaces,
    addSavedPlace,
    removeSavedPlace
  } = useDeliveries();

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | undefined>();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');

  // États du formulaire
  const [endTimeInput, setEndTimeInput] = useState("");
  const [endAddressText, setEndAddressText] = useState("");
  const [selectedEndCoords, setSelectedEndCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (showConfig) {
      setEndTimeInput(config.workEndTime || "");
      setEndAddressText(config.endLocation?.address || "");
      if (config.endLocation) {
        setSelectedEndCoords({ lat: config.endLocation.lat, lng: config.endLocation.lng });
      }
    }
  }, [showConfig]); 

  useEffect(() => {
    if (showConfig && addressInputRef.current && (window as any).google) {
      const googleMaps = (window as any).google.maps;

      if (autocompleteRef.current) {
        googleMaps.event.clearInstanceListeners(autocompleteRef.current);
      }
      
      autocompleteRef.current = new googleMaps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'fr' },
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        
        if (place.geometry && place.geometry.location) {
          setEndAddressText(place.formatted_address || addressInputRef.current?.value || "");
          setSelectedEndCoords({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
        }
      });
    }
  }, [showConfig]);

  const handleAddDelivery = (data: any) => {
    const check = checkScheduleConstraint(data.estimatedTime || 15);
    
    if (check.exceeds) {
      const confirm = window.confirm(
        `⚠️ ALERTE HORAIRE\n\nFin prévue : ${check.projectedEnd?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.\nCela dépasse votre limite de ${config.workEndTime}.\n\nConfirmer l'ajout ?`
      );
      if (!confirm) return;
    }
    addDelivery(data);
    setShowAddForm(false);
  };

  const saveConfig = () => {
    if (!endAddressText.trim()) {
      setConfiguration(null, endTimeInput);
      setShowConfig(false);
      return;
    }

    if (selectedEndCoords) {
        setConfiguration(
            {
                lat: selectedEndCoords.lat,
                lng: selectedEndCoords.lng,
                address: endAddressText
            },
            endTimeInput
        );
        setShowConfig(false);
        return;
    }

    setIsGeocoding(true);
    if (!(window as any).google?.maps) return;

    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ address: endAddressText }, (results: any, status: string) => {
      setIsGeocoding(false);
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        setConfiguration(
          { lat: loc.lat(), lng: loc.lng(), address: results[0].formatted_address },
          endTimeInput
        );
        setShowConfig(false);
      } else {
        alert("Adresse introuvable. Veuillez cliquer sur une suggestion dans la liste.");
      }
    });
  };

  const useCurrentPositionAsEnd = () => {
    if (driverLocation.lat) {
       setIsGeocoding(true);
       const geocoder = new (window as any).google.maps.Geocoder();
       const latlng = { lat: driverLocation.lat, lng: driverLocation.lng };

       geocoder.geocode({ location: latlng }, (results: any, status: string) => {
         setIsGeocoding(false);
         if (status === 'OK' && results[0]) {
           const address = results[0].formatted_address;
           setEndAddressText(address);
           setSelectedEndCoords({ lat: driverLocation.lat, lng: driverLocation.lng });
         }
       });
    }
  };

  const activeDeliveries = deliveries.filter(
    d => d.status !== 'completed' && d.status !== 'cancelled'
  );
  const completedDeliveries = deliveries.filter(d => d.status === 'completed');

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  En ligne
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={config.workEndTime ? "default" : "outline"}
                size="icon"
                onClick={() => setShowConfig(!showConfig)}
                title="Configuration"
                className={showConfig ? "bg-secondary" : ""}
              >
                <Settings className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={optimizeRoute}
                title="Recalculer"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {showConfig && (
          <div className="container py-4 bg-secondary/30 border-b border-border animate-in slide-in-from-top-2">
            <div className="bg-card p-4 rounded-xl shadow-lg border border-border space-y-5 max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-primary">
                  <Settings className="w-4 h-4" /> Configuration
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowConfig(false)}>Fermer</Button>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Heure de fin max</label>
                  <Input 
                    type="time" 
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                    className="text-lg cursor-pointer block w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Adresse de retour (Maison/Dépôt)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Input 
                        ref={addressInputRef}
                        value={endAddressText}
                        onChange={(e) => {
                            setEndAddressText(e.target.value);
                            setSelectedEndCoords(null); 
                        }}
                        placeholder="Tapez votre adresse..."
                        className="pl-9"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={useCurrentPositionAsEnd}
                      title="Utiliser ma position actuelle"
                    >
                      <Navigation className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saisissez l'adresse et sélectionnez une suggestion.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end pt-2 border-t border-border mt-2">
                <Button onClick={saveConfig} disabled={isGeocoding} className="w-full md:w-auto min-w-[120px]">
                  {isGeocoding ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recherche...</>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 container py-4 flex flex-col lg:flex-row gap-4">
        <div className={`lg:flex-1 lg:min-h-[600px] ${view === 'list' ? 'hidden md:block' : ''}`}>
          <div className="h-[50vh] lg:h-full relative rounded-2xl overflow-hidden shadow-card border border-border">
            <DeliveryMap
              deliveries={deliveries}
              driverLocation={driverLocation}
              selectedDeliveryId={selectedDeliveryId}
              onSelectDelivery={setSelectedDeliveryId}
            />
            {config.workEndTime && (
              <div className="absolute top-4 right-4 bg-background/95 backdrop-blur px-3 py-2 rounded-lg shadow-lg text-xs font-medium border border-border flex flex-col items-end">
                <span className="text-muted-foreground">Fin limite</span>
                <span className="text-base font-bold text-destructive">{config.workEndTime}</span>
              </div>
            )}
             {config.endLocation && (
              <div className="absolute top-4 left-4 bg-background/95 backdrop-blur px-3 py-2 rounded-lg shadow-lg text-xs font-medium border border-border flex items-center gap-2 max-w-[200px]">
                <div className="bg-primary/10 p-1 rounded-full shrink-0"><MapPin className="w-3 h-3 text-primary" /></div>
                <span className="truncate">{config.endLocation.address}</span>
              </div>
            )}
          </div>
        </div>

        <div className={`lg:w-96 space-y-4 ${view === 'map' ? 'hidden md:block' : ''}`}>
          <DriverStatus driverLocation={driverLocation} />
          <RouteStats routeInfo={routeInfo} deliveries={deliveries} />

          {showAddForm ? (
            <div className="bg-card rounded-2xl p-4 shadow-card border border-border slide-up">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Nouvelle livraison
              </h3>
              <AddDeliveryForm
                onAdd={handleAddDelivery}
                onClose={() => setShowAddForm(false)}
                currentLocation={driverLocation}
                // Passer les props de favoris
                savedPlaces={savedPlaces}
                onSavePlace={addSavedPlace}
                onDeletePlace={removeSavedPlace}
              />
            </div>
          ) : (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full shadow-lg"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter une livraison
            </Button>
          )}

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