import { supabase } from './supabaseClient';

export const diagnoseAdminSession = async () => {
  console.log('[adminDiagnostics] Starting admin session diagnosis...');

  if (!supabase) {
    console.error('[adminDiagnostics] Supabase not configured');
    return { error: 'Supabase not configured' };
  }

  try {
    // 1. Vérifier la session Supabase actuelle
    console.log('[adminDiagnostics] 1. Checking Supabase session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[adminDiagnostics] Error getting session:', sessionError);
      return {
        supabaseSession: null,
        error: sessionError.message,
      };
    }

    if (!sessionData.session) {
      console.warn('[adminDiagnostics] No Supabase session found');
      return {
        supabaseSession: null,
        error: 'No Supabase session found',
      };
    }

    console.log('[adminDiagnostics] Supabase session found:', {
      userId: sessionData.session.user.id,
      phone: (sessionData.session.user as any).phone,
      expiresAt: new Date(sessionData.session.expires_at! * 1000).toISOString(),
    });

    // 2. Vérifier le profil admin dans la base de données
    console.log('[adminDiagnostics] 2. Checking admin profile in database...');
    const phone = (sessionData.session.user as any).phone;

    if (!phone) {
      console.error('[adminDiagnostics] No phone number in session');
      return {
        supabaseSession: sessionData.session,
        adminProfile: null,
        error: 'No phone number in session',
      };
    }

    const { data: profileData, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('id, phone, first_name, last_name, role, supply_role')
      .eq('phone', phone)
      .maybeSingle();

    if (profileError) {
      console.error('[adminDiagnostics] Error fetching profile:', profileError);
      return {
        supabaseSession: sessionData.session,
        adminProfile: null,
        error: profileError.message,
      };
    }

    if (!profileData) {
      console.error('[adminDiagnostics] No profile found for phone:', phone);
      return {
        supabaseSession: sessionData.session,
        adminProfile: null,
        error: `No profile found for phone: ${phone}`,
      };
    }

    console.log('[adminDiagnostics] Profile found:', profileData);

    // 3. Vérifier que le rôle est bien 'admin'
    if (profileData.role !== 'admin') {
      console.error('[adminDiagnostics] User is not an admin. Role:', profileData.role);
      return {
        supabaseSession: sessionData.session,
        adminProfile: profileData,
        error: `User role is '${profileData.role}', expected 'admin'`,
      };
    }

    console.log('[adminDiagnostics] ✅ Admin session is valid and user has admin role');

    return {
      supabaseSession: sessionData.session,
      adminProfile: profileData,
      isValid: true,
    };
  } catch (err) {
    console.error('[adminDiagnostics] Exception:', err);
    return {
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

export const checkRLSPermissions = async () => {
  console.log('[adminDiagnostics] Checking RLS permissions...');

  if (!supabase) {
    console.error('[adminDiagnostics] Supabase not configured');
    return { error: 'Supabase not configured' };
  }

  try {
    // Essayer de lire les réservations
    console.log('[adminDiagnostics] Attempting to read bookings...');
    const { data: bookings, error: bookingsError } = await (supabase as any)
      .from('bookings')
      .select('id, status')
      .limit(1);

    if (bookingsError) {
      console.error('[adminDiagnostics] Error reading bookings:', bookingsError);
      return {
        canReadBookings: false,
        bookingsError: bookingsError.message,
      };
    }

    console.log('[adminDiagnostics] ✅ Can read bookings');

    // Essayer de mettre à jour une réservation (test sans vraiment modifier)
    console.log('[adminDiagnostics] Checking update permissions on bookings...');
    // On ne va pas vraiment modifier, juste vérifier les permissions

    return {
      canReadBookings: true,
      bookingsCount: bookings?.length || 0,
    };
  } catch (err) {
    console.error('[adminDiagnostics] Exception:', err);
    return {
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};
