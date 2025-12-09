import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo-text">VELA</span>
      </div>
      <div className="navbar-links">
        <a href="#" className="nav-link active">
          Home
        </a>
        <a href="#" className="nav-link">
          Explore
        </a>
        <a href="#" className="nav-link">
          About
        </a>
      </div>
      <div className="navbar-actions">
        <button className="nav-button">Get Started</button>
      </div>
    </nav>
  );
}

export default Navbar;
