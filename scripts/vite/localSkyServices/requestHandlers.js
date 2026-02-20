import { createDarkSpotsHandler } from "./handlers/darkSpotsHandler.js";
import { createLightTileHandler } from "./handlers/lightTileHandler.js";
import { createRecommendationsHandler } from "./handlers/recommendationsHandler.js";
import { createSkyQualityHandler } from "./handlers/skyQualityHandler.js";
import { createVisiblePlanetsHandler } from "./handlers/visiblePlanetsHandler.js";

export function createRequestHandlers({
  getImage,
  getLandMask,
  recommendationsStore,
}) {
  return {
    handleSkyQualityRequest: createSkyQualityHandler({ getImage }),
    handleLightTileRequest: createLightTileHandler({ getImage }),
    handleDarkSpotsRequest: createDarkSpotsHandler({ getImage, getLandMask }),
    handleVisiblePlanetsRequest: createVisiblePlanetsHandler(),
    handleRecommendationsRequest: createRecommendationsHandler({
      recommendationsStore,
    }),
  };
}
