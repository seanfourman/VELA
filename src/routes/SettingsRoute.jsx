import { useEffect } from "react";
import SettingsPage from "@/pages/Settings/SettingsPage";
import { useAppLayoutContext } from "@/layouts/AppLayoutContext";

function SettingsRoute() {
  const {
    mapType,
    isLight,
    settings,
    handleUpdateSettings,
    handleResetSettings,
    setMapType,
    navigate,
    setIsThreeDModeActive,
  } = useAppLayoutContext();

  useEffect(() => {
    setIsThreeDModeActive(false);
  }, [setIsThreeDModeActive]);

  return (
    <SettingsPage
      mapType={mapType}
      isLight={isLight}
      settings={settings}
      onUpdateSettings={handleUpdateSettings}
      onResetSettings={handleResetSettings}
      onMapTypeChange={setMapType}
      onNavigate={navigate}
    />
  );
}

export default SettingsRoute;
