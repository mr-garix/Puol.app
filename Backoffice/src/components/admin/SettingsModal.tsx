import { useState } from 'react';
import { X, Globe, Lock, Palette, Bell, Database, RotateCcw, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // États pour les paramètres
  const [settings, setSettings] = useState({
    // Général
    projectName: 'PUOL',
    companyName: 'PUOL Africa',
    supportEmail: 'support@puol.com',
    language: 'fr',
    timezone: 'Africa/Douala',
    
    // Sécurité
    twoFactorAuth: false,
    sessionTimeout: '60',
    
    // Apparence
    theme: 'light',
    primaryColor: '#2ECC71',
    dashboardStyle: 'comfortable',
    
    // Notifications
    emailNotifications: true,
    realtimeNotifications: true,
    criticalAlerts: true,
  });

  const handleSave = () => {
    // Simuler la sauvegarde
    toast.success('Paramètres enregistrés avec succès');
    // Fermer automatiquement
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleReset = () => {
    // Réinitialiser aux valeurs par défaut
    setSettings({
      projectName: 'PUOL',
      companyName: 'PUOL Africa',
      supportEmail: 'support@puol.com',
      language: 'fr',
      timezone: 'Africa/Douala',
      twoFactorAuth: false,
      sessionTimeout: '60',
      theme: 'light',
      primaryColor: '#2ECC71',
      dashboardStyle: 'comfortable',
      emailNotifications: true,
      realtimeNotifications: true,
      criticalAlerts: true,
    });
    toast.success('Paramètres réinitialisés');
  };

  const handleForceLogout = () => {
    toast.success('Tous les appareils ont été déconnectés');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50">
      {/* Header fixe */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-white">Paramètres du système</h1>
            <p className="text-sm text-white/90 mt-1">Configuration globale du back-office PUOL</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="h-[calc(100vh-180px)] overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Tabs defaultValue="general" className="space-y-8">
            <TabsList className="h-14 bg-white shadow-sm rounded-xl p-1 inline-flex">
              <TabsTrigger value="general" className="data-[state=active]:bg-[#2ECC71] data-[state=active]:text-white rounded-lg px-6 py-3 text-base">
                <Globe className="w-5 h-5 mr-2" />
                Général
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-[#2ECC71] data-[state=active]:text-white rounded-lg px-6 py-3 text-base">
                <Lock className="w-5 h-5 mr-2" />
                Sécurité
              </TabsTrigger>
              <TabsTrigger value="appearance" className="data-[state=active]:bg-[#2ECC71] data-[state=active]:text-white rounded-lg px-6 py-3 text-base">
                <Palette className="w-5 h-5 mr-2" />
                Apparence
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-[#2ECC71] data-[state=active]:text-white rounded-lg px-6 py-3 text-base">
                <Bell className="w-5 h-5 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            {/* Onglet Général */}
            <TabsContent value="general" className="m-0">
              <div className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-xl text-gray-900">Informations générales</h3>
                  <p className="text-base text-gray-500 mt-2">Configuration de base de votre plateforme</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="projectName" className="text-base text-gray-700 mb-3 block">
                      Nom du projet
                    </Label>
                    <Input
                      id="projectName"
                      value={settings.projectName}
                      onChange={(e) => setSettings({ ...settings, projectName: e.target.value })}
                      className="h-14 text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyName" className="text-base text-gray-700 mb-3 block">
                      Nom de l'entreprise
                    </Label>
                    <Input
                      id="companyName"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      className="h-14 text-base"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="supportEmail" className="text-base text-gray-700 mb-3 block">
                    E-mail de contact du support
                  </Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    className="h-14 text-base"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="language" className="text-base text-gray-700 mb-3 block">
                      Langue par défaut
                    </Label>
                    <Select
                      value={settings.language}
                      onValueChange={(value) => setSettings({ ...settings, language: value })}
                    >
                      <SelectTrigger className="h-14">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">🇫🇷 Français</SelectItem>
                        <SelectItem value="en">🇬🇧 English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="timezone" className="text-base text-gray-700 mb-3 block">
                      Fuseau horaire
                    </Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                    >
                      <SelectTrigger className="h-14">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Douala">Africa/Douala (GMT+1)</SelectItem>
                        <SelectItem value="Africa/Abidjan">Africa/Abidjan (GMT)</SelectItem>
                        <SelectItem value="Africa/Lagos">Africa/Lagos (GMT+1)</SelectItem>
                        <SelectItem value="Africa/Dakar">Africa/Dakar (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Sécurité */}
            <TabsContent value="security" className="m-0">
              <div className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-xl text-gray-900">Paramètres de sécurité</h3>
                  <p className="text-base text-gray-500 mt-2">Renforcez la sécurité de votre compte</p>
                </div>

                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <Label className="text-base text-gray-900">Authentification à deux facteurs (2FA)</Label>
                    <p className="text-base text-gray-500 mt-2">
                      Ajouter une couche de sécurité supplémentaire avec un code SMS ou application
                    </p>
                  </div>
                  <Switch
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) => setSettings({ ...settings, twoFactorAuth: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="sessionTimeout" className="text-base text-gray-700 mb-3 block">
                    Durée d'expiration de session
                  </Label>
                  <Select
                    value={settings.sessionTimeout}
                    onValueChange={(value) => setSettings({ ...settings, sessionTimeout: value })}
                  >
                    <SelectTrigger className="h-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="240">4 heures</SelectItem>
                      <SelectItem value="1440">24 heures</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-base text-gray-500 mt-3">
                    Les utilisateurs seront déconnectés après cette période d'inactivité
                  </p>
                </div>

                <div className="pt-6 border-t">
                  <h4 className="text-base text-gray-900 mb-4">Actions de sécurité</h4>
                  <Button
                    variant="outline"
                    onClick={handleForceLogout}
                    className="w-full h-14 border-red-300 text-red-600 hover:bg-red-50 text-base"
                  >
                    Forcer la déconnexion de tous les appareils
                  </Button>
                  <p className="text-base text-gray-500 mt-3 text-center">
                    Tous les utilisateurs connectés devront se reconnecter
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Apparence */}
            <TabsContent value="appearance" className="m-0">
              <div className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-xl text-gray-900">Personnalisation de l'interface</h3>
                  <p className="text-base text-gray-500 mt-2">Personnalisez l'apparence du back-office</p>
                </div>

                <div>
                  <Label className="text-base text-gray-900 mb-4 block">Mode d'affichage</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => setSettings({ ...settings, theme: 'light' })}
                      className={`p-8 border-2 rounded-xl transition-all ${
                        settings.theme === 'light'
                          ? 'border-[#2ECC71] bg-[#2ECC71]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-full h-32 bg-white border border-gray-200 rounded-lg mb-4"></div>
                      <p className="text-base">Mode clair</p>
                      <p className="text-sm text-gray-500 mt-1">Interface lumineuse</p>
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, theme: 'dark' })}
                      className={`p-8 border-2 rounded-xl transition-all ${
                        settings.theme === 'dark'
                          ? 'border-[#2ECC71] bg-[#2ECC71]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg mb-4"></div>
                      <p className="text-base">Mode sombre</p>
                      <p className="text-sm text-gray-500 mt-1">Interface foncée</p>
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="primaryColor" className="text-base text-gray-900 mb-4 block">
                    Couleur principale de la plateforme
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-28 h-14 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="flex-1 h-14 text-base uppercase"
                    />
                  </div>
                  <p className="text-base text-gray-500 mt-3">
                    Cette couleur sera utilisée pour les boutons et éléments d'accentuation
                  </p>
                </div>

                <div>
                  <Label className="text-base text-gray-900 mb-4 block">Densité du tableau de bord</Label>
                  <Select
                    value={settings.dashboardStyle}
                    onValueChange={(value) => setSettings({ ...settings, dashboardStyle: value })}
                  >
                    <SelectTrigger className="h-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact - Plus d'informations visibles</SelectItem>
                      <SelectItem value="comfortable">Confortable - Équilibre idéal</SelectItem>
                      <SelectItem value="spacious">Espacé - Plus aéré et lisible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Notifications */}
            <TabsContent value="notifications" className="m-0">
              <div className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-xl text-gray-900">Gestion des notifications</h3>
                  <p className="text-base text-gray-500 mt-2">Configurez comment vous souhaitez être notifié</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <Label className="text-base text-gray-900">Notifications par e-mail</Label>
                      <p className="text-base text-gray-500 mt-2">
                        Recevoir les notifications importantes par e-mail
                      </p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <Label className="text-base text-gray-900">Notifications en temps réel</Label>
                      <p className="text-base text-gray-500 mt-2">
                        Afficher les notifications dans le back-office
                      </p>
                    </div>
                    <Switch
                      checked={settings.realtimeNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, realtimeNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <Label className="text-base text-gray-900">Alertes critiques</Label>
                      <p className="text-base text-gray-500 mt-2">
                        Nouvelles annonces signalées, problèmes de paiement, etc.
                      </p>
                    </div>
                    <Switch
                      checked={settings.criticalAlerts}
                      onCheckedChange={(checked) => setSettings({ ...settings, criticalAlerts: checked })}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h4 className="text-base text-gray-900 mb-4">Types d'alertes activées</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-300" />
                      <span className="text-base text-gray-700">Nouvelles annonces en attente de validation</span>
                    </label>
                    <label className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-300" />
                      <span className="text-base text-gray-700">Nouveaux utilisateurs inscrits</span>
                    </label>
                    <label className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-300" />
                      <span className="text-base text-gray-700">Signalements de contenus</span>
                    </label>
                    <label className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-300" />
                      <span className="text-base text-gray-700">Problèmes de paiement</span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-8 py-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-gray-300 h-14 px-8 text-base"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Restaurer par défaut
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#2ECC71] hover:bg-[#27ae60] text-white h-14 px-10 text-base"
          >
            <Save className="w-5 h-5 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
