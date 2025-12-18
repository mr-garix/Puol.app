import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from 'react-native-calendars';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ReservationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (checkIn: Date, checkOut: Date, nights: number, total: number) => void;
  pricePerNight: number;
  propertyTitle: string;
  initialCheckIn?: Date | null;
  initialCheckOut?: Date | null;
  promotion?: {
    nights_required: number;
    discount_percent: number;
  } | null;
  unavailableDates?: string[];
  unavailableDateStatuses?: Record<string, 'blocked' | 'reserved'>;
}

const formatDateForCalendar = (date: Date | undefined) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date | undefined) => {
  if (!date) return 'Choisir une date';
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

export const ReservationModal: React.FC<ReservationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  pricePerNight,
  propertyTitle,
  initialCheckIn,
  initialCheckOut,
  promotion,
  unavailableDates,
  unavailableDateStatuses,
}) => {
  const [step, setStep] = useState<'check-in' | 'check-out'>('check-in');
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const summaryAnchorRef = useRef<View | null>(null);
  const hasUserSelectionRef = useRef(false);

  const nights = (() => {
    if (checkInDate && checkOutDate) {
      const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  })();
  const totalBeforeDiscount = nights * pricePerNight;
  const isPromotionEligible = Boolean(
    promotion && promotion.nights_required > 0 && promotion.discount_percent > 0 && nights >= promotion.nights_required,
  );
  const discountAmount = isPromotionEligible ? (totalBeforeDiscount * (promotion!.discount_percent / 100)) : 0;
  const totalPrice = Math.max(totalBeforeDiscount - discountAmount, 0);

  const unavailableDatesSet = useMemo(() => {
    if (!unavailableDates?.length) return new Set<string>();
    return new Set(unavailableDates.map((date) => date.trim()));
  }, [unavailableDates]);

  const allowedCheckoutDateKey = useMemo(() => {
    if (!checkInDate) {
      return null;
    }
    const nextDate = new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000);
    const key = formatDateForCalendar(nextDate);
    return unavailableDatesSet.has(key) ? key : null;
  }, [checkInDate, unavailableDatesSet]);

  const isDateUnavailable = (date: Date) => unavailableDatesSet.has(formatDateForCalendar(date));

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const today = new Date();

  const pastDateMarkedDates = useMemo(() => {
    const todayStart = startOfDay(today);
    const startCursor = new Date(todayStart.getTime());
    startCursor.setMonth(startCursor.getMonth() - 6);
    const marked: Record<string, any> = {};
    const cursor = new Date(startCursor.getTime());

    while (cursor < todayStart) {
      const key = formatDateForCalendar(cursor);
      if (!marked[key]) {
        marked[key] = {
          disabled: true,
          disableTouchEvent: true,
          customStyles: {
            text: {
              color: '#9CA3AF',
            },
          },
        };
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return marked;
  }, [today]);

  const handleCheckInSelect = (day: any) => {
    const selected = new Date(day.dateString);
    if (isDateUnavailable(selected)) return;
    if (startOfDay(selected) < startOfDay(today)) return;
    setCheckInDate(selected);
    setStep('check-out');
    hasUserSelectionRef.current = true;
    if (checkOutDate && checkOutDate <= selected) {
      setCheckOutDate(undefined);
    }
  };

  const handleCheckOutSelect = (day: any) => {
    const selected = new Date(day.dateString);
    const key = formatDateForCalendar(selected);
    const isAllowedCheckout = allowedCheckoutDateKey === key;
    if (!isAllowedCheckout && isDateUnavailable(selected)) return;
    if (checkInDate && startOfDay(selected) <= startOfDay(checkInDate)) return;
    setCheckOutDate(selected);
    hasUserSelectionRef.current = true;
  };

  const minDate =
    step === 'check-in'
      ? formatDateForCalendar(today)
      : checkInDate
      ? formatDateForCalendar(new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000))
      : formatDateForCalendar(today);

  const strikeMarkedDates: Record<string, any> = { ...pastDateMarkedDates };
  const unavailableColor = '#D1D5DB';
  const strikeStyle = (color: string) => ({
    disabled: true,
    disableTouchEvent: true,
    customStyles: {
      container: {
        paddingVertical: 6,
      },
      text: {
        color,
        textDecorationLine: 'line-through',
        textDecorationStyle: 'solid',
        textDecorationColor: color,
        fontWeight: '600',
        paddingHorizontal: 8,
        letterSpacing: 1,
      },
    },
  });

  unavailableDatesSet.forEach((date) => {
    if (allowedCheckoutDateKey === date) {
      return;
    }

    const color = unavailableColor;
    strikeMarkedDates[date] = {
      ...(strikeMarkedDates[date] ?? {}),
      ...strikeStyle(color),
    };
  });

  if (checkInDate) {
    const key = formatDateForCalendar(checkInDate);
    strikeMarkedDates[key] = {
      customStyles: {
        container: {
          backgroundColor: '#2ECC71',
          borderRadius: 8,
          paddingVertical: 6,
        },
        text: {
          color: '#FFFFFF',
          fontWeight: '700',
        },
      },
    };
  }

  if (checkOutDate) {
    const key = formatDateForCalendar(checkOutDate);
    strikeMarkedDates[key] = {
      customStyles: {
        container: {
          backgroundColor: '#2ECC71',
          borderRadius: 8,
          paddingVertical: 6,
        },
        text: {
          color: '#FFFFFF',
          fontWeight: '700',
        },
      },
    };
  }

  const findFirstUnavailableInRange = (start: Date, end: Date) => {
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const boundary = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (cursor < boundary) {
      const key = formatDateForCalendar(cursor);
      if (unavailableDatesSet.has(key)) {
        return key;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return null;
  };

  const describeUnavailableDate = (dateKey: string) => {
    const status = unavailableDateStatuses?.[dateKey];
    switch (status) {
      case 'reserved':
        return 'déjà réservée';
      case 'blocked':
      default:
        return 'bloquée';
    }
  };

  const handleConfirm = () => {
    if (checkInDate && checkOutDate && nights > 0) {
      const firstUnavailable = findFirstUnavailableInRange(checkInDate, checkOutDate);
      if (firstUnavailable) {
        const unavailableDate = new Date(`${firstUnavailable}T00:00:00`);
        const formattedDate = unavailableDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const description = describeUnavailableDate(firstUnavailable);

        Alert.alert(
          'Dates indisponibles',
          `La date du ${formattedDate} est ${description}. Veuillez choisir un autre intervalle sans dates bloquées.`,
        );
        return;
      }

      onConfirm(checkInDate, checkOutDate, nights, totalPrice);
      handleClose();
    }
  };

  const handleClose = () => {
    setCheckInDate(undefined);
    setCheckOutDate(undefined);
    setStep('check-in');
    hasUserSelectionRef.current = false;
    onClose();
  };

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      });
      setCheckInDate(initialCheckIn ?? undefined);
      setCheckOutDate(initialCheckOut ?? undefined);
      setStep(initialCheckIn ? 'check-out' : 'check-in');
      hasUserSelectionRef.current = false;
    }
  }, [visible, initialCheckIn, initialCheckOut]);

  useEffect(() => {
    if (hasUserSelectionRef.current && checkInDate && checkOutDate && nights > 0) {
      requestAnimationFrame(() => {
        summaryAnchorRef.current?.measure((_x, y) => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
        });
      });
    }
  }, [checkInDate, checkOutDate, nights]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Réserver</Text>
              <Text style={styles.headerSubtitle}>{propertyTitle}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
              <Feather name="x" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>


          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.dateSelectionContainer}>
              <TouchableOpacity
                style={[styles.dateButton, step === 'check-in' && styles.dateButtonActive]}
                onPress={() => setStep('check-in')}
                activeOpacity={0.7}
              >
                <View style={styles.dateButtonHeader}>
                  <Feather name="calendar" size={16} color="#2ECC71" />
                  <Text style={styles.dateLabel}>Date d'arrivée</Text>
                </View>
                <Text style={styles.dateValue}>{formatDateLabel(checkInDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateButton, step === 'check-out' && styles.dateButtonActive, !checkInDate && styles.dateButtonDisabled]}
                onPress={() => checkInDate && setStep('check-out')}
                activeOpacity={0.7}
                disabled={!checkInDate}
              >
                <View style={styles.dateButtonHeader}>
                  <Feather name="calendar" size={16} color="#2ECC71" />
                  <Text style={styles.dateLabel}>Date de départ</Text>
                </View>
                <Text style={styles.dateValue}>{formatDateLabel(checkOutDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContainer}>
              <Calendar
                current={formatDateForCalendar(checkInDate ?? new Date())}
                minDate={minDate}
                markedDates={strikeMarkedDates}
                markingType="custom"
                disableAllTouchEventsForDisabledDays
                enableSwipeMonths
                onDayPress={step === 'check-in' ? handleCheckInSelect : handleCheckOutSelect}
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

            {checkInDate && checkOutDate && nights > 0 && (
              <View style={styles.summaryContainer} ref={summaryAnchorRef}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Nombre de nuitées</Text>
                  <Text style={styles.summaryValue}>
                    {nights} {nights > 1 ? 'nuits' : 'nuit'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Prix par nuit</Text>
                  <Text style={styles.summaryValue}>{pricePerNight.toLocaleString('fr-FR')} FCFA</Text>
                </View>
                {isPromotionEligible && (
                  <>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryLabelGroup}>
                        <Text style={styles.summaryLabel}>Réduction</Text>
                        <Text style={styles.summaryHint}>
                          (-{promotion?.discount_percent}% dès {promotion?.nights_required} nuits)
                        </Text>
                      </View>
                      <Text style={[styles.summaryValue, styles.discountValue]}>
                        - {discountAmount.toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                  </>
                )}
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>{totalPrice.toLocaleString('fr-FR')} FCFA</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmButton, (!checkInDate || !checkOutDate || nights === 0) && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!checkInDate || !checkOutDate || nights === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>Confirmer la réservation</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 72,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    maxHeight: '82%',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  dateSelectionContainer: {
    gap: 12,
    marginBottom: 20,
  },
  dateButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  dateButtonActive: {
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
  },
  dateButtonDisabled: {
    opacity: 0.5,
  },
  dateButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dateIcon: {
    fontSize: 16,
  },
  dateLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  dateValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  calendarContainer: {
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 12,
  },
  summaryContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginRight: 8,
  },
  summaryLabelGroup: {
    flex: 1,
  },
  summaryHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  summaryValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'right',
    flexShrink: 0,
    minWidth: 110,
  },
  discountValue: {
    color: '#D97706',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  summaryTotalLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  summaryTotalValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#2ECC71',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  confirmButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ReservationModal;
