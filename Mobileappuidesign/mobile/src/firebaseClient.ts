// DEPRECATED: Firebase Auth is being phased out in favor of Supabase Auth (OTP)
// Keeping this file for potential rollback, but it's no longer used
// See: AuthContext.tsx for Supabase Auth implementation

/*
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyAyHXNxELIVMCt3qD1ErvHwFJV5e8x39Yc',
  authDomain: 'puol-87ffb.firebaseapp.com',
  projectId: 'puol-87ffb',
  storageBucket: 'puol-87ffb.firebasestorage.app',
  messagingSenderId: '948377780740',
  appId: '1:948377780740:web:c28bf12d91fb524fd9ab51',
  measurementId: 'G-GSQF4F7Q15',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});
*/

// Placeholder exports to avoid breaking imports during transition
export const firebaseAuth = null as any;
export const firebaseApp = null as any;
export const firebaseConfig = {};
