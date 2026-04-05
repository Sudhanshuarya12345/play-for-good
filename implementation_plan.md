# Goal Description

The task requires executing a comprehensive 8-phase audit and fix of the "Play For Good" platform. This is a fully built production-grade application (Node.js, Express, React, Vite, Supabase Postgres, Razorpay, Resend). The objective is to identify any bugs, gaps from the PRD, missing webhook implementations, incorrect plan ID references, and out-of-sync subscriptions, and deploy fixes end-to-end to ensure the system is production-complete.

## User Review Required

> [!WARNING]
> Please review this implementation plan carefully. Is there any specific Razorpay configuration or test environment URL that I need as part of `.env`? Currently `RAZORPAY_ENABLED` is `false` and there are missing webhook secrets in the existing generic `.env`.

> [!IMPORTANT]
> The PRD specifies that I must check the application end-to-end and leave no "pseudo-code". I will systematically edit and build the React frontend and modify backend Express endpoints.

## Proposed Changes

### Configuration Setup & Environment

- Update the `.env` schema and provide default or mock Razorpay and Webhook test limits to facilitate the test scenarios. Set `RAZORPAY_ENABLED=true` locally so testing logic proceeds natively.

---

### Phase 2: Webhooks & Subscriptions (Razorpay)

#### [MODIFY] [webhooks.js](file:///d:/Intern%20Assignment/Digital%20Heros/PlayForGood/backend/src/routes/webhooks.js)
- **Fix "Subscription status not synced":** The current webhook only handles `subscription.activated`, `payment.captured`, and `payment.failed`. It explicitly misses updates like `subscription.cancelled`, `subscription.updated`, and `subscription.halted`. I will expand the webhook to intercept any `subscription.*` event and upsert the subscription to guarantee backend synchronization with Razorpay.
- **Fix "Webhook secret verification missing":** Ensure `express.raw` preserves the buffer correctly and standardise handling if signature validation fails or is absent.
- **Fix "Using plan name instead of plan_id":** Wait, the codebase currently resolves `env.RAZORPAY_MONTHLY_PLAN_ID`, but Razorpay test mode might require these explicitly populated in the backend instance. I will verify it is passed correctly.

#### [MODIFY] [subscription-sync.js](file:///d:/Intern%20Assignment/Digital%20Heros/PlayForGood/backend/src/services/subscription-sync.js)
- Confirm mapped statuses accurately translate Razorpay `halted`/`authenticated` correctly into the PostgreSQL ENUM `subscription_status`.

---

### Phase 3 & 4: API Validation, Security and Zod Refactoring

#### [MODIFY] [Various Backend Services]
- Expand `zod` schemas for any loose controllers (e.g., charity listings, donations, user profile updates) that currently have lax schema validations.
- Validate `Helmet` and `CORS` properties strictly in `server.js` ensuring no wildcards `*` bypass allowed domains.

---

### Phase 6 & 7: QA & Testing Automation

#### [ADD / RUN SCRIPT] Manual Execution Steps
- Start frontend and backend development servers.
- Use explicit test card details (provided) to mimic:
  - Subscription creation
  - Payment captured
- Run the draw script via Admin routes or script to ensure algorithm selects 5 scores based on frequency correctly.
- Verify Prize distribution (40% for tier 5, 35% tier 4, 25% tier 3) matching the actual logic.
- Process independent donations and check relations.

## Phase 7: Final QA
- `npm run build` locally
- `npm run test:nonbilling`

## Phase 8: Output
- Provide final audit report
- Provide sql migrations (if any run)
- Detail all added endpoints/fixes

## 🚀 Phase 9: Real-time UI Audit via Browser Subagent
- Use `browser_subagent` to autonomously navigate `http://localhost:5173`.
- Authenticate using demo credentials (`user@test.com` & Admin).
- Methodically traverse the Dashboard, Subscriptions, Draw History, and Score submissions.
- Log console errors, rendering issues, and API mismatches directly via screenshot artifacts.

## 🎨 Phase 10: UI Improvement via Stitch MCP & Tailwind
- Apply requested UI enhancements, leveraging Stitch MCP token extraction and manually tweaking `index.css` and frontend components to inject high-fidelity glassmorphism, dynamic Framer Motion animations, and responsive redesigns as appropriate.
- Assure standard colors are replaced with curated tailored tokens, implementing hover micro-interactions to deliver the WOW factor.

## 🔒 Phase 11: Invalid Email Registration Prevention
- **Issue**: Direct admin-client creation bypasses standard email verification (currently hardcoding `email_confirm: true` due to Resend acting as an external standalone API).
- **Technical Approach**: Implement an active SMTP/DNS Domain Validation layer within `backend/src/routes/auth.js`.
- By querying `dns.resolveMx(domain)`, the API will actively reject throwaway/fake domains at the signup controller, significantly preventing invalid emails without restructuring the entire auth lifecycle.

---

> [!IMPORTANT]
> User Feedback Required:
> - Do you want the Stitch MCP design system applied broadly (overriding color tokens), or target specifically just the auth/dashboard layouts?
> - For the invalid email block, we will implement an MX records lookup algorithm at the API level (preventing random domains like `@test12345.com`). Does this approach sound acceptable?

## Open Questions

> [!IMPORTANT]
> I notice the `PlayForGood` database uses Supabase. Will the local connection string (`SUPABASE_URL` and keys) in my environment successfully authenticate and reach your actual DB where I can verify foreign keys and schema directly, or should I be validating via an emulator/mock environment? 

## Verification Plan

### Automated Tests
- Run `npm run test:nonbilling` mapping through unit/behavior tests.

### Manual Verification
- Start Node API using `npm run dev`.
- Initiate a test Razorpay subscription using one of the test cards (e.g. `4718 6091 0820 4366`) and inspect logs explicitly tracking the db mapping to `active`.
- Terminate via webhook dispatch testing `subscription.cancelled`.
- Perform a weighted algorithm draw execution endpoint.
