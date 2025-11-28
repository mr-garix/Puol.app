import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useVisits, VisitRecord } from '@/src/contexts/VisitsContext';

interface VisitDetailsScreenProps {
  visit: VisitRecord;
  onBack?: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1502672260066-6bc36a7cad24?w=800&auto=format&fit=crop&q=80';

export const VisitDetailsScreen: React.FC<VisitDetailsScreenProps> = ({ visit, onBack }) => {
  const router = useRouter();
  const { cancelVisit } = useVisits();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isAvatarVisible, setIsAvatarVisible] = useState(false);
  const buyerProfile = useMemo(
    () => ({
      name: 'Alain Mbarga',
      phone: '+237 690 12 34 56',
      avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=300&auto=format&fit=crop&q=80',
      role: 'Bailleur principal',
    }),
    [],
  );

  const visitDate = useMemo(() => new Date(visit.visitDate), [visit.visitDate]);
  const isCancelled = visit.status === 'cancelled';

  const formattedDate = useMemo(
    () =>
      visitDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [visitDate],
  );

  const statusConfig = useMemo(() => {
    switch (visit.status) {
      case 'confirmed':
        return { label: 'Visite confirmée', color: '#2ECC71', background: 'rgba(46,204,113,0.1)' };
      case 'cancelled':
        return { label: 'Annulée', color: '#EF4444', background: 'rgba(239,68,68,0.1)' };
      default:
        return { label: 'En attente de confirmation', color: '#F97316', background: 'rgba(249,115,22,0.1)' };
    }
  }, [visit.status]);

  const handleOpenMaps = () => {
    const address = encodeURIComponent(visit.propertyLocation);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
  };

  const handleCallBuyer = () => {
    Linking.openURL(`tel:${buyerProfile.phone.replace(/\s+/g, '')}`);
  };

   const handleViewListing = () => {
    router.push({ pathname: '/property/[id]', params: { id: visit.propertyId } });
  };

  const handleCancelVisit = () => {
    cancelVisit(visit.id);
    setShowCancelModal(false);
    Alert.alert('Visite annulée', 'Votre visite a été annulée.');
    onBack?.();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: visit.propertyImage || FALLBACK_IMAGE }} style={styles.image} />
          <View style={styles.overlay} />
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color="#111827" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.background }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>

          <Text style={styles.title}>{visit.propertyTitle}</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={16} color="#2ECC71" />
            <Text style={styles.locationText}>{visit.propertyLocation}</Text>
          </View>

          <View style={styles.infoCard}>
            <InfoRow icon="calendar" label="Date de la visite" value={formattedDate} />
            <InfoRow icon="clock" label="Heure de la visite" value={visit.visitTime} />
            <InfoRow
              icon="dollar-sign"
              iconComponent={<MaterialCommunityIcons name="cash-multiple" size={18} color="#2ECC71" />}
              label="Montant payé"
              value="5 000 FCFA"
              highlight
            />
          </View>

          <TouchableOpacity style={styles.mapsButton} onPress={handleOpenMaps} activeOpacity={0.8}>
            <Feather name="map" size={18} color="#2ECC71" />
            <View style={styles.mapsTextWrapper}>
              <Text style={styles.mapsTitle}>Cliquez ici pour ouvrir dans Google Maps</Text>
              <Text style={styles.mapsSubtitle}>{visit.propertyLocation}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.buyerCard}>
            <TouchableOpacity onPress={() => setIsAvatarVisible(true)} activeOpacity={0.9}>
              <Image source={{ uri: buyerProfile.avatar }} style={styles.buyerAvatar} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.buyerLabel}>{buyerProfile.role}</Text>
              <View style={styles.buyerNameRow}>
                <Text style={styles.buyerName}>{buyerProfile.name}</Text>
                <TouchableOpacity
                  style={styles.buyerAnnouncementButton}
                  onPress={handleViewListing}
                  activeOpacity={0.85}
                >
                  <Feather name="external-link" size={14} color="#2ECC71" />
                  <Text style={styles.buyerAnnouncementText}>Voir l'annonce</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.buyerPhoneRow} onPress={handleCallBuyer} activeOpacity={0.85}>
                <Feather name="phone" size={16} color="#2ECC71" />
                <Text style={styles.buyerPhone}>{buyerProfile.phone}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isCancelled && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCancelModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="x" size={16} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Annuler la visite</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.rulesCard} onPress={() => setShowRulesModal(true)} activeOpacity={0.8}>
            <Feather name="alert-triangle" size={18} color="#F97316" />
            <View style={styles.rulesTextWrapper}>
              <Text style={styles.rulesTitle}>Règles de visite</Text>
              <Text style={styles.rulesSubtitle}>Cliquez pour voir les règles à respecter</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowCalendarModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="calendar" size={18} color="#2ECC71" />
            <Text style={styles.calendarButtonText}>Ajouter à mon agenda</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <InfoModal
        visible={showCancelModal}
        icon="alert-triangle"
        iconBackground="rgba(239,68,68,0.2)"
        iconColor="#B91C1C"
        title="Annuler la visite ?"
        onClose={() => setShowCancelModal(false)}
        actions={[
          {
            label: 'Oui, annuler',
            onPress: handleCancelVisit,
            primary: true,
            destructive: true,
          },
          {
            label: 'Non, revenir en arrière',
            onPress: () => setShowCancelModal(false),
          },
        ]}
      >
        <Text style={styles.modalText}>• Si vous annulez avant 24h, vous serez remboursé à 50 % du montant de la visite.</Text>
        <Text style={styles.modalText}>• Si vous annulez après 24h, aucun remboursement ne sera effectué.</Text>
        <Text style={[styles.modalText, { marginTop: 8 }]}>Voulez-vous vraiment annuler cette visite ?</Text>
      </InfoModal>

      <InfoModal
        visible={showRulesModal}
        icon="alert-triangle"
        iconBackground="rgba(249,115,22,0.15)"
        title="Règles de visite"
        onClose={() => setShowRulesModal(false)}
        actions={[{
          label: 'Compris',
          onPress: () => setShowRulesModal(false),
          primary: true,
        }]}
      >
        <Text style={styles.modalText}>Arrivez 10 minutes avant l'heure de visite pour être à l'heure.</Text>
        <Text style={styles.modalText}>Une visite dure entre 20 et 30 minutes maximum.</Text>
        <Text style={styles.modalText}>Si vous arrivez après l'heure prévue, votre créneau sera perdu.</Text>
        <Text style={styles.modalText}>En cas de retard, appelez le bailleur à l'avance pour prévenir.</Text>
        <Text style={[styles.modalText, { marginTop: 8 }]}>Merci de respecter ces règles afin de garantir le bon déroulement des visites.</Text>
      </InfoModal>

      <InfoModal
        visible={showCalendarModal}
        icon="calendar"
        iconBackground="rgba(46,204,113,0.15)"
        title="Ajouter à l'agenda"
        onClose={() => setShowCalendarModal(false)}
        actions={[{
          label: 'Compris',
          onPress: () => setShowCalendarModal(false),
          primary: true,
        }]}
      >
        <Text style={[styles.modalText, { textAlign: 'center' }]}>Fonctionnalité à venir 🚀</Text>
      </InfoModal>

      <Modal visible={isAvatarVisible} transparent animationType="fade" onRequestClose={() => setIsAvatarVisible(false)}>
        <View style={styles.avatarOverlay}>
          <TouchableOpacity style={styles.avatarCloseButton} onPress={() => setIsAvatarVisible(false)} activeOpacity={0.8}>
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Image source={{ uri: buyerProfile.avatar }} style={styles.avatarFullImage} resizeMode="cover" />
        </View>
      </Modal>
    </View>
  );
};

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const InfoRow = ({
  icon,
  iconComponent,
  label,
  value,
  highlight,
}: {
  icon: FeatherIconName;
  iconComponent?: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrapper}>
      {iconComponent ?? <Feather name={icon} size={16} color="#2ECC71" />}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  </View>
);

interface InfoModalProps {
  visible: boolean;
  icon: FeatherIconName;
  iconBackground: string;
  iconColor?: string;
  title: string;
  onClose: () => void;
  actions: { label: string; onPress: () => void; primary?: boolean; destructive?: boolean }[];
  children: React.ReactNode;
}

const InfoModal = ({ visible, icon, iconBackground, iconColor, title, onClose, actions, children }: InfoModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={[styles.modalIconWrapper, { backgroundColor: iconBackground }]}>
          <Feather name={icon} size={24} color={iconColor ?? '#111827'} />
        </View>
        <Text style={styles.modalTitle}>{title}</Text>
        <View style={{ gap: 6 }}>{children}</View>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[
              styles.modalButton,
              action.primary && (action.destructive ? styles.modalButtonDanger : styles.modalButtonPrimary),
            ]}
            onPress={action.onPress}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.modalButtonText,
                action.primary && { color: '#FFFFFF' },
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageWrapper: {
    height: 320,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: -32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 16,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(46,204,113,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
  },
  infoValueHighlight: {
    fontWeight: '600',
    color: '#2ECC71',
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  mapsTextWrapper: {
    flex: 1,
  },
  mapsTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  mapsSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  buyerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buyerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  buyerLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  buyerName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  buyerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  buyerAnnouncementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.08)',
    marginLeft: 'auto',
  },
  buyerAnnouncementText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#2ECC71',
  },
  buyerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  buyerPhone: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#2ECC71',
  },
  avatarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarFullImage: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  avatarCloseButton: {
    position: 'absolute',
    top: 60,
    right: 32,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 24,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  rulesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rulesTextWrapper: {
    flex: 1,
  },
  rulesTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rulesSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  calendarButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#2ECC71',
    borderRadius: 24,
    paddingVertical: 14,
  },
  calendarButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#2ECC71',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  modalText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalButton: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalButtonPrimary: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  modalButtonDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  modalButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});

export default VisitDetailsScreen;
