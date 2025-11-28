import { supabase } from '@/src/supabaseClient';

const PROFILE_AVATAR_BUCKET = 'listing-media';
const PROFILE_AVATAR_FOLDER = 'profile-avatars';
const ENTERPRISE_LOGO_FOLDER = 'enterprise-logos';

const isPngContentType = (contentType?: string | null) =>
  typeof contentType === 'string' && contentType.toLowerCase().includes('png');

const uploadImageToFolder = async (folderPath: string, fileUri: string) => {
  if (!fileUri) {
    throw new Error('missing_image_uri');
  }

  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('image_upload_fetch_failed');
  }

  const contentType = response.headers.get('Content-Type') ?? 'image/jpeg';
  const fileExt = isPngContentType(contentType) ? 'png' : 'jpg';
  const storagePath = `${folderPath}/${Date.now()}.${fileExt}`;
  const fileBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(storagePath, fileBuffer, {
    upsert: true,
    cacheControl: '3600',
    contentType,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(storagePath);
  if (!data?.publicUrl) {
    throw new Error('image_public_url_missing');
  }

  return data.publicUrl;
};

export const uploadProfileAvatar = async (profileId: string, fileUri: string): Promise<string> => {
  if (!profileId) {
    throw new Error('missing_profile_id');
  }

  return uploadImageToFolder(`${PROFILE_AVATAR_FOLDER}/${profileId}`, fileUri);
};

export const uploadEnterpriseLogo = async (profileId: string, fileUri: string): Promise<string> => {
  if (!profileId) {
    throw new Error('missing_profile_id');
  }

  return uploadImageToFolder(`${ENTERPRISE_LOGO_FOLDER}/${profileId}`, fileUri);
};
