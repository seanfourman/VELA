# Cognito & Auth

## Auth flow
- The frontend uses Cognito Hosted UI with PKCE. Key frontend helpers live in `src/utils/cognitoAuth.js` and the React hook `src/hooks/useCognitoAuth.js`.

## Required env vars for frontend
- `VITE_COGNITO_DOMAIN`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_REDIRECT_URI`
- `VITE_COGNITO_LOGOUT_URI`
- `VITE_COGNITO_SCOPES`

## JWT usage
- Protected Lambda handlers expect the API Gateway JWT authorizer to populate claims at `event.requestContext.authorizer.jwt.claims`. Lambdas read user identifier (sub) from these claims.

## Verification
- [ ] Confirm `src/utils/cognitoAuth.js` default keys and instruct developers to override them in `.env`.
 
## Verification
- [x] Confirmed `src/utils/cognitoAuth.js` uses `VITE_COGNITO_DOMAIN`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_REDIRECT_URI`, `VITE_COGNITO_LOGOUT_URI`, and `VITE_COGNITO_SCOPES`.