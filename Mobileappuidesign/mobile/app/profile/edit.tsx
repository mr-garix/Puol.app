import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  Image,
  Platform,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRY_OPTIONS,
  PhoneCountryOption,
  sanitizeNationalNumber,
} from '@/src/features/auth/phoneCountries';
import { useProfile } from '@/src/contexts/ProfileContext';

const PUOL_GREEN = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

type GenderValue = 'female' | 'male';

const genderOptions: {
  label: string;
  value: GenderValue;
  icon: 'user';
}[] = [
  { label: 'Femme', value: 'female', icon: 'user' },
  { label: 'Homme', value: 'male', icon: 'user' },
];

const AVATAR_MEDIA_TYPES = ['images'] as unknown as ImagePicker.MediaTypeOptions;
type UsernameStatus = 'idle' | 'current' | 'checking' | 'available' | 'unavailable' | 'invalid';

export default function EditProfileScreen() {
  const router = useRouter();
  const {
    profile,
    isProfileLoading,
    isProfileSaving,
    updateProfile,
    ensureUsername,
    checkUsernameAvailability,
    getUsernameSuggestions,
    normalizeUsername,
    validateUsername,
  } = useProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameHelperText, setUsernameHelperText] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [birthDate, setBirthDate] = useState<Date>(new Date());
  const [gender, setGender] = useState<GenderValue>('female');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountryOption>(DEFAULT_PHONE_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [isAvatarPreviewVisible, setIsAvatarPreviewVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isAvatarProcessing, setIsAvatarProcessing] = useState(false);
  const [enterpriseName, setEnterpriseName] = useState('');
  const [enterpriseLogoUri, setEnterpriseLogoUri] = useState<string | null>(null);
  const [isEnterpriseLogoProcessing, setIsEnterpriseLogoProcessing] = useState(false);
  const [isEnterpriseLogoPreviewVisible, setIsEnterpriseLogoPreviewVisible] = useState(false);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRequestId = useRef(0);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setUsername(profile.username);
    setGender(profile.gender as GenderValue);
    setAvatarUri(profile.avatarUrl || null);
    setCity(profile.city ?? '');
    setEnterpriseName(profile.enterpriseName ?? '');
    setEnterpriseLogoUri(profile.enterpriseLogoUrl || null);

    const parsedBirthDate = profile.birthDate ? new Date(profile.birthDate) : new Date();
    setBirthDate(Number.isNaN(parsedBirthDate.getTime()) ? new Date() : parsedBirthDate);

    const nextCountry =
      PHONE_COUNTRY_OPTIONS.find((country) => country.code === profile.phoneCountryCode) ?? DEFAULT_PHONE_COUNTRY;
    setPhoneCountry(nextCountry);
    setPhoneNumber(profile.phoneNumber);

    if (!profile.username) {
      ensureUsername();
    }
  }, [ensureUsername, profile]);

  const isHost = profile?.role === 'host';

  const isSaveDisabled = useMemo(() => {
    if (!profile) {
      return true;
    }
    const hasPhone = phoneNumber.length >= phoneCountry.minLength;
    const hasCity = Boolean(city.trim());
    const usernameReady = usernameStatus === 'available' || usernameStatus === 'current';
    const hostFieldsValid = !isHost || Boolean(enterpriseName.trim());
    return (
      !firstName.trim() ||
      !lastName.trim() ||
      !username.trim() ||
      !usernameReady ||
      !hasCity ||
      !hasPhone ||
      !hostFieldsValid ||
      isProfileSaving ||
      isAvatarProcessing ||
      isEnterpriseLogoProcessing
    );
  }, [
    city,
    enterpriseName,
    isAvatarProcessing,
    isEnterpriseLogoProcessing,
    isHost,
    isProfileSaving,
    phoneCountry,
    phoneNumber,
    profile,
    username,
    usernameStatus,
    firstName,
    lastName,
  ]);

  const formattedBirthDate = useMemo(() => {
    return birthDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, [birthDate]);

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
      setBirthDate(selected);
    }
  };

  const handleConfirmDate = () => {
    setDatePickerVisible(false);
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    const result = await updateProfile({
      firstName,
      lastName,
      username,
      avatarUrl: avatarUri ?? profile.avatarUrl,
      phoneCountryCode: phoneCountry.code,
      phoneNumber,
      birthDate: birthDate.toISOString(),
      gender,
      city,
      enterpriseName: isHost ? enterpriseName : '',
      enterpriseLogoUrl: isHost ? enterpriseLogoUri ?? profile.enterpriseLogoUrl : '',
    });

    if (!result.success) {
      Alert.alert('Erreur', "Impossible de sauvegarder votre profil pour le moment. Veuillez réessayer.");
      return;
    }

    router.back();
  };

  const pickAvatarFromLibrary = useCallback(async () => {
    setIsAvatarProcessing(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Activez l’accès à la galerie pour choisir une photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: AVATAR_MEDIA_TYPES,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.length) {
        setAvatarUri(result.assets[0].uri ?? null);
      }
    } catch (error) {
      console.error('[EditProfile] avatar library error', error);
      Alert.alert('Import impossible', 'Nous n’avons pas pu sélectionner cette photo.');
    } finally {
      setIsAvatarProcessing(false);
    }
  }, []);

  const captureAvatar = useCallback(async () => {
    setIsAvatarProcessing(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Activez la caméra pour prendre une photo de profil.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: AVATAR_MEDIA_TYPES,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.length) {
        setAvatarUri(result.assets[0].uri ?? null);
      }
    } catch (error) {
      console.error('[EditProfile] avatar camera error', error);
      Alert.alert('Capture impossible', 'Impossible de prendre cette photo.');
    } finally {
      setIsAvatarProcessing(false);
    }
  }, []);

  const handleChangeAvatar = useCallback(() => {
    if (isAvatarProcessing) {
      return;
    }
    const options = [
      { label: 'Prendre une photo', action: captureAvatar },
      { label: 'Choisir dans la galerie', action: pickAvatarFromLibrary },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map((item) => item.label), 'Annuler'],
          cancelButtonIndex: options.length,
        },
        (index) => {
          if (index === 0) options[0].action();
          if (index === 1) options[1].action();
        },
      );
    } else {
      Alert.alert('Photo de profil', 'Sélectionnez une option', [
        { text: options[0].label, onPress: options[0].action },
        { text: options[1].label, onPress: options[1].action },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  }, [captureAvatar, isAvatarProcessing, pickAvatarFromLibrary]);

  const pickEnterpriseLogoFromLibrary = useCallback(async () => {
    setIsEnterpriseLogoProcessing(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', "Activez l'accès à la galerie pour choisir un logo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: AVATAR_MEDIA_TYPES,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.length) {
        setEnterpriseLogoUri(result.assets[0].uri ?? null);
      }
    } catch (error) {
      console.error('[EditProfile] enterprise logo library error', error);
      Alert.alert('Import impossible', "Nous n'avons pas pu sélectionner ce logo.");
    } finally {
      setIsEnterpriseLogoProcessing(false);
    }
  }, []);

  const captureEnterpriseLogo = useCallback(async () => {
    setIsEnterpriseLogoProcessing(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Activez la caméra pour prendre le logo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: AVATAR_MEDIA_TYPES,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.length) {
        setEnterpriseLogoUri(result.assets[0].uri ?? null);
      }
    } catch (error) {
      console.error('[EditProfile] enterprise logo camera error', error);
      Alert.alert('Capture impossible', 'Impossible de prendre ce logo.');
    } finally {
      setIsEnterpriseLogoProcessing(false);
    }
  }, []);

  const handleChangeEnterpriseLogo = useCallback(() => {
    if (isEnterpriseLogoProcessing) {
      return;
    }
    const options = [
      { label: 'Prendre un logo', action: captureEnterpriseLogo },
      { label: 'Choisir dans la galerie', action: pickEnterpriseLogoFromLibrary },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map((item) => item.label), 'Annuler'],
          cancelButtonIndex: options.length,
        },
        (index) => {
          if (index === 0) options[0].action();
          if (index === 1) options[1].action();
        },
      );
    } else {
      Alert.alert('Logo entreprise', 'Sélectionnez une option', [
        { text: options[0].label, onPress: options[0].action },
        { text: options[1].label, onPress: options[1].action },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  }, [captureEnterpriseLogo, isEnterpriseLogoProcessing, pickEnterpriseLogoFromLibrary]);

  const handleUsernameChange = useCallback(
    (value: string) => {
      setUsername(normalizeUsername(value));
    },
    [normalizeUsername],
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (!username) {
      setUsernameStatus('idle');
      setUsernameHelperText('');
      setUsernameSuggestions([]);
      return;
    }

    if (!validateUsername(username)) {
      setUsernameStatus('invalid');
      setUsernameHelperText('Utilisez au moins 3 caractères (lettres, chiffres ou underscores).');
      setUsernameSuggestions(getUsernameSuggestions(username));
      return;
    }

    if (username === profile.username) {
      setUsernameStatus('current');
      setUsernameHelperText('Nom d’utilisateur actuel.');
      setUsernameSuggestions([]);
      return;
    }

    setUsernameStatus('checking');
    setUsernameHelperText('Vérification de la disponibilité...');
    setUsernameSuggestions([]);
    usernameRequestId.current += 1;
    const requestId = usernameRequestId.current;

    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
    }
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(username);
        if (requestId !== usernameRequestId.current) {
          return;
        }
        if (result.available) {
          setUsernameStatus('available');
          setUsernameHelperText('Great! Ce nom est disponible.');
          setUsernameSuggestions([]);
        } else {
          setUsernameStatus('unavailable');
          setUsernameHelperText('Ce nom est déjà utilisé. Essayez une suggestion.');
          setUsernameSuggestions(getUsernameSuggestions(username));
        }
      } catch (error) {
        console.error('[EditProfile] username availability error', error);
        setUsernameStatus('unavailable');
        setUsernameHelperText('Impossible de vérifier la disponibilité pour le moment.');
        setUsernameSuggestions(getUsernameSuggestions(username));
      }
    }, 400);

    return () => {
      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current);
      }
    };
  }, [checkUsernameAvailability, getUsernameSuggestions, profile, username, validateUsername]);

  if (isProfileLoading || !profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={PUOL_GREEN} />
        <Text style={styles.loadingText}>Chargement de vos informations...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier mon profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.avatarCard}>
          <TouchableOpacity style={styles.avatarCircle} activeOpacity={0.9} onPress={() => setIsAvatarPreviewVisible(true)}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Feather name="camera" size={10} color={PUOL_GREEN} />
            )}
            {isAvatarProcessing && (
              <View style={styles.avatarProcessingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.avatarDetails}>
            <Text style={styles.avatarTitle}>Photo de profil</Text>
            <Text style={styles.avatarSubtitle} numberOfLines={1} adjustsFontSizeToFit>
              Ajouter ou modifier votre photo de profil.
            </Text>
            <TouchableOpacity
              style={[styles.avatarIconButton, isAvatarProcessing && styles.avatarIconButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleChangeAvatar}
              disabled={isAvatarProcessing}
            >
              <Feather name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Informations personnelles *</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Prénom *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="user" size={18} color={PUOL_GREEN} />
            <TextInput
              style={styles.textInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Votre prénom"
              placeholderTextColor={MUTED}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nom *</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="account" size={18} color={PUOL_GREEN} />
            <TextInput
              style={styles.textInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Votre nom"
              placeholderTextColor={MUTED}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nom d'utilisateur *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="at-sign" size={18} color={PUOL_GREEN} />
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="@username"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
            />
          </View>
          {usernameHelperText ? (
            <View style={styles.usernameHelperRow}>
              {usernameStatus === 'checking' ? (
                <ActivityIndicator size="small" color={PUOL_GREEN} />
              ) : (
                <Feather
                  name={usernameStatus === 'available' || usernameStatus === 'current' ? 'check' : 'info'}
                  size={14}
                  color={usernameStatus === 'available' || usernameStatus === 'current' ? PUOL_GREEN : '#F59E0B'}
                />
              )}
              <Text
                style={[
                  styles.usernameHelperText,
                  usernameStatus === 'available' || usernameStatus === 'current'
                    ? styles.usernameHelperSuccess
                    : usernameStatus === 'unavailable' || usernameStatus === 'invalid'
                      ? styles.usernameHelperError
                      : null,
                ]}
              >
                {usernameHelperText}
              </Text>
            </View>
          ) : null}
          {usernameSuggestions.length > 0 && (
            <View style={styles.usernameSuggestions}>
              {usernameSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.usernameSuggestionChip}
                  activeOpacity={0.85}
                  onPress={() => setUsername(suggestion)}
                >
                  <Text style={styles.usernameSuggestionText}>@{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Ville *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="map-pin" size={18} color={PUOL_GREEN} />
            <TextInput
              style={styles.textInput}
              value={city}
              onChangeText={setCity}
              placeholder="Ex: Douala"
              placeholderTextColor={MUTED}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Numéro de téléphone *</Text>
          <View style={[styles.inputWrapper, styles.phoneWrapper]}>
            <TouchableOpacity
              style={styles.countrySelector}
              activeOpacity={0.8}
              onPress={() => setIsCountryPickerOpen((prev) => !prev)}
            >
              <Text style={styles.flag}>{phoneCountry.flag}</Text>
              <Text style={styles.prefix}>{phoneCountry.dialCode}</Text>
              <Feather name={isCountryPickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={PUOL_GREEN} />
            </TouchableOpacity>
            <TextInput
              style={[styles.textInput, { paddingLeft: 4 }]}
              value={phoneNumber}
              onChangeText={(value) => {
                const sanitized = sanitizeNationalNumber(value, phoneCountry);
                setPhoneNumber(sanitized);
              }}
              placeholder={phoneCountry.inputPlaceholder}
              placeholderTextColor={MUTED}
              keyboardType="phone-pad"
            />
          </View>
          {isCountryPickerOpen && (
            <View style={styles.countryList}>
              {PHONE_COUNTRY_OPTIONS.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[styles.countryItem, country.code === phoneCountry.code && styles.countryItemActive]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setPhoneCountry(country);
                    setPhoneNumber('');
                    setIsCountryPickerOpen(false);
                  }}
                >
                  <Text style={styles.flag}>{country.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.countryName}>{country.name}</Text>
                    <Text style={styles.countryDial}>{country.dialCode}</Text>
                  </View>
                  {country.code === phoneCountry.code && <Feather name="check" size={16} color={PUOL_GREEN} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date de naissance *</Text>
          <TouchableOpacity
            style={[styles.inputWrapper, styles.datePickerInput]}
            activeOpacity={0.8}
            onPress={() => setDatePickerVisible(true)}
          >
            <Feather name="calendar" size={18} color={PUOL_GREEN} />
            <Text style={styles.dateText}>{formattedBirthDate}</Text>
          </TouchableOpacity>
        </View>

        {isHost && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 32 }]}>Informations entreprise</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom de l’entreprise *</Text>
              <View style={styles.inputWrapper}>
                <Feather name="briefcase" size={18} color={PUOL_GREEN} />
                <TextInput
                  style={styles.textInput}
                  value={enterpriseName}
                  onChangeText={setEnterpriseName}
                  placeholder="Votre entreprise"
                  placeholderTextColor={MUTED}
                />
              </View>
            </View>

            <View style={styles.enterpriseCard}>
              <TouchableOpacity
                style={styles.enterpriseLogoCircle}
                activeOpacity={0.9}
                onPress={() => setIsEnterpriseLogoPreviewVisible(true)}
              >
                {enterpriseLogoUri ? (
                  <Image source={{ uri: enterpriseLogoUri }} style={styles.enterpriseLogoImage} />
                ) : (
                  <Feather name="image" size={16} color={PUOL_GREEN} />
                )}
                {isEnterpriseLogoProcessing && (
                  <View style={styles.avatarProcessingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.avatarTitle}>Logo de l’entreprise</Text>
                <Text style={styles.avatarSubtitle} numberOfLines={2}>
                  Importez un visuel carré (PNG/JPG) qui représentera votre marque sur PUOL.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.avatarIconButton, isEnterpriseLogoProcessing && styles.avatarIconButtonDisabled]}
                activeOpacity={0.85}
                onPress={handleChangeEnterpriseLogo}
                disabled={isEnterpriseLogoProcessing}
              >
                <Feather name="upload" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Genre *</Text>
        <View style={styles.genderRow}>
          {genderOptions.map((option) => {
            const isActive = gender === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.genderButton, isActive && styles.genderButtonActive]}
                onPress={() => setGender(option.value)}
                activeOpacity={0.8}
              >
                {option.value === 'female' ? (
                  <MaterialCommunityIcons
                    name="gender-female"
                    size={18}
                    color={isActive ? '#FFFFFF' : PUOL_GREEN}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="gender-male"
                    size={18}
                    color={isActive ? '#FFFFFF' : PUOL_GREEN}
                  />
                )}
                <Text style={[styles.genderLabel, isActive && styles.genderLabelActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isSaveDisabled}
        >
          {isProfileSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>

      {datePickerVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
          <TouchableOpacity style={styles.datePickerOverlay} activeOpacity={1} onPress={() => setDatePickerVisible(false)}>
            <View style={styles.datePickerCard}>
              <Text style={styles.datePickerTitle}>Sélectionnez votre date</Text>
              <DateTimePicker
                value={birthDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                themeVariant="light"
                onChange={handleDateChange}
                locale="fr-FR"
                textColor={DARK}
              />
              <TouchableOpacity style={styles.datePickerConfirm} onPress={handleConfirmDate} activeOpacity={0.85}>
                <Text style={styles.datePickerConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {isAvatarPreviewVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setIsAvatarPreviewVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setIsAvatarPreviewVisible(false)}>
            <View style={styles.avatarPreviewOverlay}>
              <View style={styles.avatarPreviewCard}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarPreviewImage} />
                ) : (
                  <View style={styles.avatarPreviewPlaceholder}>
                    <Feather name="camera" size={32} color={PUOL_GREEN} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.avatarPreviewClose}
                  onPress={() => setIsAvatarPreviewVisible(false)}
                  activeOpacity={0.85}
                >
                  <Feather name="x" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {isEnterpriseLogoPreviewVisible && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setIsEnterpriseLogoPreviewVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsEnterpriseLogoPreviewVisible(false)}>
            <View style={styles.avatarPreviewOverlay}>
              <View style={styles.avatarPreviewCard}>
                {enterpriseLogoUri ? (
                  <Image source={{ uri: enterpriseLogoUri }} style={styles.avatarPreviewImage} />
                ) : (
                  <View style={styles.avatarPreviewPlaceholder}>
                    <Feather name="image" size={32} color={PUOL_GREEN} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.avatarPreviewClose}
                  onPress={() => setIsEnterpriseLogoPreviewVisible(false)}
                  activeOpacity={0.85}
                >
                  <Feather name="x" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIconButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    backgroundColor: '#F9FAFB',
  },
  avatarCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 24,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 82,
    height: 82,
    borderRadius: 36,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarProcessingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarDetails: {
    flex: 1,
    gap: 6,
  },
  avatarTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
  },
  avatarSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
  },
  avatarIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PUOL_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '500',
    color: MUTED,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  usernameHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  usernameHelperText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
    flex: 1,
  },
  usernameHelperSuccess: {
    color: PUOL_GREEN,
  },
  usernameHelperError: {
    color: '#DC2626',
  },
  usernameSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  usernameSuggestionChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  usernameSuggestionText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: DARK,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 15,
    color: DARK,
  },
  phoneWrapper: {
    gap: 10,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  flag: {
    fontSize: 18,
  },
  prefix: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: DARK,
  },
  countryList: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  countryItemActive: {
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  enterpriseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  enterpriseLogoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  enterpriseLogoImage: {
    width: '100%',
    height: '100%',
  },
  countryName: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: DARK,
    fontWeight: '600',
  },
  countryDial: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
  },
  datePickerInput: {
    justifyContent: 'space-between',
  },
  dateText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: DARK,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PUOL_GREEN,
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  genderButtonActive: {
    backgroundColor: PUOL_GREEN,
  },
  genderLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: PUOL_GREEN,
  },
  genderLabelActive: {
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  saveButton: {
    backgroundColor: PUOL_GREEN,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  datePickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  datePickerTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: DARK,
    textAlign: 'center',
  },
  datePickerConfirm: {
    backgroundColor: PUOL_GREEN,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  avatarPreviewCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
  },
  avatarPreviewImage: {
    width: '100%',
    aspectRatio: 1,
  },
  avatarPreviewPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPreviewClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
