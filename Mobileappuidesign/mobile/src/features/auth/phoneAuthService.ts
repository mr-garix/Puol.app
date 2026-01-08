import type { SupabaseProfile } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';
import { getOrCreateVisitorId, deleteVisitorId } from '@/src/utils/visitorId';

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
  user: any;
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
  if (!user?.id) {
    throw new Error('missing_user_id');
  }

  const normalizedPhone = toE164(phone);
  const timestamp = new Date().toISOString();

  console.log('[createSupabaseProfile] START - userId:', user.id, 'phone:', normalizedPhone);

  // Mettre à jour le profil créé par le trigger avec les informations supplémentaires
  const payload = {
    phone: normalizedPhone,
    first_name: firstName?.trim() || null,
    last_name: lastName?.trim() || null,
    gender: gender ?? null,
    updated_at: timestamp,
  };

  console.log('[createSupabaseProfile] Updating profile with id:', user.id);
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    console.error('[createSupabaseProfile] Error updating profile:', error);
    throw error;
  }

  console.log('[createSupabaseProfile] Profile updated successfully');

  // 🔄 Merger le visitor_id au user_id après création du profil
  try {
    const visitorId = await getOrCreateVisitorId();
    if (visitorId) {
      console.log('[createSupabaseProfile] Merging visitor to user:', { visitorId, userId: user.id });
      
      // Mettre à jour la table visitor_activity_heartbeat pour lier le visiteur au nouvel utilisateur
      await supabase
        .from('visitor_activity_heartbeat')
        .update({
          linked_user_id: user.id,
          merged_at: timestamp,
        })
        .eq('visitor_id', visitorId);
      
      // Supprimer le visitor_id du stockage local pour ne plus l'utiliser
      await deleteVisitorId();
      console.log('[createSupabaseProfile] Visitor merged successfully');
    }
  } catch (mergeErr) {
    console.error('[createSupabaseProfile] Error merging visitor to user:', mergeErr);
    // Ne pas échouer la création de profil si le merge échoue
  }

  return data as SupabaseProfile;
};

export const formatRawPhoneToE164 = (rawPhone: string) => toE164(rawPhone);
