import { useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import MoonGlobe from "../../components/planets/MoonGlobe";
import showPopup from "../../utils/popup";
import {
  deleteRecommendation,
  saveRecommendation,
} from "../../utils/recommendationsApi";
import { isProbablyHardwareAccelerated } from "../../utils/hardwareUtils";
import AdminAccessNotice from "./AdminAccessNotice";
import AdminLocationForm from "./AdminLocationForm";
import AdminLocationList from "./AdminLocationList";
import { EMPTY_LOCATION } from "./adminConstants";
import { buildLocationFromDraft, buildLocationId } from "./adminUtils";

function buildApiLocation(location, id) {
  return {
    id,
    name: location.name,
    lat: location.lat,
    lng: location.lng,
    description: location.description,
    country: location.country,
    region: location.region,
    type: location.type,
    best_time: location.bestTime,
    photo_urls: location.photoUrls,
    source_urls: location.sourceUrls,
  };
}

function AdminPage({
  auth,
  isAdmin,
  isLight,
  onNavigate,
  stargazeLocations,
  onSaveStargazeLocation,
  onDeleteStargazeLocation,
}) {
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const isLocalOnlyMode =
    String(import.meta.env.VITE_LOCAL_ONLY ?? "true").toLowerCase() !== "false";
  const canUseAdminTools = isLocalOnlyMode || isAuthenticated;
  const hasAdminAccess = isLocalOnlyMode || Boolean(isAdmin);
  const [draft, setDraft] = useState(EMPTY_LOCATION);
  const showPlanet = useMemo(() => isProbablyHardwareAccelerated(), []);
  const locationList = useMemo(() => {
    if (!Array.isArray(stargazeLocations)) return [];
    return [...stargazeLocations].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""),
    ));
  }, [stargazeLocations]);

  const handleBackToMap = () => {
    if (onNavigate) {
      onNavigate("/");
      return;
    }
    window.location.assign("/");
  };

  const handleFieldChange = (key) => (event) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => setDraft(EMPTY_LOCATION);

  const handleDeleteLocation = async (location) => {
    const locationId = location?.id;
    if (!locationId) return;

    try {
      await deleteRecommendation({
        spotId: locationId,
        idToken: auth?.session?.id_token,
      });
      onDeleteStargazeLocation?.(locationId);
      showPopup("Location removed.", "info", { duration: 2200 });
    } catch (error) {
      showPopup(
        error instanceof Error
          ? error.message
          : "Could not delete this location right now.",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const location = buildLocationFromDraft(draft);

    if (!location.name) {
      showPopup("Name is required.", "failure", { duration: 2400 });
      return;
    }
    if (!Number.isFinite(location.lat) || location.lat < -90 || location.lat > 90) {
      showPopup("Latitude must be between -90 and 90.", "failure", {
        duration: 2800,
      });
      return;
    }
    if (
      !Number.isFinite(location.lng) ||
      location.lng < -180 ||
      location.lng > 180
    ) {
      showPopup("Longitude must be between -180 and 180.", "failure", {
        duration: 2800,
      });
      return;
    }

    const resolvedId =
      String(draft.id || "").trim() ||
      buildLocationId({
        name: location.name,
        country: location.country,
        region: location.region,
      });
    const apiLocation = buildApiLocation(location, resolvedId);

    try {
      await saveRecommendation({
        idToken: auth?.session?.id_token,
        location: apiLocation,
      });
      onSaveStargazeLocation?.(apiLocation);
      showPopup("Location added.", "success", { duration: 2400 });
      resetForm();
    } catch (error) {
      showPopup(
        error instanceof Error
          ? error.message
          : "Could not save this location right now.",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const hero = showPlanet ? (
    <MoonGlobe
      variant={isLight ? "day" : "night"}
      className="profile-page__earth-canvas"
    />
  ) : null;

  return (
    <PageShell
      title="Admin"
      subtitle="Access tools and manage system settings."
      isLight={isLight}
      className="admin-page"
      onBack={handleBackToMap}
      hero={hero}
    >
      {!canUseAdminTools ? (
        <AdminAccessNotice
          title="Sign in required"
          message="Sign in with an admin account to access this area."
          buttonLabel="Sign In"
          onAction={() => auth?.signIn?.()}
        />
      ) : !hasAdminAccess ? (
        <AdminAccessNotice
          title="Access restricted"
          message="You are signed in, but this account does not have admin access."
          buttonLabel="Return to map"
          onAction={handleBackToMap}
        />
      ) : (
        <section className="profile-card glass-panel glass-panel-elevated">
          <h2 className="profile-section-title">Stargazing locations</h2>
          <p className="profile-section-copy">
            Curate the best stargazing spots shown in the map search and on the
            map itself.
          </p>

          <AdminLocationForm
            draft={draft}
            onFieldChange={handleFieldChange}
            onReset={resetForm}
            onSubmit={handleSubmit}
          />

          <AdminLocationList
            locations={locationList}
            onDeleteLocation={handleDeleteLocation}
          />
        </section>
      )}
    </PageShell>
  );
}

export default AdminPage;
