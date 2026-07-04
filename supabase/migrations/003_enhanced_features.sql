-- Add multi-language and currency support to user profiles
alter table public.user_profiles 
add column if not exists preferred_language text default 'pt',
add column if not exists preferred_currency text default 'AKZ';

-- Create table for storing platform announcements/news
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null, -- 'news', 'event', 'alert', 'update'
  priority text default 'normal', -- 'low', 'normal', 'high', 'urgent'
  image_url text,
  published boolean default false,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

-- RLS for announcements
alter table public.announcements enable row level security;

create policy "anon_select_published_announcements"
  on public.announcements for select to anon
  using (published = true and (expires_at is null or expires_at > now()));

create policy "authenticated_select_announcements"
  on public.announcements for select to authenticated
  using (published = true and (expires_at is null or expires_at > now()));

create policy "authenticated_insert_announcements"
  on public.announcements for insert to authenticated
  with check (true);

create policy "authenticated_update_announcements"
  on public.announcements for update to authenticated
  using (true);

-- Create table for member testimonies
create table if not exists public.testimonies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  title text not null,
  content text not null,
  category text, -- 'healing', 'salvation', 'miracle', 'blessing', 'other'
  is_anonymous boolean default false,
  is_approved boolean default false,
  approved_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- RLS for testimonies
alter table public.testimonies enable row level security;

create policy "authenticated_insert_own_testimonies"
  on public.testimonies for insert to authenticated
  with check (user_id = auth.uid());

create policy "authenticated_select_approved_testimonies"
  on public.testimonies for select to authenticated
  using (is_approved = true);

create policy "authenticated_update_own_testimonies"
  on public.testimonies for update to authenticated
  using (user_id = auth.uid());

-- Create table for Bible reading plans
create table if not exists public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_days integer not null,
  category text, -- 'beginner', 'intermediate', 'advanced', 'thematic'
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- RLS for reading plans
alter table public.reading_plans enable row level security;

create policy "authenticated_select_reading_plans"
  on public.reading_plans for select to authenticated
  using (true);

create policy "authenticated_insert_reading_plans"
  on public.reading_plans for insert to authenticated
  with check (true);

-- Create table for daily readings in plans
create table if not exists public.daily_readings (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.reading_plans(id) on delete cascade,
  day_number integer not null,
  scripture_reference text not null, -- e.g., "John 3:16-21"
  reflection text,
  created_at timestamp with time zone default now()
);

-- RLS for daily readings
alter table public.daily_readings enable row level security;

create policy "authenticated_select_daily_readings"
  on public.daily_readings for select to authenticated
  using (true);

create policy "authenticated_insert_daily_readings"
  on public.daily_readings for insert to authenticated
  with check (true);

-- Create table for user reading progress
create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  plan_id uuid references public.reading_plans(id) on delete cascade,
  daily_reading_id uuid references public.daily_readings(id) on delete cascade,
  completed boolean default false,
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(user_id, daily_reading_id)
);

-- RLS for reading progress
alter table public.reading_progress enable row level security;

create policy "authenticated_insert_own_reading_progress"
  on public.reading_progress for insert to authenticated
  with check (user_id = auth.uid());

create policy "authenticated_select_own_reading_progress"
  on public.reading_progress for select to authenticated
  using (user_id = auth.uid());

create policy "authenticated_update_own_reading_progress"
  on public.reading_progress for update to authenticated
  using (user_id = auth.uid());

-- Create table for worship songs/hymns library
create table if not exists public.worship_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lyrics text not null,
  category text, -- 'praise', 'worship', 'hymn', 'contemporary'
  artist text,
  audio_url text,
  video_url text,
  language text default 'pt',
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- RLS for worship songs
alter table public.worship_songs enable row level security;

create policy "authenticated_select_worship_songs"
  on public.worship_songs for select to authenticated
  using (true);

create policy "authenticated_insert_worship_songs"
  on public.worship_songs for insert to authenticated
  with check (true);

-- Create table for volunteer opportunities
create table if not exists public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  ministry_id uuid references public.ministries(id) on delete set null,
  requirements text,
  time_commitment text, -- e.g., "2 hours/week", "one-time event"
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  max_volunteers integer,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- RLS for volunteer opportunities
alter table public.volunteer_opportunities enable row level security;

create policy "authenticated_select_volunteer_opportunities"
  on public.volunteer_opportunities for select to authenticated
  using (true);

create policy "authenticated_insert_volunteer_opportunities"
  on public.volunteer_opportunities for insert to authenticated
  with check (true);

-- Create table for volunteer sign-ups
create table if not exists public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.volunteer_opportunities(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete cascade,
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  message text,
  approved_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  unique(opportunity_id, user_id)
);

-- RLS for volunteer signups
alter table public.volunteer_signups enable row level security;

create policy "authenticated_insert_own_volunteer_signups"
  on public.volunteer_signups for insert to authenticated
  with check (user_id = auth.uid());

create policy "authenticated_select_volunteer_signups"
  on public.volunteer_signups for select to authenticated
  using (true);

create policy "authenticated_update_own_volunteer_signups"
  on public.volunteer_signups for update to authenticated
  using (user_id = auth.uid());

-- Create indexes for better performance
create index if not exists idx_announcements_published on public.announcements(published, created_at desc);
create index if not exists idx_testimonies_approved on public.testimonies(is_approved, created_at desc);
create index if not exists idx_daily_readings_plan on public.daily_readings(plan_id, day_number);
create index if not exists idx_reading_progress_user on public.reading_progress(user_id, plan_id);
create index if not exists idx_worship_songs_category on public.worship_songs(category, created_at desc);
create index if not exists idx_volunteer_signups_user on public.volunteer_signups(user_id, status);
