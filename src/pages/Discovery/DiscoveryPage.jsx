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
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import velaTheme from "@/utils/muiTheme";
import { DiscoveryMetricCard } from "./components/DiscoveryShared";
import {
  FavoriteLocationsSection,
  LocalSkySection,
  NearbyEventsSection,
  RecommendedLocationsSection,
} from "./components/DiscoverySections";
import {
  DISCOVERY_RADIUS_OPTIONS,
  getEmptyLocationMessage,
  resolveInitialRadius,
} from "./discoveryUtils";
import useDiscoveryActions from "./hooks/useDiscoveryActions";
import useDiscoveryData from "./hooks/useDiscoveryData";
import useDiscoveryInsights from "./hooks/useDiscoveryInsights";

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
  const [referenceNow] = useState(() => Date.now());

  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const hasLocation =
    Number.isFinite(location?.lat) && Number.isFinite(location?.lng);
  const showHero = useMemo(() => isProbablyHardwareAccelerated(), []);
  const hero = showHero ? (
    <EarthGlobe variant="night" className="profile-page__earth-canvas" />
  ) : null;

  const {
    favoriteSpots,
    favoritesLoading,
    favoritesError,
    darkSpots,
    darkSpotsLoading,
    darkSpotsError,
    skyQuality,
    skyQualityLoading,
    skyQualityError,
  } = useDiscoveryData({
    isAuthenticated,
    hasLocation,
    location,
    radiusKm,
  });

  const {
    activeUserRsvpId,
    pendingRsvpEventId,
    handleOpenDarkSpotOnMap,
    handleOpenRecommendationOnMap,
    handleOpenFavoriteOnMap,
    handleOpenEventOnMap,
    handleEventRsvpAction,
  } = useDiscoveryActions({
    auth,
    isAuthenticated,
    onNavigate,
    onToggleStarPartyRsvp,
  });

  const {
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
    summaryCards,
  } = useDiscoveryInsights({
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
  });

  useEffect(() => {
    setRadiusKm(resolveInitialRadius(defaultRadiusKm));
  }, [defaultRadiusKm]);

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
              {darkSpotsError ? (
                <Alert severity="warning">{darkSpotsError}</Alert>
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
