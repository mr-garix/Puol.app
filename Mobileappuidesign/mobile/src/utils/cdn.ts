export const SUPABASE_PUBLIC_BASE =
  'https://cdqthqbtpsqhatzjihqq.supabase.co/storage/v1/object/public';
export const CDN_BASE = 'https://cdn.puol.app';

export function toCdnUrl(publicUrl: string | undefined | null): string | null {
  if (!publicUrl) return null;
  return publicUrl.replace(SUPABASE_PUBLIC_BASE, CDN_BASE);
}
