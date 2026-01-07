import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")


def lambda_handler(event, context):
    attrs = event.get("request", {}).get("userAttributes") or {}
    user_id = attrs.get("sub") or event.get("userName")
    email = attrs.get("email")
    if not email:
        user_name = event.get("userName")
        if user_name and "@" in user_name:
            email = user_name

    trigger_source = event.get("triggerSource", "")
    if not trigger_source.startswith("PostConfirmation"):
        return event

    if not user_id:
        print("PostConfirmation missing user id", {"userName": event.get("userName"), "attrs": list(attrs.keys())})
        return event

    table_name = os.environ["USERS_TABLE"]
    table = dynamodb.Table(table_name)

    item = {
        "userId": user_id,
        "email": email,
        "role": "user",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    try:
        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(userId)",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise

    return event
