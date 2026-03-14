import AdminCollectionSection from "./AdminCollectionSection";
import AdminLocationForm from "../AdminLocationForm";
import AdminLocationList from "../AdminLocationList";
import AdminEventForm from "../AdminEventForm";
import AdminEventList from "../AdminEventList";
import AdminUserList from "../AdminUserList";

export function AdminLocationsSection({
  activeViewContent,
  locationDraft,
  onLocationFieldChange,
  onResetLocationForm,
  onSubmitLocation,
  isEditingLocation,
  activeSearchValue,
  onSearchChange,
  locationPaginationRef,
  activeResultSummary,
  activePage,
  activeTotalPages,
  onPreviousPage,
  onNextPage,
  paginatedLocations,
  onRequestDeleteLocation,
  onEditLocation,
  editingLocationId,
  normalizedSearchByView,
}) {
  return (
    <>
      <div className="admin-panel-section">
        <div className="admin-panel-section__header">
          <div className="admin-panel-section__intro">
            <h3 className="admin-panel-section__title">{activeViewContent.formTitle}</h3>
            <p className="admin-panel-section__copy">{activeViewContent.formCopy}</p>
          </div>
        </div>

        <AdminLocationForm
          draft={locationDraft}
          onFieldChange={onLocationFieldChange}
          onReset={onResetLocationForm}
          onCancelEdit={onResetLocationForm}
          onSubmit={onSubmitLocation}
          isEditing={isEditingLocation}
        />
      </div>

      <div className="admin-section-separator" aria-hidden="true" />

      <AdminCollectionSection
        title={activeViewContent.collectionTitle}
        copy={activeViewContent.collectionCopy}
        searchLabel={activeViewContent.searchLabel}
        searchValue={activeSearchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={activeViewContent.searchPlaceholder}
        paginationRef={locationPaginationRef}
        resultSummary={activeResultSummary}
        page={activePage}
        totalPages={activeTotalPages}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      >
        <AdminLocationList
          locations={paginatedLocations}
          onDeleteLocation={onRequestDeleteLocation}
          onEditLocation={onEditLocation}
          activeLocationId={editingLocationId || null}
          emptyMessage={
            normalizedSearchByView.locations
              ? "No curated locations match this search"
              : "No curated locations yet"
          }
        />
      </AdminCollectionSection>
    </>
  );
}

export function AdminEventsSection({
  activeViewContent,
  eventDraft,
  onEventFieldChange,
  onSubmitEvent,
  onResetEventForm,
  isEditingEvent,
  activeSearchValue,
  onSearchChange,
  eventPaginationRef,
  activeResultSummary,
  activePage,
  activeTotalPages,
  onPreviousPage,
  onNextPage,
  paginatedEvents,
  onEditEvent,
  onRequestDeleteEvent,
  onSetEventStatus,
  editingEventId,
  normalizedSearchByView,
}) {
  return (
    <>
      <div className="admin-panel-section">
        <div className="admin-panel-section__header">
          <div className="admin-panel-section__intro">
            <h3 className="admin-panel-section__title">{activeViewContent.formTitle}</h3>
            <p className="admin-panel-section__copy">{activeViewContent.formCopy}</p>
          </div>
        </div>

        <AdminEventForm
          draft={eventDraft}
          onFieldChange={onEventFieldChange}
          onSubmit={onSubmitEvent}
          onReset={onResetEventForm}
          onCancelEdit={onResetEventForm}
          isEditing={isEditingEvent}
        />
      </div>

      <div className="admin-section-separator" aria-hidden="true" />

      <AdminCollectionSection
        title={activeViewContent.collectionTitle}
        copy={activeViewContent.collectionCopy}
        searchLabel={activeViewContent.searchLabel}
        searchValue={activeSearchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={activeViewContent.searchPlaceholder}
        paginationRef={eventPaginationRef}
        resultSummary={activeResultSummary}
        page={activePage}
        totalPages={activeTotalPages}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      >
        <AdminEventList
          events={paginatedEvents}
          onEditEvent={onEditEvent}
          onDeleteEvent={onRequestDeleteEvent}
          onSetStatus={onSetEventStatus}
          activeEventId={editingEventId || null}
          emptyMessage={
            normalizedSearchByView.events
              ? "No events match this search"
              : "No events created yet"
          }
        />
      </AdminCollectionSection>
    </>
  );
}

export function AdminUsersSection({
  activeViewContent,
  activeSearchValue,
  onSearchChange,
  userPaginationRef,
  activeResultSummary,
  activePage,
  activeTotalPages,
  onPreviousPage,
  onNextPage,
  usersLoadError,
  areUsersLoading,
  userList,
  paginatedUsers,
  currentUserId,
  pendingUserId,
  onToggleUserAdmin,
  normalizedSearchByView,
}) {
  return (
    <AdminCollectionSection
      title={activeViewContent.collectionTitle}
      copy={activeViewContent.collectionCopy}
      searchLabel={activeViewContent.searchLabel}
      searchValue={activeSearchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={activeViewContent.searchPlaceholder}
      paginationRef={userPaginationRef}
      resultSummary={activeResultSummary}
      page={activePage}
      totalPages={activeTotalPages}
      onPreviousPage={onPreviousPage}
      onNextPage={onNextPage}
    >
      {usersLoadError ? (
        <div className="admin-inline-feedback">
          <div className="profile-readonly admin-inline-feedback__message">
            {usersLoadError}
          </div>
        </div>
      ) : null}

      {areUsersLoading && !userList.length ? (
        <div className="profile-readonly">Loading users...</div>
      ) : (
        <AdminUserList
          users={paginatedUsers}
          currentUserId={currentUserId || null}
          pendingUserId={pendingUserId || null}
          onToggleAdmin={onToggleUserAdmin}
          emptyMessage={
            normalizedSearchByView.users
              ? "No users match this search"
              : "No users available yet"
          }
        />
      )}
    </AdminCollectionSection>
  );
}
