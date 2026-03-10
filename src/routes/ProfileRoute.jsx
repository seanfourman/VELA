import { useEffect } from "react";
import ProfilePage from "@/pages/Profile/ProfilePage";
import { useAppLayoutContext } from "@/layouts/AppLayoutContext";

function ProfileRoute() {
  const {
    auth,
    profileSettings,
    isAdmin,
    isLight,
    navigate,
    handleSaveProfile,
    handleResetProfile,
    setIsThreeDModeActive,
  } = useAppLayoutContext();

  useEffect(() => {
    setIsThreeDModeActive(false);
  }, [setIsThreeDModeActive]);

  return (
    <ProfilePage
      auth={auth}
      profile={profileSettings}
      isAdmin={isAdmin}
      isLight={isLight}
      onSave={handleSaveProfile}
      onReset={handleResetProfile}
      onNavigate={navigate}
    />
  );
}

export default ProfileRoute;
