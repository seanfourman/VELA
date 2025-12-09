import "./Navbar.css";
import velaLogo from "../assets/vela.svg";

function Navbar() {
  return (
    <>
      <div className="navbar-blur" />
      <nav className="navbar">
        <div className="navbar-left">
          <a href="#" className="nav-link">
            Explore
          </a>
          <a href="#" className="nav-link">
            Discover
          </a>
        </div>

        <a href="/" className="navbar-logo">
          <img src={velaLogo} alt="VELA" className="logo-img" />
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
