import {
  ApplicationVerifier,
  ConfirmationResult,
  User,
  signInWithPhoneNumber,
} from 'firebase/auth';

import type { SupabaseProfile } from '@/src/contexts/AuthContext';
import { firebaseAuth } from '@/src/firebaseClient';
import { supabase } from '@/src/supabaseClient';
import { syncSupabaseSession } from './supabaseSession';

const DEFAULT_COUNTRY_CODE = '+237';

let confirmationResultRef: ConfirmationResult | null = null;
let lastPhoneE164: string | null = null;

const toE164 = (rawPhone: string) => {
  if (!rawPhone) {
    throw new Error('invalid_phone');
  }

  const trimmed = rawPhone.trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) {
    throw new Error('invalid_phone');
  }

  if (digitsOnly.startsWith('00')) {
    return `+${digitsOnly.slice(2)}`;
  }

  return `${DEFAULT_COUNTRY_CODE}${digitsOnly}`;
};

export const getLastConfirmationResult = () => confirmationResultRef;
export const getLastPhoneNumber = () => lastPhoneE164;

export const startPhoneSignIn = async (
  rawPhone: string,
  verifier?: ApplicationVerifier,
) => {
  if (!verifier) {
    throw new Error('missing_verifier');
  }

  const phoneE164 = toE164(rawPhone);

  confirmationResultRef = await signInWithPhoneNumber(firebaseAuth, phoneE164, verifier);
  lastPhoneE164 = phoneE164;
  return confirmationResultRef;
};

export const confirmOtpCode = async (
  code: string,
): Promise<{ user: User; phoneNumber: string | null }> => {
  if (!confirmationResultRef) {
    throw new Error('missing_confirmation');
  }

  if (!code || code.length < 4) {
    throw new Error('invalid_code');
  }

  const credential = await confirmationResultRef.confirm(code);
  const user = credential.user;
  const phoneNumber = user.phoneNumber ?? lastPhoneE164 ?? null;

  // Synchroniser la session Supabase pour que les services backend (commentaires, likes) reconnaissent l'utilisateur
  await syncSupabaseSession(user);

  return { user, phoneNumber };
};

export const getFormattedPhoneForLastRequest = (phone: string) => toE164(phone);

export const resetPhoneConfirmation = () => {
  confirmationResultRef = null;
  lastPhoneE164 = null;
};

export const findSupabaseProfileByPhone = async (
  phoneE164: string,
): Promise<SupabaseProfile | null> => {
  const normalizedPhone = toE164(phoneE164);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return (data as SupabaseProfile) ?? null;
};

type CreateProfileInput = {
  user: User;
  phone: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
};

export const createSupabaseProfile = async ({
  user,
  phone,
  firstName,
  lastName,
  gender,
}: CreateProfileInput): Promise<SupabaseProfile> => {
  if (!user?.uid) {
    throw new Error('missing_user_id');
  }

  const normalizedPhone = toE164(phone);
  const timestamp = new Date().toISOString();

  const payload = {
    id: user.uid,
    phone: normalizedPhone,
    first_name: firstName?.trim() || null,
    last_name: lastName?.trim() || null,
    gender: gender ?? null,
    supply_role: 'none' as const,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as SupabaseProfile;
};

export const formatRawPhoneToE164 = (rawPhone: string) => toE164(rawPhone);
