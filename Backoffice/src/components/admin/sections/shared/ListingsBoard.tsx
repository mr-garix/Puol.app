import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, CheckCircle, Clock, Filter } from 'lucide-react';

export type ListingStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type ListingRecord = {
  id: string;
  title: string;
  type: string;
  city: string;
  district: string;
  price: number;
  priceType: 'jour' | 'mois';
  status: ListingStatus;
  owner: string;
  ownerLabel: string;
  images?: number;
  videos?: number;
  createdAt: string;
  furnished?: boolean;
  previewUrl?: string | null;
  visits?: number;
};

export type ListingFilters = {
  search: string;
  status: string;
  type: string;
};

type ListingsBoardProps = {
  listings: ListingRecord[];
  filters: ListingFilters;
  onFilterChange: (patch: Partial<ListingFilters>) => void;
  title: string;
  description: string;
  ownerLabel: string;
  hideHeader?: boolean;
  onViewListing?: (listingId: string) => void;
};

const getListingStatusBadge = (status: ListingStatus) => {
  const variants = {
    pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
    approved: { label: 'Approuvée', className: 'bg-green-100 text-green-700' },
    rejected: { label: 'Refusée', className: 'bg-red-100 text-red-700' },
    suspended: { label: 'Suspendue', className: 'bg-gray-100 text-gray-700' },
  };
  return variants[status];
};

export function ListingsBoard({
  listings,
  filters,
  onFilterChange,
  title,
  description,
  ownerLabel,
  hideHeader = false,
  onViewListing,
}: ListingsBoardProps) {
  const pendingCount = useMemo(
    () => listings.filter((item) => item.status === 'pending').length,
    [listings],
  );

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        const matchesSearch =
          listing.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          listing.city.toLowerCase().includes(filters.search.toLowerCase()) ||
          listing.district.toLowerCase().includes(filters.search.toLowerCase());
        const matchesStatus = filters.status === 'all' || listing.status === filters.status;
        const matchesType = filters.type === 'all' || listing.type === filters.type;
        return matchesSearch && matchesStatus && matchesType;
      }),
    [filters, listings],
  );

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-900">{title}</h2>
            <p className="text-gray-500 mt-1">{description}</p>
          </div>
          <Button className="bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-xl">
            Nouvelle annonce
          </Button>
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white">
            Toutes ({listings.length})
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
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[220px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher par titre, ville, quartier..."
                      value={filters.search}
                      onChange={(e) => onFilterChange({ search: e.target.value })}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>
                <Select value={filters.status} onValueChange={(value) => onFilterChange({ status: value })}>
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
                <Select value={filters.type} onValueChange={(value) => onFilterChange({ type: value })}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="Chambre">Chambre</SelectItem>
                    <SelectItem value="Appartement">Appartement</SelectItem>
                    <SelectItem value="Villa">Villa</SelectItem>
                    <SelectItem value="Loft">Loft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Annonce</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>{ownerLabel}</TableHead>
                  <TableHead>Visites</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.map((listing) => {
                  const statusBadge = getListingStatusBadge(listing.status);
                  return (
                    <TableRow key={listing.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div
                            className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex items-center justify-center"
                          >
                            {listing.previewUrl ? (
                              <img
                                src={listing.previewUrl}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <MapPin className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{listing.title}</p>
                            <p className="text-[11px] text-gray-500">{listing.type}</p>
                            {listing.furnished && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                Meublé
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-xs text-gray-500">
                          <p className="text-gray-900 text-sm font-medium">{listing.city}</p>
                          <p>{listing.district}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-sm">
                          <p className="text-gray-900 text-sm font-semibold">{listing.price.toLocaleString('fr-FR')} FCFA</p>
                          <p className="text-xs text-gray-500">/ {listing.priceType}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 align-top">{listing.owner}</TableCell>
                      <TableCell className="align-top">
                        <span className="text-sm font-semibold text-gray-900">
                          {(listing.visits ?? 0).toLocaleString('fr-FR')}
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 align-top">{listing.createdAt}</TableCell>
                      <TableCell className="text-right align-top">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => onViewListing?.(listing.id)}
                          disabled={!onViewListing}
                        >
                          Voir l’annonce
                        </Button>
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
            <p className="text-gray-500">Outils de vérification automatique</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
