import { useCallback, useEffect, useRef, useState } from "react";
import userIcon from "../assets/icons/user-icon.svg";
import "./ProfileMenu.css";

function ProfileMenu({ auth, isLight, profile, isAdmin, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const avatarButtonRef = useRef(null);
  const menuRef = useRef(null);

  const profileDisplayName =
    typeof profile?.displayName === "string" ? profile.displayName.trim() : "";
  const profileAvatarUrl =
    typeof profile?.avatarUrl === "string" ? profile.avatarUrl.trim() : "";
  const displayName =
    profileDisplayName ||
    auth?.user?.name ||
    auth?.user?.email ||
    auth?.user?.preferred_username;
  const userEmail = auth?.user?.email;
  const avatarUrl = profileAvatarUrl || auth?.user?.picture;
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const handleMenuNavigate = (event, path) => {
    if (onNavigate) {
      event.preventDefault();
      closeMenu();
      onNavigate(path);
      return;
    }
    closeMenu();
  };

  const toggleMenu = () => {
    if (!menuVisible || !menuOpen) {
      setMenuVisible(true);
      setMenuOpen(true);
      return;
    }
    setMenuOpen(false);
  };

  const handleSignOut = () => {
    closeMenu();
    auth?.signOut?.();
  };

  useEffect(() => {
    if (!menuVisible) return;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuVisible, closeMenu]);

  useEffect(() => {
    if (menuOpen || !menuVisible) return undefined;

    const timeout = setTimeout(() => {
      setMenuVisible(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [menuOpen, menuVisible]);

  useEffect(() => {
    if (!auth?.isAuthenticated) {
      setMenuOpen(false);
      setMenuVisible(false);
    }
  }, [auth?.isAuthenticated]);

  return (
    <div className="profile-menu-container">
      <button
        type="button"
        className={`profile-trigger ${menuOpen ? "open" : ""}`}
        onClick={toggleMenu}
        ref={avatarButtonRef}
        aria-haspopup="true"
        aria-expanded={menuOpen}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile" className="profile-avatar" />
        ) : (
          <span className="profile-initial">
            <img src={userIcon} alt="User" className="profile-icon" />
          </span>
        )}
      </button>

      {menuVisible && (
        <div
          className={`profile-dropdown ${isLight ? "light" : ""} ${
            menuOpen ? "open" : "closing"
          }`}
          ref={menuRef}
        >
          <div className="profile-meta">
            <div className="profile-name">{displayName || "Signed In"}</div>
            {userEmail ? <div className="profile-email">{userEmail}</div> : null}
          </div>

          <div className="profile-actions">
            <a
              href="/profile"
              className="profile-action"
              onClick={(event) => handleMenuNavigate(event, "/profile")}
            >
              Profile
            </a>
            <a
              href="/settings"
              className="profile-action"
              onClick={(event) => handleMenuNavigate(event, "/settings")}
            >
              Settings
            </a>
            {isAdmin ? (
              <a
                href="/admin"
                className="profile-action"
                onClick={(event) => handleMenuNavigate(event, "/admin")}
              >
                Admin Panel
              </a>
            ) : null}
            <button
              type="button"
              className="profile-action logout"
              onClick={handleSignOut}
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
