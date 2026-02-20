import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { buildLandMask, sendJson } from "./localSkyServices/core.js";
import { createRequestHandlers } from "./localSkyServices/requestHandlers.js";
import { createRecommendationsStore } from "./localSkyServices/recommendationsStore.js";

const require = createRequire(import.meta.url);

function localSkyServicesPlugin() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const candidatePaths = [
    path.resolve(rootDir, "data", "World_Atlas_2015.tif"),
    path.resolve(rootDir, "public", "World_Atlas_2015.tif"),
  ];
  const tifPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  const recommendationsCandidatePaths = [
    path.resolve(rootDir, "data", "stargazing_locations.json"),
    path.resolve(rootDir, "public", "stargazing_locations.json"),
  ];
  const recommendationsPath =
    recommendationsCandidatePaths.find((candidate) => fs.existsSync(candidate)) ||
    recommendationsCandidatePaths[0];

  let imagePromise = null;
  let landMaskPromise = null;

  async function getImage() {
    if (!tifPath) {
      throw new Error(
        "World_Atlas_2015.tif not found (expected in data/ or public/)",
      );
    }
    if (!imagePromise) {
      imagePromise = (async () => {
        const { fromFile } = await import("geotiff");
        const tiff = await fromFile(tifPath);
        return await tiff.getImage();
      })().catch((error) => {
        imagePromise = null;
        throw error;
      });
    }
    return imagePromise;
  }

  async function getLandMask() {
    if (!landMaskPromise) {
      landMaskPromise = (async () => {
        const [topojsonClient, landTopologyRaw] = await Promise.all([
          import("topojson-client"),
          Promise.resolve(
            JSON.parse(
              fs.readFileSync(require.resolve("world-atlas/land-10m.json"), "utf8"),
            ),
          ),
        ]);
        const landFeature = topojsonClient.feature(
          landTopologyRaw,
          landTopologyRaw.objects.land,
        );
        return buildLandMask(landFeature);
      })().catch((error) => {
        landMaskPromise = null;
        throw error;
      });
    }
    return landMaskPromise;
  }

  const handlers = createRequestHandlers({
    getImage,
    getLandMask,
    recommendationsStore: createRecommendationsStore(recommendationsPath),
  });

  function mount(server) {
    server.middlewares.use(async (request, response, next) => {
      try {
        const url = new URL(request.url || "", "http://localhost");
        const lightTileMatch = url.pathname.match(
          /^\/api\/lightmap\/(\d+)\/(\d+)\/(\d+)\.png$/,
        );
        if (lightTileMatch) {
          await handlers.handleLightTileRequest(request, response, lightTileMatch);
          return;
        }

        if (url.pathname === "/api/skyquality") {
          await handlers.handleSkyQualityRequest(request, response);
          return;
        }

        if (url.pathname === "/api/darkspots") {
          await handlers.handleDarkSpotsRequest(request, response);
          return;
        }

        if (url.pathname === "/api/visible-planets") {
          await handlers.handleVisiblePlanetsRequest(request, response);
          return;
        }

        if (
          url.pathname === "/api/recommendations" ||
          /^\/api\/recommendations\/[^/]+$/.test(url.pathname)
        ) {
          await handlers.handleRecommendationsRequest(request, response, url);
          return;
        }

        return next();
      } catch (error) {
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : "Local API request failed",
        });
      }
    });
  }

  return {
    name: "local-sky-services",
    configureServer(server) {
      mount(server);
    },
    configurePreviewServer(server) {
      mount(server);
    },
  };
}

export default localSkyServicesPlugin;
