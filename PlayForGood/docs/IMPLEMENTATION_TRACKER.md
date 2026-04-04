# Golf Charity Subscription Platform - Implementation Tracker

Last Updated: 2026-04-04 16:46:41 +05:30
Status: In Progress

## Delivery Goal
Build a complete, deployable web application using plain React.js + JavaScript frontend and Node.js/Express backend, with Supabase, Razorpay Test Mode, and Resend in a security-first implementation.

## Confirmed Product Decisions
- Razorpay mode: Test mode
- Plans: Monthly INR 499, Yearly INR 4999
- Prize pool contribution: 60% of each subscription payment
- Charity contribution: minimum 10% (user selectable, can increase)
- Draw numbers: lottery-style independent generation
- Draw modes: random and weighted by score frequency
- Draw execution: admin manual trigger only
- Draw simulation: required before publish
- Currency for MVP: INR only (multi-currency ready architecture)
- Match logic: compare all 5 user scores with 5 draw numbers, count intersections
- Demo admin: admin@golfplatform.com / Admin@123
- Demo user: user@test.com / User@123
- Independent donations: UI + backend storage required, Razorpay optional

## Build Phases and Checklist

### Phase 1 - Foundation and Security Baseline
- [x] Initialize plain React (Vite) frontend and Express backend
- [x] Configure Tailwind and global design tokens
- [x] Add security headers and baseline middleware
- [x] Add environment templates and runtime validation
- [x] Add linting and formatting scripts

### Phase 2 - Data Layer and Auth
- [x] Create Supabase schema SQL (tables, indexes, constraints)
- [x] Add RLS policies for all protected tables
- [x] Add Supabase client utilities (server and browser)
- [x] Implement auth pages (signup/login/logout)
- [x] Seed demo admin and user setup flow

### Phase 3 - Subscription and Billing
- [x] Add Razorpay plans wiring (test mode)
- [x] Implement checkout session endpoint
- [x] Implement in-dashboard billing controls (portal alternative)
- [x] Implement Razorpay webhook endpoint with signature verification
- [x] Sync subscription lifecycle to database

### Phase 4 - Score System
- [x] Build score entry UI (1-45 + date)
- [x] Build score listing UI (reverse chronological)
- [x] Enforce rolling latest 5 scores logic
- [x] Build score edit flow with validation

### Phase 5 - Draw Engine
- [x] Build draw config (random/weighted)
- [x] Implement simulation endpoint and analysis payload
- [x] Implement publish endpoint and snapshot entries
- [x] Implement tier logic (5/4/3) and prize distribution
- [x] Implement 5-match jackpot rollover

### Phase 6 - Charity and Donations
- [x] Build charity directory, search, filters, profiles
- [x] Add featured charity on homepage
- [x] Build charity selection flow in onboarding/profile
- [x] Build independent donation storage flow

### Phase 7 - User Dashboard
- [x] Subscription status card
- [x] Score management module
- [x] Charity and contribution module
- [x] Participation summary module
- [x] Winnings and proof-upload module

### Phase 8 - Admin Dashboard
- [x] User and subscription management
- [x] Draw simulation and publishing controls
- [x] Charity CRUD and media support
- [x] Winner verification and payout state transitions
- [x] Reports and analytics panels

### Phase 9 - Email Notifications
- [x] Signup confirmation email
- [x] Subscription confirmation email
- [x] Draw results email
- [x] Winner notification email

### Phase 10 - QA, Hardening, and Deployment
- [ ] Unit and integration tests for financial/draw logic
- [ ] E2E checks for auth, subscription, score, draw, winner flows
- [x] Dependency audit and security checks
- [ ] Deploy to new Supabase + new Vercel
- [ ] Verify environment and webhook setup

## Endpoint Validation Matrix (to execute while implementing)

### Public
- [x] GET /api/public/home
- [x] GET /api/charities
- [x] GET /api/charities/:slug

### Auth
- [x] POST /api/auth/signup
- [x] POST /api/auth/login
- [x] POST /api/auth/logout
- [x] GET /api/auth/me

### Subscription
- [x] POST /api/subscriptions/create-checkout-session
- [x] POST /api/subscriptions/create-portal-session
- [x] GET /api/subscriptions/status
- [x] POST /api/webhooks/razorpay

### Scores
- [x] GET /api/scores
- [x] POST /api/scores
- [x] PATCH /api/scores/:id

### Draws
- [x] GET /api/draws
- [x] GET /api/draws/:id
- [x] POST /api/admin/draw/simulate
- [x] POST /api/admin/draw/publish

### Winnings
- [x] GET /api/winnings/me
- [x] POST /api/winnings/:id/proof/upload-url
- [x] POST /api/winnings/:id/proof/submit

### Additional API
- [x] GET /health
- [x] POST /api/subscriptions/cancel
- [x] POST /api/donations
- [x] GET /api/donations
- [x] GET /api/donations/me
- [x] GET /api/user/charity
- [x] PATCH /api/user/charity

### Admin
- [x] GET /api/admin/users
- [x] PATCH /api/admin/users/:id
- [x] PATCH /api/admin/users/:id/subscription
- [x] GET /api/admin/charities
- [x] POST /api/admin/charities
- [x] PATCH /api/admin/charities/:id
- [x] DELETE /api/admin/charities/:id
- [x] GET /api/admin/winnings
- [x] PATCH /api/admin/winnings/:id/verification
- [x] PATCH /api/admin/winnings/:id/payment
- [x] GET /api/admin/reports/overview

## Progress Log
- 2026-04-03 21:25:16 +05:30: Phase 1-3 and major parts of Phases 4-9 implemented with successful lint and production build.
- 2026-04-03 21:25:16 +05:30: Added score edit API/UI and winnings proof upload module.
- 2026-04-03 22:01:02 +05:30: Migrated implementation foundation to separate `frontend/` (Vite plain React) and `backend/` (Express) folders with core API routes and auth wiring.
- 2026-04-03 22:01:02 +05:30: Completed React Router page migration for public, subscriber dashboard, and admin views; frontend production build passes.
- 2026-04-03 22:12:05 +05:30: Completed admin user management UI with editable full profile fields, charity preference controls, and integrated manual subscription override form.
- 2026-04-03 22:12:05 +05:30: Extended admin users API list response to include each user's latest subscription for in-place admin editing.
- 2026-04-03 23:15:20 +05:30: Fixed architecture boundary issue by renaming backend Supabase env ownership to `SUPABASE_URL` and `SUPABASE_ANON_KEY` with backward-compatible fallback from legacy `NEXT_PUBLIC_*` names.
- 2026-04-03 23:15:20 +05:30: Hardened workspace hygiene by improving multi-folder `.gitignore` rules and removing stale frontend scaffold documentation.
- 2026-04-03 23:19:00 +05:30: Enforced strict backend env ownership by removing legacy `NEXT_PUBLIC_*` Supabase fallback references from backend runtime config and seed script.
- 2026-04-03 23:19:00 +05:30: Verified strict-mode hardening with backend syntax checks, frontend lint, and live backend health endpoint response.
- 2026-04-03 23:44:55 +05:30: Moved Supabase project assets from workspace root to `backend/supabase` and updated setup documentation paths accordingly.
- 2026-04-04 00:49:23 +05:30: Completed endpoint sweep for all mounted routes and confirmed route registration health (41 checked, 0 returned 404, 0 transport failures). See `docs/ENDPOINT_AUDIT.md`.
- 2026-04-04 13:45:31 +05:30: Updated backend email configuration for single-sender Resend onboarding (`EMAIL_FROM` set to verified personal sender for testing) and documented no-domain sender setup guidance.
- 2026-04-04 13:45:31 +05:30: Hardened email delivery path by making transactional send failures non-blocking, allowing core auth/admin flows to continue while sender verification is pending.
- 2026-04-04 14:03:35 +05:30: Fixed no-Stripe startup regression by replacing coercive boolean parsing with explicit env-flag parsing, so `STRIPE_ENABLED=false` does not require Stripe keys.
- 2026-04-04 14:03:35 +05:30: Added setup-aware API error normalization (`SETUP_REQUIRED`, 503) for missing Supabase schema tables and hardened signup flow to avoid orphan auth users when profile persistence fails.
- 2026-04-04 14:03:35 +05:30: Re-ran endpoint sweeps in no-Stripe mode (public, auth, protected, webhook) and confirmed stable runtime behavior with expected 400/401/403/503 responses and no backend crashes.
- 2026-04-04 14:35:48 +05:30: Added `backend/scripts/apply-schema-remote.mjs` and npm script `db:apply:remote` to automate remote Supabase schema + seed application via Management API.
- 2026-04-04 14:35:48 +05:30: Confirmed Supabase Management SQL endpoints reject service-role JWT keys; documented and enforced PAT-based `SUPABASE_MANAGEMENT_TOKEN` requirement for automated remote schema setup.
- 2026-04-04 14:48:47 +05:30: Updated `backend/.env.example` with explicit PAT-only guidance for `SUPABASE_MANAGEMENT_TOKEN`, including account token URL and a warning against using anon/service-role JWT keys.
- 2026-04-04 14:48:47 +05:30: Attempted remote schema apply and live endpoint verification; blocked because `SUPABASE_MANAGEMENT_TOKEN` is still empty at runtime, and `/api/charities` continues returning `SETUP_REQUIRED` (503).
- 2026-04-04 14:57:48 +05:30: Successfully applied remote Supabase `schema.sql` and `seed.sql` using `npm run db:apply:remote`; table-cache setup blocker is resolved.
- 2026-04-04 14:57:48 +05:30: Executed authenticated and unauthenticated endpoint sweeps after schema setup; public/auth/user/admin flows now return expected statuses with no 500 responses observed.
- 2026-04-04 14:57:48 +05:30: Validated operational lifecycle for seeded subscriber/admin: score create/list/update, donation create/list, admin charity CRUD, draw simulate/publish, and report endpoints.
- 2026-04-04 15:06:46 +05:30: Completed frontend runtime smoke pass on live dev servers: public charities, user dashboard modules (scores/donations/subscription), and admin pages (dashboard/users) all rendered and executed expected operations.
- 2026-04-04 15:06:46 +05:30: Hardened charity image rendering in frontend list/detail pages by hiding failed external images (prevents broken-image UI artifacts when third-party image hosts are blocked).
- 2026-04-04 15:14:04 +05:30: Completed focused admin UI-only action pass: ran draw simulation and draw publish using admin page buttons for month `2026-07`; simulation showed 1 participant and zero predicted winners.
- 2026-04-04 15:14:04 +05:30: Verified admin winnings UI state from buttons-only workflow; page currently shows "No winnings found", so verification/payout button actions are blocked until a draw produces at least one winning record.
- 2026-04-04 15:43:41 +05:30: Fixed winnings proof upload URL reliability by auto-initializing the `winner-proofs` storage bucket before signed upload URL generation.
- 2026-04-04 15:43:41 +05:30: Added deployment hardening for Vercel + Render: backend multi-origin CORS support (`FRONTEND_URL` + `FRONTEND_URLS`), frontend SPA rewrite config (`frontend/vercel.json`), and backend blueprint (`render.yaml`).
- 2026-04-04 15:43:41 +05:30: Executed full non-Stripe endpoint regression (`48` checks, `0` failures), including forced winning lifecycle and admin verification/payout flow; documented in `docs/ENDPOINT_AUDIT.md`.
- 2026-04-04 15:50:15 +05:30: Re-ran full non-Stripe regression after deployment configuration and documentation updates; all `48` endpoint checks passed again with `0` failures.
- 2026-04-04 16:01:06 +05:30: Validated the new backend npm command `npm run test:nonstripe`; regression suite again completed with `48` passing checks and `0` failures.
- 2026-04-04 16:34:13 +05:30: Migrated billing provider implementation from Stripe to Razorpay in backend env validation, subscription routes, webhook verification/processing, and billing service clients while retaining compatibility for existing stored subscription columns.
- 2026-04-04 16:34:13 +05:30: Updated `backend/.env` and `backend/.env.example` to Razorpay-only billing keys (`RAZORPAY_*`) and added Razorpay deployment/readme references.
- 2026-04-04 16:34:13 +05:30: Revalidated application health after migration: backend `npm run test:nonbilling` passed `48/48`, frontend lint passed, and frontend production build passed.
- 2026-04-04 16:36:21 +05:30: Final post-cleanup non-billing endpoint regression rerun completed with `48/48` passing checks and no transport/runtime failures.
- 2026-04-04 16:40:55 +05:30: Completed logical webhook-readiness audit and fixed two risks: removed immediate-cancel fallback (now explicit cycle-end cancel only) and strengthened Razorpay webhook idempotency/signature handling using `x-razorpay-event-id` preference and hex-safe signature comparison.
- 2026-04-04 16:42:41 +05:30: Added `payment.failed` webhook sync to fetch and upsert linked Razorpay subscription status; reran full non-billing regression with `48/48` passing checks.
- 2026-04-04 16:46:41 +05:30: Expanded endpoint regression coverage to include every mounted backend endpoint (including `POST /api/auth/signup` and deprecated `POST /api/webhooks/stripe`) and completed full pass with `50/50` successful checks.

## Notes
- Money values stored in paise (integers) only
- Draw numbers must be unique integers in range 1-45
- No insecure or deprecated packages
- RLS must be enabled before any production data access
