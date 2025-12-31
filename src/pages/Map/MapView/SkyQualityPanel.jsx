import SkyQualityInfo from "./SkyQualityInfo";
import "./SkyQualityPanel.css";

export default function SkyQualityPanel({ coords }) {
  if (!coords) return null;

  return (
    <div className="sky-quality-panel">
      <SkyQualityInfo lat={coords.lat} lng={coords.lng} />
    </div>
  );
}

