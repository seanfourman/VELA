# VELA

VELA is a React + ASP.NET Core stargazing app with:
- React Router Data API routing (`createHashRouter`, route `loader` + `action`, `RouterProvider`, `Outlet`)
- SQL-backed Web API (SQL Server via ADO.NET)
- JWT authentication/authorization
- 3-layer architecture (Controllers -> BL -> DAL)

## Stack

- Frontend: React, Vite, Leaflet, React Router, MUI
- Backend: ASP.NET Core Web API, ADO.NET (`System.Data.SqlClient`), SQL Server, JWT Bearer auth, BCrypt

## Project structure

- Frontend: `src/`
- Backend API: `backend/src/Vela.Api/`
- Solution: `VelaServer.sln`

## Prerequisites

- Node.js 20+
- npm 10+
- .NET SDK 9
- SQL Server instance

## Files you must create on a fresh clone

These are required but not committed (because `.gitignore` excludes them):

1. Frontend env file
- Create `.env` from `.env.example`

2. Backend appsettings files
- Create `backend/src/Vela.Api/appsettings.json` from `backend/src/Vela.Api/appsettings.example.json`
- Create `backend/src/Vela.Api/appsettings.Development.json` from `backend/src/Vela.Api/appsettings.Development.example.json`

3. World Atlas dataset file (required for sky quality/dark spots/lightmap)
- Put `World_Atlas_2015.tif` in `data/World_Atlas_2015.tif`
- Alternative: set `WorldAtlas:Path` in backend config to the absolute file path

## Required keys/settings

### Frontend (`.env`)

```env
VITE_API_BASE=http://localhost:5152/api
```

### Backend (`appsettings.json`)

Required:
- `ConnectionStrings:myProjDB`
- `Jwt:Key` (must be at least 32 characters)
- `MapTiler:ApiKey`

Recommended:
- `Cors:AllowedOrigins`
- `WorldAtlas:Path` / `WorldAtlas:LandMaskPath` (optional overrides)

## Database setup (manual)

The backend does not auto-create tables/stored procedures.

Run SQL scripts in this order against `ConnectionStrings:myProjDB`:

1. `backend/src/Vela.Api/Database/Tables/Users.sql`
2. `backend/src/Vela.Api/Database/Tables/Favorites.sql`
3. `backend/src/Vela.Api/Database/Tables/Recommendations.sql`
4. `backend/src/Vela.Api/Database/Tables/StarPartyEvents.sql`
5. `backend/src/Vela.Api/Database/SP/User SPs.sql`
6. `backend/src/Vela.Api/Database/SP/Favorite SPs.sql`
7. `backend/src/Vela.Api/Database/SP/Recommendation SPs.sql`
8. `backend/src/Vela.Api/Database/SP/StarParty SPs.sql`
9. Optional sample data: `backend/src/Vela.Api/Database/Seed/InitialContent.sql`

See also: `backend/src/Vela.Api/Database/README.md`

## Run locally

1. Install frontend dependencies:
   - `npm install`
2. Create frontend env:
   - Windows: `copy .env.example .env`
3. Create backend config files:
   - `copy backend\src\Vela.Api\appsettings.example.json backend\src\Vela.Api\appsettings.json`
   - `copy backend\src\Vela.Api\appsettings.Development.example.json backend\src\Vela.Api\appsettings.Development.json`
4. Fill required backend values:
   - SQL connection string (`ConnectionStrings:myProjDB`)
   - JWT key (`Jwt:Key`)
   - MapTiler key (`MapTiler:ApiKey`)
5. Ensure `World_Atlas_2015.tif` exists in `data/` (or configure `WorldAtlas:Path`)
6. Run backend:
   - `dotnet run --project backend/src/Vela.Api`
7. Run frontend:
   - `npm run dev`

## Admin account

This project does not seed an admin account at runtime.

Create one by:
1. Registering a normal user via `POST /api/users/register`
2. Promoting that user in SQL:

```sql
UPDATE Users
SET IsAdmin = 1, Role = 'admin'
WHERE Email = 'your-admin-email@example.com';
```

## API endpoints

- Auth:
  - `POST /api/users/register`
  - `POST /api/users/login`
  - `GET /api/users/me` (JWT)
- Favorites (JWT):
  - `GET /api/favorites`
  - `POST /api/favorites`
  - `PUT /api/favorites/{spotId}`
  - `DELETE /api/favorites/{spotId}`
- Recommendations:
  - `GET /api/recommendations` (public)
  - `POST /api/recommendations` (admin JWT)
  - `DELETE /api/recommendations/{id}` (admin JWT)

## Scripts

- `npm run dev` - frontend dev server
- `npm run build` - frontend production build
- `npm run preview` - preview frontend build
- `npm run lint` - frontend lint

Backend build:
- `dotnet build backend/src/Vela.Api/Vela.Api.csproj`
