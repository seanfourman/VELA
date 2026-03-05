import { useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import MoonGlobe from "@/components/planets/MoonGlobe";
import showPopup from "@/utils/popup";
import {
  deleteRecommendation,
  saveRecommendation,
} from "@/utils/recommendationsApi";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import AdminAccessNotice from "./AdminAccessNotice";
import AdminLocationForm from "./AdminLocationForm";
import AdminLocationList from "./AdminLocationList";
import AdminEventForm from "./AdminEventForm";
import AdminEventList from "./AdminEventList";
import "@/pages/Settings/SettingsPage.css";
import { EMPTY_EVENT, EMPTY_LOCATION } from "./adminConstants";
import {
  buildDraftFromEvent,
  buildEventFromDraft,
  buildEventId,
} from "./adminEventUtils";
import {
  buildDraftFromLocation,
  buildLocationFromDraft,
  buildLocationId,
} from "./adminUtils";

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
  starPartyEvents,
  onSaveStargazeLocation,
  onDeleteStargazeLocation,
  onSaveStarPartyEvent,
  onDeleteStarPartyEvent,
  onSetStarPartyEventStatus,
}) {
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const canUseAdminTools = isAuthenticated;
  const hasAdminAccess = Boolean(isAdmin);
  const [locationDraft, setLocationDraft] = useState(EMPTY_LOCATION);
  const [eventDraft, setEventDraft] = useState(EMPTY_EVENT);
  const [activeView, setActiveView] = useState("locations");
  const editingLocationId = String(locationDraft.id || "").trim();
  const editingEventId = String(eventDraft.id || "").trim();
  const isEditingLocation = Boolean(editingLocationId);
  const isEditingEvent = Boolean(editingEventId);
  const showPlanet = useMemo(() => isProbablyHardwareAccelerated(), []);
  const locationList = useMemo(() => {
    if (!Array.isArray(stargazeLocations)) return [];
    return [...stargazeLocations].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""),
    ));
  }, [stargazeLocations]);
  const eventList = useMemo(() => {
    if (!Array.isArray(starPartyEvents)) return [];
    return [...starPartyEvents].sort((a, b) => {
      const aTime = new Date(a.startsAt || 0).getTime();
      const bTime = new Date(b.startsAt || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }, [starPartyEvents]);
  const publishedEventsCount = useMemo(
    () => eventList.filter((event) => event.status === "published").length,
    [eventList],
  );
  const totalRsvps = useMemo(
    () =>
      eventList.reduce(
        (sum, event) => sum + (Array.isArray(event.rsvps) ? event.rsvps.length : 0),
        0,
      ),
    [eventList],
  );
  const activeViewIndex = activeView === "events" ? 1 : 0;
  const viewSwitcherStyle = {
    "--switch-index": activeViewIndex,
    "--switch-count": 2,
  };

  const handleBackToMap = () => {
    if (onNavigate) {
      onNavigate("/");
      return;
    }
    window.location.assign("/");
  };

  const handleLocationFieldChange = (key) => (event) => {
    const value = event.target.value;
    setLocationDraft((current) => ({ ...current, [key]: value }));
  };

  const handleEventFieldChange = (key) => (event) => {
    const value = event.target.value;
    setEventDraft((current) => ({ ...current, [key]: value }));
  };

  const resetLocationForm = () => setLocationDraft(EMPTY_LOCATION);
  const resetEventForm = () => setEventDraft(EMPTY_EVENT);

  const handleEditLocation = (location) => {
    const nextDraft = buildDraftFromLocation(location);
    if (!nextDraft) return;
    setLocationDraft(nextDraft);
    showPopup("Editing selected location", "info", { duration: 1800 });
  };

  const handleEditEvent = (event) => {
    const nextDraft = buildDraftFromEvent(event);
    if (!nextDraft) return;
    setEventDraft(nextDraft);
    showPopup("Editing selected event", "info", { duration: 1800 });
  };

  const handleDeleteLocation = async (location) => {
    const locationId = location?.id;
    if (!locationId) return;

    try {
      await deleteRecommendation({
        spotId: locationId,
      });
      onDeleteStargazeLocation?.(locationId);
      if (editingLocationId && editingLocationId === String(locationId).trim()) {
        resetLocationForm();
      }
      showPopup("Location removed", "info", { duration: 2200 });
    } catch (error) {
      showPopup(
        error instanceof Error
          ? error.message
          : "Could not delete this location right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleDeleteEvent = (event) => {
    const eventId = String(event?.id || "").trim();
    if (!eventId) return;
    onDeleteStarPartyEvent?.(eventId);
    if (editingEventId && editingEventId === eventId) {
      resetEventForm();
    }
    showPopup("Event removed", "info", { duration: 2200 });
  };

  const handleSubmitLocation = async (event) => {
    event.preventDefault();
    const location = buildLocationFromDraft(locationDraft);
    const invalidPhotoCount = location.invalidPhotoUrls.length;
    const invalidSourceCount = location.invalidSourceUrls.length;

    if (!location.name) {
      showPopup("Name is required", "failure", { duration: 2400 });
      return;
    }
    if (!Number.isFinite(location.lat) || location.lat < -90 || location.lat > 90) {
      showPopup("Latitude must be between -90 and 90", "failure", {
        duration: 2800,
      });
      return;
    }
    if (
      !Number.isFinite(location.lng) ||
      location.lng < -180 ||
      location.lng > 180
    ) {
      showPopup("Longitude must be between -180 and 180", "failure", {
        duration: 2800,
      });
      return;
    }
    if (invalidPhotoCount > 0 || invalidSourceCount > 0) {
      const details = [];
      if (invalidPhotoCount > 0) {
        details.push(`photo URLs: ${invalidPhotoCount}`);
      }
      if (invalidSourceCount > 0) {
        details.push(`source URLs: ${invalidSourceCount}`);
      }
      showPopup(
        `Invalid URL list (${details.join(", ")}). Use valid http(s) URLs only`,
        "failure",
        { duration: 4200 }
      );
      return;
    }

    const resolvedId =
      String(locationDraft.id || "").trim() ||
      buildLocationId({
        name: location.name,
        country: location.country,
        region: location.region,
      });
    const apiLocation = buildApiLocation(location, resolvedId);

    try {
      await saveRecommendation({
        location: apiLocation,
      });
      onSaveStargazeLocation?.(apiLocation);
      showPopup(
        isEditingLocation ? "Location updated" : "Location added",
        "success",
        { duration: 2400 }
      );
      resetLocationForm();
    } catch (error) {
      showPopup(
        error instanceof Error
          ? error.message
          : "Could not save this location right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleSubmitEvent = async (event) => {
    event.preventDefault();
    const eventData = buildEventFromDraft(eventDraft);

    if (!eventData.title) {
      showPopup("Event title is required", "failure", { duration: 2400 });
      return;
    }
    if (!eventData.startsAt) {
      showPopup("Event start time is required", "failure", { duration: 2400 });
      return;
    }
    if (!Number.isFinite(eventData.lat) || eventData.lat < -90 || eventData.lat > 90) {
      showPopup("Latitude must be between -90 and 90", "failure", {
        duration: 2800,
      });
      return;
    }
    if (
      !Number.isFinite(eventData.lng) ||
      eventData.lng < -180 ||
      eventData.lng > 180
    ) {
      showPopup("Longitude must be between -180 and 180", "failure", {
        duration: 2800,
      });
      return;
    }

    if (eventData.endsAt) {
      const startMs = Date.parse(eventData.startsAt);
      const endMs = Date.parse(eventData.endsAt);
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs) {
        showPopup("Event end time must be after start time", "failure", {
          duration: 2800,
        });
        return;
      }
    }

    const resolvedId =
      eventData.id ||
      buildEventId({ title: eventData.title, startsAt: eventData.startsAt });
    const payload = {
      ...eventData,
      id: resolvedId,
    };

    try {
      await Promise.resolve(onSaveStarPartyEvent?.(payload));
      showPopup(isEditingEvent ? "Event updated" : "Event created", "success", {
        duration: 2400,
      });
      resetEventForm();
    } catch (error) {
      showPopup(
        error instanceof Error
          ? error.message
          : "Could not save this event right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleSetEventStatus = (eventId, status) => {
    if (!eventId || !status) return;
    onSetStarPartyEventStatus?.({ eventId, status });
    if (editingEventId && editingEventId === String(eventId).trim()) {
      setEventDraft((current) => ({ ...current, status }));
    }
    showPopup(`Event status set to ${status}`, "info", { duration: 1800 });
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
          onAction={() => onNavigate?.("/auth")}
        />
      ) : !hasAdminAccess ? (
        <AdminAccessNotice
          title="Access restricted"
          message="You are signed in, but this account does not have admin access."
          buttonLabel="Return to map"
          onAction={handleBackToMap}
        />
      ) : (
        <section className="profile-card glass-panel glass-panel-elevated admin-workspace">
          <div className="admin-workspace-header">
            <div>
              <h2 className="profile-section-title">Admin tools</h2>
              <p className="profile-section-copy">
                Manage curated map spots and admin-created star party events.
              </p>
            </div>
            <div
              className="settings-switcher admin-view-switcher"
              role="group"
              aria-label="Admin view"
              style={viewSwitcherStyle}
            >
              <button
                type="button"
                className={`settings-switch${
                  activeView === "locations" ? " active" : ""
                }`}
                aria-pressed={activeView === "locations"}
                onClick={() => setActiveView("locations")}
              >
                Locations
              </button>
              <button
                type="button"
                className={`settings-switch${
                  activeView === "events" ? " active" : ""
                }`}
                aria-pressed={activeView === "events"}
                onClick={() => setActiveView("events")}
              >
                Events
              </button>
            </div>
          </div>

          <div className="admin-summary-row">
            <span className="profile-pill">Spots {locationList.length}</span>
            <span className="profile-pill">Events {eventList.length}</span>
            <span className="profile-pill">Published {publishedEventsCount}</span>
            <span className="profile-pill">RSVPs {totalRsvps}</span>
          </div>

          {activeView === "locations" ? (
            <>
              <AdminLocationForm
                draft={locationDraft}
                onFieldChange={handleLocationFieldChange}
                onReset={resetLocationForm}
                onCancelEdit={resetLocationForm}
                onSubmit={handleSubmitLocation}
                isEditing={isEditingLocation}
              />

              <AdminLocationList
                locations={locationList}
                onDeleteLocation={handleDeleteLocation}
                onEditLocation={handleEditLocation}
                activeLocationId={editingLocationId || null}
              />
            </>
          ) : (
            <>
              <AdminEventForm
                draft={eventDraft}
                onFieldChange={handleEventFieldChange}
                onSubmit={handleSubmitEvent}
                onReset={resetEventForm}
                onCancelEdit={resetEventForm}
                isEditing={isEditingEvent}
              />

              <AdminEventList
                events={eventList}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
                onSetStatus={handleSetEventStatus}
                activeEventId={editingEventId || null}
              />
            </>
          )}
        </section>
      )}
    </PageShell>
  );
}

export default AdminPage;
