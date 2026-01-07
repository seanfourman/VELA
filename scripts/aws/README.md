# AWS deploy

1. Put these files in `scripts/` or `scripts/aws/`:

- `lightpollution-lambda.zip`
- `skyquality-tiles-lambda.zip`
- `World_Atlas_2015.tif`

2. (Optional) edit `scripts/aws/config.env` if you want to set admin user, region, or profile.

3. Install frontend dependencies if needed:

```bash
npm install
```

4. Run everything (creates IAM role, APIs, data tables, and CloudFront/S3 site):

```bash
./scripts/aws/deploy-all.sh
```

5. Create a `.env` file in the project folder.

6. Copy values from `scripts/aws/outputs.env` into `.env` if you want local dev envs.
