import { buildFavoritesUrl } from "./awsEndpoints";

export async function saveFavoriteSpot({ lat, lon, idToken }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  if (!idToken) return;

  const response = await fetch(buildFavoritesUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lat, lon }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message
        ? `Favorite API error: ${message}`
        : `Favorite API error: ${response.status}`
    );
  }
}
