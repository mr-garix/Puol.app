import { MessageSquare, Clock, CheckCircle, AlertCircle, User } from 'lucide-react';
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

export function SupportSection() {
  const tickets = [
    { id: 'TK001', user: 'Marie K.', subject: 'Problème de paiement', priority: 'high', status: 'open', created: '2024-01-15 14:30' },
    { id: 'TK002', user: 'Paul N.', subject: 'Annulation de visite', priority: 'medium', status: 'pending', created: '2024-01-15 12:00' },
    { id: 'TK003', user: 'Sarah M.', subject: 'Question sur annonce', priority: 'low', status: 'resolved', created: '2024-01-14 18:00' },
  ];

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { label: 'Élevée', className: 'bg-red-100 text-red-700' },
      medium: { label: 'Moyenne', className: 'bg-orange-100 text-orange-700' },
      low: { label: 'Faible', className: 'bg-blue-100 text-blue-700' },
    };
    return variants[priority as keyof typeof variants] || variants.medium;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      open: { label: 'Ouvert', className: 'bg-green-100 text-green-700' },
      pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
      resolved: { label: 'Résolu', className: 'bg-gray-100 text-gray-700' },
    };
    return variants[status as keyof typeof variants] || variants.open;
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl text-gray-900">Support</h1>
        <p className="text-gray-500 mt-1">Gestion des tickets et messages utilisateurs</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">12</p>
                <p className="text-sm text-gray-600">Tickets ouverts</p>
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
                <p className="text-2xl text-gray-900">8</p>
                <p className="text-sm text-gray-600">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">156</p>
                <p className="text-sm text-gray-600">Résolus ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl text-gray-900">2.5h</p>
                <p className="text-sm text-gray-600">Temps de réponse</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="tickets" className="rounded-lg data-[state=active]:bg-white">
            Tickets
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-lg data-[state=active]:bg-white">
            Chat in-app
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="rounded-lg data-[state=active]:bg-white">
            Chatbot
          </TabsTrigger>
          <TabsTrigger value="macros" className="rounded-lg data-[state=active]:bg-white">
            Macros
          </TabsTrigger>
        </TabsList>

        {/* Tickets */}
        <TabsContent value="tickets" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liste des tickets</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => {
                  const priorityBadge = getPriorityBadge(ticket.priority);
                  const statusBadge = getStatusBadge(ticket.status);
                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="text-sm text-gray-900">{ticket.id}</TableCell>
                      <TableCell className="text-sm text-gray-900">{ticket.user}</TableCell>
                      <TableCell className="text-sm text-gray-900">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge className={priorityBadge.className}>
                          {priorityBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{ticket.created}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="rounded-lg">
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Chat */}
        <TabsContent value="chat" className="mt-6">
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Messages in-app</h3>
            <p className="text-gray-500">Conversations avec les utilisateurs</p>
          </Card>
        </TabsContent>

        {/* Chatbot */}
        <TabsContent value="chatbot" className="mt-6">
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-purple-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Configuration du chatbot</h3>
            <p className="text-gray-500">Scripts, intents et FAQ automatiques</p>
          </Card>
        </TabsContent>

        {/* Macros */}
        <TabsContent value="macros" className="mt-6">
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto text-orange-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Macros de réponse</h3>
            <p className="text-gray-500">Réponses préenregistrées pour accélérer le support</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
