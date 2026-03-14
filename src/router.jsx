/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect } from "react";
import {
  createBrowserRouter,
  Navigate,
  useLocation as useRouterLocation,
  useNavigate as useRouterNavigate,
} from "react-router-dom";
import brokenWebLinkIcon from "@/assets/icons/broken-web-link-svgrepo-com.svg";
import PageShell from "@/components/layout/PageShell";
import AppLayout, { useAppLayoutContext } from "@/layouts/AppLayout";
import AuthPage from "@/pages/Auth/AuthPage";
import AdminPage from "@/pages/Admin/AdminPage";
import ConstellationsPage from "@/pages/Constellations/ConstellationsPage";
import DiscoveryPage from "@/pages/Discovery/DiscoveryPage";
import MapView from "@/pages/Map/MapView";
import MoonPhasePage from "@/pages/MoonPhase/MoonPhasePage";
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
  const routeLocation = useRouterLocation();
  const routerNavigate = useRouterNavigate();
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
  const mapSelection = routeLocation.state?.mapSelection ?? null;
  const handleConsumeMapSelection = useCallback(() => {
    if (!routeLocation.state?.mapSelection) return;

    const nextState = { ...(routeLocation.state || {}) };
    delete nextState.mapSelection;

    routerNavigate(
      {
        pathname: routeLocation.pathname,
        search: routeLocation.search,
        hash: routeLocation.hash,
      },
      {
        replace: true,
        state: Object.keys(nextState).length ? nextState : null,
      },
    );
  }, [
    routeLocation.hash,
    routeLocation.pathname,
    routeLocation.search,
    routeLocation.state,
    routerNavigate,
  ]);

  return (
    <MapView
      ref={mapViewRef}
      mapSelection={mapSelection}
      onConsumeMapSelection={handleConsumeMapSelection}
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
      satelliteReadableShadowsEnabled={settings.satelliteReadableShadows}
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

function DiscoveryRoute() {
  useDisableThreeDMode();
  const {
    auth,
    isLight,
    navigate,
    location,
    locationStatus,
    stargazeLocations,
    starPartyEvents,
    settings,
    handleToggleStarPartyRsvp,
  } = useAppLayoutContext();

  return (
    <DiscoveryPage
      auth={auth}
      isLight={isLight}
      onNavigate={navigate}
      location={location}
      locationStatus={locationStatus}
      stargazeLocations={stargazeLocations}
      starPartyEvents={starPartyEvents}
      directionsProvider={settings.directionsProvider}
      defaultRadiusKm={settings.searchDistance}
      onToggleStarPartyRsvp={handleToggleStarPartyRsvp}
    />
  );
}

function HardwareAccelerationUnavailableRoute({ pageName }) {
  const { isLight, navigate } = useAppLayoutContext();

  return (
    <PageShell
      title={`${pageName} unavailable`}
      subtitle="This page needs browser hardware acceleration, which appears to be disabled in your browser."
      isLight={isLight}
      onNavigate={navigate}
    >
      <section className="profile-card glass-panel glass-panel-elevated not-found-card">
        <h2 className="profile-section-title not-found-card__code">
          Hardware acceleration required
        </h2>
        <p className="profile-section-copy">
          Enable hardware acceleration in your browser settings and reload VELA to
          use this experience.
        </p>
      </section>
    </PageShell>
  );
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

function MoonPhaseRoute() {
  useDisableThreeDMode();
  const {
    hardwareAccelerationEnabled,
    isLight,
    navigate,
    location,
    locationStatus,
  } = useAppLayoutContext();

  if (!hardwareAccelerationEnabled) {
    return <HardwareAccelerationUnavailableRoute pageName="Moon Phase" />;
  }

  return (
    <MoonPhasePage
      isLight={isLight}
      onNavigate={navigate}
      location={location}
      locationStatus={locationStatus}
    />
  );
}

function SolarSystemRoute() {
  useDisableThreeDMode();
  const { hardwareAccelerationEnabled } = useAppLayoutContext();

  if (!hardwareAccelerationEnabled) {
    return <HardwareAccelerationUnavailableRoute pageName="Solar System" />;
  }

  return <SolarSystemPage />;
}

function ConstellationsRoute() {
  useDisableThreeDMode();
  const { hardwareAccelerationEnabled } = useAppLayoutContext();

  if (!hardwareAccelerationEnabled) {
    return <HardwareAccelerationUnavailableRoute pageName="Constellations" />;
  }

  return <ConstellationsPage />;
}

function NightPlannerRoute() {
  useDisableThreeDMode();
  const { hardwareAccelerationEnabled } = useAppLayoutContext();

  if (!hardwareAccelerationEnabled) {
    return <HardwareAccelerationUnavailableRoute pageName="Night Planner" />;
  }

  return <Navigate to="/moon-phase" replace />;
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
      { path: "discover", element: <DiscoveryRoute /> },
      { path: "gear-lab", element: <Navigate to="/" replace /> },
      { path: "moon-phase", element: <MoonPhaseRoute /> },
      { path: "constellations", element: <ConstellationsRoute /> },
      { path: "night-planner", element: <NightPlannerRoute /> },
      { path: "profile", element: <ProfileRoute /> },
      { path: "admin", element: <AdminRoute /> },
      { path: "settings", element: <SettingsRoute /> },
      { path: "solar-system", element: <SolarSystemRoute /> },
      { path: "*", element: <NotFoundRoute /> },
    ],
  },
]);
