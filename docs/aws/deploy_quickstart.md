# Deploy Quickstart — VELA AWS Serverless

This file documents the minimal steps to deploy the serverless backend used by VELA. It assumes you have AWS CLI configured with necessary permissions and Python 3.10+ available.

## Required artifacts
- `World_Atlas_2015.tif` — a GeoTIFF used for sky-quality and lightmap tile generation. Place in one of these locations:
  - `scripts/aws/` or
  - `scripts/aws/artifacts/` or
  - `data/` or
  - `public/`

- Prebuilt lambda zip artifacts expected (place into `scripts/aws/artifacts/`):
  - `lightpollution-lambda.zip` (if used)
  - `skyquality-tiles-lambda.zip` (if used)
  - optionally `visible-planets-lambda.zip` if not built by deploy script

## Configuration
1. Copy `scripts/aws/config.env` and edit values for your environment. At minimum set:
   - `AWS_REGION`
   - `VPC_*` values if deploying into a VPC
   - `WORLD_ATLAS_TIF_KEY` if uploading TIF to S3
2. Ensure `VITE_COGNITO_*` and `VITE_*` front-end env variables will be populated from `scripts/aws/deploy.py` outputs or manually set in a `.env` file for local dev.
 
## Deploy steps (minimal)
```bash
# from repo root
python -m pip install -r requirements.txt  # if deploy script requires boto3, etc.
py scripts/aws/deploy.py --deploy
```

If `deploy.py` errors about missing artifacts, place the required zips and the TIF file in `scripts/aws/artifacts/` then re-run.

## Post-deploy
- `deploy.py` writes an `outputs.env` file. Copy relevant keys into frontend `.env` as `VITE_*` variables, for example:

```bash
cp scripts/aws/outputs.env .env
# or manually edit .env with values such as VITE_API_BASE, VITE_VISIBLE_PLANETS_URL, VITE_MAPTILER_KEY
```

## Verification
- Ensure `outputs.env` contains `VITE_API_BASE` and the frontend can access `GET /visible-planets` and `GET /favorites` endpoints.
# Deploy Quickstart — VELA AWS Serverless

This file documents the minimal steps to deploy the serverless backend used by VELA. It assumes you have AWS CLI configured with necessary permissions and Python 3.10+ available.

## Required artifacts
- `World_Atlas_2015.tif` — a GeoTIFF used for sky-quality and lightmap tile generation. Place in one of these locations:
  - `scripts/aws/` or
  - `scripts/aws/artifacts/` or
  - `data/` or
  - `public/`

- Prebuilt lambda zip artifacts expected (place into `scripts/aws/artifacts/`):
  - `lightpollution-lambda.zip` (if used)
  - `skyquality-tiles-lambda.zip` (if used)
  - optionally `visible-planets-lambda.zip` if not built by deploy script

## Configuration
1. Copy `scripts/aws/config.env` and edit values for your environment. At minimum set:
   - `AWS_REGION`
   - `VPC_*` values if deploying into a VPC
   - `WORLD_ATLAS_TIF_KEY` if uploading TIF to S3
2. Ensure `VITE_COGNITO_*` and `VITE_*` front-end env variables will be populated from `scripts/aws/deploy.py` outputs or manually set in a `.env` file for local dev.
 
## Deploy steps (minimal)
```bash
# from repo root
python -m pip install -r requirements.txt  # if deploy script requires boto3, etc.
py scripts/aws/deploy.py --deploy
```

If `deploy.py` errors about missing artifacts, place the required zips and the TIF file in `scripts/aws/artifacts/` then re-run.

## Post-deploy
- `deploy.py` writes an `outputs.env` file. Copy relevant keys into frontend `.env` as `VITE_*` variables, for example:

```bash
cp scripts/aws/outputs.env .env
# or manually edit .env with values such as VITE_API_BASE, VITE_VISIBLE_PLANETS_URL, VITE_MAPTILER_KEY
```

## Verification
- Ensure `outputs.env` contains `VITE_API_BASE` and the frontend can access `GET /visible-planets` and `GET /favorites` endpoints.
