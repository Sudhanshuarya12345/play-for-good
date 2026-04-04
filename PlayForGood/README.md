# PlayForGood - Golf Charity Subscription Platform

PlayForGood is a subscription-driven platform that combines golf score tracking, charity impact, and monthly draw rewards.

## Tech Stack
- Frontend: React + Vite + JavaScript + Tailwind CSS
- Backend: Node.js + Express + JavaScript
- Database/Auth/Storage: Supabase
- Billing: Razorpay (Test Mode)
- Transactional Email: Resend

## Project Structure
- frontend/: React app (UI, routing, dashboard pages)
- frontend/vercel.json: SPA rewrite rules for Vercel deployment
- backend/: Express API (auth, subscriptions, draws, winnings, admin)
- backend/supabase/schema.sql: database schema + RLS + triggers
- backend/supabase/seed.sql: sample charities/events data
- render.yaml: Render Blueprint for backend service provisioning
- docs/: project documentation and progress records
- docs/IMPLEMENTATION_TRACKER.md: timestamped implementation progress
- docs/ENDPOINT_AUDIT.md: endpoint availability and status audit report

## Environment Setup
1. Configure frontend env using frontend/.env.example.
2. Configure backend env using backend/.env.example.
3. Ensure backend has valid Supabase and Resend keys before running protected flows.
4. Keep `RAZORPAY_ENABLED=false` if Razorpay keys are not configured yet.

Backend required keys:
- FRONTEND_URL
- APP_URL
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- EMAIL_FROM

Optional backend keys:
- FRONTEND_URLS (comma-separated extra origins; wildcard supported, example `https://*.vercel.app`)
- SUPABASE_MANAGEMENT_TOKEN (only for `npm run db:apply:remote`)
- RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RAZORPAY_MONTHLY_PLAN_ID, RAZORPAY_YEARLY_PLAN_ID (required only when `RAZORPAY_ENABLED=true`)

## Supabase Setup
1. Create a new Supabase project.
2. Run SQL from backend/supabase/schema.sql.
3. Run SQL from backend/supabase/seed.sql.
4. Create storage bucket winner-proofs.

Optional automation (requires Supabase personal access token):
1. Set SUPABASE_MANAGEMENT_TOKEN in backend/.env (Dashboard -> Account -> Access Tokens).
2. Run from backend folder:
   - npm run db:apply:remote

Note: Service-role and anon keys cannot execute Management API SQL queries.

## Resend Setup
1. Create a Resend API key and set RESEND_API_KEY.
2. Set EMAIL_FROM to a verified sender in Resend.
3. If you do not own a domain yet, verify a single sender email first (for example a personal Gmail address).

## Razorpay Setup (Test Mode)
0. Set RAZORPAY_ENABLED=true in backend env.
1. Create two recurring INR plans:
   - Monthly: 499
   - Yearly: 4999
2. Set plan IDs in backend env.
3. Configure webhook to backend endpoint /api/webhooks/razorpay.

When RAZORPAY_ENABLED=false, billing endpoints stay available but return controlled "disabled" responses so non-billing features can still be tested.

## Deployment (Vercel + Render)
1. Deploy backend to Render:
   - Use `render.yaml` Blueprint, or configure manually with:
     - Root directory: `backend`
     - Build command: `npm install`
     - Start command: `npm run start`
     - Health check path: `/health`
   - Set required env vars from `backend/.env.example`.
   - Set `FRONTEND_URL` to your production Vercel URL.
   - Set `FRONTEND_URLS` for extra origins such as Vercel preview domains (example: `https://*.vercel.app`).
2. Deploy frontend to Vercel:
   - Project root: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Set `VITE_API_URL` to your Render API URL with `/api` suffix (example: `https://playforgood-backend.onrender.com/api`).
   - `frontend/vercel.json` already includes SPA rewrites for direct-route refresh support.
3. Smoke checks after deploy:
   - `GET https://<render-host>/health` returns `200`.
   - Frontend login works against deployed API.
   - Non-billing routes continue to work with `RAZORPAY_ENABLED=false`.

## Install and Run
1. Frontend:
   - cd frontend
   - npm install
   - npm run dev
2. Backend:
   - cd backend
   - npm install
   - npm run dev

## Seed Demo Users
Run from backend after env is configured:
- npm run seed:demo

Seeded accounts:
- Admin: admin@golfplatform.com / Admin@123
- User: user@test.com / User@123

## Validation
- Frontend lint/build: run inside frontend folder.
- Backend syntax check: run inside backend folder.
- Full non-billing API regression: run `npm run test:nonbilling` inside backend folder.

## Known Remaining Work
- Add automated unit/integration/E2E tests.
- Perform full production deployment verification.
