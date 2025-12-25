import { useState, useCallback } from 'react';
import { Delivery, DriverLocation, RouteInfo } from '@/types/delivery';

// Fonction pour calculer la distance précise en km (Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Rayon de la terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useDeliveries = () => {
  // 1. Liste vide au démarrage (plus de fausses courses)
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  // Position simulée du chauffeur (Paris par défaut, sera mis à jour par le GPS)
  const [driverLocation, setDriverLocation] = useState<DriverLocation>({
    lat: 48.8566,
    lng: 2.3522,
    heading: 0,
    speed: 0,
    lastUpdated: new Date(),
  });

  // 2. Point de retour (Chez moi/Dépôt)
  const [homeLocation, setHomeLocationState] = useState<{lat: number, lng: number} | null>(null);

  const setHomeAddress = useCallback((lat: number, lng: number) => {
    setHomeLocationState({ lat, lng });
  }, []);

  // ALGORITHME D'OPTIMISATION INTELLIGENT
  const optimizeRouteLogic = useCallback((currentDeliveries: Delivery[], startLocation: {lat: number, lng: number}) => {
    // On sépare les livraisons actives des terminées
    let pending = currentDeliveries.filter(d => d.status !== 'completed' && d.status !== 'cancelled');
    const others = currentDeliveries.filter(d => d.status === 'completed' || d.status === 'cancelled');
    
    if (pending.length === 0) return [...others];

    const sortedPending: Delivery[] = [];
    let currentLocation = startLocation;

    // Algorithme du "Plus proche voisin"
    // On boucle tant qu'il reste des livraisons à trier
    while (pending.length > 0) {
      let nearestIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < pending.length; i++) {
        // Distance entre ma dernière position connue et le point suivant
        const dist = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          pending[i].coordinates.lat, pending[i].coordinates.lng
        );
        
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      if (nearestIndex !== -1) {
        // On ajoute le plus proche à la liste triée
        const nextStop = pending[nearestIndex];
        sortedPending.push(nextStop);
        
        // Notre nouvelle position de départ devient ce point
        currentLocation = nextStop.coordinates;
        
        // On le retire de la liste des points à traiter
        pending.splice(nearestIndex, 1);
      }
    }

    // On ré-attribue les priorités (1, 2, 3...) selon le nouvel ordre
    const reorderedPending = sortedPending.map((d, index) => ({
      ...d,
      priority: index + 1
    }));

    return [...reorderedPending, ...others];
  }, []);

  // AJOUT D'UNE LIVRAISON
  const addDelivery = useCallback((newDeliveryData: Omit<Delivery, 'id' | 'createdAt' | 'priority'>) => {
    const newDelivery: Delivery = {
      ...newDeliveryData,
      id: Date.now().toString(),
      createdAt: new Date(),
      priority: 999, // Sera recalculé immédiatement
      // Si pas de coordonnées fournies, on met la position du driver par défaut pour éviter le crash
      coordinates: newDeliveryData.coordinates || { lat: driverLocation.lat, lng: driverLocation.lng },
    };

    setDeliveries(prev => {
      // 1. On ajoute la nouvelle course
      const listWithNew = [...prev, newDelivery];
      // 2. On recalcule TOUT l'itinéraire en partant du driver
      return optimizeRouteLogic(listWithNew, driverLocation);
    });
  }, [driverLocation, optimizeRouteLogic]);

  // MISE A JOUR STATUS
  const updateDeliveryStatus = useCallback((id: string, status: Delivery['status']) => {
    setDeliveries(prev => prev.map(d => 
      d.id === id ? { ...d, status, completedAt: status === 'completed' ? new Date() : undefined } : d
    ));
  }, []);

  // SUPPRESSION
  const removeDelivery = useCallback((id: string) => {
    setDeliveries(prev => {
      const filtered = prev.filter(d => d.id !== id);
      // On réoptimise après suppression pour éviter les trous dans les priorités
      return optimizeRouteLogic(filtered, driverLocation);
    });
  }, [driverLocation, optimizeRouteLogic]);

  // DECLENCHEMENT MANUEL DE L'OPTIMISATION
  const optimizeRoute = useCallback(() => {
    setDeliveries(prev => optimizeRouteLogic(prev, driverLocation));
  }, [driverLocation, optimizeRouteLogic]);

  // Simulation mouvement (optionnel)
  const simulateDriverMovement = useCallback(() => {
    setDriverLocation(prev => ({
      ...prev,
      lastUpdated: new Date(),
    }));
  }, []);

  // Calcul des stats globales
 // Calcul des stats globales
  const routeInfo: RouteInfo = {
    totalDistance: Math.round(deliveries.reduce((acc, curr) => acc + (curr.distance || 0), 0) * 10) / 10,
    totalTime: Math.round(deliveries.reduce((acc, curr) => acc + (curr.estimatedTime || 0), 0)),
    // On supprime 'progress' qui causait l'erreur
    // On ajoute 'optimizedOrder' pour respecter le type original
    optimizedOrder: deliveries.map(d => d.id)
  };

  return {
    deliveries,
    driverLocation,
    routeInfo,
    addDelivery,
    updateDeliveryStatus,
    removeDelivery,
    optimizeRoute,
    simulateDriverMovement,
    setHomeAddress, // Nouvelle fonction
    homeLocation    // Nouvel état
  };
};