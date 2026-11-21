import { describe, it, expect } from 'vitest';
import { distanceMetres, evaluateGeofence } from '../utils/geofence';

// Solid Arts Creativity Studio HO, 50 m radius (as configured in app_config).
const HO = { name: 'Solid Arts Creativity Studio HO', lat: -17.827188, lng: 31.044313, radius: 50 };
// ~0.0009° of latitude ≈ 100 m.
const north = (metres: number) => HO.lat + metres / 111_320;

describe('office radius for check-in', () => {
  it('measures distance in metres', () => {
    expect(Math.round(distanceMetres(HO.lat, HO.lng, north(100), HO.lng))).toBeGreaterThanOrEqual(99);
    expect(Math.round(distanceMetres(HO.lat, HO.lng, north(100), HO.lng))).toBeLessThanOrEqual(101);
  });

  it('is inside at the office with a good GPS fix', () => {
    const r = evaluateGeofence(north(20), HO.lng, 10, [HO]);
    expect(r?.inside).toBe(true);
    expect(r?.office).toBe(HO.name);
  });

  it('allows for GPS error near the edge', () => {
    // 80 m away, ±40 m accuracy → the accuracy circle reaches the 50 m radius.
    expect(evaluateGeofence(north(80), HO.lng, 40, [HO])?.inside).toBe(true);
  });

  it('is outside 1 km away even with a vague fix', () => {
    // A ±2 km network fix only gets the capped 100 m allowance.
    const r = evaluateGeofence(north(1000), HO.lng, 2000, [HO]);
    expect(r?.inside).toBe(false);
    expect(r?.distance).toBeGreaterThan(900);
  });

  it('is outside at 200 m with a precise fix', () => {
    expect(evaluateGeofence(north(200), HO.lng, 15, [HO])?.inside).toBe(false);
  });

  it('picks the office the person is inside when there are several', () => {
    const other = { name: 'Branch', lat: -17.9, lng: 31.1, radius: 100 };
    expect(evaluateGeofence(north(10), HO.lng, 10, [other, HO])?.office).toBe(HO.name);
  });

  it('returns null when no offices are configured', () => {
    expect(evaluateGeofence(HO.lat, HO.lng, 10, [])).toBeNull();
  });
});
