import type { DateRange } from '../components/admin/DateRangePicker';

/**
 * Helper pour générer des données mock avec comparaison
 * Simule des variations réalistes entre deux périodes
 */

export interface ComparisonMetric {
  current: number;
  previous?: number;
  change?: number; // Pourcentage de variation
  changeAbsolute?: number; // Différence absolue
}

export interface ComparisonResult {
  isComparing: boolean;
  currentPeriodLabel: string;
  previousPeriodLabel?: string;
}

export function getComparisonInfo(dateRange: DateRange): ComparisonResult {
  const currentLabel = `${dateRange.startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${dateRange.endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  
  if (dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate) {
    const previousLabel = `${dateRange.compareStartDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${dateRange.compareEndDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    return {
      isComparing: true,
      currentPeriodLabel: currentLabel,
      previousPeriodLabel: previousLabel,
    };
  }
  
  return {
    isComparing: false,
    currentPeriodLabel: currentLabel,
  };
}

/**
 * Génère une métrique avec comparaison
 * @param current - Valeur actuelle
 * @param isComparing - Mode comparaison activé
 * @param variationPercent - Variation en % (peut être négatif)
 */
export function createComparisonMetric(
  current: number,
  isComparing: boolean,
  variationPercent: number = 0
): ComparisonMetric {
  if (!isComparing) {
    return { current };
  }

  // Calculer la valeur précédente à partir de la variation
  const previous = Math.round(current / (1 + variationPercent / 100));
  const changeAbsolute = current - previous;
  
  return {
    current,
    previous,
    change: variationPercent,
    changeAbsolute,
  };
}

type NumericKeys<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

/**
 * Génère un tableau de métriques comparatives (pour des graphiques par exemple)
 */
export function createComparisonArray<
  T extends Record<string, unknown>,
  K extends NumericKeys<T> = NumericKeys<T>
>(
  currentData: T[],
  isComparing: boolean,
  variationPercent: number = 0,
  valueKey: K = 'value' as K
): { current: T[]; previous?: T[] } {
  if (!isComparing) {
    return { current: currentData };
  }

  const previousData = currentData.map(item => {
    const currentValue = item[valueKey];
    const previousValue = Math.round(
      (currentValue as number) / (1 + variationPercent / 100)
    );
    return {
      ...item,
      [valueKey]: previousValue,
    };
  });

  return {
    current: currentData,
    previous: previousData,
  };
}

/**
 * Applique des variations réalistes aléatoires
 * Utile pour simuler des données qui varient de façon organique
 */
export function applyRandomVariation(baseValue: number, minPercent: number = -15, maxPercent: number = 15): number {
  const variation = Math.random() * (maxPercent - minPercent) + minPercent;
  return Math.round(baseValue * (1 + variation / 100));
}

/**
 * Format l'affichage d'une variation
 */
export function formatChange(change?: number): { text: string; color: string; isPositive: boolean } {
  if (change === undefined) {
    return { text: '', color: '', isPositive: true };
  }

  const isPositive = change >= 0;
  const arrow = isPositive ? '↑' : '↓';
  const text = `${arrow} ${Math.abs(change).toFixed(1)}%`;
  const color = isPositive ? 'text-green-600' : 'text-red-600';

  return { text, color, isPositive };
}

/**
 * Format l'affichage d'une différence absolue
 */
export function formatAbsoluteChange(changeAbsolute?: number): { text: string; prefix: string } {
  if (changeAbsolute === undefined) {
    return { text: '', prefix: '' };
  }

  const prefix = changeAbsolute >= 0 ? '+' : '';
  const text = `${prefix}${changeAbsolute.toLocaleString('fr-FR')}`;

  return { text, prefix };
}
