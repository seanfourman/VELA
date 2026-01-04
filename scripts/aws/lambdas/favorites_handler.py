import os
import json
import boto3
from datetime import datetime, timezone
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["FAV_TABLE"])


def get_claims(event: dict):
    jwt = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
    )
    claims = jwt.get("claims")
    if claims:
        return claims

    return (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims")
    )


def to_fixed6(x):
    return f"{float(x):.6f}"


def response(status_code: int, body: dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def lambda_handler(event, context):
    try:
        claims = get_claims(event)
        if not claims:
            return response(401, {"message": "Unauthorized"})

        user_id = claims.get("sub")
        if not user_id:
            return response(401, {"message": "Unauthorized (no sub claim)"})

        body_str = event.get("body") or "{}"
        body = json.loads(body_str)

        lat = body.get("lat")
        lon = body.get("lon")

        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            return response(400, {"message": "lat and lon must be numbers"})

        spot_id = f"{to_fixed6(lat)},{to_fixed6(lon)}"
        created_at = datetime.now(timezone.utc).isoformat()

        table.put_item(
            Item={
                "userId": user_id,
                "spotId": spot_id,
                "createdAt": created_at,
                "lat": Decimal(str(lat)),
                "lon": Decimal(str(lon)),
            },
            ConditionExpression="attribute_not_exists(userId) AND attribute_not_exists(spotId)",
        )

        return response(201, {
            "userId": user_id,
            "spotId": spot_id,
            "createdAt": created_at,
        })

    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return response(409, {"message": "Already favorited"})
    except Exception as exc:
        print("ERROR:", str(exc))
        return response(500, {"message": "Server error"})
