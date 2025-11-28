import React, { useMemo, useState } from 'react';
import {
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

export interface FavoriteProperty {
  id: string;
  title: string;
  location: string;
  pricePerNight?: number;
  pricePerMonth?: number;
  images: string[];
  bedrooms?: number;
  kitchens?: number;
  furnished?: boolean;
  type?: string;
  surfaceArea?: string;
  favoritedAt?: Date;
}

interface FavoritesScreenProps {
  likedPropertyIds: string[];
  properties: FavoriteProperty[];
  onPropertyPress: (propertyId: string) => void;
  onToggleLike: (propertyId: string) => void;
  onBack?: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1505691723495-2320b0b7b2c9?w=400';

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  likedPropertyIds,
  properties,
  onPropertyPress,
  onToggleLike,
  onBack,
}) => {
  const [scrollY, setScrollY] = useState(0);
  const showShadow = scrollY > 20;
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top, 16) + 8;
  const [dateFilter, setDateFilter] = useState<'all' | 'recent' | 'custom'>('all');
  const [furnishingFilter, setFurnishingFilter] = useState<'all' | 'furnished' | 'unfurnished' | 'boutique'>('all');
  const [isTypePickerVisible, setIsTypePickerVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [activeDateField, setActiveDateField] = useState<'start' | 'end'>('start');

  const favorites = useMemo(
    () => properties.filter(property => likedPropertyIds.includes(property.id)),
    [properties, likedPropertyIds],
  );

  const filteredFavorites = useMemo(() => {
    const now = Date.now();
    const recentThreshold = now - 14 * 24 * 60 * 60 * 1000; // 14 jours

    return favorites
      .filter((property) => {
        if (dateFilter === 'recent' && property.favoritedAt) {
          return property.favoritedAt.getTime() >= recentThreshold;
        }
        if (dateFilter === 'recent' && !property.favoritedAt) {
          return false;
        }
        if (dateFilter === 'custom' && property.favoritedAt && customDateRange.start && customDateRange.end) {
          return (
            property.favoritedAt.getTime() >= customDateRange.start.getTime() &&
            property.favoritedAt.getTime() <= customDateRange.end.getTime()
          );
        }
        if (dateFilter === 'custom') {
          return false;
        }
        return true;
      })
      .filter((property) => {
        if (furnishingFilter === 'all') return true;
        if (furnishingFilter === 'furnished') {
          return property.furnished === true;
        }
        if (furnishingFilter === 'unfurnished') {
          return property.furnished === false;
        }
        if (furnishingFilter === 'boutique') {
          return property.type === 'boutique';
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.favoritedAt ? a.favoritedAt.getTime() : 0;
        const dateB = b.favoritedAt ? b.favoritedAt.getTime() : 0;
        return dateB - dateA;
      });
  }, [favorites, dateFilter, furnishingFilter]);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollY(offsetY);
  };

  const handleToggleLike = (propertyId: string, event?: any) => {
    event?.stopPropagation?.();
    onToggleLike(propertyId);
  };

  const formatPrice = (property: FavoriteProperty) => {
    if (property.pricePerNight) {
      return `${property.pricePerNight.toLocaleString('fr-FR')} FCFA/nuit`;
    }
    if (property.pricePerMonth) {
      return `${property.pricePerMonth.toLocaleString('fr-FR')} FCFA/mois`;
    }
    return 'Prix sur demande';
  };

  const openDatePicker = () => {
    setTempStartDate(customDateRange.start ?? new Date());
    setTempEndDate(customDateRange.end ?? new Date());
    setActiveDateField('start');
    setIsDatePickerVisible(true);
  };

  const applyCustomDateRange = () => {
    if (tempEndDate.getTime() < tempStartDate.getTime()) {
      setTempEndDate(tempStartDate);
    }
    setCustomDateRange({ start: tempStartDate, end: tempEndDate });
    setDateFilter('custom');
    setIsDatePickerVisible(false);
  };

  const resetDateFilter = () => {
    setCustomDateRange({ start: null, end: null });
    setDateFilter('all');
    setIsDatePickerVisible(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View
        style={[styles.header, { paddingTop: headerPaddingTop }, showShadow && styles.headerWithShadow]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeftColumn}>
            <View style={styles.headerLeft}>
              {onBack && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={onBack}
                  activeOpacity={0.7}
                >
                  <Feather name="arrow-left" size={20} color="#111827" />
                </TouchableOpacity>
              )}
              <Text style={styles.headerTitle}>Mes Favoris</Text>
            </View>

            <Text style={styles.headerSubtitle}>
              {filteredFavorites.length}{' '}
              {filteredFavorites.length === 1 ? 'propriété affichée' : 'propriétés affichées'}
            </Text>
          </View>

          <View style={styles.headerRightColumn}>
            <TouchableOpacity
              style={[styles.filterChip, furnishingFilter !== 'all' && styles.filterChipActive]}
              onPress={() => setIsTypePickerVisible(true)}
              activeOpacity={0.8}
            >
              <Feather
                name="sliders"
                size={14}
                color={furnishingFilter !== 'all' ? '#1F2937' : '#6B7280'}
              />
              <Text
                style={[styles.filterChipText, furnishingFilter !== 'all' && styles.filterChipTextActive]}
              >
                Filtrer par type
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, dateFilter !== 'all' && styles.filterChipActive]}
              onPress={openDatePicker}
              activeOpacity={0.8}
            >
              <Feather
                name="calendar"
                size={14}
                color={dateFilter !== 'all' ? '#1F2937' : '#6B7280'}
              />
              <Text style={[styles.filterChipText, dateFilter !== 'all' && styles.filterChipTextActive]}>
                Filtrer par date
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredFavorites.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="heart" size={44} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>Aucune propriété en favoris</Text>
            <Text style={styles.emptyDescription}>
              Appuyez sur ❤️ pour ajouter des propriétés à vos favoris.
            </Text>
          </View>
        ) : (
          <View style={styles.favoritesList}>
            {filteredFavorites.map((property) => (
              <TouchableOpacity
                key={property.id}
                style={styles.favoriteCard}
                onPress={() => onPropertyPress(property.id)}
                activeOpacity={0.85}
              >
                <View style={styles.cardContent}>
                  <Image
                    source={{ uri: property.images[0] ?? FALLBACK_IMAGE }}
                    style={styles.propertyImage}
                  />

                  <View style={styles.propertyInfo}>
                    <Text style={styles.propertyTitle} numberOfLines={2}>
                      {property.title}
                    </Text>

                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={14} color="#2ECC71" style={styles.locationIcon} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {property.location}
                      </Text>
                    </View>

                    <Text style={styles.priceText}>{formatPrice(property)}</Text>

                    <View style={styles.infoChips}>
                      {property.type === 'boutique' && (
                        <View style={styles.chip}>
                          <MaterialCommunityIcons
                            name="storefront-outline"
                            size={13}
                            color="#4B5563"
                          />
                          <Text style={styles.chipText}>Boutique</Text>
                        </View>
                      )}

                      {property.type === 'boutique' && property.surfaceArea && (
                        <View style={styles.chip}>
                          <Feather name="maximize-2" size={12} color="#4B5563" />
                          <Text style={styles.chipText}>{property.surfaceArea} m²</Text>
                        </View>
                      )}

                      {property.bedrooms !== undefined && property.bedrooms > 0 && (
                        <View style={styles.chip}>
                          <Feather name="home" size={12} color="#4B5563" />
                          <Text style={styles.chipText}>
                            {property.bedrooms}{' '}
                            {property.bedrooms === 1 ? 'chambre' : 'chambres'}
                          </Text>
                        </View>
                      )}

                      {property.kitchens !== undefined && property.kitchens > 0 && (
                        <View style={styles.chip}>
                          <Feather name="coffee" size={12} color="#4B5563" />
                          <Text style={styles.chipText}>
                            {property.kitchens}{' '}
                            {property.kitchens === 1 ? 'cuisine' : 'cuisines'}
                          </Text>
                        </View>
                      )}

                      {property.furnished !== undefined && (
                        <View style={styles.chip}>
                          <MaterialCommunityIcons name="sofa" size={14} color="#4B5563" />
                          <Text style={styles.chipText}>
                            {property.furnished ? 'Meublé' : 'Non meublé'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.likeButton}
                    onPress={(event) => handleToggleLike(property.id, event)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="heart" size={22} color="#2ECC71" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isTypePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTypePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsTypePickerVisible(false)}>
          <View style={styles.modalContent}>
            {(
              [
                { label: 'Tous types', value: 'all' },
                { label: 'Meublé', value: 'furnished' },
                { label: 'Non meublé', value: 'unfurnished' },
                { label: 'Boutique', value: 'boutique' },
              ] as const
            ).map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => {
                  setFurnishingFilter(option.value);
                  setIsTypePickerVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={isDatePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsDatePickerVisible(false)}>
          <View style={styles.modalContentDark}>
            <Text style={styles.modalSectionTitleDark}>Filtrer par date</Text>

            <View style={styles.modalFieldToggle}>
              {[
                { label: 'Date de début', value: 'start' as const },
                { label: 'Date de fin', value: 'end' as const },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalFieldToggleButton,
                    activeDateField === option.value && styles.modalFieldToggleButtonActive,
                  ]}
                  onPress={() => setActiveDateField(option.value)}
                >
                  <Text
                    style={[
                      styles.modalFieldToggleText,
                      activeDateField === option.value && styles.modalFieldToggleTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalSelectionSummary}>
              <View style={styles.modalSelectionRow}>
                <Text style={styles.modalSelectionLabel}>Début</Text>
                <Text style={styles.modalSelectionValue}>
                  {tempStartDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.modalSelectionRow}>
                <Text style={styles.modalSelectionLabel}>Fin</Text>
                <Text style={styles.modalSelectionValue}>
                  {tempEndDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </View>

            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={activeDateField === 'start' ? tempStartDate : tempEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                minimumDate={activeDateField === 'end' ? tempStartDate : undefined}
                themeVariant="light"
                style={styles.inlineDatePicker}
                onChange={(event, date) => {
                  if (!date) return;
                  if (activeDateField === 'start') {
                    setTempStartDate(date);
                    if (date.getTime() > tempEndDate.getTime()) {
                      setTempEndDate(date);
                    }
                  } else {
                    setTempEndDate(date);
                  }
                }}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalActionSecondary} onPress={resetDateFilter}>
                <Text style={styles.modalActionSecondaryText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalActionPrimary} onPress={applyCustomDateRange}>
                <Text style={styles.modalActionPrimaryText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerWithShadow: {
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    gap: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '500',
    color: '#111827',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerLeftColumn: {
    flex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  headerRightColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: '#E5E7EB',
  },
  filterChipText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
  },
  modalContentDark: {
    width: '94%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 12,
  },
  modalSectionTitleDark: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalQuickFilters: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  modalQuickFilterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  modalQuickFilterButtonActive: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderColor: '#2ECC71',
  },
  modalQuickFilterText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  modalQuickFilterTextActive: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  modalFieldToggle: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 8,
  },
  modalFieldToggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  modalFieldToggleButtonActive: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderColor: '#2ECC71',
  },
  modalFieldToggleText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  modalFieldToggleTextActive: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  modalSelectionSummary: {
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 4,
    gap: 6,
  },
  modalSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalSelectionLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  modalSelectionValue: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  modalSectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
  },
  modalSectionSpacing: {
    marginTop: 16,
  },
  modalSectionSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#4B5563',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  modalSectionSpacingSmall: {
    marginTop: 10,
  },
  datePickerWrapper: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  inlineDatePicker: {
    width: '100%',
    maxWidth: 280,
    height: 300,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalActionSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalActionSecondaryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
  },
  modalActionPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
  },
  modalActionPrimaryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  favoritesList: {
    gap: 12,
  },
  favoriteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    alignItems: 'stretch',
  },
  propertyImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  propertyInfo: {
    flex: 1,
    gap: 6,
  },
  propertyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    marginTop: 1,
  },
  locationText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  priceText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#2ECC71',
    fontWeight: '600',
  },
  infoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  chipText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  likeButton: {
    padding: 6,
    alignSelf: 'flex-start',
  },
});

export default FavoritesScreen;
