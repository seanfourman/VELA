# AWS deploy

1. Put these files in `scripts/` or `scripts/aws/`:

- `lightpollution-lambda.zip`
- `skyquality-tiles-lambda.zip`
- `World_Atlas_2015.tif`

2. Install frontend dependencies if needed:

```bash
npm install
```

3. Run everything (creates IAM role, APIs, data tables, and CloudFront/S3 site):

```bash
./scripts/aws/deploy-all.sh
```

4. Create a `.env` file in the project folder.

5. Copy values from `scripts/aws/outputs.env` into `.env` if you want local dev envs.
