// Idle timeout — logs a signed-in user out after a period with no activity.
//
// Not part of the frozen session module: this file only decides WHEN the user
// has been idle too long. The logout itself goes through
// sessionManager.forceLogout('IDLE_TIMEOUT') (see src/hooks/useIdleLogout.ts),
// which stays the single path that calls supabase.auth.signOut().
//
// The last-activity time is kept in localStorage so that every open tab shares
// one timer, and so that reopening the app after a long gap (phone asleep, app
// closed) is detected straight away.

/** Log out after this much time with no activity. */
export const IDLE_LIMIT_MS = 5 * 60_000;
/** Show the "Still there?" warning this long before logout. */
export const WARNING_MS = 30_000;
/** Don't write to storage more often than this while the user is active. */
const WRITE_THROTTLE_MS = 15_000;

const STORAGE_KEY = 'solidarts.lastActivity';
export const IDLE_LOGOUT_FLAG = 'solidarts.idleLogout';

// 0 = nothing recorded yet in this page load. It must NOT start at Date.now():
// on reopen that would hide the time the app spent closed.
let memoryLastActivity = 0;
let lastWrite = 0;

function readStored(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeStored(t: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(t));
  } catch {
    /* storage blocked — the in-memory value still works for this tab */
  }
}

/**
 * The time of the last activity. A missing, corrupt or future timestamp is
 * treated as "now" so a bad value can never log someone out by mistake.
 */
export function getLastActivity(now: number = Date.now()): number {
  const stored = readStored();
  const candidate = Math.max(stored ?? 0, memoryLastActivity);
  if (candidate <= 0 || !Number.isFinite(candidate) || candidate > now) {
    markActivity(now, true);
    return now;
  }
  return candidate;
}

/** Record user activity. Throttled unless `force` is set. */
export function markActivity(now: number = Date.now(), force = false): void {
  memoryLastActivity = now;
  if (force || now - lastWrite >= WRITE_THROTTLE_MS) {
    lastWrite = now;
    writeStored(now);
  }
}

export type IdleState =
  | { kind: 'active' }
  | { kind: 'warning'; secondsLeft: number }
  | { kind: 'expired' };

export function getIdleState(now: number = Date.now()): IdleState {
  const idleFor = now - getLastActivity(now);
  if (idleFor >= IDLE_LIMIT_MS) return { kind: 'expired' };
  if (idleFor >= IDLE_LIMIT_MS - WARNING_MS) {
    return { kind: 'warning', secondsLeft: Math.ceil((IDLE_LIMIT_MS - idleFor) / 1000) };
  }
  return { kind: 'active' };
}

/** Testing helper: reset module state. */
export function __resetIdleForTests(): void {
  memoryLastActivity = 0;
  lastWrite = 0;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
