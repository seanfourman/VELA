import { useEffect, useMemo, useState } from "react";
import EarthGlobe from "@/components/planets/EarthGlobe";
import PageShell from "@/components/layout/PageShell";
import userIcon from "@/assets/icons/user-icon.svg";
import { DEFAULT_PROFILE, normalizeProfile } from "@/utils/appState";
import { getRsvpUserId } from "@/features/starParty/starPartyStorage";
import showPopup from "@/utils/popup";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import "./ProfilePage.css";

const PROFILE_KEYS = [
  "displayName",
  "avatarUrl",
  "bio",
  "locationLabel",
  "favoriteTargets",
  "equipment",
];

const PROFILE_COMPLETION_KEYS = [
  "displayName",
  "avatarUrl",
  "bio",
  "locationLabel",
  "favoriteTargets",
];

const formatEventTime = (value) => {
  if (!value) return "TBD";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function ProfilePage({
  auth,
  profile,
  isLight,
  isAdmin,
  mapType,
  starPartyEvents = [],
  onSave,
  onReset,
  onNavigate,
}) {
  const [draft, setDraft] = useState(() => normalizeProfile(profile));
  const [nowMs] = useState(() => Date.now());
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
  const hasChanges = PROFILE_KEYS.some(
    (key) => draftNormalized[key] !== profileNormalized[key],
  );

  const displayName =
    draftNormalized.displayName ||
    user?.name ||
    user?.email ||
    user?.preferred_username ||
    userName;
  const avatarUrl = draftNormalized.avatarUrl || user?.picture || "";
  const userRsvpId = getRsvpUserId(user);

  const joinedEvents = useMemo(() => {
    if (!userRsvpId || !Array.isArray(starPartyEvents)) return [];
    return starPartyEvents.filter((event) =>
      Array.isArray(event?.rsvps)
        ? event.rsvps.some(
            (entry) => String(entry?.userId || "").toLowerCase() === userRsvpId,
          )
        : false,
    );
  }, [starPartyEvents, userRsvpId]);

  const hostedEventsCount = useMemo(() => {
    if (!userRsvpId || !Array.isArray(starPartyEvents)) return 0;
    return starPartyEvents.filter(
      (event) => String(event?.host?.id || "").toLowerCase() === userRsvpId,
    ).length;
  }, [starPartyEvents, userRsvpId]);

  const upcomingJoinedEvents = useMemo(() => {
    return [...joinedEvents]
      .filter((event) => {
        const startsAtMs = Date.parse(event.startsAt || "");
        return Number.isFinite(startsAtMs) && startsAtMs >= nowMs;
      })
      .sort(
        (a, b) =>
          Date.parse(a.startsAt || Number.MAX_SAFE_INTEGER) -
          Date.parse(b.startsAt || Number.MAX_SAFE_INTEGER),
      );
  }, [joinedEvents, nowMs]);

  const recentJoinedEvents = useMemo(
    () =>
      [...joinedEvents].sort(
        (a, b) =>
          Date.parse(b.startsAt || 0) - Date.parse(a.startsAt || 0),
      ),
    [joinedEvents],
  );

  const completionScore = PROFILE_COMPLETION_KEYS.reduce(
    (count, key) => count + Number(Boolean(String(draftNormalized[key] || "").trim())),
    0,
  );
  const completionPercent = Math.round(
    (completionScore / PROFILE_COMPLETION_KEYS.length) * 100,
  );

  const handleFieldChange = (key) => (event) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave?.(draftNormalized);
    showPopup("Profile updated", "success", { duration: 2200 });
  };

  const handleReset = () => {
    onReset?.();
    setDraft({ ...DEFAULT_PROFILE });
    showPopup("Profile reset to defaults", "info", { duration: 2200 });
  };

  const hero = showEarth ? (
    <EarthGlobe
      variant={earthVariant}
      showClouds={isDayMap}
      className="profile-page__earth-canvas"
    />
  ) : null;

  return (
    <PageShell
      title="Community Profile"
      subtitle="Show who you are, what you observe, and your event activity."
      isLight={isLight}
      onNavigate={onNavigate}
      hero={hero}
    >
      {!isAuthenticated ? (
        <section className="profile-card glass-panel glass-panel-elevated">
          <h2 className="profile-section-title">Sign in to edit</h2>
          <p className="profile-section-copy">
            Sign in to create your community profile and join stargazing events.
          </p>
          <button
            type="button"
            className="glass-btn profile-action-btn"
            onClick={() => {
              onNavigate?.("/auth");
            }}
          >
            Sign In
          </button>
        </section>
      ) : (
        <form
          className="profile-card glass-panel glass-panel-elevated profile-workspace"
          onSubmit={handleSubmit}
        >
          <div className="profile-card__header">
            <div className="profile-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile avatar" />
              ) : (
                <img
                  className="profile-avatar__icon"
                  src={userIcon}
                  alt="User"
                />
              )}
            </div>
            <div className="profile-preview">
              <div className="profile-preview__name">{displayName}</div>
              {userEmail ? (
                <div className="profile-preview__meta">{userEmail}</div>
              ) : null}
              {isAdmin ? <span className="profile-pill">Admin access</span> : null}
              <div className="profile-completion">
                <div className="profile-completion__label">
                  Profile completion {completionPercent}%
                </div>
                <div className="profile-completion__bar" aria-hidden="true">
                  <span style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="profile-metrics">
            <article className="profile-metric">
              <div className="profile-metric__label">Events joined</div>
              <div className="profile-metric__value">{joinedEvents.length}</div>
            </article>
            <article className="profile-metric">
              <div className="profile-metric__label">Events hosted</div>
              <div className="profile-metric__value">{hostedEventsCount}</div>
            </article>
            <article className="profile-metric">
              <div className="profile-metric__label">Upcoming</div>
              <div className="profile-metric__value">
                {upcomingJoinedEvents.length}
              </div>
            </article>
          </div>

          <div className="profile-layout-grid">
            <section className="profile-panel">
              <h2 className="profile-section-title">About you</h2>
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
                  placeholder="Tell the community what you like observing."
                  maxLength={180}
                />
              </label>
              <label className="profile-field">
                <span className="profile-label">Home sky</span>
                <input
                  className="profile-input"
                  type="text"
                  value={draftNormalized.locationLabel}
                  onChange={handleFieldChange("locationLabel")}
                  placeholder="Negev ridge, Israel"
                />
              </label>
            </section>

            <section className="profile-panel">
              <h2 className="profile-section-title">Stargazing identity</h2>
              <label className="profile-field">
                <span className="profile-label">Favorite targets</span>
                <textarea
                  className="profile-textarea"
                  rows="3"
                  value={draftNormalized.favoriteTargets}
                  onChange={handleFieldChange("favoriteTargets")}
                  placeholder="Orion Nebula, Pleiades, Andromeda"
                />
              </label>
              <label className="profile-field">
                <span className="profile-label">Equipment</span>
                <textarea
                  className="profile-textarea"
                  rows="3"
                  value={draftNormalized.equipment}
                  onChange={handleFieldChange("equipment")}
                  placeholder="Telescope, tracker, camera, filters"
                />
              </label>
            </section>

            <section className="profile-panel">
              <h2 className="profile-section-title">Upcoming events</h2>
              {upcomingJoinedEvents.length === 0 ? (
                <div className="profile-event-empty">
                  No upcoming RSVP events yet
                </div>
              ) : (
                <div className="profile-event-list">
                  {upcomingJoinedEvents.slice(0, 4).map((event) => (
                    <article key={event.id} className="profile-event-item">
                      <div className="profile-event-head">
                        <div className="profile-event-title">{event.title}</div>
                        <span className="profile-event-chip">
                          {event.eventType === "special_event"
                            ? "Special"
                            : "Party"}
                        </span>
                      </div>
                      <div className="profile-event-meta">
                        {formatEventTime(event.startsAt)}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="profile-panel">
              <h2 className="profile-section-title">Recent activity</h2>
              {recentJoinedEvents.length === 0 ? (
                <div className="profile-event-empty">No joined events yet</div>
              ) : (
                <div className="profile-event-list">
                  {recentJoinedEvents.slice(0, 4).map((event) => (
                    <article key={event.id} className="profile-event-item">
                      <div className="profile-event-head">
                        <div className="profile-event-title">{event.title}</div>
                        <span className="profile-event-chip">
                          {event.eventType === "special_event"
                            ? "Special"
                            : "Party"}
                        </span>
                      </div>
                      <div className="profile-event-meta">
                        {formatEventTime(event.startsAt)}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
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
          <p className="profile-account-id">{user?.sub || "Not available"}</p>
        </form>
      )}
    </PageShell>
  );
}

export default ProfilePage;
