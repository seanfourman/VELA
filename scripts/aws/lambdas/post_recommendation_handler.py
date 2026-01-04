import json
import os
import boto3
from datetime import datetime, timezone
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ.get("REC_TABLE")
if not TABLE_NAME:
    raise Exception("Missing env var: set REC_TABLE")

table = dynamodb.Table(TABLE_NAME)


def get_claims(event):
    return (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
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
            try:
                parsed = json.loads(s)
                if isinstance(parsed, list):
                    return any(str(g).strip().lower() == "admin" for g in parsed)
            except Exception:
                inner = s[1:-1].strip()
                parts = [p.strip() for p in inner.split(",") if p.strip()]
                return any(p.lower() == "admin" for p in parts)

        parts = [p.strip() for p in s.split(",") if p.strip()]
        return any(p.lower() == "admin" for p in parts)

    return False


def to_dynamo(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, list):
        return [to_dynamo(x) for x in obj]
    if isinstance(obj, dict):
        return {k: to_dynamo(v) for k, v in obj.items()}
    return obj


def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=str),
    }


def lambda_handler(event, context):
    try:
        claims = get_claims(event)
        if not claims:
            return response(401, {"message": "Unauthorized"})

        if not is_admin(claims):
            return response(403, {"message": "Admin only"})

        body = json.loads(event.get("body", "{}"))

        coords = body.get("coordinates") or {}
        lat = coords.get("lat")
        lon = coords.get("lon")

        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            return response(400, {
                "message": "coordinates.lat and coordinates.lon must be numbers",
            })

        rec_id = body.get("id")
        if isinstance(rec_id, str) and rec_id.strip():
            spot_id = rec_id.strip()
        else:
            spot_id = f"{float(lat):.6f},{float(lon):.6f}"

        item = {
            "spotId": spot_id,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "createdBy": claims.get("sub"),
            "data": to_dynamo(body),
        }

        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(spotId)",
        )

        return response(201, {"message": "Created", "spotId": spot_id})

    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return response(409, {"message": "Recommendation already exists"})

    except Exception as exc:
        print("ERROR:", str(exc))
        return response(500, {"message": "Server error"})
