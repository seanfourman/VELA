# delete_recommendation_handler

**File:** `scripts/aws/lambdas/delete_recommendation_handler.py`

**Purpose:** Delete a recommendation by `id`. Access typically restricted to owner or admin — check handler logic.

**Trigger:** `DELETE /recommendations/{id}`

**Verification**
- [ ] Confirm path param reading and any authorization checks in `scripts/aws/lambdas/delete_recommendation_handler.py`.
