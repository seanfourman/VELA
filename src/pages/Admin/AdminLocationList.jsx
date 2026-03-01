export default function AdminLocationList({
  locations,
  onDeleteLocation,
  onEditLocation,
  activeLocationId = null,
}) {
  return (
    <div className="admin-location-list">
      {locations.length === 0 ? (
        <div className="profile-readonly">No curated locations yet.</div>
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
                <div>
                  <div className="admin-location-title">{location.name}</div>
                  <div className="admin-location-meta">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </div>
                  {location.id ? (
                    <div className="admin-location-meta">{location.id}</div>
                  ) : null}
                  {metaDetails.length > 0 ? (
                    <div className="admin-location-meta">
                      {metaDetails.join(" | ")}
                    </div>
                  ) : null}
                </div>
                <div className="admin-location-actions">
                  {onEditLocation ? (
                    <button
                      type="button"
                      className="glass-btn profile-action-btn"
                      onClick={() => onEditLocation(location)}
                      disabled={isEditing}
                    >
                      {isEditing ? "Editing" : "Edit"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="glass-btn profile-action-btn"
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
