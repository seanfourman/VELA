# delete_favorite_handler

**File:** `scripts/aws/lambdas/delete_favorite_handler.py`

**Purpose:** Delete a favorite by `spotId` for the authenticated user.

**Trigger:** `DELETE /favorites/{spotId}`

**Verification**
- [ ] Confirm path param reading and DynamoDB DeleteItem call in `scripts/aws/lambdas/delete_favorite_handler.py`.
