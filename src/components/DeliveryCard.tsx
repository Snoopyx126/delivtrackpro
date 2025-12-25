import React from 'react';
import { Delivery } from '@/types/delivery';
import { MapPin, Phone, Clock, Navigation, CheckCircle, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeliveryCardProps {
  delivery: Delivery;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateStatus: (status: Delivery['status']) => void;
  onRemove: () => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  isSelected,
  onSelect,
  onUpdateStatus,
  onRemove,
}) => {
  const getStatusBadge = () => {
    switch (delivery.status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold gradient-primary text-primary-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
            En cours
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent">
            En attente
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/15 text-success">
            <CheckCircle className="w-3 h-3" />
            Livré
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive">
            Annulé
          </span>
        );
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer
        ${isSelected 
          ? 'bg-card border-2 border-primary/50 shadow-glow-primary scale-[1.02]' 
          : 'bg-card hover:bg-secondary/50 border border-border shadow-soft'
        }
        ${delivery.status === 'completed' || delivery.status === 'cancelled' ? 'opacity-60' : ''}
      `}
      onClick={onSelect}
    >
      {/* Priority indicator */}
      <div className={`
        absolute top-0 left-0 w-1 h-full
        ${delivery.status === 'in_progress' ? 'gradient-primary' : 'gradient-accent'}
      `} />

      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm
              ${delivery.status === 'in_progress' 
                ? 'gradient-primary text-primary-foreground shadow-glow-primary' 
                : 'bg-secondary text-foreground'
              }
            `}>
              {delivery.priority}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{delivery.customerName}</h3>
              {getStatusBadge()}
            </div>
          </div>
          
          {delivery.status !== 'completed' && delivery.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">{delivery.address}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3">
          {delivery.estimatedTime && (
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-foreground font-medium">{delivery.estimatedTime} min</span>
            </div>
          )}
          {delivery.distance && (
            <div className="flex items-center gap-1.5 text-sm">
              <Navigation className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">{delivery.distance} km</span>
            </div>
          )}
          {delivery.phone && (
            <a
              href={`tel:${delivery.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Appeler</span>
            </a>
          )}
        </div>

        {/* Actions */}
        {isSelected && delivery.status !== 'completed' && delivery.status !== 'cancelled' && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-border slide-up">
            {delivery.status === 'pending' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus('in_progress');
                }}
              >
                <Navigation className="w-4 h-4 mr-1" />
                Démarrer
              </Button>
            )}
            {delivery.status === 'in_progress' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus('completed');
                }}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Livré
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(delivery.address)}`,
                  '_blank'
                );
              }}
            >
              <ChevronRight className="w-4 h-4" />
              GPS
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryCard;
