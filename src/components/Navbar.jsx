import "./Navbar.css";
import velaLogo from "../assets/vela.svg";
import velaLogoBlack from "../assets/vela-black.svg";

function Navbar({ mapType, auth }) {
  const isLight = mapType === "light";
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const isLoading = Boolean(auth?.isLoading);

  const authLabel = isLoading ? "Loading..." : isAuthenticated ? "Sign Out" : "Sign In";

  function handleAuthClick() {
    if (isLoading) return;
    if (isAuthenticated) {
      auth?.signOut?.();
      return;
    }
    auth?.signIn?.();
  }

  return (
    <>
      <div className={`navbar-blur ${isLight ? "light" : ""}`} />
      <nav className={`navbar ${isLight ? "light" : ""}`}>
        <div className="navbar-left">
          <a href="#" className="nav-link">
            Explore
          </a>
          <a href="#" className="nav-link">
            Discover
          </a>
        </div>

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
          <a href="#" className="nav-link">
            About
          </a>
          <button
            className="auth-button"
            onClick={handleAuthClick}
            disabled={isLoading}
            type="button"
          >
            {authLabel}
          </button>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
