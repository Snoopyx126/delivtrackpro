import { useState, useCallback, useEffect } from 'react';
import { Delivery, DriverLocation, RouteInfo } from '@/types/delivery';

// --- Fonctions Utilitaires ---

// Calcul de distance (Formule de Haversine)
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
  // --- État ---

  // Liste des livraisons
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  // Position du chauffeur (GPS réel)
  const [driverLocation, setDriverLocation] = useState<DriverLocation>({
    lat: 48.8566, // Défaut (Paris) avant signal GPS
    lng: 2.3522,
    heading: 0,
    speed: 0,
    lastUpdated: new Date(),
  });

  // Configuration (Fin de journée & Adresse retour)
  const [endLocation, setEndLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [workEndTime, setWorkEndTime] = useState<string>(""); 

  // --- Effets ---

  // 1. Activer le GPS réel
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation(prev => ({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || prev.heading,
          speed: position.coords.speed ? position.coords.speed * 3.6 : 0, // m/s vers km/h
          lastUpdated: new Date(),
        }));
      },
      (error) => console.error("Erreur GPS:", error),
      { 
        enableHighAccuracy: true, 
        timeout: 20000, 
        maximumAge: 1000 
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // --- Logique Métier ---

  // 2. Algorithme d'optimisation (Plus proche voisin)
  const optimizeRouteLogic = useCallback((currentDeliveries: Delivery[], startLocation: {lat: number, lng: number}) => {
    // Séparer les tâches actives des terminées
    let pending = currentDeliveries.filter(d => d.status !== 'completed' && d.status !== 'cancelled');
    const others = currentDeliveries.filter(d => d.status === 'completed' || d.status === 'cancelled');
    
    if (pending.length === 0) return [...others];

    const sortedPending: Delivery[] = [];
    let currentLocation = startLocation;

    // Boucle de tri
    while (pending.length > 0) {
      let nearestIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < pending.length; i++) {
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
        sortedPending.push(pending[nearestIndex]);
        // On se déplace virtuellement au point pour chercher le suivant
        currentLocation = pending[nearestIndex].coordinates;
        pending.splice(nearestIndex, 1);
      }
    }

    // Réassigner les priorités (1, 2, 3...)
    const reordered = sortedPending.map((d, i) => ({ ...d, priority: i + 1 }));

    return [...reordered, ...others];
  }, []);

  // 3. Calcul des métriques (Distance totale et temps total incluant le retour maison)
  const calculateMetrics = useCallback((currentDeliveries: Delivery[]) => {
    const activeDeliveries = currentDeliveries
      .filter(d => d.status !== 'completed' && d.status !== 'cancelled')
      .sort((a, b) => a.priority - b.priority);
    
    // Somme des distances/temps entre les points de livraison
    let totalDist = activeDeliveries.reduce((acc, curr) => acc + (curr.distance || 0), 0);
    let totalTime = activeDeliveries.reduce((acc, curr) => acc + (curr.estimatedTime || 0), 0);

    // Ajouter le trajet retour vers la "Maison" si configurée
    if (endLocation && activeDeliveries.length > 0) {
      const lastStop = activeDeliveries[activeDeliveries.length - 1];
      const distToHome = calculateDistance(
        lastStop.coordinates.lat, lastStop.coordinates.lng,
        endLocation.lat, endLocation.lng
      );
      
      // Estimation temps retour : 1km = ~3min en ville (moyenne conservatrice)
      const timeToHome = Math.ceil(distToHome * 3); 
      
      totalDist += distToHome;
      totalTime += timeToHome;
    }

    return { totalDist, totalTime };
  }, [endLocation]);

  // 4. Vérification des contraintes horaires (Pour l'alerte)
  const checkScheduleConstraint = useCallback((extraTimeMinutes: number) => {
    if (!workEndTime) return { exceeds: false, projectedEnd: null };

    const now = new Date();
    const currentMetrics = calculateMetrics(deliveries);
    
    // Temps total = Temps des courses actuelles + Temps retour maison + Nouvelle course
    const totalMinutesNeeded = currentMetrics.totalTime + extraTimeMinutes;

    const projectedEndDate = new Date(now.getTime() + totalMinutesNeeded * 60000);
    
    // Créer la date de fin de journée pour comparaison
    const [hours, minutes] = workEndTime.split(':').map(Number);
    const workEndDate = new Date();
    workEndDate.setHours(hours, minutes, 0, 0);

    // Si l'heure est passée minuit (ex: on travaille de nuit), il faut gérer le jour suivant
    // Ici version simple : on compare juste l'horaire du jour même
    
    if (projectedEndDate > workEndDate) {
      return { exceeds: true, projectedEnd: projectedEndDate };
    }
    return { exceeds: false, projectedEnd: projectedEndDate };
  }, [deliveries, workEndTime, calculateMetrics]);

  // --- Actions ---

  const addDelivery = useCallback((newDeliveryData: Omit<Delivery, 'id' | 'createdAt' | 'priority'>) => {
    // Si pas de coords GPS, on utilise la position actuelle pour éviter les bugs
    const coords = newDeliveryData.coordinates || { lat: driverLocation.lat, lng: driverLocation.lng };
    
    const newDelivery: Delivery = {
      ...newDeliveryData,
      id: Date.now().toString(),
      createdAt: new Date(),
      priority: 999, // Sera recalculé immédiatement
      coordinates: coords
    };

    setDeliveries(prev => {
      const listWithNew = [...prev, newDelivery];
      // Optimisation immédiate à l'ajout
      return optimizeRouteLogic(listWithNew, driverLocation);
    });
  }, [driverLocation, optimizeRouteLogic]);

  const updateDeliveryStatus = useCallback((id: string, status: Delivery['status']) => {
    setDeliveries(prev => prev.map(d => 
      d.id === id ? { ...d, status, completedAt: status === 'completed' ? new Date() : undefined } : d
    ));
  }, []);

  const removeDelivery = useCallback((id: string) => {
    setDeliveries(prev => {
      const filtered = prev.filter(d => d.id !== id);
      return optimizeRouteLogic(filtered, driverLocation);
    });
  }, [driverLocation, optimizeRouteLogic]);

  const optimizeRoute = useCallback(() => {
    setDeliveries(prev => optimizeRouteLogic(prev, driverLocation));
  }, [driverLocation, optimizeRouteLogic]);

  const setConfiguration = (endAddress: {lat: number, lng: number, address: string} | null, endTime: string) => {
    setEndLocation(endAddress);
    setWorkEndTime(endTime);
  };

  // --- Préparation des données de retour ---

  const metrics = calculateMetrics(deliveries);
  
  const routeInfo: RouteInfo = {
    totalDistance: Math.round(metrics.totalDist * 10) / 10,
    totalTime: Math.round(metrics.totalTime),
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
    checkScheduleConstraint, // Pour vérifier avant l'ajout
    setConfiguration,        // Pour définir Heure fin / Maison
    config: { endLocation, workEndTime }
  };
};