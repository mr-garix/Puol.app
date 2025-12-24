import { Search, Bell, Settings, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAdminRole } from '../../contexts/AdminRoleContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { GlobalSearch } from './GlobalSearch';
import { ProfileModal } from './ProfileModal';
import { SettingsModal } from './SettingsModal';

interface AdminHeaderProps {
  onLogout: () => void;
  onOpenSettings?: () => void;
  onNavigateToSection?: (section: string) => void;
}

export function AdminHeader({ onLogout, onOpenSettings, onNavigateToSection }: AdminHeaderProps) {
  const { currentAdmin } = useAdminRole();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [notifications] = useState([
    { id: 1, text: '5 nouvelles annonces en attente', unread: true, section: 'properties' },
    { id: 2, text: '3 visites à confirmer', unread: true, section: 'visits' },
    { id: 3, text: 'Paiement Orange Money en échec', unread: false, section: 'transactions' },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleNotificationClick = (section: string) => {
    if (onNavigateToSection) {
      onNavigateToSection(section);
    }
  };

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

  const roleBadge = currentAdmin ? getRoleBadge(currentAdmin.role) : null;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Recherche globale */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <GlobalSearch />
      </div>

      {/* Actions rapides */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications ({unreadCount})</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((notif) => (
              <DropdownMenuItem 
                key={notif.id} 
                className="p-3 cursor-pointer"
                onClick={() => handleNotificationClick(notif.section)}
              >
                <div className="flex items-start gap-2">
                  {notif.unread && <div className="w-2 h-2 bg-[#2ECC71] rounded-full mt-1" />}
                  <span className="text-sm">{notif.text}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-[#2ECC71] rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-sm text-gray-900">{currentAdmin?.name}</p>
                {roleBadge && (
                  <p className={`text-xs px-2 py-0.5 rounded-full inline-block ${roleBadge.color}`}>
                    {roleBadge.label}
                  </p>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowProfileModal(true)}>
              <User className="w-4 h-4 mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowSettingsModal(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600">
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modals */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        onLogout={onLogout}
      />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </header>
  );
}