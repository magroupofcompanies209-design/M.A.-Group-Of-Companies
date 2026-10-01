-- ==============================================================================
-- M.A. GROUP OF COMPANIES - SUPABASE PRODUCTS TABLE & STORAGE SETUP
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create the 'products' table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'General',
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Extended ecommerce fields
  slug TEXT,
  sku TEXT,
  brand TEXT,
  category_id TEXT,
  category_name TEXT,
  subcategory_id TEXT,
  subcategory_name TEXT,
  sale_price NUMERIC,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  specifications JSONB DEFAULT '[]'::JSONB,
  warranty TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT DEFAULT 'active',
  rating NUMERIC DEFAULT 5.0,
  review_count INTEGER DEFAULT 1,
  is_featured BOOLEAN DEFAULT FALSE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  is_new_arrival BOOLEAN DEFAULT FALSE,
  is_deal BOOLEAN DEFAULT FALSE,
  data JSONB
);

-- 2. Create index on category, slug, and created_at
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow backend functions / admin to insert, update, and delete products
DROP POLICY IF EXISTS "Admin and Service Role manage products" ON public.products;
CREATE POLICY "Admin and Service Role manage products"
  ON public.products
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 4. Create Public Storage Bucket for Product Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for image uploads
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow product image uploads" ON storage.objects;
CREATE POLICY "Allow product image uploads"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow product image updates" ON storage.objects;
CREATE POLICY "Allow product image updates"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated, service_role
  USING (bucket_id = 'product-images');

-- ==============================================================================
-- 5. Create 'categories' table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin and Service Role manage categories" ON public.categories;
CREATE POLICY "Admin and Service Role manage categories"
  ON public.categories
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- 6. Create 'orders' table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending Verification',
  payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery (COD)',
  payment_status TEXT NOT NULL DEFAULT 'Pending (COD on Delivery)',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and Admin can view orders" ON public.orders;
CREATE POLICY "Public and Admin can view orders"
  ON public.orders
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "Admin and Service Role manage orders" ON public.orders;
CREATE POLICY "Admin and Service Role manage orders"
  ON public.orders
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

