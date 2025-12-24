import { Database, Bell, BarChart3, Palette, Plug, FileText, Clock, Image } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';

export function CatalogSection() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Catalogue & Référentiels</h1>
        <p className="text-gray-500 mt-1">Gestion des villes, quartiers et taxonomies</p>
      </div>
      <Card className="p-12 text-center">
        <Database className="w-16 h-16 mx-auto text-[#2ECC71] mb-4" />
        <h3 className="text-2xl text-gray-900 mb-2">Villes & Quartiers</h3>
        <p className="text-gray-500 mb-4">Gestion des localisations (Douala, Yaoundé, Bafoussam...)</p>
        <p className="text-sm text-gray-400">Codes internes, alias locaux, intégration FindMe/Google Maps</p>
      </Card>
    </div>
  );
}

export function NotificationsSection() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Notifications</h1>
        <p className="text-gray-500 mt-1">Gestion des templates et envois</p>
      </div>
      <Card className="p-12 text-center">
        <Bell className="w-16 h-16 mx-auto text-[#2ECC71] mb-4" />
        <h3 className="text-2xl text-gray-900 mb-2">Templates de notifications</h3>
        <p className="text-gray-500 mb-4">WhatsApp, SMS, Push, Email</p>
        <p className="text-sm text-gray-400">Variables personnalisables, routage par canal, fenêtres horaires</p>
      </Card>
    </div>
  );
}

export function AnalyticsSection() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Analyses et métriques de performance</p>
      </div>
      <Card className="p-12 text-center">
        <BarChart3 className="w-16 h-16 mx-auto text-[#2ECC71] mb-4" />
        <h3 className="text-2xl text-gray-900 mb-2">Analytics & Rapports</h3>
        <p className="text-gray-500 mb-4">Acquisition, funnel, recherche, opérations, qualité</p>
        <p className="text-sm text-gray-400">Vues feed → recherche → annonce → visite/réservation</p>
      </Card>
    </div>
  );
}

export function CMSSection() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Apparence & CMS</h1>
        <p className="text-gray-500 mt-1">Gestion du contenu et de l'apparence</p>
      </div>
      <Card className="p-12 text-center">
        <Palette className="w-16 h-16 mx-auto text-[#2ECC71] mb-4" />
        <h3 className="text-2xl text-gray-900 mb-2">CMS & Design</h3>
        <p className="text-gray-500 mb-4">Pages système, bannières, thèmes, assets</p>
        <p className="text-sm text-gray-400">CGU, FAQ, Politique de remboursement, Traductions (FR/EN)</p>
      </Card>
    </div>
  );
}

export function IntegrationsSection() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Intégrations</h1>
        <p className="text-gray-500 mt-1">Webhooks et intégrations externes</p>
      </div>
      <Card className="p-12 text-center">
        <Plug className="w-16 h-16 mx-auto text-[#2ECC71] mb-4" />
        <h3 className="text-2xl text-gray-900 mb-2">Webhooks & API</h3>
        <p className="text-gray-500 mb-4">Événements, callbacks, index de recherche</p>
        <p className="text-sm text-gray-400">Paiement, OTP validé, réservation confirmée/annulée, Algolia/Meilisearch</p>
      </Card>
    </div>
  );
}

export function AuditSection() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Journal & Audit</h1>
        <p className="text-gray-500 mt-1">Logs et traçabilité des actions</p>
      </div>
      <Card className="p-12 text-center">
        <FileText className="w-16 h-16 mx-auto text-[#2ECC71] mb-4" />
        <h3 className="text-2xl text-gray-900 mb-2">Logs & Audit Trail</h3>
        <p className="text-gray-500 mb-4">Historique des actions admin et utilisateurs</p>
        <p className="text-sm text-gray-400">Qui a modéré/édité quoi et quand, exports conformité GDPR</p>
      </Card>
    </div>
  );
}

export function CronSection() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Tâches planifiées</h1>
        <p className="text-gray-500 mt-1">Cron jobs et queues de traitement</p>
      </div>
      <Card className="p-12 text-center">
        <Clock className="w-16 h-16 mx-auto text-[#2ECC71] mb-4" />
        <h3 className="text-2xl text-gray-900 mb-2">Cron & Queue Management</h3>
        <p className="text-gray-500 mb-4">Automatisation des tâches récurrentes</p>
        <p className="text-sm text-gray-400">Auto-confirm visites, rappels J-1/J-0, nettoyage, réindexation</p>
      </Card>
    </div>
  );
}

export function MediaSection() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Médias</h1>
        <p className="text-gray-500 mt-1">Bibliothèque de médias et stockage</p>
      </div>
      <Card className="p-12 text-center">
        <Image className="w-16 h-16 mx-auto text-[#2ECC71] mb-4" />
        <h3 className="text-2xl text-gray-900 mb-2">Bibliothèque de médias</h3>
        <p className="text-gray-500 mb-4">Upload, compression, conversion</p>
        <p className="text-sm text-gray-400">Thumbnails, web-optimized, CDN S3/Cloudflare R2</p>
      </Card>
    </div>
  );
}
