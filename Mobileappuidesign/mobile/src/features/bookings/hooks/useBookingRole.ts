import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/src/constants/storageKeys';

export type BookingRole = 'host' | 'guest';

interface UseBookingRoleReturn {
  role: BookingRole;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const normalizeRole = (value: string | null): BookingRole => {
  return value === 'host' ? 'host' : 'guest';
};

export const useBookingRole = (): UseBookingRoleReturn => {
  const [role, setRole] = useState<BookingRole>('guest');
  const [isLoading, setIsLoading] = useState(true);

  const loadRole = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedRole = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
      setRole(normalizeRole(storedRole));
    } catch (error) {
      console.warn('[useBookingRole] Failed to read role from storage', error);
      setRole('guest');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  return { role, isLoading, refresh: loadRole };
};
