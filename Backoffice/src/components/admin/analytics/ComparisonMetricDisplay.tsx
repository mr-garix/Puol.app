import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '../../ui/badge';
import type { ComparisonMetric } from '../../../lib/mockDataComparison';

interface ComparisonMetricDisplayProps {
  metric: ComparisonMetric;
  label: string;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ComparisonMetricDisplay({ 
  metric, 
  label, 
  format = 'number',
  size = 'md',
  className = ''
}: ComparisonMetricDisplayProps) {
  
  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-FR', {
          style: 'decimal',
          minimumFractionDigits: 0,
        }).format(value) + ' FCFA';
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        if (value < 60) return `${value}s`;
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}min ${seconds}s`;
      default:
        return value.toLocaleString('fr-FR');
    }
  };

  const isComparing = metric.previous !== undefined;
  const hasPositiveChange = metric.change !== undefined && metric.change >= 0;
  
  const sizeClasses = {
    sm: { value: 'text-xl', label: 'text-xs', badge: 'text-xs' },
    md: { value: 'text-3xl', label: 'text-sm', badge: 'text-xs' },
    lg: { value: 'text-5xl', label: 'text-base', badge: 'text-sm' },
  };

  return (
    <div className={className}>
      <p className={`${sizeClasses[size].label} text-gray-600 mb-1`}>{label}</p>
      
      <div className="flex items-end gap-3">
        <div>
          <p className={`${sizeClasses[size].value} text-gray-900`}>
            {formatValue(metric.current)}
          </p>
          
          {/* Valeur précédente si comparaison */}
          {isComparing && metric.previous !== undefined && (
            <p className="text-sm text-gray-500 mt-1">
              vs {formatValue(metric.previous)}
            </p>
          )}
        </div>

        {/* Badge de variation */}
        {isComparing && metric.change !== undefined && (
          <Badge 
            variant={hasPositiveChange ? 'default' : 'destructive'}
            className={`${hasPositiveChange ? 'bg-green-600' : 'bg-red-600'} mb-1 ${sizeClasses[size].badge}`}
          >
            {hasPositiveChange ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1" />
            )}
            {Math.abs(metric.change).toFixed(1)}%
          </Badge>
        )}
      </div>

      {/* Différence absolue */}
      {isComparing && metric.changeAbsolute !== undefined && (
        <p className={`text-xs mt-1 ${hasPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
          {metric.changeAbsolute >= 0 ? '+' : ''}{formatValue(Math.abs(metric.changeAbsolute))}
        </p>
      )}
    </div>
  );
}
