-- ==============================================================================
-- JDS TRADERS FOOTWEAR POS - SUPABASE REALTIME & DATABASE SCHEMA
-- ==============================================================================
-- Run this SQL in your Supabase Project Dashboard -> SQL Editor
-- URL: https://supabase.com/dashboard/project/okfxktqbbpidnmencbye/sql
-- ==============================================================================

-- 1. Ensure all core tables exist
create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text not null,
  category text not null,
  article_no text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_variants (
  id text primary key,
  product_id text references public.products(id) on delete cascade,
  size text not null,
  color text default 'Standard',
  sku text,
  barcode text,
  selling_price numeric(10,2) not null,
  cost_price numeric(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.inventory (
  variant_id text primary key references public.product_variants(id) on delete cascade,
  quantity integer not null default 0,
  reorder_level integer not null default 3,
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id text primary key,
  name text not null,
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales (
  id text primary key,
  invoice_no text not null unique,
  customer_id text references public.customers(id) on delete set null,
  customer_name text default 'Walk-in Customer',
  customer_phone text,
  subtotal numeric(10,2) not null default 0,
  discount_amount numeric(10,2) default 0,
  tax_amount numeric(10,2) default 0,
  tax_rate numeric(5,2) default 5,
  total numeric(10,2) not null default 0,
  payment_method text not null default 'Cash',
  payment_split jsonb,
  status text not null default 'Completed',
  notes text default 'Over-the-counter sale',
  created_at timestamptz default now()
);

create table if not exists public.sale_items (
  id text primary key default ('item-' || gen_random_uuid()),
  sale_id text references public.sales(id) on delete cascade,
  variant_id text references public.product_variants(id) on delete set null,
  product_name text,
  article_no text,
  brand text,
  size text,
  color text,
  unit_price numeric(10,2) not null default 0,
  cost_price numeric(10,2) default 0,
  quantity integer not null default 1,
  discount_amount numeric(10,2) default 0,
  line_total numeric(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id text primary key default ('pay-' || gen_random_uuid()),
  sale_id text references public.sales(id) on delete cascade,
  method text not null,
  amount numeric(10,2) not null,
  status text not null default 'Success',
  created_at timestamptz default now()
);

-- Real-time Store Notifications Table
create table if not exists public.notifications (
  id text primary key default ('notif-' || gen_random_uuid()),
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

-- Store Settings Table
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

-- ==============================================================================
-- 2. Grant Permissions to anon & authenticated roles for POS client
-- ==============================================================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- ==============================================================================
-- 3. Row Level Security (RLS) - Permissive Policies for Retail POS Counter
-- ==============================================================================
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

-- Drop any existing restrictive policies before recreating
drop policy if exists "POS public access products" on public.products;
drop policy if exists "POS public access product_variants" on public.product_variants;
drop policy if exists "POS public access inventory" on public.inventory;
drop policy if exists "POS public access customers" on public.customers;
drop policy if exists "POS public access sales" on public.sales;
drop policy if exists "POS public access sale_items" on public.sale_items;
drop policy if exists "POS public access payments" on public.payments;
drop policy if exists "POS public access notifications" on public.notifications;
drop policy if exists "POS public access settings" on public.settings;

create policy "POS public access products" on public.products for all to anon, authenticated using (true) with check (true);
create policy "POS public access product_variants" on public.product_variants for all to anon, authenticated using (true) with check (true);
create policy "POS public access inventory" on public.inventory for all to anon, authenticated using (true) with check (true);
create policy "POS public access customers" on public.customers for all to anon, authenticated using (true) with check (true);
create policy "POS public access sales" on public.sales for all to anon, authenticated using (true) with check (true);
create policy "POS public access sale_items" on public.sale_items for all to anon, authenticated using (true) with check (true);
create policy "POS public access payments" on public.payments for all to anon, authenticated using (true) with check (true);
create policy "POS public access notifications" on public.notifications for all to anon, authenticated using (true) with check (true);
create policy "POS public access settings" on public.settings for all to anon, authenticated using (true) with check (true);

-- ==============================================================================
-- 4. Enable Supabase Realtime for Multi-Terminal Synchronization
-- ==============================================================================
do $$
declare
  tbl text;
  tables text[] := array['products', 'product_variants', 'inventory', 'sales', 'sale_items', 'payments', 'notifications'];
begin
  foreach tbl in array tables
  loop
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' 
        and schemaname = 'public' 
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- Set replica identity to full so real-time broadcast contains complete row states
alter table public.products replica identity full;
alter table public.product_variants replica identity full;
alter table public.inventory replica identity full;
alter table public.sales replica identity full;
alter table public.sale_items replica identity full;
alter table public.payments replica identity full;
alter table public.notifications replica identity full;
