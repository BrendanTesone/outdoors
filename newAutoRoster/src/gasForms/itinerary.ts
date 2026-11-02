import { callApi } from './api';
import { fetchStops, distanceTextToMiles, fmtMiles, getTown, sumMiles } from './routing';

export interface ItineraryLeg {
  from: string;
  to: string;
  // Printed on the itinerary. Always miles, identical to `miles` (e.g. "74.50 mi")
  distance: string;
  duration: string;
  imageDataUrl: string;
  // Paperwork mileage. Computed ONCE here from `distance`; the form and itinerary both read this leg.
  miles: string;
  mapsUrl: string;
}

export interface LinkTrip {
  id: string;
  url: string;
  stops: string[];
  legs: ItineraryLeg[];
}

export interface Trip {
  legs: ItineraryLeg[];
  totalMiles: number;
  destinationCity: string;
}

// Mirrors the route part of newRosterBackend/itinerary.js generateItinerary(), using the same backend actions:
// testExtractStops (follow redirect + parse stops) and testRouteMap (Directions + static map)
export async function fetchLinkTrip(
  url: string,
  onProgress: (msg: string) => void
): Promise<LinkTrip> {
  onProgress('Resolving link and extracting stops...');
  let stops: string[];
  try {
    stops = await fetchStops(url);
  } catch {
    throw new Error('Could not identify enough stops in that URL.');
  }
  if (stops.length < 2) throw new Error('Could not identify enough stops in that URL.');

  const legs: ItineraryLeg[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    onProgress(`Routing leg ${i + 1} of ${stops.length - 1}: ${from} to ${to}...`);

    const res = await callApi('testRouteMap', { origin: from, dest: to });
    if (!res?.success || !res.distance) {
      throw new Error(`No route found: ${from} to ${to}`);
    }
    const miles = distanceTextToMiles(String(res.distance));
    if (miles === null) {
      throw new Error(`Could not read distance "${res.distance}" for: ${from} to ${to}`);
    }

    const milesStr = fmtMiles(miles);
    legs.push({
      from,
      to,
      distance: `${milesStr} mi`,
      duration: String(res.duration),
      imageDataUrl: String(res.image || ''),
      miles: milesStr,
      mapsUrl:
        'https://www.google.com/maps/dir/?api=1' +
        `&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`,
    });
  }

  return { id: Math.random().toString(36).substring(2, 9), url, stops, legs };
}

// Merge the links (in list order) into the single trip that drives the form AND the itinerary
export function assembleTrip(links: LinkTrip[]): Trip {
  const legs = links.flatMap(l => l.legs);

  // Destination = second-to-last stop in the table
  let destinationCity = '';
  if (legs.length === 1) destinationCity = getTown(legs[0].to);
  else if (legs.length > 1) destinationCity = getTown(legs[legs.length - 1].from);

  return {
    legs,
    totalMiles: sumMiles(legs),
    destinationCity,
  };
}
