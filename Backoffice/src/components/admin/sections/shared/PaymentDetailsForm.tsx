import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, DollarSign, CreditCard } from 'lucide-react';
import type { PaymentMethod } from './PaymentMethodModal';

interface PaymentDetailsFormProps {
  paymentMethod: PaymentMethod;
  mtnNumber: string;
  onMtnNumberChange: (value: string) => void;
  orangeNumber: string;
  onOrangeNumberChange: (value: string) => void;
  bankRib: string;
  onBankRibChange: (value: string) => void;
  bankAccountHolder: string;
  onBankAccountHolderChange: (value: string) => void;
  bankAccountNumber: string;
  onBankAccountNumberChange: (value: string) => void;
}

export function PaymentDetailsForm({
  paymentMethod,
  mtnNumber,
  onMtnNumberChange,
  orangeNumber,
  onOrangeNumberChange,
  bankRib,
  onBankRibChange,
  bankAccountHolder,
  onBankAccountHolderChange,
  bankAccountNumber,
  onBankAccountNumberChange,
}: PaymentDetailsFormProps) {
  return (
    <Card className="border-gray-100 bg-gray-50">
      <CardContent className="p-6 space-y-4">
        {paymentMethod === 'mtn_momo' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">Détails MTN Money</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Numéro MTN Money
              </label>
              <Input
                type="tel"
                value={mtnNumber}
                onChange={(e) => onMtnNumberChange(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                className="rounded-lg"
              />
              <p className="text-xs text-gray-500">
                Numéro de téléphone MTN du client pour recevoir le remboursement
              </p>
            </div>
          </div>
        )}

        {paymentMethod === 'orange_money' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Détails Orange Money</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Numéro Orange Money
              </label>
              <Input
                type="tel"
                value={orangeNumber}
                onChange={(e) => onOrangeNumberChange(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                className="rounded-lg"
              />
              <p className="text-xs text-gray-500">
                Numéro de téléphone Orange du client pour recevoir le remboursement
              </p>
            </div>
          </div>
        )}

        {paymentMethod === 'card' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Détails Compte Bancaire</h3>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Titulaire du compte
              </label>
              <Input
                type="text"
                value={bankAccountHolder}
                onChange={(e) => onBankAccountHolderChange(e.target.value)}
                placeholder="Nom complet du titulaire"
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                RIB (Relevé d'Identité Bancaire)
              </label>
              <Input
                type="text"
                value={bankRib}
                onChange={(e) => onBankRibChange(e.target.value)}
                placeholder="IBAN ou RIB du compte"
                className="rounded-lg"
              />
              <p className="text-xs text-gray-500">
                Numéro IBAN ou RIB complet du compte bancaire
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Numéro de compte (optionnel)
              </label>
              <Input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => onBankAccountNumberChange(e.target.value)}
                placeholder="Numéro de compte bancaire"
                className="rounded-lg"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
