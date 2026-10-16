-- ==============================================================================
-- JDS TRADERS FOOTWEAR POS - COMPLETE SUPABASE SETUP SCRIPT
-- ==============================================================================
-- Run this complete script in your Supabase Project -> SQL Editor
-- URL: https://supabase.com/dashboard/project/okfxktqbbpidnmencbye/sql
-- ==============================================================================

-- 1. Create notifications table if it doesn't exist
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  time text default 'Just now',
  unread boolean default true,
  type text default 'general',
  target_tab text default 'dashboard',
  invoice_no text,
  product_id text,
  sale_id text,
  created_at timestamptz default now()
);

-- 2. Create settings table if it doesn't exist
create table if not exists public.settings (
  id text primary key default 'store-settings',
  shop_name text not null default 'JDS Traders',
  tagline text default 'Premium Retail Footwear & Leather Goods',
  phone text default '+91 98401 23456',
  email text default 'support@jdstraders.in',
  address text default 'Shop 14, Commercial Complex, Main Bazaar, Salem - 636001',
  gstin text default '33AAAAA0000A1Z5',
  default_tax_rate numeric(5,2) default 5,
  invoice_prefix text default 'JDS-INV-',
  footer_note text default 'Thank you for shopping at JDS Traders! Exchange within 7 days with original bill and packaging.',
  updated_at timestamptz default now()
);

-- 3. Create store_users table for cashier & staff accountability
create table if not exists public.store_users (
  id text primary key,
  name text not null,
  role text not null default 'Cashier',
  pin text default '1234',
  phone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. Create stock_logs table for inventory accountability trail
create table if not exists public.stock_logs (
  id text primary key,
  product_id text,
  product_name text,
  article_no text,
  size text,
  delta integer default 0,
  reason text,
  note text,
  adjusted_by text default 'JDS Admin',
  created_at timestamptz default now()
);

-- 5. Ensure sales table has accountability columns
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sales') then
    alter table public.sales add column if not exists billed_by text default 'Store Cashier';
    alter table public.sales add column if not exists user_role text default 'Cashier';
  end if;
end $$;

-- 6. Grant schema and table permissions to anon & authenticated
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- 7. Enable Row Level Security (RLS) safely on all tables
do $$
declare
  tbl text;
  tables text[] := array['products', 'product_variants', 'inventory', 'customers', 'sales', 'sale_items', 'payments', 'notifications', 'settings', 'store_users', 'stock_logs'];
begin
  foreach tbl in array tables
  loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = tbl) then
      execute format('alter table public.%I enable row level security', tbl);
      execute format('drop policy if exists %I on public.%I', 'POS public access ' || tbl, tbl);
      execute format('create policy %I on public.%I for all to anon, authenticated using (true) with check (true)', 'POS public access ' || tbl, tbl);
    end if;
  end loop;
end $$;

-- 8. Safe Realtime Publication and Replica Identity
do $$
declare
  tbl text;
  tables text[] := array['products', 'product_variants', 'inventory', 'sales', 'sale_items', 'payments', 'notifications', 'store_users', 'stock_logs'];
begin
  foreach tbl in array tables
  loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = tbl) then
      -- Set replica identity to full
      execute format('alter table public.%I replica identity full', tbl);

      -- Add to publication if not already a member
      if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' 
          and schemaname = 'public' 
          and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end if;
  end loop;
end $$;
