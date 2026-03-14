import { useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import PageShell from "@/components/layout/PageShell";
import NeptuneGlobe from "@/components/planets/NeptuneGlobe";
import showNotification from "@/utils/notifications";
import {
  deleteRecommendation,
  saveRecommendation,
} from "@/utils/recommendationsApi";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import AdminLocationForm from "./AdminLocationForm";
import AdminLocationList from "./AdminLocationList";
import AdminEventForm from "./AdminEventForm";
import AdminEventList from "./AdminEventList";
import AdminUserList from "./AdminUserList";
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
import useAdminUsers from "./useAdminUsers";
import AdminAccessNotice from "./components/AdminAccessNotice";
import {
  AdminEventsSection,
  AdminLocationsSection,
  AdminUsersSection,
} from "./components/AdminWorkspaceSections";
import {
  ADMIN_PAGE_SIZE,
  ADMIN_VIEWS,
  compareAlphabetical,
  createEmptyAdminViewState,
  filterAdminItems,
  getAdminViewContent,
  normalizeSearchValue,
  paginateItems,
} from "./adminViewUtils";

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
  const [searchByView, setSearchByView] = useState(() =>
    createEmptyAdminViewState(""),
  );
  const [pageByView, setPageByView] = useState(() =>
    createEmptyAdminViewState(1),
  );
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleteConfirmBusy, setIsDeleteConfirmBusy] = useState(false);
  const locationPaginationRef = useRef(null);
  const eventPaginationRef = useRef(null);
  const userPaginationRef = useRef(null);
  const pendingPaginationAnchorRef = useRef(null);
  const editingLocationId = String(locationDraft.id || "").trim();
  const editingEventId = String(eventDraft.id || "").trim();
  const isEditingLocation = Boolean(editingLocationId);
  const isEditingEvent = Boolean(editingEventId);
  const currentUserId = String(auth?.user?.id || auth?.user?.sub || "").trim();
  const {
    users: managedUsers,
    isLoading: areUsersLoading,
    loadError: usersLoadError,
    pendingUserId,
    saveUserAccess,
  } = useAdminUsers({
    enabled: canUseAdminTools && hasAdminAccess,
  });
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
  const userList = useMemo(() => {
    if (!Array.isArray(managedUsers)) return [];
    return [...managedUsers].sort((a, b) =>
      compareAlphabetical(
        a?.displayName || a?.name || a?.email,
        b?.displayName || b?.name || b?.email,
      ),
    );
  }, [managedUsers]);
  const listByView = useMemo(
    () => ({
      locations: locationList,
      events: eventList,
      users: userList,
    }),
    [eventList, locationList, userList],
  );
  const normalizedSearchByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [view, normalizeSearchValue(searchByView[view])]),
      ),
    [searchByView],
  );
  const filteredByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [
          view,
          filterAdminItems(view, listByView[view], normalizedSearchByView[view]),
        ]),
      ),
    [listByView, normalizedSearchByView],
  );
  const totalPagesByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [
          view,
          Math.max(1, Math.ceil(filteredByView[view].length / ADMIN_PAGE_SIZE)),
        ]),
      ),
    [filteredByView],
  );
  const safePageByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [view, Math.min(pageByView[view], totalPagesByView[view])]),
      ),
    [pageByView, totalPagesByView],
  );
  const paginatedByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [
          view,
          paginateItems(filteredByView[view], safePageByView[view], ADMIN_PAGE_SIZE),
        ]),
      ),
    [filteredByView, safePageByView],
  );
  const publishedEventsCount = useMemo(
    () => eventList.filter((event) => event.status === "published").length,
    [eventList],
  );
  const adminUsersCount = useMemo(
    () => userList.filter((user) => user.isAdmin).length,
    [userList],
  );
  const totalRsvps = useMemo(
    () =>
      eventList.reduce(
        (sum, event) => sum + (Array.isArray(event.rsvps) ? event.rsvps.length : 0),
        0,
      ),
    [eventList],
  );
  const activeViewIndex = Math.max(0, ADMIN_VIEWS.indexOf(activeView));
  const activeViewContent = useMemo(
    () =>
      getAdminViewContent({
        activeView,
        isEditingLocation,
        isEditingEvent,
      }),
    [activeView, isEditingEvent, isEditingLocation],
  );
  const activeSearchValue = searchByView[activeView];
  const activeFilteredCount = filteredByView[activeView].length;
  const activePage = safePageByView[activeView];
  const activeTotalPages = totalPagesByView[activeView];
  const paginatedLocations = paginatedByView.locations;
  const paginatedEvents = paginatedByView.events;
  const paginatedUsers = paginatedByView.users;
  const visibleStart =
    activeFilteredCount === 0 ? 0 : (activePage - 1) * ADMIN_PAGE_SIZE + 1;
  const visibleEnd =
    activeFilteredCount === 0
      ? 0
      : Math.min(activePage * ADMIN_PAGE_SIZE, activeFilteredCount);
  const activeResultSummary = `${visibleStart}-${visibleEnd} of ${activeFilteredCount}`;
  const viewSwitcherStyle = {
    "--switch-index": activeViewIndex,
    "--switch-count": 3,
  };
  const adminSummaryGroups = useMemo(
    () => [
      {
        id: "locations",
        title: "Locations",
        stats: [{ label: "Spots", value: locationList.length }],
      },
      {
        id: "events",
        title: "Events",
        stats: [
          { label: "Total", value: eventList.length },
          { label: "Published", value: publishedEventsCount },
          { label: "RSVPs", value: totalRsvps },
        ],
      },
      {
        id: "users",
        title: "Users",
        stats: [
          { label: "Accounts", value: userList.length },
          { label: "Admins", value: adminUsersCount },
        ],
      },
    ],
    [
      adminUsersCount,
      eventList.length,
      locationList.length,
      publishedEventsCount,
      totalRsvps,
      userList.length,
    ],
  );
  useEffect(() => {
    const pendingView = pendingPaginationAnchorRef.current;
    if (!pendingView || typeof window === "undefined") return undefined;

    const paginationNode =
      pendingView === "events"
        ? eventPaginationRef.current
        : pendingView === "users"
          ? userPaginationRef.current
          : locationPaginationRef.current;

    if (!paginationNode) {
      pendingPaginationAnchorRef.current = null;
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      const scrollContainer = paginationNode.closest(".profile-page");

      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
        });
      } else {
        paginationNode.scrollIntoView({
          block: "end",
          inline: "nearest",
        });
      }

      pendingPaginationAnchorRef.current = null;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [safePageByView]);

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
    setSearchByView((current) => ({ ...current, [activeView]: value }));
    setPageByView((current) => ({ ...current, [activeView]: 1 }));
  };

  const handlePreviousPage = () => {
    pendingPaginationAnchorRef.current = activeView;
    setPageByView((current) => ({
      ...current,
      [activeView]: Math.max(Math.min(current[activeView], activeTotalPages) - 1, 1),
    }));
  };

  const handleNextPage = () => {
    pendingPaginationAnchorRef.current = activeView;
    setPageByView((current) => ({
      ...current,
      [activeView]: Math.min(
        Math.min(current[activeView], activeTotalPages) + 1,
        activeTotalPages,
      ),
    }));
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

  const performDeleteLocation = async (location) => {
    const locationId = location?.id;
    if (!locationId) return false;

    try {
      await deleteRecommendation({
        spotId: locationId,
      });
      onDeleteStargazeLocation?.(locationId);
      if (editingLocationId && editingLocationId === String(locationId).trim()) {
        resetLocationForm();
      }
      showNotification("Location removed", "info", { duration: 2200 });
      return true;
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not delete this location right now",
        "failure",
        { duration: 3200 },
      );
      return false;
    }
  };

  const performDeleteEvent = async (event) => {
    const eventId = String(event?.id || "").trim();
    if (!eventId) return false;

    try {
      await Promise.resolve(onDeleteStarPartyEvent?.(eventId));
      if (editingEventId && editingEventId === eventId) {
        resetEventForm();
      }
      showNotification("Event removed", "info", { duration: 2200 });
      return true;
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not delete this event right now",
        "failure",
        { duration: 3200 },
      );
      return false;
    }
  };

  const handleRequestDeleteLocation = (location) => {
    const locationId = String(location?.id || "").trim();
    if (!locationId) return;

    const locationName =
      String(location?.name || locationId || "this location").trim() || "this location";

    setPendingDelete({
      kind: "location",
      item: location,
      title: "Delete location?",
      message: `${locationName} will be removed from the curated locations list. This action cannot be undone.`,
      confirmLabel: "Delete location",
    });
  };

  const handleRequestDeleteEvent = (event) => {
    const eventId = String(event?.id || "").trim();
    if (!eventId) return;

    const eventTitle =
      String(event?.title || eventId || "this event").trim() || "this event";

    setPendingDelete({
      kind: "event",
      item: event,
      title: "Delete event?",
      message: `${eventTitle} will be removed from the event list. This action cannot be undone.`,
      confirmLabel: "Delete event",
    });
  };

  const handleCancelDelete = () => {
    if (isDeleteConfirmBusy) return;
    setPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || isDeleteConfirmBusy) return;

    setIsDeleteConfirmBusy(true);
    try {
      const didDelete =
        pendingDelete.kind === "location"
          ? await performDeleteLocation(pendingDelete.item)
          : await performDeleteEvent(pendingDelete.item);

      if (didDelete) {
        setPendingDelete(null);
      }
    } finally {
      setIsDeleteConfirmBusy(false);
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

  const handleToggleUserAdmin = async (user) => {
    const userId = String(user?.id || "").trim();
    if (!userId || userId === currentUserId) return;

    const nextIsAdmin = !user?.isAdmin;
    const targetLabel =
      String(user?.displayName || user?.name || user?.email || "User").trim() || "User";

    try {
      await saveUserAccess({
        userId,
        isAdmin: nextIsAdmin,
        role: nextIsAdmin ? "admin" : "user",
      });
      showNotification(
        nextIsAdmin
          ? `${targetLabel} now has admin access`
          : `Admin access removed from ${targetLabel}`,
        "success",
        { duration: 2400 },
      );
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not update user access right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const hero = showPlanet ? (
    <NeptuneGlobe
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
                Manage curated map spots, events, and user access.
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
              <button
                type="button"
                className={`settings-switch${
                  activeView === "users" ? " active" : ""
                }`}
                aria-pressed={activeView === "users"}
                onClick={() => setActiveView("users")}
              >
                Users
              </button>
            </div>
          </div>

          <div className="admin-summary-row">
            {adminSummaryGroups.map((group) => (
              <div
                key={group.id}
                className={`admin-summary-group admin-summary-group--${group.id}${
                  activeView === group.id ? " is-active" : ""
                }`}
              >
                <div className="admin-summary-group__title">{group.title}</div>
                <div className="admin-summary-group__stats">
                  {group.stats.map((stat) => (
                    <div
                      key={`${group.id}-${stat.label}`}
                      className="admin-summary-pill"
                    >
                      <span className="admin-summary-pill__value">{stat.value}</span>
                      <span className="admin-summary-pill__label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {activeView === "locations" ? (
            <AdminLocationsSection
              activeViewContent={activeViewContent}
              locationDraft={locationDraft}
              onLocationFieldChange={handleLocationFieldChange}
              onResetLocationForm={resetLocationForm}
              onSubmitLocation={handleSubmitLocation}
              isEditingLocation={isEditingLocation}
              activeSearchValue={activeSearchValue}
              onSearchChange={handleSearchChange}
              locationPaginationRef={locationPaginationRef}
              activeResultSummary={activeResultSummary}
              activePage={activePage}
              activeTotalPages={activeTotalPages}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              paginatedLocations={paginatedLocations}
              onRequestDeleteLocation={handleRequestDeleteLocation}
              onEditLocation={handleEditLocation}
              editingLocationId={editingLocationId}
              normalizedSearchByView={normalizedSearchByView}
            />
          ) : activeView === "events" ? (
            <AdminEventsSection
              activeViewContent={activeViewContent}
              eventDraft={eventDraft}
              onEventFieldChange={handleEventFieldChange}
              onSubmitEvent={handleSubmitEvent}
              onResetEventForm={resetEventForm}
              isEditingEvent={isEditingEvent}
              activeSearchValue={activeSearchValue}
              onSearchChange={handleSearchChange}
              eventPaginationRef={eventPaginationRef}
              activeResultSummary={activeResultSummary}
              activePage={activePage}
              activeTotalPages={activeTotalPages}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              paginatedEvents={paginatedEvents}
              onEditEvent={handleEditEvent}
              onRequestDeleteEvent={handleRequestDeleteEvent}
              onSetEventStatus={handleSetEventStatus}
              editingEventId={editingEventId}
              normalizedSearchByView={normalizedSearchByView}
            />
          ) : (
            <AdminUsersSection
              activeViewContent={activeViewContent}
              activeSearchValue={activeSearchValue}
              onSearchChange={handleSearchChange}
              userPaginationRef={userPaginationRef}
              activeResultSummary={activeResultSummary}
              activePage={activePage}
              activeTotalPages={activeTotalPages}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              usersLoadError={usersLoadError}
              areUsersLoading={areUsersLoading}
              userList={userList}
              paginatedUsers={paginatedUsers}
              currentUserId={currentUserId}
              pendingUserId={pendingUserId}
              onToggleUserAdmin={handleToggleUserAdmin}
              normalizedSearchByView={normalizedSearchByView}
            />
          )}
        </section>
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.title}
        message={pendingDelete?.message}
        confirmLabel={pendingDelete?.confirmLabel}
        cancelLabel="Keep it"
        isBusy={isDeleteConfirmBusy}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </PageShell>
  );
}

export default AdminPage;
