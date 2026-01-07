def lambda_handler(event, context):
    response = event.setdefault("response", {})
    response["autoConfirmUser"] = True
    response["autoVerifyEmail"] = True
    return event
