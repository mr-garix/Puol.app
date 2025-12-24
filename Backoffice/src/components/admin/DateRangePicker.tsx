import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

export type DateRangePreset = 'today' | 'yesterday' | '7days' | '28days' | '30days' | 'thisMonth' | 'lastMonth' | '90days' | 'custom';

export type ComparisonType = 'previousPeriod' | 'previousYear' | 'sameDayLastWeek' | 'custom' | 'none';

export interface DateRange {
  preset: DateRangePreset;
  label: string;
  startDate: Date;
  endDate: Date;
  compareEnabled?: boolean;
  comparisonType?: ComparisonType;
  compareStartDate?: Date;
  compareEndDate?: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(value.preset);
  const [customStart, setCustomStart] = useState<Date | undefined>(value.startDate);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(value.endDate);
  const [compareEnabled, setCompareEnabled] = useState(value.compareEnabled || false);
  const [comparisonType, setComparisonType] = useState<ComparisonType>(value.comparisonType || 'sameDayLastWeek');
  const [customCompareStart, setCustomCompareStart] = useState<Date | undefined>(value.compareStartDate);
  const [customCompareEnd, setCustomCompareEnd] = useState<Date | undefined>(value.compareEndDate);
  const comparisonOptions = [
    { type: 'sameDayLastWeek' as ComparisonType, label: 'Période précédente (même jour)' },
    { type: 'previousPeriod' as ComparisonType, label: 'Période précédente' },
    { type: 'previousYear' as ComparisonType, label: 'Année précédente' },
    { type: 'custom' as ComparisonType, label: 'Personnalisée' },
  ];

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('puol_admin_date_range');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        onChange({
          ...parsed,
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate),
          compareStartDate: parsed.compareStartDate ? new Date(parsed.compareStartDate) : undefined,
          compareEndDate: parsed.compareEndDate ? new Date(parsed.compareEndDate) : undefined,
        });
      } catch (e) {
        console.error('Failed to parse saved date range');
      }
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('puol_admin_date_range', JSON.stringify(value));
  }, [value]);

  // Calculer automatiquement la période de comparaison
  const calculateComparisonDates = (start: Date, end: Date, type: ComparisonType): { start: Date; end: Date } | null => {
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (type) {
      case 'sameDayLastWeek': {
        const compareEnd = new Date(start);
        compareEnd.setDate(compareEnd.getDate() - 1);
        const compareStart = new Date(compareEnd);
        compareStart.setDate(compareStart.getDate() - diffDays);
        return { start: compareStart, end: compareEnd };
      }
      case 'previousPeriod': {
        const compareEnd = new Date(start);
        compareEnd.setDate(compareEnd.getDate() - 1);
        const compareStart = new Date(compareEnd);
        compareStart.setDate(compareStart.getDate() - diffDays);
        return { start: compareStart, end: compareEnd };
      }
      case 'previousYear': {
        const compareStart = new Date(start);
        compareStart.setFullYear(compareStart.getFullYear() - 1);
        const compareEnd = new Date(end);
        compareEnd.setFullYear(compareEnd.getFullYear() - 1);
        return { start: compareStart, end: compareEnd };
      }
      case 'custom':
        return null;
      default:
        return null;
    }
  };

  const presets: Array<{ 
    preset: DateRangePreset; 
    label: string; 
    displayLabel: string;
    getDates: () => { start: Date; end: Date };
    hasSubmenu?: boolean;
  }> = [
    {
      preset: 'custom',
      label: "Personnalisée",
      displayLabel: "Personnalisée",
      getDates: () => {
        return { start: customStart || new Date(), end: customEnd || new Date() };
      }
    },
    {
      preset: 'today',
      label: "Aujourd'hui",
      displayLabel: "Aujourd'hui",
      getDates: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return { start: today, end: today };
      }
    },
    {
      preset: 'yesterday',
      label: 'Hier',
      displayLabel: 'Hier',
      getDates: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        return { start: yesterday, end: yesterday };
      }
    },
    {
      preset: '7days',
      label: 'Les 7 derniers jours',
      displayLabel: 'Les 7 derniers jours',
      getDates: () => {
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        return { start, end };
      }
    },
    {
      preset: '28days',
      label: 'Les 28 derniers jours',
      displayLabel: 'Les 28 derniers jours',
      getDates: () => {
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setDate(start.getDate() - 27);
        return { start, end };
      }
    },
    {
      preset: '30days',
      label: 'Les 30 derniers jours',
      displayLabel: 'Les 30 derniers jours',
      getDates: () => {
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setDate(start.getDate() - 29);
        return { start, end };
      }
    },
    {
      preset: 'thisMonth',
      label: 'Ce mois-ci',
      displayLabel: 'Ce mois-ci',
      getDates: () => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        return { start, end: today };
      }
    },
    {
      preset: 'lastMonth',
      label: 'Le mois dernier',
      displayLabel: 'Le mois dernier',
      getDates: () => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        end.setHours(0, 0, 0, 0);
        return { start, end };
      }
    },
    {
      preset: '90days',
      label: 'Les 90 derniers jours',
      displayLabel: 'Les 90 derniers jours',
      getDates: () => {
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setDate(start.getDate() - 89);
        return { start, end };
      }
    },
  ];

  const activeComparisonLabel = comparisonOptions.find((option) => option.type === comparisonType)?.label;
  const comparisonRange =
    compareEnabled && customStart && customEnd
      ? comparisonType === 'custom'
        ? customCompareStart && customCompareEnd
          ? { start: customCompareStart, end: customCompareEnd }
          : null
        : calculateComparisonDates(customStart, customEnd, comparisonType)
      : null;

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.preset);
    const dates = preset.getDates();
    setCustomStart(dates.start);
    setCustomEnd(dates.end);
  };

  const handleApply = () => {
    if (customStart && customEnd) {
      let compareStart: Date | undefined;
      let compareEnd: Date | undefined;

      if (compareEnabled) {
        if (comparisonType === 'custom') {
          compareStart = customCompareStart;
          compareEnd = customCompareEnd;
        } else {
          const comparison = calculateComparisonDates(customStart, customEnd, comparisonType);
          if (comparison) {
            compareStart = comparison.start;
            compareEnd = comparison.end;
          }
        }
      }

      const currentPreset = presets.find(p => p.preset === selectedPreset);

      onChange({
        preset: selectedPreset,
        label: currentPreset?.displayLabel || 'Personnalisée',
        startDate: customStart,
        endDate: customEnd,
        compareEnabled: compareEnabled,
        comparisonType: compareEnabled ? comparisonType : undefined,
        compareStartDate: compareStart,
        compareEndDate: compareEnd,
      });
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setSelectedPreset(value.preset);
    setCustomStart(value.startDate);
    setCustomEnd(value.endDate);
    setCompareEnabled(value.compareEnabled || false);
    setComparisonType(value.comparisonType || 'sameDayLastWeek');
    setCustomCompareStart(value.compareStartDate);
    setCustomCompareEnd(value.compareEndDate);
  };

  const formattedRange = `${value.startDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })} - ${value.endDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;

  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(value.preset);
      setCustomStart(value.startDate);
      setCustomEnd(value.endDate);
      setCompareEnabled(value.compareEnabled || false);
      setComparisonType(value.comparisonType || 'sameDayLastWeek');
      setCustomCompareStart(value.compareStartDate);
      setCustomCompareEnd(value.compareEndDate);
      }
  }, [isOpen]);

  return (
    <>
      <Button
        variant="outline"
        className="rounded-2xl border-gray-200 text-gray-700 flex items-center justify-between gap-4 px-4 py-3 min-w-[260px]"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex flex-col text-left leading-tight">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {value.label}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {formattedRange}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-500" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[92vw] max-w-[960px] xl:max-w-[1040px] p-0 gap-0 max-h-[90vh] flex flex-col">
          <VisuallyHidden>
            <DialogTitle>Sélectionner une plage de dates</DialogTitle>
            <DialogDescription>
              Choisissez une période pour analyser vos données et comparez avec une période précédente.
            </DialogDescription>
          </VisuallyHidden>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar avec presets - Fixed, scrollable */}
            <div className="w-[260px] border-r bg-white flex-shrink-0 overflow-y-auto">
              <div className="py-2">
                {presets.map((preset, index) => (
                  <button
                    key={preset.preset}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between text-sm ${
                      selectedPreset === preset.preset
                        ? 'bg-[#EBF5F0] text-[#2ECC71]'
                        : 'text-gray-700 hover:bg-gray-50'
                    } ${index === 0 ? 'mb-1 border-b pb-3' : ''}`}
                  >
                    <span>{preset.label}</span>
                    {preset.hasSubmenu && <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </button>
                ))}
              </div>

              {/* Section Comparer en bas */}
              <div className="border-t px-4 py-3 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-gray-700">Comparer</Label>
                  <Switch
                    checked={compareEnabled}
                    onCheckedChange={setCompareEnabled}
                  />
                </div>
                
                {compareEnabled && (
                  <div className="space-y-1">
                    {comparisonOptions.map((option) => (
                      <button
                        key={option.type}
                        onClick={() => setComparisonType(option.type)}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${
                          comparisonType === option.type
                            ? 'bg-[#EBF5F0] text-[#2ECC71]'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  variant={compareEnabled ? 'outline' : 'default'}
                  size="sm"
                  className="w-full mt-3 rounded-xl"
                  onClick={() => setCompareEnabled((prev) => !prev)}
                >
                  {compareEnabled ? 'Désactiver la comparaison' : 'Activer la comparaison'}
                </Button>
              </div>
            </div>

            {/* Zone calendrier - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-xl mx-auto px-6 py-6 space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Filtrer par date</p>
                  <h3 className="text-2xl font-semibold text-gray-900">Sélection personnalisée</h3>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Début</p>
                      <CalendarComponent
                        mode="single"
                        selected={customStart}
                        className="border-0 bg-transparent"
                        onSelect={(value) => {
                          if (!(value instanceof Date)) return;
                          const next = new Date(value);
                          next.setHours(0, 0, 0, 0);
                          setCustomStart(next);
                          setSelectedPreset('custom');
                          setCustomEnd((prev) => {
                            if (prev && prev < next) {
                              return undefined;
                            }
                            return prev;
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Fin</p>
                      <CalendarComponent
                        mode="single"
                        selected={customEnd}
                        className="border-0 bg-transparent"
                        onSelect={(value) => {
                          if (!(value instanceof Date)) return;
                          const next = new Date(value);
                          next.setHours(0, 0, 0, 0);
                          setSelectedPreset('custom');
                          setCustomEnd(() => {
                            if (customStart && next < customStart) {
                              return customStart;
                            }
                            return next;
                          });
                          if (!customStart) {
                            setCustomStart(next);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {compareEnabled ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase text-gray-500">Comparaison</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {activeComparisonLabel || 'Période précédente'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-emerald-100 text-emerald-700">
                        Activée
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {comparisonRange
                        ? `Du ${comparisonRange.start.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })} au ${comparisonRange.end.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}`
                        : comparisonType === 'custom'
                          ? 'Sélectionnez manuellement la période de comparaison ci-dessous.'
                          : "Ajustez la période principale pour recalculer l'intervalle comparé."}
                    </p>
                  </div>
                ) : null}

                {/* Affichage période de comparaison */}
                {compareEnabled && customStart && customEnd && (() => {
                  if (comparisonType === 'custom') {
                    return (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm text-gray-600 mb-3">Période de comparaison</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500 mb-1.5 block">Date de début</Label>
                            <div className="border border-gray-300 rounded-md px-3 py-2 bg-white">
                              <div className="text-sm text-gray-900">
                                {customCompareStart?.toLocaleDateString('fr-FR', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="text-gray-400 mt-5">–</div>
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500 mb-1.5 block">Date de fin</Label>
                            <div className="border border-gray-300 rounded-md px-3 py-2 bg-white">
                              <div className="text-sm text-gray-900">
                                {customCompareEnd?.toLocaleDateString('fr-FR', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Début</p>
                            <CalendarComponent
                              mode="single"
                              selected={customCompareStart}
                              className="border-0 bg-transparent"
                              onSelect={(value) => {
                                if (!(value instanceof Date)) return;
                                const next = new Date(value);
                                next.setHours(0, 0, 0, 0);
                                setCustomCompareStart(next);
                                setCustomCompareEnd((prev) => {
                                  if (prev && prev < next) {
                                    return undefined;
                                  }
                                  return prev;
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Fin</p>
                            <CalendarComponent
                              mode="single"
                              selected={customCompareEnd}
                              className="border-0 bg-transparent"
                              onSelect={(value) => {
                                if (!(value instanceof Date)) return;
                                const next = new Date(value);
                                next.setHours(0, 0, 0, 0);
                                setCustomCompareEnd(() => {
                                  if (customCompareStart && next < customCompareStart) {
                                    return customCompareStart;
                                  }
                                  return next;
                                });
                                if (!customCompareStart) {
                                  setCustomCompareStart(next);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const comparison = calculateComparisonDates(customStart, customEnd, comparisonType);
                    if (!comparison) return null;
                    return (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm text-gray-600 mb-2">Période de comparaison</h4>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                          <p className="text-sm text-gray-700">
                            <span className="text-gray-500">Du</span>{' '}
                            <span className="font-medium">
                              {comparison.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {' '}
                            <span className="text-gray-500">au</span>{' '}
                            <span className="font-medium">
                              {comparison.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>

          {/* Footer avec boutons - Fixed at bottom */}
          <div className="border-t px-6 py-3 bg-white flex justify-end gap-3 flex-shrink-0">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              disabled={!customStart || !customEnd || (compareEnabled && comparisonType === 'custom' && (!customCompareStart || !customCompareEnd))}
              className="bg-[#2ECC71] hover:bg-[#27AE60] text-white"
            >
              Appliquer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
