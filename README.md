# VELA

VELA is a stargazing web app built with a React/Vite frontend and an ASP.NET Core Web API. It centers on an interactive world map for finding dark skies, checking visible planets, saving favorite observing spots, browsing curated stargazing locations, and managing community star-party events.

## What The App Includes

- Interactive 2D Leaflet map with dark, light, and satellite MapTiler base layers
- Optional 3D MapLibre map mode
- World Atlas 2015 light-pollution overlay served as raster tiles from the API
- Sky-quality lookup, dark-spot search, and visible-planet lookup
- Desktop and mobile planet panels with 3D planet cards and AR camera guidance
- Favorites with custom names for signed-in users
- Discovery page for recommendations, events, favorites, and nearby sky insights
- Moon phase, constellations, and solar system visual experiences
- JWT auth, profile editing, and admin tools
- SQL Server-backed recommendations, favorites, users, and star-party events

## Stack

Frontend:

- React 19
- Vite 7
- React Router 7 with `createHashRouter`
- Leaflet and React-Leaflet
- MapLibre GL via `@maplibre/maplibre-gl-leaflet`
- Three.js, `@react-three/fiber`, and `@react-three/drei`
- MUI 7
- Plain CSS modules/files under `src/**/styles`

Backend:

- ASP.NET Core 9 Web API
- SQL Server through ADO.NET and stored procedures
- JWT bearer authentication
- BCrypt password hashing
- BitMiracle.LibTiff.NET for World Atlas TIFF reads
- SixLabors.ImageSharp for lightmap PNG tile rendering
- NetTopologySuite for land/country geometry filtering

## Project Structure

```text
VELA/
|-- src/                         React frontend
|   |-- main.jsx                 app entry and service-worker registration
|   |-- router.jsx               hash router, loaders, route actions
|   |-- layouts/                 shared app shell and route context
|   |-- features/                auth, app hooks, map hooks, star-party utilities
|   |-- pages/                   route-level features
|   |-- utils/                   API clients, storage, hardware, formatting helpers
|   |-- styles/                  global CSS
|   `-- assets/                  icons and planet textures
|
|-- backend/src/Vela.Api/        ASP.NET Core API
|   |-- Controllers/             HTTP endpoints
|   |-- BL/                      business logic facades
|   |-- DAL/                     stored-procedure data access
|   |-- DTOs/                    request/response contracts
|   |-- Application/             World Atlas and external API services
|   |-- Data/                    bundled GeoJSON files
|   `-- Database/                SQL tables, stored procedures, seed data
|
|-- data/                        local World Atlas TIFF location
|-- public/sw.js                 tile service worker
|-- vite.config.js               Vite dev server and API proxy
|-- package.json                 frontend scripts/dependencies
`-- VelaServer.sln              backend solution
```

## Prerequisites

- Node.js 20+
- npm 10+
- .NET SDK 9
- SQL Server
- World Atlas 2015 TIFF file

## Fresh Clone Setup

Install frontend dependencies:

```powershell
npm install
```

Create the optional frontend env file:

```powershell
copy .env.example .env
```

The frontend currently uses `/api` for backend calls and does not require a frontend API base env variable.

Create backend config files:

```powershell
copy backend\src\Vela.Api\appsettings.example.json backend\src\Vela.Api\appsettings.json
copy backend\src\Vela.Api\appsettings.Development.example.json backend\src\Vela.Api\appsettings.Development.json
```

Set these backend values in `backend/src/Vela.Api/appsettings.json`:

- `ConnectionStrings:myProjDB`
- `Jwt:Issuer`
- `Jwt:Audience`
- `Jwt:Key`
- `Jwt:ExpiresMinutes`
- `VisiblePlanets:BaseUrl`
- `WorldAtlas:Path`
- `WorldAtlas:LandMaskPath`
- `WorldAtlas:CountryBoundariesPath`

The example config also contains `MapTiler` and `Nominatim` settings, but the current code does not use backend MapTiler/Nominatim services. MapTiler URLs are built directly in the frontend in `src/utils/apiEndpoints.js`.

Put the World Atlas TIFF at:

```text
data/World_Atlas_2015.tif
```

Alternatively, set `WorldAtlas:Path` to an absolute TIFF path.

The GeoJSON land/country files are already bundled under:

```text
backend/src/Vela.Api/Data/
```

## Database Setup

The backend does not auto-create tables or stored procedures. Run the SQL scripts manually against the database from `ConnectionStrings:myProjDB`.

Run order:

1. `backend/src/Vela.Api/Database/Tables/Users.sql`
2. `backend/src/Vela.Api/Database/Tables/Favorites.sql`
3. `backend/src/Vela.Api/Database/Tables/Recommendations.sql`
4. `backend/src/Vela.Api/Database/Tables/StarPartyEvents.sql`
5. `backend/src/Vela.Api/Database/SP/User SPs.sql`
6. `backend/src/Vela.Api/Database/SP/Favorite SPs.sql`
7. `backend/src/Vela.Api/Database/SP/Recommendation SPs.sql`
8. `backend/src/Vela.Api/Database/SP/StarParty SPs.sql`
9. Optional: `backend/src/Vela.Api/Database/Seed/InitialContent.sql`

See also `backend/src/Vela.Api/Database/README.md`.

## Run Locally

Backend:

```powershell
npm run api:dev
```

Equivalent:

```powershell
dotnet run --project backend/src/Vela.Api
```

Frontend:

```powershell
npm run dev
```

Local defaults:

- Vite frontend: `http://localhost:5173`
- API: `http://localhost:5152`
- Vite proxies `/api` to `http://127.0.0.1:5152`

## Mobile Testing With Cloudflare

`vite.config.js` allows `*.trycloudflare.com`, so a quick tunnel can expose the Vite app to a phone:

```powershell
cloudflared tunnel --url http://localhost:5173 --no-autoupdate
```

Keep the backend running locally. The phone loads the Vite app through the tunnel, and Vite still proxies `/api` calls to the local API.

## Scripts

```powershell
npm run dev        # Vite frontend dev server
npm run api:dev    # ASP.NET Core API
npm run build      # frontend production build
npm run api:build  # backend build
npm run preview    # preview frontend build
npm run lint       # frontend lint
```

## Main Routes

- `/` - map
- `/auth` - login/register
- `/discover` - recommendations, favorites, events, and local sky insights
- `/moon-phase` - moon phase and observing windows
- `/constellations` - interactive constellation view
- `/solar-system` - 3D solar system
- `/profile` - signed-in profile
- `/settings` - user preferences
- `/admin` - admin workspace

Routes are hash-based, so URLs are served as `/#/discover`, `/#/settings`, and so on.

## API Surface

Authentication and profile:

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/me`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/users/admin/manage`
- `PATCH /api/users/admin/manage/{id}`

Favorites:

- `GET /api/favorites`
- `POST /api/favorites`
- `PUT /api/favorites/{spotId}`
- `DELETE /api/favorites/{spotId}`

Recommendations:

- `GET /api/recommendations`
- `POST /api/recommendations`
- `DELETE /api/recommendations/{id}`

Star-party events:

- `GET /api/star-party-events`
- `POST /api/star-party-events`
- `PATCH /api/star-party-events/{id}/status`
- `DELETE /api/star-party-events/{id}`
- `POST /api/star-party-events/{id}/rsvp/toggle`

Sky/map data:

- `GET /api/visible-planets?lat&lon`
- `GET /api/skyquality?lat&lon`
- `GET /api/darkspots?lat&lon&searchDistance`
- `GET /api/lightmap/{z}/{x}/{y}.png`

## Admin Account

The app does not create an admin account automatically.

1. Register a normal user through the app or `POST /api/users/register`.
2. Promote the user in SQL:

```sql
UPDATE Users
SET IsAdmin = 1, Role = 'admin'
WHERE Email = 'your-admin-email@example.com';
```

## Notes

- Base map tiles come directly from MapTiler using the URL templates in `src/utils/apiEndpoints.js`.
- The light-pollution overlay is different: it is rendered by the backend from `World_Atlas_2015.tif` and returned as PNG tiles.
- The service worker only caches explicit external tile-host patterns in `public/sw.js`; it is not a general API cache.
- Hardware acceleration is required for the heavier visual routes: constellations, moon phase, and solar system.
- The API currently allows any CORS origin in `Program.cs`.
