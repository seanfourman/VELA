import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView/styles/map-layout.css";
import "./MapView/styles/leaflet-overrides.css";
import PlanetPanelContainer from "./PlanetPanel/PlanetPanelContainer";
import MapTypeSwitcher from "./MapView/components/controls/MapTypeSwitcher";
import MapQuickActions from "./MapView/components/controls/MapQuickActions";
import LocationSearchBar from "./MapView/components/search/LocationSearchBar";
import StargazePanelContent from "./MapView/components/panels/stargaze/StargazePanelContent";
import StargazePanelMobile from "./MapView/components/panels/stargaze/StargazePanelMobile";
import SpaceWeatherPanelContent from "./MapView/components/panels/spaceWeather/SpaceWeatherPanelContent";
import SpaceWeatherPanelMobile from "./MapView/components/panels/spaceWeather/SpaceWeatherPanelMobile";
import SearchDistanceSelector from "./MapView/components/controls/SearchDistanceSelector";
import MapLibre3DLayer from "./MapView/components/layers/MapLibre3DLayer";
import LocationMarker from "./MapView/components/layers/markers/LocationMarker";
import PlacedMarker from "./MapView/components/layers/markers/PlacedMarker";
import StargazeMarkers from "./MapView/components/layers/markers/StargazeMarkers";
import DarkSpotMarkers from "./MapView/components/layers/markers/DarkSpotMarkers";
import FavoriteOnlyMarkers from "./MapView/components/layers/markers/FavoriteOnlyMarkers";
import StarPartyMarkers from "./MapView/components/layers/markers/StarPartyMarkers";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  LIGHT_TILE_URL,
  LOCATION_ZOOM,
  LONG_PRESS_MS,
  MAP_TILES,
  MARKER_EXIT_MS,
  MARKER_VISIBILITY_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
} from "./MapView/core/mapConfig";
import {
  DoubleClickHandler,
  LongPressHandler,
  MapAnimator,
  MapController,
  MapZoomTracker,
  PopupStateHandler,
} from "./MapView/core/MapInteractionHandlers";
import {
  favoritePinIconRemoving,
  pinIconRemoving,
} from "./MapView/core/markerIcons";
import useMapViewState from "./MapView/hooks/useMapViewState";
import useSpaceWeather from "@/features/spaceWeather/useSpaceWeather";
import showNotification from "@/utils/notifications";
import { getRsvpUserId } from "@/features/starParty/starPartyUtils";

const MapView = forwardRef(function MapView(
  {
    mapSelection,
    onConsumeMapSelection,
    location,
    locationStatus,
    mapType,
    setMapType,
    stargazeLocations = [],
    starPartyEvents = [],
    isAuthenticated,
    authUser,
    directionsProvider = "google",
    showRecommendedSpots = true,
    satelliteReadableShadowsEnabled = true,
    lightOverlayEnabled = false,
    onToggleLightOverlay,
    searchDistance = 10,
    onSearchDistanceChange,
    autoCenterOnLocate = true,
    onThreeDModeChange,
    onToggleStarPartyRsvp,
  },
  ref
) {
  const [isThreeDMode, setIsThreeDMode] = useState(false);
  const [isSpaceWeatherOpen, setIsSpaceWeatherOpen] = useState(false);
  const [spaceWeatherFocus, setSpaceWeatherFocus] = useState(null);
  const [areZoomMarkersVisible, setAreZoomMarkersVisible] = useState(
    DEFAULT_ZOOM >= MARKER_VISIBILITY_ZOOM,
  );
  const [areZoomMarkersExiting, setAreZoomMarkersExiting] = useState(false);
  const handledMapSelectionRef = useRef(null);
  const eventMarkerRefs = useRef(new Map());
  const zoomMarkerExitTimerRef = useRef(0);
  const zoomMarkersVisibleRef = useRef(DEFAULT_ZOOM >= MARKER_VISIBILITY_ZOOM);
  const zoomMarkersExitingRef = useRef(false);
  const spaceWeather = useSpaceWeather();

  const { refs, ui, state, derived, handlers, planets } = useMapViewState({
    location,
    mapType,
    stargazeLocations,
    directionsProvider,
    showRecommendedSpots,
    lightOverlayEnabled,
    onToggleLightOverlay,
    searchDistance,
    onSearchDistanceChange,
  });
  const { mapRef, planetPanelRef, stargazeMarkerRefs, placedMarkerRef } = refs;
  const mapTypeClass = isThreeDMode ? "light three-d" : mapType;
  const closeStargazePanel = handlers.handleCloseStargazePanel;
  const handleCoordinateSearch = handlers.handleCoordinateSearch;
  const handleStargazeSearch = handlers.handleStargazeSearch;
  const handleStarPartySearch = handlers.handleStarPartySearch;
  const handleGetVisiblePlanets = handlers.handleGetVisiblePlanets;
  const handleRenameFavoriteSpot = handlers.handleRenameFavoriteSpot;
  const ensureSpaceWeatherLoaded = spaceWeather.ensureLoaded;
  const activeUserRsvpId = getRsvpUserId(authUser);
  const placedMarkerId = state.placedMarker?.id ?? null;
  const contextMenuLat = state.contextMenu?.lat ?? null;
  const contextMenuLng = state.contextMenu?.lng ?? null;
  const hasPinnedPopupTarget =
    placedMarkerId !== null &&
    Number.isFinite(contextMenuLat) &&
    Number.isFinite(contextMenuLng);
  const isSatelliteReadable =
    !isThreeDMode &&
    mapType === "satellite" &&
    satelliteReadableShadowsEnabled;
  const placedMarkerFavorite =
    state.placedMarker &&
    derived.favoriteSpotsByKey.has(
      handlers.getSpotKey(state.placedMarker.lat, state.placedMarker.lng),
    )
      ? derived.favoriteSpotsByKey.get(
          handlers.getSpotKey(state.placedMarker.lat, state.placedMarker.lng),
        ) || null
      : null;
  const visibleStarPartyEvents = useMemo(() => {
    if (!Array.isArray(starPartyEvents)) return [];
    return starPartyEvents.filter((event) => {
      if (!event || event.status !== "published") return false;
      if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) return false;
      return true;
    });
  }, [starPartyEvents]);

  const handleToggleThreeD = useCallback(() => {
    setIsThreeDMode((prev) => !prev);
  }, []);

  const handleMapZoomChange = useCallback(
    (nextZoom) => {
      if (nextZoom >= MARKER_VISIBILITY_ZOOM) {
        if (zoomMarkerExitTimerRef.current) {
          window.clearTimeout(zoomMarkerExitTimerRef.current);
          zoomMarkerExitTimerRef.current = 0;
        }
        if (zoomMarkersExitingRef.current) {
          zoomMarkersExitingRef.current = false;
          setAreZoomMarkersExiting(false);
        }
        if (!zoomMarkersVisibleRef.current) {
          zoomMarkersVisibleRef.current = true;
          setAreZoomMarkersVisible(true);
        }
        return;
      }

      if (!zoomMarkersVisibleRef.current || zoomMarkersExitingRef.current) {
        return;
      }

      mapRef.current?.closePopup?.();
      zoomMarkersExitingRef.current = true;
      setAreZoomMarkersExiting(true);

      if (zoomMarkerExitTimerRef.current) {
        window.clearTimeout(zoomMarkerExitTimerRef.current);
      }

      zoomMarkerExitTimerRef.current = window.setTimeout(() => {
        zoomMarkerExitTimerRef.current = 0;
        zoomMarkersVisibleRef.current = false;
        zoomMarkersExitingRef.current = false;
        setAreZoomMarkersVisible(false);
        setAreZoomMarkersExiting(false);
      }, MARKER_EXIT_MS);
    },
    [mapRef],
  );

  useEffect(() => {
    onThreeDModeChange?.(isThreeDMode);
  }, [isThreeDMode, onThreeDModeChange]);

  useEffect(() => {
    return () => {
      onThreeDModeChange?.(false);
    };
  }, [onThreeDModeChange]);

  useEffect(() => {
    return () => {
      if (zoomMarkerExitTimerRef.current) {
        window.clearTimeout(zoomMarkerExitTimerRef.current);
      }
    };
  }, []);

  const handleOpenSpaceWeatherAt = useCallback(
    (coords, label) => {
      if (
        !coords ||
        typeof coords.lat !== "number" ||
        !Number.isFinite(coords.lat) ||
        typeof coords.lng !== "number" ||
        !Number.isFinite(coords.lng)
      ) {
        return;
      }
      setSpaceWeatherFocus({
        lat: coords.lat,
        lng: coords.lng,
        label: typeof label === "string" ? label : "Selected location",
      });
      ensureSpaceWeatherLoaded();
      closeStargazePanel?.();
      setIsSpaceWeatherOpen(true);
    },
    [closeStargazePanel, ensureSpaceWeatherLoaded],
  );

  const handleCloseSpaceWeather = useCallback(() => {
    setIsSpaceWeatherOpen(false);
  }, []);

  const handleToggleEventRsvp = useCallback(
    async (event) => {
      if (!event?.id) return;
      if (!isAuthenticated || !activeUserRsvpId) {
        showNotification("Sign in to RSVP to events", "failure", { duration: 2400 });
        return;
      }
      const currentRsvps = Array.isArray(event.rsvps) ? event.rsvps : [];
      const isAlreadyJoined = currentRsvps.some(
        (entry) => entry.userId === activeUserRsvpId,
      );
      try {
        const result = await onToggleStarPartyRsvp?.({ eventId: event.id });
        const joinedNow =
          typeof result?.joined === "boolean" ? result.joined : !isAlreadyJoined;
        showNotification(joinedNow ? "RSVP confirmed" : "RSVP removed", "success", {
          duration: 1800,
        });
      } catch (error) {
        showNotification(
          error instanceof Error ? error.message : "Could not update RSVP right now",
          "failure",
          { duration: 2600 },
        );
      }
    },
    [activeUserRsvpId, isAuthenticated, onToggleStarPartyRsvp],
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomOutToMin: handlers.zoomOutToMin,
    }),
    [handlers.zoomOutToMin]
  );

  useEffect(() => {
    if (!hasPinnedPopupTarget) return undefined;

    const map = mapRef.current;
    const openPopup = () => {
      placedMarkerRef.current?.openPopup?.();
    };

    if (!map) {
      const popupTimer = window.setTimeout(openPopup, 0);
      return () => {
        window.clearTimeout(popupTimer);
      };
    }

    const alreadyFocused =
      map.distance(map.getCenter(), [state.placedMarker.lat, state.placedMarker.lng]) < 10 &&
      map.getZoom() >= LOCATION_ZOOM - 0.1;

    if (alreadyFocused) {
      const popupTimer = window.setTimeout(openPopup, 0);
      return () => {
        window.clearTimeout(popupTimer);
      };
    }

    map.once("moveend", openPopup);

    return () => {
      map.off("moveend", openPopup);
    };
  }, [
    hasPinnedPopupTarget,
    mapRef,
    placedMarkerRef,
    contextMenuLat,
    contextMenuLng,
    placedMarkerId,
    state.placedMarker?.lat,
    state.placedMarker?.lng,
  ]);

  useEffect(() => {
    if (!mapSelection?.requestId) return undefined;
    if (handledMapSelectionRef.current === mapSelection.requestId) return undefined;

    handledMapSelectionRef.current = mapSelection.requestId;
    onConsumeMapSelection?.();

    let cleanupSelectionFocus = null;

    const selectionTimer = window.setTimeout(() => {
      if (mapSelection.type === "stargaze") {
        const matchedSpot =
          stargazeLocations.find(
            (spot) => String(spot?.id) === String(mapSelection.id),
          ) || null;

        if (matchedSpot) {
          handleStargazeSearch(matchedSpot);
          handleGetVisiblePlanets({
            target: matchedSpot,
            label: `Visible from ${matchedSpot.name || "selected spot"}`,
            source: "stargaze",
            openPanel: false,
            force: true,
          });
        } else if (
          Number.isFinite(mapSelection.lat) &&
          Number.isFinite(mapSelection.lng)
        ) {
          handleCoordinateSearch({
            lat: mapSelection.lat,
            lng: mapSelection.lng,
          });
          handleGetVisiblePlanets({
            target: {
              lat: mapSelection.lat,
              lng: mapSelection.lng,
            },
            label: "Visible from pinned spot",
            source: "pin",
            openPanel: false,
            force: true,
          });
        } else {
          return;
        }
      } else if (mapSelection.type === "event") {
        const matchedEvent =
          visibleStarPartyEvents.find(
            (event) => String(event?.id) === String(mapSelection.id),
          ) || null;

        if (matchedEvent) {
          handleStarPartySearch(matchedEvent);

          const marker = eventMarkerRefs.current.get(String(matchedEvent.id));
          if (marker?.openPopup) {
            const map = mapRef.current;
            const openPopup = () => {
              marker.openPopup();
            };

            if (!map) {
              const popupTimer = window.setTimeout(openPopup, 0);
              cleanupSelectionFocus = () => {
                window.clearTimeout(popupTimer);
              };
              return;
            }

            const alreadyFocused =
              map.distance(map.getCenter(), [matchedEvent.lat, matchedEvent.lng]) < 10 &&
              map.getZoom() >= LOCATION_ZOOM - 0.1;

            if (alreadyFocused) {
              const popupTimer = window.setTimeout(openPopup, 0);
              cleanupSelectionFocus = () => {
                window.clearTimeout(popupTimer);
              };
              return;
            }

            map.once("moveend", openPopup);
            cleanupSelectionFocus = () => {
              map.off("moveend", openPopup);
            };
          }
          return;
        }

        if (
          Number.isFinite(mapSelection.lat) &&
          Number.isFinite(mapSelection.lng)
        ) {
          handleCoordinateSearch({
            lat: mapSelection.lat,
            lng: mapSelection.lng,
          });
        }
        return;
      } else if (
        Number.isFinite(mapSelection.lat) &&
        Number.isFinite(mapSelection.lng)
      ) {
        handleCoordinateSearch({
          lat: mapSelection.lat,
          lng: mapSelection.lng,
        });
        handleGetVisiblePlanets({
          target: {
            lat: mapSelection.lat,
            lng: mapSelection.lng,
          },
          label: "Visible from pinned spot",
          source: "pin",
          openPanel: false,
          force: true,
        });
      } else {
        return;
      }
    }, 0);

    return () => {
      window.clearTimeout(selectionTimer);
      cleanupSelectionFocus?.();
    };
  }, [
    handleCoordinateSearch,
    handleGetVisiblePlanets,
    handleStarPartySearch,
    handleStargazeSearch,
    mapSelection,
    mapRef,
    onConsumeMapSelection,
    stargazeLocations,
    visibleStarPartyEvents,
  ]);

  return (
    <div
      className={`map-container visible ${mapTypeClass}${
        ui.isSearchFocused ? " search-focused" : ""
      }${ui.isPopupOpen ? " popup-open" : ""}${
        isSatelliteReadable ? " satellite-readable" : ""
      }`}
    >
      <PlanetPanelContainer
        ref={planetPanelRef}
        planets={planets.visiblePlanets}
        loading={planets.planetsLoading}
        error={planets.planetsError}
        mapType={mapType}
        reducedMotion={derived.reducedMotion}
        location={location}
        onVisibilityChange={ui.setIsPlanetPanelOpen}
      />

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        tapHold={false}
        doubleClickZoom={false}
        minZoom={MIN_ZOOM}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.0}
        maxZoom={MAX_ZOOM}
      >
        {isThreeDMode ? (
          <MapLibre3DLayer />
        ) : (
          <TileLayer
            key={mapType}
            attribution={MAP_TILES[mapType].attribution}
            url={MAP_TILES[mapType].url}
            maxZoom={MAX_ZOOM}
            keepBuffer={4}
            updateWhenIdle={true}
            updateWhenZooming={false}
            noWrap={true}
            eventHandlers={{
              tileload: handlers.handleTileLoad,
            }}
          />
        )}

        {lightOverlayEnabled && !isThreeDMode && (
          <TileLayer
            url={LIGHT_TILE_URL}
            attribution="WA2015 artificial sky brightness"
            opacity={0.72}
            zIndex={5}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            tileSize={256}
          />
        )}

        <MapController mapRef={mapRef} />
        <MapZoomTracker onZoomChange={handleMapZoomChange} />
        {!isThreeDMode && (
          <>
            <DoubleClickHandler onDoubleClick={handlers.handleDoubleClick} />
            <LongPressHandler
              onLongPress={handlers.handleDoubleClick}
              delayMs={LONG_PRESS_MS}
            />
            <PopupStateHandler
              onPopupStateChange={ui.setIsPopupOpen}
              onPopupClose={handlers.handlePopupClose}
            />
          </>
        )}
        {location && (
          <MapAnimator
            location={location}
            shouldAutoCenter={autoCenterOnLocate}
          />
        )}

        {!isThreeDMode && (
          <>
            <LocationMarker
              location={location}
              centerOnCoords={handlers.centerOnCoords}
              onOpenSpaceWeatherAt={handleOpenSpaceWeatherAt}
            />
            {state.exitingMarker ? (
              <Marker
                key={`removing-${
                  state.exitingMarker.id ||
                  `${state.exitingMarker.lat}-${state.exitingMarker.lng}`
                }`}
                position={[state.exitingMarker.lat, state.exitingMarker.lng]}
                icon={
                  state.exitingMarker.isFavorite
                    ? favoritePinIconRemoving
                    : pinIconRemoving
                }
                interactive={false}
              />
            ) : null}
            <PlacedMarker
              placedMarker={state.placedMarker}
              favoriteSpot={placedMarkerFavorite}
              placedMarkerRef={placedMarkerRef}
              isAuthenticated={isAuthenticated}
              isPinnedTarget={derived.isPinnedTarget}
              onGetDirections={handlers.handleGetDirections}
              onRemovePin={handlers.handleCloseContextMenu}
              onToggleFavorite={handlers.handleTogglePinnedFavorite}
              onRenameFavoriteName={handleRenameFavoriteSpot}
              onToggleTarget={handlers.handleTogglePinnedTarget}
              onShareLocation={() =>
                handlers.handleShareLocation(
                  state.placedMarker,
                  state.placedMarker?.isFavorite
                    ? "Favorite spot"
                    : "Pinned location",
                )
              }
              onOpenSpaceWeather={() =>
                handleOpenSpaceWeatherAt?.(
                  {
                    lat: state.placedMarker?.lat,
                    lng: state.placedMarker?.lng,
                  },
                  state.placedMarker?.isFavorite
                    ? "Favorite spot"
                    : "Pinned location",
                )
              }
              isFavoriteEntering={
                state.placedMarker
                  ? derived.enteringFavoriteKeySet.has(
                      handlers.getSpotKey(
                        state.placedMarker.lat,
                        state.placedMarker.lng,
                      ),
                    )
                  : false
              }
              centerOnCoords={handlers.centerOnCoords}
            />
            {areZoomMarkersVisible ? (
              <>
                <StargazeMarkers
                  spots={derived.visibleStargazeLocations}
                  isAuthenticated={isAuthenticated}
                  isMobileView={ui.isMobileView}
                  favoriteSpotsByKey={derived.favoriteSpotsByKey}
                  favoriteSpotKeys={derived.favoriteSpotKeys}
                  enteringFavoriteKeySet={derived.enteringFavoriteKeySet}
                  isExiting={areZoomMarkersExiting}
                  selectedDarkSpot={state.selectedDarkSpot}
                  stargazeMarkerRefs={stargazeMarkerRefs}
                  mapRef={mapRef}
                  setActiveStargazeId={handlers.setActiveStargazeId}
                  centerOnCoords={handlers.centerOnCoords}
                  openStargazePanel={handlers.openStargazePanel}
                  handleRenameFavoriteSpot={handleRenameFavoriteSpot}
                  handleToggleStargazeFavorite={handlers.handleToggleStargazeFavorite}
                  handleToggleStargazeTarget={handlers.handleToggleStargazeTarget}
                  handleShareLocation={handlers.handleShareLocation}
                  buildDirectionsUrl={handlers.buildDirectionsUrl}
                  getDirectionsOrigin={handlers.getDirectionsOrigin}
                  getSpotKey={handlers.getSpotKey}
                  onOpenSpaceWeatherAt={handleOpenSpaceWeatherAt}
                />
                <DarkSpotMarkers
                  darkSpots={state.darkSpots}
                  selectedDarkSpot={state.selectedDarkSpot}
                  favoriteSpotsByKey={derived.favoriteSpotsByKey}
                  favoriteSpotKeys={derived.favoriteSpotKeys}
                  enteringFavoriteKeySet={derived.enteringFavoriteKeySet}
                  isExiting={areZoomMarkersExiting}
                  isAuthenticated={isAuthenticated}
                  centerOnCoords={handlers.centerOnCoords}
                  handleRenameFavoriteSpot={handleRenameFavoriteSpot}
                  handleToggleDarkSpotFavorite={handlers.handleToggleDarkSpotFavorite}
                  handleToggleDarkSpotTarget={handlers.handleToggleDarkSpotTarget}
                  flashShareToggle={handlers.flashShareToggle}
                  handleShareLocation={handlers.handleShareLocation}
                  buildDirectionsUrl={handlers.buildDirectionsUrl}
                  getDirectionsOrigin={handlers.getDirectionsOrigin}
                  getSpotKey={handlers.getSpotKey}
                  onOpenSpaceWeatherAt={handleOpenSpaceWeatherAt}
                />
                <FavoriteOnlyMarkers
                  favoriteOnlySpots={derived.favoriteOnlySpots}
                  enteringFavoriteKeySet={derived.enteringFavoriteKeySet}
                  exitingFavoriteKeySet={derived.exitingFavoriteKeySet}
                  isExiting={areZoomMarkersExiting}
                  selectedDarkSpot={state.selectedDarkSpot}
                  isAuthenticated={isAuthenticated}
                  centerOnCoords={handlers.centerOnCoords}
                  handleRenameFavoriteSpot={handleRenameFavoriteSpot}
                  handleRemoveFavoriteSpotAnimated={
                    handlers.handleRemoveFavoriteSpotAnimated
                  }
                  handleShareLocation={handlers.handleShareLocation}
                  buildDirectionsUrl={handlers.buildDirectionsUrl}
                  getDirectionsOrigin={handlers.getDirectionsOrigin}
                  setSelectedDarkSpot={handlers.setSelectedDarkSpot}
                  onOpenSpaceWeatherAt={handleOpenSpaceWeatherAt}
                />
                <StarPartyMarkers
                  events={visibleStarPartyEvents}
                  isAuthenticated={isAuthenticated}
                  activeUserRsvpId={activeUserRsvpId}
                  eventMarkerRefs={eventMarkerRefs}
                  isExiting={areZoomMarkersExiting}
                  centerOnCoords={handlers.centerOnCoords}
                  handleShareLocation={handlers.handleShareLocation}
                  buildDirectionsUrl={handlers.buildDirectionsUrl}
                  getDirectionsOrigin={handlers.getDirectionsOrigin}
                  onToggleRsvp={handleToggleEventRsvp}
                />
              </>
            ) : null}
          </>
        )}
      </MapContainer>

      <aside
        className={`stargaze-panel glass-panel glass-panel-elevated${
          state.isStargazePanelOpen && !ui.isMobileView ? " open" : ""
        }`}
        aria-hidden={!(state.isStargazePanelOpen && !ui.isMobileView)}
      >
        {state.stargazePanelSpot ? (
          <>
            <div className="stargaze-panel__header">
              <div className="stargaze-panel__header-main">
                <div className="stargaze-panel__title">
                  {state.stargazePanelSpot.name}
                </div>
                {state.stargazePanelSpot.region || state.stargazePanelSpot.country ? (
                  <div className="stargaze-panel__subtitle">
                    {[state.stargazePanelSpot.region, state.stargazePanelSpot.country]
                      .filter(Boolean)
                      .join(" - ")}
                  </div>
                ) : null}
                {state.stargazePanelSpot.type ? (
                  <div className="stargaze-panel__chips">
                    <span className="stargaze-panel__chip">
                      {state.stargazePanelSpot.type}
                    </span>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="stargaze-panel__close"
                onClick={handlers.handleCloseStargazePanel}
                aria-label="Close spot details"
              >
                <span aria-hidden="true">X</span>
              </button>
            </div>
            <StargazePanelContent
              spot={state.stargazePanelSpot}
              directionsProvider={directionsProvider}
            />
          </>
        ) : null}
      </aside>
      <StargazePanelMobile
        spot={state.stargazePanelSpot}
        isOpen={state.isStargazePanelOpen && ui.isMobileView}
        onClose={handlers.handleCloseStargazePanel}
        directionsProvider={directionsProvider}
      />

      <aside
        className={`space-weather-panel glass-panel glass-panel-elevated${
          isSpaceWeatherOpen && !ui.isMobileView ? " open" : ""
        }`}
        aria-hidden={!(isSpaceWeatherOpen && !ui.isMobileView)}
      >
        <div className="space-weather-panel__header">
          <div className="space-weather-panel__header-main">
            <div className="space-weather-panel__title">Space Weather</div>
            <div className="space-weather-panel__subtitle">
              DONKI geomagnetic storms and Earth-directed CME models
            </div>
          </div>
          <button
            type="button"
            className="space-weather-panel__close"
            onClick={handleCloseSpaceWeather}
            aria-label="Close space weather panel"
          >
            <span aria-hidden="true">X</span>
          </button>
        </div>

        <SpaceWeatherPanelContent
          snapshot={spaceWeather.snapshot}
          location={spaceWeatherFocus || location}
          loading={spaceWeather.loading}
          error={spaceWeather.error}
          focusLabel={spaceWeatherFocus?.label || null}
        />
      </aside>
      <SpaceWeatherPanelMobile
        isOpen={isSpaceWeatherOpen && ui.isMobileView}
        onClose={handleCloseSpaceWeather}
        snapshot={spaceWeather.snapshot}
        location={spaceWeatherFocus || location}
        loading={spaceWeather.loading}
        error={spaceWeather.error}
        focusLabel={spaceWeatherFocus?.label || null}
      />

      <MapQuickActions
        isThreeDMode={isThreeDMode}
        onToggleThreeDMode={handleToggleThreeD}
        onShowPlanets={handlers.handleGetVisiblePlanets}
        onFindDarkSpots={handlers.handleFetchDarkSpots}
        canShowPlanets={derived.hasAnyLocation}
        canFindDarkSpots={derived.hasAnyLocation}
        planetsTitle={derived.quickPlanetsTitle}
        darkSpotsTitle={derived.quickDarkSpotsTitle}
        locationStatus={locationStatus}
        onSnapToLocation={
          locationStatus === "active" ? handlers.handleSnapToLocation : undefined
        }
        lightOverlayEnabled={lightOverlayEnabled}
        onToggleLightOverlay={handlers.handleToggleLightOverlay}
      />

      <SearchDistanceSelector
        value={searchDistance}
        onChange={handlers.handleSearchDistanceChange}
        hidden={ui.isPlanetPanelOpen}
      />

      <LocationSearchBar
        locations={derived.visibleStargazeLocations}
        events={visibleStarPartyEvents}
        placeholder={derived.searchPlaceholder}
        onSelectCoordinates={handlers.handleCoordinateSearch}
        onSelectLocation={handlers.handleStargazeSearch}
        onSelectEvent={handlers.handleStarPartySearch}
        onFocusChange={ui.setIsSearchFocused}
      />

      <MapTypeSwitcher
        mapType={mapType}
        onChange={setMapType}
        latestGridShot={state.latestGridShot}
      />
    </div>
  );
});

MapView.displayName = "MapView";

export default MapView;
