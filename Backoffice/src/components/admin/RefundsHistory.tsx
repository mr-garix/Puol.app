import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, DollarSign, Calendar, User, FileText } from 'lucide-react';
import type { RefundRecord } from '@/lib/services/refunds';
import { supabase } from '@/lib/supabaseClient';

interface ClientProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
});

const statusVariants = {
  pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
  processing: { label: 'En cours', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Complété', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Échoué', className: 'bg-red-100 text-red-700' },
};

const reasonVariants = {
  reservation_cancelled: 'Réservation annulée',
  guest_request: 'Demande du client',
  damage: 'Dommages',
  other: 'Autre',
};

export function RefundsHistory() {
  console.log('[RefundsHistory] COMPONENT MOUNTED - RefundsHistory is rendering');
  
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientProfiles, setClientProfiles] = useState<Map<string, ClientProfile>>(new Map());

  const loadClientProfiles = async (profileIds: string[]) => {
    if (!supabase || profileIds.length === 0) {
      return;
    }

    try {
      const client = supabase as any;
      const { data, error } = await client
        .from('profiles')
        .select('id, first_name, last_name, phone, avatar_url')
        .in('id', profileIds);

      if (error) {
        console.error('[RefundsHistory] Error loading profiles:', error);
        return;
      }

      if (data) {
        const profilesMap = new Map<string, ClientProfile>();
        data.forEach((profile: any) => {
          profilesMap.set(profile.id, {
            id: profile.id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            phone: profile.phone,
            avatarUrl: profile.avatar_url,
          });
        });
        setClientProfiles(profilesMap);
      }
    } catch (err) {
      console.error('[RefundsHistory] Exception loading profiles:', err);
    }
  };

  const loadRefunds = async () => {
    console.log('[RefundsHistory] loadRefunds called');
    setIsLoading(true);
    setError(null);
    try {
      console.log('[RefundsHistory] Starting to load refunds...');
      
      // Charger directement depuis Supabase sans dépendre du service
      if (!supabase) {
        console.error('[RefundsHistory] Supabase client not available');
        setError('Client Supabase non disponible');
        setIsLoading(false);
        return;
      }

      console.log('[RefundsHistory] Supabase client available, fetching refunds...');
      const client = supabase as any;
      
      // Maintenant charger les données
      console.log('[RefundsHistory] Fetching refunds from Supabase...');
      const { data, error: supabaseError } = await client
        .from('refunds')
        .select('*')
        .order('requested_at', { ascending: false });

      if (supabaseError) {
        console.error('[RefundsHistory] Supabase error:', {
          message: supabaseError.message,
          code: supabaseError.code,
          details: supabaseError.details,
        });
        setError(`Erreur Supabase: ${supabaseError.message}`);
        setIsLoading(false);
        return;
      }

      console.log('[RefundsHistory] Refunds loaded:', {
        count: data?.length || 0,
        firstRefund: data?.[0],
      });

      if (!data || data.length === 0) {
        console.log('[RefundsHistory] No refunds in database');
        setRefunds([]);
      } else {
        // Mapper les données directement
        const mappedRefunds = data.map((row: any) => ({
          id: row.id,
          bookingId: row.booking_id,
          guestProfileId: row.guest_profile_id,
          refundAmount: row.refund_amount,
          originalAmount: row.original_amount,
          refundReason: row.refund_reason,
          refundNotes: row.refund_notes,
          status: row.status,
          paymentMethod: row.payment_method,
          paymentReference: row.payment_reference,
          phoneNumber: row.phone_number,
          requestedAt: row.requested_at,
          processedAt: row.processed_at,
          completedAt: row.completed_at,
          updatedAt: row.updated_at,
        }));
        console.log('[RefundsHistory] Mapped refunds:', mappedRefunds.length);
        setRefunds(mappedRefunds);

        // Charger les profils des clients
        const profileIds = mappedRefunds.map((r: RefundRecord) => r.guestProfileId).filter(Boolean);
        await loadClientProfiles(profileIds);
      }
    } catch (err) {
      const errorMessage = 'Erreur lors du chargement des remboursements';
      setError(errorMessage);
      console.error('[RefundsHistory] Exception:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('[RefundsHistory] useEffect mounted, calling loadRefunds...');
    loadRefunds();
  }, []);

  const filteredRefunds = useMemo(() => {
    return refunds.filter((refund) =>
      [refund.id, refund.guestProfileId, refund.refundReason]
        .join(' ')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [refunds, searchQuery]);

  const stats = useMemo(() => {
    const total = refunds.length;
    const completed = refunds.filter((r) => r.status === 'completed').length;
    const pending = refunds.filter((r) => r.status === 'pending').length;
    const totalAmount = refunds.reduce((sum, r) => sum + r.refundAmount, 0);

    return { total, completed, pending, totalAmount };
  }, [refunds]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">Historique des remboursements</h2>
        <p className="text-gray-500">Suivi de tous les remboursements effectués</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Complétés</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">En attente</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Montant total</p>
                <p className="text-2xl font-semibold text-gray-900">{currencyFormatter.format(stats.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche et actions */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher par ID, client, motif..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-lg"
          />
        </div>
        <button
          onClick={() => loadRefunds()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Actualiser
        </button>
      </div>

      {/* Tableau */}
      <Card className="rounded-3xl border border-gray-100 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <p>Chargement des remboursements...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
              <p className="text-sm text-gray-500 mt-2">Vérifiez les logs de la console pour plus de détails</p>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Aucun remboursement trouvé</p>
              <p className="text-sm mt-2">Les remboursements apparaîtront ici une fois créés</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-xs uppercase tracking-wide text-gray-600 px-6 py-4">ID Remboursement</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-gray-600 px-6 py-4">Client</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-gray-600 px-6 py-4">Montant</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-gray-600 px-6 py-4">Motif</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-gray-600 px-6 py-4">Méthode</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-gray-600 px-6 py-4">Statut</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-gray-600 px-6 py-4">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRefunds.map((refund) => {
                    const statusBadge = statusVariants[refund.status as keyof typeof statusVariants] || { label: refund.status, className: 'bg-gray-100 text-gray-700' };
                    const reasonLabel = reasonVariants[refund.refundReason as keyof typeof reasonVariants] || refund.refundReason;
                    const requestedDate = new Date(refund.requestedAt);
                    const dateStr = requestedDate.toLocaleDateString('fr-FR');
                    const clientProfile = clientProfiles.get(refund.guestProfileId);
                    const clientName = clientProfile 
                      ? `${clientProfile.firstName || ''} ${clientProfile.lastName || ''}`.trim() 
                      : 'Client inconnu';
                    const clientPhone = clientProfile?.phone || refund.phoneNumber || '—';

                    return (
                      <TableRow key={refund.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <TableCell className="text-sm text-gray-900 font-mono px-6 py-4">{refund.id.slice(0, 12)}...</TableCell>
                        <TableCell className="text-sm text-gray-900 px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{clientName}</span>
                              <span className="text-xs text-gray-500">{clientPhone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-gray-900 px-6 py-4">
                          {currencyFormatter.format(refund.refundAmount)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 px-6 py-4">{reasonLabel}</TableCell>
                        <TableCell className="text-sm text-gray-600 px-6 py-4">
                          <span className="capitalize">{refund.paymentMethod || '—'}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className={`${statusBadge.className} px-3 py-1 text-xs rounded-full`}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 px-6 py-4">{dateStr}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
