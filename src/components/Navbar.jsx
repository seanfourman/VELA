import "./Navbar.css";
import velaLogo from "../assets/vela.svg";
import velaLogoBlack from "../assets/vela-black.svg";
import ProfileMenu from "./ProfileMenu";

function Navbar({ mapType, auth }) {
  const isLight = mapType === "light";
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const isLoading = Boolean(auth?.isLoading);

  const authLabel = isLoading ? "Loading..." : "Sign In";

  function handleAuthClick() {
    if (isLoading) return;
    auth?.signIn?.();
  }

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
            <ProfileMenu auth={auth} isLight={isLight} />
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
