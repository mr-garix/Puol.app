import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  Alert,
  Platform,
  ActionSheetIOS,
  Modal,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import { Audio, Video, ResizeMode, InterruptionModeIOS, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LANDLORD_AMENITIES, type AmenityOption } from '@/src/constants/amenities';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/src/contexts/AuthContext';
import { useFeed } from '@/src/contexts/FeedContext';
import {
  useCreateLandlordListingWithRelations,
  useUpdateLandlordListingWithRelations,
  useLandlordListing,
  useDeleteLandlordListing,
} from '@/src/features/landlord-listings/hooks';
import type {
  FullListing,
  ListingFeatureFlagKeys,
  ListingFeaturesRow,
  ListingMediaRow,
  ListingRoomsRow,
} from '@/src/types/listings';
import { orderMediaRowsByType } from '@/src/utils/media';
import { toCdnUrl } from '@/src/utils/cdn';
import {
  createPlacesSessionToken,
  fetchPlaceSuggestions,
  fetchPlaceDetails,
  type PlaceSuggestion,
  type PlaceDetails,
} from '@/src/features/search/services/googlePlaces';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  muted: '#6B7280',
  dark: '#0F172A',
  accent: '#2ECC71',
  danger: '#DC2626',
};

const getPickerErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    if (error.message.includes('Camera is not supported on web')) {
      return 'La caméra n’est pas disponible sur ce simulateur. Testez sur un appareil physique.';
    }
    if (error.message.includes('User cancelled image picker')) {
      return 'Sélection annulée.';
    }
    return error.message;
  }
  return fallback;
};

const ROOM_COUNTERS = ['Salon', 'Chambre', 'Cuisine', 'Salle de bain', 'Salle à manger', 'Toilette'] as const;
const createEmptyRoomCounts = (): Record<(typeof ROOM_COUNTERS)[number], number> => ({
  Salon: 0,
  Chambre: 0,
  Cuisine: 0,
  'Salle de bain': 0,
  'Salle à manger': 0,
  Toilette: 0,
});
const LISTING_TYPES = [
  'Appartement',
  'Studio',
  'Chambre',
  'Maison',
  'Villa',
  'Penthouse',
  'Duplex',
  'Suite',
  'Loft',
  'Maison d’hôtes',
  'Boutique',
  'Espace commercial',
  'Bureau',
  'Terrain',
] as const;

const LISTING_TYPES_REQUIRING_SURFACE = new Set<string>(['boutique', 'espace commercial', 'bureau', 'terrain']);


const getIsoDateWithOffset = (offset: number) => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + offset);
  return base.toISOString().split('T')[0];
};

const parseCityDistrict = (rawAddress: string) => {
  const parts = rawAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const city = parts.pop()!;
    const district = parts.join(', ');
    return { city, district, isValid: true };
  }
  const fallback = parts[0] ?? '';
  return { city: fallback, district: fallback, isValid: false };
};

const formatSuggestionAddress = (suggestion: PlaceSuggestion) => {
  const normalize = (text?: string) =>
    (text ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

  const [cityFromSecondary] = normalize(suggestion.secondary);
  if (cityFromSecondary) {
    return `${suggestion.primary}, ${cityFromSecondary}`;
  }

  const descriptionParts = normalize(suggestion.description);
  if (descriptionParts.length >= 2) {
    return `${descriptionParts[0]}, ${descriptionParts[1]}`;
  }

  return suggestion.description?.trim() || suggestion.primary;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findComponentLongName = (components: PlaceDetails['components'], typeCandidates: string[]) => {
  if (!Array.isArray(components)) {
    return '';
  }
  const match = components.find((component) =>
    component?.types?.some((type: string) => typeCandidates.includes(type)),
  );
  return match?.long_name ?? '';
};

const resolveCityFromComponents = (components: PlaceDetails['components']) =>
  findComponentLongName(components, ['locality', 'administrative_area_level_2', 'administrative_area_level_1']);

const resolveDistrictFromComponents = (components: PlaceDetails['components']) =>
  findComponentLongName(components, ['sublocality_level_1', 'sublocality', 'neighborhood', 'political']);

const stripTrailingCity = (addressValue: string, cityValue: string) => {
  if (!addressValue || !cityValue) {
    return addressValue;
  }
  const pattern = new RegExp(`(,?\\s*)${escapeRegExp(cityValue)}$`, 'i');
  return addressValue.replace(pattern, '').trim();
};

const deriveDistrictValue = (params: { address: string; city: string; fallbackDistrict: string }) => {
  const addressValue = params.address.trim();
  const fallbackDistrict = params.fallbackDistrict.trim();
  const cityValue = params.city.trim();

  if (fallbackDistrict) {
    const cityLower = cityValue.toLowerCase();
    const districtLower = fallbackDistrict.toLowerCase();
    if (!cityLower || districtLower !== cityLower) {
      return fallbackDistrict;
    }
  }

  if (!addressValue) {
    return '';
  }

  if (cityValue) {
    const stripped = stripTrailingCity(addressValue, cityValue);
    if (stripped && stripped.toLowerCase() !== cityValue.toLowerCase()) {
      return stripped;
    }
  }

  const { district } = parseCityDistrict(addressValue);
  return district || addressValue;
};



type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type IconDescriptor = { library: 'Feather'; name: FeatherIconName } | { library: 'MaterialCommunityIcons'; name: MaterialIconName };

const AMENITY_OPTIONS: AmenityOption[] = [...LANDLORD_AMENITIES];
const ALLOWED_AMENITY_IDS = new Set(AMENITY_OPTIONS.map((option) => option.id));

const renderAmenityIcon = (icon: IconDescriptor, color: string): React.ReactNode => {
  if (icon.library === 'Feather') {
    return <Feather name={icon.name} size={16} color={color} />;
  }
  return <MaterialCommunityIcons name={icon.name} size={16} color={color} />;
};

type RoomType = (typeof ROOM_COUNTERS)[number];
type ListingType = '' | (typeof LISTING_TYPES)[number];
type AmenityId = (typeof AMENITY_OPTIONS)[number]['id'];

type MediaItem = {
  id: string;
  type: 'photo' | 'video';
  uri: string;
  room: RoomType | null;
  muted: boolean;
  duration: number;
  source: 'camera' | 'library';
  coverUri?: string;
  thumbnailUrl?: string | null;
};

type FieldErrorKey =
  | 'media'
  | 'cover'
  | 'title'
  | 'price'
  | 'deposit_amount'
  | 'min_lease_months'
  | 'address'
  | 'city'
  | 'surfaceArea'
  | 'listingType'
  | 'rooms'
  | 'capacity'
  | 'description'
  | 'amenities';

const createFieldErrors = (): Record<FieldErrorKey, string | null> => ({
  media: null,
  cover: null,
  title: null,
  price: null,
  deposit_amount: null,
  min_lease_months: null,
  address: null,
  city: null,
  surfaceArea: null,
  listingType: null,
  rooms: null,
  capacity: null,
  description: null,
  amenities: null,
});

const REQUIRED_FIELD_ORDER: FieldErrorKey[] = ['media', 'cover', 'title', 'price', 'deposit_amount', 'min_lease_months', 'address', 'city', 'listingType', 'surfaceArea', 'rooms', 'capacity', 'description', 'amenities'];

const LONG_CLIP_THRESHOLD = 90; // seconds
const PHOTO_TARGET_RATIO = 9 / 16;
const PHOTO_RATIO_TOLERANCE = 0.01;
const COVER_TARGET_RATIO = 1;
const COVER_RATIO_TOLERANCE = 0.02;

const ensurePhotoAspectRatio = async (asset: ImagePicker.ImagePickerAsset) => {
  if (!asset || asset.type?.toLowerCase().includes('video')) {
    return asset;
  }
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  if (!width || !height) {
    return asset;
  }
  const ratio = width / height;
  if (Math.abs(ratio - PHOTO_TARGET_RATIO) <= PHOTO_RATIO_TOLERANCE) {
    return asset;
  }
  let cropWidth = width;
  let cropHeight = height;
  if (ratio > PHOTO_TARGET_RATIO) {
    cropWidth = Math.round(height * PHOTO_TARGET_RATIO);
  } else {
    cropHeight = Math.round(width / PHOTO_TARGET_RATIO);
  }
  const originX = Math.max(0, Math.round((width - cropWidth) / 2));
  const originY = Math.max(0, Math.round((height - cropHeight) / 2));
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [
      {
        crop: {
          originX,
          originY,
          width: cropWidth,
          height: cropHeight,
        },
      },
    ],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
  );
  return {
    ...asset,
    uri: result.uri,
    width: cropWidth,
    height: cropHeight,
  } as ImagePicker.ImagePickerAsset;
};

const ensureCoverAspectRatio = async (asset: ImagePicker.ImagePickerAsset) => {
  if (!asset || asset.type?.toLowerCase().includes('video')) {
    return asset;
  }
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  if (!width || !height) {
    return asset;
  }
  const ratio = width / height;
  if (Math.abs(ratio - COVER_TARGET_RATIO) <= COVER_RATIO_TOLERANCE) {
    return asset;
  }
  const side = Math.min(width, height);
  const originX = Math.max(0, Math.round((width - side) / 2));
  const originY = Math.max(0, Math.round((height - side) / 2));
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [
      {
        crop: {
          originX,
          originY,
          width: side,
          height: side,
        },
      },
    ],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
  );
  return {
    ...asset,
    uri: result.uri,
    width: side,
    height: side,
  } as ImagePicker.ImagePickerAsset;
};

const formatDuration = (totalSeconds: number) => {
  if (!totalSeconds || Number.isNaN(totalSeconds)) {
    return '0:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, Math.round(totalSeconds - minutes * 60));
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const VIDEO_MEDIA_TYPES = ['videos'] as unknown as ImagePicker.MediaTypeOptions;
const PHOTO_MEDIA_TYPES = ['images'] as unknown as ImagePicker.MediaTypeOptions;
const LIBRARY_MEDIA_TYPES = ['videos', 'images'] as unknown as ImagePicker.MediaTypeOptions;

const buildMediaItemFromAsset = (
  asset: ImagePicker.ImagePickerAsset,
  source: MediaItem['source'],
): MediaItem => {
  const uri = asset?.uri;
  if (!uri) {
    throw new Error('URI indisponible');
  }
  const isVideo = asset?.type?.toLowerCase().includes('video');
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: isVideo ? 'video' : 'photo',
    uri,
    room: null,
    muted: false,
    duration: isVideo ? asset.duration ?? 0 : 0,
    source,
    thumbnailUrl: null,
  };
};

const ensureLeadVideo = (items: MediaItem[]) => {
  const firstVideoIndex = items.findIndex((item) => item.type === 'video');
  if (firstVideoIndex <= 0) {
    return items;
  }
  const nextItems = [...items];
  const [leadVideo] = nextItems.splice(firstVideoIndex, 1);
  return [leadVideo, ...nextItems];
};

/*
const VIDEO_OPTIMIZATION = {
  width: 1080,
  fps: 30,
  bitrate: 1500,
  maxrate: 2000,
  bufsize: 4000,
};

const stripFileScheme = (uri: string) => (uri?.startsWith('file://') ? uri.replace('file://', '') : uri);

const ensureCachePath = () => {
  const basePath = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!basePath) {
    throw new Error('cache_dir_unavailable');
  }
  return `${basePath}puol-video-${Date.now()}.mp4`;
};
*/

const FEATURE_COLUMN_TO_AMENITY: Partial<Record<ListingFeatureFlagKeys, AmenityId>> = {
  has_ac: 'ac',
  has_wifi: 'wifi',
  has_parking: 'parking',
  generator: 'generator',
  prepay_meter: 'prepaid-meter',
  sonnel_meter: 'sonel-meter',
  water_well: 'borehole',
  water_heater: 'water-heater',
  security_guard: 'guard',
  cctv: 'cctv',
  fan: 'fan',
  tv: 'tv',
  smart_tv: 'smart-tv',
  netflix: 'netflix',
  washing_machine: 'washer',
  balcony: 'balcony',
  terrace: 'terrace',
  veranda: 'veranda',
  mezzanine: 'mezzanine',
  garden: 'garden',
  pool: 'pool',
  gym: 'gym',
  rooftop: 'rooftop',
  elevator: 'elevator',
  accessible: 'accessible',
};

const mapListingFeaturesToAmenities = (features: any[] | null): AmenityId[] => {
  if (!features) {
    return [];
  }

  const amenities: AmenityId[] = [];
  features.forEach((feature) => {
    // Vérifier si c'est la nouvelle structure avec feature_key
    if (feature.feature_key) {
      const amenityId = FEATURE_COLUMN_TO_AMENITY[feature.feature_key as keyof typeof FEATURE_COLUMN_TO_AMENITY];
      if (amenityId && ALLOWED_AMENITY_IDS.has(amenityId)) {
        amenities.push(amenityId);
      }
    } else {
      // Ancienne structure - mapper directement les clés
      Object.entries(feature).forEach(([key, value]) => {
        if (value) {
          const amenityId = FEATURE_COLUMN_TO_AMENITY[key as keyof typeof FEATURE_COLUMN_TO_AMENITY];
          if (amenityId && ALLOWED_AMENITY_IDS.has(amenityId)) {
            amenities.push(amenityId);
          }
        }
      });
    }
  });

  return amenities;
};

const mapFeaturesToAmenities = (features: ListingFeaturesRow | null): AmenityId[] => {
  if (!features) {
    return [];
  }

  const amenities: AmenityId[] = [];
  (Object.entries(features) as [keyof ListingFeaturesRow, boolean | string | null][]).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (key === 'near_main_road') {
      if (value === 'within_100m') {
        amenities.push('road-100');
      } else if (value === 'beyond_200m') {
        amenities.push('road-200');
      }
      return;
    }

    const amenityId = FEATURE_COLUMN_TO_AMENITY[key as ListingFeatureFlagKeys];
    if (amenityId) {
      amenities.push(amenityId);
    }
  });

  return amenities;
};

const mapLandlordRoomsToCounts = (rooms?: ListingRoomsRow | null) => {
  const base = createEmptyRoomCounts();
  if (!rooms) {
    return base;
  }
  return {
    ...base,
    Salon: rooms.living_room ?? base.Salon,
    Chambre: rooms.bedrooms ?? base.Chambre,
    Cuisine: rooms.kitchen ?? base.Cuisine,
    'Salle de bain': rooms.bathrooms ?? base['Salle de bain'],
    'Salle à manger': rooms.dining_room ?? base['Salle à manger'],
    Toilette: rooms.toilets ?? base.Toilette,
  };
};

const mapRoomsToCounts = (rooms?: FullListing['rooms']) => {
  const base = createEmptyRoomCounts();
  if (!rooms) {
    return base;
  }
  return {
    ...base,
    Salon: rooms.living ?? base.Salon,
    Chambre: rooms.bedrooms ?? base.Chambre,
    Cuisine: rooms.kitchen ?? base.Cuisine,
    'Salle de bain': rooms.bathrooms ?? base['Salle de bain'],
    'Salle à manger': rooms.dining ?? base['Salle à manger'],
    Toilette: rooms.toilets ?? base.Toilette,
  };
};


export default function HostListingEditScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top - 40, 2);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isCreateMode = !id;
  const { firebaseUser } = useAuth();
  const { data: existingListing, error: loadError, refresh: refreshListing, isLoading: isLoadingListing } = useLandlordListing(id ?? null);
  const { refreshListings: refreshFeedListings } = useFeed();
  const createMutation = useCreateLandlordListingWithRelations();
  const updateMutation = useUpdateLandlordListingWithRelations();
  const deleteMutation = useDeleteLandlordListing();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [minLease, setMinLease] = useState('');
  const [address, setAddress] = useState('');
  const [googleAddress, setGoogleAddress] = useState('');
  const [description, setDescription] = useState('');
  const [listingType, setListingType] = useState<ListingType>(LISTING_TYPES[0]);
  const [roomCounts, setRoomCounts] = useState<Record<RoomType, number>>(() => createEmptyRoomCounts() as Record<RoomType, number>);
  const [amenities, setAmenities] = useState<AmenityId[]>([]);
  const [guestCapacity, setGuestCapacity] = useState(1);
  const [surfaceArea, setSurfaceArea] = useState('');
    const [media, setMedia] = useState<MediaItem[]>([]);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [coverPhotoUri, setCoverPhotoUri] = useState<string>('');
  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const addressSessionTokenRef = useRef<string | null>(null);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<PlaceSuggestion[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const citySessionTokenRef = useRef<string | null>(null);
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressDetailsRequestRef = useRef<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState('');
  const [resolvedDistrict, setResolvedDistrict] = useState('');
    const previewVideoRef = useRef<Video | null>(null);
  const previewWasPlayingRef = useRef(true);
  const previewCompletedRef = useRef(false);
  const previewVisibleRef = useRef(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const fieldPositionsRef = useRef<Partial<Record<FieldErrorKey, number>>>({});
    const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [previewSeekMillis, setPreviewSeekMillis] = useState(0);
  const [previewVideoLoading, setPreviewVideoLoading] = useState(false);
  const [previewDurationMillis, setPreviewDurationMillis] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [currentlyPlayingTrackId, setCurrentlyPlayingTrackId] = useState<string | null>(null);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [publishSuccessVisible, setPublishSuccessVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastCreatedListingId, setLastCreatedListingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState(createFieldErrors());

  const requiresSurface = useMemo(
    () => LISTING_TYPES_REQUIRING_SURFACE.has((listingType ?? '').toLowerCase()),
    [listingType],
  );

  const visibleRoomCounters = useMemo(
    () =>
      requiresSurface
        ? ROOM_COUNTERS.filter((room) => !['Salon', 'Chambre', 'Salle de bain', 'Salle à manger'].includes(room))
        : ROOM_COUNTERS,
    [requiresSurface],
  );

  useEffect(() => {
    if (!requiresSurface) {
      setSurfaceArea('');
      setFieldErrors((prev) => (prev.surfaceArea ? { ...prev, surfaceArea: null } : prev));
    }
  }, [requiresSurface]);

  const handleSurfaceChange = useCallback((value: string) => {
    setSurfaceArea(value);
    setFieldErrors((prev) => (prev.surfaceArea ? { ...prev, surfaceArea: null } : prev));
  }, []);

  const resetForm = useCallback(() => {
    setTitle('');
    setPrice('');
    setDeposit('');
    setMinLease('');
    setAddress('');
    setGoogleAddress('');
    setDescription('');
    setListingType('' as ListingType);
    setRoomCounts(createEmptyRoomCounts() as Record<RoomType, number>);
    setAmenities([]);
    setGuestCapacity(1);
    setCoverPhotoUri('');
    setAddressSearch('');
    setSelectedPlaceId(null);
    setSelectedLatitude(null);
    setSelectedLongitude(null);
    setFormattedAddress('');
    setResolvedDistrict('');
    addressSessionTokenRef.current = null;
    citySessionTokenRef.current = null;
    addressDetailsRequestRef.current = null;
    setFieldErrors(createFieldErrors());
    setPreviewMedia(null);
    setSurfaceArea('');
    setPreviewSeekMillis(0);
    setPreviewVideoLoading(false);
    setPreviewDurationMillis(0);
    setIsPreviewPlaying(false);
    previewWasPlayingRef.current = false;
    previewCompletedRef.current = false;
    previewVisibleRef.current = false;
  }, []);

  useEffect(() => {
    if (!existingListing || isCreateMode) {
      return;
    }

    const { listing, media: listingMedia, rooms, features } = existingListing;
    setTitle(listing.title ?? '');
    setPrice(listing.price_per_month ? String(listing.price_per_month) : '');
    setDeposit(listing.deposit_amount ? String(listing.deposit_amount) : '');
    setMinLease(listing.min_lease_months ? String(listing.min_lease_months) : '');
    const fallbackAddress = [listing.district, listing.city].filter(Boolean).join(', ');
    const parsedLocation = parseCityDistrict(listing.address_text ?? fallbackAddress);
    setAddress(listing.address_text ?? fallbackAddress);
    setGoogleAddress(listing.google_address ?? '');
    setDescription(listing.description ?? '');
    setListingType((listing.property_type as ListingType) ?? LISTING_TYPES[0]);
    setGuestCapacity(Math.max(1, listing.capacity ?? 1));
        setCityInput(listing.city ?? parsedLocation.city ?? '');
    setResolvedDistrict(listing.district ?? parsedLocation.district ?? '');
    setSelectedPlaceId(listing.place_id ?? null);
    setSelectedLatitude(listing.latitude ?? null);
    setSelectedLongitude(listing.longitude ?? null);
    setFormattedAddress(listing.formatted_address ?? listing.address_text ?? fallbackAddress);
    setAmenities(mapListingFeaturesToAmenities(features));
    setRoomCounts(mapLandlordRoomsToCounts(rooms));
    setCoverPhotoUri(listing.cover_photo_url ?? '');
    setAddressSearch(listing.address_text ?? fallbackAddress);

    const normalizedMedia = orderMediaRowsByType(listingMedia ?? []).map<MediaItem>((item: ListingMediaRow, index: number) => {
      const isVideo = item.media_type === 'video';
      const sourceUri = isVideo ? toCdnUrl(item.media_url) ?? item.media_url : item.media_url;
      return {
        id: item.id,
        type: isVideo ? 'video' : 'photo',
        uri: sourceUri,
        room: (item.media_tag as RoomType | null) ?? null,
        muted: true,
        duration: 0,
        source: 'library',
        coverUri: item.media_type === 'photo' && index === 0 ? (item.media_url ?? undefined) : undefined,
        thumbnailUrl: item.thumbnail_url ?? null,
      };
    });

    setMedia(normalizedMedia);

    const firstMedia = normalizedMedia[0];
    if (firstMedia?.thumbnailUrl) {
      setSurfaceArea(firstMedia.thumbnailUrl);
    }
  }, [existingListing, isCreateMode]);

  useEffect(() => {
    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
      addressDebounceRef.current = null;
    }

    const query = addressSearch.trim();
    if (!query) {
      setAddressSuggestions([]);
      setIsAddressLoading(false);
      addressSessionTokenRef.current = null;
      return () => undefined;
    }

    setIsAddressLoading(true);
    let isActive = true;

    addressDebounceRef.current = setTimeout(() => {
      const sessionToken = addressSessionTokenRef.current ?? createPlacesSessionToken();
      addressSessionTokenRef.current = sessionToken;

      fetchPlaceSuggestions(query, sessionToken)
        .then((suggestions) => {
          if (!isActive) {
            return;
          }
          setAddressSuggestions(suggestions);
          if (suggestions.length === 0) {
            setShowAddressDropdown(false);
          }
        })
        .catch((error) => {
          if (!isActive) {
            return;
          }
          console.warn('[HostListingEdit] address suggestions error', error);
          setAddressSuggestions([]);
          setShowAddressDropdown(false);
        })
        .finally(() => {
          if (!isActive) {
            return;
          }
          setIsAddressLoading(false);
        });
    }, 350);

    return () => {
      isActive = false;
      if (addressDebounceRef.current) {
        clearTimeout(addressDebounceRef.current);
        addressDebounceRef.current = null;
      }
    };
  }, [addressSearch]);

  useEffect(() => {
    if (cityDebounceRef.current) {
      clearTimeout(cityDebounceRef.current);
      cityDebounceRef.current = null;
    }

    const query = cityInput.trim();
    if (!query) {
      setCitySuggestions([]);
      setIsCityLoading(false);
      citySessionTokenRef.current = null;
      setShowCityDropdown(false);
      return () => undefined;
    }

    setIsCityLoading(true);
    let isActive = true;

    cityDebounceRef.current = setTimeout(() => {
      const sessionToken = citySessionTokenRef.current ?? createPlacesSessionToken();
      citySessionTokenRef.current = sessionToken;

      fetchPlaceSuggestions(query, sessionToken, { types: '(cities)' })
        .then((suggestions) => {
          if (!isActive) {
            return;
          }
          setCitySuggestions(suggestions);
          if (suggestions.length === 0) {
            setShowCityDropdown(false);
          }
        })
        .catch((error) => {
          if (!isActive) {
            return;
          }
          console.warn('[HostListingEdit] city suggestions error', error);
          setCitySuggestions([]);
          setShowCityDropdown(false);
        })
        .finally(() => {
          if (!isActive) {
            return;
          }
          setIsCityLoading(false);
        });
    }, 350);

    return () => {
      isActive = false;
      if (cityDebounceRef.current) {
        clearTimeout(cityDebounceRef.current);
        cityDebounceRef.current = null;
      }
    };
  }, [cityInput]);

  const updateMedia = useCallback((updater: (current: MediaItem[]) => MediaItem[]) => {
    setMedia((current) => ensureLeadVideo(updater(current)));
  }, []);

  const appendMediaFromAsset = useCallback(
    (asset: ImagePicker.ImagePickerAsset, source: MediaItem['source']) => {
      try {
        const nextItem = buildMediaItemFromAsset(asset, source);
        updateMedia((current) => {
          const next = [...current, nextItem];
          return next;
        });
      } catch (error) {
        console.warn('[HostListingEdit] failed to process media asset', error);
        Alert.alert('Import impossible', getPickerErrorMessage(error, "Impossible d'ajouter ce média."));
      }
    },
    [updateMedia],
  );

  const optimizeVideoAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => asset, []);

  const stopPreviewAudio = useCallback(async () => {
    if (currentlyPlayingTrackId) {
      setCurrentlyPlayingTrackId(null);
    }
  }, [currentlyPlayingTrackId]);

  const handleGoBack = useCallback(() => {
    stopPreviewAudio().catch(() => null);
    router.back();
  }, [router, stopPreviewAudio]);

  const toggleSelection = (value: string, collection: string[], setter: (next: string[]) => void) => {
    setter(
      collection.includes(value)
        ? collection.filter((item) => item !== value)
        : [...collection, value],
    );
  };

  const handlePickFromLibrary = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Accès requis', 'Autorisez l’accès à vos photos pour importer vos pièces.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: LIBRARY_MEDIA_TYPES,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 120,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const isImage = asset.type?.toLowerCase().includes('image');
        if (isImage) {
          const processed = await ensurePhotoAspectRatio(asset);
          appendMediaFromAsset(processed, 'library');
        } else {
          const optimized = await optimizeVideoAsset(asset);
          appendMediaFromAsset(optimized, 'library');
        }
      }
    } catch (error) {
      console.warn('[HostListingEdit] pick error', error);
      Alert.alert('Import impossible', getPickerErrorMessage(error, 'Impossible de sélectionner ce média.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [appendMediaFromAsset, optimizeVideoAsset]);

  const handleSetCoverFromAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const processed = await ensureCoverAspectRatio(asset);
    setCoverPhotoUri(processed.uri);
  }, []);

  const handlePickCoverFromLibrary = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Accès requis', 'Autorisez l’accès à vos photos pour choisir votre couverture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: PHOTO_MEDIA_TYPES,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets?.length) {
        await handleSetCoverFromAsset(result.assets[0]);
      }
    } catch (error) {
      console.warn('[HostListingEdit] cover pick error', error);
      Alert.alert('Import impossible', getPickerErrorMessage(error, 'Impossible de définir cette photo comme couverture.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [handleSetCoverFromAsset]);

  const handleCaptureCoverPhoto = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Activez la caméra pour prendre une photo de couverture.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: PHOTO_MEDIA_TYPES,
        quality: 1,
      });
      if (!result.canceled && result.assets?.length) {
        await handleSetCoverFromAsset(result.assets[0]);
      }
    } catch (error) {
      console.warn('[HostListingEdit] cover capture error', error);
      Alert.alert('Capture impossible', getPickerErrorMessage(error, 'Impossible de prendre cette photo.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [handleSetCoverFromAsset]);

  const handleSelectCoverPhoto = useCallback(() => {
    if (isProcessingMedia) {
      return;
    }
    const openCamera = () => handleCaptureCoverPhoto();
    const openLibrary = () => handlePickCoverFromLibrary();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Filmer une photo', 'Choisir depuis la galerie', 'Annuler'],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) openCamera();
          if (index === 1) openLibrary();
        },
      );
    } else {
      Alert.alert('Photo de couverture', 'Sélectionnez votre mode de capture', [
        { text: 'Filmer une photo', onPress: openCamera },
        { text: 'Choisir depuis la galerie', onPress: openLibrary },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  }, [handleCaptureCoverPhoto, handlePickCoverFromLibrary, isProcessingMedia]);

  const captureVideo = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Activez la caméra pour prendre des photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: VIDEO_MEDIA_TYPES,
        quality: 1,
        videoMaxDuration: 120,
        aspect: [9, 16],
      });
      if (!result.canceled && result.assets?.length) {
        const optimized = await optimizeVideoAsset(result.assets[0]);
        appendMediaFromAsset(optimized, 'camera');
      }
    } catch (error) {
      console.warn('[HostListingEdit] capture error', error);
      Alert.alert('Capture impossible', getPickerErrorMessage(error, 'Impossible de capturer ce média.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [appendMediaFromAsset, optimizeVideoAsset]);

  const capturePhoto = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Activez la caméra pour prendre des photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: PHOTO_MEDIA_TYPES,
        quality: 1,
      });
      if (!result.canceled && result.assets?.length) {
        const processed = await ensurePhotoAspectRatio(result.assets[0]);
        appendMediaFromAsset(processed, 'camera');
      }
    } catch (error) {
      console.warn('[HostListingEdit] photo capture error', error);
      Alert.alert('Capture impossible', getPickerErrorMessage(error, 'Impossible de prendre cette photo.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [appendMediaFromAsset]);

  const handleOpenCamera = useCallback(() => {
    if (isProcessingMedia) {
      return;
    }
    const openVideo = () => captureVideo();
    const openPhoto = () => capturePhoto();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Filmer une vidéo', 'Prendre une photo', 'Annuler'],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) openVideo();
          if (index === 1) openPhoto();
        },
      );
      return;
    }
    Alert.alert('Caméra', 'Choisissez votre mode de capture', [
      { text: 'Filmer une vidéo', onPress: openVideo },
      { text: 'Prendre une photo', onPress: openPhoto },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }, [capturePhoto, captureVideo, isProcessingMedia]);

  const handleDeleteMedia = useCallback((mediaId: string) => {
    updateMedia((current) => {
      const next = current.filter((item) => item.id !== mediaId);
      if (next.length > 0 && !next.some((item) => item.type === 'video')) {
        Alert.alert('Vidéo obligatoire', 'Le premier média doit rester une vidéo. Ajoutez-en une nouvelle avant de supprimer celle-ci.');
        return current;
      }
      return next;
    });
  }, []);

  const handleAssignRoom = useCallback((mediaId: string, room: RoomType) => {
    updateMedia((current) =>
      current.map((item) =>
        item.id === mediaId
          ? {
              ...item,
              room: item.room === room ? null : room,
            }
          : item,
      ),
    );
  }, []);

  const handleFieldLayout = useCallback(
    (key: FieldErrorKey) => (event: LayoutChangeEvent) => {
      fieldPositionsRef.current[key] = event.nativeEvent.layout.y;
    },
    [],
  );

  const scrollToError = useCallback((key: FieldErrorKey) => {
    const y = fieldPositionsRef.current[key] ?? 0;
    scrollViewRef.current?.scrollTo({ y: Math.max(y - 32, 0), animated: true });
  }, []);

  const validateForm = useCallback(() => {
    const errors = createFieldErrors();
    const roomsTotal = Object.values(roomCounts).reduce((sum, value) => sum + value, 0);

    if (media.length === 0) {
      errors.media = 'Ajoutez au moins un média (photo ou vidéo).';
    }
    if (!coverPhotoUri.trim()) {
      errors.cover = 'Ajoutez une photo de couverture.';
    }
    if (!title.trim()) {
      errors.title = 'Le titre de l’annonce est obligatoire.';
    }
    if (!price.trim()) {
      errors.price = 'Indiquez un tarif.';
    } else {
      const numericPrice = Number(price.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        errors.price = 'Entrez un montant valide.';
      }
    }
    if (!address.trim()) {
      errors.address = 'Renseignez le quartier / la ville.';
    } else {
      const { isValid } = parseCityDistrict(address);
      if (!isValid) {
        errors.address = 'Séparez le quartier et la ville avec une virgule.';
      }
    }
    if (!cityInput.trim()) {
      errors.city = 'Sélectionnez ou tapez une ville.';
    }
    if (requiresSurface) {
      const trimmedSurface = surfaceArea.trim();
      const parsedSurface = Number(trimmedSurface.replace(/[^0-9.,]/g, '').replace(/,/g, '.'));
      if (!trimmedSurface) {
        errors.surfaceArea = 'Indiquez la surface en m².';
      } else if (!Number.isFinite(parsedSurface) || parsedSurface <= 0) {
        errors.surfaceArea = 'Surface invalide.';
      }
    }
    if (!listingType.trim()) {
      errors.listingType = 'Sélectionnez un type de bien.';
    }
    if (!requiresSurface && roomsTotal === 0) {
      errors.rooms = 'Déclarez au moins une pièce.';
    }
    if (description.trim().length < 100) {
      errors.description = 'La description doit contenir au moins 100 caractères.';
    }
    if (amenities.length === 0) {
      errors.amenities = 'Sélectionnez au moins un équipement.';
    }

    setFieldErrors(errors);
    const firstErrorKey = REQUIRED_FIELD_ORDER.find((key) => errors[key]);
    if (firstErrorKey) {
      scrollToError(firstErrorKey);
      return false;
    }
    return true;
  }, [amenities.length, coverPhotoUri, description, address, cityInput, listingType, media, price, requiresSurface, roomCounts, scrollToError, surfaceArea, title]);

  useEffect(() => {
    setFieldErrors((prev) => {
      let next: typeof prev | null = null;
      const roomsTotal = Object.values(roomCounts).reduce((sum, value) => sum + value, 0);
      const surfaceTrimmed = surfaceArea.trim();
      const parsedSurface = Number(surfaceTrimmed.replace(/[^0-9.,]/g, '').replace(/,/g, '.'));

      const clearIfValid = (key: FieldErrorKey, condition: boolean) => {
        if (condition && prev[key]) {
          if (!next) {
            next = { ...prev };
          }
          next[key] = null;
        }
      };

      clearIfValid('media', media.length >= 1);
      clearIfValid('cover', coverPhotoUri.trim().length > 0);
      clearIfValid('title', title.trim().length > 0);
      clearIfValid('price', price.trim().length > 0);
      clearIfValid('address', address.trim().length > 0);
      clearIfValid('city', cityInput.trim().length > 0);
      clearIfValid('listingType', !!listingType.trim());
      clearIfValid('surfaceArea', !requiresSurface || (surfaceTrimmed.length > 0 && Number.isFinite(parsedSurface) && parsedSurface > 0));
      if (!requiresSurface) {
        clearIfValid('rooms', roomsTotal > 0);
        clearIfValid('capacity', guestCapacity > 0);
      }
      clearIfValid('deposit_amount', !deposit || Number(deposit) >= 0);
      clearIfValid('min_lease_months', !minLease || Number(minLease) > 0);
      clearIfValid('description', description.trim().length >= 100);
      clearIfValid('amenities', amenities.length > 0);

      return next ?? prev;
    });
  }, [amenities.length, coverPhotoUri, description, address, cityInput, listingType, media, price, requiresSurface, roomCounts, surfaceArea, title, deposit, minLease, guestCapacity]);

  const handleSave = async ({ publish }: { publish: boolean }) => {
    if (!validateForm()) {
      Alert.alert('Champs manquants', 'Complétez tous les champs obligatoires avant de continuer.');
      return;
    }
    if (!firebaseUser?.uid) {
      Alert.alert('Connexion requise', 'Veuillez vous reconnecter pour publier votre annonce.');
      return;
    }
    const isEditingExisting = !isCreateMode && !!existingListing;

    const sanitizedPrice = Number(price.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!Number.isFinite(sanitizedPrice) || sanitizedPrice <= 0) {
      setFieldErrors((prev) => ({ ...prev, price: 'Entrez un montant valide.' }));
      Alert.alert('Tarif invalide', 'Indiquez un montant numérique valide.');
      return;
    }
    const sanitizedDeposit = deposit ? Number(deposit.replace(/[^0-9.,]/g, '').replace(',', '.')) : null;
    if (sanitizedDeposit !== null && (!Number.isFinite(sanitizedDeposit) || sanitizedDeposit < 0)) {
      setFieldErrors((prev) => ({ ...prev, deposit_amount: 'Entrez un montant valide.' }));
      Alert.alert('Caution invalide', 'Indiquez un montant numérique valide.');
      return;
    }

    const sanitizedMinLease = minLease ? Number(minLease.replace(/[^0-9.,]/g, '').replace(/,/g, '.')) : null;
    if (sanitizedMinLease !== null && (!Number.isFinite(sanitizedMinLease) || sanitizedMinLease <= 0)) {
      setFieldErrors((prev) => ({ ...prev, min_lease_months: 'Durée minimale en mois (> 0).' }));
      Alert.alert('Durée minimale invalide', 'Indiquez un nombre de mois supérieur à zéro.');
      return;
    }

    const surfaceForStorage = (() => {
      if (!requiresSurface) {
        return null;
      }
      const trimmed = surfaceArea.trim();
      const normalized = trimmed.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
      const parsed = Number(normalized);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
      }
      return normalized;
    })();

    const trimmedAddress = address.trim();
    const parsedLocation = parseCityDistrict(trimmedAddress);
    const finalCity = cityInput.trim() || parsedLocation.city;
    const derivedDistrict = deriveDistrictValue({
      address: trimmedAddress,
      city: finalCity,
      fallbackDistrict: resolvedDistrict || parsedLocation.district || '',
    });
    const addressText = trimmedAddress || formattedAddress || '';

    setIsSaving(true);
    try {
      const listingPayload = {
        title: title.trim(),
        property_type: listingType || LISTING_TYPES[0],
        city: finalCity,
        district: derivedDistrict,
        address_text: addressText,
        google_address: googleAddress.trim() || '',
        place_id: selectedPlaceId,
        latitude: selectedLatitude,
        longitude: selectedLongitude,
        formatted_address: formattedAddress.trim() || '',
        price_per_month: Math.round(sanitizedPrice),
        deposit_amount: sanitizedDeposit,
        min_lease_months: sanitizedMinLease,
        description: description.trim(),
        is_available: publish,
        capacity: guestCapacity,
        cover_photo_url: coverPhotoUri || undefined,
      };

      const roomsPayload = {
        living_room: roomCounts.Salon ?? 0,
        bedrooms: roomCounts.Chambre ?? 0,
        kitchen: roomCounts.Cuisine ?? 0,
        bathrooms: roomCounts['Salle de bain'] ?? 0,
        dining_room: roomCounts['Salle à manger'] ?? 0,
        toilets: roomCounts.Toilette ?? 0,
      };

      // Convert amenities to feature keys (inverse mapping)
      const featureKeys = amenities.map(amenity => {
        const featureEntry = Object.entries(FEATURE_COLUMN_TO_AMENITY).find(([_, amenityId]) => amenityId === amenity);
        return featureEntry ? featureEntry[0] : amenity;
      });

      const mediaPayload = media.map((item, index) => ({
        id: item.id,
        uri: item.uri,
        type: item.type,
        room: item.room,
        muted: item.muted,
        thumbnailUrl:
          index === 0
            ? surfaceForStorage ?? null
            : item.thumbnailUrl ?? null,
      }));

      let successTitle = '';
      let successMessage = '';

      if (isEditingExisting) {
        if (!existingListing?.listing?.id) {
          throw new Error('listing_introuvable');
        }
        
        await updateMutation.execute({
          id: existingListing.listing.id,
          listing: listingPayload,
          rooms: roomsPayload,
          features: featureKeys,
          media: mediaPayload,
          coverUri: coverPhotoUri,
        });

        await Promise.all([refreshListing().catch(() => null), refreshFeedListings().catch(() => null)]);
        setLastCreatedListingId(existingListing.listing.id);
        if (publish) {
          setPublishSuccessVisible(true);
          successTitle = 'Annonce mise à jour';
          successMessage = 'Vos modifications sont en ligne et visibles immédiatement.';
        } else {
          Alert.alert('Brouillon enregistré', 'L’annonce a été sauvegardée en brouillon.');
          router.back();
        }
      } else {
        const newListing = await createMutation.execute({
          listing: listingPayload,
          rooms: roomsPayload,
          features: featureKeys,
          media: mediaPayload,
          coverUri: coverPhotoUri,
        });

        setLastCreatedListingId(newListing.id);
        resetForm();
        await refreshFeedListings().catch(() => null);
        if (publish) {
          setPublishSuccessVisible(true);
          successTitle = 'Annonce publiée';
          successMessage = 'Votre annonce est maintenant visible par les clients sur PUOL.';
        } else {
          Alert.alert('Brouillon enregistré', 'Votre brouillon est prêt, vous pourrez le publier plus tard.');
          router.back();
        }
      }

      if (successTitle) {
        Alert.alert(successTitle, successMessage);
      }
    } catch (error) {
      console.error('[LandlordListingEdit] save error', error);
      console.error('[LandlordListingEdit] error details', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        error
      });
      
      let message = "Une erreur est survenue pendant la publication.";
      if (error instanceof Error) {
        message = error.message;
      }
      
      Alert.alert('Publication impossible', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClosePublishModal = useCallback(() => {
    setPublishSuccessVisible(false);
  }, []);

  const handleSaveDraft = useCallback(() => {
    void handleSave({ publish: false });
  }, [handleSave]);

  const handlePublish = useCallback(() => {
    void handleSave({ publish: true });
  }, [handleSave]);

  const handleDelete = useCallback(() => {
    if (!id) {
      return;
    }

    Alert.alert(
      'Supprimer l’annonce',
      'Cette action est définitive. Confirmez-vous la suppression ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setIsSaving(true);
            deleteMutation
              .execute(id)
              .then(async () => {
                await refreshFeedListings().catch(() => null);
                Alert.alert('Annonce supprimée', 'Le brouillon a été supprimé.');
                router.back();
              })
              .catch((error) => {
                console.error('[LandlordListingEdit] delete error', error);
                Alert.alert('Suppression impossible', 'Veuillez réessayer plus tard.');
              })
              .finally(() => {
                setIsSaving(false);
              });
          },
        },
      ],
    );
  }, [deleteMutation, id, refreshFeedListings, router]);

  const handleViewPublishedListing = useCallback(() => {
    setPublishSuccessVisible(false);
    const targetId = id || lastCreatedListingId;
    if (targetId) {
      router.push(`/property/${targetId}` as never);
      return;
    }
    router.push('/host-listings' as never);
  }, [id, lastCreatedListingId, router]);

  const handleRoomAdjust = (room: (typeof ROOM_COUNTERS)[number], delta: 1 | -1) => {
    setRoomCounts((prev) => {
      const nextValue = Math.max(0, (prev[room] ?? 0) + delta);
      return { ...prev, [room]: nextValue };
    });
  };

  const cancelAddressDropdownClose = useCallback(() => {
    if (addressBlurTimeoutRef.current) {
      clearTimeout(addressBlurTimeoutRef.current);
      addressBlurTimeoutRef.current = null;
    }
  }, []);

  const scheduleAddressDropdownClose = useCallback(() => {
    cancelAddressDropdownClose();
    addressBlurTimeoutRef.current = setTimeout(() => {
      setShowAddressDropdown(false);
    }, 275);
  }, [cancelAddressDropdownClose]);

  const cancelCityDropdownClose = useCallback(() => {
    if (cityBlurTimeoutRef.current) {
      clearTimeout(cityBlurTimeoutRef.current);
      cityBlurTimeoutRef.current = null;
    }
  }, []);

  const scheduleCityDropdownClose = useCallback(() => {
    cancelCityDropdownClose();
    cityBlurTimeoutRef.current = setTimeout(() => {
      setShowCityDropdown(false);
    }, 275);
  }, [cancelCityDropdownClose]);

  const handleAddressSuggestionSelect = useCallback(
    async (suggestion: PlaceSuggestion) => {
      cancelAddressDropdownClose();
      const formattedValue = formatSuggestionAddress(suggestion);
      setAddressSearch(formattedValue);
      setAddress(formattedValue);
      setShowAddressDropdown(false);
      setAddressSuggestions([]);
      setIsAddressLoading(false);
      addressSessionTokenRef.current = null;
      const fallbackLocation = parseCityDistrict(formattedValue);
      setFieldErrors((prev) => ({ ...prev, address: null }));
      addressDetailsRequestRef.current = suggestion.id;
      try {
        const details = await fetchPlaceDetails(suggestion.id);
        if (addressDetailsRequestRef.current !== suggestion.id) {
          return;
        }
        if (details) {
          const resolvedCity = resolveCityFromComponents(details.components) || fallbackLocation.city;
          const resolvedDistrictValue =
            resolveDistrictFromComponents(details.components) || fallbackLocation.district || '';
          setCityInput(resolvedCity);
          setFieldErrors((prev) => ({ ...prev, city: null }));
          setSelectedPlaceId(details.placeId);
          setSelectedLatitude(details.latitude);
          setSelectedLongitude(details.longitude);
          setFormattedAddress(details.formattedAddress);
          setResolvedDistrict(resolvedDistrictValue);
        } else {
          setSelectedPlaceId(null);
          setSelectedLatitude(null);
          setSelectedLongitude(null);
          setFormattedAddress('');
          setResolvedDistrict(fallbackLocation.district || '');
        }
      } catch (error) {
        console.warn('[HostListingEdit] place details error', error);
        setResolvedDistrict(fallbackLocation.district || '');
      } finally {
        addressDetailsRequestRef.current = null;
      }
    },
    [cancelAddressDropdownClose, setFieldErrors],
  );

  const handleCitySuggestionSelect = useCallback(
    (suggestion: PlaceSuggestion) => {
      cancelCityDropdownClose();
      const value = suggestion.primary;
      setCityInput(value);
      setShowCityDropdown(false);
      setCitySuggestions([]);
      setIsCityLoading(false);
      citySessionTokenRef.current = null;
      setFieldErrors((prev) => ({ ...prev, city: null }));
    },
    [cancelCityDropdownClose],
  );

  const { videoOrderMap, photoOrderMap } = useMemo(() => {
    const videoMap: Record<string, number> = {};
    const photoMap: Record<string, number> = {};
    let videoCounter = 1;
    let photoCounter = 1;
    media.forEach((item) => {
      if (item.type === 'video') {
        videoMap[item.id] = videoCounter;
        videoCounter += 1;
      } else if (item.type === 'photo') {
        photoMap[item.id] = photoCounter;
        photoCounter += 1;
      }
    });
    return { videoOrderMap: videoMap, photoOrderMap: photoMap };
  }, [media]);

  const activePreviewMedia = useMemo(() => {
    if (!previewMedia) {
      return null;
    }
    return media.find((item) => item.id === previewMedia.id) ?? previewMedia;
  }, [media, previewMedia]);

  const previewDurationSeconds = useMemo(() => {
    if (previewDurationMillis > 0) {
      return previewDurationMillis / 1000;
    }
    return activePreviewMedia?.duration ?? 0;
  }, [activePreviewMedia?.duration, previewDurationMillis]);

  const previewSliderMax = Math.max(previewDurationMillis || previewDurationSeconds * 1000, 1000);

  useEffect(() => {
    previewVisibleRef.current = !!previewMedia;
    if (!previewMedia || previewMedia.type !== 'video') {
      setIsPreviewPlaying(false);
      previewWasPlayingRef.current = false;
      previewCompletedRef.current = false;
      setPreviewSeekMillis(0);
      setPreviewDurationMillis(0);
      setPreviewVideoLoading(false);
    } else {
      setPreviewSeekMillis(0);
      setPreviewDurationMillis(0);
      setPreviewVideoLoading(true);
      setIsPreviewPlaying(false);
      previewWasPlayingRef.current = false;
      previewCompletedRef.current = false;
    }
  }, [previewMedia]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      shouldDuckAndroid: true,
    }).catch((error) => console.warn('[LandlordListingEdit] audio mode error', error));
  }, []);

  const handlePreviewStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        return;
      }
      if (typeof status.positionMillis === 'number') {
        setPreviewSeekMillis(status.positionMillis);
      }
      if (typeof status.durationMillis === 'number' && status.durationMillis > 0) {
        setPreviewDurationMillis(status.durationMillis);
      }
      if ('didJustFinish' in status && status.didJustFinish) {
        setIsPreviewPlaying(false);
        previewWasPlayingRef.current = false;
        previewCompletedRef.current = true;
        previewVideoRef.current?.setStatusAsync({ positionMillis: 0, shouldPlay: false }).catch(() => null);
        setPreviewSeekMillis(0);
        return;
      }
      if (status.isLoaded) {
        setPreviewVideoLoading(false);
      }
    },
    [],
  );

  const handlePreviewPlayPause = useCallback(() => {
    if (!previewMedia || previewMedia.type !== 'video') {
      return;
    }
    setIsPreviewPlaying((current) => {
      const next = !current;
      previewWasPlayingRef.current = next;
      if (next) {
        const status: { positionMillis?: number; shouldPlay: boolean } = { shouldPlay: true };
        if (previewCompletedRef.current) {
          status.positionMillis = 0;
          previewCompletedRef.current = false;
          setPreviewSeekMillis(0);
        }
        previewVideoRef.current?.setStatusAsync(status).catch(() => null);
      } else {
        previewVideoRef.current?.setStatusAsync({ shouldPlay: false }).catch(() => null);
      }
      return next;
    });
  }, [previewMedia]);

  const handlePreviewSlidingStart = useCallback(() => {
    previewWasPlayingRef.current = isPreviewPlaying;
    previewVideoRef.current?.setStatusAsync({ shouldPlay: false }).catch(() => null);
    setIsPreviewPlaying(false);
  }, [isPreviewPlaying]);

  const handlePreviewSlidingComplete = useCallback((value: number) => {
    setPreviewSeekMillis(value);
    previewVideoRef.current
      ?.setStatusAsync({ positionMillis: value, shouldPlay: previewWasPlayingRef.current })
      .catch(() => null);
    setIsPreviewPlaying(previewWasPlayingRef.current);
  }, []);

  if (loadError && !isCreateMode) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: headerTopPadding }]} > 
        <StatusBar hidden />
        <View style={[styles.header, { paddingTop: headerTopPadding }]} > 
          <TouchableOpacity style={styles.headerButton} onPress={handleGoBack} activeOpacity={0.85}>
            <Feather name="chevron-left" size={20} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Modifier l’annonce</Text>
          </View>
        </View>
        <View style={[styles.sectionCard, { margin: 16, alignItems: 'center', gap: 12 }]} > 
          <Feather name="alert-triangle" size={24} color={COLORS.danger} />
          <Text style={styles.sectionTitle}>Impossible de charger l’annonce</Text>
          <Text style={styles.sectionSubtitle}>{loadError?.message || 'Une erreur est survenue'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()} activeOpacity={0.85}> 
            <Text style={styles.primaryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoadingListing && !isCreateMode) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: headerTopPadding }]} > 
        <StatusBar hidden />
        <View style={[styles.header, { paddingTop: headerTopPadding }]} > 
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.85}>
            <Feather name="chevron-left" size={20} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Modifier l’annonce</Text>
          </View>
        </View>
        <View style={[styles.sectionCard, { margin: 16, alignItems: 'center', gap: 12 }]} > 
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.sectionSubtitle}>Chargement de l’annonce…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: headerTopPadding }]} > 
      <StatusBar hidden />
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.85}>
          <Feather name="chevron-left" size={20} color={COLORS.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{isCreateMode ? 'Création d’annonce' : 'Modifier l’annonce'}</Text>
        </View>
        {!isCreateMode ? (
          <View style={styles.headerBadge}>
            <Feather name="zap" size={12} color={COLORS.accent} />
            <Text style={styles.headerBadgeText}>En ligne</Text>
          </View>
        ) : (
          <View style={styles.headerBadgeDraft}>
            <Feather name="edit-3" size={12} color={COLORS.muted} />
            <Text style={styles.headerBadgeTextDraft}>Brouillon</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        ref={scrollViewRef}
      >
        <View
          style={[styles.sectionCard, fieldErrors.media && styles.sectionCardError]}
          onLayout={handleFieldLayout('media')}
        >
          <SectionHeader
            title="Photos & vidéos"
            subtitle="Ajoutez des médias par pièce pour un rendu immersif"
          />
          {fieldErrors.media && <Text style={styles.fieldErrorText}>{fieldErrors.media}</Text>}
          <View style={styles.mediaGrid}>
            {media.map((item) => (
              <TouchableOpacity key={item.id} style={styles.mediaTile} activeOpacity={0.9} onPress={() => setPreviewMedia(item)}>
                {item.type === 'photo' || item.coverUri ? (
                  <Image source={{ uri: item.coverUri ?? item.uri }} style={styles.mediaImage} />
                ) : (
                  <Video
                    source={{ uri: item.uri }}
                    style={styles.mediaImage}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted={item.muted}
                    useNativeControls={false}
                  />
                )}
                <View style={styles.mediaTopRow}>
                  {item.room && (
                    <View style={styles.mediaRoomPill}>
                      <Feather name="tag" size={12} color={COLORS.accent} />
                      <Text style={styles.mediaRoomText}>{item.room}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.mediaDelete}
                  activeOpacity={0.85}
                  onPress={() => handleDeleteMedia(item.id)}
                >
                  <Feather name="trash-2" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.mediaActionsRow}>
            <TouchableOpacity
              style={[styles.mediaActionButton, styles.mediaActionPrimary, isProcessingMedia && styles.mediaActionButtonDisabled]}
              onPress={handleOpenCamera}
              activeOpacity={0.9}
              disabled={isProcessingMedia}
            >
              <View style={styles.mediaActionIcon}>
                <Feather name="video" size={16} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mediaActionText}>
                  {isProcessingMedia ? 'Traitement en cours…' : 'Ouvrir la caméra'}
                </Text>
                <Text style={styles.mediaActionSubtext}>Choisissez vidéo ou photo, ratio 9:16 recommandé</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mediaActionButton, isProcessingMedia && styles.mediaActionButtonDisabled]}
              onPress={handlePickFromLibrary}
              activeOpacity={0.9}
              disabled={isProcessingMedia}
            >
              <View style={styles.mediaActionIconSecondary}>
                <Feather name="image" size={16} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mediaActionText}>Ajouter depuis la galerie</Text>
                <Text style={styles.mediaActionSubtext}>Recadrage automatique en 9:16</Text>
              </View>
              <Feather name="plus-circle" size={18} color={COLORS.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.mediaActionButton,
                styles.coverActionButton,
                fieldErrors.cover && styles.mediaActionButtonError,
                isProcessingMedia && styles.mediaActionButtonDisabled,
              ]}
              onPress={handleSelectCoverPhoto}
              activeOpacity={0.9}
              disabled={isProcessingMedia}
            >
              <View style={styles.mediaActionIconSecondary}>
                <Feather name="star" size={16} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mediaActionText}>Photo de couverture</Text>
                <Text style={styles.mediaActionSubtext}>
                  {coverPhotoUri ? 'Actualisez votre image vitrine' : 'Choisissez une photo paysage accrocheuse'}
                </Text>
              </View>
              <Feather name="camera" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
          {coverPhotoUri ? (
            <View style={styles.coverPreviewCard}>
              <Image source={{ uri: coverPhotoUri }} style={styles.coverPreviewImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.coverPreviewTitle}>Photo de couverture</Text>
                <Text style={styles.coverPreviewSubtitle}>
                  Choisissez une photo paysage, lumineuse et soignée : c’est elle qui s’affichera en premier dans les
                  résultats de recherche et qui donnera envie aux clients d’ouvrir votre annonce.
                </Text>
                <TouchableOpacity style={styles.coverPreviewAction} onPress={handleSelectCoverPhoto} activeOpacity={0.85}>
                  <Feather name="refresh-ccw" size={14} color={COLORS.accent} />
                  <Text style={styles.coverPreviewActionText}>Changer de photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          <View style={styles.mediaControlList}>
            {media.map((item) => (
              <View key={`controls-${item.id}`} style={styles.mediaControlCard}>
                <View style={styles.mediaControlHeader}>
                  <Text style={styles.mediaControlTitle}>
                    {item.type === 'video'
                      ? `Clip vidéo ${videoOrderMap[item.id] ? `#${videoOrderMap[item.id]}` : ''}`
                      : `Photo ${photoOrderMap[item.id] ? `#${photoOrderMap[item.id]}` : ''}`}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomChipRow}>
                  {ROOM_COUNTERS.map((room) => {
                    const active = item.room === room;
                    return (
                      <TouchableOpacity
                        key={`${item.id}-${room}`}
                        style={[styles.roomChip, active && styles.roomChipActive]}
                        onPress={() => handleAssignRoom(item.id, room)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.roomChipText, active && styles.roomChipTextActive]}>{room}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.sectionCard, fieldErrors.title && styles.sectionCardError]} onLayout={handleFieldLayout('title')}>
          <SectionHeader
            title="Informations principales"
            subtitle="Titre, adresse et tarifs visibles côté clients"
          />
          {fieldErrors.title && <Text style={styles.fieldErrorText}>{fieldErrors.title}</Text>}
          <LabeledInput label="Titre de l’annonce" value={title} onChangeText={setTitle} placeholder="Ex : Appartement Moderne" error={fieldErrors.title} />
          <View style={{ marginBottom: 16 }}>
            <Label text="Type de bien" />
            <TouchableOpacity
              style={[styles.selectInput, (fieldErrors.listingType && styles.selectInputError) || (isTypePickerOpen && styles.selectInputActive)]}
              activeOpacity={0.85}
              onPress={() => setIsTypePickerOpen((current) => !current)}
            >
              <Text
                style={[styles.selectInputValue, !listingType && styles.selectInputValuePlaceholder]}
              >
                {listingType || 'Sélectionner un type'}
              </Text>
              <Feather name={isTypePickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.dark} />
            </TouchableOpacity>
            {isTypePickerOpen && (
              <View style={styles.dropdownContainer}>
                {LISTING_TYPES.map((typeOption) => {
                  const active = listingType === typeOption;
                  return (
                    <TouchableOpacity
                      key={typeOption}
                      style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setListingType(typeOption);
                        setIsTypePickerOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{typeOption}</Text>
                      {active && <Feather name="check" size={14} color={COLORS.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          <LabeledInput label="Loyer mensuel" value={price} onChangeText={setPrice} keyboardType="numeric" error={fieldErrors.price} />
          <LabeledInput label="Montant de la caution" value={deposit} onChangeText={setDeposit} keyboardType="numeric" error={fieldErrors.deposit_amount} />
          <LabeledInput label="Durée minimale (mois)" value={minLease} onChangeText={setMinLease} keyboardType="numeric" error={fieldErrors.min_lease_months} />
          {requiresSurface ? (
            <LabeledInput
              label="Surface (m²)"
              value={surfaceArea}
              onChangeText={handleSurfaceChange}
              keyboardType="numeric"
              placeholder="Ex. 75"
              error={fieldErrors.surfaceArea}
            />
          ) : null}
          <View style={{ marginBottom: 16 }}>
            <Label text="Quartier, ville" />
            <View style={[styles.addressInputWrapper, styles.addressInputWrapperTop]}>
              <TextInput
                style={[styles.addressInput, fieldErrors.address && styles.inputError]}
                placeholder="Ex. Bonapriso, Douala"
                placeholderTextColor="#9CA3AF"
                value={addressSearch}
                onFocus={() => {
                  cancelAddressDropdownClose();
                  setShowAddressDropdown(true);
                  setFieldErrors((prev) => ({ ...prev, address: null }));
                }}
                onBlur={scheduleAddressDropdownClose}
                onChangeText={(text) => {
                  setAddressSearch(text);
                  setAddress(text);
                  setShowAddressDropdown(true);
                  setSelectedPlaceId(null);
                  setSelectedLatitude(null);
                  setSelectedLongitude(null);
                  setFormattedAddress('');
                  setResolvedDistrict('');
                  addressDetailsRequestRef.current = null;
                }}
              />
              {showAddressDropdown && (addressSuggestions.length > 0 || isAddressLoading) && (
                <View style={styles.addressDropdown}>
                  {addressSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.addressDropdownItem}
                      onPressIn={cancelAddressDropdownClose}
                      onPress={() => handleAddressSuggestionSelect(suggestion)}
                    >
                      <Text style={styles.addressDropdownTitle}>{suggestion.primary}</Text>
                      {!!suggestion.secondary && (
                        <Text style={styles.addressDropdownSubtitle}>{suggestion.secondary}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  {isAddressLoading && (
                    <View style={styles.addressDropdownFooter}>
                      <ActivityIndicator size="small" color={COLORS.accent} />
                      <Text style={styles.addressDropdownFooterText}>Recherche de quartiers…</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            {fieldErrors.address && <Text style={styles.fieldErrorText}>{fieldErrors.address}</Text>}
          </View>
          <View style={{ marginBottom: 16 }} onLayout={handleFieldLayout('city')}>
            <Label text="Ville" />
            <View style={[styles.addressInputWrapper, styles.addressInputWrapperMid]}>
              <TextInput
                style={[styles.addressInput, fieldErrors.city && styles.inputError]}
                placeholder="Ex. Douala"
                placeholderTextColor="#9CA3AF"
                value={cityInput}
                onFocus={() => {
                  cancelCityDropdownClose();
                  setShowCityDropdown(true);
                  setFieldErrors((prev) => ({ ...prev, city: null }));
                }}
                onBlur={scheduleCityDropdownClose}
                onChangeText={(text) => {
                  setCityInput(text);
                  setFieldErrors((prev) => ({ ...prev, city: null }));
                  setShowCityDropdown(true);
                }}
              />
              {showCityDropdown && (citySuggestions.length > 0 || isCityLoading) && (
                <View style={styles.addressDropdown}>
                  {citySuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.addressDropdownItem}
                      onPressIn={cancelCityDropdownClose}
                      onPress={() => handleCitySuggestionSelect(suggestion)}
                    >
                      <Text style={styles.addressDropdownTitle}>{suggestion.primary}</Text>
                      {!!suggestion.secondary && (
                        <Text style={styles.addressDropdownSubtitle}>{suggestion.secondary}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  {isCityLoading && (
                    <View style={styles.addressDropdownFooter}>
                      <ActivityIndicator size="small" color={COLORS.accent} />
                      <Text style={styles.addressDropdownFooterText}>Recherche de villes…</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            {fieldErrors.city && <Text style={styles.fieldErrorText}>{fieldErrors.city}</Text>}
          </View>
          <LabeledInput
            label="Adresse Google"
            value={googleAddress}
            onChangeText={setGoogleAddress}
            placeholder="Lien Google Maps"
          />
        </View>

        {!requiresSurface || (requiresSurface && visibleRoomCounters.length > 0) ? (
          <View style={[styles.sectionCard, fieldErrors.rooms && styles.sectionCardError]} onLayout={handleFieldLayout('rooms')}>
            <SectionHeader
              title="Répartition des pièces"
              subtitle="Déclarez précisément le nombre de pièces"
            />
            {fieldErrors.rooms && <Text style={styles.fieldErrorText}>{fieldErrors.rooms}</Text>}
            <View style={{ gap: 12 }}>
              {visibleRoomCounters.map((room) => (
                <View key={room} style={styles.counterRow}>
                  <Text style={styles.counterLabel}>{room}</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => handleRoomAdjust(room, -1)}
                      activeOpacity={0.8}
                    >
                      <Feather name="minus" size={16} color={COLORS.dark} />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{roomCounts[room] ?? 0}</Text>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => handleRoomAdjust(room, 1)}
                      activeOpacity={0.8}
                    >
                      <Feather name="plus" size={16} color={COLORS.dark} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.supportText}>Ajustez les nombres pour refléter fidèlement votre bien.</Text>
          </View>
        ) : null}

        {!requiresSurface && (
          <View style={[styles.sectionCard, fieldErrors.capacity && styles.sectionCardError]} onLayout={handleFieldLayout('capacity')}>
            <SectionHeader
              title="Capacité d’accueil"
              subtitle="Indiquez le nombre maximum de locataires admis"
            />
            {fieldErrors.capacity && <Text style={styles.fieldErrorText}>{fieldErrors.capacity}</Text>}
            <View style={styles.counterRow}>
              <Text style={styles.counterLabel}>Nombre de personnes</Text>
              <View style={styles.counterControls}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setGuestCapacity((value) => Math.max(1, value - 1))}
                  activeOpacity={0.8}
                >
                  <Feather name="minus" size={16} color={COLORS.dark} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{guestCapacity}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setGuestCapacity((value) => value + 1)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={16} color={COLORS.dark} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.sectionCard, fieldErrors.description && styles.sectionCardError]} onLayout={handleFieldLayout('description')}>
          <SectionHeader
            title="Description détaillée"
            subtitle="Présentez les points forts de votre logement et ajoutez toutes les informations utiles au client"
          />
          {fieldErrors.description && <Text style={styles.fieldErrorText}>{fieldErrors.description}</Text>}
          <Text style={[styles.supportText, styles.noteText]}>
            N.B. : Ne communiquez jamais l’adresse exacte ni un numéro de téléphone dans cette description, sous peine de
            bannissement.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={[styles.sectionCard, fieldErrors.amenities && styles.sectionCardError]} onLayout={handleFieldLayout('amenities')}>
          <SectionHeader
            title="Équipements & services"
            subtitle="Choisissez les hashtags qui décrivent réellement ce meublé pour maximiser votre visibilité."
          />
          {fieldErrors.amenities && <Text style={styles.fieldErrorText}>{fieldErrors.amenities}</Text>}
          <View style={styles.amenitiesScrollContainer}>
            <ScrollView
              style={styles.amenitiesScroll}
              contentContainerStyle={styles.amenitiesGrid}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {AMENITY_OPTIONS.map((option) => {
                const active = amenities.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.amenityChip, active && styles.amenityChipActive]}
                    onPress={() => toggleSelection(option.id, amenities, setAmenities)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.amenityIconHolder, active && styles.amenityIconHolderActive]}>
                      {renderAmenityIcon(option.icon, active ? '#FFFFFF' : COLORS.accent)}
                    </View>
                    <Text style={[styles.amenityLabel, active && styles.amenityLabelActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={[styles.sectionCard, { marginBottom: 48 }]}>
          <SectionHeader
            title="Publication"
            subtitle={isCreateMode ? 'Publiez votre annonce quand tout est prêt' : 'Mettez à jour ou dépubliez votre annonce'}
          />
          {isCreateMode ? (
            <>
              <View style={[styles.footerActions, styles.footerActionsColumn]}>
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.secondaryButtonFullWidth]}
                  activeOpacity={0.85}
                  onPress={handleSaveDraft}
                  disabled={isSaving}
                >
                  <Text style={styles.secondaryButtonText}>Enregistrer en brouillon</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                activeOpacity={0.9}
                onPress={handlePublish}
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText}>{isCreateMode ? 'Publier' : 'Mettre à jour'}</Text>
                <Feather name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.footerActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.85}
                  onPress={handleSaveDraft}
                  disabled={isSaving}
                >
                  <Text style={styles.secondaryButtonText}>Enregistrer en brouillon</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                  activeOpacity={0.9}
                  onPress={handlePublish}
                  disabled={isSaving}
                >
                  <Text style={styles.primaryButtonText}>Mettre à jour</Text>
                  <Feather name="send" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.dangerButton, isSaving && styles.buttonDisabled]}
                activeOpacity={0.88}
                onPress={handleDelete}
                disabled={isSaving}
              >
                <Text style={styles.dangerButtonText}>Supprimer l’annonce</Text>
                <Feather name="trash-2" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!previewMedia}
        animationType="fade"
        presentationStyle="fullScreen"
        hardwareAccelerated
        onRequestClose={() => setPreviewMedia(null)}
      >
        <View style={styles.previewFullscreen}>
          <View style={[styles.previewMediaArea, { paddingTop: insets.top }]}>
            {activePreviewMedia?.type === 'photo' ? (
              <Image
                source={{ uri: activePreviewMedia?.uri }}
                style={styles.previewFullscreenMedia}
                resizeMode="contain"
              />
            ) : (
              <>
                <TouchableWithoutFeedback onPress={handlePreviewPlayPause}>
                  <Video
                    key={activePreviewMedia?.id ?? 'preview-video'}
                    ref={previewVideoRef}
                    source={{ uri: activePreviewMedia?.uri ?? '' }}
                    style={styles.previewFullscreenMedia}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isPreviewPlaying}
                    isMuted={activePreviewMedia?.muted ?? false}
                    useNativeControls={false}
                    onPlaybackStatusUpdate={handlePreviewStatus}
                    onLoadStart={() => setPreviewVideoLoading(true)}
                    onLoad={() => setPreviewVideoLoading(false)}
                    onError={(error) => {
                      setPreviewVideoLoading(false);
                      console.warn('[LandlordPreviewVideo] error', error);
                      if (!previewVisibleRef.current) {
                        return;
                      }
                      Alert.alert('Lecture impossible', 'Vidéo introuvable ou incompatible. Consultez les logs Expo pour le détail.');
                    }}
                  />
                </TouchableWithoutFeedback>
                {previewVideoLoading && (
                  <View style={styles.previewLoadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="large" />
                    <Text style={styles.previewLoadingText}>Chargement de la vidéo…</Text>
                  </View>
                )}
                {!isPreviewPlaying && !previewVideoLoading && (
                  <TouchableOpacity
                    style={styles.previewCenterPlayButton}
                    onPress={handlePreviewPlayPause}
                    activeOpacity={0.9}
                  >
                    <Feather name="play" size={26} color={COLORS.dark} />
                  </TouchableOpacity>
                )}
              </>
            )}
            <View style={[styles.previewOverlayTop, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity style={styles.previewBackButton} onPress={() => setPreviewMedia(null)} activeOpacity={0.85}>
                <Feather name="chevron-left" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              {activePreviewMedia?.room ? (
                <View style={styles.previewTagPill}>
                  <Feather name="tag" size={14} color="#FFFFFF" />
                  <Text style={styles.previewTagText}>{activePreviewMedia.room}</Text>
                </View>
              ) : (
                <View style={{ width: 44, height: 44 }} />
              )}
            </View>
            {activePreviewMedia?.type === 'video' && !previewVideoLoading && previewDurationMillis > 0 && (
              <View style={styles.previewOverlayBottom}>
                <View style={styles.previewTimelineRow}>
                  <Text style={styles.previewTimeText}>{formatDuration(Math.floor(previewSeekMillis / 1000))}</Text>
                  <Slider
                    style={styles.previewSlider}
                    minimumValue={0}
                    maximumValue={previewSliderMax}
                    minimumTrackTintColor={COLORS.accent}
                    maximumTrackTintColor="rgba(255,255,255,0.25)"
                    thumbTintColor={COLORS.accent}
                    value={previewSeekMillis}
                    onValueChange={(value) => setPreviewSeekMillis(value)}
                    onSlidingStart={handlePreviewSlidingStart}
                    onSlidingComplete={handlePreviewSlidingComplete}
                  />
                  <Text style={styles.previewTimeText}>{formatDuration(Math.floor((previewDurationMillis || previewSliderMax) / 1000))}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={publishSuccessVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClosePublishModal}
      >
        <View style={styles.publishModalOverlay}>
          <View style={styles.publishModalCard}>
            <TouchableOpacity style={styles.publishModalClose} onPress={handleClosePublishModal} activeOpacity={0.85}>
              <Feather name="x" size={18} color={COLORS.dark} />
            </TouchableOpacity>
            <View style={styles.publishModalIcon}>
              <Feather name="check-circle" size={32} color={COLORS.accent} />
            </View>
            <Text style={styles.publishModalTitle}>{isCreateMode ? 'Annonce publiée !' : 'Annonce mise à jour !'}</Text>
            <Text style={styles.publishModalMessage}>
              {isCreateMode
                ? 'Votre annonce est maintenant en ligne et prête à être consultée.'
                : 'Vos modifications ont bien été enregistrées.'}
            </Text>
            <TouchableOpacity style={styles.publishModalPrimary} activeOpacity={0.9} onPress={handleViewPublishedListing}>
              <Text style={styles.publishModalPrimaryText}>Voir l’annonce</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const Label = ({ text }: { text: string }) => <Text style={styles.label}>{text}</Text>;

type LabeledInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  [key: string]: any;
};

const LabeledInput = ({ label, value, onChangeText, placeholder, error, ...rest }: LabeledInputProps) => (
  <View style={{ marginBottom: 16 }}>
    <Label text={label} />
    <TextInput
      style={[styles.input, error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.muted}
      {...rest}
    />
    {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
  </View>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(46,204,113,0.15)',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBadgeDraft: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(15,23,42,0.05)',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  headerBadgeTextDraft: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 64,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionCardError: {
    borderColor: COLORS.danger,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  sectionSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  label: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    backgroundColor: '#FFFFFF',
  },
  addressInputWrapper: {
    marginTop: 8,
    position: 'relative',
    zIndex: 10,
    overflow: 'visible',
  },
  addressInputWrapperTop: {
    zIndex: 40,
  },
  addressInputWrapperMid: {
    zIndex: 30,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    backgroundColor: '#FFFFFF',
  },
  addressDropdown: {
    position: 'absolute',
    top: '105%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 1000,
    overflow: 'hidden',
  },
  addressDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  addressDropdownTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  addressDropdownSubtitle: {
    marginTop: 2,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  addressDropdownFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addressDropdownFooterText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  fieldErrorText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.danger,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaTile: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111827',
  },
  mediaTopRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaRoomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mediaRoomText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoTile: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  mediaDelete: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  mediaActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  mediaActionPrimary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.35)',
    shadowColor: '#2ECC71',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  mediaActionButtonDisabled: {
    opacity: 0.6,
  },
  mediaActionButtonError: {
    borderColor: COLORS.danger,
  },
  coverActionButton: {
    backgroundColor: 'rgba(46,204,113,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.2)',
  },
  mediaActionText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  mediaActionSubtext: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: COLORS.muted,
  },
  mediaActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaActionIconSecondary: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(46,204,113,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaControlList: {
    marginTop: 16,
    gap: 12,
  },
  mediaControlCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  mediaControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaControlTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  roomChipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  roomChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  roomChipActive: {
    borderColor: 'rgba(46,204,113,0.4)',
    backgroundColor: 'rgba(46,204,113,0.15)',
  },
  roomChipText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  roomChipTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  coverPreviewCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    gap: 14,
  },
  coverPreviewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  coverPreviewTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  coverPreviewSubtitle: {
    marginTop: 4,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  coverPreviewAction: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coverPreviewActionText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenitiesScrollContainer: {
    marginTop: 12,
    maxHeight: 240,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  amenitiesScroll: {
    maxHeight: 216,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.35)',
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  amenityChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  amenityIconHolder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46,204,113,0.15)',
  },
  amenityIconHolderActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  amenityLabel: {
    fontFamily: 'Manrope',
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.accent,
  },
  amenityLabelActive: {
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeActive: {
    borderColor: 'rgba(46,204,113,0.35)',
    backgroundColor: 'rgba(46,204,113,0.15)',
  },
  badgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  badgeTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  supportText: {
    marginTop: 8,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  noteText: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 4,
  },
  supportTextTight: {
    marginTop: -10,
  },
  dropdownOptionText: {
    fontSize: 15,
    color: COLORS.dark,
    fontWeight: '500',
  },
  dropdownOptionTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  selectInput: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  selectInputActive: {
    borderColor: COLORS.accent,
  },
  selectInputError: {
    borderColor: COLORS.danger,
  },
  selectInputValue: {
    fontSize: 15,
    color: COLORS.dark,
    fontWeight: '600',
  },
  selectInputValuePlaceholder: {
    color: COLORS.muted,
    fontWeight: '500',
  },
  dropdownContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
  },
  previewButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  previewFullscreen: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTopControls: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  previewOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  previewBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewTagText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  previewOverlayBottom: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 12,
  },
  previewTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewSlider: {
    flex: 1,
  },
  previewTimeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#FFFFFF',
    minWidth: 48,
    textAlign: 'center',
  },
  previewCenterPlayButton: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  previewMediaArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLoadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewLoadingText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  previewCoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  previewCoverButtonText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.surface,
  },
  previewFullscreenMedia: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: '#000',
  },
  previewClose: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  previewFooter: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  previewDismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  previewDismissButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.surface,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  counterLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  counterValue: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    minWidth: 24,
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  footerActionsColumn: {
    flexDirection: 'column',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonFullWidth: {
    width: '100%',
  },
  secondaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.dark,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    flexDirection: 'row',
    gap: 8,
  },
  dangerButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  publishButton: {
    marginTop: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  publishButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  publishModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  publishModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  publishModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(46,204,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  publishModalTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  publishModalMessage: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  publishModalPrimary: {
    marginTop: 4,
    width: '100%',
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishModalPrimaryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
