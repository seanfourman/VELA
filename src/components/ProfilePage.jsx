import { useEffect, useMemo, useState } from "react";
import ProfileEarth from "./ProfileEarth";
import showPopup from "../utils/popup";
import { isProbablyHardwareAccelerated } from "../utils/hardwareUtils";
import "./ProfilePage.css";

const EMPTY_PROFILE = {
  displayName: "",
  avatarUrl: "",
  bio: "",
};

const normalizeProfile = (value) => {
  const safe = value && typeof value === "object" ? value : {};
  return {
    displayName:
      typeof safe.displayName === "string" ? safe.displayName : "",
    avatarUrl: typeof safe.avatarUrl === "string" ? safe.avatarUrl : "",
    bio: typeof safe.bio === "string" ? safe.bio : "",
  };
};

const getInitial = (value = "") =>
  String(value).trim().charAt(0).toUpperCase();

function ProfilePage({
  auth,
  profile,
  isLight,
  isAdmin,
  mapType,
  onSave,
  onReset,
  onNavigate,
}) {
  const [draft, setDraft] = useState(() => normalizeProfile(profile));
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const user = auth?.user || {};
  const userEmail = user?.email;
  const userName =
    user?.name || user?.preferred_username || user?.given_name || "Explorer";
  const showEarth = useMemo(() => isProbablyHardwareAccelerated(), []);
  const isDayMap = mapType === "light" || mapType === "satellite" || isLight;
  const earthVariant = isDayMap ? "day" : "night";

  useEffect(() => {
    setDraft(normalizeProfile(profile));
  }, [profile]);

  const draftNormalized = normalizeProfile(draft);
  const profileNormalized = normalizeProfile(profile);
  const hasChanges =
    draftNormalized.displayName !== profileNormalized.displayName ||
    draftNormalized.avatarUrl !== profileNormalized.avatarUrl ||
    draftNormalized.bio !== profileNormalized.bio;

  const displayName =
    draftNormalized.displayName.trim() ||
    user?.name ||
    user?.email ||
    user?.preferred_username ||
    userName;
  const avatarUrl =
    draftNormalized.avatarUrl.trim() || user?.picture || "";
  const userInitial = getInitial(displayName || userEmail || "U");

  const handleFieldChange = (key) => (event) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onSave) return;

    const nextProfile = {
      displayName: draftNormalized.displayName.trim(),
      avatarUrl: draftNormalized.avatarUrl.trim(),
      bio: draftNormalized.bio.trim(),
    };

    onSave(nextProfile);
    showPopup("Profile updated.", "success", { duration: 2200 });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
    setDraft({ ...EMPTY_PROFILE });
    showPopup("Profile reset to defaults.", "info", { duration: 2200 });
  };

  const handleBackToMap = () => {
    if (onNavigate) {
      onNavigate("/");
      return;
    }
    window.location.assign("/");
  };

  return (
    <div className={`profile-page ${isLight ? "light" : ""}`}>
      {showEarth ? (
        <div className="profile-page__earth" aria-hidden="true">
          <ProfileEarth
            variant={earthVariant}
            showClouds={isDayMap}
            className="profile-page__earth-canvas"
          />
        </div>
      ) : null}
      <div className="profile-page__content">
        <header className="profile-page__header">
          <div>
            <h1 className="profile-page__title">Profile</h1>
            <p className="profile-page__subtitle">
              Update your public details and manage the info shown in VELA.
            </p>
          </div>
          <div className="profile-page__header-actions">
            <button
              type="button"
              className="glass-btn profile-action-btn"
              onClick={handleBackToMap}
            >
              Back to map
            </button>
          </div>
        </header>

        {!isAuthenticated ? (
          <section className="profile-card glass-panel glass-panel-elevated">
            <h2 className="profile-section-title">Sign in to edit</h2>
            <p className="profile-section-copy">
              Sign in to customize your display name, avatar, and profile
              details.
            </p>
            <button
              type="button"
              className="glass-btn profile-action-btn"
              onClick={() => auth?.signIn?.()}
            >
              Sign In
            </button>
          </section>
        ) : (
          <form
            className="profile-card glass-panel glass-panel-elevated"
            onSubmit={handleSubmit}
          >
            <div className="profile-card__header">
              <div className="profile-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile avatar" />
                ) : (
                  <span className="profile-avatar__initial">{userInitial}</span>
                )}
              </div>
              <div className="profile-preview">
                <div className="profile-preview__name">
                  {displayName || "Signed In"}
                </div>
                {userEmail ? (
                  <div className="profile-preview__meta">{userEmail}</div>
                ) : null}
                {isAdmin ? (
                  <span className="profile-pill">Admin access</span>
                ) : null}
              </div>
            </div>

            <div className="profile-section">
              <h2 className="profile-section-title">Public profile</h2>
              <div className="profile-grid">
                <label className="profile-field">
                  <span className="profile-label">Display name</span>
                  <input
                    className="profile-input"
                    type="text"
                    value={draftNormalized.displayName}
                    onChange={handleFieldChange("displayName")}
                    placeholder={userName}
                    autoComplete="name"
                  />
                </label>
                <label className="profile-field">
                  <span className="profile-label">Avatar URL</span>
                  <input
                    className="profile-input"
                    type="url"
                    value={draftNormalized.avatarUrl}
                    onChange={handleFieldChange("avatarUrl")}
                    placeholder="https://example.com/avatar.png"
                  />
                </label>
              </div>
              <label className="profile-field">
                <span className="profile-label">Bio</span>
                <textarea
                  className="profile-textarea"
                  rows="3"
                  value={draftNormalized.bio}
                  onChange={handleFieldChange("bio")}
                  placeholder="Tell us about your stargazing setup."
                  maxLength={180}
                />
              </label>
            </div>

            <div className="profile-section">
              <h2 className="profile-section-title">Account</h2>
              <div className="profile-grid">
                <div className="profile-field">
                  <span className="profile-label">Email</span>
                  <div className="profile-readonly">
                    {userEmail || "Not available"}
                  </div>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Username</span>
                  <div className="profile-readonly">
                    {user?.preferred_username || "Not available"}
                  </div>
                </div>
                <div className="profile-field">
                  <span className="profile-label">User ID</span>
                  <div className="profile-readonly">
                    {user?.sub || "Not available"}
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="glass-btn profile-action-btn profile-secondary"
                onClick={handleReset}
                disabled={!hasChanges}
              >
                Reset
              </button>
              <button
                type="submit"
                className="glass-btn profile-action-btn profile-primary"
                disabled={!hasChanges}
              >
                Save changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
