-- Reach — initial schema
-- Tables: profiles, projects, research_runs, reports, report_sections,
--         communities, evidence_items, distribution_posts, signals
-- All identity flows through Supabase Auth; this schema stores app data.

-- Profiles: 1:1 with auth.users. Stores display metadata + pioneer flag.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  is_pioneer boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Projects: an app a user wants to find an audience for.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  app_url text,
  repo_url text,
  -- 3 short onboarding answers
  problem text not null,
  who_suffers text not null,
  what_they_pay text not null,
  -- Niche-fit gate result
  niche_fit text not null default 'pending',          -- pending | fit | not_fit
  niche_fit_reason text,
  -- Current state of the project
  status text not null default 'created',              -- created | researching | researched | distributing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_projects_status on public.projects(status);

-- Research runs: one async background research job per project (can retry).
create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'queued',               -- queued | running | completed | failed
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  -- Raw agent trace / logs for debugging and iteration
  trace jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_runs_project on public.research_runs(project_id);
create index if not exists idx_runs_status on public.research_runs(status);

-- Reports: the synthesized Audience Report produced by a run.
-- One report per run (the latest completed run's report is the "current" one).
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id uuid not null references public.research_runs(id) on delete cascade,
  -- ICP definition
  icp_summary text not null,
  -- "Worth launching" verdict: green | yellow | red
  verdict text not null,
  verdict_reason text not null,
  -- Pricing recommendation
  pricing_recommendation text,
  pricing_currency text default 'usd',
  -- "Messaging pocket dictionary" — their words, not yours
  pocket_dictionary jsonb not null default '[]'::jsonb,
  -- Full structured report blob for re-rendering / export
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_project on public.reports(project_id);

-- Communities: ranked places the audience already hangs out (subreddits, HN, Discords, newsletters, etc.).
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  name text not null,
  platform text not null,                             -- reddit | hackernews | discord | newsletter | twitter | other
  url text not null,
  -- Why this community is relevant — the load-bearing signal
  relevance_reason text not null,
  -- Estimated size / subscriber count if discoverable
  estimated_size integer,
  -- Relevance score for ranking (higher = more relevant)
  score double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_communities_report on public.communities(report_id);

-- Evidence items: links to concrete posts/comments that back up a claim in the report.
-- Hard rule: nothing in a report can exist without ≥1 evidence link.
create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  -- What claim this evidence supports (ICP, community, pricing, WTP, etc.)
  supports text not null,
  url text not null,
  title text,
  snippet text,
  -- Platform it came from — same domain as the link
  source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_report on public.evidence_items(report_id);

-- Distribution posts: native-voice drafts per platform, to be posted from the user's own account.
create table if not exists public.distribution_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  platform text not null,
  -- "Native voice per platform" — one draft per platform, not one boilerplate
  title text,
  body text not null,
  status text not null default 'draft',                -- draft | scheduled | posted | failed
  posted_at timestamptz,
  external_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_project on public.distribution_posts(project_id);
create index if not exists idx_posts_status on public.distribution_posts(status);

-- Signals: engagement / conversion / click signals captured after distribution.
create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.distribution_posts(id) on delete cascade,
  kind text not null,                                 -- views | upvotes | comments | clicks | conversions
  value integer not null,
  captured_at timestamptz not null default now()
);

create index if not exists idx_signals_post on public.signals(post_id);

-- Updated_at trigger helper
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_posts_updated on public.distribution_posts;
create trigger trg_posts_updated before update on public.distribution_posts
  for each row execute function public.touch_updated_at();

-- RLS: users can only see/modify their own projects and downstream rows.
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.research_runs enable row level security;
alter table public.reports enable row level security;
alter table public.communities enable row level security;
alter table public.evidence_items enable row level security;
alter table public.distribution_posts enable row level security;
alter table public.signals enable row level security;

-- Profile: a user can read/update only their own profile row.
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- Projects
create policy "projects owner all" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Downstream: a user can act on rows that belong to one of their projects.
-- These policies rely on the FK chain project → run / post → signals; checking ownership via the project.
create policy "runs owner all" on public.research_runs
  for all using (
    exists (select 1 from public.projects p
            where p.id = research_runs.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p
            where p.id = research_runs.project_id and p.user_id = auth.uid())
  );

create policy "reports owner all" on public.reports
  for all using (
    exists (select 1 from public.projects p
            inner join public.research_runs r on r.project_id = p.id
            where r.id = reports.run_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p
            inner join public.research_runs r on r.project_id = p.id
            where r.id = reports.run_id and p.user_id = auth.uid())
  );

create policy "communities owner all" on public.communities
  for all using (
    exists (select 1 from public.projects p
            inner join public.reports rep on rep.project_id = p.id
            where rep.id = communities.report_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p
            inner join public.reports rep on rep.project_id = p.id
            where rep.id = communities.report_id and p.user_id = auth.uid())
  );

create policy "evidence owner all" on public.evidence_items
  for all using (
    exists (select 1 from public.projects p
            inner join public.reports rep on rep.project_id = p.id
            where rep.id = evidence_items.report_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p
            inner join public.reports rep on rep.project_id = p.id
            where rep.id = evidence_items.report_id and p.user_id = auth.uid())
  );

create policy "posts owner all" on public.distribution_posts
  for all using (
    exists (select 1 from public.projects p
            where p.id = distribution_posts.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p
            where p.id = distribution_posts.project_id and p.user_id = auth.uid())
  );

create policy "signals owner all" on public.signals
  for all using (
    exists (select 1 from public.projects p
            inner join public.distribution_posts dp on dp.project_id = p.id
            where dp.id = signals.post_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p
            inner join public.distribution_posts dp on dp.project_id = p.id
            where dp.id = signals.post_id and p.user_id = auth.uid())
  );

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();