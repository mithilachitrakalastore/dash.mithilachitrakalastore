# AI Dashbord

This folder is a separately deployable full-stack application. Its React client talks only to the AI dashboard's authenticated HTTP API. Its separate `server.js` hosts that API and accesses Supabase/Gemini server-side; the store frontend and store `server.js` are not merged with it.

## Deploy the standalone dashboard and API

1. Review and run `schema.sql` in the Supabase SQL editor. It adds a nullable Google Auth user ID to `public.users` with a unique index (without modifying existing users), adds per-product manual advance-payment settings to `public.products`, creates the dashboard settings/audit tables, support ticket/message tables, administrator-managed marketing campaign plans and automation definitions/run history, and adds an atomic daily/monthly request-budget reservation function.
2. Create a Node web service from the `AI_Dashbord` folder. Set the build command to `npm install && npm run build` and the start command to `npm start`. The service uses the host-provided `PORT`.
3. Set these server environment variables on that service: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `ADMIN_EMAIL_TOKEN_SECRET`, and, for product image uploads, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Set `AI_DASHBOARD_ORIGINS` only for cross-origin frontend hosting. The anon key is public, but the dashboard loads it from its API config endpoint rather than embedding it in the frontend build. Do not set secrets as `VITE_*` variables. Optional `EMAIL_HELLO`, `EMAIL_ORDERS`, `EMAIL_SUPPORT`, and `EMAIL_SECURITY` values override the corresponding verified sender addresses. Social publishing additionally needs the social-platform app credentials and token-encryption key described below.
4. For a single service serving both the app and API, leave `VITE_API_BASE_URL=/api`. If you host the frontend separately, set its build-time `VITE_API_BASE_URL` to the AI API service origin plus `/api`, and configure `AI_DASHBOARD_ORIGINS` on the API server to the exact frontend HTTPS origin.
5. Sign in with Google or an existing active, verified store seller or administrator username/email and password. Sellers have the same dashboard and settings permissions as administrators. Google must be enabled as an OAuth provider in the same Supabase project used by the storefront. Add the dashboard's deployed origin (for example `https://admin.example.com`) to Supabase Auth's allowed redirect URLs. For an account whose Google email does not match its store email, enter the existing account credentials and choose **Link Google to this store account**. The API verifies the password and issues a five-minute signed grant; after Google verifies the identity, the API links that Supabase Auth user ID to the existing store account. Google sign-in cannot create or promote accounts, or activate inactive/unverified sellers or administrators. The API validates the Supabase access token before issuing a 12-hour dashboard token. The signed dashboard session is stored in tab-scoped session storage, re-verified with the API after a page reload, and cleared when the tab closes or the user signs out.

The dashboard fails closed if the additive schema is missing, administrator verification fails, the feature is paused, the provider is unavailable, or the database request budget is exhausted.

### Local development

Run `npm install` and `npm run dev` from this folder. The API server loads `AI_Dashbord/.env` first and, only outside production, falls back to the repository root `.env` for the existing local Supabase/Gemini configuration. Put any AI-dashboard-specific overrides in `AI_Dashbord/.env`; do not commit either `.env` file. Vite runs at `http://127.0.0.1:3000` and proxies `/api` to the standalone API on port `4173`. If the API server was already running before adding an endpoint, stop and restart it so it registers the updated routes. Add `http://127.0.0.1:3000` to Supabase Auth's allowed redirect URLs for local Google sign-in.

### Render deployment values

For a single Render web service, set **Root Directory** to `AI_Dashbord`, **Build Command** to `npm install && npm run build`, **Start Command** to `npm start`, and **Health Check Path** to `/api/health`. Do not override `PORT`; Render supplies it.

Add these environment variables to the Render service:

| Key | Value |
| --- | --- |
| `SUPABASE_URL` | The existing Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | The existing service-role key (secret; server only) |
| `SUPABASE_ANON_KEY` | The project's public anon key, used to initialize Google OAuth |
| `GEMINI_API_KEY` | The existing Gemini API key (secret; server only) |
| `RESEND_API_KEY` | Resend API key for administrator email sending (secret; server only) |
| `ADMIN_EMAIL_TOKEN_SECRET` | A newly generated, private random signing secret |
| `GEMINI_MODEL` | `gemini-3.8-flash` (or another text-generation model enabled for your Gemini account) |
| `AI_DASHBOARD_ORIGINS` | Leave unset for the single-service same-origin setup; otherwise the exact dashboard site origin |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name used for signed product image uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key (used only to return short-lived signed upload parameters) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (server-side only; never expose as `VITE_*`) |
| `AI_DASHBOARD_PUBLIC_URL` | Dashboard origin used after OAuth, such as `https://dash.example.com` |
| `AI_DASHBOARD_API_PUBLIC_URL` | Optional API origin when the frontend and API use different hosts; otherwise same as dashboard |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | New random 32-byte key (64 hex characters or base64) for encrypting account tokens at rest |
| `META_APP_ID` | Meta app ID with Facebook Login and Instagram Graph API configured |
| `META_APP_SECRET` | Meta app secret (server-side only) |
| `META_GRAPH_API_VERSION` | Optional Graph API version; defaults to `v25.0` |
| `INSTA_APP_ID` | Instagram App ID from Instagram API with Instagram Login settings |
| `INSTA_APP_SECRET` | Instagram App Secret (server-side only) |
| `TIKTOK_CLIENT_KEY` | TikTok for Developers app client key with Login Kit and Content Posting API |
| `TIKTOK_CLIENT_SECRET` | TikTok app secret (server-side only) |

The frontend default `VITE_API_BASE_URL=/api` is correct when Render serves the dashboard frontend and its separate API server from the same service. Point `dash.mithilachitrakalastore.com.np` DNS to that dashboard service and configure the service's custom domain; the dashboard API then stays same-origin at `/api` and connects server-side to the same Supabase store data as the main website. If deploying the frontend separately, set `VITE_API_BASE_URL` to `https://<your-ai-api-service>.onrender.com/api` at build time and set `AI_DASHBOARD_ORIGINS` on the API service to the frontend's exact HTTPS origin. The storefront navigation links sellers and admins to `https://dash.mithilachitrakalastore.com.np`; DNS and hosting custom-domain setup must still be completed with the hosting provider.

## Included

- Authenticated, server-verified active-seller and active-admin endpoints.
- Authenticated management API for seller-owned products/orders and admin-managed global order fulfillment, billing/payment verification, seller payouts, artisan account status, and commission policy. Mutating requests verify the signed dashboard session and enforce role and seller ownership server-side.
- Product listings can define a fixed-amount or percentage advance payment. No payment gateway is used; administrators manually verify customer payments from Orders / Billing.
- The Wishlists page summarizes product saves and customer interest for the full store for administrators, or only products owned by the signed-in seller.
- Administrator-only Hero Slides and Cultural Journal pages create, edit, publish, and remove homepage slides and journal posts through role-checked management actions.
- The Billing & Print page renders a printable invoice for orders the signed-in seller/admin can access.
- The administrator-only Email page sends custom text/HTML emails or published Resend templates, with server-side recipient validation, sender/reply-to selection, automatic template variables, and the Resend API key kept off the client.
- Marketing & SEO is administrator-only. It audits catalog listing readiness from existing product fields, persists campaign plans, connects Meta accounts, and publishes explicitly confirmed posts. TikTok account connections are temporarily unavailable; accounts connected previously remain available. It does not claim live search rankings, website metadata publishing, paid ad delivery, or campaign attribution.
- Customer Support provides a paginated case inbox, status/priority triage, administrator assignment, seller-scoped access, private notes, and customer email replies through Resend. Staff can record requests received through existing channels; public customer intake and other channel integrations are not connected yet.
- Automations is administrator-only. Its first workflow emails a configured team address when a dashboard-managed product crosses from above a low-stock threshold to at or below it. Rules and bounded execution history are persisted separately; failed email attempts are visible in the run log.
- Approvals is administrator-only and is the single place to approve verified new seller accounts and review store-name changes. Decisions reuse the existing server-side account actions and revalidate the latest request before applying it; this first version does not create a second approval database or a generic arbitrary-action executor.
- Integrations is administrator-only and reports server-side readiness for Supabase, Gemini, Resend, and Cloudinary. The API performs a live Supabase check and reports environment configuration for external providers; it never sends secrets to the browser, and provider credentials remain managed by the deployment environment.
- Store overview cards for sales and orders today, registered customers, low inventory, a seven-day sales trend, recent orders, and top-selling items, sourced from existing Supabase records.
- Active sellers and administrators can use the same store-wide dashboard, including shared AI usage limits and pause controls.
- Sidebar navigation opens separate, refresh-safe dashboard pages for the dashboard, AI reports, product and inventory management, orders, billing/print, wishlists, email, homepage hero slides, the cultural journal, artisan access management, approvals, integrations, commission policy, marketing, automations, analytics, usage, audit logs, and settings. Search also covers products and recent orders.
- A separate seller/admin login API with bounded request size, IP-based sign-in throttling, and no database credentials in the client.
- CORS restriction for cross-origin frontend access when `AI_DASHBOARD_ORIGINS` is configured. Same-origin deployments do not need a CORS entry.
- Read-only summaries of today's orders, low-stock products, and missing product listing fields.
- No customer names, email addresses, addresses, or payment credentials are passed to the model.
- A server-side per-process rate limit and database-atomic daily/monthly provider-call budgets.
- A global AI pause control.
- Provider token counts and estimated costs only when an administrator configures model pricing.
- Privacy-minimized audit history with errors and result summaries.

Support cases are stored separately from their chronological messages. The authenticated support API lives under `/api/admin/ai/support/tickets`; it uses the dashboard session, returns bounded cursor-paginated inbox results, and enforces administrator-wide versus seller-assigned access on the server. Customer intake endpoints and channel adapters should be added behind the same ticket model rather than exposing the service-role key or database directly to the storefront.

## Marketing & SEO architecture

- **Growth workflow:** Use catalog completeness checks to prioritize product listing improvements, then organize campaign ideas, channels, goals, audiences, dates, and planned budgets. The readiness score is a transparent checklist metric; it is not a Google ranking or traffic metric.
- **Access boundary:** The navigation and page are restricted to administrators, and every campaign/social API request independently verifies the signed session, active account, and administrator role. Provider tokens are AES-256-GCM encrypted before database storage. Supabase service credentials and provider secrets remain server-side; RLS is enabled and the API is the only intended data access path.
- **Campaign API:** `GET /api/admin/ai/marketing/campaigns` lists up to 500 campaign plans. `POST` creates validated plans and `PATCH /:campaignId` edits them. Campaign plans are not provider ad campaigns and never spend money.
- **Social API:** `POST /api/admin/ai/marketing/social/connect/meta` begins Facebook Login OAuth and discovers Pages. `POST /api/admin/ai/marketing/social/connect/instagram` begins Instagram Login OAuth and connects a professional Instagram account directly, without requiring a Facebook Page. The composer lets Facebook publishers choose a link, photo, or text post; link posts attach a selected product URL through the Page Feed API to create a clickable link preview. Instagram post captions can include a product URL, but Instagram displays caption URLs as plain text. For the Instagram app's data-deletion callback, register `POST /api/admin/ai/marketing/social/data-deletion/instagram`; it validates Meta's signed request, removes the matching Instagram account and cascading post history, and returns a confirmation code with a status URL at `/api/admin/ai/marketing/social/data-deletion/status/:confirmationCode`. New TikTok connection requests return `410 Gone` while that feature is paused. `POST /api/admin/ai/marketing/social/posts` publishes after a separate confirmation in the UI; `GET` lists connected accounts and post history, and existing TikTok publish jobs can be checked for completion. Disconnecting revokes local access by deleting stored encrypted credentials while retaining post history.
- **Scheduled posts and AI content:** Apply the updated `schema.sql` to Supabase before scheduling; it adds schedule fields/statuses and the service-role-only atomic claim function. Confirming a schedule queues an automatic publish in `Asia/Kathmandu` time; the server checks every 30 seconds and publishes due posts, so the dashboard service must be running. Posts can be cancelled until the worker claims them, and schedules are limited to 90 days ahead. The AI composer uses the server-side Gemini integration and Google Search grounding for public trend context when available; captions and cited research sources are returned for review before publishing. It does not read account-level views, clicks, or engagement, and any trend-based idea is not a performance guarantee. Meta Insights permissions/review and an implementation of Insights data retrieval are required before offering account-specific performance analysis or best-time recommendations.
- **Provider setup:** Set `AI_DASHBOARD_PUBLIC_URL` to the deployed dashboard origin, `AI_DASHBOARD_API_PUBLIC_URL` to the public API origin only when frontend/API are hosted separately, and `SOCIAL_TOKEN_ENCRYPTION_KEY` to a newly generated 32-byte key (64 hex characters or base64). Add `META_APP_ID` and `META_APP_SECRET` for Facebook Login; register `/api/admin/ai/marketing/social/callback/meta` as an exact OAuth redirect URI and enable Facebook Login with `pages_show_list`, `pages_read_engagement`, and `pages_manage_posts`. Add `INSTA_APP_ID` and `INSTA_APP_SECRET` from the Instagram API with Instagram Login settings; register `/api/admin/ai/marketing/social/callback/instagram` in that product's OAuth redirect URI list and enable `instagram_business_basic` and `instagram_business_content_publish`. Complete the required Meta review/advanced access for production. TikTok connections are paused; keep `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` configured only if previously connected accounts need token refresh. Public HTTPS media URLs are required so providers can fetch media.
- **Paid advertising boundary:** This release does not create/activate paid ads. Ads use separate Marketing API products, permissions, advertiser accounts, billing currencies, targeting rules, and spend controls; campaign plans in this tab do not imply advertising has started. Add provider-native ad creation in a later step with paused-by-default delivery, explicit approval, provider-currency validation, and a hard daily budget cap.
- **Scale path:** Add SEO metadata publishing only when the storefront has a supported metadata contract; add Search Console, analytics, and ad providers behind server-side integrations with explicit consent, provider-specific permissions, attribution fields, auditable sync status, and budget safeguards.

## Automation architecture

- **Business value and v1 scope:** Low-stock email alerts help the team restock handmade inventory before listings sell out. Rules begin as drafts, require an explicit active state, and run when dashboard-managed stock enters the configured low range; newly created products already in that range are included. V1 listens to stock changes made through this dashboard; stock writes made directly by the storefront are not connected yet.
- **Access boundary:** Automations are hidden from sellers in navigation and guarded in the page, while every API endpoint independently requires an active administrator session. Only allow-listed `low_stock` triggers and `email_admin` actions are accepted; arbitrary scripts and recipient/customer data from store events are not executable.
- **API and persistence:** `GET /api/admin/ai/automations` returns up to 100 rules and recent runs; `POST` creates validated rules and `PATCH /:automationId` updates them. `automation_rules` holds typed trigger/action configuration and ownership timestamps. `automation_runs` records bounded event context, delivery state, and errors without deleting history when a rule is paused.
- **Scale path:** Add storefront/order lifecycle triggers by writing events to a transactional outbox, then process them through a retryable background worker with idempotency and provider delivery tracking. Keep business triggers, action adapters, and execution records separate so new actions can be added without accepting arbitrary code or coupling the UI to a specific worker.

## Approvals and integrations architecture

- **Approval workflow:** The queue is a projection of authoritative seller account state: pending store-name changes and verified seller accounts in pending activation status. Approval/rejection is administrator-only in navigation and server-side actions. Store-name approval rechecks the pending value to prevent stale decisions; activation rechecks email verification and unresolved name changes. Artisans & Users is for ongoing account oversight, deactivation, and restoring access to previously disabled accounts; it directs new requests to Approvals rather than duplicating those decisions.
- **Growth and access:** A centralized queue makes onboarding and storefront identity reviews visible so legitimate artisans can be activated promptly while unverified or unresolved accounts remain blocked. The current workflow is deliberately limited to those existing seller requests; it does not imply that product, order, payment, or marketing actions are being staged for approval.
- **Integration status API:** `GET /api/admin/ai/integrations` requires an active administrator session. It performs a lightweight Supabase connectivity check and reports whether Gemini, Resend, and Cloudinary are configured. It returns provider names, capabilities, and status only—not credentials, connection tokens, or secret values. Status for external providers indicates configuration readiness, not a live provider API probe.
- **Future scale path:** Keep this registry metadata-only until each provider has a defined server-side adapter, least-privilege credentials, connection test, lifecycle/error state, and auditable actions. If approvals expand beyond seller identity, introduce typed request records and an immutable decision history with idempotent execution, instead of storing arbitrary payloads or treating a UI status as authorization.

## Not yet migrated from the legacy seller/admin panel

Storefront-originated automation events and scheduled automation remain in the legacy seller/admin panel or are not connected to the standalone dashboard yet. The standalone app does not expose customer-account editing or payment credential management.

The schema defaults to 40 requests/day and 600/month. Limits, low-stock threshold, and provider price estimates are configurable in the dashboard. Costs remain unestimated until input and output price-per-million-token settings are entered.

## Rollback

Disable the feature with the dashboard's **Pause AI** control or set `enabled = false` on the singleton settings row. The existing storefront and seller/admin functions remain available. To remove the dashboard, stop/unpublish this service; the SQL objects are additive and can remain unused. Do not drop audit data without an explicit retention decision.

## Verification

Run `npm run build` from this folder and `npm start` after configuring the server environment variables. The SQL file must be reviewed and applied separately in Supabase; no production database was changed as part of this code change.
# dash.mithilachitrakalastore
