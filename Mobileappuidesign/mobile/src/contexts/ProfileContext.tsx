import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import type { SupabaseProfile } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';
import { uploadEnterpriseLogo, uploadProfileAvatar } from '@/src/features/auth/services/avatarService';
import {
  checkUsernameAvailability as checkUsernameAvailabilityService,
  ensureProfileUsername,
  generateUsernameSuggestions,
  isUsernameValid,
  normalizeUsernameInput,
} from '@/src/features/auth/services/usernameService';
import {
  DEFAULT_PHONE_COUNTRY,
  formatE164PhoneNumber,
  getPhoneCountryByCode,
  parseE164PhoneNumber,
  sanitizeNationalNumber,
  type PhoneCountryCode,
} from '@/src/features/auth/phoneCountries';

export type ProfileGender = 'female' | 'male';
export type ProfileRole = 'host' | 'landlord' | 'user';
export type ProfileApplicationStatus = 'pending' | 'approved' | 'rejected' | 'none';

export interface ProfileStats {
  listings: number;
  followers: number;
  following: number;
  views: number;
  likes: number;
  comments: number;
}

export interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string;
  city: string;
  enterpriseName: string;
  enterpriseLogoUrl: string;
  gender: ProfileGender;
  birthDate: string; // ISO string
  phoneCountryCode: PhoneCountryCode;
  phoneNumber: string;
  role: ProfileRole;
  hostStatus: ProfileApplicationStatus;
  landlordStatus: ProfileApplicationStatus;
  stats: ProfileStats;
}

export interface ProfileUpdateResult {
  success: boolean;
  error?: string;
}

interface ProfileContextValue {
  profile: ProfileData | null;
  isProfileLoading: boolean;
  isProfileSaving: boolean;
  updateProfile: (updates: Partial<ProfileData>) => Promise<ProfileUpdateResult>;
  ensureUsername: () => Promise<string | null>;
  checkUsernameAvailability: (username: string) => Promise<{ available: boolean; normalized: string }>;
  getUsernameSuggestions: (base?: string) => string[];
  normalizeUsername: (value: string) => string;
  validateUsername: (value: string) => boolean;
}

const defaultStats: ProfileStats = {
  listings: 0,
  followers: 0,
  following: 0,
  views: 0,
  likes: 0,
  comments: 0,
};

const defaultProfile: ProfileData = {
  id: '',
  firstName: '',
  lastName: '',
  username: '',
  avatarUrl: '',
  city: '',
  enterpriseName: '',
  enterpriseLogoUrl: '',
  gender: 'female',
  birthDate: '1997-09-24T00:00:00.000Z',
  phoneCountryCode: DEFAULT_PHONE_COUNTRY.code,
  phoneNumber: '',
  role: 'user',
  hostStatus: 'none',
  landlordStatus: 'none',
  stats: { ...defaultStats },
};

const normalizeGender = (value?: string | null): ProfileGender => (value === 'male' ? 'male' : 'female');
const normalizeRole = (value?: string | null): ProfileRole => (value === 'host' ? 'host' : value === 'landlord' ? 'landlord' : 'user');
const normalizeStatus = (value?: string | null): ProfileApplicationStatus => {
  if (value === 'approved' || value === 'pending' || value === 'rejected') {
    return value;
  }
  return 'none';
};

const FALLBACK_BIRTH_DATE = '1990-01-01T00:00:00.000Z';

const buildProfileFromSupabase = (profile: SupabaseProfile | null): ProfileData => {
  if (!profile) {
    return defaultProfile;
  }

  const { country, nationalNumber } = parseE164PhoneNumber(profile.phone ?? '');

  return {
    id: profile.id,
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    username: profile.username ?? '',
    avatarUrl: profile.avatar_url ?? '',
    city: profile.city ?? '',
    enterpriseName: profile.enterprise_name ?? '',
    enterpriseLogoUrl: profile.enterprise_logo_url ?? '',
    gender: normalizeGender(profile.gender),
    birthDate: profile.date_of_birth ?? FALLBACK_BIRTH_DATE,
    phoneCountryCode: country.code,
    phoneNumber: nationalNumber,
    role: normalizeRole(profile.role),
    hostStatus: normalizeStatus(profile.host_status),
    landlordStatus: normalizeStatus(profile.landlord_status),
    stats: { ...defaultStats },
  };
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const isRemoteUri = (uri?: string | null) => (uri ? /^https?:\/\//i.test(uri) : false);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const { supabaseProfile, isLoggedIn, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isEnsuringUsername, setIsEnsuringUsername] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    if (!supabaseProfile) {
      setIsProfileLoading(true);
      return;
    }

    setProfile(buildProfileFromSupabase(supabaseProfile));
    setIsProfileLoading(false);
  }, [isLoggedIn, supabaseProfile]);

  const ensureUsername = useCallback(async () => {
    if (!isLoggedIn || !supabaseProfile || supabaseProfile.username || isEnsuringUsername) {
      return supabaseProfile?.username ?? null;
    }

    setIsEnsuringUsername(true);
    try {
      const username = await ensureProfileUsername(supabaseProfile);
      if (username) {
        await refreshProfile();
      }
      return username;
    } catch (error) {
      console.error('[ProfileContext] Failed to ensure username', error);
      return null;
    } finally {
      setIsEnsuringUsername(false);
    }
  }, [isEnsuringUsername, isLoggedIn, refreshProfile, supabaseProfile]);

  useEffect(() => {
    if (isLoggedIn && supabaseProfile && !supabaseProfile.username) {
      ensureUsername();
    }
  }, [ensureUsername, isLoggedIn, supabaseProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<ProfileData>): Promise<ProfileUpdateResult> => {
      if (!isLoggedIn || !supabaseProfile) {
        return { success: false, error: 'not_authenticated' };
      }

      setIsProfileSaving(true);

      try {
        const baseProfile = profile ?? buildProfileFromSupabase(supabaseProfile);
        const nextProfile: ProfileData = {
          ...baseProfile,
          ...updates,
          stats: { ...baseProfile.stats, ...updates.stats },
        };

        const phoneCountry = getPhoneCountryByCode(nextProfile.phoneCountryCode);
        const sanitizedPhone = sanitizeNationalNumber(nextProfile.phoneNumber, phoneCountry);
        const formattedPhone = formatE164PhoneNumber(sanitizedPhone, phoneCountry) || null;

        let avatarUrlForSave = nextProfile.avatarUrl || null;
        if (avatarUrlForSave && !isRemoteUri(avatarUrlForSave)) {
          avatarUrlForSave = await uploadProfileAvatar(supabaseProfile.id, avatarUrlForSave);
          nextProfile.avatarUrl = avatarUrlForSave;
        }

        let enterpriseLogoUrlForSave = nextProfile.enterpriseLogoUrl || null;
        if (nextProfile.role === 'host' && enterpriseLogoUrlForSave && !isRemoteUri(enterpriseLogoUrlForSave)) {
          enterpriseLogoUrlForSave = await uploadEnterpriseLogo(supabaseProfile.id, enterpriseLogoUrlForSave);
          nextProfile.enterpriseLogoUrl = enterpriseLogoUrlForSave;
        } else if (nextProfile.role !== 'host') {
          enterpriseLogoUrlForSave = null;
          nextProfile.enterpriseLogoUrl = '';
          nextProfile.enterpriseName = '';
        }

        const payload: Record<string, unknown> = {
          first_name: nextProfile.firstName.trim() || null,
          last_name: nextProfile.lastName.trim() || null,
          username: nextProfile.username.trim() || null,
          gender: nextProfile.gender,
          avatar_url: avatarUrlForSave,
          city: nextProfile.city.trim() || null,
          enterprise_name: nextProfile.role === 'host' ? nextProfile.enterpriseName.trim() || null : null,
          enterprise_logo_url: nextProfile.role === 'host' ? enterpriseLogoUrlForSave : null,
          phone: formattedPhone,
          updated_at: new Date().toISOString(),
        };

        if (nextProfile.birthDate) {
          payload.date_of_birth = nextProfile.birthDate;
        }

        const { error } = await supabase.from('profiles').update(payload).eq('id', supabaseProfile.id);

        if (error) {
          throw error;
        }

        setProfile(nextProfile);
        await refreshProfile();

        return { success: true };
      } catch (error) {
        console.error('[ProfileContext] Failed to update profile', error);
        return { success: false, error: 'profile_update_failed' };
      } finally {
        setIsProfileSaving(false);
      }
    },
    [isLoggedIn, profile, refreshProfile, supabaseProfile],
  );

  const checkUsernameAvailability = useCallback(
    async (value: string) => {
      if (!supabaseProfile) {
        return { available: false, normalized: normalizeUsernameInput(value) };
      }
      return checkUsernameAvailabilityService(value, supabaseProfile.id);
    },
    [supabaseProfile],
  );

  const getUsernameSuggestions = useCallback(
    (base?: string) => {
      const seed = base ?? profile?.username ?? profile?.firstName ?? '';
      return generateUsernameSuggestions(seed, profile?.city);
    },
    [profile],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      isProfileLoading,
      isProfileSaving,
      updateProfile,
      ensureUsername,
      checkUsernameAvailability,
      getUsernameSuggestions,
      normalizeUsername: normalizeUsernameInput,
      validateUsername: isUsernameValid,
    }),
    [
      checkUsernameAvailability,
      ensureUsername,
      getUsernameSuggestions,
      isProfileLoading,
      isProfileSaving,
      profile,
      updateProfile,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
