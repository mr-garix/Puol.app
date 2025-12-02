import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface HostQuickStatsProps {
  reservationsCount: number;
  managedUnits: number;
  engagementStats: {
    views: number;
    likes: number;
    comments: number;
  };
  onOpenLikes: () => void;
  onOpenComments: () => void;
  isPendingVerification: boolean;
}

export const HostQuickStats: React.FC<HostQuickStatsProps> = ({
  reservationsCount,
  managedUnits,
  engagementStats,
  onOpenLikes,
  onOpenComments,
  isPendingVerification,
}) => {
  const quickStats = [
    { label: 'Réservations reçues (total)', value: reservationsCount.toString() },
    { label: 'Biens gérés', value: managedUnits.toString() },
  ];

  return (
    <>
      <View style={styles.quickStatsContainer}>
        {quickStats.map((stat) => (
          <View key={stat.label} style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>{stat.value}</Text>
            <Text style={styles.quickStatLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.engagementStats}>
        <View style={[styles.engagementStatCard, isPendingVerification && styles.disabledCard]}>
          <View style={[styles.engagementIconContainer, { backgroundColor: 'rgba(46, 204, 113, 0.12)' }]}>
            <Feather name="eye" size={22} color="#059669" />
          </View>
          <Text style={styles.engagementStatLabel}>Vues</Text>
          <Text style={styles.engagementStatValue}>
            {engagementStats.views >= 1000 ? `${(engagementStats.views / 1000).toFixed(1)}K` : engagementStats.views}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.engagementStatCard, isPendingVerification && styles.disabledCard]}
          activeOpacity={isPendingVerification ? 1 : 0.85}
          onPress={isPendingVerification ? undefined : onOpenLikes}
        >
          <View style={[styles.engagementIconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.18)' }]}>
            <Feather name="heart" size={22} color="#D97706" />
          </View>
          <Text style={styles.engagementStatLabel}>Likes</Text>
          <Text style={styles.engagementStatValue}>{engagementStats.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.engagementStatCard, isPendingVerification && styles.disabledCard]}
          activeOpacity={isPendingVerification ? 1 : 0.85}
          onPress={isPendingVerification ? undefined : onOpenComments}
        >
          <View style={[styles.engagementIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.18)' }]}>
            <Feather name="message-square" size={22} color="#2563EB" />
          </View>
          <Text style={styles.engagementStatLabel}>Commentaires</Text>
          <Text style={styles.engagementStatValue}>{engagementStats.comments}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  quickStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  quickStatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickStatValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickStatLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  engagementStats: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    marginHorizontal: 0,
    marginTop: 4,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  engagementStatCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  engagementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engagementStatLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  engagementStatValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  disabledCard: {
    opacity: 0.5,
  },
});
