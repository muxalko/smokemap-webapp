# Frontend authentication boundary

The Django backend is the authoritative identity and authorization boundary.
NextAuth manages the browser-facing session, but it does not assign roles or
replace Django permission checks.

## M1 credential flow

Password login, refresh, and logout use only the backend GraphQL token
lifecycle. The abandoned DRF authentication experiment is not part of the
application contract.

The encrypted, HTTP-only NextAuth JWT cookie may contain the short-lived
Django access token and rotating refresh token. The browser-visible session
contains only safe identity fields, the normalized role, expiry, and the
non-sensitive `SessionExpired` error. Backend credentials must never be copied
to `useSession()`, `/api/auth/session`, client storage, logs, URLs, or errors.

Server-side backend calls obtain the bearer credential through the private
session projection in `src/lib/auth/get-backend-auth.ts`. They must not add a
credential to the public session to make it accessible.

Refresh failures are terminal after one controlled retry for a transient
provider or network failure. Terminal handling erases both backend
credentials and requires a new login. Logout attempts to revoke the active
refresh family, but local logout still completes when the backend is
unavailable.

Concurrent refreshes are deduplicated within one frontend process. This is the
tested M1 deployment model used by Docker Compose. A horizontally scaled or
serverless deployment requires shared refresh coordination, an idempotent
backend exchange, or a backend-managed opaque session before it is considered
production-safe; independent instances must not rotate the same refresh token.

## Future Google sign-in

Google sign-in must use the server-side OpenID Connect authorization-code flow
and request only `openid email profile` for authentication. A Google token is
never a Smokemap API credential.

After NextAuth verifies the Google identity, Django must exchange that verified
identity for the same five-minute access and seven-day refresh pair used by
password login. Django remains responsible for local account state and roles.
External accounts must be keyed by provider plus Google's stable `sub` claim;
verified email is profile data and must not silently link an existing password
account. Account linking requires an explicit authenticated flow.

Google access, ID, and refresh tokens must remain server-side and must not be
added to the browser-visible session. Do not request Google offline access or
retain a Google refresh token unless a later product decision requires calling
Google APIs on the user's behalf.
