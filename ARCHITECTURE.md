# VELA Architecture

VELA is a stargazing web application built as a React single-page app backed by an ASP.NET Core Web API and SQL Server. The product centers on an interactive world map, dark-sky search, sky-quality sampling, visible-planet lookup, saved favorites, and admin-managed community content.

This document is the code-facing architecture reference for the current repository state.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Runtime Flows](#2-runtime-flows)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Data, Storage, and Caching](#7-data-storage-and-caching)
8. [Configuration](#8-configuration)
9. [Database Architecture](#9-database-architecture)
10. [Local Development and Build](#10-local-development-and-build)
11. [API Surface](#11-api-surface)
12. [Operational Notes and Constraints](#12-operational-notes-and-constraints)

---

## 1. System Overview

At a high level, VELA is split into three layers:

- React/Vite frontend in `src/`
- ASP.NET Core 9 API in `backend/src/Vela.Api/`
- SQL Server schema and stored procedures in `backend/src/Vela.Api/Database/`

The map and astronomy experiences are supported by two important backend-side proxy/data services:

- `MapTilerProxyService` keeps the MapTiler API key off the client
- `WorldAtlasService` reads the World Atlas 2015 GeoTIFF and serves sky-quality, dark-spot, and lightmap data

### High-level topology

```text
+-----------------------+        HTTP/JSON         +------------------------+
| React SPA             | -----------------------> | ASP.NET Core API       |
| Vite + React Router   | <----------------------- | Controllers + BL + DAL |
| Leaflet / MapLibre    |                          | Proxy + World Atlas    |
+-----------+-----------+                          +-----------+------------+
            |                                                  |
            |                                                  |
            |                                         SQL Server stored procs
            |                                                  |
            v                                                  v
+-----------------------+                          +------------------------+
| External map tiles    |                          | SQL Server             |
| via /api/maptiler     |                          | Users / Favorites /    |
+-----------------------+                          | Recommendations /      |
                                                   | StarPartyEvents        |
                                                   +------------------------+

+-----------------------+          +------------------------+
| visibleplanets.dev    | <------  | VisiblePlanetsService  |
+-----------------------+          +------------------------+

+-----------------------+          +------------------------+
| World_Atlas_2015.tif  | <------  | WorldAtlasService      |
| land-10m.geojson      |          | GeoTIFF + GeoJSON      |
| countries-10m.geojson |          +------------------------+
+-----------------------+
```

### Architectural characteristics

- SPA routing uses `createHashRouter`, so the app can be hosted without server-side rewrite rules.
- The backend is intentionally thin at the HTTP layer and pushes domain work into static business-logic classes and ADO.NET DAL classes.
- Database access is stored-procedure-only. There is no ORM.
- The frontend persists small pieces of session and preference state in `localStorage`.
- The map UI is hybrid:
  - 2D mode uses Leaflet tile layers
  - 3D mode embeds MapLibre GL inside Leaflet with `@maplibre/maplibre-gl-leaflet`
- Several features are designed to stay responsive with caching at multiple layers:
  - backend memory cache
  - frontend `localStorage` cache
  - service-worker tile cache

---

## 2. Runtime Flows

### 2.1 Application bootstrap

1. `index.html` loads the Vite bundle.
2. [`src/main.jsx`](src/main.jsx) mounts `NotificationProvider` and `RouterProvider`.
3. A service worker from [`public/sw.js`](public/sw.js) is registered on `window.load`.
4. The root router loader (`appBootstrapLoader`) fetches:
   - `GET /api/recommendations`
   - `GET /api/star-party-events`
5. [`src/layouts/AppLayout.jsx`](src/layouts/AppLayout.jsx) initializes:
   - auth session validation
   - user preferences
   - geolocation tracking
   - shared route data and handlers
6. The active route renders inside the shared layout and navbar shell.

### 2.2 Authentication flow

```text
AuthPage form submit
  -> router action (authAction)
    -> POST /api/users/login or /api/users/register
      -> UsersController
        -> RequestValidator
        -> BL.User
        -> DAL.UserService
        -> SQL stored procedures
    <- { token, expiresAtUtc, user }
  -> useAuth.applySession()
    -> persist to localStorage
    -> validate token with GET /api/users/me
    -> update in-memory auth state
```

### 2.3 Map interaction flow

Typical map interactions are coordinated by [`src/pages/Map/MapView.jsx`](src/pages/Map/MapView.jsx) and `useMapViewState`.

- Double-click desktop or long-press mobile:
  - places a temporary marker
  - opens a contextual popup
  - can trigger visible-planet lookup
- "Find dark spots":
  - calls `GET /api/darkspots`
  - backend scans the world atlas in a bounded raster window
  - results are filtered and spaced apart before being returned
- Sky quality popup:
  - calls `GET /api/skyquality`
  - backend samples the GeoTIFF at a single coordinate
- 3D map toggle:
  - swaps the Leaflet raster layer for a MapLibre GL layer
  - 3D labels and style data still flow through the backend MapTiler proxy

### 2.4 Favorites flow

```text
Authenticated user toggles favorite
  -> frontend performs optimistic update
  -> POST /api/favorites or DELETE /api/favorites/{spotId}
    -> FavoritesController
      -> BL.Favorite
      -> DAL.FavoriteService
      -> favorite stored procedures
  <- updated favorite state reflected on map and discovery page
```

Favorite names can be updated through `PUT /api/favorites/{spotId}` and are surfaced both on map markers and in the Discovery page.

### 2.5 Star party flow

- Public users can list event payloads through `GET /api/star-party-events`
- Admins can create/update/delete events and change status
- Authenticated users can RSVP toggle via `POST /api/star-party-events/{id}/rsvp/toggle`
- Discovery and Map pages both consume the shared event list from `AppLayout`

### 2.6 Discovery flow

[`src/pages/Discovery/DiscoveryPage.jsx`](src/pages/Discovery/DiscoveryPage.jsx) combines:

- bootstrapped recommendations and star-party events
- local favorite cache
- live dark-spot lookup
- live sky-quality lookup
- route navigation back to specific map selections

This page is effectively a derived-view layer over existing map, favorites, and events data.

---

## 3. Technology Stack

### Frontend

| Technology | Role |
|---|---|
| React 19 | UI runtime |
| Vite 7 | Dev server and build pipeline |
| React Router 7 | Hash-based SPA routing, loaders, and actions |
| Leaflet + React-Leaflet | Primary 2D map |
| MapLibre GL + `@maplibre/maplibre-gl-leaflet` | 3D map layer |
| Three.js + `@react-three/fiber` + `@react-three/drei` | Planet globes, moon phase, solar system |
| MUI 7 | Discovery and Moon Phase UI components |
| Vanilla CSS | Global tokens, layout, glass styling, feature CSS |

### Backend

| Technology | Role |
|---|---|
| ASP.NET Core 9 | Web API host |
| JWT Bearer Auth | Authentication and role-based authorization |
| BCrypt.Net-Next | Password hashing |
| `System.Data.SqlClient` | ADO.NET data access |
| SQL Server stored procedures | Persistence boundary |
| BitMiracle.LibTiff.NET | GeoTIFF metadata and raster reads |
| NetTopologySuite | Land mask and country boundary geometry |
| SixLabors.ImageSharp | Lightmap tile rendering |
| `IMemoryCache` | Backend response caching |

### External services and datasets

| Dependency | Role |
|---|---|
| MapTiler | Base map styles and raster tiles |
| visibleplanets.dev | Visible planets API |
| World Atlas 2015 TIFF | Light pollution source dataset |
| `land-10m.geojson` | Land mask |
| `countries-10m.geojson` | Country boundary filtering |

---

## 4. Repository Structure

```text
VELA/
|-- ARCHITECTURE.md
|-- README.md
|-- package.json
|-- vite.config.js
|-- index.html
|-- public/
|   |-- sw.js
|
|-- src/
|   |-- main.jsx
|   |-- router.jsx
|   |-- layouts/
|   |   |-- AppLayout.jsx
|   |-- components/
|   |-- features/
|   |   |-- auth/
|   |   |-- app/hooks/
|   |   |-- map/
|   |   |-- notifications/
|   |   |-- starParty/
|   |-- pages/
|   |-- utils/
|   |-- styles/
|   |-- assets/
|
|-- backend/src/Vela.Api/
|   |-- Program.cs
|   |-- Controllers/
|   |-- BL/
|   |-- DAL/
|   |-- DTOs/
|   |-- Models/
|   |-- Application/
|   |   |-- WorldAtlas/
|   |-- Configuration/
|   |-- Data/
|   |-- Database/
|
|-- data/
|   |-- World_Atlas_2015.tif
```

### Frontend module boundaries

- `layouts/`
  - shared app shell and global route context
- `features/`
  - reusable cross-page logic such as auth, notifications, and app state hooks
- `pages/`
  - route-level features and their local subcomponents
- `utils/`
  - API clients, storage helpers, formatting, navigation, hardware checks

### Backend module boundaries

- `Controllers/`
  - HTTP boundary and auth attributes
- `BL/`
  - business rules, normalization, orchestration
- `DAL/`
  - SQL connection and stored-procedure calls
- `Application/`
  - non-database services such as raster processing and proxying external APIs
- `Database/`
  - tables, stored procedures, seed SQL

---

## 5. Backend Architecture

### 5.1 Startup and middleware

[`backend/src/Vela.Api/Program.cs`](backend/src/Vela.Api/Program.cs) configures:

- controllers with enum string serialization
- Swagger/OpenAPI in development
- JWT bearer authentication
- authorization
- memory cache
- singleton `WorldAtlasService`
- typed `HttpClient` registrations for:
  - `MapTilerProxyService`
  - `VisiblePlanetsService`

Current middleware order:

1. `UseSwagger` / `UseSwaggerUI` in development
2. `UseHttpsRedirection`
3. `UseCors(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod())`
4. `UseAuthentication`
5. `UseAuthorization`
6. `MapControllers`

### 5.2 Controller layer

#### UsersController

[`backend/src/Vela.Api/Controllers/UsersController.cs`](backend/src/Vela.Api/Controllers/UsersController.cs)

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/me`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/users/admin/manage`
- `PATCH /api/users/admin/manage/{id}`

Responsibilities:

- input validation
- JWT response shaping
- role-gated admin user management
- current-user resolution through token claims

#### FavoritesController

[`backend/src/Vela.Api/Controllers/FavoritesController.cs`](backend/src/Vela.Api/Controllers/FavoritesController.cs)

- class-level `[Authorize]`
- CRUD endpoints for per-user saved spots

#### RecommendationsController

[`backend/src/Vela.Api/Controllers/RecommendationsController.cs`](backend/src/Vela.Api/Controllers/RecommendationsController.cs)

- anonymous read
- admin-only create/update/delete for curated stargazing spots

#### StarPartyEventsController

[`backend/src/Vela.Api/Controllers/StarPartyEventsController.cs`](backend/src/Vela.Api/Controllers/StarPartyEventsController.cs)

- public event listing
- admin event management
- authenticated RSVP toggle

#### SkyMapController

[`backend/src/Vela.Api/Controllers/SkyMapController.cs`](backend/src/Vela.Api/Controllers/SkyMapController.cs)

- `GET /api/visible-planets`
- `GET /api/skyquality`
- `GET /api/darkspots`
- `GET /api/lightmap/{z}/{x}/{y}.png`

This controller is the entry point for the astronomy and raster-derived endpoints.

#### MapTilerController

[`backend/src/Vela.Api/Controllers/MapTilerController.cs`](backend/src/Vela.Api/Controllers/MapTilerController.cs)

- catch-all `GET /api/maptiler/{**resourcePath}`
- forwards query params upstream
- strips user-supplied API keys
- returns upstream cache headers when safe

### 5.3 Business logic layer

The `BL/` classes are static facades over DAL/services. They do not hold state.

#### BL.User

[`backend/src/Vela.Api/BL/User.cs`](backend/src/Vela.Api/BL/User.cs)

Key responsibilities:

- normalize registration/login input
- hash and verify passwords with BCrypt
- generate JWTs
- resolve the active user ID from several possible claim names
- prevent invalid admin-management operations such as removing the last admin or modifying your own access in-place

JWT contents include:

- `sub`
- `email`
- `unique_name`
- `role`
- `is_admin`

Default token lifetime is `Jwt:ExpiresMinutes`, with fallback `480` minutes.

#### BL.Favorite

[`backend/src/Vela.Api/BL/Favorite.cs`](backend/src/Vela.Api/BL/Favorite.cs)

- generates a default `spotId` from `lat/lon` when one is not supplied
- normalizes custom name values

#### BL.Recommendation

[`backend/src/Vela.Api/BL/Recommendation.cs`](backend/src/Vela.Api/BL/Recommendation.cs)

- builds stable recommendation IDs from name and coordinates when needed

#### BL.StarPartyEvent

[`backend/src/Vela.Api/BL/StarPartyEvent.cs`](backend/src/Vela.Api/BL/StarPartyEvent.cs)

- normalizes event title, type, status, dates, and checklist
- generates stable event IDs like `event_title_yyyymmdd`
- delegates RSVP toggles and status changes to the DAL

### 5.4 Data access layer

All DAL classes inherit from [`backend/src/Vela.Api/DAL/DBService.cs`](backend/src/Vela.Api/DAL/DBService.cs), which provides:

- SQL connection creation from `ConnectionStrings:myProjDB`
- stored-procedure `SqlCommand` construction

#### UserService

[`backend/src/Vela.Api/DAL/UserService.cs`](backend/src/Vela.Api/DAL/UserService.cs)

Stored procedure usage:

- `SP_GetUserByEmail`
- `SP_GetUserById`
- `SP_InsertUser`
- `SP_GetUserProfile`
- `SP_UpdateUserProfile`
- `SP_GetAdminUsers`
- `SP_UpdateUserAccess`
- `SP_AnyAdminExists`

#### FavoriteService

[`backend/src/Vela.Api/DAL/FavoriteService.cs`](backend/src/Vela.Api/DAL/FavoriteService.cs)

Stored procedure usage:

- `SP_GetFavoritesByUserId`
- `SP_GetFavoriteByUserAndSpot`
- `SP_InsertFavorite`
- `SP_UpdateFavoriteCustomName`
- `SP_DeleteFavorite`

Notable behavior:

- save is effectively idempotent for the same `UserId + SpotId`
- update/delete procedures expose affected-row output parameters

#### RecommendationService

[`backend/src/Vela.Api/DAL/RecommendationService.cs`](backend/src/Vela.Api/DAL/RecommendationService.cs)

Stored procedure usage:

- `SP_GetAllRecommendations`
- `SP_GetRecommendationById`
- `SP_UpsertRecommendation`
- `SP_DeleteRecommendation`

Recommendation photo/source URLs are stored as JSON strings in SQL and deserialized in the DAL.

#### StarPartyEventService

[`backend/src/Vela.Api/DAL/StarPartyEventService.cs`](backend/src/Vela.Api/DAL/StarPartyEventService.cs)

Stored procedure usage:

- `SP_GetStarPartyEventById`
- `SP_GetAllStarPartyEvents`
- `SP_UpsertStarPartyEvent`
- `SP_DeleteStarPartyEvent`
- `SP_SetStarPartyEventStatus`
- `SP_ToggleStarPartyRsvp`

Checklist and RSVP collections are serialized/deserialized as JSON in the DAL.

### 5.5 Application services

#### WorldAtlasService

[`backend/src/Vela.Api/Application/WorldAtlasService.cs`](backend/src/Vela.Api/Application/WorldAtlasService.cs)

This is the most specialized backend service in the project. It is responsible for:

- single-point sky-quality sampling
- dark-spot candidate scanning
- 256x256 lightmap tile rendering
- land/country filtering using GeoJSON geometry

Key design points:

- metadata and geometry are loaded lazily
- lightmap tiles are cached in memory
- invalid coordinates are rejected early
- dark-spot search radius is clamped to `1..250 km`
- dark-spot sampling downsamples large windows to stay responsive
- dark spots are filtered to the origin country
- water-boundary proximity filtering reduces false positives near coastlines
- there is special fallback filtering around Israel/Palestine boundary geometry

Supporting code under [`backend/src/Vela.Api/Application/WorldAtlas/`](backend/src/Vela.Api/Application/WorldAtlas/) provides:

- dataset path resolution
- GeoTIFF metadata extraction
- pixel/tile coordinate math
- bilinear interpolation
- Bortle/SQM conversion helpers
- tile-bounds conversion from XYZ to geographic bounds

#### MapTilerProxyService

[`backend/src/Vela.Api/Application/MapTilerProxyService.cs`](backend/src/Vela.Api/Application/MapTilerProxyService.cs)

Responsibilities:

- build upstream MapTiler URLs from backend config
- remove user-supplied `key` params
- append the real backend key
- rewrite JSON payload URLs so nested MapTiler resources keep flowing through the backend proxy

#### VisiblePlanetsService

[`backend/src/Vela.Api/Application/VisiblePlanetsService.cs`](backend/src/Vela.Api/Application/VisiblePlanetsService.cs)

Responsibilities:

- call `visibleplanets.dev`
- cache responses in `IMemoryCache` for 10 minutes
- stream back content type and cache-control data to the client

### 5.6 Validation

[`backend/src/Vela.Api/Configuration/RequestValidator.cs`](backend/src/Vela.Api/Configuration/RequestValidator.cs) centralizes request validation for:

- registration
- favorites
- recommendations
- star party events
- star party status changes
- profile updates

Notable limits:

- minimum password length: 8
- favorite custom name: 120 chars max
- profile display name: 120 chars max
- avatar URL: valid `http/https`, 500 chars max
- bio: 500 chars max

---

## 6. Frontend Architecture

### 6.1 Entry point and router

[`src/main.jsx`](src/main.jsx) does three things:

- loads the global CSS bundles
- registers the service worker
- mounts the router under `NotificationProvider`

[`src/router.jsx`](src/router.jsx) defines the full route tree with a shared root layout:

- `/`
- `/auth`
- `/discover`
- `/moon-phase`
- `/constellations`
- `/profile`
- `/admin`
- `/settings`
- `/solar-system`
- `*`

The root `loader` fetches recommendations and star-party events once for the initial route tree.

### 6.2 App shell and shared route state

[`src/layouts/AppLayout.jsx`](src/layouts/AppLayout.jsx) is the frontend orchestration hub.

It composes:

- `useAuth`
- `useUserPreferences`
- `useLocationTracking`
- `useStargazeLocations`
- `useStarPartyEvents`

It exposes a context containing:

- current auth/session state
- current location and geolocation status
- map type and settings
- profile settings
- stargaze locations and event data
- admin capability flags
- shared CRUD handlers
- route-aware navigation helpers

It also:

- performs a one-time hardware acceleration check
- blocks navigation into 3D-heavy routes when hardware acceleration is unavailable
- coordinates the map zoom-out transition when leaving the home map route

### 6.3 Authentication and session management

#### useAuth

[`src/features/auth/useAuth.js`](src/features/auth/useAuth.js)

- reads persisted session on mount
- validates a stored token with `GET /api/users/me`
- signs the user out if validation fails
- exposes `login`, `register`, `applySession`, and `signOut`

#### auth + authStorage

[`src/features/auth/auth.js`](src/features/auth/auth.js) handles:

- request/response normalization
- auth error extraction
- session payload normalization

[`src/features/auth/authStorage.js`](src/features/auth/authStorage.js) stores the session under:

- `vela:auth:session`

It also eagerly clears sessions that are locally expired, using a 60-second skew window.

### 6.4 Settings and preference state

[`src/features/app/hooks/useUserPreferences.js`](src/features/app/hooks/useUserPreferences.js)

State managed here:

- `mapType`
- `settings`
- `profileSettings`

Persistent client-side keys:

- `vela:settings`
- `mapType`

Settings include:

- directions provider
- recommended-spot visibility
- light-overlay toggle
- auto-center behavior
- GPS accuracy preference
- dark-spot search distance
- accessibility mode
- satellite readability boost

### 6.5 Location and shared content hooks

#### useLocationTracking

[`src/features/app/hooks/useLocationTracking.js`](src/features/app/hooks/useLocationTracking.js)

- watches browser geolocation continuously
- toggles high-accuracy GPS based on user settings
- exposes `location` and `locationStatus`

#### useStargazeLocations

[`src/features/app/hooks/useStargazeLocations.js`](src/features/app/hooks/useStargazeLocations.js)

- consumes bootstrapped recommendation data when available
- otherwise fetches recommendations directly
- normalizes incoming payloads into the app's location shape

#### useStarPartyEvents

[`src/features/app/hooks/useStarPartyEvents.js`](src/features/app/hooks/useStarPartyEvents.js)

- consumes bootstrapped events when available
- otherwise fetches them directly
- exposes admin CRUD handlers and RSVP toggle handling

### 6.6 Map architecture

The home route is the most complex frontend feature.

#### MapView

[`src/pages/Map/MapView.jsx`](src/pages/Map/MapView.jsx)

This component composes:

- `PlanetPanelContainer`
- `MapViewport`
- `MapPanels`
- `MapQuickActions`
- `LocationSearchBar`
- `SearchDistanceSelector`
- `MapTypeSwitcher`

#### useMapViewState

[`src/pages/Map/MapView/hooks/useMapViewState.js`](src/pages/Map/MapView/hooks/useMapViewState.js)

This hook is the main coordination layer for map behavior. It combines:

- `usePlanets`
- `useMapFavorites`
- `useMapStargaze`
- `useMapDirections`
- `useMapInteractions`
- `useMapTargetToggleHandlers`
- `useMapViewUiState`

It returns grouped state as:

- `refs`
- `ui`
- `state`
- `derived`
- `planets`
- `handlers`

#### MapViewport

[`src/pages/Map/MapView/components/MapViewport.jsx`](src/pages/Map/MapView/components/MapViewport.jsx)

The viewport is responsible for:

- booting the Leaflet `MapContainer`
- swapping between 2D and 3D map implementations
- rendering:
  - user location marker
  - placed marker
  - curated stargaze markers
  - dark-spot markers
  - favorite-only markers
  - star-party markers
- attaching interaction handlers for:
  - double-click
  - long press
  - popup state
  - zoom tracking

#### 3D map layer

[`src/pages/Map/MapView/components/layers/MapLibre3DLayer.jsx`](src/pages/Map/MapView/components/layers/MapLibre3DLayer.jsx)

This layer:

- mounts MapLibre GL inside Leaflet
- requests the `streets-v2` style through the backend proxy
- installs MapLibre's RTL text plugin when possible
- disables built-in GL interactions
- implements custom pitch/angle controls on top of the Leaflet container

### 6.7 Favorites and planets

#### useMapFavorites

[`src/features/map/useMapFavorites.js`](src/features/map/useMapFavorites.js)

Behavior:

- loads favorites from the API on mount
- performs optimistic add/remove/rename updates
- coordinates favorite entry/exit animations
- keeps the placed marker and selected dark spot in sync with favorite state

#### usePlanets and planet utilities

[`src/features/map/usePlanets.js`](src/features/map/usePlanets.js)

- fetches visible planets for a selected coordinate
- works with local panel visibility logic
- uses frontend `localStorage` caching through [`src/utils/planetUtils.js`](src/utils/planetUtils.js)

Frontend visible-planet cache:

- key prefix: `visiblePlanetsCache`
- TTL: 24 hours
- key precision: rounded to 2 decimals

#### Planet panel and AR overlay

The planet panel under [`src/pages/Map/PlanetPanel/`](src/pages/Map/PlanetPanel/) includes:

- desktop and mobile panel variants
- 3D planet cards
- info cards
- AR overlay support

[`src/pages/Map/PlanetPanel/PlanetArOverlay.jsx`](src/pages/Map/PlanetPanel/PlanetArOverlay.jsx) uses:

- `getUserMedia` for camera access
- `deviceorientation` for heading/altitude guidance
- a portal overlay rooted outside the main map

### 6.8 Discovery page

[`src/pages/Discovery/DiscoveryPage.jsx`](src/pages/Discovery/DiscoveryPage.jsx)

This page is an aggregation surface. It layers:

- nearby recommendations
- saved favorites
- nearby events
- sky-quality summaries
- nearest darker-spot summaries

Main supporting hooks:

- [`src/pages/Discovery/hooks/useDiscoveryData.js`](src/pages/Discovery/hooks/useDiscoveryData.js)
- [`src/pages/Discovery/hooks/useDiscoveryInsights.js`](src/pages/Discovery/hooks/useDiscoveryInsights.js)
- [`src/pages/Discovery/hooks/useDiscoveryActions.js`](src/pages/Discovery/hooks/useDiscoveryActions.js)

### 6.9 Moon Phase page

[`src/pages/MoonPhase/MoonPhasePage.jsx`](src/pages/MoonPhase/MoonPhasePage.jsx)

This route is client-side astronomy, not server-backed astronomy.

It uses:

- a 3D moon globe hero
- a 65-mark lunar-cycle slider
- locally computed moon phase and observation planning

Astronomy logic lives in:

- [`src/pages/MoonPhase/useMoonPhase.js`](src/pages/MoonPhase/useMoonPhase.js)
- [`src/pages/MoonPhase/moonPhaseAstronomy.js`](src/pages/MoonPhase/moonPhaseAstronomy.js)
- [`src/pages/MoonPhase/moonPhaseCore.js`](src/pages/MoonPhase/moonPhaseCore.js)
- [`src/pages/MoonPhase/moonPhaseObservationPlan.js`](src/pages/MoonPhase/moonPhaseObservationPlan.js)

Key computed values include:

- live moon phase fraction
- illumination
- day in cycle
- moon altitude
- sunrise/sunset
- moonless observing windows

### 6.10 Solar System page

[`src/pages/SolarSystem/SolarSystemPage.jsx`](src/pages/SolarSystem/SolarSystemPage.jsx)

This is a full-screen Three.js scene with:

- Sun through Neptune
- orbit toggles
- orbit-speed controls
- body focus/tracking
- mobile/desktop focus panel behavior

Core files:

- [`src/pages/SolarSystem/components/SolarSystemScene.jsx`](src/pages/SolarSystem/components/SolarSystemScene.jsx)
- [`src/pages/SolarSystem/components/SolarSystemPanel.jsx`](src/pages/SolarSystem/components/SolarSystemPanel.jsx)
- [`src/pages/SolarSystem/solarSystemData.js`](src/pages/SolarSystem/solarSystemData.js)

### 6.11 Constellations page

[`src/pages/Constellations/ConstellationsPage.jsx`](src/pages/Constellations/ConstellationsPage.jsx)

This route is a custom interactive sky canvas with:

- curated constellation data
- ambient starfield generation
- pan/focus transitions
- mobile and desktop info panel behavior

Core files:

- [`src/pages/Constellations/components/ConstellationsMap.jsx`](src/pages/Constellations/components/ConstellationsMap.jsx)
- [`src/pages/Constellations/components/ConstellationsPanel.jsx`](src/pages/Constellations/components/ConstellationsPanel.jsx)
- [`src/pages/Constellations/constellationData.js`](src/pages/Constellations/constellationData.js)
- [`src/pages/Constellations/constellationViewUtils.js`](src/pages/Constellations/constellationViewUtils.js)

### 6.12 Account, settings, and admin routes

- [`src/pages/Auth/AuthPage.jsx`](src/pages/Auth/AuthPage.jsx)
  - login/register UI
  - password rule feedback
  - delegates submit handling to router action

- [`src/pages/Profile/ProfilePage.jsx`](src/pages/Profile/ProfilePage.jsx)
  - signed-in profile editing
  - display name, avatar URL, bio

- [`src/pages/Settings/SettingsPage.jsx`](src/pages/Settings/SettingsPage.jsx)
  - persisted app preferences

- [`src/pages/Admin/AdminPage.jsx`](src/pages/Admin/AdminPage.jsx)
  - location management
  - event management
  - admin user-access management

---

## 7. Data, Storage, and Caching

### 7.1 Client-side persistence

`localStorage` keys used directly by the app:

| Key | Purpose |
|---|---|
| `vela:auth:session` | JWT session payload |
| `vela:settings` | persisted user settings |
| `mapType` | selected base map style |
| `visiblePlanetsCache_*` | cached visible-planet responses |

### 7.2 Service worker cache

[`public/sw.js`](public/sw.js) caches only requests that match its explicit tile-host patterns. It does not act as a general API cache.

Important characteristics:

- cache name: `vela-map-tiles-v3`
- metadata cache: `vela-map-tiles-meta-v1`
- max age: 30 days
- max entries: 4000
- retry/backoff on `429` responses
- current patterns target external tile hosts such as `api.maptiler.com`, `basemaps.cartocdn.com`, `tile.openstreetmap.org`, and `tiles.stadiamaps.com`
- proxied same-origin `/api/maptiler/...` requests are not currently matched by the service worker cache rules

### 7.3 Backend cache layers

- `WorldAtlasService` caches rendered lightmap tiles for 10 minutes
- `VisiblePlanetsService` caches upstream planet responses for 10 minutes
- frontend planet utilities cache visible-planet responses for 24 hours
- sky-quality frontend requests are memoized in a module-level `Map`

### 7.4 Data files

Repository data assets:

- `data/World_Atlas_2015.tif`
- `backend/src/Vela.Api/Data/land-10m.geojson`
- `backend/src/Vela.Api/Data/countries-10m.geojson`

The TIFF is required for:

- `/api/skyquality`
- `/api/darkspots`
- `/api/lightmap/{z}/{x}/{y}.png`

---

## 8. Configuration

### 8.1 Frontend

Frontend does not require an API base URL env var. The app always talks to `/api`.

[`vite.config.js`](vite.config.js) proxies `/api` to:

- `http://127.0.0.1:5152`

Current frontend `.env.example` is informational only.

### 8.2 Backend required configuration

The backend example config is in:

- [`backend/src/Vela.Api/appsettings.example.json`](backend/src/Vela.Api/appsettings.example.json)
- [`backend/src/Vela.Api/appsettings.Development.example.json`](backend/src/Vela.Api/appsettings.Development.example.json)

Important settings:

| Key | Purpose |
|---|---|
| `ConnectionStrings:myProjDB` | SQL Server connection string |
| `Jwt:Issuer` | JWT issuer |
| `Jwt:Audience` | JWT audience |
| `Jwt:Key` | JWT signing key |
| `Jwt:ExpiresMinutes` | token lifetime |
| `MapTiler:BaseUrl` | MapTiler upstream base |
| `MapTiler:ApiKey` | MapTiler server-side key |
| `VisiblePlanets:BaseUrl` | visibleplanets upstream base |
| `WorldAtlas:Path` | GeoTIFF path |
| `WorldAtlas:LandMaskPath` | land mask path |
| `WorldAtlas:CountryBoundariesPath` | country boundary path |

### 8.3 Configuration present but not currently enforced in code

Two config areas exist in the example settings but are not active runtime controls in the current code path:

- `Cors:AllowedOrigins`
  - the API currently allows any origin in `Program.cs`
- `Nominatim:*`
  - there is no active Nominatim service implementation in this repository version

---

## 9. Database Architecture

### 9.1 Tables

The database schema is created manually from SQL scripts in `backend/src/Vela.Api/Database/Tables/`.

Main tables:

| Table | Purpose |
|---|---|
| `Users` | auth identity, profile data, role/admin flags |
| `Favorites` | per-user saved coordinates and custom names |
| `Recommendations` | admin-curated stargazing locations |
| `StarPartyEvents` | event records |
| `StarPartyEventRsvps` | per-user event RSVP rows |

### 9.2 Table relationships

- `Favorites.UserId -> Users.Id`
- `StarPartyEvents.HostUserId -> Users.Id`
- `StarPartyEventRsvps.EventId -> StarPartyEvents.Id`
- `StarPartyEventRsvps.UserId -> Users.Id`

### 9.3 Stored procedure families

The backend only talks to SQL through stored procedures under `backend/src/Vela.Api/Database/SP/`.

Procedure groups:

- user procedures
- favorite procedures
- recommendation procedures
- star party procedures

### 9.4 SQL shape decisions

A few fields are intentionally stored as JSON text instead of normalized child tables:

- recommendation photo URLs
- recommendation source URLs
- star-party host checklist
- star-party RSVP projection payloads returned by procedures

This keeps the DAL simpler at the cost of heavier serialization/deserialization work in C#.

---

## 10. Local Development and Build

### 10.1 Prerequisites

- Node.js 20+
- npm 10+
- .NET SDK 9
- SQL Server
- World Atlas 2015 TIFF file

### 10.2 Required setup files

Create these from the checked-in examples:

1. `.env` from `.env.example`
2. `backend/src/Vela.Api/appsettings.json` from `appsettings.example.json`
3. `backend/src/Vela.Api/appsettings.Development.json` from `appsettings.Development.example.json`

### 10.3 Database setup order

Run SQL scripts in this order:

1. `backend/src/Vela.Api/Database/Tables/Users.sql`
2. `backend/src/Vela.Api/Database/Tables/Favorites.sql`
3. `backend/src/Vela.Api/Database/Tables/Recommendations.sql`
4. `backend/src/Vela.Api/Database/Tables/StarPartyEvents.sql`
5. `backend/src/Vela.Api/Database/SP/User SPs.sql`
6. `backend/src/Vela.Api/Database/SP/Favorite SPs.sql`
7. `backend/src/Vela.Api/Database/SP/Recommendation SPs.sql`
8. `backend/src/Vela.Api/Database/SP/StarParty SPs.sql`
9. optional: `backend/src/Vela.Api/Database/Seed/InitialContent.sql`

### 10.4 Run commands

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
dotnet run --project backend/src/Vela.Api
```

Useful build commands:

```bash
npm run build
npm run api:build
npm run lint
```

### 10.5 Local host assumptions

- Vite dev server serves the SPA
- the backend listens on port `5152` in local development
- Vite proxies `/api` requests to the backend

---

## 11. API Surface

### Authentication and profile

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/users/register` | Anonymous |
| POST | `/api/users/login` | Anonymous |
| GET | `/api/users/me` | Bearer |
| GET | `/api/users/profile` | Bearer |
| PUT | `/api/users/profile` | Bearer |

### Admin user management

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/users/admin/manage` | Admin |
| PATCH | `/api/users/admin/manage/{id}` | Admin |

### Favorites

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/favorites` | Bearer |
| POST | `/api/favorites` | Bearer |
| PUT | `/api/favorites/{spotId}` | Bearer |
| DELETE | `/api/favorites/{spotId}` | Bearer |

### Recommendations

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/recommendations` | Anonymous |
| POST | `/api/recommendations` | Admin |
| DELETE | `/api/recommendations/{id}` | Admin |

### Star party events

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/star-party-events` | Anonymous |
| POST | `/api/star-party-events` | Admin |
| PATCH | `/api/star-party-events/{id}/status` | Admin |
| DELETE | `/api/star-party-events/{id}` | Admin |
| POST | `/api/star-party-events/{id}/rsvp/toggle` | Bearer |

### Sky and map data

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/visible-planets?lat&lon` | Anonymous |
| GET | `/api/skyquality?lat&lon` | Anonymous |
| GET | `/api/darkspots?lat&lon&searchDistance` | Anonymous |
| GET | `/api/lightmap/{z}/{x}/{y}.png` | Anonymous |
| GET | `/api/maptiler/{**resourcePath}` | Anonymous |

---

## 12. Operational Notes and Constraints

- The API is currently permissive on CORS even though origin config exists in settings.
- The frontend depends on hash routing. If that changes, deployment assumptions change with it.
- Hardware acceleration is effectively required for:
  - `/constellations`
  - `/moon-phase`
  - `/solar-system`
- The home map route still works without WebGL because it falls back to 2D Leaflet mode.
- MapTiler credentials stay server-side by design.
- Light pollution features require the World Atlas TIFF and the GeoJSON assets to be present and readable.
- Database objects are not auto-migrated. Schema changes require running SQL scripts manually.
- The backend uses static BL classes plus direct DAL instantiation rather than dependency-injected repositories.
- The service worker caches only specific tile-host patterns, and it is not a full offline data-sync layer.

### Current design tradeoffs

- Stored procedures provide a stable database boundary, but increase SQL maintenance cost.
- The map feature is highly capable, but a large amount of behavior is concentrated in the `MapView` feature tree.
- The Discovery page benefits from shared app state, but it duplicates some concerns that also exist on the map route.
- Configuration includes a few future-facing placeholders that are not yet wired into runtime behavior.
