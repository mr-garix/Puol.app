import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Phone, FileText } from 'lucide-react';
import { createRefund } from '@/lib/services/refunds';
import { PaymentMethodModal, type PaymentMethod, type PaymentDetails } from './PaymentMethodModal';

const REFUND_REASONS = [
  { value: 'reservation_cancelled', label: 'Réservation annulée' },
  { value: 'guest_request', label: 'Demande du client' },
  { value: 'damage', label: 'Dommages' },
  { value: 'other', label: 'Autre' },
];

interface RefundSectionProps {
  bookingId: string;
  guestProfileId: string;
  guestName: string;
  guestPhone?: string | null;
  totalAmount: number;
  onRefundCreated?: () => void;
}

export function RefundSection({
  bookingId,
  guestProfileId,
  guestName,
  guestPhone,
  totalAmount,
  onRefundCreated,
}: RefundSectionProps) {
  console.log('[RefundSection] Component mounted with props:', {
    bookingId,
    guestProfileId,
    guestName,
    guestPhone,
    totalAmount,
  });

  const [refundAmount, setRefundAmount] = useState<string>(totalAmount.toString());
  const [refundReason, setRefundReason] = useState<string>('reservation_cancelled');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(guestPhone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingRefundData, setPendingRefundData] = useState<any>(null);

  const handleRefund = async () => {
    setError(null);
    setSuccess(false);

    console.log('[RefundSection] handleRefund called');

    // Validation
    const amount = parseFloat(refundAmount);
    console.log('[RefundSection] Parsed amount:', amount);

    if (isNaN(amount) || amount <= 0) {
      console.warn('[RefundSection] Invalid amount:', amount);
      setError('Le montant doit être supérieur à 0');
      return;
    }

    if (amount > totalAmount) {
      console.warn('[RefundSection] Amount exceeds total:', { amount, totalAmount });
      setError(`Le montant ne peut pas dépasser ${totalAmount}`);
      return;
    }

    if (!phoneNumber.trim()) {
      console.warn('[RefundSection] Phone number missing');
      setError('Le numéro de téléphone est requis');
      return;
    }

    if (!refundReason) {
      console.warn('[RefundSection] Refund reason missing');
      setError('Veuillez sélectionner un motif');
      return;
    }

    console.log('[RefundSection] Validation passed, showing payment method modal');

    // Sauvegarder les données du remboursement en attente
    setPendingRefundData({
      bookingId,
      guestProfileId,
      refundAmount: amount,
      originalAmount: totalAmount,
      refundReason,
      refundNotes: refundNotes || null,
      phoneNumber,
    });

    // Afficher la modale de sélection de méthode de paiement
    setShowPaymentModal(true);
  };

  const handlePaymentMethodSelected = async (paymentMethod: PaymentMethod, paymentDetails: PaymentDetails) => {
    if (!pendingRefundData) return;

    setShowPaymentModal(false);
    setIsLoading(true);

    try {
      console.log('[RefundSection] Creating refund with payment method:', paymentMethod);
      console.log('[RefundSection] Payment details:', paymentDetails);
      
      const refund = await createRefund({
        ...pendingRefundData,
        paymentMethod,
        // Ajouter les détails de paiement spécifiques
        ...(paymentMethod === 'mtn_momo' && { phoneNumber: paymentDetails.mtnNumber }),
        ...(paymentMethod === 'orange_money' && { phoneNumber: paymentDetails.orangeNumber }),
      });

      console.log('[RefundSection] createRefund returned:', refund);

      if (refund) {
        console.log('[RefundSection] Refund created successfully');
        setSuccess(true);
        setRefundAmount(totalAmount.toString());
        setRefundNotes('');
        setRefundReason('reservation_cancelled');
        setPendingRefundData(null);
        onRefundCreated?.();
        
        // Reset success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        console.error('[RefundSection] createRefund returned null');
        setError('Erreur lors de la création du remboursement');
      }
    } catch (err) {
      console.error('[RefundSection] Exception during refund creation:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError('Une erreur est survenue lors du remboursement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm uppercase tracking-wide text-gray-500">Remboursement</h2>
      <Card className="border-gray-100">
        <CardContent className="p-6 space-y-4">
          {/* Montant à rembourser */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              Montant à rembourser (XAF)
            </label>
            <Input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="0"
              min="0"
              max={totalAmount}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500">Montant total disponible: {totalAmount} XAF</p>
          </div>

          {/* Motif du remboursement */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Motif du remboursement</label>
            <select
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {REFUND_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Numéro de téléphone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              Numéro de téléphone
            </label>
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500">Numéro pour recevoir le remboursement</p>
          </div>

          {/* Notes additionnelles */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Notes additionnelles (optionnel)
            </label>
            <textarea
              value={refundNotes}
              onChange={(e) => setRefundNotes(e.target.value)}
              placeholder="Ajoutez des notes sur ce remboursement..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Messages d'erreur et succès */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700">Remboursement créé avec succès ✓</p>
            </div>
          )}

          {/* Informations du client */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Client</p>
            <p className="text-sm font-medium text-gray-900">{guestName}</p>
            <p className="text-xs text-gray-500">{phoneNumber || 'Numéro non renseigné'}</p>
          </div>

          {/* Bouton de remboursement */}
          <Button
            onClick={handleRefund}
            disabled={isLoading}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200"
          >
            {isLoading ? 'Traitement en cours...' : 'Effectuer le remboursement'}
          </Button>
        </CardContent>
      </Card>

      {/* Modale de sélection de méthode de paiement */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPendingRefundData(null);
        }}
        onSelect={handlePaymentMethodSelected}
        isLoading={isLoading}
        amount={parseFloat(refundAmount) || 0}
      />
    </div>
  );
}
