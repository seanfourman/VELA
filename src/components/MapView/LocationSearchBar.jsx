import { useEffect, useMemo, useRef, useState } from "react";
import "./LocationSearchBar.css";

const SEARCH_DEBOUNCE_MS = 250;

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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const containerRef = useRef(null);
  const suppressAutoOpenRef = useRef(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query]);

  const trimmedQuery = debouncedQuery;
  const coordinateMatch = useMemo(
    () => parseCoordinates(debouncedQuery),
    [debouncedQuery]
  );
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

  useEffect(() => {
    if (!debouncedQuery) {
      setListOpen(false);
      return;
    }
    if (suppressAutoOpenRef.current) {
      suppressAutoOpenRef.current = false;
      return;
    }
    setListOpen(true);
  }, [debouncedQuery, results.length]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    suppressAutoOpenRef.current = false;
    setListOpen(false);
  };

  const handleSelectLocation = (location) => {
    suppressAutoOpenRef.current = true;
    onSelectLocation?.(location);
    setQuery(location?.name || "");
    setListOpen(false);
  };

  const handleSelectCoordinates = (coords) => {
    suppressAutoOpenRef.current = true;
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
      <div className="location-search__form">
        <div className="location-search__bar glass-panel">
          <input
            className="location-search__input"
            type="text"
            placeholder="Search coordinates or best stargazing spots"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (debouncedQuery) {
                setListOpen(true);
              }
            }}
          />
        </div>
      </div>

      {listOpen && trimmedQuery && (
        <div className="location-search__results glass-panel">
          {results.length > 0 ? (
            results.map((result) => {
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
                    {formatCoords(
                      result.location.lat,
                      result.location.lng
                    )}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="location-search__empty">
              No results for "{trimmedQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
