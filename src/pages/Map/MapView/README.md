# MapView Module Guide

This folder is organized so a new developer can find code by intent first.

## Structure

- `core/`
  - Shared map primitives that do not render UI.
  - Examples: map config/constants, icon definitions, interaction listeners, derived state helpers.
- `hooks/`
  - `useMap*` state and behavior orchestration.
  - Keep business behavior here, not in JSX components.
- `components/controls/`
  - Floating controls and map toggles (`MapTypeSwitcher`, `MapQuickActions`, `SearchDistanceSelector`).
- `components/search/`
  - Search input and matching UI (`LocationSearchBar` + its CSS split files).
- `components/layers/`
  - Visual layers mounted into the map (`MapLibre3DLayer`, `MarkerLayers`, `layers/markers/*`).
- `components/popups/`
  - Popup UI and popup content builders (`PopupContent`, `ContextMenuPopup`, `SkyQualityInfo`).
- `components/panels/stargaze/`
  - Stargaze details panel (desktop + mobile).
- `components/panels/spaceWeather/`
  - Space weather panel (desktop + mobile).
- `styles/`
  - Map-wide styles that are not owned by one component (`map-layout.css`, `leaflet-overrides.css`).

## Naming Rules

- Behavior/state files: `useMap...` (in `hooks/`).
- Core primitives: `map...` or `Map...` (in `core/`).
- Layer aggregators: explicit plural names (`MarkerLayers`).
- Popup content factory file: `PopupContent`.
- Global map stylesheet: `map-layout.css`.

## Where To Edit

- Pin/favorite/marker visuals: `core/markerIcons.js`
- Map interaction event wiring: `core/MapInteractionHandlers.jsx`
- Dark spot / planets / quick action behavior: `hooks/useMapActionHandlers.js`
- Search behavior: `components/search/LocationSearchBar.jsx`
- Popup body content: `components/popups/PopupContent.jsx`
- Marker rendering groups: `components/layers/MarkerLayers.jsx`
