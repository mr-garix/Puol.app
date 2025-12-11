import { MOCK_LANDLORD_TENANTS, type LandlordTenant } from '@/src/data/mockLandlordTenants';

export const fetchLandlordTenants = async (landlordId: string): Promise<LandlordTenant[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return MOCK_LANDLORD_TENANTS.filter((tenant) => tenant.hostId === landlordId);
};

export const fetchLandlordTenantById = async (
  landlordId: string,
  tenantId: string,
): Promise<LandlordTenant | null> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const tenant = MOCK_LANDLORD_TENANTS.find(
    (item) => item.hostId === landlordId && item.id === tenantId,
  );
  return tenant ?? null;
};
