// Coordinates "session expired while working" (US2-4): callers wait for the
// re-login dialog, which resolves them after a successful login.
type Listener = () => void

let waiters: Array<{ resolve: () => void; reject: (e: Error) => void }> = []
const openListeners = new Set<Listener>()

/** Asks the dialog to open; resolves after the admin has logged in again. */
export function waitForRelogin(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Pages without the dialog (full-screen previews) can't wait for it.
    if (!openListeners.size) return reject(new Error('Sesi berakhir, silakan masuk lagi'))
    waiters.push({ resolve, reject })
    openListeners.forEach((l) => l())
  })
}

export function onReloginRequested(listener: Listener): () => void {
  openListeners.add(listener)
  return () => openListeners.delete(listener)
}

export function reloginSucceeded() {
  const pending = waiters
  waiters = []
  pending.forEach((w) => w.resolve())
}

export function reloginCancelled() {
  const pending = waiters
  waiters = []
  pending.forEach((w) => w.reject(new Error('Sesi berakhir')))
}
