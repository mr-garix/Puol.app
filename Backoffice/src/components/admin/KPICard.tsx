import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import type { DateRange } from './DateRangePicker';
import { ComparisonBadge } from './ComparisonBadge';

interface KPICardProps {
  title: string;
  value: string;
  icon: ReactNode;
  color: string;
  definition: string;
  onClick?: () => void;
  isLoading?: boolean;
  dateRange?: DateRange;
  currentValue?: number;
  previousValue?: number;
  secondaryLabel?: string;
  secondaryValue?: string;
}

export function KPICard({ 
  title, 
  value, 
  icon, 
  color, 
  definition,
  onClick,
  isLoading = false,
  dateRange,
  currentValue,
  previousValue,
  secondaryLabel,
  secondaryValue,
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">{title}</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{definition}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <p className="text-2xl md:text-3xl text-gray-900 whitespace-nowrap">{value}</p>
                  
                  {/* Comparaison principale - toujours visible */}
                  {currentValue && previousValue && (
                    <ComparisonBadge 
                      currentValue={currentValue} 
                      previousValue={previousValue}
                      showPercentage={true}
                    />
                  )}
                </div>

                {secondaryValue && (
                  <div className="px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-[10px] md:text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                    <span>{secondaryLabel ?? 'Note moyenne'}</span>
                    <span className="text-xs md:text-sm font-semibold">{secondaryValue}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Période de comparaison - affichage détaillé */}
            {dateRange?.compareEnabled && currentValue && previousValue && dateRange.compareStartDate && dateRange.compareEndDate && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>vs</span>
                  <span className="font-medium text-gray-700">
                    {dateRange.compareStartDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {' - '}
                    {dateRange.compareEndDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-gray-500">Valeur précédente :</span>
                  <span className="font-medium text-gray-700">
                    {previousValue.toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color} bg-opacity-10 flex-shrink-0`}>
            <div className={`${color.replace('bg-', 'text-')}`}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}