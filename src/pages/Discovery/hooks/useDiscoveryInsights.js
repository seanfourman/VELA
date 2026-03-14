import { useMemo } from "react";
import {
  coordinatesMatch,
  formatDistanceKm,
  haversineDistanceKm,
} from "@/utils/geo";
import {
  describeBortleSky,
  formatMetricNumber,
  isUpcomingEvent,
  normalizeTimestamp,
  parseBortleScore,
} from "../discoveryUtils";

export default function useDiscoveryInsights({
  hasLocation,
  location,
  radiusKm,
  stargazeLocations,
  starPartyEvents,
  referenceNow,
  skyQuality,
  skyQualityLoading,
  darkSpots,
  favoriteSpots,
  isAuthenticated,
}) {
  const rankedRecommendations = useMemo(() => {
    const items = Array.isArray(stargazeLocations) ? stargazeLocations : [];
    return items
      .map((spot) => ({
        ...spot,
        distanceKm: hasLocation
          ? haversineDistanceKm(location.lat, location.lng, spot.lat, spot.lng)
          : null,
      }))
      .sort((left, right) => {
        if (hasLocation) {
          const leftDistance = Number.isFinite(left.distanceKm)
            ? left.distanceKm
            : Number.POSITIVE_INFINITY;
          const rightDistance = Number.isFinite(right.distanceKm)
            ? right.distanceKm
            : Number.POSITIVE_INFINITY;
          if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
          }
        }
        return String(left.name || "").localeCompare(String(right.name || ""));
      });
  }, [hasLocation, location, stargazeLocations]);

  const nearbyRecommendations = useMemo(() => {
    if (!hasLocation) return rankedRecommendations;
    return rankedRecommendations.filter(
      (spot) => Number.isFinite(spot.distanceKm) && spot.distanceKm <= radiusKm,
    );
  }, [hasLocation, radiusKm, rankedRecommendations]);

  const visibleRecommendations = useMemo(() => {
    if (nearbyRecommendations.length) return nearbyRecommendations;
    return rankedRecommendations.slice(0, 6);
  }, [nearbyRecommendations, rankedRecommendations]);

  const upcomingEvents = useMemo(() => {
    const items = Array.isArray(starPartyEvents) ? starPartyEvents : [];
    return items
      .filter((event) => event?.status === "published")
      .filter((event) => isUpcomingEvent(event, referenceNow))
      .map((event) => ({
        ...event,
        distanceKm: hasLocation
          ? haversineDistanceKm(location.lat, location.lng, event.lat, event.lng)
          : null,
      }))
      .sort((left, right) => {
        if (hasLocation) {
          const leftDistance = Number.isFinite(left.distanceKm)
            ? left.distanceKm
            : Number.POSITIVE_INFINITY;
          const rightDistance = Number.isFinite(right.distanceKm)
            ? right.distanceKm
            : Number.POSITIVE_INFINITY;
          if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
          }
        }
        return (
          normalizeTimestamp(left.startsAt) - normalizeTimestamp(right.startsAt)
        );
      });
  }, [hasLocation, location, referenceNow, starPartyEvents]);

  const nearbyEvents = useMemo(() => {
    if (!hasLocation) return upcomingEvents;
    return upcomingEvents.filter(
      (event) => Number.isFinite(event.distanceKm) && event.distanceKm <= radiusKm,
    );
  }, [hasLocation, radiusKm, upcomingEvents]);

  const visibleEvents = useMemo(() => {
    if (nearbyEvents.length) return nearbyEvents;
    return upcomingEvents.slice(0, 6);
  }, [nearbyEvents, upcomingEvents]);

  const visibleStarParties = useMemo(
    () => visibleEvents.filter((event) => event.eventType === "party"),
    [visibleEvents],
  );
  const visibleSpecialEvents = useMemo(
    () => visibleEvents.filter((event) => event.eventType === "special_event"),
    [visibleEvents],
  );

  const skyConditionSummary = useMemo(
    () => describeBortleSky(skyQuality?.Bortle),
    [skyQuality?.Bortle],
  );

  const nearestDarkSpotSummary = useMemo(() => {
    const nearestSpot =
      Array.isArray(darkSpots) && darkSpots.length ? darkSpots[0] : null;
    if (!nearestSpot) {
      return {
        title: "No nearby escape yet",
        copy: "Increase the discovery radius or move the map to search for darker alternatives.",
      };
    }

    const currentScore = parseBortleScore(skyQuality?.Bortle);
    const nextScore = Number(nearestSpot.level);
    const improvement =
      Number.isFinite(currentScore) && Number.isFinite(nextScore)
        ? Math.max(0, currentScore - nextScore)
        : null;

    return {
      title: `Nearest darker option: Bortle ${nearestSpot.level}`,
      copy:
        improvement && improvement > 0
          ? `${formatDistanceKm(nearestSpot.distance_km)} away and about ${improvement} Bortle class${improvement === 1 ? "" : "es"} darker.`
          : `${formatDistanceKm(nearestSpot.distance_km)} away with SQM ${formatMetricNumber(nearestSpot.sqm, 2)}.`,
    };
  }, [darkSpots, skyQuality?.Bortle]);

  const favoriteDiscoveryItems = useMemo(() => {
    return favoriteSpots
      .map((spot) => {
        const matchedLocation =
          rankedRecommendations.find((candidate) =>
            coordinatesMatch(spot.lat, spot.lng, candidate.lat, candidate.lng),
          ) || null;
        const distanceKm = hasLocation
          ? haversineDistanceKm(location.lat, location.lng, spot.lat, spot.lng)
          : null;

        return {
          ...spot,
          name:
            (typeof spot.customName === "string" && spot.customName.trim()) ||
            matchedLocation?.name ||
            "Saved favorite",
          description:
            matchedLocation?.description ||
            `Saved coordinates: ${spot.lat.toFixed(3)}, ${spot.lng.toFixed(3)}`,
          region: matchedLocation?.region || "",
          country: matchedLocation?.country || "",
          type: matchedLocation?.type || "",
          bestTime: matchedLocation?.bestTime || "",
          sourceLinks: matchedLocation?.sourceLinks || [],
          distanceKm,
        };
      })
      .sort((left, right) => {
        if (hasLocation) {
          const leftDistance = Number.isFinite(left.distanceKm)
            ? left.distanceKm
            : Number.POSITIVE_INFINITY;
          const rightDistance = Number.isFinite(right.distanceKm)
            ? right.distanceKm
            : Number.POSITIVE_INFINITY;
          if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
          }
        }
        return (
          normalizeTimestamp(right.createdAt) -
          normalizeTimestamp(left.createdAt)
        );
      });
  }, [favoriteSpots, hasLocation, location, rankedRecommendations]);

  const nearbyFavoriteCount = useMemo(() => {
    if (!hasLocation) return favoriteDiscoveryItems.length;
    return favoriteDiscoveryItems.filter(
      (spot) => Number.isFinite(spot.distanceKm) && spot.distanceKm <= radiusKm,
    ).length;
  }, [favoriteDiscoveryItems, hasLocation, radiusKm]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Curated Spots",
        value: hasLocation
          ? nearbyRecommendations.length
          : rankedRecommendations.length,
        subtext: hasLocation
          ? `Within ${radiusKm} km of your location`
          : "Waiting for location to rank by distance",
      },
      {
        label: "Saved Favorites",
        value: favoriteDiscoveryItems.length,
        subtext: hasLocation
          ? `${nearbyFavoriteCount} of them sit inside your discovery radius`
          : isAuthenticated
            ? "Your saved coordinates and matched curated spots"
            : "Sign in to sync your saved locations",
      },
      {
        label: "Upcoming Events",
        value: hasLocation ? nearbyEvents.length : upcomingEvents.length,
        subtext: hasLocation
          ? `Published star parties and special events within ${radiusKm} km`
          : "Location unlocks nearby event ranking",
      },
      {
        label: "Local Sky Class",
        value:
          skyQuality?.Bortle || (skyQualityLoading ? "Loading..." : "Unknown"),
        subtext: skyQuality?.SQM
          ? `SQM ${Number(skyQuality.SQM).toFixed(2)} at your current position`
          : "Sky quality and dark spot hints",
      },
    ],
    [
      favoriteDiscoveryItems.length,
      hasLocation,
      isAuthenticated,
      nearbyEvents.length,
      nearbyFavoriteCount,
      nearbyRecommendations.length,
      radiusKm,
      rankedRecommendations.length,
      skyQuality,
      skyQualityLoading,
      upcomingEvents.length,
    ],
  );

  return {
    rankedRecommendations,
    nearbyRecommendations,
    visibleRecommendations,
    upcomingEvents,
    nearbyEvents,
    visibleEvents,
    visibleStarParties,
    visibleSpecialEvents,
    skyConditionSummary,
    nearestDarkSpotSummary,
    favoriteDiscoveryItems,
    nearbyFavoriteCount,
    summaryCards,
  };
}
