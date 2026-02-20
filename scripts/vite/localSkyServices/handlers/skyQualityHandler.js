import {
  NATURAL_MCD_M2,
  NODATA_F32,
  SQM_DENOM,
  bortleFromSqm,
  roundTo,
  sendJson,
} from "../core.js";

export function createSkyQualityHandler({ getImage }) {
  return async function handleSkyQualityRequest(request, response) {
    const url = new URL(request.url || "", "http://localhost");
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      sendJson(response, 400, { error: "Invalid lat/lon query params" });
      return;
    }

    const image = await getImage();
    const [minLon, minLat, maxLon, maxLat] = image.getBoundingBox();

    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) {
      sendJson(response, 400, { error: "Coordinates out of dataset bounds" });
      return;
    }

    const width = image.getWidth();
    const height = image.getHeight();
    const xRes = (maxLon - minLon) / width;
    const yRes = (maxLat - minLat) / height;

    let col = Math.floor((lon - minLon) / xRes);
    let row = Math.floor((maxLat - lat) / yRes);

    if (col < 0) col = 0;
    if (row < 0) row = 0;
    if (col >= width) col = width - 1;
    if (row >= height) row = height - 1;

    const rasters = await image.readRasters({
      window: [col, row, col + 1, row + 1],
    });

    const sample = Array.isArray(rasters) ? rasters[0]?.[0] : null;
    const artificial = Number(sample);

    if (!Number.isFinite(artificial) || artificial === NODATA_F32) {
      sendJson(response, 404, { error: "No data at this coordinate" });
      return;
    }

    const total = artificial + NATURAL_MCD_M2;
    const sqm = Math.log10(total / SQM_DENOM) / -0.4;
    const ratio = artificial / NATURAL_MCD_M2;

    sendJson(
      response,
      200,
      {
        Coordinates: [roundTo(lat, 5), roundTo(lon, 5)],
        SQM: roundTo(sqm, 2),
        Brightness_mcd_m2: roundTo(total, 1),
        Artif_bright_uccd_m2: Math.round(artificial * 1000),
        Ratio: roundTo(ratio, 1),
        Bortle: bortleFromSqm(sqm),
      },
      "public, max-age=86400",
    );
  };
}
