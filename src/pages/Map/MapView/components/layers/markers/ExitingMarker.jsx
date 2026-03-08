import { Marker } from "react-leaflet";
import { favoritePinIconRemoving, pinIconRemoving } from "@/pages/Map/MapView/mapIcons";

export default function ExitingMarker({ exitingMarker }) {
  if (!exitingMarker) return null;

  return (
    <Marker
      key={`removing-${
        exitingMarker.id || `${exitingMarker.lat}-${exitingMarker.lng}`
      }`}
      position={[exitingMarker.lat, exitingMarker.lng]}
      icon={
        exitingMarker.isFavorite ? favoritePinIconRemoving : pinIconRemoving
      }
      interactive={false}
    />
  );
}
