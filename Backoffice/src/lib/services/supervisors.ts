import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../supabaseClient';
import type { Database } from '../../types/supabase.generated';
import type { AdminRole } from '../../contexts/AdminRoleContext';

export type SupervisorProfile = {
  id: string;
  fullName: string;
  role: AdminRole;
  phone: string | null;
  city: string | null;
  avatarUrl: string | undefined;
  createdAt: string | null;
  updatedAt: string | null;
  permissions: string[];
};

export async function fetchSupervisors(): Promise<SupervisorProfile[]> {
  if (!supabase) {
    console.warn('[supervisors] Supabase client unavailable, returning empty supervisors list');
    return [];
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    
    // Rôles considérés comme superviseurs
    const supervisorRoles: AdminRole[] = [
      'super_admin',
      'ops_manager', 
      'moderator',
      'support',
      'finance',
      'marketing',
      'tech'
    ];

    const { data, error } = await client
      .from('profiles')
      .select('id, first_name, last_name, phone, city, avatar_url, role, created_at, updated_at')
      .in('role', supervisorRoles)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[supervisors] fetchSupervisors error', error);
      return [];
    }

    const rows = data ?? [];
    
    return rows.map((profile) => ({
      id: profile.id,
      fullName: [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Superviseur PUOL',
      role: profile.role as AdminRole,
      phone: profile.phone,
      city: profile.city,
      avatarUrl: profile.avatar_url || undefined,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      permissions: getPermissionsForRole(profile.role as AdminRole),
    }));
  } catch (error) {
    console.error('[supervisors] fetchSupervisors failed', error);
    return [];
  }
}

function getPermissionsForRole(role: AdminRole): string[] {
  const rolePermissions: Record<AdminRole, string[]> = {
    super_admin: ['*'],
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

  return rolePermissions[role] || [];
}

export async function countSupervisors(): Promise<number> {
  if (!supabase) {
    return 0;
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    const supervisorRoles: AdminRole[] = [
      'super_admin',
      'ops_manager', 
      'moderator',
      'support',
      'finance',
      'marketing',
      'tech'
    ];

    const { count, error } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', supervisorRoles);

    if (error) {
      console.warn('[supervisors] countSupervisors error', error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error('[supervisors] countSupervisors failed', error);
    return 0;
  }
}
