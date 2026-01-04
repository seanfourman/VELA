import json
import urllib.parse
import urllib.request


def lambda_handler(event, context):
    try:
        qs = event.get("queryStringParameters") or {}
        lat = qs.get("lat")
        lon = qs.get("lon")

        if not lat or not lon:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "GET,OPTIONS",
                },
                "body": json.dumps({"message": "lat and lon query params are required"}),
            }

        query = urllib.parse.urlencode({
            "latitude": lat,
            "longitude": lon,
        })
        url = f"https://api.visibleplanets.dev/v3?{query}"

        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req) as resp:
            status = resp.getcode()
            body_bytes = resp.read()

        if status != 200:
            return {
                "statusCode": status,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "GET,OPTIONS",
                },
                "body": json.dumps({
                    "message": "Error calling visibleplanets API",
                    "status": status,
                }),
            }

        data = json.loads(body_bytes)

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET,OPTIONS",
            },
            "body": json.dumps(data),
        }

    except Exception as err:
        print("Lambda error:", err)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET,OPTIONS",
            },
            "body": json.dumps({
                "message": "Internal server error",
                "error": str(err),
            }),
        }
