import { useEffect } from "react";
import "./StargazePanelMobile.css";

export default function StargazePanelMobile({ spot, isOpen, onClose }) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const body = document.body;
    if (!body) return undefined;
    const className = "map-ui-shifted-stargaze";

    if (isOpen) {
      body.classList.add(className);
    } else {
      body.classList.remove(className);
    }

    return () => {
      body.classList.remove(className);
    };
  }, [isOpen]);

  return (
    <div
      className={`stargaze-panel-mobile ${isOpen ? "open" : "collapsed"}`}
      aria-hidden={!isOpen}
    >
      <div className="stargaze-panel-mobile__sheet glass-panel glass-panel-elevated">
        {spot ? (
          <>
            <div className="stargaze-panel-mobile__handle" aria-hidden="true" />
            <div className="stargaze-panel-mobile__header">
              <div className="stargaze-panel-mobile__title">{spot.name}</div>
              <button
                type="button"
                className="stargaze-panel-mobile__close"
                onClick={onClose}
                aria-label="Close spot details"
              >
                <span aria-hidden="true">X</span>
              </button>
            </div>
            <div className="stargaze-panel-mobile__content">
              {spot.description ? (
                <div className="stargaze-panel-mobile__desc">
                  {spot.description}
                </div>
              ) : null}
              {spot.images && spot.images.length > 0 ? (
                <div className="stargaze-panel-mobile__images">
                  {spot.images.slice(0, 4).map((imageUrl, index) => (
                    <img
                      key={`${spot.id}-${index}`}
                      src={imageUrl}
                      alt={`${spot.name} view ${index + 1}`}
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
