import { useMemo, useState } from "react";
import Chip from "@mui/material/Chip";
import PageShell from "@/components/layout/PageShell";
import MoonGlobe from "@/components/planets/MoonGlobe";
import showNotification from "@/utils/notifications";
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
import "@/pages/Settings/styles/SettingsPage.css";
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
import { navigateToMapHome } from "@/utils/navigation";
import {
  buildApiLocation,
  validateEventDraft,
  validateLocationDraft,
} from "./adminSubmission";

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
  const summaryChipSx = useMemo(
    () => ({
      color: isLight ? "#10223f" : "#f5f8ff",
      borderColor: isLight ? "rgba(16, 34, 63, 0.32)" : "rgba(245, 248, 255, 0.34)",
      bgcolor: "transparent",
    }),
    [isLight],
  );

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
    showNotification("Editing selected location", "info", { duration: 1800 });
  };

  const handleEditEvent = (event) => {
    const nextDraft = buildDraftFromEvent(event);
    if (!nextDraft) return;
    setEventDraft(nextDraft);
    showNotification("Editing selected event", "info", { duration: 1800 });
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
      showNotification("Location removed", "info", { duration: 2200 });
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not delete this location right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleDeleteEvent = async (event) => {
    const eventId = String(event?.id || "").trim();
    if (!eventId) return;
    try {
      await Promise.resolve(onDeleteStarPartyEvent?.(eventId));
      if (editingEventId && editingEventId === eventId) {
        resetEventForm();
      }
      showNotification("Event removed", "info", { duration: 2200 });
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not delete this event right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleSubmitLocation = async (event) => {
    event.preventDefault();
    const location = buildLocationFromDraft(locationDraft);

    const validation = validateLocationDraft(location);
    if (validation) {
      showNotification(validation.message, "failure", { duration: validation.duration });
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
      showNotification(
        isEditingLocation ? "Location updated" : "Location added",
        "success",
        { duration: 2400 }
      );
      resetLocationForm();
    } catch (error) {
      showNotification(
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

    const validation = validateEventDraft(eventData);
    if (validation) {
      showNotification(validation.message, "failure", { duration: validation.duration });
      return;
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
      showNotification(isEditingEvent ? "Event updated" : "Event created", "success", {
        duration: 2400,
      });
      resetEventForm();
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not save this event right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleSetEventStatus = async (eventId, status) => {
    if (!eventId || !status) return;
    try {
      await Promise.resolve(onSetStarPartyEventStatus?.({ eventId, status }));
      if (editingEventId && editingEventId === String(eventId).trim()) {
        setEventDraft((current) => ({ ...current, status }));
      }
      showNotification(`Event status set to ${status}`, "info", { duration: 1800 });
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not change event status right now",
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
      onBack={() => navigateToMapHome({ navigate: onNavigate })}
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
          onAction={() => navigateToMapHome({ navigate: onNavigate })}
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
            <Chip
              size="small"
              label={`Spots ${locationList.length}`}
              variant="outlined"
              sx={summaryChipSx}
            />
            <Chip
              size="small"
              label={`Events ${eventList.length}`}
              variant="outlined"
              sx={summaryChipSx}
            />
            <Chip
              size="small"
              label={`Published ${publishedEventsCount}`}
              variant="outlined"
              sx={summaryChipSx}
            />
            <Chip
              size="small"
              label={`RSVPs ${totalRsvps}`}
              variant="outlined"
              sx={summaryChipSx}
            />
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



