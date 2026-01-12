import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  User,
  Phone,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchLandlordVisits, updateVisitStatus } from '@/lib/services/landlords';
import { supabase } from '@/lib/supabaseClient';

export type VisitStatus = 'pending' | 'confirmed' | 'cancelled';
export type VisitPaymentStatus = 'paid' | 'pending' | 'refunded';

export type VisitRecord = {
  id: string;
  property: string;
  propertyImage?: string | null;
  propertyType?: string | null;
  visitor: string;
  date: string;
  time: string;
  status: VisitStatus;
  paymentStatus: VisitPaymentStatus;
  amount: string;
  phone: string;
  city: string;
  landlordName?: string;
  landlordPhone?: string;
  landlordId?: string;
  landlordCity?: string;
  landlordUsername?: string;
};

interface VisitsBoardProps {
  visits: VisitRecord[];
  searchPlaceholder?: string;
  onViewVisit?: (visit: VisitRecord) => void;
  onCancelVisit?: (visit: VisitRecord) => void;
}

export function VisitsManagement() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVisits = async () => {
      try {
        const data = await fetchLandlordVisits();
        setVisits(data);
      } catch (error) {
        console.error('Erreur lors du chargement des visites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVisits();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    console.log('[VisitsManagement] Setting up realtime subscription for rental_visits');

    const channel = (supabase as any)
      .channel('rental-visits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_visits',
        },
        (payload: any) => {
          console.log('[VisitsManagement] Visit changed:', payload);

          if (payload.eventType === 'UPDATE') {
            const updatedVisit = payload.new;
            setVisits((prev) =>
              prev.map((visit) => {
                if (visit.id === updatedVisit.id) {
                  return {
                    ...visit,
                    status: updatedVisit.status as VisitRecord['status'],
                  };
                }
                return visit;
              })
            );
          }
        }
      )
      .subscribe((status: string) => {
        console.log('[VisitsManagement] Realtime subscription status:', status);
      });

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, []);

  const handleCancelVisit = async (visit: VisitRecord) => {
    console.log('[VisitsManagement] handleCancelVisit called for visit:', visit.id);
    try {
      console.log('[VisitsManagement] Calling updateVisitStatus with visitId:', visit.id, 'status: cancelled');
      const result = await updateVisitStatus(visit.id, 'cancelled');
      console.log('[VisitsManagement] updateVisitStatus result:', result);
      if (!result.success) {
        console.error('[VisitsManagement] Failed to cancel visit:', result.error);
        alert('Erreur lors de l\'annulation de la visite: ' + result.error);
      } else {
        console.log('[VisitsManagement] Visit cancelled successfully');
      }
    } catch (error) {
      console.error('[VisitsManagement] Exception cancelling visit:', error);
      alert('Erreur lors de l\'annulation de la visite: ' + String(error));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Visites</h1>
        <p className="text-gray-500 mt-1">
          Gestion centralisée des visites programmées pour les logements non-meublés
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-500">Chargement des visites...</div>
      ) : (
        <VisitsBoard visits={visits} onCancelVisit={handleCancelVisit} />
      )}
    </div>
  );
}

type VisitDetailViewProps = {
  visit: VisitRecord;
  onBack: () => void;
  onCancel: () => void;
};

function VisitDetailView({ visit, onBack, onCancel }: VisitDetailViewProps) {
  const paymentLabel = 'Payé';
  const paymentAccent = 'text-emerald-600';

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="rounded-full flex items-center gap-2" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Retour aux visites
      </Button>

      <div className="rounded-3xl border border-gray-100 overflow-hidden">
        <div
          className="h-48 md:h-64 bg-cover bg-center"
          style={{
            backgroundImage: `url(${visit.propertyImage ?? 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80'})`,
          }}
        />
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Visite #{visit.id}</p>
              <h1 className="text-3xl font-semibold text-gray-900">{visit.property}</h1>
              <p className="text-sm text-gray-500">
                {visit.propertyType ?? 'Type non précisé'} · {visit.city}
              </p>
            </div>
            <StatusBadge status={visit.status} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <DetailCard icon={CalendarDays} label="Date & heure" primary={visit.date} secondary={visit.time} />
            <DetailCard icon={MapPin} label="Localisation" primary={visit.city} secondary="Visite guidée" />
            <DetailCard icon={FileText} label="Paiement" primary={visit.amount} secondary={paymentLabel} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm uppercase tracking-wide text-gray-500">Client</h2>
              <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold">
                    {visit.visitor.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{visit.visitor}</p>
                    <p className="text-xs text-gray-500">Client vérifié</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {visit.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  Intérêt : Visite guidée
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm uppercase tracking-wide text-gray-500">Hôte</h2>
              <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                    {(visit.landlordName ?? 'Hôte PUOL').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{visit.landlordName ?? 'Hôte PUOL'}</p>
                    <p className="text-xs text-gray-500">Hôte vérifié</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {visit.landlordPhone && visit.landlordPhone.trim().length > 0 ? visit.landlordPhone : '—'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  @{visit.landlordUsername ?? 'compte hôte'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  {visit.landlordCity ?? '—'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  Hôte de : {visit.propertyType ?? 'Logement'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Button
              variant="outline"
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 disabled:text-red-300 disabled:border-red-100"
              disabled={visit.status === 'cancelled'}
              onClick={onCancel}
            >
              Annuler la visite
            </Button>
            <div className="ml-auto text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Paiement</p>
              <p className={`text-sm font-semibold ${paymentAccent}`}>{paymentLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: VisitStatus }) {
  const config = getStatusBadge(status);
  return (
    <Badge className={`${config.className} px-4 py-1.5 text-sm`}>
      {config.label}
    </Badge>
  );
}

function DetailCard({
  icon: Icon,
  label,
  primary,
  secondary,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 space-y-1.5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </div>
      <p className="text-sm font-semibold text-gray-900">{primary}</p>
      {secondary && <p className="text-xs text-gray-500">{secondary}</p>}
    </div>
  );
}

const getStatusBadge = (status: VisitStatus) => {
  const variants = {
    pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
    confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-700' },
  };
  return variants[status];
};

export function VisitsBoard({
  visits,
  searchPlaceholder = 'Rechercher par propriété, visiteur, ville...',
  onViewVisit,
  onCancelVisit,
}: VisitsBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedVisit, setFocusedVisit] = useState<VisitRecord | null>(null);

  const isVisitCompleted = (visit: VisitRecord): boolean => {
    try {
      const visitDate = new Date(visit.date);
      return visitDate < new Date();
    } catch {
      return false;
    }
  };

  const pendingCount = useMemo(() => visits.filter((v) => v.status === 'pending').length, [visits]);
  const confirmedCount = useMemo(() => visits.filter((v) => v.status === 'confirmed').length, [visits]);
  const cancelledCount = useMemo(() => visits.filter((v) => v.status === 'cancelled').length, [visits]);
  const completedCount = useMemo(() => visits.filter((v) => isVisitCompleted(v)).length, [visits]);

  const filteredVisits = useMemo(
    () => {
      const filtered = visits.filter(
        (v) =>
          v.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.visitor.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.city.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      // Trier par date décroissante (les plus récentes en haut)
      return filtered.sort((a, b) => {
        try {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        } catch {
          return 0;
        }
      });
    },
    [visits, searchQuery],
  );

  const getVisitsForTab = (status: 'all' | VisitStatus | 'completed') => {
    if (status === 'all') return filteredVisits;
    if (status === 'completed') return filteredVisits.filter((visit) => isVisitCompleted(visit));
    return filteredVisits.filter((visit) => visit.status === status);
  };

  const handleCancel = async (visit: VisitRecord) => {
    console.log('[VisitsBoard] handleCancel called for visit:', visit.id);
    if (onCancelVisit) {
      console.log('[VisitsBoard] Calling onCancelVisit (handleCancelVisit from parent)');
      const result = await updateVisitStatus(visit.id, 'cancelled');
      console.log('[VisitsManagement] updateVisitStatus result:', result);
      if (!result.success) {
        console.error('[VisitsManagement] Failed to cancel visit:', result.error);
        alert('Erreur lors de l\'annulation de la visite: ' + result.error);
      } else {
        console.log('[VisitsManagement] Visit cancelled successfully');
      }
      await onCancelVisit(visit);
    }
    setFocusedVisit((prev) => (prev?.id === visit.id ? { ...prev, status: 'cancelled' } : prev));
  };

  if (focusedVisit) {
    return (
      <VisitDetailView
        visit={focusedVisit}
        onBack={() => setFocusedVisit(null)}
        onCancel={() => handleCancel(focusedVisit)}
      />
    );
  }

  const renderVisitsTable = (records: VisitRecord[]) => (
    <Card>
      {records.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Propriété</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date & Heure</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((visit) => {
              const canCancel = visit.status !== 'cancelled';
              return (
                <TableRow key={visit.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                        {visit.propertyImage ? (
                          <img
                            src={visit.propertyImage}
                            alt={visit.property}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MapPin className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{visit.property}</p>
                        <p className="text-xs text-gray-500">{visit.propertyType ?? 'Type non précisé'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{visit.visitor}</p>
                      <p className="text-xs text-gray-500">{visit.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-gray-900">{visit.date}</p>
                      <p className="text-xs text-gray-500">{visit.time}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{visit.city}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-gray-900">{visit.amount}</p>
                      <p className="text-xs text-gray-500">Payé</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={visit.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => {
                          setFocusedVisit(visit);
                          onViewVisit?.(visit);
                        }}
                      >
                        Voir
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:bg-red-200 disabled:text-white/80 border-0 shadow-sm"
                        disabled={!canCancel}
                        onClick={() => {
                          if (!canCancel) return;
                          handleCancel(visit);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="p-8 text-center text-sm text-gray-500">Aucune visite correspondant à ce filtre.</div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">{pendingCount}</p>
                <p className="text-sm text-gray-600">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">{confirmedCount}</p>
                <p className="text-sm text-gray-600">Confirmées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">{cancelledCount}</p>
                <p className="text-sm text-gray-600">Annulées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl flex flex-wrap gap-1">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white">
            Toutes ({visits.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="rounded-lg data-[state=active]:bg-white">
            Confirmées ({confirmedCount})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-white">
            Terminées ({completedCount})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-lg data-[state=active]:bg-white">
            Annulées ({cancelledCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          {renderVisitsTable(getVisitsForTab('all'))}
        </TabsContent>

        <TabsContent value="confirmed" className="mt-6 space-y-4">
          {renderVisitsTable(getVisitsForTab('confirmed'))}
        </TabsContent>

        <TabsContent value="completed" className="mt-6 space-y-4">
          {renderVisitsTable(getVisitsForTab('completed'))}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6 space-y-4">
          {renderVisitsTable(getVisitsForTab('cancelled'))}
        </TabsContent>
      </Tabs>

    </div>
  );
}