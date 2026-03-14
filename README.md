# VELA

VELA is a React + ASP.NET Core stargazing app with:
- React Router Data API routing (`createHashRouter`, route `loader` + `action`, `RouterProvider`, `Outlet`)
- SQL-backed Web API (SQL Server via ADO.NET)
- JWT authentication/authorization
- 3-layer architecture (Controllers -> BL -> DAL)

## Stack

- Frontend: React, Vite, Leaflet, React Router, MUI
- Backend: ASP.NET Core Web API, ADO.NET (System.Data.SqlClient), SQL Server, JWT Bearer auth, BCrypt

## Project structure

- Frontend: `src/`
- Backend API: `backend/src/Vela.Api/`
- Solution: `VelaServer.sln`

## Run locally

1. Install frontend dependencies:
   - `npm install`
2. Create env file:
   - `copy .env.example .env`
3. Start backend API:
   - `dotnet run --project backend/src/Vela.Api`
4. Start frontend dev server:
   - `npm run dev`

Frontend default API base is:
- `VITE_API_BASE=http://localhost:5152/api`

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
