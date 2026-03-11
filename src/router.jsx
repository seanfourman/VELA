/* eslint-disable react-refresh/only-export-components */
import { useEffect } from "react";
import { createBrowserRouter } from "react-router-dom";
import brokenWebLinkIcon from "@/assets/icons/broken-web-link-svgrepo-com.svg";
import PageShell from "@/components/layout/PageShell";
import AppLayout, { useAppLayoutContext } from "@/layouts/AppLayout";
import AuthPage from "@/pages/Auth/AuthPage";
import AdminPage from "@/pages/Admin/AdminPage";
import MapView from "@/pages/Map/MapView";
import ProfilePage from "@/pages/Profile/ProfilePage";
import SettingsPage from "@/pages/Settings/SettingsPage";
import SolarSystemPage from "@/pages/SolarSystem/SolarSystemPage";

const useDisableThreeDMode = () => {
  const { setIsThreeDModeActive } = useAppLayoutContext();

  useEffect(() => {
    setIsThreeDModeActive(false);
  }, [setIsThreeDModeActive]);
};

function MapRoute() {
  const {
    mapViewRef,
    location,
    locationStatus,
    mapType,
    setMapType,
    mapIsAuthenticated,
    auth,
    stargazeLocations,
    starPartyEvents,
    settings,
    handleUpdateSettings,
    handleToggleStarPartyRsvp,
    setIsThreeDModeActive,
  } = useAppLayoutContext();

  return (
    <MapView
      ref={mapViewRef}
      onThreeDModeChange={setIsThreeDModeActive}
      location={location}
      locationStatus={locationStatus}
      mapType={mapType}
      setMapType={setMapType}
      isAuthenticated={mapIsAuthenticated}
      authUser={auth?.user}
      stargazeLocations={stargazeLocations}
      starPartyEvents={starPartyEvents}
      directionsProvider={settings.directionsProvider}
      showRecommendedSpots={settings.showRecommendedSpots}
      lightOverlayEnabled={settings.lightOverlayEnabled}
      onToggleLightOverlay={(next) =>
        handleUpdateSettings({ lightOverlayEnabled: next })
      }
      searchDistance={settings.searchDistance}
      onSearchDistanceChange={(next) =>
        handleUpdateSettings({ searchDistance: next })
      }
      autoCenterOnLocate={settings.autoCenterOnLocate}
      onToggleStarPartyRsvp={handleToggleStarPartyRsvp}
    />
  );
}

function AuthRoute() {
  useDisableThreeDMode();
  const { auth, isLight, navigate } = useAppLayoutContext();

  return <AuthPage auth={auth} isLight={isLight} onNavigate={navigate} />;
}

function ProfileRoute() {
  useDisableThreeDMode();
  const {
    auth,
    profileSettings,
    isAdmin,
    isLight,
    navigate,
    handleSaveProfile,
    handleResetProfile,
  } = useAppLayoutContext();

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

function SettingsRoute() {
  useDisableThreeDMode();
  const {
    mapType,
    isLight,
    settings,
    handleUpdateSettings,
    handleResetSettings,
    setMapType,
    navigate,
  } = useAppLayoutContext();

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

function AdminRoute() {
  useDisableThreeDMode();
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
  } = useAppLayoutContext();

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

function SolarSystemRoute() {
  useDisableThreeDMode();
  const { isLight, navigate } = useAppLayoutContext();

  return <SolarSystemPage isLight={isLight} onNavigate={navigate} />;
}

function NotFoundRoute() {
  const { isLight, navigate } = useAppLayoutContext();

  return (
    <PageShell
      title="Page not found"
      subtitle="The page you requested does not exist."
      isLight={isLight}
      onNavigate={navigate}
    >
      <section className="profile-card glass-panel glass-panel-elevated not-found-card">
        <img
          src={brokenWebLinkIcon}
          alt=""
          aria-hidden="true"
          className="not-found-card__icon"
        />
        <h2 className="profile-section-title not-found-card__code">404</h2>
        <p className="profile-section-copy">Check the URL and try again</p>
      </section>
    </PageShell>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <MapRoute /> },
      { path: "auth", element: <AuthRoute /> },
      { path: "profile", element: <ProfileRoute /> },
      { path: "admin", element: <AdminRoute /> },
      { path: "settings", element: <SettingsRoute /> },
      { path: "solar-system", element: <SolarSystemRoute /> },
      { path: "*", element: <NotFoundRoute /> },
    ],
  },
]);
