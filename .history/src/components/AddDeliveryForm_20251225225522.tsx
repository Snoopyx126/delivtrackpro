import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, User, Phone, FileText, Plus, Search, Loader2 } from 'lucide-react';
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

const AddDeliveryForm: React.FC<AddDeliveryFormProps> = ({ onAdd, onClose, currentLocation }) => {
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  
  // Nouveaux états pour stocker les vraies données Google
  const [realDistance, setRealDistance] = useState<number>(0);
  const [realDuration, setRealDuration] = useState<number>(0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

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
        // Initialiser le service d'itinéraires pour le calcul précis
        directionsServiceRef.current = new googleMaps.DirectionsService();
      }
    };

    if ((window as any).google?.maps) {
      initServices();
    }
  }, []);

  // Recherche Autocomplete
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

  // Fonction pour calculer l'itinéraire réel via Google
  const calculatePreciseRoute = (destLat: number, destLng: number) => {
    if (!directionsServiceRef.current) return;

    setIsCalculatingRoute(true);

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
          
          // distance.value est en mètres -> on convertit en km
          const distKm = Math.round((leg.distance.value / 1000) * 10) / 10;
          
          // duration.value est en secondes -> on convertit en minutes
          // + on ajoute 5 min de temps de livraison fixe
          const durationMin = Math.ceil(leg.duration.value / 60) + 5;

          setRealDistance(distKm);
          setRealDuration(durationMin);
          console.log(`Trajet Google : ${distKm}km, ${durationMin}min (incl. 5min pause)`);
        } else {
          // Fallback si échec (ex: pas de route trouvée)
          setRealDistance(0);
          setRealDuration(15);
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
            
            // DÉCLENCHER LE CALCUL PRÉCIS GOOGLE
            calculatePreciseRoute(lat, lng);
          }
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !customerName) return;

    // Si le calcul Google n'est pas fini ou a échoué, on met des valeurs par défaut sécurisées
    const finalCoords = selectedCoordinates || { lat: currentLocation.lat, lng: currentLocation.lng };
    const finalTime = realDuration > 0 ? realDuration : 15;
    const finalDist = realDistance > 0 ? realDistance : 0;

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

        {/* Feedback visuel du calcul Google */}
        {selectedCoordinates && (
            <div className="mt-2 text-xs flex items-center gap-2 text-primary bg-primary/10 p-2 rounded-md border border-primary/20">
                {isCalculatingRoute ? (
                    <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Calcul de l'itinéraire précis en cours...
                    </>
                ) : realDuration > 0 ? (
                    <>
                        <span className="font-semibold">Trajet Google :</span> 
                        {realDistance} km • {realDuration - 5} min trajet + 5 min pause
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
            disabled={isCalculatingRoute} // On empêche d'ajouter tant que Google calcule
        >
          <Plus className="w-4 h-4 mr-1" />
          {isCalculatingRoute ? 'Calcul...' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
};

export default AddDeliveryForm;