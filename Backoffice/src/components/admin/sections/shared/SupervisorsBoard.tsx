import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchSupervisors, type SupervisorProfile } from '../../../../lib/services/supervisors';
import { Search } from 'lucide-react';

type SupervisorsBoardProps = {};

function SupervisorsBoard({}: SupervisorsBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [supervisors, setSupervisors] = useState<SupervisorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les superviseurs depuis Supabase
  const loadSupervisors = async () => {
    setLoading(true);
    try {
      const data = await fetchSupervisors();
      setSupervisors(data);
    } catch (error) {
      console.error('Erreur lors du chargement des superviseurs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    loadSupervisors();
  }, []);

  const filtered = supervisors.filter((supervisor) => {
    const query = searchQuery.toLowerCase();
    return (
      supervisor.fullName.toLowerCase().includes(query) ||
      supervisor.role.toLowerCase().includes(query) ||
      (supervisor.city && supervisor.city.toLowerCase().includes(query))
    );
  });

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
      ops_manager: { label: 'Ops Manager', color: 'bg-blue-100 text-blue-700' },
      moderator: { label: 'Modérateur', color: 'bg-orange-100 text-orange-700' },
      support: { label: 'Support', color: 'bg-green-100 text-green-700' },
      finance: { label: 'Finance', color: 'bg-emerald-100 text-emerald-700' },
      marketing: { label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
      tech: { label: 'Tech', color: 'bg-gray-100 text-gray-700' },
    };
    return badges[role] || { label: role, color: 'bg-gray-100 text-gray-700' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement des superviseurs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          className="pl-10 rounded-2xl"
          placeholder="Rechercher par nom, rôle ou ville..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      <Card className="rounded-3xl border border-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead>Superviseur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Date d'ajout</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((supervisor) => {
              const roleBadge = getRoleBadge(supervisor.role);
              return (
                <TableRow key={supervisor.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 border border-gray-100">
                        <AvatarImage src={supervisor.avatarUrl} alt={supervisor.fullName} />
                        <AvatarFallback>
                          {supervisor.fullName
                            .split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{supervisor.fullName}</p>
                        <p className="text-xs text-gray-500">ID: {supervisor.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleBadge.color}>
                      {roleBadge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {supervisor.phone || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {supervisor.city || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-gray-600">
                      {supervisor.permissions.includes('*') ? (
                        <Badge variant="outline" className="text-xs">Tous les droits</Badge>
                      ) : (
                        <span>{supervisor.permissions.length} permissions</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {supervisor.createdAt 
                      ? new Date(supervisor.createdAt).toLocaleDateString('fr-FR')
                      : '—'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      className="rounded-full text-xs px-3 py-1"
                    >
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filtered.length === 0 && !loading && (
          <div className="p-10 text-center text-gray-500">
            {searchQuery ? 'Aucun superviseur ne correspond à cette recherche.' : 'Aucun superviseur trouvé.'}
          </div>
        )}
      </Card>

      {supervisors.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          {filtered.length} superviseur{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== supervisors.length && ` sur ${supervisors.length} total`}
        </div>
      )}
    </div>
  );
}

export { SupervisorsBoard };
