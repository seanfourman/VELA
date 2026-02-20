import { useEffect, useRef } from "react";

const FAVORITE_TRANSITION_MS = 360;

const useMapFavoriteTransition = ({ placedMarker, placedMarkerRef }) => {
  const transitionTimeoutRef = useRef(null);
  const prevPlacedFavoriteRef = useRef(false);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const isFavorite = Boolean(placedMarker?.isFavorite);
    const hadFavorite = prevPlacedFavoriteRef.current;

    if (!placedMarker) {
      prevPlacedFavoriteRef.current = false;
      return;
    }

    if (isFavorite && !hadFavorite) {
      const marker = placedMarkerRef.current;
      const element = marker?.getElement?.();
      if (element) {
        element.classList.remove("favorite-transition");
        void element.offsetWidth;
        element.classList.add("favorite-transition");
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => {
          element.classList.remove("favorite-transition");
        }, FAVORITE_TRANSITION_MS);
      }
    }

    prevPlacedFavoriteRef.current = isFavorite;
  }, [placedMarker, placedMarkerRef]);
};

export default useMapFavoriteTransition;
