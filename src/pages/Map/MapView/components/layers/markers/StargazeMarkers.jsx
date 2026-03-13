import { Marker, Popup } from "react-leaflet";
import {
  favoritePinIconRemoving,
  favoriteSpotIcon,
  favoriteSpotIconTransition,
  stargazeIcon,
  stargazeIconRemoving,
} from "@/pages/Map/MapView/core/markerIcons";
import StargazePopupContent from "@/pages/Map/MapView/components/popups/content/StargazePopupContent";

const openMarkerDirections = (url) => {
  if (!url) return;
  window.open(url, "_blank");
};

const buildMarkerDirectionsHandler = ({
  buildDirectionsUrl,
  getDirectionsOrigin,
  target,
}) => {
  if (typeof buildDirectionsUrl !== "function") return null;
  const origin =
    typeof getDirectionsOrigin === "function" ? getDirectionsOrigin() : null;
  const directionsUrl = buildDirectionsUrl(origin, target);

  if (!directionsUrl) return null;
  return () => openMarkerDirections(directionsUrl);
};

const coordinatesMatch = (left, right, rightLngKey = "lng") => {
  if (!left || !right) return false;
  return (
    Math.abs(Number(left.lat) - Number(right.lat)) < 1e-6 &&
    Math.abs(Number(left.lng) - Number(right[rightLngKey])) < 1e-6
  );
};

const resolveFavoriteMarkerIcon = ({
  baseIcon,
  isFavorite = false,
  isEntering = false,
  isExiting = false,
  favoriteIcon,
  favoriteTransitionIcon,
  removingIcon,
}) => {
  if (isExiting && removingIcon) {
    return removingIcon;
  }

  if (!isFavorite) {
    return baseIcon;
  }

  return isEntering ? favoriteTransitionIcon : favoriteIcon;
};

export default function StargazeMarkers({
  spots,
  isAuthenticated,
  isMobileView,
  favoriteSpotKeys,
  enteringFavoriteKeySet,
  isExiting = false,
  selectedDarkSpot,
  stargazeMarkerRefs,
  mapRef,
  setActiveStargazeId,
  centerOnCoords,
  openStargazePanel,
  handleToggleStargazeFavorite,
  handleToggleStargazeTarget,
  handleShareLocation,
  buildDirectionsUrl,
  getDirectionsOrigin,
  getSpotKey,
  onOpenSpaceWeatherAt,
}) {
  if (!Array.isArray(spots)) return null;
  const directionsOrigin = getDirectionsOrigin();

  return spots.map((spot) => {
    const spotKey = getSpotKey(spot.lat, spot.lng);
    const isFavoriteSpot = favoriteSpotKeys.has(spotKey);
    const isFavoriteEntering = enteringFavoriteKeySet.has(spotKey);
    const isTarget = coordinatesMatch(selectedDarkSpot, spot);
    const handleDirections = buildMarkerDirectionsHandler({
      buildDirectionsUrl,
      getDirectionsOrigin: () => directionsOrigin,
      target: spot,
    });

    return (
      <Marker
        key={`stargaze-${spot.id}`}
        position={[spot.lat, spot.lng]}
        icon={resolveFavoriteMarkerIcon({
          baseIcon: stargazeIcon,
          isFavorite: isFavoriteSpot,
          isEntering: isFavoriteEntering,
          isExiting,
          favoriteIcon: favoriteSpotIcon,
          favoriteTransitionIcon: favoriteSpotIconTransition,
          removingIcon: isFavoriteSpot
            ? favoritePinIconRemoving
            : stargazeIconRemoving,
        })}
        ref={(marker) => {
          if (marker) {
            stargazeMarkerRefs.current.set(spot.id, marker);
          } else {
            stargazeMarkerRefs.current.delete(spot.id);
          }
        }}
        eventHandlers={{
          click: () => {
            setActiveStargazeId(spot.id);
          },
          popupopen: () => {
            setActiveStargazeId(spot.id);
            centerOnCoords(spot.lat, spot.lng);
            if (!isMobileView) {
              openStargazePanel(spot);
            }
          },
          popupclose: () => {
            setActiveStargazeId((prev) => (prev === spot.id ? null : prev));
          },
        }}
      >
        <Popup className={isExiting ? "popup-exiting" : undefined}>
          <StargazePopupContent
            spot={spot}
            isMobileView={isMobileView}
            isAuthenticated={isAuthenticated}
            isFavoriteSpot={isFavoriteSpot}
            isTarget={Boolean(isTarget)}
            onGetDirections={handleDirections}
            onOpenDetails={() => {
              openStargazePanel(spot);
              mapRef.current?.closePopup();
            }}
            onToggleFavorite={() => handleToggleStargazeFavorite(spot)}
            onToggleTarget={() => handleToggleStargazeTarget(spot)}
            onShareLocation={() =>
              handleShareLocation(
                { lat: spot.lat, lng: spot.lng },
                spot.name || "Recommended spot",
              )
            }
            onOpenSpaceWeather={() =>
              onOpenSpaceWeatherAt?.(
                { lat: spot.lat, lng: spot.lng },
                spot.name || "Recommended spot",
              )
            }
          />
        </Popup>
      </Marker>
    );
  });
}
