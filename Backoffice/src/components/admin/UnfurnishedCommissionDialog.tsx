import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CheckCircle, DollarSign } from 'lucide-react';
import { formatCurrency, calculateUnfurnishedCommission } from '../../lib/revenueMetrics';
import { toast } from 'sonner';

interface UnfurnishedCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  propertyName?: string;
  onCommissionValidated?: (monthlyRent: number, commission: number) => void;
}

export function UnfurnishedCommissionDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName = 'Logement non meublé',
  onCommissionValidated,
}: UnfurnishedCommissionDialogProps) {
  const [monthlyRent, setMonthlyRent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rentValue = parseFloat(monthlyRent.replace(/\s/g, '')) || 0;
  const commission = calculateUnfurnishedCommission(rentValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rentValue < 10000) {
      toast.error('Le loyer mensuel doit être d\'au moins 10 000 FCFA');
      return;
    }

    setIsSubmitting(true);
    
    // Simule l'envoi API
    setTimeout(() => {
      toast.success(
        `Commission validée : ${formatCurrency(commission)}`,
        {
          description: `Loyer mensuel : ${formatCurrency(rentValue)}`,
        }
      );
      
      if (onCommissionValidated) {
        onCommissionValidated(rentValue, commission);
      }
      
      setIsSubmitting(false);
      setMonthlyRent('');
      onOpenChange(false);
    }, 800);
  };

  const handleClose = () => {
    setMonthlyRent('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Contrat signé - Commission non meublé
          </DialogTitle>
          <DialogDescription>
            Validez la commission PUOL pour ce logement non meublé
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom du bien */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Annonce</p>
            <p className="text-sm text-gray-900 mt-1">{propertyName}</p>
          </div>

          {/* Montant du loyer mensuel */}
          <div className="space-y-2">
            <Label htmlFor="monthlyRent">
              Montant du loyer mensuel <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="monthlyRent"
                type="number"
                placeholder="85 000"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                className="pl-10 rounded-xl"
                min="10000"
                step="1000"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              Loyer mensuel convenu dans le contrat (en FCFA)
            </p>
          </div>

          {/* Calcul automatique de la commission */}
          {rentValue >= 10000 && (
            <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Commission PUOL</p>
                <p className="text-xs text-gray-500">(1 mois de loyer)</p>
              </div>
              <p className="text-3xl text-[#2ECC71]">{formatCurrency(commission)}</p>
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Ajouté au GMV</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-600">Ajouté au CA PUOL</span>
                  <span className="text-green-600">✓</span>
                </div>
              </div>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rentValue < 10000}
              className="flex-1 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Validation...
                </span>
              ) : (
                'Valider la commission'
              )}
            </Button>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
            <p className="text-xs text-gray-700">
              <strong>ℹ️ Commission non-meublé :</strong> PUOL prend 1 mois de loyer comme commission
              lors de la signature du contrat. Cette commission est ajoutée automatiquement au GMV et
              au chiffre d'affaires PUOL.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
