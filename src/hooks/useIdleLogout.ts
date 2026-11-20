import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionManager } from '../services/session/sessionManager';
import { getIdleState, markActivity, IDLE_LOGOUT_FLAG } from '../services/session/idleTimeout';

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];

/**
 * Logs the signed-in user out after 5 minutes without activity, with a
 * 30-second warning first. Mount only inside the signed-in layout.
 */
export function useIdleLogout() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const loggingOut = useRef(false);

  const logout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try { window.sessionStorage.setItem(IDLE_LOGOUT_FLAG, '1'); } catch { /* ignore */ }
    await sessionManager.forceLogout('IDLE_TIMEOUT');
  }, []);

  const check = useCallback(() => {
    if (!sessionManager.getSnapshot().user) { setSecondsLeft(null); return; }
    const state = getIdleState();
    if (state.kind === 'expired') {
      setSecondsLeft(null);
      void logout();
    } else if (state.kind === 'warning') {
      setSecondsLeft(state.secondsLeft);
    } else {
      setSecondsLeft(null);
    }
  }, [logout]);

  const stayLoggedIn = useCallback(() => {
    markActivity(Date.now(), true);
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    // Check at once: the app may have been reopened after a long gap.
    check();

    const onActivity = () => {
      // While the warning shows, only the "Stay logged in" button counts, so a
      // stray scroll doesn't silently dismiss it.
      if (getIdleState().kind === 'active') markActivity();
    };
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));

    const onWake = () => { if (document.visibilityState !== 'hidden') check(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);

    const timer = window.setInterval(check, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity));
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.clearInterval(timer);
    };
  }, [check]);

  return { secondsLeft, stayLoggedIn, logoutNow: logout };
}
