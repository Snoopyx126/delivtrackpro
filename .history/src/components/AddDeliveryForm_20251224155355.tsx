import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, User, Phone, FileText, Plus, Search, Loader2 } from 'lucide-react';
import { Delivery } from '@/types/delivery';

interface AddDeliveryFormProps {
  onAdd: (delivery: Omit<Delivery, 'id' | 'createdAt' | 'priority'>) => void;
  onClose: () => void;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyAcVXAMDhYIpvll0n_0FMkbBFH5hs-LDSQ';

interface PlacePrediction {
  place_id: string;
  description: string;
}

const AddDeliveryForm: React.FC<AddDeliveryFormProps> = ({ onAdd, onClose }) => {
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

  // Initialize Places services
  useEffect(() => {
    const initPlaces = () => {
      const googleMaps = (window as any).google?.maps;
      if (googleMaps?.places) {
        autocompleteServiceRef.current = new googleMaps.places.AutocompleteService();
        // Create a dummy map for PlacesService
        if (mapDivRef.current) {
          const dummyMap = new googleMaps.Map(mapDivRef.current);
          placesServiceRef.current = new googleMaps.places.PlacesService(dummyMap);
        }
      }
    };

    if ((window as any).google?.maps?.places) {
      initPlaces();
    } else {
      // Wait for Google Maps to load
      const checkInterval = setInterval(() => {
        if ((window as any).google?.maps?.places) {
          initPlaces();
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, []);

  // Handle address autocomplete
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

    // Get place details for coordinates
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

    onAdd({
      address,
      customerName,
      phone: phone || undefined,
      notes: notes || undefined,
      status: 'pending',
      estimatedTime: Math.floor(Math.random() * 20) + 10,
      distance: Math.round((Math.random() * 5 + 1) * 10) / 10,
      coordinates: selectedCoordinates || {
        lat: 48.8566 + (Math.random() - 0.5) * 0.05,
        lng: 2.3522 + (Math.random() - 0.5) * 0.05,
      },
    });

    // Reset form
    setAddress('');
    setCustomerName('');
    setPhone('');
    setNotes('');
    setSelectedCoordinates(null);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Hidden div for PlacesService */}
      <div ref={mapDivRef} style={{ display: 'none' }} />

      {/* Address with autocomplete */}
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
            placeholder="Commencez à taper l'adresse..."
            className="pr-10"
            required
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
        
        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card rounded-lg overflow-hidden shadow-card border border-border">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                className="w-full px-4 py-3 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{suggestion.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer name */}
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

      {/* Phone */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          Téléphone (optionnel)
        </label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+33 6 12 34 56 78"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Notes (optionnel)
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instructions de livraison, code d'entrée..."
          rows={2}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1">
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>
    </form>
  );
};

export default AddDeliveryForm;
