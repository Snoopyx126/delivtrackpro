import { useState, useCallback } from 'react';
import { Delivery, DriverLocation, RouteInfo } from '@/types/delivery';

// Paris area coordinates for demo
const PARIS_CENTER = { lat: 48.8566, lng: 2.3522 };

const generateRandomCoordinate = (center: { lat: number; lng: number }, radiusKm: number = 5) => {
  const radiusInDegrees = radiusKm / 111; // approximate conversion
  const randomAngle = Math.random() * 2 * Math.PI;
  const randomRadius = Math.sqrt(Math.random()) * radiusInDegrees;
  
  return {
    lat: center.lat + randomRadius * Math.cos(randomAngle),
    lng: center.lng + randomRadius * Math.sin(randomAngle),
  };
};

const initialDeliveries: Delivery[] = [
  {
    id: '1',
    address: '15 Rue de Rivoli, 75001 Paris',
    customerName: 'Marie Dupont',
    phone: '+33 6 12 34 56 78',
    status: 'in_progress',
    estimatedTime: 8,
    distance: 2.3,
    priority: 1,
    coordinates: { lat: 48.8606, lng: 2.3376 },
    createdAt: new Date(),
  },
  {
    id: '2',
    address: '42 Avenue des Champs-Élysées, 75008 Paris',
    customerName: 'Jean Martin',
    phone: '+33 6 98 76 54 32',
    status: 'pending',
    estimatedTime: 15,
    distance: 3.8,
    priority: 2,
    coordinates: { lat: 48.8698, lng: 2.3075 },
    createdAt: new Date(),
  },
  {
    id: '3',
    address: '8 Boulevard Saint-Germain, 75005 Paris',
    customerName: 'Sophie Bernard',
    status: 'pending',
    estimatedTime: 22,
    distance: 4.5,
    priority: 3,
    coordinates: { lat: 48.8530, lng: 2.3499 },
    createdAt: new Date(),
  },
];

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [driverLocation, setDriverLocation] = useState<DriverLocation>({
    lat: 48.8584,
    lng: 2.3440,
    heading: 45,
    speed: 25,
    lastUpdated: new Date(),
  });
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({
    totalDistance: 10.6,
    totalTime: 45,
    optimizedOrder: ['1', '2', '3'],
  });

  const addDelivery = useCallback((delivery: Omit<Delivery, 'id' | 'createdAt' | 'priority'>) => {
    const newDelivery: Delivery = {
      ...delivery,
      id: Date.now().toString(),
      createdAt: new Date(),
      priority: deliveries.length + 1,
      coordinates: delivery.coordinates || generateRandomCoordinate(PARIS_CENTER),
    };
    
    setDeliveries(prev => {
      const updated = [...prev, newDelivery];
      // Recalculate route (simplified optimization)
      optimizeRoute(updated);
      return updated;
    });
  }, [deliveries.length]);

  const updateDeliveryStatus = useCallback((id: string, status: Delivery['status']) => {
    setDeliveries(prev => 
      prev.map(d => 
        d.id === id 
          ? { ...d, status, completedAt: status === 'completed' ? new Date() : undefined }
          : d
      )
    );
  }, []);

  const removeDelivery = useCallback((id: string) => {
    setDeliveries(prev => {
      const updated = prev.filter(d => d.id !== id);
      optimizeRoute(updated);
      return updated;
    });
  }, []);

  const optimizeRoute = useCallback((currentDeliveries: Delivery[]) => {
    // Simplified route optimization (in production, use Google Directions API)
    const pending = currentDeliveries.filter(d => d.status !== 'completed' && d.status !== 'cancelled');
    
    // Sort by distance from driver (simplified)
    const sorted = [...pending].sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.coordinates.lat - driverLocation.lat, 2) +
        Math.pow(a.coordinates.lng - driverLocation.lng, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.coordinates.lat - driverLocation.lat, 2) +
        Math.pow(b.coordinates.lng - driverLocation.lng, 2)
      );
      return distA - distB;
    });

    const totalDistance = sorted.reduce((acc, d) => acc + (d.distance || 0), 0);
    const totalTime = sorted.reduce((acc, d) => acc + (d.estimatedTime || 0), 0);

    setRouteInfo({
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalTime,
      optimizedOrder: sorted.map(d => d.id),
    });

    // Update priorities
    setDeliveries(prev => 
      prev.map(d => {
        const newPriority = sorted.findIndex(s => s.id === d.id) + 1;
        return newPriority > 0 ? { ...d, priority: newPriority } : d;
      })
    );
  }, [driverLocation]);

  // Simulate driver movement
  const simulateDriverMovement = useCallback(() => {
    setDriverLocation(prev => ({
      ...prev,
      lat: prev.lat + (Math.random() - 0.5) * 0.001,
      lng: prev.lng + (Math.random() - 0.5) * 0.001,
      heading: Math.random() * 360,
      speed: 15 + Math.random() * 20,
      lastUpdated: new Date(),
    }));
  }, []);

  return {
    deliveries,
    driverLocation,
    routeInfo,
    addDelivery,
    updateDeliveryStatus,
    removeDelivery,
    optimizeRoute: () => optimizeRoute(deliveries),
    simulateDriverMovement,
  };
};
