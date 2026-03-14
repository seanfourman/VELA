import { formatDateTime } from "@/utils/dateTime";
import { getCoordinateKey } from "@/utils/geo";
import {
  buildExternalMapDirectionsUrl,
  buildExternalMapSearchUrl,
} from "@/utils/mapLinks";

export const DISCOVERY_RADIUS_OPTIONS = [100, 250, 500, 1000];

export const normalizeTimestamp = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

export const formatEventType = (value) =>
  value === "special_event" ? "Special event" : "Star party";

export const getEmptyLocationMessage = (locationStatus) => {
  if (locationStatus === "searching") {
    return "Locating you now. Nearby discovery results will appear as soon as location is ready.";
  }

  return "Allow location access to rank recommendations, favorites, and events by distance.";
};

export const isUpcomingEvent = (event, now) =>
  normalizeTimestamp(event?.endsAt || event?.startsAt) >= now;

export const getRelativeDateLabel = (value, now) => {
  const timestamp = normalizeTimestamp(value);
  if (!Number.isFinite(timestamp)) return "Date TBD";

  const diffDays = Math.floor((timestamp - now) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return formatDateTime(value, { includeYear: true });
};

export const resolveInitialRadius = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 250;
  return DISCOVERY_RADIUS_OPTIONS.find((option) => option >= numeric) || 250;
};

export const formatMetricNumber = (value, digits = 1) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : "N/A";
};

export const parseBortleScore = (value) => {
  const match = String(value || "").match(/\d+/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
};

export const describeBortleSky = (value) => {
  const score = parseBortleScore(value);

  if (!Number.isFinite(score)) {
    return {
      label: "Sky conditions unavailable",
      summary: "Turn on location to estimate how bright your current sky is.",
      bestFor: "Moon, planets, and bright star patterns.",
      struggle: "Faint nebulae and Milky Way contrast will be hard to judge.",
    };
  }

  if (score <= 3) {
    return {
      label: "Dark rural sky",
      summary:
        "Excellent darkness for Milky Way detail, faint nebulae, and long observing sessions.",
      bestFor:
        "Galaxies, nebulae, wide-field Milky Way shots, meteor watching.",
      struggle: "Only local haze or moonlight should significantly interfere.",
    };
  }

  if (score <= 5) {
    return {
      label: "Rural to suburban transition",
      summary:
        "A strong all-around sky with visible Milky Way structure and solid deep-sky contrast.",
      bestFor:
        "Clusters, brighter galaxies, nebulae, binocular sweeps, astrophotography.",
      struggle: "The faintest deep-sky targets may still need darker horizons.",
    };
  }

  if (score <= 7) {
    return {
      label: "Bright suburban sky",
      summary:
        "Good for casual observing, but urban glow will reduce faint detail and background contrast.",
      bestFor:
        "Moon, planets, double stars, bright clusters, outreach sessions.",
      struggle:
        "Most faint nebulae and subtle Milky Way detail will be washed out.",
    };
  }

  return {
    label: "Urban sky",
    summary:
      "Heavy skyglow will dominate the view, so brighter targets will be the most rewarding tonight.",
    bestFor:
      "Moon, planets, bright constellations, ISS passes, quick setup sessions.",
    struggle:
      "Faint galaxies, nebulae, and Milky Way structure will be difficult to see.",
  };
};

export const buildDestinationHref = ({ origin, destination, provider }) =>
  buildExternalMapDirectionsUrl({
    provider,
    origin,
    destination,
  }) ||
  buildExternalMapSearchUrl({
    provider,
    lat: destination?.lat,
    lng: destination?.lng,
  });

export const buildDiscoveryMapSelection = ({ type, id = null, lat, lng }) => ({
  type,
  id,
  lat,
  lng,
  requestId: `${type}-${id || getCoordinateKey(lat, lng)}-${Date.now()}`,
});
