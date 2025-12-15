import { supabase } from '@/src/supabaseClient';

type ProfileSummaryRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export interface ProfileSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

export const fetchProfileSummaries = async (
  profileIds: string[],
): Promise<Record<string, ProfileSummary>> => {
  const uniqueIds = Array.from(new Set(profileIds.filter((value): value is string => Boolean(value))));

  if (uniqueIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, username, phone, avatar_url')
    .in('id', uniqueIds);

  if (error) {
    throw error;
  }

  const rows: ProfileSummaryRow[] = (data as ProfileSummaryRow[]) ?? [];
  return rows.reduce<Record<string, ProfileSummary>>((acc, row) => {
    acc[row.id] = {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      phone: row.phone,
      avatarUrl: row.avatar_url,
    };
    return acc;
  }, {});
};
