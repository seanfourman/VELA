# favorites_handler

**File:** `scripts/aws/lambdas/favorites_handler.py`

**Purpose:** Create a favorite spot for an authenticated user. Enforces uniqueness per user+spot.

**Handler details**
- Trigger: `POST /favorites` via API Gateway HTTP API
- Auth: Cognito JWT required. Lambda reads `event['requestContext']['authorizer']['jwt']['claims']` to obtain `sub` or `username`.

**Environment variables**
- `FAVORITES_TABLE` - DynamoDB table name used for favorites (check `deploy.py` outputs)

**Example request**
```
POST /favorites
Authorization: Bearer <ID_TOKEN>
Content-Type: application/json

{ "lat": 12.345678, "lon": -98.765432 }
```

**Example success response**
```
201 { "spotId": "12.345678,-98.765432" }
```

**Error cases**
- 401: missing/invalid token
- 409: already favorited (ConditionalCheckFailedException)
- 500: server error — check CloudWatch logs

**IAM actions required**
- `dynamodb:PutItem`, `dynamodb:ConditionCheckItem` on the favorites table
- `logs:CreateLogStream`, `logs:PutLogEvents` for CloudWatch

**Verification**
- [ ] Confirm request parsing and `spotId` builder in `scripts/aws/lambdas/favorites_handler.py`.

# favorites_handler

**File:** `scripts/aws/lambdas/favorites_handler.py`

**Purpose:** Create a favorite spot for authenticated user. Enforces uniqueness per user+spot.

**Handler details**
- Trigger: `POST /favorites` via API Gateway HTTP API
- Auth: Cognito JWT required. Lambda reads `event['requestContext']['authorizer']['jwt']['claims']` to obtain `sub` or `username`.

**Environment variables**
- `FAVORITES_TABLE` - DynamoDB table name used for favorites (check `deploy.py` outputs)

**Example request**
```
POST /favorites
Authorization: Bearer <ID_TOKEN>
Content-Type: application/json

{ "lat": 12.345678, "lon": -98.765432 }
```

**Example success response**
```
201 { "spotId": "12.345678,-98.765432" }
```

**Error cases**
- 401: missing/invalid token
- 409: already favorited (ConditionalCheckFailedException)
- 500: server error — check CloudWatch logs

**IAM actions required**
- `dynamodb:PutItem`, `dynamodb:ConditionCheckItem` on the favorites table
- `logs:CreateLogStream`, `logs:PutLogEvents` for CloudWatch

**Verification**
- [ ] Confirm request parsing and `spotId` builder in `scripts/aws/lambdas/favorites_handler.py`.
