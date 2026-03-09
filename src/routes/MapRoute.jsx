import MapView from "@/pages/Map/MapView";
import { useAppLayoutContext } from "@/layouts/AppLayoutContext";

function MapRoute() {
  const {
    mapViewRef,
    location,
    locationStatus,
    mapType,
    setMapType,
    mapIsAuthenticated,
    auth,
    stargazeLocations,
    starPartyEvents,
    settings,
    handleUpdateSettings,
    handleToggleStarPartyRsvp,
    setIsThreeDModeActive,
  } = useAppLayoutContext();

  return (
    <MapView
      ref={mapViewRef}
      onThreeDModeChange={setIsThreeDModeActive}
      location={location}
      locationStatus={locationStatus}
      mapType={mapType}
      setMapType={setMapType}
      isAuthenticated={mapIsAuthenticated}
      authUser={auth?.user}
      stargazeLocations={stargazeLocations}
      starPartyEvents={starPartyEvents}
      directionsProvider={settings.directionsProvider}
      showRecommendedSpots={settings.showRecommendedSpots}
      lightOverlayEnabled={settings.lightOverlayEnabled}
      onToggleLightOverlay={(next) =>
        handleUpdateSettings({ lightOverlayEnabled: next })
      }
      searchDistance={settings.searchDistance}
      onSearchDistanceChange={(next) =>
        handleUpdateSettings({ searchDistance: next })
      }
      autoCenterOnLocate={settings.autoCenterOnLocate}
      onToggleStarPartyRsvp={handleToggleStarPartyRsvp}
    />
  );
}

export default MapRoute;
