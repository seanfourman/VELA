import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./styles/Navbar.css";
import velaLogo from "@/assets/vela.svg";
import velaLogoBlack from "@/assets/vela-black.svg";
import ProfileMenu from "./ProfileMenu";

const NAV_LINKS = [
  { id: "discover", label: "Discovery", path: "/discover" },
  {
    id: "constellations",
    label: "Constellations",
    path: "/constellations",
    requiresHardwareAcceleration: true,
  },
  {
    id: "moon-phase",
    label: "Moon Phase",
    path: "/moon-phase",
    requiresHardwareAcceleration: true,
  },
  {
    id: "solar-system",
    label: "Solar System",
    path: "/solar-system",
    requiresHardwareAcceleration: true,
  },
];

function Navbar({
  mapType,
  forceLight = false,
  satelliteReadableShadowsEnabled = true,
  hardwareAccelerationEnabled = true,
  auth,
  profile,
  isAdmin,
  onNavigate,
  currentRoute,
}) {
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const currentPath =
    typeof currentRoute === "string"
      ? currentRoute
      : window.location.pathname;
  const isHome = currentPath === "/";
  const isLight = isHome && (forceLight || mapType === "light");
  const isSatellite = isHome && !forceLight && mapType === "satellite";
  const isSatelliteReadable = isSatellite && satelliteReadableShadowsEnabled;
  const isAuthScreen = currentPath === "/auth";
  const logoSrc = !isHome ? velaLogo : isLight ? velaLogoBlack : velaLogo;
  const navbarToneClasses = [
    isLight ? "light" : "",
    isSatellite ? "satellite" : "",
    isSatelliteReadable ? "satellite-readable" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const mobileMenuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  function handleAuthClick() {
    closeMobileMenu();
    onNavigate?.("/auth");
  }

  const handleNavigate = (event, path) => {
    if (!onNavigate) return;
    event.preventDefault();
    closeMobileMenu();
    onNavigate(path);
  };

  useEffect(() => {
    if (!mobileMenuVisible) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (mobileMenuRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      closeMobileMenu();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuVisible, closeMobileMenu]);

  useEffect(() => {
    if (mobileMenuOpen || !mobileMenuVisible) return undefined;

    const timeout = setTimeout(() => {
      setMobileMenuVisible(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [mobileMenuOpen, mobileMenuVisible]);

  const toggleMobileMenu = () => {
    if (!mobileMenuVisible || !mobileMenuOpen) {
      setMobileMenuVisible(true);
      setMobileMenuOpen(true);
      return;
    }
    setMobileMenuOpen(false);
  };

  const handleNavItemClick = (item) => {
    closeMobileMenu();
    if (item.path) {
      onNavigate?.(item.path);
    }
  };

  const leftNavLinks = NAV_LINKS.slice(0, Math.ceil(NAV_LINKS.length / 2));
  const rightNavLinks = NAV_LINKS.slice(Math.ceil(NAV_LINKS.length / 2));

  const renderPlaceholderLink = (item, className = "nav-link") => {
    const isDisabled =
      item.requiresHardwareAcceleration && !hardwareAccelerationEnabled;
    const isActive = !isDisabled && item.path && currentPath === item.path;
    const disabledTooltip = isDisabled
      ? `${item.label} requires hardware acceleration`
      : undefined;

    return (
      <button
        key={item.id}
        type="button"
        className={`${className} nav-link-button${isActive ? " is-active" : ""}${
          isDisabled ? " is-disabled" : ""
        }`}
        onClick={() => handleNavItemClick(item)}
        aria-disabled={isDisabled}
        data-tooltip={disabledTooltip}
      >
        {item.label}
      </button>
    );
  };

  return (
    <>
      <div className={`navbar-blur${navbarToneClasses ? ` ${navbarToneClasses}` : ""}`} />
      <nav className={`navbar${navbarToneClasses ? ` ${navbarToneClasses}` : ""}`}>
        <div className="navbar-left">
          <div className="profile-menu-container navbar-menu-container">
            <button
              ref={menuButtonRef}
              type="button"
              className={`profile-trigger navbar-menu-toggle${
                mobileMenuOpen ? " is-open" : ""
              }`}
              aria-expanded={mobileMenuOpen}
              aria-controls="navbar-mobile-menu"
              aria-label="Open navigation menu"
              onClick={toggleMobileMenu}
            >
              <span />
              <span />
              <span />
            </button>

            {mobileMenuVisible ? (
              <div
                id="navbar-mobile-menu"
                ref={mobileMenuRef}
                className={`profile-dropdown navbar-mobile-menu ${
                  mobileMenuOpen ? "open" : "closing"
                }`}
              >
                <div className="profile-actions navbar-mobile-actions">
                  {NAV_LINKS.map((item) =>
                    renderPlaceholderLink(item, "profile-action navbar-mobile-link"),
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="navbar-center-band">
          <div className="navbar-link-group navbar-link-group--left">
            {leftNavLinks.map((item) => renderPlaceholderLink(item))}
          </div>

          {isHome ? (
            <div className="navbar-logo disabled">
              <img
                src={logoSrc}
                alt="VELA"
                className="logo-img"
              />
            </div>
          ) : (
            <Link
              to="/"
              className="navbar-logo"
              onClick={(event) => handleNavigate(event, "/")}
            >
              <img
                src={logoSrc}
                alt="VELA"
                className="logo-img"
              />
            </Link>
          )}

          <div className="navbar-link-group navbar-link-group--right">
            {rightNavLinks.map((item) => renderPlaceholderLink(item))}
          </div>
        </div>

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
