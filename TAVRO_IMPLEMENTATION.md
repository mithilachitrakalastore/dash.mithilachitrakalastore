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
2. Browse signed-up customer accounts or search by name, email, username, or exact customer ID. Each record shows email verification, marketing consent, suppression, and eligibility status.
3. In **Email Studio**, select a support, order-update, or marketing purpose and tone, then generate a draft. Gemini receives a minimized context, and the generated draft is never sent automatically.
4. Review the full recipient, subject, and message. Save edits before approval. Any saved edit invalidates the prior approval.
5. Marketing drafts and sends require an active account, verified email, documented explicit opt-in for the current address, and no suppression. A support/order message does not become a marketing message merely because the text is promotional; choose the truthful purpose.
6. Approve the saved exact content, then separately choose **Send approved email** and confirm the full message. Check Resend activity if delivery is uncertain. A draft whose provider outcome is uncertain remains locked to prevent a duplicate send.

## Daily opted-in prospect workflow

- **Scope:** Tavro considers only existing, active, email-verified customer accounts with a recorded `granted` marketing permission for that exact customer ID and current email address. It excludes staff, anyone with an order, suppressed addresses, and customers with any marketing draft in the prior 30 days. It does not scrape public websites or discover people who are not already in the store account database.
- **Daily target:** The workflow selects up to 10 eligible accounts per Nepal-local calendar day. This is a prospect/draft target, not a guarantee of 10 eligible contacts, new customers, purchases, or conversions.
- **Schedule and enablement:** The workflow is disabled by default. An active administrator must enable it in **Tavro → Daily Prospects**. While the persistent Express dashboard server is running, it checks every minute and starts the day's run at or after 08:00 `Asia/Kathmandu`. The database's unique run date prevents duplicate runs across server instances. A hard process termination can leave that day's run in `running`; inspect the run record before attempting manual database recovery.
- **Drafts, never autonomous sends:** Tavro generates an individual `draft` for each eligible account using Gemini and the public catalog. Every draft requires the administrator to review, approve, and separately confirm sending. Resend is not required to generate drafts, but must be configured for sending. Disabling the workflow pauses future scheduled/manual runs; it does not delete drafts already created.
- **Prerequisites:** Back up and apply the updated `schema.sql`; record genuine opt-in evidence through Tavro; configure the server-side Gemini key/model; and enable the feature from the admin UI. Runs consume the existing shared dashboard AI budget and may stop when that budget is exhausted. No email is sent if consent is missing, revoked, stale for a different address, future-dated, or suppressed.
- **Opt-out handling:** The generated draft provides the store's unsubscribe contact address, but inbound unsubscribe replies are not automatically processed because Tavro has no inbox integration. An administrator must record a revocation or suppression before any later send. Do not enable marketing without an operational process for handling opt-outs and applicable privacy/marketing-law review.

## Social performance and AI post drafts

- **Insights:** **Marketing & SEO** requests 30-day reach and engagement metrics for connected Facebook Pages and Instagram professional accounts when the connected token has the required platform scopes. Facebook uses the current `page_total_media_view_unique` and `page_post_engagements` metrics; Instagram uses `reach`, `accounts_engaged`, and `profile_views`. Facebook/Instagram permissions and metrics vary by account type, app review, and API version; unsupported accounts show an explicit reason. TikTok insights are not currently available through this integration. Daily reach values are summed per day and are not a unique-person count across the whole 30-day period.
- **Reconnect for insights:** Existing connections may lack the newly requested `read_insights`, `instagram_manage_insights`, or `instagram_business_manage_insights` scopes. Reconnect the account and complete any required Meta app review/permission approval before expecting analytics. OAuth scopes must be granted by the social account owner.
- **Background draft cadence:** The social AI draft workflow is disabled by default and must be enabled by an administrator in **Marketing & SEO**. While the Express dashboard server is running, it checks every minute and, every two days after 10:00 `Asia/Kathmandu`, attempts one draft only when no tracked AI generation job is active, the shared dashboard AI feature/budget is available, a supported connected account returns insight data, and a public in-stock catalog product is available. The workflow uses the last 30 days of measured metrics as context and does not invent performance results.
- **Review required:** Generated social copy is stored as an unpublished `draft` with a suggested next 10:00 Nepal-time slot. A suggestion is not a schedule. Review the product claims, image, caption, account, and proposed date/time, then explicitly choose publish or confirm a schedule. No post is automatically scheduled or published by this generator. Existing explicit scheduling continues to publish at the confirmed time while the server is running.
- **AI idle tracking:** The server tracks dashboard reports, social generation, and Tavro Gemini requests. If one is active at the draft check, the worker waits for a later check. The scheduled feature uses the shared AI budget and may not generate if the server is offline, the feature is paused, permission/data is unavailable, or the AI budget is exhausted.

## Research, skills, security, and deployment

- Use **Marketing Research** for public-source research. Open and verify cited sources, especially current prices, competitor claims, and market statistics. No source URL means the returned advice must be treated as an unverified hypothesis.
- Skill definitions and tool availability are in `tavroService.js`. New capabilities must have narrow input/output contracts, active-admin permission checks, bounded execution, and backend validation. Customer/email content is untrusted context, never an instruction source.
- The default dashboard deployment procedure, build/start commands, and Render guidance remain in `README.md`. Apply the same schema and set the same server-only environment variables on the deployment service; HTTPS, Supabase Auth redirect URLs, CORS origins, backups, and provider account limits remain operator responsibilities.
- RLS is enabled on Tavro tables; API routes use the existing server-only service client and enforce administrator session ownership before reads/writes. Generated content and chat history are rendered as escaped React text. Resend deliveries are individual messages, never a bulk campaign.
- The API uses one server-configured Gemini model (`GEMINI_MODEL`), with a 30-second request timeout, one provider attempt, and bounded output tokens; model selection is not exposed in the UI.

## Limitations and follow-up work

- Inbox listing, thread context, replies, Gmail/Microsoft OAuth, provider delivery webhooks, unsubscribe pages, and delivery-event synchronization are not implemented because no authorized mailbox integration is configured.
- Marketing consent is an operator-entered evidence record, not an automatic integration with a storefront consent capture mechanism. Verify applicable privacy and marketing laws and Gemini data-use/retention terms before using real customer context.
- Daily prospecting is also limited to existing opted-in store accounts; it is not public lead generation and cannot promise customers or conversions. A persistent server process and enabled setting are required for the 08:00 Nepal-time scheduler.
- Social insights are provider/API-dependent and require renewed OAuth scopes where existing connections did not grant them. Insights are not available for TikTok in the current integration. Scheduled AI social content creates review drafts only and does not guarantee reach, engagement, or sales.
- Existing dashboard email functionality remains available and is unchanged; it is separate from Tavro's persistent approval workflow. Consider migrating that legacy send screen to this queue in a separately reviewed change.
- Customer browsing/search supports signed-up records and consent-status visibility. Order and support history is displayed in the profile, but category-based segmentation and communication-history import are not implemented.
- This implementation does not add campaign sending, bulk email, structured/persisted campaign briefs, automated conversion metrics, document uploads, or retrieval-augmented internal knowledge.
- The repository has a consolidated `schema.sql`, not a versioned migration runner. Tavro's SQL additions are idempotent, but no automated down-migration was added; take a database backup before applying them.
- Tests added here exercise pure validation and approval-hash behavior. No live Gemini, Supabase, Resend, deployment, mailbox, delivery-webhook, consent-capture, or end-to-end authenticated browser test was run.

## Prioritized future improvements

1. Add mocked API integration tests for authentication, cross-customer access, quota failures, suppression, approval invalidation, and duplicate sends; document a tested rollback procedure.
2. Integrate a verified storefront marketing-consent capture/unsubscribe flow and provider delivery webhooks before broad marketing use.
3. Add Gmail or Microsoft OAuth only if mailbox access is required, with least-privilege scopes, encrypted token storage, and revocation.
4. Add structured customer segmentation, persistent campaign briefs, and attributable campaign metrics.
5. Migrate the existing direct-send Email page to the same persistent approval queue after a separately reviewed compatibility change.
