import { useState } from 'react';
import { Search, Filter, MoreVertical, Eye, CheckCircle, XCircle, Clock, MapPin, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { UnfurnishedCommissionDialog } from '../UnfurnishedCommissionDialog';
import { UNIFIED_PROPERTIES } from '../../../lib/mockDataUnified';

interface Property {
  id: string;
  title: string;
  type: string;
  city: string;
  district: string;
  price: number;
  priceType: 'jour' | 'mois';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  host: string;
  createdAt: string;
  furnished: boolean;
  images: number;
  videos: number;
}

export function PropertiesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const mockProperties: Property[] = [
    {
      id: '1',
      title: 'Studio meublé moderne - Bonanjo',
      type: 'Studio',
      city: 'Douala',
      district: 'Bonanjo',
      price: 45000,
      priceType: 'jour',
      status: 'approved',
      host: 'Marie Kamga',
      createdAt: '2024-01-15',
      furnished: true,
      images: 8,
      videos: 2
    },
    {
      id: '2',
      title: 'Appartement 2 chambres - Bastos',
      type: 'Appartement',
      city: 'Yaoundé',
      district: 'Bastos',
      price: 250000,
      priceType: 'mois',
      status: 'approved',
      host: 'Paul Nkomo',
      createdAt: '2024-01-14',
      furnished: false,
      images: 12,
      videos: 1
    },
    {
      id: '3',
      title: 'Chambre meublée - Akwa',
      type: 'Chambre',
      city: 'Douala',
      district: 'Akwa',
      price: 25000,
      priceType: 'jour',
      status: 'pending',
      host: 'Sarah Mbida',
      createdAt: '2024-01-15',
      furnished: true,
      images: 5,
      videos: 1
    },
    {
      id: '4',
      title: 'Villa 4 chambres - Bonapriso',
      type: 'Villa',
      city: 'Douala',
      district: 'Bonapriso',
      price: 450000,
      priceType: 'mois',
      status: 'approved',
      host: 'Jean Tchoua',
      createdAt: '2024-01-13',
      furnished: false,
      images: 15,
      videos: 3
    },
    {
      id: '5',
      title: 'Appartement 3 pièces - Biyem-Assi',
      type: 'Appartement',
      city: 'Yaoundé',
      district: 'Biyem-Assi',
      price: 180000,
      priceType: 'mois',
      status: 'approved',
      host: 'Grace Fotso',
      createdAt: '2024-01-12',
      furnished: false,
      images: 10,
      videos: 1
    },
  ];

  const handleContractSigned = (property: Property) => {
    setSelectedProperty(property);
    setCommissionDialogOpen(true);
  };

  const handleCommissionValidated = (monthlyRent: number, commission: number) => {
    console.log('Commission validée:', { monthlyRent, commission, property: selectedProperty });
    // TODO: Appel API pour enregistrer la commission
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
      approved: { label: 'Approuvée', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Refusée', className: 'bg-red-100 text-red-700' },
      suspended: { label: 'Suspendue', className: 'bg-gray-100 text-gray-700' },
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const filteredProperties = mockProperties.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.district.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = mockProperties.filter(p => p.status === 'pending').length;

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">Annonces</h1>
          <p className="text-gray-500 mt-1">Gestion des propriétés et modération</p>
        </div>
        <Button className="bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-xl">
          Nouvelle annonce
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white">
            Toutes ({mockProperties.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white">
            En attente ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-white">
            Approuvées
          </TabsTrigger>
          <TabsTrigger value="moderation" className="rounded-lg data-[state=active]:bg-white">
            File de modération
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          {/* Filtres */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher par titre, ville, quartier..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvées</SelectItem>
                    <SelectItem value="rejected">Refusées</SelectItem>
                    <SelectItem value="suspended">Suspendues</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="Chambre">Chambre</SelectItem>
                    <SelectItem value="Appartement">Appartement</SelectItem>
                    <SelectItem value="Villa">Villa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Annonce</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Hôte</TableHead>
                  <TableHead>Médias</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((property) => {
                  const statusBadge = getStatusBadge(property.status);
                  return (
                    <TableRow key={property.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{property.title}</p>
                            {property.furnished && (
                              <Badge variant="secondary" className="mt-1 text-xs">Meublé</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{property.type}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-gray-900">{property.city}</p>
                          <p className="text-gray-500">{property.district}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-gray-900">{property.price.toLocaleString()} FCFA</p>
                          <p className="text-gray-500">/ {property.priceType}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{property.host}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>{property.images} photos</span>
                          <span>{property.videos} vidéos</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{property.createdAt}</TableCell>
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
                            {!property.furnished && property.status === 'approved' && (
                              <DropdownMenuItem 
                                className="text-[#2ECC71]"
                                onClick={() => handleContractSigned(property)}
                              >
                                <FileCheck className="w-4 h-4 mr-2" />
                                Contrat signé
                              </DropdownMenuItem>
                            )}
                            {property.status === 'pending' && (
                              <>
                                <DropdownMenuItem className="text-green-600">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approuver
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Refuser
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
            <Clock className="w-12 h-12 mx-auto text-orange-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">File de modération</h3>
            <p className="text-gray-500">{pendingCount} annonces en attente de validation</p>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Annonces approuvées</h3>
            <p className="text-gray-500">Liste des annonces validées et en ligne</p>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <Card className="p-8 text-center">
            <Filter className="w-12 h-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Modération avancée</h3>
            <p className="text-gray-500">Outils de modération et vérification automatique</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Commission Dialog */}
      <UnfurnishedCommissionDialog
        open={commissionDialogOpen}
        onOpenChange={setCommissionDialogOpen}
        onCommissionValidated={handleCommissionValidated}
        propertyName={selectedProperty?.title}
        propertyId={selectedProperty?.id}
      />
    </div>
  );
}