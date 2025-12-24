import { Settings, Globe, DollarSign, Key, Search, Flag, Code } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Textarea } from '../../ui/textarea';

export function SettingsSection() {
  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl text-gray-900">Paramètres</h1>
        <p className="text-gray-500 mt-1">Configuration générale de la plateforme</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white">
            Général
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-lg data-[state=active]:bg-white">
            Règles produit
          </TabsTrigger>
          <TabsTrigger value="api" className="rounded-lg data-[state=active]:bg-white">
            Clés API
          </TabsTrigger>
          <TabsTrigger value="search" className="rounded-lg data-[state=active]:bg-white">
            Recherche
          </TabsTrigger>
          <TabsTrigger value="features" className="rounded-lg data-[state=active]:bg-white">
            Feature Flags
          </TabsTrigger>
        </TabsList>

        {/* Général */}
        <TabsContent value="general" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de la plateforme</Label>
                <Input defaultValue="PUOL" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Pays actifs</Label>
                <Input defaultValue="Cameroun" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Devise par défaut</Label>
                <Input defaultValue="FCFA (XAF)" className="rounded-xl" />
              </div>
              <Button className="bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-xl">
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Règles produit */}
        <TabsContent value="rules" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Politique d'annulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base">Visites (non-meublés)</Label>
                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Remboursement si annulation {'<'}24h</span>
                    <Input type="number" defaultValue="50" className="w-20 rounded-lg" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Remboursement si annulation {'≥'}24h</span>
                    <Input type="number" defaultValue="0" className="w-20 rounded-lg" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Réservations (meublés)</Label>
                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Remboursement si annulation {'<'}24h</span>
                    <Input type="number" defaultValue="50" className="w-20 rounded-lg" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Remboursement si annulation {'≥'}24h</span>
                    <Input type="number" defaultValue="0" className="w-20 rounded-lg" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Délai auto-confirmation visites (production, minutes)</Label>
                <Input type="number" defaultValue="60" className="rounded-xl" />
                <p className="text-xs text-gray-500">Délai en mode test : 20-30 secondes</p>
              </div>

              <Button className="bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-xl">
                Sauvegarder les règles
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clés API */}
        <TabsContent value="api" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Clés API & Intégrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>WhatsApp Cloud API</Label>
                <Input type="password" defaultValue="••••••••••••••••" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Orange Money API Key</Label>
                <Input type="password" defaultValue="••••••••••••••••" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>MTN MoMo API Key</Label>
                <Input type="password" defaultValue="••••••••••••••••" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Google Maps API Key</Label>
                <Input type="password" defaultValue="••••••••••••••••" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>FindMe Integration</Label>
                <Input type="password" defaultValue="••••••••••••••••" className="rounded-xl" />
              </div>
              <Button className="bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-xl">
                Sauvegarder les clés
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recherche */}
        <TabsContent value="search" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Configuration de la recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Seuil de tolérance fuzzy (0-1)</Label>
                <Input type="number" step="0.1" defaultValue="0.8" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Synonymes de quartiers (JSON)</Label>
                <Textarea 
                  defaultValue='{"Ndokoti": ["Doukoti", "Ndokotti"], "Akwa": ["Akwa Nord"]}'
                  className="rounded-xl font-mono text-sm"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Boost proximité géographique</Label>
                <Input type="number" defaultValue="1.5" className="rounded-xl" />
              </div>
              <Button className="bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-xl">
                Réindexer la recherche
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Feature Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-900">Avis pour meublés</p>
                  <p className="text-xs text-gray-500">Permettre aux utilisateurs de noter les séjours</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-900">Chat full-screen</p>
                  <p className="text-xs text-gray-500">Activer le mode plein écran pour le chat</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-900">Modération automatique</p>
                  <p className="text-xs text-gray-500">Auto-détection de contenus inappropriés</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-900">Mode test paiements</p>
                  <p className="text-xs text-gray-500">Utiliser les sandbox pour Orange Money et MTN MoMo</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}