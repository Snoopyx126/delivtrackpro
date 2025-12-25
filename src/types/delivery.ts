export interface Delivery {
  id: string;
  address: string;
  customerName: string;
  phone?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  estimatedTime?: number; // in minutes
  distance?: number; // in km
  priority: number;
  notes?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  completedAt?: Date;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  lastUpdated: Date;
}

export interface RouteInfo {
  totalDistance: number; // in km
  totalTime: number; // in minutes
  optimizedOrder: string[]; // delivery ids in optimized order
}
