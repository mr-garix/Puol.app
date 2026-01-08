import { supabase } from './supabaseClient';

const DEFAULT_COUNTRY_CODE = '+237';

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

export const sendAdminOtp = async (phoneNumber: string) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const e164Phone = toE164(phoneNumber);
  console.log('[adminAuthService.sendAdminOtp] Sending OTP to:', e164Phone);

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164Phone,
    });

    if (error) {
      console.error('[adminAuthService.sendAdminOtp] Error:', error);
      throw error;
    }

    console.log('[adminAuthService.sendAdminOtp] OTP sent successfully');
    return { success: true, phone: e164Phone };
  } catch (err) {
    console.error('[adminAuthService.sendAdminOtp] Exception:', err);
    throw err;
  }
};

export const verifyAdminOtp = async (phoneNumber: string, code: string) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const e164Phone = toE164(phoneNumber);
  console.log('[adminAuthService.verifyAdminOtp] Verifying OTP for:', e164Phone);

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164Phone,
      token: code,
      type: 'sms',
    });

    if (error) {
      console.error('[adminAuthService.verifyAdminOtp] Error:', error);
      throw error;
    }

    console.log('[adminAuthService.verifyAdminOtp] OTP verified successfully');

    // Vérifier que l'utilisateur a le rôle admin
    const adminProfile = await getAdminProfile(e164Phone);
    if (!adminProfile || adminProfile.role !== 'admin') {
      throw new Error('Unauthorized: User is not an admin');
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
      profile: adminProfile,
    };
  } catch (err) {
    console.error('[adminAuthService.verifyAdminOtp] Exception:', err);
    throw err;
  }
};

export const getAdminProfile = async (phoneNumber: string) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const e164Phone = toE164(phoneNumber);
  console.log('[adminAuthService.getAdminProfile] Fetching profile for:', e164Phone);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', e164Phone)
      .eq('role', 'admin')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[adminAuthService.getAdminProfile] Error:', error);
      throw error;
    }

    console.log('[adminAuthService.getAdminProfile] Profile found:', !!data);
    return data;
  } catch (err) {
    console.error('[adminAuthService.getAdminProfile] Exception:', err);
    throw err;
  }
};

export const createAdminProfile = async (phoneNumber: string, firstName: string, lastName: string) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const e164Phone = toE164(phoneNumber);
  console.log('[adminAuthService.createAdminProfile] Creating admin profile for:', e164Phone);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: e164Phone,
        phone: e164Phone,
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        supply_role: 'none',
        is_certified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('[adminAuthService.createAdminProfile] Error:', error);
      throw error;
    }

    console.log('[adminAuthService.createAdminProfile] Admin profile created successfully');
    return data;
  } catch (err) {
    console.error('[adminAuthService.createAdminProfile] Exception:', err);
    throw err;
  }
};

export const logoutAdmin = async () => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  console.log('[adminAuthService.logoutAdmin] Logging out admin');

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[adminAuthService.logoutAdmin] Error:', error);
      throw error;
    }

    console.log('[adminAuthService.logoutAdmin] Admin logged out successfully');
    return { success: true };
  } catch (err) {
    console.error('[adminAuthService.logoutAdmin] Exception:', err);
    throw err;
  }
};

export const getCurrentAdminSession = async () => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[adminAuthService.getCurrentAdminSession] Error:', error);
      throw error;
    }

    if (!data.session) {
      return null;
    }

    // Vérifier que l'utilisateur a le rôle admin
    const adminProfile = await getAdminProfile(data.session.user.phone || '');
    if (!adminProfile || adminProfile.role !== 'admin') {
      throw new Error('Unauthorized: User is not an admin');
    }

    return {
      session: data.session,
      profile: adminProfile,
    };
  } catch (err) {
    console.error('[adminAuthService.getCurrentAdminSession] Exception:', err);
    return null;
  }
};
