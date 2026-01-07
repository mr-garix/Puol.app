import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  landlordRequests as landlordRequestsMock,
  landlordSubtabs,
  type LandlordRequest,
  type ListingRecord,
} from '../UsersManagement';
import { VisitsBoard, type VisitRecord } from '../VisitsManagement';
import type { ListingFilters } from '../UsersManagement';
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
  fetchLandlordListingDetail,
  fetchLandlordApplications,
  fetchLandlordVisits,
  resolveSegment,
  type LandlordProfileData,
  type LandlordBoardListing,
  type LandlordListingDetail,
} from '@/lib/services/landlords';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { RefreshCw } from 'lucide-react';

const PRICE_PLACEHOLDER = 'Tarif non renseigné';
const NO_VALUE_PLACEHOLDER = '—';

type LandlordListingSummary = {
  id: string;
  title: string;
  city: string;
  status: 'en ligne' | 'en brouillon';
  price: string;
  type: string;
  updatedAt: string;
  previewUrl: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
};

type LandlordLease = {
  id: string;
  unit: string;
  tenant: string;
  startDate: string;
  duration: string;
  value: string;
  status: 'actif' | 'terminé' | 'en préparation';
};

type LandlordTimelineEvent = {
  id: string;
  date: string;
  label: string;
  detail: string;
  type: 'lease' | 'moderation' | 'payment';
};

type LandlordProfileDetail = {
  id: string;
  name: string;
  username: string;
  segment: 'premium' | 'core' | 'lite';
  city: string;
  leasesSigned: number;
  unitsManaged: number;
  tenantsTotal: number;
  revenueShare: number;
  lastActive: string;
  joinedAt: string;
  avatarUrl: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  tags: string[];
  stats: {
    views: number;
    likes: number;
    comments: number;
    visits: number;
  };
  leases: LandlordLease[];
  listings: LandlordListingSummary[];
  timeline: LandlordTimelineEvent[];
};


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

function mapBoardListingStatus(listing: LandlordBoardListing): ListingRecord['status'] {
  const normalized = listing.statusRaw?.toLowerCase().trim() ?? '';
  const includesAny = (keywords: string[]) => keywords.some((keyword) => normalized.includes(keyword));

  if (listing.isAvailable || includesAny(['online', 'publish', 'approuv', 'active', 'available', 'live'])) {
    return 'approved';
  }
  if (includesAny(['reject', 'refus', 'denied', 'declin'])) {
    return 'rejected';
  }
  if (includesAny(['suspend', 'pause', 'offline', 'disable', 'archiv'])) {
    return 'suspended';
  }
  if (includesAny(['draft', 'pending', 'brouillon', 'review', 'moderation', 'waiting', 'submitted'])) {
    return 'pending';
  }

  return 'pending';
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
): LandlordProfileDetail {
  const base = createBaseDetail(liveData);

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
  const [selectedListingDetail, setSelectedListingDetail] = useState<LandlordListingDetail | null>(null);
  const [isListingDetailLoading, setIsListingDetailLoading] = useState(false);
  const [listingDetailError, setListingDetailError] = useState<string | null>(null);
  const [liveLandlordListings, setLiveLandlordListings] = useState<LandlordBoardListing[]>([]);
  const [liveLandlordVisits, setLiveLandlordVisits] = useState<VisitRecord[]>([]);
  const [isVisitsLoading, setIsVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [landlordApplications, setLandlordApplications] = useState<LandlordRequest[]>(landlordRequestsMock);
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsState, setStatsState] = useState({
    isLoading: false,
    data: {
      activeLandlords: 0,
      landlordListings: liveLandlordListings.length,
      landlordVisits: liveLandlordVisits.length,
      pendingApplications: landlordRequestsMock.length,
    },
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    const loadApplications = async () => {
      setIsApplicationsLoading(true);
      setApplicationsError(null);

      try {
        const applications = await fetchLandlordApplications();
        if (!isMounted) {
          return;
        }

        setLandlordApplications(applications);
        setStatsState((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            pendingApplications: applications.length,
          },
        }));
      } catch (error) {
        console.warn('[LandlordsSection] Unable to fetch landlord applications', error);
        if (isMounted) {
          setApplicationsError('Impossible de charger les candidatures bailleurs.');
        }
      } finally {
        if (isMounted) {
          setIsApplicationsLoading(false);
        }
      }
    };

    loadApplications();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const handleRefresh = async () => {
    setIsRefreshing(true);

    setStatsState(prev => ({ ...prev, isLoading: true }));
    setIsApplicationsLoading(true);
    setApplicationsError(null);
    setIsVisitsLoading(true);
    setVisitsError(null);

    try {
      const [stats, applications, listings, visits] = await Promise.all([
        fetchLandlordStats(),
        fetchLandlordApplications(),
        fetchLandlordListingsLive(),
        fetchLandlordVisits(),
      ]);

      setStatsState({ isLoading: false, data: stats });
      setLandlordApplications(applications);
      setLiveLandlordListings(listings);
      setLiveLandlordVisits(visits);
    } catch (error) {
      console.warn('[LandlordsSection] handleRefresh failed', error);
    } finally {
      setIsApplicationsLoading(false);
      setIsVisitsLoading(false);
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeSubtab !== 'buyers' && selectedLandlordId) {
      setSelectedLandlordId(null);
      setSelectedLandlordDetail(null);
      setProfileError(null);
      setIsProfileLoading(false);
    }
    if (activeSubtab !== 'annonces' && selectedListingId) {
      setSelectedListingId(null);
      setSelectedListingDetail(null);
      setListingDetailError(null);
      setIsListingDetailLoading(false);
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
    setSelectedLandlordDetail(null);
    setProfileError(null);
    setIsProfileLoading(true);

    const loadProfile = async () => {
      try {
        const data = await fetchLandlordProfileData(selectedLandlordId);
        if (isCancelled) return;
        if (data) {
          const merged = mergeLandlordDetailData(data);
          
          // Récupérer l'adresse réelle depuis la table profiles
          if (isSupabaseConfigured && supabase) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('city')
              .eq('id', selectedLandlordId)
              .single();
            
            if (!profileError && profileData?.city) {
              merged.address = profileData.city;
            }
          }
          
          setSelectedLandlordDetail(merged);
          return;
        }

        setProfileError('Aucune donnée réelle disponible pour ce bailleur.');
      } catch (error) {
        console.warn('[LandlordsSection] Unable to fetch landlord profile', error);
        setProfileError('Impossible de charger les données Supabase pour ce bailleur.');
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
    if (!selectedListingId) {
      setSelectedListingDetail(null);
      setListingDetailError(null);
      setIsListingDetailLoading(false);
      return;
    }

    let isCancelled = false;

    setSelectedListingDetail(null);
    setListingDetailError(null);
    setIsListingDetailLoading(true);

    const loadListing = async () => {
      try {
        const detail = await fetchLandlordListingDetail(selectedListingId);
        console.log('[LandlordsSection] detail fetched', { listingId: selectedListingId, detail });
        if (isCancelled) return;
        if (detail) {
          setSelectedListingDetail(detail);
          return;
        }

        setListingDetailError('Aucune donnée réelle disponible pour cette annonce.');
      } catch (error) {
        console.warn('[LandlordsSection] fetchLandlordListingDetail failed', error);
        console.warn('[LandlordsSection] Unable to fetch landlord listing detail', error);
        setListingDetailError('Impossible de charger les données Supabase pour cette annonce.');
      } finally {
        if (!isCancelled) {
          setIsListingDetailLoading(false);
        }
      }
    };

    loadListing();

    return () => {
      isCancelled = true;
    };
  }, [selectedListingId]);

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

  useEffect(() => {
    let isMounted = true;
    const loadVisits = async () => {
      setIsVisitsLoading(true);
      setVisitsError(null);
      try {
        const visits = await fetchLandlordVisits();
        if (isMounted) {
          setLiveLandlordVisits(visits);
          // Mettre à jour les statistiques avec les vraies données
          setStatsState(prev => ({
            ...prev,
            data: {
              ...prev.data,
              landlordVisits: visits.length,
            }
          }));
        }
      } catch (error) {
        console.warn('[LandlordsSection] Unable to fetch landlord visits', error);
        if (isMounted) {
          setVisitsError('Impossible de charger les données de visites');
        }
      } finally {
        if (isMounted) {
          setIsVisitsLoading(false);
        }
      }
    };

    loadVisits();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleViewLandlordProfile = useCallback(
    (landlordId: string) => {
      if (!landlordId) {
        return;
      }
      setSelectedListingId(null);
      setSelectedListingDetail(null);
      setActiveSubtab('buyers');
      setSelectedLandlordId(landlordId);
    },
    [],
  );

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
          return (
            <div className="space-y-4">
              {(isListingDetailLoading || listingDetailError) && (
                <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                  <CardContent className="p-4 space-y-2">
                    {isListingDetailLoading && (
                      <p className="text-sm text-emerald-700">Chargement des données Supabase…</p>
                    )}
                    {listingDetailError && (
                      <p className="text-sm text-red-600">{listingDetailError}</p>
                    )}
                  </CardContent>
                </Card>
              )}
              {selectedListingDetail ? (
                <LandlordListingDetailView
                  listing={selectedListingDetail}
                  onBack={() => setSelectedListingId(null)}
                  onViewLandlordProfile={handleViewLandlordProfile}
                />
              ) : (
                <Card className="rounded-2xl border-gray-100">
                  <CardContent className="p-6 space-y-3 text-sm text-gray-600">
                    <p>Aucune donnée n’est disponible pour cette annonce pour le moment.</p>
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedListingId(null)}
                        className="text-emerald-700 hover:underline"
                      >
                        Retourner à la liste des annonces
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        }

        const listingsFromSupabase = liveLandlordListings.map((listing) => ({
          id: listing.id,
          title: listing.title,
          type: listing.propertyType || 'Bien',
          city: listing.city,
          district: listing.district || '—',
          price: listing.pricePerMonth ?? 0,
          priceType: 'mois' as const,
          status: mapBoardListingStatus(listing),
          owner: listing.hostName ?? 'Bailleur PUOL',
          ownerLabel: 'Bailleur',
          images: listing.imagesCount ?? 0,
          videos: listing.videosCount ?? 0,
          visits: listing.visitsCount ?? 0,
          createdAt: listing.createdAt ? formatIsoToShortDate(listing.createdAt) : '—',
          furnished: false,
          previewUrl: listing.coverPhotoUrl ?? null,
        }));

        const listingsToDisplay = listingsFromSupabase.length ? listingsFromSupabase : [];

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
          <div className="space-y-4">
            {(isApplicationsLoading || applicationsError) && (
              <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                <CardContent className="p-4 space-y-2">
                  {isApplicationsLoading && (
                    <p className="text-sm text-emerald-700">
                      Chargement des candidatures bailleurs...
                    </p>
                  )}
                  {applicationsError && (
                    <p className="text-sm text-red-600">{applicationsError}</p>
                  )}
                </CardContent>
              </Card>
            )}
            <LandlordRequestsBoard requests={landlordApplications} />
          </div>
        );
      case 'visits':
        return (
          <div className="space-y-4">
            {(isVisitsLoading || visitsError) && (
              <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                <CardContent className="p-4 space-y-2">
                  {isVisitsLoading && (
                    <p className="text-sm text-emerald-700">
                      Chargement des données de visites Supabase…
                    </p>
                  )}
                  {visitsError && (
                    <p className="text-sm text-red-600">{visitsError}</p>
                  )}
                </CardContent>
              </Card>
            )}
            {!isVisitsLoading && !visitsError && (
              <VisitsBoard
                visits={liveLandlordVisits}
                searchPlaceholder="Filtrer par bien, client ou ville..."
              />
            )}
          </div>
        );
      case 'messages':
        return <LandlordMessagesBoard />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Bailleurs</h1>
          <p className="text-gray-500 mt-1">
            Monitoring complet des bailleurs, de leurs annonces et opérations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">Dernière mise à jour : {formatTime(lastUpdate)}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
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


