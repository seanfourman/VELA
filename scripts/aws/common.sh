#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
SCRIPTS_DIR="$ROOT_DIR/scripts"
AWS_SCRIPTS_DIR="$ROOT_DIR/scripts/aws"

CONFIG_FILE=${AWS_CONFIG_FILE:-"$AWS_SCRIPTS_DIR/config.env"}
if [[ -f "$CONFIG_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
  set +a
fi

AWS_REGION=${AWS_REGION:-us-east-1}
AWS_PROFILE=${AWS_PROFILE:-}
OUTPUTS_FILE=${OUTPUTS_FILE:-"$ROOT_DIR/scripts/aws/outputs.env"}
ARTIFACTS_DIR=${ARTIFACTS_DIR:-"$ROOT_DIR/scripts/aws/artifacts"}
LAMBDA_SRC_DIR=${LAMBDA_SRC_DIR:-"$ROOT_DIR/scripts/aws/lambdas"}
LAMBDA_ROLE_NAME=${LAMBDA_ROLE_NAME:-vela-lambda-role}
LAMBDA_POLICY_NAME=${LAMBDA_POLICY_NAME:-vela-lambda-access}

mkdir -p "$ARTIFACTS_DIR"

ensure_aws_cli() {
  if ! command -v aws >/dev/null 2>&1; then
    echo "aws CLI not found. Install it and retry." >&2
    exit 1
  fi
}

aws_cli() {
  if [[ -n "$AWS_PROFILE" ]]; then
    aws --profile "$AWS_PROFILE" --region "$AWS_REGION" "$@"
  else
    aws --region "$AWS_REGION" "$@"
  fi
}

require_env() {
  local name=$1
  if [[ -z "${!name:-}" ]]; then
    echo "Missing env var: $name" >&2
    exit 1
  fi
}

resolve_lambda_role_arn() {
  if [[ -n "${LAMBDA_ROLE_ARN:-}" ]]; then
    return
  fi

  local arn
  arn=$(aws_cli iam get-role \
    --role-name "$LAMBDA_ROLE_NAME" \
    --query Role.Arn \
    --output text 2>/dev/null || true)

  if [[ -z "$arn" || "$arn" == "None" ]]; then
    echo "Missing LAMBDA_ROLE_ARN and role '$LAMBDA_ROLE_NAME' not found. Run scripts/aws/deploy-iam.sh." >&2
    exit 1
  fi

  LAMBDA_ROLE_ARN="$arn"
}

load_outputs() {
  if [[ -f "$OUTPUTS_FILE" ]]; then
    set -a
    . "$OUTPUTS_FILE"
    set +a
  fi
}

write_output() {
  local key=$1
  local value=$2
  python - <<PY
import pathlib
path = pathlib.Path("$OUTPUTS_FILE")
lines = []
if path.exists():
    lines = path.read_text().splitlines()
lines = [line for line in lines if not line.startswith(f"{key}=")]
lines.append(f"{key}={value}")
path.write_text("\n".join(lines) + "\n")
PY
}

package_python_lambda() {
  local module_name=$1
  local source_path=$2
  local zip_path=$3

  python - <<PY
import pathlib
import zipfile

src = pathlib.Path("$source_path")
zip_path = pathlib.Path("$zip_path")

with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    zf.write(src, arcname=f"{module_name}.py")
PY
}

resolve_artifact() {
  local filename=$1
  local candidates=(
    "$AWS_SCRIPTS_DIR/$filename"
    "$SCRIPTS_DIR/$filename"
    "$ARTIFACTS_DIR/$filename"
  )

  for path in "${candidates[@]}"; do
    if [[ -f "$path" ]]; then
      echo "$path"
      return 0
    fi
  done

  return 1
}

resolve_artifact_glob() {
  local pattern=$1
  local dirs=(
    "$AWS_SCRIPTS_DIR"
    "$SCRIPTS_DIR"
    "$ARTIFACTS_DIR"
  )

  shopt -s nullglob
  for dir in "${dirs[@]}"; do
    for path in "$dir"/$pattern; do
      if [[ -f "$path" ]]; then
        echo "$path"
        shopt -u nullglob
        return 0
      fi
    done
  done
  shopt -u nullglob

  return 1
}

upsert_lambda() {
  local function_name=$1
  local runtime=$2
  local handler=$3
  local role_arn=$4
  local zip_path=$5

  if aws_cli lambda get-function --function-name "$function_name" >/dev/null 2>&1; then
    aws_cli lambda update-function-code \
      --function-name "$function_name" \
      --zip-file "fileb://$zip_path" >/dev/null
    aws_cli lambda update-function-configuration \
      --function-name "$function_name" \
      --runtime "$runtime" \
      --handler "$handler" \
      --role "$role_arn" >/dev/null
  else
    aws_cli lambda create-function \
      --function-name "$function_name" \
      --runtime "$runtime" \
      --handler "$handler" \
      --role "$role_arn" \
      --zip-file "fileb://$zip_path" >/dev/null
  fi
}

get_api_id_by_name() {
  local name=$1
  aws_cli apigatewayv2 get-apis \
    --query "Items[?Name=='$name'].ApiId | [0]" \
    --output text
}

create_http_api() {
  local name=$1
  local cors_methods=$2

  local api_id
  api_id=$(get_api_id_by_name "$name")
  if [[ -n "$api_id" && "$api_id" != "None" ]]; then
    aws_cli apigatewayv2 update-api \
      --api-id "$api_id" \
      --cors-configuration "AllowOrigins=*,AllowHeaders=*,AllowMethods=$cors_methods" >/dev/null
    echo "$api_id"
    return
  fi

  api_id=$(aws_cli apigatewayv2 create-api \
    --name "$name" \
    --protocol-type HTTP \
    --query ApiId \
    --output text)

  aws_cli apigatewayv2 update-api \
    --api-id "$api_id" \
    --cors-configuration "AllowOrigins=*,AllowHeaders=*,AllowMethods=$cors_methods" >/dev/null

  echo "$api_id"
}

create_integration() {
  local api_id=$1
  local lambda_arn=$2

  aws_cli apigatewayv2 create-integration \
    --api-id "$api_id" \
    --integration-type AWS_PROXY \
    --integration-uri "$lambda_arn" \
    --payload-format-version 2.0 \
    --query IntegrationId \
    --output text
}

create_route() {
  local api_id=$1
  local route_key=$2
  local integration_id=$3

  local route_id
  route_id=$(aws_cli apigatewayv2 get-routes \
    --api-id "$api_id" \
    --query "Items[?RouteKey=='$route_key'].RouteId | [0]" \
    --output text)

  if [[ -n "$route_id" && "$route_id" != "None" ]]; then
    aws_cli apigatewayv2 update-route \
      --api-id "$api_id" \
      --route-id "$route_id" \
      --target "integrations/$integration_id" >/dev/null
    return
  fi

  aws_cli apigatewayv2 create-route \
    --api-id "$api_id" \
    --route-key "$route_key" \
    --target "integrations/$integration_id" >/dev/null
}

create_stage() {
  local api_id=$1
  local stage_name=$2

  local existing_stage
  existing_stage=$(aws_cli apigatewayv2 get-stages \
    --api-id "$api_id" \
    --query "Items[?StageName=='$stage_name'].StageName | [0]" \
    --output text)

  if [[ -n "$existing_stage" && "$existing_stage" != "None" ]]; then
    aws_cli apigatewayv2 update-stage \
      --api-id "$api_id" \
      --stage-name "$stage_name" \
      --auto-deploy >/dev/null
    return
  fi

  aws_cli apigatewayv2 create-stage \
    --api-id "$api_id" \
    --stage-name "$stage_name" \
    --auto-deploy >/dev/null
}

add_lambda_permission_for_principal() {
  local function_name=$1
  local statement_id=$2
  local principal=$3
  local source_arn=$4

  if aws_cli lambda get-policy --function-name "$function_name" >/dev/null 2>&1; then
    if aws_cli lambda get-policy --function-name "$function_name" | grep -q "$statement_id"; then
      return
    fi
  fi

  aws_cli lambda add-permission \
    --function-name "$function_name" \
    --statement-id "$statement_id" \
    --action lambda:InvokeFunction \
    --principal "$principal" \
    --source-arn "$source_arn" >/dev/null
}

add_lambda_permission() {
  local function_name=$1
  local statement_id=$2
  local source_arn=$3

  add_lambda_permission_for_principal \
    "$function_name" \
    "$statement_id" \
    "apigateway.amazonaws.com" \
    "$source_arn"
}
