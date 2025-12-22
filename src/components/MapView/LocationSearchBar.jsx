import { useEffect, useMemo, useRef, useState } from "react";
import showPopup from "../../utils/popup";
import searchIcon from "../../assets/icons/search-icon.svg";
import "./LocationSearchBar.css";

const parseCoordinates = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
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

  const trimmedQuery = query.trim();
  const coordinateMatch = useMemo(() => parseCoordinates(query), [query]);
  const nameMatches = useMemo(() => {
    const trimmed = trimmedQuery.toLowerCase();
    if (!trimmed) return [];
    return locations.filter((location) =>
      String(location?.name || "")
        .toLowerCase()
        .includes(trimmed)
    );
  }, [locations, trimmedQuery]);

  const results = useMemo(() => {
    if (!trimmedQuery) return [];
    const items = [];
    if (coordinateMatch) {
      items.push({
        type: "coords",
        id: `coords-${coordinateMatch.lat}-${coordinateMatch.lng}`,
        coords: coordinateMatch,
      });
    }
    nameMatches.forEach((location) => {
      items.push({
        type: "location",
        id: `location-${location.id}`,
        location,
      });
    });
    return items;
  }, [coordinateMatch, nameMatches, trimmedQuery]);

  const handleOpenResults = () => {
    if (!trimmedQuery) {
      setListOpen(false);
      return;
    }
    if (results.length === 0) {
      showPopup("No matching locations found.", "failure", { duration: 2600 });
      setListOpen(false);
      return;
    }
    setListOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleOpenResults();
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    if (!value.trim()) {
      setListOpen(false);
      return;
    }
    setListOpen(true);
  };

  const handleSelectLocation = (location) => {
    onSelectLocation?.(location);
    setQuery(location?.name || "");
    setListOpen(false);
  };

  const handleSelectCoordinates = (coords) => {
    onSelectCoordinates?.(coords);
    setQuery(formatCoords(coords.lat, coords.lng));
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
          <input
            className="location-search__input"
            type="text"
            placeholder="Search coordinates or best stargazing spots"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (trimmedQuery && results.length > 0) {
                setListOpen(true);
              }
            }}
          />
          <button
            type="submit"
            className="location-search__submit"
            aria-label="Search"
          >
            <img src={searchIcon} alt="" aria-hidden="true" />
          </button>
        </div>
      </form>

      {listOpen && results.length > 0 && (
        <div className="location-search__results glass-panel">
          {results.map((result) => {
            if (result.type === "coords") {
              return (
                <button
                  key={result.id}
                  type="button"
                  className="location-search__item location-search__item--coords"
                  onClick={() => handleSelectCoordinates(result.coords)}
                >
                  <span className="location-search__name">
                    Coordinates found
                  </span>
                  <span className="location-search__coords">
                    {formatCoords(result.coords.lat, result.coords.lng)}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={result.id}
                type="button"
                className="location-search__item"
                onClick={() => handleSelectLocation(result.location)}
              >
                <span className="location-search__name">
                  {result.location.name || "Untitled"}
                </span>
                <span className="location-search__coords">
                  {formatCoords(result.location.lat, result.location.lng)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
