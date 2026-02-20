import { useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import MoonGlobe from "../../components/planets/MoonGlobe";
import showPopup from "../../utils/popup";
import {
  deleteRecommendation,
  saveRecommendation,
} from "../../utils/recommendationsApi";
import { isProbablyHardwareAccelerated } from "../../utils/hardwareUtils";

const EMPTY_LOCATION = {
  id: "",
  name: "",
  country: "",
  region: "",
  type: "",
  bestTime: "",
  lat: "",
  lng: "",
  description: "",
  photoUrls: "",
  sourceUrls: "",
};

const parseImageList = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildLocationId = ({ name, country, region }) => {
  const base = [name, country || region].filter(Boolean).join(" ");
  const slug = slugify(base);
  return slug || `spot_${Date.now()}`;
};

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
    String(import.meta.env.VITE_LOCAL_ONLY ?? "true").toLowerCase() !==
    "false";
  const hasAdminAccess = isLocalOnlyMode || Boolean(isAdmin);
  const canUseAdminTools = isLocalOnlyMode || isAuthenticated;
  const [draft, setDraft] = useState(EMPTY_LOCATION);
  const [editingId, setEditingId] = useState(null);
  const showPlanet = useMemo(() => isProbablyHardwareAccelerated(), []);
  const moonVariant = isLight ? "day" : "night";
  const locationList = useMemo(() => {
    if (!Array.isArray(stargazeLocations)) return [];
    return [...stargazeLocations].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""))
    );
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

  const resetForm = () => {
    setDraft(EMPTY_LOCATION);
    setEditingId(null);
  };

  const handleDeleteLocation = async (location) => {
    const locationId = location?.id;
    if (!locationId) return;

    try {
      await deleteRecommendation({
        spotId: locationId,
        idToken: auth?.session?.id_token,
      });
    } catch (error) {
      showPopup(
        error instanceof Error
          ? error.message
          : "Could not delete this location right now.",
        "failure",
        { duration: 3200 }
      );
      return;
    }

    onDeleteStargazeLocation?.(locationId);
    if (editingId === locationId) {
      resetForm();
    }
    showPopup("Location removed.", "info", { duration: 2200 });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = String(draft.name || "").trim();
    const country = String(draft.country || "").trim();
    const region = String(draft.region || "").trim();
    const type = String(draft.type || "").trim();
    const bestTime = String(draft.bestTime || "").trim();
    const lat = Number.parseFloat(draft.lat);
    const lng = Number.parseFloat(draft.lng);
    const description = String(draft.description || "").trim();
    const photoUrls = parseImageList(draft.photoUrls);
    const sourceUrls = parseImageList(draft.sourceUrls);

    if (!name) {
      showPopup("Name is required.", "failure", { duration: 2400 });
      return;
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      showPopup("Latitude must be between -90 and 90.", "failure", {
        duration: 2800,
      });
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      showPopup("Longitude must be between -180 and 180.", "failure", {
        duration: 2800,
      });
      return;
    }

    const resolvedId =
      editingId ||
      String(draft.id || "").trim() ||
      buildLocationId({ name, country, region });

    try {
      await saveRecommendation({
        idToken: auth?.session?.id_token,
        location: {
          id: resolvedId,
          name,
          lat,
          lng,
          description,
          country,
          region,
          type,
          best_time: bestTime,
          photo_urls: photoUrls,
          source_urls: sourceUrls,
        },
      });
    } catch (error) {
      showPopup(
        error instanceof Error
          ? error.message
          : "Could not save this location right now.",
        "failure",
        { duration: 3200 }
      );
      return;
    }

    onSaveStargazeLocation?.({
      id: resolvedId,
      name,
      lat,
      lng,
      description,
      country,
      region,
      type,
      best_time: bestTime,
      photo_urls: photoUrls,
      source_urls: sourceUrls,
    });
    showPopup(editingId ? "Location updated." : "Location added.", "success", {
      duration: 2400,
    });
    resetForm();
  };

  const hero = showPlanet ? (
    <MoonGlobe variant={moonVariant} className="profile-page__earth-canvas" />
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
        <section className="profile-card glass-panel glass-panel-elevated">
          <h2 className="profile-section-title">Sign in required</h2>
          <p className="profile-section-copy">
            Sign in with an admin account to access this area.
          </p>
          <button
            type="button"
            className="glass-btn profile-action-btn"
            onClick={() => auth?.signIn?.()}
          >
            Sign In
          </button>
        </section>
      ) : !hasAdminAccess ? (
        <section className="profile-card glass-panel glass-panel-elevated">
          <h2 className="profile-section-title">Access restricted</h2>
          <p className="profile-section-copy">
            You are signed in, but this account does not have admin access.
          </p>
          <button
            type="button"
            className="glass-btn profile-action-btn"
            onClick={handleBackToMap}
          >
            Return to map
          </button>
        </section>
      ) : (
        <section className="profile-card glass-panel glass-panel-elevated">
          <h2 className="profile-section-title">Stargazing locations</h2>
          <p className="profile-section-copy">
            Curate the best stargazing spots shown in the map search and on the
            map itself.
          </p>

          <form className="admin-location-form" onSubmit={handleSubmit}>
            <div className="admin-location-grid">
              <label className="profile-field admin-grid-span-2">
                <span className="profile-label">Name</span>
                <input
                  className="profile-input"
                  type="text"
                  value={draft.name}
                  onChange={handleFieldChange("name")}
                  placeholder="Joshua Tree National Park"
                />
              </label>
              <label className="profile-field admin-grid-span-2">
                <span className="profile-label">Country</span>
                <input
                  className="profile-input"
                  type="text"
                  value={draft.country}
                  onChange={handleFieldChange("country")}
                  placeholder="Portugal"
                />
              </label>
              <label className="profile-field admin-grid-span-2">
                <span className="profile-label">Region</span>
                <input
                  className="profile-input"
                  type="text"
                  value={draft.region}
                  onChange={handleFieldChange("region")}
                  placeholder="Alentejo (near Reguengos de Monsaraz)"
                />
              </label>
              <label className="profile-field admin-grid-span-3">
                <span className="profile-label">Type</span>
                <input
                  className="profile-input"
                  type="text"
                  value={draft.type}
                  onChange={handleFieldChange("type")}
                  placeholder="Dark-sky observatory / stargazing center"
                />
              </label>
              <label className="profile-field admin-grid-span-3">
                <span className="profile-label">Best time</span>
                <input
                  className="profile-input"
                  type="text"
                  value={draft.bestTime}
                  onChange={handleFieldChange("bestTime")}
                  placeholder="Clear summer nights; new Moon for deep-sky"
                />
              </label>
              <label className="profile-field admin-grid-span-3">
                <span className="profile-label">Latitude</span>
                <input
                  className="profile-input"
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  value={draft.lat}
                  onChange={handleFieldChange("lat")}
                  placeholder="34.1341"
                />
              </label>
              <label className="profile-field admin-grid-span-3">
                <span className="profile-label">Longitude</span>
                <input
                  className="profile-input"
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  value={draft.lng}
                  onChange={handleFieldChange("lng")}
                  placeholder="-116.3131"
                />
              </label>
            </div>

            <label className="profile-field">
              <span className="profile-label">Description</span>
              <textarea
                className="profile-textarea"
                rows="3"
                value={draft.description}
                onChange={handleFieldChange("description")}
                placeholder="High desert skies with minimal light pollution."
              />
            </label>

            <label className="profile-field">
              <span className="profile-label">Photo source URLs</span>
              <textarea
                className="profile-textarea"
                rows="3"
                value={draft.photoUrls}
                onChange={handleFieldChange("photoUrls")}
                placeholder="https://example.com/gallery"
              />
              <span className="admin-location-note">
                Separate multiple URLs with commas or new lines.
              </span>
            </label>

            <label className="profile-field">
              <span className="profile-label">Source URLs</span>
              <textarea
                className="profile-textarea"
                rows="3"
                value={draft.sourceUrls}
                onChange={handleFieldChange("sourceUrls")}
                placeholder="https://example.com/official-site"
              />
              <span className="admin-location-note">
                Separate multiple URLs with commas or new lines.
              </span>
            </label>

            <div className="admin-location-actions">
              <button
                type="button"
                className="glass-btn profile-action-btn profile-secondary"
                onClick={resetForm}
              >
                Clear
              </button>
              <button
                type="submit"
                className="glass-btn profile-action-btn profile-primary"
              >
                Add location
              </button>
            </div>
          </form>

          <div className="admin-location-list">
            {locationList.length === 0 ? (
              <div className="profile-readonly">No curated locations yet.</div>
            ) : (
              locationList.map((location) => {
                const metaDetails = [
                  location.region,
                  location.country,
                  location.type,
                  location.bestTime,
                ].filter(Boolean);

                return (
                  <div key={location.id} className="admin-location-card">
                    <div className="admin-location-card-header">
                      <div>
                        <div className="admin-location-title">
                          {location.name}
                        </div>
                        <div className="admin-location-meta">
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </div>
                        {location.id ? (
                          <div className="admin-location-meta">
                            {location.id}
                          </div>
                        ) : null}
                        {metaDetails.length > 0 ? (
                          <div className="admin-location-meta">
                            {metaDetails.join(" | ")}
                          </div>
                        ) : null}
                      </div>
                      <div className="admin-location-actions">
                      <button
                        type="button"
                        className="glass-btn profile-action-btn"
                        onClick={() => handleDeleteLocation(location)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {location.description ? (
                      <div className="admin-location-description">
                        {location.description}
                      </div>
                    ) : null}
                </div>
              );
            })
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}

export default AdminPage;
