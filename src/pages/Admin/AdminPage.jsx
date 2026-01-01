import { useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import MoonGlobe from "../../components/planets/MoonGlobe";
import showPopup from "../../utils/popup";
import { isProbablyHardwareAccelerated } from "../../utils/hardwareUtils";

const EMPTY_LOCATION = {
  name: "",
  lat: "",
  lng: "",
  description: "",
  images: "",
};

const parseImageList = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

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

  const handleEditLocation = (location) => {
    setEditingId(location.id);
    setDraft({
      name: location.name || "",
      lat: String(location.lat ?? ""),
      lng: String(location.lng ?? ""),
      description: location.description || "",
      images: Array.isArray(location.images) ? location.images.join("\n") : "",
    });
  };

  const handleDeleteLocation = (locationId) => {
    if (!locationId) return;
    onDeleteStargazeLocation?.(locationId);
    if (editingId === locationId) {
      resetForm();
    }
    showPopup("Location removed.", "info", { duration: 2200 });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = String(draft.name || "").trim();
    const lat = Number.parseFloat(draft.lat);
    const lng = Number.parseFloat(draft.lng);
    const description = String(draft.description || "").trim();
    const images = parseImageList(draft.images);

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

    onSaveStargazeLocation?.({
      id: editingId || undefined,
      name,
      lat,
      lng,
      description,
      images,
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
      {!isAuthenticated ? (
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
      ) : !isAdmin ? (
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
              <label className="profile-field">
                <span className="profile-label">Name</span>
                <input
                  className="profile-input"
                  type="text"
                  value={draft.name}
                  onChange={handleFieldChange("name")}
                  placeholder="Joshua Tree National Park"
                />
              </label>
              <label className="profile-field">
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
              <label className="profile-field">
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
              <span className="profile-label">Image URLs</span>
              <textarea
                className="profile-textarea"
                rows="3"
                value={draft.images}
                onChange={handleFieldChange("images")}
                placeholder="https://example.com/photo-1.jpg"
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
                {editingId ? "Cancel edit" : "Clear"}
              </button>
              <button
                type="submit"
                className="glass-btn profile-action-btn profile-primary"
              >
                {editingId ? "Update location" : "Add location"}
              </button>
            </div>
          </form>

          <div className="admin-location-list">
            {locationList.length === 0 ? (
              <div className="profile-readonly">No curated locations yet.</div>
            ) : (
              locationList.map((location) => (
                <div key={location.id} className="admin-location-card">
                  <div className="admin-location-card-header">
                    <div>
                      <div className="admin-location-title">
                        {location.name}
                      </div>
                      <div className="admin-location-meta">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </div>
                    </div>
                    <div className="admin-location-actions">
                      <button
                        type="button"
                        className="glass-btn profile-action-btn profile-secondary"
                        onClick={() => handleEditLocation(location)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="glass-btn profile-action-btn"
                        onClick={() => handleDeleteLocation(location.id)}
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
                  {location.images && location.images.length > 0 ? (
                    <div className="admin-location-images">
                      {location.images.slice(0, 4).map((image, index) => (
                        <img
                          key={`${location.id}-${index}`}
                          src={image}
                          alt={`${location.name} ${index + 1}`}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}

export default AdminPage;
