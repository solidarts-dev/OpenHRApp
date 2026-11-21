// Office radius check for check-ins. Pure functions (no Supabase), so they can be unit-tested.
import type { OfficeLocation } from '../types';

/** Readings less precise than this can't prove someone is at the office. */
export const MAX_ACCURACY_TOLERANCE_M = 100;

export interface GeofenceResult {
  office: string;          // nearest office
  radius: number;          // its radius in metres
  distance: number;        // metres from the office centre
  accuracy: number;        // reported GPS accuracy in metres
  inside: boolean;
}

/** Great-circle distance in metres. */
export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Inside if the reading's accuracy circle reaches the office radius, with the
 * accuracy allowance capped so a vague network fix can't count as "at the office".
 * The database guard (migration 0058) allows the same radius + 100 m.
 */
export function evaluateGeofence(lat: number, lng: number, accuracy: number, fences: OfficeLocation[]): GeofenceResult | null {
  let best: GeofenceResult | null = null;
  for (const f of fences) {
    if (!f || typeof f.lat !== 'number' || typeof f.lng !== 'number') continue;
    const radius = Number(f.radius) > 0 ? Number(f.radius) : 100;
    const distance = distanceMetres(lat, lng, f.lat, f.lng);
    const allowance = Math.min(Math.max(accuracy || 0, 0), MAX_ACCURACY_TOLERANCE_M);
    const inside = distance - allowance <= radius;
    if (!best || (inside && !best.inside) || (inside === best.inside && distance < best.distance)) {
      best = { office: f.name, radius, distance: Math.round(distance), accuracy: Math.round(accuracy || 0), inside };
    }
  }
  return best;
}

