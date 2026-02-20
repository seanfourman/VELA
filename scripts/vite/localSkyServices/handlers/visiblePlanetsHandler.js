import { sendJson } from "../core.js";

export function createVisiblePlanetsHandler() {
  return async function handleVisiblePlanetsRequest(request, response) {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const url = new URL(request.url || "", "http://localhost");
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      sendJson(response, 400, { error: "Invalid lat/lon query params" });
      return;
    }

    const upstreamUrl = new URL("https://api.visibleplanets.dev/v3");
    upstreamUrl.searchParams.set("latitude", String(lat));
    upstreamUrl.searchParams.set("longitude", String(lon));

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      sendJson(response, 502, {
        error:
          error instanceof Error
            ? error.message
            : "Visible planets service is unavailable",
      });
      return;
    }

    const text = await upstreamResponse.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!upstreamResponse.ok) {
      sendJson(response, upstreamResponse.status, {
        error: "Visible planets lookup failed",
        details: payload,
      });
      return;
    }

    sendJson(response, 200, payload, "public, max-age=600");
  };
}
