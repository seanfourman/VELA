import { useEffect, useState } from "react";
import { loadFavoriteSpots } from "@/features/map/favoritesStorage";
import { fetchDarkSpots } from "@/utils/darkSpots";
import { getCoordinateKey } from "@/utils/geo";
import { fetchSkyQualityMetrics } from "@/utils/skyQuality";

export default function useDiscoveryData({
  isAuthenticated,
  hasLocation,
  location,
  radiusKm,
}) {
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");
  const [darkSpots, setDarkSpots] = useState([]);
  const [darkSpotsLoading, setDarkSpotsLoading] = useState(false);
  const [darkSpotsError, setDarkSpotsError] = useState("");
  const [skyQuality, setSkyQuality] = useState(null);
  const [skyQualityLoading, setSkyQualityLoading] = useState(false);
  const [skyQualityError, setSkyQualityError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      return undefined;
    }

    const loadFavorites = async () => {
      setFavoritesLoading(true);
      try {
        const items = await loadFavoriteSpots(getCoordinateKey);
        if (cancelled) return;
        setFavoriteSpots(items);
        setFavoritesError("");
      } catch (error) {
        if (cancelled) return;
        setFavoritesError(
          error instanceof Error ? error.message : "Could not load favorites",
        );
      } finally {
        if (!cancelled) {
          setFavoritesLoading(false);
        }
      }
    };

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    if (!hasLocation) {
      return undefined;
    }

    const loadDarkSpots = async () => {
      setDarkSpotsLoading(true);
      setDarkSpotsError("");
      try {
        const items = await fetchDarkSpots(
          location.lat,
          location.lng,
          Math.min(radiusKm, 250),
        );
        if (cancelled) return;
        setDarkSpots(Array.isArray(items) ? items : []);
      } catch (error) {
        if (cancelled) return;
        setDarkSpots([]);
        setDarkSpotsError(
          error instanceof Error ? error.message : "Could not load dark spots",
        );
      } finally {
        if (!cancelled) {
          setDarkSpotsLoading(false);
        }
      }
    };

    const loadSkyQuality = async () => {
      setSkyQualityLoading(true);
      setSkyQualityError("");
      try {
        const metrics = await fetchSkyQualityMetrics(location.lat, location.lng);
        if (cancelled) return;
        setSkyQuality(metrics);
      } catch (error) {
        if (cancelled) return;
        setSkyQualityError(
          error instanceof Error ? error.message : "Could not load sky quality",
        );
      } finally {
        if (!cancelled) {
          setSkyQualityLoading(false);
        }
      }
    };

    loadDarkSpots();
    loadSkyQuality();

    return () => {
      cancelled = true;
    };
  }, [hasLocation, location?.lat, location?.lng, radiusKm]);

  return {
    favoriteSpots: isAuthenticated ? favoriteSpots : [],
    favoritesLoading: isAuthenticated ? favoritesLoading : false,
    favoritesError: isAuthenticated ? favoritesError : "",
    darkSpots: hasLocation ? darkSpots : [],
    darkSpotsLoading: hasLocation ? darkSpotsLoading : false,
    darkSpotsError: hasLocation ? darkSpotsError : "",
    skyQuality: hasLocation ? skyQuality : null,
    skyQualityLoading: hasLocation ? skyQualityLoading : false,
    skyQualityError: hasLocation ? skyQualityError : "",
  };
}
