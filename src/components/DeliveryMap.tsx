import React, { useEffect, useRef, useState } from 'react';
import { Delivery, DriverLocation } from '@/types/delivery';
import { Loader2 } from 'lucide-react';

interface DeliveryMapProps {
  deliveries: Delivery[];
  driverLocation: DriverLocation;
  selectedDeliveryId?: string;
  onSelectDelivery: (id: string) => void;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyAcVXAMDhYIpvll0n_0FMkbBFH5hs-LDSQ';

// Type declarations for Google Maps
type GoogleMap = google.maps.Map;
type AdvancedMarkerElement = google.maps.marker.AdvancedMarkerElement;
type DirectionsRenderer = google.maps.DirectionsRenderer;

const DeliveryMap: React.FC<DeliveryMapProps> = ({
  deliveries,
  driverLocation,
  selectedDeliveryId,
  onSelectDelivery,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<Map<string, AdvancedMarkerElement>>(new Map());
  const driverMarkerRef = useRef<AdvancedMarkerElement | null>(null);
  const directionsRendererRef = useRef<DirectionsRenderer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = () => {
      if ((window as any).google?.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => initializeMap();
      script.onerror = () => {
        setMapError('Erreur de chargement de Google Maps');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  const initializeMap = () => {
    if (!mapContainer.current || !(window as any).google?.maps) return;

    try {
      const googleMaps = (window as any).google.maps;
      const map = new googleMaps.Map(mapContainer.current, {
        center: { lat: driverLocation.lat, lng: driverLocation.lng },
        zoom: 13,
        mapId: 'delivery-map',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      mapRef.current = map;

      // Initialize directions renderer
      directionsRendererRef.current = new googleMaps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#0ea5e9',
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      });

      setIsLoading(false);
    } catch (error) {
      setMapError('Erreur d\'initialisation de la carte');
      setIsLoading(false);
    }
  };

  // Update driver marker
  useEffect(() => {
    if (!mapRef.current || !(window as any).google?.maps?.marker) return;

    const googleMaps = (window as any).google.maps;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.position = { lat: driverLocation.lat, lng: driverLocation.lng };
    } else {
      const driverContent = document.createElement('div');
      driverContent.innerHTML = `
        <div class="relative">
          <div class="absolute inset-0 w-14 h-14 rounded-full bg-emerald-500/30 animate-ping"></div>
          <div class="relative w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg border-3 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
        </div>
      `;

      driverMarkerRef.current = new googleMaps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: driverLocation.lat, lng: driverLocation.lng },
        content: driverContent,
        zIndex: 1000,
      });
    }
  }, [driverLocation, isLoading]);

  // Update delivery markers
  useEffect(() => {
    if (!mapRef.current || !(window as any).google?.maps?.marker) return;

    const googleMaps = (window as any).google.maps;

    // Clear old markers
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current.clear();

    deliveries.forEach((delivery) => {
      const isSelected = selectedDeliveryId === delivery.id;
      const isInProgress = delivery.status === 'in_progress';
      const isCompleted = delivery.status === 'completed';

      const markerContent = document.createElement('div');
      markerContent.innerHTML = `
        <div class="relative cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125' : 'hover:scale-110'}">
          ${isInProgress ? '<div class="absolute inset-0 w-12 h-12 rounded-full bg-emerald-500/30 animate-ping"></div>' : ''}
          <div class="relative w-10 h-10 rounded-full ${
            isCompleted 
              ? 'bg-gray-300' 
              : isInProgress 
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30' 
                : 'bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg shadow-sky-500/30'
          } flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-md">
            ${delivery.priority}
          </div>
          ${isSelected ? `
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap">
              <div class="bg-white px-3 py-1.5 rounded-lg text-xs font-medium text-gray-800 shadow-lg border">
                ${delivery.customerName}
              </div>
            </div>
          ` : ''}
        </div>
      `;

      const marker = new googleMaps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: delivery.coordinates,
        content: markerContent,
        zIndex: isSelected ? 100 : isInProgress ? 50 : 10,
      });

      marker.addListener('click', () => {
        onSelectDelivery(delivery.id);
      });

      markersRef.current.set(delivery.id, marker);
    });
  }, [deliveries, selectedDeliveryId, isLoading]);

  // Calculate and display route
  useEffect(() => {
    if (!mapRef.current || !directionsRendererRef.current || !(window as any).google?.maps) return;

    const googleMaps = (window as any).google.maps;
    const activeDeliveries = deliveries
      .filter(d => d.status !== 'completed' && d.status !== 'cancelled')
      .sort((a, b) => a.priority - b.priority);

    if (activeDeliveries.length === 0) {
      directionsRendererRef.current.setDirections({ routes: [] } as any);
      return;
    }

    const directionsService = new googleMaps.DirectionsService();

    const origin = { lat: driverLocation.lat, lng: driverLocation.lng };
    const destination = activeDeliveries[activeDeliveries.length - 1].coordinates;
    const waypoints = activeDeliveries.slice(0, -1).map((d: Delivery) => ({
      location: d.coordinates,
      stopover: true,
    }));

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: googleMaps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result: any, status: string) => {
        if (status === 'OK' && result) {
          directionsRendererRef.current?.setDirections(result);
        }
      }
    );
  }, [deliveries, driverLocation, isLoading]);

  if (mapError) {
    return (
      <div className="relative w-full h-full bg-card rounded-2xl overflow-hidden shadow-card flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-destructive font-medium">{mapError}</p>
          <p className="text-muted-foreground text-sm mt-2">Veuillez vérifier votre clé API</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-card">
      {isLoading && (
        <div className="absolute inset-0 bg-card flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Chargement de la carte...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur rounded-xl p-3 space-y-2 shadow-card border border-border">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <span className="text-foreground">En cours</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-sky-500 to-sky-600" />
          <span className="text-foreground">En attente</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="text-muted-foreground">Terminé</span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
