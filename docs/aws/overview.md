# VELA — AWS Serverless Overview

This document summarizes the VELA project's AWS serverless backend: high-level architecture, responsibilities, and how the frontend maps to backend services.

## Architecture (one-paragraph)
VELA uses an AWS serverless backend for optional features: Cognito for authentication, API Gateway (HTTP API) for routing, Lambda functions implementing business logic, DynamoDB for favorites and recommendations, and S3/CloudFront for static assets and optional lightmap tiles. The Vite dev server provides local dev endpoints for sky-quality and lightmap tiles using a GeoTIFF for offline development.

## Core Components
- Cognito Hosted UI (PKCE) — user authentication and JWT issuance.
- API Gateway (HTTP API) — routes frontend requests to Lambda handlers.
- Lambda functions — implement favorites, recommendations, visible-planets proxy, and Cognito triggers.
- DynamoDB — stores favorites and recommendations.
- S3 + CloudFront — optional for static hosting and tile assets.

## Quick mapping (high level)
- `POST /favorites` -> `favorites_handler.py`
- `GET /favorites` -> `get_favorites_handler.py`
- `DELETE /favorites/{spotId}` -> `delete_favorite_handler.py`
- `POST /recommendations` -> `post_recommendation_handler.py`
- `GET /recommendations` -> `get_recommendations_handler.py`
- `DELETE /recommendations/{id}` -> `delete_recommendation_handler.py`
- `GET /visible-planets` -> `visible_planets_lambda.py` (proxy)

## Where to find code
- Frontend endpoint builders: `src/utils/awsEndpoints.js`
- Frontend API clients: `src/utils/favoritesApi.js`, `src/utils/recommendationsApi.js`, `src/utils/skyQuality.js`
- Lambda source: `scripts/aws/lambdas/`
- Deploy flow: `scripts/aws/deploy.py` and `scripts/aws/config.env`

## Verification
- Confirm that `scripts/aws/config.env` and `scripts/aws/deploy.py` contain the artifact names listed in this docs set.
# VELA — AWS Serverless Overview

This document summarizes the VELA project's AWS serverless backend: high-level architecture, responsibilities, and how the frontend maps to backend services.

## Architecture (one-paragraph)
VELA uses an AWS serverless backend for optional features: Cognito for authentication, API Gateway (HTTP API) for routing, Lambda functions implementing business logic, DynamoDB for favorites and recommendations, and S3/CloudFront for static assets and optional lightmap tiles. The Vite dev server provides local dev endpoints for sky-quality and lightmap tiles using a GeoTIFF for offline development.

## Core Components
- Cognito Hosted UI (PKCE) — user authentication and JWT issuance.
- API Gateway (HTTP API) — routes frontend requests to Lambda handlers.
- Lambda functions — implement favorites, recommendations, visible-planets proxy, and Cognito triggers.
- DynamoDB — stores favorites and recommendations.
- S3 + CloudFront — optional for static hosting and tile assets.

## Quick mapping (high level)
- `POST /favorites` -> `favorites_handler.py`
- `GET /favorites` -> `get_favorites_handler.py`
- `DELETE /favorites/{spotId}` -> `delete_favorite_handler.py`
- `POST /recommendations` -> `post_recommendation_handler.py`
- `GET /recommendations` -> `get_recommendations_handler.py`
- `DELETE /recommendations/{id}` -> `delete_recommendation_handler.py`
- `GET /visible-planets` -> `visible_planets_lambda.py` (proxy)

## Where to find code
- Frontend endpoint builders: `src/utils/awsEndpoints.js`
- Frontend API clients: `src/utils/favoritesApi.js`, `src/utils/recommendationsApi.js`, `src/utils/skyQuality.js`
- Lambda source: `scripts/aws/lambdas/`
- Deploy flow: `scripts/aws/deploy.py` and `scripts/aws/config.env`

## Verification
- Confirm that `scripts/aws/config.env` and `scripts/aws/deploy.py` contain the artifact names listed in this docs set.
