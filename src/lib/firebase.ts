import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Support both Next.js (process.env.NEXT_PUBLIC_*) and Vite (import.meta.env.*)
const env: Record<string, string | undefined> = 
  typeof import.meta !== 'undefined' && (import.meta as any).env 
    ? (import.meta as any).env 
    : {};

const rawApiKey =
  env.VITE_FIREBASE_API_KEY ||
  env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_API_KEY) ||
  firebaseConfigJson?.apiKey ||
  '';

const rawProjectId =
  env.VITE_FIREBASE_PROJECT_ID ||
  env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ||
  firebaseConfigJson?.projectId ||
  '';

export const isFirebaseConfigured = Boolean(rawApiKey && rawProjectId);

// Build-safe fallback config if keys are not configured yet
const firebaseConfig = {
  apiKey: rawApiKey || 'AIzaSyBuildSafePlaceholderKey000000000000',
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) ||
    firebaseConfigJson?.authDomain ||
    'vocalswap-demo.firebaseapp.com',
  projectId: rawProjectId || 'vocalswap-demo-project',
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) ||
    firebaseConfigJson?.storageBucket ||
    'vocalswap-demo.appspot.com',
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) ||
    firebaseConfigJson?.messagingSenderId ||
    '1234567890',
  appId:
    env.VITE_FIREBASE_APP_ID ||
    env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_APP_ID) ||
    firebaseConfigJson?.appId ||
    '1:1234567890:web:abcdef123456',
};

// Initialize Firebase singleton safely without throwing during SSR / build
let app: FirebaseApp;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (e) {
  // If already initialized or in strict build environment
  app = getApps().length ? getApp() : initializeApp(firebaseConfig, 'vocalswap-app');
}

// Initialize Firestore
const firestoreDatabaseId = firebaseConfigJson?.firestoreDatabaseId;
export const db: Firestore = firestoreDatabaseId && firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

export { app, firebaseConfig };
