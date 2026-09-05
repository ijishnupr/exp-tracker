/** How long to wait for a server acknowledgement before assuming the write is
 *  queued offline and letting the UI move on. */
export const ACK_GRACE_MS = 1200

/**
 * Firestore resolves a write promise only once the *server* acknowledges it.
 * With offline persistence the write is already applied to the local cache —
 * so `onSnapshot` fires and the UI is correct immediately — but the promise
 * stays pending for as long as the device is offline. Awaiting it would leave
 * the entry form spinning on "Saving…" for the whole time, which is exactly
 * when this app should feel fastest.
 *
 * So resolve as soon as either the server acks or the grace period elapses,
 * and surface a genuine rejection through `onError` rather than through the
 * caller, which by then has moved on.
 *
 * @param promise  the Firestore write
 * @param onError  receives a real rejection, whenever it eventually arrives
 * @param graceMs  overridable so tests need not wait
 */
export function settleLocally(promise, onError, graceMs = ACK_GRACE_MS) {
  promise.catch((e) => onError?.(e))
  return Promise.race([
    promise.catch(() => {}),
    new Promise((resolve) => {
      setTimeout(resolve, graceMs)
    }),
  ])
}
