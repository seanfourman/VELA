import { buildSkyQualityUrl } from "./apiEndpoints";

const metricsCache = new Map();

function buildCacheKey(lat, lon) {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

async function parseErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      if (data && typeof data.error === "string") return data.error;
      if (data && typeof data.message === "string") return data.message;
    } catch {
      // Ignore JSON parse errors and fall back to text.
    }
  }

  try {
    const text = await response.text();
    if (text) return text;
  } catch {
    // Ignore.
  }

  return null;
}

export async function fetchSkyQualityMetrics(lat, lon) {
  if (typeof lat !== "number" || typeof lon !== "number") {
    throw new Error("Invalid coordinates");
  }

  const cacheKey = buildCacheKey(lat, lon);
  const cached = metricsCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    let response;
    try {
      response = await fetch(buildSkyQualityUrl(lat, lon), {
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      let message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to reach sky quality service";
      if (message === "Failed to fetch") {
        message =
          "Sky quality service unavailable (is the sky quality endpoint configured?)";
      }
      throw new Error(message);
    }

    if (!response.ok) {
      const message = (await parseErrorMessage(response))?.trim();
      throw new Error(message || `Sky quality API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  })();

  metricsCache.set(cacheKey, promise);
  promise.catch(() => metricsCache.delete(cacheKey));
  return promise;
}
