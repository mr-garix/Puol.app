import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ArrowUpRight, Filter, Users, MapPin, Calendar, Phone, Loader2 } from 'lucide-react';
import type { LandlordListItem } from '@/lib/services/landlords';
import { fetchLandlordsList } from '@/lib/services/landlords';
import {
  landlordProfiles as landlordProfilesMock,
  landlordProfileDetails,
  type LandlordProfileDetail,
} from '../../UsersManagement';

type SegmentFilter = 'all' | LandlordListItem['segment'];
const segmentLabels: Record<LandlordListItem['segment'], string> = {
  premium: 'Premium',
  core: 'Core',
  lite: 'Lite'
};

type LandlordBuyersBoardProps = {
  onViewProfile?: (landlordId: string) => void;
};

export function LandlordBuyersBoard({ onViewProfile }: LandlordBuyersBoardProps) {
  const [landlords, setLandlords] = useState<LandlordListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all');
  const [periodRange, setPeriodRange] = useState<'12m' | '6m' | '30d'>('12m');

  useEffect(() => {
    let isMounted = true;
    const loadLandlords = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const data = await fetchLandlordsList();
        if (isMounted) {
          setLandlords(data);
        }
      } catch (error) {
        console.warn('[LandlordBuyersBoard] unable to load landlords', error);
        if (isMounted) {
          setFetchError("Impossible de charger les bailleurs.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadLandlords();
    return () => {
      isMounted = false;
    };
  }, []);

  const fallbackProfilesById = useMemo(() => {
    const map = new Map<string, LandlordProfileDetail>();
    Object.entries(landlordProfileDetails).forEach(([id, detail]) => map.set(id, detail));
    return map;
  }, []);

  const deriveListingStats = (detail?: LandlordProfileDetail | null) => {
    const stats = { online: 0, draft: 0, total: 0 };
    if (!detail?.listings) {
      return stats;
    }
    detail.listings.forEach(listing => {
      stats.total += 1;
      if (listing.status === 'en ligne') {
        stats.online += 1;
      } else if (listing.status === 'en brouillon') {
        stats.draft += 1;
      }
    });
    return stats;
  };

  const fallbackListAsLandlords: LandlordListItem[] = useMemo(
    () =>
      landlordProfilesMock.map(profile => {
        const detail = landlordProfileDetails[profile.id];
        return {
          id: profile.id,
          fullName: profile.name,
          username: profile.username,
          city: profile.city,
          phone: detail?.phone ?? null,
          landlordStatus: detail?.notes ?? null,
          segment: profile.segment,
          createdAt: detail?.joinedAt ?? null,
          listingStats: detail ? deriveListingStats(detail) : null,
        };
      }),
    [],
  );

  const effectiveProfiles = useMemo(
    () => (landlords.length ? landlords : fallbackListAsLandlords),
    [landlords, fallbackListAsLandlords],
  );

  const summary = useMemo(() => {
    const fallback = {
      totalLeases: landlordProfilesMock.reduce((sum, profile) => sum + profile.leasesSigned, 0),
      totalLandlords: landlordProfilesMock.length,
      totalRevenue: landlordProfilesMock.reduce((sum, profile) => sum + profile.revenueShare, 0),
    };

    const liveTotal = landlords.length;

    return {
      totalLeases: fallback.totalLeases,
      totalLandlords: liveTotal || fallback.totalLandlords,
      totalRevenue: fallback.totalRevenue,
      onboardingDelta: liveTotal ? Math.max(liveTotal - fallback.totalLandlords, 0) : 1,
    };
  }, [landlords]);

  const filteredProfiles = useMemo(() => {
    return effectiveProfiles.filter(profile => {
      const matchesSearch =
        profile.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (profile.username ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (profile.city ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (profile.phone ?? '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSegment = segmentFilter === 'all' || profile.segment === segmentFilter;

      return matchesSearch && matchesSegment;
    });
  }, [searchQuery, segmentFilter, effectiveProfiles]);

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return '—';
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#2ECC71]" />
            <h2 className="text-2xl text-gray-900">Tous les bailleurs (baux longue durée)</h2>
          </div>
          <p className="text-gray-500">
            Vue portefeuille : baux signés, unités gérées, volume locataires et revenus générés pour chaque bailleur long terme.
          </p>
        </div>
        <Select value={periodRange} onValueChange={(value: '12m' | '6m' | '30d') => setPeriodRange(value)}>
          <SelectTrigger className="w-[200px] rounded-xl bg-white">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <SelectValue placeholder="Période" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12m">12 derniers mois</SelectItem>
            <SelectItem value="6m">6 derniers mois</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#2ECC71] to-[#27AE60] text-white">
          <CardContent className="p-6 space-y-2">
            <p className="text-sm uppercase text-white/70">Baux actifs signés</p>
            <p className="text-3xl font-semibold">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : summary.totalLeases}
            </p>
            <p className="text-xs text-white/80">Portefeuille long terme</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm text-gray-500 uppercase">Bailleurs référencés</p>
            <p className="text-3xl text-gray-900">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : summary.totalLandlords}
            </p>
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +{summary.onboardingDelta} onboarding
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm text-gray-500 uppercase">Revenus PUOL (12 mois)</p>
            <p className="text-3xl text-gray-900">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              ) : (
                `${(summary.totalRevenue / 1_000_000).toFixed(1)}M`
              )}
            </p>
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +18% vs N-1
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Rechercher par bailleur, ville, bail signé..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10 rounded-xl"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <Button variant="outline" className="rounded-xl gap-2">
                <Filter className="w-4 h-4" />
                Filtres avancés
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={segmentFilter} onValueChange={(value: SegmentFilter) => setSegmentFilter(value)}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous segments</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="lite">Lite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>Bailleur</TableHead>
                  <TableHead>Contact & ville</TableHead>
                  <TableHead>Annonces</TableHead>
                  <TableHead>Locataires</TableHead>
                  <TableHead>Revenus</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`}>
                        <TableCell colSpan={6}>
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  : filteredProfiles.map(profile => {
                      const fallbackDetail = fallbackProfilesById.get(profile.id);
                      const tenantsTotal = fallbackDetail?.tenantsTotal ?? 0;
                      const revenueShare = fallbackDetail?.revenueShare ?? 0;
                      const listingStats = profile.listingStats ?? deriveListingStats(fallbackDetail);

                      return (
                        <TableRow key={profile.id} className="hover:bg-gray-50/80">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-gray-500">
                                {profile.avatarUrl ? (
                                  <img
                                    src={profile.avatarUrl}
                                    alt={profile.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  profile.fullName.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                  {profile.fullName}
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {segmentLabels[profile.segment]}
                                  </Badge>
                                </p>
                                {profile.username && <p className="text-xs text-gray-500">{profile.username}</p>}
                                <p className="text-[11px] text-emerald-600 font-medium capitalize">
                                  {profile.landlordStatus ?? 'actif'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex items-center gap-2">
                                <Phone className="w-3 h-3" />
                                {profile.phone ?? '—'}
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                {profile.city ?? 'Ville inconnue'}
                              </div>
                              <p className="text-[11px] text-gray-500">{formatDate(profile.createdAt)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-900 space-y-1">
                            <p>
                              En ligne : <span className="font-semibold">{listingStats.online}</span>
                            </p>
                            <p>
                              Brouillon : <span className="font-semibold">{listingStats.draft}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Total : {listingStats.total || '—'} annonce{listingStats.total > 1 ? 's' : ''}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {tenantsTotal}
                            <span className="text-xs text-gray-500 ml-1">locataires</span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {revenueShare.toLocaleString('fr-FR')} FCFA
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => onViewProfile?.(profile.id)}
                            >
                              Voir profil
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>

            {!isLoading && filteredProfiles.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                {fetchError ? (
                  <>
                    <p className="text-gray-600">{fetchError}</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      Recharger
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600">Aucun bailleur ne correspond à ces critères.</p>
                    <p className="text-sm text-gray-400">
                      Ajustez les filtres ou réinitialisez la recherche pour élargir la liste.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
