import { useEffect } from "react";
import AdminPage from "@/pages/Admin/AdminPage";
import { useAppLayoutContext } from "@/layouts/AppLayoutContext";

function AdminRoute() {
  const {
    auth,
    isAdmin,
    isLight,
    navigate,
    stargazeLocations,
    starPartyEvents,
    handleSaveStargazeLocation,
    handleDeleteStargazeLocation,
    handleSaveStarPartyEvent,
    handleDeleteStarPartyEvent,
    handleSetStarPartyEventStatus,
    setIsThreeDModeActive,
  } = useAppLayoutContext();

  useEffect(() => {
    setIsThreeDModeActive(false);
  }, [setIsThreeDModeActive]);

  return (
    <AdminPage
      auth={auth}
      isAdmin={isAdmin}
      isLight={isLight}
      stargazeLocations={stargazeLocations}
      starPartyEvents={starPartyEvents}
      onSaveStargazeLocation={handleSaveStargazeLocation}
      onDeleteStargazeLocation={handleDeleteStargazeLocation}
      onSaveStarPartyEvent={handleSaveStarPartyEvent}
      onDeleteStarPartyEvent={handleDeleteStarPartyEvent}
      onSetStarPartyEventStatus={handleSetStarPartyEventStatus}
      onNavigate={navigate}
    />
  );
}

export default AdminRoute;
