import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import ProfileScreen from '@/components/ProfileScreen';
import { AuthModal } from '@/components/auth/AuthModal';
import { LoginWithOTPScreen } from '@/components/auth/LoginWithOTPScreen';
import { SignUpScreen } from '@/components/auth/SignUpScreen';
import { useReservations } from '@/src/contexts/ReservationContext';
import { useAuth, type AuthUser } from '@/src/contexts/AuthContext';
import { useProfile } from '@/src/contexts/ProfileContext';

const buildFallbackAvatar = (firstName: string, lastName: string) => {
  const fullName = `${firstName} ${lastName}`.trim() || 'PUOL User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2ECC71&color=ffffff&bold=true`;
};

export default function ProfileTabScreen() {
  const router = useRouter();
  const { reservations } = useReservations();
  const { isLoggedIn, logout, supabaseProfile, isLoading } = useAuth();
  const { profile, isProfileLoading } = useProfile();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [showSignUpScreen, setShowSignUpScreen] = useState(false);
  const reservationsCount = reservations.length;

  useEffect(() => {
    if (isLoggedIn) {
      setShowAuthModal(false);
      setShowLoginScreen(false);
      setShowSignUpScreen(false);
    } else {
      setShowLoginScreen(false);
      setShowSignUpScreen(false);
    }
  }, [isLoggedIn]);

  const openAuthFlow = () => {
    setShowAuthModal(true);
  };

  const handleLoginAuthenticated = () => {
    setShowLoginScreen(false);
    setShowAuthModal(false);
  };

  const handleSignUpSuccess = (_user: AuthUser) => {
    setShowSignUpScreen(false);
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('[ProfileTab] logout error', error);
    } finally {
      setShowAuthModal(false);
      setShowLoginScreen(false);
      setShowSignUpScreen(false);
    }
  };

  const hostDashboardStatus = useMemo(() => {
    if (!profile) {
      return undefined;
    }

    if (profile.role === 'host' && profile.hostStatus === 'approved') {
      return 'approved' as const;
    }

    if (profile.hostStatus === 'pending') {
      return 'pending' as const;
    }

    if (profile.hostStatus === 'rejected') {
      return 'rejected' as const;
    }

    return undefined;
  }, [profile]);

  const hostStatusMessage = useMemo(() => {
    switch (hostDashboardStatus) {
      case 'pending':
        return 'Votre demande pour devenir hôte est en cours de vérification.';
      case 'rejected':
        return 'Votre demande pour devenir hôte a été refusée.';
      default:
        return undefined;
    }
  }, [hostDashboardStatus]);

  if (!isLoggedIn) {
    return (
      <>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedTitle}>Connectez-vous pour accéder à votre profil</Text>
          <Text style={styles.lockedSubtitle}>
            Retrouvez vos réservations, vos favoris et vos informations personnelles.
          </Text>
          <TouchableOpacity style={styles.lockedButton} activeOpacity={0.85} onPress={openAuthFlow}>
            <Text style={styles.lockedButtonText}>Se connecter / Créer un compte</Text>
          </TouchableOpacity>
        </View>

        <AuthModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={() => {
            setShowAuthModal(false);
            setShowLoginScreen(true);
          }}
          onSignUp={() => {
            setShowAuthModal(false);
            setShowSignUpScreen(true);
          }}
          message="Connectez-vous pour accéder à votre profil"
        />
        <LoginWithOTPScreen
          visible={showLoginScreen}
          onClose={() => {
            setShowLoginScreen(false);
            if (!isLoggedIn) {
              setShowAuthModal(true);
            }
          }}
          onAuthenticated={handleLoginAuthenticated}
          onRequestSignUp={() => {
            setShowLoginScreen(false);
            setShowSignUpScreen(true);
          }}
        />
        <SignUpScreen
          visible={showSignUpScreen}
          onClose={() => {
            setShowSignUpScreen(false);
            if (!isLoggedIn) {
              setShowAuthModal(true);
            }
          }}
          onSuccess={handleSignUpSuccess}
        />
      </>
    );
  }

  if (isLoading || isProfileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2ECC71" />
        <Text style={styles.loadingText}>Chargement de votre profil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Profil introuvable.</Text>
      </View>
    );
  }

  return (
    <ProfileScreen
      userData={{
        firstName: profile.firstName,
        lastName: profile.lastName,
        photo: profile.avatarUrl || buildFallbackAvatar(profile.firstName, profile.lastName),
        username: profile.username,
        verified: Boolean(supabaseProfile?.is_certified),
        companyName: profile.enterpriseName,
        companyLogoUrl: profile.enterpriseLogoUrl,
        stats: profile.stats,
      }}
      reservationsCount={reservationsCount}
      reviewsCount={profile.stats?.comments ?? 0}
      unreadMessagesCount={0}
      unreadCommentsCount={0}
      onEditProfile={() => router.push('/profile/edit' as never)}
      onNavigateToMessages={() => router.push('/messages' as never)}
      onNavigateToReservations={() => router.push('/reservations' as never)}
      onNavigateToListings={() => router.push('/listings' as never)}
      onNavigateToContents={() => router.push('/contents' as never)}
      onNavigateToReviews={() => router.push('/reviews' as never)}
      onNavigateToSupport={() => router.push('/support' as never)}
      onShowQRCode={() => {}}
      onLogout={handleLogout}
      onProfileImagePress={() => {}}
      onCommentsPress={() => router.push('/comments' as never)}
      onLikesPress={() => router.push('/likes' as never)}
      hostDashboardStatus={hostDashboardStatus}
      hostStatusMessage={hostStatusMessage}
      onHostDashboardPress={() => router.push('/host-dashboard' as never)}
      showListingsMenu={profile.role === 'user'}
    />
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  lockedTitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  lockedButton: {
    marginTop: 8,
    backgroundColor: '#2ECC71',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  lockedButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
});
