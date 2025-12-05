import { Platform, Dimensions } from 'react-native';
import * as Localization from 'expo-localization';

import { supabase } from '@/src/supabaseClient';
import type { TablesInsert } from '@/src/types/supabase.generated';
import { trackAnalyticsEvent } from '@/src/infrastructure/analytics';

type ListingViewInsert = TablesInsert<'listing_views'>;

type TrackListingViewParams = {
  listingId: string;
  source: 'feed' | 'search';
  durationSeconds: number;
  viewer?: {
    id?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
};

const VIEW_DURATION_THRESHOLD = 1; // secondes

function resolveDeviceCategory(): ListingViewInsert['device_category'] {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) >= 768 ? 'tablet' : 'mobile';
}

function resolveOs(): ListingViewInsert['os'] {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

function resolveLocaleCountry(): string | null {
  try {
    const locales = typeof Localization.getLocales === 'function' ? Localization.getLocales() : [];
    if (locales.length) {
      const primary = locales[0];
      if (primary?.regionCode) {
        return primary.regionCode.toUpperCase();
      }
      const tagParts = primary?.languageTag?.split('-');
      if (tagParts && tagParts.length > 1) {
        return tagParts[1]?.toUpperCase() ?? null;
      }
    }
  } catch (error) {
    console.warn('[ListingView] resolveLocaleCountry failed', error);
  }
  return null;
}

function buildPayload(params: TrackListingViewParams): ListingViewInsert {
  const viewerCity = params.viewer?.city?.trim();
  const viewerCountry = params.viewer?.country?.trim();

  return {
    listing_id: params.listingId,
    profile_id: params.viewer?.id ?? null,
    duration_seconds: Math.max(params.durationSeconds, VIEW_DURATION_THRESHOLD),
    source: params.source,
    os: resolveOs(),
    device_category: resolveDeviceCategory(),
    country: viewerCountry?.length ? viewerCountry : resolveLocaleCountry(),
    city: viewerCity?.length ? viewerCity : null,
  } satisfies ListingViewInsert;
}

export async function trackListingView(params: TrackListingViewParams): Promise<void> {
  if (!params.listingId || params.durationSeconds < VIEW_DURATION_THRESHOLD) {
    console.log('[ListingView] skip - below threshold or missing listing', {
      listingId: params.listingId,
      durationSeconds: params.durationSeconds,
      threshold: VIEW_DURATION_THRESHOLD,
    });
    return;
  }

  try {
    const payload = buildPayload(params);
    console.log('[ListingView] attempting insert', payload);

    const { error } = await supabase.from('listing_views').insert(payload);

    if (error) {
      console.error('[ListingView] error inserting view', error);
      trackAnalyticsEvent({
        name: 'listing_view_insert_error',
        properties: {
          listingId: params.listingId,
          source: params.source,
          durationSeconds: params.durationSeconds,
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    trackAnalyticsEvent({
      name: 'listing_view_recorded',
      properties: {
        listingId: params.listingId,
        source: params.source,
        durationSeconds: payload.duration_seconds,
        os: payload.os,
        deviceCategory: payload.device_category,
      },
    });
    console.log('[ListingView] inserted view', payload);
  } catch (error) {
    console.error('[ListingView] unexpected error', error);
    trackAnalyticsEvent({
      name: 'listing_view_unexpected_error',
      properties: {
        listingId: params.listingId,
        source: params.source,
        durationSeconds: params.durationSeconds,
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
