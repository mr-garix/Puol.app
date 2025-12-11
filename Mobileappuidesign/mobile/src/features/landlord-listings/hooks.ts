import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  createLandlordListing,
  updateLandlordListing,
  getLandlordListingById,
  getLandlordListingsByProfileId,
  upsertListingRooms,
  updateListingFeatures,
  saveListingMedia,
  type LandlordMediaUploadItem,
  deleteLandlordListing,
  type CreateLandlordListingPayload,
  type LandlordListingWithRelations,
} from './services';

interface HookState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useCreateLandlordListing = () => {
  const { supabaseProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (payload: CreateLandlordListingPayload) => {
    if (!supabaseProfile?.id) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      return await createLandlordListing(supabaseProfile.id, payload);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [supabaseProfile?.id]);

  return { execute, isLoading, error };
};

export const useUpdateLandlordListing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async ({ id, payload }: { id: string; payload: CreateLandlordListingPayload }) => {
    setIsLoading(true);
    setError(null);

    try {
      return await updateLandlordListing(id, payload);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading, error };
};

export const useLandlordListing = (id: string | null): HookState<LandlordListingWithRelations> => {
  const [data, setData] = useState<LandlordListingWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getLandlordListingById(id);
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const state = useMemo<HookState<LandlordListingWithRelations>>(
    () => ({
      data,
      isLoading,
      error,
      refresh,
    }),
    [data, error, isLoading, refresh],
  );

  return state;
};

export const useLandlordListings = (): HookState<LandlordListingWithRelations[]> => {
  const { supabaseProfile } = useAuth();
  const [data, setData] = useState<LandlordListingWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!supabaseProfile?.id) {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getLandlordListingsByProfileId(supabaseProfile.id);
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseProfile?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const state = useMemo<HookState<LandlordListingWithRelations[]>>(
    () => ({
      data,
      isLoading,
      error,
      refresh,
    }),
    [data, error, isLoading, refresh],
  );

  return state;
};

export const useUpsertListingRooms = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async ({ listingId, rooms }: { listingId: string; rooms: any }) => {
    setIsLoading(true);
    setError(null);

    try {
      return await upsertListingRooms(listingId, rooms);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading, error };
};

export const useUpdateListingFeatures = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async ({ listingId, featureKeys }: { listingId: string; featureKeys: string[] }) => {
    setIsLoading(true);
    setError(null);

    try {
      return await updateListingFeatures(listingId, featureKeys);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading, error };
};

export const useDeleteLandlordListing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      return await deleteLandlordListing(id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading, error };
};

// Hook combiné pour créer une annonce complète avec toutes ses relations
export const useCreateLandlordListingWithRelations = () => {
  const createMutation = useCreateLandlordListing();
  const upsertRoomsMutation = useUpsertListingRooms();
  const updateFeaturesMutation = useUpdateListingFeatures();
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<Error | null>(null);

  const execute = useCallback(async ({
    listing,
    rooms,
    features,
    media,
    coverUri,
  }: {
    listing: CreateLandlordListingPayload;
    rooms: any;
    features: string[];
    media: LandlordMediaUploadItem[];
    coverUri?: string | null;
  }) => {
    try {
      // Créer l'annonce principale
      const newListing = await createMutation.execute(listing);

      // Ajouter les pièces
      if (rooms) {
        await upsertRoomsMutation.execute({
          listingId: newListing.id,
          rooms,
        });
      }

      // Ajouter les features
      if (features.length > 0) {
        await updateFeaturesMutation.execute({
          listingId: newListing.id,
          featureKeys: features,
        });
      }

      if (media.length > 0 || coverUri) {
        setIsSavingMedia(true);
        setMediaError(null);
        await saveListingMedia({
          listingId: newListing.id,
          media,
          coverUri: coverUri ?? listing.cover_photo_url ?? null,
          deleteExisting: true,
        });
      }

      return newListing;
    } catch (error) {
      if (error instanceof Error) {
        setMediaError(error);
      }
      throw error;
    } finally {
      setIsSavingMedia(false);
    }
  }, [createMutation.execute, upsertRoomsMutation.execute, updateFeaturesMutation.execute]);

  return {
    execute,
    isLoading: createMutation.isLoading || isSavingMedia,
    error: createMutation.error || mediaError,
  };
};

// Hook combiné pour mettre à jour une annonce complète
export const useUpdateLandlordListingWithRelations = () => {
  const updateMutation = useUpdateLandlordListing();
  const upsertRoomsMutation = useUpsertListingRooms();
  const updateFeaturesMutation = useUpdateListingFeatures();
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<Error | null>(null);

  const execute = useCallback(async ({
    id,
    listing,
    rooms,
    features,
    media,
    coverUri,
  }: {
    id: string;
    listing: CreateLandlordListingPayload;
    rooms: any;
    features: string[];
    media: LandlordMediaUploadItem[];
    coverUri?: string | null;
  }) => {
    try {
      // Mettre à jour l'annonce principale
      await updateMutation.execute({ id, payload: listing });

      // Mettre à jour les pièces
      if (rooms) {
        await upsertRoomsMutation.execute({
          listingId: id,
          rooms,
        });
      }

      // Mettre à jour les features
      await updateFeaturesMutation.execute({
        listingId: id,
        featureKeys: features,
      });

      setIsSavingMedia(true);
      setMediaError(null);
      await saveListingMedia({
        listingId: id,
        media,
        coverUri: coverUri ?? listing.cover_photo_url ?? null,
        deleteExisting: true,
      });

      return id;
    } catch (error) {
      if (error instanceof Error) {
        setMediaError(error);
      }
      throw error;
    } finally {
      setIsSavingMedia(false);
    }
  }, [updateMutation.execute, upsertRoomsMutation.execute, updateFeaturesMutation.execute]);

  return {
    execute,
    isLoading: updateMutation.isLoading || isSavingMedia,
    error: updateMutation.error || mediaError,
  };
};
