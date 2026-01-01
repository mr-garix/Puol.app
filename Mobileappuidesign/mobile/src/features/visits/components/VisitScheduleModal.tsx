import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';

import { useVisits } from '@/src/contexts/VisitsContext';
import { RENTAL_VISIT_TIME_SLOTS } from '@/src/features/rental-visits/services';

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (left?: Date | null, right?: Date | null) => {
  if (!left || !right) {
    return false;
  }
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

interface VisitScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date, time: string) => void;
  listingId: string;
  hostProfileId: string; // Ajouté pour le paiement
  initialDate?: Date | null;
  initialTime?: string;
}

export const VisitScheduleModal: React.FC<VisitScheduleModalProps> = ({
  visible,
  onClose,
  onConfirm,
  listingId,
  hostProfileId,
  initialDate,
  initialTime,
}) => {
  const { getOccupiedTimeslots, checkSlotAvailability, getUnavailableVisitDates } = useVisits();
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate ?? null);
  const [selectedTime, setSelectedTime] = useState<string>(initialTime ?? '');
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [isFetchingUnavailableDates, setIsFetchingUnavailableDates] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const earliestVisitDate = useMemo(() => {
    const tomorrow = new Date(today.getTime());
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }, [today]);
  const fetchRangeEnd = useMemo(() => {
    const rangeEnd = new Date(earliestVisitDate.getTime());
    rangeEnd.setDate(rangeEnd.getDate() + 90);
    return rangeEnd;
  }, [earliestVisitDate]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const safeInitial =
      initialDate && startOfDay(initialDate) >= earliestVisitDate ? initialDate : earliestVisitDate;
    setSelectedDate(safeInitial);
    setSelectedTime(initialTime ?? '');
    setSlotError(null);
  }, [earliestVisitDate, initialDate, initialTime, visible]);

  const loadOccupiedTimeslots = useCallback(async (date: Date | null) => {
    if (!date) {
      setOccupiedTimes([]);
      return;
    }
    setIsFetchingSlots(true);
    try {
      const times = await getOccupiedTimeslots(listingId, formatDateKey(date));
      setOccupiedTimes(times ?? []);
    } catch (err) {
      console.error('[VisitScheduleModal] Failed to fetch occupied slots', err);
      setOccupiedTimes([]);
      setSlotError('Impossible de vérifier les créneaux disponibles. Réessayez.');
    } finally {
      setIsFetchingSlots(false);
    }
  }, [getOccupiedTimeslots, listingId]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    void loadOccupiedTimeslots(selectedDate ?? null);
  }, [loadOccupiedTimeslots, selectedDate, visible]);

  const loadUnavailableDates = useCallback(async () => {
    setIsFetchingUnavailableDates(true);
    try {
      const unavailable = await getUnavailableVisitDates(
        listingId,
        formatDateKey(earliestVisitDate),
        formatDateKey(fetchRangeEnd),
      );
      setUnavailableDates(unavailable ?? []);
    } catch (err) {
      console.error('[VisitScheduleModal] Failed to fetch unavailable dates', err);
    } finally {
      setIsFetchingUnavailableDates(false);
    }
  }, [earliestVisitDate, fetchRangeEnd, getUnavailableVisitDates, listingId]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    void loadUnavailableDates();
  }, [loadUnavailableDates, visible]);

  const unavailableDatesSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      { selected?: boolean; selectedColor?: string; disabled?: boolean; disableTouchEvent?: boolean }
    > = {};

    // Griser toutes les dates strictement avant earliestVisitDate (visite pas le jour même).
    const cursor = new Date(earliestVisitDate.getTime());
    cursor.setMonth(cursor.getMonth() - 6); // limite raisonnable
    const boundary = new Date(earliestVisitDate.getTime());
    boundary.setDate(boundary.getDate() - 1);
    while (cursor <= boundary) {
      const key = formatDateKey(cursor);
      marks[key] = { disabled: true, disableTouchEvent: true };
      cursor.setDate(cursor.getDate() + 1);
    }

    unavailableDatesSet.forEach((dateKey) => {
      marks[dateKey] = {
        ...(marks[dateKey] ?? {}),
        disabled: true,
        disableTouchEvent: true,
      };
    });

    if (selectedDate) {
      marks[formatDateKey(selectedDate)] = {
        ...(marks[formatDateKey(selectedDate)] ?? {}),
        selected: true,
        selectedColor: '#2ECC71',
      };
    }
    return marks;
  }, [earliestVisitDate, selectedDate, unavailableDatesSet]);

  const disabledTimes = useMemo(() => {
    if (!selectedDate) {
      return new Set<string>();
    }
    const disallowed = new Set(occupiedTimes);
    if (initialDate && initialTime && isSameDay(initialDate, selectedDate)) {
      disallowed.delete(initialTime);
    }
    return disallowed;
  }, [initialDate, initialTime, occupiedTimes, selectedDate]);

  const handleDateSelect = (day: { dateString: string }) => {
    const picked = new Date(day.dateString);
    const normalized = startOfDay(picked);
    if (normalized < earliestVisitDate) {
      return;
    }
    if (unavailableDatesSet.has(formatDateKey(normalized))) {
      setSlotError('Cette date est indisponible car déjà réservée.');
      return;
    }
    setSelectedDate(normalized);
    setSelectedTime('');
    setSlotError(null);
  };

  const handleClose = () => {
    setSlotError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      return;
    }

    setIsCheckingAvailability(true);
    setSlotError(null);
    try {
      const available = await checkSlotAvailability(listingId, formatDateKey(selectedDate), selectedTime);
      if (!available) {
        setSlotError('Ce créneau vient d\'être réservé. Choisissez un autre horaire.');
        void loadOccupiedTimeslots(selectedDate);
        return;
      }
      
      // Créneau disponible, retourner date/heure au parent pour le paiement
      onConfirm(selectedDate, selectedTime);
      handleClose();
    } catch (err) {
      console.error('[VisitScheduleModal] Slot check failed', err);
      setSlotError('Impossible de vérifier la disponibilité du créneau. Réessayez.');
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSelectTime = (time: string) => {
    if (disabledTimes.has(time)) {
      return;
    }
    setSelectedTime(time);
    setSlotError(null);
  };

  const canConfirm = Boolean(selectedDate && selectedTime && !isCheckingAvailability);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Planifier une visite</Text>
              <Text style={styles.headerSubtitle}>Choisissez la date et l'heure qui vous conviennent</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
              <Feather name="x" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.calendarContainer}>
              <Calendar
                current={formatDateKey(selectedDate ?? earliestVisitDate)}
                minDate={formatDateKey(earliestVisitDate)}
                markedDates={markedDates}
                onDayPress={handleDateSelect}
                enableSwipeMonths
                theme={{
                  selectedDayBackgroundColor: '#2ECC71',
                  selectedDayTextColor: '#FFFFFF',
                  todayTextColor: '#2ECC71',
                  dayTextColor: '#111827',
                  textDisabledColor: '#D1D5DB',
                  monthTextColor: '#111827',
                  textMonthFontFamily: 'Manrope',
                  textMonthFontWeight: '700',
                  textDayFontFamily: 'Manrope',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  arrowColor: '#2ECC71',
                }}
                style={styles.calendar}
              />
            </View>

            {selectedDate ? (
                <View style={styles.timeSection}>
                  <View style={styles.timeHeader}>
                    <Feather name="clock" size={16} color="#2ECC71" />
                    <Text style={styles.timeHeaderLabel}>Créneaux disponibles</Text>
                    {isFetchingSlots && <ActivityIndicator size="small" color="#2ECC71" style={{ marginLeft: 8 }} />}
                  </View>

                <View style={styles.timeGrid}>
                  {RENTAL_VISIT_TIME_SLOTS.map((time) => {
                    const disabled = disabledTimes.has(time);
                    const isSelected = selectedTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeButton,
                          isSelected && styles.timeButtonSelected,
                          disabled && styles.timeButtonDisabled,
                        ]}
                        onPress={() => handleSelectTime(time)}
                        disabled={disabled}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.timeButtonText,
                            isSelected && styles.timeButtonTextSelected,
                            disabled && styles.timeButtonTextDisabled,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {slotError && <Text style={styles.slotError}>{slotError}</Text>}
                {!slotError && isFetchingUnavailableDates && (
                  <Text style={styles.unavailableHint}>Vérification des dates réservées…</Text>
                )}
              </View>
            ) : (
              <Text style={styles.dateHint}>Sélectionnez une date pour voir les horaires disponibles.</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!canConfirm}
              activeOpacity={0.85}
            >
              {isCheckingAvailability ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirmer la visite</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.48)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerText: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  calendarContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  calendar: {
    borderRadius: 16,
  },
  timeSection: {
    marginTop: 24,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  timeHeaderLabel: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeButton: {
    width: '30%',
    minWidth: 96,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  timeButtonSelected: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  timeButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  timeButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timeButtonTextSelected: {
    color: '#FFFFFF',
  },
  timeButtonTextDisabled: {
    color: '#9CA3AF',
  },
  slotError: {
    marginTop: 16,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#DC2626',
  },
  unavailableHint: {
    marginTop: 12,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  dateHint: {
    marginTop: 16,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  confirmButton: {
    backgroundColor: '#2ECC71',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#A7F3D0',
  },
  confirmButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
