import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import markerIcon from "../../../assets/icons/marker-icon.svg";
import mapLocationIcon from "../../../assets/icons/map-location-icon.svg";
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

const formatCoords = (lat, lng) => `${lat.toFixed(2)}, ${lng.toFixed(2)}`;

export default function LocationSearchBar({
  locations = [],
  onSelectCoordinates,
  onSelectLocation,
  onFocusChange,
  placeholder = "Search coordinates or best stargazing spots",
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

  const buildResults = useCallback(
    (rawQuery) => {
      const trimmed = String(rawQuery || "").trim();
      if (!trimmed) return [];
      const coords = parseCoordinates(trimmed);
      const lowered = trimmed.toLowerCase();
      const matches = locations.filter((location) =>
        String(location?.name || "")
          .toLowerCase()
          .includes(lowered)
      );
      const items = [];
      if (coords) {
        items.push({
          type: "coords",
          id: `coords-${coords.lat}-${coords.lng}`,
          coords,
        });
      }
      matches.forEach((location) => {
        items.push({
          type: "location",
          id: `location-${location.id}`,
          location,
        });
      });
      return items;
    },
    [locations]
  );

  const trimmedQuery = debouncedQuery.trim();
  const results = useMemo(
    () => buildResults(trimmedQuery),
    [buildResults, trimmedQuery]
  );
  const hasQuery = Boolean(trimmedQuery);
  const isResultsOpen = listOpen && hasQuery;

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

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const rawQuery = query.trim();
    if (!rawQuery) return;
    const immediateResults = buildResults(rawQuery);
    if (immediateResults.length === 1) {
      const result = immediateResults[0];
      if (result.type === "coords") {
        handleSelectCoordinates(result.coords);
      } else {
        handleSelectLocation(result.location);
      }
      return;
    }
    setDebouncedQuery(rawQuery);
    setListOpen(true);
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
        <div className="location-search__panel glass-panel">
          <div className="location-search__bar">
            <input
              className="location-search__input"
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                onFocusChange?.(true);
                if (debouncedQuery) {
                  setListOpen(true);
                }
              }}
              onBlur={() => {
                onFocusChange?.(false);
              }}
            />
          </div>

          <div
            className={`location-search__results${
              isResultsOpen ? " open" : ""
            }`}
            aria-hidden={!isResultsOpen}
          >
            {hasQuery ? (
              results.length > 0 ? (
                results.map((result) => {
                  if (result.type === "coords") {
                    const coordsLabel = formatCoords(
                      result.coords.lat,
                      result.coords.lng
                    );
                    return (
                      <button
                        key={result.id}
                        type="button"
                        className="location-search__item location-search__item--coords"
                        onClick={() =>
                          handleSelectCoordinates(result.coords)
                        }
                      >
                        <span className="location-search__item-icon">
                          <img src={markerIcon} alt="" aria-hidden="true" />
                        </span>
                        <span className="location-search__details">
                          <span className="location-search__name">
                            Go to coordinates
                          </span>
                          <span className="location-search__meta">
                            Coordinates
                          </span>
                        </span>
                        <span className="location-search__coords">
                          {coordsLabel}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={result.id}
                      type="button"
                      className="location-search__item location-search__item--location"
                      onClick={() => handleSelectLocation(result.location)}
                    >
                      <span className="location-search__item-icon">
                        <img src={mapLocationIcon} alt="" aria-hidden="true" />
                      </span>
                      <span className="location-search__details">
                        <span className="location-search__name">
                          {result.location.name || "Untitled"}
                        </span>
                        <span className="location-search__meta">
                          Stargazing spot
                        </span>
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
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
