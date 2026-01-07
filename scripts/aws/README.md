# AWS CLI install (Windows)

1. Open PowerShell and run:

```powershell
winget install -e --id Amazon.AWSCLI
```

2. Close and re-open PowerShell.
3. Verify install:

```powershell
aws --version
```

# Python install (Windows)

1. Open PowerShell and run:

```powershell
winget install -e --id Python.Python.3.12
```

2. Close and re-open PowerShell.
3. Verify install:

```powershell
python --version
```

# Python deps (boto3)

```powershell
py -m pip install boto3
```

# Node.js install (for frontend build)

```powershell
winget install -e --id OpenJS.NodeJS.LTS
```

Verify:

```powershell
npm --version
```

# AWS credentials (Access Key)

1. Log in to the AWS console.
2. Go to IAM -> Users -> select your user (or create one).
3. Permissions: choose `Attach policies directly` and the easiest is attaching the AWS managed policy `AdministratorAccess` to the IAM user
   (full control, can delete everything). If you want to be stricter, ensure the user can create IAM roles
   and use Lambda, API Gateway, Cognito, S3, CloudFront, DynamoDB, and STS.
4. Click the user you created -> Go to Security credentials -> Create access key.
5. In "Access key best practices & alternatives", choose "Command Line Interface (CLI)" and click Next.
6. (Optional) set a description tag, then click Next.
7. Create the access key and copy the Access Key ID and Secret Access Key (you only see the secret once).
8. Configure the CLI:

```powershell
aws configure
```

When prompted, paste the Access Key ID, Secret Access Key, region (ex: us-east-1), and output format (leave default).

# AWS deploy

You must run these scripts locally (not in the AWS website). They need the local `.tif` and zip artifacts.

1. Put these files in `scripts/` or `scripts/aws/`:

- `lightpollution-lambda.zip`
- `skyquality-tiles-lambda.zip`
- `World_Atlas_2015.tif`

2. Edit `scripts/aws/config.env`:

```
AWS_REGION=us-east-1
AWS_PROFILE=
ADMIN_EMAIL=
ADMIN_TEMP_PASSWORD=
SKIP_TIF_UPLOAD=
AUTO_CONFIRM_SIGNUP=1
```

3. Install frontend dependencies if needed:

```bash
npm install
```

4. Run everything (creates IAM role, APIs, data tables, and CloudFront/S3 site):

```powershell
py scripts/aws/deploy.py
```

5. Create a `.env` file in the project folder.

6. Copy values from `scripts/aws/outputs.env` into `.env` if you want local dev envs.

# Cognito notes

- Sign-ups are auto-confirmed by default (`AUTO_CONFIRM_SIGNUP=1`) so users don't need email verification.
- If you already created users before enabling auto-confirm, go to Cognito -> Users and confirm them,
  or delete and sign up again.
