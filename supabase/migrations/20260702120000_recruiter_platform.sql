-- supabase/migrations/20260702120000_recruiter_platform.sql

-- 1. Alter public.profiles table to add role
alter table public.profiles add column if not exists role text check (role in ('student', 'recruiter', 'admin')) default 'student' not null;

-- 2. Create companies table
create table if not exists public.companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  website text not null,
  industry text not null,
  size text not null,
  logo_url text,
  about text,
  tech_stack text[] default '{}'::text[] not null,
  benefits text[] default '{}'::text[] not null,
  is_verified boolean default false not null,
  is_suspended boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create recruiters table
create table if not exists public.recruiters (
  id uuid references public.profiles(id) on delete cascade primary key,
  company_id uuid references public.companies(id) on delete cascade,
  hr_name text not null,
  company_email text not null unique,
  linkedin_url text,
  is_approved boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Alter internships table to support recruiter-specific details
alter table public.internships add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.internships add column if not exists recruiter_id uuid references public.recruiters(id) on delete cascade;
alter table public.internships add column if not exists description text;
alter table public.internships add column if not exists duration text;
alter table public.internships add column if not exists openings integer;
alter table public.internships add column if not exists selection_process text;
alter table public.internships add column if not exists status text check (status in ('Draft', 'Published', 'Closed', 'Archived')) default 'Published' not null;
alter table public.internships add column if not exists department text;

-- 5. Modify check constraints on applications and application_timeline status
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check check (status in ('Saved', 'Applied', 'Screening', 'Online Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'));

alter table public.application_timeline drop constraint if exists application_timeline_status_check;
alter table public.application_timeline add constraint application_timeline_status_check check (status in ('Saved', 'Applied', 'Screening', 'Online Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'));

-- 6. Create applicants table (For recruiter notes, match scores, and ratings)
create table if not exists public.applicants (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade not null,
  recruiter_id uuid references public.recruiters(id) on delete cascade not null,
  notes text,
  rating integer check (rating >= 1 and rating <= 5),
  match_score integer default 75 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (application_id, recruiter_id)
);

-- 7. Create messages table (For recruiter-student messaging)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  message_type text check (message_type in ('General', 'Interview Request', 'Offer')) default 'General' not null,
  metadata jsonb default '{}'::jsonb not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Create analytics table
create table if not exists public.analytics (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  views_count integer default 0 not null,
  applications_count integer default 0 not null,
  interviews_count integer default 0 not null,
  offers_count integer default 0 not null,
  hired_count integer default 0 not null,
  time_to_hire_days integer default 14 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (company_id)
);

-- 9. Enable Row Level Security (RLS)
alter table public.companies enable row level security;
alter table public.recruiters enable row level security;
alter table public.applicants enable row level security;
alter table public.messages enable row level security;
alter table public.analytics enable row level security;

-- 10. RLS Policies
-- Companies policies
drop policy if exists "Anyone authenticated can select companies" on public.companies;
create policy "Anyone authenticated can select companies" on public.companies
  for select to authenticated using (true);

drop policy if exists "Admins can manage companies" on public.companies;
create policy "Admins can manage companies" on public.companies
  for all to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Recruiters can update their own company" on public.companies;
create policy "Recruiters can update their own company" on public.companies
  for update to authenticated using (
    exists (select 1 from public.recruiters where id = auth.uid() and company_id = companies.id)
  );

-- Recruiters policies
drop policy if exists "Anyone authenticated can view recruiters" on public.recruiters;
create policy "Anyone authenticated can view recruiters" on public.recruiters
  for select to authenticated using (true);

drop policy if exists "Recruiters can manage their own profile" on public.recruiters;
create policy "Recruiters can manage their own profile" on public.recruiters
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Applicants reviews policies
drop policy if exists "Recruiters and admins can manage applicant reviews" on public.applicants;
create policy "Recruiters and admins can manage applicant reviews" on public.applicants
  for all to authenticated using (
    exists (select 1 from public.recruiters where id = auth.uid()) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Messages policies
drop policy if exists "Users can manage their own messages" on public.messages;
create policy "Users can manage their own messages" on public.messages
  for all to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Analytics policies
drop policy if exists "Anyone authenticated can read analytics" on public.analytics;
create policy "Anyone authenticated can read analytics" on public.analytics
  for select to authenticated using (true);

drop policy if exists "Recruiters can manage their own company analytics" on public.analytics;
create policy "Recruiters can manage their own company analytics" on public.analytics
  for all to authenticated using (
    exists (select 1 from public.recruiters where id = auth.uid() and company_id = analytics.company_id)
  ) with check (
    exists (select 1 from public.recruiters where id = auth.uid() and company_id = analytics.company_id)
  );

-- 11. Database trigger: handle_new_user upgrade
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_company_id uuid;
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  -- Insert profile
  insert into public.profiles (id, full_name, university, degree, graduation_year, onboarded, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'hr_name', 'Student Candidate')),
    coalesce(new.raw_user_meta_data->>'university', 'N/A'),
    coalesce(new.raw_user_meta_data->>'degree', 'N/A'),
    coalesce(cast(new.raw_user_meta_data->>'graduation_year' as integer), 2028),
    case when user_role = 'recruiter' then true else false end, -- Recruiter is onboarded upon signup details
    user_role
  );

  -- If recruiter, create company and recruiter profile
  if user_role = 'recruiter' then
    -- Create company
    insert into public.companies (name, website, industry, size, logo_url, is_verified)
    values (
      coalesce(new.raw_user_meta_data->>'company_name', 'Unnamed Company'),
      coalesce(new.raw_user_meta_data->>'website', 'https://example.com'),
      coalesce(new.raw_user_meta_data->>'industry', 'Technology'),
      coalesce(new.raw_user_meta_data->>'company_size', '11-50'),
      coalesce(new.raw_user_meta_data->>'logo_url', null),
      false -- Needs admin verification
    )
    returning id into new_company_id;

    -- Create recruiter profile
    insert into public.recruiters (id, company_id, hr_name, company_email, linkedin_url, is_approved)
    values (
      new.id,
      new_company_id,
      coalesce(new.raw_user_meta_data->>'hr_name', 'HR Recruiter'),
      new.email,
      coalesce(new.raw_user_meta_data->>'linkedin_url', null),
      false -- Needs admin approval
    );

    -- Seed default analytics row
    insert into public.analytics (company_id)
    values (new_company_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;
