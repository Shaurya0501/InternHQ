-- supabase/migrations/20260701000000_automated_career_assistant.sql

-- 1. Create OAuth Tokens table (For optional Google integration)
create table if not exists public.oauth_tokens (
  user_id uuid references auth.users(id) on delete cascade primary key,
  access_token text not null, -- Store encrypted
  refresh_token text,        -- Store encrypted
  expires_at timestamp with time zone,
  token_type text,
  scope text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Email Events table (To store internship related emails)
create table if not exists public.email_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  application_id uuid references public.applications(id) on delete cascade,
  gmail_message_id text not null,
  subject text not null,
  sender text not null,
  preview text,
  body text,
  company text,
  classification text check (classification in ('Application Confirmation', 'Assessment', 'Interview Invitation', 'Interview Reminder', 'Offer Letter', 'Rejected', 'Waitlisted', 'General Updates')) not null,
  date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, gmail_message_id)
);

-- 3. Create Calendar Events table (For both Google and manual calendar tracking)
create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  application_id uuid references public.applications(id) on delete cascade,
  google_event_id text, -- Can be null if using local calendar / manual .ics
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  event_type text check (event_type in ('Interview', 'Assessment', 'Offer Discussion', 'Deadline Reminder')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, google_event_id)
);

-- 4. Create Reminder Settings table (User configured timings)
create table if not exists public.reminder_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  interview_reminder_enabled boolean default true not null,
  interview_reminder_timing integer default 60 not null, -- minutes before
  assessment_reminder_enabled boolean default true not null,
  assessment_reminder_timing integer default 1440 not null, -- minutes before (1 day)
  deadline_reminder_enabled boolean default true not null,
  deadline_reminder_timing integer default 2880 not null, -- minutes before (2 days)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Update Notifications table
-- Drop constraint if exists and add updated check constraint
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('match', 'company_post', 'deadline', 'resume_incomplete', 'interview_tomorrow', 'assessment_tomorrow', 'offer_received', 'application_updated', 'deadline_tomorrow'));

-- 6. Update Application Timeline table to support update_type & email context
alter table public.application_timeline add column if not exists update_type text check (update_type in ('manual', 'email', 'system')) default 'manual' not null;
alter table public.application_timeline add column if not exists email_subject text;
alter table public.application_timeline add column if not exists email_preview text;
alter table public.application_timeline add column if not exists email_event_id uuid references public.email_events(id) on delete set null;

-- 7. Update Automatic Timeline Triggers to set default update_type to 'system'
create or replace function public.log_application_insert_timeline()
returns trigger as $$
begin
  insert into public.application_timeline (application_id, status, notes, event_date, update_type)
  values (new.id, new.status, coalesce(new.notes, 'Application initialized in state: ' || new.status), now(), 'system');
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.log_application_status_change()
returns trigger as $$
begin
  if old.status <> new.status then
    insert into public.application_timeline (application_id, status, notes, event_date, update_type)
    values (new.id, new.status, coalesce(new.notes, 'Status transitioned from ' || old.status || ' to ' || new.status), now(), 'system');
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 8. Enable Row Level Security (RLS)
alter table public.oauth_tokens enable row level security;
alter table public.email_events enable row level security;
alter table public.calendar_events enable row level security;
alter table public.reminder_settings enable row level security;

-- 9. Create RLS Policies
-- OAuth Tokens policies
drop policy if exists "Users can manage their own oauth tokens" on public.oauth_tokens;
create policy "Users can manage their own oauth tokens" on public.oauth_tokens
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Email Events policies
drop policy if exists "Users can manage their own email events" on public.email_events;
create policy "Users can manage their own email events" on public.email_events
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Calendar Events policies
drop policy if exists "Users can manage their own calendar events" on public.calendar_events;
create policy "Users can manage their own calendar events" on public.calendar_events
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reminder Settings policies
drop policy if exists "Users can manage their own reminder settings" on public.reminder_settings;
create policy "Users can manage their own reminder settings" on public.reminder_settings
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger to automatically create default reminder settings for new users
create or replace function public.handle_new_user_reminder_settings()
returns trigger as $$
begin
  insert into public.reminder_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_reminder_settings on public.profiles;
create trigger on_profile_created_reminder_settings
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_reminder_settings();

-- Ensure all existing profiles get a reminder settings entry
insert into public.reminder_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
