-- supabase/migrations/20260702000000_interview_prep_platform.sql

-- 1. Create interviews table
create table if not exists public.interviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  company text not null,
  role text not null,
  round text not null,
  interviewer_name text,
  meeting_link text,
  platform text,
  notes text,
  mode text check (mode in ('Virtual', 'In-Person', 'Phone')) not null,
  status text check (status in ('Upcoming', 'Completed', 'Cancelled', 'Missed')) default 'Upcoming' not null,
  outcome text check (outcome in ('Pending', 'Offer', 'Rejected', 'Next Round')) default 'Pending' not null,
  follow_up_notes text,
  interview_date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create checklists table
create table if not exists public.checklists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  interview_id uuid references public.interviews(id) on delete cascade not null,
  item text not null,
  completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create interview_questions table
create table if not exists public.interview_questions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  answer text not null,
  tags text[] default '{}'::text[] not null,
  difficulty text check (difficulty in ('Easy', 'Medium', 'Hard')) not null,
  notes text,
  category text check (category in ('Technical', 'HR', 'Behavioral', 'System Design', 'Coding')) not null,
  is_favorite boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create interview_experiences table
create table if not exists public.interview_experiences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company text not null,
  role text not null,
  interview_process text not null,
  questions_asked text not null,
  difficulty text check (difficulty in ('Easy', 'Medium', 'Hard')) not null,
  outcome text not null,
  preparation_tips text,
  is_anonymous boolean default false not null,
  is_public boolean default false not null,
  views_count integer default 0 not null,
  helpful_votes integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create career_goals table
create table if not exists public.career_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  target_value integer not null,
  current_value integer default 0 not null,
  is_completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create achievements table
create table if not exists public.achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  badge_type text not null,
  unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, badge_type)
);

-- 7. Create skills table
create table if not exists public.skills (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  skill_name text not null,
  progress integer default 0 check (progress >= 0 and progress <= 100) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, skill_name)
);

-- 8. Enable Row Level Security (RLS)
alter table public.interviews enable row level security;
alter table public.checklists enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_experiences enable row level security;
alter table public.career_goals enable row level security;
alter table public.achievements enable row level security;
alter table public.skills enable row level security;

-- 9. Create RLS Policies
-- Interviews policies
drop policy if exists "Users can manage their own interviews" on public.interviews;
create policy "Users can manage their own interviews" on public.interviews
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Checklists policies
drop policy if exists "Users can manage their own checklists" on public.checklists;
create policy "Users can manage their own checklists" on public.checklists
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Interview Questions policies
drop policy if exists "Users can manage their own interview questions" on public.interview_questions;
create policy "Users can manage their own interview questions" on public.interview_questions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Interview Experiences policies
drop policy if exists "Users can select public experiences or their own" on public.interview_experiences;
create policy "Users can select public experiences or their own" on public.interview_experiences
  for select to authenticated using (is_public = true or auth.uid() = user_id);

drop policy if exists "Users can manage their own interview experiences" on public.interview_experiences;
create policy "Users can manage their own interview experiences" on public.interview_experiences
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Career Goals policies
drop policy if exists "Users can manage their own career goals" on public.career_goals;
create policy "Users can manage their own career goals" on public.career_goals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Achievements policies
drop policy if exists "Users can view their own achievements" on public.achievements;
create policy "Users can view their own achievements" on public.achievements
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can manage their own achievements" on public.achievements;
create policy "Users can manage their own achievements" on public.achievements
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Skills policies
drop policy if exists "Users can manage their own skills" on public.skills;
create policy "Users can manage their own skills" on public.skills
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 10. Triggers for Automatic Achievements

-- Trigger for Profile onboarding achievement
create or replace function public.check_profile_onboarding_achievements()
returns trigger as $$
begin
  if new.onboarded = true then
    insert into public.achievements (user_id, badge_type)
    values (new.id, 'Profile Complete')
    on conflict (user_id, badge_type) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_updated_achievements on public.profiles;
create trigger on_profile_updated_achievements
  after update on public.profiles
  for each row execute procedure public.check_profile_onboarding_achievements();

-- Trigger for Application achievement (First application, 10 applications, First Offer)
create or replace function public.check_application_achievements()
returns trigger as $$
declare
  app_count integer;
begin
  -- First Application
  insert into public.achievements (user_id, badge_type)
  values (new.user_id, 'First Application')
  on conflict (user_id, badge_type) do nothing;

  -- 10 Applications
  select count(*) into app_count from public.applications where user_id = new.user_id;
  if app_count >= 10 then
    insert into public.achievements (user_id, badge_type)
    values (new.user_id, '10 Applications')
    on conflict (user_id, badge_type) do nothing;
  end if;

  -- First Offer
  if new.status = 'Offer' then
    insert into public.achievements (user_id, badge_type)
    values (new.user_id, 'First Offer')
    on conflict (user_id, badge_type) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_application_changed_achievements on public.applications;
create trigger on_application_changed_achievements
  after insert or update on public.applications
  for each row execute procedure public.check_application_achievements();

-- Trigger for Interview achievement (First Interview)
create or replace function public.check_interview_achievements()
returns trigger as $$
begin
  insert into public.achievements (user_id, badge_type)
  values (new.user_id, 'First Interview')
  on conflict (user_id, badge_type) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_interview_inserted_achievements on public.interviews;
create trigger on_interview_inserted_achievements
  after insert on public.interviews
  for each row execute procedure public.check_interview_achievements();

-- Trigger for Resume achievement (Resume Uploaded)
create or replace function public.check_resume_achievements()
returns trigger as $$
begin
  insert into public.achievements (user_id, badge_type)
  values (new.user_id, 'Resume Uploaded')
  on conflict (user_id, badge_type) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_resume_inserted_achievements on public.resumes;
create trigger on_resume_inserted_achievements
  after insert on public.resumes
  for each row execute procedure public.check_resume_achievements();

-- Trigger for Checklist achievement (Interview Ready)
create or replace function public.check_checklist_achievements()
returns trigger as $$
begin
  if new.completed = true then
    insert into public.achievements (user_id, badge_type)
    values (new.user_id, 'Interview Ready')
    on conflict (user_id, badge_type) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_checklist_updated_achievements on public.checklists;
create trigger on_checklist_updated_achievements
  after update on public.checklists
  for each row execute procedure public.check_checklist_achievements();

-- 11. Trigger to seed default skills
create or replace function public.seed_default_skills()
returns trigger as $$
begin
  insert into public.skills (user_id, skill_name, progress) values
    (new.id, 'React', 0),
    (new.id, 'Next.js', 0),
    (new.id, 'Java', 0),
    (new.id, 'Python', 0),
    (new.id, 'DSA', 0),
    (new.id, 'SQL', 0),
    (new.id, 'Docker', 0),
    (new.id, 'Git', 0)
  on conflict (user_id, skill_name) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_skills on public.profiles;
create trigger on_profile_created_skills
  after insert on public.profiles
  for each row execute procedure public.seed_default_skills();

-- Seed default skills for all existing profiles
insert into public.skills (user_id, skill_name, progress)
select p.id, s.skill_name, 0
from public.profiles p
cross join (
  values ('React'), ('Next.js'), ('Java'), ('Python'), ('DSA'), ('SQL'), ('Docker'), ('Git')
) as s(skill_name)
on conflict (user_id, skill_name) do nothing;
