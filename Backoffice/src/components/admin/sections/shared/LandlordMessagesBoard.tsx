import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { landlordMessages, type LandlordMessageThread } from '../../UsersManagement';
import {
  MessageSquareText,
  Filter,
  Search,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock4,
  Phone,
} from 'lucide-react';

type LandlordMessagesBoardProps = {
  onReply?: (threadId: string, message: string) => void;
};

const priorityBadges: Record<
  LandlordMessageThread['priority'],
  { label: string; className: string }
> = {
  high: { label: 'Priorité haute', className: 'bg-red-100 text-red-700' },
  medium: { label: 'Priorité moyenne', className: 'bg-amber-100 text-amber-700' },
  low: { label: 'Priorité basse', className: 'bg-blue-100 text-blue-700' },
};

export function LandlordMessagesBoard({ onReply }: LandlordMessagesBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LandlordMessageThread['status']>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(landlordMessages[0]?.id ?? null);
  const [draftReply, setDraftReply] = useState('');

  const filteredThreads = useMemo(() => {
    return landlordMessages.filter((thread) => {
      const matchesSearch =
        thread.landlordName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || thread.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const selectedThread =
    filteredThreads.find((thread) => thread.id === selectedThreadId) ?? filteredThreads[0] ?? null;

  const stats = useMemo(() => {
    const open = landlordMessages.filter((message) => message.status === 'open').length;
    const waiting = landlordMessages.filter((message) => message.status === 'waiting').length;
    const resolved = landlordMessages.filter((message) => message.status === 'resolved').length;
    return { open, waiting, resolved, total: landlordMessages.length };
  }, []);

  const handleSendReply = () => {
    if (!selectedThread || !draftReply.trim()) return;
    onReply?.(selectedThread.id, draftReply.trim());
    setDraftReply('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 space-y-1">
            <p className="text-xs uppercase text-gray-500">Conversations actives</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-1">
            <p className="text-xs uppercase text-gray-500">Ouverts</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-1">
            <p className="text-xs uppercase text-gray-500">En attente</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.waiting}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-1">
            <p className="text-xs uppercase text-gray-500">Résolus</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-emerald-600" />
            Messagerie bailleurs
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              className="rounded-full text-sm"
              onClick={() => setStatusFilter('all')}
            >
              Tous
            </Button>
            <Button
              variant={statusFilter === 'open' ? 'default' : 'outline'}
              className="rounded-full text-sm"
              onClick={() => setStatusFilter('open')}
            >
              Ouverts
            </Button>
            <Button
              variant={statusFilter === 'waiting' ? 'default' : 'outline'}
              className="rounded-full text-sm"
              onClick={() => setStatusFilter('waiting')}
            >
              En attente
            </Button>
            <Button
              variant={statusFilter === 'resolved' ? 'default' : 'outline'}
              className="rounded-full text-sm"
              onClick={() => setStatusFilter('resolved')}
            >
              Résolus
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Input
                placeholder="Rechercher par bailleur, sujet, ville..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10 rounded-xl"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <Button variant="outline" className="rounded-xl gap-2">
              <Filter className="w-4 h-4" />
              Filtres avancés
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
            <div className="rounded-2xl border border-gray-100 h-[560px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Conversations</p>
                <Badge variant="secondary" className="rounded-full text-xs">
                  {filteredThreads.length} threads
                </Badge>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {filteredThreads.map((thread) => {
                  const priority = priorityBadges[thread.priority];
                  return (
                    <button
                      key={thread.id}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                        selectedThread?.id === thread.id ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => setSelectedThreadId(thread.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarImage src={thread.avatarUrl} alt={thread.landlordName} />
                          <AvatarFallback>
                            {thread.landlordName
                              .split(' ')
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">{thread.landlordName}</p>
                            <span className="text-xs text-gray-400">{thread.lastMessageAt}</span>
                          </div>
                          <p className="text-xs text-gray-500">{thread.subject}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{thread.preview}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`${priority.className} rounded-full text-[10px]`}>
                              {priority.label}
                            </Badge>
                            {thread.unreadCount > 0 && (
                              <span className="text-[10px] font-semibold text-white bg-emerald-500 rounded-full px-2 py-0.5">
                                {thread.unreadCount} non lus
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredThreads.length === 0 && (
                  <div className="p-8 text-center text-sm text-gray-500 space-y-2">
                    <MessageSquareText className="w-10 h-10 text-gray-300 mx-auto" />
                    <p>Aucune conversation ne correspond à ces filtres.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 h-[560px] flex flex-col overflow-hidden">
              {selectedThread ? (
                <>
                  <div className="p-5 border-b border-gray-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm text-gray-500">Conversation #{selectedThread.id}</p>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedThread.subject}</h2>
                      </div>
                      <Badge
                        className={`${priorityBadges[selectedThread.priority].className} rounded-full`}
                      >
                        {priorityBadges[selectedThread.priority].label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      <span>{selectedThread.landlordName}</span>
                      <span className="text-gray-300">•</span>
                      <span>{selectedThread.landlordUsername}</span>
                      <span className="text-gray-300">•</span>
                      <span>{selectedThread.city}</span>
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedThread.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {selectedThread.messages.map((message) => {
                      const isSupport = message.sender === 'support';
                      return (
                        <div key={message.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              isSupport ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className={`text-xs mt-2 ${isSupport ? 'text-white/80' : 'text-gray-500'}`}>
                              {message.timestamp}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-100 p-5 space-y-3 bg-white">
                    <div className="flex gap-2 text-xs text-gray-500">
                      <Clock4 className="w-3.5 h-3.5" />
                      Temps de réponse moyen : 2h15
                    </div>
                    <Textarea
                      placeholder="Répondre au bailleur..."
                      value={draftReply}
                      onChange={(event) => setDraftReply(event.target.value)}
                      className="rounded-2xl resize-none"
                      rows={3}
                    />
                    <div className="flex justify-between items-center">
                      <Button variant="outline" className="rounded-xl gap-2 text-gray-600">
                        <AlertTriangle className="w-4 h-4" />
                        Marquer en attente
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl gap-2 text-emerald-600 border-emerald-200">
                          <CheckCircle2 className="w-4 h-4" />
                          Résoudre
                        </Button>
                        <Button
                          className="rounded-xl gap-2"
                          onClick={handleSendReply}
                          disabled={!draftReply.trim()}
                        >
                          Envoyer
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col flex-1 items-center justify-center text-center p-8 space-y-2">
                  <MessageSquareText className="w-10 h-10 text-gray-300" />
                  <p className="text-sm text-gray-500">Sélectionnez une conversation pour afficher les détails.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
