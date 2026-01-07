import { useEffect, useState } from "react";

const useMapViewUiState = () => {
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 768px)")?.matches ?? false;
  });
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isPlanetPanelOpen, setIsPlanetPanelOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => {
      setIsMobileView(event.matches);
    };

    handleChange(media);
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  return {
    isMobileView,
    isPopupOpen,
    isSearchFocused,
    isPlanetPanelOpen,
    setIsPopupOpen,
    setIsSearchFocused,
    setIsPlanetPanelOpen,
  };
};

export default useMapViewUiState;
