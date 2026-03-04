import { parseUtcDate } from "@/features/spaceWeather/spaceWeatherModel";

const NASA_API_KEY =
  typeof import.meta.env.VITE_NASA_API_KEY === "string" &&
  import.meta.env.VITE_NASA_API_KEY.trim()
    ? import.meta.env.VITE_NASA_API_KEY.trim()
    : "DEMO_KEY";

const DONKI_BASE_URL = "https://api.nasa.gov/DONKI";
const GST_LOOKBACK_DAYS = 30;
const CME_LOOKBACK_DAYS = 21;
const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedSnapshot = null;
let cachedAt = 0;
let inflightRequest = null;

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const toArray = (value) => (Array.isArray(value) ? value : []);

const formatDateParam = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const addUtcDays = (value, days) => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toTimestamp = (value) => parseUtcDate(value)?.getTime() ?? -1;

const readErrorMessage = async (response) => {
  const payload = await response.json().catch(() => null);
  if (typeof payload?.error?.message === "string") return payload.error.message;
  if (typeof payload?.message === "string") return payload.message;
  return `NASA DONKI API request failed (${response.status})`;
};

const fetchDonki = async (path, params) => {
  const url = new URL(`${DONKI_BASE_URL}/${path}`);
  Object.entries({ ...params, api_key: NASA_API_KEY }).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  }).catch((error) => {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not reach NASA DONKI service";
    throw new Error(message);
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = await response.json().catch(() => []);
  return toArray(data);
};

const extractKpSamples = (gstEvents) =>
  gstEvents.flatMap((event) =>
    toArray(event.allKpIndex)
      .map((sample, index) => {
        const kpIndex = Number(sample?.kpIndex);
        if (!isFiniteNumber(kpIndex)) return null;
        const observedTime =
          typeof sample?.observedTime === "string" ? sample.observedTime : null;
        return {
          id: `${event.gstID || event.startTime || "gst"}:${index}`,
          kpIndex,
          observedTime,
          source: typeof sample?.source === "string" ? sample.source : null,
          eventId: event.gstID || null,
        };
      })
      .filter(Boolean),
  );

const normalizeGstEvents = (rawEvents) =>
  rawEvents
    .map((event) => {
      const samples = extractKpSamples([event]);
      const maxKp = samples.reduce(
        (best, sample) =>
          sample.kpIndex > best ? sample.kpIndex : best,
        Number.NEGATIVE_INFINITY,
      );
      const peakSample =
        samples.slice().sort((a, b) => toTimestamp(b.observedTime) - toTimestamp(a.observedTime))[0] ??
        null;
      return {
        id: event.gstID || event.startTime || `gst-${Math.random().toString(36).slice(2, 8)}`,
        startTime: typeof event.startTime === "string" ? event.startTime : null,
        maxKp: Number.isFinite(maxKp) ? maxKp : null,
        peakObservedTime: peakSample?.observedTime ?? null,
        linkedEventIds: toArray(event.linkedEvents)
          .map((entry) => entry?.activityID)
          .filter((value) => typeof value === "string"),
        link: typeof event.link === "string" ? event.link : null,
      };
    })
    .sort((a, b) => toTimestamp(b.startTime) - toTimestamp(a.startTime));

const normalizeEarthDirectedCmes = (rawCmes) => {
  const candidates = [];

  rawCmes.forEach((cme) => {
    toArray(cme.cmeAnalyses).forEach((analysis) => {
      toArray(analysis.enlilList).forEach((enlil) => {
        const earthImpactList = toArray(enlil.impactList).filter((impact) =>
          /earth/i.test(String(impact?.location || "")),
        );
        const isEarthDirected =
          enlil.isEarthGB === true ||
          enlil.isEarthMinorImpact === true ||
          earthImpactList.length > 0;

        if (!isEarthDirected) return;

        const arrivalTimes = earthImpactList
          .map((impact) => impact?.arrivalTime)
          .filter((value) => typeof value === "string");

        const speed = Number(analysis?.speed);
        candidates.push({
          id: `${cme.activityID || cme.startTime || "cme"}:${enlil.modelCompletionTime || analysis.time21_5 || "model"}`,
          activityId:
            typeof cme.activityID === "string" ? cme.activityID : null,
          startTime:
            typeof cme.startTime === "string"
              ? cme.startTime
              : typeof analysis.associatedCMEstartTime === "string"
                ? analysis.associatedCMEstartTime
                : null,
          modelTime:
            typeof enlil.modelCompletionTime === "string"
              ? enlil.modelCompletionTime
              : null,
          speed: Number.isFinite(speed) ? speed : null,
          type: typeof analysis.type === "string" ? analysis.type : null,
          isGlancing:
            enlil.isEarthGB === true ||
            earthImpactList.some((impact) => impact?.isGlancingBlow === true),
          isMinorImpact:
            enlil.isEarthMinorImpact === true ||
            earthImpactList.some((impact) => impact?.isMinorImpact === true),
          arrivalTimes,
          link:
            typeof enlil.link === "string"
              ? enlil.link
              : typeof analysis.link === "string"
                ? analysis.link
                : typeof cme.link === "string"
                  ? cme.link
                  : null,
        });
      });
    });
  });

  const byActivity = new Map();
  candidates.forEach((entry) => {
    const dedupeKey = entry.activityId || entry.id;
    const existing = byActivity.get(dedupeKey);
    if (!existing) {
      byActivity.set(dedupeKey, entry);
      return;
    }

    if (toTimestamp(entry.modelTime) > toTimestamp(existing.modelTime)) {
      byActivity.set(dedupeKey, entry);
    }
  });

  return [...byActivity.values()].sort(
    (a, b) =>
      Math.max(toTimestamp(b.modelTime), toTimestamp(b.startTime)) -
      Math.max(toTimestamp(a.modelTime), toTimestamp(a.startTime)),
  );
};

const buildSnapshot = (gstRaw, cmeRaw, { gstStartDate, cmeStartDate, endDate }) => {
  const gstEvents = normalizeGstEvents(gstRaw);
  const kpSamples = extractKpSamples(gstRaw).sort(
    (a, b) => toTimestamp(b.observedTime) - toTimestamp(a.observedTime),
  );
  const earthDirectedCmes = normalizeEarthDirectedCmes(cmeRaw);

  const latestSample = kpSamples[0] ?? null;
  const now = Date.now();
  const cutoff72h = now - 72 * 60 * 60 * 1000;
  const peak72h = kpSamples.reduce((best, sample) => {
    const timestamp = toTimestamp(sample.observedTime);
    if (timestamp < cutoff72h) return best;
    return sample.kpIndex > best ? sample.kpIndex : best;
  }, Number.NEGATIVE_INFINITY);

  const peak30d = kpSamples.reduce(
    (best, sample) =>
      sample.kpIndex > best ? sample.kpIndex : best,
    Number.NEGATIVE_INFINITY,
  );

  return {
    fetchedAt: new Date().toISOString(),
    apiKeyMode: NASA_API_KEY === "DEMO_KEY" ? "demo" : "custom",
    window: {
      gstStartDate,
      cmeStartDate,
      endDate,
    },
    stats: {
      latestKp: latestSample?.kpIndex ?? null,
      latestKpTime: latestSample?.observedTime ?? null,
      peakKp72h: Number.isFinite(peak72h) ? peak72h : null,
      peakKp30d: Number.isFinite(peak30d) ? peak30d : null,
      stormCount30d: gstEvents.length,
      earthDirectedCmeCount: earthDirectedCmes.length,
    },
    gstEvents,
    earthDirectedCmes,
  };
};

export async function fetchSpaceWeatherSnapshot({ force = false } = {}) {
  const now = Date.now();
  const cacheIsFresh =
    !force && cachedSnapshot && now - cachedAt < CACHE_TTL_MS;
  if (cacheIsFresh) return cachedSnapshot;
  if (inflightRequest) return inflightRequest;

  const endDate = formatDateParam(new Date());
  const gstStartDate = formatDateParam(addUtcDays(new Date(), -GST_LOOKBACK_DAYS));
  const cmeStartDate = formatDateParam(addUtcDays(new Date(), -CME_LOOKBACK_DAYS));

  inflightRequest = Promise.all([
    fetchDonki("GST", {
      startDate: gstStartDate,
      endDate,
    }),
    fetchDonki("CME", {
      startDate: cmeStartDate,
      endDate,
    }),
  ])
    .then(([gstRaw, cmeRaw]) => {
      const snapshot = buildSnapshot(gstRaw, cmeRaw, {
        gstStartDate,
        cmeStartDate,
        endDate,
      });
      cachedSnapshot = snapshot;
      cachedAt = Date.now();
      return snapshot;
    })
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}
