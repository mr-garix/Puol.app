-- Trigger pour libérer les dates de disponibilité quand une réservation est annulée ou supprimée
-- Ce trigger supprime les entrées dans listing_availability quand le statut d'un booking passe à 'cancelled'
-- ou quand un booking est supprimé

CREATE OR REPLACE FUNCTION release_listing_availability_on_booking_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le booking est annulé (statut = 'cancelled')
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Supprimer les entrées de disponibilité pour cette réservation
    DELETE FROM listing_availability
    WHERE listing_id = NEW.listing_id
      AND date >= NEW.checkin_date::date
      AND date < NEW.checkout_date::date
      AND status = 'reserved';
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour les UPDATE (changement de statut)
DROP TRIGGER IF EXISTS trigger_release_availability_on_booking_cancel ON bookings;
CREATE TRIGGER trigger_release_availability_on_booking_cancel
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION release_listing_availability_on_booking_cancel();

-- Trigger pour supprimer les dates quand un booking est supprimé
CREATE OR REPLACE FUNCTION release_listing_availability_on_booking_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Supprimer les entrées de disponibilité pour cette réservation
  DELETE FROM listing_availability
  WHERE listing_id = OLD.listing_id
    AND date >= OLD.checkin_date::date
    AND date < OLD.checkout_date::date
    AND status = 'reserved';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour les DELETE
DROP TRIGGER IF EXISTS trigger_release_availability_on_booking_delete ON bookings;
CREATE TRIGGER trigger_release_availability_on_booking_delete
BEFORE DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION release_listing_availability_on_booking_delete();
