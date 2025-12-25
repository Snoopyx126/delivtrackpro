import React from 'react';
import { RouteInfo, Delivery } from '@/types/delivery';
import { Clock, Navigation, Package, Route, TrendingUp } from 'lucide-react';

interface RouteStatsProps {
  routeInfo: RouteInfo;
  deliveries: Delivery[];
}

const RouteStats: React.FC<RouteStatsProps> = ({ routeInfo, deliveries }) => {
  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const inProgressCount = deliveries.filter(d => d.status === 'in_progress').length;
  const completedCount = deliveries.filter(d => d.status === 'completed').length;
  const totalCount = deliveries.filter(d => d.status !== 'cancelled').length;

  const stats = [
    {
      label: 'Temps total',
      value: `${routeInfo.totalTime}`,
      unit: 'min',
      icon: Clock,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Distance',
      value: `${routeInfo.totalDistance}`,
      unit: 'km',
      icon: Navigation,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Livraisons',
      value: `${completedCount}/${totalCount}`,
      unit: '',
      icon: Package,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="bg-card rounded-2xl p-4 space-y-4 shadow-card border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Trajet optimisé</h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-success font-medium">
          <TrendingUp className="w-3 h-3" />
          <span>Optimisé</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bgColor} rounded-xl p-3 text-center`}
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
              {stat.unit && (
                <span className="text-xs text-muted-foreground">{stat.unit}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progression</span>
          <span className="text-foreground font-medium">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full gradient-primary transition-all duration-500"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Status counts */}
      <div className="flex items-center justify-center gap-4 text-xs">
        {inProgressCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full gradient-primary" />
            <span className="text-muted-foreground">{inProgressCount} en cours</span>
          </div>
        )}
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full gradient-accent" />
            <span className="text-muted-foreground">{pendingCount} en attente</span>
          </div>
        )}
        {completedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground">{completedCount} terminé{completedCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteStats;
