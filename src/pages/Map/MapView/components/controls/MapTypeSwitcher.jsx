import { useCallback, useEffect, useRef, useState } from "react";
import { buildMapTilerRasterUrl } from "@/utils/apiEndpoints";
import "./styles/MapTypeSwitcher.css";

const OPTION_META = [
  {
    id: "light",
    label: "Light",
    preview: buildMapTilerRasterUrl("streets-v2", 0, 0, 0, "png"),
  },
  {
    id: "dark",
    label: "Dark",
    preview: buildMapTilerRasterUrl("streets-v2-dark", 0, 0, 0, "png"),
  },
  {
    id: "satellite",
    label: "Satellite",
    preview: buildMapTilerRasterUrl("hybrid", 0, 0, 0, "jpg"),
  },
];

export default function MapTypeSwitcher({
  mapType,
  onChange,
  latestGridShot,
}) {
  const [expanded, setExpanded] = useState(false);
  const options = OPTION_META;
  const current = options.find((opt) => opt.id === mapType) || options[0];
  const previewSrc = latestGridShot || current.preview;
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setExpanded(false);
      }
    };
    window.addEventListener("pointerdown", handleOutside, true);
    return () => {
      window.removeEventListener("pointerdown", handleOutside, true);
    };
  }, []);

  const toggleMenu = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleOptionChange = useCallback(
    (id) => {
      onChange(id);
      setExpanded(false);
    },
    [onChange]
  );

  return (
    <div
      ref={containerRef}
      className={`map-type-switcher ${expanded ? "expanded" : ""}`}
    >
      <span className="map-type-tooltip-anchor map-type-tooltip-anchor--current">
        <button
          className="map-type-btn map-type-current"
          aria-label={`${current.label} map`}
          onClick={(event) => {
            toggleMenu();
            event.currentTarget.blur();
          }}
        >
          <div
            key={previewSrc}
            className="map-type-fill fresh"
            style={{
              backgroundImage: `url('${previewSrc}')`,
            }}
          />
          <div className="map-type-overlay" />
          <span className="map-type-label">{current.label}</span>
        </button>
        <span className="map-type-tooltip-label" aria-hidden="true">
          Switch map type
        </span>
      </span>

      <div
        className="map-type-options"
      >
        {options.map((opt) => (
          <span
            key={opt.id}
            className="map-type-tooltip-anchor map-type-tooltip-anchor--option"
          >
            <button
              className={`map-type-btn map-type-option ${
                opt.id === mapType ? "active" : ""
              }`}
              onClick={(event) => {
                handleOptionChange(opt.id);
                event.currentTarget.blur();
              }}
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
            <span className="map-type-tooltip-label" aria-hidden="true">
              {opt.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
