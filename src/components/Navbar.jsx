import "./Navbar.css";
import velaLogo from "../assets/vela.svg";
import velaLogoBlack from "../assets/vela-black.svg";

function Navbar({ mapType }) {
  const isLight = mapType === "light";

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

        <a href="/" className="navbar-logo">
          <img
            src={isLight ? velaLogoBlack : velaLogo}
            alt="VELA"
            className="logo-img"
          />
        </a>

        <div className="navbar-right">
          <a href="#" className="nav-link">
            About
          </a>
          <button className="auth-button">Sign In</button>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
