import os
import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["REC_TABLE"])


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError


def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=decimal_default),
    }


def lambda_handler(event, context):
    try:
        out = table.scan()
        items = out.get("Items", [])
        return response(200, {"items": items})

    except Exception as exc:
        print("ERROR:", str(exc))
        return response(500, {"message": "Server error"})
