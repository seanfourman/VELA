# Lecturer Alignment Audit

## Basis for comparison
This audit is based on the local course material in `docs/_extracted`, mainly:
- `02 -10 Components - Router - ver15.txt`
- `Hooks.txt`
- `11 Fetch And jQuery Ajax calls.txt`
- `03 RESTFul Web API Core.txt`
- `04 RESTFul Web API Core Security JWT.txt`
- `02 IRepository Pattern.txt`

## What is already aligned
### Frontend
- The app is built with functional components and hooks across the main flows.
- Routing is centralized in `src/router.jsx` with route-level composition under `src/layouts/AppLayout.jsx`.
- Network calls are wrapped in dedicated modules and hooks instead of being scattered through presentational components.
- Internal navigation now uses router links in the main shell components.
- Portal root DOM setup now happens in a hook effect instead of during render.

### Backend
- Controllers now depend on injected services instead of static BL classes.
- Services now depend on repository interfaces instead of constructing DAL classes directly.
- Repositories now contain the stored-procedure and ADO.NET work.
- JWT creation now runs through an injected token service.
- SQL connections now come from an injected connection factory.
- The old static BL path and `DBService` path were removed.

## Remaining gaps by area
### 1. Notifications are implemented as a window event bus, not a React state/context pattern
Priority: medium

Current state:
- `src/utils/notifications.js`
- `src/components/ToastNotifications.jsx`

Why it is still off:
- The hooks material leans toward React-managed state, effects, context, and reducers.
- The current notification system works, but it bypasses React state flow by dispatching and listening to browser events on `window`.

What to change later:
1. Replace the global event bus with a `NotificationProvider`.
2. Expose `useNotifications()` for enqueue and dismiss actions.
3. Keep the toast renderer inside provider state instead of listening to DOM events.

### 2. Navigation helper still contains a full-page fallback
Priority: medium

Current state:
- `src/utils/navigation.js`

Why it is still off:
- The router lectures emphasize SPA navigation through router hooks and router components.
- `window.location.assign()` is only used as a fallback, but it is still outside the taught SPA path.

What to change later:
1. Keep all in-app navigation on `useNavigate`, `Link`, or `NavLink`.
2. Remove the full reload fallback if there are no non-router call sites that need it.

### 3. Clipboard fallbacks use direct DOM textareas in event handlers
Priority: low

Current state:
- `src/pages/Map/PlanetPanel/PlanetInfoCard.jsx`
- `src/pages/Map/PlanetPanel/PlanetPanelMobile.jsx`
- `src/pages/Map/MapView/components/popups/content/copyCoordinates.js`

Why it is only a minor gap:
- This is not a render-time side effect anymore.
- It is still imperative DOM code and can be centralized for cleaner React style.

What to change later:
1. Create one shared clipboard helper.
2. Prefer `navigator.clipboard.writeText()` first.
3. Keep the textarea fallback in one place only.

### 4. The refactored backend still has no automated tests around the new service and repository seams
Priority: medium

Current state:
- There is no backend test project covering the new DI and repository boundaries.

Why it matters:
- The repository-pattern material is mainly about separation and swapability.
- Without tests, the structural improvement is real, but still not defended.

What to change later:
1. Add a backend test project.
2. Unit-test `UserService`, `FavoriteService`, `RecommendationService`, and `StarPartyEventService` with mocked repositories.
3. Add controller tests for auth, favorites, recommendations, and star-party event flows.

## Areas that do not currently need change
- Hook usage for auth/session state in `src/features/auth/useAuth.js` is aligned with the hooks material.
- Central route definition in `src/router.jsx` is aligned with the router material.
- Frontend API wrappers and auth persistence are acceptable for the fetch and JWT units.
- Local storage usage is fine for this SPA and not a mismatch by itself.
- The backend architecture is now aligned with the DI and repository material at the structural level.

## Recommended order from here
1. Replace the notification event bus with a React provider.
2. Add backend tests around the new service and repository seams.
3. Remove the full-page navigation fallback if it is no longer needed.
4. Centralize clipboard fallback logic.
