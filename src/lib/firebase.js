import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** True when .env is still blank — the UI shows setup instructions instead of
 *  a login screen that could only fail. */
export const isConfigured = Boolean(config.apiKey && config.projectId)

// Initialisation is skipped entirely when the config is blank. getAuth() throws
// on an empty apiKey, and it would throw at import time — before App could
// render the setup screen — so the guard has to live here, not just in the UI.
export const app = isConfigured ? initializeApp(config) : null

export const auth = app ? getAuth(app) : null

export const googleProvider = app ? withAccountChooser(new GoogleAuthProvider()) : null

// persistentLocalCache is what makes the PWA genuinely offline-capable: reads
// come from IndexedDB and writes queue locally until the connection returns.
// It must be set at init time — enableIndexedDbPersistence() is deprecated.
export const db = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null

function withAccountChooser(provider) {
  // Without this, a signed-in Google user is re-used silently and switching
  // accounts becomes impossible.
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}
