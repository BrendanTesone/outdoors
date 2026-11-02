import { callApi } from './api';

// Same call convention as newAutoRoster's ItineraryGenerator: POST {action, ...payload} as text/plain
// (see api.ts). This module holds the pure routing helpers shared by the trip pipeline.

// Same flow as newRosterBackend/itinerary.js: the backend follows redirects and
// extracts the ordered stops from the Google Maps URL (testExtractStops).
export async function fetchStops(url: string): Promise<string[]> {
  const data = await callApi('testExtractStops', { url });
  if (!data?.success || !Array.isArray(data.stops)) {
    throw new Error(data?.error || 'Could not parse stops from link.');
  }
  return data.stops;
}

// Convert Google's distance text (e.g. "72.4 mi", "1,234 mi", "500 ft", "120 km") to miles
export function distanceTextToMiles(text: string): number | null {
  const m = String(text).trim().toLowerCase().match(/^([\d,]+(?:\.\d+)?)\s*([a-z]+)/);
  if (!m) return null;
  const val = parseFloat(m[1].replace(/,/g, ''));
  if (isNaN(val)) return null;
  switch (m[2]) {
    case 'mi': return val;
    case 'ft': return val / 5280;
    case 'km': return val * 0.621371;
    case 'm': return val / 1609.344;
    default: return null;
  }
}

// Extract town/city & state for paperwork text (e.g. "Binghamton, NY")
export function getTown(fullStop: string): string {
  if (!fullStop) return '';
  const parts = fullStop.split(',').map(p => p.trim());
  if (parts.length === 1) return parts[0];

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];

  // Strip postal zip code from state if present (e.g. "NY 13902" -> "NY")
  const cleanState = last.replace(/\b\d{5}(-\d{4})?\b/, '').trim();

  if (cleanState && secondLast) {
    return `${secondLast}, ${cleanState}`;
  }
  return parts.slice(-2).join(', ');
}

// Exact total of the legs as shown: add integer hundredths so floating point can't drift
export function sumMiles(legs: { miles: string }[]): number {
  const hundredths = legs.reduce((sum, leg) => {
    const v = parseFloat(leg.miles);
    return isNaN(v) ? sum : sum + Math.round(v * 100);
  }, 0);
  return hundredths / 100;
}

// Fixed 2-decimal display used everywhere (keeps trailing zeros, e.g. "74.50")
export function fmtMiles(n: number): string {
  return n.toFixed(2);
}