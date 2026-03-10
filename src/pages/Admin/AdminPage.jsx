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

const compareAlphabetical = (left, right) =>
  String(left || "").trim().localeCompare(String(right || "").trim(), undefined, {
    sensitivity: "base",
    numeric: true,
  });

const ADMIN_PAGE_SIZE = 8;

const normalizeSearchValue = (value) => String(value || "").trim().toLowerCase();

const buildSearchBlob = (values) =>
  values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      return [value];
    })
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

const matchesLocationSearch = (location, query) => {
  if (!query) return true;

  const blob = buildSearchBlob([
    location?.name,
    location?.id,
    location?.region,
    location?.country,
    location?.type,
    location?.bestTime,
    location?.description,
    location?.lat,
    location?.lng,
  ]);

  return blob.includes(query);
};

const matchesEventSearch = (event, query) => {
  if (!query) return true;

  const blob = buildSearchBlob([
    event?.title,
    event?.id,
    event?.eventType,
    event?.status,
    event?.description,
    event?.meetupDetails,
    event?.lat,
    event?.lng,
    event?.host?.name,
    event?.host?.email,
    event?.hostChecklist,
  ]);

  return blob.includes(query);
};

const paginateItems = (items, page, pageSize) => {
  const startIndex = (page - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
};

const PaginationChevron = ({ direction }) => (
  <svg
    viewBox="0 0 20 20"
    width="18"
    height="18"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d={direction === "left" ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
  const [locationSearch, setLocationSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [locationPage, setLocationPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const editingLocationId = String(locationDraft.id || "").trim();
  const editingEventId = String(eventDraft.id || "").trim();
  const isEditingLocation = Boolean(editingLocationId);
  const isEditingEvent = Boolean(editingEventId);
  const showPlanet = useMemo(() => isProbablyHardwareAccelerated(), []);
  const locationList = useMemo(() => {
    if (!Array.isArray(stargazeLocations)) return [];
    return [...stargazeLocations].sort((a, b) =>
      compareAlphabetical(a?.name, b?.name),
    );
  }, [stargazeLocations]);
  const eventList = useMemo(() => {
    if (!Array.isArray(starPartyEvents)) return [];
    return [...starPartyEvents].sort((a, b) =>
      compareAlphabetical(a?.title, b?.title),
    );
  }, [starPartyEvents]);
  const normalizedLocationSearch = useMemo(
    () => normalizeSearchValue(locationSearch),
    [locationSearch],
  );
  const normalizedEventSearch = useMemo(
    () => normalizeSearchValue(eventSearch),
    [eventSearch],
  );
  const filteredLocationList = useMemo(
    () =>
      locationList.filter((location) =>
        matchesLocationSearch(location, normalizedLocationSearch),
      ),
    [locationList, normalizedLocationSearch],
  );
  const filteredEventList = useMemo(
    () => eventList.filter((event) => matchesEventSearch(event, normalizedEventSearch)),
    [eventList, normalizedEventSearch],
  );
  const locationTotalPages = Math.max(
    1,
    Math.ceil(filteredLocationList.length / ADMIN_PAGE_SIZE),
  );
  const eventTotalPages = Math.max(
    1,
    Math.ceil(filteredEventList.length / ADMIN_PAGE_SIZE),
  );
  const safeLocationPage = Math.min(locationPage, locationTotalPages);
  const safeEventPage = Math.min(eventPage, eventTotalPages);
  const paginatedLocations = useMemo(
    () => paginateItems(filteredLocationList, safeLocationPage, ADMIN_PAGE_SIZE),
    [filteredLocationList, safeLocationPage],
  );
  const paginatedEvents = useMemo(
    () => paginateItems(filteredEventList, safeEventPage, ADMIN_PAGE_SIZE),
    [filteredEventList, safeEventPage],
  );
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
  const activeSearchValue = activeView === "events" ? eventSearch : locationSearch;
  const activeFilteredCount =
    activeView === "events" ? filteredEventList.length : filteredLocationList.length;
  const activeTotalCount = activeView === "events" ? eventList.length : locationList.length;
  const activePage = activeView === "events" ? safeEventPage : safeLocationPage;
  const activeTotalPages = activeView === "events" ? eventTotalPages : locationTotalPages;
  const activeSearchLabel =
    activeView === "events" ? "Search events" : "Search locations";
  const activeSearchPlaceholder =
    activeView === "events"
      ? "Search by title, status, host, notes, or checklist"
      : "Search by name, country, region, type, or description";
  const activeFormTitle =
    activeView === "events"
      ? isEditingEvent
        ? "Edit event"
        : "Create event"
      : isEditingLocation
        ? "Edit location"
        : "Add location";
  const activeFormCopy =
    activeView === "events"
      ? "Create and update star party events."
      : "Create and update curated stargazing spots.";
  const activeCollectionTitle =
    activeView === "events" ? "Existing events" : "Existing locations";
  const activeCollectionCopy =
    activeView === "events"
      ? "Search, review, and manage created events."
      : "Search, review, and manage curated map spots.";
  const visibleStart =
    activeFilteredCount === 0 ? 0 : (activePage - 1) * ADMIN_PAGE_SIZE + 1;
  const visibleEnd =
    activeFilteredCount === 0
      ? 0
      : Math.min(activePage * ADMIN_PAGE_SIZE, activeFilteredCount);
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

  const handleSearchChange = (event) => {
    const value = event.target.value;
    if (activeView === "events") {
      setEventSearch(value);
      setEventPage(1);
      return;
    }
    setLocationSearch(value);
    setLocationPage(1);
  };

  const handleSearchReset = () => {
    if (activeView === "events") {
      setEventSearch("");
      setEventPage(1);
      return;
    }
    setLocationSearch("");
    setLocationPage(1);
  };

  const handlePreviousPage = () => {
    if (activeView === "events") {
      setEventPage((current) => Math.max(Math.min(current, eventTotalPages) - 1, 1));
      return;
    }
    setLocationPage((current) => Math.max(Math.min(current, locationTotalPages) - 1, 1));
  };

  const handleNextPage = () => {
    if (activeView === "events") {
      setEventPage((current) =>
        Math.min(Math.min(current, eventTotalPages) + 1, eventTotalPages),
      );
      return;
    }
    setLocationPage((current) =>
      Math.min(Math.min(current, locationTotalPages) + 1, locationTotalPages),
    );
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
        { duration: 2400 },
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
              <div className="admin-panel-section">
                <div className="admin-panel-section__header">
                  <div>
                    <h3 className="admin-panel-section__title">{activeFormTitle}</h3>
                    <p className="admin-panel-section__copy">{activeFormCopy}</p>
                  </div>
                </div>

                <AdminLocationForm
                  draft={locationDraft}
                  onFieldChange={handleLocationFieldChange}
                  onReset={resetLocationForm}
                  onCancelEdit={resetLocationForm}
                  onSubmit={handleSubmitLocation}
                  isEditing={isEditingLocation}
                />
              </div>

              <div className="admin-section-separator" aria-hidden="true" />

              <div className="admin-panel-section admin-panel-section--collection">
                <div className="admin-panel-section__header">
                  <div>
                    <h3 className="admin-panel-section__title">
                      {activeCollectionTitle}
                    </h3>
                    <p className="admin-panel-section__copy">{activeCollectionCopy}</p>
                  </div>
                </div>

                <div className="admin-collection-tools">
                  <label className="profile-field admin-search-field">
                    <span className="profile-label">{activeSearchLabel}</span>
                    <input
                      className="profile-input"
                      type="search"
                      value={activeSearchValue}
                      onChange={handleSearchChange}
                      placeholder={activeSearchPlaceholder}
                    />
                  </label>
                  <div className="admin-collection-meta">
                    <div className="admin-results-copy">
                      Showing {visibleStart}-{visibleEnd} of {activeFilteredCount}
                      {activeFilteredCount !== activeTotalCount
                        ? ` matching ${activeTotalCount} total`
                        : ""}
                    </div>
                    {activeSearchValue ? (
                      <button
                        type="button"
                        className="glass-btn profile-action-btn admin-toolbar-btn"
                        onClick={handleSearchReset}
                      >
                        Clear search
                      </button>
                    ) : null}
                  </div>
                </div>

                <AdminLocationList
                  locations={paginatedLocations}
                  onDeleteLocation={handleDeleteLocation}
                  onEditLocation={handleEditLocation}
                  activeLocationId={editingLocationId || null}
                  emptyMessage={
                    normalizedLocationSearch
                      ? "No curated locations match this search"
                      : "No curated locations yet"
                  }
                />

                {activeTotalPages > 1 ? (
                  <div className="admin-pagination">
                    <button
                      type="button"
                      className="glass-btn profile-action-btn admin-pagination-btn"
                      onClick={handlePreviousPage}
                      disabled={activePage <= 1}
                      aria-label="Previous page"
                    >
                      <PaginationChevron direction="left" />
                    </button>
                    <div className="admin-pagination-status">
                      Page {activePage} of {activeTotalPages}
                    </div>
                    <button
                      type="button"
                      className="glass-btn profile-action-btn admin-pagination-btn"
                      onClick={handleNextPage}
                      disabled={activePage >= activeTotalPages}
                      aria-label="Next page"
                    >
                      <PaginationChevron direction="right" />
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="admin-panel-section">
                <div className="admin-panel-section__header">
                  <div>
                    <h3 className="admin-panel-section__title">{activeFormTitle}</h3>
                    <p className="admin-panel-section__copy">{activeFormCopy}</p>
                  </div>
                </div>

                <AdminEventForm
                  draft={eventDraft}
                  onFieldChange={handleEventFieldChange}
                  onSubmit={handleSubmitEvent}
                  onReset={resetEventForm}
                  onCancelEdit={resetEventForm}
                  isEditing={isEditingEvent}
                />
              </div>

              <div className="admin-section-separator" aria-hidden="true" />

              <div className="admin-panel-section admin-panel-section--collection">
                <div className="admin-panel-section__header">
                  <div>
                    <h3 className="admin-panel-section__title">
                      {activeCollectionTitle}
                    </h3>
                    <p className="admin-panel-section__copy">{activeCollectionCopy}</p>
                  </div>
                </div>

                <div className="admin-collection-tools">
                  <label className="profile-field admin-search-field">
                    <span className="profile-label">{activeSearchLabel}</span>
                    <input
                      className="profile-input"
                      type="search"
                      value={activeSearchValue}
                      onChange={handleSearchChange}
                      placeholder={activeSearchPlaceholder}
                    />
                  </label>
                  <div className="admin-collection-meta">
                    <div className="admin-results-copy">
                      Showing {visibleStart}-{visibleEnd} of {activeFilteredCount}
                      {activeFilteredCount !== activeTotalCount
                        ? ` matching ${activeTotalCount} total`
                        : ""}
                    </div>
                    {activeSearchValue ? (
                      <button
                        type="button"
                        className="glass-btn profile-action-btn admin-toolbar-btn"
                        onClick={handleSearchReset}
                      >
                        Clear search
                      </button>
                    ) : null}
                  </div>
                </div>

                <AdminEventList
                  events={paginatedEvents}
                  onEditEvent={handleEditEvent}
                  onDeleteEvent={handleDeleteEvent}
                  onSetStatus={handleSetEventStatus}
                  activeEventId={editingEventId || null}
                  emptyMessage={
                    normalizedEventSearch
                      ? "No events match this search"
                      : "No events created yet"
                  }
                />

                {activeTotalPages > 1 ? (
                  <div className="admin-pagination">
                    <button
                      type="button"
                      className="glass-btn profile-action-btn admin-pagination-btn"
                      onClick={handlePreviousPage}
                      disabled={activePage <= 1}
                      aria-label="Previous page"
                    >
                      <PaginationChevron direction="left" />
                    </button>
                    <div className="admin-pagination-status">
                      Page {activePage} of {activeTotalPages}
                    </div>
                    <button
                      type="button"
                      className="glass-btn profile-action-btn admin-pagination-btn"
                      onClick={handleNextPage}
                      disabled={activePage >= activeTotalPages}
                      aria-label="Next page"
                    >
                      <PaginationChevron direction="right" />
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      )}
    </PageShell>
  );
}

export default AdminPage;
