import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated as RNAnimated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';

import { Video, ResizeMode } from 'expo-av';
import { openPhone, openWhatsApp, PropertyData } from '@/src/data/properties';
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
import { useListingDetails } from '@/src/features/listings/hooks';
import type { FullListing, HostProfileSummary } from '@/src/types/listings';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.58;
const SHEET_SNAP_POINT = HERO_HEIGHT - 140;
const SNAP_FADE_DISTANCE = 30;
const VERIFIED_BADGE_ICON = require('@/assets/icons/feed-icon-verified.png');
const VISIT_PRICE_FCFA = 5000;
const PROFILE_TAB_ROUTE: Href = '/';
const VISITS_ROUTE: Href = '/visits';
type AuthPurpose = 'visit' | 'reservation' | 'chat' | 'follow';
const FEATURE_PREVIEW_COUNT = 9;
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

const CHARACTERISTIC_PRIORITY_KEYWORDS = [
  'salon',
  'cuisine',
  'salle de bain',
  'chambre',
  'parking',
  'prépayé',
].map((keyword) => normalizeLabel(keyword));

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

  const amenities = [...full.featureBadges];
  const roadProximityBadge = translateRoadProximity(full.features?.near_main_road);
  if (roadProximityBadge) {
    amenities.push(`Proche route (${roadProximityBadge})`);
  }
  const isFurnished = Boolean(listing.is_furnished);

  return {
    id: listing.id,
    type: normalizePropertyType(listing.property_type),
    isFurnished,
    title: listing.title,
    description: listing.description,
    price: Math.round(listing.price_per_night ?? 0).toString(),
    priceType: 'daily',
    deposit: undefined,
    location: {
      address: listing.address_text ?? listing.district,
      neighborhood: listing.district,
      city: listing.city,
      coordinates: FALLBACK_COORDINATES,
    },
    images,
    landlord: {
      id: hostProfile?.id,
      name: landlordName,
      avatar: landlordAvatar,
      verified: Boolean(hostProfile?.is_certified),
      rating: 4.8,
      reviewsCount: 0,
      username: landlordUsername,
      phone: landlordPhone,
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
  gym: { library: 'Feather', name: 'activity' as FeatherIconName },
  rooftop: { library: 'Feather', name: 'layers' as FeatherIconName },
  elevator: { library: 'Feather', name: 'chevrons-up' as FeatherIconName },
  accessibility: { library: 'MaterialCommunityIcons', name: 'wheelchair-accessibility' as MaterialIconName },
} satisfies Record<string, IconDescriptor>;

const FEATURE_ICON_MAP: Record<string, IconDescriptor> = {
  Climatisation: ICONS.ac,
  Wifi: ICONS.wifi,
  Parking: ICONS.parking,
  'Groupe électrogène': ICONS.generator,
  'Compteur prépayé': ICONS.prepaid,
  'Compteur SONNEL': ICONS.generator,
  Forage: ICONS.water,
  'Chauffe-eau': ICONS.heater,
  'Sécurité 24/7': ICONS.security,
  CCTV: ICONS.camera,
  Ventilateur: ICONS.ceilingFan,
  TV: { library: 'MaterialCommunityIcons', name: 'television' as MaterialIconName },
  'Smart TV': ICONS.monitor,
  Netflix: ICONS.film,
  'Lave-linge': ICONS.washer,
  Balcon: ICONS.balcony,
  Terrasse: ICONS.terrace,
  Véranda: ICONS.balcony,
  Mezzanine: ICONS.rooftop,
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
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
  const [showChatbot, setShowChatbot] = useState(false);
  const [isHostAvatarVisible, setIsHostAvatarVisible] = useState(false);
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

  const { addVisit, updateVisit, getVisitByPropertyId } = useVisits();
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
    if (!existingReservation) {
      return;
    }
    setReservationSummary({
      checkIn: new Date(existingReservation.checkInDate),
      checkOut: new Date(existingReservation.checkOutDate),
      nights: existingReservation.nights,
      total: existingReservation.totalPrice,
      amountDueNow: existingReservation.amountPaid ?? existingReservation.totalPrice,
      remainingAmount: existingReservation.amountRemaining ?? 0,
      paymentScheme: existingReservation.amountRemaining && existingReservation.amountRemaining > 0 ? 'split' : 'full',
      originalTotal: existingReservation.originalTotal ?? existingReservation.totalPrice,
      discountAmount: existingReservation.discountAmount ?? 0,
      discountPercent: existingReservation.discountPercent ?? null,
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
  const propertyId = property?.id ?? null;
  const existingVisit = propertyId ? getVisitByPropertyId(propertyId) : undefined;
  const hasVisit = Boolean(existingVisit);

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

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

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
  } = useComments(property?.id ?? '', supabaseProfile?.id ?? null, property?.landlord?.id ?? null);

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
    return <View style={styles.container} />;
  }

  const propertyLocationLabel = `${property!.location.neighborhood}, ${property!.location.city}`;
  const isFurnished = property.isFurnished;
  const isShop = property.type === 'boutique';
  const isRoadsideShop = isShop && property.amenities?.some((amenity) => amenity.toLowerCase().includes('bord'));

  const priceLabel = property.priceType === 'daily' ? ' / NUIT' : ' / MOIS';
  const pricePerNightValue = typeof property.price === 'string' ? parseInt(property.price, 10) || 0 : property.price || 0;

  const furnishingLabel = isShop ? '' : isFurnished ? 'Meublé' : 'Non Meublé';

  const capacityLabel = listingData?.listing.capacity
    ? `${listingData.listing.capacity} ${listingData.listing.capacity > 1 ? 'personnes' : 'personne'}`
    : property.bedrooms && property.bedrooms > 0
    ? `${property.bedrooms} ${property.bedrooms > 1 ? 'Chambres' : 'Chambre'}`
    : 'Capacité inconnue';

  const fallbackTags = isShop
    ? ['Boutique', `${property.surfaceArea ?? '50'} m²`, 'À louer']
    : [
        property.type === 'apartment'
          ? 'Appartement'
          : property.type.charAt(0).toUpperCase() + property.type.slice(1),
        furnishingLabel || 'Meublé',
        capacityLabel,
      ];

  const tags = fallbackTags;
  const nearMainRoadInfo = translateRoadProximity(listingData?.features?.near_main_road ?? null);

  const shortDescription =
    property.description.length > 180 && !showFullDescription
      ? `${property.description.slice(0, 180)}...`
      : property.description;

  const shouldShowFeatureToggle = combinedCharacteristics.length > FEATURE_PREVIEW_COUNT;

  const handleLike = () => {
    setIsLiked((prev) => !prev);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: property.title,
        message: `${property.title} - ${property.location.neighborhood}, ${property.location.city}`,
        url: property.images[0],
      });
    } catch (error) {
      console.warn('Share error', error);
    }
  };

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
    setShowVisitPaymentDialog(true);
  };
  const handleVisitRequest = () => ensureAuthenticated('visit', startVisitFlow);
  const handleReservationRequest = () => {
    ensureAuthenticated('reservation', openReservationModal);
  };
  const startChatFlow = () => setShowChatbot(true);
  const handleMessageRequest = () => ensureAuthenticated('chat', startChatFlow);
  const handleFollowToggle = () => ensureAuthenticated('follow', () => setIsFollowing((prev) => !prev));

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

    if (hasVisit && existingVisit) {
      updateVisit(existingVisit.id, {
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
      });
      setVisitSuccessCopy({
        title: 'Visite mise à jour',
        message: 'Votre visite a été mise à jour avec succès.',
        buttonLabel: 'Voir ma visite',
      });
      setShowVisitSuccessModal(true);
      return;
    }

    setShowVisitPaymentModal(true);
  };

  const handleVisitPaymentSuccess = () => {
    setShowVisitPaymentModal(false);
    const visitDate = visitDetails.date ?? new Date();

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
    });

    setVisitSuccessCopy({
      title: 'Visite programmée !',
      message: 'Votre visite a été programmée. Elle sera confirmée automatiquement sous peu.',
      buttonLabel: 'Voir ma visite',
    });
    setShowVisitSuccessModal(true);
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

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  const authMessages: Record<AuthPurpose, string> = {
    visit: 'Connectez-vous pour programmer une visite',
    reservation: 'Connectez-vous pour réserver ce logement',
    chat: 'Connectez-vous pour contacter le propriétaire',
    follow: 'Connectez-vous pour suivre cet hôte',
  };

  // Si pas de property et pas d'erreur, on attend le chargement sans afficher de loader
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
    // Pendant le chargement, on retourne un composant vide mais typé correctement
    return <View style={styles.container} />;
  }

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
              <TouchableOpacity onPress={() => setIsHostAvatarVisible(true)} activeOpacity={0.85}>
                <Image source={{ uri: property.landlord.avatar }} style={styles.landlordAvatar} />
              </TouchableOpacity>
              <View style={styles.landlordDetails}>
                <View style={styles.landlordNameRow}>
                  <Text style={styles.landlordName}>{property.landlord.name}</Text>
                  {property.landlord.verified && (
                    <Image source={VERIFIED_BADGE_ICON} style={styles.verifiedBadgeIcon} />
                  )}
                </View>
                <Text style={styles.landlordRole}>{isFurnished ? 'Hôte' : 'Bailleur'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followButtonActive]}
              onPress={handleFollowToggle}
            >
              <Text
                style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}
              >
                {isFollowing ? 'Suivi' : 'Suivre'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{property.title}</Text>

          <View style={[styles.stats, styles.sectionSpacing]}>
            <View style={styles.statItem}>
              {renderIcon(ICONS.views, 18, '#6B7280')}
              <Text style={styles.statValue}>{property.views.toLocaleString('fr-FR')}</Text>
            </View>
            <View style={styles.statItem}>
              {renderIcon(ICONS.heartOutline, 18, '#6B7280')}
              <Text style={styles.statValue}>{property.likes.toLocaleString('fr-FR')}</Text>
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
              <View style={styles.statItem}>
                {renderIcon(ICONS.star, 18, '#F59E0B')}
                <Text style={styles.statValue}>{property.landlord.rating.toFixed(1)}</Text>
              </View>
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
                <Text style={styles.locationText}>
                  {property.location.neighborhood}, {property.location.city}
                </Text>
                {!isShop && isFurnished && (
                  <Text style={styles.termsText}>Caution: {formatPrice(property.price)} FCFA</Text>
                )}
                {(isShop || (!isShop && !isFurnished)) && (
                  <Text style={styles.termsText}>Nombre de mois : 12 mois · Caution: 1 mois</Text>
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
              <TouchableOpacity style={styles.secondaryButton} onPress={handleVisitRequest}>
                <Text style={styles.secondaryButtonText}>
                  {hasVisit ? 'Modifier ma visite' : 'Programmer une visite'}
                </Text>
              </TouchableOpacity>
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

      <Modal visible={isHostAvatarVisible} transparent animationType="fade" onRequestClose={() => setIsHostAvatarVisible(false)}>
        <TouchableOpacity style={styles.avatarOverlay} activeOpacity={1} onPress={() => setIsHostAvatarVisible(false)}>
          <View style={styles.avatarContent}>
            <Image source={{ uri: property.landlord.avatar }} style={styles.avatarFullImage} resizeMode="cover" />
            <TouchableOpacity style={styles.avatarCloseButton} onPress={() => setIsHostAvatarVisible(false)} activeOpacity={0.8}>
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
  landlordAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  availabilityPillCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  availabilityPillLabel: {
    fontSize: 12,
    color: '#6B7280',
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
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2ECC71',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
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
