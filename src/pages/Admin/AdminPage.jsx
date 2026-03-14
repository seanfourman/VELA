import { useMemo } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import PageShell from "@/components/layout/PageShell";
import NeptuneGlobe from "@/components/planets/NeptuneGlobe";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import { navigateToMapHome } from "@/utils/navigation";
import useAdminUsers from "./useAdminUsers";
import AdminAccessNotice from "./components/AdminAccessNotice";
import {
  AdminEventsSection,
  AdminLocationsSection,
  AdminUsersSection,
} from "./components/AdminWorkspaceSections";
import { getAdminViewContent } from "./adminViewUtils";
import useAdminWorkspaceActions from "./hooks/useAdminWorkspaceActions";
import useAdminWorkspaceView from "./hooks/useAdminWorkspaceView";
import "@/pages/Settings/styles/SettingsPage.css";

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

  const {
    activeView,
    setActiveView,
    normalizedSearchByView,
    activeSearchValue,
    activePage,
    activeTotalPages,
    activeResultSummary,
    viewSwitcherStyle,
    adminSummaryGroups,
    paginatedLocations,
    paginatedEvents,
    paginatedUsers,
    userList,
    locationPaginationRef,
    eventPaginationRef,
    userPaginationRef,
    handleSearchChange,
    handlePreviousPage,
    handleNextPage,
  } = useAdminWorkspaceView({
    stargazeLocations,
    starPartyEvents,
    managedUsers,
  });

  const {
    locationDraft,
    eventDraft,
    editingLocationId,
    editingEventId,
    isEditingLocation,
    isEditingEvent,
    pendingDelete,
    isDeleteConfirmBusy,
    handleLocationFieldChange,
    handleEventFieldChange,
    resetLocationForm,
    resetEventForm,
    handleEditLocation,
    handleEditEvent,
    handleRequestDeleteLocation,
    handleRequestDeleteEvent,
    handleCancelDelete,
    handleConfirmDelete,
    handleSubmitLocation,
    handleSubmitEvent,
    handleSetEventStatus,
    handleToggleUserAdmin,
  } = useAdminWorkspaceActions({
    currentUserId,
    saveUserAccess,
    onSaveStargazeLocation,
    onDeleteStargazeLocation,
    onSaveStarPartyEvent,
    onDeleteStarPartyEvent,
    onSetStarPartyEventStatus,
  });

  const showPlanet = useMemo(() => isProbablyHardwareAccelerated(), []);

  const activeViewContent = useMemo(
    () =>
      getAdminViewContent({
        activeView,
        isEditingLocation,
        isEditingEvent,
      }),
    [activeView, isEditingEvent, isEditingLocation],
  );

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
                className={`settings-switch${activeView === "events" ? " active" : ""}`}
                aria-pressed={activeView === "events"}
                onClick={() => setActiveView("events")}
              >
                Events
              </button>
              <button
                type="button"
                className={`settings-switch${activeView === "users" ? " active" : ""}`}
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
