import { supabase } from '@/src/supabaseClient';

export interface SignInWithOtpInput {
  phone: string;
}

export interface VerifyOtpInput {
  phone: string;
  token: string;
}

/**
 * Initiate OTP sign-in with phone number
 * Supabase will generate an OTP and send it via SMS
 */
const normalizePhone = (phone: string) => {
  if (!phone) throw new Error('missing_phone');
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return `+${digits}`;
};

export async function signInWithOtp(input: SignInWithOtpInput) {
  const normalizedPhone = normalizePhone(input.phone);
  console.log('[otpService.signInWithOtp] START - phone:', input.phone, 'normalized:', normalizedPhone);

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });

    if (error) {
      console.error('[otpService.signInWithOtp] ERROR:', {
        message: error.message,
        status: error.status,
        code: (error as any).code,
      });
      throw error;
    }

    console.log('[otpService.signInWithOtp] SUCCESS - OTP sent to:', input.phone);
    console.log('[otpService.signInWithOtp] Response data:', {
      user: data.user ? { id: (data.user as any).id, phone: (data.user as any).phone } : null,
      session: data.session ? 'exists' : 'null',
    });
    return { success: true, data };
  } catch (err) {
    console.error('[otpService.signInWithOtp] EXCEPTION:', err);
    throw err;
  }
}

/**
 * Verify OTP token and complete authentication
 * This creates a session if the token is valid
 */
export async function verifyOtp(input: VerifyOtpInput) {
  const normalizedPhone = normalizePhone(input.phone);
  console.log('[otpService.verifyOtp] START - phone:', normalizedPhone, 'token:', input.token.substring(0, 3) + '***');

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: input.token,
      type: 'sms',
    });

    if (error) {
      console.error('[otpService.verifyOtp] ERROR:', {
        message: error.message,
        status: error.status,
        code: (error as any).code,
      });
      throw error;
    }

    console.log('[otpService.verifyOtp] SUCCESS - OTP verified for phone:', normalizedPhone);
    console.log('[otpService.verifyOtp] User details:', {
      userId: (data.user as any)?.id,
      userPhone: (data.user as any)?.phone,
      sessionExists: data.session ? 'YES' : 'NO',
      sessionAccessToken: data.session ? 'exists' : 'null',
    });

    // Verify session is actually set
    const { data: sessionCheck } = await supabase.auth.getSession();
    console.log('[otpService.verifyOtp] Session check after verify:', {
      sessionExists: sessionCheck.session ? 'YES' : 'NO',
      phone: (sessionCheck.session?.user as any)?.phone,
    });

    return { success: true, data };
  } catch (err) {
    console.error('[otpService.verifyOtp] EXCEPTION:', err);
    throw err;
  }
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[otpService] getSession error:', error);
      return null;
    }

    return data.session;
  } catch (err) {
    console.error('[otpService] Unexpected error in getCurrentSession:', err);
    return null;
  }
}

/**
 * Get current user
 *
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[otpService] getUser error:', error);
      return null;
    }

    return data.user;
  } catch (err) {
    console.error('[otpService] Unexpected error in getCurrentUser:', err);
    return null;
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[otpService] signOut error:', error);
      throw error;
    }

    console.log('[otpService] User signed out successfully');
    return { success: true };
  } catch (err) {
    console.error('[otpService] Unexpected error in signOut:', err);
    throw err;
  }
}

/**
 * Get OTP code from auth.mfa_challenges table (for testing only)
 * In production, this should not be accessible
 */
export async function getOtpCodeForTesting(phone: string) {
  try {
    console.warn('[otpService] ⚠️ Getting OTP code from database (DEV ONLY)');

    const { data, error } = await supabase
      .from('auth.mfa_challenges')
      .select('otp_code, created_at')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[otpService] Error fetching OTP code:', error);
      return null;
    }

    if (!data) {
      console.warn('[otpService] No OTP code found for phone:', phone);
      return null;
    }

    console.log('[otpService] OTP code retrieved (DEV ONLY):', data.otp_code);
    return data.otp_code;
  } catch (err) {
    console.error('[otpService] Unexpected error in getOtpCodeForTesting:', err);
    return null;
  }
}
