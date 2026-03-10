export default function AdminLocationList({
  locations,
  onDeleteLocation,
  onEditLocation,
  activeLocationId = null,
  emptyMessage = "No curated locations yet",
}) {
  return (
    <div className="admin-location-list">
      {locations.length === 0 ? (
        <div className="profile-readonly">{emptyMessage}</div>
      ) : (
        locations.map((location) => {
          const locationId = String(location.id || "").trim();
          const isEditing =
            Boolean(activeLocationId) &&
            Boolean(locationId) &&
            activeLocationId === locationId;
          const metaDetails = [
            location.region,
            location.country,
            location.type,
            location.bestTime,
          ].filter(Boolean);

          return (
            <div
              key={location.id}
              className={`admin-location-card${isEditing ? " is-editing" : ""}`}
            >
              <div className="admin-location-card-header">
                <div className="admin-location-content">
                  <div className="admin-location-title-row">
                    <div className="admin-location-title">{location.name}</div>
                    {isEditing ? (
                      <span className="admin-meta-chip admin-meta-chip--status admin-meta-chip--status-draft">
                        Editing
                      </span>
                    ) : null}
                  </div>
                  <div className="admin-location-meta admin-location-meta--coords">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </div>
                  {location.id ? (
                    <div className="admin-location-id">{location.id}</div>
                  ) : null}
                  {metaDetails.length > 0 ? (
                    <div className="admin-location-chip-row">
                      {metaDetails.map((detail, index) => (
                        <span
                          key={`${location.id || location.name}-meta-${index}`}
                          className="admin-meta-chip"
                        >
                          {detail}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="admin-location-actions">
                  {onEditLocation ? (
                    <button
                      type="button"
                      className="glass-btn profile-action-btn admin-card-btn admin-card-btn--primary"
                      onClick={() => onEditLocation(location)}
                      disabled={isEditing}
                    >
                      {isEditing ? "Editing" : "Edit"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="glass-btn profile-action-btn admin-card-btn admin-card-btn--danger"
                    onClick={() => onDeleteLocation(location)}
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
  );
}
