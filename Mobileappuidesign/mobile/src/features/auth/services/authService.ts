import { supabase } from '@/src/supabaseClient';
import type { AuthUser } from '@/src/contexts/AuthContext';

const OTP_EXPIRATION_MINUTES = 5;
const DEV_MODE = process.env.NODE_ENV !== 'production';

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function sendOtp(phone: string): Promise<{ success: boolean; error?: string; devCode?: string }> {
  const sanitizedPhone = phone?.trim();
  if (!sanitizedPhone) {
    return { success: false, error: 'missing_phone' };
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000).toISOString();

  await supabase.from('otp_codes').delete().eq('phone', sanitizedPhone);

  const { error } = await supabase.from('otp_codes').insert({
    phone: sanitizedPhone,
    code,
    expires_at: expiresAt,
    attempts: 0,
    consumed: false,
  });

  if (error) {
    console.error('sendOtp error', error);
    return { success: false, error: 'failed_to_send' };
  }

  return { success: true, devCode: DEV_MODE ? code : undefined };
}

type VerifyOtpOptions = {
  createProfileIfMissing?: boolean;
};

export async function verifyOtp(
  phone: string,
  code: string,
  options: VerifyOtpOptions = {},
): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  const { createProfileIfMissing = false } = options;
  const sanitizedPhone = phone?.trim();
  const sanitizedCode = code?.trim();
  if (!sanitizedPhone || !sanitizedCode) {
    return { success: false, error: 'missing_phone_or_code' };
  }

  const normalizedPhone = sanitizedPhone.startsWith('+')
    ? sanitizedPhone
    : `+${sanitizedPhone.replace(/\D/g, '')}`;

  console.log('[authService.verifyOtp] START - phone:', normalizedPhone);

  const now = new Date().toISOString();

  const { data: otpRow, error: otpError } = await supabase
    .from('otp_codes')
    .select('id, phone, code, expires_at')
    .eq('phone', normalizedPhone)
    .eq('code', sanitizedCode)
    .gt('expires_at', now)
    .eq('consumed', false)
    .maybeSingle();

  if (otpError || !otpRow) {
    console.error('[authService.verifyOtp] OTP invalid or expired');
    return { success: false, error: 'invalid_or_expired' };
  }

  console.log('[authService.verifyOtp] OTP valid, deleting OTP code');
  await supabase.from('otp_codes').delete().eq('id', otpRow.id);

  console.log('[authService.verifyOtp] Looking for existing profile with phone:', normalizedPhone);
  const { data: allProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', normalizedPhone);

  if (profileError) {
    console.error('[authService.verifyOtp] Profile lookup error:', profileError);
    return { success: false, error: 'profile_lookup_failed' };
  }

  console.log('[authService.verifyOtp] Found profiles:', {
    count: allProfiles?.length,
    profiles: allProfiles?.map(p => ({ id: p.id, phone: p.phone, first_name: p.first_name }))
  });

  const existingProfile = allProfiles?.[0];

  if (existingProfile) {
    console.log('[authService.verifyOtp] Profile exists, returning it');
    return { success: true, user: existingProfile as AuthUser };
  }

  console.log('[authService.verifyOtp] Profile not found - relying on trigger only (no manual creation)');
  if (!createProfileIfMissing) {
    return { success: false, error: 'profile_not_found' };
  }

  // Même si on nous demande explicitement, on ne crée plus manuellement pour éviter les doublons.
  return { success: false, error: 'profile_not_found' };
}

export async function updateProfileDetails(
  userId: string,
  details: Partial<Pick<AuthUser, 'first_name' | 'last_name' | 'gender'>>,
): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  if (!userId) {
    return { success: false, error: 'missing_user_id' };
  }

  const payload = {
    ...details,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  if (error || !data) {
    console.error('updateProfileDetails error', error);
    return { success: false, error: 'profile_update_failed' };
  }

  return { success: true, user: data as AuthUser };
}
