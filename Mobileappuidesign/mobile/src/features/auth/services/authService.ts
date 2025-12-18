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
  const { createProfileIfMissing = true } = options;
  const sanitizedPhone = phone?.trim();
  const sanitizedCode = code?.trim();
  if (!sanitizedPhone || !sanitizedCode) {
    return { success: false, error: 'missing_phone_or_code' };
  }

  const now = new Date().toISOString();

  const { data: otpRow, error: otpError } = await supabase
    .from('otp_codes')
    .select('id, phone, code, expires_at')
    .eq('phone', sanitizedPhone)
    .eq('code', sanitizedCode)
    .gt('expires_at', now)
    .eq('consumed', false)
    .maybeSingle();

  if (otpError || !otpRow) {
    return { success: false, error: 'invalid_or_expired' };
  }

  await supabase.from('otp_codes').delete().eq('id', otpRow.id);

  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', sanitizedPhone)
    .maybeSingle();

  if (profileError) {
    console.error('verifyOtp profile lookup error', profileError);
    return { success: false, error: 'profile_lookup_failed' };
  }

  if (existingProfile) {
    return { success: true, user: existingProfile as AuthUser };
  }

  if (!createProfileIfMissing) {
    return { success: false, error: 'profile_not_found' };
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({ phone: sanitizedPhone, supply_role: 'none' })
    .select('*')
    .single();

  if (insertError || !insertedProfile) {
    console.error('verifyOtp profile insert error', insertError);
    return { success: false, error: 'profile_creation_failed' };
  }

  return { success: true, user: insertedProfile as AuthUser };
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
