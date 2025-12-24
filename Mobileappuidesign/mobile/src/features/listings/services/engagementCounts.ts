import { supabase } from '@/src/supabaseClient';

type ListingMetricTable = 'listing_views' | 'listing_likes' | 'listing_comments';

const COUNT_BATCH_SIZE = 10;

/**
 * Récupère un dictionnaire { listingId -> total } pour une table d'engagement donnée sans limite côté client.
 * On interroge chaque annonce avec count exact (head:true) afin d'éviter le cap PostgREST (~1000 lignes renvoyées).
 */
export const fetchListingCountMap = async (table: ListingMetricTable, listingIds: string[]): Promise<Record<string, number>> => {
  if (!listingIds.length) {
    return {};
  }

  const result: Record<string, number> = {};

  for (let start = 0; start < listingIds.length; start += COUNT_BATCH_SIZE) {
    const batch = listingIds.slice(start, start + COUNT_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (listingId) => {
        const { count, error } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('listing_id', listingId);

        if (error) {
          throw error;
        }

        return [listingId, count ?? 0] as const;
      }),
    );

    for (const [listingId, count] of batchResults) {
      result[listingId] = count;
    }
  }

  return result;
};
