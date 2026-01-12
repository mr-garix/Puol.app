import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { clientProfiles, clientSubtabs } from '../UsersManagement';
import type { ClientProfileDetail, ClientProfileRecord } from '../UsersManagement';
import { Users, Star, TrendingUp, Search, ArrowRightCircle, RefreshCw } from 'lucide-react';
import { ClientMessagesBoard } from './shared/ClientMessagesBoard';
import { ClientProfileView } from './shared/ClientProfileView';
import { fetchClientProfiles, fetchClientProfileDetail } from '@/lib/services/clients';

type ClientsBoardProps = {
  clients: ClientProfileRecord[];
  onViewProfile: (clientId: string) => void;
};

function ClientsBoard({ clients, onViewProfile }: ClientsBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return clients.filter((client) =>
      client.fullName.toLowerCase().includes(query) ||
      client.city.toLowerCase().includes(query) ||
      client.phone.includes(query)
    );
  }, [clients, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          className="pl-10 rounded-2xl"
          placeholder="Rechercher par nom, ville ou contact..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      <Card className="rounded-3xl border border-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead>Client</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Réservations</TableHead>
              <TableHead>Dépenses</TableHead>
              <TableHead>Visites</TableHead>
              <TableHead>Baux signés</TableHead>
              <TableHead>Satisfaction</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => (
              <TableRow key={client.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border border-gray-100">
                      <AvatarImage src={client.avatarUrl} alt={client.fullName} />
                      <AvatarFallback>
                        {client.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{client.fullName}</p>
                      <p className="text-xs text-gray-500">{client.phone}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600 uppercase">{client.segment}</TableCell>
                <TableCell className="text-sm text-gray-600">{client.city}</TableCell>
                <TableCell className="text-sm font-semibold text-gray-900">{client.reservations}</TableCell>
                <TableCell className="text-sm font-semibold text-gray-900">
                  {client.spend.toLocaleString('fr-FR')} FCFA
                </TableCell>
                <TableCell className="text-sm font-semibold text-gray-900">{client.visitsBooked}</TableCell>
                <TableCell className="text-sm font-semibold text-gray-900">{client.leasesSigned}</TableCell>
                <TableCell>
                  <Badge className="bg-emerald-50 text-emerald-700 rounded-full px-3 py-0.5">
                    {client.satisfaction.toFixed(1)}/5
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    className="rounded-full text-xs px-3 py-1 flex items-center gap-1"
                    onClick={() => onViewProfile(client.id)}
                  >
                    Voir
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-gray-500">
            Aucun client ne correspond à cette recherche.
          </div>
        )}
      </Card>
    </div>
  );
}

export function ClientsSection() {
  const [activeSubtab, setActiveSubtab] = useState(clientSubtabs[0]?.id ?? 'clients');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [liveClients, setLiveClients] = useState<ClientProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<ClientProfileDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchClientProfiles();
      setLiveClients(data.length ? data : []);
    } catch (error) {
      console.warn('[ClientsSection] unable to fetch client profiles', error);
      setLoadError('Impossible de charger les clients.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      await loadClients();
      if (isMounted) {
        setLastUpdate(new Date());
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [loadClients]);

  const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadClients();
    setLastUpdate(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    let isMounted = true;
    if (!selectedClientId) {
      setSelectedClientDetail(null);
      setDetailError(null);
      setIsDetailLoading(false);
      return;
    }

    const loadDetail = async () => {
      setIsDetailLoading(true);
      setDetailError(null);
      try {
        const detail = await fetchClientProfileDetail(selectedClientId);
        if (detail) {
          setSelectedClientDetail(detail);
        } else {
          setDetailError('Aucune donnée trouvée pour ce client.');
        }
      } catch (error) {
        console.warn('[ClientsSection] unable to fetch client detail', error);
        if (isMounted) {
          setDetailError('Impossible de charger le profil client.');
        }
      } finally {
        if (isMounted) {
          setIsDetailLoading(false);
        }
      }
    };
    void loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedClientId]);

  const effectiveClients = useMemo(
    () => (liveClients.length ? liveClients : clientProfiles),
    [liveClients],
  );

  const stats = useMemo(() => {
    const totalClients = effectiveClients.length;
    const avgSatisfaction =
      totalClients > 0
        ? (effectiveClients.reduce((sum, c) => sum + (c.satisfaction ?? 0), 0) / totalClients).toFixed(1)
        : '—';
    const totalSpend =
      totalClients > 0
        ? effectiveClients.reduce((sum, c) => sum + (c.spend ?? 0), 0).toLocaleString('fr-FR')
        : '—';
    return [
      { label: 'Clients référencés', value: totalClients ? totalClients.toLocaleString('fr-FR') : '—', icon: Users },
      { label: 'Satisfaction moyenne', value: totalClients ? `${avgSatisfaction} / 5` : '—', icon: Star },
      { label: 'Recettes cumulées', value: totalClients ? `${totalSpend} FCFA` : '—', icon: TrendingUp },
    ];
  }, [effectiveClients]);

  const renderSubtab = (tab: string) => {
    switch (tab) {
      case 'clients': {
        if (selectedClientId) {
          if (isDetailLoading) {
            return (
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-6 text-emerald-700 shadow-sm">
                <p className="text-sm font-medium">En attente du résultat…</p>
                <p className="text-xs text-emerald-600/80">Chargement du profil client</p>
              </div>
            );
          }
          if (detailError) {
            return (
              <Card className="border-dashed border-red-200 bg-red-50/60">
                <CardContent className="p-4 text-sm space-y-2">
                  <p className="text-red-600">{detailError}</p>
                  <Button variant="outline" size="sm" onClick={() => setSelectedClientId(null)} className="rounded-full">
                    Retour à la liste
                  </Button>
                </CardContent>
              </Card>
            );
          }
          if (selectedClientDetail) {
            return <ClientProfileView client={selectedClientDetail} onBack={() => setSelectedClientId(null)} />;
          }
          return (
            <Card className="border-dashed border-gray-200">
              <CardContent className="p-4 text-sm space-y-2">
                <p className="text-gray-600">Aucune donnée n’est disponible pour ce client.</p>
                <Button variant="outline" size="sm" onClick={() => setSelectedClientId(null)} className="rounded-full">
                  Retour à la liste
                </Button>
              </CardContent>
            </Card>
          );
        }
        return (
          <div className="space-y-3">
            {(isLoading || loadError) && (
              <Card className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 shadow-sm">
                <CardContent className="p-5 space-y-2 text-sm">
                  {isLoading && <p className="text-emerald-700 font-medium">En attente du résultat…</p>}
                  {isLoading && <p className="text-emerald-600/80">La page est en train de charger.</p>}
                  {loadError && <p className="text-red-600">{loadError}</p>}
                </CardContent>
              </Card>
            )}
            <ClientsBoard clients={effectiveClients} onViewProfile={setSelectedClientId} />
          </div>
        );
      }
      case 'support':
        return <ClientMessagesBoard />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Gestion Clients</h1>
          <p className="text-gray-500 mt-1">Suivi des profils clients, des réservations et du support.</p>
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
          <Card key={stat.label} className="rounded-2xl border border-gray-100">
            <CardContent className="p-5 space-y-2 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 uppercase">{stat.label}</p>
                <stat.icon className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeSubtab} onValueChange={setActiveSubtab}>
        <TabsList className="bg-gray-100 p-1 rounded-xl flex flex-wrap">
          {clientSubtabs.map((tab) => {
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

        {clientSubtabs.map((tab) => (
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
