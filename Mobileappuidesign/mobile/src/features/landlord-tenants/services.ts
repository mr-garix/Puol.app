import { MOCK_LANDLORD_TENANTS, type LandlordTenant } from '@/src/data/mockLandlordTenants';
import { supabase } from '@/src/supabaseClient';

export const fetchLandlordTenants = async (landlordId: string): Promise<LandlordTenant[]> => {
  console.log('[fetchLandlordTenants] 🔵 Fetching tenants for landlord:', landlordId);

  try {
    if (!supabase) {
      console.error('[fetchLandlordTenants] ❌ Supabase not available');
      return [];
    }

    // Récupérer les contrats de location du landlord depuis rental_leases
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
      console.error('[fetchLandlordTenants] ❌ Error fetching leases from Supabase:', error);
      throw error;
    }

    // Si aucun contrat, retourner un tableau vide (pas de données moquées)
    if (!leases || leases.length === 0) {
      console.log('[fetchLandlordTenants] ℹ️ No leases found for landlord:', landlordId);
      return [];
    }

    console.log('[fetchLandlordTenants] ✅ Found leases:', leases.length);

    // Récupérer les profils des locataires et les annonces
    const tenantIds = leases.map((lease: any) => lease.tenant_profile_id).filter(Boolean);
    const listingIds = leases.map((lease: any) => lease.listing_id).filter(Boolean);

    console.log('[fetchLandlordTenants] 📋 Fetching tenant IDs:', tenantIds);
    console.log('[fetchLandlordTenants] 📋 Fetching listing IDs:', listingIds);

    const [{ data: tenantProfiles, error: tenantError }, { data: listings, error: listingError }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, avatar_url, phone').in('id', tenantIds),
      supabase.from('listings').select('id, title, cover_photo_url, address_text').in('id', listingIds),
    ]);

    if (tenantError) {
      console.error('[fetchLandlordTenants] ❌ Error fetching tenant profiles:', tenantError);
    }
    if (listingError) {
      console.error('[fetchLandlordTenants] ❌ Error fetching listings:', listingError);
    }

    console.log('[fetchLandlordTenants] ✅ Tenant profiles fetched:', tenantProfiles?.length);
    console.log('[fetchLandlordTenants] ✅ Listings fetched:', listings?.length);

    // Mapper les contrats de location au format LandlordTenant
    const tenants: LandlordTenant[] = leases.map((lease: any) => {
      const tenantProfile = tenantProfiles?.find((p: any) => p.id === lease.tenant_profile_id);
      const listing = listings?.find((l: any) => l.id === lease.listing_id);
      const monthlyRent = lease.rent_monthly || 0;
      const depositAmount = monthlyRent; // Caution = loyer mensuel

      console.log('[fetchLandlordTenants] 📝 Lease ID:', lease.id, 'Tenant:', tenantProfile?.first_name, 'Listing:', listing?.title);

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

    console.log('[fetchLandlordTenants] ✅ Total tenants mapped:', tenants.length);
    return tenants;
  } catch (err) {
    console.error('[fetchLandlordTenants] ❌ Exception:', err);
    // Retourner un tableau vide en cas d'erreur (pas de données moquées)
    return [];
  }
};

export const fetchLandlordTenantById = async (
  landlordId: string,
  tenantId: string,
): Promise<LandlordTenant | null> => {
  console.log('[fetchLandlordTenantById] 🔵 Fetching tenant:', tenantId, 'for landlord:', landlordId);

  try {
    if (!supabase) {
      console.error('[fetchLandlordTenantById] ❌ Supabase not available');
      return null;
    }

    // Récupérer le contrat de location
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
      .maybeSingle();

    if (error) {
      console.error('[fetchLandlordTenantById] ❌ Error fetching lease from Supabase:', error);
      return null;
    }

    if (!lease) {
      console.log('[fetchLandlordTenantById] ℹ️ No lease found for tenant:', tenantId);
      return null;
    }

    console.log('[fetchLandlordTenantById] ✅ Lease found:', lease.id);

    // Récupérer le profil du locataire et l'annonce
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

    console.log('[fetchLandlordTenantById] ✅ Tenant profile and listing fetched');

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
    console.error('[fetchLandlordTenantById] ❌ Exception:', err);
    // Retourner null en cas d'erreur (pas de données moquées)
    return null;
  }
};
