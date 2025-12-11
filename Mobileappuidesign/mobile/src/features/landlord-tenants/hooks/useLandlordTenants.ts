import { useAuth } from '@/src/contexts/AuthContext';
import { fetchLandlordTenants, fetchLandlordTenantById } from '@/src/features/landlord-tenants/services';
import type { LandlordTenant } from '@/src/data/mockLandlordTenants';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseLandlordTenantsResult {
  tenants: LandlordTenant[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getTenantById: (id: string) => LandlordTenant | undefined;
  fetchTenant: (id: string) => Promise<LandlordTenant | null>;
}

const DEFAULT_MOCK_LANDLORD_ID = 'landlord-demo';

export const useLandlordTenants = (): UseLandlordTenantsResult => {
  const { supabaseProfile } = useAuth();
  const landlordId = supabaseProfile?.id ?? null;
  const [tenants, setTenants] = useState<LandlordTenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedLandlordId, setResolvedLandlordId] = useState<string>(DEFAULT_MOCK_LANDLORD_ID);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const candidateIds = landlordId
        ? [landlordId, DEFAULT_MOCK_LANDLORD_ID]
        : [DEFAULT_MOCK_LANDLORD_ID];

      let fetched: LandlordTenant[] = [];
      let sourceId = candidateIds[candidateIds.length - 1];

      for (const candidate of candidateIds) {
        const data = await fetchLandlordTenants(candidate);
        if (data.length > 0) {
          fetched = data;
          sourceId = candidate;
          break;
        }
        if (fetched.length === 0) {
          fetched = data;
          sourceId = candidate;
        }
      }

      setTenants(fetched);
      setResolvedLandlordId(sourceId);
      setError(null);
    } catch (err) {
      console.error('[useLandlordTenants] Failed to fetch tenants', err);
      setError('unable_to_load_landlord_tenants');
    } finally {
      setIsLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getTenantById = useCallback(
    (id: string) => tenants.find((tenant) => tenant.id === id),
    [tenants],
  );

  const fetchTenant = useCallback(
    async (id: string) => {
      try {
        const candidateIds = resolvedLandlordId === DEFAULT_MOCK_LANDLORD_ID
          ? [resolvedLandlordId]
          : [resolvedLandlordId, DEFAULT_MOCK_LANDLORD_ID];

        for (const candidate of candidateIds) {
          const tenant = await fetchLandlordTenantById(candidate, id);
          if (!tenant) {
            continue;
          }

          setTenants((prev) => {
            const exists = prev.findIndex((item) => item.id === tenant.id);
            if (exists >= 0) {
              const copy = [...prev];
              copy[exists] = tenant;
              return copy;
            }
            return [tenant, ...prev];
          });

          setResolvedLandlordId(candidate);
          return tenant;
        }

        return null;
      } catch (err) {
        console.error('[useLandlordTenants] Failed to fetch tenant', err);
        return null;
      }
    },
    [resolvedLandlordId],
  );

  return useMemo(
    () => ({ tenants, isLoading, error, refresh, getTenantById, fetchTenant }),
    [tenants, isLoading, error, refresh, getTenantById, fetchTenant],
  );
};
