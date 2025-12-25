import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, User, Phone, FileText, Plus, Search, Loader2, Star, Trash2, Navigation, Clock, Map } from 'lucide-react';
import { Delivery } from '@/types/delivery';
import { SavedPlace } from '@/hooks/useDeliveries';

interface AddDeliveryFormProps {
  onAdd: (delivery: Omit<Delivery, 'id' | 'createdAt' | 'priority'>) => void;
  onClose: () => void;
  currentLocation: { lat: number; lng: number };
  savedPlaces: SavedPlace[];
  onSavePlace: (name: string, address: string, coordinates: {lat: number, lng: number}) => void;
  onDeletePlace: (id: string) => void;
}

interface PlacePrediction {
  place_id: string;
  description: string;
}

const AddDeliveryForm: React.FC<AddDeliveryFormProps> = ({ 
  onAdd, 
  onClose, 
  currentLocation,
  savedPlaces,
  onSavePlace,
  onDeletePlace
}) => {
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  // Sauvegarde Favoris
  const [isSavingPlace, setIsSavingPlace] = useState(false);
  const [placeName, setPlaceName] = useState('');
  
  // Suggestions & Calculs
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number>(0);
  const [calculatedDuration, setCalculatedDuration] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Refs Google
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initServices = () => {
      const googleMaps = (window as any).google?.maps;
      if (googleMaps) {
        if (!autocompleteServiceRef.current && googleMaps.places) {
          autocompleteServiceRef.current = new googleMaps.places.AutocompleteService();
          if (mapDivRef.current) {
            const dummyMap = new googleMaps.Map(mapDivRef.current, { center: {lat:0, lng:0}, zoom: 1 });
            placesServiceRef.current = new googleMaps.places.PlacesService(dummyMap);
          }
        }
        if (!directionsServiceRef.current) {
          directionsServiceRef.current = new googleMaps.DirectionsService();
        }
      }
    };

    if ((window as any).google?.maps) {
      initServices();
    } else {
        const interval = setInterval(() => {
            if ((window as any).google?.maps) {
                initServices();
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }
  }, []);

  // Autocomplete
  useEffect(() => {
    if (address.length >= 3 && autocompleteServiceRef.current && !selectedCoordinates) {
      setIsSearching(true);
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: address,
          componentRestrictions: { country: 'fr' },
          types: ['address'],
        },
        (predictions: PlacePrediction[] | null, status: string) => {
          setIsSearching(false);
          if (status === 'OK' && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
        }
      );
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [address, selectedCoordinates]);

  // --- Calcul Itinéraire Google ---
  const performRouteCalculation = (destLat: number, destLng: number) => {
    if (!directionsServiceRef.current) return;

    setIsCalculating(true);
    const origin = new (window as any).google.maps.LatLng(currentLocation.lat, currentLocation.lng);
    const destination = new (window as any).google.maps.LatLng(destLat, destLng);

    directionsServiceRef.current.route(
        {
            origin: origin,
            destination: destination,
            travelMode: (window as any).google.maps.TravelMode.DRIVING,
            drivingOptions: { departureTime: new Date(), trafficModel: 'bestguess' }
        },
        (result: any, status: string) => {
            setIsCalculating(false);
            if (status === 'OK' && result.routes[0] && result.routes[0].legs[0]) {
                const leg = result.routes[0].legs[0];
                const distKm = Math.round((leg.distance.value / 1000) * 10) / 10;
                const durationInTraffic = leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value;
                const timeMin = Math.ceil(durationInTraffic / 60) + 5; // +5 min pause

                setCalculatedDistance(distKm);
                setCalculatedDuration(timeMin);
            }
        }
    );
  };

  const handleSelectSuggestion = (suggestion: PlacePrediction) => {
    setAddress(suggestion.description);
    setShowSuggestions(false);

    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        { placeId: suggestion.place_id, fields: ['geometry'] },
        (place: any, status: string) => {
          if (status === 'OK' && place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setSelectedCoordinates({ lat, lng });
            performRouteCalculation(lat, lng);
          }
        }
      );
    }
  };

  // --- FIX FAVORIS ---
  const handleSelectFavorite = (place: SavedPlace) => {
    // 1. Remplir les champs
    setAddress(place.address);
    setPlaceName(place.name); 
    // 2. Fixer les coordonnées
    setSelectedCoordinates(place.coordinates);
    // 3. Forcer le nom du client si vide (optionnel, pour aller plus vite)
    if (!customerName) setCustomerName(place.name);
    // 4. Lancer le calcul
    performRouteCalculation(place.coordinates.lat, place.coordinates.lng);
  };

  const handleSavePlaceToggle = () => {
    if (isSavingPlace) {
        if (placeName && selectedCoordinates) {
            onSavePlace(placeName, address, selectedCoordinates);
            setIsSavingPlace(false);
            // Feedback haptique (vibration) sur mobile
            if (navigator.vibrate) navigator.vibrate(50);
        }
    } else {
        setIsSavingPlace(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !customerName) return;

    const finalCoords = selectedCoordinates || { lat: currentLocation.lat, lng: currentLocation.lng };
    const finalDist = calculatedDistance > 0 ? calculatedDistance : 0;
    const finalTime = calculatedDuration > 0 ? calculatedDuration : 15;

    onAdd({
      address,
      customerName,
      phone: phone || undefined,
      notes: notes || undefined,
      status: 'pending',
      estimatedTime: finalTime,
      distance: finalDist,
      coordinates: finalCoords,
    });

    if (navigator.vibrate) navigator.vibrate([50, 50, 50]); // Feedback succès
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div ref={mapDivRef} style={{ display: 'none' }} />

      {/* SECTION FAVORIS (AMÉLIORÉE) */}
      {savedPlaces.length > 0 && (
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vos lieux favoris</label>
          <div className="grid grid-cols-2 gap-2">
              {savedPlaces.map(place => (
                  <div 
                    key={place.id} 
                    onClick={() => handleSelectFavorite(place)}
                    className="relative group cursor-pointer bg-secondary/30 hover:bg-primary/10 border border-transparent hover:border-primary/30 p-2 rounded-lg transition-all flex items-center gap-2"
                  >
                      <div className="bg-background p-1.5 rounded-md shadow-sm">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      </div>
                      <span className="text-sm font-medium truncate flex-1">{place.name}</span>
                      
                      <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeletePlace(place.id); }}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                          <Trash2 className="w-3 h-3" />
                      </button>
                  </div>
              ))}
          </div>
        </div>
      )}

      {/* ADRESSE */}
      <div className="relative">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            Adresse *
        </label>
        
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Input
                    ref={addressInputRef}
                    value={address}
                    onChange={(e) => {
                        setAddress(e.target.value);
                        setSelectedCoordinates(null);
                        setCalculatedDistance(0);
                    }}
                    placeholder="Rechercher une adresse..."
                    className="pr-10"
                    required
                    autoComplete="off"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
            </div>
            
            <Button 
                type="button" 
                variant={isSavingPlace ? "default" : "outline"}
                size="icon"
                onClick={handleSavePlaceToggle}
                className={isSavingPlace ? "bg-amber-400 hover:bg-amber-500 text-white border-amber-400" : ""}
                title="Enregistrer en favori"
                disabled={!selectedCoordinates}
            >
                <Star className={`w-4 h-4 ${isSavingPlace ? 'fill-current' : ''}`} />
            </Button>
        </div>

        {isSavingPlace && (
            <div className="mt-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg animate-in slide-in-from-top-2">
                <div className="flex gap-2">
                  <Input 
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      placeholder="Nom du lieu (ex: Entrepot)"
                      className="bg-white"
                      autoFocus
                  />
                  <Button type="button" size="sm" onClick={handleSavePlaceToggle}>OK</Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 ml-1">Donnez un nom court pour le retrouver facilement.</p>
            </div>
        )}
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card rounded-lg overflow-hidden shadow-xl border border-border max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                className="w-full px-4 py-3 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2 border-b border-border/50 last:border-0"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate">{suggestion.description}</span>
              </button>
            ))}
          </div>
        )}

        {(isCalculating || calculatedDistance > 0) && (
            <div className="mt-3 p-3 rounded-lg border bg-primary/5 border-primary/20 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                {isCalculating ? (
                    <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Calcul optimisé...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 text-sm font-medium text-foreground w-full">
                        <div className="flex items-center gap-1.5">
                            <Navigation className="w-4 h-4 text-primary" />
                            {calculatedDistance} km
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-primary" />
                            {calculatedDuration} min
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <User className="w-4 h-4 text-accent" />
            Client *
          </label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nom"
            required
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            Tél
          </label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06..."
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Notes
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Digicode, étage, instructions..."
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Annuler
        </Button>
        <Button 
            type="submit" 
            className="flex-1 shadow-md hover:shadow-lg transition-all"
            disabled={isCalculating} 
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>
    </form>
  );
};

export default AddDeliveryForm;