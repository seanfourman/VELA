# get_favorites_handler

**File:** `scripts/aws/lambdas/get_favorites_handler.py`

**Purpose:** Return favorites for the authenticated user.

**Trigger:** `GET /favorites` via API Gateway.

**Example response**
```
200 { "items": [ { "spotId": "12.345678,-98.765432", "lat": 12.345678, "lon": -98.765432, "createdAt": "2026-01-19T12:34:56Z" } ] }
```

**Verification**
- [ ] Validate DynamoDB Query usage and key attributes in `scripts/aws/lambdas/get_favorites_handler.py`.
