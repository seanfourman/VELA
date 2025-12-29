import StargazePanelContent from "./StargazePanelContent";
import "./StargazePanel.css";

export default function StargazePanel({
  spot,
  isOpen,
  onClose,
  directionsProvider,
}) {
  return (
    <aside
      className={`stargaze-panel glass-panel glass-panel-elevated${
        isOpen ? " open" : ""
      }`}
      aria-hidden={!isOpen}
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
    </aside>
  );
}
