import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, User, Phone, FileText, Plus, Search, Loader2 } from 'lucide-react';
import { Delivery } from '@/types/delivery';

interface AddDeliveryFormProps {
  onAdd: (delivery: Omit<Delivery, 'id' | 'createdAt' | 'priority'>) => void;
  onClose: () => void;
  currentLocation: { lat: number; lng: number }; // Ajout de la prop
}

interface PlacePrediction {
  place_id: string;
  description: string;
}

// Fonction pour calculer la distance (Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Number((R * c).toFixed(1));
};

const AddDeliveryForm: React.FC<AddDeliveryFormProps> = ({ onAdd, onClose, currentLocation }) => {
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initPlaces = () => {
      const googleMaps = (window as any).google?.maps;
      if (googleMaps?.places) {
        autocompleteServiceRef.current = new googleMaps.places.AutocompleteService();
        if (mapDivRef.current) {
          const dummyMap = new googleMaps.Map(mapDivRef.current);
          placesServiceRef.current = new googleMaps.places.PlacesService(dummyMap);
        }
      }
    };

    if ((window as any).google?.maps?.places) {
      initPlaces();
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

  const handleSelectSuggestion = (suggestion: PlacePrediction) => {
    setAddress(suggestion.description);
    setShowSuggestions(false);

    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        { placeId: suggestion.place_id, fields: ['geometry'] },
        (place: any, status: string) => {
          if (status === 'OK' && place?.geometry?.location) {
            setSelectedCoordinates({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          }
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !customerName) return;

    // 1. Déterminer les coordonnées finales (ou utiliser un point random proche si échec)
    const finalCoords = selectedCoordinates || {
      lat: currentLocation.lat + 0.01, 
      lng: currentLocation.lng + 0.01
    };

    // 2. Calculer la VRAIE distance entre le chauffeur et le client
    const realDistance = calculateDistance(
      currentLocation.lat, currentLocation.lng,
      finalCoords.lat, finalCoords.lng
    );

    // 3. Estimer le temps : (Distance * 4 min/km) + 5 min de stationnement/livraison
    // C'est une estimation urbaine réaliste pour Paris
    const calculatedTime = Math.round(realDistance * 4) + 5;

    onAdd({
      address,
      customerName,
      phone: phone || undefined,
      notes: notes || undefined,
      status: 'pending',
      estimatedTime: calculatedTime, // On utilise le temps calculé !
      distance: realDistance,        // On utilise la distance calculée !
      coordinates: finalCoords,
    });

    setAddress('');
    setCustomerName('');
    setPhone('');
    setNotes('');
    setSelectedCoordinates(null);
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
        <Button type="submit" className="flex-1 shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>
    </form>
  );
};

export default AddDeliveryForm;