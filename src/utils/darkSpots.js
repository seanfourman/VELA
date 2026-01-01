import { buildDarkSpotsUrl } from "./awsEndpoints";

/**
 * Fetches stargazing locations (darkest spots) within a search radius.
 *
 * @param {number} lat - Latitude of the center point.
 * @param {number} lon - Longitude of the center point.
 * @param {number} searchDistance - Search radius in km.
 * @returns {Promise<Array>} - Array of stargazing location objects.
 */
export async function fetchDarkSpots(lat, lon, searchDistance) {
  try {
    const response = await fetch(buildDarkSpotsUrl(lat, lon, searchDistance));

    if (!response.ok) {
      throw new Error(`Stargazing locations API error: ${response.status}`);
    }

    const data = await response.json();

    // The API returns an object { origin, radius_km, spots: [...] }
    if (data && Array.isArray(data.spots)) {
      return data.spots.slice(0, 3);
    }
    return [];
  } catch {
    return [];
  }
}
