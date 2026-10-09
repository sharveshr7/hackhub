import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

// Exact Firebase Project Configuration (foceye-2546c)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "foceye-2546c.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://foceye-2546c-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "foceye-2546c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "foceye-2546c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "829196148602",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:829196148602:web:6d877b6c3f9fac5cf240c3"
};

// Initialize Firebase only once
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  }).catch(() => {
    // Unsupported in environments without ServiceWorker
  });

  const appCheckKey = import.meta.env.VITE_FIREBASE_APPCHECK_KEY;
  if (appCheckKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckKey),
        isTokenAutoRefreshEnabled: true
      });
    } catch (err) {
      console.info('Firebase App Check initialization note:', err);
    }
  }
}

export { messaging };
export const isFirebaseConfigured = true;
