import React, { useEffect, type ReactNode } from 'react';
import { useRouter, type Href } from 'expo-router';

import { useAuth } from '@/src/contexts/AuthContext';

interface RequireAuthProps {
  children: ReactNode;
  redirectTo?: Href | string;
}

export const RequireAuth = ({ children, redirectTo = '/login' }: RequireAuthProps) => {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace(redirectTo as Href);
    }
  }, [isLoading, isLoggedIn, redirectTo, router]);

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
};
