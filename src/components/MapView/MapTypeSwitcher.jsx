import { useCallback, useEffect, useMemo, useState } from "react";
import "./MapTypeSwitcher.css";

const OPTION_META = (previewKey) => [
  {
    id: "dark",
    label: "Dark",
    preview: `https://api.maptiler.com/maps/streets-v2-dark/0/0/0.png?key=${previewKey}`,
  },
  {
    id: "light",
    label: "Light",
    preview: `https://api.maptiler.com/maps/streets-v2/0/0/0.png?key=${previewKey}`,
  },
  {
    id: "satellite",
    label: "Satellite",
    preview: `https://api.maptiler.com/maps/hybrid/0/0/0.jpg?key=${previewKey}`,
  },
];

export default function MapTypeSwitcher({
  mapType,
  onChange,
  previewKey,
  latestGridShot,
}) {
  const [expanded, setExpanded] = useState(false);
  const options = OPTION_META(previewKey);
  const current = options.find((opt) => opt.id === mapType) || options[0];
  const [previewSrc, setPreviewSrc] = useState(current.preview);
  const [previewVersion, setPreviewVersion] = useState(0);

  useEffect(() => {
    setPreviewSrc(current.preview);
  }, [current.preview]);

  useEffect(() => {
    if (!latestGridShot) return;
    setPreviewSrc(latestGridShot);
    setPreviewVersion((v) => v + 1);
  }, [latestGridShot]);

  const handleOptionChange = useCallback(
    (id) => {
      onChange(id);
      setExpanded(false);
    },
    [onChange]
  );

  const handleBlur = useCallback((event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setExpanded(false);
    }
  }, []);

  return (
    <div
      className={`map-type-switcher ${expanded ? "expanded" : ""}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={handleBlur}
    >
      <button
        className="map-type-btn map-type-current"
        title={`${current.label} map`}
        aria-label={`${current.label} map`}
        onClick={() => handleOptionChange(current.id)}
      >
        <div
          key={previewVersion}
          className="map-type-fill fresh"
          style={{
            backgroundImage: `url('${previewSrc}')`,
          }}
        />
        <div className="map-type-overlay" />
        <span className="map-type-label">{current.label}</span>
      </button>

      <div className="map-type-options">
        {options.map((opt) => (
          <button
            key={opt.id}
            className={`map-type-btn map-type-option ${
              opt.id === mapType ? "active" : ""
            }`}
            onClick={() => handleOptionChange(opt.id)}
            title={`${opt.label} map`}
            aria-label={`${opt.label} map`}
          >
            <div
              className="map-type-fill"
              style={{
                backgroundImage: `url('${opt.preview}')`,
              }}
            />
            <div className="map-type-overlay" />
            <span className="map-type-label">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
