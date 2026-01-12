import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MapPin, Clock, MoreVertical, CheckCircle, XCircle, Eye } from 'lucide-react';
import { updateVisitStatus } from '@/lib/services/landlords';
import { supabase } from '@/lib/supabaseClient';

export type VisitStatus = 'pending' | 'confirmed' | 'cancelled';
export type VisitPaymentStatus = 'paid' | 'pending' | 'refunded';

export type VisitRecord = {
  id: string;
  property: string;
  visitor: string;
  date: string;
  time: string;
  status: VisitStatus;
  paymentStatus: VisitPaymentStatus;
  amount: string;
  phone: string;
  city: string;
};

interface VisitsBoardProps {
  visits: VisitRecord[];
  feeLabel?: string;
  feeAmount?: string;
  searchPlaceholder?: string;
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
  feeLabel = 'Frais de visite',
  feeAmount = '5 000 FCFA',
  searchPlaceholder = 'Rechercher par propriété, visiteur, ville...',
}: VisitsBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localVisits, setLocalVisits] = useState<VisitRecord[]>(visits);

  useEffect(() => {
    setLocalVisits(visits);
  }, [visits]);

  useEffect(() => {
    if (!supabase) return;

    console.log('[VisitsBoard] Setting up realtime subscription for rental_visits');

    const channel = (supabase as any)
      .channel('rental-visits-changes-board')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_visits',
        },
        (payload: any) => {
          console.log('[VisitsBoard] Visit changed:', payload);

          if (payload.eventType === 'UPDATE') {
            const updatedVisit = payload.new;
            setLocalVisits((prev) =>
              prev.map((visit) => {
                if (visit.id === updatedVisit.id) {
                  return {
                    ...visit,
                    status: updatedVisit.status as VisitStatus,
                  };
                }
                return visit;
              })
            );
          }
        }
      )
      .subscribe((status: string) => {
        console.log('[VisitsBoard] Realtime subscription status:', status);
      });

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, []);

  const handleCancelVisit = async (visit: VisitRecord) => {
    console.log('[VisitsBoard] handleCancelVisit called for visit:', visit.id);
    try {
      console.log('[VisitsBoard] Calling updateVisitStatus with visitId:', visit.id, 'status: cancelled');
      const result = await updateVisitStatus(visit.id, 'cancelled');
      console.log('[VisitsBoard] updateVisitStatus result:', result);
      if (!result.success) {
        console.error('[VisitsBoard] Failed to cancel visit:', result.error);
        alert('Erreur lors de l\'annulation de la visite: ' + result.error);
      } else {
        console.log('[VisitsBoard] Visit cancelled successfully');
      }
    } catch (error) {
      console.error('[VisitsBoard] Exception cancelling visit:', error);
      alert('Erreur lors de l\'annulation de la visite: ' + String(error));
    }
  };

  const isVisitCompleted = (visit: VisitRecord): boolean => {
    try {
      const visitDate = new Date(visit.date);
      return visitDate < new Date();
    } catch {
      return false;
    }
  };

  const confirmedCount = useMemo(() => localVisits.filter((v) => v.status === 'confirmed').length, [localVisits]);
  const cancelledCount = useMemo(() => localVisits.filter((v) => v.status === 'cancelled').length, [localVisits]);
  const completedCount = useMemo(() => localVisits.filter((v) => isVisitCompleted(v)).length, [localVisits]);

  const filteredVisits = useMemo(
    () => {
      const filtered = localVisits.filter(
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
    [localVisits, searchQuery],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">{completedCount}</p>
                <p className="text-sm text-gray-600">Terminées</p>
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
        <Card>
          <CardContent className="p-6">
            <div className="bg-blue-50 p-3 rounded-xl">
              <p className="text-xs text-blue-900 mb-1">{feeLabel}</p>
              <p className="text-lg text-blue-900">{feeAmount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
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

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propriété</TableHead>
                  <TableHead>Visiteur</TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.map((visit) => {
                  const statusBadge = getStatusBadge(visit.status);
                  return (
                    <TableRow key={visit.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-900">{visit.property}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-gray-900">{visit.visitor}</p>
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
                          <p className="text-xs text-gray-500">{visit.paymentStatus === 'paid' ? 'Payé' : 'Remboursé'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {visit.status !== 'cancelled' && (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleCancelVisit(visit)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Annuler
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="confirmed" className="mt-6">
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">{confirmedCount} visites confirmées</h3>
            <p className="text-gray-500">Visites programmées et validées</p>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">{completedCount} visites terminées</h3>
            <p className="text-gray-500">Visites dont la date est passée</p>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          <Card className="p-8 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">{cancelledCount} visites annulées</h3>
            <p className="text-gray-500">Visites annulées par l'utilisateur</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
