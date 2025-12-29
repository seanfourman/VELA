import { useEffect } from "react";
import StargazePanelContent from "./StargazePanelContent";
import "./StargazePanelMobile.css";

export default function StargazePanelMobile({
  spot,
  isOpen,
  onClose,
  directionsProvider,
}) {
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
      onClick={onClose}
    >
      <div
        className="stargaze-panel-mobile__sheet glass-panel glass-panel-elevated"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {spot ? (
          <>
            <div className="stargaze-panel__header">
              <div className="stargaze-panel__header-main">
                <div className="stargaze-panel__title">{spot.name}</div>
                {spot.region || spot.country ? (
                  <div className="stargaze-panel__subtitle">
                    {[spot.region, spot.country].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
                {spot.type ? (
                  <div className="stargaze-panel__chips">
                    <span className="stargaze-panel__chip">{spot.type}</span>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="stargaze-panel__close"
                onClick={onClose}
                aria-label="Close spot details"
              >
                <span aria-hidden="true">X</span>
              </button>
            </div>
            <StargazePanelContent
              spot={spot}
              directionsProvider={directionsProvider}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
