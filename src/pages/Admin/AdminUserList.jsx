import { formatDateTime } from "@/utils/dateTime";

const resolveDisplayName = (user) =>
  user.displayName || user.name || user.email || "Unknown user";

export default function AdminUserList({
  users,
  currentUserId = null,
  pendingUserId = null,
  onToggleAdmin,
  emptyMessage = "No users found",
}) {
  if (!Array.isArray(users) || users.length === 0) {
    return <div className="profile-readonly">{emptyMessage}</div>;
  }

  return (
    <div className="admin-location-list">
      {users.map((user) => {
        const userId = String(user.id || "").trim();
        const isCurrentUser = Boolean(currentUserId) && currentUserId === userId;
        const isPending = Boolean(pendingUserId) && pendingUserId === userId;
        const accessActionLabel = user.isAdmin ? "Remove admin" : "Make admin";

        return (
          <article key={userId} className="admin-location-card admin-user-card">
            <div className="admin-location-card-header">
              <div className="admin-location-content admin-user-content">
                <div className="admin-location-title-row">
                  <div className="admin-location-title">
                    {resolveDisplayName(user)}
                  </div>
                  {isCurrentUser ? (
                    <span className="admin-meta-chip admin-meta-chip--status admin-meta-chip--status-draft">
                      You
                    </span>
                  ) : null}
                </div>
                <div className="admin-user-email">{user.email}</div>
                <div className="admin-location-chip-row">
                  <span
                    className={`admin-meta-chip admin-meta-chip--status ${
                      user.isAdmin
                        ? "admin-meta-chip--status-published"
                        : "admin-meta-chip--status-archived"
                    }`}
                  >
                    {user.isAdmin ? "Admin" : "User"}
                  </span>
                  <span className="admin-meta-chip">
                    Joined {formatDateTime(user.createdAtUtc, { includeYear: true })}
                  </span>
                </div>
                {user.bio ? <p className="admin-card-note">{user.bio}</p> : null}
              </div>

              <div className="admin-location-actions">
                <button
                  type="button"
                  className={`glass-btn profile-action-btn admin-card-btn ${
                    user.isAdmin ? "admin-card-btn--soft" : "admin-card-btn--primary"
                  }`}
                  onClick={() => onToggleAdmin?.(user)}
                  disabled={isCurrentUser || isPending}
                >
                  {isPending ? "Saving..." : isCurrentUser ? "Current account" : accessActionLabel}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
