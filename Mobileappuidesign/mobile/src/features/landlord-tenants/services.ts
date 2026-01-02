import { MOCK_LANDLORD_TENANTS, type LandlordTenant } from '@/src/data/mockLandlordTenants';
import { supabase } from '@/src/supabaseClient';

export const fetchLandlordTenants = async (landlordId: string): Promise<LandlordTenant[]> => {
  try {
    if (!supabase) {
      console.warn('[fetchLandlordTenants] Supabase not available, using mock data');
      return MOCK_LANDLORD_TENANTS.filter((tenant) => tenant.hostId === landlordId);
    }

    const { data: leases, error } = await supabase
      .from('rental_leases')
      .select(`
        id,
        listing_id,
        tenant_profile_id,
        owner_profile_id,
        start_date,
        end_date,
        rent_monthly,
        platform_fee_total,
        months_count,
        total_rent,
        currency,
        status
      `)
      .eq('owner_profile_id', landlordId);

    if (error) {
      console.warn('[fetchLandlordTenants] Error fetching from Supabase:', error);
      return MOCK_LANDLORD_TENANTS.filter((tenant) => tenant.hostId === landlordId);
    }

    if (!leases || leases.length === 0) {
      return MOCK_LANDLORD_TENANTS.filter((tenant) => tenant.hostId === landlordId);
    }

    // Fetch tenant profiles and listings to get additional info
    const tenantIds = leases.map((lease: any) => lease.tenant_profile_id).filter(Boolean);
    const listingIds = leases.map((lease: any) => lease.listing_id).filter(Boolean);

    console.log('[fetchLandlordTenants] Fetching tenant IDs:', tenantIds);
    console.log('[fetchLandlordTenants] Fetching listing IDs:', listingIds);

    const [{ data: tenantProfiles, error: tenantError }, { data: listings, error: listingError }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, avatar_url, phone').in('id', tenantIds),
      supabase.from('listings').select('id, title, cover_photo_url, address_text').in('id', listingIds),
    ]);

    if (tenantError) {
      console.warn('[fetchLandlordTenants] Error fetching tenant profiles:', tenantError);
    }
    if (listingError) {
      console.warn('[fetchLandlordTenants] Error fetching listings:', listingError);
    }

    console.log('[fetchLandlordTenants] Tenant profiles fetched:', tenantProfiles?.length);
    console.log('[fetchLandlordTenants] Listings fetched:', listings?.length);

    // Map rental_leases to LandlordTenant format
    const tenants: LandlordTenant[] = leases.map((lease: any) => {
      const tenantProfile = tenantProfiles?.find((p: any) => p.id === lease.tenant_profile_id);
      const listing = listings?.find((l: any) => l.id === lease.listing_id);
      const monthlyRent = lease.rent_monthly || 0;
      const depositAmount = monthlyRent; // Caution = loyer mensuel

      console.log('[fetchLandlordTenants] Lease ID:', lease.id, 'Tenant:', tenantProfile?.first_name, 'Listing:', listing?.title);

      return {
        id: lease.id,
        hostId: lease.owner_profile_id,
        tenantName: tenantProfile
          ? `${tenantProfile.first_name || ''} ${tenantProfile.last_name || ''}`.trim()
          : 'Locataire',
        tenantUsername: null,
        tenantAvatar: tenantProfile?.avatar_url || null,
        tenantPhone: tenantProfile?.phone || null,
        tenantEmail: null,
        propertyTitle: listing?.title || 'Bien',
        propertyAddress: listing?.address_text || '—',
        propertyImage: listing?.cover_photo_url || null,
        leaseStart: lease.start_date,
        leaseEnd: lease.end_date,
        leaseMonths: lease.months_count || 0,
        monthlyRent,
        depositAmount,
        notes: null,
      };
    });

    console.log('[fetchLandlordTenants] Total tenants mapped:', tenants.length);
    return tenants;
  } catch (err) {
    console.error('[fetchLandlordTenants] Exception:', err);
    return MOCK_LANDLORD_TENANTS.filter((tenant) => tenant.hostId === landlordId);
  }
};

export const fetchLandlordTenantById = async (
  landlordId: string,
  tenantId: string,
): Promise<LandlordTenant | null> => {
  try {
    if (!supabase) {
      console.warn('[fetchLandlordTenantById] Supabase not available, using mock data');
      const tenant = MOCK_LANDLORD_TENANTS.find(
        (item) => item.hostId === landlordId && item.id === tenantId,
      );
      return tenant ?? null;
    }

    const { data: lease, error } = await supabase
      .from('rental_leases')
      .select(`
        id,
        listing_id,
        tenant_profile_id,
        owner_profile_id,
        start_date,
        end_date,
        rent_monthly,
        platform_fee_total,
        months_count,
        total_rent,
        currency,
        status
      `)
      .eq('id', tenantId)
      .eq('owner_profile_id', landlordId)
      .single();

    if (error || !lease) {
      console.warn('[fetchLandlordTenantById] Error fetching from Supabase:', error);
      const mockTenant = MOCK_LANDLORD_TENANTS.find(
        (item) => item.hostId === landlordId && item.id === tenantId,
      );
      return mockTenant ?? null;
    }

    // Fetch tenant profile and listing
    const [{ data: tenantProfile }, { data: listing }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, phone')
        .eq('id', lease.tenant_profile_id)
        .single(),
      supabase
        .from('listings')
        .select('id, title, cover_photo_url, address_text')
        .eq('id', lease.listing_id)
        .single(),
    ]);

    const monthlyRent = lease.rent_monthly || 0;
    const depositAmount = monthlyRent; // Caution = loyer mensuel

    return {
      id: lease.id,
      hostId: lease.owner_profile_id,
      tenantName: tenantProfile
        ? `${tenantProfile.first_name || ''} ${tenantProfile.last_name || ''}`.trim()
        : 'Locataire',
      tenantUsername: null,
      tenantAvatar: tenantProfile?.avatar_url || null,
      tenantPhone: tenantProfile?.phone || null,
      tenantEmail: null,
      propertyTitle: listing?.title || 'Bien',
      propertyAddress: listing?.address_text || '—',
      propertyImage: listing?.cover_photo_url || null,
      leaseStart: lease.start_date,
      leaseEnd: lease.end_date,
      leaseMonths: lease.months_count || 0,
      monthlyRent,
      depositAmount,
      notes: null,
    };
  } catch (err) {
    console.error('[fetchLandlordTenantById] Exception:', err);
    const mockTenant = MOCK_LANDLORD_TENANTS.find(
      (item) => item.hostId === landlordId && item.id === tenantId,
    );
    return mockTenant ?? null;
  }
};
