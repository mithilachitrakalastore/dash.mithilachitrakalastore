# AI Dashbord

This folder is a separately deployable full-stack application. Its React client talks only to the AI dashboard's authenticated HTTP API. Its separate `server.js` hosts that API and accesses Supabase/Gemini server-side; the store frontend and store `server.js` are not merged with it.

## Deploy the standalone dashboard and API

1. Review and run `schema.sql` in the Supabase SQL editor. It adds a nullable Google Auth user ID to `public.users` with a unique index (without modifying existing users), creates the dashboard settings/audit tables, and adds an atomic daily/monthly request-budget reservation function.
2. Create a Node web service from the `AI_Dashbord` folder. Set the build command to `npm install && npm run build` and the start command to `npm start`. The service uses the host-provided `PORT`.
3. Set these server environment variables on that service: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `ADMIN_EMAIL_TOKEN_SECRET`, and, only for cross-origin frontend hosting, `AI_DASHBOARD_ORIGINS`. The anon key is public, but the dashboard loads it from its API config endpoint rather than embedding it in the frontend build. Do not set secrets as `VITE_*` variables. Optional `EMAIL_HELLO`, `EMAIL_ORDERS`, `EMAIL_SUPPORT`, and `EMAIL_SECURITY` values override the corresponding verified sender addresses.
4. For a single service serving both the app and API, leave `VITE_API_BASE_URL=/api`. If you host the frontend separately, set its build-time `VITE_API_BASE_URL` to the AI API service origin plus `/api`, and configure `AI_DASHBOARD_ORIGINS` on the API server to the exact frontend HTTPS origin.
5. Sign in with Google or an existing active, verified store seller or administrator username/email and password. Sellers have the same dashboard and settings permissions as administrators. Google must be enabled as an OAuth provider in the same Supabase project used by the storefront. Add the dashboard's deployed origin (for example `https://admin.example.com`) to Supabase Auth's allowed redirect URLs. For an account whose Google email does not match its store email, enter the existing account credentials and choose **Link Google to this store account**. The API verifies the password and issues a five-minute signed grant; after Google verifies the identity, the API links that Supabase Auth user ID to the existing store account. Google sign-in cannot create or promote accounts, or activate inactive/unverified sellers or administrators. The API validates the Supabase access token before issuing a 12-hour dashboard token. The signed dashboard session is stored in tab-scoped session storage, re-verified with the API after a page reload, and cleared when the tab closes or the user signs out.

The dashboard fails closed if the additive schema is missing, administrator verification fails, the feature is paused, the provider is unavailable, or the database request budget is exhausted.

### Local development

Run `npm install` and `npm run dev` from this folder. The API server loads `AI_Dashbord/.env` first and, only outside production, falls back to the repository root `.env` for the existing local Supabase/Gemini configuration. Put any AI-dashboard-specific overrides in `AI_Dashbord/.env`; do not commit either `.env` file. Vite runs at `http://127.0.0.1:5173` and proxies `/api` to the standalone API on port `4173`. Add `http://127.0.0.1:5173` to Supabase Auth's allowed redirect URLs for local Google sign-in.

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
| `GEMINI_MODEL` | `gemini-3.8-flash` (or a model enabled for your Gemini account) |
| `AI_DASHBOARD_ORIGINS` | Leave unset for the single-service same-origin setup; otherwise the exact dashboard site origin |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name used for signed product image uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key (used only to return short-lived signed upload parameters) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (server-side only; never expose as `VITE_*`) |

The frontend default `VITE_API_BASE_URL=/api` is correct when Render serves the dashboard frontend and its separate API server from the same service. Point `dash.mithilachitrakalastore.com.np` DNS to that dashboard service and configure the service's custom domain; the dashboard API then stays same-origin at `/api` and connects server-side to the same Supabase store data as the main website. If deploying the frontend separately, set `VITE_API_BASE_URL` to `https://<your-ai-api-service>.onrender.com/api` at build time and set `AI_DASHBOARD_ORIGINS` on the API service to the frontend's exact HTTPS origin. The storefront navigation links sellers and admins to `https://dash.mithilachitrakalastore.com.np`; DNS and hosting custom-domain setup must still be completed with the hosting provider.

## Included

- Authenticated, server-verified active-seller and active-admin endpoints.
- Authenticated management API for seller-owned products/orders and admin-managed global order fulfillment, billing/payment verification, seller payouts, artisan account status, and commission policy. Mutating requests verify the signed dashboard session and enforce role and seller ownership server-side.
- The Wishlists page summarizes product saves and customer interest for the full store for administrators, or only products owned by the signed-in seller.
- Administrator-only Hero Slides and Cultural Journal pages create, edit, publish, and remove homepage slides and journal posts through role-checked management actions.
- The Billing & Print page renders a printable invoice for orders the signed-in seller/admin can access.
- The administrator-only Email page sends custom text/HTML emails or published Resend templates, with server-side recipient validation, sender/reply-to selection, automatic template variables, and the Resend API key kept off the client.
- Store overview cards for sales and orders today, registered customers, low inventory, a seven-day sales trend, recent orders, and top-selling items, sourced from existing Supabase records.
- Active sellers and administrators can use the same store-wide dashboard, including shared AI usage limits and pause controls.
- Sidebar navigation opens separate, refresh-safe dashboard pages for the dashboard, AI reports, product and inventory management, orders, billing/print, wishlists, email, homepage hero slides, the cultural journal, artisan activation, commission policy, analytics, usage, audit logs, and settings. Search also covers products and recent orders.
- Customer Support, Marketing & SEO, Automations, Approvals, and Integrations have individual navigation pages but remain clearly marked as not connected until their API workflows are implemented.
- A separate seller/admin login API with bounded request size, IP-based sign-in throttling, and no database credentials in the client.
- CORS restriction for cross-origin frontend access when `AI_DASHBOARD_ORIGINS` is configured. Same-origin deployments do not need a CORS entry.
- Read-only summaries of today's orders, low-stock products, and missing product listing fields.
- No customer names, email addresses, addresses, or payment credentials are passed to the model.
- A server-side per-process rate limit and database-atomic daily/monthly provider-call budgets.
- A global AI pause control.
- Provider token counts and estimated costs only when an administrator configures model pricing.
- Privacy-minimized audit history with errors and result summaries.

## Not yet migrated from the legacy seller/admin panel

Store-name approval, product image upload, and automation scheduling remain in the legacy seller/admin panel or are not connected to the standalone dashboard yet. Do not treat those sidebar placeholder areas as active workflows. The standalone app does not expose customer-account editing or payment credential management.

The schema defaults to 40 requests/day and 600/month. Limits, low-stock threshold, and provider price estimates are configurable in the dashboard. Costs remain unestimated until input and output price-per-million-token settings are entered.

## Rollback

Disable the feature with the dashboard's **Pause AI** control or set `enabled = false` on the singleton settings row. The existing storefront and seller/admin functions remain available. To remove the dashboard, stop/unpublish this service; the SQL objects are additive and can remain unused. Do not drop audit data without an explicit retention decision.

## Verification

Run `npm run build` from this folder and `npm start` after configuring the server environment variables. The SQL file must be reviewed and applied separately in Supabase; no production database was changed as part of this code change.
# dash.mithilachitrakalastore
