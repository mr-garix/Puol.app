import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  SafeAreaView,
  LayoutChangeEvent,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import type { SearchCriteria, FurnishingPreference } from '@/src/types/search';
import { createPlacesSessionToken, fetchPlaceSuggestions, type PlaceSuggestion } from '@/src/features/search/services/googlePlaces';
import { fetchListingAddressSuggestions, type ListingAddressSuggestion } from '@/src/features/search/services/listingAddresses';
import { formatAddressLine, formatDistrictCity } from '@/src/utils/location';
import { trackAnalyticsEvent } from '@/src/infrastructure/analytics';
import {
  PROPERTY_AMENITIES,
  SHOP_AMENITIES,
  type AmenityOption,
  type IconDescriptor,
  type FeatherIconName,
} from '@/src/constants/amenities';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const SCROLL_BASE_OFFSET = 48;
const STAGGER_BLOCKS = ['location', 'type', 'criteria', 'options'] as const;
type StaggerKey = (typeof STAGGER_BLOCKS)[number];

const renderIcon = (icon: IconDescriptor, size = 18, color = '#2ECC71') => {
  if (icon.library === 'Feather') {
    return <Feather name={icon.name} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
};

const ICONS = {
  location: { library: 'Feather', name: 'map-pin' as FeatherIconName } satisfies IconDescriptor,
  search: { library: 'Feather', name: 'search' as FeatherIconName } satisfies IconDescriptor,
  calendar: { library: 'Feather', name: 'calendar' as FeatherIconName } satisfies IconDescriptor,
};

const CRITERIA_ICONS = {
  bedrooms: { library: 'MaterialCommunityIcons', name: 'bed-outline' } as IconDescriptor,
  bathrooms: { library: 'MaterialCommunityIcons', name: 'shower-head' } as IconDescriptor,
  kitchens: { library: 'MaterialCommunityIcons', name: 'stove' } as IconDescriptor,
  livingRooms: { library: 'MaterialCommunityIcons', name: 'sofa' } as IconDescriptor,
};

const propertyTypes: { id: string; label: string; icon: IconDescriptor }[] = [
  { id: 'studio', label: 'Studio', icon: { library: 'MaterialCommunityIcons', name: 'office-building-outline' } },
  { id: 'chambre', label: 'Chambre', icon: { library: 'MaterialCommunityIcons', name: 'bed-king-outline' } },
  { id: 'apartment', label: 'Appartement', icon: { library: 'MaterialCommunityIcons', name: 'office-building' } },
  { id: 'house', label: 'Maison', icon: { library: 'Feather', name: 'home' } },
  { id: 'villa', label: 'Villa', icon: { library: 'MaterialCommunityIcons', name: 'home-modern' } },
  { id: 'boutique', label: 'Boutique', icon: { library: 'MaterialCommunityIcons', name: 'storefront-outline' } },
];

const amenities: AmenityOption[] = [...PROPERTY_AMENITIES];
const shopAmenities: AmenityOption[] = [...SHOP_AMENITIES];

type SearchModalProps = {
  visible: boolean;
  onClose: () => void;
  onSearch: (criteria: SearchCriteria) => void;
};

type FieldErrorKey = 'location' | 'type' | 'furnishing';

type SuggestionSelectionMeta = {
  source: 'google' | 'internal';
  primary?: string;
  secondary?: string;
  listingId?: string | null;
  placeId?: string | null;
};

export const SearchModal: React.FC<SearchModalProps> = ({ visible, onClose, onSearch }) => {
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [furnishingType, setFurnishingType] = useState<FurnishingPreference>('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [surfaceArea, setSurfaceArea] = useState('');
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [kitchens, setKitchens] = useState(0);
  const [livingRooms, setLivingRooms] = useState(0);
  const [minPrice, setMinPrice] = useState('50000');
  const [maxPrice, setMaxPrice] = useState('300000');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [placesSuggestions, setPlacesSuggestions] = useState<PlaceSuggestion[]>([]);
  const [internalSuggestions, setInternalSuggestions] = useState<ListingAddressSuggestion[]>([]);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const suggestionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesSessionTokenRef = useRef<string | null>(null);
  const [openSection, setOpenSection] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldErrorKey, string>>>({});
  const [iosDatePicker, setIosDatePicker] = useState<{ mode: 'arrival' | 'departure'; date: Date } | null>(null);

  const today = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(200))[0];
  const blockAnimations = useRef<Record<StaggerKey, { opacity: Animated.Value; translateY: Animated.Value }>>(
    STAGGER_BLOCKS.reduce((acc, key) => {
      acc[key] = {
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(20),
      };
      return acc;
    }, {} as Record<StaggerKey, { opacity: Animated.Value; translateY: Animated.Value }>),
  ).current;
  const blockStyle = useCallback(
    (key: StaggerKey) => ({
      opacity: blockAnimations[key].opacity,
      transform: [{ translateY: blockAnimations[key].translateY }],
    }),
    [blockAnimations],
  );
  const scrollViewRef = useRef<ScrollView | null>(null);
  const locationInputRef = useRef<TextInput | null>(null);
  const sectionLayouts = useRef<Record<number, number>>({});
  const anchorLayouts = useRef<Record<string, number>>({});
  const previousOpenSection = useRef(openSection);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(24, insets.top + (isIOS ? 12 : 18));
  const closeButtonTop = insets.top + (isIOS ? 8 : 10);

  useEffect(() => {
    if (visible) {
      setFieldErrors({});
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      });
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(200);
    }
  }, [fadeAnim, slideAnim, visible]);

  useEffect(() => {
    if (visible) {
      const animations = STAGGER_BLOCKS.map((key) =>
        Animated.parallel([
          Animated.timing(blockAnimations[key].opacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(blockAnimations[key].translateY, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
        ]),
      );

      Animated.stagger(100, animations).start();
    } else {
      STAGGER_BLOCKS.forEach((key) => {
        blockAnimations[key].opacity.setValue(0);
        blockAnimations[key].translateY.setValue(20);
      });
    }
  }, [blockAnimations, visible]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleSectionLayout = useCallback(
    (sectionNumber: number) => (event: LayoutChangeEvent) => {
      sectionLayouts.current[sectionNumber] = event.nativeEvent.layout.y;
    },
    [],
  );

  const handleAnchorLayout = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      anchorLayouts.current[key] = event.nativeEvent.layout.y;
    },
    [],
  );

  const scrollToSection = useCallback(
    (sectionNumber: number, extraOffset = 0) => {
      const y = sectionLayouts.current[sectionNumber];
      if (scrollViewRef.current && typeof y === 'number') {
        const targetY = Math.max(0, y - SCROLL_BASE_OFFSET + extraOffset);
        scrollViewRef.current.scrollTo({ y: targetY, animated: true });
      }
    },
    [],
  );

  const scrollToAnchor = useCallback(
    (key: string, extraOffset = 0) => {
      const y = anchorLayouts.current[key];
      if (scrollViewRef.current && typeof y === 'number') {
        const targetY = Math.max(0, y - SCROLL_BASE_OFFSET + extraOffset);
        scrollViewRef.current.scrollTo({ y: targetY, animated: true });
      }
    },
    [],
  );

  const scheduleScroll = useCallback((callback: () => void) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(callback, 140);
  }, []);

  const gentlyRevealSection = useCallback(
    (sectionNumber: number, extraOffset = 0) => {
      scheduleScroll(() => scrollToSection(sectionNumber, extraOffset));
    },
    [scheduleScroll, scrollToSection],
  );

  const gentlyRevealAnchor = useCallback(
    (key: string, extraOffset = 0) => {
      scheduleScroll(() => scrollToAnchor(key, extraOffset));
    },
    [scheduleScroll, scrollToAnchor],
  );

  useEffect(() => {
    if (openSection > previousOpenSection.current) {
      gentlyRevealSection(openSection);
    }
    previousOpenSection.current = openSection;
  }, [openSection, gentlyRevealSection]);

  useEffect(() => {
    if (selectedType === 'boutique' && openSection < 3) {
      setOpenSection(3);
    }
  }, [selectedType, openSection]);

  useEffect(() => {
    if (selectedLocation && openSection < 2) {
      setOpenSection(2);
    }
  }, [selectedLocation, openSection]);

  useEffect(() => {
    if (!selectedType || selectedType === 'boutique') {
      return;
    }
    if (furnishingType === 'unfurnished' && openSection < 3) {
      setOpenSection(3);
    }
  }, [selectedType, furnishingType, openSection]);

  useEffect(() => {
    if (furnishingType === 'furnished' && arrivalDate && departureDate && openSection < 3) {
      setOpenSection(3);
    }
  }, [furnishingType, arrivalDate, departureDate, openSection]);

  const isBoutique = selectedType === 'boutique';

  const hasCriteriaInput = useMemo(() => {
    if (isBoutique) {
      return Boolean(surfaceArea) || minPrice !== '50000' || maxPrice !== '300000';
    }
    return (
      bedrooms > 0 ||
      bathrooms > 0 ||
      kitchens > 0 ||
      livingRooms > 0 ||
      minPrice !== '50000' ||
      maxPrice !== '300000'
    );
  }, [isBoutique, surfaceArea, minPrice, maxPrice, bedrooms, bathrooms, kitchens, livingRooms]);

  useEffect(() => {
    if (openSection >= 3 && hasCriteriaInput && openSection < 4) {
      setOpenSection(4);
    }
  }, [openSection, hasCriteriaInput]);

  type CombinedSuggestion = {
    id: string;
    primary: string;
    secondary?: string;
    description?: string;
    source: 'google' | 'internal';
    payload: PlaceSuggestion | ListingAddressSuggestion;
  };

  const combinedSuggestions = useMemo<CombinedSuggestion[]>(() => {
    const seen = new Set<string>();
    const entries: CombinedSuggestion[] = [];

    internalSuggestions.forEach((suggestion) => {
      const id = suggestion.id;
      if (seen.has(id)) {
        return;
      }
      entries.push({
        id,
        primary: suggestion.primary,
        secondary: suggestion.secondary,
        description: suggestion.description,
        source: 'internal',
        payload: suggestion,
      });
      seen.add(id);
    });

    placesSuggestions.forEach((suggestion) => {
      const id = suggestion.id || `${suggestion.primary}-${suggestion.secondary ?? ''}`;
      if (seen.has(id)) {
        return;
      }
      entries.push({
        id,
        primary: suggestion.primary,
        secondary: suggestion.secondary,
        description: suggestion.description,
        source: 'google',
        payload: suggestion,
      });
      seen.add(id);
    });

    return entries;
  }, [internalSuggestions, placesSuggestions]);

  const hasDynamicSuggestions = combinedSuggestions.length > 0;
  const isAnySuggestionsLoading = isPlacesLoading || isInternalLoading;
  const showEmptyState = !isAnySuggestionsLoading && !hasDynamicSuggestions && locationSearch.trim().length > 0;

  const logSuggestionSelection = useCallback(
    (meta: SuggestionSelectionMeta) => {
      const query = locationSearch.trim();
      trackAnalyticsEvent({
        name: 'search_suggestion_selected',
        properties: {
          ...meta,
          query,
          queryLength: query.length,
        },
      });
    },
    [locationSearch],
  );

  const formatDateForDisplay = useCallback((value: string) => {
    if (!value) return 'Sélectionner';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sélectionner';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  const parseStoredDate = useCallback((value: string) => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, []);

  const applyDateSelection = useCallback(
    (mode: 'arrival' | 'departure', date: Date) => {
      const iso = date.toISOString().split('T')[0];
      if (mode === 'arrival') {
        setArrivalDate(iso);
        if (departureDate) {
          const dep = new Date(departureDate);
          if (dep.getTime() < date.getTime()) {
            setDepartureDate('');
          }
        }
        if (furnishingType === 'furnished') {
          gentlyRevealAnchor('datesSection', 10);
        }
      } else {
        setDepartureDate(iso);
      }
    },
    [departureDate, furnishingType, gentlyRevealAnchor],
  );

  const openDatePicker = useCallback(
    (mode: 'arrival' | 'departure') => {
      const baseDate = parseStoredDate(mode === 'arrival' ? arrivalDate : departureDate);
      const minimumDate = mode === 'departure'
        ? arrivalDate
          ? new Date(arrivalDate)
          : today
        : today;
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: baseDate,
          mode: 'date',
          minimumDate,
          onChange: (event, selectedDate) => {
            if (event.type === 'set' && selectedDate) {
              applyDateSelection(mode, selectedDate);
            }
          },
        });
      } else {
        setIosDatePicker({ mode, date: baseDate });
      }
    },
    [arrivalDate, departureDate, parseStoredDate, applyDateSelection, today],
  );

  const normalizeToken = useCallback((value?: string | null) => value?.trim().toLowerCase() ?? '', []);

  const stripCountrySegments = useCallback(
    (value?: string | null) => {
      if (!value) {
        return undefined;
      }

      const parts = String(value)
        .split(',')
        .map((part) => part.trim())
        .filter((part) => {
          const normalized = normalizeToken(part);
          return normalized && normalized !== 'cameroun' && normalized !== 'cameroon';
        });

      if (!parts.length) {
        return undefined;
      }

      return parts.join(', ');
    },
    [normalizeToken],
  );

  const clearFieldError = useCallback((key: FieldErrorKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const applyLocationSelection = useCallback(
    (value: string) => {
      setSelectedLocation(value);
      setLocationSearch(value);
      setShowLocationDropdown(false);
      setPlacesSuggestions([]);
      setInternalSuggestions([]);
      setIsPlacesLoading(false);
      setIsInternalLoading(false);
      locationInputRef.current?.blur();
      Keyboard.dismiss();
      clearFieldError('location');
      setOpenSection((prev) => (prev < 2 ? 2 : prev));
      gentlyRevealSection(2);
    },
    [clearFieldError, gentlyRevealSection],
  );

  const handlePlaceSuggestionSelect = (suggestion: PlaceSuggestion) => {
    logSuggestionSelection({
      source: 'google',
      primary: suggestion.primary,
      secondary: suggestion.secondary,
      placeId: suggestion.id ?? null,
    });
    const sanitizedPrimary = stripCountrySegments(suggestion.primary) ?? suggestion.primary;
    const sanitizedSecondary = stripCountrySegments(suggestion.secondary);
    const sanitizedDescription = stripCountrySegments(suggestion.description) ?? suggestion.description;

    const value =
      formatDistrictCity(sanitizedPrimary, sanitizedSecondary, { fallback: sanitizedDescription }) ||
      sanitizedDescription ||
      sanitizedPrimary;
    applyLocationSelection(value);
  };

  const handleListingSuggestionSelect = (suggestion: ListingAddressSuggestion) => {
    logSuggestionSelection({
      source: 'internal',
      primary: suggestion.primary,
      secondary: suggestion.secondary,
      listingId: suggestion.listingId ?? null,
    });
    const value =
      formatAddressLine(suggestion.description, suggestion.district, suggestion.city, { fallback: suggestion.primary }) ||
      suggestion.primary;
    applyLocationSelection(value);
  };

  useEffect(() => {
    if (suggestionsDebounceRef.current) {
      clearTimeout(suggestionsDebounceRef.current);
      suggestionsDebounceRef.current = null;
    }

    const query = locationSearch.trim();
    if (!query) {
      setPlacesSuggestions([]);
      setInternalSuggestions([]);
      setIsPlacesLoading(false);
      setIsInternalLoading(false);
      return;
    }

    setIsPlacesLoading(true);
    setIsInternalLoading(true);
    let isActive = true;

    suggestionsDebounceRef.current = setTimeout(() => {
      const sessionToken = placesSessionTokenRef.current ?? createPlacesSessionToken();
      placesSessionTokenRef.current = sessionToken;

      fetchPlaceSuggestions(query, sessionToken)
        .then((suggestions) => {
          if (!isActive) {
            return;
          }
          setPlacesSuggestions(suggestions);
        })
        .catch((error) => {
          if (!isActive) {
            return;
          }
          console.warn('[SearchModal] Google Places suggestions failed', error);
          setPlacesSuggestions([]);
        })
        .finally(() => {
          if (!isActive) {
            return;
          }
          setIsPlacesLoading(false);
        });

      fetchListingAddressSuggestions(query)
        .then((suggestions) => {
          if (!isActive) {
            return;
          }
          setInternalSuggestions(suggestions);
        })
        .catch((error) => {
          if (!isActive) {
            return;
          }
          console.warn('[SearchModal] internal suggestions failed', error);
          setInternalSuggestions([]);
        })
        .finally(() => {
          if (!isActive) {
            return;
          }
          setIsInternalLoading(false);
        });
    }, 220);

    return () => {
      isActive = false;
      if (suggestionsDebounceRef.current) {
        clearTimeout(suggestionsDebounceRef.current);
        suggestionsDebounceRef.current = null;
      }
    };
  }, [locationSearch]);

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId],
    );
  };

  const handleClearAll = () => {
    setLocationSearch('');
    setSelectedLocation('');
    setSelectedType('');
    setFurnishingType('');
    setArrivalDate('');
    setDepartureDate('');
    setBedrooms(0);
    setBathrooms(0);
    setKitchens(0);
    setLivingRooms(0);
    setMinPrice('50000');
    setMaxPrice('300000');
    setSelectedAmenities([]);
    setSurfaceArea('');
    setOpenSection(1);
    setFieldErrors({});
    gentlyRevealSection(1);
  };

  const handleSearch = () => {
    const errors: Partial<Record<FieldErrorKey, string>> = {};

    if (!selectedLocation.trim()) {
      errors.location = 'Veuillez indiquer un lieu.';
    }
    if (!selectedType) {
      errors.type = 'Veuillez choisir un type de logement.';
    }
    if (!isBoutique && !furnishingType) {
      errors.furnishing = 'Veuillez préciser Meublé ou Non meublé.';
    }

    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      setFieldErrors(errors);
      if (errors.location) {
        setOpenSection(1);
        scheduleScroll(() => {
          scrollToSection(1);
          locationInputRef.current?.focus();
        });
      } else if (errors.type) {
        setOpenSection((prev) => (prev < 2 ? 2 : prev));
        scheduleScroll(() => {
          scrollToSection(2);
        });
      } else if (errors.furnishing) {
        setOpenSection((prev) => (prev < 2 ? 2 : prev));
        scheduleScroll(() => {
          if (showFurnishingSelector) {
            scrollToAnchor('furnishingSelector', 12);
          } else {
            scrollToSection(2);
          }
        });
      }
      return;
    }

    setFieldErrors({});

    const criteria: SearchCriteria = {
      location: selectedLocation,
      type: selectedType,
      furnishingType: isBoutique ? '' : furnishingType,
      arrivalDate,
      departureDate,
      bedrooms,
      bathrooms,
      kitchens,
      livingRooms,
      priceRange: { min: minPrice, max: maxPrice },
      amenities: selectedAmenities,
      surfaceArea: isBoutique ? surfaceArea : '',
    };

    trackAnalyticsEvent({
      name: 'search_submitted',
      properties: {
        location: criteria.location,
        type: criteria.type,
        furnishingType: criteria.furnishingType || 'any',
        hasArrivalDate: Boolean(arrivalDate),
        hasDepartureDate: Boolean(departureDate),
        bedrooms: bedrooms || 0,
        bathrooms: bathrooms || 0,
        kitchens: kitchens || 0,
        livingRooms: livingRooms || 0,
        minPrice: criteria.priceRange.min,
        maxPrice: criteria.priceRange.max,
        amenitiesCount: criteria.amenities.length,
        queryLength: selectedLocation.trim().length,
        isBoutique,
      },
    });

    onSearch(criteria);
    onClose();
  };

  const renderCounter = (
    label: string,
    value: number,
    onChange: (next: number) => void,
    icon?: IconDescriptor,
  ) => (
    <View style={styles.counterRow}>
      <View style={styles.counterLabelWrapper}>
        {icon && <View style={styles.counterIconBubble}>{renderIcon(icon, 16, '#4A4A4A')}</View>}
        <Text style={styles.counterLabel}>{label}</Text>
      </View>
      <View style={styles.counterControls}>
        <TouchableOpacity
          style={[styles.counterButton, value === 0 && styles.counterButtonDisabled]}
          disabled={value === 0}
          onPress={() => onChange(Math.max(0, value - 1))}
        >
          <Text style={styles.counterButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.counterValue}>{value}</Text>
        <TouchableOpacity style={[styles.counterButton, styles.counterButtonPrimary]} onPress={() => onChange(value + 1)}>
          <Text style={[styles.counterButtonText, styles.counterButtonTextPrimary]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const showFurnishingSelector = selectedType && !isBoutique;
  const budgetLabel = isBoutique
    ? 'Budget mensuel (FCFA)'
    : furnishingType === 'furnished'
    ? 'Budget journalier (FCFA)'
    : 'Budget mensuel (FCFA)';

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}> 
          <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
              behavior={isIOS ? 'padding' : undefined}
              keyboardVerticalOffset={isIOS ? 0 : 0}
              enabled={isIOS}
              style={styles.flex}
            >
              <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
                <Text style={styles.headerTitle}>Trouve ta Puol</Text>
                <TouchableOpacity style={[styles.closeButton, { top: closeButtonTop }]} onPress={onClose}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
              >
                {/* Section 1 - Lieu */}
                <Animated.View style={[styles.section, blockStyle('location')]} onLayout={handleSectionLayout(1)}>
                  <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpenSection(openSection >= 1 ? 0 : 1)}>
                    <Text style={styles.sectionTitle}>Où souhaites-tu louer ?</Text>
                    {!!selectedLocation && !fieldErrors.location && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>

                  {openSection >= 1 && (
                    <View style={styles.sectionContent}>
                      <View style={[styles.searchInputWrapper, fieldErrors.location ? styles.fieldErrorOutline : undefined]}>
                        <View style={styles.leadingIconWrapper}>{renderIcon(ICONS.search, 16, '#7D8897')}</View>
                        <TextInput
                          ref={locationInputRef}
                          placeholder="Rechercher par quartier / ville"
                          placeholderTextColor="#8C8C8C"
                          style={styles.searchInput}
                          value={locationSearch}
                          returnKeyType="done"
                          blurOnSubmit
                          onSubmitEditing={Keyboard.dismiss}
                          onFocus={() => {
                            setShowLocationDropdown(true);
                            gentlyRevealSection(1, 32);
                          }}
                          onChangeText={(text) => {
                            setLocationSearch(text);
                            setShowLocationDropdown(true);
                            if (text.trim().length > 0) {
                              clearFieldError('location');
                            }
                          }}
                        />
                      </View>
                      {fieldErrors.location ? <Text style={styles.fieldErrorText}>{fieldErrors.location}</Text> : null}

                      {showLocationDropdown && (
                        <View style={styles.dropdown}>
                          {hasDynamicSuggestions ? (
                            combinedSuggestions.slice(0, 6).map((suggestion, index) => {
                              const isGoogle = suggestion.source === 'google';
                              const key = `${suggestion.id}-${index}`;
                              return (
                                <TouchableOpacity
                                  key={key}
                                  style={styles.dropdownItem}
                                  onPress={() =>
                                    isGoogle
                                      ? handlePlaceSuggestionSelect(suggestion.payload as PlaceSuggestion)
                                      : handleListingSuggestionSelect(suggestion.payload as ListingAddressSuggestion)
                                  }
                                >
                                  <View style={styles.dropdownIconBubble}>{renderIcon(ICONS.location, 20)}</View>
                                  <View style={styles.dropdownTexts}>
                                    <Text style={styles.dropdownTitle}>{suggestion.primary}</Text>
                                    {!!suggestion.secondary && <Text style={styles.dropdownSubtitle}>{suggestion.secondary}</Text>}
                                  </View>
                                </TouchableOpacity>
                              );
                            })
                          ) : (
                            showEmptyState && (
                              <View style={styles.dropdownEmpty}>
                                <Text style={styles.dropdownEmptyTitle}>Aucune suggestion</Text>
                                <Text style={styles.dropdownEmptySubtitle}>Essayez un autre mot-clé ou une autre orthographe.</Text>
                              </View>
                            )
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </Animated.View>

                {/* Section 2 - Type */}
                <Animated.View style={[styles.section, blockStyle('type')]} onLayout={handleSectionLayout(2)}>
                  <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpenSection(openSection >= 2 ? 1 : 2)}>
                    <Text style={styles.sectionTitle}>Quel type de logement ?</Text>
                    {!!selectedType && !fieldErrors.type && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>

                  {openSection >= 2 && (
                    <View style={styles.sectionContent}>
                      <View style={[styles.typeGridWrapper, fieldErrors.type ? styles.fieldErrorOutline : undefined]}>
                        <View style={styles.typeGrid}>
                          {propertyTypes.map((type) => {
                            const isSelected = selectedType === type.id;
                            return (
                              <TouchableOpacity
                                key={type.id}
                                style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                                onPress={() => {
                                  setSelectedType(type.id);
                                  if (type.id === 'boutique') {
                                    setFurnishingType('');
                                    setArrivalDate('');
                                    setDepartureDate('');
                                    setOpenSection((prev) => (prev < 3 ? 3 : prev));
                                    gentlyRevealSection(3);
                                  } else {
                                    setFurnishingType('');
                                    setArrivalDate('');
                                    setDepartureDate('');
                                    gentlyRevealAnchor('furnishingSelector');
                                  }
                                  clearFieldError('type');
                                  clearFieldError('furnishing');
                                }}
                              >
                                <View style={styles.typeIconWrapper}>{renderIcon(type.icon, 20, isSelected ? '#2ECC71' : '#5C6675')}</View>
                                <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>{type.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                      {fieldErrors.type ? <Text style={styles.fieldErrorText}>{fieldErrors.type}</Text> : null}

                      {showFurnishingSelector && (
                        <View style={styles.subSection} onLayout={handleAnchorLayout('furnishingSelector')}>
                          <Text style={styles.subSectionLabel}>Type de location</Text>
                          <View style={[styles.inlineOptions, fieldErrors.furnishing ? styles.fieldErrorOutline : undefined]}>
                            <TouchableOpacity
                              style={[styles.inlineOption, furnishingType === 'furnished' && styles.inlineOptionActive]}
                              onPress={() => {
                                setFurnishingType('furnished');
                                clearFieldError('furnishing');
                                gentlyRevealAnchor('datesSection', 10);
                              }}
                            >
                              <Text
                                style={[
                                  styles.inlineOptionText,
                                  furnishingType === 'furnished' && styles.inlineOptionTextActive,
                                ]}
                              >
                                Meublé
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.inlineOption, furnishingType === 'unfurnished' && styles.inlineOptionActive]}
                              onPress={() => {
                                setFurnishingType('unfurnished');
                                setArrivalDate('');
                                setDepartureDate('');
                                Keyboard.dismiss();
                                setOpenSection((prev) => (prev < 3 ? 3 : prev));
                                gentlyRevealSection(3);
                                clearFieldError('furnishing');
                              }}
                            >
                              <Text
                                style={[
                                  styles.inlineOptionText,
                                  furnishingType === 'unfurnished' && styles.inlineOptionTextActive,
                                ]}
                              >
                                Non meublé
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {fieldErrors.furnishing ? (
                            <Text style={styles.fieldErrorText}>{fieldErrors.furnishing}</Text>
                          ) : null}

                          {furnishingType === 'furnished' && (
                            <View style={styles.datesSection} onLayout={handleAnchorLayout('datesSection')}>
                              <Text style={styles.subSectionLabel}>Période du séjour</Text>
                              <View style={styles.dateRow}>
                                <TouchableOpacity
                                  style={styles.datePickerButton}
                                  onPress={() => openDatePicker('arrival')}
                                  activeOpacity={0.85}
                                >
                                  <View style={styles.datePickerTexts}>
                                    <Text style={styles.dateLabel}>Arrivée</Text>
                                    <Text
                                      style={[
                                        styles.dateValueText,
                                        !arrivalDate && styles.dateValuePlaceholder,
                                      ]}
                                    >
                                      {formatDateForDisplay(arrivalDate)}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.datePickerButton, !arrivalDate && styles.datePickerButtonDisabled]}
                                  onPress={() => openDatePicker('departure')}
                                  activeOpacity={arrivalDate ? 0.85 : 0.6}
                                  disabled={!arrivalDate}
                                >
                                  <View style={styles.datePickerTexts}>
                                    <Text style={styles.dateLabel}>Départ</Text>
                                    <Text
                                      style={[
                                        styles.dateValueText,
                                        (!departureDate || !arrivalDate) && styles.dateValuePlaceholder,
                                      ]}
                                    >
                                      {arrivalDate ? formatDateForDisplay(departureDate) : 'Sélectionner'}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </Animated.View>

                {/* Section 3 - Critères */}
                <Animated.View style={[styles.section, blockStyle('criteria')]} onLayout={handleSectionLayout(3)}>
                  <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpenSection(openSection >= 3 ? 2 : 3)}>
                    <Text style={styles.sectionTitle}>Critères</Text>
                    {(bedrooms > 0 || bathrooms > 0 || surfaceArea) && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>

                  {openSection >= 3 && (
                    <View style={styles.sectionContent}>
                      {isBoutique ? (
                        <View style={styles.subSection}>
                          <Text style={styles.subSectionLabel}>Superficie souhaitée (m²)</Text>
                          <TextInput
                            style={styles.surfaceInput}
                            keyboardType="numeric"
                            placeholder="Ex: 50"
                            placeholderTextColor="#A5A5A5"
                            value={surfaceArea}
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            onChangeText={(value) => {
                              setSurfaceArea(value);
                            }}
                          />
                        </View>
                      ) : (
                        <>
                          {renderCounter('Chambres', bedrooms, setBedrooms, CRITERIA_ICONS.bedrooms)}
                          {renderCounter('Salles de bain', bathrooms, setBathrooms, CRITERIA_ICONS.bathrooms)}
                          {renderCounter('Cuisines', kitchens, setKitchens, CRITERIA_ICONS.kitchens)}
                          {renderCounter('Salons', livingRooms, setLivingRooms, CRITERIA_ICONS.livingRooms)}
                        </>
                      )}

                      <View style={styles.budgetRow}>
                        <Text style={styles.subSectionLabel}>{budgetLabel}</Text>
                        <View style={styles.budgetInputs}>
                          <View style={styles.budgetField}>
                            <Text style={styles.budgetLabel}>Minimum</Text>
                            <TextInput
                              style={styles.budgetInput}
                              keyboardType="numeric"
                              value={minPrice}
                              returnKeyType="done"
                              onSubmitEditing={() => {
                                Keyboard.dismiss();
                                gentlyRevealSection(4);
                              }}
                              onChangeText={setMinPrice}
                            />
                          </View>
                          <View style={styles.budgetField}>
                            <Text style={styles.budgetLabel}>Maximum</Text>
                            <TextInput
                              style={styles.budgetInput}
                              keyboardType="numeric"
                              value={maxPrice}
                              returnKeyType="done"
                              onSubmitEditing={() => {
                                Keyboard.dismiss();
                                gentlyRevealSection(4);
                              }}
                              onChangeText={setMaxPrice}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </Animated.View>

                {/* Section 4 - Options */}
                <Animated.View style={[styles.section, blockStyle('options')]} onLayout={handleSectionLayout(4)}>
                  <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpenSection(openSection >= 4 ? 3 : 4)}>
                    <Text style={styles.sectionTitle}>Équipements / Options</Text>
                    {!!selectedAmenities.length && (
                      <Text style={styles.checkMark}>✓ {selectedAmenities.length}</Text>
                    )}
                  </TouchableOpacity>

                  {openSection >= 4 && (
                    <View style={styles.sectionContent}>
                      <View style={styles.amenitiesWrapper}>
                        {(isBoutique ? shopAmenities : amenities).map((amenity) => {
                          const isSelected = selectedAmenities.includes(amenity.id);
                          return (
                            <TouchableOpacity
                              key={amenity.id}
                              style={[styles.amenityChip, isSelected && styles.amenityChipActive]}
                              onPress={() => toggleAmenity(amenity.id)}
                            >
                              <View style={[styles.amenityIconHolder, isSelected && styles.amenityIconHolderActive]}>
                                {renderIcon(amenity.icon, 16, isSelected ? '#2ECC71' : '#6E6E6E')}
                              </View>
                              <Text style={[styles.amenityLabel, isSelected && styles.amenityLabelActive]}>
                                {amenity.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </Animated.View>
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Tout effacer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                  <Text style={styles.searchButtonText}>Rechercher</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
          {Platform.OS === 'ios' && iosDatePicker && (
            <Modal transparent animationType="fade" visible>
              <View style={styles.dateModalOverlay}>
                <View style={styles.dateModalContent}>
                  <DateTimePicker
                    value={iosDatePicker.date}
                    mode="date"
                    display="inline"
                    themeVariant="light"
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (selectedDate) {
                        setIosDatePicker((prev) => (prev ? { ...prev, date: selectedDate } : prev));
                      }
                    }}
                    minimumDate={
                      iosDatePicker.mode === 'departure'
                        ? arrivalDate
                          ? new Date(arrivalDate)
                          : today
                        : today
                    }
                    style={styles.dateModalPicker}
                  />
                  <View style={styles.dateModalActions}>
                    <TouchableOpacity style={styles.dateModalAction} onPress={() => setIosDatePicker(null)}>
                      <Text style={styles.dateModalActionText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateModalAction, styles.dateModalActionPrimary]}
                      onPress={() => {
                        if (iosDatePicker) {
                          applyDateSelection(iosDatePicker.mode, iosDatePicker.date);
                        }
                        setIosDatePicker(null);
                      }}
                    >
                      <Text style={[styles.dateModalActionText, styles.dateModalActionPrimaryText]}>Valider</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </Animated.View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F8F9FB',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    width: '100%',
    maxHeight: SCREEN_HEIGHT,
    flex: 1,
    paddingBottom: isIOS ? 24 : 16,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    paddingTop: isIOS ? 0 : 16,
    backgroundColor: '#F8F9FB',
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -45,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2ECC71',
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    top: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#111111',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    gap: 16,
    flexGrow: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  heroHeader: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    marginTop: -120,
    transform: [{ translateY: -80 }],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#151515',
  },
  checkMark: {
    fontSize: 12,
    color: '#2ECC71',
  },
  sectionContent: { gap: 16, paddingBottom: 8 },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
  },
  leadingIconWrapper: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
  },
  dropdown: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F1F1',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },
  dropdownIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#2ECC71' + '11',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownIcon: { fontSize: 20 },
  dropdownTexts: { flex: 1 },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#121212',
  },
  dropdownSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  fieldErrorOutline: {
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  fieldErrorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  dropdownEmpty: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 6,
  },
  dropdownEmptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  dropdownEmptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  typeGridWrapper: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  typeCard: {
    width: '31%',
    backgroundColor: '#F4F7FB',
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E8EF',
  },
  typeCardSelected: {
    borderColor: '#2ECC71',
    backgroundColor: '#2ECC71' + '11',
  },
  typeIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  typeIconSelected: {},
  typeLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#4A4A4A',
  },
  typeLabelSelected: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  subSection: { gap: 12 },
  subSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B6B',
  },
  inlineOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineOption: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E6EE',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  inlineOptionActive: {
    borderColor: '#2ECC71',
    backgroundColor: '#2ECC71' + '11',
  },
  inlineOptionText: {
    fontSize: 13,
    color: '#414141',
  },
  inlineOptionTextActive: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  datesSection: {
    gap: 14,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F7FA',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  datePickerButtonDisabled: {
    backgroundColor: '#ECEFF4',
  },
  datePickerIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: '#E2E6EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerTexts: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#8C8C8C',
    marginBottom: 2,
  },
  dateValueText: {
    fontSize: 14,
    color: '#151515',
    fontWeight: '600',
  },
  dateValuePlaceholder: {
    color: '#9DA3B4',
    fontWeight: '400',
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  dateModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
  },
  dateModalPicker: {
    alignSelf: 'stretch',
  },
  dateModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
  },
  dateModalAction: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F1F2F6',
  },
  dateModalActionText: {
    fontSize: 14,
    color: '#4A4A4A',
    fontWeight: '600',
  },
  dateModalActionPrimary: {
    backgroundColor: '#2ECC71',
  },
  dateModalActionPrimaryText: {
    color: '#FFFFFF',
  },
  surfaceInput: {
    borderWidth: 1,
    borderColor: '#E4E6EC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterLabel: {
    fontSize: 14,
    color: '#404040',
    fontWeight: '500',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  counterButtonDisabled: {
    opacity: 0.4,
  },
  counterButtonPrimary: {
    borderColor: '#2ECC71',
    backgroundColor: '#2ECC71',
  },
  counterButtonText: {
    fontSize: 18,
    color: '#333333',
  },
  counterButtonTextPrimary: {
    color: '#FFFFFF',
  },
  counterValue: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1D',
  },
  budgetRow: { gap: 12 },
  budgetInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetField: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 12,
    color: '#7D7D7D',
    marginBottom: 4,
  },
  budgetInput: {
    borderWidth: 1,
    borderColor: '#E3E6ED',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111111',
  },
  amenitiesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E3E6EE',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  amenityChipActive: {
    borderColor: '#2ECC71',
    backgroundColor: '#2ECC71' + '11',
  },
  amenityIconHolder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  amenityIconHolderActive: {
    backgroundColor: '#E0F9EC',
  },
  amenityLabel: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  amenityLabelActive: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: isIOS ? 12 : 4,
    gap: 12,
  },
  clearButton: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    textDecorationLine: 'underline',
    fontSize: 13,
    color: '#6A6A6A',
  },
  searchButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    shadowColor: '#2ECC71',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  validationToast: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.18,
    left: 20,
    right: 20,
    backgroundColor: '#B91C1C',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  validationText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  dropdownFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dropdownFooterText: {
    color: '#6B7280',
    fontSize: 12,
  },
});
