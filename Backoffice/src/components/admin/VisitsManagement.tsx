import { useMemo, useState, type ComponentType } from 'react';
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
};

interface VisitsBoardProps {
  visits: VisitRecord[];
  feeLabel?: string;
  feeAmount?: string;
  searchPlaceholder?: string;
  onViewVisit?: (visit: VisitRecord) => void;
  onConfirmVisit?: (visit: VisitRecord) => void;
  onCancelVisit?: (visit: VisitRecord) => void;
}

const defaultVisits: VisitRecord[] = [
  {
    id: 'VIS-301',
    property: 'Studio moderne - Bonanjo',
    propertyImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80',
    propertyType: 'Studio',
    visitor: 'Isabelle Ndongo',
    date: '18 Déc 2025',
    time: '10:00',
    status: 'confirmed',
    paymentStatus: 'paid',
    amount: '5 000 FCFA',
    phone: '+237 6XX XX XX XX',
    city: 'Douala',
  },
  {
    id: 'VIS-302',
    property: 'Appartement 2 pièces - Bastos',
    propertyImage: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=400&q=80',
    propertyType: 'Appartement',
    visitor: 'Lydie Kamdem',
    date: '20 Déc 2025',
    time: '14:30',
    status: 'pending',
    paymentStatus: 'paid',
    amount: '5 000 FCFA',
    phone: '+237 6YY YY YY YY',
    city: 'Yaoundé',
  },
  {
    id: 'VIS-303',
    property: 'Villa 4 chambres - Bonapriso',
    propertyImage: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=400&q=80',
    propertyType: 'Villa',
    visitor: 'Emmanuel Talla',
    date: '22 Déc 2025',
    time: '11:00',
    status: 'confirmed',
    paymentStatus: 'paid',
    amount: '5 000 FCFA',
    phone: '+237 6ZZ ZZ ZZ ZZ',
    city: 'Douala',
  },
  {
    id: 'VIS-304',
    property: 'Chambre meublée - Akwa',
    propertyImage: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=400&q=80',
    propertyType: 'Chambre',
    visitor: 'Brice Kom',
    date: '17 Déc 2025',
    time: '15:00',
    status: 'cancelled',
    paymentStatus: 'paid',
    amount: '2 500 FCFA',
    phone: '+237 6AA AA AA AA',
    city: 'Douala',
  },
];

export function VisitsManagement() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Visites</h1>
        <p className="text-gray-500 mt-1">
          Gestion centralisée des visites programmées pour les logements non-meublés
        </p>
      </div>

      <VisitsBoard visits={defaultVisits} />
    </div>
  );
}

type VisitDetailViewProps = {
  visit: VisitRecord;
  onBack: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  feeLabel: string;
  feeAmount: string;
};

function VisitDetailView({ visit, onBack, onConfirm, onCancel, feeLabel, feeAmount }: VisitDetailViewProps) {
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

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <h2 className="text-sm uppercase tracking-wide text-gray-500">Résumé opérationnel</h2>
              <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                <p className="text-sm text-gray-600">
                  Toutes les informations nécessaires pour assurer le suivi de la visite (statut, paiement, contacts).
                  Une fois connecté au backend, confirmer la visite pourra déclencher la création de bail et la mise hors
                  ligne de l’annonce.
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                  <span>Statut</span>
                  <span className="text-right font-semibold">{getStatusBadge(visit.status).label}</span>
                  <span>Référence</span>
                  <span className="text-right">{visit.id}</span>
                  <span>{feeLabel}</span>
                  <span className="text-right">{feeAmount}</span>
                </div>
              </div>
            </div>

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
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200"
              disabled={visit.status === 'confirmed'}
              onClick={onConfirm}
            >
              Confirmer la visite
            </Button>
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
  feeLabel = 'Frais de visite',
  feeAmount = '5 000 FCFA',
  searchPlaceholder = 'Rechercher par propriété, visiteur, ville...',
  onViewVisit,
  onConfirmVisit,
  onCancelVisit,
}: VisitsBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedVisit, setFocusedVisit] = useState<VisitRecord | null>(null);

  const pendingCount = useMemo(() => visits.filter((v) => v.status === 'pending').length, [visits]);
  const confirmedCount = useMemo(() => visits.filter((v) => v.status === 'confirmed').length, [visits]);
  const cancelledCount = useMemo(() => visits.filter((v) => v.status === 'cancelled').length, [visits]);

  const filteredVisits = useMemo(
    () =>
      visits.filter(
        (v) =>
          v.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.visitor.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.city.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [visits, searchQuery],
  );

  const getVisitsForTab = (status: 'all' | VisitStatus) =>
    status === 'all' ? filteredVisits : filteredVisits.filter((visit) => visit.status === status);

  const handleConfirm = (visit: VisitRecord) => {
    onConfirmVisit?.(visit);
    setFocusedVisit((prev) => (prev?.id === visit.id ? { ...prev, status: 'confirmed' } : prev));
  };

  const handleCancel = (visit: VisitRecord) => {
    onCancelVisit?.(visit);
    setFocusedVisit((prev) => (prev?.id === visit.id ? { ...prev, status: 'cancelled' } : prev));
  };

  if (focusedVisit) {
    return (
      <VisitDetailView
        visit={focusedVisit}
        onBack={() => setFocusedVisit(null)}
        onConfirm={() => handleConfirm(focusedVisit)}
        onCancel={() => handleCancel(focusedVisit)}
        feeLabel={feeLabel}
        feeAmount={feeAmount}
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
              const canConfirm = visit.status !== 'confirmed';
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
                      <p className="text-xs text-gray-500">Client PUOL</p>
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
                        className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-emerald-200 disabled:text-white/80 border-0 shadow-sm"
                        disabled={!canConfirm}
                        onClick={() => {
                          if (!canConfirm) return;
                          handleConfirm(visit);
                        }}
                      >
                        Confirmer
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card>
          <CardContent className="p-6">
            <div className="bg-blue-50 p-3 rounded-xl">
              <p className="text-xs text-blue-900 mb-1">{feeLabel}</p>
              <p className="text-lg text-blue-900">{feeAmount}</p>
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
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white">
            En attente ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="rounded-lg data-[state=active]:bg-white">
            Confirmées ({confirmedCount})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-lg data-[state=active]:bg-white">
            Annulées ({cancelledCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          {renderVisitsTable(getVisitsForTab('all'))}
        </TabsContent>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {renderVisitsTable(getVisitsForTab('pending'))}
        </TabsContent>

        <TabsContent value="confirmed" className="mt-6 space-y-4">
          {renderVisitsTable(getVisitsForTab('confirmed'))}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6 space-y-4">
          {renderVisitsTable(getVisitsForTab('cancelled'))}
        </TabsContent>
      </Tabs>

    </div>
  );
}