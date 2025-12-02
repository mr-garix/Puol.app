-- Ajouter le champ remaining_payment_status pour gérer le flux de paiement du solde
ALTER TABLE bookings 
ADD COLUMN remaining_payment_status TEXT DEFAULT 'idle' CHECK (remaining_payment_status IN ('idle', 'requested', 'paid'));

-- Ajouter un champ optionnel pour suivre quand la demande a été faite
ALTER TABLE bookings 
ADD COLUMN remaining_payment_requested_at TIMESTAMPTZ;

-- Créer un index pour optimiser les requêtes sur ce champ
CREATE INDEX idx_bookings_remaining_payment_status ON bookings(remaining_payment_status);
