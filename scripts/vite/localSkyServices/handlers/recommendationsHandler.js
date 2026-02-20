import {
  normalizeRecommendationRecord,
  readJsonBody,
  sendJson,
} from "../core.js";

export function createRecommendationsHandler({ recommendationsStore }) {
  const { readRecommendations, writeRecommendations } = recommendationsStore;

  return async function handleRecommendationsRequest(request, response, url) {
    const entryMatch = url.pathname.match(/^\/api\/recommendations\/([^/]+)$/);
    if (entryMatch) {
      if (request.method !== "DELETE") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }
      const spotId = decodeURIComponent(entryMatch[1] || "").trim();
      if (!spotId) {
        sendJson(response, 400, { error: "Missing recommendation id" });
        return;
      }
      const current = readRecommendations();
      const next = current.filter(
        (item) => String(item?.id || "").trim() !== spotId,
      );
      if (next.length === current.length) {
        sendJson(response, 404, { error: "Recommendation not found" });
        return;
      }
      writeRecommendations(next);
      sendJson(response, 200, { deleted: true, id: spotId });
      return;
    }

    if (url.pathname !== "/api/recommendations") {
      return;
    }

    if (request.method === "GET") {
      sendJson(response, 200, { items: readRecommendations() }, "public, max-age=60");
      return;
    }

    if (request.method === "POST") {
      let payload = {};
      try {
        payload = await readJsonBody(request);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid recommendation payload";
        const statusCode = message === "Request body too large" ? 413 : 400;
        sendJson(response, statusCode, { error: message });
        return;
      }

      let record;
      try {
        record = normalizeRecommendationRecord(payload);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid recommendation payload";
        sendJson(response, 400, { error: message });
        return;
      }

      const items = readRecommendations();
      const index = items.findIndex(
        (item) => String(item?.id || "").trim() === record.id,
      );
      if (index >= 0) {
        items[index] = record;
      } else {
        items.push(record);
      }
      writeRecommendations(items);
      sendJson(response, index >= 0 ? 200 : 201, record);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  };
}
