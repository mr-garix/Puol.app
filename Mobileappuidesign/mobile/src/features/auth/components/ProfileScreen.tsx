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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import feedVerifiedIcon from '@/assets/icons/feed-icon-verified.png';

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
  reservationsLoading?: boolean;
  reservationsError?: string | null;
  onRetryReservations?: () => void;
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
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onViewsPress?: () => void;
  hostDashboardStatus?: 'approved' | 'pending' | 'rejected';
  hostStatusMessage?: string;
  onHostDashboardPress?: () => void;
  landlordDashboardStatus?: 'approved' | 'pending' | 'rejected';
  landlordStatusMessage?: string;
  onLandlordDashboardPress?: () => void;
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
  onFollowersPress,
  onFollowingPress,
  onViewsPress,
  hostDashboardStatus,
  hostStatusMessage,
  onHostDashboardPress,
  landlordDashboardStatus,
  landlordStatusMessage,
  onLandlordDashboardPress,
  showListingsMenu = true,
  reservationsLoading = false,
  reservationsError = null,
  onRetryReservations,
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const insets = useSafeAreaInsets();
  const [isScrolled, setIsScrolled] = useState(false);
  const isAndroid = Platform.OS === 'android';

  const stats = {
    listings: userData.stats?.listings ?? 0,
    followers: userData.stats?.followers ?? 0,
    following: userData.stats?.following ?? 0,
    views: userData.stats?.views ?? 0,
    likes: userData.stats?.likes ?? 0,
    comments: userData.stats?.comments ?? 0,
  };

  const publicationLabel = 'publications';

  const reservationsSubtitle = reservationsLoading
    ? 'Chargement...'
    : reservationsError
      ? 'Erreur de chargement'
      : `${reservationsCount} réservation${reservationsCount > 1 ? 's' : ''}`;

  const handleReservationsPress = () => {
    if (reservationsError && onRetryReservations) {
      onRetryReservations();
      return;
    }
    onNavigateToReservations();
  };

  const baseFirstName = userData.firstName?.trim() || 'Utilisateur';
  const baseLastName = userData.lastName?.trim() || '';
  const username =
    userData.username || `@${baseFirstName.toLowerCase()}${baseLastName.toLowerCase()}`.replace(/\s+/g, '');

  const showHostDashboard = hostDashboardStatus === 'approved';
  const isHostDashboardPending = hostDashboardStatus === 'pending';
  const shouldShowHostDashboardCard = showHostDashboard || isHostDashboardPending;
  const showHostApplicationInfo = Boolean(hostStatusMessage);
  const showLandlordDashboard = landlordDashboardStatus === 'approved';
  const isLandlordDashboardPending = landlordDashboardStatus === 'pending';
  const shouldShowLandlordDashboardCard = showLandlordDashboard || isLandlordDashboardPending;
  const showLandlordApplicationInfo = Boolean(landlordStatusMessage);
  const canOpenLandlordDashboard = showLandlordDashboard && typeof onLandlordDashboardPress === 'function';
  const landlordDashboardHint = isLandlordDashboardPending
    ? 'Disponible après validation de ton compte bailleur.'
    : !canOpenLandlordDashboard && shouldShowLandlordDashboardCard
      ? 'Le tableau de bord bailleur sera bientôt disponible.'
      : null;
  const topFoldHeight = isAndroid ? 0 : 360;
  const headerPaddingTop = isAndroid ? Math.max(insets.top, 16) : Math.max(insets.top, 0) + 4;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {!isAndroid && (
        <View
          pointerEvents="none"
          style={[
            styles.topBackground,
            {
              height: topFoldHeight + Math.max(insets.top, 0),
            },
          ]}
        />
      )}

      <View
        style={[
          styles.header,
          isAndroid
            ? {
                marginTop: 0,
                paddingHorizontal: 20,
                paddingTop: headerPaddingTop,
                paddingBottom: 16,
                backgroundColor: '#FFFFFF',
                borderBottomColor: '#E5E7EB',
                shadowOpacity: isScrolled ? 0.08 : 0,
                shadowRadius: isScrolled ? 4 : 0,
                elevation: isScrolled ? 2 : 0,
              }
            : {
                paddingTop: headerPaddingTop,
                backgroundColor: isScrolled ? '#FFFFFF' : 'transparent',
                borderBottomColor: isScrolled ? '#E5E7EB' : 'transparent',
                shadowOpacity: isScrolled ? 0.05 : 0,
                shadowRadius: isScrolled ? 4 : 0,
                elevation: isScrolled ? 4 : 0,
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
        contentContainerStyle={[styles.scrollContent, isAndroid && styles.scrollContentAndroid]}
        onScroll={({ nativeEvent }) => {
          setIsScrolled(nativeEvent.contentOffset.y > 2);
        }}
        scrollEventThrottle={16}
      >
        <View
          style={[
            styles.profileInfo,
            isScrolled && (isAndroid ? styles.profileInfoDividerAndroid : styles.profileInfoDividerIos),
            isAndroid && styles.profileInfoAndroid,
          ]}
        >
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
                <Text style={[styles.statLabel, styles.statLabelCentered]}>{publicationLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.statItem}
                onPress={onFollowersPress}
                activeOpacity={onFollowersPress ? 0.75 : 1}
                disabled={!onFollowersPress}
              >
                <Text style={styles.statValue}>{stats.followers}</Text>
                <Text style={[styles.statLabel, styles.statLabelCentered]}>followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={onFollowingPress}
                activeOpacity={onFollowingPress ? 0.75 : 1}
                disabled={!onFollowingPress}
              >
                <Text style={styles.statValue}>{stats.following}</Text>
                <Text style={[styles.statLabel, styles.statLabelCentered]}>suivi(e)s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.actionButtons, isAndroid && styles.actionButtonsAndroid, !isAndroid && styles.actionButtonsIos]}>
          <TouchableOpacity style={styles.editButton} onPress={onEditProfile} activeOpacity={0.8}>
            <Feather name="edit-2" size={16} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Éditer le profil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.messagesButton} onPress={onNavigateToMessages} activeOpacity={0.8}>
            <Feather name="message-circle" size={16} color="#374151" />
            <Text style={styles.messagesButtonText}>Messages</Text>
            {unreadMessagesCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{unreadMessagesCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {showHostApplicationInfo && hostStatusMessage ? (
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
        ) : null}

        {shouldShowHostDashboardCard ? (
          <View style={[styles.hostDashboardCard, isHostDashboardPending && styles.hostDashboardCardPending]}>
            <View style={styles.hostDashboardHeader}>
              <View style={styles.hostDashboardTitlePill}>
                <Feather name="grid" size={16} color={isHostDashboardPending ? '#0F172A' : '#059669'} />
                <Text style={styles.hostDashboardTitle}>Tableau de bord</Text>
              </View>
              <View
                style={[
                  styles.hostStatusPill,
                  showHostDashboard ? styles.hostStatusApproved : styles.hostStatusPending,
                ]}
              >
                <Feather
                  name={showHostDashboard ? 'check-circle' : 'clock'}
                  size={14}
                  color={showHostDashboard ? '#15803D' : '#92400E'}
                />
                <Text
                  style={[
                    styles.hostStatusText,
                    showHostDashboard ? styles.hostStatusTextVerified : styles.hostStatusTextPending,
                  ]}
                >
                  {showHostDashboard ? 'Hôte vérifié' : 'En vérification'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.hostDashboardButton,
                isHostDashboardPending && styles.hostDashboardButtonDisabled,
              ]}
              activeOpacity={showHostDashboard ? 0.85 : 1}
              onPress={showHostDashboard ? onHostDashboardPress : undefined}
              disabled={isHostDashboardPending}
            >
              <Feather name="grid" size={18} color="#FFFFFF" opacity={isHostDashboardPending ? 0.65 : 1} />
              <Text style={styles.hostDashboardButtonText}>Accéder à mon tableau de bord</Text>
            </TouchableOpacity>

            {isHostDashboardPending ? (
              <Text style={styles.hostDashboardHint}>Disponible après validation de ton compte hôte.</Text>
            ) : null}
          </View>
        ) : null}

        {showLandlordApplicationInfo && landlordStatusMessage ? (
          <View
            style={[
              styles.landlordStatusInfoCard,
              landlordDashboardStatus === 'rejected'
                ? styles.landlordStatusInfoCardRejected
                : styles.landlordStatusInfoCardPending,
            ]}
          >
            <Feather
              name={landlordDashboardStatus === 'rejected' ? 'slash' : 'clock'}
              size={18}
              color={landlordDashboardStatus === 'rejected' ? '#7F1D1D' : '#92400E'}
            />
            <Text style={styles.landlordStatusInfoText}>{landlordStatusMessage}</Text>
          </View>
        ) : null}

        {shouldShowLandlordDashboardCard ? (
          <View
            style={[styles.landlordDashboardCard, isLandlordDashboardPending && styles.landlordDashboardCardPending]}
          >
            <View style={styles.landlordDashboardHeader}>
              <View style={styles.landlordDashboardTitlePill}>
                <Feather name="briefcase" size={16} color={isLandlordDashboardPending ? '#0F172A' : '#059669'} />
                <Text style={styles.landlordDashboardTitle}>Tableau de bord</Text>
              </View>
              <View
                style={[
                  styles.landlordStatusPill,
                  showLandlordDashboard ? styles.landlordStatusApproved : styles.landlordStatusPending,
                ]}
              >
                <Feather
                  name={showLandlordDashboard ? 'check-circle' : 'clock'}
                  size={14}
                  color={showLandlordDashboard ? '#15803D' : '#92400E'}
                />
                <Text
                  style={[
                    styles.landlordStatusText,
                    showLandlordDashboard ? styles.landlordStatusTextVerified : styles.landlordStatusTextPending,
                  ]}
                >
                  {showLandlordDashboard ? 'Bailleur vérifié' : 'En vérification'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.landlordDashboardButton, !canOpenLandlordDashboard && styles.landlordDashboardButtonDisabled]}
              activeOpacity={canOpenLandlordDashboard ? 0.85 : 1}
              onPress={canOpenLandlordDashboard ? onLandlordDashboardPress : undefined}
              disabled={!canOpenLandlordDashboard}
            >
              <Feather name="briefcase" size={18} color="#FFFFFF" opacity={!canOpenLandlordDashboard ? 0.65 : 1} />
              <Text style={styles.landlordDashboardButtonText}>Accéder à mon tableau de bord bailleur</Text>
            </TouchableOpacity>

            {landlordDashboardHint ? <Text style={styles.landlordDashboardHint}>{landlordDashboardHint}</Text> : null}
          </View>
        ) : null}

        <View style={styles.statsCards}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={onViewsPress}
            activeOpacity={onViewsPress ? 0.7 : 1}
            disabled={!onViewsPress}
          >
            <View style={styles.statIconContainer}>
              <Feather name="eye" size={24} color="#2ECC71" />
            </View>
            <Text style={styles.statCardLabel}>Vues</Text>
            <Text style={styles.statCardValue}>
              {stats.views >= 1000 ? `${(stats.views / 1000).toFixed(1)}K` : stats.views}
            </Text>
          </TouchableOpacity>

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
          <TouchableOpacity style={styles.menuItem} onPress={handleReservationsPress} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Feather name="calendar" size={20} color="#2ECC71" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>Réservations</Text>
                <Text
                  style={[
                    styles.menuItemSubtitle,
                    reservationsError && styles.menuItemSubtitleError,
                  ]}
                >
                  {reservationsSubtitle}
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
                  <Text style={styles.menuItemSubtitle}>
                    {stats.listings} annonces
                  </Text>
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
  scrollContentAndroid: {
    paddingTop: 24,
    paddingBottom: 96,
  },
  topBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
    zIndex: 0,
  },
  header: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 0,
    elevation: 0,
    marginTop: -40,
  },
  profileInfoAndroid: {
    marginTop: -30,
    paddingHorizontal: 20,
    paddingTop: 24,
    borderBottomColor: 'transparent',
    borderBottomWidth: 0,
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
  profileInfoDividerIos: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomWidth: 0,
  },
  profileInfoDividerAndroid: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomWidth: 1,
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
    color: '#334155',
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
    alignItems: 'center',
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
  statLabelCentered: {
    alignSelf: 'center',
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
  actionButtonsIos: {
    borderTopWidth: 0,
  },
  actionButtonsAndroid: {
    borderBottomWidth: 0,
    paddingTop: 0,
    paddingBottom: 16,
    transform: [{ translateY: -10 }],
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
  hostDashboardCardPending: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5F5',
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
  hostStatusPending: {
    backgroundColor: 'rgba(252, 211, 77, 0.18)',
    borderColor: '#FBBF24',
  },
  hostStatusText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
  },
  hostStatusTextVerified: {
    color: '#15803D',
  },
  hostStatusTextPending: {
    color: '#92400E',
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
    backgroundColor: '#94A3B8',
    opacity: 0.6,
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
  landlordStatusInfoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  landlordStatusInfoCardPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  landlordStatusInfoCardRejected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  landlordStatusInfoText: {
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
  statCardTextBlock: {
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
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
  landlordDashboardCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
  },
  landlordDashboardCardPending: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5F5',
  },
  landlordDashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  landlordDashboardTitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  landlordDashboardTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  landlordStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  landlordStatusApproved: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderColor: '#34D399',
  },
  landlordStatusPending: {
    backgroundColor: 'rgba(252, 211, 77, 0.18)',
    borderColor: '#FBBF24',
  },
  landlordStatusText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
  },
  landlordStatusTextVerified: {
    color: '#15803D',
  },
  landlordStatusTextPending: {
    color: '#92400E',
  },
  landlordDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2ECC71',
    borderRadius: 32,
    paddingVertical: 14,
  },
  landlordDashboardButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  landlordDashboardButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
  },
  landlordDashboardHint: {
    marginTop: 8,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
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
  menuItemSubtitleError: {
    color: '#DC2626',
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
