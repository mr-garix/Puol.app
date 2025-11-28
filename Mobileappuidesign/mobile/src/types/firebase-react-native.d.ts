import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  function getReactNativePersistence(storage: any): Persistence;
}
