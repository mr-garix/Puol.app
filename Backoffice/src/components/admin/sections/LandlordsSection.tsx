import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  landlordListings,
  landlordRequests,
  landlordVisits,
  landlordSubtabs,
  landlordProfileDetails,
  landlordListingDetails,
  landlordProfiles,
  type ListingRecord,
  type LandlordProfileDetail,
} from '../UsersManagement';
import type { ListingFilters } from '../UsersManagement';
import { VisitsBoard } from '../VisitsManagement';
import { LandlordBuyersBoard } from './shared/LandlordBuyersBoard';
import { LandlordProfileView } from './shared/LandlordProfileView';
import { ListingsBoard } from './shared/ListingsBoard';
import { LandlordListingDetailView } from './shared/LandlordListingDetailView';
import { LandlordRequestsBoard } from './shared/LandlordRequestsBoard';
import { LandlordMessagesBoard } from './shared/LandlordMessagesBoard';
import {
  fetchLandlordStats,
  fetchLandlordProfileData,
  fetchLandlordListingsLive,
  resolveSegment,
  type LandlordProfileData,
  type LandlordBoardListing,
} from '@/lib/services/landlords';

const PRICE_PLACEHOLDER = 'Tarif non renseigné';
const NO_VALUE_PLACEHOLDER = '—';

function cloneLandlordDetail(detail: LandlordProfileDetail): LandlordProfileDetail {
  return {
    ...detail,
    tags: [...detail.tags],
    stats: { ...detail.stats },
    leases: detail.leases.map((lease) => ({ ...lease })),
    listings: detail.listings.map((listing) => ({ ...listing })),
    timeline: detail.timeline.map((event) => ({ ...event })),
  };
}

function getFallbackLandlordDetail(landlordId: string): LandlordProfileDetail | null {
  const direct = landlordProfileDetails[landlordId];
  if (direct) {
    return cloneLandlordDetail(direct);
  }

  const [firstEntry] = Object.values(landlordProfileDetails);
  if (!firstEntry) {
    return null;
  }

  const detail = cloneLandlordDetail(firstEntry);
  detail.id = landlordId;
  return detail;
}

function buildFullName(liveData: LandlordProfileData): string | null {
  const parts = [liveData.firstName, liveData.lastName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (!parts.length) {
    return null;
  }

  return parts.join(' ');
}

function formatMonthlyPrice(value: number | null): string {
  if (value == null) {
    return PRICE_PLACEHOLDER;
  }
  return `${value.toLocaleString('fr-FR')} FCFA/mois`;
}

function resolveListingStatus(liveListing: LandlordProfileData['listings'][number]): 'en ligne' | 'en brouillon' {
  if (liveListing.isAvailable) {
    return 'en ligne';
  }

  const normalized = liveListing.status?.toLowerCase().trim();
  if (normalized && ['online', 'published', 'en ligne', 'active', 'actif'].some(keyword => normalized.includes(keyword))) {
    return 'en ligne';
  }

  return 'en brouillon';
}

function formatIsoToShortDate(iso: string | null): string {
  if (!iso) {
    return NO_VALUE_PLACEHOLDER;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return NO_VALUE_PLACEHOLDER;
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getYearFromIso(iso: string | null): string {
  if (!iso) {
    return NO_VALUE_PLACEHOLDER;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return NO_VALUE_PLACEHOLDER;
  }

  return date.getFullYear().toString();
}

function createBaseDetail(liveData: LandlordProfileData): LandlordProfileDetail {
  const fullName = buildFullName(liveData);

  return {
    id: liveData.id,
    name: fullName ?? 'Bailleur PUOL',
    username: liveData.username ?? `@${liveData.id}`,
    segment: resolveSegment(liveData.landlordStatus),
    city: liveData.city ?? 'Ville inconnue',
    leasesSigned: 0,
    unitsManaged: liveData.listings.length,
    tenantsTotal: 0,
    revenueShare: 0,
    lastActive: NO_VALUE_PLACEHOLDER,
    joinedAt: getYearFromIso(liveData.createdAt),
    avatarUrl: liveData.avatarUrl ?? '',
    email: NO_VALUE_PLACEHOLDER,
    phone: liveData.phone ?? NO_VALUE_PLACEHOLDER,
    address: NO_VALUE_PLACEHOLDER,
    notes: '',
    tags: [],
    stats: {
      views: 0,
      likes: 0,
      comments: 0,
      visits: 0,
    },
    leases: [],
    listings: [],
    timeline: [],
  };
}

function mergeListings(
  liveData: LandlordProfileData,
  currentListings: LandlordProfileDetail['listings'],
  defaultCity: string,
): LandlordProfileDetail['listings'] {
  const currentMap = new Map(currentListings.map((listing) => [listing.id, listing]));

  if (liveData.listings.length > 0) {
    return liveData.listings.map((liveListing) => {
      const existing = currentMap.get(liveListing.id);
      const status = resolveListingStatus(liveListing);

      const formattedDate = formatIsoToShortDate(liveListing.updatedAt);

      return {
        id: liveListing.id,
        title: liveListing.title || existing?.title || 'Annonce PUOL',
        city: liveListing.city || existing?.city || defaultCity,
        status,
        price:
          liveListing.pricePerMonth != null
            ? formatMonthlyPrice(liveListing.pricePerMonth)
            : existing?.price ?? PRICE_PLACEHOLDER,
        type: existing?.type ?? liveListing.propertyType ?? 'Bien',
        updatedAt: formattedDate !== NO_VALUE_PLACEHOLDER ? formattedDate : existing?.updatedAt ?? NO_VALUE_PLACEHOLDER,
        previewUrl: liveListing.coverPhotoUrl ?? existing?.previewUrl ?? '',
        viewCount: liveListing.viewCount ?? existing?.viewCount,
        likeCount: liveListing.likeCount ?? existing?.likeCount,
        commentCount: liveListing.commentCount ?? existing?.commentCount,
      };
    });
  }

  return currentListings.map((listing) => ({ ...listing }));
}

function mergeLandlordDetailData(
  liveData: LandlordProfileData,
  fallback?: LandlordProfileDetail | null,
): LandlordProfileDetail {
  const base = fallback ? cloneLandlordDetail(fallback) : createBaseDetail(liveData);

  const fullName = buildFullName(liveData);
  if (fullName) {
    base.name = fullName;
  }

  if (liveData.username) {
    base.username = liveData.username;
  }

  if (liveData.landlordStatus) {
    base.segment = resolveSegment(liveData.landlordStatus);
  }

  if (liveData.city) {
    base.city = liveData.city;
  }

  if (liveData.phone) {
    base.phone = liveData.phone;
  }

  if (liveData.avatarUrl) {
    base.avatarUrl = liveData.avatarUrl;
  }

  const joinedAt = getYearFromIso(liveData.createdAt);
  if (joinedAt !== NO_VALUE_PLACEHOLDER) {
    base.joinedAt = joinedAt;
  }

  base.listings = mergeListings(liveData, base.listings, base.city);
  const metrics = liveData.metrics;
  const listingsTotal = metrics?.listingsTotal ?? base.listings.length;
  base.unitsManaged = listingsTotal;
  base.leasesSigned = Math.max(base.leasesSigned, listingsTotal);

  if (metrics) {
    base.stats = {
      ...base.stats,
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      visits: metrics.visits,
    };
  }

  return base;
}

export function LandlordsSection() {
  const [activeSubtab, setActiveSubtab] = useState(landlordSubtabs[0]?.id ?? 'annonces');
  const [listingFilters, setListingFilters] = useState<ListingFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });
  const [selectedLandlordId, setSelectedLandlordId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedLandlordDetail, setSelectedLandlordDetail] = useState<LandlordProfileDetail | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [liveLandlordListings, setLiveLandlordListings] = useState<LandlordBoardListing[]>([]);
  const [statsState, setStatsState] = useState({
    isLoading: false,
    data: {
      activeLandlords: landlordProfiles.length,
      landlordListings: landlordListings.length,
      landlordVisits: landlordVisits.length,
      pendingApplications: landlordRequests.length,
    },
  });

  useEffect(() => {
    if (activeSubtab !== 'buyers' && selectedLandlordId) {
      setSelectedLandlordId(null);
      setSelectedLandlordDetail(null);
      setProfileError(null);
      setIsProfileLoading(false);
    }
    if (activeSubtab !== 'annonces' && selectedListingId) {
      setSelectedListingId(null);
    }
  }, [activeSubtab, selectedLandlordId, selectedListingId]);

  useEffect(() => {
    if (!selectedLandlordId) {
      setSelectedLandlordDetail(null);
      setProfileError(null);
      setIsProfileLoading(false);
      return;
    }

    let isCancelled = false;
    const fallbackDetail = getFallbackLandlordDetail(selectedLandlordId);
    if (fallbackDetail) {
      setSelectedLandlordDetail(fallbackDetail);
    } else {
      setSelectedLandlordDetail(null);
    }

    setProfileError(null);
    setIsProfileLoading(true);

    const loadProfile = async () => {
      try {
        const data = await fetchLandlordProfileData(selectedLandlordId);
        if (isCancelled) return;
        if (data) {
          const merged = mergeLandlordDetailData(data, fallbackDetail);
          setSelectedLandlordDetail(merged);
          return;
        }

        if (!fallbackDetail) {
          setProfileError('Aucune donnée réelle disponible pour ce bailleur.');
        }
      } catch (error) {
        console.warn('[LandlordsSection] Unable to fetch landlord profile', error);
        if (!fallbackDetail) {
          setProfileError('Impossible de charger les données Supabase pour ce bailleur.');
        }
      } finally {
        if (!isCancelled) {
          setIsProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [selectedLandlordId]);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      setStatsState(prev => ({ ...prev, isLoading: true }));
      try {
        const stats = await fetchLandlordStats();
        if (isMounted) {
          setStatsState({ isLoading: false, data: stats });
        }
      } catch (error) {
        console.warn('[LandlordsSection] Unable to fetch landlord stats', error);
        if (isMounted) {
          setStatsState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadListings = async () => {
      try {
        const listings = await fetchLandlordListingsLive();
        if (isMounted && listings.length) {
          setLiveLandlordListings(listings);
        }
      } catch (error) {
        console.warn('[LandlordsSection] Unable to fetch landlord live listings', error);
      }
    };

    loadListings();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: 'Bailleurs actifs', value: statsState.data.activeLandlords },
      { label: 'Annonces bailleurs', value: statsState.data.landlordListings },
      { label: 'Visites bailleurs', value: statsState.data.landlordVisits },
      { label: 'Demandes en cours', value: statsState.data.pendingApplications },
    ],
    [statsState.data],
  );

  const renderSubtab = (tab: string) => {
    switch (tab) {
      case 'buyers': {
        if (selectedLandlordId) {
          return (
            <div className="space-y-4">
              {(isProfileLoading || profileError) && (
                <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                  <CardContent className="p-4 space-y-2">
                    {isProfileLoading && (
                      <p className="text-sm text-emerald-700">
                        Chargement des données Supabase…
                      </p>
                    )}
                    {profileError && (
                      <p className="text-sm text-red-600">{profileError}</p>
                    )}
                  </CardContent>
                </Card>
              )}
              {selectedLandlordDetail ? (
                <LandlordProfileView
                  landlord={selectedLandlordDetail}
                  onBack={() => setSelectedLandlordId(null)}
                />
              ) : (
                <Card className="rounded-2xl border-gray-100">
                  <CardContent className="p-6 space-y-3 text-sm text-gray-600">
                    <p>
                      Aucune donnée n’est disponible pour ce bailleur pour le moment.
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedLandlordId(null)}
                        className="text-emerald-700 hover:underline"
                      >
                        Retourner à la liste des bailleurs
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        }
        return <LandlordBuyersBoard onViewProfile={setSelectedLandlordId} />;
      }
      case 'annonces':
        if (selectedListingId) {
          const detail = landlordListingDetails[selectedListingId];
          if (detail) {
            return (
              <LandlordListingDetailView
                listing={detail}
                onBack={() => setSelectedListingId(null)}
              />
            );
          }
        }

        const listingsFromSupabase = liveLandlordListings.map((listing) => ({
          id: listing.id,
          title: listing.title,
          type: listing.propertyType || 'Bien',
          city: listing.city,
          district: listing.district || '—',
          price: listing.pricePerMonth ?? 0,
          priceType: 'mois' as const,
          status: 'approved' as const,
          owner: listing.hostName ?? 'Bailleur PUOL',
          ownerLabel: 'Bailleur',
          images: listing.imagesCount ?? 0,
          videos: listing.videosCount ?? 0,
          visits: listing.visitsCount ?? 0,
          createdAt: listing.createdAt ? formatIsoToShortDate(listing.createdAt) : '—',
          furnished: false,
          previewUrl: listing.coverPhotoUrl ?? null,
        }));

        const listingsFallback = landlordListings.map((listing) => ({
          ...listing,
          status: 'approved' as const,
          priceType: listing.priceType,
          visits: listing.visits ?? 0,
          previewUrl: (landlordListingDetails[listing.id]?.coverUrl ?? null) || (landlordListingDetails[listing.id]?.gallery?.[0] ?? null) || null,
        } satisfies ListingRecord));

        const listingsToDisplay = listingsFromSupabase.length ? listingsFromSupabase : listingsFallback;

        return (
          <ListingsBoard
            listings={listingsToDisplay}
            filters={listingFilters}
            onFilterChange={(patch) =>
              setListingFilters((prev) => ({ ...prev, ...patch }))
            }
            title="Annonces Bailleurs"
            description="Vue détaillée des annonces publiées par les bailleurs"
            ownerLabel="Bailleur"
            hideHeader
            onViewListing={setSelectedListingId}
          />
        );
      case 'requests':
        return (
          <LandlordRequestsBoard requests={landlordRequests} />
        );
      case 'visits':
        return (
          <VisitsBoard
            visits={landlordVisits}
            feeLabel="Frais bailleurs"
            searchPlaceholder="Filtrer par bien, client ou ville..."
          />
        );
      case 'messages':
        return <LandlordMessagesBoard />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Bailleurs</h1>
        <p className="text-gray-500 mt-1">
          Monitoring complet des bailleurs, de leurs annonces et opérations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5 space-y-2">
              <p className="text-sm text-gray-500 uppercase">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsState.isLoading ? (
                  <span className="inline-block w-16 h-5 rounded bg-gray-200 animate-pulse" />
                ) : (
                  stat.value.toLocaleString('fr-FR')
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeSubtab} onValueChange={setActiveSubtab}>
        <TabsList className="bg-gray-100 p-1 rounded-xl flex flex-wrap">
          {landlordSubtabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-lg data-[state=active]:bg-white flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {landlordSubtabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4 space-y-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">{tab.label}</p>
              <p className="text-sm text-gray-500">{tab.description}</p>
            </div>
            {renderSubtab(tab.id)}
          </TabsContent>
        ))}
      </Tabs>

    </div>
  );
}


