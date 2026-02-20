# VELA

VELA is a stargazing companion built with React, Vite, and Leaflet. It helps you find dark skies, explore curated stargazing locations, and see visible planets for any spot on the map.

## Features

- Interactive map with dark, light, and satellite base layers (MapTiler).
- Light pollution overlay and sky quality lookups from World_Atlas_2015.tif.
- Dark spot discovery via a proxied API.
- Curated stargazing locations with details and galleries.
- Favorites, pinned spots, targets, and quick actions.
- Visible planets panel powered by VisiblePlanets.
- Profile, settings, and admin tools with local auth.

## Getting started

1. Install dependencies:
   - `npm install`
2. Create a local env file:
   - `copy .env.example .env`
3. Set `VITE_MAPTILER_KEY` in `.env`.
4. Run the dev server:
   - `npm run dev`

## Environment variables

Required:
- `VITE_MAPTILER_KEY` (MapTiler tiles)

## Data and services

- Light map and sky quality endpoints are served by the Vite dev/preview server
  (see `vite.config.js`). For static hosting, move those endpoints to a server.
- The light pollution overlay uses `data/World_Atlas_2015.tif` (or a copy in
  `public/`). The repo includes this file, but it is large.
- Dark spot search is served locally at `/api/darkspots` in `vite.config.js`.
- Visible planets are requested through the local endpoint
  `/api/visible-planets`.
- Curated locations are read/written via `/api/recommendations`, backed by
  `data/stargazing_locations.json`.
- User preferences and favorites are stored in localStorage.

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - create a production build
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint
