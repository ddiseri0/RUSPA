import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { registraAvviso } from './registro';

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

/**
 * Inizializza Firestore con cache persistente su IndexedDB condivisa tra le schede.
 * - La cache locale consente snapshot immediati (latency compensation) anche su rete degradata
 *   e la lettura dello stato della stanza durante i cambi Wi-Fi/4G.
 * - `ignoreUndefinedProperties` evita che un campo opzionale `undefined` (es. `isDeclaredScopa`)
 *   faccia fallire in modo sincrono la scrittura, lasciando la UI in uno stato ottimistico orfano.
 * - Il long polling auto-rilevato aggira proxy/operatori mobili che bufferizzano gli stream.
 * In caso di HMR o doppia inizializzazione si riutilizza l'istanza esistente.
 */
function creaFirestore(firebaseApp: FirebaseApp): Firestore {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = creaFirestore(app);
  } catch (err) {
    registraAvviso('Firebase init warning:', err);
  }
}

export { app, auth, db };

let richiestaUtenteInCorso: Promise<{ uid: string; isAnonymous: boolean }> | null = null;

/**
 * Sign in anonymously or return a stable mock user if Firebase is not yet configured.
 *
 * Idratazione rapida: se la sessione anonima è già persistita in IndexedDB viene restituita
 * senza alcun round-trip di rete. La promessa è condivisa per evitare login multipli
 * (React StrictMode esegue due volte gli effetti in sviluppo).
 */
export function getOrCreatePlayerUser(
  savedId?: string
): Promise<{ uid: string; isAnonymous: boolean }> {
  if (!richiestaUtenteInCorso) {
    richiestaUtenteInCorso = risolviUtente(savedId).catch(err => {
      richiestaUtenteInCorso = null;
      throw err;
    });
  }
  return richiestaUtenteInCorso;
}

async function risolviUtente(savedId?: string): Promise<{ uid: string; isAnonymous: boolean }> {
  if (auth && isFirebaseConfigured) {
    try {
      await auth.authStateReady();
      if (auth.currentUser) {
        return { uid: auth.currentUser.uid, isAnonymous: auth.currentUser.isAnonymous };
      }
      const userCredential = await signInAnonymously(auth);
      return { uid: userCredential.user.uid, isAnonymous: true };
    } catch (e) {
      registraAvviso('Anonymous auth failed, falling back to local UID', e);
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
