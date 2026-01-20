# Known Gaps & Follow-ups

During repository research the following items were identified as missing or requiring clarification. Each item includes recommended action and an owner placeholder.

1. Missing prebuilt lambda zip artifacts
   - Files: `lightpollution-lambda.zip`, `skyquality-tiles-lambda.zip`
   - Impact: `deploy.py` cannot package/deploy these lambdas without zips or build instructions.
   - Action: Add build scripts or include prebuilt zips in `scripts/aws/artifacts/`.
   - Owner: @owner-team

2. Missing GeoTIFF: `World_Atlas_2015.tif`
   - Impact: Local dev sky-quality API and tile generation fail.
   - Action: Provide download link and place the file in `scripts/aws/` or `data/` as documented.
   - Owner: @owner-team

3. IAM least-privilege guidance
   - Impact: `deploy.py` attaches broad permissions by default.
   - Action: Provide per-lambda example IAM policies and recommend narrowing ARNs.
   - Owner: @security

4. Secrets management for external APIs
   - Action: Document how to store external API keys (VisiblePlanets key, Earth Engine creds) in Secrets Manager and reference them in `deploy.py`.
   - Owner: @backend

5. Doc language preference
   - The repository contains notes in English and Hebrew. Confirm primary language for docs.
   - Owner: @repo-owner
