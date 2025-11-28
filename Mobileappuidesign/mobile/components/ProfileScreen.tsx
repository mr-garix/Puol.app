import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import feedVerifiedIcon from '../assets/icons/feed-icon-verified.png';

export interface UserData {
  firstName: string;
  lastName: string;
  photo: string;
  username?: string;
  verified?: boolean;
  companyName?: string;
  companyLogoUrl?: string;
  stats?: {
    listings: number;
    followers: number;
    following: number;
    views: number;
    likes: number;
    comments: number;
  };
}

export interface ProfileScreenProps {
  userData: UserData;
  reservationsCount: number;
  reviewsCount: number;
  unreadMessagesCount?: number;
  unreadCommentsCount?: number;
  onEditProfile: () => void;
  onNavigateToMessages: () => void;
  onNavigateToReservations: () => void;
  onNavigateToListings: () => void;
  onNavigateToContents: () => void;
  onNavigateToReviews: () => void;
  onNavigateToSupport: () => void;
  onShowQRCode: () => void;
  onLogout: () => void;
  onProfileImagePress?: () => void;
  onCommentsPress?: () => void;
  onLikesPress?: () => void;
  hostDashboardStatus?: 'approved' | 'pending' | 'rejected';
  hostStatusMessage?: string;
  onHostDashboardPress?: () => void;
  showListingsMenu?: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userData,
  reservationsCount,
  reviewsCount,
  unreadMessagesCount = 0,
  unreadCommentsCount = 0,
  onEditProfile,
  onNavigateToMessages,
  onNavigateToReservations,
  onNavigateToListings,
  onNavigateToContents,
  onNavigateToReviews,
  onNavigateToSupport,
  onShowQRCode,
  onLogout,
  onProfileImagePress,
  onCommentsPress,
  onLikesPress,
  hostDashboardStatus,
  hostStatusMessage,
  onHostDashboardPress,
  showListingsMenu = true,
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const insets = useSafeAreaInsets();
  const [isScrolled, setIsScrolled] = useState(false);

  const stats = {
    listings: userData.stats?.listings ?? 0,
    followers: userData.stats?.followers ?? 0,
    following: userData.stats?.following ?? 0,
    views: userData.stats?.views ?? 0,
    likes: userData.stats?.likes ?? 0,
    comments: userData.stats?.comments ?? 0,
  };

  const baseFirstName = userData.firstName?.trim() || 'Utilisateur';
  const baseLastName = userData.lastName?.trim() || '';
  const username =
    userData.username || `@${baseFirstName.toLowerCase()}${baseLastName.toLowerCase()}`.replace(/\s+/g, '');

  const showHostDashboard = hostDashboardStatus === 'approved';
  const showHostApplicationInfo = !showHostDashboard && Boolean(hostStatusMessage);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 0) + 4,
            borderBottomColor: isScrolled ? '#E5E7EB' : 'transparent',
          },
        ]}
      >
        <Text style={styles.headerTitle}>Profil</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.qrButton} onPress={onShowQRCode} activeOpacity={0.7}>
            <MaterialCommunityIcons name="qrcode-scan" size={22} color="#2ECC71" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.powerButton}
            onPress={() => setShowLogoutConfirm(true)}
            activeOpacity={0.7}
          >
            <Feather name="power" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={({ nativeEvent }) => {
          setIsScrolled(nativeEvent.contentOffset.y > 2);
        }}
        scrollEventThrottle={16}
      >
        <View style={[styles.profileInfo, isScrolled && styles.profileInfoDivider]}>
          <TouchableOpacity onPress={onProfileImagePress} activeOpacity={0.8}>
            <Image source={{ uri: userData.photo }} style={styles.profilePhoto} />
          </TouchableOpacity>

          <View style={styles.profileDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.fullName}>
                {userData.firstName} {userData.lastName}
              </Text>
              {userData.verified && (
                <Image source={feedVerifiedIcon} style={styles.verifiedBadge} />
              )}
            </View>

            <Text style={styles.username}>{username}</Text>

            {userData.companyName && (
              <View style={styles.companyRow}>
                {userData.companyLogoUrl ? (
                  <Image source={{ uri: userData.companyLogoUrl }} style={styles.companyLogo} />
                ) : (
                  <Feather name="briefcase" size={14} color="#6B7280" />
                )}
                <Text style={styles.companyNameText}>{userData.companyName}</Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.listings}</Text>
                <Text style={styles.statLabel}>annonce{stats.listings > 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.followers}</Text>
                <Text style={styles.statLabel}>abonnés</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.following}</Text>
                <Text style={styles.statLabel}>abonnements</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={onEditProfile} activeOpacity={0.8}>
            <Feather name="edit-2" size={16} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Éditer le profil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.messagesButton} onPress={onNavigateToMessages} activeOpacity={0.8}>
            <Feather name="message-circle" size={16} color="#374151" />
            <Text style={styles.messagesButtonText}>Messages</Text>
            {unreadMessagesCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{unreadMessagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {showHostDashboard && (
          <View style={styles.hostDashboardCard}>
            <View style={styles.hostDashboardHeader}>
              <View style={styles.hostDashboardTitlePill}>
                <Feather name="grid" size={16} color="#059669" />
                <Text style={styles.hostDashboardTitle}>Tableau de bord</Text>
              </View>
              <View style={[styles.hostStatusPill, styles.hostStatusApproved]}>
                <Feather name="check-circle" size={14} color="#15803D" />
                <Text style={[styles.hostStatusText, styles.hostStatusTextVerified]}>Hôte approuvé</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.hostDashboardButton}
              activeOpacity={0.85}
              onPress={onHostDashboardPress}
            >
              <Feather name="grid" size={18} color="#FFFFFF" />
              <Text style={styles.hostDashboardButtonText}>Accéder à mon tableau de bord</Text>
            </TouchableOpacity>
          </View>
        )}

        {showHostApplicationInfo && hostStatusMessage && (
          <View
            style={[
              styles.hostStatusInfoCard,
              hostDashboardStatus === 'rejected'
                ? styles.hostStatusInfoCardRejected
                : styles.hostStatusInfoCardPending,
            ]}
          >
            <Feather
              name={hostDashboardStatus === 'rejected' ? 'slash' : 'clock'}
              size={18}
              color={hostDashboardStatus === 'rejected' ? '#7F1D1D' : '#92400E'}
            />
            <Text style={styles.hostStatusInfoText}>{hostStatusMessage}</Text>
          </View>
        )}

        <View style={styles.statsCards}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Feather name="eye" size={24} color="#2ECC71" />
            </View>
            <Text style={styles.statCardLabel}>Vues</Text>
            <Text style={styles.statCardValue}>
              {stats.views >= 1000 ? `${(stats.views / 1000).toFixed(1)}K` : stats.views}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.statCard}
            onPress={onLikesPress}
            activeOpacity={0.7}
            disabled={!onLikesPress}
          >
            <View style={styles.statIconContainer}>
              <Feather name="heart" size={24} color="#2ECC71" />
            </View>
            <Text style={styles.statCardLabel}>Likes</Text>
            <Text style={styles.statCardValue}>{stats.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={onCommentsPress} activeOpacity={0.7}>
            <View style={styles.statIconContainer}>
              <Feather name="message-square" size={24} color="#2ECC71" />
              {unreadCommentsCount > 0 && (
                <View style={styles.statNotificationBadge}>
                  <Text style={styles.statNotificationText}>{unreadCommentsCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.statCardLabel}>Commentaires</Text>
            <Text style={styles.statCardValue}>{stats.comments}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuItem} onPress={onNavigateToReservations} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Feather name="calendar" size={20} color="#2ECC71" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>Réservations</Text>
                <Text style={styles.menuItemSubtitle}>
                  {reservationsCount} active{reservationsCount > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>

          {showListingsMenu && (
            <TouchableOpacity style={styles.menuItem} onPress={onNavigateToListings} activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Feather name="home" size={20} color="#2ECC71" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuItemTitle}>Annonces</Text>
                  <Text style={styles.menuItemSubtitle}>{stats.listings} annonce</Text>
                </View>
              </View>
              <Text style={styles.chevronIcon}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={onNavigateToContents} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Feather name="upload" size={20} color="#2ECC71" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>Mes contenus</Text>
                <Text style={styles.menuItemSubtitle}>0 contenu publié</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={onNavigateToReviews} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Feather name="star" size={20} color="#2ECC71" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>Avis</Text>
                <Text style={styles.menuItemSubtitle}>
                  {reviewsCount} avis publié{reviewsCount > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={onNavigateToSupport}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Feather name="phone" size={20} color="#2ECC71" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>Contactez-nous</Text>
                <Text style={styles.menuItemSubtitle}>Support PUOL</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showLogoutConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Déconnexion</Text>
            <Text style={styles.modalMessage}>Êtes-vous sûr de vouloir vous déconnecter ?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLogoutConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutButtonText}>Déconnexion</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 120,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginTop: -40,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  qrButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    marginTop: -42,
  },
  profileInfoDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomColor: '#E5E7EB',
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
  },
  profileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fullName: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  username: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  companyLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F3F4F6',
  },
  companyNameText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#374151',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginLeft: -50,
    marginRight: -10,
    paddingLeft: 24,
    paddingRight: 15,
  },
  statItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionButtons: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2ECC71',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messagesButton: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  messagesButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hostDashboardCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
  },
  hostDashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostDashboardTitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  hostDashboardTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  hostStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  hostStatusApproved: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderColor: '#34D399',
  },
  hostStatusText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
  },
  hostStatusTextVerified: {
    color: '#15803D',
  },
  hostDashboardUnavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#CFFADE',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hostDashboardUnavailableText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  hostDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2ECC71',
    borderRadius: 32,
    paddingVertical: 14,
  },
  hostDashboardButtonDisabled: {
    opacity: 0.55,
  },
  hostDashboardButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
  },
  hostDashboardHint: {
    marginTop: 8,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  hostStatusInfoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  hostStatusInfoCardPending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  hostStatusInfoCardRejected: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  hostStatusInfoText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
  },
  statsCards: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  statNotificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNotificationText: {
    fontFamily: 'Manrope',
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statCardLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statCardValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  menuList: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  chevronIcon: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  logoutButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ProfileScreen;
