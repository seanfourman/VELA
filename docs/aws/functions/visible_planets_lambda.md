# visible_planets_lambda

**File:** `scripts/aws/lambdas/visible_planets_lambda.py`

**Purpose:** Proxy to external VisiblePlanets API. Validates `lat`/`lon` query parameters.

**Example request**
```
GET /visible-planets?lat=12.34&lon=-98.76
```

**Verification**
- [ ] Ensure the lambda forwards query params as expected and returns 400 on missing params.
