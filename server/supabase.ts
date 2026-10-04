import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Product, Category, Order, StoreSettings, AdminSecuritySettings } from '../src/types/index.ts';

let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

const DB_BUCKET = 'ma-group-database';
let dbBucketVerified = false;

function cleanEnvValue(val?: string): string {
  if (!val) return '';
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getSupabaseUrl(): string {
  const raw = cleanEnvValue(
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    ''
  );
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/+$/, '');
  }
  if (/^[a-z0-9]{15,30}$/i.test(raw)) {
    return `https://${raw}.supabase.co`;
  }
  return `https://${raw.replace(/\/+$/, '')}`;
}

export function getSupabaseAnonKey(): string {
  return cleanEnvValue(
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_PUBLIC_KEY ||
    ''
  );
}

export function getSupabaseServiceRoleKey(): string {
  return cleanEnvValue(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey() || getSupabaseAnonKey();
  return Boolean(url && key && url.startsWith('https://'));
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseInstance) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
    supabaseInstance = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return supabaseInstance;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseAdminInstance) {
    const url = getSupabaseUrl();
    const key = getSupabaseServiceRoleKey() || getSupabaseAnonKey();
    supabaseAdminInstance = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return supabaseAdminInstance;
}

function isTableMissingError(err?: string): boolean {
  if (!err) return false;
  const lower = err.toLowerCase();
  return (
    lower.includes('not found') ||
    lower.includes('schema cache') ||
    lower.includes('could not find the table') ||
    (lower.includes('relation') && lower.includes('does not exist'))
  );
}

// ============================================================================
// SUPABASE CLOUD STORAGE DOCUMENT ENGINE (Automatic Serverless Persistence)
// Ensures 100% permanent Supabase persistence even before SQL tables are created
// ============================================================================

async function ensureCloudDbBucket(): Promise<SupabaseClient | null> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return null;
  if (!dbBucketVerified) {
    try {
      const { data: buckets } = await sb.storage.listBuckets();
      if (buckets) {
        const existing = buckets.find((b) => b.name === DB_BUCKET);
        if (!existing) {
          await sb.storage.createBucket(DB_BUCKET, { public: true });
        } else if (!existing.public) {
          await sb.storage.updateBucket(DB_BUCKET, { public: true });
        }
      }
      dbBucketVerified = true;
    } catch {
      // Ignore if anon key cannot list buckets
    }
  }
  return sb;
}

async function readCloudTable<T>(tableName: string): Promise<T[] | null> {
  const sb = await ensureCloudDbBucket();
  if (!sb) return null;
  try {
    const { data, error } = await sb.storage.from(DB_BUCKET).download(`${tableName}.json`);
    if (error || !data) {
      // Fallback: check product-images/_db/${tableName}.json in case only public bucket exists
      const { data: fbData, error: fbErr } = await sb.storage.from('product-images').download(`_db/${tableName}.json`);
      if (fbErr || !fbData) return null;
      const fbText = await fbData.text();
      const parsed = JSON.parse(fbText);
      return Array.isArray(parsed) ? parsed : null;
    }
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCloudTable<T>(tableName: string, records: T[]): Promise<{ ok: boolean; error?: string }> {
  const sb = await ensureCloudDbBucket();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const payload = Buffer.from(JSON.stringify(records, null, 2), 'utf-8');
    const { error } = await sb.storage.from(DB_BUCKET).upload(`${tableName}.json`, payload, {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true,
    });
    if (error) {
      // Fallback to product-images/_db/${tableName}.json
      const { error: fbErr } = await sb.storage.from('product-images').upload(`_db/${tableName}.json`, payload, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
      if (fbErr) return { ok: false, error: fbErr.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to write to Supabase cloud storage' };
  }
}

export async function seedSupabaseCloudProductsIfNeeded(initialProducts: Product[]): Promise<Product[]> {
  const existing = await fetchAllSupabaseProducts();
  if (existing && existing.length > 0) {
    return existing;
  }
  await writeCloudTable('products', initialProducts);
  return initialProducts;
}

export async function seedSupabaseCloudCategoriesIfNeeded(initialCategories: Category[]): Promise<Category[]> {
  const existing = await fetchAllSupabaseCategories();
  if (existing && existing.length > 0) {
    return existing;
  }
  await writeCloudTable('categories', initialCategories);
  return initialCategories;
}

// ============================================================================
// DATA MAPPING HELPERS (Clean Relational Columns <-> Rich Frontend Types)
// ============================================================================

export function mapSupabaseRowToProduct(row: any): Product {
  if (row && row.categoryId && Array.isArray(row.images) && !row.category_id && !row.data) {
    return row as Product;
  }
  const baseData: Partial<Product> = (row.data && typeof row.data === 'object') ? row.data : {};

  let parsedSpecs: { key: string; value: string }[] = baseData.specifications || [];
  let parsedFeatures: string[] = baseData.features || [];
  let parsedImages: string[] = baseData.images || [];
  let parsedTags: string[] = baseData.tags || [];

  if (row.specifications) {
    if (Array.isArray(row.specifications)) {
      parsedSpecs = row.specifications;
    } else if (typeof row.specifications === 'object') {
      parsedSpecs = Object.entries(row.specifications).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }
  }

  if (Array.isArray(row.features) && row.features.length > 0) {
    parsedFeatures = row.features;
  }

  const primaryImg = row.image_url || row.image || baseData.image_url || baseData.imageUrl || (Array.isArray(baseData.images) && baseData.images[0]) || '';
  if (Array.isArray(row.images) && row.images.length > 0) {
    parsedImages = row.images;
  } else if (primaryImg && (!parsedImages || parsedImages.length === 0)) {
    parsedImages = [primaryImg];
  } else if (primaryImg && parsedImages.length > 0 && parsedImages[0] !== primaryImg) {
    parsedImages = [primaryImg, ...parsedImages.filter((u) => u !== primaryImg)];
  }

  if (Array.isArray(row.tags) && row.tags.length > 0) {
    parsedTags = row.tags;
  }

  const priceNum = row.price !== undefined && row.price !== null ? Number(row.price) : Number(baseData.price || 0);
  const discountPriceNum =
    row.discount_price !== undefined && row.discount_price !== null
      ? Number(row.discount_price)
      : row.sale_price !== undefined && row.sale_price !== null
      ? Number(row.sale_price)
      : baseData.salePrice !== undefined
      ? Number(baseData.salePrice)
      : undefined;

  const stockNum = row.stock !== undefined && row.stock !== null ? Number(row.stock) : Number(baseData.stock ?? 0);

  let statusVal: Product['status'] = baseData.status || 'active';
  if (typeof row.status === 'string' && ['active', 'draft', 'archived', 'inactive'].includes(row.status)) {
    statusVal = row.status as Product['status'];
  } else if (row.is_active === false) {
    statusVal = 'inactive';
  } else if (row.is_active === true && !row.status && !baseData.status) {
    statusVal = 'active';
  }

  const catId = row.category_id || row.categoryId || baseData.categoryId || 'cat-solar';
  const catName = row.category || row.category_name || baseData.categoryName || '';

  return {
    ...baseData,
    id: String(row.id || baseData.id),
    name: row.name || baseData.name || 'Untitled Product',
    slug: row.slug || baseData.slug || String(row.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    sku: row.sku || baseData.sku || `MAG-${String(row.id).slice(-5).toUpperCase()}`,
    categoryId: String(catId),
    categoryName: catName,
    subcategoryId: row.subcategory_id || baseData.subcategoryId,
    subcategoryName: row.subcategory_name || baseData.subcategoryName,
    brand: row.brand || baseData.brand || 'M.A. Group',
    description: row.description ?? baseData.description ?? '',
    shortDescription: row.short_description || baseData.shortDescription || (row.description ? String(row.description).slice(0, 140) : ''),
    specifications: parsedSpecs,
    features: parsedFeatures,
    images: parsedImages,
    image_url: primaryImg || parsedImages[0] || '',
    imageUrl: primaryImg || parsedImages[0] || '',
    price: priceNum,
    salePrice: discountPriceNum,
    costPrice: row.cost_price !== undefined && row.cost_price !== null ? Number(row.cost_price) : baseData.costPrice,
    stock: stockNum,
    lowStockThreshold: Number(row.low_stock_threshold ?? baseData.lowStockThreshold ?? 5),
    warranty: row.warranty || baseData.warranty || 'Official M.A. Group Warranty',
    tags: parsedTags,
    status: statusVal,
    isArchived: Boolean(row.is_archived ?? baseData.isArchived ?? (statusVal === 'archived')),
    isFeatured: row.featured !== undefined && row.featured !== null
      ? Boolean(row.featured)
      : row.is_featured !== undefined && row.is_featured !== null
      ? Boolean(row.is_featured)
      : Boolean(baseData.isFeatured),
    isBestSeller: Boolean(row.is_best_seller ?? baseData.isBestSeller ?? false),
    isNewArrival: Boolean(row.is_new_arrival ?? baseData.isNewArrival ?? false),
    isDeal: Boolean(row.is_deal ?? baseData.isDeal ?? Boolean(discountPriceNum && discountPriceNum < priceNum)),
    rating: Number(row.rating ?? baseData.rating ?? 4.8),
    reviewCount: Number(row.review_count ?? baseData.reviewCount ?? 12),
    createdAt: row.created_at || baseData.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || baseData.updatedAt || new Date().toISOString(),
  };
}

export function mapProductToSupabaseRow(product: Product): Record<string, any> {
  const primaryImage =
    product.image_url ||
    product.imageUrl ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '');

  const normalizedImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : primaryImage
      ? [primaryImage]
      : [];

  const updatedProduct: Product = {
    ...product,
    images: normalizedImages,
    image_url: primaryImage,
    imageUrl: primaryImage,
  };

  return {
    id: updatedProduct.id,
    name: updatedProduct.name,
    slug: updatedProduct.slug,
    sku: updatedProduct.sku,
    brand: updatedProduct.brand,
    category: updatedProduct.categoryName || updatedProduct.categoryId,
    category_id: updatedProduct.categoryId,
    price: Number(updatedProduct.price || 0),
    discount_price: updatedProduct.salePrice !== undefined ? Number(updatedProduct.salePrice) : null,
    stock: Number(updatedProduct.stock ?? 0),
    description: updatedProduct.description || '',
    short_description: updatedProduct.shortDescription || '',
    image_url: primaryImage,
    images: normalizedImages,
    specifications: updatedProduct.specifications || [],
    features: updatedProduct.features || [],
    warranty: updatedProduct.warranty || '',
    is_active: updatedProduct.status !== 'inactive' && updatedProduct.status !== 'archived' && !updatedProduct.isArchived,
    featured: Boolean(updatedProduct.isFeatured),
    is_featured: Boolean(updatedProduct.isFeatured),
    is_best_seller: Boolean(updatedProduct.isBestSeller),
    status: updatedProduct.status || 'active',
    data: updatedProduct,
    updated_at: new Date().toISOString(),
  };
}

export function mapProductToCoreSupabaseRow(product: Product, includeId: boolean = true): Record<string, any> {
  const primaryImage =
    product.image_url ||
    product.imageUrl ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '');

  const row: Record<string, any> = {
    name: product.name || 'Untitled Equipment',
    price: Number(product.price || 0),
    stock: Number(product.stock ?? 0),
    category: product.categoryName || product.categoryId || 'General',
    description: product.description || '',
    image_url: primaryImage || '',
    featured: Boolean(product.isFeatured),
  };
  if (includeId && product.id) {
    row.id = product.id;
  }
  return row;
}

export function mapSupabaseRowToCategory(row: any): Category {
  if (row && row.slug && row.subcategories && !row.image_url && !row.data) {
    return row as Category;
  }
  const baseData: Partial<Category> = (row.data && typeof row.data === 'object') ? row.data : {};
  const idStr = String(row.id || baseData.id || `cat-${Date.now()}`);
  const nameStr = row.name || baseData.name || 'Category';
  return {
    ...baseData,
    id: idStr,
    name: nameStr,
    slug: row.slug || baseData.slug || String(nameStr).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: row.description ?? baseData.description ?? '',
    image: row.image_url || row.image || baseData.image || '',
    iconName: row.icon_name || baseData.iconName || 'Zap',
    displayOrder: Number(row.display_order ?? baseData.displayOrder ?? 0),
    isActive: row.is_active !== undefined && row.is_active !== null ? Boolean(row.is_active) : (baseData.isActive ?? true),
    subcategories: Array.isArray(row.subcategories) ? row.subcategories : (baseData.subcategories || []),
  };
}

export function mapCategoryToSupabaseRow(cat: Category): Record<string, any> {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || '',
    image_url: cat.image || '',
    icon_name: cat.iconName || 'Zap',
    display_order: Number(cat.displayOrder ?? 0),
    is_active: cat.isActive !== false,
    subcategories: cat.subcategories || [],
    data: cat,
  };
}

export function mapSupabaseRowToOrder(row: any): Order {
  if (row && row.orderNumber && row.customer && Array.isArray(row.items) && !row.order_number) {
    return row as Order;
  }
  const baseData: Partial<Order> = (row.data && typeof row.data === 'object') ? row.data : {};
  const createdAt = row.created_at || baseData.createdAt || new Date().toISOString();
  const statusVal = (row.order_status || row.status || baseData.status || 'Pending') as Order['status'];
  const itemsList = Array.isArray(row.items)
    ? row.items
    : Array.isArray(row.products)
    ? row.products
    : baseData.items || [];

  const totalNum = Number(
    row.total_amount ?? row.total_price ?? row.grand_total ?? baseData.grandTotal ?? 0
  );

  return {
    ...baseData,
    id: String(row.id || baseData.id),
    orderNumber: row.order_number || baseData.orderNumber || `MAG-${String(row.id).slice(-4).toUpperCase()}`,
    customer: baseData.customer || {
      fullName: row.customer_name || 'Valued Customer',
      phone: row.phone || '',
      whatsappNumber: row.whatsapp || row.phone || '',
      email: row.email || '',
      addressLine: row.address || '',
      city: row.city || 'Lahore',
      province: row.province || 'Punjab',
      landmark: row.landmark || '',
    },
    items: itemsList,
    subtotal: Number(row.subtotal ?? baseData.subtotal ?? totalNum),
    discount: Number(row.discount ?? baseData.discount ?? 0),
    shippingFee: Number(row.shipping_fee ?? baseData.shippingFee ?? 0),
    grandTotal: totalNum,
    status: statusVal,
    paymentMethod: 'Cash on Delivery',
    paymentStatus: (row.payment_status || baseData.paymentStatus || 'COD Pending') as Order['paymentStatus'],
    couponCode: row.coupon_code || baseData.couponCode,
    trackingNumber: row.tracking_number || baseData.trackingNumber,
    courierName: row.courier_name || baseData.courierName,
    customerNotes: row.notes || baseData.customerNotes,
    internalNotes: baseData.internalNotes,
    timeline: Array.isArray(row.timeline) && row.timeline.length > 0
      ? row.timeline
      : baseData.timeline || [{ status: statusVal, timestamp: createdAt, note: 'Order received via Cash on Delivery' }],
    createdAt,
    updatedAt: row.updated_at || baseData.updatedAt || createdAt,
  };
}

export function mapOrderToSupabaseRow(order: Order): Record<string, any> {
  return {
    id: order.id,
    order_number: order.orderNumber,
    customer_name: order.customer?.fullName || '',
    phone: order.customer?.phone || '',
    whatsapp: order.customer?.whatsappNumber || order.customer?.phone || '',
    email: order.customer?.email || '',
    city: order.customer?.city || '',
    province: order.customer?.province || '',
    address: order.customer?.addressLine || '',
    landmark: order.customer?.landmark || '',
    products: order.items || [],
    items: order.items || [],
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    shipping_fee: Number(order.shippingFee || 0),
    total_amount: Number(order.grandTotal || 0),
    total_price: Number(order.grandTotal || 0),
    payment_method: 'COD',
    payment_status: order.paymentStatus || 'COD Pending',
    order_status: order.status || 'Pending',
    status: order.status || 'Pending',
    notes: order.customerNotes || '',
    tracking_number: order.trackingNumber || '',
    courier_name: order.courierName || '',
    timeline: order.timeline || [],
    data: order,
    created_at: order.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function mapOrderToCoreSupabaseRow(order: Order, includeId: boolean = true): Record<string, any> {
  const row: Record<string, any> = {
    customer_name: order.customer?.fullName || 'Customer',
    phone: order.customer?.phone || '',
    address: `${order.customer?.addressLine || ''}${order.customer?.city ? `, ${order.customer.city}` : ''}`,
    products: order.items || [],
    total_amount: Number(order.grandTotal || 0),
    payment_method: 'COD',
    order_status: order.status || 'Pending',
  };
  if (includeId && order.id) {
    row.id = order.id;
  }
  return row;
}

// ============================================================================
// PRODUCTS CRUD (SQL Table + Automatic Cloud Bucket Persistence)
// ============================================================================

export async function fetchAllSupabaseProducts(): Promise<Product[] | null> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return null;
  try {
    let sqlProducts: Product[] = [];
    const { data, error } = await sb
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      sqlProducts = data.map(mapSupabaseRowToProduct);
    } else if (error && !isTableMissingError(error.message)) {
      console.error('[Server Supabase][Table:products][Op:SELECT] Error:', error.message);
      const { data: fbData, error: fbErr } = await sb.from('products').select('*');
      if (!fbErr && fbData) {
        sqlProducts = fbData.map(mapSupabaseRowToProduct);
      }
    }
    const cloudProducts = await readCloudTable<Product>('products');
    if (sqlProducts.length > 0 || (cloudProducts && cloudProducts.length > 0)) {
      const mergedMap = new Map<string, Product>();
      if (cloudProducts) cloudProducts.forEach((p) => mergedMap.set(p.id, p));
      sqlProducts.forEach((p) => mergedMap.set(p.id, p));
      return Array.from(mergedMap.values());
    }
    return sqlProducts;
  } catch (err: any) {
    console.error('[Server Supabase][Table:products][Op:SELECT] Exception:', err?.message);
    return await readCloudTable<Product>('products');
  }
}

export async function upsertSupabaseProduct(
  product: Product,
  fallbackCurrentList?: Product[]
): Promise<{ ok: boolean; product?: Product; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };

  const primaryImage =
    product.image_url ||
    product.imageUrl ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '');
  const normalizedProduct: Product = {
    ...product,
    image_url: primaryImage,
    imageUrl: primaryImage,
    images: Array.isArray(product.images) && product.images.length > 0 ? product.images : primaryImage ? [primaryImage] : [],
    updatedAt: new Date().toISOString(),
  };

  try {
    const row = mapProductToSupabaseRow(normalizedProduct);
    const { data, error } = await sb.from('products').upsert(row, { onConflict: 'id' }).select('*').maybeSingle();
    if (!error) {
      const saved = data ? mapSupabaseRowToProduct(data) : normalizedProduct;
      // Also mirror to cloud table for backup
      const existingCloud = (await readCloudTable<Product>('products')) || fallbackCurrentList || [];
      const idx = existingCloud.findIndex((p) => p.id === saved.id);
      if (idx > -1) existingCloud[idx] = saved;
      else existingCloud.unshift(saved);
      await writeCloudTable('products', existingCloud);
      return { ok: true, product: saved };
    }

    if (!isTableMissingError(error.message)) {
      const coreWithId = mapProductToCoreSupabaseRow(normalizedProduct, true);
      const { data: fb1Data, error: fb1Err } = await sb.from('products').upsert(coreWithId, { onConflict: 'id' }).select('*').maybeSingle();
      if (!fb1Err) {
        return { ok: true, product: fb1Data ? mapSupabaseRowToProduct(fb1Data) : normalizedProduct };
      }
      const coreWithoutId = mapProductToCoreSupabaseRow(normalizedProduct, false);
      if (normalizedProduct.id) {
        const { data: existingRows } = await sb.from('products').select('id').eq('id', normalizedProduct.id).limit(1);
        if (existingRows && existingRows.length > 0) {
          const { data: updData, error: updErr } = await sb.from('products').update(coreWithoutId).eq('id', normalizedProduct.id).select('*').maybeSingle();
          if (!updErr) {
            return { ok: true, product: updData ? mapSupabaseRowToProduct(updData) : normalizedProduct };
          }
        }
      }
      const { data: insData, error: insErr } = await sb.from('products').insert(coreWithoutId).select('*').maybeSingle();
      if (!insErr) {
        return { ok: true, product: insData ? mapSupabaseRowToProduct(insData) : normalizedProduct };
      }
    }

    // Persist to Supabase Cloud Bucket (`ma-group-database/products.json`)
    const currentList = (await readCloudTable<Product>('products')) || fallbackCurrentList || [];
    const idx = currentList.findIndex((p) => p.id === normalizedProduct.id);
    if (idx > -1) {
      currentList[idx] = normalizedProduct;
    } else {
      currentList.unshift(normalizedProduct);
    }
    const cloudWrite = await writeCloudTable('products', currentList);
    if (!cloudWrite.ok) {
      return { ok: false, error: cloudWrite.error || error.message };
    }
    return { ok: true, product: normalizedProduct };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Unknown Supabase error' };
  }
}

export async function deleteSupabaseProductById(
  id: string,
  fallbackCurrentList?: Product[]
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const { error } = await sb.from('products').delete().eq('id', id);
    if (error && !isTableMissingError(error.message)) {
      return { ok: false, error: error.message };
    }
    const currentList = (await readCloudTable<Product>('products')) || fallbackCurrentList;
    if (currentList) {
      const filtered = currentList.filter((p) => p.id !== id);
      const cloudWrite = await writeCloudTable('products', filtered);
      if (!cloudWrite.ok && error) {
        return { ok: false, error: cloudWrite.error };
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete product' };
  }
}

// ============================================================================
// CATEGORIES CRUD (SQL Table + Automatic Cloud Bucket Persistence)
// ============================================================================

export async function fetchAllSupabaseCategories(): Promise<Category[] | null> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return null;
  try {
    let sqlCats: Category[] = [];
    const { data, error } = await sb
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      sqlCats = data.map(mapSupabaseRowToCategory);
    } else if (error && !isTableMissingError(error.message)) {
      console.error('[Server Supabase][Table:categories][Op:SELECT] Error:', error.message);
      const { data: fallbackData, error: fallbackErr } = await sb.from('categories').select('*');
      if (!fallbackErr && fallbackData) {
        sqlCats = fallbackData.map(mapSupabaseRowToCategory);
      }
    }
    const cloudCats = await readCloudTable<Category>('categories');
    if (sqlCats.length > 0 || (cloudCats && cloudCats.length > 0)) {
      const mergedMap = new Map<string, Category>();
      if (cloudCats) cloudCats.forEach((c) => mergedMap.set(c.id, c));
      sqlCats.forEach((c) => mergedMap.set(c.id, c));
      return Array.from(mergedMap.values());
    }
    return sqlCats;
  } catch (err: any) {
    console.error('[Server Supabase][Table:categories][Op:SELECT] Exception:', err?.message);
    return await readCloudTable<Category>('categories');
  }
}

export async function upsertSupabaseCategory(
  category: Category,
  fallbackCurrentList?: Category[]
): Promise<{ ok: boolean; category?: Category; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const row = mapCategoryToSupabaseRow(category);
    const { data, error } = await sb.from('categories').upsert(row, { onConflict: 'id' }).select('*').maybeSingle();
    if (!error) {
      const saved = data ? mapSupabaseRowToCategory(data) : category;
      const existingCloud = (await readCloudTable<Category>('categories')) || fallbackCurrentList || [];
      const idx = existingCloud.findIndex((c) => c.id === saved.id);
      if (idx > -1) existingCloud[idx] = saved;
      else existingCloud.push(saved);
      await writeCloudTable('categories', existingCloud);
      return { ok: true, category: saved };
    }

    if (!isTableMissingError(error.message)) {
      const minimalWithId = {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || '',
      };
      const { data: fb1Data, error: fb1Err } = await sb.from('categories').upsert(minimalWithId, { onConflict: 'id' }).select('*').maybeSingle();
      if (!fb1Err) {
        return { ok: true, category: fb1Data ? { ...category, ...mapSupabaseRowToCategory(fb1Data), image: category.image || fb1Data.image_url || '' } : category };
      }
    }

    const currentList = (await readCloudTable<Category>('categories')) || fallbackCurrentList || [];
    const idx = currentList.findIndex((c) => c.id === category.id);
    if (idx > -1) currentList[idx] = category;
    else currentList.push(category);
    const cloudWrite = await writeCloudTable('categories', currentList);
    if (!cloudWrite.ok) {
      return { ok: false, error: cloudWrite.error || error.message };
    }
    return { ok: true, category };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to save category' };
  }
}

export async function deleteSupabaseCategoryById(
  id: string,
  fallbackCurrentList?: Category[]
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const { error } = await sb.from('categories').delete().eq('id', id);
    if (error && !isTableMissingError(error.message)) {
      return { ok: false, error: error.message };
    }
    const currentList = (await readCloudTable<Category>('categories')) || fallbackCurrentList;
    if (currentList) {
      const filtered = currentList.filter((c) => c.id !== id);
      const cloudWrite = await writeCloudTable('categories', filtered);
      if (!cloudWrite.ok && error) {
        return { ok: false, error: cloudWrite.error };
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete category' };
  }
}

// ============================================================================
// ORDERS CRUD (SQL Table + Automatic Cloud Bucket Persistence)
// ============================================================================

export async function fetchAllSupabaseOrders(): Promise<Order[] | null> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return null;
  try {
    let sqlOrders: Order[] = [];
    const { data, error } = await sb
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      sqlOrders = data.map(mapSupabaseRowToOrder);
    } else if (error && !isTableMissingError(error.message)) {
      console.error('[Server Supabase][Table:orders][Op:SELECT] Error:', error.message);
      const { data: fallbackData, error: fallbackErr } = await sb.from('orders').select('*');
      if (!fallbackErr && fallbackData) {
        sqlOrders = fallbackData.map(mapSupabaseRowToOrder);
      }
    }
    const cloudOrders = await readCloudTable<Order>('orders');
    if (sqlOrders.length > 0 || (cloudOrders && cloudOrders.length > 0)) {
      const mergedMap = new Map<string, Order>();
      if (cloudOrders) cloudOrders.forEach((o) => mergedMap.set(o.id, o));
      sqlOrders.forEach((o) => mergedMap.set(o.id, o));
      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return sqlOrders;
  } catch (err: any) {
    console.error('[Server Supabase][Table:orders][Op:SELECT] Exception:', err?.message);
    return await readCloudTable<Order>('orders');
  }
}

export async function upsertSupabaseOrder(
  order: Order,
  fallbackCurrentList?: Order[]
): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const row = mapOrderToSupabaseRow(order);
    const { data, error } = await sb.from('orders').upsert(row, { onConflict: 'id' }).select('*').maybeSingle();
    if (!error) {
      const saved = data ? mapSupabaseRowToOrder(data) : order;
      const existingCloud = (await readCloudTable<Order>('orders')) || fallbackCurrentList || [];
      const idx = existingCloud.findIndex((o) => o.id === saved.id);
      if (idx > -1) existingCloud[idx] = saved;
      else existingCloud.unshift(saved);
      await writeCloudTable('orders', existingCloud);
      return { ok: true, order: saved };
    }

    if (!isTableMissingError(error.message)) {
      const coreWithId = mapOrderToCoreSupabaseRow(order, true);
      const { data: fb1Data, error: fb1Err } = await sb.from('orders').upsert(coreWithId, { onConflict: 'id' }).select('*').maybeSingle();
      if (!fb1Err) {
        return { ok: true, order: fb1Data ? mapSupabaseRowToOrder(fb1Data) : order };
      }
    }

    const currentList = (await readCloudTable<Order>('orders')) || fallbackCurrentList || [];
    const idx = currentList.findIndex((o) => o.id === order.id);
    if (idx > -1) currentList[idx] = order;
    else currentList.unshift(order);
    const cloudWrite = await writeCloudTable('orders', currentList);
    if (!cloudWrite.ok) {
      return { ok: false, error: cloudWrite.error || error.message };
    }
    return { ok: true, order };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to save order' };
  }
}

export async function deleteSupabaseOrderById(
  id: string,
  fallbackCurrentList?: Order[]
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const { error } = await sb.from('orders').delete().eq('id', id);
    if (error && !isTableMissingError(error.message)) {
      return { ok: false, error: error.message };
    }
    const currentList = (await readCloudTable<Order>('orders')) || fallbackCurrentList;
    if (currentList) {
      const filtered = currentList.filter((o) => o.id !== id);
      const cloudWrite = await writeCloudTable('orders', filtered);
      if (!cloudWrite.ok && error) {
        return { ok: false, error: cloudWrite.error };
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete order' };
  }
}

export async function fetchSupabaseTableData<T>(tableName: string): Promise<T[] | null> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from(tableName).select('*');
    if (!error && data) {
      return data.map((row: any) => (row.data && typeof row.data === 'object' ? { ...row.data, id: row.id } : row)) as T[];
    }
    return await readCloudTable<T>(tableName);
  } catch {
    return await readCloudTable<T>(tableName);
  }
}

export async function upsertSupabaseGenericRow(tableName: string, id: string, item: any): Promise<boolean> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from(tableName).upsert({ id, data: item });
    if (!error) {
      await writeCloudTable(tableName, [{ id, ...item }]);
      return true;
    }
    const cloudRes = await writeCloudTable(tableName, [{ id, ...item }]);
    return cloudRes.ok;
  } catch {
    return false;
  }
}

export async function deleteSupabaseGenericRow(tableName: string, id: string): Promise<boolean> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from(tableName).delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function uploadImageToSupabaseStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  bucketName: string = 'product-images'
): Promise<{ ok: boolean; publicUrl?: string; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) {
    return { ok: false, error: 'Supabase client is not configured' };
  }

  try {
    const { data: buckets } = await sb.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === bucketName);
    if (!bucketExists) {
      await sb.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 8388608, // 8MB
      });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `uploads/${Date.now()}-${safeName}`;

    const { error: uploadError } = await sb.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Supabase Storage] Upload error:', uploadError.message);
      return { ok: false, error: uploadError.message };
    }

    const { data: publicUrlData } = sb.storage.from(bucketName).getPublicUrl(storagePath);
    return {
      ok: true,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (err: any) {
    console.error('[Supabase Storage] Exception:', err);
    return { ok: false, error: err?.message || 'Storage upload failed' };
  }
}

export async function deleteImageFromSupabaseStorage(
  imageUrl: string,
  bucketName: string = 'product-images'
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase client is not configured' };

  try {
    const marker = `/${bucketName}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return { ok: true };
    const storagePath = imageUrl.slice(idx + marker.length);
    if (!storagePath) return { ok: true };

    const { error } = await sb.storage.from(bucketName).remove([storagePath]);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete image' };
  }
}

/**
 * Unified Supabase Service singleton used by server/app.ts
 */
export const supabaseService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  getStatus() {
    return {
      configured: isSupabaseConfigured(),
      url: getSupabaseUrl() ? 'Connected' : 'Not Configured',
      hasAnonKey: Boolean(getSupabaseAnonKey()),
      hasServiceRoleKey: Boolean(getSupabaseServiceRoleKey()),
      storageBucket: 'product-images',
      cloudDatabaseBucket: DB_BUCKET,
    };
  },

  async getProducts(_fallbackSeed?: Product[]): Promise<Product[] | null> {
    return await fetchAllSupabaseProducts();
  },

  async insertProduct(product: Product, fallbackCurrentList?: Product[]): Promise<{ success: boolean; data?: Product; error?: string; tableMissing?: boolean }> {
    const res = await upsertSupabaseProduct(product, fallbackCurrentList);
    return {
      success: res.ok,
      data: res.product || product,
      error: res.error,
      tableMissing: false,
    };
  },

  async updateProduct(id: string, updates: Partial<Product>, existingProduct?: Product, fallbackCurrentList?: Product[]): Promise<{ success: boolean; data?: Product; error?: string; tableMissing?: boolean }> {
    const sb = getSupabaseAdmin() || getSupabase();
    if (!sb) return { success: false, error: 'Supabase not configured' };

    let base: Product | undefined = existingProduct;
    if (!base) {
      const all = await fetchAllSupabaseProducts();
      if (all) {
        base = all.find((p) => p.id === id);
      }
    }

    if (!base) {
      return { success: false, error: `Product ${id} not found in Supabase.` };
    }

    const merged: Product = {
      ...base,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (updates.image_url || updates.imageUrl) {
      const u = updates.image_url || updates.imageUrl || '';
      merged.image_url = u;
      merged.imageUrl = u;
      if (!Array.isArray(merged.images) || merged.images.length === 0) {
        merged.images = [u];
      } else if (merged.images[0] !== u) {
        merged.images = [u, ...merged.images.filter((img) => img !== u)];
      }
    } else if (Array.isArray(updates.images) && updates.images.length > 0) {
      merged.image_url = updates.images[0];
      merged.imageUrl = updates.images[0];
    }

    const res = await upsertSupabaseProduct(merged, fallbackCurrentList);
    return {
      success: res.ok,
      data: res.product || merged,
      error: res.error,
      tableMissing: false,
    };
  },

  async deleteProduct(id: string, fallbackCurrentList?: Product[]): Promise<{ success: boolean; error?: string; tableMissing?: boolean }> {
    const res = await deleteSupabaseProductById(id, fallbackCurrentList);
    return {
      success: res.ok,
      error: res.error,
      tableMissing: false,
    };
  },

  async getCategories(_fallbackSeed?: Category[]): Promise<Category[] | null> {
    return await fetchAllSupabaseCategories();
  },

  async insertCategory(category: Category, fallbackCurrentList?: Category[]): Promise<{ success: boolean; data?: Category; error?: string; tableMissing?: boolean }> {
    const res = await upsertSupabaseCategory(category, fallbackCurrentList);
    return {
      success: res.ok,
      data: res.category || category,
      error: res.error,
      tableMissing: false,
    };
  },

  async updateCategory(id: string, updates: Partial<Category>, existingCategory?: Category, fallbackCurrentList?: Category[]): Promise<{ success: boolean; data?: Category; error?: string; tableMissing?: boolean }> {
    const sb = getSupabaseAdmin() || getSupabase();
    if (!sb) return { success: false, error: 'Supabase not configured' };

    let base: Category | undefined = existingCategory;
    if (!base) {
      const all = await fetchAllSupabaseCategories();
      if (all) {
        base = all.find((c) => c.id === id);
      }
    }

    if (!base) {
      return { success: false, error: `Category ${id} not found in Supabase.` };
    }

    const merged: Category = {
      ...base,
      ...updates,
      id,
    };

    const res = await upsertSupabaseCategory(merged, fallbackCurrentList);
    return {
      success: res.ok,
      data: res.category || merged,
      error: res.error,
      tableMissing: false,
    };
  },

  async deleteCategory(id: string, fallbackCurrentList?: Category[]): Promise<{ success: boolean; error?: string; tableMissing?: boolean }> {
    const res = await deleteSupabaseCategoryById(id, fallbackCurrentList);
    return {
      success: res.ok,
      error: res.error,
      tableMissing: false,
    };
  },

  async getOrders(_fallbackSeed?: Order[]): Promise<Order[] | null> {
    return await fetchAllSupabaseOrders();
  },

  async insertOrder(order: Order, fallbackCurrentList?: Order[]): Promise<{ success: boolean; data?: Order; error?: string; tableMissing?: boolean }> {
    const res = await upsertSupabaseOrder(order, fallbackCurrentList);
    return {
      success: res.ok,
      data: res.order || order,
      error: res.error,
      tableMissing: false,
    };
  },

  async updateOrder(id: string, updates: Partial<Order>, existingOrder?: Order, fallbackCurrentList?: Order[]): Promise<{ success: boolean; data?: Order; error?: string; tableMissing?: boolean }> {
    const sb = getSupabaseAdmin() || getSupabase();
    if (!sb) return { success: false, error: 'Supabase not configured' };

    let base: Order | undefined = existingOrder;
    if (!base) {
      const all = await fetchAllSupabaseOrders();
      if (all) {
        base = all.find((o) => o.id === id || o.orderNumber.toLowerCase() === id.toLowerCase());
      }
    }

    if (!base) {
      return { success: false, error: 'Order not found in Supabase' };
    }

    const merged: Order = {
      ...base,
      ...updates,
      id: base.id,
      updatedAt: new Date().toISOString(),
    };

    const res = await upsertSupabaseOrder(merged, fallbackCurrentList);
    return {
      success: res.ok,
      data: res.order || merged,
      error: res.error,
      tableMissing: false,
    };
  },

  async deleteOrder(id: string, fallbackCurrentList?: Order[]): Promise<{ success: boolean; error?: string; tableMissing?: boolean }> {
    const res = await deleteSupabaseOrderById(id, fallbackCurrentList);
    return {
      success: res.ok,
      error: res.error,
      tableMissing: false,
    };
  },

  async getSettings(): Promise<Partial<StoreSettings> | null> {
    const rows = await fetchSupabaseTableData<any>('store_settings');
    if (rows && rows.length > 0) {
      const main = rows.find((r: any) => r.id === 'default') || rows[0];
      if (main) {
        const { id, ...rest } = main;
        return rest;
      }
    }
    return null;
  },

  async saveSettings(settings: StoreSettings): Promise<boolean> {
    return upsertSupabaseGenericRow('store_settings', 'default', settings);
  },

  async getSecuritySettings(): Promise<Partial<AdminSecuritySettings> | null> {
    const rows = await fetchSupabaseTableData<any>('security_settings');
    if (rows && rows.length > 0) {
      const main = rows.find((r: any) => r.id === 'default') || rows[0];
      if (main) {
        const { id, ...rest } = main;
        return rest;
      }
    }
    return null;
  },

  async saveSecuritySettings(security: AdminSecuritySettings): Promise<boolean> {
    return upsertSupabaseGenericRow('security_settings', 'default', security);
  },

  async uploadImage(buffer: Buffer, filename: string, mimeType: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const res = await uploadImageToSupabaseStorage(buffer, filename, mimeType, 'product-images');
    return {
      success: res.ok,
      url: res.publicUrl,
      error: res.error,
    };
  },

  async deleteImage(url: string): Promise<{ success: boolean; error?: string }> {
    const res = await deleteImageFromSupabaseStorage(url, 'product-images');
    return {
      success: res.ok,
      error: res.error,
    };
  },
};
