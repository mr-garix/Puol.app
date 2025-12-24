import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';

export function PaymentsSection() {
  const transactions = [
    { id: 'TX001', type: 'visit', amount: 5000, provider: 'Orange Money', user: 'Marie K.', status: 'completed', date: '2024-01-15 14:30' },
    { id: 'TX002', type: 'reservation', amount: 45000, provider: 'MTN MoMo', user: 'Paul N.', status: 'pending', date: '2024-01-15 13:15' },
    { id: 'TX003', type: 'visit', amount: 5000, provider: 'Orange Money', user: 'Sarah M.', status: 'failed', date: '2024-01-15 12:00' },
    { id: 'TX004', type: 'reservation', amount: 120000, provider: 'MTN MoMo', user: 'Jean F.', status: 'completed', date: '2024-01-14 18:45' },
  ];

  const payouts = [
    { id: 'PO001', host: 'Marie Kamga', amount: 180000, period: 'Janvier 2024', status: 'pending', properties: 3 },
    { id: 'PO002', host: 'Paul Nkomo', amount: 450000, period: 'Janvier 2024', status: 'completed', properties: 5 },
    { id: 'PO003', host: 'Jean Fotso', amount: 320000, period: 'Janvier 2024', status: 'pending', properties: 2 },
  ];

  const getTransactionStatusBadge = (status: string) => {
    const variants = {
      completed: { label: 'Complété', className: 'bg-green-100 text-green-700' },
      pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
      failed: { label: 'Échec', className: 'bg-red-100 text-red-700' },
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">Paiements & Payouts</h1>
          <p className="text-gray-500 mt-1">Gestion financière de la plateforme</p>
        </div>
        <Button className="bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-xl">
          <Download className="w-4 h-4 mr-2" />
          Export comptable
        </Button>
      </div>

      {/* KPIs financiers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">12,5M</p>
                <p className="text-sm text-gray-600">Revenus ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">456</p>
                <p className="text-sm text-gray-600">Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">2,8M</p>
                <p className="text-sm text-gray-600">Payouts en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">3</p>
                <p className="text-sm text-gray-600">Paiements en échec</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-white">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="payouts" className="rounded-lg data-[state=active]:bg-white">
            Payouts hôtes
          </TabsTrigger>
          <TabsTrigger value="refunds" className="rounded-lg data-[state=active]:bg-white">
            Remboursements
          </TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-lg data-[state=active]:bg-white">
            Intégrations
          </TabsTrigger>
        </TabsList>

        {/* Transactions */}
        <TabsContent value="transactions" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Historique des transactions</CardTitle>
              <Button variant="outline" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Transaction</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Moyen de paiement</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const statusBadge = getTransactionStatusBadge(tx.status);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-gray-900">{tx.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tx.type === 'visit' ? 'Visite' : 'Réservation'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {tx.amount.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{tx.provider}</TableCell>
                      <TableCell className="text-sm text-gray-600">{tx.user}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{tx.date}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Payouts */}
        <TabsContent value="payouts" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Paiements aux hôtes</CardTitle>
              <Button className="bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-xl">
                Traiter les payouts
              </Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Payout</TableHead>
                  <TableHead>Hôte</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Propriétés</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => {
                  const statusBadge = getTransactionStatusBadge(payout.status);
                  return (
                    <TableRow key={payout.id}>
                      <TableCell className="text-sm text-gray-900">{payout.id}</TableCell>
                      <TableCell className="text-sm text-gray-900">{payout.host}</TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {payout.amount.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{payout.period}</TableCell>
                      <TableCell className="text-sm text-gray-600">{payout.properties} annonces</TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payout.status === 'pending' && (
                          <Button size="sm" variant="outline" className="rounded-lg">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Valider
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Remboursements */}
        <TabsContent value="refunds" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assistant de remboursement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <h4 className="text-sm text-blue-900 mb-2">Politique de remboursement</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Annulation {'<'}24h : 50% de remboursement</li>
                  <li>• Annulation {'≥'}24h : Aucun remboursement</li>
                  <li>• Support peut approuver des remboursements exceptionnels (avec seuil)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intégrations */}
        <TabsContent value="integrations" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Orange Money</CardTitle>
                  <Badge className="bg-green-100 text-green-700">Actif</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Statut API</span>
                  <span className="text-green-600">Opérationnel</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transactions ce mois</span>
                  <span className="text-gray-900">234</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taux de réussite</span>
                  <span className="text-gray-900">98.5%</span>
                </div>
                <Button variant="outline" className="w-full rounded-xl mt-4">
                  Configurer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>MTN Mobile Money</CardTitle>
                  <Badge className="bg-green-100 text-green-700">Actif</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Statut API</span>
                  <span className="text-green-600">Opérationnel</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transactions ce mois</span>
                  <span className="text-gray-900">198</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taux de réussite</span>
                  <span className="text-gray-900">97.2%</span>
                </div>
                <Button variant="outline" className="w-full rounded-xl mt-4">
                  Configurer
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}