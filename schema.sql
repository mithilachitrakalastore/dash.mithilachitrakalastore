alter table public.users
    add column if not exists google_auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists users_google_auth_user_id_key
    on public.users (google_auth_user_id)
    where google_auth_user_id is not null;

create table if not exists public.ai_dashboard_settings (
    id integer primary key check (id = 1),
    enabled boolean not null default true,
    daily_request_limit integer not null default 40 check (daily_request_limit between 1 and 1000),
    monthly_request_limit integer not null default 600 check (monthly_request_limit between 1 and 10000),
    low_stock_threshold integer not null default 5 check (low_stock_threshold between 0 and 100000),
    input_cost_per_million_usd numeric(12, 6) not null default 0 check (input_cost_per_million_usd >= 0),
    output_cost_per_million_usd numeric(12, 6) not null default 0 check (output_cost_per_million_usd >= 0),
    daily_requests integer not null default 0 check (daily_requests >= 0),
    daily_date date not null default (now() at time zone 'Asia/Kathmandu')::date,
    monthly_requests integer not null default 0 check (monthly_requests >= 0),
    monthly_month text not null default to_char(now() at time zone 'Asia/Kathmandu', 'YYYY-MM'),
    updated_by text,
    updated_at timestamptz not null default now()
);

insert into public.ai_dashboard_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.ai_dashboard_audit (
    id bigint generated always as identity primary key,
    admin_id text not null references public.users(id),
    task_type text not null,
    status text not null check (status in ('success', 'error')),
    model text,
    input_tokens integer not null default 0 check (input_tokens >= 0),
    output_tokens integer not null default 0 check (output_tokens >= 0),
    estimated_cost_usd numeric(14, 8),
    result_summary text,
    error_message text,
    created_at timestamptz not null default now()
);

create index if not exists ai_dashboard_audit_created_at_idx
    on public.ai_dashboard_audit (created_at desc);

create index if not exists ai_dashboard_audit_admin_id_idx
    on public.ai_dashboard_audit (admin_id, created_at desc);

alter table public.ai_dashboard_settings enable row level security;
alter table public.ai_dashboard_audit enable row level security;

create or replace function public.reserve_ai_dashboard_call()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    kathmandu_date date := (now() at time zone 'Asia/Kathmandu')::date;
    kathmandu_month text := to_char(now() at time zone 'Asia/Kathmandu', 'YYYY-MM');
begin
    update public.ai_dashboard_settings
    set daily_requests = case when daily_date = kathmandu_date then daily_requests + 1 else 1 end,
        daily_date = kathmandu_date,
        monthly_requests = case when monthly_month = kathmandu_month then monthly_requests + 1 else 1 end,
        monthly_month = kathmandu_month
    where id = 1
      and enabled
      and (daily_date <> kathmandu_date or daily_requests < daily_request_limit)
      and (monthly_month <> kathmandu_month or monthly_requests < monthly_request_limit);
    return found;
end;
$$;

revoke all on function public.reserve_ai_dashboard_call() from public, anon, authenticated;
grant execute on function public.reserve_ai_dashboard_call() to service_role;

comment on table public.ai_dashboard_settings is
    'Admin-only AI command-center feature switch, request budgets, and provider pricing estimates.';
comment on table public.ai_dashboard_audit is
    'Privacy-minimized audit records for read-only AI dashboard requests.';

create table if not exists public.marketing_campaigns (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 2 and 120),
    channel text not null check (channel in ('instagram', 'facebook', 'email', 'search', 'content', 'other')),
    goal text not null check (goal in ('awareness', 'traffic', 'engagement', 'sales', 'retention')),
    status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'completed')),
    audience text not null default '' check (char_length(audience) <= 500),
    budget numeric(12, 2) check (budget is null or budget >= 0),
    starts_on date,
    ends_on date,
    notes text not null default '' check (char_length(notes) <= 4000),
    created_by text references public.users(id) on delete set null,
    updated_by text references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

create index if not exists marketing_campaigns_status_created_idx
    on public.marketing_campaigns (status, created_at desc);
create index if not exists marketing_campaigns_channel_created_idx
    on public.marketing_campaigns (channel, created_at desc);

alter table public.marketing_campaigns enable row level security;

comment on table public.marketing_campaigns is
    'Administrator-managed marketing campaign plans.';

create table if not exists public.marketing_social_accounts (
    id uuid primary key default gen_random_uuid(),
    platform text not null check (platform in ('instagram', 'facebook', 'tiktok')),
    external_account_id text not null,
    account_name text not null check (char_length(account_name) between 1 and 240),
    access_token_ciphertext text not null,
    refresh_token_ciphertext text,
    token_expires_at timestamptz,
    granted_scopes text[] not null default '{}',
    metadata jsonb not null default '{}'::jsonb,
    connected boolean not null default true,
    connected_by text references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (platform, external_account_id)
);

create index if not exists marketing_social_accounts_platform_idx
    on public.marketing_social_accounts (platform, connected, created_at desc);

create table if not exists public.marketing_social_posts (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references public.marketing_social_accounts(id) on delete cascade,
    platform text not null check (platform in ('instagram', 'facebook', 'tiktok')),
    caption text not null check (char_length(caption) between 1 and 2200),
    media_url text,
    media_type text not null check (media_type in ('image', 'video', 'text')),
    status text not null default 'draft' check (status in ('draft', 'publishing', 'processing', 'published', 'failed')),
    provider_post_id text,
    provider_url text,
    error_message text,
    created_by text references public.users(id) on delete set null,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.marketing_social_posts
    add column if not exists scheduled_at timestamptz,
    add column if not exists schedule_claimed_at timestamptz,
    add column if not exists product_url text;

alter table public.marketing_social_posts
    drop constraint if exists marketing_social_posts_status_check;
alter table public.marketing_social_posts
    add constraint marketing_social_posts_status_check
    check (status in ('draft', 'scheduled', 'publishing', 'processing', 'published', 'failed', 'cancelled'));

create index if not exists marketing_social_posts_account_created_idx
    on public.marketing_social_posts (account_id, created_at desc);
create index if not exists marketing_social_posts_due_schedule_idx
    on public.marketing_social_posts (scheduled_at)
    where status = 'scheduled';

create or replace function public.claim_due_marketing_social_posts(batch_size integer default 5)
returns setof public.marketing_social_posts
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    with due as (
        select id
        from public.marketing_social_posts
        where status = 'scheduled'
          and scheduled_at <= now()
          and (schedule_claimed_at is null or schedule_claimed_at < now() - interval '10 minutes')
        order by scheduled_at, created_at
        for update skip locked
        limit greatest(1, least(batch_size, 10))
    )
    update public.marketing_social_posts as posts
    set status = 'publishing',
        schedule_claimed_at = now(),
        updated_at = now()
    from due
    where posts.id = due.id
    returning posts.*;
end;
$$;

revoke all on function public.claim_due_marketing_social_posts(integer) from public, anon, authenticated;
grant execute on function public.claim_due_marketing_social_posts(integer) to service_role;

alter table public.marketing_social_accounts enable row level security;
alter table public.marketing_social_posts enable row level security;

comment on table public.marketing_social_accounts is
    'Admin-connected social accounts. Provider tokens are encrypted by the dashboard server before storage.';
comment on table public.marketing_social_posts is
    'Social post publishing history and provider job status for approved administrator submissions.';

create table if not exists public.support_tickets (
    id uuid primary key default gen_random_uuid(),
    customer_name text not null check (char_length(customer_name) between 1 and 160),
    customer_email text not null check (char_length(customer_email) between 3 and 320),
    subject text not null check (char_length(subject) between 1 and 240),
    description text not null check (char_length(description) between 1 and 8000),
    category text not null default 'general' check (category in ('orders', 'shipping', 'returns', 'product', 'general')),
    status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed')),
    priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
    order_reference text check (char_length(order_reference) <= 120),
    assigned_to text constraint support_tickets_assigned_to_fkey references public.users(id) on delete set null,
    created_by text not null references public.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_message_at timestamptz not null default now(),
    last_message_preview text not null check (char_length(last_message_preview) between 1 and 240),
    last_message_type text not null default 'note' check (last_message_type in ('reply', 'note'))
);

create index if not exists support_tickets_inbox_idx
    on public.support_tickets (status, last_message_at desc, id desc);
create index if not exists support_tickets_assignee_idx
    on public.support_tickets (assigned_to, status, last_message_at desc);
create index if not exists support_tickets_activity_idx
    on public.support_tickets (last_message_at desc, id desc);
create index if not exists support_tickets_assignee_activity_idx
    on public.support_tickets (assigned_to, last_message_at desc, id desc);
create index if not exists support_tickets_customer_email_idx
    on public.support_tickets (lower(customer_email));

create table if not exists public.support_messages (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references public.support_tickets(id) on delete cascade,
    author_id text references public.users(id) on delete set null,
    author_name text not null check (char_length(author_name) between 1 and 160),
    body text not null check (char_length(body) between 1 and 8000),
    message_type text not null check (message_type in ('reply', 'note')),
    delivery_status text not null default 'not_applicable' check (delivery_status in ('not_applicable', 'pending', 'sent', 'failed')),
    delivery_error text,
    created_at timestamptz not null default now()
);

create index if not exists support_messages_ticket_created_idx
    on public.support_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

comment on table public.support_tickets is
    'Staff-managed customer support cases. Access is enforced by the authenticated dashboard API.';
comment on table public.support_messages is
    'Customer replies and private staff notes belonging to a support ticket.';

create table if not exists public.automation_rules (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 2 and 100),
    trigger_type text not null check (trigger_type in ('low_stock')),
    trigger_config jsonb not null default '{}'::jsonb check (jsonb_typeof(trigger_config) = 'object'),
    action_type text not null check (action_type in ('email_admin')),
    action_config jsonb not null default '{}'::jsonb check (jsonb_typeof(action_config) = 'object'),
    status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
    created_by text references public.users(id) on delete set null,
    updated_by text references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists automation_rules_status_trigger_idx
    on public.automation_rules (status, trigger_type, created_at desc);

create table if not exists public.automation_runs (
    id uuid primary key default gen_random_uuid(),
    rule_id uuid not null references public.automation_rules(id) on delete restrict,
    trigger_event_id uuid not null,
    status text not null check (status in ('running', 'succeeded', 'failed')),
    event_context jsonb not null default '{}'::jsonb check (jsonb_typeof(event_context) = 'object'),
    error_message text,
    triggered_at timestamptz not null default now(),
    finished_at timestamptz,
    unique (rule_id, trigger_event_id)
);

create index if not exists automation_runs_rule_triggered_idx
    on public.automation_runs (rule_id, triggered_at desc);
create index if not exists automation_runs_status_triggered_idx
    on public.automation_runs (status, triggered_at desc);

alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;

comment on table public.automation_rules is
    'Validated administrator-managed event automation definitions; supported trigger and action types are intentionally allow-listed.';
comment on table public.automation_runs is
    'Execution history for automations, including bounded event context and explicit delivery failures.';
