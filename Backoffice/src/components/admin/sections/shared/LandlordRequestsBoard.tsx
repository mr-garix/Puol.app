import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar';
import {
  Search,
  Filter,
  MapPin,
  Phone,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import type { LandlordRequest, LandlordRequestStatus } from '../../UsersManagement';
import { approveLandlordApplication, rejectLandlordApplication } from '@/lib/services/landlords';

type LandlordRequestsBoardProps = {
  requests: LandlordRequest[];
};

const statusLabels: Record<LandlordRequestStatus, string> = {
  pending: 'À vérifier',
  approved: 'Approuvé',
  rejected: 'Rejeté'
};

const statusBadgeStyles: Record<LandlordRequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-100'
};

const statusIcons: Record<LandlordRequestStatus, ReactNode> = {
  pending: <Clock3 className="w-3.5 h-3.5" />,
  approved: <CheckCircle2 className="w-3.5 h-3.5" />,
  rejected: <AlertTriangle className="w-3.5 h-3.5" />
};

export function LandlordRequestsBoard({ requests }: LandlordRequestsBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LandlordRequestStatus>('all');
  const [cityFilter, setCityFilter] = useState<'all' | string>('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [statusOverrides, setStatusOverrides] = useState<Record<string, LandlordRequestStatus>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);

  const getStatus = (request: LandlordRequest) => statusOverrides[request.id] ?? request.status;

  const stats = useMemo(() => {
    return (['pending', 'approved', 'rejected'] as LandlordRequestStatus[]).map((status) => ({
      status,
      count: requests.filter((request) => getStatus(request) === status).length
    }));
  }, [requests, statusOverrides]);

  const cities = useMemo(() => {
    return Array.from(new Set(requests.map((request) => request.city))).sort((a, b) =>
      a.localeCompare(b, 'fr-FR')
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const effectiveStatus = getStatus(request);
      const matchesSearch =
        request.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
      const matchesCity = cityFilter === 'all' || request.city === cityFilter;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [requests, searchQuery, statusFilter, cityFilter, statusOverrides]);

  const selectedRequest = useMemo(() => {
    return requests.find((request) => request.id === selectedRequestId) ?? null;
  }, [requests, selectedRequestId]);

  const handleApprove = async (request: LandlordRequest) => {
    if (!request || !request.profileId) {
      setActionError('Impossible de valider : profil lié manquant.');
      return;
    }
    setIsProcessing(true);
    setProcessingAction('approve');
    setActionError(null);
    try {
      const ok = await approveLandlordApplication(request.id, request.profileId);
      if (!ok) {
        setActionError("Échec de l'approbation sur Supabase.");
        return;
      }
      setStatusOverrides((prev) => ({ ...prev, [request.id]: 'approved' }));
    } catch (error) {
      console.warn('[LandlordRequestsBoard] approve failed', error);
      setActionError("Une erreur est survenue lors de l'approbation.");
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleReject = async (request: LandlordRequest) => {
    if (!request || !request.profileId) {
      setActionError('Impossible de refuser : profil lié manquant.');
      return;
    }
    setIsProcessing(true);
    setProcessingAction('reject');
    setActionError(null);
    try {
      const ok = await rejectLandlordApplication(request.id, request.profileId);
      if (!ok) {
        setActionError("Échec du refus sur Supabase.");
        return;
      }
      setStatusOverrides((prev) => ({ ...prev, [request.id]: 'rejected' }));
    } catch (error) {
      console.warn('[LandlordRequestsBoard] reject failed', error);
      setActionError("Une erreur est survenue lors du refus.");
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleViewRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
  };

  if (viewMode === 'detail' && selectedRequest) {
    const status = getStatus(selectedRequest);
    return (
      <LandlordRequestDetailView
        request={selectedRequest}
        onBack={handleBackToList}
        onApprove={handleApprove}
        onReject={handleReject}
        isProcessing={isProcessing}
        processingAction={processingAction}
        actionError={actionError}
        status={status}
        statusBadgeStyles={statusBadgeStyles}
        statusIcons={statusIcons}
        statusLabels={statusLabels}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map(({ status, count }) => (
          <Card key={status}>
            <CardContent className="p-5 space-y-2">
              <p className="text-sm text-gray-500 uppercase">{statusLabels[status]}</p>
              <p className="text-3xl font-semibold text-gray-900">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Input
                placeholder="Rechercher par nom, contact ou ville..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10 rounded-xl"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select
                value={statusFilter}
                onValueChange={(value: 'all' | LandlordRequestStatus) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="pending">À vérifier</SelectItem>
                  <SelectItem value="approved">Approuvé</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={cityFilter}
                onValueChange={(value: 'all' | string) => setCityFilter(value)}
              >
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Portefeuille</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-gray-50/80">
                    <TableCell className="text-sm text-gray-500">{request.submittedAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="border border-gray-100">
                          <AvatarImage src={request.avatarUrl} alt={request.fullName} />
                          <AvatarFallback>
                            {request.firstName.charAt(0)}
                            {request.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{request.fullName}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {request.city}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {request.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      <div className="space-y-1">
                        <span>{request.unitsPortfolio} unités</span>
                        {request.propertyTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {request.propertyTypes.map((type) => (
                              <Badge key={type} variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-full gap-1 ${statusBadgeStyles[getStatus(request)]}`}>
                        {statusIcons[getStatus(request)]}
                        {statusLabels[getStatus(request)]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => handleViewRequest(request.id)}
                      >
                        Voir la candidature
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredRequests.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <Filter className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-gray-600">Aucune demande ne correspond à ces critères.</p>
                <p className="text-sm text-gray-400">
                  Ajustez les filtres ou réinitialisez la recherche.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type LandlordRequestDetailViewProps = {
  request: LandlordRequest;
  onBack: () => void;
  onApprove: (request: LandlordRequest) => void;
  onReject: (request: LandlordRequest) => void;
  isProcessing: boolean;
  processingAction: 'approve' | 'reject' | null;
  actionError: string | null;
  status: LandlordRequestStatus;
  statusLabels: Record<LandlordRequestStatus, string>;
  statusBadgeStyles: Record<LandlordRequestStatus, string>;
  statusIcons: Record<LandlordRequestStatus, ReactNode>;
};

function LandlordRequestDetailView({
  request,
  onBack,
  onApprove,
  onReject,
  isProcessing,
  processingAction,
  actionError,
  status,
  statusLabels,
  statusBadgeStyles,
  statusIcons
}: LandlordRequestDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux demandes
        </Button>
        {status !== 'approved' && (
          <Button className="rounded-full" disabled={isProcessing} onClick={() => onApprove(request)}>
            {isProcessing ? 'Approbation...' : 'Approuver la demande'}
          </Button>
        )}
        <Badge variant="outline" className="rounded-full text-xs">
          Demande #{request.id}
        </Badge>
      </div>

      {actionError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="text-red-700 text-sm py-3">{actionError}</CardContent>
        </Card>
      ) : null}

      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-20 border-4 border-white/30">
              <AvatarImage src={request.avatarUrl} alt={request.fullName} />
              <AvatarFallback className="text-lg">
                {request.firstName.charAt(0)}
                {request.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white/70 text-sm uppercase">Candidat landlord</p>
              <h1 className="text-3xl font-semibold">{request.fullName}</h1>
              <p className="text-white/80 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-white/70" />
                {request.city}
              </p>
            </div>
          </div>
          <Badge
            className={`rounded-full gap-1 px-4 py-1.5 text-base ${statusBadgeStyles[status]}`}
          >
            {statusIcons[status]}
            {statusLabels[status]}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 rounded-3xl">
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-sm text-gray-500 uppercase">Résumé de la candidature</p>
            </div>
            {request.motivation.trim().length > 0 && (
              <p className="text-base leading-relaxed text-gray-700">{request.motivation}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 uppercase">Portefeuille</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {request.unitsPortfolio} unités
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 uppercase">Types de biens</p>
                {request.propertyTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {request.propertyTypes.map((type) => (
                      <Badge key={type} variant="secondary" className="rounded-lg">
                        {type}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-lg text-gray-400 mt-2">—</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase">Contacts</p>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone className="w-4 h-4 text-gray-400" />
                {request.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400" />
                {request.city}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase">Documents reçus</p>
              <div className="flex flex-wrap gap-2">
                {request.documents.map((doc) => (
                  <Badge key={doc} variant="secondary" className="rounded-lg">
                    {doc}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  disabled={isProcessing || status === 'rejected'}
                  onClick={() => onReject(request)}
                >
                  {processingAction === 'reject'
                    ? 'Refus...'
                    : status === 'rejected'
                      ? 'Déjà refusé'
                      : 'Refuser'}
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  disabled={isProcessing || status === 'approved'}
                  onClick={() => onApprove(request)}
                >
                  {processingAction === 'approve'
                    ? 'Approbation...'
                    : status === 'approved'
                      ? 'Déjà approuvé'
                      : 'Approuver'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
