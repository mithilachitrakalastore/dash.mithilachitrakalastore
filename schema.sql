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
