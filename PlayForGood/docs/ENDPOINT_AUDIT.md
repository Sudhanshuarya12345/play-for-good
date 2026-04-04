# Endpoint Audit

Timestamp: 2026-04-04 00:48:55 +05:30

Summary:
- Total endpoints checked: 41
- Not found (404): 0
- Transport errors: 0
- Note: Protected/admin routes are expected to return 401 without auth.

| Method | Endpoint | Status |
|---|---|---|
| GET | /health | 200 |
| GET | /api/public/home | 200 |
| GET | /api/charities | 400 |
| GET | /api/charities/test-slug | 400 |
| POST | /api/auth/signup | 400 |
| POST | /api/auth/login | 400 |
| POST | /api/auth/logout | 200 |
| GET | /api/auth/me | 401 |
| POST | /api/subscriptions/create-checkout-session | 401 |
| POST | /api/subscriptions/create-portal-session | 401 |
| GET | /api/subscriptions/status | 401 |
| POST | /api/subscriptions/cancel | 401 |
| GET | /api/scores | 401 |
| POST | /api/scores | 401 |
| PATCH | /api/scores/00000000-0000-0000-0000-000000000000 | 401 |
| GET | /api/draws | 400 |
| GET | /api/draws/00000000-0000-0000-0000-000000000000 | 400 |
| POST | /api/donations | 400 |
| GET | /api/donations | 401 |
| GET | /api/donations/me | 401 |
| GET | /api/user/charity | 401 |
| PATCH | /api/user/charity | 401 |
| GET | /api/winnings/me | 401 |
| POST | /api/winnings/00000000-0000-0000-0000-000000000000/proof/upload-url | 401 |
| POST | /api/winnings/00000000-0000-0000-0000-000000000000/proof/submit | 401 |
| POST | /api/webhooks/stripe | 400 |
| GET | /api/admin/users | 401 |
| PATCH | /api/admin/users/00000000-0000-0000-0000-000000000000 | 401 |
| PATCH | /api/admin/users/00000000-0000-0000-0000-000000000000/subscription | 401 |
| GET | /api/admin/charities | 401 |
| POST | /api/admin/charities | 401 |
| PATCH | /api/admin/charities/00000000-0000-0000-0000-000000000000 | 401 |
| DELETE | /api/admin/charities/00000000-0000-0000-0000-000000000000 | 401 |
| GET | /api/admin/draw/config | 401 |
| PATCH | /api/admin/draw/config | 401 |
| POST | /api/admin/draw/simulate | 401 |
| POST | /api/admin/draw/publish | 401 |
| GET | /api/admin/winnings | 401 |
| PATCH | /api/admin/winnings/00000000-0000-0000-0000-000000000000/verification | 401 |
| PATCH | /api/admin/winnings/00000000-0000-0000-0000-000000000000/payment | 401 |
| GET | /api/admin/reports/overview | 401 |

## No-Stripe Validation Snapshot

Timestamp: 2026-04-04 14:03:35 +05:30

Summary:
- Backend startup succeeds with `STRIPE_ENABLED=false` and empty Stripe keys.
- Stripe endpoints return controlled `400` responses with message: "Stripe billing is disabled in this environment."
- Stripe webhook endpoint returns `200` with `{ "ignored": true }` when Stripe is disabled.
- Endpoints that require unavailable Supabase tables now return `503` with `SETUP_REQUIRED` and explicit SQL setup guidance.
- No crash-level (`500`) responses observed during public + authenticated sweep in this environment.

Representative checks:

| Method | Endpoint | Status |
|---|---|---|
| GET | /health | 200 |
| GET | /api/public/home | 200 |
| GET | /api/charities | 503 |
| POST | /api/auth/signup | 503 |
| GET | /api/auth/me (authenticated) | 200 |
| POST | /api/subscriptions/create-checkout-session (authenticated) | 400 |
| GET | /api/subscriptions/status (authenticated) | 200 |
| POST | /api/webhooks/stripe | 200 |
| GET | /api/user/charity (authenticated) | 503 |

## Post-Schema Operational Validation

Timestamp: 2026-04-04 14:57:48 +05:30

Summary:
- Remote schema and seed application completed successfully via `npm run db:apply:remote`.
- Public, auth, user, and admin endpoint groups were exercised with valid payloads and real auth tokens.
- No transport failures and no `500` responses observed in this run.
- Stripe-disabled paths still correctly return controlled `400` responses.

Representative checks:

| Method | Endpoint | Status |
|---|---|---|
| GET | /health | 200 |
| GET | /api/public/home | 200 |
| GET | /api/charities | 200 |
| POST | /api/auth/signup | 201 |
| GET | /api/auth/me (authenticated) | 200 |
| POST | /api/donations (authenticated) | 201 |
| GET | /api/donations/me (authenticated) | 200 |
| GET | /api/user/charity (authenticated) | 200 |
| POST | /api/subscriptions/create-checkout-session (authenticated) | 400 |
| GET | /api/scores (no active subscription test user) | 403 |
| GET | /api/admin/users (admin authenticated) | 200 |
| POST | /api/admin/charities (admin authenticated) | 201 |
| PATCH | /api/admin/draw/config (admin authenticated) | 200 |
| POST | /api/admin/draw/simulate (admin authenticated) | 200 |
| POST | /api/admin/draw/publish (admin authenticated) | 200 |

## Frontend Runtime Smoke Snapshot

Timestamp: 2026-04-04 15:06:46 +05:30

Summary:
- Frontend dev runtime validated against live backend after schema initialization.
- Subscriber login, dashboard cards, score add flow, donation record flow, and subscription status page behaved as expected.
- Admin login, admin dashboard metrics, and user-management list views rendered with live data.
- Charity list/detail pages load data; failed third-party image hosts are now handled with graceful hide fallback to avoid broken-image artifacts.

Representative UI-backed checks:

| Area | Route | Outcome |
|---|---|---|
| Public home and nav | /, /charities, /charities/:slug | Loaded successfully with live charity data |
| Auth flow | /auth/login | User/admin login successful |
| Subscriber dashboard | /dashboard | Status cards and quick links rendered |
| Score module | /dashboard/scores | Score add and list refresh successful |
| Donation module | /dashboard/donations | Donation record persisted and appeared in history |
| Subscription module | /dashboard/subscription | Stripe-disabled action surfaced controlled backend message |
| Admin dashboard | /admin | Metrics cards rendered with current totals |
| Admin users | /admin/users | User/subscription table loaded and displayed expected records |

## Focused Admin UI Action Pass

Timestamp: 2026-04-04 15:14:04 +05:30

Scope (UI buttons only):
- Draw simulate and publish from `/admin/draw`
- Winnings verification/payout actions from `/admin/winnings`
- Stripe testing intentionally deferred per request

Results:

| UI Action | Route | Outcome |
|---|---|---|
| Run Simulation | /admin/draw | Success; participant count reached 1 for `2026-07` |
| Publish Draw | /admin/draw | Success; draw published for `2026-07` |
| Open Winnings Verification | /admin/winnings | Loaded, but no records available |
| Verification/Payout Button Actions | /admin/winnings | Blocked by data state: "No winnings found" |

## Full Non-Stripe API Regression and Deployment Readiness Snapshot

Timestamp: 2026-04-04 15:43:41 +05:30

Summary:
- Executed a full authenticated and unauthenticated non-Stripe regression sweep covering public, user, admin, draw, winnings, and webhook routes.
- Total endpoint checks: 48
- Failed checks: 0
- The previously failing route `POST /api/winnings/:id/proof/upload-url` now returns `200` after bucket auto-initialization hardening.
- Deployment-target behavior validated with `STRIPE_ENABLED=false`: subscription checkout/portal/cancel endpoints return controlled `400` responses, and Stripe webhook returns `200` ignored success.
- Revalidation after deployment-config updates completed at 2026-04-04 15:50:15 +05:30 with the same `48/48` passing result.
- Revalidation via `npm run test:nonstripe` completed at 2026-04-04 16:01:06 +05:30 with the same `48/48` passing result.

Representative checks:

| Method | Endpoint | Status |
|---|---|---|
| GET | /health | 200 |
| GET | /api/charities | 200 |
| POST | /api/auth/login (user/admin) | 200 |
| GET | /api/user/charity | 200 |
| POST | /api/donations | 201 |
| GET | /api/subscriptions/status | 200 |
| POST | /api/subscriptions/create-checkout-session | 400 |
| POST | /api/admin/draw/simulate | 200 |
| POST | /api/admin/draw/publish | 200 |
| GET | /api/winnings/me | 200 |
| POST | /api/winnings/:id/proof/upload-url | 200 |
| POST | /api/winnings/:id/proof/submit | 200 |
| PATCH | /api/admin/winnings/:id/verification | 200 |
| PATCH | /api/admin/winnings/:id/payment | 200 |
| GET | /api/admin/reports/overview | 200 |
| POST | /api/webhooks/stripe | 200 |

## Razorpay Migration Validation Snapshot

Timestamp: 2026-04-04 16:34:13 +05:30

Summary:
- Billing provider implementation migrated from Stripe to Razorpay.
- Backend env contract switched to `RAZORPAY_*` keys and runtime executed with `RAZORPAY_ENABLED=false` during endpoint verification.
- Full non-billing endpoint regression passed with zero failures.
- Total endpoint checks: 48
- Failed checks: 0
- Revalidated after final migration cleanup at 2026-04-04 16:36:21 +05:30 using `npm run test:nonbilling` with the same `48/48` pass result.
- Final logical audit at 2026-04-04 16:40:55 +05:30 added safer cycle-end cancellation and stronger webhook idempotency/signature handling (`x-razorpay-event-id` preference + hex-safe signature comparison).
- Final webhook hardening at 2026-04-04 16:42:41 +05:30 added `payment.failed` subscription status sync and revalidated `48/48` endpoint checks.

Representative checks:

| Method | Endpoint | Status |
|---|---|---|
| GET | /health | 200 |
| GET | /api/public/home | 200 |
| GET | /api/charities | 200 |
| POST | /api/auth/login (user/admin) | 200 |
| GET | /api/subscriptions/status | 200 |
| POST | /api/subscriptions/create-checkout-session | 400 |
| POST | /api/subscriptions/create-portal-session | 400 |
| POST | /api/subscriptions/cancel | 400 |
| POST | /api/admin/draw/simulate | 200 |
| POST | /api/admin/draw/publish | 200 |
| GET | /api/winnings/me | 200 |
| POST | /api/winnings/:id/proof/upload-url | 200 |
| PATCH | /api/admin/winnings/:id/verification | 200 |
| PATCH | /api/admin/winnings/:id/payment | 200 |
| GET | /api/admin/reports/overview | 200 |
| POST | /api/webhooks/razorpay | 200 |

## Complete Endpoint Coverage Validation

Timestamp: 2026-04-04 16:46:41 +05:30

Summary:
- Executed a complete mounted-route sweep covering all backend endpoints registered in `src/server.js`.
- Included `POST /api/auth/signup` and deprecated compatibility endpoint `POST /api/webhooks/stripe` in addition to the existing non-billing flow checks.
- Total endpoint checks: 50
- Failed checks: 0

Representative additions in this run:

| Method | Endpoint | Status |
|---|---|---|
| POST | /api/auth/signup | 201 |
| POST | /api/webhooks/stripe (deprecated) | 200 |

Result:
- Full endpoint verification passed (`50/50`).

## PRD Hardening Validation Snapshot

Timestamp: 2026-04-04 19:29:37 +05:30

Summary:
- Applied delivery hardening across notifications, dashboard participation visibility, charity discovery UX, admin analytics, and validation guards.
- Frontend quality gates passed after UI updates (lint + production build).
- Backend non-billing regression rerun passed after making draw-month selection collision-safe in regression automation.
- Total endpoint checks: 50
- Failed checks: 0

Representative checks:

| Method | Endpoint | Status |
|---|---|---|
| GET | /api/charities | 200 |
| GET | /api/charities/:slug | 200 |
| GET | /api/user/charity | 200 |
| PATCH | /api/admin/users/:id/subscription | 200 |
| GET | /api/admin/reports/overview | 200 |
| POST | /api/admin/draw/publish | 200 |
| GET | /api/winnings/me | 200 |
| PATCH | /api/admin/winnings/:id/verification | 200 |
| PATCH | /api/admin/winnings/:id/payment | 200 |
| POST | /api/webhooks/razorpay | 200 |

Result:
- Full endpoint verification passed (`50/50`).
