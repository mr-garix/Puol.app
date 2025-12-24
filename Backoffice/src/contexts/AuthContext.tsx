import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

interface UserData {
  firstName: string;
  lastName: string;
  gender: string;
  phone: string;
  dateOfBirth?: string;
  photo?: string;
  userType?: 'renter' | 'host' | 'landlord';
  city?: string;
  propertyTypes?: string[];
  propertyCount?: string;
}

export interface Reservation {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  propertyLocation: string;
  propertyAddress: string;
  hostName: string;
  hostPhone: string;
  hostEmail: string;
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
  totalPrice: number;
  pricePerNight: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Date;
}

export interface Visit {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  propertyLocation: string;
  visitDate: Date;
  visitTime: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Date;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userData: UserData | null;
  reservations: Reservation[];
  visits: Visit[];
  login: (data: UserData) => void;
  logout: () => void;
  updateUserData: (data: Partial<UserData>) => void;
  addReservation: (reservation: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => void;
  cancelReservation: (reservationId: string) => void;
  updateReservation: (reservationId: string, data: { checkInDate: Date; checkOutDate: Date; nights: number; totalPrice: number }) => void;
  addVisit: (visit: Omit<Visit, 'id' | 'createdAt' | 'status'>) => void;
  cancelVisit: (visitId: string) => void;
  updateVisit: (visitId: string, data: { visitDate: Date; visitTime: string }) => void;
  confirmVisit: (visitId: string) => void;
  hasReservationForProperty: (propertyId: string) => boolean;
  hasVisitForProperty: (propertyId: string) => boolean;
  getReservationForProperty: (propertyId: string) => Reservation | undefined;
  getVisitForProperty: (propertyId: string) => Visit | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Toujours démarrer déconnecté
  const [userData, setUserData] = useState<UserData | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  // Déconnexion automatique au démarrage de l'application
  useEffect(() => {
    // Effacer toutes les données d'authentification au démarrage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userData');
    localStorage.removeItem('reservations');
    localStorage.removeItem('visits');
  }, []); // S'exécute uniquement au montage initial

  // Persist auth state to localStorage (après le premier montage)
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('isAuthenticated', 'true');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (userData) {
      localStorage.setItem('userData', JSON.stringify(userData));
    }
  }, [userData]);

  useEffect(() => {
    if (reservations.length > 0) {
      localStorage.setItem('reservations', JSON.stringify(reservations));
    }
  }, [reservations]);

  useEffect(() => {
    if (visits.length > 0) {
      localStorage.setItem('visits', JSON.stringify(visits));
    }
  }, [visits]);

  const login = (data: UserData) => {
    setUserData(data);
    setIsAuthenticated(true);
    
    // Si c'est un hôte ou bailleur, sauvegarder le timestamp de début de vérification
    if (data.userType === 'host' || data.userType === 'landlord') {
      const verificationKey = `${data.userType}_verification_start_time`;
      // Ne sauvegarder que si ce n'est pas déjà défini (pour éviter de réinitialiser)
      if (!localStorage.getItem(verificationKey)) {
        localStorage.setItem(verificationKey, Date.now().toString());
      }
    }
  };

  const logout = () => {
    setUserData(null);
    setIsAuthenticated(false);
    setReservations([]);
    setVisits([]);
    localStorage.removeItem('userData');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('reservations');
    localStorage.removeItem('visits');
  };

  const updateUserData = (data: Partial<UserData>) => {
    setUserData(prev => prev ? { ...prev, ...data } : null);
  };

  const addReservation = (reservation: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => {
    const newReservation: Reservation = {
      ...reservation,
      id: Date.now().toString(),
      status: 'confirmed',
      createdAt: new Date(),
    };
    setReservations(prev => [newReservation, ...prev]);
  };

  const cancelReservation = (reservationId: string) => {
    setReservations(prev =>
      prev.map(res =>
        res.id === reservationId ? { ...res, status: 'cancelled' } : res
      )
    );
  };

  const updateReservation = (reservationId: string, data: { checkInDate: Date; checkOutDate: Date; nights: number; totalPrice: number }) => {
    setReservations(prev =>
      prev.map(res =>
        res.id === reservationId ? { ...res, ...data } : res
      )
    );
  };

  const addVisit = (visit: Omit<Visit, 'id' | 'createdAt' | 'status'>) => {
    const newVisit: Visit = {
      ...visit,
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date(),
    };
    setVisits(prev => [newVisit, ...prev]);
    
    // Timer automatique de 20 secondes pour confirmer la visite
    setTimeout(() => {
      setVisits(prevVisits => {
        const visitToConfirm = prevVisits.find(v => v.id === newVisit.id);
        if (visitToConfirm && visitToConfirm.status === 'pending') {
          // Afficher une notification avec bouton "Voir"
          const visitDate = visitToConfirm.visitDate instanceof Date 
            ? visitToConfirm.visitDate 
            : new Date(visitToConfirm.visitDate);
          
          toast.success(
            <div className="flex flex-col gap-2">
              <p className="font-medium">Visite confirmée !</p>
              <p className="text-sm text-gray-600">
                Votre visite pour {visitToConfirm.propertyTitle} est confirmée pour le {visitDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {visitToConfirm.visitTime}.
              </p>
            </div>,
            {
              duration: 6000,
              action: {
                label: 'Voir',
                onClick: () => {
                  // Naviguer vers le détail de cette visite spécifique
                  window.dispatchEvent(new CustomEvent('navigate-to-visit-details', { 
                    detail: { visitId: newVisit.id } 
                  }));
                }
              }
            }
          );
          
          return prevVisits.map(v => 
            v.id === newVisit.id 
              ? { ...v, status: 'confirmed' as const }
              : v
          );
        }
        return prevVisits;
      });
    }, 20000); // 20 secondes
  };

  const cancelVisit = (visitId: string) => {
    setVisits(prev =>
      prev.map(visit =>
        visit.id === visitId ? { ...visit, status: 'cancelled' } : visit
      )
    );
  };

  const updateVisit = (visitId: string, data: { visitDate: Date; visitTime: string }) => {
    setVisits(prev =>
      prev.map(visit =>
        visit.id === visitId ? { ...visit, ...data } : visit
      )
    );
  };

  const confirmVisit = (visitId: string) => {
    setVisits(prev =>
      prev.map(visit =>
        visit.id === visitId ? { ...visit, status: 'confirmed' as const } : visit
      )
    );
  };

  const hasReservationForProperty = (propertyId: string) => {
    return reservations.some(res => res.propertyId === propertyId && res.status === 'confirmed');
  };

  const hasVisitForProperty = (propertyId: string) => {
    return visits.some(visit => visit.propertyId === propertyId && visit.status === 'confirmed');
  };

  const getReservationForProperty = (propertyId: string) => {
    return reservations.find(res => res.propertyId === propertyId && res.status === 'confirmed');
  };

  const getVisitForProperty = (propertyId: string) => {
    return visits.find(visit => visit.propertyId === propertyId && visit.status === 'confirmed');
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userData, 
      reservations,
      visits,
      login, 
      logout,
      updateUserData,
      addReservation,
      cancelReservation,
      updateReservation,
      addVisit,
      cancelVisit,
      updateVisit,
      confirmVisit,
      hasReservationForProperty,
      hasVisitForProperty,
      getReservationForProperty,
      getVisitForProperty,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}