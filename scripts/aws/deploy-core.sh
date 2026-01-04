#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

ensure_aws_cli
resolve_lambda_role_arn

VELA_PREFIX=${VELA_PREFIX:-vela}
AWS_ACCOUNT_ID=$(aws_cli sts get-caller-identity --query Account --output text)

PY_RUNTIME=${PY_RUNTIME:-python3.12}
NODE_RUNTIME=${NODE_RUNTIME:-nodejs24.x}

VISIBLE_PLANETS_FUNCTION=${VISIBLE_PLANETS_FUNCTION:-visible-planets-lambda}
LIGHTPOLLUTION_FUNCTION=${LIGHTPOLLUTION_FUNCTION:-lightpollution-lambda}
SKYQUALITY_FUNCTION=${SKYQUALITY_FUNCTION:-skyquality-tiles-lambda}

VISIBLE_PLANETS_ROUTE=${VISIBLE_PLANETS_ROUTE:-"GET /visible-planets-lambda"}
LIGHTPOLLUTION_ROUTE=${LIGHTPOLLUTION_ROUTE:-"GET /lightpollution-lambda"}

if [[ -z "${TIF_PATH:-}" ]]; then
  if ! TIF_PATH=$(resolve_artifact "World_Atlas_2015.tif"); then
    TIF_PATH="$ROOT_DIR/data/World_Atlas_2015.tif"
  fi
fi
TIF_KEY=${TIF_KEY:-"tifs/World_Atlas_2015.tif"}

if [[ -z "${LIGHTPOLLUTION_ZIP:-}" ]]; then
  if ! LIGHTPOLLUTION_ZIP=$(resolve_artifact "lightpollution-lambda.zip"); then
    if ! LIGHTPOLLUTION_ZIP=$(resolve_artifact_glob "lightpollution-lambda*.zip"); then
      LIGHTPOLLUTION_ZIP="$ARTIFACTS_DIR/lightpollution-lambda.zip"
    fi
  fi
fi

if [[ -z "${SKYQUALITY_TILES_ZIP:-}" ]]; then
  if ! SKYQUALITY_TILES_ZIP=$(resolve_artifact "skyquality-tiles-lambda.zip"); then
    if ! SKYQUALITY_TILES_ZIP=$(resolve_artifact_glob "skyquality-tiles-lambda*.zip"); then
      SKYQUALITY_TILES_ZIP="$ARTIFACTS_DIR/skyquality-tiles-lambda.zip"
    fi
  fi
fi

if [[ ! -f "$TIF_PATH" ]]; then
  echo "Missing TIF file at $TIF_PATH" >&2
  exit 1
fi

if [[ ! -f "$LIGHTPOLLUTION_ZIP" ]]; then
  echo "Missing lightpollution zip at $LIGHTPOLLUTION_ZIP" >&2
  exit 1
fi

if [[ ! -f "$SKYQUALITY_TILES_ZIP" ]]; then
  echo "Missing skyquality tiles zip at $SKYQUALITY_TILES_ZIP" >&2
  exit 1
fi

if [[ -z "${TIF_BUCKET_NAME:-}" ]]; then
  TIF_BUCKET_NAME="${VELA_PREFIX}-tif-$(date +%Y%m%d%H%M%S)"
fi

if ! aws_cli s3api head-bucket --bucket "$TIF_BUCKET_NAME" >/dev/null 2>&1; then
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    aws_cli s3api create-bucket --bucket "$TIF_BUCKET_NAME" >/dev/null
  else
    aws_cli s3api create-bucket \
      --bucket "$TIF_BUCKET_NAME" \
      --create-bucket-configuration "LocationConstraint=$AWS_REGION" >/dev/null
  fi
  aws_cli s3api put-bucket-versioning \
    --bucket "$TIF_BUCKET_NAME" \
    --versioning-configuration Status=Enabled >/dev/null
fi

aws_cli s3 cp "$TIF_PATH" "s3://$TIF_BUCKET_NAME/$TIF_KEY" --no-progress >/dev/null

VISIBLE_ZIP="$ARTIFACTS_DIR/visible-planets-lambda.zip"
package_python_lambda \
  "visible_planets_lambda" \
  "$LAMBDA_SRC_DIR/visible_planets_lambda.py" \
  "$VISIBLE_ZIP"

upsert_lambda \
  "$VISIBLE_PLANETS_FUNCTION" \
  "$PY_RUNTIME" \
  "visible_planets_lambda.lambda_handler" \
  "$LAMBDA_ROLE_ARN" \
  "$VISIBLE_ZIP"

LIGHTPOLLUTION_HANDLER=${LIGHTPOLLUTION_HANDLER:-"lambda_function.lambda_handler"}
upsert_lambda \
  "$LIGHTPOLLUTION_FUNCTION" \
  "$PY_RUNTIME" \
  "$LIGHTPOLLUTION_HANDLER" \
  "$LAMBDA_ROLE_ARN" \
  "$LIGHTPOLLUTION_ZIP"

SKYQUALITY_HANDLER=${SKYQUALITY_HANDLER:-"index.handler"}
upsert_lambda \
  "$SKYQUALITY_FUNCTION" \
  "$NODE_RUNTIME" \
  "$SKYQUALITY_HANDLER" \
  "$LAMBDA_ROLE_ARN" \
  "$SKYQUALITY_TILES_ZIP"

aws_cli lambda update-function-configuration \
  --function-name "$SKYQUALITY_FUNCTION" \
  --timeout 30 \
  --memory-size 4096 \
  --environment "Variables={TIF_BUCKET=$TIF_BUCKET_NAME,TIF_KEY=$TIF_KEY}" >/dev/null

VISIBLE_API_ID=$(create_http_api "${VELA_PREFIX}-visible-planets-api" "GET,OPTIONS")
VISIBLE_LAMBDA_ARN=$(aws_cli lambda get-function --function-name "$VISIBLE_PLANETS_FUNCTION" --query Configuration.FunctionArn --output text)
VISIBLE_INTEGRATION_ID=$(create_integration "$VISIBLE_API_ID" "$VISIBLE_LAMBDA_ARN")
create_route "$VISIBLE_API_ID" "$VISIBLE_PLANETS_ROUTE" "$VISIBLE_INTEGRATION_ID"
create_stage "$VISIBLE_API_ID" "default"
add_lambda_permission \
  "$VISIBLE_PLANETS_FUNCTION" \
  "visible-planets-api" \
  "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$VISIBLE_API_ID/*/*"

LIGHT_API_ID=$(create_http_api "${VELA_PREFIX}-lightpollution-api" "GET,OPTIONS")
LIGHT_LAMBDA_ARN=$(aws_cli lambda get-function --function-name "$LIGHTPOLLUTION_FUNCTION" --query Configuration.FunctionArn --output text)
LIGHT_INTEGRATION_ID=$(create_integration "$LIGHT_API_ID" "$LIGHT_LAMBDA_ARN")
create_route "$LIGHT_API_ID" "$LIGHTPOLLUTION_ROUTE" "$LIGHT_INTEGRATION_ID"
create_stage "$LIGHT_API_ID" "default"
add_lambda_permission \
  "$LIGHTPOLLUTION_FUNCTION" \
  "lightpollution-api" \
  "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$LIGHT_API_ID/*/*"

SKY_API_ID=$(create_http_api "${VELA_PREFIX}-skyquality-api" "GET,OPTIONS")
SKY_LAMBDA_ARN=$(aws_cli lambda get-function --function-name "$SKYQUALITY_FUNCTION" --query Configuration.FunctionArn --output text)
SKY_INTEGRATION_ID=$(create_integration "$SKY_API_ID" "$SKY_LAMBDA_ARN")
create_route "$SKY_API_ID" "GET /skyquality" "$SKY_INTEGRATION_ID"
create_route "$SKY_API_ID" "GET /lightmap/{z}/{x}/{y}.png" "$SKY_INTEGRATION_ID"
create_stage "$SKY_API_ID" "default"
add_lambda_permission \
  "$SKYQUALITY_FUNCTION" \
  "skyquality-api" \
  "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$SKY_API_ID/*/*"

VISIBLE_PLANETS_URL="https://${VISIBLE_API_ID}.execute-api.${AWS_REGION}.amazonaws.com/default/visible-planets-lambda"
DARK_SPOTS_URL="https://${LIGHT_API_ID}.execute-api.${AWS_REGION}.amazonaws.com/default/lightpollution-lambda"
LIGHTMAP_API_BASE="https://${SKY_API_ID}.execute-api.${AWS_REGION}.amazonaws.com/default"

write_output VITE_VISIBLE_PLANETS_URL "$VISIBLE_PLANETS_URL"
write_output VITE_DARK_SPOTS_URL "$DARK_SPOTS_URL"
write_output VITE_LIGHTMAP_API_BASE "$LIGHTMAP_API_BASE"
write_output TIF_BUCKET_NAME "$TIF_BUCKET_NAME"
write_output TIF_KEY "$TIF_KEY"

echo "Core services deployed. Outputs saved to $OUTPUTS_FILE"
