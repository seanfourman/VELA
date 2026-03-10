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
- Internal navigation uses router-driven navigation only.
- Network calls are wrapped in dedicated modules and now point at the backend-owned API surface instead of the older mixed fallback setup.
- Notifications are managed by a React provider-backed store instead of a window event bus.
- Portal root DOM setup happens in a hook effect instead of during render.
- Clipboard fallback logic is centralized in one helper instead of being duplicated across multiple components.

### Backend
- Controllers now depend on injected services instead of static BL classes.
- Services now depend on repository interfaces instead of constructing DAL classes directly.
- Repositories now contain the stored-procedure and ADO.NET work.
- JWT creation now runs through an injected token service.
- SQL connections now come from an injected connection factory.
- The old static BL path and `DBService` path were removed.

## Remaining gaps by area
### 1. Favorite mutation logic is still duplicated across the map flows
Priority: medium

Current state:
- `src/features/map/useMapFavorites.js`

Why it still matters:
- The biggest correctness bugs in the map flow came from separate favorite paths drifting apart.
- The add flow is more consolidated now, but the hook still contains multiple specialized toggle/remove branches that should be tightened further.

What to change later:
1. Collapse the remaining favorite toggle/remove branches into one shared mutation helper.
2. Keep marker animation state and persistence flow in one path.
3. Reduce the number of marker-specific favorite edge cases.

### 2. Frontend chunking is improved, but the map stack is still the heaviest part of the app
Priority: low

Current state:
- `vite.config.js`

Why it is only a follow-up item:
- Vendor chunking is improved.
- The build still warns because the map/MapLibre stack remains large.

What to change later:
1. Consider isolating more of the map-only vendor code.
2. Split optional 3D/map features further only if startup size becomes a real problem.
3. Revisit the build warning only if performance becomes a real issue.

## Areas that do not currently need change
- Hook usage for auth/session state in `src/features/auth/useAuth.js` is aligned with the hooks material.
- Central route definition in `src/router.jsx` is aligned with the router material.
- Frontend API wrappers and auth persistence are acceptable for the fetch and JWT units.
- Local storage usage is fine for this SPA and not a mismatch by itself.
- The backend architecture is aligned with the DI and repository material at the structural level.

## Recommended order from here
1. Finish collapsing the remaining duplicate favorite mutation branches.
2. Revisit bundle size only if the map route becomes a measurable performance problem.
