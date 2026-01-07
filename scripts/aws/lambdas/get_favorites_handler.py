import os
import json
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["FAV_TABLE"])


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


def resp(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=decimal_default),
    }


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError


def lambda_handler(event, context):
    try:
        claims = get_claims(event)
        if not claims:
            return resp(401, {"message": "Unauthorized"})

        user_id = claims.get("sub")
        if not user_id:
            return resp(401, {"message": "Invalid token"})

        out = table.query(
            KeyConditionExpression=Key("userId").eq(user_id)
        )

        items = out.get("Items", [])
        return resp(200, {"items": items})

    except Exception as exc:
        print("ERROR:", str(exc))
        return resp(500, {"message": "Server error"})
