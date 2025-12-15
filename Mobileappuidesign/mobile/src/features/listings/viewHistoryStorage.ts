import AsyncStorage from '@react-native-async-storage/async-storage';

export type ViewedListing = {
  listingId: string;
  title: string;
  location: string;
  coverPhotoUrl: string | null;
  viewedAt: number;
};

const STORAGE_KEY = 'puol:viewed_listings';
const MAX_ITEMS = 30;

const loadRaw = async (): Promise<ViewedListing[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ViewedListing[];
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => Boolean(item?.listingId));
    }
    return [];
  } catch (error) {
    console.warn('[viewHistoryStorage] load failed', error);
    return [];
  }
};

const persist = async (items: ViewedListing[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('[viewHistoryStorage] persist failed', error);
  }
};

export const addViewedListing = async (listing: Omit<ViewedListing, 'viewedAt'> & { viewedAt?: number }) => {
  const current = await loadRaw();
  const timestamp = listing.viewedAt ?? Date.now();
  const normalized: ViewedListing = {
    listingId: listing.listingId,
    title: listing.title?.trim() || 'Annonce PUOL',
    location: listing.location?.trim() || 'Localisation PUOL',
    coverPhotoUrl: listing.coverPhotoUrl ?? null,
    viewedAt: timestamp,
  };

  const withoutDuplicate = current.filter((item) => item.listingId !== normalized.listingId);
  const next = [normalized, ...withoutDuplicate].sort((a, b) => b.viewedAt - a.viewedAt).slice(0, MAX_ITEMS);
  await persist(next);
};

export const getViewedListings = async (): Promise<ViewedListing[]> => {
  const data = await loadRaw();
  return data.sort((a, b) => b.viewedAt - a.viewedAt);
};

export const clearViewedListings = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[viewHistoryStorage] clear failed', error);
  }
};
