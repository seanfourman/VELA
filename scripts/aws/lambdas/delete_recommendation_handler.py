import os
import json
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["REC_TABLE"])


def get_claims(event):
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims")
    )
    if claims:
        return claims

    return (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims")
    )


def is_admin(claims):
    groups = claims.get("cognito:groups")
    if not groups:
        return False

    if isinstance(groups, list):
        return any(str(g).strip().lower() == "admin" for g in groups)

    if isinstance(groups, str):
        s = groups.strip()

        if s.startswith("[") and s.endswith("]"):
            inner = s[1:-1].strip()
            parts = [p.strip().strip('"').strip("'") for p in inner.split(",") if p.strip()]
            return any(p.lower() == "admin" for p in parts)

        parts = [p.strip() for p in s.split(",") if p.strip()]
        return any(p.lower() == "admin" for p in parts)

    return False


def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "DELETE,OPTIONS",
        },
        "body": json.dumps(body),
    }


def lambda_handler(event, context):
    try:
        claims = get_claims(event)
        if not claims:
            return response(401, {"message": "Unauthorized"})

        if not is_admin(claims):
            return response(403, {"message": "Admin only"})

        spot_id = (event.get("pathParameters") or {}).get("spotId")
        if not spot_id:
            return response(400, {"message": "spotId path parameter is required"})

        table.delete_item(Key={"spotId": spot_id})

        return response(200, {"message": "Deleted", "spotId": spot_id})

    except Exception as exc:
        print("ERROR:", str(exc))
        return response(500, {"message": "Server error"})
