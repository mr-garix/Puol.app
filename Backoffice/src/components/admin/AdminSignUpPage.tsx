import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminAccount } from '@/lib/initializeAdmin';
import { toast } from 'sonner';
import { ArrowRight, User, Phone, Mail } from 'lucide-react';

interface AdminSignUpPageProps {
  onSignUpSuccess: (phone: string) => void;
}

export function AdminSignUpPage({ onSignUpSuccess }: AdminSignUpPageProps) {
  const [step, setStep] = useState<'info' | 'confirm'>('info');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleContinue = () => {
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

    setStep('confirm');
  };

  const handleSignUp = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const success = await createAdminAccount(
        formData.phone,
        formData.firstName,
        formData.lastName
      );

      if (!success) {
        throw new Error('Erreur lors de la création du compte');
      }

      toast.success('Compte créé avec succès!');
      onSignUpSuccess(formData.phone);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du compte';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full mb-4">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PUOL BackOffice</h1>
          <p className="text-slate-400">Créer un compte administrateur</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              {step === 'info' ? 'Informations personnelles' : 'Confirmer votre inscription'}
            </CardTitle>
            <CardDescription>
              {step === 'info'
                ? 'Entrez vos informations pour créer un compte admin'
                : 'Vérifiez vos informations avant de continuer'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'info' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleContinue(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    <User className="inline w-4 h-4 mr-2" />
                    Prénom
                  </label>
                  <Input
                    type="text"
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    <User className="inline w-4 h-4 mr-2" />
                    Nom
                  </label>
                  <Input
                    type="text"
                    placeholder="Dupont"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    <Phone className="inline w-4 h-4 mr-2" />
                    Numéro de téléphone
                  </label>
                  <Input
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                >
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Prénom</p>
                    <p className="text-lg font-semibold text-white">{formData.firstName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Nom</p>
                    <p className="text-lg font-semibold text-white">{formData.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Téléphone</p>
                    <p className="text-lg font-semibold text-white">{formData.phone}</p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('info')}
                    disabled={isLoading}
                    className="flex-1 border-slate-600 text-slate-200 hover:bg-slate-700"
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSignUp}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                  >
                    {isLoading ? 'Création en cours...' : 'Créer le compte'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          Vous recevrez un code OTP par SMS pour vérifier votre numéro
        </p>
      </div>
    </div>
  );
}
