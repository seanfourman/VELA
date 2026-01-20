# post_recommendation_handler

**File:** `scripts/aws/lambdas/post_recommendation_handler.py`

**Purpose:** Accept a community recommendation for a stargazing spot and persist it to the recommendations table.

**Handler details**
- Trigger: `POST /recommendations`
- Auth: Optional — check handler comments; may accept anonymous submissions depending on handler logic.

**Environment variables**
- `RECOMMENDATIONS_TABLE` - DynamoDB table name for recommendations.

**Example request**
```
POST /recommendations
Content-Type: application/json

{ "title": "Great spot", "lat": 12.34, "lon": -98.76, "notes": "Parking nearby" }
```

**Example response**
```
201 { "id": "uuid-1234" }
```

**Verification**
- [ ] Confirm body parsing and item shape in `scripts/aws/lambdas/post_recommendation_handler.py`.
