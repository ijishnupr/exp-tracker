import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  browserPopupRedirectResolver,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider, isConfigured } from '../lib/firebase'

// Exported so tests and the dev preview harness can supply values directly.
export const AuthContext = createContext(null)

/** How long to wait for auth initialisation before telling the user something
 *  is wrong. Normal resolution is well under a second. */
const AUTH_INIT_TIMEOUT_MS = 10000

/** Marks that this tab kicked off a redirect sign-in, so the next load knows
 *  there is genuinely a result worth fetching. */
const REDIRECT_FLAG = 'exp-tracker:redirect-pending'

/** Reading sessionStorage throws outright in some blocked-storage contexts.
 *  Erring towards `true` there keeps redirect sign-in working; the cost is the
 *  old slow path, only for browsers that block storage entirely. */
function hasPendingRedirect() {
  try {
    return sessionStorage.getItem(REDIRECT_FLAG) !== null
  } catch {
    return true
  }
}

/** Popups are blocked inside some installed-PWA webviews; those report one of
 *  these codes, and redirect is the working fallback. */
const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/cancelled-popup-request',
])

/** The last signed-in user's public profile, kept so a returning user's app
 *  can draw at once instead of waiting on Auth. Online, Auth re-checks the
 *  saved account with Google before reporting it, a network round trip that
 *  made the app slower to open online than offline. Only display fields are
 *  stored; Firestore rules still require the real session for every read. */
const LAST_USER = 'exp-tracker:last-user'

function readLastUser() {
  try {
    const u = JSON.parse(localStorage.getItem(LAST_USER) ?? 'null')
    return u && typeof u.uid === 'string' ? u : null
  } catch {
    return null
  }
}

function writeLastUser(u) {
  try {
    if (u) {
      const { uid, displayName, email, photoURL } = u
      localStorage.setItem(LAST_USER, JSON.stringify({ uid, displayName, email, photoURL }))
    } else {
      localStorage.removeItem(LAST_USER)
    }
  } catch {
    // Blocked storage: the app simply waits for Auth, as before.
  }
}

export function AuthProvider({ children }) {
  // Starts from the remembered user, so the app shell renders on the first
  // frame; Auth's answer replaces it moments later, or signs the view out.
  const [user, setUser] = useState(() => (isConfigured ? readLastUser() : null))
  const [loading, setLoading] = useState(() => isConfigured && !readLastUser())
  const [error, setError] = useState(null)
  // Firebase Auth resolves its persisted state from IndexedDB. If that is
  // blocked — private windows, storage disabled, some extensions, a locked-down
  // browser — initialisation never settles and never errors, so without this
  // the app would sit on its loading screen indefinitely.
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setStalled(true), AUTH_INIT_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [loading])

  useEffect(() => {
    if (!isConfigured) return

    // Only resolve a redirect if this tab actually started one.
    //
    // getRedirectResult() is not free: it loads the auth helper iframe from the
    // authDomain, so calling it unconditionally makes every cold start wait on
    // the network — and offline, it waits for the full connection timeout while
    // the app sits on its loading screen. Since signInWithRedirect is only a
    // fallback for webviews that block popups, the overwhelming majority of
    // launches have no redirect to resolve.
    if (hasPendingRedirect()) {
      getRedirectResult(auth, browserPopupRedirectResolver)
        .catch((e) => setError(friendlyError(e)))
        .finally(() => {
          try {
            sessionStorage.removeItem(REDIRECT_FLAG)
          } catch {
            // Storage blocked; the flag simply expires with the session.
          }
        })
    }

    return onAuthStateChanged(
      auth,
      (u) => {
        setUser(u)
        setLoading(false)
        writeLastUser(u)
        if (u) void ensureProfile(u)
      },
      (e) => {
        setError(friendlyError(e))
        setLoading(false)
      },
    )
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      stalled,
      error,
      clearError: () => setError(null),
      signInWithGoogle: async () => {
        setError(null)
        try {
          await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver)
        } catch (e) {
          if (POPUP_UNAVAILABLE.has(e.code)) {
            try {
              sessionStorage.setItem(REDIRECT_FLAG, '1')
            } catch {
              // Storage blocked — getRedirectResult is skipped next load, so
              // fall back to calling it unconditionally in that case.
            }
            await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver)
            return
          }
          if (e.code === 'auth/popup-closed-by-user') return
          setError(friendlyError(e))
        }
      },
      logOut: () => {
        writeLastUser(null)
        return signOut(auth)
      },
    }),
    [user, loading, stalled, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Writes the profile doc once, on first sign-in. Merged rather than
 *  overwritten so a later currency change is not clobbered. */
async function ensureProfile(user) {
  const ref = doc(db, 'users', user.uid)
  try {
    const snap = await getDoc(ref)
    if (snap.exists()) return
    await setDoc(
      ref,
      {
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? '',
        currency: 'INR',
        createdAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch {
    // Offline on first launch: the profile is written on the next successful
    // sign-in, and the app reads its defaults meanwhile.
  }
}

function friendlyError(e) {
  switch (e?.code) {
    case 'auth/network-request-failed':
      return 'No connection. Sign-in needs to be online — once signed in the app works offline.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised in Firebase Auth. Add it under Authentication › Settings › Authorised domains.'
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this Firebase project. Enable it under Authentication › Sign-in method › Google.'
    default:
      return e?.message ?? 'Sign-in failed. Please try again.'
  }
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
