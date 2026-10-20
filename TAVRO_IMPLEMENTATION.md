# Tavro implementation and architecture audit

## Existing architecture audit

- **Frontend:** React 19, Vite 6, Tailwind CSS 4, and `lucide-react`, in a separately deployable dashboard.
- **Backend:** Node.js with Express 5. The API is server-side in `server.js` and `aiDashboardServer.js`.
- **Authentication:** The dashboard issues signed 12-hour sessions after checking active store accounts. Existing role checks distinguish administrators from sellers. Tavro adds its own active-administrator check on every route.
- **Database:** Supabase/PostgreSQL. Store records are in the existing `public.users`, `public.orders`, and `public.support_tickets` tables. Tavro does not create a parallel customer or order store. The service-role client remains server-only; Tavro tables have RLS enabled.
- **Existing AI:** The official `@google/genai` SDK is already installed and used server-side. `ai_dashboard_settings` provides a global pause and atomic daily/monthly request budgets. Existing AI reporting avoids sending customer PII.
- **Email:** Resend is already used by the dashboard for sending and templates. No Gmail/Microsoft OAuth mailbox integration was found; Resend sending does not provide an inbox. Tavro therefore implements sending only and does not claim inbox access.
- **Deployment:** The existing README describes one same-origin Render service that builds the Vite frontend and runs the Express API. Existing server configuration and environment-variable names were inspected without reading or printing secret values.
- **Configuration names present:** `GEMINI_API_KEY`, `GEMINI_MODEL`, `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and dashboard/session settings are already part of this project. Do not place secrets in `VITE_*` variables.

## Harvey repository assessment

The readable repository at `C:\Windows\System32\harvey` is a Python 3.11+ FastAPI/SQLite project under the MIT license. Its dependencies and autonomous prospecting/outreach runtime are not a fit for this React/Express/Supabase dashboard. No Harvey source was copied or executed. The adapted ideas are scoped skill definitions, truthful evidence-based writing, opt-out awareness, rate limits, and human review before sending. Cold-prospect scraping, autonomous outreach loops, shell access, and unrestricted tools were deliberately not imported.

## Implemented Tavro scope

- Admin-only workspace navigation and server authorization.
- Persistent, owner-scoped conversations and bounded context for Gemini; responses render as text, not injected HTML.
- Structured customer search against existing user records, with a bounded profile containing recent order products/status and support-ticket summaries.
- Gemini Google Search-grounded research, source URLs, publisher, retrieval time, and available supporting excerpts. Reports explicitly mark when source URLs were not returned.
- Individual Resend email drafting using minimized customer context (name and bounded order/support summaries; not customer email, addresses, payment data, or order IDs in the model prompt).
- Editable drafts with versioned exact-content approval snapshots, content-hash validation, explicit send confirmation, one-at-a-time state claiming, a per-minute send limit, provider message IDs, and no automatic retries.
- Marketing sends are blocked unless explicit consent is recorded and the address is not suppressed. The administrator can record consent evidence or add an address to the suppression list.
- Tavro usage view reuses the existing global AI budget and dashboard audit records. A registry describes available skills and backend tools; the model does not execute arbitrary tool calls.

## Files changed

- `server.js` registers the Tavro API.
- `tavroServer.js` contains authorization, bounded customer access, Gemini orchestration/research, conversation persistence, and email draft/approval/send APIs.
- `tavroService.js` contains input validation, approval hashing, source URL validation, and the explicit skill/tool registry.
- `pages/TavroPage.jsx`, `DashboardApp.jsx`, and `aiDashboardService.js` add the dashboard workspace and API client.
- `schema.sql` adds Tavro conversation, message, email draft/activity, marketing-permission, and suppression tables with constraints, indexes, and RLS.
- `tavroService.test.js` and the `test` package script cover core validation and approval invariants.
- `README.md` links to this document and documents the schema requirement.

## Apply schema and run locally

1. Back up the Supabase database and apply the complete, idempotent `schema.sql` in the Supabase SQL editor. It includes the existing dashboard schema and the additive Tavro tables. The API fails with a setup message if required tables are absent.
2. Configure the existing server-side `GEMINI_API_KEY`, `GEMINI_MODEL`, `RESEND_API_KEY`, Supabase credentials, and admin session secret in the dashboard service environment. Do not add real credentials to source files or frontend build variables. `AI_MAX_OUTPUT_TOKENS` is optional and is clamped by the server.
3. Run `npm install` only if the existing dependency install is missing, then `npm run dev` for local development. Existing scripts run the Express API on port 4173 and Vite on port 3000.
4. Run `npm test` for the isolated Tavro validation tests and `npm run build` for the production frontend build.

## Customer search and email workflow

1. Sign in as an active administrator and open **Tavro → Customers**.
2. Search by name, email, username, or exact customer ID; select a result to load bounded order and support history.
3. In **Email Studio**, select a support, order-update, or marketing purpose and tone, then generate a draft. Gemini receives a minimized context, and the generated draft is never sent automatically.
4. Review the full recipient, subject, and message. Save edits before approval. Any saved edit invalidates the prior approval.
5. Marketing requires a documented explicit opt-in date/evidence and has a suppression check. A support/order message does not become a marketing message merely because the text is promotional; choose the truthful purpose.
6. Approve the saved exact content, then separately choose **Send approved email** and confirm the full message. Check Resend activity if delivery is uncertain. A draft whose provider outcome is uncertain remains locked to prevent a duplicate send.

## Research, skills, security, and deployment

- Use **Marketing Research** for public-source research. Open and verify cited sources, especially current prices, competitor claims, and market statistics. No source URL means the returned advice must be treated as an unverified hypothesis.
- Skill definitions and tool availability are in `tavroService.js`. New capabilities must have narrow input/output contracts, active-admin permission checks, bounded execution, and backend validation. Customer/email content is untrusted context, never an instruction source.
- The default dashboard deployment procedure, build/start commands, and Render guidance remain in `README.md`. Apply the same schema and set the same server-only environment variables on the deployment service; HTTPS, Supabase Auth redirect URLs, CORS origins, backups, and provider account limits remain operator responsibilities.
- RLS is enabled on Tavro tables; API routes use the existing server-only service client and enforce administrator session ownership before reads/writes. Generated content and chat history are rendered as escaped React text. Resend deliveries are individual messages, never a bulk campaign.

## Limitations and follow-up work

- Inbox listing, thread context, replies, Gmail/Microsoft OAuth, provider delivery webhooks, unsubscribe pages, and delivery-event synchronization are not implemented because no authorized mailbox integration is configured.
- Marketing consent is an operator-entered evidence record, not an automatic integration with a storefront consent capture mechanism. Verify applicable privacy and marketing laws and Gemini data-use/retention terms before using real customer context.
- Existing dashboard email functionality remains available and is unchanged; it is separate from Tavro's persistent approval workflow. Consider migrating that legacy send screen to this queue in a separately reviewed change.
- This implementation does not add campaign sending, bulk email, CRM communication history import, automated conversion metrics, document uploads, or retrieval-augmented internal knowledge.
- Tests added here exercise pure validation and approval-hash behavior. No live Gemini, Supabase, Resend, deployment, mailbox, delivery-webhook, consent-capture, or end-to-end authenticated browser test was run.
- Prioritize integration tests with mocked Supabase/Gemini/Resend, verified storefront consent capture, provider idempotency/webhooks, inbox OAuth if required, and an explicit migration/deployment rollback procedure.
