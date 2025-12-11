import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated as RNAnimated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  InteractionManager,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';

import { Video, ResizeMode } from 'expo-av';
import { openPhone, openWhatsApp, PropertyData } from '@/src/data/properties';
import { formatAddressLine, formatDistrictCity } from '@/src/utils/location';
import { CommentWithAuthor } from '@/src/features/comments/types';
import { useComments } from '@/src/features/comments/hooks';
import { CommentBottomSheet } from '@/src/features/host/components/CommentBottomSheet';
import { AuthModal } from '@/src/features/auth/components/AuthModal';
import { LoginWithOTPScreen } from '@/src/features/auth/components/LoginWithOTPScreen';
import { SignUpScreen } from '@/src/features/auth/components/SignUpScreen';
import { ReservationModal } from '@/src/features/bookings/components/ReservationModal';
import { VisitPaymentDialog } from '@/src/features/payments/components/VisitPaymentDialog';
import { VisitScheduleModal } from '@/src/features/visits/components/VisitScheduleModal';
import { PaymentModal } from '@/src/features/payments/components/PaymentModal';
import { PaymentSuccessModal } from '@/src/features/payments/components/PaymentSuccessModal';
import { ChatbotPopup } from '@/src/components/ui/ChatbotPopup';
import { useAuth } from '@/src/contexts/AuthContext';
import type { AuthUser } from '@/src/contexts/AuthContext';
import { useVisits } from '@/src/contexts/VisitsContext';
import { useReservations, type NewReservationInput } from '@/src/contexts/ReservationContext';
import { computeUpfrontPayment } from '@/src/utils/reservationPayment';
import { buildListingShareUrl } from '@/src/utils/helpers';
import { useListingDetails } from '@/src/features/listings/hooks';
import type { FullListing, HostProfileSummary } from '@/src/types/listings';
import { hasUserLikedListing, toggleListingLike } from '@/src/features/likes/services';
import { useFollowState } from '@/src/features/follows/hooks/useFollowState';
import { recordListingShare, resolveShareChannel } from '@/src/features/listings/services/shareService';
import { useListingReviews } from '@/src/features/reviews/hooks/useListingReviews';
import { firebaseAuth } from '@/src/firebaseClient';
import { syncSupabaseSession } from '@/src/features/auth/supabaseSession';
import { supabase } from '@/src/supabaseClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.58;
const SHEET_SNAP_POINT = HERO_HEIGHT - 140;
const SNAP_FADE_DISTANCE = 30;
const VERIFIED_BADGE_ICON = require('@/assets/icons/feed-icon-verified.png');
const VISIT_PRICE_FCFA = 5000;
const PROFILE_TAB_ROUTE: Href = '/';
const VISITS_ROUTE: Href = '/visits';
type AuthPurpose = 'visit' | 'reservation' | 'chat' | 'follow' | 'like' | 'review';
const FEATURE_PREVIEW_COUNT = 9;
const REVIEW_FORM_RADIUS = 28;
const REVIEW_FORM_IDLE_OFFSET = 40;
const REVIEW_FORM_CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 400);
const NEAR_MAIN_ROAD_LABELS: Record<string, string> = {
  within_100m: 'À moins de 100 m',
  beyond_200m: 'À plus de 200 m',
};

const translateRoadProximity = (value?: string | null) => {
  if (!value) {
    return null;
  }
  return NEAR_MAIN_ROAD_LABELS[value] ?? value;
};

function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .toLowerCase();
}

const normalizeAvailabilityDate = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
};

const formatReviewDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  if (diffMs < 0) {
    return parsed.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return "Aujourd'hui";
  }
  if (diffDays === 1) {
    return 'Il y a 1 jour';
  }
  if (diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  }
  if (diffDays === 7) {
    return 'Il y a une semaine';
  }

  return parsed.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

type SortOption = 'pertinents' | 'recents' | 'haute' | 'basse';

const SORT_OPTION_LABELS: Record<SortOption, string> = {
  pertinents: 'Les plus pertinents',
  recents: 'Les plus récents',
  haute: 'Note la plus élevée',
  basse: 'Note la plus basse',
};

type RatingBreakdown = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

const CHARACTERISTIC_PRIORITY_KEYWORDS = [
  'salon',
  'cuisine',
  'salle de bain',
  'chambre',
  'parking',
  'prépayé',
].map((keyword) => normalizeLabel(keyword));

const formatMemberTenure = (joinedAt: string | null): string | null => {
  if (!joinedAt) {
    return null;
  }

  const joinedDate = new Date(joinedAt);
  if (Number.isNaN(joinedDate.getTime())) {
    return null;
  }

  const formatTenureUnit = (count: number, singular: string, plural: string) => {
    return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
  };

  const now = new Date();
  const diffMs = now.getTime() - joinedDate.getTime();
  if (diffMs <= 0) {
    return 'Activité très récente sur PUOL';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 60) {
    return `${formatTenureUnit(diffMinutes, 'minute', 'minutes')} d’activité sur PUOL`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${formatTenureUnit(diffHours, 'heure', 'heures')} d’activité sur PUOL`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${formatTenureUnit(diffDays, 'jour', 'jours')} d’activité sur PUOL`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${formatTenureUnit(diffWeeks, 'semaine', 'semaines')} d’activité sur PUOL`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${formatTenureUnit(diffMonths, 'mois', 'mois')} d’activité sur PUOL`;
  }

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears < 10) {
    return `${formatTenureUnit(diffYears, 'an', 'ans')} d’activité sur PUOL`;
  }

  return 'Plus de 10 ans d’activité sur PUOL';
};

const FALLBACK_LANDLORD_AVATAR = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80&auto=format';
const FALLBACK_LANDLORD_NAME = 'Hôte PUOL';
const FALLBACK_PHONE = '+237600000000';
const FALLBACK_COORDINATES = { lat: 0, lng: 0 } as const;
type AvailabilityStatus = 'available' | 'blocked' | 'reserved';

const AVAILABILITY_STATUS_META: Record<AvailabilityStatus, { label: string; badgeColor: string; textColor: string }> = {
  available: {
    label: 'Disponible',
    badgeColor: 'rgba(46,204,113,0.12)',
    textColor: '#1B5E20',
  },
  blocked: {
    label: 'Bloqué par l’hôte',
    badgeColor: 'rgba(220,38,38,0.1)',
    textColor: '#991B1B',
  },
  reserved: {
    label: 'Réservé',
    badgeColor: 'rgba(249,115,22,0.1)',
    textColor: '#9A3412',
  },
};

const formatAvailabilityStatus = (status: AvailabilityStatus) => {
  return AVAILABILITY_STATUS_META[status] ?? AVAILABILITY_STATUS_META.available;
};

const normalizePropertyType = (type?: string | null): PropertyData['type'] => {
  const normalized = type?.toLowerCase();
  const allowed: PropertyData['type'][] = ['studio', 'chambre', 'apartment', 'house', 'villa', 'boutique'];
  if (normalized && (allowed as string[]).includes(normalized)) {
    return normalized as PropertyData['type'];
  }
  return 'apartment';
};

const buildHostDisplayName = (profile?: HostProfileSummary | null) => {
  const tokens = [profile?.first_name, profile?.last_name].filter((value) => value && value.trim()) as string[];
  if (tokens.length) {
    return tokens.join(' ').trim();
  }
  return profile?.username ? `@${profile.username}` : FALLBACK_LANDLORD_NAME;
};

const buildPropertyFromFullListing = (full: FullListing): PropertyData => {
  const listing = full.listing;
  const images = full.gallery.length ? full.gallery : [listing.cover_photo_url];
  const hostProfile = full.hostProfile;
  const landlordName = buildHostDisplayName(hostProfile);
  const landlordAvatar = hostProfile?.avatar_url || FALLBACK_LANDLORD_AVATAR;
  const landlordUsername = hostProfile?.username ?? null;
  const landlordPhone = hostProfile?.phone ?? FALLBACK_PHONE;
  const landlordId = hostProfile?.id ?? listing.host_id ?? undefined;

  const amenities = [...full.featureBadges];
  const roadProximityBadge = translateRoadProximity(full.features?.near_main_road);
  if (roadProximityBadge) {
    amenities.push(`Proche route (${roadProximityBadge})`);
  }
  const isFurnished = Boolean(listing.is_furnished);

  const isLongTerm = listing.rental_kind === 'long_term';
  if (isLongTerm) {
    const monthlyAmenities: string[] = [];
    if (listing.deposit_amount) {
      monthlyAmenities.push(`Caution ${listing.deposit_amount.toLocaleString('fr-FR')} FCFA`);
    }
    if (listing.min_lease_months) {
      monthlyAmenities.push(`Bail min ${listing.min_lease_months} mois`);
    }
    amenities.unshift(...monthlyAmenities);
  }

  return {
    id: listing.id,
    type: normalizePropertyType(listing.property_type),
    isFurnished,
    title: listing.title,
    description: listing.description,
    price: Math.round((isLongTerm ? listing.price_per_month : listing.price_per_night) ?? 0).toString(),
    priceType: isLongTerm ? 'monthly' : 'daily',
    deposit: isLongTerm && listing.deposit_amount ? Math.round(listing.deposit_amount).toString() : undefined,
    location: {
      // Utiliser directement address_text comme adresse, avec un fallback sur 'quartier, ville' si nécessaire
      address: listing.address_text ?? (listing.district && listing.city 
        ? `${listing.district}, ${listing.city}`
        : listing.district || listing.city || ''),
      neighborhood: listing.district ?? '',
      city: listing.city ?? '',
      coordinates: listing.latitude && listing.longitude ? { lat: listing.latitude, lng: listing.longitude } : FALLBACK_COORDINATES,
    },
    images,
    landlord: {
      id: landlordId,
      name: landlordName,
      avatar: landlordAvatar,
      verified: Boolean(hostProfile?.is_certified),
      rating: 4.8,
      reviewsCount: 0,
      username: landlordUsername,
      phone: landlordPhone,
      enterpriseName: hostProfile?.enterprise_name ?? null,
      enterpriseLogoUrl: hostProfile?.enterprise_logo_url ?? null,
    },
    bedrooms: full.rooms.bedrooms,
    bathrooms: full.rooms.bathrooms,
    kitchens: full.rooms.kitchen,
    livingRooms: full.rooms.living,
    surfaceArea: undefined,
    likes: 0,
    views: 0,
    shares: 0,
    availableFrom: undefined,
    availableUntil: undefined,
    amenities,
    phoneNumber: landlordPhone,
    whatsapp: landlordPhone,
  };
};

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type IconDescriptor =
  | { library: 'Feather'; name: FeatherIconName }
  | { library: 'MaterialCommunityIcons'; name: MaterialIconName };

const renderIcon = (icon: IconDescriptor, size = 20, color = '#111827') => {
  if (icon.library === 'Feather') {
    return <Feather name={icon.name} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
};

const ICONS = {
  back: { library: 'Feather', name: 'arrow-left' as FeatherIconName },
  share: { library: 'Feather', name: 'share-2' as FeatherIconName },
  heart: { library: 'MaterialCommunityIcons', name: 'heart' as MaterialIconName },
  heartOutline: { library: 'MaterialCommunityIcons', name: 'heart-outline' as MaterialIconName },
  views: { library: 'Feather', name: 'eye' as FeatherIconName },
  comments: { library: 'Feather', name: 'message-circle' as FeatherIconName },
  star: { library: 'Feather', name: 'star' as FeatherIconName },
  location: { library: 'Feather', name: 'map-pin' as FeatherIconName },
  badgeCheck: { library: 'Feather', name: 'check' as FeatherIconName },
  successCheck: { library: 'Feather', name: 'check-circle' as FeatherIconName },
  livingRoom: { library: 'MaterialCommunityIcons', name: 'sofa' as MaterialIconName },
  kitchen: { library: 'MaterialCommunityIcons', name: 'stove' as MaterialIconName },
  bathroom: { library: 'MaterialCommunityIcons', name: 'shower-head' as MaterialIconName },
  parking: { library: 'MaterialCommunityIcons', name: 'car-outline' as MaterialIconName },
  prepaid: { library: 'MaterialCommunityIcons', name: 'lightbulb-on-outline' as MaterialIconName },
  bedroom: { library: 'MaterialCommunityIcons', name: 'bed-king-outline' as MaterialIconName },
  bedroomFilled: { library: 'MaterialCommunityIcons', name: 'bed' as MaterialIconName },
  surface: { library: 'MaterialCommunityIcons', name: 'ruler-square' as MaterialIconName },
  dining: { library: 'MaterialCommunityIcons', name: 'silverware-fork-knife' as MaterialIconName },
  toilets: { library: 'MaterialCommunityIcons', name: 'human-male-female' as MaterialIconName },
  ac: { library: 'Feather', name: 'wind' as FeatherIconName },
  wifi: { library: 'Feather', name: 'wifi' as FeatherIconName },
  generator: { library: 'Feather', name: 'zap' as FeatherIconName },
  water: { library: 'Feather', name: 'droplet' as FeatherIconName },
  heater: { library: 'Feather', name: 'thermometer' as FeatherIconName },
  security: { library: 'Feather', name: 'shield' as FeatherIconName },
  camera: { library: 'Feather', name: 'video' as FeatherIconName },
  fan: { library: 'Feather', name: 'refresh-cw' as FeatherIconName },
  ceilingFan: { library: 'MaterialCommunityIcons', name: 'fan' as MaterialIconName },
  film: { library: 'Feather', name: 'film' as FeatherIconName },
  monitor: { library: 'Feather', name: 'monitor' as FeatherIconName },
  washer: { library: 'MaterialCommunityIcons', name: 'washing-machine' as MaterialIconName },
  balcony: { library: 'Feather', name: 'home' as FeatherIconName },
  terrace: { library: 'Feather', name: 'grid' as FeatherIconName },
  garden: { library: 'MaterialCommunityIcons', name: 'flower' as MaterialIconName },
  pool: { library: 'MaterialCommunityIcons', name: 'pool' as MaterialIconName },
  faucet: { library: 'MaterialCommunityIcons', name: 'faucet' as MaterialIconName },
  gym: { library: 'MaterialCommunityIcons', name: 'dumbbell' as MaterialIconName },
  rooftop: { library: 'MaterialCommunityIcons', name: 'office-building' as MaterialIconName },
  elevator: { library: 'MaterialCommunityIcons', name: 'elevator-passenger' as MaterialIconName },
  accessibility: { library: 'MaterialCommunityIcons', name: 'wheelchair-accessibility' as MaterialIconName },
  mezzanine: { library: 'MaterialCommunityIcons', name: 'stairs-up' as MaterialIconName },
  netflix: { library: 'MaterialCommunityIcons', name: 'netflix' as MaterialIconName },
  sonnelMeter: { library: 'MaterialCommunityIcons', name: 'meter-electric' as MaterialIconName },
} satisfies Record<string, IconDescriptor>;

const FEATURE_ICON_MAP: Record<string, IconDescriptor> = {
  Climatisation: ICONS.ac,
  Wifi: ICONS.wifi,
  Parking: ICONS.parking,
  'Groupe électrogène': ICONS.generator,
  'Compteur prépayé': ICONS.prepaid,
  'Compteur SONNEL': ICONS.sonnelMeter,
  Forage: ICONS.faucet,
  'Chauffe-eau': ICONS.heater,
  'Sécurité 24/7': ICONS.security,
  CCTV: ICONS.camera,
  Ventilateur: ICONS.ceilingFan,
  TV: { library: 'MaterialCommunityIcons', name: 'television' as MaterialIconName },
  'Smart TV': ICONS.monitor,
  Netflix: ICONS.netflix,
  'Lave-linge': ICONS.washer,
  Balcon: ICONS.balcony,
  Terrasse: ICONS.terrace,
  Véranda: ICONS.balcony,
  Mezzanine: ICONS.mezzanine,
  Jardin: ICONS.garden,
  Piscine: ICONS.pool,
  'Salle de sport': ICONS.gym,
  Rooftop: ICONS.rooftop,
  Ascenseur: ICONS.elevator,
  'Accès PMR': ICONS.accessibility,
};

type Characteristic = { icon: IconDescriptor; label: string; value?: string };

const formatPrice = (price: string | number | undefined) => {
  if (!price) return '';
  const value = typeof price === 'string' ? parseInt(price, 10) : price;
  return value.toLocaleString('fr-FR');
};

const PropertyProfileScreen = () => {
  const params = useLocalSearchParams<{ id?: string; heroUri?: string; initialCommentId?: string; highlightReplyId?: string; source?: string }>();
  const propertyIdParam = params?.id;
  const initialCommentId = params?.initialCommentId;
  const highlightReplyIdParam = params?.highlightReplyId;
  const heroUriParam = useMemo(() => {
    const raw = params?.heroUri;
    if (!raw) return null;
    const value = Array.isArray(raw) ? raw[0] : raw;
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }, [params?.heroUri]);
  const highlightReplyId = useMemo(() => {
    if (!highlightReplyIdParam) {
      return null;
    }
    const value = Array.isArray(highlightReplyIdParam) ? highlightReplyIdParam[0] : highlightReplyIdParam;
    return value ?? null;
  }, [highlightReplyIdParam]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(0, insets.top + 12 - 20) + 5;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [showSignUpScreen, setShowSignUpScreen] = useState(false);
  const [authPurpose, setAuthPurpose] = useState<AuthPurpose>('visit');
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [showVisitPaymentDialog, setShowVisitPaymentDialog] = useState(false);
  const [showVisitScheduleModal, setShowVisitScheduleModal] = useState(false);
  const [showVisitPaymentModal, setShowVisitPaymentModal] = useState(false);
  const [showVisitSuccessModal, setShowVisitSuccessModal] = useState(false);
  const [showCommentsBottomSheet, setShowCommentsBottomSheet] = useState(false);
  const [pendingProfileNavigation, setPendingProfileNavigation] = useState<string | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [isHostAvatarVisible, setIsHostAvatarVisible] = useState(false);
  const hostSpinAnimRef = useRef(new RNAnimated.Value(0));
  const hostFlipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hostSpinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showHostEnterpriseAvatar, setShowHostEnterpriseAvatar] = useState(false);
  const [hostAvatarPreviewUri, setHostAvatarPreviewUri] = useState<string | null>(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const galleryPan = useRef(new RNAnimated.Value(0)).current;
  const [reservationSummary, setReservationSummary] = useState({
    checkIn: new Date(),
    checkOut: new Date(),
    nights: 0,
    total: 0,
    amountDueNow: 0,
    remainingAmount: 0,
    paymentScheme: 'full' as 'full' | 'split',
    originalTotal: 0,
    discountAmount: 0,
    discountPercent: null as number | null,
  });
  const [paymentNotice, setPaymentNotice] = useState('');
  const [visitSuccessCopy, setVisitSuccessCopy] = useState({
    title: 'Visite programmée !',
    message: 'Votre visite a été programmée. Nous vous tiendrons informé pour la confirmation.',
    buttonLabel: 'Voir ma visite',
  });
  const [visitDetails, setVisitDetails] = useState<{ date: Date | null; time: string }>({ date: null, time: '' });
  const pendingActionRef = useRef<(() => void) | null>(null);
  const { isLoggedIn, refreshProfile, supabaseProfile } = useAuth();
  const isAuthenticated = isLoggedIn;
  const wasLoggedInRef = useRef(isLoggedIn);
  const supabaseProfileRef = useRef(supabaseProfile);

  const {
    data: listingData,
    isLoading: isListingLoading,
    error: listingError,
    refresh: refreshListing,
  } = useListingDetails(propertyIdParam ?? null);

  const property = useMemo<PropertyData | null>(() => {
    if (listingData) {
      return buildPropertyFromFullListing(listingData);
    }
    return null;
  }, [listingData]);

  const propertyId = property?.id ?? null;
  const listingOwnerId = property?.landlord?.id ?? null;
  const isFurnished = property?.isFurnished ?? false;
  const isShop = property?.type === 'boutique';
  const shouldLoadReviews = isFurnished && !isShop;
  const isOwnListing = listingOwnerId && supabaseProfile?.id && listingOwnerId === supabaseProfile.id;
  const hostEnterpriseName = property?.landlord?.enterpriseName?.trim() || null;
  const hostEnterpriseLogoUrl = property?.landlord?.enterpriseLogoUrl?.trim() || null;
  const hostHasEnterpriseBranding = Boolean(hostEnterpriseName && hostEnterpriseLogoUrl);
  const hostAnimatedRotationY = hostSpinAnimRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const hostAnimatedOpacity = hostSpinAnimRef.current.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.4, 0.05, 0.4, 1],
  });

  const { addVisit, updateVisit, getVisitByPropertyId, fetchLatestVisitForListing, refreshVisits } = useVisits();
  const { reservations, addReservation, refreshReservations } = useReservations();

  const existingReservation = useMemo(() => {
    if (!property?.id) {
      return undefined;
    }
    return reservations.find(
      (reservation) => reservation.propertyId === property.id && reservation.status !== 'cancelled',
    );
  }, [reservations, property?.id]);

  const hasReservation = Boolean(existingReservation);

  useEffect(() => {
    const clearTimers = () => {
      if (hostFlipTimeoutRef.current) {
        clearTimeout(hostFlipTimeoutRef.current);
        hostFlipTimeoutRef.current = null;
      }
      if (hostSpinIntervalRef.current) {
        clearInterval(hostSpinIntervalRef.current);
        hostSpinIntervalRef.current = null;
      }
      hostSpinAnimRef.current.stopAnimation();
    };

    if (!hostHasEnterpriseBranding || isHostAvatarVisible) {
      setShowHostEnterpriseAvatar(false);
      clearTimers();
      hostSpinAnimRef.current.setValue(0);
      return;
    }

    const runSpin = () => {
      hostSpinAnimRef.current.stopAnimation();
      hostSpinAnimRef.current.setValue(0);
      if (hostFlipTimeoutRef.current) {
        clearTimeout(hostFlipTimeoutRef.current);
        hostFlipTimeoutRef.current = null;
      }

      RNAnimated.timing(hostSpinAnimRef.current, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          hostSpinAnimRef.current.setValue(0);
        }
      });

      hostFlipTimeoutRef.current = setTimeout(() => {
        setShowHostEnterpriseAvatar((prev) => !prev);
        hostFlipTimeoutRef.current = null;
      }, 350);
    };

    runSpin();
    hostSpinIntervalRef.current = setInterval(runSpin, 5000);

    return () => {
      clearTimers();
      hostSpinAnimRef.current.setValue(0);
    };
  }, [hostHasEnterpriseBranding, isHostAvatarVisible]);

  useEffect(() => {
    supabaseProfileRef.current = supabaseProfile;
  }, [supabaseProfile]);

  useEffect(() => {
    if (!existingReservation) {
      return;
    }

    const reservation = existingReservation;
    setReservationSummary({
      checkIn: new Date(reservation.checkInDate),
      checkOut: new Date(reservation.checkOutDate),
      nights: reservation.nights,
      total: reservation.totalPrice,
      amountDueNow: reservation.amountPaid ?? reservation.totalPrice,
      remainingAmount: reservation.amountRemaining ?? 0,
      paymentScheme: reservation.amountRemaining && reservation.amountRemaining > 0 ? 'split' : 'full',
      originalTotal: reservation.originalTotal ?? reservation.totalPrice,
      discountAmount: reservation.discountAmount ?? 0,
      discountPercent: reservation.discountPercent ?? null,
    });
  }, [existingReservation]);

  const mediaItems = useMemo(() => listingData?.media ?? [], [listingData]);
  const heroImageSource = useMemo(() => {
    // Utiliser la première image comme placeholder pour masquer le fond
    const firstImage = property?.images?.[0];
    return firstImage ? { uri: firstImage } : undefined;
  }, [property?.images]);
  const [heroVideoUri, setHeroVideoUri] = useState<string | null>(heroUriParam ?? null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false); // État pour savoir si la vidéo est prête
  const heroVideoId = useMemo(() => {
    const heroMedia = mediaItems.find((item) => item.type === 'video');
    return heroMedia?.id ?? null;
  }, [mediaItems]);
  const existingVisit = propertyId ? getVisitByPropertyId(propertyId) : undefined;
  const hasVisit = Boolean(existingVisit);
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [mediaItems.length]);

  useEffect(() => {
    setShowAllFeatures(false);
  }, [property?.id]);

  useEffect(() => {
    setHeroVideoUri(heroUriParam ?? null);
    setIsVideoLoaded(false); // Reset l'état de chargement
  }, [heroUriParam, property?.id]);

  useEffect(() => {
    if (!wasLoggedInRef.current && isLoggedIn) {
      setShowLoginScreen(false);
      setShowAuthModal(false);
      pendingActionRef.current?.();
      pendingActionRef.current = null;
      refreshProfile().catch((error) => {
        console.error('[PropertyProfileScreen] refreshProfile error', error);
      });
    }

    if (wasLoggedInRef.current && !isLoggedIn) {
      pendingActionRef.current = null;
    }

    wasLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn, refreshProfile]);

  useEffect(() => {
    if (existingVisit && !showVisitScheduleModal) {
      setVisitDetails({
        date: new Date(existingVisit.visitDate),
        time: existingVisit.visitTime,
      });
    }

    if (!existingVisit && !showVisitScheduleModal) {
      setVisitDetails((prev) => (prev.date ? prev : { date: null, time: '' }));
    }
  }, [existingVisit, showVisitScheduleModal]);

  useEffect(() => {
    if (!supabaseProfile?.id || !propertyId) {
      return;
    }

    void (async () => {
      try {
        const latest = await fetchLatestVisitForListing(propertyId);
        if (latest) {
          setVisitDetails({ date: new Date(latest.visitDate), time: latest.visitTime });
        }
      } catch (error) {
        console.error('[PropertyProfileScreen] fetchLatestVisitForListing failed', error);
      }
    })();
  }, [fetchLatestVisitForListing, propertyId, supabaseProfile?.id]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const handleHostAvatarPress = useCallback(() => {
    if (!property?.landlord) {
      return;
    }

    if (hostSpinIntervalRef.current) {
      clearInterval(hostSpinIntervalRef.current);
      hostSpinIntervalRef.current = null;
    }

    const fallbackAvatar = property.landlord.avatar || FALLBACK_LANDLORD_AVATAR;
    const currentUri =
      showHostEnterpriseAvatar && hostEnterpriseLogoUrl ? hostEnterpriseLogoUrl : fallbackAvatar;

    setHostAvatarPreviewUri(currentUri);
    setIsHostAvatarVisible(true);
  }, [hostEnterpriseLogoUrl, property?.landlord, showHostEnterpriseAvatar]);

  const handleCloseHostAvatar = useCallback(() => {
    setIsHostAvatarVisible(false);
    setHostAvatarPreviewUri(null);
  }, []);

  const headerStyle = useAnimatedStyle(() => {
    const softOpacity = Math.min(scrollY.value / (HERO_HEIGHT * 0.45), 0.35);
    const snapProgress = Math.min(
      Math.max(scrollY.value - SHEET_SNAP_POINT, 0) / SNAP_FADE_DISTANCE,
      1,
    );
    const backgroundOpacity = softOpacity + (1 - softOpacity) * snapProgress;
    return {
      backgroundColor: `rgba(255,255,255,${backgroundOpacity})`,
      shadowOpacity: snapProgress * 0.25,
    };
  });

  const heroAnimatedStyle = useAnimatedStyle(() => {
    const translateY = scrollY.value * 0.15;
    return {
      transform: [{ translateY }],
    };
  });

  const blurOverlayStyle = useAnimatedStyle(() => {
    const blurOpacity = Math.min(scrollY.value / (HERO_HEIGHT * 0.4), 1);
    return { opacity: blurOpacity };
  });

  const whiteOverlayStyle = useAnimatedStyle(() => {
    const progress = Math.max(scrollY.value - SHEET_SNAP_POINT, 0);
    const whiteOpacity = Math.min(progress / SNAP_FADE_DISTANCE, 1);
    return { opacity: whiteOpacity };
  });

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    const elevationBoost = Math.min(scrollY.value / 200, 0.25);
    return {
      shadowOpacity: 0.08 + elevationBoost * 0.4,
      elevation: 2 + elevationBoost * 8,
    };
  });

  const promotion = listingData?.promotion ?? null;
  const unavailableDateStatuses = listingData?.availability?.reduce<Record<string, 'blocked' | 'reserved'>>((acc, slot) => {
    const status = (slot.status ?? '').toLowerCase();
    const date = normalizeAvailabilityDate(slot.date);
    if (!date) return acc;
    if (status === 'blocked' || status === 'reserved') {
      acc[date] = status;
    }
    return acc;
  }, {}) ?? {};
  const unavailableDates = Object.keys(unavailableDateStatuses);

  const availabilityEntries = useMemo(() => {
    if (!listingData?.availability?.length) return [] as FullListing['availability'];
    return listingData.availability
      .filter((slot) => (slot.status ?? '').toLowerCase() === 'blocked' || (slot.status ?? '').toLowerCase() === 'reserved')
      .slice(0, 6);
  }, [listingData?.availability]);

  const availabilityCounts = useMemo(() => {
    return availabilityEntries.reduce(
      (acc, item) => {
        const status = (item.status ?? '').toLowerCase();
        if (status === 'blocked') acc.blocked += 1;
        if (status === 'reserved') acc.reserved += 1;
        return acc;
      },
      { blocked: 0, reserved: 0 },
    );
  }, [availabilityEntries]);

  const featureBadges = listingData?.featureBadges?.length ? listingData.featureBadges : [];

  const roomCharacteristics = useMemo<Characteristic[]>(() => {
    if (!property) return [];
    const rooms = listingData?.rooms;
    const entries: { label: string; value: number | undefined; icon: IconDescriptor }[] = [
      { label: 'Salon', value: rooms?.living ?? property.livingRooms, icon: ICONS.livingRoom },
      { label: 'Cuisine', value: rooms?.kitchen ?? property.kitchens, icon: ICONS.kitchen },
      { label: 'Salle de bain', value: rooms?.bathrooms ?? property.bathrooms, icon: ICONS.bathroom },
      { label: 'Chambre', value: rooms?.bedrooms ?? property.bedrooms, icon: ICONS.bedroomFilled },
      { label: 'Salle à manger', value: rooms?.dining, icon: ICONS.dining },
      { label: 'Toilette', value: rooms?.toilets, icon: ICONS.toilets },
    ];

    return entries
      .filter((entry) => typeof entry.value === 'number' && (entry.value ?? 0) > 0)
      .map((entry) => ({ icon: entry.icon, label: entry.label, value: String(entry.value) }));
  }, [listingData?.rooms, property]);

  const featureCharacteristics = useMemo<Characteristic[]>(() => {
    if (!featureBadges?.length) return [];
    return featureBadges
      .filter((badge): badge is string => Boolean(badge))
      .map((badge) => ({
        label: badge,
        icon: FEATURE_ICON_MAP[badge] ?? ICONS.successCheck,
      }));
  }, [featureBadges]);

  const priorityIndex = useCallback((label: string) => {
    const normalized = normalizeLabel(label);
    const index = CHARACTERISTIC_PRIORITY_KEYWORDS.findIndex((keyword) => normalized.includes(keyword));
    return index >= 0 ? index : CHARACTERISTIC_PRIORITY_KEYWORDS.length;
  }, []);

  const prioritizedRoomCharacteristics = useMemo(() => {
    return roomCharacteristics
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const diff = priorityIndex(a.item.label) - priorityIndex(b.item.label);
        if (diff !== 0) return diff;
        return a.index - b.index;
      })
      .map(({ item }) => item);
  }, [priorityIndex, roomCharacteristics]);

  const prioritizedFeatureCharacteristics = useMemo(() => {
    return featureCharacteristics
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const diff = priorityIndex(a.item.label) - priorityIndex(b.item.label);
        if (diff !== 0) return diff;
        return a.index - b.index;
      })
      .map(({ item }) => item);
  }, [featureCharacteristics, priorityIndex]);

  const combinedCharacteristics = useMemo(
    () => [...prioritizedRoomCharacteristics, ...prioritizedFeatureCharacteristics],
    [prioritizedFeatureCharacteristics, prioritizedRoomCharacteristics],
  );

  const displayedCharacteristics = useMemo(
    () =>
      showAllFeatures
        ? combinedCharacteristics
        : combinedCharacteristics.slice(0, FEATURE_PREVIEW_COUNT),
    [combinedCharacteristics, showAllFeatures],
  );

  const {
    comments,
    replies,
    isLoading,
    isSubmitting,
    loadComments,
    loadReplies,
    addComment,
    deleteComment,
    getRepliesForComment,
    hasReplies,
    getReplyCount,
    getFirstReply,
    totalCommentsCount,
    toggleCommentLike,
    isCommentLiked,
    getCommentLikeCount,
  } = useComments(propertyId ?? '', supabaseProfile?.id ?? null, property?.landlord?.id ?? null);

  const {
    averageRating,
    totalCount: reviewsCount,
    userReview,
    eligibility,
  } = useListingReviews(propertyId, supabaseProfile?.id ?? null);

  const canReview = shouldLoadReviews && eligibility?.status !== 'no_booking' && eligibility?.status !== 'not_authenticated';

  // Tous les hooks doivent être appelés avant tout retour anticipé
  const [listingStats, setListingStats] = useState({ views: 0, likes: 0 });
  const [isLiked, setIsLiked] = useState(false);

  const followState = useFollowState({
    followerId: supabaseProfile?.id ?? null,
    followedId: listingOwnerId,
    enabled: Boolean(listingOwnerId && !isOwnListing && supabaseProfile?.id),
  });

  const loadListingStats = useCallback(async () => {
    if (!propertyId) {
      setListingStats({ views: 0, likes: 0 });
      setIsLiked(false);
      return;
    }

    try {
      const [viewsRes, likesRes] = await Promise.all([
        supabase
          .from('listing_views')
          .select('listing_id', { count: 'exact', head: true })
          .eq('listing_id', propertyId),
        supabase
          .from('listing_likes')
          .select('listing_id', { count: 'exact', head: true })
          .eq('listing_id', propertyId),
      ]);

      if (viewsRes.error) throw viewsRes.error;
      if (likesRes.error) throw likesRes.error;

      setListingStats({
        views: viewsRes.count ?? 0,
        likes: likesRes.count ?? 0,
      });
    } catch (error) {
      console.error('Failed to load listing stats:', error);
      setListingStats({ views: 0, likes: 0 });
    }
  }, [propertyId]);

  const refreshLikeState = useCallback(async () => {
    if (!propertyId || !supabaseProfile?.id) {
      setIsLiked(false);
      return;
    }

    try {
      const liked = await hasUserLikedListing(propertyId, supabaseProfile.id);
      setIsLiked(liked);
    } catch (error) {
      console.error('Failed to refresh like state:', error);
      setIsLiked(false);
    }
  }, [propertyId, supabaseProfile?.id]);

  // Hooks qui doivent être avant tout retour anticipé
  const applyStatDelta = useCallback(
    (field: 'views' | 'likes', delta: number) => {
      setListingStats((current) => {
        const nextValue = Math.max(0, current[field] + delta);
        if (nextValue === current[field]) {
          return current;
        }
        return {
          ...current,
          [field]: nextValue,
        };
      });
    },
    [],
  );

  useEffect(() => {
    if (property?.id) {
      loadComments();
    }
  }, [property?.id, loadComments]);

  useEffect(() => {
    if (initialCommentId && comments.length > 0) {
      setShowCommentsBottomSheet(true);
    }
  }, [initialCommentId, comments]);

  useEffect(() => {
    if (!pendingProfileNavigation) {
      return;
    }
    if (showCommentsBottomSheet) {
      console.log('[PropertyScreen] Waiting bottom sheet to close before navigating', {
        pendingProfileNavigation,
      });
      return;
    }

    const profileId = pendingProfileNavigation;
    setPendingProfileNavigation(null);
    console.log('[PropertyScreen] Navigating to profile after sheet closed', { profileId });
    router.push({ pathname: '/profile/[profileId]', params: { profileId } } as never);
  }, [pendingProfileNavigation, router, showCommentsBottomSheet]);

  const handleCloseGallery = useCallback(() => {
    setIsGalleryVisible(false);
    requestAnimationFrame(() => {
      galleryPan.setValue(0);
    });
  }, [galleryPan]);

  useEffect(() => {
    if (isGalleryVisible) {
      galleryPan.setValue(0);
    }
  }, [galleryPan, isGalleryVisible]);

  const galleryPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (_, gesture) =>
          isGalleryVisible && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 0.6,
        onMoveShouldSetPanResponder: (_, gesture) =>
          isGalleryVisible && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 0.6,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            galleryPan.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 40 || gesture.vy > 0.35) {
            handleCloseGallery();
          } else {
            RNAnimated.spring(galleryPan, {
              toValue: 0,
              bounciness: 10,
              speed: 18,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          RNAnimated.spring(galleryPan, {
            toValue: 0,
            bounciness: 10,
            speed: 18,
            useNativeDriver: true,
          }).start();
        },
      }),
    [galleryPan, handleCloseGallery, isGalleryVisible],
  );

  useEffect(() => {
    if (!propertyId) {
      setListingStats({ views: 0, likes: 0 });
      setIsLiked(false);
      return;
    }

    loadListingStats();
  }, [loadListingStats, propertyId]);

  useEffect(() => {
    if (!propertyId) {
      setIsLiked(false);
      return;
    }

    void refreshLikeState();
  }, [propertyId, refreshLikeState]);

  useEffect(() => {
    if (!propertyId) {
      return undefined;
    }

    const extractProfileId = (record: unknown): string | null => {
      if (!record || typeof record !== 'object') {
        return null;
      }
      const value = (record as { profile_id?: string | number | null }).profile_id;
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'number') {
        return value.toString();
      }
      return null;
    };

    const channel = supabase
      .channel(`listing-detail:${propertyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listing_views', filter: `listing_id=eq.${propertyId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            applyStatDelta('views', 1);
          } else if (payload.eventType === 'DELETE') {
            applyStatDelta('views', -1);
          } else {
            void loadListingStats();
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listing_likes', filter: `listing_id=eq.${propertyId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            applyStatDelta('likes', 1);
          } else if (payload.eventType === 'DELETE') {
            applyStatDelta('likes', -1);
          } else {
            void loadListingStats();
          }

          const currentProfileId = supabaseProfileRef.current?.id ?? null;
          if (!currentProfileId) {
            return;
          }

          const newProfileId = extractProfileId(payload.new);
          const oldProfileId = extractProfileId(payload.old);

          if (payload.eventType === 'INSERT' && newProfileId === currentProfileId) {
            setIsLiked(true);
          } else if (payload.eventType === 'DELETE' && oldProfileId === currentProfileId) {
            setIsLiked(false);
          } else if (payload.eventType === 'UPDATE' && (newProfileId === currentProfileId || oldProfileId === currentProfileId)) {
            void refreshLikeState();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyStatDelta, loadListingStats, propertyId, refreshLikeState]);

  const handleOpenReviews = useCallback(
    (intent?: 'write') => {
      if (!propertyId) {
        return;
      }

      const params = intent ? { id: propertyId, intent } : { id: propertyId };
      router.push({ pathname: '/property/[id]/reviews', params } as never);
    },
    [propertyId, router],
  );

  const handleNavigateToProfileFromComments = useCallback((targetProfileId: string) => {
    if (!targetProfileId) {
      return;
    }
    const profileId = String(targetProfileId);
    console.log('[PropertyScreen] Comment author pressed -> pending navigation', {
      profileId,
    });
    setPendingProfileNavigation(profileId);
    setShowCommentsBottomSheet(false);
  }, []);

  const ensureSupabaseSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        return true;
      }

      const currentUser = firebaseAuth.currentUser;
      if (currentUser) {
        await syncSupabaseSession(currentUser);
        const { data: refreshed } = await supabase.auth.getSession();
        if (refreshed.session) {
          return true;
        }
      }

      // En phase dev (RLS parfois désactivé), on autorise la suite si on a déjà un profile Supabase.
      if (__DEV__ && supabaseProfileRef.current?.id) {
        console.warn('[PropertyProfileScreen] No Supabase session, but profile present (DEV fallback)');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PropertyProfileScreen] ensureSupabaseSession error', error);
      return false;
    }
  }, []);

  const ensureAuthenticated = (purpose: AuthPurpose, action: () => void) => {
    if (isAuthenticated) {
      action();
    } else {
      pendingActionRef.current = action;
      setAuthPurpose(purpose);
      setShowAuthModal(true);
    }
  };

  const openReservationModal = () => setShowReservationModal(true);
  const startVisitFlow = () => {
    if (hasVisit) {
      setShowVisitScheduleModal(true);
      return;
    }
    setVisitDetails((prev) => ({
      date: prev.date ?? new Date(),
      time: prev.time || '',
    }));
    setSchedulingError(null);
    setShowVisitPaymentDialog(true);
  };
  const handleVisitRequest = () => {
    if (isScheduling) {
      return;
    }
    ensureAuthenticated('visit', startVisitFlow);
  };
  const handleReservationRequest = () => {
    ensureAuthenticated('reservation', openReservationModal);
  };
  const startChatFlow = () => setShowChatbot(true);
  const handleMessageRequest = () => ensureAuthenticated('chat', startChatFlow);

  const handleFollowToggle = () =>
    ensureAuthenticated('follow', () => {
      void (async () => {
        const currentUserId = supabaseProfileRef.current?.id ?? null;
        if (!listingOwnerId || !currentUserId || currentUserId === listingOwnerId || followState.isProcessing) {
          return;
        }

        const hasSession = await ensureSupabaseSession();
        if (!hasSession) {
          setShowAuthModal(true);
          return;
        }

        try {
          if (followState.isFollowing) {
            const { error } = await supabase
              .from('user_follows')
              .delete()
              .eq('follower_id', currentUserId)
              .eq('followed_id', listingOwnerId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('user_follows')
              .insert({ follower_id: currentUserId, followed_id: listingOwnerId });
            if (error) throw error;
          }
        } catch (error) {
          console.error('[PropertyProfileScreen] Follow toggle error', error);
        }
      })();
    });

  const handleLike = async () => {
    if (!propertyId || !supabaseProfile?.id) return;
    
    try {
      const newLikedState = await toggleListingLike(propertyId, supabaseProfile.id);
      setIsLiked(newLikedState);
      applyStatDelta('likes', newLikedState ? 1 : -1);
    } catch (error) {
      console.error('[PropertyProfileScreen] Like toggle error', error);
    }
  };

  const handleShare = async () => {
    if (!property) return;
    
    try {
      await Share.share({
        title: property.title,
        message: `${property.title}\n${propertyLocationLabel}\n\nDécouvrez cette annonce sur PUOL !`,
        url: buildListingShareUrl(property.id),
      });
      
      // Enregistrer le partage
      await recordListingShare({
        listingId: property.id,
        profileId: supabaseProfile?.id ?? null,
        channel: resolveShareChannel('mobile'),
      });
    } catch (error) {
      console.error('[PropertyProfileScreen] Share error', error);
    }
  };

  // Maintenant nous pouvons faire le retour anticipé en toute sécurité
  if (!property) {
    if (listingError) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.statusWrapper}>
            <Text style={styles.statusTitle}>Impossible de charger l'annonce</Text>
            {listingError && <Text style={styles.statusSubtitle}>{listingError}</Text>}
            <TouchableOpacity style={styles.retryButton} onPress={refreshListing}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.statusWrapper}>
          <Text style={styles.statusTitle}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  
  // Construire le libellé de localisation en privilégiant l'adresse complète (address_text)
  const primaryAddress = property.location.address?.trim();
  const propertyLocationLabel = primaryAddress && primaryAddress.length > 0
    ? primaryAddress
    : property.location.neighborhood && property.location.city
      ? `${property.location.neighborhood}, ${property.location.city}`
      : property.location.city || property.location.neighborhood || 'Localisation à venir';
  const isRoadsideShop = isShop && property.amenities?.some((amenity) => amenity.toLowerCase().includes('bord'));

  const priceLabel = property.priceType === 'daily' ? ' / NUIT' : ' / MOIS';
  const pricePerNightValue = typeof property.price === 'string' ? parseInt(property.price, 10) || 0 : property.price || 0;

  const furnishingLabel = isShop ? '' : isFurnished ? 'Meublé' : 'Non Meublé';

  const capacityLabel = listingData?.listing.capacity
    ? `${listingData.listing.capacity} ${listingData.listing.capacity > 1 ? 'personnes' : 'personne'}`
    : property.bedrooms && property.bedrooms > 0
    ? `${property.bedrooms} ${property.bedrooms > 1 ? 'Chambres' : 'Chambre'}`
    : 'Capacité inconnue';

  const feedTags = listingData?.tags ?? [];
  const fallbackTags = isShop
    ? ['Boutique', `${property.surfaceArea ?? '50'} m²`, 'À louer']
    : [
        property.type === 'apartment'
          ? 'Appartement'
          : property.type === 'house'
          ? 'Maison'
          : property.type === 'studio'
          ? 'Studio'
          : property.type === 'chambre'
          ? 'Chambre'
          : property.type === 'villa'
          ? 'Villa'
          : 'Logement',
        property.isFurnished ? 'Meublé' : 'Non meublé',
        capacityLabel,
      ];

  const tags = feedTags.length ? feedTags : fallbackTags;

  const bailMonths = listingData?.listing.min_lease_months ?? null;
  const bailLabel = bailMonths ? `${bailMonths} ${bailMonths > 1 ? 'mois' : 'mois'}` : null;
  const cautionAmount = listingData?.listing.deposit_amount ?? null;
  const nearMainRoadInfo = translateRoadProximity(listingData?.features?.near_main_road ?? null);

  const shortDescription =
    property.description.length > 180 && !showFullDescription
      ? `${property.description.slice(0, 180)}...`
      : property.description;

  const shouldShowFeatureToggle = combinedCharacteristics.length > FEATURE_PREVIEW_COUNT;

  const totalMediaItems = mediaItems.length || 1;
  const galleryProgress = ((currentImageIndex + 1) / totalMediaItems) * 100;
  const currentMedia = mediaItems[currentImageIndex];
  const currentMediaTag = currentMedia?.tag?.trim();
  const heroVideoMuted = true;

  const phoneAction = () => openPhone(property.phoneNumber ?? FALLBACK_PHONE);
  const messageAction = () =>
    openWhatsApp(
      property.whatsapp ?? property.phoneNumber,
      `Bonjour ${property.landlord.name}, je suis intéressé par ${property.title}`,
    );

  const handleViewReservations = () => {
    setShowPaymentSuccessModal(false);
    router.push('/reservations' as never);
  };

  const handleViewVisits = () => {
    setShowVisitSuccessModal(false);
    router.push('/visits' as never);
  };

  const handlePaymentSuccess = () => {
    if (!property) {
      return;
    }

    const payload: NewReservationInput = {
      propertyId: property.id,
      propertyTitle: property.title,
      propertyImage: property.images[0],
      propertyLocation: propertyLocationLabel,
      propertyAddress: property.location.address,
      hostName: property.landlord.name,
      hostAvatar: property.landlord.avatar,
      hostUsername: property.landlord.username ?? null,
      hostIsVerified: property.landlord.verified,
      hostId: property.landlord.id,
      hostPhone: property.phoneNumber ?? FALLBACK_PHONE,
      hostEmail: 'support@puol.cm',
      checkInDate: reservationSummary.checkIn.toISOString(),
      checkOutDate: reservationSummary.checkOut.toISOString(),
      nights: reservationSummary.nights,
      totalPrice: reservationSummary.total,
      pricePerNight:
        reservationSummary.nights > 0
          ? Math.round(reservationSummary.total / Math.max(reservationSummary.nights, 1))
          : pricePerNightValue || reservationSummary.total,
      amountPaid:
        reservationSummary.amountDueNow > 0 ? reservationSummary.amountDueNow : reservationSummary.total,
      amountRemaining: reservationSummary.remainingAmount,
      paymentScheme: reservationSummary.paymentScheme,
      originalTotal: reservationSummary.originalTotal || reservationSummary.total,
      discountAmount: reservationSummary.discountAmount,
      discountPercent: reservationSummary.discountPercent,
      updatedAt: new Date().toISOString(),
    } as const;

    addReservation(payload)
      .then(async () => {
        setShowPaymentModal(false);
        setShowPaymentSuccessModal(true);
        try {
          await refreshReservations();
        } catch (error) {
          console.error('[PropertyProfileScreen] refreshReservations error', error);
        }
      })
      .catch((error) => {
        console.error('[PropertyProfileScreen] addReservation error', error);
        Alert.alert(
          'Réservation non enregistrée',
          'Nous n’avons pas pu sauvegarder votre réservation. Vérifiez votre connexion puis réessayez.',
        );
      });
  };

  const handleReservationConfirm = (checkIn: Date, checkOut: Date, nights: number, total: number) => {
    const baseTotal = nights * pricePerNightValue;
    const discountRatio = baseTotal > 0 ? Math.min(1, Math.max(0, total / baseTotal)) : 1;
    const effectivePricePerNight = pricePerNightValue * discountRatio;
    const paymentInfo = computeUpfrontPayment(nights, effectivePricePerNight);
    const discountAmount = Math.max(baseTotal - total, 0);
    const discountPercent = baseTotal > 0 && discountAmount > 0 ? Math.round((discountAmount / baseTotal) * 100) : null;
    setReservationSummary({
      checkIn,
      checkOut,
      nights,
      total,
      amountDueNow: paymentInfo.amountDueNow,
      remainingAmount: paymentInfo.remainingAmount,
      paymentScheme: paymentInfo.remainingAmount > 0 ? 'split' : 'full',
      originalTotal: baseTotal || total,
      discountAmount,
      discountPercent,
    });
    setPaymentNotice(paymentInfo.message ?? '');
    setShowReservationModal(false);
    setShowPaymentModal(true);
  };

  const handleVisitPaymentContinue = () => {
    setShowVisitPaymentDialog(false);
    setShowVisitScheduleModal(true);
  };

  const handleVisitScheduleConfirm = (date: Date, time: string) => {
    setVisitDetails({ date, time });
    setShowVisitScheduleModal(false);
    setSchedulingError(null);

    if (hasVisit && existingVisit) {
      setIsScheduling(true);
      updateVisit(existingVisit.id, {
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation: propertyLocationLabel,
        propertyImage: property.images[0],
        propertyBedrooms: property.bedrooms,
        propertyKitchens: property.kitchens,
        propertyLivingRooms: property.livingRooms,
        propertyType: property.type,
        propertySurfaceArea: property.surfaceArea,
        propertyIsRoadside: isRoadsideShop,
        amount: VISIT_PRICE_FCFA,
        visitDate: date,
        visitTime: time,
      })
        .then(() => {
          setVisitSuccessCopy({
            title: 'Visite mise à jour',
            message: 'Votre visite a été mise à jour avec succès.',
            buttonLabel: 'Voir ma visite',
          });
          setShowVisitSuccessModal(true);
          void refreshVisits();
        })
        .catch((error) => {
          console.error('[PropertyProfileScreen] updateVisit error', error);
          setSchedulingError("Impossible de mettre à jour la visite. Réessayez plus tard.");
        })
        .finally(() => {
          setIsScheduling(false);
        });
      return;
    }

    setShowVisitPaymentModal(true);
  };

  const handleVisitPaymentSuccess = () => {
    setShowVisitPaymentModal(false);
    const visitDate = visitDetails.date ?? new Date();

    setIsScheduling(true);
    setSchedulingError(null);

    addVisit({
      propertyId: property.id,
      propertyTitle: property.title,
      propertyImage: property.images[0],
      propertyLocation: propertyLocationLabel,
      propertyBedrooms: property.bedrooms,
      propertyKitchens: property.kitchens,
      propertyLivingRooms: property.livingRooms,
      propertyType: property.type,
      propertySurfaceArea: property.surfaceArea,
      propertyIsRoadside: isRoadsideShop,
      visitDate,
      visitTime: visitDetails.time,
      amount: VISIT_PRICE_FCFA,
    })
      .then(() => {
        setVisitSuccessCopy({
          title: 'Visite programmée !',
          message: 'Votre visite a été programmée. Elle sera confirmée automatiquement sous peu.',
          buttonLabel: 'Voir ma visite',
        });
        setShowVisitSuccessModal(true);
        void refreshVisits();
      })
      .catch((error) => {
        console.error('[PropertyProfileScreen] addVisit error', error);
        Alert.alert('Visite non programmée', "Nous n'avons pas pu sauvegarder votre visite. Vérifiez votre connexion puis réessayez.");
        setSchedulingError("Nous n'avons pas pu programmer la visite. Réessayez.");
      })
      .finally(() => {
        setIsScheduling(false);
      });
  };

  const handleLoginAuthenticated = () => {
    setShowLoginScreen(false);
    setShowAuthModal(false);
  };

  const handleSignUpSuccess = (_authUser: AuthUser) => {
    setShowSignUpScreen(false);
    setShowAuthModal(false);
    setShowLoginScreen(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View style={[styles.stickyHeader, headerStyle, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          {renderIcon(ICONS.back, 20)}
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            {renderIcon(ICONS.share, 20)}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleLike}>
            {renderIcon(
              isLiked ? ICONS.heart : ICONS.heartOutline,
              22,
              isLiked ? '#2ECC71' : '#111827',
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <Animated.View style={[styles.imageCarouselContainer, heroAnimatedStyle]}>
          {mediaItems.length > 0 ? (
            <Animated.ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                const clampedIndex = Math.max(0, Math.min(index, mediaItems.length - 1));
                console.log('[Property] Scroll end - index:', index, 'clamped:', clampedIndex, 'total:', mediaItems.length);
                setCurrentImageIndex(clampedIndex);
              }}
            >
              {mediaItems.map((media, index) => {
                const isActiveSlide = currentImageIndex === index;
                const isHeroVideo = media.type === 'video' && media.id === heroVideoId;
                return (
                  <TouchableOpacity
                    key={`${media.id}-${index}`}
                    style={styles.imageWrapper}
                    activeOpacity={0.9}
                    onPress={() => {
                      setCurrentImageIndex(index);
                      setIsGalleryVisible(true);
                    }}
                  >
                    {media.type === 'video' ? (
                      <View style={styles.videoWrapper}>
                        {/* Image de fond qui masque le noir pendant le chargement */}
                        {!isVideoLoaded && heroImageSource && (
                          <Image 
                            source={heroImageSource} 
                            style={styles.videoBackgroundImage}
                            blurRadius={0}
                          />
                        )}
                        <Video
                          source={{ uri: isHeroVideo && heroVideoUri ? heroVideoUri : media.url }}
                          style={[styles.videoPlayer, !isVideoLoaded && { opacity: 0 }]} // Cacher la vidéo jusqu'à ce qu'elle soit prête
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={isActiveSlide && !isGalleryVisible}
                          isLooping
                          isMuted={heroVideoMuted || isGalleryVisible}
                          useNativeControls={false}
                          usePoster={false}
                          progressUpdateIntervalMillis={50} // Plus fréquent pour plus de réactivité
                          onLoad={() => {
                            // La vidéo est considérée comme prête dès le début
                          }}
                          onReadyForDisplay={() => {
                            // Afficher la vidéo et cacher l'image quand tout est prêt
                            setIsVideoLoaded(true);
                          }}
                        />
                        <View style={styles.videoOverlay}>
                          <Text style={styles.videoPlayIcon}>▶</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Image source={{ uri: media.url }} style={styles.propertyImage} />
                        <Animated.View pointerEvents="none" style={[styles.heroBlurLayer, blurOverlayStyle]}>
                          <Image source={{ uri: media.url }} style={styles.propertyImage} blurRadius={20} />
                        </Animated.View>
                        <Animated.View pointerEvents="none" style={[styles.heroWhiteLayer, whiteOverlayStyle]} />
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </Animated.ScrollView>
          ) : (
            <View style={styles.mediaSentinel}>
              <Text style={styles.mediaSentinelLabel}>Aucun média disponible</Text>
              <Text style={styles.mediaSentinelSubtitle}>Cette annonce n'a pas encore de photos ou vidéos.</Text>
            </View>
          )}

          {mediaItems.length > 0 && (
            <>
              {!!currentMediaTag && (
                <View style={styles.mediaTagWrapper}>
                  <View style={styles.mediaTag}>
                    <Text style={styles.mediaTagText}>{currentMediaTag}</Text>
                  </View>
                </View>
              )}

              {!isGalleryVisible && (
              <View style={styles.mediaProgressContainer}>
                <View style={styles.mediaProgressBar}>
                  {mediaItems.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        {
                          width: index === currentImageIndex ? 32 : 6,
                          backgroundColor:
                            index === currentImageIndex
                              ? '#2ECC71'
                              : 'rgba(255,255,255,0.6)',
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
              )}
            </>
          )}
        </Animated.View>

        <Animated.View style={[styles.content, { marginTop: -32 }, sheetAnimatedStyle]}>
          <View style={[styles.landlordSection, styles.sectionSpacing]}>
            <View style={styles.landlordInfo}>
              <TouchableOpacity onPress={handleHostAvatarPress} activeOpacity={0.85}>
                <RNAnimated.View
                  style={[
                    styles.landlordAvatarWrapper,
                    {
                      transform: [{ perspective: 600 }, { rotateY: hostAnimatedRotationY }],
                      opacity: hostAnimatedOpacity,
                    },
                  ]}
                >
                  <Image
                    source={{
                      uri:
                        showHostEnterpriseAvatar && hostEnterpriseLogoUrl && hostHasEnterpriseBranding
                          ? hostEnterpriseLogoUrl
                          : property.landlord.avatar || FALLBACK_LANDLORD_AVATAR,
                    }}
                    style={styles.landlordAvatar}
                  />
                </RNAnimated.View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.landlordDetails}
                activeOpacity={0.8}
                onPress={() => {
                  if (listingOwnerId) {
                    router.push({ pathname: '/profile/[profileId]', params: { profileId: listingOwnerId } } as never);
                  }
                }}
              >
                <View style={styles.landlordNameRow}>
                  <Text style={styles.landlordName}>{property.landlord.name}</Text>
                  {property.landlord.verified && (
                    <Image source={VERIFIED_BADGE_ICON} style={styles.verifiedBadgeIcon} />
                  )}
                </View>
                {isFurnished ? (
                  <View style={styles.landlordRoleRow}>
                    <Text style={styles.landlordRole}>Hôte</Text>
                    {hostHasEnterpriseBranding && hostEnterpriseName ? (
                      <>
                        <Text style={[styles.landlordRole, styles.landlordRoleDot]}>·</Text>
                        <Text style={styles.landlordEnterpriseName}>{hostEnterpriseName}</Text>
                      </>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.landlordRole}>Bailleur</Text>
                )}
              </TouchableOpacity>
            </View>

            {listingOwnerId && !isOwnListing && (
              <TouchableOpacity
                style={[styles.followButton, followState.isFollowing && styles.followButtonActive]}
                onPress={handleFollowToggle}
                disabled={followState.isProcessing || !followState.isReady}
              >
                <Text style={[styles.followButtonText, followState.isFollowing && styles.followButtonTextActive]}>
                  {followState.isProcessing ? '...' : followState.isFollowing ? 'Suivi(e)' : 'Suivre'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.title}>{property.title}</Text>

          <View style={[styles.stats, styles.sectionSpacing]}>
            <View style={styles.statItem}>
              {renderIcon(ICONS.views, 18, '#6B7280')}
              <Text style={styles.statValue}>{listingStats.views.toLocaleString('fr-FR')}</Text>
            </View>
            <View style={styles.statItem}>
              {renderIcon(ICONS.heartOutline, 18, '#6B7280')}
              <Text style={styles.statValue}>{listingStats.likes.toLocaleString('fr-FR')}</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                if (!isLoading) {
                  void loadComments();
                }
                setShowCommentsBottomSheet(true);
              }}
            >
              {renderIcon(ICONS.comments, 18, '#6B7280')}
              <Text style={styles.statValue}>{totalCommentsCount ?? comments.length}</Text>
            </TouchableOpacity>
            {isFurnished && !isShop && (
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => {
                  handleOpenReviews();
                }}
              >
                {renderIcon(ICONS.star, 18, '#F59E0B')}
                <Text style={styles.statValue}>
                  {reviewsCount > 0 ? `${averageRating.toFixed(1)} · ${reviewsCount}` : 'Avis'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.tagsSection, styles.sectionSpacing]}>
            <View style={styles.tagsRow}>
              {tags.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.priceText}>
                {formatPrice(property.price)} FCFA{priceLabel}
              </Text>
            </View>
          </View>

          <View style={[styles.locationSection, styles.sectionSpacing]}>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={16} color="#2ECC71" style={styles.locationIcon} />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationText}>{propertyLocationLabel}</Text>
                {!isShop && isFurnished && (
                  <Text style={styles.termsText}>Caution: {formatPrice(property.price)} FCFA</Text>
                )}
                {(isShop || (!isShop && !isFurnished)) && (bailLabel || cautionAmount) && (
                  <Text style={styles.termsText}>
                    {bailLabel ? `Bail minimal : ${bailLabel}` : ''}
                    {bailLabel && cautionAmount ? ' · ' : ''}
                    {cautionAmount ? `Caution : ${formatPrice(cautionAmount)} FCFA` : ''}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Caractéristiques & confort</Text>
            {displayedCharacteristics.length > 0 && (
              <View style={styles.characteristicsGrid}>
                {displayedCharacteristics.map((item) => (
                  <View key={item.label} style={styles.characteristicItem}>
                    <View style={styles.characteristicIconContainer}>{renderIcon(item.icon, 26, '#2ECC71')}</View>
                    <View style={styles.characteristicLabelWrapper}>
                      {item.value && <Text style={styles.characteristicValue}>{item.value}</Text>}
                      <Text style={styles.characteristicLabel}>{item.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {shouldShowFeatureToggle && (
              <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAllFeatures((prev) => !prev)}>
                <Text style={styles.showMoreButtonText}>
                  {showAllFeatures ? 'Voir moins de caractéristiques' : 'Voir plus de caractéristiques'}
                </Text>
              </TouchableOpacity>
            )}
            {nearMainRoadInfo && (
              <View style={styles.roadBadge}>
                <Feather name="map-pin" size={16} color="#1B5E20" />
                <Text style={styles.roadBadgeText}>Proximité de la route : {nearMainRoadInfo}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{shortDescription}</Text>
            {property.description.length > 180 && !showFullDescription && (
              <TouchableOpacity
                style={styles.readMoreButton}
                onPress={() => setShowFullDescription(true)}
              >
                <Text style={styles.readMoreText}>Lire la suite</Text>
              </TouchableOpacity>
            )}
            <View style={styles.verificationBadge}>
              {renderIcon(ICONS.successCheck, 18, '#2ECC71')}
              <Text style={styles.verificationText}>
                Cette Annonce a été vérifiée et est disponible
              </Text>
            </View>
          </View>

          {promotion && (
            <View style={[styles.promoCard, styles.sectionSpacing]}>
              <View style={styles.promoHeader}>
                <Feather name="gift" size={18} color="#2ECC71" />
                <Text style={styles.promoTitle}>Offre spéciale pour long séjour</Text>
              </View>
              <Text style={styles.promoSubtitle}>
                {promotion.nights_required} nuits réservées → {promotion.discount_percent}% de remise
              </Text>
            </View>
          )}

        </Animated.View>
      </Animated.ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          {isFurnished && !isShop ? (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={handleReservationRequest}>
                <Text style={styles.primaryButtonText}>Réserver le logement</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleMessageRequest}>
                <Text style={styles.secondaryButtonText}>Envoyer un message</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, isScheduling && styles.secondaryButtonDisabled]}
                onPress={handleVisitRequest}
                disabled={isScheduling}
              >
                <Text style={[styles.secondaryButtonText, isScheduling && styles.secondaryButtonTextDisabled]}>
                  {isScheduling
                    ? hasVisit
                      ? 'Mise à jour en cours...'
                      : 'Programmation en cours...'
                    : hasVisit
                      ? 'Modifier ma visite'
                      : 'Programmer une visite'}
                </Text>
              </TouchableOpacity>
              {schedulingError ? <Text style={styles.visitErrorText}>{schedulingError}</Text> : null}
              <TouchableOpacity style={styles.primaryButton} onPress={handleMessageRequest}>
                <Text style={styles.primaryButtonText}>Envoyer un message</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <Modal visible={isGalleryVisible} transparent animationType="fade" onRequestClose={handleCloseGallery}>
        <RNAnimated.View
          style={[styles.galleryModalContainer, { transform: [{ translateY: galleryPan }] }]}
          {...galleryPanResponder.panHandlers}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: currentImageIndex * SCREEN_WIDTH, y: 0 }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              const clampedIndex = Math.max(0, Math.min(index, mediaItems.length - 1));
              console.log('[Property Gallery] Scroll end - index:', index, 'clamped:', clampedIndex, 'total:', mediaItems.length);
              setCurrentImageIndex(clampedIndex);
            }}
          >
            {mediaItems.map((media, index) => (
              <View key={`modal-${media.id}`} style={styles.fullscreenImageWrapper}>
                {media.type === 'video' ? (
                  <Video
                    source={{ uri: media.type === 'video' && media.id === heroVideoId && heroVideoUri ? heroVideoUri : media.url }}
                    style={styles.fullscreenVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isGalleryVisible && currentImageIndex === index}
                    useNativeControls
                    isLooping
                  />
                ) : (
                  <Image source={{ uri: media.url }} style={styles.fullscreenImage} />
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.galleryCloseButton, { top: insets.top + 16 }]} onPress={handleCloseGallery}>
            <Text style={styles.galleryCloseText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.galleryProgressWrapper}>
            <View style={styles.galleryProgressTrack}>
              <View style={[styles.galleryProgressFill, { width: `${galleryProgress}%` }]} />
            </View>
          </View>
        </RNAnimated.View>
      </Modal>

      <CommentBottomSheet
        visible={showCommentsBottomSheet}
        onClose={() => setShowCommentsBottomSheet(false)}
        comments={comments}
        replies={replies}
        onAddComment={addComment}
        onLoadReplies={loadReplies}
        getRepliesForComment={getRepliesForComment}
        hasReplies={hasReplies}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        initialCommentId={initialCommentId}
        currentUserId={supabaseProfile?.id ?? undefined}
        currentUserAvatar={supabaseProfile?.avatar_url ?? undefined}
        propertyTitle={property.title}
        getReplyCount={getReplyCount}
        totalCommentsCount={totalCommentsCount}
        getFirstReply={getFirstReply}
        onToggleCommentLike={toggleCommentLike}
        isCommentLiked={isCommentLiked}
        getCommentLikeCount={getCommentLikeCount}
        listingHostId={property?.landlord?.id ?? null}
        onDeleteComment={deleteComment}
        onAuthorPress={handleNavigateToProfileFromComments}
      />

      <LoginWithOTPScreen
        visible={showLoginScreen}
        onClose={() => {
          setShowLoginScreen(false);
          setShowAuthModal(true);
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
          setShowAuthModal(true);
        }}
        onSuccess={handleSignUpSuccess}
      />

      <ReservationModal
        visible={showReservationModal}
        onClose={() => setShowReservationModal(false)}
        onConfirm={handleReservationConfirm}
        pricePerNight={pricePerNightValue}
        propertyTitle={property.title}
        initialCheckIn={reservationSummary.nights > 0 ? reservationSummary.checkIn : undefined}
        initialCheckOut={reservationSummary.nights > 0 ? reservationSummary.checkOut : undefined}
        promotion={promotion}
        unavailableDates={unavailableDates}
        unavailableDateStatuses={unavailableDateStatuses}
      />

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        amount={reservationSummary.amountDueNow || reservationSummary.total}
        title="Paiement de la réservation"
        description={property.title}
        infoMessage={paymentNotice}
        onBack={() => {
          setShowPaymentModal(false);
          setShowReservationModal(true);
        }}
      />

      <PaymentSuccessModal
        visible={showPaymentSuccessModal}
        onClose={() => setShowPaymentSuccessModal(false)}
        onPrimaryAction={handleViewReservations}
        primaryButtonLabel="Voir ma réservation"
      />

      <VisitPaymentDialog
        visible={showVisitPaymentDialog}
        onClose={() => setShowVisitPaymentDialog(false)}
        onContinue={handleVisitPaymentContinue}
      />

      <VisitScheduleModal
        visible={showVisitScheduleModal}
        onClose={() => setShowVisitScheduleModal(false)}
        onConfirm={handleVisitScheduleConfirm}
        listingId={property.id}
        initialDate={visitDetails.date}
        initialTime={visitDetails.time}
      />

      <PaymentModal
        visible={showVisitPaymentModal}
        onClose={() => setShowVisitPaymentModal(false)}
        onSuccess={handleVisitPaymentSuccess}
        amount={VISIT_PRICE_FCFA}
        title="Paiement de la visite"
        description={visitDetails.date
          ? `Visite le ${visitDetails.date.toLocaleDateString('fr-FR')} à ${visitDetails.time}`
          : 'Paiement de votre visite'}
        onBack={() => {
          setShowVisitPaymentModal(false);
          setShowVisitScheduleModal(true);
        }}
      />

      <PaymentSuccessModal
        visible={showVisitSuccessModal}
        onClose={() => setShowVisitSuccessModal(false)}
        onPrimaryAction={handleViewVisits}
        primaryButtonLabel={visitSuccessCopy.buttonLabel}
        title={visitSuccessCopy.title}
        message={visitSuccessCopy.message}
      />

      <ChatbotPopup
        visible={showChatbot}
        onClose={() => setShowChatbot(false)}
        propertyTitle={property.title}
      />

      <Modal visible={isHostAvatarVisible} transparent animationType="fade" onRequestClose={handleCloseHostAvatar}>
        <TouchableOpacity style={styles.avatarOverlay} activeOpacity={1} onPress={handleCloseHostAvatar}>
          <View style={styles.avatarContent}>
            <Image
              source={{ uri: hostAvatarPreviewUri ?? property.landlord.avatar ?? FALLBACK_LANDLORD_AVATAR }}
              style={styles.avatarFullImage}
              resizeMode="cover"
            />
            <TouchableOpacity style={styles.avatarCloseButton} onPress={handleCloseHostAvatar} activeOpacity={0.8}>
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

export default PropertyProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sectionSpacing: {
    marginTop: 16,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContentContainer: {
    paddingBottom: 160,
  },
  imageCarouselContainer: {
    height: HERO_HEIGHT,
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    resizeMode: 'cover',
  },
  heroBlurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroWhiteLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  mediaTagWrapper: {
    position: 'absolute',
    left: 24,
    bottom: 43,
    zIndex: 2,
  },
  mediaTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  mediaTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  mediaProgressContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mediaProgressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    height: 6,
    borderRadius: 999,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  landlordSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  landlordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  landlordAvatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  landlordAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
  },
  landlordDetails: {
    gap: 2,
  },
  landlordNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  landlordName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  verifiedBadgeIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  landlordRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  landlordRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  landlordRoleDot: {
    color: '#6B7280',
  },
  landlordEnterpriseName: {
    fontSize: 12,
    color: '#2ECC71',
    fontWeight: '600',
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2ECC71',
    backgroundColor: '#FFFFFF',
  },
  followButtonActive: {
    backgroundColor: '#2ECC71',
  },
  followButtonText: {
    fontSize: 13,
    color: '#2ECC71',
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: -6,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  tagsSection: {
    marginTop: -6,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  tagText: {
    fontSize: 12,
    color: '#2ECC71',
    fontWeight: '600',
  },
  reviewsModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reviewsCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  reviewsListHeader: {
    paddingHorizontal: 20,
    marginBottom: 24,
    width: '100%',
    alignSelf: 'stretch',
    gap: 16,
  },
  reviewsList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  reviewsInfoBubble: {
    alignSelf: 'stretch',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  reviewsInfoBubbleText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  reviewsStatsGrid: {
    alignSelf: 'stretch',
    width: '100%',
    flexDirection: 'column',
    gap: 18,
  },
  reviewsStatCard: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    gap: 12,
  },
  reviewsStatCardLarge: {
    flex: 1.4,
  },
  reviewsStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewsStatHeaderText: {
    flex: 1,
    gap: 4,
  },
  reviewsStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  reviewsStatMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewsStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reviewsStatSubtext: {
    fontSize: 11,
    color: '#6B7280',
  },
  reviewsStatMetaSeparator: {
    fontSize: 11,
    color: '#D1D5DB',
  },
  reviewsStatMetaNote: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reviewsRatingBars: {
    gap: 6,
  },
  reviewsRatingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsRatingBarLabel: {
    width: 12,
    fontSize: 11,
    color: '#1A1A1A',
  },
  reviewsRatingBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  reviewsRatingBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#1A1A1A',
  },
  reviewsCommentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  reviewsCommentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reviewsSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  reviewsSortButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reviewsSortMenu: {
    marginTop: -4,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  reviewsSortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  reviewsSortMenuItemActive: {
    backgroundColor: '#F9FAFB',
  },
  reviewsSortMenuItemText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  reviewsSortMenuCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  reviewsEmptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  reviewsEmptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2ECC71',
  },
  reviewsEmptyCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.06)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 18,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewAuthorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  reviewAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },
  reviewTenure: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  reviewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewMineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(46, 204, 113, 0.16)',
  },
  reviewMineBadgeText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reviewRatingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  reviewOwnerReply: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.18)',
    gap: 6,
  },
  reviewOwnerReplyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  reviewOwnerReplyDate: {
    fontSize: 12,
    color: '#0F766E',
  },
  reviewOwnerReplyText: {
    fontSize: 13,
    color: '#064E3B',
    lineHeight: 18,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  reviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  reviewActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  reviewFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: REVIEW_FORM_RADIUS,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 12,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Math.min(SCREEN_WIDTH - 48, 400),
  },
  reviewsFormTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewsFormSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  reviewsStarsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewsStarInput: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  reviewsStarInputActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  reviewsCommentInput: {
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
  },
  reviewsFormFooter: {
    gap: 8,
  },
  reviewsSubmitButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsSubmitButtonDisabled: {
    backgroundColor: '#A7F3D0',
  },
  reviewsSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewsHelperText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reviewsSuccessText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  reviewsErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  reviewsMessageCard: {
    backgroundColor: '#F1F5F9',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    alignItems: 'center',
    gap: 10,
  },
  reviewsMessageText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewsFooter: {
    gap: 16,
    paddingVertical: 24,
  },
  reviewsGuidelinesBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 16,
    gap: 10,
  },
  reviewsGuidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsGuidelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reviewsGuidelineText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  reviewsConditionsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  reviewsConditionsText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  reviewFormOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  reviewFormContainer: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  reviewFormTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewFormStarsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewFormStarButton: {
    padding: 3,
  },
  reviewFormTextarea: {
    minHeight: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.5)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  reviewFormError: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  reviewFormActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  reviewFormCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: REVIEW_FORM_RADIUS,
    backgroundColor: '#E2E8F0',
  },
  reviewFormCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  reviewFormSubmitButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: REVIEW_FORM_RADIUS,
    backgroundColor: '#2ECC71',
  },
  reviewFormSubmitButtonDisabled: {
    backgroundColor: '#86EFAC',
  },
  reviewFormSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewFormHelperText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  reviewFormPortal: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  reviewFormBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  reviewFormScrollContainer: {
    width: '100%',
    alignItems: 'center',
  },
  priceBox: {
    backgroundColor: '#2ECC71',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 8,
  },
  priceText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  locationSection: {
    marginTop: -6,
    paddingBottom: 18,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  locationIcon: {
    marginTop: -2,
    transform: [{ translateX: 5 }],
  },
  locationTextContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  termsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    marginBottom: 12,
  },
  characteristicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  characteristicItem: {
    width: (SCREEN_WIDTH - 64) / 3,
    alignItems: 'center',
    gap: 8,
  },
  characteristicIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characteristicIcon: {
    fontSize: 24,
  },
  characteristicLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  characteristicLabel: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  characteristicValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 12,
  },
  readMoreButton: {
    borderWidth: 1,
    borderColor: '#2ECC71',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  readMoreText: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationIcon: {
    fontSize: 16,
    color: '#2ECC71',
  },
  verificationText: {
    fontSize: 12,
    color: '#2ECC71',
    flex: 1,
  },
  showMoreButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreButtonText: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  promoCard: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
  },
  promoSubtitle: {
    fontSize: 13,
    color: '#065F46',
  },
  roadBadge: {
    marginTop: 12,
    marginBottom: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(21,128,61,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roadBadgeText: {
    color: '#1B5E20',
    fontSize: 13,
    fontWeight: '600',
  },
  availabilitySummaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  availabilityPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonDisabled: {
    opacity: 0.65,
  },
  secondaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  secondaryButtonTextDisabled: {
    color: '#6B7280',
  },
  visitErrorText: {
    marginTop: 12,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#DC2626',
  },
  availabilityPillLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  availabilityPillCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  availabilityList: {
    gap: 10,
  },
  availabilityItem: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  availabilityDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  availabilityStatusText: {
    fontSize: 12,
    color: '#4B5563',
  },
  availabilityStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  availabilityStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  bottomBarContent: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomBarSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2ECC71',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomBarSecondaryButtonText: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  galleryModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  statusWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2ECC71',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fullscreenImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -60,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resizeMode: 'cover',
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignSelf: 'center',
  },
  galleryCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  galleryImageWrapper: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  galleryImage: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  galleryProgressWrapper: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    paddingHorizontal: 12,
  },
  galleryProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  galleryProgressFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  mediaSentinel: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    padding: 24,
  },
  mediaSentinelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  mediaSentinelSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  videoWrapper: {
    width: '100%',
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  videoBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoControlOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  videoPlayIcon: {
    fontSize: 72,
    color: 'rgba(255,255,255,0.6)',
  },
  videoMuteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarContent: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarFullImage: {
    width: Math.min(SCREEN_WIDTH * 0.75, 300),
    aspectRatio: 1,
    borderRadius: 24,
  },
  avatarCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
