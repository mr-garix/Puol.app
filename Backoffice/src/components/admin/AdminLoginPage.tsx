import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { sendAdminOtp, verifyAdminOtp } from '@/lib/adminAuthService';
import { toast } from 'sonner';
import { Phone, Lock, ArrowRight } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (profile: any) => void;
  initialPhone?: string | null;
}

export function AdminLoginPage({ onLoginSuccess, initialPhone }: AdminLoginPageProps) {
  const [step, setStep] = useState<'phone' | 'otp'>(initialPhone ? 'otp' : 'phone');
  const [phone, setPhone] = useState(initialPhone || '');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!phone.trim()) {
        throw new Error('Veuillez entrer un numéro de téléphone');
      }

      await sendAdminOtp(phone);
      setStep('otp');
      toast.success('Code OTP envoyé à votre numéro de téléphone');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'envoi du code OTP';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!otp.trim() || otp.length < 4) {
        throw new Error('Veuillez entrer un code OTP valide');
      }

      const result = await verifyAdminOtp(phone, otp);
      toast.success('Connexion réussie!');
      onLoginSuccess(result.profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la vérification du code OTP';
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
          <p className="text-slate-400">Connexion administrateur</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              {step === 'phone' ? 'Numéro de téléphone' : 'Code de vérification'}
            </CardTitle>
            <CardDescription>
              {step === 'phone'
                ? 'Entrez votre numéro pour recevoir un code OTP'
                : 'Entrez le code reçu par SMS'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    <Phone className="inline w-4 h-4 mr-2" />
                    Numéro de téléphone
                  </label>
                  <Input
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                  {isLoading ? 'Envoi en cours...' : 'Envoyer le code OTP'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
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
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Button
                    type="submit"
                    disabled={isLoading || otp.length < 6}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white disabled:opacity-50"
                  >
                    {isLoading ? 'Vérification en cours...' : 'Vérifier le code'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                      setError(null);
                    }}
                    disabled={isLoading}
                    className="w-full border-slate-600 text-slate-200 hover:bg-slate-700"
                  >
                    Retour
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          {step === 'phone'
            ? 'Vous recevrez un code OTP par SMS'
            : 'Vérifiez votre SMS pour le code de vérification'}
        </p>
      </div>
    </div>
  );
}
