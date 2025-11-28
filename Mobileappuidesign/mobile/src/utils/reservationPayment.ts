export type UpfrontPaymentInfo = {
  amountDueNow: number;
  remainingAmount: number;
  nightsPaid: number;
  remainingNights: number;
  message?: string;
};

export const computeUpfrontPayment = (nights: number, pricePerNight: number): UpfrontPaymentInfo => {
  if (nights <= 0 || pricePerNight <= 0) {
    return {
      amountDueNow: 0,
      remainingAmount: 0,
      nightsPaid: 0,
      remainingNights: 0,
    };
  }

  const totalAmount = nights * pricePerNight;

  if (nights < 8) {
    return {
      amountDueNow: totalAmount,
      remainingAmount: 0,
      nightsPaid: nights,
      remainingNights: 0,
    };
  }

  const deferredNights = Math.min(2, nights);
  const nightsPaid = Math.max(nights - deferredNights, 0);
  const amountDueNow = nightsPaid * pricePerNight;
  const remainingNights = deferredNights;
  const remainingAmount = remainingNights * pricePerNight;
  const formatAmount = (value: number) => value.toLocaleString('fr-FR');

  return {
    amountDueNow,
    remainingAmount,
    nightsPaid,
    remainingNights,
    message:
      remainingNights > 0
        ? `Pour les séjours de ${nights} nuits, vous réglez ${nightsPaid} nuits maintenant (${formatAmount(amountDueNow)} FCFA) et les ${remainingNights} nuits restantes (${formatAmount(remainingAmount)} FCFA) seront réglées à l'arrivée.`
        : undefined,
  };
};
