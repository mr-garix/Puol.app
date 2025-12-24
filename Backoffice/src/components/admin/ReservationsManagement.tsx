import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar as CalendarIcon, MoreVertical, CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';
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

export function ReservationsManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const mockReservations = [
    {
      id: '1',
      property: 'Studio moderne - Bonanjo',
      tenant: 'Marie Kamga',
      checkIn: '15 Mai 2024',
      checkOut: '15 Juin 2024',
      nights: 31,
      pricePerNight: 45000,
      deposit: 45000,
      total: 1395000,
      balance: 1350000,
      amount: '1,395,000 FCFA',
      status: 'confirmed',
      phone: '+237 6XX XX XX XX',
      city: 'Douala',
      date: '10 Mai 2024'
    },
    {
      id: '2',
      property: 'Appartement 2 pièces - Bastos',
      tenant: 'Paul Fotso',
      checkIn: '20 Mai 2024',
      checkOut: '20 Juil 2024',
      nights: 61,
      pricePerNight: 35000,
      deposit: 35000,
      total: 2135000,
      balance: 2100000,
      amount: '2,135,000 FCFA',
      status: 'pending',
      phone: '+237 6YY YY YY YY',
      city: 'Yaoundé',
      date: '12 Mai 2024'
    },
    {
      id: '3',
      property: 'Villa 4 chambres - Bonapriso',
      tenant: 'Aminata Ngono',
      checkIn: '01 Juin 2024',
      checkOut: '01 Sep 2024',
      nights: 92,
      pricePerNight: 120000,
      deposit: 120000,
      total: 11040000,
      balance: 10920000,
      amount: '11,040,000 FCFA',
      status: 'confirmed',
      phone: '+237 6ZZ ZZ ZZ ZZ',
      city: 'Douala',
      date: '08 Mai 2024'
    },
    {
      id: '4',
      property: 'Chambre meublée - Akwa',
      tenant: 'Jean Nkomo',
      checkIn: '10 Mai 2024',
      checkOut: '10 Juin 2024',
      nights: 31,
      pricePerNight: 25000,
      deposit: 25000,
      total: 775000,
      balance: 0,
      amount: '775,000 FCFA',
      status: 'cancelled',
      phone: '+237 6AA AA AA AA',
      city: 'Douala',
      date: '05 Mai 2024'
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
      confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-700' },
      completed: { label: 'Terminée', className: 'bg-blue-100 text-blue-700' },
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const filteredReservations = mockReservations.filter(r =>
    r.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = mockReservations.filter(r => r.status === 'pending').length;
  const confirmedCount = mockReservations.filter(r => r.status === 'confirmed').length;
  const totalRevenue = mockReservations
    .filter(r => r.status === 'confirmed')
    .reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl text-gray-900">Réservations</h1>
        <p className="text-gray-500 mt-1">Gestion des réservations de logements meublés</p>
      </div>

      {/* Stats rapides */}
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
                <p className="text-2xl text-gray-900">{mockReservations.length}</p>
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
                <p className="text-sm text-gray-600">Revenus FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white">
            Toutes ({mockReservations.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white">
            En attente ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="rounded-lg data-[state=active]:bg-white">
            Confirmées ({confirmedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          {/* Recherche */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par propriété, locataire, ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propriété</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Nuits</TableHead>
                  <TableHead>Prix/nuit</TableHead>
                  <TableHead>Avance</TableHead>
                  <TableHead>Reste</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => {
                  const statusBadge = getStatusBadge(reservation.status);
                  return (
                    <TableRow key={reservation.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{reservation.property}</p>
                            <p className="text-xs text-gray-500">{reservation.city}</p>
                          </div>
                        </div>
                      </TableCell>
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
                        {reservation.pricePerNight.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-green-600">
                        {reservation.deposit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-orange-600">
                        {reservation.balance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
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
                            {reservation.status === 'pending' && (
                              <>
                                <DropdownMenuItem className="text-green-600">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Confirmer
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
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
            <h3 className="text-xl text-gray-900 mb-2">{pendingCount} réservations en attente</h3>
            <p className="text-gray-500">En attente de confirmation ou paiement</p>
          </Card>
        </TabsContent>

        <TabsContent value="confirmed" className="mt-6">
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">{confirmedCount} réservations confirmées</h3>
            <p className="text-gray-500">Avance payée (1ère nuit) - Solde à régler à l'arrivée</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}