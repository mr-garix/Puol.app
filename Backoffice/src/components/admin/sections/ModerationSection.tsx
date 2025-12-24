import { Shield, AlertTriangle, Eye, CheckCircle, XCircle, Flag } from 'lucide-react';
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

export function ModerationSection() {
  const fraudAlerts = [
    { id: 1, type: 'multi_account', user: 'user_12345', phone: '+237 6XX XX XX XX', devices: 3, severity: 'high' },
    { id: 2, type: 'otp_spam', user: 'user_67890', phone: '+237 6YY YY YY YY', attempts: 15, severity: 'medium' },
  ];

  const flaggedContent = [
    { id: 1, type: 'property', title: 'Annonce suspecte - Prix anormal', reporter: 'system', reason: 'Prix trop bas' },
    { id: 2, type: 'review', title: 'Avis signalé - Contenu inapproprié', reporter: 'user_456', reason: 'Langage offensant' },
    { id: 3, type: 'image', title: 'Photo signalée - Nudité détectée', reporter: 'system', reason: 'Auto-détection' },
  ];

  const getSeverityBadge = (severity: string) => {
    const variants = {
      high: { label: 'Élevé', className: 'bg-red-100 text-red-700' },
      medium: { label: 'Moyen', className: 'bg-orange-100 text-orange-700' },
      low: { label: 'Faible', className: 'bg-yellow-100 text-yellow-700' },
    };
    return variants[severity as keyof typeof variants] || variants.medium;
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl text-gray-900">Modération & Sécurité</h1>
        <p className="text-gray-500 mt-1">Surveillance et protection de la plateforme</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">12</p>
                <p className="text-sm text-gray-600">Alertes actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Flag className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">8</p>
                <p className="text-sm text-gray-600">Signalements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">45</p>
                <p className="text-sm text-gray-600">En révision</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">156</p>
                <p className="text-sm text-gray-600">Bloqués ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fraud" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="fraud" className="rounded-lg data-[state=active]:bg-white">
            Fraude
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-lg data-[state=active]:bg-white">
            Contenus signalés
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-lg data-[state=active]:bg-white">
            Avis
          </TabsTrigger>
          <TabsTrigger value="blacklist" className="rounded-lg data-[state=active]:bg-white">
            Blacklists
          </TabsTrigger>
        </TabsList>

        {/* Fraude */}
        <TabsContent value="fraud" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Détection de fraude</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead>Sévérité</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fraudAlerts.map((alert) => {
                  const badge = getSeverityBadge(alert.severity);
                  return (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {alert.type === 'multi_account' ? 'Multi-comptes' : 'Spam OTP'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-gray-900">{alert.user}</p>
                          <p className="text-xs text-gray-500">{alert.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {'devices' in alert ? `${alert.devices} appareils` : `${alert.attempts} tentatives`}
                      </TableCell>
                      <TableCell>
                        <Badge className={badge.className}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="rounded-lg">
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </Button>
                          <Button size="sm" variant="destructive" className="rounded-lg">
                            Bloquer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Contenus signalés */}
        <TabsContent value="content" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File de modération</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Signalé par</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedContent.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.type === 'property' ? 'Annonce' : item.type === 'review' ? 'Avis' : 'Image'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">{item.title}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {item.reporter === 'system' ? 'Système' : item.reporter}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{item.reason}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-lg text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approuver
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg text-red-600">
                          <XCircle className="w-4 h-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Avis */}
        <TabsContent value="reviews" className="mt-6">
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Modération des avis</h3>
            <p className="text-gray-500">Vérification des avis laissés par les utilisateurs</p>
          </Card>
        </TabsContent>

        {/* Blacklists */}
        <TabsContent value="blacklist" className="mt-6">
          <Card className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Listes noires</h3>
            <p className="text-gray-500">Téléphones, devices et IPs bloqués</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
