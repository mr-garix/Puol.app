import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreditCard, DollarSign, CheckCircle2 } from 'lucide-react';
import { getHostPayouts, processHostPayout, type HostPayout } from '@/lib/services/hostPayouts';

interface HostPayoutSectionProps {
  hostProfileId: string;
}

type PaymentMethod = 'orange_money' | 'mtn_momo' | 'bank_transfer';

export function HostPayoutSection({ hostProfileId }: HostPayoutSectionProps) {
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [payouts, setPayouts] = useState<HostPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('orange_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reference, setReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPayoutData();
  }, [hostProfileId]);

  const loadPayoutData = async () => {
    try {
      setIsLoading(true);
      const payoutsList = await getHostPayouts(hostProfileId);
      
      // Calculer le total disponible (somme des payouts avec status 'pending')
      const total = payoutsList
        .filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
      
      setTotalAvailable(total);
      setPayouts(payoutsList);
    } catch (error) {
      console.error('[HostPayoutSection] Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!reference.trim()) {
      alert('Veuillez entrer une référence de paiement');
      return;
    }

    try {
      setIsProcessing(true);
      await processHostPayout({
        hostProfileId,
        method: paymentMethod,
        reference,
        phoneNumber: paymentMethod !== 'bank_transfer' ? phoneNumber : undefined,
      });

      // Recharger les données
      await loadPayoutData();
      setIsPayoutModalOpen(false);
      setReference('');
      setPhoneNumber('');
      alert('Paiement effectué avec succès');
    } catch (error) {
      console.error('[HostPayoutSection] Erreur paiement:', error);
      alert('Erreur lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-gray-100 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase text-gray-600 font-semibold">Disponible pour retrait</p>
              <p className="text-4xl font-bold text-emerald-700 mt-2">
                {totalAvailable.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-emerald-200 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-emerald-700" />
            </div>
          </div>
          <Button
            onClick={() => setIsPayoutModalOpen(true)}
            disabled={totalAvailable === 0}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Effectuer un paiement
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-gray-100">
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-lg font-semibold text-gray-900">Historique des paiements</p>
            <p className="text-sm text-gray-500">Tous les paiements effectués</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout: any) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-semibold">
                    {(payout.total_amount || 0).toLocaleString('fr-FR')} FCFA
                  </TableCell>
                  <TableCell className="text-sm">
                    {payout.payout_method === 'orange_money' && 'Orange Money'}
                    {payout.payout_method === 'mtn_momo' && 'MTN MoMo'}
                    {payout.payout_method === 'bank_transfer' && 'Virement bancaire'}
                    {!payout.payout_method && '—'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{payout.payout_reference || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {payout.paid_at
                      ? new Date(payout.paid_at).toLocaleDateString('fr-FR')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        payout.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }
                    >
                      {payout.status === 'paid' ? 'Payé' : 'Disponible'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {payouts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-8">
                    Aucun paiement enregistré
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Effectuer un paiement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Montant à payer</p>
              <p className="text-2xl font-bold text-emerald-700">
                {totalAvailable.toLocaleString('fr-FR')} FCFA
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Méthode de paiement</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod !== 'bank_transfer' && (
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  placeholder="Ex: +237 6XX XXX XXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reference">Référence de paiement</Label>
              <Input
                id="reference"
                placeholder="Ex: TRX-2024-001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setIsPayoutModalOpen(false)}
                disabled={isProcessing}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleProcessPayout}
                disabled={isProcessing}
              >
                {isProcessing ? 'Traitement...' : 'Confirmer le paiement'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
