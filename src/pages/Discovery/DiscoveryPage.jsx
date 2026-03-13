import { useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PageShell from "@/components/layout/PageShell";
import EarthGlobe from "@/components/planets/EarthGlobe";
import { loadFavoriteSpots } from "@/features/map/favoritesStorage";
import { fetchDarkSpots } from "@/utils/darkSpots";
import { formatDateTime } from "@/utils/dateTime";
import {
  coordinatesMatch,
  formatDistanceKm,
  getCoordinateKey,
  haversineDistanceKm,
} from "@/utils/geo";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import {
  buildExternalMapDirectionsUrl,
  buildExternalMapSearchUrl,
} from "@/utils/mapLinks";
import velaTheme from "@/utils/muiTheme";
import { fetchSkyQualityMetrics } from "@/utils/skyQuality";

const DISCOVERY_RADIUS_OPTIONS = [100, 250, 500, 1000];
const SECTION_CARD_SX = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

const normalizeTimestamp = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const formatEventType = (value) =>
  value === "special_event" ? "Special event" : "Star party";

const getEmptyLocationMessage = (locationStatus) => {
  if (locationStatus === "searching") {
    return "Locating you now. Nearby discovery results will appear as soon as location is ready.";
  }

  return "Allow location access to rank recommendations, favorites, and events by distance.";
};

const isUpcomingEvent = (event, now) =>
  normalizeTimestamp(event?.endsAt || event?.startsAt) >= now;

const getRelativeDateLabel = (value, now) => {
  const timestamp = normalizeTimestamp(value);
  if (!Number.isFinite(timestamp)) return "Date TBD";

  const diffDays = Math.floor((timestamp - now) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return formatDateTime(value, { includeYear: true });
};

const resolveInitialRadius = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 250;
  return (
    DISCOVERY_RADIUS_OPTIONS.find((option) => option >= numeric) || 250
  );
};

const buildDestinationHref = ({ origin, destination, provider }) =>
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

function DiscoveryMetricCard({ label, value, subtext }) {
  return (
    <Card sx={SECTION_CARD_SX}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {subtext}
        </Typography>
      </CardContent>
    </Card>
  );
}

function DiscoverySection({ title, subtitle, action, children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "flex-end" }}
      >
        <Box>
          <Typography variant="h5">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

function SpotCard({
  item,
  location,
  directionsProvider,
  title,
  body,
  chips = [],
  secondaryActionLabel = "Open on map",
}) {
  const directionsHref = buildDestinationHref({
    origin: location,
    destination: item,
    provider: directionsProvider,
  });
  const searchHref = buildExternalMapSearchUrl({
    provider: directionsProvider,
    lat: item?.lat,
    lng: item?.lng,
  });

  return (
    <Card sx={SECTION_CARD_SX}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {body}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{ color: "secondary.main", whiteSpace: "nowrap" }}
          >
            {formatDistanceKm(item?.distanceKm)}
          </Typography>
        </Stack>

        {chips.length ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {chips.map((chip) => (
              <Chip
                key={chip.label}
                label={chip.label}
                color={chip.color || "default"}
                variant={chip.variant || "filled"}
                size="small"
              />
            ))}
          </Stack>
        ) : null}

        {item?.sourceLinks?.length ? (
          <Link
            href={item.sourceLinks[0]}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            sx={{ color: "secondary.main", alignSelf: "flex-start" }}
          >
            Source
          </Link>
        ) : null}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0, mt: "auto" }}>
        {directionsHref ? (
          <Button
            component="a"
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            variant="contained"
            color="secondary"
          >
            Directions
          </Button>
        ) : null}
        {searchHref ? (
          <Button
            component="a"
            href={searchHref}
            target="_blank"
            rel="noreferrer"
            variant="outlined"
          >
            {secondaryActionLabel}
          </Button>
        ) : null}
      </CardActions>
    </Card>
  );
}

function EventCard({ event, location, directionsProvider, referenceNow }) {
  const directionsHref = buildDestinationHref({
    origin: location,
    destination: event,
    provider: directionsProvider,
  });

  return (
    <Card sx={SECTION_CARD_SX}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="h6">{event.title}</Typography>
          <Typography variant="body2" sx={{ color: "secondary.main" }}>
            {formatDistanceKm(event.distanceKm)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={formatEventType(event.eventType)} size="small" />
          <Chip label={getRelativeDateLabel(event.startsAt, referenceNow)} size="small" />
          <Chip
            label={Array.isArray(event.rsvps) ? `${event.rsvps.length} RSVPs` : "0 RSVPs"}
            size="small"
            variant="outlined"
          />
        </Stack>

        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {formatDateTime(event.startsAt, { includeYear: true })}
          {event.endsAt ? ` to ${formatDateTime(event.endsAt, { includeYear: true })}` : ""}
        </Typography>

        {event.meetupDetails ? (
          <Typography variant="body2">{event.meetupDetails}</Typography>
        ) : null}

        {event.description ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {event.description}
          </Typography>
        ) : null}

        {event.hostChecklist?.length ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {event.hostChecklist.slice(0, 4).map((entry) => (
              <Chip key={entry} label={entry} size="small" variant="outlined" />
            ))}
          </Stack>
        ) : null}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0, mt: "auto" }}>
        {directionsHref ? (
          <Button
            component="a"
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            variant="contained"
            color="secondary"
          >
            Directions
          </Button>
        ) : null}
      </CardActions>
    </Card>
  );
}

function EmptyStateCard({ title, body, action }) {
  return (
    <Card>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {body}
        </Typography>
        {action}
      </CardContent>
    </Card>
  );
}

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

  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const hasLocation =
    Number.isFinite(location?.lat) && Number.isFinite(location?.lng);
  const showHero = useMemo(() => isProbablyHardwareAccelerated(), []);
  const hero = showHero ? (
    <EarthGlobe variant="night" className="profile-page__earth-canvas" />
  ) : null;
  const [referenceNow] = useState(() => Date.now());

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

        return normalizeTimestamp(left.startsAt) - normalizeTimestamp(right.startsAt);
      });
  }, [hasLocation, location?.lat, location?.lng, referenceNow, starPartyEvents]);

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
          name: matchedLocation?.name || "Saved favorite",
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
        return normalizeTimestamp(right.createdAt) - normalizeTimestamp(left.createdAt);
      });
  }, [favoriteSpots, hasLocation, location?.lat, location?.lng, rankedRecommendations]);

  const nearbyFavoriteCount = useMemo(() => {
    if (!hasLocation) return favoriteDiscoveryItems.length;
    return favoriteDiscoveryItems.filter(
      (spot) => Number.isFinite(spot.distanceKm) && spot.distanceKm <= radiusKm,
    ).length;
  }, [favoriteDiscoveryItems, hasLocation, radiusKm]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Curated spots",
        value: hasLocation ? nearbyRecommendations.length : rankedRecommendations.length,
        subtext: hasLocation
          ? `Within ${radiusKm} km of your location`
          : "Waiting for location to rank by distance",
      },
      {
        label: "Saved favorites",
        value: favoriteDiscoveryItems.length,
        subtext: hasLocation
          ? `${nearbyFavoriteCount} of them sit inside your discovery radius`
          : isAuthenticated
            ? "Your saved coordinates and matched curated spots"
            : "Sign in to sync your saved locations",
      },
      {
        label: "Upcoming events",
        value: hasLocation ? nearbyEvents.length : upcomingEvents.length,
        subtext: hasLocation
          ? `Published star parties and special events within ${radiusKm} km`
          : "Location unlocks nearby event ranking",
      },
      {
        label: "Local sky class",
        value: skyQuality?.Bortle || (skyQualityLoading ? "Loading..." : "Unknown"),
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
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", lg: "center" }}
              >
                <Box>
                  <Typography variant="h5">Discovery radius</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
                    Tune how wide the page searches around your current location.
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
                <Alert severity={locationStatus === "searching" ? "info" : "warning"}>
                  {getEmptyLocationMessage(locationStatus)}
                </Alert>
              ) : null}

              {favoritesError ? <Alert severity="warning">{favoritesError}</Alert> : null}
              {skyQualityError ? <Alert severity="warning">{skyQualityError}</Alert> : null}
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

          <DiscoverySection
            title="Recommended locations"
            subtitle="Curated spots ranked by how close they are to you, with quick access to directions."
            action={
              <Button variant="outlined" onClick={() => onNavigate?.("/")}>
                Open map
              </Button>
            }
          >
            {hasLocation && !nearbyRecommendations.length && rankedRecommendations.length ? (
              <Alert severity="info">
                No curated spots were found inside {radiusKm} km. Showing the closest recommendations instead.
              </Alert>
            ) : null}

            {visibleRecommendations.length ? (
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                    xl: "repeat(3, minmax(0, 1fr))",
                  },
                }}
              >
                {visibleRecommendations.map((spot) => (
                  <SpotCard
                    key={spot.id}
                    item={spot}
                    location={location}
                    directionsProvider={directionsProvider}
                    title={spot.name}
                    body={spot.description || "Curated stargazing recommendation."}
                    chips={[
                      spot.type ? { label: spot.type } : null,
                      spot.region ? { label: spot.region } : null,
                      spot.country ? { label: spot.country } : null,
                      spot.bestTime ? { label: `Best: ${spot.bestTime}` } : null,
                    ].filter(Boolean)}
                  />
                ))}
              </Box>
            ) : (
              <EmptyStateCard
                title="No curated locations yet"
                body="Recommendations will appear here once the curated dataset is available."
              />
            )}
          </DiscoverySection>

          <DiscoverySection
            title="Favorite locations"
            subtitle="Your saved coordinates, enriched with curated spot metadata when VELA can match them."
          >
            {!isAuthenticated ? (
              <EmptyStateCard
                title="Sign in to see favorites"
                body="Favorites are tied to your account, so this section unlocks after login."
                action={
                  <Button variant="contained" color="secondary" onClick={() => onNavigate?.("/auth")}>
                    Sign in
                  </Button>
                }
              />
            ) : favoritesLoading ? (
              <Card>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <CircularProgress size={22} />
                  <Typography variant="body2">Loading your saved locations...</Typography>
                </CardContent>
              </Card>
            ) : favoriteDiscoveryItems.length ? (
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                    xl: "repeat(3, minmax(0, 1fr))",
                  },
                }}
              >
                {favoriteDiscoveryItems.map((spot) => (
                  <SpotCard
                    key={spot.key}
                    item={spot}
                    location={location}
                    directionsProvider={directionsProvider}
                    title={spot.name}
                    body={spot.description}
                    secondaryActionLabel="View pin"
                    chips={[
                      { label: "Favorite", color: "secondary" },
                      spot.type ? { label: spot.type } : null,
                      spot.region ? { label: spot.region } : null,
                      spot.country ? { label: spot.country } : null,
                      spot.bestTime ? { label: `Best: ${spot.bestTime}` } : null,
                    ].filter(Boolean)}
                  />
                ))}
              </Box>
            ) : (
              <EmptyStateCard
                title="No favorites saved"
                body="Save places from the map and they will appear here with distance and direction shortcuts."
                action={
                  <Button variant="outlined" onClick={() => onNavigate?.("/")}>
                    Browse the map
                  </Button>
                }
              />
            )}
          </DiscoverySection>

          <DiscoverySection
            title="Nearby events"
            subtitle="Published star parties and special events ordered by distance and time."
          >
            {hasLocation && !nearbyEvents.length && upcomingEvents.length ? (
              <Alert severity="info">
                No published events were found inside {radiusKm} km. Showing the closest upcoming events instead.
              </Alert>
            ) : null}

            {!visibleEvents.length ? (
              <EmptyStateCard
                title="No upcoming events"
                body="When star parties or special events are published, they will appear here."
              />
            ) : (
              <Stack spacing={3}>
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <Typography variant="h6">Star parties</Typography>
                    <Chip label={`${visibleStarParties.length}`} size="small" variant="outlined" />
                  </Stack>
                  {visibleStarParties.length ? (
                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "repeat(2, minmax(0, 1fr))",
                        },
                      }}
                    >
                      {visibleStarParties.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          location={location}
                          directionsProvider={directionsProvider}
                          referenceNow={referenceNow}
                        />
                      ))}
                    </Box>
                  ) : (
                    <EmptyStateCard
                      title="No nearby star parties"
                      body="Try a larger radius or check back after admins publish new gatherings."
                    />
                  )}
                </Box>

                <Divider />

                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <Typography variant="h6">Special events</Typography>
                    <Chip label={`${visibleSpecialEvents.length}`} size="small" variant="outlined" />
                  </Stack>
                  {visibleSpecialEvents.length ? (
                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "repeat(2, minmax(0, 1fr))",
                        },
                      }}
                    >
                      {visibleSpecialEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          location={location}
                          directionsProvider={directionsProvider}
                          referenceNow={referenceNow}
                        />
                      ))}
                    </Box>
                  ) : (
                    <EmptyStateCard
                      title="No nearby special events"
                      body="Special observing nights and larger astronomy meetups will appear here."
                    />
                  )}
                </Box>
              </Stack>
            )}
          </DiscoverySection>

          <DiscoverySection
            title="Tonight's local sky"
            subtitle="A quick look at your current sky class and a few darker escapes nearby."
          >
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  lg: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
                },
              }}
            >
              <Card sx={SECTION_CARD_SX}>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="h6">Sky quality at your position</Typography>
                  {skyQualityLoading ? (
                    <Stack spacing={1.5}>
                      <CircularProgress size={22} />
                      <Typography variant="body2">Reading local sky quality...</Typography>
                    </Stack>
                  ) : skyQuality ? (
                    <>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Chip label={skyQuality.Bortle || "Unknown class"} color="secondary" />
                        {skyQuality.SQM ? (
                          <Chip label={`SQM ${Number(skyQuality.SQM).toFixed(2)}`} />
                        ) : null}
                        {skyQuality.Ratio ? (
                          <Chip label={`Glow ratio ${Number(skyQuality.Ratio).toFixed(1)}x`} />
                        ) : null}
                      </Stack>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Artificial brightness: {skyQuality.Artif_bright_uccd_m2 ?? "N/A"} ucd/m²
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Total brightness: {skyQuality.Brightness_mcd_m2 ?? "N/A"} mcd/m²
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Turn on location to estimate the local Bortle class and sky quality.
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <Card sx={SECTION_CARD_SX}>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="h6">Darker escapes nearby</Typography>
                  {darkSpotsLoading ? (
                    <Stack spacing={1.5}>
                      <CircularProgress size={22} />
                      <Typography variant="body2">Scanning for dark spots...</Typography>
                    </Stack>
                  ) : darkSpots.length ? (
                    <Stack spacing={1.25}>
                      {darkSpots.map((spot) => (
                        <Card
                          key={`${spot.lat}-${spot.lon}`}
                          variant="outlined"
                          sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                        >
                          <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
                            <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                              <Typography variant="body1">
                                Bortle {spot.level}
                              </Typography>
                              <Typography variant="body2" sx={{ color: "secondary.main" }}>
                                {formatDistanceKm(spot.distance_km)}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
                              SQM {Number(spot.sqm).toFixed(2)} at {spot.lat.toFixed(3)},{` `}
                              {spot.lon.toFixed(3)}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      No nearby dark-spot candidates were returned for this radius yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          </DiscoverySection>
        </Stack>
      </PageShell>
    </ThemeProvider>
  );
}
