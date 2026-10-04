-- ============================================================================
-- M.A. GROUP OF COMPANIES - SUPABASE DATABASE & STORAGE SCHEMA
-- Run this SQL in your Supabase Project -> SQL Editor
-- ============================================================================

-- 1. PRODUCTS TABLE
create table if not exists public.products (
  id text primary key,
  name text not null,
  slug text,
  sku text,
  brand text,
  category text not null default 'General',
  category_id text,
  price numeric not null default 0,
  discount_price numeric,
  stock integer not null default 0,
  description text default '',
  short_description text default '',
  image_url text default '',
  images jsonb default '[]'::jsonb,
  specifications jsonb default '[]'::jsonb,
  features jsonb default '[]'::jsonb,
  warranty text default '',
  is_active boolean default true,
  featured boolean default false,
  is_featured boolean default false,
  is_best_seller boolean default false,
  status text default 'active',
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. CATEGORIES TABLE
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text,
  description text,
  image_url text,
  icon_name text default 'Zap',
  display_order integer default 0,
  is_active boolean default true,
  subcategories jsonb default '[]'::jsonb,
  data jsonb,
  created_at timestamptz default now()
);

-- 3. ORDERS TABLE (Cash on Delivery)
create table if not exists public.orders (
  id text primary key,
  order_number text,
  customer_name text not null,
  phone text not null,
  whatsapp text,
  email text,
  city text,
  province text,
  address text not null,
  landmark text,
  products jsonb not null default '[]'::jsonb,
  items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  discount numeric default 0,
  shipping_fee numeric default 0,
  total_amount numeric not null default 0,
  total_price numeric default 0,
  payment_method text default 'COD',
  payment_status text default 'COD Pending',
  order_status text default 'Pending',
  status text default 'Pending',
  notes text,
  tracking_number text,
  courier_name text,
  timeline jsonb default '[]'::jsonb,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. STORE SETTINGS & RECEIPT LOGO TABLE
create table if not exists public.store_settings (
  id text primary key default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 5. SECURITY SETTINGS TABLE
create table if not exists public.security_settings (
  id text primary key default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Note: Server-side Admin operations use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- while public anon browser requests are strictly restricted by these policies:
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.orders enable row level security;
alter table public.store_settings enable row level security;
alter table public.security_settings enable row level security;

-- Public customers can read products & categories
drop policy if exists "Public can view products" on public.products;
create policy "Public can view products" on public.products for select using (true);

drop policy if exists "Public can view categories" on public.categories;
create policy "Public can view categories" on public.categories for select using (true);

-- Public customers can create orders
drop policy if exists "Customers can create orders" on public.orders;
create policy "Customers can create orders" on public.orders for insert with check (true);

-- Public can read store_settings
drop policy if exists "Public can view store settings" on public.store_settings;
create policy "Public can view store settings" on public.store_settings for select using (true);

-- 7. SUPABASE STORAGE BUCKET FOR PRODUCT, CATEGORY & RECEIPT LOGO IMAGES
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access to Product Images" on storage.objects;
create policy "Public Access to Product Images"
on storage.objects for select
using ( bucket_id = 'product-images' );

drop policy if exists "Allow Image Uploads to Product Images" on storage.objects;
create policy "Allow Image Uploads to Product Images"
on storage.objects for insert
with check ( bucket_id = 'product-images' );

drop policy if exists "Allow Image Updates in Product Images" on storage.objects;
create policy "Allow Image Updates in Product Images"
on storage.objects for update
using ( bucket_id = 'product-images' );

drop policy if exists "Allow Image Deletes from Product Images" on storage.objects;
create policy "Allow Image Deletes from Product Images"
on storage.objects for delete
using ( bucket_id = 'product-images' );
