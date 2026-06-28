-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  university text not null,
  degree text not null,
  graduation_year integer not null,
  skills text[] default '{}'::text[] not null,
  preferred_roles text[] default '{}'::text[] not null,
  preferred_locations text[] default '{}'::text[] not null,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  resume_url text,
  profile_picture_url text,
  onboarded boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Drop existing policies if they exist to avoid duplication errors
drop policy if exists "Public profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

-- RLS Policies
create policy "Public profiles are viewable by authenticated users" 
  on public.profiles for select 
  to authenticated 
  using (true);

create policy "Users can update their own profile" 
  on public.profiles for update 
  to authenticated 
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile" 
  on public.profiles for insert 
  to authenticated 
  with check (auth.uid() = id);

-- Automatic profile creation on signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, university, degree, graduation_year, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'university', ''),
    coalesce(new.raw_user_meta_data->>'degree', ''),
    coalesce(cast(new.raw_user_meta_data->>'graduation_year' as integer), 2028),
    false
  );
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
