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
