import React from 'react';
import { DriverLocation } from '@/types/delivery';
import { Navigation, Gauge, Wifi } from 'lucide-react';

interface DriverStatusProps {
  driverLocation: DriverLocation;
}

const DriverStatus: React.FC<DriverStatusProps> = ({ driverLocation }) => {
  const timeSinceUpdate = Math.floor(
    (new Date().getTime() - driverLocation.lastUpdated.getTime()) / 1000
  );

  return (
    <div className="flex items-center gap-4 bg-card rounded-xl px-4 py-3 shadow-card border border-border">
      {/* Driver indicator */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-glow-primary">
          <Navigation 
            className="w-5 h-5 text-primary-foreground" 
            style={{ transform: `rotate(${driverLocation.heading || 0}deg)` }}
          />
        </div>
        <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-card pulse-dot" />
      </div>

      {/* Stats */}
      <div className="flex-1 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-foreground">
            {Math.round(driverLocation.speed || 0)} km/h
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Wifi className="w-4 h-4 text-success" />
          <span className="text-xs text-muted-foreground">
            {timeSinceUpdate < 5 ? 'En direct' : `Il y a ${timeSinceUpdate}s`}
          </span>
        </div>
      </div>

      {/* Coordinates */}
      <div className="text-right text-xs text-muted-foreground hidden sm:block">
        <div>{driverLocation.lat.toFixed(4)}°N</div>
        <div>{driverLocation.lng.toFixed(4)}°E</div>
      </div>
    </div>
  );
};

export default DriverStatus;
