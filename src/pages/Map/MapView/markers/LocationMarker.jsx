import { Marker, Popup } from "react-leaflet";
import { customIcon } from "../mapIcons";
import { LocationPopupContent } from "../MapPopups";

export default function LocationMarker({ location, centerOnCoords }) {
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
        <LocationPopupContent location={location} />
      </Popup>
    </Marker>
  );
}
