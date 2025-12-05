import { supabase } from '@/src/supabaseClient';
import type { TablesInsert } from '@/src/types/supabase.generated';

type ListingShareInsert = TablesInsert<'listing_shares'>;

const FALLBACK_CHANNEL: ListingShareInsert['channel'] = 'other';

const normalizeShareChannel = (channel?: ListingShareInsert['channel'] | null) => {
  if (!channel) {
    return FALLBACK_CHANNEL;
  }

  const normalized = channel.trim().toLowerCase() as ListingShareInsert['channel'];
  if (!normalized || normalized === 'system_share_sheet') {
    return FALLBACK_CHANNEL;
  }

  return normalized;
};

export type TrackListingShareParams = {
  listingId: string;
  profileId?: string | null;
  channel?: ListingShareInsert['channel'];
};

const IOS_ACTIVITY_CHANNEL_MAP: Record<string, ListingShareInsert['channel']> = {
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

export const resolveShareChannel = (activityType?: string | null): ListingShareInsert['channel'] => {
  if (!activityType) {
    return FALLBACK_CHANNEL;
  }
  return normalizeShareChannel(IOS_ACTIVITY_CHANNEL_MAP[activityType] ?? FALLBACK_CHANNEL);
};

export async function recordListingShare(params: TrackListingShareParams): Promise<void> {
  if (!params.listingId) {
    console.warn('[ListingShare] missing listingId, skip insert');
    return;
  }

  const payload: ListingShareInsert = {
    listing_id: params.listingId,
    profile_id: params.profileId ?? null,
    channel: normalizeShareChannel(params.channel),
  };

  try {
    const { error } = await supabase.from('listing_shares').insert(payload);
    if (error) {
      throw error;
    }
    console.log('[ListingShare] recorded share', payload);
  } catch (error) {
    console.error('[ListingShare] failed to record share', error);
  }
}

export async function fetchListingShareCount(listingId: string): Promise<number> {
  if (!listingId) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('listing_shares')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId);

    if (error) {
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    console.error('[ListingShare] failed to fetch share count', error);
    return 0;
  }
}
