-- Create lead_magnet_library table
create table if not exists public.lead_magnet_library (
  id uuid primary key default gen_random_uuid(),
  library_id integer unique, -- from CSV (1-108)
  title text not null,
  description text,
  url text not null,
  category text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_active boolean default true,
  client_id uuid references public.clients(id) on delete cascade
);

-- Create index for search and filtering
create index if not exists idx_lead_magnet_library_title on public.lead_magnet_library(title);
create index if not exists idx_lead_magnet_library_category on public.lead_magnet_library(category);
create index if not exists idx_lead_magnet_library_is_active on public.lead_magnet_library(is_active);
create index if not exists idx_lead_magnet_library_client_id on public.lead_magnet_library(client_id);

-- Enable RLS
alter table public.lead_magnet_library enable row level security;

-- RLS policy: Users can view library magnets for their client
create policy "Users can view library magnets for their client"
  on public.lead_magnet_library
  for select
  using (
    client_id = (
      select client_id from public.users where id = auth.uid()
    )
    or client_id is null -- Allow global library access
  );

-- RLS policy: Admins can update library magnets
create policy "Admins can update library magnets"
  on public.lead_magnet_library
  for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role = 'admin'
      and client_id = lead_magnet_library.client_id
    )
  );

-- RLS policy: Admins can delete library magnets
create policy "Admins can delete library magnets"
  on public.lead_magnet_library
  for delete
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role = 'admin'
      and client_id = lead_magnet_library.client_id
    )
  );

-- RLS policy: Admins can insert library magnets
create policy "Admins can insert library magnets"
  on public.lead_magnet_library
  for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role = 'admin'
      and client_id = lead_magnet_library.client_id
    )
  );
