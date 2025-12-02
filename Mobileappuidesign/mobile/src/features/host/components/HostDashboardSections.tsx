import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface DashboardSection {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  iconColor: string;
  countLabel: string;
  route: string;
}

interface HostDashboardSectionsProps {
  sections: DashboardSection[];
  isPendingVerification: boolean;
  onSectionPress: (route: string) => void;
}

export const HostDashboardSections: React.FC<HostDashboardSectionsProps> = ({
  sections,
  isPendingVerification,
  onSectionPress,
}) => {
  return (
    <View style={styles.sectionList}>
      {sections.map((section) => (
        <TouchableOpacity
          key={section.key}
          style={[styles.sectionCard, isPendingVerification && styles.disabledCard]}
          activeOpacity={isPendingVerification ? 1 : 0.85}
          onPress={isPendingVerification ? undefined : () => onSectionPress(section.route)}
          disabled={isPendingVerification}
        >
          <View style={[styles.sectionIconContainer, { backgroundColor: section.tint }]}>
            <Feather name={section.icon} size={20} color={section.iconColor} />
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.countLabel}</Text>
            </View>
            <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionList: {
    gap: 12,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContent: {
    flex: 1,
    gap: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionCount: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#059669',
  },
  sectionSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  disabledCard: {
    opacity: 0.5,
  },
});
