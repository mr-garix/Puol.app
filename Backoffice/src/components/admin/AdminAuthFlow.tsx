import { useState } from 'react';
import { AdminSignUpPage } from './AdminSignUpPage';
import { AdminLoginPage } from './AdminLoginPage';

type AuthStep = 'signup' | 'login';

interface AdminAuthFlowProps {
  onLoginSuccess: (profile: any) => void;
}

export function AdminAuthFlow({ onLoginSuccess }: AdminAuthFlowProps) {
  const [step, setStep] = useState<AuthStep>('signup');
  const [phoneForLogin, setPhoneForLogin] = useState<string | null>(null);

  const handleSignUpSuccess = (phone: string) => {
    setPhoneForLogin(phone);
    setStep('login');
  };

  const handleBackToSignUp = () => {
    setStep('signup');
    setPhoneForLogin(null);
  };

  return (
    <>
      {step === 'signup' ? (
        <AdminSignUpPage onSignUpSuccess={handleSignUpSuccess} />
      ) : (
        <AdminLoginPageWithBackButton
          onLoginSuccess={onLoginSuccess}
          onBackToSignUp={handleBackToSignUp}
          initialPhone={phoneForLogin}
        />
      )}
    </>
  );
}

interface AdminLoginPageWithBackButtonProps {
  onLoginSuccess: (profile: any) => void;
  onBackToSignUp: () => void;
  initialPhone?: string | null;
}

function AdminLoginPageWithBackButton({
  onLoginSuccess,
  onBackToSignUp,
  initialPhone,
}: AdminLoginPageWithBackButtonProps) {
  return (
    <div className="relative">
      <AdminLoginPage onLoginSuccess={onLoginSuccess} initialPhone={initialPhone} />
      <button
        onClick={onBackToSignUp}
        className="absolute top-4 left-4 text-slate-400 hover:text-slate-200 transition-colors"
        title="Retour à l'inscription"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
}
