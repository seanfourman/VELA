#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

ensure_aws_cli
load_outputs
resolve_lambda_role_arn

AWS_ACCOUNT_ID=$(aws_cli sts get-caller-identity --query Account --output text)

COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID:-${COGNITO_POOL_ID:-}}
COGNITO_APP_CLIENT_ID=${COGNITO_APP_CLIENT_ID:-}
COGNITO_ISSUER=${COGNITO_ISSUER:-}

if [[ -z "$COGNITO_USER_POOL_ID" ]]; then
  echo "Missing Cognito user pool id. Run deploy-auth.sh or set COGNITO_USER_POOL_ID." >&2
  exit 1
fi

if [[ -z "$COGNITO_APP_CLIENT_ID" ]]; then
  echo "Missing Cognito app client id. Run deploy-auth.sh or set COGNITO_APP_CLIENT_ID." >&2
  exit 1
fi

if [[ -z "$COGNITO_ISSUER" ]]; then
  COGNITO_ISSUER="https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}"
fi

USERS_TABLE=${USERS_TABLE:-Users}
FAV_TABLE=${FAV_TABLE:-UserFavorites}
REC_TABLE=${REC_TABLE:-Recommendations}

ensure_table() {
  local name=$1
  shift
  if aws_cli dynamodb describe-table --table-name "$name" >/dev/null 2>&1; then
    return
  fi
  aws_cli dynamodb create-table "$@" --table-name "$name" >/dev/null
  aws_cli dynamodb wait table-exists --table-name "$name"
}

ensure_table "$USERS_TABLE" \
  --billing-mode PAY_PER_REQUEST \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH

ensure_table "$FAV_TABLE" \
  --billing-mode PAY_PER_REQUEST \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=spotId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH AttributeName=spotId,KeyType=RANGE

ensure_table "$REC_TABLE" \
  --billing-mode PAY_PER_REQUEST \
  --attribute-definitions AttributeName=spotId,AttributeType=S \
  --key-schema AttributeName=spotId,KeyType=HASH

PY_RUNTIME=${PY_RUNTIME:-python3.12}

package_and_upsert() {
  local module=$1
  local function_name=$2
  local handler=$3
  local zip_path

  zip_path="$ARTIFACTS_DIR/${function_name}.zip"
  package_python_lambda "$module" "$LAMBDA_SRC_DIR/${module}.py" "$zip_path"
  upsert_lambda "$function_name" "$PY_RUNTIME" "$handler" "$LAMBDA_ROLE_ARN" "$zip_path"
}

CREATE_USER_LAMBDA=${CREATE_USER_LAMBDA:-CreateUserOnConfirm}
package_and_upsert create_user_on_confirm "$CREATE_USER_LAMBDA" "create_user_on_confirm.lambda_handler"
aws_cli lambda update-function-configuration \
  --function-name "$CREATE_USER_LAMBDA" \
  --environment "Variables={USERS_TABLE=$USERS_TABLE}" >/dev/null

CREATE_USER_ARN=$(aws_cli lambda get-function --function-name "$CREATE_USER_LAMBDA" --query Configuration.FunctionArn --output text)
aws_cli cognito-idp update-user-pool \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --lambda-config "PostConfirmation=$CREATE_USER_ARN" >/dev/null

add_lambda_permission_for_principal \
  "$CREATE_USER_LAMBDA" \
  "cognito-post-confirmation-${COGNITO_USER_POOL_ID}" \
  "cognito-idp.amazonaws.com" \
  "arn:aws:cognito-idp:$AWS_REGION:$AWS_ACCOUNT_ID:userpool/$COGNITO_USER_POOL_ID"

FAVORITES_LAMBDA=${FAVORITES_LAMBDA:-FavoritesHandler}
GET_FAVORITES_LAMBDA=${GET_FAVORITES_LAMBDA:-GetFavoritesHandler}
DELETE_FAVORITES_LAMBDA=${DELETE_FAVORITES_LAMBDA:-DeleteFavoriteHandler}

package_and_upsert favorites_handler "$FAVORITES_LAMBDA" "favorites_handler.lambda_handler"
package_and_upsert get_favorites_handler "$GET_FAVORITES_LAMBDA" "get_favorites_handler.lambda_handler"
package_and_upsert delete_favorite_handler "$DELETE_FAVORITES_LAMBDA" "delete_favorite_handler.lambda_handler"

aws_cli lambda update-function-configuration \
  --function-name "$FAVORITES_LAMBDA" \
  --environment "Variables={FAV_TABLE=$FAV_TABLE}" >/dev/null
aws_cli lambda update-function-configuration \
  --function-name "$GET_FAVORITES_LAMBDA" \
  --environment "Variables={FAV_TABLE=$FAV_TABLE}" >/dev/null
aws_cli lambda update-function-configuration \
  --function-name "$DELETE_FAVORITES_LAMBDA" \
  --environment "Variables={FAV_TABLE=$FAV_TABLE}" >/dev/null

POST_RECS_LAMBDA=${POST_RECS_LAMBDA:-PostRecommendationHandler}
GET_RECS_LAMBDA=${GET_RECS_LAMBDA:-GetRecommendationsHandler}
DELETE_RECS_LAMBDA=${DELETE_RECS_LAMBDA:-DeleteRecommendationsHandler}

package_and_upsert post_recommendation_handler "$POST_RECS_LAMBDA" "post_recommendation_handler.lambda_handler"
package_and_upsert get_recommendations_handler "$GET_RECS_LAMBDA" "get_recommendations_handler.lambda_handler"
package_and_upsert delete_recommendation_handler "$DELETE_RECS_LAMBDA" "delete_recommendation_handler.lambda_handler"

aws_cli lambda update-function-configuration \
  --function-name "$POST_RECS_LAMBDA" \
  --environment "Variables={REC_TABLE=$REC_TABLE}" >/dev/null
aws_cli lambda update-function-configuration \
  --function-name "$GET_RECS_LAMBDA" \
  --environment "Variables={REC_TABLE=$REC_TABLE}" >/dev/null
aws_cli lambda update-function-configuration \
  --function-name "$DELETE_RECS_LAMBDA" \
  --environment "Variables={REC_TABLE=$REC_TABLE}" >/dev/null

create_or_update_authorizer() {
  local api_id=$1
  local name=$2

  local auth_id
  auth_id=$(aws_cli apigatewayv2 get-authorizers \
    --api-id "$api_id" \
    --query "Items[?Name=='$name'].AuthorizerId | [0]" \
    --output text)

  if [[ -n "$auth_id" && "$auth_id" != "None" ]]; then
    aws_cli apigatewayv2 update-authorizer \
      --api-id "$api_id" \
      --authorizer-id "$auth_id" \
      --authorizer-type JWT \
      --identity-source '$request.header.Authorization' \
      --jwt-configuration "Audience=$COGNITO_APP_CLIENT_ID,Issuer=$COGNITO_ISSUER" >/dev/null
    echo "$auth_id"
    return
  fi

  auth_id=$(aws_cli apigatewayv2 create-authorizer \
    --api-id "$api_id" \
    --name "$name" \
    --authorizer-type JWT \
    --identity-source '$request.header.Authorization' \
    --jwt-configuration "Audience=$COGNITO_APP_CLIENT_ID,Issuer=$COGNITO_ISSUER" \
    --query AuthorizerId \
    --output text)

  echo "$auth_id"
}

attach_authorizer_to_route() {
  local api_id=$1
  local route_key=$2
  local auth_id=$3

  local route_id
  route_id=$(aws_cli apigatewayv2 get-routes \
    --api-id "$api_id" \
    --query "Items[?RouteKey=='$route_key'].RouteId | [0]" \
    --output text)

  if [[ -z "$route_id" || "$route_id" == "None" ]]; then
    echo "Route not found: $route_key" >&2
    exit 1
  fi

  aws_cli apigatewayv2 update-route \
    --api-id "$api_id" \
    --route-id "$route_id" \
    --authorization-type JWT \
    --authorizer-id "$auth_id" >/dev/null
}

FAVORITES_API_ID=$(create_http_api "favoritesAPI" "GET,POST,DELETE,OPTIONS")
FAVORITES_STAGE='$default'
create_stage "$FAVORITES_API_ID" "$FAVORITES_STAGE"

FAV_LAMBDA_ARN=$(aws_cli lambda get-function --function-name "$FAVORITES_LAMBDA" --query Configuration.FunctionArn --output text)
GET_FAV_LAMBDA_ARN=$(aws_cli lambda get-function --function-name "$GET_FAVORITES_LAMBDA" --query Configuration.FunctionArn --output text)
DEL_FAV_LAMBDA_ARN=$(aws_cli lambda get-function --function-name "$DELETE_FAVORITES_LAMBDA" --query Configuration.FunctionArn --output text)

FAV_POST_INTEGRATION=$(create_integration "$FAVORITES_API_ID" "$FAV_LAMBDA_ARN")
FAV_GET_INTEGRATION=$(create_integration "$FAVORITES_API_ID" "$GET_FAV_LAMBDA_ARN")
FAV_DEL_INTEGRATION=$(create_integration "$FAVORITES_API_ID" "$DEL_FAV_LAMBDA_ARN")

create_route "$FAVORITES_API_ID" "POST /favorites" "$FAV_POST_INTEGRATION"
create_route "$FAVORITES_API_ID" "GET /favorites" "$FAV_GET_INTEGRATION"
create_route "$FAVORITES_API_ID" "DELETE /favorites/{spotId}" "$FAV_DEL_INTEGRATION"

FAV_AUTH_ID=$(create_or_update_authorizer "$FAVORITES_API_ID" "JWT-FAV")
attach_authorizer_to_route "$FAVORITES_API_ID" "POST /favorites" "$FAV_AUTH_ID"
attach_authorizer_to_route "$FAVORITES_API_ID" "GET /favorites" "$FAV_AUTH_ID"
attach_authorizer_to_route "$FAVORITES_API_ID" "DELETE /favorites/{spotId}" "$FAV_AUTH_ID"

add_lambda_permission \
  "$FAVORITES_LAMBDA" \
  "favorites-api-post" \
  "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$FAVORITES_API_ID/*/*"
add_lambda_permission \
  "$GET_FAVORITES_LAMBDA" \
  "favorites-api-get" \
  "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$FAVORITES_API_ID/*/*"
add_lambda_permission \
  "$DELETE_FAVORITES_LAMBDA" \
  "favorites-api-delete" \
  "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$FAVORITES_API_ID/*/*"

RECS_API_ID=$(create_http_api "recommendationsAPI" "GET,POST,DELETE,OPTIONS")
RECS_STAGE='$default'
create_stage "$RECS_API_ID" "$RECS_STAGE"

POST_RECS_ARN=$(aws_cli lambda get-function --function-name "$POST_RECS_LAMBDA" --query Configuration.FunctionArn --output text)
GET_RECS_ARN=$(aws_cli lambda get-function --function-name "$GET_RECS_LAMBDA" --query Configuration.FunctionArn --output text)
DEL_RECS_ARN=$(aws_cli lambda get-function --function-name "$DELETE_RECS_LAMBDA" --query Configuration.FunctionArn --output text)

POST_RECS_INTEGRATION=$(create_integration "$RECS_API_ID" "$POST_RECS_ARN")
GET_RECS_INTEGRATION=$(create_integration "$RECS_API_ID" "$GET_RECS_ARN")
DEL_RECS_INTEGRATION=$(create_integration "$RECS_API_ID" "$DEL_RECS_ARN")

create_route "$RECS_API_ID" "POST /recommendations" "$POST_RECS_INTEGRATION"
create_route "$RECS_API_ID" "GET /recommendations" "$GET_RECS_INTEGRATION"
create_route "$RECS_API_ID" "DELETE /recommendations/{spotId}" "$DEL_RECS_INTEGRATION"

RECS_AUTH_ID=$(create_or_update_authorizer "$RECS_API_ID" "JWT-REC")
attach_authorizer_to_route "$RECS_API_ID" "POST /recommendations" "$RECS_AUTH_ID"
attach_authorizer_to_route "$RECS_API_ID" "DELETE /recommendations/{spotId}" "$RECS_AUTH_ID"

add_lambda_permission \
  "$POST_RECS_LAMBDA" \
  "recommendations-api-post" \
  "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$RECS_API_ID/*/*"
add_lambda_permission \
  "$GET_RECS_LAMBDA" \
  "recommendations-api-get" \
  "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$RECS_API_ID/*/*"
add_lambda_permission \
  "$DELETE_RECS_LAMBDA" \
  "recommendations-api-delete" \
  "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$RECS_API_ID/*/*"

FAVORITES_API_BASE="https://${FAVORITES_API_ID}.execute-api.${AWS_REGION}.amazonaws.com"
RECS_API_BASE="https://${RECS_API_ID}.execute-api.${AWS_REGION}.amazonaws.com"

write_output VITE_FAVORITES_API_BASE "$FAVORITES_API_BASE"
write_output VITE_RECOMMENDATIONS_API_BASE "$RECS_API_BASE"
write_output USERS_TABLE "$USERS_TABLE"
write_output FAV_TABLE "$FAV_TABLE"
write_output REC_TABLE "$REC_TABLE"

printf "Data APIs deployed. Outputs saved to %s\n" "$OUTPUTS_FILE"
