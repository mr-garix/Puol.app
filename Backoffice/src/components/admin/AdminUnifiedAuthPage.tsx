import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminAccount } from '@/lib/initializeAdmin';
import { verifyAdminOtp, sendAdminOtp } from '@/lib/adminAuthService';
import { normalizePhoneToE164 } from '@/lib/phoneUtils';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';
import { ArrowRight, User, Phone, Lock } from 'lucide-react';

interface AdminUnifiedAuthPageProps {
  onLoginSuccess: (profile: any) => void;
}

type AuthStep = 'info' | 'otp' | 'confirm';

export function AdminUnifiedAuthPage({ onLoginSuccess }: AdminUnifiedAuthPageProps) {
  const { setAuthenticatedUser } = useAdminAuth();
  const [step, setStep] = useState<AuthStep>('info');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleContinue = async () => {
    if (!formData.firstName.trim()) {
      setError('Veuillez entrer votre prénom');
      return;
    }
    if (!formData.lastName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Veuillez entrer votre numéro de téléphone');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Normaliser le téléphone une seule fois (cohérent avec le projet Expo)
      const normalizedPhone = normalizePhoneToE164(formData.phone);
      console.log('[AdminUnifiedAuthPage] Normalized phone:', normalizedPhone);

      // Créer le compte admin avec le téléphone normalisé
      console.log('[AdminUnifiedAuthPage] Creating admin account...');
      const accountCreated = await createAdminAccount(
        normalizedPhone,
        formData.firstName,
        formData.lastName
      );

      if (!accountCreated) {
        throw new Error('Erreur lors de la création du compte');
      }

      console.log('[AdminUnifiedAuthPage] Account created, sending OTP...');
      
      // Envoyer l'OTP avec le téléphone normalisé
      await sendAdminOtp(normalizedPhone);
      
      // Mettre à jour le formData avec le téléphone normalisé
      setFormData(prev => ({ ...prev, phone: normalizedPhone }));
      
      // Test: Vérifier que localStorage fonctionne
      console.log('[AdminUnifiedAuthPage] Testing localStorage...');
      localStorage.setItem('test_key', 'test_value');
      const testValue = localStorage.getItem('test_key');
      console.log('[AdminUnifiedAuthPage] localStorage test:', testValue === 'test_value' ? 'OK' : 'FAILED');
      localStorage.removeItem('test_key');
      
      setStep('otp');
      toast.success('Compte créé! Code OTP envoyé par SMS');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du compte';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    console.log('[AdminUnifiedAuthPage.handleVerifyOtp] START');
    
    if (!otp || otp.length < 6) {
      console.log('[AdminUnifiedAuthPage.handleVerifyOtp] Invalid OTP length:', otp.length);
      setError('Veuillez entrer un code OTP valide (6 chiffres)');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      console.log('[AdminUnifiedAuthPage.handleVerifyOtp] Verifying OTP with phone:', formData.phone);
      const result = await verifyAdminOtp(formData.phone, otp);
      console.log('[AdminUnifiedAuthPage.handleVerifyOtp] verifyAdminOtp result:', { hasProfile: !!result.profile, profileId: result.profile?.id });

      if (!result.profile) {
        throw new Error('Profil admin non trouvé');
      }

      console.log('[AdminUnifiedAuthPage.handleVerifyOtp] OTP verified successfully');
      
      // Créer l'objet utilisateur admin
      const firstName = result.profile.first_name || 'Admin';
      const adminUser = {
        id: result.profile.id,
        phone: result.profile.phone,
        first_name: firstName,
        last_name: result.profile.last_name || '',
        role: result.profile.role || 'admin',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=2ECC71&color=fff`,
      };
      
      console.log('[AdminUnifiedAuthPage.handleVerifyOtp] Setting authenticated user...');
      
      // Utiliser setAuthenticatedUser pour sauvegarder la session ET mettre à jour l'état
      setAuthenticatedUser(adminUser);
      
      console.log('[AdminUnifiedAuthPage.handleVerifyOtp] User authenticated');
      toast.success('Connexion réussie!');
      
      console.log('[AdminUnifiedAuthPage.handleVerifyOtp] Calling onLoginSuccess...');
      onLoginSuccess(result.profile);
      console.log('[AdminUnifiedAuthPage.handleVerifyOtp] SUCCESS');
    } catch (err) {
      console.error('[AdminUnifiedAuthPage.handleVerifyOtp] ERROR:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de la vérification du code OTP';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToInfo = () => {
    setStep('info');
    setOtp('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <svg className="h-16 w-16" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Logo PUOL - P avec maison */}
              <rect width="512" height="512" rx="100" fill="#2ECC71"/>
              <path d="M180 200L256 120L332 200V380H180V200Z" fill="white"/>
              <rect x="220" y="240" width="72" height="80" fill="#E8E8E8"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PUOL BackOffice</h1>
          <p className="text-gray-600">
            {step === 'info' 
              ? 'Connexion / Inscription' 
              : 'Vérifier votre numéro'}
          </p>
        </div>

        <Card className="border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900">
              {step === 'info' 
                ? 'Informations personnelles' 
                : 'Code de vérification'}
            </CardTitle>
            <CardDescription>
              {step === 'info'
                ? 'Entrez vos informations pour créer votre compte'
                : 'Entrez le code reçu par SMS'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'info' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleContinue(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline w-4 h-4 mr-2" />
                    Prénom
                  </label>
                  <Input
                    type="text"
                    placeholder="Alex"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={isLoading}
                    className="border-gray-300 text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline w-4 h-4 mr-2" />
                    Nom
                  </label>
                  <Input
                    type="text"
                    placeholder="Landjou"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={isLoading}
                    className="border-gray-300 text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline w-4 h-4 mr-2" />
                    Numéro de téléphone
                  </label>
                  <Input
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={isLoading}
                    className="border-gray-300 text-gray-900 placeholder-gray-400"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium"
                >
                  {isLoading ? 'Création en cours...' : 'Créer le compte et continuer'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <p className="text-xs text-gray-600 uppercase tracking-wider">Téléphone</p>
                  <p className="text-lg font-semibold text-gray-900">{formData.phone}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="inline w-4 h-4 mr-2" />
                    Code OTP (6 chiffres)
                  </label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isLoading}
                    maxLength={6}
                    className="border-gray-300 text-gray-900 placeholder-gray-400 text-center text-2xl tracking-widest font-mono"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToInfo}
                    disabled={isLoading}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || otp.length < 6}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Vérification...' : 'Vérifier et se connecter'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-6">
          {step === 'info'
            ? 'Vous recevrez un code OTP par SMS'
            : 'Vérifiez votre SMS pour le code de vérification'}
        </p>
      </div>
    </div>
  );
}
