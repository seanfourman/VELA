import { buildDarkSpotsUrl } from "./apiEndpoints";

const MAX_DARK_SPOT_RESULTS = 4;

const readErrorMessage = async (response) => {
  const contentType = String(response.headers.get("content-type") || "");
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    if (typeof payload?.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  }

  const text = (await response.text().catch(() => "")).trim();
  return text || `Dark spots API error: ${response.status}`;
};

/**
 * Fetches stargazing locations (darkest spots) within a search radius.
 *
 * @param {number} lat - Latitude of the center point.
 * @param {number} lon - Longitude of the center point.
 * @param {number} searchDistance - Search radius in km.
 * @returns {Promise<Array>} - Array of stargazing location objects.
 */
export async function fetchDarkSpots(lat, lon, searchDistance) {
  const response = await fetch(buildDarkSpotsUrl(lat, lon, searchDistance)).catch(
    (error) => {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Could not reach dark spots service";
      throw new Error(message);
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = await response.json().catch(() => null);
  if (data && Array.isArray(data.spots)) {
    return data.spots.slice(0, MAX_DARK_SPOT_RESULTS);
  }

  return [];
}
