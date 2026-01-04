# AWS deploy

1) Put these files in `scripts/` or `scripts/aws/`:
- `lightpollution-lambda.zip`
- `skyquality-tiles-lambda.zip`
- `World_Atlas_2015.tif`

2) (Optional) export env vars if you need them:
- `LAMBDA_ROLE_ARN` (uses `LabRole` if empty)
- `COGNITO_CALLBACK_URL` (defaults to `http://localhost:5173`)
- `COGNITO_LOGOUT_URL` (defaults to `http://localhost:5173`)

3) Run everything:

```bash
./scripts/aws/deploy-all.sh
```

4) Copy values from `scripts/aws/outputs.env` into `.env`.
