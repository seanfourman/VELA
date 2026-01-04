#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

ensure_aws_cli

COGNITO_CALLBACK_URL=${COGNITO_CALLBACK_URL:-http://localhost:5173}
COGNITO_LOGOUT_URL=${COGNITO_LOGOUT_URL:-http://localhost:5173}

if [[ -z "${COGNITO_DOMAIN_PREFIX:-}" ]]; then
  COGNITO_DOMAIN_PREFIX=$(python - <<'PY'
import random
import string

suffix = "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(8))
print(f"vela-{suffix}")
PY
  )
fi

POOL_NAME=${COGNITO_USER_POOL_NAME:-VELA}
CLIENT_NAME=${COGNITO_APP_CLIENT_NAME:-VELA}

POOL_ID=$(aws_cli cognito-idp list-user-pools --max-results 60 \
  --query "UserPools[?Name=='$POOL_NAME'].Id | [0]" --output text)

if [[ -z "$POOL_ID" || "$POOL_ID" == "None" ]]; then
  POOL_ID=$(aws_cli cognito-idp create-user-pool \
    --pool-name "$POOL_NAME" \
    --username-attributes email \
    --auto-verified-attributes email \
    --schema Name=email,AttributeDataType=String,Required=true,Mutable=true \
    --query UserPool.Id \
    --output text)
fi

CLIENT_ID=$(aws_cli cognito-idp list-user-pool-clients \
  --user-pool-id "$POOL_ID" \
  --max-results 60 \
  --query "UserPoolClients[?ClientName=='$CLIENT_NAME'].ClientId | [0]" \
  --output text)

if [[ -z "$CLIENT_ID" || "$CLIENT_ID" == "None" ]]; then
  CLIENT_ID=$(aws_cli cognito-idp create-user-pool-client \
    --user-pool-id "$POOL_ID" \
    --client-name "$CLIENT_NAME" \
    --generate-secret false \
    --allowed-oauth-flows code \
    --allowed-oauth-flows-user-pool-client \
    --allowed-oauth-scopes openid email \
    --supported-identity-providers COGNITO \
    --callback-urls "$COGNITO_CALLBACK_URL" \
    --logout-urls "$COGNITO_LOGOUT_URL" \
    --query UserPoolClient.ClientId \
    --output text)
else
  aws_cli cognito-idp update-user-pool-client \
    --user-pool-id "$POOL_ID" \
    --client-id "$CLIENT_ID" \
    --allowed-oauth-flows code \
    --allowed-oauth-flows-user-pool-client \
    --allowed-oauth-scopes openid email \
    --supported-identity-providers COGNITO \
    --callback-urls "$COGNITO_CALLBACK_URL" \
    --logout-urls "$COGNITO_LOGOUT_URL" >/dev/null
fi

if ! aws_cli cognito-idp describe-user-pool-domain --domain "$COGNITO_DOMAIN_PREFIX" >/dev/null 2>&1; then
  aws_cli cognito-idp create-user-pool-domain \
    --domain "$COGNITO_DOMAIN_PREFIX" \
    --user-pool-id "$POOL_ID" >/dev/null
fi

if ! aws_cli cognito-idp get-group --user-pool-id "$POOL_ID" --group-name admin >/dev/null 2>&1; then
  aws_cli cognito-idp create-group \
    --user-pool-id "$POOL_ID" \
    --group-name admin >/dev/null
fi

if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_TEMP_PASSWORD:-}" ]]; then
  if ! aws_cli cognito-idp admin-get-user --user-pool-id "$POOL_ID" --username "$ADMIN_EMAIL" >/dev/null 2>&1; then
    aws_cli cognito-idp admin-create-user \
      --user-pool-id "$POOL_ID" \
      --username "$ADMIN_EMAIL" \
      --message-action SUPPRESS \
      --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true >/dev/null
  fi

  aws_cli cognito-idp admin-set-user-password \
    --user-pool-id "$POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --password "$ADMIN_TEMP_PASSWORD" \
    --permanent >/dev/null

  aws_cli cognito-idp admin-add-user-to-group \
    --user-pool-id "$POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --group-name admin >/dev/null
fi

COGNITO_DOMAIN="https://${COGNITO_DOMAIN_PREFIX}.auth.${AWS_REGION}.amazoncognito.com"
COGNITO_ISSUER="https://cognito-idp.${AWS_REGION}.amazonaws.com/${POOL_ID}"

write_output VITE_COGNITO_DOMAIN "$COGNITO_DOMAIN"
write_output VITE_COGNITO_CLIENT_ID "$CLIENT_ID"
write_output VITE_COGNITO_REDIRECT_URI "$COGNITO_CALLBACK_URL"
write_output VITE_COGNITO_LOGOUT_URI "$COGNITO_LOGOUT_URL"
write_output VITE_COGNITO_SCOPES "openid email"
write_output COGNITO_USER_POOL_ID "$POOL_ID"
write_output COGNITO_APP_CLIENT_ID "$CLIENT_ID"
write_output COGNITO_ISSUER "$COGNITO_ISSUER"
write_output COGNITO_DOMAIN_PREFIX "$COGNITO_DOMAIN_PREFIX"

printf "Cognito deployed. Outputs saved to %s\n" "$OUTPUTS_FILE"
