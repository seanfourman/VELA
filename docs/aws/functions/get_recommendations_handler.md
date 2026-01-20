# get_recommendations_handler

**File:** `scripts/aws/lambdas/get_recommendations_handler.py`

**Purpose:** Return a list of community recommendations, optionally filtered by bounding box or radius.

**Trigger:** `GET /recommendations`

**Example response**
```
200 { "items": [ { "id": "uuid-1234", "title": "Great spot", "lat": 12.34, "lon": -98.76, "createdAt": "..." } ] }
```

**Verification**
- [ ] Confirm query param handling and DynamoDB access in `scripts/aws/lambdas/get_recommendations_handler.py`.
