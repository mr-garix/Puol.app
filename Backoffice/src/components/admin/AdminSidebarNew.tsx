import { type ReactNode, useState } from "react";
import {
  LayoutDashboard,
  Home,
  Users,
  Shield,
  DollarSign,
  MessageSquare,
  Database,
  Bell,
  Palette,
  Settings,
  Plug,
  FileText,
  Clock,
  Image,
  Activity,
  TrendingUp,
  Brain,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { useAdminRole } from "@/contexts/AdminRoleContext";

export type AdminSection =
  | "dashboard"
  | "realtime"
  | "analytics"
  | "behavior"
  | "landlords"
  | "hosts"
  | "clients"
  | "moderation"
  | "payments"
  | "support"
  | "catalog"
  | "notifications"
  | "cms"
  | "settings"
  | "integrations"
  | "audit"
  | "cron"
  | "media"
  | "cities";

interface NavItem {
  id: AdminSection;
  label: string;
  icon: ReactNode;
  badge?: number;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AdminSidebarNewProps {
  currentSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onLogout: () => void;
  onSwitchToUser?: () => void;
}

export function AdminSidebarNew({
  currentSection,
  onSectionChange,
  onLogout,
  onSwitchToUser
}: AdminSidebarNewProps) {
  const { hasPermission } = useAdminRole();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['principal', 'gestion']);

  const navGroups: NavGroup[] = [
    {
      label: 'Principal',
      items: [
        { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: 'realtime', label: 'Temps réel', icon: <Activity className="w-5 h-5" /> },
        { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-5 h-5" /> },
        { id: 'behavior', label: 'Comportement', icon: <Brain className="w-5 h-5" /> },
      ]
    },
    {
      label: 'Gestion',
      items: [
        { id: 'landlords', label: 'Bailleurs', icon: <Shield className="w-5 h-5" />, permission: 'users.view' },
        { id: 'hosts', label: 'Hôtes', icon: <Home className="w-5 h-5" />, permission: 'users.view' },
        { id: 'clients', label: 'Clients', icon: <Users className="w-5 h-5" />, permission: 'users.view' },
      ]
    },
    {
      label: 'Opérations',
      items: [
        { id: 'moderation', label: 'Modération & Sécurité', icon: <Shield className="w-5 h-5" />, permission: 'contents.moderate' },
        { id: 'payments', label: 'Paiements & Payouts', icon: <DollarSign className="w-5 h-5" />, permission: 'payments.view' },
        { id: 'support', label: 'Support', icon: <MessageSquare className="w-5 h-5" />, permission: 'tickets.view' },
      ]
    },
    {
      label: 'Configuration',
      items: [
        { id: 'catalog', label: 'Catalogue', icon: <Database className="w-5 h-5" />, permission: 'cities.manage' },
        { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" />, permission: 'notifications.send' },
        { id: 'cms', label: 'Apparence & CMS', icon: <Palette className="w-5 h-5" />, permission: 'cms.manage' },
        { id: 'settings', label: 'Paramètres', icon: <Settings className="w-5 h-5" /> },
      ]
    },
    {
      label: 'Système',
      items: [
        { id: 'integrations', label: 'Intégrations', icon: <Plug className="w-5 h-5" />, permission: 'integrations.manage' },
        { id: 'audit', label: 'Journal & Audit', icon: <FileText className="w-5 h-5" />, permission: 'logs.view' },
        { id: 'cron', label: 'Tâches planifiées', icon: <Clock className="w-5 h-5" />, permission: 'cron.manage' },
        { id: 'media', label: 'Médias', icon: <Image className="w-5 h-5" /> },
      ]
    }
  ];

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const filterItemsByPermission = (items: NavItem[]) => {
    return items.filter(item => !item.permission || hasPermission(item.permission));
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="bg-[#2ECC71] rounded-2xl px-6 py-3 text-center">
          <h1 className="text-2xl tracking-wider text-white">PUOL</h1>
          <p className="text-xs text-white/80 mt-1">Back-Office</p>
        </div>
      </div>

      {/* Navigation avec scroll */}
      <nav className="flex-1 overflow-y-auto p-4">
        {navGroups.map((group, groupIndex) => {
          const filteredItems = filterItemsByPermission(group.items);
          if (filteredItems.length === 0) return null;

          const isExpanded = expandedGroups.includes(group.label.toLowerCase());

          return (
            <div key={groupIndex} className="mb-4">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.label.toLowerCase())}
                className="w-full flex items-center justify-between px-2 py-2 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>{group.label}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Group Items */}
              {isExpanded && (
                <div className="space-y-1 mt-1">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all ${
                        currentSection === item.id
                          ? 'bg-[#2ECC71] text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          currentSection === item.id
                            ? 'bg-white text-[#2ECC71]'
                            : 'bg-[#2ECC71] text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {onSwitchToUser && (
          <button
            onClick={onSwitchToUser}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">App utilisateur</span>
          </button>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}