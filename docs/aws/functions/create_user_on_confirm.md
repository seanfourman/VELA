# create_user_on_confirm

**File:** `scripts/aws/lambdas/create_user_on_confirm.py`

**Purpose:** Create application-side user record on Cognito post-confirmation. For example, populate a users table or send a welcome event.

**Handler details**
- Trigger: Cognito Post Confirmation trigger (see lambda comments)

**Verification**
- [ ] Confirm the lambda writes to any downstream datastore and review required IAM permissions in `scripts/aws/lambdas/create_user_on_confirm.py`.
