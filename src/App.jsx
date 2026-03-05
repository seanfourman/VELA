import { Suspense, lazy, useState } from "react";
import Navbar from "./components/Navbar";
import MapView from "./pages/Map/MapView";
import PopupPortal from "./components/PopupPortal";
import useAppState from "@/features/app/useAppState";
import "./App.css";

const AuthPage = lazy(() => import("./pages/Auth/AuthPage"));
const ProfilePage = lazy(() => import("./pages/Profile/ProfilePage"));
const AdminPage = lazy(() => import("./pages/Admin/AdminPage"));
const SettingsPage = lazy(() => import("./pages/Settings/SettingsPage"));

function App() {
  const [isThreeDModeActive, setIsThreeDModeActive] = useState(false);
  const {
    auth,
    mapViewRef,
    location,
    locationStatus,
    mapType,
    setMapType,
    settings,
    profileSettings,
    stargazeLocations,
    starPartyEvents,
    currentRoute,
    isAdmin,
    isLight,
    mapIsAuthenticated,
    navigate,
    handleSaveProfile,
    handleResetProfile,
    handleUpdateSettings,
    handleResetSettings,
    handleSaveStargazeLocation,
    handleDeleteStargazeLocation,
    handleSaveStarPartyEvent,
    handleDeleteStarPartyEvent,
    handleSetStarPartyEventStatus,
    handleToggleStarPartyRsvp,
  } = useAppState();

  let currentPage;
  switch (currentRoute) {
    case "/auth":
      currentPage = (
        <AuthPage auth={auth} isLight={isLight} onNavigate={navigate} />
      );
      break;
    case "/profile":
      currentPage = (
        <ProfilePage
          auth={auth}
          profile={profileSettings}
          isAdmin={isAdmin}
          isLight={isLight}
          mapType={mapType}
          onSave={handleSaveProfile}
          onReset={handleResetProfile}
          onNavigate={navigate}
        />
      );
      break;
    case "/admin":
      currentPage = (
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
      break;
    case "/settings":
      currentPage = (
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
      break;
    default:
      currentPage = (
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

  return (
    <div className="app">
      <Navbar
        mapType={mapType}
        forceLight={currentRoute === "/" && isThreeDModeActive}
        auth={auth}
        profile={profileSettings}
        isAdmin={isAdmin}
        onNavigate={navigate}
        currentRoute={currentRoute}
      />
      <Suspense fallback={null}>{currentPage}</Suspense>
      <PopupPortal />
    </div>
  );
}

export default App;
