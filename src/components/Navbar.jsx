import { useEffect, useRef, useState } from "react";
import "./Navbar.css";
import velaLogo from "../assets/vela.svg";
import velaLogoBlack from "../assets/vela-black.svg";

function Navbar({ mapType, auth }) {
  const isLight = mapType === "light";
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const isLoading = Boolean(auth?.isLoading);
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarButtonRef = useRef(null);
  const menuRef = useRef(null);

  const displayName =
    auth?.user?.name || auth?.user?.email || auth?.user?.preferred_username;
  const userEmail = auth?.user?.email;
  const avatarUrl = auth?.user?.picture;
  const userInitial = String(
    displayName || auth?.user?.email || auth?.user?.given_name || "U"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  const authLabel = isLoading ? "Loading..." : "Sign In";

  function handleAuthClick() {
    if (isLoading) return;
    if (isAuthenticated) {
      auth?.signOut?.();
      return;
    }
    auth?.signIn?.();
  }

  function handleSignOut() {
    if (isLoading) return;
    setMenuOpen(false);
    auth?.signOut?.();
  }

  function toggleMenu() {
    if (isLoading) return;
    setMenuOpen((previous) => !previous);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event) {
      const target = event.target;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMenuOpen(false);
    }
  }, [isAuthenticated]);

  return (
    <>
      <div className={`navbar-blur ${isLight ? "light" : ""}`} />
      <nav className={`navbar ${isLight ? "light" : ""}`}>
        <div className="navbar-left"></div>

        {window.location.pathname === "/" ? (
          <div className="navbar-logo disabled">
            <img
              src={isLight ? velaLogoBlack : velaLogo}
              alt="VELA"
              className="logo-img"
            />
          </div>
        ) : (
          <a href="/" className="navbar-logo">
            <img
              src={isLight ? velaLogoBlack : velaLogo}
              alt="VELA"
              className="logo-img"
            />
          </a>
        )}

        <div className="navbar-right">
          {isAuthenticated ? (
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
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="profile-avatar"
                  />
                ) : (
                  <span className="profile-initial">{userInitial}</span>
                )}
              </button>

              {menuOpen && (
                <div
                  className={`profile-dropdown ${isLight ? "light" : ""}`}
                  ref={menuRef}
                >
                  <div className="profile-meta">
                    <div className="profile-name">
                      {displayName || "Signed In"}
                    </div>
                    {userEmail ? (
                      <div className="profile-email">{userEmail}</div>
                    ) : null}
                  </div>

                  <div className="profile-actions">
                    <a
                      href="/profile"
                      className="profile-action"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile
                    </a>
                    <a
                      href="/admin"
                      className="profile-action"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin Panel
                    </a>
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
          ) : (
            <button
              className="auth-button"
              onClick={handleAuthClick}
              disabled={isLoading}
              type="button"
            >
              {authLabel}
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

export default Navbar;
