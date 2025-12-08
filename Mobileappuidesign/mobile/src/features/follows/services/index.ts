import { supabase } from '@/src/supabaseClient';
import type { Tables } from '@/src/types/supabase.generated';

type ProfileFollowRow = Tables<'profile_follows'>;
type ProfileRow = Tables<'profiles'>;

export type FollowActionResult = 'created' | 'exists' | 'deleted' | 'missing';

export type ProfileFollowListItem = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  city: string | null;
  enterpriseName: string | null;
  isVerified: boolean;
  followedSince: string | null;
};

const normalizeProfile = (profile?: ProfileRow | ProfileRow[] | null): ProfileRow | null => {
  if (!profile) {
    return null;
  }
  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }
  return profile;
};

const mapProfileToListItem = (profile: ProfileRow, followedSince: string | null): ProfileFollowListItem => ({
  id: profile.id,
  firstName: profile.first_name,
  lastName: profile.last_name,
  username: profile.username,
  avatarUrl: profile.avatar_url,
  city: profile.city,
  enterpriseName: profile.enterprise_name,
  isVerified: Boolean(profile.is_certified),
  followedSince,
});

export const getFollowStats = async (profileId: string) => {
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from('profile_follows')
      .select('id', { count: 'exact', head: true })
      .eq('followed_id', profileId),
    supabase
      .from('profile_follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', profileId),
  ]);

  if (followersRes.error) {
    throw followersRes.error;
  }
  if (followingRes.error) {
    throw followingRes.error;
  }

  return {
    followersCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
  };
};

export const getIsFollowing = async (followerId: string, followedId: string) => {
  if (!followerId || !followedId || followerId === followedId) {
    return false;
  }

  const { count, error } = await supabase
    .from('profile_follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', followerId)
    .eq('followed_id', followedId);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
};

export const followProfile = async (followerId: string, followedId: string): Promise<FollowActionResult> => {
  if (!followerId || !followedId || followerId === followedId) {
    return 'missing';
  }

  const { error } = await supabase.from('profile_follows').insert({
    follower_id: followerId,
    followed_id: followedId,
  } satisfies Partial<ProfileFollowRow>);

  if (error) {
    if (error.code === '23505') {
      return 'exists';
    }
    throw error;
  }

  return 'created';
};

export const unfollowProfile = async (followerId: string, followedId: string): Promise<FollowActionResult> => {
  if (!followerId || !followedId || followerId === followedId) {
    return 'missing';
  }

  const { error, count } = await supabase
    .from('profile_follows')
    .delete({ count: 'exact' })
    .eq('follower_id', followerId)
    .eq('followed_id', followedId);

  if (error) {
    throw error;
  }

  return count && count > 0 ? 'deleted' : 'missing';
};

type FollowJoinRow = Partial<ProfileFollowRow> & {
  follower?: ProfileRow | ProfileRow[] | null;
  followed?: ProfileRow | ProfileRow[] | null;
};

export const getFollowersList = async (profileId: string): Promise<ProfileFollowListItem[]> => {
  const { data, error } = await supabase
    .from('profile_follows')
    .select(
      `
        id,
        created_at,
        follower:profiles!profile_follows_follower_fk (
          id,
          first_name,
          last_name,
          username,
          avatar_url,
          city,
          enterprise_name,
          is_certified
        )
      `,
    )
    .eq('followed_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const { follower, created_at } = row as FollowJoinRow;
      const profile = normalizeProfile(follower);
      if (!profile) {
        return null;
      }
      return mapProfileToListItem(profile, created_at ?? null);
    })
    .filter((item): item is ProfileFollowListItem => Boolean(item));
};

export const getFollowingList = async (profileId: string): Promise<ProfileFollowListItem[]> => {
  const { data, error } = await supabase
    .from('profile_follows')
    .select(
      `
        id,
        created_at,
        followed:profiles!profile_follows_followed_fk (
          id,
          first_name,
          last_name,
          username,
          avatar_url,
          city,
          enterprise_name,
          is_certified
        )
      `,
    )
    .eq('follower_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const { followed, created_at } = row as FollowJoinRow;
      const profile = normalizeProfile(followed);
      if (!profile) {
        return null;
      }
      return mapProfileToListItem(profile, created_at ?? null);
    })
    .filter((item): item is ProfileFollowListItem => Boolean(item));
};
