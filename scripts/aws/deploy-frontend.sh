#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

ensure_aws_cli
load_outputs

AWS_ACCOUNT_ID=$(aws_cli sts get-caller-identity --query Account --output text)

BUILD_DIR=${BUILD_DIR:-"$ROOT_DIR/dist"}
SITE_BUCKET_NAME=${SITE_BUCKET_NAME:-"vela-web-${AWS_ACCOUNT_ID}-$(date +%Y%m%d%H%M%S)"}
OAC_NAME=${OAC_NAME:-"vela-oac"}
DIST_ID=${CLOUDFRONT_DISTRIBUTION_ID:-}

if ! aws_cli s3api head-bucket --bucket "$SITE_BUCKET_NAME" >/dev/null 2>&1; then
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    aws_cli s3api create-bucket --bucket "$SITE_BUCKET_NAME" >/dev/null
  else
    aws_cli s3api create-bucket \
      --bucket "$SITE_BUCKET_NAME" \
      --create-bucket-configuration "LocationConstraint=$AWS_REGION" >/dev/null
  fi
  aws_cli s3api put-public-access-block \
    --bucket "$SITE_BUCKET_NAME" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" >/dev/null
fi

OAC_ID=$(aws_cli cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id | [0]" \
  --output text)

if [[ -z "$OAC_ID" || "$OAC_ID" == "None" ]]; then
  OAC_ID=$(aws_cli cloudfront create-origin-access-control \
    --origin-access-control-config "Name=$OAC_NAME,Description=VELA OAC,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query OriginAccessControl.Id \
    --output text)
fi

if [[ -n "$DIST_ID" ]]; then
  if ! aws_cli cloudfront get-distribution --id "$DIST_ID" >/dev/null 2>&1; then
    DIST_ID=""
  fi
fi

if [[ -z "$DIST_ID" ]]; then
  DIST_CONFIG_PATH="$ARTIFACTS_DIR/cloudfront-config.json"
  CALLER_REF="vela-$(date +%s)"

  python - <<PY
import json
import pathlib

region = "${AWS_REGION}"
domain = f"{SITE_BUCKET_NAME}.s3.{region}.amazonaws.com"
config = {
    "CallerReference": "$CALLER_REF",
    "Comment": "VELA frontend",
    "Enabled": True,
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "s3-origin",
                "DomainName": domain,
                "OriginAccessControlId": "$OAC_ID",
                "S3OriginConfig": {"OriginAccessIdentity": ""},
            }
        ],
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "s3-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"],
            "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
        },
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    },
    "CustomErrorResponses": {
        "Quantity": 2,
        "Items": [
            {
                "ErrorCode": 403,
                "ResponsePagePath": "/index.html",
                "ResponseCode": 200,
                "ErrorCachingMinTTL": 0,
            },
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": 200,
                "ErrorCachingMinTTL": 0,
            },
        ],
    },
    "DefaultRootObject": "index.html",
    "PriceClass": "PriceClass_100",
    "HttpVersion": "http2",
    "ViewerCertificate": {"CloudFrontDefaultCertificate": True},
}

path = pathlib.Path("$DIST_CONFIG_PATH")
path.write_text(json.dumps(config, indent=2))
PY

  DIST_ID=$(aws_cli cloudfront create-distribution --distribution-config "file://$DIST_CONFIG_PATH" \
    --query Distribution.Id --output text)
fi

DIST_DOMAIN=$(aws_cli cloudfront get-distribution --id "$DIST_ID" \
  --query "Distribution.DomainName" --output text)

POLICY_PATH="$ARTIFACTS_DIR/cloudfront-bucket-policy.json"
python - <<PY
import json
import pathlib

bucket = "${SITE_BUCKET_NAME}"
account_id = "${AWS_ACCOUNT_ID}"
dist_id = "${DIST_ID}"

policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontRead",
            "Effect": "Allow",
            "Principal": {"Service": "cloudfront.amazonaws.com"},
            "Action": "s3:GetObject",
            "Resource": f"arn:aws:s3:::{bucket}/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": f"arn:aws:cloudfront::{account_id}:distribution/{dist_id}"
                }
            },
        }
    ],
}

path = pathlib.Path("$POLICY_PATH")
path.write_text(json.dumps(policy, indent=2))
PY

aws_cli s3api put-bucket-policy --bucket "$SITE_BUCKET_NAME" --policy "file://$POLICY_PATH" >/dev/null

SITE_URL="https://$DIST_DOMAIN"
write_output SITE_BUCKET_NAME "$SITE_BUCKET_NAME"
write_output CLOUDFRONT_DISTRIBUTION_ID "$DIST_ID"
write_output CLOUDFRONT_DOMAIN "$SITE_URL"

if [[ -n "${COGNITO_USER_POOL_ID:-}" && -n "${COGNITO_APP_CLIENT_ID:-}" && "${SKIP_COGNITO_UPDATE:-}" != "1" ]]; then
  aws_cli cognito-idp update-user-pool-client \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --client-id "$COGNITO_APP_CLIENT_ID" \
    --allowed-oauth-flows code \
    --allowed-oauth-flows-user-pool-client \
    --allowed-oauth-scopes openid email \
    --supported-identity-providers COGNITO \
    --callback-urls "$SITE_URL" \
    --logout-urls "$SITE_URL" >/dev/null
  write_output VITE_COGNITO_REDIRECT_URI "$SITE_URL"
  write_output VITE_COGNITO_LOGOUT_URI "$SITE_URL"
  export VITE_COGNITO_REDIRECT_URI="$SITE_URL"
  export VITE_COGNITO_LOGOUT_URI="$SITE_URL"
fi

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  (cd "$ROOT_DIR" && npm run build)
fi

aws_cli s3 sync "$BUILD_DIR" "s3://$SITE_BUCKET_NAME" --delete --no-progress >/dev/null

echo "Frontend deployed. CloudFront domain: $SITE_URL"
