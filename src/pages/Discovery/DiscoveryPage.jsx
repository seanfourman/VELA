import { useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PageShell from "@/components/layout/PageShell";
import EarthGlobe from "@/components/planets/EarthGlobe";
import { loadFavoriteSpots } from "@/features/map/favoritesStorage";
import { getRsvpUserId } from "@/features/starParty/starPartyUtils";
import { fetchDarkSpots } from "@/utils/darkSpots";
import {
  coordinatesMatch,
  formatDistanceKm,
  getCoordinateKey,
  haversineDistanceKm,
} from "@/utils/geo";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import velaTheme from "@/utils/muiTheme";
import showNotification from "@/utils/notifications";
import { fetchSkyQualityMetrics } from "@/utils/skyQuality";
import { DiscoveryMetricCard } from "./components/DiscoveryShared";
import {
  FavoriteLocationsSection,
  LocalSkySection,
  NearbyEventsSection,
  RecommendedLocationsSection,
} from "./components/DiscoverySections";
import {
  DISCOVERY_RADIUS_OPTIONS,
  buildDiscoveryMapSelection,
  describeBortleSky,
  formatMetricNumber,
  getEmptyLocationMessage,
  isUpcomingEvent,
  normalizeTimestamp,
  parseBortleScore,
  resolveInitialRadius,
} from "./discoveryUtils";

export default function DiscoveryPage({
  auth,
  isLight,
  onNavigate,
  location,
  locationStatus,
  stargazeLocations = [],
  starPartyEvents = [],
  directionsProvider = "google",
  defaultRadiusKm = 250,
  onToggleStarPartyRsvp,
}) {
  const [radiusKm, setRadiusKm] = useState(() =>
    resolveInitialRadius(defaultRadiusKm),
  );
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");
  const [darkSpots, setDarkSpots] = useState([]);
  const [darkSpotsLoading, setDarkSpotsLoading] = useState(false);
  const [skyQuality, setSkyQuality] = useState(null);
  const [skyQualityLoading, setSkyQualityLoading] = useState(false);
  const [skyQualityError, setSkyQualityError] = useState("");
  const [pendingRsvpEventId, setPendingRsvpEventId] = useState("");

  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const activeUserRsvpId = getRsvpUserId(auth?.user);
  const hasLocation =
    Number.isFinite(location?.lat) && Number.isFinite(location?.lng);
  const showHero = useMemo(() => isProbablyHardwareAccelerated(), []);
  const hero = showHero ? (
    <EarthGlobe variant="night" className="profile-page__earth-canvas" />
  ) : null;
  const [referenceNow] = useState(() => Date.now());

  const openMapSelection = (selection) => {
    if (!selection) return;
    onNavigate?.("/", { state: { mapSelection: selection } });
  };

  const handleOpenDarkSpotOnMap = (spot) => {
    if (!spot) return;
    openMapSelection(
      buildDiscoveryMapSelection({
        type: "pin",
        id: `dark-${spot.lat}-${spot.lon}`,
        lat: spot.lat,
        lng: spot.lon,
      }),
    );
  };

  const handleOpenRecommendationOnMap = (spot) => {
    if (!spot) return;
    openMapSelection(
      buildDiscoveryMapSelection({
        type: "stargaze",
        id: spot.id,
        lat: spot.lat,
        lng: spot.lng,
      }),
    );
  };

  const handleOpenFavoriteOnMap = (spot) => {
    if (!spot) return;
    openMapSelection(
      buildDiscoveryMapSelection({
        type: "pin",
        id: spot.key,
        lat: spot.lat,
        lng: spot.lng,
      }),
    );
  };

  const handleOpenEventOnMap = (event) => {
    if (!event) return;
    openMapSelection(
      buildDiscoveryMapSelection({
        type: "event",
        id: event.id,
        lat: event.lat,
        lng: event.lng,
      }),
    );
  };

  const handleEventRsvpAction = async (event) => {
    if (!event?.id) return;

    if (!isAuthenticated) {
      onNavigate?.("/auth");
      return;
    }

    if (!onToggleStarPartyRsvp || pendingRsvpEventId === event.id) {
      return;
    }

    const currentRsvps = Array.isArray(event.rsvps) ? event.rsvps : [];
    const isAlreadyJoined = Boolean(
      activeUserRsvpId &&
      currentRsvps.some(
        (entry) => String(entry.userId) === String(activeUserRsvpId),
      ),
    );

    setPendingRsvpEventId(event.id);

    try {
      const result = await onToggleStarPartyRsvp({ eventId: event.id });
      const joinedNow =
        typeof result?.joined === "boolean" ? result.joined : !isAlreadyJoined;
      const eventLabel = event.title || "this event";
      showNotification(
        joinedNow
          ? `RSVP confirmed for ${eventLabel}`
          : `RSVP removed from ${eventLabel}`,
        joinedNow ? "success" : "failure",
        { duration: 1800 },
      );
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not update RSVP right now",
        "failure",
        { duration: 2600 },
      );
    } finally {
      setPendingRsvpEventId((current) => (current === event.id ? "" : current));
    }
  };

  useEffect(() => {
    setRadiusKm(resolveInitialRadius(defaultRadiusKm));
  }, [defaultRadiusKm]);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setFavoriteSpots([]);
      setFavoritesError("");
      setFavoritesLoading(false);
      return undefined;
    }

    setFavoritesLoading(true);
    loadFavoriteSpots(getCoordinateKey)
      .then((items) => {
        if (cancelled) return;
        setFavoriteSpots(items);
        setFavoritesError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setFavoritesError(
          error instanceof Error ? error.message : "Could not load favorites",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setFavoritesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    if (!hasLocation) {
      setDarkSpots([]);
      setDarkSpotsLoading(false);
      setSkyQuality(null);
      setSkyQualityLoading(false);
      setSkyQualityError("");
      return undefined;
    }

    setDarkSpotsLoading(true);
    setSkyQualityLoading(true);
    setSkyQualityError("");

    fetchDarkSpots(location.lat, location.lng, Math.min(radiusKm, 250))
      .then((items) => {
        if (cancelled) return;
        setDarkSpots(Array.isArray(items) ? items : []);
      })
      .finally(() => {
        if (cancelled) return;
        setDarkSpotsLoading(false);
      });

    fetchSkyQualityMetrics(location.lat, location.lng)
      .then((metrics) => {
        if (cancelled) return;
        setSkyQuality(metrics);
      })
      .catch((error) => {
        if (cancelled) return;
        setSkyQualityError(
          error instanceof Error ? error.message : "Could not load sky quality",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setSkyQualityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasLocation, location?.lat, location?.lng, radiusKm]);

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
  }, [hasLocation, location?.lat, location?.lng, stargazeLocations]);

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
          ? haversineDistanceKm(
              location.lat,
              location.lng,
              event.lat,
              event.lng,
            )
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
  }, [
    hasLocation,
    location?.lat,
    location?.lng,
    referenceNow,
    starPartyEvents,
  ]);

  const nearbyEvents = useMemo(() => {
    if (!hasLocation) return upcomingEvents;
    return upcomingEvents.filter(
      (event) =>
        Number.isFinite(event.distanceKm) && event.distanceKm <= radiusKm,
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
  }, [
    favoriteSpots,
    hasLocation,
    location?.lat,
    location?.lng,
    rankedRecommendations,
  ]);

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
  return (
    <ThemeProvider theme={velaTheme}>
      <PageShell
        title="Discovery"
        subtitle="Nearby stargazing ideas, saved favorites, and upcoming astronomy meetups in one place."
        isLight={isLight}
        onNavigate={onNavigate}
        hero={hero}
        className="discovery-page"
      >
        <Stack spacing={3}>
          <Card>
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
            >
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", lg: "center" }}
              >
                <Box>
                  <Typography variant="h5">Discovery Radius</Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", mt: 0.75 }}
                  >
                    Tune how wide the page searches around your current
                    location.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {DISCOVERY_RADIUS_OPTIONS.map((option) => (
                    <Chip
                      key={option}
                      label={`${option} km`}
                      color={radiusKm === option ? "secondary" : "default"}
                      onClick={() => setRadiusKm(option)}
                      variant={radiusKm === option ? "filled" : "outlined"}
                    />
                  ))}
                </Stack>
              </Stack>

              {locationStatus !== "active" ? (
                <Alert
                  severity={locationStatus === "searching" ? "info" : "warning"}
                >
                  {getEmptyLocationMessage(locationStatus)}
                </Alert>
              ) : null}

              {favoritesError ? (
                <Alert severity="warning">{favoritesError}</Alert>
              ) : null}
              {skyQualityError ? (
                <Alert severity="warning">{skyQualityError}</Alert>
              ) : null}
            </CardContent>
          </Card>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            {summaryCards.map((card) => (
              <DiscoveryMetricCard
                key={card.label}
                label={card.label}
                value={card.value}
                subtext={card.subtext}
              />
            ))}
          </Box>

          <RecommendedLocationsSection
            hasLocation={hasLocation}
            nearbyRecommendations={nearbyRecommendations}
            rankedRecommendations={rankedRecommendations}
            radiusKm={radiusKm}
            visibleRecommendations={visibleRecommendations}
            location={location}
            directionsProvider={directionsProvider}
            onOpenRecommendationOnMap={handleOpenRecommendationOnMap}
          />

          <FavoriteLocationsSection
            isAuthenticated={isAuthenticated}
            favoritesLoading={favoritesLoading}
            favoriteDiscoveryItems={favoriteDiscoveryItems}
            location={location}
            directionsProvider={directionsProvider}
            onNavigate={onNavigate}
            onOpenFavoriteOnMap={handleOpenFavoriteOnMap}
          />

          <NearbyEventsSection
            hasLocation={hasLocation}
            nearbyEvents={nearbyEvents}
            upcomingEvents={upcomingEvents}
            radiusKm={radiusKm}
            visibleEvents={visibleEvents}
            visibleStarParties={visibleStarParties}
            visibleSpecialEvents={visibleSpecialEvents}
            location={location}
            directionsProvider={directionsProvider}
            referenceNow={referenceNow}
            isAuthenticated={isAuthenticated}
            activeUserRsvpId={activeUserRsvpId}
            pendingRsvpEventId={pendingRsvpEventId}
            onOpenEventOnMap={handleOpenEventOnMap}
            onEventRsvpAction={handleEventRsvpAction}
          />

          <LocalSkySection
            skyQualityLoading={skyQualityLoading}
            skyQuality={skyQuality}
            skyConditionSummary={skyConditionSummary}
            nearestDarkSpotSummary={nearestDarkSpotSummary}
            darkSpotsLoading={darkSpotsLoading}
            darkSpots={darkSpots}
            onOpenDarkSpotOnMap={handleOpenDarkSpotOnMap}
          />
        </Stack>
      </PageShell>
    </ThemeProvider>
  );
}
