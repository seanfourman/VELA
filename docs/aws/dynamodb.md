# DynamoDB Data Model

This document describes the DynamoDB tables used by VELA and the deploy-time config keys used to name them.
# DynamoDB Data Model

This document describes the DynamoDB tables used by VELA.
## Favorites table
- Table name (default): `UserFavorites` (override via `FAV_TABLE` in `scripts/aws/config.env`)
- Primary key: `userId` (partition key), `spotId` (sort key)
- Example item:

```json
{
  "userId": "cognito-sub-123",
  "spotId": "12.345678,-98.765432",
  "lat": 12.345678,
  "lon": -98.765432,
  "createdAt": "2026-01-19T12:34:56Z"
}
```

## Recommendations table
- Table name (default): `Recommendations` (override via `REC_TABLE` in `scripts/aws/config.env`)
- Primary key: `id` (string UUID)
- Example item shape documented in `scripts/aws/lambdas/post_recommendation_handler.py`

## Throughput and billing
- Default deployment uses `PAY_PER_REQUEST` (on-demand) for developer convenience. Production guidance: switch to provisioned capacity with autoscaling if traffic warrants.

## Verification
- [x] Confirmed deploy keys and defaults in `scripts/aws/deploy.py`: `FAV_TABLE` -> `UserFavorites`, `REC_TABLE` -> `Recommendations`, `USERS_TABLE` -> `Users`.

```
