/**
 * Fetches the darkest spots within a search radius.
 *
 * @param {number} lat - Latitude of the center point.
 * @param {number} lon - Longitude of the center point.
 * @param {number} searchDistance - Search radius in km.
 * @returns {Promise<Array>} - Array of dark spot objects.
 */
export async function fetchDarkSpots(lat, lon, searchDistance) {
  try {
    const response = await fetch(
      `/api/darkspots?lat=${lat}&lon=${lon}&searchDistance=${searchDistance}`
    );

    if (!response.ok) {
      throw new Error(`Dark spots API error: ${response.status}`);
    }

    const data = await response.json();
    
    // The API returns an object { origin, radius_km, spots: [...] }
    if (data && Array.isArray(data.spots)) {
      return data.spots.slice(0, 3);
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch dark spots:", error);
    return [];
  }
}
