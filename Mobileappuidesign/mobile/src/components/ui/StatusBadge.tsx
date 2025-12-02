import React from 'react';
import { Badge } from './Badge';
import { getStatusColor } from '@/src/utils/helpers';

interface StatusBadgeProps {
  status: string;
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children }) => {
  const colors = getStatusColor(status);
  const displayText = children || status;

  // Déterminer la variante Badge en fonction du statut
  const getVariant = (): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'verified':
      case 'approved':
        return 'success';
      case 'pending':
      case 'waiting':
        return 'warning';
      case 'cancelled':
      case 'rejected':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  // Déterminer l'icône en fonction du statut
  const getIcon =(): keyof typeof import('@expo/vector-icons/Feather').default.glyphMap | undefined => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'verified':
      case 'approved':
        return 'check-circle';
      case 'pending':
      case 'waiting':
        return 'clock';
      case 'cancelled':
      case 'rejected':
      case 'error':
        return 'x-circle';
      default:
        return undefined;
    }
  };

  return (
    <Badge variant={getVariant()} icon={getIcon()}>
      {displayText}
    </Badge>
  );
};
