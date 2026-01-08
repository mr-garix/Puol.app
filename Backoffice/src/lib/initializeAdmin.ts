import { supabase } from './supabaseClient';

/**
 * Initialise un compte admin automatiquement
 * À appeler une seule fois au démarrage de l'application
 */
export async function initializeAdminAccount() {
  if (!supabase) {
    console.error('[initializeAdmin] Supabase not configured');
    return false;
  }

  try {
    console.log('[initializeAdmin] Starting admin account initialization...');

    // Vérifier si un compte admin existe déjà
    const { data: existingAdmin, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[initializeAdmin] Error checking for existing admin:', checkError);
      return false;
    }

    if (existingAdmin) {
      console.log('[initializeAdmin] Admin account already exists:', existingAdmin.id);
      return true;
    }

    console.log('[initializeAdmin] No admin account found, creating one...');

    // Créer un compte admin par défaut
    // Utiliser un numéro de téléphone de test
    const adminPhone = '+237670844398';
    const adminFirstName = 'Admin';
    const adminLastName = 'BackOffice';

    // Créer le profil admin
    const { data: newAdmin, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: adminPhone,
        phone: adminPhone,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: 'admin',
        supply_role: 'none',
        is_certified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (createError) {
      console.error('[initializeAdmin] Error creating admin account:', createError);
      return false;
    }

    console.log('[initializeAdmin] Admin account created successfully:', newAdmin.id);
    console.log('[initializeAdmin] Admin phone:', adminPhone);
    console.log('[initializeAdmin] You can now login with this phone number and receive OTP via SMS');

    return true;
  } catch (err) {
    console.error('[initializeAdmin] Unexpected error:', err);
    return false;
  }
}

/**
 * Crée un nouveau compte admin avec un numéro de téléphone spécifique
 */
export async function createAdminAccount(
  phoneNumber: string,
  firstName: string,
  lastName: string
) {
  if (!supabase) {
    console.error('[createAdminAccount] Supabase not configured');
    return false;
  }

  try {
    console.log('[createAdminAccount] Creating admin account for:', phoneNumber);

    // Normaliser le numéro de téléphone
    const normalizedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+237${phoneNumber.replace(/\D/g, '')}`;

    // Vérifier si le compte existe déjà
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[createAdminAccount] Error checking for existing profile:', checkError);
      return false;
    }

    if (existingProfile) {
      console.log('[createAdminAccount] Profile already exists, updating to admin role');
      
      // Mettre à jour le rôle à admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          is_certified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('phone', normalizedPhone);

      if (updateError) {
        console.error('[createAdminAccount] Error updating profile to admin:', updateError);
        return false;
      }

      console.log('[createAdminAccount] Profile updated to admin role');
      return true;
    }

    // Créer le profil admin
    const { data: newAdmin, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: normalizedPhone,
        phone: normalizedPhone,
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

    if (createError) {
      console.error('[createAdminAccount] Error creating admin account:', createError);
      return false;
    }

    console.log('[createAdminAccount] Admin account created successfully:', newAdmin.id);
    return true;
  } catch (err) {
    console.error('[createAdminAccount] Unexpected error:', err);
    return false;
  }
}

/**
 * Liste tous les comptes admin
 */
export async function listAdminAccounts() {
  if (!supabase) {
    console.error('[listAdminAccounts] Supabase not configured');
    return [];
  }

  try {
    console.log('[listAdminAccounts] Fetching admin accounts...');

    const { data: admins, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin');

    if (error) {
      console.error('[listAdminAccounts] Error fetching admin accounts:', error);
      return [];
    }

    console.log('[listAdminAccounts] Found', admins?.length || 0, 'admin accounts');
    return admins || [];
  } catch (err) {
    console.error('[listAdminAccounts] Unexpected error:', err);
    return [];
  }
}

/**
 * Supprime un compte admin
 */
export async function deleteAdminAccount(phoneNumber: string) {
  if (!supabase) {
    console.error('[deleteAdminAccount] Supabase not configured');
    return false;
  }

  try {
    console.log('[deleteAdminAccount] Deleting admin account for:', phoneNumber);

    // Normaliser le numéro de téléphone
    const normalizedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+237${phoneNumber.replace(/\D/g, '')}`;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('phone', normalizedPhone)
      .eq('role', 'admin');

    if (error) {
      console.error('[deleteAdminAccount] Error deleting admin account:', error);
      return false;
    }

    console.log('[deleteAdminAccount] Admin account deleted successfully');
    return true;
  } catch (err) {
    console.error('[deleteAdminAccount] Unexpected error:', err);
    return false;
  }
}
