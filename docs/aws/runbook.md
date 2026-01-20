# Runbook — Operations & Troubleshooting

## Logs
- Lambda logs are in CloudWatch under `/aws/lambda/<function-name>`.
- API Gateway logs (if enabled) are in CloudWatch under API Gateway log group.

## Common failure modes
- Missing `World_Atlas_2015.tif`: Dev endpoints `/api/skyquality` and `/api/lightmap` will fail. Place file in `scripts/aws/` or `data/`.
- Missing lambda zip artifacts: `deploy.py` will raise an error asking for `lightpollution-lambda.zip` or `skyquality-tiles-lambda.zip`.
- Cognito redirect errors: Ensure `VITE_COGNITO_REDIRECT_URI` matches app client settings.

## Remediation steps
1. Check CloudWatch logs for timestamps and correlation IDs.
2. Re-run deploy script with `--dry-run` and check outputs for missing artifacts.
3. For auth issues, inspect the request in the browser devtools and verify `id_token` is attached.
