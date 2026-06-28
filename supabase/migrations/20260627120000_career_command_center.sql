-- Create internships table
create table if not exists public.internships (
  id uuid default gen_random_uuid() primary key,
  external_id text,
  source text not null, -- 'remotive', 'arbeitnow', 'manual'
  company_name text not null,
  company_logo text,
  role text not null,
  location text,
  location_type text check (location_type in ('remote', 'hybrid', 'onsite', 'unknown')) default 'unknown' not null,
  stipend text,
  experience_required text,
  skills text[] default '{}'::text[] not null,
  application_deadline timestamp with time zone,
  posted_date timestamp with time zone default now(),
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (source, external_id)
);

-- Create saved_internships table
create table if not exists public.saved_internships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  internship_id uuid references public.internships on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, internship_id)
);

-- Create applications table
create table if not exists public.applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  internship_id uuid references public.internships on delete cascade not null,
  status text check (status in ('Saved', 'Applied', 'Online Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn')) default 'Applied' not null,
  applied_date timestamp with time zone default timezone('utc'::text, now()) not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, internship_id)
);

-- Create application_timeline table
create table if not exists public.application_timeline (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications on delete cascade not null,
  status text check (status in ('Saved', 'Applied', 'Online Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn')) not null,
  event_date timestamp with time zone default timezone('utc'::text, now()) not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create recommendation_cache table
create table if not exists public.recommendation_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  internship_id uuid references public.internships on delete cascade not null,
  score numeric(5,2) default 0.00 not null,
  recommended_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, internship_id)
);

-- Enable Row Level Security (RLS)
alter table public.internships enable row level security;
alter table public.saved_internships enable row level security;
alter table public.applications enable row level security;
alter table public.application_timeline enable row level security;
alter table public.recommendation_cache enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Enable select for authenticated users" on public.internships;
drop policy if exists "Enable insert for authenticated users" on public.internships;
drop policy if exists "Enable update for authenticated users" on public.internships;

drop policy if exists "Users can manage their own saved internships" on public.saved_internships;
drop policy if exists "Users can manage their own applications" on public.applications;
drop policy if exists "Users can view their own application timelines" on public.application_timeline;
drop policy if exists "Users can manage their own recommendations cache" on public.recommendation_cache;

-- Internships policies
create policy "Enable select for authenticated users" on public.internships
  for select to authenticated using (true);

create policy "Enable insert for authenticated users" on public.internships
  for insert to authenticated with check (true);

create policy "Enable update for authenticated users" on public.internships
  for update to authenticated using (true);

-- Saved Internships policies
create policy "Users can manage their own saved internships" on public.saved_internships
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Applications policies
create policy "Users can manage their own applications" on public.applications
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Application Timeline policies
create policy "Users can view their own application timelines" on public.application_timeline
  for all to authenticated
  using (
    exists (
      select 1 from public.applications
      where public.applications.id = public.application_timeline.application_id
      and public.applications.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.applications
      where public.applications.id = public.application_timeline.application_id
      and public.applications.user_id = auth.uid()
    )
  );

-- Recommendation Cache policies
create policy "Users can manage their own recommendations cache" on public.recommendation_cache
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Automatic Timeline Triggers

-- Trigger function for Insert
create or replace function public.log_application_insert_timeline()
returns trigger as $$
begin
  insert into public.application_timeline (application_id, status, notes, event_date)
  values (new.id, new.status, coalesce(new.notes, 'Application initialized in state: ' || new.status), now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_application_inserted on public.applications;
create trigger on_application_inserted
  after insert on public.applications
  for each row execute procedure public.log_application_insert_timeline();

-- Trigger function for Update (Status changes)
create or replace function public.log_application_status_change()
returns trigger as $$
begin
  if old.status <> new.status then
    insert into public.application_timeline (application_id, status, notes, event_date)
    values (new.id, new.status, coalesce(new.notes, 'Status transitioned from ' || old.status || ' to ' || new.status), now());
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_application_status_updated on public.applications;
create trigger on_application_status_updated
  after update on public.applications
  for each row execute procedure public.log_application_status_change();
