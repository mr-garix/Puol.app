import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { hostSubtabs } from '../UsersManagement';
import type {
  ListingFilters,
  ListingRecord,
  HostProfileDetail,
  HostListingDetail,
  HostRequest,
  HostProfile,
} from '../UsersManagement';
import { VisitsBoard, type VisitRecord } from '../VisitsManagement';
import { HostReservationsBoard } from './shared/HostReservationsBoard';
import { HostPartnersBoard } from './shared/HostPartnersBoard';
import { ListingsBoard } from './shared/ListingsBoard';
import { HostProfileView } from './shared/HostProfileView';
import { HostListingDetailView } from './shared/HostListingDetailView';
import { HostMessagesBoard } from './shared/HostMessagesBoard';
import { HostRequestsBoard } from './shared/HostRequestsBoard';
import {
  fetchHostApplications,
  fetchHostProfiles,
  fetchHostListingsLive,
  fetchHostListingDetail,
  fetchHostProfileDetail,
  fetchHostStats,
  fetchHostVisits,
  type HostBoardListing,
} from '@/lib/services/hosts';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { RefreshCw } from 'lucide-react';

const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

function formatIsoToShortDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString('fr-FR', SHORT_DATE_FORMAT);
}

function mapHostListingStatus(listing: HostBoardListing): ListingRecord['status'] {
  const normalizedStatus = normalizeHostStatus(listing.statusRaw);
  if (normalizedStatus === 'online') {
    return 'approved';
  }
  if (normalizedStatus === 'draft') {
    return 'pending';
  }

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

  return 'pending';
}

function mapHostBoardListingToRecord(listing: HostBoardListing): ListingRecord {
  const hasNightPrice = listing.pricePerNight != null;
  const price = hasNightPrice ? listing.pricePerNight ?? 0 : listing.pricePerMonth ?? 0;
  const priceType: ListingRecord['priceType'] = hasNightPrice ? 'jour' : 'mois';

  return {
    id: listing.id,
    title: listing.title,
    type: listing.propertyType,
    city: listing.city,
    district: listing.district,
    price,
    priceType,
    status: mapHostListingStatus(listing),
    statusLabel: mapHostStatusLabel(listing),
    owner: listing.hostName,
    ownerLabel: 'Hôte',
    images: listing.imagesCount,
    videos: listing.videosCount,
    createdAt: formatIsoToShortDate(listing.createdAt),
    furnished: listing.isFurnished ?? undefined,
    visits: listing.visitsCount,
    previewUrl: listing.coverPhotoUrl,
  } satisfies ListingRecord;
}

function normalizeHostStatus(raw?: string | null): 'online' | 'draft' | 'other' {
  const normalized = raw?.toLowerCase().trim() ?? '';
  if (!normalized) return 'other';

  const onlineKeywords = ['online', 'en ligne', 'active', 'actif', 'published', 'publiée', 'available', 'live', 'approuv'];
  const draftKeywords = ['draft', 'brouillon', 'pending', 'en attente', 'review', 'moderation'];

  if (onlineKeywords.some((k) => normalized.includes(k))) return 'online';
  if (draftKeywords.some((k) => normalized.includes(k))) return 'draft';
  return 'other';
}

function mapHostStatusLabel(listing: HostBoardListing): string | undefined {
  const normalized = normalizeHostStatus(listing.statusRaw);
  if (normalized === 'online') return 'En ligne';
  if (normalized === 'draft') return 'Brouillon';

  const statusMap: Record<ListingRecord['status'], string> = {
    approved: 'En ligne',
    pending: 'En attente',
    rejected: 'Refusée',
    suspended: 'Suspendue',
  };
  return statusMap[mapHostListingStatus(listing)];
}

export function HostsSection() {
  const [activeSubtab, setActiveSubtab] = useState(hostSubtabs[0]?.id ?? 'annonces');
  const [listingFilters, setListingFilters] = useState<ListingFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedListingDetail, setSelectedListingDetail] = useState<HostListingDetail | null>(null);
  const [isListingDetailLoading, setIsListingDetailLoading] = useState(false);
  const [listingDetailError, setListingDetailError] = useState<string | null>(null);
  const [listingDetailCache, setListingDetailCache] = useState<Record<string, HostListingDetail>>({});
  const [hostApplications, setHostApplications] = useState<HostRequest[]>([]);
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [liveHostListings, setLiveHostListings] = useState<HostBoardListing[]>([]);
  const [isListingsLoading, setIsListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [liveHostVisits, setLiveHostVisits] = useState<VisitRecord[]>([]);
  const [isVisitsLoading, setIsVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [liveHostProfiles, setLiveHostProfiles] = useState<HostProfile[]>([]);
  const [isProfilesLoading, setIsProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [selectedHostDetail, setSelectedHostDetail] = useState<HostProfileDetail | null>(null);
  const [isHostProfileLoading, setIsHostProfileLoading] = useState(false);
  const [hostProfileError, setHostProfileError] = useState<string | null>(null);
  const [statsState, setStatsState] = useState({
    isLoading: false,
    data: {
      activeHosts: 0,
      hostListings: 0,
      hostVisits: 0,
      pendingApplications: 0,
    },
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const liveListingsForBoard = useMemo(() => {
    return liveHostListings.map(mapHostBoardListingToRecord);
  }, [liveHostListings]);

  useEffect(() => {
    if (activeSubtab !== 'hosts' && selectedHostId) {
      setSelectedHostId(null);
      setSelectedHostDetail(null);
      setHostProfileError(null);
      setIsHostProfileLoading(false);
    }
    if (activeSubtab !== 'annonces' && selectedListingId) {
      setSelectedListingId(null);
    }
  }, [activeSubtab, selectedHostId, selectedListingId]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    const loadStats = async () => {
      setStatsState((prev) => ({ ...prev, isLoading: true }));
      try {
        const stats = await fetchHostStats();
        if (!isMounted) {
          return;
        }
        setStatsState({ isLoading: false, data: stats });
      } catch (error) {
        console.warn('[HostsSection] Unable to fetch host stats', error);
        if (isMounted) {
          setStatsState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    const loadProfiles = async () => {
      setIsProfilesLoading(true);
      setProfilesError(null);
      try {
        const profiles = await fetchHostProfiles();
        if (!isMounted) {
          return;
        }
        if (profiles.length) {
          setLiveHostProfiles(profiles);
        }
        setStatsState((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            activeHosts: profiles.length || prev.data.activeHosts,
          },
        }));
      } catch (error) {
        console.warn('[HostsSection] Unable to fetch host profiles', error);
        if (isMounted) {
          setProfilesError('Impossible de charger les hôtes.');
        }
      } finally {
        if (isMounted) {
          setIsProfilesLoading(false);
        }
      }
    };

    loadProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    const loadApplications = async () => {
      setIsApplicationsLoading(true);
      setApplicationsError(null);
      try {
        const applications = await fetchHostApplications();
        if (!isMounted) {
          return;
        }
        setHostApplications(applications);
        setStatsState((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            pendingApplications: applications.length,
          },
        }));
      } catch (error) {
        console.warn('[HostsSection] Unable to fetch host applications', error);
        if (isMounted) {
          setApplicationsError('Impossible de charger les candidatures hôtes.');
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

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    const loadListings = async () => {
      setIsListingsLoading(true);
      setListingsError(null);
      try {
        const listings = await fetchHostListingsLive();
        if (!isMounted) {
          return;
        }
        setLiveHostListings(listings);
        setStatsState((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            hostListings: listings.length,
          },
        }));
      } catch (error) {
        console.warn('[HostsSection] Unable to fetch host listings', error);
        if (isMounted) {
          setListingsError('Impossible de charger les annonces hôtes.');
        }
      } finally {
        if (isMounted) {
          setIsListingsLoading(false);
        }
      }
    };

    loadListings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    const loadVisits = async () => {
      setIsVisitsLoading(true);
      setVisitsError(null);
      try {
        const visits = await fetchHostVisits();
        if (!isMounted) {
          return;
        }
        if (visits.length) {
          setLiveHostVisits(visits);
        }
        setStatsState((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            hostVisits: visits.length,
          },
        }));
      } catch (error) {
        console.warn('[HostsSection] Unable to fetch host visits', error);
        if (isMounted) {
          setVisitsError('Impossible de charger les visites hôtes.');
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

  const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setStatsState(prev => ({ ...prev, isLoading: true }));
    setIsApplicationsLoading(true);
    setApplicationsError(null);
    setIsListingsLoading(true);
    setListingsError(null);
    setIsVisitsLoading(true);
    setVisitsError(null);
    setIsProfilesLoading(true);
    setProfilesError(null);

    try {
      const [stats, applications, listings, visits, profiles] = await Promise.all([
        fetchHostStats(),
        fetchHostApplications(),
        fetchHostListingsLive(),
        fetchHostVisits(),
        fetchHostProfiles(),
      ]);

      setStatsState({ isLoading: false, data: stats });
      setHostApplications(applications);
      setLiveHostListings(listings);
      setLiveHostVisits(visits);
      setLiveHostProfiles(profiles);
    } catch (error) {
      console.warn('[HostsSection] handleRefresh failed', error);
    } finally {
      setIsApplicationsLoading(false);
      setIsListingsLoading(false);
      setIsVisitsLoading(false);
      setIsProfilesLoading(false);
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!selectedHostId) {
      setSelectedHostDetail(null);
      setHostProfileError(null);
      setIsHostProfileLoading(false);
      return;
    }

    let isCancelled = false;
    setSelectedHostDetail(null);

    setHostProfileError(null);
    setIsHostProfileLoading(true);

    const loadProfile = async () => {
      try {
        const detail = await fetchHostProfileDetail(selectedHostId);
        if (isCancelled) return;

        if (detail) {
          setSelectedHostDetail(detail);
          return;
        }

        setHostProfileError('Aucune donnée réelle disponible pour cet hôte.');
      } catch (error) {
        console.warn('[HostsSection] Unable to fetch host profile', error);
        setHostProfileError('Impossible de charger les données Supabase pour cet hôte.');
      } finally {
        if (!isCancelled) {
          setIsHostProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [selectedHostId]);

  useEffect(() => {
    if (!selectedListingId) {
      setSelectedListingDetail(null);
      setListingDetailError(null);
      setIsListingDetailLoading(false);
      return;
    }

    let isCancelled = false;
    const cached = listingDetailCache[selectedListingId];
    if (cached) {
      setSelectedListingDetail(cached);
    } else {
      setSelectedListingDetail(null);
    }

    const loadDetail = async () => {
      setIsListingDetailLoading(true);
      setListingDetailError(null);
      try {
        const detail = await fetchHostListingDetail(selectedListingId);
        if (isCancelled) return;

        if (detail) {
          setListingDetailCache((prev) => ({ ...prev, [detail.id]: detail }));
          setSelectedListingDetail(detail);
          return;
        }

        if (!cached) {
          setListingDetailError('Aucune donnée réelle disponible pour cette annonce.');
        }
      } catch (error) {
        console.warn('[HostsSection] Unable to fetch host listing detail', error);
        if (!cached) {
          setListingDetailError('Impossible de charger les données Supabase pour cette annonce.');
        }
      } finally {
        if (!isCancelled) {
          setIsListingDetailLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [selectedListingId]);

  const handleViewHostProfile = useCallback(
    (hostId: string) => {
      if (!hostId) {
        return;
      }
      setSelectedListingId(null);
      setActiveSubtab('hosts');
      setSelectedHostId(hostId);
    },
    [],
  );

  const stats = useMemo(
    () => [
      { label: 'Hôtes actifs', value: statsState.data.activeHosts },
      { label: 'Annonces hôtes', value: statsState.data.hostListings },
      { label: 'Candidatures', value: statsState.data.pendingApplications },
      { label: 'Visites', value: statsState.data.hostVisits },
    ],
    [statsState.data],
  );

  const renderSubtab = (tab: string) => {
    switch (tab) {
      case 'annonces': {
        if (selectedListingId) {
          return (
            <div className="space-y-4">
              {(isListingDetailLoading || listingDetailError) && (
                <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                  <CardContent className="p-4 space-y-2 text-sm">
                    {isListingDetailLoading ? (
                      <p className="text-emerald-700">Chargement des données Supabase…</p>
                    ) : null}
                    {listingDetailError ? <p className="text-red-600">{listingDetailError}</p> : null}
                  </CardContent>
                </Card>
              )}
              {selectedListingDetail ? (
                <HostListingDetailView
                  listing={selectedListingDetail}
                  onBack={() => setSelectedListingId(null)}
                  onViewHostProfile={handleViewHostProfile}
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
        return (
          <div className="space-y-4">
            {(isListingsLoading || listingsError) && (
              <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                <CardContent className="p-4 space-y-2 text-sm">
                  {isListingsLoading ? (
                    <p className="text-emerald-700">Chargement des annonces depuis Supabase…</p>
                  ) : null}
                  {listingsError ? <p className="text-red-600">{listingsError}</p> : null}
                </CardContent>
              </Card>
            )}
            <ListingsBoard
              listings={liveListingsForBoard}
              filters={listingFilters}
              onFilterChange={(patch) =>
                setListingFilters((prev) => ({ ...prev, ...patch }))
              }
              title=""
              description=""
              ownerLabel="Hôte"
              onViewListing={setSelectedListingId}
            />
          </div>
        );
      }
      case 'hosts': {
        if (selectedHostId) {
          return (
            <div className="space-y-4">
              {(isHostProfileLoading || hostProfileError) && (
                <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                  <CardContent className="p-4 space-y-2">
                    {isHostProfileLoading ? (
                      <p className="text-emerald-700 text-sm">Chargement des données Supabase…</p>
                    ) : null}
                    {hostProfileError ? <p className="text-sm text-red-600">{hostProfileError}</p> : null}
                  </CardContent>
                </Card>
              )}
              {selectedHostDetail ? (
                <HostProfileView host={selectedHostDetail} onBack={() => setSelectedHostId(null)} />
              ) : (
                <Card className="rounded-2xl border-gray-100">
                  <CardContent className="p-6 space-y-3 text-sm text-gray-600">
                    <p>Aucune donnée n’est disponible pour cet hôte pour le moment.</p>
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedHostId(null)}
                        className="text-emerald-700 hover:underline"
                      >
                        Retourner à la liste des hôtes
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {(isProfilesLoading || profilesError) && (
              <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                <CardContent className="p-4 space-y-2 text-sm">
                  {isProfilesLoading ? (
                    <p className="text-emerald-700">Chargement du réseau d’hôtes…</p>
                  ) : null}
                  {profilesError ? <p className="text-red-600">{profilesError}</p> : null}
                </CardContent>
              </Card>
            )}
            <HostPartnersBoard hosts={liveHostProfiles} onViewProfile={handleViewHostProfile} />
          </div>
        );
      }
      case 'reservations':
        return <HostReservationsBoard />;
      case 'demandes':
        return (
          <div className="space-y-4">
            {(isApplicationsLoading || applicationsError) && (
              <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                <CardContent className="p-4 space-y-2 text-sm">
                  {isApplicationsLoading ? (
                    <p className="text-emerald-700">Chargement des candidatures hôtes…</p>
                  ) : null}
                  {applicationsError ? <p className="text-red-600">{applicationsError}</p> : null}
                </CardContent>
              </Card>
            )}
            <HostRequestsBoard requests={hostApplications} />
          </div>
        );
      case 'visits':
        return (
          <div className="space-y-4">
            {(isVisitsLoading || visitsError) && (
              <Card className="border-dashed border-emerald-200 bg-emerald-50/60">
                <CardContent className="p-4 space-y-2 text-sm">
                  {isVisitsLoading ? (
                    <p className="text-emerald-700">Chargement des visites hôtes…</p>
                  ) : null}
                  {visitsError ? <p className="text-red-600">{visitsError}</p> : null}
                </CardContent>
              </Card>
            )}
            <VisitsBoard visits={liveHostVisits} searchPlaceholder="Rechercher par propriété, client, ville..." />
          </div>
        );
      case 'messages':
        return <HostMessagesBoard />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Hôtes</h1>
          <p className="text-gray-500 mt-1">
            Pilotage des hôtes, de leurs annonces et des workflows associés
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
                  <span className="inline-block h-5 w-16 rounded bg-gray-200 animate-pulse" />
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
          {hostSubtabs.map((tab) => {
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

        {hostSubtabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4 space-y-4">
            {tab.id !== 'hosts' && (
              <div>
                <p className="text-lg font-semibold text-gray-900">{tab.label}</p>
                <p className="text-sm text-gray-500">{tab.description}</p>
              </div>
            )}
            {renderSubtab(tab.id)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
