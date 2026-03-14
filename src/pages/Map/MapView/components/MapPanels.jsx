import StargazePanelContent from "./panels/stargaze/StargazePanelContent";
import StargazePanelMobile from "./panels/stargaze/StargazePanelMobile";

export default function MapPanels({ state, ui, directionsProvider, handlers }) {
  return (
    <>
      <aside
        className={`stargaze-panel glass-panel glass-panel-elevated${
          state.isStargazePanelOpen && !ui.isMobileView ? " open" : ""
        }`}
        aria-hidden={!(state.isStargazePanelOpen && !ui.isMobileView)}
      >
        {state.stargazePanelSpot ? (
          <>
            <div className="stargaze-panel__header">
              <div className="stargaze-panel__header-main">
                <div className="stargaze-panel__title">
                  {state.stargazePanelSpot.name}
                </div>
                {state.stargazePanelSpot.region || state.stargazePanelSpot.country ? (
                  <div className="stargaze-panel__subtitle">
                    {[state.stargazePanelSpot.region, state.stargazePanelSpot.country]
                      .filter(Boolean)
                      .join(" - ")}
                  </div>
                ) : null}
                {state.stargazePanelSpot.type ? (
                  <div className="stargaze-panel__chips">
                    <span className="stargaze-panel__chip">
                      {state.stargazePanelSpot.type}
                    </span>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="stargaze-panel__close"
                onClick={handlers.handleCloseStargazePanel}
                aria-label="Close spot details"
              >
                <span aria-hidden="true">X</span>
              </button>
            </div>
            <StargazePanelContent
              spot={state.stargazePanelSpot}
              directionsProvider={directionsProvider}
            />
          </>
        ) : null}
      </aside>
      <StargazePanelMobile
        spot={state.stargazePanelSpot}
        isOpen={state.isStargazePanelOpen && ui.isMobileView}
        onClose={handlers.handleCloseStargazePanel}
        directionsProvider={directionsProvider}
      />
    </>
  );
}
