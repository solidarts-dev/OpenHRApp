import { describe, it, expect, beforeEach } from 'vitest';
import {
  getIdleState, markActivity, getLastActivity, __resetIdleForTests, IDLE_LIMIT_MS,
} from '../services/session/idleTimeout';

const T0 = 1_800_000_000_000;
const sec = (n: number) => n * 1000;

describe('idle timeout (5 minutes, 30-second warning)', () => {
  beforeEach(() => {
    __resetIdleForTests();
    markActivity(T0, true);
  });

  it('is active after 4 minutes', () => {
    expect(getIdleState(T0 + sec(240))).toEqual({ kind: 'active' });
  });

  it('warns at 4:31 with 29 seconds left', () => {
    expect(getIdleState(T0 + sec(271))).toEqual({ kind: 'warning', secondsLeft: 29 });
  });

  it('expires at exactly 5 minutes', () => {
    expect(getIdleState(T0 + IDLE_LIMIT_MS)).toEqual({ kind: 'expired' });
  });

  it('activity resets the timer', () => {
    markActivity(T0 + sec(280), true);
    expect(getIdleState(T0 + sec(280) + sec(200))).toEqual({ kind: 'active' });
  });

  it('a timestamp written by another tab counts as activity', () => {
    localStorage.setItem('solidarts.lastActivity', String(T0 + sec(290)));
    expect(getIdleState(T0 + sec(300))).toEqual({ kind: 'active' });
  });

  it('a future timestamp is treated as now and never logs anyone out', () => {
    localStorage.setItem('solidarts.lastActivity', String(T0 + 10 * IDLE_LIMIT_MS));
    expect(getLastActivity(T0 + sec(10))).toBe(T0 + sec(10));
    expect(getIdleState(T0 + sec(20))).toEqual({ kind: 'active' });
  });

  it('a corrupt timestamp falls back to the in-memory value', () => {
    localStorage.setItem('solidarts.lastActivity', 'not-a-number');
    expect(getIdleState(T0 + sec(60))).toEqual({ kind: 'active' });
  });

  it('reopening the app after a long gap is detected as expired', () => {
    expect(getIdleState(T0 + 10 * 60_000)).toEqual({ kind: 'expired' });
  });

  it('a fresh page load reads the stored time instead of assuming now', () => {
    __resetIdleForTests();                       // simulates a new page load
    localStorage.setItem('solidarts.lastActivity', String(T0));
    expect(getIdleState(T0 + 6 * 60_000)).toEqual({ kind: 'expired' });
  });

  it('with nothing stored, a fresh page load starts the timer now', () => {
    __resetIdleForTests();
    expect(getIdleState(T0 + sec(5))).toEqual({ kind: 'active' });
  });
});
