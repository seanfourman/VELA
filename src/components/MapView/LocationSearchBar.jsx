import { useEffect, useMemo, useRef, useState } from "react";
import showPopup from "../../utils/popup";
import "./LocationSearchBar.css";

const parseCoordinates = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/
  );
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

const formatCoords = (lat, lng) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

export default function LocationSearchBar({
  locations = [],
  onSelectCoordinates,
  onSelectLocation,
}) {
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const containerRef = useRef(null);

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return locations
      .filter((location) =>
        String(location?.name || "")
          .toLowerCase()
          .includes(trimmed)
      )
      .slice(0, 6);
  }, [locations, query]);

  const visibleList = useMemo(() => {
    if (!listOpen) return [];
    if (query.trim()) return matches;
    return locations.slice(0, 6);
  }, [listOpen, matches, locations, query]);

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setListOpen((prev) => !prev);
      return;
    }

    const coords = parseCoordinates(trimmed);
    if (coords) {
      onSelectCoordinates?.(coords);
      setListOpen(false);
      return;
    }

    if (matches.length > 0) {
      onSelectLocation?.(matches[0]);
      setListOpen(false);
      return;
    }

    showPopup(
      "Enter coordinates like \"34.05, -118.25\" or pick a listed spot.",
      "info",
      { duration: 3200 }
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSearch();
  };

  const handleSelectLocation = (location) => {
    onSelectLocation?.(location);
    setQuery(location?.name || "");
    setListOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) {
        setListOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className="location-search" ref={containerRef}>
      <form className="location-search__form" onSubmit={handleSubmit}>
        <div className="location-search__bar glass-panel">
          <div className="location-search__icon" aria-hidden="true">
            +
          </div>
          <input
            className="location-search__input"
            type="text"
            placeholder="Search coordinates or best stargazing spots"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setListOpen(true)}
          />
          <button
            type="button"
            className="location-search__toggle"
            onClick={() => setListOpen((prev) => !prev)}
          >
            Best spots
          </button>
          <button type="submit" className="location-search__submit">
            Go
          </button>
        </div>
      </form>

      {listOpen && visibleList.length > 0 && (
        <div className="location-search__results glass-panel">
          {visibleList.map((location) => (
            <button
              key={location.id}
              type="button"
              className="location-search__item"
              onClick={() => handleSelectLocation(location)}
            >
              <span className="location-search__name">
                {location.name || "Untitled"}
              </span>
              <span className="location-search__coords">
                {formatCoords(location.lat, location.lng)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
