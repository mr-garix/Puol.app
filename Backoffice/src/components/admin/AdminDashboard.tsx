import { useState } from 'react';
import { AdminSidebarNew, type AdminSection } from './AdminSidebarNew';
import { AdminHeader } from './AdminHeader';

// Sections principales
import { DashboardSectionNew } from './sections/DashboardSectionNew';
import { RealtimeSection } from './sections/RealtimeSection';
import { AnalyticsSection } from './sections/AnalyticsSection';
import { BehaviorSection } from './sections/BehaviorSection';
import { ModerationSection } from './sections/ModerationSection';
import { PaymentsSection } from './sections/PaymentsSection';
import { SupportSection } from './sections/SupportSection';
import { SettingsSection } from './sections/SettingsSection';
import { CitiesSection } from './sections/CitiesSection';
import { LandlordsSection } from './sections/LandlordsSection';
import { HostsSection } from './sections/HostsSection';
import { ClientsSection } from './sections/ClientsSection';
import { RefundsSection } from './sections/RefundsSection';

// Sections placeholder
import {
  CatalogSection,
  NotificationsSection,
  CMSSection,
  IntegrationsSection,
  AuditSection,
  CronSection,
  MediaSection
} from './sections/PlaceholderSections';

interface AdminDashboardProps {
  onLogout: () => void;
  onSwitchToUser?: () => void;
}

const AVAILABLE_SECTIONS: AdminSection[] = [
  'dashboard',
  'realtime',
  'analytics',
  'behavior',
  'landlords',
  'hosts',
  'clients',
  'refunds',
  'moderation',
  'payments',
  'support',
  'catalog',
  'notifications',
  'cms',
  'settings',
  'integrations',
  'audit',
  'cron',
  'media',
  'cities'
];

const isAdminSection = (value: string): value is AdminSection => {
  return AVAILABLE_SECTIONS.includes(value as AdminSection);
};

export function AdminDashboard({ onLogout, onSwitchToUser }: AdminDashboardProps) {
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');

  // Helper pour naviguer vers une section avec ou sans paramètres
  const handleNavigateToSection = (route: string) => {
    // Si la route contient des query params (ex: 'properties?status=pending')
    // on extrait juste le nom de la section
    const sectionName = route.split('?')[0];
    
    // TODO: Dans une vraie app, on passerait aussi les query params à la section
    // Pour cette maquette, on navigue juste vers la section principale
    if (isAdminSection(sectionName)) {
      setCurrentSection(sectionName);
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardSectionNew 
          onNavigateToRealtime={() => setCurrentSection('realtime')} 
          onNavigateToSection={handleNavigateToSection}
        />;
      case 'realtime':
        return <RealtimeSection />;
      case 'analytics':
        return <AnalyticsSection onNavigateToSection={handleNavigateToSection} />;
      case 'behavior':
        return <BehaviorSection onNavigateToSection={handleNavigateToSection} />;
      case 'landlords':
        return <LandlordsSection />;
      case 'hosts':
        return <HostsSection />;
      case 'clients':
        return <ClientsSection />;
      case 'refunds':
        return <RefundsSection />;
      case 'moderation':
        return <ModerationSection />;
      case 'payments':
        return <PaymentsSection />;
      case 'support':
        return <SupportSection />;
      case 'catalog':
        return <CatalogSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'cms':
        return <CMSSection />;
      case 'settings':
        return <SettingsSection />;
      case 'integrations':
        return <IntegrationsSection />;
      case 'audit':
        return <AuditSection />;
      case 'cron':
        return <CronSection />;
      case 'media':
        return <MediaSection />;
      case 'cities':
        return <CitiesSection />;
      default:
        return <DashboardSectionNew />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebarNew
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        onLogout={onLogout}
        onSwitchToUser={onSwitchToUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader 
          onLogout={onLogout} 
          onNavigateToSection={(section) => setCurrentSection(section as AdminSection)}
        />

        {/* Content with scroll */}
        <main className="flex-1 overflow-y-auto">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}