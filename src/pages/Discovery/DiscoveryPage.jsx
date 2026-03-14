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
import { getRsvpUserId } from "@/features/starParty/starPartyUtils";
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
import showNotification from "@/utils/notifications";
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
  return DISCOVERY_RADIUS_OPTIONS.find((option) => option >= numeric) || 250;
};

const formatMetricNumber = (value, digits = 1) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : "N/A";
};

const parseBortleScore = (value) => {
  const match = String(value || "").match(/\d+/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
};

const describeBortleSky = (value) => {
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

const buildDiscoveryMapSelection = ({ type, id = null, lat, lng }) => ({
  type,
  id,
  lat,
  lng,
  requestId: `${type}-${id || getCoordinateKey(lat, lng)}-${Date.now()}`,
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
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mt: 0.75 }}
            >
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

function SectionCountBadge({ value }) {
  return (
    <Box
      component="span"
      sx={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(96, 165, 250, 0.16)",
        border: "1px solid rgba(96, 165, 250, 0.3)",
        color: "secondary.main",
        fontSize: "0.85rem",
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        boxShadow: "0 8px 20px rgba(8, 10, 22, 0.24)",
      }}
    >
      {value}
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
  onOpenOnMap,
  secondaryActionLabel = "Open Map",
}) {
  const directionsHref = buildDestinationHref({
    origin: location,
    destination: item,
    provider: directionsProvider,
  });
  const hasSourceLink = Boolean(item?.sourceLinks?.length);
  const actionCount =
    Number(Boolean(directionsHref)) + Number(Boolean(onOpenOnMap));

  return (
    <Card sx={SECTION_CARD_SX}>
      <CardContent
        sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1 }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={1.5}
          alignItems="flex-start"
        >
          <Typography
            variant="h6"
            sx={{
              flex: 1,
              minWidth: 0,
              pr: 1.5,
              lineHeight: 1.35,
              minHeight: "2.7em",
              display: "-webkit-box",
              overflow: "hidden",
              textOverflow: "ellipsis",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "secondary.main",
              whiteSpace: "nowrap",
              flexShrink: 0,
              pt: 0.25,
            }}
          >
            {formatDistanceKm(item?.distanceKm)}
          </Typography>
        </Stack>

        <Box
          sx={{
            mt: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {body}
          </Typography>

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

          {hasSourceLink ? (
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
        </Box>
      </CardContent>
      <CardActions
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          mt: "auto",
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(actionCount, 1)}, minmax(0, 1fr))`,
          gap: 1.25,
          "& > :not(style) ~ :not(style)": {
            marginLeft: 0,
          },
        }}
      >
        {directionsHref ? (
          <Button
            component="a"
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            variant="contained"
            color="secondary"
            fullWidth
          >
            Directions
          </Button>
        ) : null}
        {onOpenOnMap ? (
          <Button onClick={onOpenOnMap} variant="outlined" fullWidth>
            {secondaryActionLabel}
          </Button>
        ) : null}
      </CardActions>
    </Card>
  );
}

function EventCard({
  event,
  location,
  directionsProvider,
  referenceNow,
  onOpenOnMap,
  onRsvpAction,
  rsvpActionLabel = "RSVP",
  isRsvpPending = false,
  isJoined = false,
}) {
  const directionsHref = buildDestinationHref({
    origin: location,
    destination: event,
    provider: directionsProvider,
  });
  const actionCount =
    Number(Boolean(directionsHref)) +
    Number(Boolean(onOpenOnMap)) +
    Number(Boolean(onRsvpAction));

  return (
    <Card sx={SECTION_CARD_SX}>
      <CardContent
        sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1 }}
      >
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="h6">{event.title}</Typography>
          <Typography variant="body2" sx={{ color: "secondary.main" }}>
            {formatDistanceKm(event.distanceKm)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={formatEventType(event.eventType)} size="small" />
          <Chip
            label={getRelativeDateLabel(event.startsAt, referenceNow)}
            size="small"
          />
          <Chip
            label={
              Array.isArray(event.rsvps)
                ? `${event.rsvps.length} RSVPs`
                : "0 RSVPs"
            }
            size="small"
            variant="outlined"
          />
        </Stack>

        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {formatDateTime(event.startsAt, { includeYear: true })}
          {event.endsAt
            ? ` to ${formatDateTime(event.endsAt, { includeYear: true })}`
            : ""}
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
      <CardActions
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          mt: "auto",
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(actionCount, 1)}, minmax(0, 1fr))`,
          gap: 1.25,
          "& > :not(style) ~ :not(style)": {
            marginLeft: 0,
          },
        }}
      >
        {directionsHref ? (
          <Button
            component="a"
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            variant="contained"
            color="secondary"
            fullWidth
          >
            Directions
          </Button>
        ) : null}
        {onOpenOnMap ? (
          <Button onClick={onOpenOnMap} variant="outlined" fullWidth>
            Open Map
          </Button>
        ) : null}
        {onRsvpAction ? (
          <Button
            onClick={onRsvpAction}
            variant={isJoined ? "contained" : "outlined"}
            color={isJoined ? "success" : "inherit"}
            disabled={isRsvpPending}
            fullWidth
          >
            {isRsvpPending ? "Saving..." : rsvpActionLabel}
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

          <DiscoverySection
            title="Recommended Locations"
            subtitle="Curated spots ranked by how close they are to you, with quick access to directions."
          >
            {hasLocation &&
            !nearbyRecommendations.length &&
            rankedRecommendations.length ? (
              <Alert severity="info">
                No curated spots were found inside {radiusKm} km. Showing the
                closest recommendations instead.
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
                    onOpenOnMap={() =>
                      openMapSelection(
                        buildDiscoveryMapSelection({
                          type: "stargaze",
                          id: spot.id,
                          lat: spot.lat,
                          lng: spot.lng,
                        }),
                      )
                    }
                    title={spot.name}
                    body={
                      spot.description || "Curated stargazing recommendation."
                    }
                    chips={[
                      spot.type ? { label: spot.type } : null,
                      spot.region ? { label: spot.region } : null,
                      spot.country ? { label: spot.country } : null,
                      spot.bestTime
                        ? { label: `Best: ${spot.bestTime}` }
                        : null,
                    ].filter(Boolean)}
                  />
                ))}
              </Box>
            ) : (
              <EmptyStateCard
                title="No Curated Locations Yet"
                body="Recommendations will appear here once the curated dataset is available."
              />
            )}
          </DiscoverySection>

          <DiscoverySection
            title="Favorite Locations"
            subtitle="Your saved coordinates, enriched with curated spot metadata when VELA can match them."
          >
            {!isAuthenticated ? (
              <EmptyStateCard
                title="Sign In to See Favorites"
                body="Favorites are tied to your account, so this section unlocks after login."
                action={
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => onNavigate?.("/auth")}
                  >
                    Sign in
                  </Button>
                }
              />
            ) : favoritesLoading ? (
              <Card>
                <CardContent
                  sx={{ display: "flex", alignItems: "center", gap: 2 }}
                >
                  <CircularProgress size={22} />
                  <Typography variant="body2">
                    Loading your saved locations...
                  </Typography>
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
                    onOpenOnMap={() =>
                      openMapSelection(
                        buildDiscoveryMapSelection({
                          type: "pin",
                          id: spot.key,
                          lat: spot.lat,
                          lng: spot.lng,
                        }),
                      )
                    }
                    title={spot.name}
                    body={spot.description}
                    secondaryActionLabel="View pin"
                    chips={[
                      { label: "Favorite", color: "secondary" },
                      spot.type ? { label: spot.type } : null,
                      spot.region ? { label: spot.region } : null,
                      spot.country ? { label: spot.country } : null,
                      spot.bestTime
                        ? { label: `Best: ${spot.bestTime}` }
                        : null,
                    ].filter(Boolean)}
                  />
                ))}
              </Box>
            ) : (
              <EmptyStateCard
                title="No Favorites Saved"
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
            title="Nearby Events"
            subtitle="Published star parties and special events ordered by distance and time."
          >
            {hasLocation && !nearbyEvents.length && upcomingEvents.length ? (
              <Alert severity="info">
                No published events were found inside {radiusKm} km. Showing the
                closest upcoming events instead.
              </Alert>
            ) : null}

            {!visibleEvents.length ? (
              <EmptyStateCard
                title="No Upcoming Events"
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
                    <Typography variant="h6">Star Parties</Typography>
                    <SectionCountBadge value={visibleStarParties.length} />
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
                          onOpenOnMap={() => handleOpenEventOnMap(event)}
                          onRsvpAction={() => handleEventRsvpAction(event)}
                          rsvpActionLabel={
                            !isAuthenticated
                              ? "Sign In to RSVP"
                              : activeUserRsvpId &&
                                  Array.isArray(event.rsvps) &&
                                  event.rsvps.some(
                                    (entry) =>
                                      String(entry.userId) ===
                                      String(activeUserRsvpId),
                                  )
                                ? "Leave RSVP"
                                : "RSVP"
                          }
                          isRsvpPending={pendingRsvpEventId === event.id}
                          isJoined={Boolean(
                            activeUserRsvpId &&
                            Array.isArray(event.rsvps) &&
                            event.rsvps.some(
                              (entry) =>
                                String(entry.userId) ===
                                String(activeUserRsvpId),
                            ),
                          )}
                        />
                      ))}
                    </Box>
                  ) : (
                    <EmptyStateCard
                      title="No Nearby Star Parties"
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
                    <Typography variant="h6">Special Events</Typography>
                    <SectionCountBadge value={visibleSpecialEvents.length} />
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
                          onOpenOnMap={() => handleOpenEventOnMap(event)}
                          onRsvpAction={() => handleEventRsvpAction(event)}
                          rsvpActionLabel={
                            !isAuthenticated
                              ? "Sign In to RSVP"
                              : activeUserRsvpId &&
                                  Array.isArray(event.rsvps) &&
                                  event.rsvps.some(
                                    (entry) =>
                                      String(entry.userId) ===
                                      String(activeUserRsvpId),
                                  )
                                ? "Leave RSVP"
                                : "RSVP"
                          }
                          isRsvpPending={pendingRsvpEventId === event.id}
                          isJoined={Boolean(
                            activeUserRsvpId &&
                            Array.isArray(event.rsvps) &&
                            event.rsvps.some(
                              (entry) =>
                                String(entry.userId) ===
                                String(activeUserRsvpId),
                            ),
                          )}
                        />
                      ))}
                    </Box>
                  ) : (
                    <EmptyStateCard
                      title="No Nearby Special Events"
                      body="Special observing nights and larger astronomy meetups will appear here."
                    />
                  )}
                </Box>
              </Stack>
            )}
          </DiscoverySection>

          <DiscoverySection
            title="Tonight's Local Sky"
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
                <CardContent
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  <Typography variant="h6">
                    Sky Quality at Your Position
                  </Typography>
                  {skyQualityLoading ? (
                    <Stack spacing={1.5}>
                      <CircularProgress size={22} />
                      <Typography variant="body2">
                        Reading local sky quality...
                      </Typography>
                    </Stack>
                  ) : skyQuality ? (
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          p: 2.25,
                          borderRadius: "20px",
                          border: "1px solid rgba(96, 165, 250, 0.2)",
                          background:
                            "linear-gradient(180deg, rgba(96, 165, 250, 0.12) 0%, rgba(15, 23, 42, 0.2) 100%)",
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={2}
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Box
                            sx={{
                              display: "grid",
                              gap: 0.75,
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              variant="overline"
                              sx={{
                                color: "secondary.main",
                                letterSpacing: "0.1em",
                              }}
                            >
                              Current Class
                            </Typography>
                            <Typography variant="h4">
                              {skyQuality.Bortle || "Unknown"}
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 600 }}
                            >
                              {skyConditionSummary.label}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              minWidth: { xs: 100, sm: 132 },
                              px: 2,
                              py: 1.25,
                              borderRadius: "18px",
                              background: "rgba(15, 23, 42, 0.36)",
                              border: "1px solid rgba(148, 163, 184, 0.14)",
                              flexShrink: 0,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              SQM
                            </Typography>
                            <Typography variant="h5">
                              {formatMetricNumber(skyQuality.SQM, 2)}
                            </Typography>
                          </Box>
                        </Stack>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", mt: 2 }}
                        >
                          {skyConditionSummary.summary}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: "grid",
                          gap: 1.25,
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(3, minmax(0, 1fr))",
                          },
                        }}
                      >
                        <Card
                          variant="outlined"
                          sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              Glow Ratio
                            </Typography>
                            <Typography variant="h6">
                              {formatMetricNumber(skyQuality.Ratio, 1)}x
                            </Typography>
                          </CardContent>
                        </Card>
                        <Card
                          variant="outlined"
                          sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              Artificial Brightness
                            </Typography>
                            <Typography variant="h6">
                              {formatMetricNumber(
                                skyQuality.Artif_bright_uccd_m2,
                                0,
                              )}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              ucd/m^2
                            </Typography>
                          </CardContent>
                        </Card>
                        <Card
                          variant="outlined"
                          sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              Total Brightness
                            </Typography>
                            <Typography variant="h6">
                              {formatMetricNumber(
                                skyQuality.Brightness_mcd_m2,
                                1,
                              )}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              mcd/m^2
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>

                      <Box
                        sx={{
                          display: "grid",
                          gap: 1.25,
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "repeat(2, minmax(0, 1fr))",
                          },
                        }}
                      >
                        <Card
                          variant="outlined"
                          sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography
                              variant="overline"
                              sx={{ color: "secondary.main" }}
                            >
                              Best Tonight For
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "text.secondary", mt: 0.75 }}
                            >
                              {skyConditionSummary.bestFor}
                            </Typography>
                          </CardContent>
                        </Card>
                        <Card
                          variant="outlined"
                          sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography
                              variant="overline"
                              sx={{ color: "secondary.main" }}
                            >
                              Nearest Improvement
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.75 }}>
                              {nearestDarkSpotSummary.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "text.secondary", mt: 0.5 }}
                            >
                              {nearestDarkSpotSummary.copy}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>

                      <Alert severity="info" sx={{ alignItems: "flex-start" }}>
                        {skyConditionSummary.struggle}
                      </Alert>
                    </Stack>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      Turn on location to estimate the local Bortle class and
                      sky quality.
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <Card sx={SECTION_CARD_SX}>
                <CardContent
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  <Typography variant="h6">Darker Escapes Nearby</Typography>
                  {darkSpotsLoading ? (
                    <Stack spacing={1.5}>
                      <CircularProgress size={22} />
                      <Typography variant="body2">
                        Scanning for dark spots...
                      </Typography>
                    </Stack>
                  ) : darkSpots.length ? (
                    <Stack spacing={1.25}>
                      {darkSpots.map((spot) => (
                        <Card
                          key={`${spot.lat}-${spot.lon}`}
                          variant="outlined"
                          sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                        >
                          <CardContent
                            sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}
                          >
                            <Stack spacing={1.25}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                spacing={1.5}
                              >
                                <Typography variant="body1">
                                  Bortle {spot.level}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "secondary.main" }}
                                >
                                  {formatDistanceKm(spot.distance_km)}
                                </Typography>
                              </Stack>
                              <Typography
                                variant="body2"
                                sx={{ color: "text.secondary" }}
                              >
                                SQM {formatMetricNumber(spot.sqm, 2)} at{" "}
                                {spot.lat.toFixed(3)},{` `}
                                {spot.lon.toFixed(3)}
                              </Typography>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleOpenDarkSpotOnMap(spot)}
                                sx={{ alignSelf: "flex-start" }}
                              >
                                Open Map
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      No nearby dark-spot candidates were returned for this
                      radius yet.
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
