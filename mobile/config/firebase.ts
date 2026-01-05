// Firebase configuration for mobile app
import { initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Use the same Firebase config as the web app
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123:demo',
};

console.log('[Firebase] Initializing with config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
// firebase@12.x does not ship a React Native persistence adapter.
// Use in-memory persistence (and fall back to getAuth() during hot reload).
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: inMemoryPersistence,
    });
  } catch {
    return getAuth(app);
  }
})();

// Initialize services
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

export const isDemoMode = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

console.log('[Firebase] Demo mode:', isDemoMode);

export default app;
