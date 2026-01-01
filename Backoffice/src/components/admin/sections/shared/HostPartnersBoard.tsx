import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, MapPin, Filter, Calendar, ArrowUpRight } from 'lucide-react';
import { type HostProfile } from '../../UsersManagement';

const segmentLabels: Record<HostProfile['segment'], string> = {
  premium: 'Premium',
  core: 'Core',
  lite: 'Lite',
};

type SegmentFilter = 'all' | HostProfile['segment'];
type PeriodRange = '12m' | '6m' | '30d';

const periodLabels: Record<PeriodRange, string> = {
  '12m': '12 derniers mois',
  '6m': '6 derniers mois',
  '30d': '30 derniers jours',
};

type HostPartnersBoardProps = {
  hosts?: HostProfile[];
  onViewProfile?: (hostId: string) => void;
};

export function HostPartnersBoard({ hosts = [], onViewProfile }: HostPartnersBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all');
  const [periodRange, setPeriodRange] = useState<PeriodRange>('12m');

  const summary = useMemo(() => {
    const totalStays = hosts.reduce((sum, host) => sum + (host.staysHosted ?? 0), 0);
    const totalGuests = hosts.reduce((sum, host) => sum + (host.guestsSupported ?? 0), 0);
    const totalRevenue = hosts.reduce((sum, host) => sum + (host.revenueShare ?? 0), 0);

    return {
      totalStays,
      totalGuests,
      totalRevenue,
      totalHosts: hosts.length,
    };
  }, [hosts]);

  const filteredHosts = useMemo(() => {
    return hosts.filter((host) => {
      const matchesSearch =
        host.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        host.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        host.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        host.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        host.propertyTags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSegment = segmentFilter === 'all' || host.segment === segmentFilter;

      return matchesSearch && matchesSegment;
    });
  }, [hosts, searchQuery, segmentFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#2ECC71]" />
            <h2 className="text-2xl text-gray-900">Hôtes</h2>
          </div>
          <p className="text-gray-500">Réseau Hôtes PUOL pour les annonces meublées.</p>
        </div>
        <Select value={periodRange} onValueChange={(value: PeriodRange) => setPeriodRange(value)}>
          <SelectTrigger className="w-[220px] rounded-xl bg-white">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#2ECC71] to-[#27AE60] text-white">
          <CardContent className="p-6 space-y-2">
            <p className="text-sm uppercase text-white/70">Séjours opérés</p>
            <p className="text-3xl font-semibold">{summary.totalStays}</p>
            <p className="text-xs text-white/80">{periodLabels[periodRange]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm text-gray-500 uppercase">Hôtes actifs</p>
            <p className="text-3xl text-gray-900">{summary.totalHosts}</p>
            <p className="text-xs text-[#2ECC71] flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +2 onboarding
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm text-gray-500 uppercase">Invités accompagnés</p>
            <p className="text-3xl text-gray-900">{summary.totalGuests}</p>
            <p className="text-xs text-[#2ECC71] flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +9% QoQ
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm text-gray-500 uppercase">Revenus hôtes</p>
            <p className="text-3xl text-gray-900">{summary.totalRevenue >= 1_000_000 ? `${(summary.totalRevenue / 1_000_000).toFixed(1)}M` : `${summary.totalRevenue.toLocaleString('fr-FR')} FCFA`}</p>
            <p className="text-xs text-[#2ECC71] flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +14% vs N-1
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
                  placeholder="Rechercher par hôte, ville, type de bien..."
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
                  <TableHead>Hôte</TableHead>
                  <TableHead>Types de biens</TableHead>
                  <TableHead>Séjours & annonces</TableHead>
                  <TableHead>Invités accompagnés</TableHead>
                  <TableHead>Revenus partagés</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHosts.map((host) => (
                  <TableRow key={host.id} className="hover:bg-gray-50/80">
                    <TableCell>
                      <div className="space-y-1 flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden text-sm font-semibold text-gray-600 shrink-0">
                          {host.avatarUrl ? (
                            <img src={host.avatarUrl} alt={host.name} className="h-full w-full object-cover" />
                          ) : (
                            host.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {host.name}
                            <Badge variant="secondary" className="text-xs capitalize">
                              {segmentLabels[host.segment]}
                            </Badge>
                          </p>
                          <p className="text-xs text-gray-500">{host.username}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {host.city}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid grid-cols-2 gap-2 max-w-sm">
                        {host.propertyTags.map((tag, index) => (
                          <Badge
                            key={`${host.id}-${tag}-${index}`}
                            variant="secondary"
                            className="rounded-full text-xs whitespace-nowrap text-center"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {host.staysHosted} séjours · {host.listingsActive} annonces
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {host.guestsSupported}
                      <span className="text-xs text-gray-500 ml-1">invités</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {host.revenueShare.toLocaleString('fr-FR')} FCFA
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => onViewProfile?.(host.id)}
                      >
                        Voir profil
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredHosts.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-gray-600">Aucun hôte ne correspond à ces critères.</p>
                <p className="text-sm text-gray-400">Ajustez les filtres ou réinitialisez la recherche pour revoir l’ensemble du réseau.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
