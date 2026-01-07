#!/usr/bin/env python3
import json
import mimetypes
import os
import random
import shutil
import string
import subprocess
import sys
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("boto3 not installed. Run: py -m pip install boto3", file=sys.stderr)
    sys.exit(1)


ROOT_DIR = Path(__file__).resolve().parents[2]
AWS_SCRIPTS_DIR = ROOT_DIR / "scripts" / "aws"
ARTIFACTS_DIR = AWS_SCRIPTS_DIR / "artifacts"
OUTPUTS_PATH = AWS_SCRIPTS_DIR / "outputs.env"
CONFIG_PATH = AWS_SCRIPTS_DIR / "config.env"
LAMBDA_SRC_DIR = AWS_SCRIPTS_DIR / "lambdas"


def load_env_file(path: Path) -> dict:
    data = {}
    if not path.exists():
        return data
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        data[key] = value
    return data


def get_setting(config: dict, key: str, default: str = "") -> str:
    return os.environ.get(key) or config.get(key) or default


def is_truthy(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def write_outputs(path: Path, outputs: dict) -> None:
    lines = [f"{key}={outputs[key]}" for key in sorted(outputs.keys())]
    path.write_text("\n".join(lines) + "\n")


def set_output(outputs: dict, key: str, value: str) -> None:
    outputs[key] = value
    write_outputs(OUTPUTS_PATH, outputs)


def ensure_artifacts_dir() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


def random_suffix(length: int = 8) -> str:
    return "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(length))


def boto_session(region: str, profile: str | None):
    if profile:
        return boto3.Session(profile_name=profile, region_name=region)
    return boto3.Session(region_name=region)


def find_artifact(filename: str) -> Path:
    candidates = [
        AWS_SCRIPTS_DIR / filename,
        ROOT_DIR / "scripts" / filename,
        ARTIFACTS_DIR / filename,
    ]
    for path in candidates:
        if path.exists():
            return path
    return Path()


def package_python_lambda(module_name: str, source_path: Path, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(source_path, arcname=f"{module_name}.py")


def ensure_role(iam, role_name: str, policy_name: str) -> str:
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }
    access_policy = {
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
                    "dynamodb:DescribeTable",
                ],
                "Resource": "arn:aws:dynamodb:*:*:table/*",
            },
            {
                "Sid": "S3ReadAccess",
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:GetObjectVersion",
                    "s3:ListBucket",
                ],
                "Resource": [
                    "arn:aws:s3:::*",
                    "arn:aws:s3:::*/*",
                ],
            },
        ],
    }
    try:
        role = iam.get_role(RoleName=role_name)["Role"]
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "NoSuchEntity":
            raise
        role = iam.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(trust_policy),
        )["Role"]

    basic_policy = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    attached = []
    marker = None
    while True:
        kwargs = {"RoleName": role_name}
        if marker:
            kwargs["Marker"] = marker
        resp = iam.list_attached_role_policies(**kwargs)
        attached.extend(resp.get("AttachedPolicies", []))
        if not resp.get("IsTruncated"):
            break
        marker = resp.get("Marker")

    if not any(p["PolicyArn"] == basic_policy for p in attached):
        iam.attach_role_policy(RoleName=role_name, PolicyArn=basic_policy)

    iam.put_role_policy(
        RoleName=role_name,
        PolicyName=policy_name,
        PolicyDocument=json.dumps(access_policy),
    )
    return role["Arn"]

def find_user_pool_id(cognito, pool_name: str) -> str:
    token = None
    while True:
        kwargs = {"MaxResults": 60}
        if token:
            kwargs["NextToken"] = token
        resp = cognito.list_user_pools(**kwargs)
        for pool in resp.get("UserPools", []):
            if pool.get("Name") == pool_name:
                return pool.get("Id", "")
        token = resp.get("NextToken")
        if not token:
            return ""


def find_user_pool_client_id(cognito, pool_id: str, client_name: str) -> str:
    token = None
    while True:
        kwargs = {"UserPoolId": pool_id, "MaxResults": 60}
        if token:
            kwargs["NextToken"] = token
        resp = cognito.list_user_pool_clients(**kwargs)
        for client in resp.get("UserPoolClients", []):
            if client.get("ClientName") == client_name:
                return client.get("ClientId", "")
        token = resp.get("NextToken")
        if not token:
            return ""


def get_existing_user_pool_domain(cognito, pool_id: str) -> str:
    try:
        pool = cognito.describe_user_pool(UserPoolId=pool_id).get("UserPool", {})
        domain = pool.get("Domain")
        if domain:
            return domain
        custom_domain = pool.get("CustomDomain")
        if custom_domain:
            return custom_domain
    except ClientError:
        pass

    list_fn = getattr(cognito, "list_user_pool_domains", None)
    if list_fn:
        token = None
        while True:
            kwargs = {"UserPoolId": pool_id, "MaxResults": 60}
            if token:
                kwargs["NextToken"] = token
            try:
                resp = list_fn(**kwargs)
            except ClientError:
                break
            domains = resp.get("Domains") or resp.get("DomainDescriptions") or []
            for item in domains:
                if isinstance(item, str):
                    return item
                if isinstance(item, dict):
                    if item.get("Domain"):
                        return item["Domain"]
                    if item.get("DomainName"):
                        return item["DomainName"]
            token = resp.get("NextToken")
            if not token:
                break
    return ""


def ensure_user_pool_domain(cognito, domain_prefix: str, pool_id: str) -> str:
    if not domain_prefix:
        return ""

    try:
        desc = cognito.describe_user_pool_domain(Domain=domain_prefix).get("DomainDescription")
        if desc and desc.get("UserPoolId") == pool_id:
            return domain_prefix
    except ClientError as exc:
        if exc.response["Error"]["Code"] not in {"ResourceNotFoundException", "NotFoundException"}:
            raise

    try:
        cognito.create_user_pool_domain(Domain=domain_prefix, UserPoolId=pool_id)
        return domain_prefix
    except ClientError as exc:
        message = exc.response["Error"].get("Message", "")
        if exc.response["Error"]["Code"] == "InvalidParameterException" and "already has a domain configured" in message:
            existing = get_existing_user_pool_domain(cognito, pool_id)
            if existing:
                return existing
            return domain_prefix
        raise


def ensure_admin_group(cognito, pool_id: str) -> None:
    try:
        cognito.get_group(UserPoolId=pool_id, GroupName="admin")
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
        cognito.create_group(UserPoolId=pool_id, GroupName="admin")


def ensure_admin_user(cognito, pool_id: str, email: str, password: str) -> None:
    try:
        cognito.admin_get_user(UserPoolId=pool_id, Username=email)
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "UserNotFoundException":
            raise
        cognito.admin_create_user(
            UserPoolId=pool_id,
            Username=email,
            MessageAction="SUPPRESS",
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
            ],
        )

    cognito.admin_set_user_password(
        UserPoolId=pool_id,
        Username=email,
        Password=password,
        Permanent=True,
    )
    cognito.admin_add_user_to_group(UserPoolId=pool_id, Username=email, GroupName="admin")


def ensure_table(dynamodb, name: str, key_schema: list, attr_defs: list) -> None:
    try:
        dynamodb.describe_table(TableName=name)
        return
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ResourceNotFoundException":
            raise

    dynamodb.create_table(
        TableName=name,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=attr_defs,
        KeySchema=key_schema,
    )
    dynamodb.get_waiter("table_exists").wait(TableName=name)


def ensure_bucket(s3, name: str, region: str) -> None:
    try:
        s3.head_bucket(Bucket=name)
        return
    except ClientError as exc:
        if exc.response["Error"]["Code"] not in {"404", "NoSuchBucket", "NotFound"}:
            raise

    if region == "us-east-1":
        s3.create_bucket(Bucket=name)
    else:
        s3.create_bucket(
            Bucket=name,
            CreateBucketConfiguration={"LocationConstraint": region},
        )


def ensure_bucket_versioning(s3, name: str) -> None:
    s3.put_bucket_versioning(
        Bucket=name,
        VersioningConfiguration={"Status": "Enabled"},
    )


def upload_file(s3, local_path: Path, bucket: str, key: str, content_type: str | None = None) -> None:
    extra_args = {}
    if content_type:
        extra_args["ContentType"] = content_type
    if extra_args:
        s3.upload_file(str(local_path), bucket, key, ExtraArgs=extra_args)
    else:
        s3.upload_file(str(local_path), bucket, key)


def load_zip_bytes(path: Path) -> bytes:
    return path.read_bytes()


def wait_for_lambda_update(lambda_client, function_name: str) -> None:
    try:
        waiter = lambda_client.get_waiter("function_updated")
    except ValueError:
        return
    waiter.wait(FunctionName=function_name, WaiterConfig={"Delay": 5, "MaxAttempts": 60})


def upsert_lambda(
    lambda_client,
    name: str,
    runtime: str,
    handler: str,
    role_arn: str,
    zip_path: Path,
    env_vars: dict | None = None,
    timeout: int | None = None,
    memory: int | None = None,
) -> None:
    code_bytes = load_zip_bytes(zip_path)
    try:
        lambda_client.get_function(FunctionName=name)
        lambda_client.update_function_code(FunctionName=name, ZipFile=code_bytes)
        wait_for_lambda_update(lambda_client, name)
        config = {
            "FunctionName": name,
            "Runtime": runtime,
            "Handler": handler,
            "Role": role_arn,
        }
        if env_vars is not None:
            config["Environment"] = {"Variables": env_vars}
        if timeout is not None:
            config["Timeout"] = timeout
        if memory is not None:
            config["MemorySize"] = memory
        for _ in range(10):
            try:
                lambda_client.update_function_configuration(**config)
                wait_for_lambda_update(lambda_client, name)
                break
            except ClientError as exc:
                if exc.response["Error"]["Code"] != "ResourceConflictException":
                    raise
                time.sleep(5)
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
        config = {
            "FunctionName": name,
            "Runtime": runtime,
            "Handler": handler,
            "Role": role_arn,
            "Code": {"ZipFile": code_bytes},
        }
        if env_vars is not None:
            config["Environment"] = {"Variables": env_vars}
        if timeout is not None:
            config["Timeout"] = timeout
        if memory is not None:
            config["MemorySize"] = memory
        lambda_client.create_function(**config)
        wait_for_lambda_update(lambda_client, name)


def get_lambda_arn(lambda_client, name: str) -> str:
    return lambda_client.get_function(FunctionName=name)["Configuration"]["FunctionArn"]


def lambda_permission_exists(lambda_client, function_name: str, statement_id: str) -> bool:
    try:
        policy = lambda_client.get_policy(FunctionName=function_name)
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ResourceNotFoundException":
            return False
        raise
    doc = json.loads(policy["Policy"])
    for stmt in doc.get("Statement", []):
        if stmt.get("Sid") == statement_id:
            return True
    return False


def add_lambda_permission(lambda_client, function_name: str, statement_id: str, principal: str, source_arn: str) -> None:
    if lambda_permission_exists(lambda_client, function_name, statement_id):
        return
    lambda_client.add_permission(
        FunctionName=function_name,
        StatementId=statement_id,
        Action="lambda:InvokeFunction",
        Principal=principal,
        SourceArn=source_arn,
    )

def ensure_http_api(apigw, name: str, cors_methods: list[str]) -> str:
    apis = apigw.get_apis().get("Items", [])
    for api in apis:
        if api.get("Name") == name:
            api_id = api.get("ApiId")
            apigw.update_api(
                ApiId=api_id,
                CorsConfiguration={
                    "AllowOrigins": ["*"],
                    "AllowHeaders": ["*"],
                    "AllowMethods": cors_methods,
                },
            )
            return api_id
    resp = apigw.create_api(
        Name=name,
        ProtocolType="HTTP",
        CorsConfiguration={
            "AllowOrigins": ["*"],
            "AllowHeaders": ["*"],
            "AllowMethods": cors_methods,
        },
    )
    return resp["ApiId"]


def ensure_integration(apigw, api_id: str, lambda_arn: str) -> str:
    integrations = apigw.get_integrations(ApiId=api_id).get("Items", [])
    for integration in integrations:
        if integration.get("IntegrationUri") == lambda_arn:
            return integration.get("IntegrationId")
    resp = apigw.create_integration(
        ApiId=api_id,
        IntegrationType="AWS_PROXY",
        IntegrationUri=lambda_arn,
        PayloadFormatVersion="2.0",
    )
    return resp["IntegrationId"]


def ensure_route(apigw, api_id: str, route_key: str, integration_id: str) -> None:
    routes = apigw.get_routes(ApiId=api_id).get("Items", [])
    for route in routes:
        if route.get("RouteKey") == route_key:
            apigw.update_route(
                ApiId=api_id,
                RouteId=route["RouteId"],
                Target=f"integrations/{integration_id}",
            )
            return
    apigw.create_route(
        ApiId=api_id,
        RouteKey=route_key,
        Target=f"integrations/{integration_id}",
    )


def ensure_stage(apigw, api_id: str, stage_name: str) -> None:
    stages = apigw.get_stages(ApiId=api_id).get("Items", [])
    for stage in stages:
        if stage.get("StageName") == stage_name:
            apigw.update_stage(ApiId=api_id, StageName=stage_name, AutoDeploy=True)
            return
    apigw.create_stage(ApiId=api_id, StageName=stage_name, AutoDeploy=True)


def ensure_authorizer(apigw, api_id: str, name: str, issuer: str, audience: str) -> str:
    auths = apigw.get_authorizers(ApiId=api_id).get("Items", [])
    for auth in auths:
        if auth.get("Name") == name:
            apigw.update_authorizer(
                ApiId=api_id,
                AuthorizerId=auth["AuthorizerId"],
                AuthorizerType="JWT",
                IdentitySource=["$request.header.Authorization"],
                JwtConfiguration={"Audience": [audience], "Issuer": issuer},
            )
            return auth["AuthorizerId"]
    resp = apigw.create_authorizer(
        ApiId=api_id,
        Name=name,
        AuthorizerType="JWT",
        IdentitySource=["$request.header.Authorization"],
        JwtConfiguration={"Audience": [audience], "Issuer": issuer},
    )
    return resp["AuthorizerId"]


def attach_authorizer(apigw, api_id: str, route_key: str, auth_id: str) -> None:
    routes = apigw.get_routes(ApiId=api_id).get("Items", [])
    for route in routes:
        if route.get("RouteKey") == route_key:
            apigw.update_route(
                ApiId=api_id,
                RouteId=route["RouteId"],
                AuthorizationType="JWT",
                AuthorizerId=auth_id,
            )
            return
    raise RuntimeError(f"Route not found: {route_key}")


def ensure_oac(cloudfront, name: str) -> str:
    items = cloudfront.list_origin_access_controls().get("OriginAccessControlList", {}).get("Items", [])
    for item in items or []:
        if item.get("Name") == name:
            return item["Id"]
    resp = cloudfront.create_origin_access_control(
        OriginAccessControlConfig={
            "Name": name,
            "Description": "VELA OAC",
            "SigningProtocol": "sigv4",
            "SigningBehavior": "always",
            "OriginAccessControlOriginType": "s3",
        }
    )
    return resp["OriginAccessControl"]["Id"]


def ensure_distribution(cloudfront, bucket_name: str, region: str, oac_id: str, dist_id: str | None) -> tuple[str, str]:
    if dist_id:
        try:
            dist = cloudfront.get_distribution(Id=dist_id)["Distribution"]
            return dist_id, dist["DomainName"]
        except ClientError:
            dist_id = None

    domain = f"{bucket_name}.s3.{region}.amazonaws.com"
    caller_ref = f"vela-{int(time.time())}"
    config = {
        "CallerReference": caller_ref,
        "Comment": "VELA frontend",
        "Enabled": True,
        "Origins": {
            "Quantity": 1,
            "Items": [
                {
                    "Id": "s3-origin",
                    "DomainName": domain,
                    "OriginAccessControlId": oac_id,
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
                    "ResponseCode": "200",
                    "ErrorCachingMinTTL": 0,
                },
                {
                    "ErrorCode": 404,
                    "ResponsePagePath": "/index.html",
                    "ResponseCode": "200",
                    "ErrorCachingMinTTL": 0,
                },
            ],
        },
        "DefaultRootObject": "index.html",
        "PriceClass": "PriceClass_100",
        "HttpVersion": "http2",
        "ViewerCertificate": {"CloudFrontDefaultCertificate": True},
    }
    resp = cloudfront.create_distribution(DistributionConfig=config)
    dist = resp["Distribution"]
    return dist["Id"], dist["DomainName"]


def put_site_bucket_policy(s3, bucket_name: str, account_id: str, dist_id: str) -> None:
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowCloudFrontRead",
                "Effect": "Allow",
                "Principal": {"Service": "cloudfront.amazonaws.com"},
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket_name}/*",
                "Condition": {
                    "StringEquals": {
                        "AWS:SourceArn": f"arn:aws:cloudfront::{account_id}:distribution/{dist_id}"
                    }
                },
            }
        ],
    }
    s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))


def build_frontend(env: dict) -> None:
    npm_bin = env.get("NPM_BIN", "")
    subprocess.run([npm_bin, "run", "build"], cwd=ROOT_DIR, check=True, env=env)


def detect_npm(config: dict) -> str:
    npm_bin = get_setting(config, "NPM_BIN", "").strip()
    if npm_bin:
        if shutil.which(npm_bin) or Path(npm_bin).exists():
            return npm_bin
    for candidate in ("npm", "npm.cmd", "npm.exe"):
        found = shutil.which(candidate)
        if found:
            return found
    return ""


def upload_directory(s3, directory: Path, bucket: str) -> None:
    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("text/css", ".css")
    mimetypes.add_type("application/json", ".json")
    for path in directory.rglob("*"):
        if path.is_file():
            key = str(path.relative_to(directory)).replace("\\", "/")
            content_type, _ = mimetypes.guess_type(path.name)
            upload_file(s3, path, bucket, key, content_type)

def deploy_all() -> None:
    ensure_artifacts_dir()
    config = load_env_file(CONFIG_PATH)
    outputs = load_env_file(OUTPUTS_PATH)

    print("Deploy starting. This can take around 10 minutes depending on AWS.")

    region = get_setting(config, "AWS_REGION", "us-east-1")
    profile = get_setting(config, "AWS_PROFILE", "").strip() or None
    session = boto_session(region, profile)

    iam = session.client("iam")
    s3 = session.client("s3")
    lambda_client = session.client("lambda")
    apigw = session.client("apigatewayv2")
    dynamodb = session.client("dynamodb")
    cognito = session.client("cognito-idp")
    sts = session.client("sts")
    cloudfront = boto3.client("cloudfront")

    account_id = sts.get_caller_identity()["Account"]

    role_name = get_setting(config, "LAMBDA_ROLE_NAME", "vela-lambda-role")
    policy_name = get_setting(config, "LAMBDA_POLICY_NAME", "vela-lambda-access")
    role_arn = ensure_role(iam, role_name, policy_name)
    set_output(outputs, "LAMBDA_ROLE_NAME", role_name)
    set_output(outputs, "LAMBDA_ROLE_ARN", role_arn)

    # Cognito
    pool_name = get_setting(config, "COGNITO_USER_POOL_NAME", "VELA")
    client_name = get_setting(config, "COGNITO_APP_CLIENT_NAME", "VELA")
    callback_url = get_setting(config, "COGNITO_CALLBACK_URL", "http://localhost:5173")
    logout_url = get_setting(config, "COGNITO_LOGOUT_URL", "http://localhost:5173")
    domain_prefix = get_setting(config, "COGNITO_DOMAIN_PREFIX", outputs.get("COGNITO_DOMAIN_PREFIX", ""))
    if not domain_prefix:
        domain_prefix = f"vela-{random_suffix()}"

    pool_id = find_user_pool_id(cognito, pool_name)
    if not pool_id:
        pool_id = cognito.create_user_pool(
            PoolName=pool_name,
            UsernameAttributes=["email"],
            AutoVerifiedAttributes=["email"],
            Schema=[{"Name": "email", "AttributeDataType": "String", "Required": True, "Mutable": True}],
        )["UserPool"]["Id"]

    client_id = find_user_pool_client_id(cognito, pool_id, client_name)
    if not client_id:
        client_id = cognito.create_user_pool_client(
            UserPoolId=pool_id,
            ClientName=client_name,
            GenerateSecret=False,
            AllowedOAuthFlows=["code"],
            AllowedOAuthFlowsUserPoolClient=True,
            AllowedOAuthScopes=["openid", "email"],
            SupportedIdentityProviders=["COGNITO"],
            CallbackURLs=[callback_url],
            LogoutURLs=[logout_url],
        )["UserPoolClient"]["ClientId"]
    else:
        cognito.update_user_pool_client(
            UserPoolId=pool_id,
            ClientId=client_id,
            AllowedOAuthFlows=["code"],
            AllowedOAuthFlowsUserPoolClient=True,
            AllowedOAuthScopes=["openid", "email"],
            SupportedIdentityProviders=["COGNITO"],
            CallbackURLs=[callback_url],
            LogoutURLs=[logout_url],
        )

    domain_prefix = ensure_user_pool_domain(cognito, domain_prefix, pool_id) or domain_prefix
    ensure_admin_group(cognito, pool_id)

    admin_email = get_setting(config, "ADMIN_EMAIL", "").strip()
    admin_password = get_setting(config, "ADMIN_TEMP_PASSWORD", "").strip()
    if admin_email and admin_password:
        ensure_admin_user(cognito, pool_id, admin_email, admin_password)

    cognito_domain = f"https://{domain_prefix}.auth.{region}.amazoncognito.com"
    cognito_issuer = f"https://cognito-idp.{region}.amazonaws.com/{pool_id}"
    set_output(outputs, "VITE_COGNITO_DOMAIN", cognito_domain)
    set_output(outputs, "VITE_COGNITO_CLIENT_ID", client_id)
    set_output(outputs, "VITE_COGNITO_REDIRECT_URI", callback_url)
    set_output(outputs, "VITE_COGNITO_LOGOUT_URI", logout_url)
    set_output(outputs, "VITE_COGNITO_SCOPES", "openid email")
    set_output(outputs, "COGNITO_USER_POOL_ID", pool_id)
    set_output(outputs, "COGNITO_APP_CLIENT_ID", client_id)
    set_output(outputs, "COGNITO_ISSUER", cognito_issuer)
    set_output(outputs, "COGNITO_DOMAIN_PREFIX", domain_prefix)

    # Core services
    prefix = get_setting(config, "VELA_PREFIX", "vela")
    tif_bucket = get_setting(config, "TIF_BUCKET_NAME", outputs.get("TIF_BUCKET_NAME", "")) or f"{prefix}-tif-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    tif_key = get_setting(config, "TIF_KEY", "tifs/World_Atlas_2015.tif")
    tif_path = get_setting(config, "TIF_PATH", "")
    if tif_path:
        tif_path = str(Path(tif_path))
    else:
        found = find_artifact("World_Atlas_2015.tif")
        tif_path = str(found) if found else str(ROOT_DIR / "data" / "World_Atlas_2015.tif")

    tif_file = Path(tif_path)
    if not tif_file.exists():
        raise RuntimeError(f"Missing TIF file at {tif_path}")

    ensure_bucket(s3, tif_bucket, region)
    ensure_bucket_versioning(s3, tif_bucket)
    if not is_truthy(get_setting(config, "SKIP_TIF_UPLOAD", "")):
        upload_file(s3, tif_file, tif_bucket, tif_key)
    else:
        print(f"Skipping TIF upload for {tif_file}. Set SKIP_TIF_UPLOAD=0 to upload.")

    py_runtime = get_setting(config, "PY_RUNTIME", "python3.12")
    node_runtime = get_setting(config, "NODE_RUNTIME", "nodejs20.x")

    visible_zip = ARTIFACTS_DIR / "visible-planets-lambda.zip"
    package_python_lambda("visible_planets_lambda", LAMBDA_SRC_DIR / "visible_planets_lambda.py", visible_zip)

    visible_fn = get_setting(config, "VISIBLE_PLANETS_FUNCTION", "visible-planets-lambda")
    light_fn = get_setting(config, "LIGHTPOLLUTION_FUNCTION", "lightpollution-lambda")
    sky_fn = get_setting(config, "SKYQUALITY_FUNCTION", "skyquality-tiles-lambda")

    upsert_lambda(
        lambda_client,
        visible_fn,
        py_runtime,
        "visible_planets_lambda.lambda_handler",
        role_arn,
        visible_zip,
    )

    light_zip = get_setting(config, "LIGHTPOLLUTION_ZIP", "")
    light_zip_path = Path(light_zip) if light_zip else find_artifact("lightpollution-lambda.zip")
    if not light_zip_path.exists():
        raise RuntimeError(f"Missing lightpollution zip at {light_zip_path}")

    ee_account = get_setting(config, "EE_SERVICE_ACCOUNT", "earth-engine-lambda@pure-media-310120.iam.gserviceaccount.com")
    upsert_lambda(
        lambda_client,
        light_fn,
        py_runtime,
        get_setting(config, "LIGHTPOLLUTION_HANDLER", "lambda_function.lambda_handler"),
        role_arn,
        light_zip_path,
        env_vars={"EE_SERVICE_ACCOUNT": ee_account},
        timeout=30,
    )

    sky_zip = get_setting(config, "SKYQUALITY_TILES_ZIP", "")
    sky_zip_path = Path(sky_zip) if sky_zip else find_artifact("skyquality-tiles-lambda.zip")
    if not sky_zip_path.exists():
        raise RuntimeError(f"Missing skyquality tiles zip at {sky_zip_path}")

    upsert_lambda(
        lambda_client,
        sky_fn,
        node_runtime,
        get_setting(config, "SKYQUALITY_HANDLER", "index.handler"),
        role_arn,
        sky_zip_path,
        env_vars={"TIF_BUCKET": tif_bucket, "TIF_KEY": tif_key},
        timeout=30,
        memory=3008,
    )

    visible_api = ensure_http_api(apigw, f"{prefix}-visible-planets-api", ["GET", "OPTIONS"])
    visible_arn = get_lambda_arn(lambda_client, visible_fn)
    visible_integration = ensure_integration(apigw, visible_api, visible_arn)
    ensure_route(apigw, visible_api, "GET /visible-planets-lambda", visible_integration)
    ensure_stage(apigw, visible_api, "default")
    add_lambda_permission(
        lambda_client,
        visible_fn,
        "visible-planets-api",
        "apigateway.amazonaws.com",
        f"arn:aws:execute-api:{region}:{account_id}:{visible_api}/*/*",
    )

    light_api = ensure_http_api(apigw, f"{prefix}-lightpollution-api", ["GET", "OPTIONS"])
    light_arn = get_lambda_arn(lambda_client, light_fn)
    light_integration = ensure_integration(apigw, light_api, light_arn)
    ensure_route(apigw, light_api, "GET /lightpollution-lambda", light_integration)
    ensure_stage(apigw, light_api, "default")
    add_lambda_permission(
        lambda_client,
        light_fn,
        "lightpollution-api",
        "apigateway.amazonaws.com",
        f"arn:aws:execute-api:{region}:{account_id}:{light_api}/*/*",
    )

    sky_api = ensure_http_api(apigw, f"{prefix}-skyquality-api", ["GET", "OPTIONS"])
    sky_arn = get_lambda_arn(lambda_client, sky_fn)
    sky_integration = ensure_integration(apigw, sky_api, sky_arn)
    ensure_route(apigw, sky_api, "GET /skyquality", sky_integration)
    ensure_route(apigw, sky_api, "GET /lightmap/{proxy+}", sky_integration)
    ensure_stage(apigw, sky_api, "default")
    add_lambda_permission(
        lambda_client,
        sky_fn,
        "skyquality-api",
        "apigateway.amazonaws.com",
        f"arn:aws:execute-api:{region}:{account_id}:{sky_api}/*/*",
    )

    set_output(outputs, "VITE_VISIBLE_PLANETS_URL", f"https://{visible_api}.execute-api.{region}.amazonaws.com/default/visible-planets-lambda")
    set_output(outputs, "VITE_DARK_SPOTS_URL", f"https://{light_api}.execute-api.{region}.amazonaws.com/default/lightpollution-lambda")
    set_output(outputs, "VITE_LIGHTMAP_API_BASE", f"https://{sky_api}.execute-api.{region}.amazonaws.com/default")
    set_output(outputs, "TIF_BUCKET_NAME", tif_bucket)
    set_output(outputs, "TIF_KEY", tif_key)

    # Data services
    users_table = get_setting(config, "USERS_TABLE", "Users")
    fav_table = get_setting(config, "FAV_TABLE", "UserFavorites")
    rec_table = get_setting(config, "REC_TABLE", "Recommendations")

    ensure_table(
        dynamodb,
        users_table,
        key_schema=[{"AttributeName": "userId", "KeyType": "HASH"}],
        attr_defs=[{"AttributeName": "userId", "AttributeType": "S"}],
    )
    ensure_table(
        dynamodb,
        fav_table,
        key_schema=[
            {"AttributeName": "userId", "KeyType": "HASH"},
            {"AttributeName": "spotId", "KeyType": "RANGE"},
        ],
        attr_defs=[
            {"AttributeName": "userId", "AttributeType": "S"},
            {"AttributeName": "spotId", "AttributeType": "S"},
        ],
    )
    ensure_table(
        dynamodb,
        rec_table,
        key_schema=[{"AttributeName": "spotId", "KeyType": "HASH"}],
        attr_defs=[{"AttributeName": "spotId", "AttributeType": "S"}],
    )

    def package_and_upsert(module: str, function_name: str, handler: str, env_vars: dict | None = None):
        zip_path = ARTIFACTS_DIR / f"{function_name}.zip"
        package_python_lambda(module, LAMBDA_SRC_DIR / f"{module}.py", zip_path)
        upsert_lambda(lambda_client, function_name, py_runtime, handler, role_arn, zip_path, env_vars=env_vars)

    auto_confirm_enabled = is_truthy(get_setting(config, "AUTO_CONFIRM_SIGNUP", "1"))
    auto_confirm_arn = None
    if auto_confirm_enabled:
        auto_confirm_fn = get_setting(config, "AUTO_CONFIRM_LAMBDA", "AutoConfirmUser")
        package_and_upsert("auto_confirm_user", auto_confirm_fn, "auto_confirm_user.lambda_handler")
        auto_confirm_arn = get_lambda_arn(lambda_client, auto_confirm_fn)

    create_user_fn = get_setting(config, "CREATE_USER_LAMBDA", "CreateUserOnConfirm")
    package_and_upsert(
        "create_user_on_confirm",
        create_user_fn,
        "create_user_on_confirm.lambda_handler",
        env_vars={"USERS_TABLE": users_table},
    )
    create_user_arn = get_lambda_arn(lambda_client, create_user_fn)

    lambda_config = {"PostConfirmation": create_user_arn}
    if auto_confirm_arn:
        lambda_config["PreSignUp"] = auto_confirm_arn
    cognito.update_user_pool(UserPoolId=pool_id, LambdaConfig=lambda_config)

    if auto_confirm_arn:
        add_lambda_permission(
            lambda_client,
            auto_confirm_fn,
            f"cognito-pre-signup-{pool_id}",
            "cognito-idp.amazonaws.com",
            f"arn:aws:cognito-idp:{region}:{account_id}:userpool/{pool_id}",
        )

    add_lambda_permission(
        lambda_client,
        create_user_fn,
        f"cognito-post-confirmation-{pool_id}",
        "cognito-idp.amazonaws.com",
        f"arn:aws:cognito-idp:{region}:{account_id}:userpool/{pool_id}",
    )

    fav_fn = get_setting(config, "FAVORITES_LAMBDA", "FavoritesHandler")
    get_fav_fn = get_setting(config, "GET_FAVORITES_LAMBDA", "GetFavoritesHandler")
    del_fav_fn = get_setting(config, "DELETE_FAVORITES_LAMBDA", "DeleteFavoriteHandler")

    package_and_upsert("favorites_handler", fav_fn, "favorites_handler.lambda_handler", env_vars={"FAV_TABLE": fav_table})
    package_and_upsert("get_favorites_handler", get_fav_fn, "get_favorites_handler.lambda_handler", env_vars={"FAV_TABLE": fav_table})
    package_and_upsert("delete_favorite_handler", del_fav_fn, "delete_favorite_handler.lambda_handler", env_vars={"FAV_TABLE": fav_table})

    post_rec_fn = get_setting(config, "POST_RECS_LAMBDA", "PostRecommendationHandler")
    get_rec_fn = get_setting(config, "GET_RECS_LAMBDA", "GetRecommendationsHandler")
    del_rec_fn = get_setting(config, "DELETE_RECS_LAMBDA", "DeleteRecommendationsHandler")

    package_and_upsert("post_recommendation_handler", post_rec_fn, "post_recommendation_handler.lambda_handler", env_vars={"REC_TABLE": rec_table})
    package_and_upsert("get_recommendations_handler", get_rec_fn, "get_recommendations_handler.lambda_handler", env_vars={"REC_TABLE": rec_table})
    package_and_upsert("delete_recommendation_handler", del_rec_fn, "delete_recommendation_handler.lambda_handler", env_vars={"REC_TABLE": rec_table})

    favorites_api = ensure_http_api(apigw, "favoritesAPI", ["GET", "POST", "DELETE", "OPTIONS"])
    fav_stage = "$default"
    ensure_stage(apigw, favorites_api, fav_stage)

    fav_arn = get_lambda_arn(lambda_client, fav_fn)
    get_fav_arn = get_lambda_arn(lambda_client, get_fav_fn)
    del_fav_arn = get_lambda_arn(lambda_client, del_fav_fn)

    fav_post_integration = ensure_integration(apigw, favorites_api, fav_arn)
    fav_get_integration = ensure_integration(apigw, favorites_api, get_fav_arn)
    fav_del_integration = ensure_integration(apigw, favorites_api, del_fav_arn)

    ensure_route(apigw, favorites_api, "POST /favorites", fav_post_integration)
    ensure_route(apigw, favorites_api, "GET /favorites", fav_get_integration)
    ensure_route(apigw, favorites_api, "DELETE /favorites/{spotId}", fav_del_integration)

    fav_auth_id = ensure_authorizer(apigw, favorites_api, "JWT-FAV", cognito_issuer, client_id)
    attach_authorizer(apigw, favorites_api, "POST /favorites", fav_auth_id)
    attach_authorizer(apigw, favorites_api, "GET /favorites", fav_auth_id)
    attach_authorizer(apigw, favorites_api, "DELETE /favorites/{spotId}", fav_auth_id)

    add_lambda_permission(
        lambda_client,
        fav_fn,
        "favorites-api-post",
        "apigateway.amazonaws.com",
        f"arn:aws:execute-api:{region}:{account_id}:{favorites_api}/*/*",
    )
    add_lambda_permission(
        lambda_client,
        get_fav_fn,
        "favorites-api-get",
        "apigateway.amazonaws.com",
        f"arn:aws:execute-api:{region}:{account_id}:{favorites_api}/*/*",
    )
    add_lambda_permission(
        lambda_client,
        del_fav_fn,
        "favorites-api-delete",
        "apigateway.amazonaws.com",
        f"arn:aws:execute-api:{region}:{account_id}:{favorites_api}/*/*",
    )

    recs_api = ensure_http_api(apigw, "recommendationsAPI", ["GET", "POST", "DELETE", "OPTIONS"])
    recs_stage = "$default"
    ensure_stage(apigw, recs_api, recs_stage)

    post_rec_arn = get_lambda_arn(lambda_client, post_rec_fn)
    get_rec_arn = get_lambda_arn(lambda_client, get_rec_fn)
    del_rec_arn = get_lambda_arn(lambda_client, del_rec_fn)

    post_rec_integration = ensure_integration(apigw, recs_api, post_rec_arn)
    get_rec_integration = ensure_integration(apigw, recs_api, get_rec_arn)
    del_rec_integration = ensure_integration(apigw, recs_api, del_rec_arn)

    ensure_route(apigw, recs_api, "POST /recommendations", post_rec_integration)
    ensure_route(apigw, recs_api, "GET /recommendations", get_rec_integration)
    ensure_route(apigw, recs_api, "DELETE /recommendations/{spotId}", del_rec_integration)

    recs_auth_id = ensure_authorizer(apigw, recs_api, "JWT-REC", cognito_issuer, client_id)
    attach_authorizer(apigw, recs_api, "POST /recommendations", recs_auth_id)
    attach_authorizer(apigw, recs_api, "DELETE /recommendations/{spotId}", recs_auth_id)

    add_lambda_permission(
        lambda_client,
        post_rec_fn,
        "recommendations-api-post",
        "apigateway.amazonaws.com",
        f"arn:aws:execute-api:{region}:{account_id}:{recs_api}/*/*",
    )
    add_lambda_permission(
        lambda_client,
        get_rec_fn,
        "recommendations-api-get",
        "apigateway.amazonaws.com",
        f"arn:aws:execute-api:{region}:{account_id}:{recs_api}/*/*",
    )
    add_lambda_permission(
        lambda_client,
        del_rec_fn,
        "recommendations-api-delete",
        "apigateway.amazonaws.com",
        f"arn:aws:execute-api:{region}:{account_id}:{recs_api}/*/*",
    )

    set_output(outputs, "VITE_FAVORITES_API_BASE", f"https://{favorites_api}.execute-api.{region}.amazonaws.com")
    set_output(outputs, "VITE_RECOMMENDATIONS_API_BASE", f"https://{recs_api}.execute-api.{region}.amazonaws.com")
    set_output(outputs, "USERS_TABLE", users_table)
    set_output(outputs, "FAV_TABLE", fav_table)
    set_output(outputs, "REC_TABLE", rec_table)

    # Frontend
    if not is_truthy(get_setting(config, "SKIP_FRONTEND", "")):
        build_dir = Path(get_setting(config, "BUILD_DIR", str(ROOT_DIR / "dist")))
        site_bucket = get_setting(config, "SITE_BUCKET_NAME", outputs.get("SITE_BUCKET_NAME", "")) or f"vela-web-{account_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        oac_name = get_setting(config, "OAC_NAME", "vela-oac")
        dist_id = get_setting(config, "CLOUDFRONT_DISTRIBUTION_ID", outputs.get("CLOUDFRONT_DISTRIBUTION_ID", ""))

        ensure_bucket(s3, site_bucket, region)
        s3.put_public_access_block(
            Bucket=site_bucket,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
        )

        oac_id = ensure_oac(cloudfront, oac_name)
        dist_id, dist_domain = ensure_distribution(cloudfront, site_bucket, region, oac_id, dist_id or None)
        put_site_bucket_policy(s3, site_bucket, account_id, dist_id)

        site_url = f"https://{dist_domain}"
        set_output(outputs, "SITE_BUCKET_NAME", site_bucket)
        set_output(outputs, "CLOUDFRONT_DISTRIBUTION_ID", dist_id)
        set_output(outputs, "CLOUDFRONT_DOMAIN", site_url)

        if not is_truthy(get_setting(config, "SKIP_COGNITO_UPDATE", "")):
            cognito.update_user_pool_client(
                UserPoolId=pool_id,
                ClientId=client_id,
                AllowedOAuthFlows=["code"],
                AllowedOAuthFlowsUserPoolClient=True,
                AllowedOAuthScopes=["openid", "email"],
                SupportedIdentityProviders=["COGNITO"],
                CallbackURLs=[site_url],
                LogoutURLs=[site_url],
            )
            set_output(outputs, "VITE_COGNITO_REDIRECT_URI", site_url)
            set_output(outputs, "VITE_COGNITO_LOGOUT_URI", site_url)

        if not is_truthy(get_setting(config, "SKIP_BUILD", "")):
            env = os.environ.copy()
            npm_bin = detect_npm(config)
            if not npm_bin:
                raise RuntimeError("npm not found. Install Node.js or set NPM_BIN (or set SKIP_BUILD=1).")
            env["NPM_BIN"] = npm_bin
            for key in [
                "VITE_VISIBLE_PLANETS_URL",
                "VITE_DARK_SPOTS_URL",
                "VITE_LIGHTMAP_API_BASE",
                "VITE_FAVORITES_API_BASE",
                "VITE_RECOMMENDATIONS_API_BASE",
                "VITE_COGNITO_DOMAIN",
                "VITE_COGNITO_CLIENT_ID",
                "VITE_COGNITO_REDIRECT_URI",
                "VITE_COGNITO_LOGOUT_URI",
                "VITE_COGNITO_SCOPES",
            ]:
                if key in outputs:
                    env[key] = outputs[key]
            build_frontend(env)

        if not build_dir.exists():
            raise RuntimeError(f"Build output not found: {build_dir}")
        upload_directory(s3, build_dir, site_bucket)

    cloudfront_domain = outputs.get("CLOUDFRONT_DOMAIN", "")
    print(f"Deploy complete. Outputs saved to {OUTPUTS_PATH}")
    print("Wait another minute or two for CloudFront to finish setting up.")
    if cloudfront_domain:
        print(f"Website: {cloudfront_domain}")


if __name__ == "__main__":
    deploy_all()
