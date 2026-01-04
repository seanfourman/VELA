import os
import json
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["FAV_TABLE"])


def get_claims(event):
    return (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims")
    )


def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
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
            return response(401, {"message": "Unauthorized"})

        spot_id = (
            event.get("pathParameters", {})
            .get("spotId")
        )

        if not spot_id:
            return response(400, {"message": "spotId required"})

        table.delete_item(
            Key={
                "userId": user_id,
                "spotId": spot_id,
            }
        )

        return response(200, {"message": "Deleted"})

    except Exception as exc:
        print("ERROR:", str(exc))
        return response(500, {"message": "Server error"})
