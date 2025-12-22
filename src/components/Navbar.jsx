import "./Navbar.css";
import velaLogo from "../assets/vela.svg";
import velaLogoBlack from "../assets/vela-black.svg";
import ProfileMenu from "./ProfileMenu";

function Navbar({ mapType, auth, profile, isAdmin, onNavigate, currentRoute }) {
  const isLight = mapType === "light";
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const isLoading = Boolean(auth?.isLoading);
  const isHome =
    typeof currentRoute === "string"
      ? currentRoute === "/"
      : window.location.pathname === "/";

  function handleAuthClick() {
    if (isLoading) return;
    auth?.signIn?.();
  }

  const handleNavigate = (event, path) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(path);
  };

  return (
    <>
      <div className={`navbar-blur ${isLight ? "light" : ""}`} />
      <nav className={`navbar ${isLight ? "light" : ""}`}>
        <div className="navbar-left"></div>

        {isHome ? (
          <div className="navbar-logo disabled">
            <img
              src={isLight ? velaLogoBlack : velaLogo}
              alt="VELA"
              className="logo-img"
            />
          </div>
        ) : (
          <a
            href="/"
            className="navbar-logo"
            onClick={(event) => handleNavigate(event, "/")}
          >
            <img
              src={isLight ? velaLogoBlack : velaLogo}
              alt="VELA"
              className="logo-img"
            />
          </a>
        )}

        <div className="navbar-right">
          {isAuthenticated ? (
            <ProfileMenu
              auth={auth}
              profile={profile}
              isAdmin={isAdmin}
              isLight={isLight}
              onNavigate={onNavigate}
            />
          ) : (
            <button
              className="auth-button"
              onClick={handleAuthClick}
              disabled={isLoading}
              type="button"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

export default Navbar;
