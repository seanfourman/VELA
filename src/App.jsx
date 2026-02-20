import { Suspense, lazy } from "react";
import Navbar from "./components/Navbar";
import MapView from "./pages/Map/MapView";
import PopupPortal from "./components/PopupPortal";
import useAppState from "./features/app/useAppState";
import "./App.css";

const AuthPage = lazy(() => import("./pages/Auth/AuthPage"));
const ProfilePage = lazy(() => import("./pages/Profile/ProfilePage"));
const AdminPage = lazy(() => import("./pages/Admin/AdminPage"));
const SettingsPage = lazy(() => import("./pages/Settings/SettingsPage"));

function App() {
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
          onSaveStargazeLocation={handleSaveStargazeLocation}
          onDeleteStargazeLocation={handleDeleteStargazeLocation}
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
          location={location}
          locationStatus={locationStatus}
          mapType={mapType}
          setMapType={setMapType}
          isAuthenticated={mapIsAuthenticated}
          stargazeLocations={stargazeLocations}
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
        />
      );
  }

  return (
    <div className="app">
      <Navbar
        mapType={mapType}
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
