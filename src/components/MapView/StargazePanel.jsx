import "./StargazePanel.css";

export default function StargazePanel({ spot, isOpen, onClose }) {
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
            <div className="stargaze-panel__title">{spot.name}</div>
            <button
              type="button"
              className="stargaze-panel__close"
              onClick={onClose}
              aria-label="Close spot details"
            >
              <span aria-hidden="true">X</span>
            </button>
          </div>
          <div className="stargaze-panel__content">
            {spot.description ? (
              <div className="stargaze-panel__desc">{spot.description}</div>
            ) : null}
            {spot.images && spot.images.length > 0 ? (
              <div className="stargaze-panel__images">
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
    </aside>
  );
}
