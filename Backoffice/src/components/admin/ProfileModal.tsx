import { useState } from 'react';
import { X, User, Mail, Phone, Shield, Clock, Camera, Key, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { useAdminRole } from '../../contexts/AdminRoleContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function ProfileModal({ isOpen, onClose, onLogout }: ProfileModalProps) {
  const { currentAdmin } = useAdminRole();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  // États pour les champs modifiables
  const [formData, setFormData] = useState({
    name: currentAdmin?.name || 'Admin PUOL',
    email: currentAdmin?.email || 'admin@puol.com',
    phone: '+237 6 XX XX XX XX',
    photoUrl: 'https://ui-avatars.com/api/?name=Admin+PUOL&background=2ECC71&color=fff&size=200',
  });

  // États pour changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      super_admin: { label: 'Super Administrateur', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      ops_manager: { label: 'Ops Manager', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      moderator: { label: 'Modérateur', color: 'bg-orange-100 text-orange-700 border-orange-200' },
      support: { label: 'Support', color: 'bg-green-100 text-green-700 border-green-200' },
      finance: { label: 'Finance', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      marketing: { label: 'Marketing', color: 'bg-pink-100 text-pink-700 border-pink-200' },
      tech: { label: 'Tech', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    };
    return badges[role] || { label: role, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  const roleBadge = currentAdmin ? getRoleBadge(currentAdmin.role) : null;
  const lastLogin = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSaveProfile = () => {
    // Simuler la sauvegarde
    toast.success('Profil mis à jour avec succès');
    // Fermer automatiquement
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleChangePassword = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    // Simuler le changement de mot de passe
    toast.success('Mot de passe modifié avec succès');
    setPasswordData({ current: '', new: '', confirm: '' });
    setShowPasswordChange(false);
    // Fermer automatiquement
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handlePhotoChange = () => {
    toast.info('Fonctionnalité de changement de photo en développement');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50">
      {/* Header fixe */}
      <div className="bg-gradient-to-r from-[#2ECC71] to-[#27ae60] px-8 py-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-white">Mon Profil</h1>
            <p className="text-sm text-white/90 mt-1">Gérez vos informations personnelles et vos préférences</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-10">
            {/* Colonne gauche : Photo + Infos générales */}
            <div className="space-y-6">
              {/* Photo de profil */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-52 h-52 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg">
                      <img
                        src={formData.photoUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={handlePhotoChange}
                      className="absolute bottom-3 right-3 w-14 h-14 bg-[#2ECC71] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#27ae60] transition-colors"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>
                  <h3 className="text-2xl mb-3">{formData.name}</h3>
                  {roleBadge && (
                    <span className={`inline-block text-base px-5 py-2 rounded-full border ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Dernière connexion */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 text-gray-700 mb-3">
                  <Clock className="w-5 h-5" />
                  <span className="text-base">Dernière connexion</span>
                </div>
                <p className="text-base text-gray-600 pl-8">{lastLogin}</p>
              </div>

              {/* Rôle et permissions */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 text-gray-700 mb-3">
                  <Shield className="w-5 h-5" />
                  <span className="text-base">Rôle et permissions</span>
                </div>
                <p className="text-base text-gray-600 pl-8">
                  {roleBadge?.label || 'Administrateur'}
                </p>
                <p className="text-sm text-gray-500 mt-2 pl-8">Accès complet au système</p>
              </div>

              {/* Déconnexion */}
              <Button
                variant="outline"
                onClick={onLogout}
                className="w-full text-red-600 border-red-300 hover:bg-red-50 h-12"
              >
                Déconnexion
              </Button>
            </div>

            {/* Colonne droite : Formulaire */}
            <div className="space-y-6">
              {!showPasswordChange ? (
                <>
                  {/* Informations personnelles */}
                  <div className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
                    <div className="pb-4 border-b border-gray-200">
                      <h4 className="text-xl text-gray-900 flex items-center gap-3">
                        <User className="w-6 h-6 text-[#2ECC71]" />
                        Informations personnelles
                      </h4>
                      <p className="text-base text-gray-500 mt-2 pl-9">Mettez à jour vos coordonnées</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="name" className="text-base text-gray-700 mb-3 block">
                        Nom complet
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-14 text-base"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-base text-gray-700 mb-3 block">
                        Adresse e-mail
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-12 h-14 text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-base text-gray-700 mb-3 block">
                        Numéro de téléphone <span className="text-gray-400">(facultatif)</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-12 h-14 text-base"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sécurité */}
                  <div className="bg-white rounded-2xl p-8 shadow-sm">
                    <div className="pb-4 border-b border-gray-200">
                      <h4 className="text-xl text-gray-900 flex items-center gap-3">
                        <Key className="w-6 h-6 text-[#2ECC71]" />
                        Sécurité
                      </h4>
                      <p className="text-base text-gray-500 mt-2 pl-9">Gérez votre mot de passe</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordChange(true)}
                      className="w-full h-14 border-gray-300 text-base mt-6"
                    >
                      <Key className="w-5 h-5 mr-2" />
                      Modifier le mot de passe
                    </Button>
                  </div>
                </>
              ) : (
                /* Formulaire de changement de mot de passe */
                <div className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <div>
                      <h4 className="text-xl text-gray-900 flex items-center gap-3">
                        <Key className="w-6 h-6 text-[#2ECC71]" />
                        Changer le mot de passe
                      </h4>
                      <p className="text-base text-gray-500 mt-2">Assurez-vous d'utiliser un mot de passe fort</p>
                    </div>
                    <button
                      onClick={() => setShowPasswordChange(false)}
                      className="text-base text-gray-500 hover:text-gray-700 underline"
                    >
                      Retour
                    </button>
                  </div>

                  <div>
                    <Label htmlFor="current-password" className="text-base text-gray-700 mb-3 block">
                      Mot de passe actuel
                    </Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                      className="h-14 text-base"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-password" className="text-base text-gray-700 mb-3 block">
                      Nouveau mot de passe
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                      className="h-14 text-base"
                      placeholder="••••••••"
                    />
                    <p className="text-base text-gray-500 mt-2">Minimum 8 caractères</p>
                  </div>

                  <div>
                    <Label htmlFor="confirm-password" className="text-base text-gray-700 mb-3 block">
                      Confirmer le mot de passe
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                      className="h-14 text-base"
                      placeholder="••••••••"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white h-14 text-base mt-4"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Enregistrer le nouveau mot de passe
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer fixe */}
      {!showPasswordChange && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-8 py-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-end">
            <Button
              onClick={handleSaveProfile}
              className="bg-[#2ECC71] hover:bg-[#27ae60] text-white h-14 px-10 text-base"
            >
              <Save className="w-5 h-5 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
