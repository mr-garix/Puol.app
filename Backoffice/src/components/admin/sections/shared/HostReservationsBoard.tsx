import { useMemo, useState, type ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle,
  DollarSign,
  Eye,
  MapPin,
  MoreVertical,
  Phone,
  Search,
  XCircle,
  ArrowLeft,
} from 'lucide-react';

type HostReservation = {
  id: string;
  property: string;
  propertyType?: string;
  propertyImage?: string;
  host: string;
  tenant: string;
  phone: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  pricePerNight: number;
  deposit: number;
  total: number;
  balance: number;
  status: 'pending' | 'confirmed' | 'cancelled';
};

const hostReservations: HostReservation[] = [
  {
    id: 'HOST-RES-201',
    property: 'Loft Kribi vue mer',
    propertyType: 'Loft premium',
    propertyImage: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=900&q=80',
    host: 'Linda K.',
    tenant: 'Thierry N.',
    phone: '+237 6XX XX XX XX',
    city: 'Kribi',
    checkIn: '18 Déc 2025',
    checkOut: '22 Déc 2025',
    nights: 4,
    pricePerNight: 95000,
    deposit: 95000,
    total: 380000,
    balance: 285000,
    status: 'pending',
  },
  {
    id: 'HOST-RES-202',
    property: 'Appartement Bastos',
    propertyType: 'Appartement',
    propertyImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
    host: 'Pierre T.',
    tenant: 'Sonia F.',
    phone: '+237 6YY YY YY YY',
    city: 'Yaoundé',
    checkIn: '20 Déc 2025',
    checkOut: '05 Jan 2026',
    nights: 16,
    pricePerNight: 65000,
    deposit: 130000,
    total: 1040000,
    balance: 910000,
    status: 'confirmed',
  },
  {
    id: 'HOST-RES-203',
    property: 'Studio Bonamoussadi',
    propertyType: 'Studio',
    propertyImage: 'https://images.unsplash.com/photo-1484100356142-db6ab6244067?auto=format&fit=crop&w=900&q=80',
    host: 'Marc L.',
    tenant: 'Eric D.',
    phone: '+237 6ZZ ZZ ZZ ZZ',
    city: 'Douala',
    checkIn: '12 Déc 2025',
    checkOut: '19 Déc 2025',
    nights: 7,
    pricePerNight: 28000,
    deposit: 28000,
    total: 196000,
    balance: 168000,
    status: 'confirmed',
  },
  {
    id: 'HOST-RES-204',
    property: 'Chambre Akwa business',
    propertyType: 'Chambre',
    propertyImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80',
    host: 'Sandra P.',
    tenant: 'Michel B.',
    phone: '+237 6AA AA AA AA',
    city: 'Douala',
    checkIn: '08 Déc 2025',
    checkOut: '10 Déc 2025',
    nights: 2,
    pricePerNight: 32000,
    deposit: 32000,
    total: 64000,
    balance: 0,
    status: 'cancelled',
  },
];

const statusVariants = {
  pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
  confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-700' },
};

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
});

type HostReservationDetailViewProps = {
  reservation: HostReservation;
  onBack: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

function HostReservationDetailView({ reservation, onBack, onConfirm, onCancel }: HostReservationDetailViewProps) {
  const statusBadge = statusVariants[reservation.status];
  const canConfirm = reservation.status !== 'confirmed';
  const canCancel = reservation.status !== 'cancelled';

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="rounded-full flex items-center gap-2" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Retour aux réservations
      </Button>

      <div className="rounded-3xl border border-gray-100 overflow-hidden">
        <div
          className="h-48 md:h-64 bg-cover bg-center"
          style={{
            backgroundImage: `url(${reservation.propertyImage ?? 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80'})`,
          }}
        />
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Réservation #{reservation.id}</p>
              <h1 className="text-3xl font-semibold text-gray-900">{reservation.property}</h1>
              <p className="text-sm text-gray-500">
                {reservation.propertyType ?? 'Séjour'} · {reservation.city}
              </p>
            </div>
            <Badge className={`${statusBadge.className} px-4 py-1.5 text-sm`}>{statusBadge.label}</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <DetailCard
              icon={CalendarDays}
              label="Période"
              primary={`${reservation.checkIn} → ${reservation.checkOut}`}
              secondary={`${reservation.nights} nuits`}
            />
            <DetailCard icon={MapPin} label="Localisation" primary={reservation.city} secondary="Séjour confirmé" />
            <DetailCard
              icon={DollarSign}
              label="Montant total"
              primary={currencyFormatter.format(reservation.total)}
              secondary={`Prix nuit ${currencyFormatter.format(reservation.pricePerNight)}`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <h2 className="text-sm uppercase tracking-wide text-gray-500">Résumé opérationnel</h2>
              <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                <p className="text-sm text-gray-600">
                  Visualisez les informations essentielles pour ce séjour : statut, références, acomptes et reste à encaisser.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
                  <InfoRow label="Statut" value={statusBadge.label} />
                  <InfoRow label="Référence" value={reservation.id} alignRight />
                  <InfoRow label="Total" value={currencyFormatter.format(reservation.total)} />
                  <InfoRow label="Acompte" value={currencyFormatter.format(reservation.deposit)} alignRight />
                  <InfoRow label="Solde" value={currencyFormatter.format(reservation.balance)} />
                  <InfoRow label="Hôte" value={reservation.host} alignRight />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm uppercase tracking-wide text-gray-500">Voyageur</h2>
              <ContactCard name={reservation.tenant} phone={reservation.phone} />
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Hôte référent</p>
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-sm font-semibold text-gray-900">{reservation.host}</p>
                  <p className="text-xs text-gray-500">Partenaire PUOL+</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200"
              disabled={!canConfirm}
              onClick={onConfirm}
            >
              Confirmer la réservation
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 disabled:text-red-300 disabled:border-red-100"
              disabled={!canCancel}
              onClick={onCancel}
            >
              Annuler la réservation
            </Button>
            <div className="ml-auto text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Reste à percevoir</p>
              <p className="text-sm font-semibold text-orange-600">{currencyFormatter.format(reservation.balance)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      {secondary ? <p className="text-xs text-gray-500">{secondary}</p> : null}
    </div>
  );
}

function ContactCard({ name, phone }: { name: string; phone: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-500">Voyageur vérifié</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Phone className="w-4 h-4 text-gray-400" />
        {phone}
      </div>
    </div>
  );
}

function InfoRow({ label, value, alignRight = false }: { label: string; value: string; alignRight?: boolean }) {
  return (
    <>
      <span>{label}</span>
      <span className={alignRight ? 'text-right font-semibold' : 'font-semibold'}>{value}</span>
    </>
  );
}

export function HostReservationsBoard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [reservations, setReservations] = useState(hostReservations);
  const [focusedReservation, setFocusedReservation] = useState<HostReservation | null>(null);

  const { filteredReservations, pendingCount, confirmedCount, totalRevenue } = useMemo(() => {
    const filtered = reservations.filter((reservation) =>
      [reservation.property, reservation.tenant, reservation.city]
        .join(' ')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

    const pending = reservations.filter((reservation) => reservation.status === 'pending').length;
    const confirmed = reservations.filter((reservation) => reservation.status === 'confirmed').length;
    const revenue = reservations
      .filter((reservation) => reservation.status === 'confirmed')
      .reduce((sum, reservation) => sum + reservation.total, 0);

    return {
      filteredReservations: filtered,
      pendingCount: pending,
      confirmedCount: confirmed,
      totalRevenue: revenue,
    };
  }, [searchQuery, reservations]);

  const updateReservationStatus = (reservationId: string, status: HostReservation['status']) => {
    setReservations((prev) => prev.map((reservation) => (reservation.id === reservationId ? { ...reservation, status } : reservation)));
    setFocusedReservation((prev) => (prev?.id === reservationId ? { ...prev, status } : prev));
  };

  const handleViewReservation = (reservation: HostReservation) => {
    setFocusedReservation(reservation);
  };

  const handleConfirmReservation = (reservation: HostReservation) => {
    updateReservationStatus(reservation.id, 'confirmed');
  };

  const handleCancelReservation = (reservation: HostReservation) => {
    updateReservationStatus(reservation.id, 'cancelled');
  };

  if (focusedReservation) {
    return (
      <HostReservationDetailView
        reservation={focusedReservation}
        onBack={() => setFocusedReservation(null)}
        onConfirm={() => handleConfirmReservation(focusedReservation)}
        onCancel={() => handleCancelReservation(focusedReservation)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl text-gray-900">Réservations hôtes</h2>
        <p className="text-gray-500">Même expérience que l’onglet Gestion pour monitorer les flux hôtes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <CalendarIcon className="w-5 h-5 text-orange-600" />
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
              <div className="p-3 bg-blue-100 rounded-xl">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">{reservations.length}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#2ECC71] bg-opacity-20 rounded-xl">
                <DollarSign className="w-5 h-5 text-[#2ECC71]" />
              </div>
              <div>
                <p className="text-xl text-gray-900">{(totalRevenue / 1000000).toFixed(1)}M</p>
                <p className="text-sm text-gray-600">Revenus confirmés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white">
            Toutes ({reservations.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white">
            En attente ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="rounded-lg data-[state=active]:bg-white">
            Confirmées ({confirmedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par propriété, locataire, ville..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
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
                  <TableHead>Hôte</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Nuits</TableHead>
                  <TableHead>Prix/nuit</TableHead>
                  <TableHead>Avance</TableHead>
                  <TableHead>Reste</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Détail</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => {
                  const statusBadge = statusVariants[reservation.status];
                  return (
                    <TableRow key={reservation.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                            {reservation.propertyImage ? (
                              <img
                                src={reservation.propertyImage}
                                alt={reservation.property}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <MapPin className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{reservation.property}</p>
                            <p className="text-xs text-gray-500">
                              {reservation.propertyType ?? 'Séjour'} · {reservation.city}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">{reservation.host}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-gray-900">{reservation.tenant}</p>
                          <p className="text-xs text-gray-500">{reservation.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-gray-900">{reservation.checkIn}</p>
                          <p className="text-xs text-gray-500">→ {reservation.checkOut}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{reservation.nights}</TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {currencyFormatter.format(reservation.pricePerNight)}
                      </TableCell>
                      <TableCell className="text-sm text-green-600">
                        {currencyFormatter.format(reservation.deposit)}
                      </TableCell>
                      <TableCell className="text-sm text-orange-600">
                        {currencyFormatter.format(reservation.balance)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => handleViewReservation(reservation)}
                        >
                          Voir le détail
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewReservation(reservation)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {reservation.status === 'pending' && (
                              <>
                                <DropdownMenuItem className="text-green-600" onClick={() => handleConfirmReservation(reservation)}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Confirmer
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => handleCancelReservation(reservation)}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Annuler
                                </DropdownMenuItem>
                              </>
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

        <TabsContent value="pending" className="mt-6">
          <Card className="p-8 text-center">
            <CalendarIcon className="w-12 h-12 mx-auto text-orange-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">
              {pendingCount} réservations hôtes en attente
            </h3>
            <p className="text-gray-500">À confirmer côté hôte ou en attente de paiement</p>
          </Card>
        </TabsContent>

        <TabsContent value="confirmed" className="mt-6">
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">
              {confirmedCount} réservations hôtes confirmées
            </h3>
            <p className="text-gray-500">Acompte encaissé. Solde à reverser aux hôtes</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
