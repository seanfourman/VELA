# auto_confirm_user

**File:** `scripts/aws/lambdas/auto_confirm_user.py`

**Purpose:** Cognito trigger to auto-confirm users (if configured). Runs as a pre/post sign-up or custom trigger depending on implementation.

**Handler details**
- Trigger: Cognito user pool trigger (see lambda comments)

**Example behavior**
- Auto-confirm the user and optionally add default attributes or create a minimal user record.

**Verification**
- [ ] Inspect `scripts/aws/lambdas/auto_confirm_user.py` to confirm trigger type and expected permissions.
