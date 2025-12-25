import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, User, Phone, FileText, Plus, Search, Loader2, AlertTriangle } from 'lucide-react';
import { Delivery } from '@/types/delivery';

interface AddDeliveryFormProps {
  onAdd: (delivery: Omit<Delivery, 'id' | 'createdAt' | 'priority'>) => void;
  onClose: () => void;
  currentLocation: { lat: number; lng: number };
}

interface PlacePrediction {
  place_id: string;
  description: string;
}

// Fonction de secours (Mathématique) si Google échoue
const calculateFallbackMetrics = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  const distKm = Number((R * c).toFixed(1));
  
  // Estimation réaliste de secours :
  // On compte environ 2 minutes par kilomètre (30km/h de moyenne) + 10 min de forfait (parking/livraison)
  // Pour 40km, ça donnera : (40 * 2) + 10 = 90 minutes (cohérent)
  const durationMin = Math.round(distKm * 2) + 10;

  return { distKm, durationMin };
};

const AddDeliveryForm: React.FC<AddDeliveryFormProps> = ({ onAdd, onClose, currentLocation }) => {
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  
  // États pour les métriques
  const [realDistance, setRealDistance] = useState<number>(0);
  const [realDuration, setRealDuration] = useState<number>(0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [calculationSource, setCalculationSource] = useState<'google' | 'fallback' | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initServices = () => {
      const googleMaps = (window as any).google?.maps;
      if (googleMaps) {
        if (googleMaps.places) {
          autocompleteServiceRef.current = new googleMaps.places.AutocompleteService();
          if (mapDivRef.current) {
            const dummyMap = new googleMaps.Map(mapDivRef.current);
            placesServiceRef.current = new googleMaps.places.PlacesService(dummyMap);
          }
        }
        directionsServiceRef.current = new googleMaps.DirectionsService();
      }
    };

    if ((window as any).google?.maps) {
      initServices();
    }
  }, []);

  useEffect(() => {
    if (address.length >= 3 && autocompleteServiceRef.current) {
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
  }, [address]);

  // Fonction de calcul intelligente
  const calculateRoute = (destLat: number, destLng: number) => {
    setIsCalculatingRoute(true);
    setCalculationSource(null);

    // 1. Essai avec Google API
    if (directionsServiceRef.current) {
        const origin = new (window as any).google.maps.LatLng(currentLocation.lat, currentLocation.lng);
        const destination = new (window as any).google.maps.LatLng(destLat, destLng);

        directionsServiceRef.current.route(
        {
            origin: origin,
            destination: destination,
            travelMode: (window as any).google.maps.TravelMode.DRIVING,
        },
        (result: any, status: string) => {
            setIsCalculatingRoute(false);
            
            if (status === 'OK' && result.routes[0] && result.routes[0].legs[0]) {
                const leg = result.routes[0].legs[0];
                const dist = Math.round((leg.distance.value / 1000) * 10) / 10;
                // Temps Google + 5 min de pause livraison
                const time = Math.ceil(leg.duration.value / 60) + 5;
                
                setRealDistance(dist);
                setRealDuration(time);
                setCalculationSource('google');
            } else {
                console.warn("Google Route échoué, utilisation du fallback mathématique");
                useFallbackCalculation(destLat, destLng);
            }
        }
        );
    } else {
        // Pas de service Google, fallback direct
        useFallbackCalculation(destLat, destLng);
        setIsCalculatingRoute(false);
    }
  };

  const useFallbackCalculation = (destLat: number, destLng: number) => {
    const { distKm, durationMin } = calculateFallbackMetrics(
        currentLocation.lat, currentLocation.lng,
        destLat, destLng
    );
    setRealDistance(distKm);
    setRealDuration(durationMin);
    setCalculationSource('fallback');
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
            calculateRoute(lat, lng);
          }
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !customerName) return;

    // Utilisation des valeurs calculées ou fallback de sécurité ultime
    const finalCoords = selectedCoordinates || { lat: currentLocation.lat, lng: currentLocation.lng };
    
    // Si jamais le calcul n'a pas été fait (ex: saisie manuelle sans clic), on force un calcul fallback
    let finalDist = realDistance;
    let finalTime = realDuration;
    
    if (finalDist === 0 || finalTime === 0) {
        const fallback = calculateFallbackMetrics(
            currentLocation.lat, currentLocation.lng,
            finalCoords.lat, finalCoords.lng
        );
        finalDist = fallback.distKm;
        finalTime = fallback.durationMin;
    }

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

    setAddress('');
    setCustomerName('');
    setPhone('');
    setNotes('');
    setSelectedCoordinates(null);
    setRealDistance(0);
    setRealDuration(0);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div ref={mapDivRef} style={{ display: 'none' }} />

      <div className="relative">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          Adresse de livraison *
        </label>
        <div className="relative">
          <Input
            ref={addressInputRef}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Tapez l'adresse..."
            className="pr-10"
            required
            autoComplete="off"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
        
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

        {/* INFO TRAJET */}
        {selectedCoordinates && (
            <div className={`mt-2 text-xs flex items-center gap-2 p-2 rounded-md border ${
                calculationSource === 'fallback' 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700' 
                : 'bg-primary/10 border-primary/20 text-primary'
            }`}>
                {isCalculatingRoute ? (
                    <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Calcul de l'itinéraire...
                    </>
                ) : realDistance > 0 ? (
                    <>
                        {calculationSource === 'fallback' && <AlertTriangle className="w-3 h-3" />}
                        <span className="font-semibold">
                            {calculationSource === 'google' ? 'Google Maps :' : 'Estimation :'}
                        </span> 
                        {realDistance} km • {realDuration} min
                    </>
                ) : null}
            </div>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <User className="w-4 h-4 text-accent" />
          Nom du client *
        </label>
        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Ex: Marie Dupont"
          required
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          Téléphone
        </label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+33 6..."
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Notes
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Code porte, étage..."
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
            disabled={isCalculatingRoute} 
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>
    </form>
  );
};

export default AddDeliveryForm;