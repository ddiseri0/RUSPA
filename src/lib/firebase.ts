import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== '' &&
  firebaseConfig.projectId !== ''
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('Firebase init warning:', err);
  }
}

export { app, auth, db };

/**
 * Sign in anonymously or return a stable mock user if Firebase is not yet configured.
 */
export async function getOrCreatePlayerUser(savedId?: string): Promise<{ uid: string; isAnonymous: boolean }> {
  if (auth && isFirebaseConfigured) {
    try {
      const userCredential = await signInAnonymously(auth);
      return { uid: userCredential.user.uid, isAnonymous: true };
    } catch (e) {
      console.warn('Anonymous auth failed, falling back to local UID', e);
    }
  }

  // Local fallback UID for offline/preview testing (sessionStorage allows multiple tabs in the same browser)
  let localUid = savedId || sessionStorage.getItem('ruspa_player_uid');
  if (!localUid) {
    localUid = 'usr_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('ruspa_player_uid', localUid);
  }
  return { uid: localUid, isAnonymous: true };
}
