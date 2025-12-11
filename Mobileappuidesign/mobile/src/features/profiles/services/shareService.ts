import { supabase } from '@/src/supabaseClient';
import type { TablesInsert } from '@/src/types/supabase.generated';

export type ProfileShareInsert = TablesInsert<'profile_shares'>;
export type ProfileShareChannel = ProfileShareInsert['channel'];

const FALLBACK_CHANNEL: ProfileShareChannel = 'other';

const IOS_ACTIVITY_CHANNEL_MAP: Record<string, ProfileShareChannel> = {
  'com.apple.UIKit.activity.Mail': 'mail',
  'com.apple.UIKit.activity.Message': 'messages',
  'com.apple.UIKit.activity.PostToFacebook': 'facebook',
  'com.apple.UIKit.activity.PostToTwitter': 'twitter',
  'com.apple.UIKit.activity.CopyToPasteboard': 'copy',
  'com.apple.UIKit.activity.AirDrop': 'airdrop',
  'com.apple.UIKit.activity.AssignToContact': 'contact',
  'com.apple.UIKit.activity.SaveToCameraRoll': 'camera_roll',
  'com.apple.UIKit.activity.AddToReadingList': 'reading_list',
  'com.apple.UIKit.activity.PostToFlickr': 'flickr',
  'com.apple.UIKit.activity.PostToVimeo': 'vimeo',
  'com.apple.UIKit.activity.PostToTencentWeibo': 'tencent_weibo',
  'com.apple.UIKit.activity.PostToWeibo': 'weibo',
  'com.apple.UIKit.activity.Print': 'print',
};

const normalizeShareChannel = (channel?: ProfileShareChannel | null): ProfileShareChannel => {
  if (!channel) {
    return FALLBACK_CHANNEL;
  }
  return channel.trim().toLowerCase() as ProfileShareChannel;
};

export const resolveProfileShareChannel = (activityType?: string | null): ProfileShareChannel => {
  if (!activityType) {
    return FALLBACK_CHANNEL;
  }
  return normalizeShareChannel(IOS_ACTIVITY_CHANNEL_MAP[activityType] ?? FALLBACK_CHANNEL);
};

export type RecordProfileShareParams = {
  profileId: string;
  sharedByProfileId?: string | null;
  channel?: ProfileShareChannel;
};

export const recordProfileShare = async ({
  profileId,
  sharedByProfileId,
  channel,
}: RecordProfileShareParams): Promise<void> => {
  if (!profileId) {
    console.warn('[ProfileShare] missing profileId, skip insert');
    return;
  }

  const payload: ProfileShareInsert = {
    profile_id: profileId,
    shared_by_profile_id: sharedByProfileId ?? null,
    channel: normalizeShareChannel(channel),
  };

  try {
    const { error } = await supabase.from('profile_shares').insert(payload);
    if (error) {
      throw error;
    }
    console.log('[ProfileShare] recorded share', payload);
  } catch (error) {
    console.error('[ProfileShare] failed to record share', error);
  }
};

export const fetchProfileShareCount = async (profileId: string): Promise<number> => {
  if (!profileId) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('profile_shares')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    if (error) {
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    console.error('[ProfileShare] failed to fetch share count', error);
    return 0;
  }
};
