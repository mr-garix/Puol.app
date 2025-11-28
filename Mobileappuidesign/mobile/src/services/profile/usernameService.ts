import { supabase } from '@/src/supabaseClient';
import type { SupabaseProfile } from '@/src/contexts/AuthContext';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

const stripAccents = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036F]/g, '');
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const normalizeUsernameInput = (input: string) =>
  stripAccents(input)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 32);

export const isUsernameValid = (value: string) =>
  value.length >= USERNAME_MIN_LENGTH && USERNAME_PATTERN.test(value);

export const checkUsernameAvailability = async (username: string, excludeProfileId?: string) => {
  const normalized = normalizeUsernameInput(username);

  if (!isUsernameValid(normalized)) {
    return { available: false, normalized };
  }

  let query = supabase.from('profiles').select('id').eq('username', normalized).limit(1);
  if (excludeProfileId) {
    query = query.neq('id', excludeProfileId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const taken = Boolean(data?.length);
  return { available: !taken, normalized };
};

const buildBaseUsername = (profile: SupabaseProfile) => {
  const first = profile.first_name?.trim() ?? '';
  const last = profile.last_name?.trim() ?? '';
  const phoneDigits = profile.phone?.replace(/\D/g, '') ?? '';
  const attempts = [
    `${first}${last}`,
    `${first}_${last}`,
    first,
    last,
    phoneDigits,
  ].filter(Boolean);

  for (const attempt of attempts) {
    const normalized = normalizeUsernameInput(attempt);
    if (normalized.length >= USERNAME_MIN_LENGTH) {
      return normalized;
    }
  }

  return 'user';
};

const buildCandidateList = (base: string, city?: string | null) => {
  const normalizedBase = normalizeUsernameInput(base);
  const citySlug = city ? normalizeUsernameInput(city) : '';
  const suggestions = new Set<string>();

  const push = (value: string) => {
    const normalized = normalizeUsernameInput(value);
    if (isUsernameValid(normalized)) {
      suggestions.add(normalized);
    }
  };

  push(normalizedBase);
  if (citySlug) {
    push(`${normalizedBase}_${citySlug}`);
    push(`${normalizedBase}${citySlug}`);
  }
  push(`${normalizedBase}237`);
  push(`${normalizedBase}_${randomBetween(10, 99)}`);
  for (let i = 0; i < 5; i += 1) {
    push(`${normalizedBase}${randomBetween(100, 999)}`);
  }

  return Array.from(suggestions);
};

const findAvailableUsername = async (base: string, profileId: string, city?: string | null) => {
  const candidates = buildCandidateList(base, city);

  for (const candidate of candidates) {
    const { available } = await checkUsernameAvailability(candidate, profileId);
    if (available) {
      return candidate;
    }
  }

  for (let i = 0; i < 25; i += 1) {
    const fallback = normalizeUsernameInput(`${base}${randomBetween(100, 9999)}`);
    const { available } = await checkUsernameAvailability(fallback, profileId);
    if (available) {
      return fallback;
    }
  }

  return null;
};

export const ensureProfileUsername = async (profile: SupabaseProfile): Promise<string | null> => {
  if (profile.username?.trim()) {
    return profile.username;
  }

  const base = buildBaseUsername(profile);
  const candidate = await findAvailableUsername(base, profile.id, profile.city);
  if (!candidate) {
    return null;
  }

  const { error, data } = await supabase
    .from('profiles')
    .update({ username: candidate, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
    .select('username')
    .maybeSingle();

  if (error) {
    console.error('[usernameService] Failed to persist generated username', error);
    return null;
  }

  return data?.username ?? candidate;
};

export const generateUsernameSuggestions = (base: string, city?: string | null) =>
  buildCandidateList(base, city).slice(0, 4);
