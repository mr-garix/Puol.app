export type HostReservation = {
  id: string;
  guestName: string;
  guestHandle: string;
  guestPhone: string;
  propertyName: string;
  propertyAddress: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  nightlyRate: number;
  totalAmount: number;
  status: 'confirmée' | 'en_attente' | 'annulée';
  createdAt: string;
  payoutBreakdown: {
    paidOnline: number;
    dueOnArrival: number;
  };
  note: string;
};

const FRACTION_THRESHOLD = 8;
const ARRIVAL_NIGHTS = 2;

const makeReservation = (config: {
  id: string;
  guestName: string;
  guestHandle: string;
  guestPhone: string;
  propertyName: string;
  propertyAddress: string;
  checkIn: string;
  nights: number;
  guests: number;
  nightlyRate: number;
  status?: HostReservation['status'];
  note: string;
}): HostReservation => {
  const { nights, nightlyRate } = config;
  const totalAmount = nights * nightlyRate;
  const shouldSplit = nights > FRACTION_THRESHOLD;
  const paidOnline = shouldSplit ? (nights - ARRIVAL_NIGHTS) * nightlyRate : totalAmount;
  const dueOnArrival = totalAmount - paidOnline;

  const checkInDate = new Date(config.checkIn);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + nights);

  return {
    id: config.id,
    guestName: config.guestName,
    guestHandle: config.guestHandle,
    guestPhone: config.guestPhone,
    propertyName: config.propertyName,
    propertyAddress: config.propertyAddress,
    checkIn: checkInDate.toISOString(),
    checkOut: checkOutDate.toISOString(),
    nights,
    guests: config.guests,
    nightlyRate,
    totalAmount,
    status: config.status ?? 'confirmée',
    createdAt: new Date().toISOString(),
    payoutBreakdown: { paidOnline, dueOnArrival },
    note: config.note,
  };
};

export const HOST_RESERVATIONS: HostReservation[] = [
  makeReservation({
    id: 'res-2025-0001',
    guestName: 'Nina Fokou',
    guestHandle: '@ninaf',
    guestPhone: '+237 691 22 33 44',
    propertyName: 'Loft premium Bonapriso',
    propertyAddress: 'Rue Tokoto, Douala',
    checkIn: '2025-12-04',
    nights: 5,
    guests: 2,
    nightlyRate: 45000,
    note: 'Arrivée prévue vers 18h, souhaite un check-in autonome.',
  }),
  makeReservation({
    id: 'res-2025-0002',
    guestName: 'Karl Ndongo',
    guestHandle: '@karlnd',
    guestPhone: '+237 678 90 12 34',
    propertyName: 'Résidence Makepe Horizon',
    propertyAddress: 'Makepe bloc L, Douala',
    checkIn: '2025-12-10',
    nights: 10,
    guests: 3,
    nightlyRate: 40000,
    note: 'Séjour long : a demandé un nettoyage intermédiaire au 6e jour.',
  }),
];
