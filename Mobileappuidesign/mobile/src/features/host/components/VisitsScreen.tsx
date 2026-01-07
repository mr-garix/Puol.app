import React, { useState } from 'react';
import {
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1502672260066-6bc36a7cad24?w=400&auto=format&fit=crop&q=80';

export interface Visit {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string | null;
  propertyLocation: string;
  propertyBedrooms?: number;
  propertyKitchens?: number;
  propertyLivingRooms?: number;
  propertyType?: string;
  propertySurfaceArea?: string;
  propertyIsRoadside?: boolean;
  visitDate: Date | string;
  visitTime: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface VisitsScreenProps {
  visits: Visit[];
  onVisitPress?: (visitId: string) => void;
  onBack?: () => void;
}

const formatVisitDate = (date: Date | string, time: string) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  const formattedDate = dateObj.toLocaleDateString('fr-FR', options);
  return `${formattedDate} à ${time}`;
};

const getStatusStyle = (status: Visit['status']) => {
  switch (status) {
    case 'confirmed':
      return {
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        color: '#2ECC71',
        text: 'Visite confirmée',
      };
    case 'cancelled':
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: '#EF4444',
        text: 'Annulée',
      };
    case 'pending':
    default:
      return {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        color: '#F59E0B',
        text: 'En attente de confirmation',
      };
  }
};

const getProgressionStyle = (visitDate: Date | string) => {
  try {
    const dateObj = visitDate instanceof Date ? visitDate : new Date(visitDate);
    const now = new Date();
    
    // Comparer les dates (sans l'heure) en UTC
    const visitDateUTC = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());
    const nowDateUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    
    const visitTime = visitDateUTC.getTime();
    const nowTime = nowDateUTC.getTime();
    
    if (visitTime < nowTime) {
      return {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: '#1D4ED8',
        text: 'Terminée',
      };
    } else if (visitTime === nowTime) {
      return {
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        color: '#CA8A04',
        text: 'En cours',
      };
    } else {
      return {
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        color: '#6B7280',
        text: 'À venir',
      };
    }
  } catch (error) {
    return {
      backgroundColor: 'rgba(107, 114, 128, 0.1)',
      color: '#6B7280',
      text: 'À venir',
    };
  }
};

type TagDescriptor = {
  label: string;
  featherIcon?: React.ComponentProps<typeof Feather>['name'];
  materialIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

const buildTags = (visit: Visit) => {
  const tags: TagDescriptor[] = [];
  const isShop = visit.propertyType === 'boutique';

  if (isShop) {
    if (visit.propertySurfaceArea) {
      const areaLabel = visit.propertySurfaceArea.includes('m²')
        ? visit.propertySurfaceArea
        : `${visit.propertySurfaceArea} m²`;
      tags.push({ materialIcon: 'ruler-square', label: areaLabel });
    }
    if (visit.propertyIsRoadside) {
      tags.push({ featherIcon: 'map', label: 'Bord de route' });
    }
  } else {
    if (visit.propertyBedrooms && visit.propertyBedrooms > 0) {
      tags.push({
        materialIcon: 'bed',
        label: `${visit.propertyBedrooms} chambre${visit.propertyBedrooms > 1 ? 's' : ''}`,
      });
    }
    if (visit.propertyLivingRooms && visit.propertyLivingRooms > 0) {
      tags.push({
        materialIcon: 'sofa',
        label: `${visit.propertyLivingRooms} salon${visit.propertyLivingRooms > 1 ? 's' : ''}`,
      });
    }
  }
  return tags;
};

const VisitsScreen: React.FC<VisitsScreenProps> = ({ visits, onVisitPress, onBack }) => {
  const [scrollY, setScrollY] = useState(0);
  const showShadow = scrollY > 20;
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 8;

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollY(offsetY);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View
        style={[
          styles.header,
          { paddingTop: headerTopPadding },
          showShadow && styles.headerWithShadow,
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            {onBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonIcon}>←</Text>
              </TouchableOpacity>
            )}

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Mes Visites</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Gérez vos visites programmées</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {visits.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Feather name="calendar" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>
              Vous n'avez pas encore de visite programmée.
            </Text>
            <Text style={styles.emptyDescription}>
              Explorez les propriétés et programmez une visite pour les découvrir en personne.
            </Text>
          </View>
        ) : (
          <View style={styles.visitsList}>
            {visits.map((visit, index) => {
              const statusStyle = getStatusStyle(visit.status);
              const progressionStyle = getProgressionStyle(visit.visitDate);
              const tags = buildTags(visit);

              return (
                <TouchableOpacity
                  key={visit.id || index}
                  style={styles.visitCard}
                  onPress={() => onVisitPress?.(visit.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.visitCardTop}>
                    <Image
                      source={{ uri: visit.propertyImage || FALLBACK_IMAGE }}
                      style={styles.propertyImage}
                    />

                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyTitle} numberOfLines={2}>
                        {visit.propertyTitle}
                      </Text>

                      <View style={styles.locationRow}>
                        <Feather
                          name="map-pin"
                          size={14}
                          color="#2ECC71"
                          style={styles.locationIcon}
                        />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {visit.propertyLocation}
                        </Text>
                      </View>

                      {tags.length > 0 && (
                        <View style={styles.tagsRow}>
                          {tags.map((tag) => (
                            <View key={tag.label} style={styles.tagChip}>
                              {tag.featherIcon ? (
                                <Feather name={tag.featherIcon} size={12} color="#2ECC71" />
                              ) : (
                                <MaterialCommunityIcons
                                  name={tag.materialIcon ?? 'sofa'}
                                  size={14}
                                  color="#2ECC71"
                                />
                              )}
                              <Text style={styles.tagChipText}>{tag.label}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.badgesRow}>
                        {visit.status === 'cancelled' ? (
                          // Si annulée, afficher seulement le badge "Annulée"
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusStyle.backgroundColor },
                            ]}
                          >
                            <Text
                              style={[styles.statusText, { color: statusStyle.color }]}
                            >
                              {statusStyle.text}
                            </Text>
                          </View>
                        ) : progressionStyle.text === 'Terminée' ? (
                          // Si terminée (date passée), afficher seulement le badge "Terminée"
                          <View
                            style={[
                              styles.progressionBadge,
                              { backgroundColor: progressionStyle.backgroundColor },
                            ]}
                          >
                            <Text
                              style={[styles.progressionText, { color: progressionStyle.color }]}
                            >
                              {progressionStyle.text}
                            </Text>
                          </View>
                        ) : (
                          // Sinon, afficher les deux badges (statut + progression)
                          <>
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: statusStyle.backgroundColor },
                              ]}
                            >
                              <Text
                                style={[styles.statusText, { color: statusStyle.color }]}
                              >
                                {statusStyle.text}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.progressionBadge,
                                { backgroundColor: progressionStyle.backgroundColor },
                              ]}
                            >
                              <Text
                                style={[styles.progressionText, { color: progressionStyle.color }]}
                              >
                                {progressionStyle.text}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.visitDateContainer}>
                    <Feather name="clock" size={18} color="#2ECC71" style={styles.clockIcon} />
                    <Text style={styles.visitDateText}>
                      {formatVisitDate(visit.visitDate, visit.visitTime)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 24,
    paddingTop: 24,
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
    gap: 12,
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
  backButtonIcon: {
    fontSize: 20,
    color: '#111827',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  emptyIcon: {
    fontSize: 48,
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
  visitsList: {
    gap: 16,
  },
  visitCard: {
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
  visitCardTop: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  propertyImage: {
    width: 80,
    height: 80,
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
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
  },
  progressionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  progressionText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
  },
  visitDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  clockIcon: {
    fontSize: 20,
    color: '#2ECC71',
  },
  visitDateText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
});

export default VisitsScreen;
