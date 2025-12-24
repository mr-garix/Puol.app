import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type AdminRole = 
  | 'super_admin' 
  | 'ops_manager' 
  | 'moderator' 
  | 'support' 
  | 'finance' 
  | 'marketing' 
  | 'tech';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  avatar?: string;
}

interface AdminRoleContextType {
  currentAdmin: AdminUser | null;
  setCurrentAdmin: (admin: AdminUser) => void;
  hasPermission: (permission: string) => boolean;
}

const AdminRoleContext = createContext<AdminRoleContextType | undefined>(undefined);

// Matrice de permissions par rôle
const rolePermissions: Record<AdminRole, string[]> = {
  super_admin: ['*'], // Tous les droits
  ops_manager: [
    'properties.view', 'properties.edit', 'properties.approve',
    'visits.view', 'visits.edit', 'visits.manage',
    'reservations.view', 'reservations.edit', 'reservations.manage',
    'payments.view', 'cities.manage', 'districts.manage',
    'view_finance', 'view_support'
  ],
  moderator: [
    'properties.view', 'properties.approve', 'properties.moderate',
    'contents.moderate', 'reviews.moderate', 'users.moderate'
    // Note: Moderator ne voit PAS les revenus (pas de 'view_finance')
  ],
  support: [
    'tickets.view', 'tickets.manage', 'chat.manage',
    'refunds.partial', 'users.view', 'kyc.verify',
    'view_support', 'payments.view'
  ],
  finance: [
    'payments.view', 'payouts.manage', 'reconciliation.manage',
    'invoices.generate', 'reports.export', 'view_finance'
  ],
  marketing: [
    'banners.manage', 'cms.manage', 'notifications.send',
    'seo.manage', 'promotions.manage'
  ],
  tech: [
    'api.manage', 'webhooks.manage', 'integrations.manage',
    'search.reindex', 'cron.manage', 'logs.view'
  ]
};

export function AdminRoleProvider({ children }: { children: ReactNode }) {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>({
    id: '1',
    name: 'Admin Principal',
    email: 'admin@puol.cm',
    role: 'super_admin',
    permissions: ['*'],
    avatar: undefined
  });

  const hasPermission = (permission: string): boolean => {
    if (!currentAdmin) return false;
    
    // Super admin a tous les droits
    if (currentAdmin.role === 'super_admin') return true;
    
    const permissions = rolePermissions[currentAdmin.role] || [];
    return permissions.includes(permission) || permissions.includes('*');
  };

  return (
    <AdminRoleContext.Provider value={{ currentAdmin, setCurrentAdmin, hasPermission }}>
      {children}
    </AdminRoleContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminRole() {
  const context = useContext(AdminRoleContext);
  if (context === undefined) {
    throw new Error('useAdminRole must be used within AdminRoleProvider');
  }
  return context;
}