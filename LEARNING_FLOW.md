## 0. Repo Contract And Tooling

Start here so you know what the app is supposed to be and how it runs.

Marker:

- = important file that introduces a new pattern or architecture idea compared with the API/normalizer files.

- [x] `README.md`
- [x] `ARCHITECTURE.md`
- [x] `.gitignore`
- [x] `.env.example`
- [x] `package.json`
- [x] `package-lock.json`
- [x] `vite.config.js`
- [x] `eslint.config.js`
- [x] `index.html`
- [x] `public/sw.js`
- [x] `public/icon.svg`
- [x] `backend/src/Vela.Api/Vela.Api.csproj`
- [x] `backend/src/Vela.Api/Properties/launchSettings.json`
- [x] `backend/src/Vela.Api/appsettings.example.json`
- [x] `backend/src/Vela.Api/appsettings.Development.example.json`

## 1. Backend Data Contract

Read the database contract before the C# layers. The backend uses stored procedures instead of an ORM, so these files explain what the DAL is allowed to do.

- [x] 1. `backend/src/Vela.Api/Database/README.md`
- [x] 2. `backend/src/Vela.Api/Database/Tables/Users.sql`
- [x] 3. `backend/src/Vela.Api/Database/Tables/Favorites.sql`
- [x] 4. `backend/src/Vela.Api/Database/Tables/Recommendations.sql`
- [x] 5. `backend/src/Vela.Api/Database/Tables/StarPartyEvents.sql`
- [x] 6. `backend/src/Vela.Api/Database/SP/User SPs.sql`
- [x] 7. `backend/src/Vela.Api/Database/SP/Favorite SPs.sql`
- [x] 8. `backend/src/Vela.Api/Database/SP/Recommendation SPs.sql`
- [x] 9. `backend/src/Vela.Api/Database/SP/StarParty SPs.sql`
- [x] 10. `backend/src/Vela.Api/Database/Seed/InitialContent.sql`
- [x] 11. `backend/src/Vela.Api/DTOs/UserDtos.cs`
- [x] 12. `backend/src/Vela.Api/DTOs/FavoriteDtos.cs`
- [x] 13. `backend/src/Vela.Api/DTOs/RecommendationDtos.cs`
- [x] 14. `backend/src/Vela.Api/DTOs/StarPartyDtos.cs`
- [x] 15. `backend/src/Vela.Api/DTOs/SkyMapDtos.cs`
- [x] 16. `backend/src/Vela.Api/Models/User.cs`

## 2. Backend Runtime And API

This pass explains how HTTP requests enter the backend and move through validation, business logic, and SQL.

- [ ] 1. `backend/src/Vela.Api/Program.cs`
- [ ] 2. `backend/src/Vela.Api/Configuration/ValidationConfig.cs`
- [ ] 3. `backend/src/Vela.Api/Configuration/RequestValidator.cs`
- [ ] 4. `backend/src/Vela.Api/Controllers/UsersController.cs`
- [ ] 5. `backend/src/Vela.Api/Controllers/FavoritesController.cs`
- [ ] 6. `backend/src/Vela.Api/Controllers/RecommendationsController.cs`
- [ ] 7. `backend/src/Vela.Api/Controllers/StarPartyEventsController.cs`
- [ ] 8. `backend/src/Vela.Api/Controllers/SkyMapController.cs`
- [ ] 9. `backend/src/Vela.Api/BL/User.cs`
- [ ] 10. `backend/src/Vela.Api/BL/Favorite.cs`
- [ ] 11. `backend/src/Vela.Api/BL/Recommendation.cs`
- [ ] 12. `backend/src/Vela.Api/BL/StarPartyEvent.cs`
- [ ] 13. `backend/src/Vela.Api/DAL/DBService.cs`
- [ ] 14. `backend/src/Vela.Api/DAL/UserService.cs`
- [ ] 15. `backend/src/Vela.Api/DAL/FavoriteService.cs`
- [ ] 16. `backend/src/Vela.Api/DAL/RecommendationService.cs`
- [ ] 17. `backend/src/Vela.Api/DAL/StarPartyEventService.cs`
- [ ] 18. `backend/src/Vela.Api/Application/VisiblePlanetsProxyResponse.cs`
- [ ] 19. `backend/src/Vela.Api/Application/VisiblePlanetsService.cs`
- [ ] 20. `backend/src/Vela.Api/Application/LightmapTileResponse.cs`
- [ ] 21. `backend/src/Vela.Api/Application/WorldAtlas/WorldAtlasConstants.cs`
- [ ] 22. `backend/src/Vela.Api/Application/WorldAtlas/WorldAtlasTypes.cs`
- [ ] 23. `backend/src/Vela.Api/Application/WorldAtlas/WorldAtlasMath.cs`
- [ ] 24. `backend/src/Vela.Api/Application/WorldAtlas/WorldAtlasDataLoader.cs`
- [ ] 25. `backend/src/Vela.Api/Application/WorldAtlasService.cs`
- [ ] 26. `backend/src/Vela.Api/Data/land-10m.geojson`
- [ ] 27. `backend/src/Vela.Api/Data/countries-10m.geojson`

## 3. Frontend Bootstrap

This pass explains how the SPA starts, how routes are wired, and what global state each page receives.

- [x] 2. `src/main.jsx`
- [x] 3. `src/router.jsx`
- [x] 4. `src/layouts/AppLayout.jsx`
- [x] 5. `src/utils/appState.js`
- [x] 6. `src/utils/navigation.js`
- [x] 7. `src/utils/hardwareUtils.js`
- [x] 8. `src/features/notifications/NotificationProvider.jsx`
- [x] 9. `src/utils/notifications.js`
- [x] 10. `src/components/ToastNotifications.jsx`
- [x] 12. `src/components/Navbar.jsx`
- [x] 13. `src/components/ProfileMenu.jsx`
- [x] 16. `src/components/layout/PageShell.jsx`
- [x] 24. `src/components/ConfirmDialog.jsx`
- [x] 26. `src/hooks/usePortalTarget.js`

## 4. Frontend API Clients And Shared State

These files are the bridge between the UI and backend.

- [x] 1. `src/utils/apiEndpoints.js`
- [x] 2. `src/features/auth/authStorage.js`
- [x] 3. `src/features/auth/auth.js`
- [x] 4. `src/features/auth/useAuth.js`
- [x] 5. `src/utils/passwordRules.js`
- [x] 6. `src/utils/profileApi.js`
- [x] 7. `src/utils/adminUsersApi.js`
- [x] 8. `src/utils/favoritesApi.js`
- [x] 9. `src/utils/recommendationsApi.js`
- [x] 10. `src/utils/starPartyEventsApi.js`
- [x] 11. `src/features/starParty/starPartyUtils.js`
- [x] 12. `src/utils/planetUtils.js`
- [x] 13. `src/utils/skyQuality.js`
- [x] 14. `src/utils/darkSpots.js`
- [x] 15. `src/utils/geo.js`
- [x] 16. `src/utils/dateTime.js`
- [x] 17. `src/utils/mapLinks.js`
- [x] 18. `src/utils/clipboard.js`
- [x] 19. `src/utils/muiTheme.js`
- [x] 20. `src/features/app/hooks/useUserPreferences.js`
- [x] 21. `src/features/app/hooks/useLocationTracking.js`
- [x] 22. `src/features/app/hooks/useStargazeLocations.js`
- [x] 23. `src/features/app/hooks/useStarPartyEvents.js`
- [x] 24. `src/features/map/favoritesStorage.js`
- [x] 25. `src/features/map/usePlanets.js`
- [x] 26. `src/features/map/useMapFavorites.js`

## 5. Home Map Feature

This is the largest feature. Read the orchestration files first, then the supporting hooks, then the render tree.

### 5A. Map Orchestration

- [ ] 1. `src/pages/Map/MapView.jsx`
- [ ] 2. `src/pages/Map/MapView/hooks/useMapViewState.js`
- [ ] 3. `src/pages/Map/MapView/core/mapConfig.js`
- [ ] 4. `src/pages/Map/MapView/core/mapUtils.js`
- [ ] 5. `src/pages/Map/MapView/core/mapDerivedState.js`
- [ ] 6. `src/pages/Map/MapView/core/mapInteractionTargets.js`
- [ ] 7. `src/pages/Map/MapView/core/markerIcons.js`
- [ ] 8. `src/pages/Map/MapView/core/MapInteractionHandlers.jsx`

### 5B. Map Behavior Hooks

- [ ] 1. `src/pages/Map/MapView/hooks/useMapViewUiState.js`
- [ ] 2. `src/pages/Map/MapView/hooks/useMapStargaze.js`
- [ ] 3. `src/pages/Map/MapView/hooks/useMapDirections.js`
- [ ] 4. `src/pages/Map/MapView/hooks/useMapCameraHandlers.js`
- [ ] 5. `src/pages/Map/MapView/hooks/useMapActionHandlers.js`
- [ ] 6. `src/pages/Map/MapView/hooks/useMapInteractions.js`
- [ ] 7. `src/pages/Map/MapView/hooks/useMapTargetToggleHandlers.js`
- [ ] 8. `src/pages/Map/MapView/hooks/useMapSelectionEffects.js`
- [ ] 9. `src/pages/Map/MapView/hooks/useMapEventRsvp.js`
- [ ] 10. `src/pages/Map/MapView/hooks/useZoomMarkerVisibility.js`

### 5C. Map Render Tree

- [ ] 1. `src/pages/Map/MapView/components/MapViewport.jsx`
- [ ] 2. `src/pages/Map/MapView/components/layers/MapLibre3DLayer.jsx`
- [ ] 3. `src/pages/Map/MapView/components/layers/markers/LocationMarker.jsx`
- [ ] 4. `src/pages/Map/MapView/components/layers/markers/PlacedMarker.jsx`
- [ ] 5. `src/pages/Map/MapView/components/layers/markers/StargazeMarkers.jsx`
- [ ] 6. `src/pages/Map/MapView/components/layers/markers/DarkSpotMarkers.jsx`
- [ ] 7. `src/pages/Map/MapView/components/layers/markers/FavoriteOnlyMarkers.jsx`
- [ ] 8. `src/pages/Map/MapView/components/layers/markers/StarPartyMarkers.jsx`
- [ ] 9. `src/pages/Map/MapView/components/popups/SkyQualityInfo.jsx`
- [ ] 10. `src/pages/Map/MapView/components/popups/ContextMenuPopup.jsx`
- [ ] 11. `src/pages/Map/MapView/components/popups/content/copyCoordinates.js`
- [ ] 12. `src/pages/Map/MapView/components/popups/content/LocationPopupContent.jsx`
- [ ] 13. `src/pages/Map/MapView/components/popups/content/PinnedPopupContent.jsx`
- [ ] 14. `src/pages/Map/MapView/components/popups/content/StargazePopupContent.jsx`
- [ ] 15. `src/pages/Map/MapView/components/popups/content/DarkSpotPopupContent.jsx`
- [ ] 16. `src/pages/Map/MapView/components/popups/content/FavoritePopupContent.jsx`
- [ ] 17. `src/pages/Map/MapView/components/popups/content/StarPartyPopupContent.jsx`
- [ ] 18. `src/pages/Map/MapView/components/MapPanels.jsx`
- [ ] 19. `src/pages/Map/MapView/components/panels/stargaze/StargazePanelContent.jsx`
- [ ] 20. `src/pages/Map/MapView/components/panels/stargaze/StargazePanelMobile.jsx`
- [ ] 21. `src/pages/Map/MapView/components/search/LocationSearchBar.jsx`
- [ ] 22. `src/pages/Map/MapView/components/controls/MapQuickActions.jsx`
- [ ] 23. `src/pages/Map/MapView/components/controls/SearchDistanceSelector.jsx`
- [ ] 24. `src/pages/Map/MapView/components/controls/MapTypeSwitcher.jsx`

### 5D. Planet Panel

- [ ] 1. `src/pages/Map/PlanetPanel/planetInfoUtils.js`
- [ ] 2. `src/pages/Map/PlanetPanel/planetArUtils.js`
- [ ] 3. `src/pages/Map/PlanetPanel/PlanetPanelContainer.jsx`
- [ ] 4. `src/pages/Map/PlanetPanel/PlanetPanel.jsx`
- [ ] 5. `src/pages/Map/PlanetPanel/PlanetPanelMobile.jsx`
- [ ] 6. `src/pages/Map/PlanetPanel/PlanetCard.jsx`
- [ ] 7. `src/pages/Map/PlanetPanel/PlanetInfoCard.jsx`
- [ ] 8. `src/pages/Map/PlanetPanel/PlanetArOverlay.jsx`

## 6. Discovery Feature

Read this after the map because Discovery reuses map concepts and sends the user back to map selections.

- [ ] 1. `src/pages/Discovery/DiscoveryPage.jsx`
- [ ] 2. `src/pages/Discovery/discoveryUtils.js`
- [ ] 3. `src/pages/Discovery/discoveryStyles.js`
- [ ] 4. `src/pages/Discovery/hooks/useDiscoveryData.js`
- [ ] 5. `src/pages/Discovery/hooks/useDiscoveryInsights.js`
- [ ] 6. `src/pages/Discovery/hooks/useDiscoveryActions.js`
- [ ] 7. `src/pages/Discovery/components/DiscoveryShared.jsx`
- [ ] 8. `src/pages/Discovery/components/DiscoverySections.jsx`

## 7. Account, Settings, And Admin

These routes sit on top of the shared auth, settings, recommendations, events, and admin-user APIs.

### Auth, Profile, Settings

- [ ] 1. `src/pages/Auth/AuthPage.jsx`
- [ ] 3. `src/pages/Profile/ProfilePage.jsx`
- [ ] 4. `src/pages/Settings/SettingsPage.jsx`

### Admin

- [ ] 1. `src/pages/Admin/AdminPage.jsx`
- [ ] 2. `src/pages/Admin/adminConstants.js`
- [ ] 3. `src/pages/Admin/adminUtils.js`
- [ ] 4. `src/pages/Admin/adminEventUtils.js`
- [ ] 5. `src/pages/Admin/adminSubmission.js`
- [ ] 6. `src/pages/Admin/adminViewUtils.js`
- [ ] 7. `src/pages/Admin/useAdminUsers.js`
- [ ] 8. `src/pages/Admin/hooks/useAdminWorkspaceView.js`
- [ ] 9. `src/pages/Admin/hooks/useAdminWorkspaceActions.js`
- [ ] 10. `src/pages/Admin/components/AdminAccessNotice.jsx`
- [ ] 11. `src/pages/Admin/components/AdminCollectionSection.jsx`
- [ ] 12. `src/pages/Admin/components/AdminWorkspaceSections.jsx`
- [ ] 13. `src/pages/Admin/AdminLocationForm.jsx`
- [ ] 14. `src/pages/Admin/AdminLocationList.jsx`
- [ ] 15. `src/pages/Admin/AdminEventForm.jsx`
- [ ] 16. `src/pages/Admin/AdminEventList.jsx`
- [ ] 17. `src/pages/Admin/AdminUserList.jsx`
- [ ] 18. `src/pages/Admin/AdminDatePicker.jsx`
- [ ] 19. `src/pages/Admin/AdminTimePicker.jsx`

## 8. Astronomy Pages

These are mostly client-side visual/astronomy features.

### Moon Phase

- [ ] 1. `src/pages/MoonPhase/MoonPhasePage.jsx`
- [ ] 2. `src/pages/MoonPhase/useMoonPhase.js`
- [ ] 3. `src/pages/MoonPhase/moonPhaseCore.js`
- [ ] 4. `src/pages/MoonPhase/moonPhaseAstronomy.js`
- [ ] 5. `src/pages/MoonPhase/moonPhaseObservationPlan.js`

### Solar System

- [ ] 1. `src/pages/SolarSystem/SolarSystemPage.jsx`
- [ ] 2. `src/pages/SolarSystem/solarSystemData.js`
- [ ] 3. `src/pages/SolarSystem/components/SolarSystemScene.jsx`
- [ ] 4. `src/pages/SolarSystem/components/SolarSystemPanel.jsx`

### Constellations

- [ ] 1. `src/pages/Constellations/ConstellationsPage.jsx`
- [ ] 2. `src/pages/Constellations/constellationData.js`
- [ ] 3. `src/pages/Constellations/constellationViewUtils.js`
- [ ] 4. `src/pages/Constellations/components/ConstellationsMap.jsx`
- [ ] 5. `src/pages/Constellations/components/ConstellationsPanel.jsx`

## 9. Shared 3D Components, Global Styles, And Assets

Read these after the pages that use them.

### Shared Planet Globes

- [ ] 1. `src/components/planets/EarthGlobe.jsx`
- [ ] 2. `src/components/planets/JupiterGlobe.jsx`
- [ ] 3. `src/components/planets/MoonGlobe.jsx`
- [ ] 4. `src/components/planets/NeptuneGlobe.jsx`
- [ ] 5. `src/components/planets/SaturnGlobe.jsx`
