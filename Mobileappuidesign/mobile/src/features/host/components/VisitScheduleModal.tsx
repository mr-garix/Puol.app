import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';

const TIME_SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

interface VisitScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date, time: string) => void;
  initialDate?: Date | null;
  initialTime?: string;
}

export const VisitScheduleModal: React.FC<VisitScheduleModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialDate,
  initialTime,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setSelectedDate(initialDate ?? undefined);
      setSelectedTime(initialTime ?? '');
    }
  }, [visible, initialDate, initialTime]);

  const formatDateForCalendar = (date: Date | undefined) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const minDate = formatDateForCalendar(today);
  const markedDates: Record<string, any> = {};
  if (selectedDate) {
    markedDates[formatDateForCalendar(selectedDate)] = {
      selected: true,
      selectedColor: '#2ECC71',
    };
  }

  const handleDateSelect = (day: any) => {
    const picked = new Date(day.dateString);
    setSelectedDate(picked);
  };

  const handleClose = () => {
    setSelectedDate(undefined);
    setSelectedTime('');
    onClose();
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onConfirm(selectedDate, selectedTime);
      handleClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Choisir un créneau</Text>
              <Text style={styles.headerSubtitle}>Sélectionnez la date et l'heure de votre visite</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
              <Feather name="x" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.calendarContainer}>
              <Calendar
                current={formatDateForCalendar(today)}
                minDate={minDate}
                markedDates={markedDates}
                onDayPress={handleDateSelect}
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

            {selectedDate && (
              <View style={styles.timeSlotsContainer}>
                <View style={styles.timeSlotsHeader}>
                  <Feather name="clock" size={16} color="#2ECC71" />
                  <Text style={styles.timeSlotsLabel}>Horaires disponibles</Text>
                </View>

                <View style={styles.timeSlotsGrid}>
                  {TIME_SLOTS.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[styles.timeSlotButton, selectedTime === time && styles.timeSlotButtonActive]}
                      onPress={() => setSelectedTime(time)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextActive]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmButton, (!selectedDate || !selectedTime) && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!selectedDate || !selectedTime}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>Confirmer la visite</Text>
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  scrollContent: {
    padding: 20,
  },
  calendarContainer: {
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 12,
  },
  timeSlotsContainer: {
    marginBottom: 24,
  },
  timeSlotsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeSlotsLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotButton: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  timeSlotButtonActive: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  timeSlotText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  timeSlotTextActive: {
    color: '#FFFFFF',
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

export default VisitScheduleModal;
