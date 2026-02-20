import { buildSkyQualityUrl } from "./apiEndpoints";

const metricsCache = new Map();

const buildCacheKey = (lat, lon) => `${lat.toFixed(5)},${lon.toFixed(5)}`;
const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

async function readErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;
  }
  return (await response.text().catch(() => null)) || null;
}

export async function fetchSkyQualityMetrics(lat, lon) {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
    throw new Error("Invalid coordinates");
  }

  const cacheKey = buildCacheKey(lat, lon);
  if (metricsCache.has(cacheKey)) return metricsCache.get(cacheKey);

  const promise = fetch(buildSkyQualityUrl(lat, lon), {
    headers: { Accept: "application/json" },
  })
    .catch((error) => {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to reach sky quality service";
      throw new Error(
        message === "Failed to fetch"
          ? "Sky quality service unavailable (is the sky quality endpoint configured?)"
          : message,
      );
    })
    .then(async (response) => {
      if (!response.ok) {
        const message = (await readErrorMessage(response))?.trim();
        throw new Error(message || `Sky quality API error: ${response.status}`);
      }
      return response.json();
    });

  metricsCache.set(cacheKey, promise);
  promise.catch(() => {
    metricsCache.delete(cacheKey);
  });
  return promise;
}
