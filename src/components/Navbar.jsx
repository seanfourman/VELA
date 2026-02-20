import "./Navbar.css";
import velaLogo from "../assets/vela.svg";
import velaLogoBlack from "../assets/vela-black.svg";
import ProfileMenu from "./ProfileMenu";

function Navbar({ mapType, auth, profile, isAdmin, onNavigate, currentRoute }) {
  const isLight = mapType === "light";
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const currentPath =
    typeof currentRoute === "string"
      ? currentRoute
      : window.location.pathname;
  const isHome = currentPath === "/";
  const isAuthScreen = currentPath === "/auth";
  const logoSrc = !isHome ? velaLogo : isLight ? velaLogoBlack : velaLogo;

  function handleAuthClick() {
    onNavigate?.("/auth");
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
              src={logoSrc}
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
              src={logoSrc}
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
          ) : !isAuthScreen ? (
            <button
              className="auth-button"
              onClick={handleAuthClick}
              type="button"
            >
              Log In
            </button>
          ) : null}
        </div>
      </nav>
    </>
  );
}

export default Navbar;
