# API Mapping — Frontend to Backend

This document maps frontend helpers to deployed HTTP routes and Lambda handlers, including example requests and responses.

## Mapping table
- `POST /favorites` — `favorites_handler.py`
  - Auth: Required (Cognito JWT)
  - Request: JSON { "lat": 12.345678, "lon": -98.765432 }
  - Response: 201 on success, 409 if already favorited
  - Frontend: `src/utils/favoritesApi.js -> saveFavorite(spot)`

- `GET /favorites` — `get_favorites_handler.py`
  - Auth: Required
  - Request: Authorization header
  - Response: 200 { items: [...] }
  - Frontend: `src/utils/favoritesApi.js -> getFavorites()`

- `DELETE /favorites/{spotId}` — `delete_favorite_handler.py`
  - Auth: Required
  - Request: path param `spotId`
  - Response: 200
  - Frontend: `src/utils/favoritesApi.js -> deleteFavorite(spotId)`

- `POST /recommendations` — `post_recommendation_handler.py`
  - Auth: Optional/Depends — check handler comments
  - Frontend: `src/utils/recommendationsApi.js -> postRecommendation()`

- `GET /recommendations` — `get_recommendations_handler.py`
  - Auth: Optional
  - Frontend: `src/utils/recommendationsApi.js -> getRecommendations()`

- `DELETE /recommendations/{id}` — `delete_recommendation_handler.py`
  - Auth: Admin or owner — check handler

- `GET /visible-planets` — `visible_planets_lambda.py`
  - Auth: Public
  - Query params: `lat`, `lon`, `date` (optional)
  - Frontend: `src/utils/planetUtils.js -> fetchVisiblePlanets()`

## Example curl (favorites)

```bash
curl -X POST "${VITE_API_BASE}/favorites" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"lat": 12.345678, "lon": -98.765432}'
```

## Verification
- Confirm example requests match parsing logic in `scripts/aws/lambdas/*.py` (body parsing, required fields).
