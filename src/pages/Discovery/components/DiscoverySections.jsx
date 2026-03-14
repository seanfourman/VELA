import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatDistanceKm } from "@/utils/geo";
import {
  DiscoverySection,
  EmptyStateCard,
  EventCard,
  SectionCountBadge,
  SpotCard,
} from "./DiscoveryShared";
import { SECTION_CARD_SX } from "../discoveryStyles";
import { formatMetricNumber } from "../discoveryUtils";

export function RecommendedLocationsSection({
  hasLocation,
  nearbyRecommendations,
  rankedRecommendations,
  radiusKm,
  visibleRecommendations,
  location,
  directionsProvider,
  onOpenRecommendationOnMap,
}) {
  return (
    <DiscoverySection
      title="Recommended Locations"
      subtitle="Curated spots ranked by how close they are to you, with quick access to directions."
    >
      {hasLocation && !nearbyRecommendations.length && rankedRecommendations.length ? (
        <Alert severity="info">
          No curated spots were found inside {radiusKm} km. Showing the closest
          recommendations instead.
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
              onOpenOnMap={() => onOpenRecommendationOnMap?.(spot)}
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
          title="No Curated Locations Yet"
          body="Recommendations will appear here once the curated dataset is available."
        />
      )}
    </DiscoverySection>
  );
}

export function FavoriteLocationsSection({
  isAuthenticated,
  favoritesLoading,
  favoriteDiscoveryItems,
  location,
  directionsProvider,
  onNavigate,
  onOpenFavoriteOnMap,
}) {
  return (
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
              onOpenOnMap={() => onOpenFavoriteOnMap?.(spot)}
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
  );
}

const isEventJoined = (event, activeUserRsvpId) =>
  Boolean(
    activeUserRsvpId &&
      Array.isArray(event?.rsvps) &&
      event.rsvps.some(
        (entry) => String(entry.userId) === String(activeUserRsvpId),
      ),
  );

const getEventRsvpActionLabel = ({
  event,
  isAuthenticated,
  activeUserRsvpId,
}) => {
  if (!isAuthenticated) return "Sign In to RSVP";
  return isEventJoined(event, activeUserRsvpId) ? "Leave RSVP" : "RSVP";
};

export function NearbyEventsSection({
  hasLocation,
  nearbyEvents,
  upcomingEvents,
  radiusKm,
  visibleEvents,
  visibleStarParties,
  visibleSpecialEvents,
  location,
  directionsProvider,
  referenceNow,
  isAuthenticated,
  activeUserRsvpId,
  pendingRsvpEventId,
  onOpenEventOnMap,
  onEventRsvpAction,
}) {
  return (
    <DiscoverySection
      title="Nearby Events"
      subtitle="Published star parties and special events ordered by distance and time."
    >
      {hasLocation && !nearbyEvents.length && upcomingEvents.length ? (
        <Alert severity="info">
          No published events were found inside {radiusKm} km. Showing the closest
          upcoming events instead.
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
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
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
                    onOpenOnMap={() => onOpenEventOnMap?.(event)}
                    onRsvpAction={() => onEventRsvpAction?.(event)}
                    rsvpActionLabel={getEventRsvpActionLabel({
                      event,
                      isAuthenticated,
                      activeUserRsvpId,
                    })}
                    isRsvpPending={pendingRsvpEventId === event.id}
                    isJoined={isEventJoined(event, activeUserRsvpId)}
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
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
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
                    onOpenOnMap={() => onOpenEventOnMap?.(event)}
                    onRsvpAction={() => onEventRsvpAction?.(event)}
                    rsvpActionLabel={getEventRsvpActionLabel({
                      event,
                      isAuthenticated,
                      activeUserRsvpId,
                    })}
                    isRsvpPending={pendingRsvpEventId === event.id}
                    isJoined={isEventJoined(event, activeUserRsvpId)}
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
  );
}

export function LocalSkySection({
  skyQualityLoading,
  skyQuality,
  skyConditionSummary,
  nearestDarkSpotSummary,
  darkSpotsLoading,
  darkSpots,
  onOpenDarkSpotOnMap,
}) {
  return (
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
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="h6">Sky Quality at Your Position</Typography>
            {skyQualityLoading ? (
              <Stack spacing={1.5}>
                <CircularProgress size={22} />
                <Typography variant="body2">Reading local sky quality...</Typography>
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
                    <Box sx={{ display: "grid", gap: 0.75, flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="overline"
                        sx={{ color: "secondary.main", letterSpacing: "0.1em" }}
                      >
                        Current Class
                      </Typography>
                      <Typography variant="h4">
                        {skyQuality.Bortle || "Unknown"}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
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
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        SQM
                      </Typography>
                      <Typography variant="h5">
                        {formatMetricNumber(skyQuality.SQM, 2)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
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
                  <Card variant="outlined" sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Glow Ratio
                      </Typography>
                      <Typography variant="h6">
                        {formatMetricNumber(skyQuality.Ratio, 1)}x
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Artificial Brightness
                      </Typography>
                      <Typography variant="h6">
                        {formatMetricNumber(skyQuality.Artif_bright_uccd_m2, 0)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        ucd/m^2
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Total Brightness
                      </Typography>
                      <Typography variant="h6">
                        {formatMetricNumber(skyQuality.Brightness_mcd_m2, 1)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
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
                  <Card variant="outlined" sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="overline" sx={{ color: "secondary.main" }}>
                        Best Tonight For
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
                        {skyConditionSummary.bestFor}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="overline" sx={{ color: "secondary.main" }}>
                        Nearest Improvement
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.75 }}>
                        {nearestDarkSpotSummary.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
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
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Turn on location to estimate the local Bortle class and sky quality.
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={SECTION_CARD_SX}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="h6">Darker Escapes Nearby</Typography>
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
                      <Stack spacing={1.25}>
                        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                          <Typography variant="body1">Bortle {spot.level}</Typography>
                          <Typography variant="body2" sx={{ color: "secondary.main" }}>
                            {formatDistanceKm(spot.distance_km)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          SQM {formatMetricNumber(spot.sqm, 2)} at {spot.lat.toFixed(3)},{` `}
                          {spot.lon.toFixed(3)}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => onOpenDarkSpotOnMap?.(spot)}
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
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No nearby dark-spot candidates were returned for this radius yet.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </DiscoverySection>
  );
}
