import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonBadgeProps {
  currentValue: number;
  previousValue: number;
  showPercentage?: boolean;
  showAbsolute?: boolean;
  format?: 'number' | 'currency';
}

export function ComparisonBadge({ 
  currentValue, 
  previousValue, 
  showPercentage = true,
  showAbsolute = false,
  format = 'number'
}: ComparisonBadgeProps) {
  const absoluteChange = currentValue - previousValue;
  const percentageChange = previousValue !== 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : (currentValue > 0 ? 100 : 0);
  
  const isPositive = percentageChange > 0;
  const isNeutral = percentageChange === 0;

  const formatValue = (value: number) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toFixed(1);
  };

  if (isNeutral) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Minus className="w-3 h-3" />
        {showPercentage && <span>0%</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs ${
      isPositive ? 'text-green-600' : 'text-red-600'
    }`}>
      {isPositive ? (
        <TrendingUp className="w-3.5 h-3.5" />
      ) : (
        <TrendingDown className="w-3.5 h-3.5" />
      )}
      <div className="flex items-center gap-1">
        {showPercentage && (
          <span className="font-medium">
            {isPositive ? '+' : ''}{percentageChange.toFixed(1)}%
          </span>
        )}
        {showAbsolute && (
          <span className="text-gray-600">
            ({isPositive ? '+' : ''}{formatValue(absoluteChange)})
          </span>
        )}
      </div>
    </div>
  );
}
