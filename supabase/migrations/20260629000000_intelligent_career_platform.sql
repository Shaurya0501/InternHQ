-- supabase/migrations/20260629000000_intelligent_career_platform.sql

-- 1. Create Resumes table
create table if not exists public.resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  version integer default 1 not null,
  upload_date timestamp with time zone default now() not null,
  primary_skills text[] default '{}'::text[] not null,
  is_favorite boolean default false not null,
  last_used_at timestamp with time zone,
  file_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Documents table
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('Cover Letter', 'Certificate', 'Transcript', 'Portfolio PDF', 'Recommendation Letter')) not null,
  filename text not null,
  file_url text not null,
  upload_date timestamp with time zone default now() not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Modify Applications table to reference resumes
alter table public.applications add column if not exists resume_id uuid references public.resumes(id) on delete set null;

-- 4. Create Company Follows table
create table if not exists public.company_follows (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  company_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, company_name)
);

-- 5. Create Collections table
create table if not exists public.collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, name)
);

-- 6. Create Collection Items table
create table if not exists public.collection_items (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  internship_id uuid references public.internships(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (collection_id, internship_id)
);

-- 7. Create Skill Profile table
create table if not exists public.skill_profile (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  skills text[] default '{}'::text[] not null,
  preferred_roles text[] default '{}'::text[] not null,
  preferred_locations text[] default '{}'::text[] not null,
  remote_preference text check (remote_preference in ('remote', 'hybrid', 'onsite', 'any')) default 'any' not null,
  preferred_tech_stack text[] default '{}'::text[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Create Notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  type text check (type in ('match', 'company_post', 'deadline', 'resume_incomplete')) not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Enable RLS on all new tables
alter table public.resumes enable row level security;
alter table public.documents enable row level security;
alter table public.company_follows enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.skill_profile enable row level security;
alter table public.notifications enable row level security;

-- 10. Drop policies if exist to prevent duplicate errors
drop policy if exists "Users can manage their own resumes" on public.resumes;
drop policy if exists "Users can manage their own documents" on public.documents;
drop policy if exists "Users can manage their own company follows" on public.company_follows;
drop policy if exists "Users can manage their own collections" on public.collections;
drop policy if exists "Users can manage their own collection items" on public.collection_items;
drop policy if exists "Users can manage their own skill profiles" on public.skill_profile;
drop policy if exists "Users can manage their own notifications" on public.notifications;

-- 11. Create new RLS policies
create policy "Users can manage their own resumes" on public.resumes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own documents" on public.documents
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own company follows" on public.company_follows
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own collections" on public.collections
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Collection items RLS policy (checks parent collection user_id)
create policy "Users can manage their own collection items" on public.collection_items
  for all to authenticated using (
    exists (
      select 1 from public.collections
      where public.collections.id = public.collection_items.collection_id
      and public.collections.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.collections
      where public.collections.id = public.collection_items.collection_id
      and public.collections.user_id = auth.uid()
    )
  );

create policy "Users can manage their own skill profiles" on public.skill_profile
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own notifications" on public.notifications
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 12. Create default skill profiles trigger on profile insert
create or replace function public.handle_new_user_skill_profile()
returns trigger as $$
begin
  insert into public.skill_profile (user_id, skills, preferred_roles, preferred_locations)
  values (
    new.id,
    new.skills,
    new.preferred_roles,
    new.preferred_locations
  ) on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_skill_profile on public.profiles;
create trigger on_profile_created_skill_profile
  after insert or update on public.profiles
  for each row execute procedure public.handle_new_user_skill_profile();

-- 13. Initialize Storage Buckets inside storage schema
insert into storage.buckets (id, name, public) 
values ('resumes', 'resumes', false) 
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('documents', 'documents', false) 
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true) 
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('company-logos', 'company-logos', true) 
on conflict (id) do nothing;

-- 14. Storage Bucket Policies
-- resumes bucket policies
drop policy if exists "Allow users to read their own resumes" on storage.objects;
create policy "Allow users to read their own resumes" on storage.objects
  for select to authenticated using (bucket_id = 'resumes' and auth.uid() = owner);

drop policy if exists "Allow users to upload their own resumes" on storage.objects;
create policy "Allow users to upload their own resumes" on storage.objects
  for insert to authenticated with check (bucket_id = 'resumes' and auth.uid() = owner);

drop policy if exists "Allow users to delete their own resumes" on storage.objects;
create policy "Allow users to delete their own resumes" on storage.objects
  for delete to authenticated using (bucket_id = 'resumes' and auth.uid() = owner);

-- documents bucket policies
drop policy if exists "Allow users to read their own documents" on storage.objects;
create policy "Allow users to read their own documents" on storage.objects
  for select to authenticated using (bucket_id = 'documents' and auth.uid() = owner);

drop policy if exists "Allow users to upload their own documents" on storage.objects;
create policy "Allow users to upload their own documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents' and auth.uid() = owner);

drop policy if exists "Allow users to delete their own documents" on storage.objects;
create policy "Allow users to delete their own documents" on storage.objects
  for delete to authenticated using (bucket_id = 'documents' and auth.uid() = owner);

-- avatars bucket policies
drop policy if exists "Allow public read access to avatars" on storage.objects;
create policy "Allow public read access to avatars" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Allow users to upload their own avatar" on storage.objects;
create policy "Allow users to upload their own avatar" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and auth.uid() = owner);

-- company-logos bucket policies
drop policy if exists "Allow public read access to company-logos" on storage.objects;
create policy "Allow public read access to company-logos" on storage.objects
  for select using (bucket_id = 'company-logos');

drop policy if exists "Allow users to upload company logos" on storage.objects;
create policy "Allow users to upload company logos" on storage.objects
  for insert to authenticated with check (bucket_id = 'company-logos');
