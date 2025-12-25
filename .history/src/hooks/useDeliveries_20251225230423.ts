import { useState, useCallback, useEffect, useMemo } from 'react';
import { Delivery, DriverLocation, RouteInfo } from '@/types/delivery';

// Type pour les lieux favoris
export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
}

// --- Fonctions Utilitaires ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
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
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  // NOUVEAU : Lieux enregistrés
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(() => {
    // Chargement depuis le localStorage au démarrage
    const saved = localStorage.getItem('delivtrack_saved_places');
    return saved ? JSON.parse(saved) : [];
  });

  const [driverLocation, setDriverLocation] = useState<DriverLocation>({
    lat: 48.8566,
    lng: 2.3522,
    heading: 0,
    speed: 0,
    lastUpdated: new Date(),
  });

  const [endLocation, setEndLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [workEndTime, setWorkEndTime] = useState<string>(""); 

  // --- Effet : Sauvegarde auto des favoris ---
  useEffect(() => {
    localStorage.setItem('delivtrack_saved_places', JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  // --- Effets : GPS ---
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation(prev => ({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || prev.heading,
          speed: position.coords.speed ? position.coords.speed * 3.6 : 0,
          lastUpdated: new Date(),
        }));
      },
      (error) => console.error("Erreur GPS:", error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // --- Logique Métier ---
  const optimizeRouteLogic = useCallback((currentDeliveries: Delivery[], startLocation: {lat: number, lng: number}) => {
    let pending = currentDeliveries.filter(d => d.status !== 'completed' && d.status !== 'cancelled');
    const others = currentDeliveries.filter(d => d.status === 'completed' || d.status === 'cancelled');
    
    if (pending.length === 0) return [...others];

    const sortedPending: Delivery[] = [];
    let currentLocation = startLocation;

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
        currentLocation = pending[nearestIndex].coordinates;
        pending.splice(nearestIndex, 1);
      }
    }

    const reordered = sortedPending.map((d, i) => ({ ...d, priority: i + 1 }));
    return [...reordered, ...others];
  }, []);

  const calculateMetrics = useCallback((currentDeliveries: Delivery[]) => {
    const activeDeliveries = currentDeliveries
      .filter(d => d.status !== 'completed' && d.status !== 'cancelled')
      .sort((a, b) => a.priority - b.priority);
    
    let totalDist = activeDeliveries.reduce((acc, curr) => acc + (curr.distance || 0), 0);
    let totalTime = activeDeliveries.reduce((acc, curr) => acc + (curr.estimatedTime || 0), 0);

    if (endLocation && activeDeliveries.length > 0) {
      const lastStop = activeDeliveries[activeDeliveries.length - 1];
      const distToHome = calculateDistance(
        lastStop.coordinates.lat, lastStop.coordinates.lng,
        endLocation.lat, endLocation.lng
      );
      const timeToHome = Math.ceil(distToHome * 3); 
      totalDist += distToHome;
      totalTime += timeToHome;
    }

    return { totalDist, totalTime };
  }, [endLocation]);

  const checkScheduleConstraint = useCallback((extraTimeMinutes: number) => {
    if (!workEndTime) return { exceeds: false, projectedEnd: null };

    const now = new Date();
    const currentMetrics = calculateMetrics(deliveries);
    const totalMinutesNeeded = currentMetrics.totalTime + extraTimeMinutes;
    const projectedEndDate = new Date(now.getTime() + totalMinutesNeeded * 60000);
    
    const [hours, minutes] = workEndTime.split(':').map(Number);
    const workEndDate = new Date();
    workEndDate.setHours(hours, minutes, 0, 0);

    if (projectedEndDate > workEndDate) {
      return { exceeds: true, projectedEnd: projectedEndDate };
    }
    return { exceeds: false, projectedEnd: projectedEndDate };
  }, [deliveries, workEndTime, calculateMetrics]);

  // --- Actions ---

  // Gestion des lieux favoris
  const addSavedPlace = useCallback((name: string, address: string, coordinates: {lat: number, lng: number}) => {
    const newPlace: SavedPlace = {
      id: Date.now().toString(),
      name,
      address,
      coordinates
    };
    setSavedPlaces(prev => [...prev, newPlace]);
  }, []);

  const removeSavedPlace = useCallback((id: string) => {
    setSavedPlaces(prev => prev.filter(p => p.id !== id));
  }, []);

  const addDelivery = useCallback((newDeliveryData: Omit<Delivery, 'id' | 'createdAt' | 'priority'>) => {
    const coords = newDeliveryData.coordinates || { lat: driverLocation.lat, lng: driverLocation.lng };
    const newDelivery: Delivery = {
      ...newDeliveryData,
      id: Date.now().toString(),
      createdAt: new Date(),
      priority: 999,
      coordinates: coords
    };

    setDeliveries(prev => {
      const listWithNew = [...prev, newDelivery];
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

  const setConfiguration = useCallback((endAddress: {lat: number, lng: number, address: string} | null, endTime: string) => {
    setEndLocation(endAddress);
    setWorkEndTime(endTime);
  }, []);

  const metrics = calculateMetrics(deliveries);
  
  const routeInfo: RouteInfo = {
    totalDistance: Math.round(metrics.totalDist * 10) / 10,
    totalTime: Math.round(metrics.totalTime),
    optimizedOrder: deliveries.map(d => d.id)
  };

  const config = useMemo(() => ({ endLocation, workEndTime }), [endLocation, workEndTime]);

  return {
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
    // Exports pour les favoris
    savedPlaces,
    addSavedPlace,
    removeSavedPlace
  };
};