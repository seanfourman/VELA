import { Marker, Popup } from "react-leaflet";
import { customIcon } from "@/pages/Map/MapView/core/markerIcons";
import LocationPopupContent from "@/pages/Map/MapView/components/popups/content/LocationPopupContent";

export default function LocationMarker({
  location,
  centerOnCoords,
  onOpenSpaceWeatherAt,
}) {
  if (!location) return null;

  return (
    <Marker
      position={[location.lat, location.lng]}
      icon={customIcon}
      eventHandlers={{
        popupopen: () => centerOnCoords(location.lat, location.lng),
      }}
    >
      <Popup>
        <LocationPopupContent
          location={location}
          onOpenSpaceWeather={() =>
            onOpenSpaceWeatherAt?.(
              { lat: location?.lat, lng: location?.lng },
              "Your location",
            )
          }
        />
      </Popup>
    </Marker>
  );
}
