#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

ensure_aws_cli

ROLE_NAME="$LAMBDA_ROLE_NAME"
POLICY_NAME="$LAMBDA_POLICY_NAME"
BASIC_POLICY_ARN="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

TRUST_PATH="$ARTIFACTS_DIR/lambda-trust.json"
cat >"$TRUST_PATH" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

if ! aws_cli iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws_cli iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$TRUST_PATH" >/dev/null
fi

ROLE_ARN=$(aws_cli iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text)

ATTACHED=$(aws_cli iam list-attached-role-policies \
  --role-name "$ROLE_NAME" \
  --query "AttachedPolicies[?PolicyArn=='$BASIC_POLICY_ARN'].PolicyArn | [0]" \
  --output text)

if [[ -z "$ATTACHED" || "$ATTACHED" == "None" ]]; then
  aws_cli iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$BASIC_POLICY_ARN" >/dev/null
fi

POLICY_PATH="$ARTIFACTS_DIR/lambda-access-policy.json"
cat >"$POLICY_PATH" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/*"
    },
    {
      "Sid": "S3ReadAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::*",
        "arn:aws:s3:::*/*"
      ]
    }
  ]
}
JSON

aws_cli iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://$POLICY_PATH" >/dev/null

write_output LAMBDA_ROLE_NAME "$ROLE_NAME"
write_output LAMBDA_ROLE_ARN "$ROLE_ARN"

printf "IAM role ready: %s\n" "$ROLE_ARN"
