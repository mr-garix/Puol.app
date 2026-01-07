import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreditCard, Smartphone, DollarSign } from 'lucide-react';
import { PaymentDetailsForm } from './PaymentDetailsForm';

export type PaymentMethod = 'card' | 'mtn_momo' | 'orange_money';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: PaymentMethod, details: PaymentDetails) => void;
  isLoading?: boolean;
  amount: number;
}

export interface PaymentDetails {
  mtnNumber?: string;
  orangeNumber?: string;
  bankRib?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
}

const paymentMethods = [
  {
    id: 'card' as PaymentMethod,
    label: 'Carte Bancaire',
    description: 'Visa, Mastercard, etc.',
    icon: CreditCard,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    id: 'mtn_momo' as PaymentMethod,
    label: 'MTN Money',
    description: 'Portefeuille mobile MTN',
    icon: Smartphone,
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  {
    id: 'orange_money' as PaymentMethod,
    label: 'Orange Money',
    description: 'Portefeuille mobile Orange',
    icon: DollarSign,
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    iconColor: 'text-orange-600',
  },
];

export function PaymentMethodModal({
  isOpen,
  onClose,
  onSelect,
  isLoading = false,
  amount,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [mtnNumber, setMtnNumber] = useState('');
  const [orangeNumber, setOrangeNumber] = useState('');
  const [bankRib, setBankRib] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async () => {
    if (!selectedMethod) return;

    setError(null);

    // Validation des champs requis selon la méthode
    if (selectedMethod === 'mtn_momo' && !mtnNumber.trim()) {
      setError('Le numéro MTN Money est requis');
      return;
    }

    if (selectedMethod === 'orange_money' && !orangeNumber.trim()) {
      setError('Le numéro Orange Money est requis');
      return;
    }

    if (selectedMethod === 'card') {
      if (!bankAccountHolder.trim()) {
        setError('Le nom du titulaire est requis');
        return;
      }
      if (!bankRib.trim()) {
        setError('Le RIB est requis');
        return;
      }
    }

    const details: PaymentDetails = {
      mtnNumber: mtnNumber || undefined,
      orangeNumber: orangeNumber || undefined,
      bankRib: bankRib || undefined,
      bankAccountHolder: bankAccountHolder || undefined,
      bankAccountNumber: bankAccountNumber || undefined,
    };

    onSelect(selectedMethod, details);
    resetForm();
  };

  const resetForm = () => {
    setSelectedMethod(null);
    setMtnNumber('');
    setOrangeNumber('');
    setBankRib('');
    setBankAccountHolder('');
    setBankAccountNumber('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const currencyFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sélectionner la méthode de paiement</DialogTitle>
          <DialogDescription>
            Choisissez comment rembourser le client ({currencyFormatter.format(amount)})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;

              return (
                <Card
                  key={method.id}
                  className={`p-4 cursor-pointer border-2 transition-all ${
                    isSelected
                      ? `${method.color.split(' ')[0]} border-current`
                      : `${method.color} border-transparent`
                  }`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${method.color.split(' ')[0]}`}>
                      <Icon className={`w-6 h-6 ${method.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{method.label}</p>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Formulaire de détails de paiement */}
          {selectedMethod && (
            <PaymentDetailsForm
              paymentMethod={selectedMethod}
              mtnNumber={mtnNumber}
              onMtnNumberChange={setMtnNumber}
              orangeNumber={orangeNumber}
              onOrangeNumberChange={setOrangeNumber}
              bankRib={bankRib}
              onBankRibChange={setBankRib}
              bankAccountHolder={bankAccountHolder}
              onBankAccountHolderChange={setBankAccountHolder}
              bankAccountNumber={bankAccountNumber}
              onBankAccountNumberChange={setBankAccountNumber}
            />
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedMethod || isLoading}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200"
          >
            {isLoading ? 'Traitement...' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
