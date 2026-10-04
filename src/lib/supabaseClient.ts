import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Product, Category, Order } from '../types/index';

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
  ''
)
  .trim()
  .replace(/\/+$/, '');

const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isFrontendSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://')
);

export const supabaseProjectId = supabaseUrl
  ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0]
  : 'not-configured';

export const supabase: SupabaseClient | null = isFrontendSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const CLOUD_DB_BUCKET = 'ma-group-database';
const PUBLIC_IMAGES_BUCKET = 'product-images';

// Track whether relational SQL tables exist in PostgREST schema cache to avoid noisy 404 requests
const sqlTableAvailability: Record<string, boolean> = {};

function logSupabaseOp(
  table: string,
  operation: string,
  status: 'OK' | 'ERROR' | 'CLOUD_DB',
  details?: string
) {
  const prefix = `[Supabase][Project:${supabaseProjectId}][Table:${table}][Op:${operation}]`;
  if (status === 'ERROR') {
    console.warn(`${prefix} ${details || 'Operation error'}`);
  } else {
    console.info(`${prefix} ${status}${details ? ` — ${details}` : ''}`);
  }
}

function isTableOrSchemaMissingError(err?: string): boolean {
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
// ROW <-> ENTITY MAPPERS (Exact parity with server/supabase.ts)
// ============================================================================

export function mapSupabaseRowToProduct(row: any): Product {
  if (row && row.categoryId && Array.isArray(row.images) && !row.category_id && !row.data) {
    return row as Product;
  }
  const baseData: Partial<Product> = row.data && typeof row.data === 'object' ? row.data : {};

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

  const primaryImg =
    row.image_url ||
    row.image ||
    baseData.image_url ||
    baseData.imageUrl ||
    (Array.isArray(baseData.images) && baseData.images[0]) ||
    '';

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

  const priceNum =
    row.price !== undefined && row.price !== null ? Number(row.price) : Number(baseData.price || 0);
  const discountPriceNum =
    row.discount_price !== undefined && row.discount_price !== null
      ? Number(row.discount_price)
      : row.sale_price !== undefined && row.sale_price !== null
      ? Number(row.sale_price)
      : baseData.salePrice !== undefined
      ? Number(baseData.salePrice)
      : undefined;

  const stockNum =
    row.stock !== undefined && row.stock !== null ? Number(row.stock) : Number(baseData.stock ?? 0);

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
    slug:
      row.slug ||
      baseData.slug ||
      String(row.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
    sku: row.sku || baseData.sku || `MAG-${String(row.id).slice(-5).toUpperCase()}`,
    categoryId: String(catId),
    categoryName: catName,
    subcategoryId: row.subcategory_id || baseData.subcategoryId,
    subcategoryName: row.subcategory_name || baseData.subcategoryName,
    brand: row.brand || baseData.brand || 'M.A. Group',
    description: row.description ?? baseData.description ?? '',
    shortDescription:
      row.short_description ||
      baseData.shortDescription ||
      (row.description ? String(row.description).slice(0, 140) : ''),
    specifications: parsedSpecs,
    features: parsedFeatures,
    images:
      parsedImages.length > 0
        ? parsedImages
        : ['https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80'],
    image_url: primaryImg || parsedImages[0] || '',
    imageUrl: primaryImg || parsedImages[0] || '',
    price: priceNum,
    salePrice: discountPriceNum,
    costPrice:
      row.cost_price !== undefined && row.cost_price !== null
        ? Number(row.cost_price)
        : baseData.costPrice,
    stock: stockNum,
    lowStockThreshold: Number(row.low_stock_threshold ?? baseData.lowStockThreshold ?? 5),
    warranty: row.warranty || baseData.warranty || 'Official M.A. Group Warranty',
    tags: parsedTags,
    status: statusVal,
    isArchived: Boolean(row.is_archived ?? baseData.isArchived ?? statusVal === 'archived'),
    isFeatured:
      row.featured !== undefined && row.featured !== null
        ? Boolean(row.featured)
        : row.is_featured !== undefined && row.is_featured !== null
        ? Boolean(row.is_featured)
        : Boolean(baseData.isFeatured),
    isBestSeller: Boolean(row.is_best_seller ?? baseData.isBestSeller ?? false),
    isNewArrival: Boolean(row.is_new_arrival ?? baseData.isNewArrival ?? false),
    isDeal: Boolean(
      row.is_deal ?? baseData.isDeal ?? Boolean(discountPriceNum && discountPriceNum < priceNum)
    ),
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
    is_active:
      updatedProduct.status !== 'inactive' &&
      updatedProduct.status !== 'archived' &&
      !updatedProduct.isArchived,
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
  const baseData: Partial<Category> = row.data && typeof row.data === 'object' ? row.data : {};
  const idStr = String(row.id || baseData.id || `cat-${Date.now()}`);
  const nameStr = row.name || baseData.name || 'Category';
  return {
    ...baseData,
    id: idStr,
    name: nameStr,
    slug:
      row.slug ||
      baseData.slug ||
      String(nameStr)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
    description: row.description ?? baseData.description ?? '',
    image: row.image_url || row.image || baseData.image || '',
    iconName: row.icon_name || baseData.iconName || 'Zap',
    displayOrder: Number(row.display_order ?? baseData.displayOrder ?? 0),
    isActive:
      row.is_active !== undefined && row.is_active !== null
        ? Boolean(row.is_active)
        : baseData.isActive ?? true,
    subcategories: Array.isArray(row.subcategories)
      ? row.subcategories
      : baseData.subcategories || [],
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
  const baseData: Partial<Order> = row.data && typeof row.data === 'object' ? row.data : {};
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
    orderNumber:
      row.order_number || baseData.orderNumber || `MAG-${String(row.id).slice(-4).toUpperCase()}`,
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
    timeline:
      Array.isArray(row.timeline) && row.timeline.length > 0
        ? row.timeline
        : baseData.timeline || [
            { status: statusVal, timestamp: createdAt, note: 'Order received via Cash on Delivery' },
          ],
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
// SUPABASE CLOUD TABLE ENGINE (Public URL + Authenticated Storage Support)
// ============================================================================

async function readCloudTableFromSupabase<T>(tableName: string): Promise<T[] | null> {
  // 1. Direct public URL read with cache-buster (works with anon key even without storage RLS policies)
  if (supabaseUrl) {
    try {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${CLOUD_DB_BUCKET}/${tableName}.json?_t=${Date.now()}`;
      const res = await fetch(publicUrl, { cache: 'no-store' });
      if (res.ok) {
        const parsed = await res.json();
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fall through to SDK download
    }
  }

  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage
      .from(CLOUD_DB_BUCKET)
      .download(`${tableName}.json`);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    }
    const { data: fbData, error: fbErr } = await supabase.storage
      .from(PUBLIC_IMAGES_BUCKET)
      .download(`_db/${tableName}.json`);
    if (!fbErr && fbData) {
      const fbText = await fbData.text();
      const parsed = JSON.parse(fbText);
      if (Array.isArray(parsed)) return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCloudTableToSupabase<T>(
  tableName: string,
  records: T[]
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase client is not initialized' };
  try {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const { error } = await supabase.storage.from(CLOUD_DB_BUCKET).upload(`${tableName}.json`, blob, {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true,
    });
    if (error) {
      const { error: fbErr } = await supabase.storage
        .from(PUBLIC_IMAGES_BUCKET)
        .upload(`_db/${tableName}.json`, blob, {
          contentType: 'application/json',
          cacheControl: '0',
          upsert: true,
        });
      if (fbErr) return { ok: false, error: fbErr.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to write to Supabase storage' };
  }
}

// ============================================================================
// DIRECT SUPABASE OPERATIONS (Used by Storefront & Admin Portal)
// ============================================================================

export async function fetchProductsFromSupabase(): Promise<Product[]> {
  let sqlProducts: Product[] = [];
  let cloudProducts: Product[] = [];

  if (supabase) {
    // 1. Read from Supabase Cloud Storage database (`ma-group-database/products.json`)
    const cp = await readCloudTableFromSupabase<Product>('products');
    if (cp && cp.length > 0) {
      cloudProducts = cp.map(mapSupabaseRowToProduct);
      logSupabaseOp('products', 'SELECT', 'CLOUD_DB', `Loaded ${cloudProducts.length} products from Supabase (${supabaseProjectId})`);
    }

    // 2. Also query relational SQL table `public.products` if available
    if (sqlTableAvailability['products'] !== false) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          sqlTableAvailability['products'] = true;
          sqlProducts = data.map(mapSupabaseRowToProduct);
          logSupabaseOp('products', 'SELECT (SQL)', 'OK', `Loaded ${sqlProducts.length} rows`);
        } else if (error) {
          if (isTableOrSchemaMissingError(error.message)) {
            sqlTableAvailability['products'] = false;
          } else {
            const { data: fbData, error: fbErr } = await supabase.from('products').select('*');
            if (!fbErr && fbData) {
              sqlTableAvailability['products'] = true;
              sqlProducts = fbData.map(mapSupabaseRowToProduct);
            }
          }
        }
      } catch {
        // Ignore SQL error when Cloud DB is active
      }
    }
  }

  // 3. Query unified backend API (which connects to the same Supabase project via SUPABASE_SERVICE_ROLE_KEY)
  // and merge with any direct client rows without duplication
  try {
    const res = await fetch(`/api/products?_t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      cache: 'no-store',
    });
    if (res.ok) {
      const apiData = await res.json();
      if (Array.isArray(apiData)) {
        // When the backend API returns authoritative Supabase-hydrated data, merge with direct SQL rows
        // (giving SQL and backend API priority over any cached Cloud Bucket snapshot)
        const mergedMap = new Map<string, Product>();
        apiData.forEach((p: Product) => {
          if (p && p.id) mergedMap.set(p.id, mapSupabaseRowToProduct(p));
        });
        sqlProducts.forEach((p) => {
          if (p && p.id) {
            const existing = mergedMap.get(p.id);
            mergedMap.set(p.id, existing ? { ...existing, ...p } : p);
          }
        });
        if (mergedMap.size > 0 || (sqlProducts.length === 0 && cloudProducts.length === 0)) {
          return Array.from(mergedMap.values());
        }
      }
    } else if (sqlProducts.length === 0 && cloudProducts.length === 0) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg = errBody?.error || `Failed to load products from Supabase (${res.status})`;
      logSupabaseOp('products', 'API_SELECT', 'ERROR', errMsg);
      throw new Error(errMsg);
    }
  } catch (err: any) {
    if (sqlProducts.length === 0 && cloudProducts.length === 0) {
      throw err;
    }
  }

  // Merge SQL products and Cloud Bucket products from the same Supabase project
  const mergedMap = new Map<string, Product>();
  cloudProducts.forEach((p) => {
    if (p && p.id) mergedMap.set(p.id, p);
  });
  sqlProducts.forEach((p) => {
    if (p && p.id) {
      const existing = mergedMap.get(p.id);
      mergedMap.set(p.id, existing ? { ...existing, ...p } : p);
    }
  });
  return Array.from(mergedMap.values());
}

export async function insertOrUpdateProductInSupabase(
  product: Product,
  currentProducts?: Product[]
): Promise<{ ok: boolean; product?: Product; error?: string }> {
  if (!supabase) {
    return { ok: false, error: 'Frontend Supabase client not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing)' };
  }

  try {
    if (sqlTableAvailability['products'] !== false) {
      const row = mapProductToSupabaseRow(product);
      const { data, error } = await supabase
        .from('products')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      if (!error) {
        sqlTableAvailability['products'] = true;
        const saved = data ? mapSupabaseRowToProduct(data) : product;
        logSupabaseOp('products', 'UPSERT', 'OK', `Saved product "${saved.name}" (${saved.id})`);
        const list = (await readCloudTableFromSupabase<Product>('products')) || currentProducts || [];
        const idx = list.findIndex((p) => p.id === saved.id);
        if (idx > -1) list[idx] = saved;
        else list.unshift(saved);
        await writeCloudTableToSupabase('products', list);
        return { ok: true, product: saved };
      }

      if (isTableOrSchemaMissingError(error.message)) {
        sqlTableAvailability['products'] = false;
      } else {
        const coreRow = mapProductToCoreSupabaseRow(product, true);
        const { data: fbData, error: fbErr } = await supabase
          .from('products')
          .upsert(coreRow, { onConflict: 'id' })
          .select('*')
          .maybeSingle();
        if (!fbErr) {
          const saved = fbData ? { ...product, ...mapSupabaseRowToProduct(fbData) } : product;
          logSupabaseOp('products', 'UPSERT (core)', 'OK', `Saved product "${saved.name}"`);
          const list = (await readCloudTableFromSupabase<Product>('products')) || currentProducts || [];
          const idx = list.findIndex((p) => p.id === saved.id);
          if (idx > -1) list[idx] = saved;
          else list.unshift(saved);
          await writeCloudTableToSupabase('products', list);
          return { ok: true, product: saved };
        }
      }
    }

    // Write to Supabase Cloud Bucket
    const list = (await readCloudTableFromSupabase<Product>('products')) || currentProducts || [];
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx > -1) list[idx] = product;
    else list.unshift(product);
    const cloudRes = await writeCloudTableToSupabase('products', list);
    if (cloudRes.ok) {
      logSupabaseOp('products', 'UPSERT', 'CLOUD_DB', `Saved "${product.name}" to Supabase Storage`);
      return { ok: true, product };
    }
    return { ok: false, error: cloudRes.error || 'Direct storage write requires backend service-role key' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Supabase product write failed' };
  }
}

export async function deleteProductInSupabase(
  id: string,
  currentProducts?: Product[]
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Frontend Supabase client not configured' };
  try {
    if (sqlTableAvailability['products'] !== false) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error && isTableOrSchemaMissingError(error.message)) {
        sqlTableAvailability['products'] = false;
      } else if (error) {
        return { ok: false, error: error.message };
      }
    }
    const list = (await readCloudTableFromSupabase<Product>('products')) || currentProducts;
    if (list) {
      const cloudRes = await writeCloudTableToSupabase(
        'products',
        list.filter((p) => p.id !== id)
      );
      if (!cloudRes.ok && sqlTableAvailability['products'] === false) {
        return { ok: false, error: cloudRes.error };
      }
    }
    logSupabaseOp('products', 'DELETE', 'OK', `Deleted product ID ${id}`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete product from Supabase' };
  }
}

export async function fetchCategoriesFromSupabase(): Promise<Category[]> {
  let sqlCats: Category[] = [];
  let cloudCats: Category[] = [];

  if (supabase) {
    const cc = await readCloudTableFromSupabase<Category>('categories');
    if (cc && cc.length > 0) {
      cloudCats = cc.map(mapSupabaseRowToCategory);
      logSupabaseOp('categories', 'SELECT', 'CLOUD_DB', `Loaded ${cloudCats.length} categories from Supabase (${supabaseProjectId})`);
    }

    if (sqlTableAvailability['categories'] !== false) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('created_at', { ascending: true });
        if (!error && data) {
          sqlTableAvailability['categories'] = true;
          sqlCats = data.map(mapSupabaseRowToCategory);
        } else if (error) {
          if (isTableOrSchemaMissingError(error.message)) {
            sqlTableAvailability['categories'] = false;
          } else {
            const { data: fbData, error: fbErr } = await supabase.from('categories').select('*');
            if (!fbErr && fbData) {
              sqlTableAvailability['categories'] = true;
              sqlCats = fbData.map(mapSupabaseRowToCategory);
            }
          }
        }
      } catch {
        // Ignore SQL error when Cloud DB is active
      }
    }
  }

  try {
    const res = await fetch(`/api/categories?_t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (res.ok) {
      const apiData = await res.json();
      if (Array.isArray(apiData) && apiData.length > 0) {
        const mergedMap = new Map<string, Category>();
        apiData.forEach((c: Category) => {
          if (c && c.id) mergedMap.set(c.id, mapSupabaseRowToCategory(c));
        });
        cloudCats.forEach((c) => mergedMap.set(c.id, c));
        sqlCats.forEach((c) => mergedMap.set(c.id, c));
        return Array.from(mergedMap.values());
      }
    } else if (sqlCats.length === 0 && cloudCats.length === 0) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg = errBody?.error || `Failed to load categories from Supabase (${res.status})`;
      logSupabaseOp('categories', 'API_SELECT', 'ERROR', errMsg);
      throw new Error(errMsg);
    }
  } catch (err: any) {
    if (sqlCats.length === 0 && cloudCats.length === 0) {
      throw err;
    }
  }

  const mergedMap = new Map<string, Category>();
  cloudCats.forEach((c) => mergedMap.set(c.id, c));
  sqlCats.forEach((c) => mergedMap.set(c.id, c));
  return Array.from(mergedMap.values());
}

export async function insertOrUpdateCategoryInSupabase(
  category: Category,
  currentCategories?: Category[]
): Promise<{ ok: boolean; category?: Category; error?: string }> {
  if (!supabase) return { ok: false, error: 'Frontend Supabase client not configured' };
  try {
    if (sqlTableAvailability['categories'] !== false) {
      const row = mapCategoryToSupabaseRow(category);
      const { data, error } = await supabase
        .from('categories')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .maybeSingle();
      if (!error) {
        sqlTableAvailability['categories'] = true;
        const saved = data ? mapSupabaseRowToCategory(data) : category;
        logSupabaseOp('categories', 'UPSERT', 'OK', `Saved category "${saved.name}" (${saved.id})`);
        const list = (await readCloudTableFromSupabase<Category>('categories')) || currentCategories || [];
        const idx = list.findIndex((c) => c.id === saved.id);
        if (idx > -1) list[idx] = saved;
        else list.push(saved);
        await writeCloudTableToSupabase('categories', list);
        return { ok: true, category: saved };
      }
      if (isTableOrSchemaMissingError(error.message)) {
        sqlTableAvailability['categories'] = false;
      }
    }

    const list = (await readCloudTableFromSupabase<Category>('categories')) || currentCategories || [];
    const idx = list.findIndex((c) => c.id === category.id);
    if (idx > -1) list[idx] = category;
    else list.push(category);
    const cloudRes = await writeCloudTableToSupabase('categories', list);
    if (cloudRes.ok) {
      logSupabaseOp('categories', 'UPSERT', 'CLOUD_DB', `Saved "${category.name}" to Supabase Storage`);
      return { ok: true, category };
    }
    return { ok: false, error: cloudRes.error || 'Direct storage write requires backend service-role key' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to save category in Supabase' };
  }
}

export async function deleteCategoryInSupabase(
  id: string,
  currentCategories?: Category[]
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Frontend Supabase client not configured' };
  try {
    if (sqlTableAvailability['categories'] !== false) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error && isTableOrSchemaMissingError(error.message)) {
        sqlTableAvailability['categories'] = false;
      } else if (error) {
        return { ok: false, error: error.message };
      }
    }
    const list = (await readCloudTableFromSupabase<Category>('categories')) || currentCategories;
    if (list) {
      const cloudRes = await writeCloudTableToSupabase(
        'categories',
        list.filter((c) => c.id !== id)
      );
      if (!cloudRes.ok && sqlTableAvailability['categories'] === false) {
        return { ok: false, error: cloudRes.error };
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete category' };
  }
}

export async function fetchOrdersFromSupabase(): Promise<Order[] | null> {
  if (!supabase && !supabaseUrl) return null;
  try {
    let sqlOrders: Order[] = [];
    const cloudOrders = await readCloudTableFromSupabase<Order>('orders');
    if (cloudOrders && cloudOrders.length > 0) {
      logSupabaseOp('orders', 'SELECT', 'CLOUD_DB', `Loaded ${cloudOrders.length} orders from Supabase (${supabaseProjectId})`);
    }

    if (supabase && sqlTableAvailability['orders'] !== false) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        sqlTableAvailability['orders'] = true;
        sqlOrders = data.map(mapSupabaseRowToOrder);
      } else if (error) {
        if (isTableOrSchemaMissingError(error.message)) {
          sqlTableAvailability['orders'] = false;
        } else {
          const { data: fbData, error: fbErr } = await supabase.from('orders').select('*');
          if (!fbErr && fbData) {
            sqlTableAvailability['orders'] = true;
            sqlOrders = fbData.map(mapSupabaseRowToOrder);
          }
        }
      }
    }

    if (sqlOrders.length > 0 || (cloudOrders && cloudOrders.length > 0)) {
      const mergedMap = new Map<string, Order>();
      if (cloudOrders) cloudOrders.forEach((o) => mergedMap.set(o.id, mapSupabaseRowToOrder(o)));
      sqlOrders.forEach((o) => mergedMap.set(o.id, o));
      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return sqlOrders;
  } catch {
    return null;
  }
}

export async function fetchOrderByOrderNumberFromSupabase(orderNumber: string): Promise<Order | null> {
  const cleanNum = orderNumber.trim();
  if (!cleanNum) return null;
  const all = await fetchOrdersFromSupabase();
  if (all && all.length > 0) {
    const match = all.find(
      (o) =>
        o.orderNumber.toLowerCase() === cleanNum.toLowerCase() ||
        o.id.toLowerCase() === cleanNum.toLowerCase()
    );
    if (match) return match;
  }
  return null;
}

export async function insertOrUpdateOrderInSupabase(
  order: Order,
  currentOrders?: Order[]
): Promise<{ ok: boolean; order?: Order; error?: string }> {
  if (!supabase) return { ok: false, error: 'Frontend Supabase client not configured' };
  try {
    if (sqlTableAvailability['orders'] !== false) {
      const row = mapOrderToSupabaseRow(order);
      const { data, error } = await supabase
        .from('orders')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .maybeSingle();
      if (!error) {
        sqlTableAvailability['orders'] = true;
        const saved = data ? mapSupabaseRowToOrder(data) : order;
        logSupabaseOp('orders', 'UPSERT', 'OK', `Saved order #${saved.orderNumber} (${saved.id})`);
        const list = (await readCloudTableFromSupabase<Order>('orders')) || currentOrders || [];
        const idx = list.findIndex((o) => o.id === saved.id);
        if (idx > -1) list[idx] = saved;
        else list.unshift(saved);
        await writeCloudTableToSupabase('orders', list);
        return { ok: true, order: saved };
      }

      if (isTableOrSchemaMissingError(error.message)) {
        sqlTableAvailability['orders'] = false;
      } else {
        const coreRow = mapOrderToCoreSupabaseRow(order, true);
        const { data: fbData, error: fbErr } = await supabase
          .from('orders')
          .upsert(coreRow, { onConflict: 'id' })
          .select('*')
          .maybeSingle();
        if (!fbErr) {
          const saved = fbData ? { ...order, ...mapSupabaseRowToOrder(fbData) } : order;
          logSupabaseOp('orders', 'UPSERT (core)', 'OK', `Saved order #${saved.orderNumber}`);
          return { ok: true, order: saved };
        }
      }
    }

    const list = (await readCloudTableFromSupabase<Order>('orders')) || currentOrders || [];
    const idx = list.findIndex((o) => o.id === order.id);
    if (idx > -1) list[idx] = order;
    else list.unshift(order);
    const cloudRes = await writeCloudTableToSupabase('orders', list);
    if (cloudRes.ok) {
      logSupabaseOp('orders', 'UPSERT', 'CLOUD_DB', `Saved order #${order.orderNumber} to Supabase Storage`);
      return { ok: true, order };
    }
    return { ok: false, error: cloudRes.error || 'Order saved via backend service-role key' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to save order in Supabase' };
  }
}

export async function deleteOrderInSupabase(
  id: string,
  currentOrders?: Order[]
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Frontend Supabase client not configured' };
  try {
    if (sqlTableAvailability['orders'] !== false) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error && isTableOrSchemaMissingError(error.message)) {
        sqlTableAvailability['orders'] = false;
      } else if (error) {
        return { ok: false, error: error.message };
      }
    }
    const list = (await readCloudTableFromSupabase<Order>('orders')) || currentOrders;
    if (list) {
      const cloudRes = await writeCloudTableToSupabase(
        'orders',
        list.filter((o) => o.id !== id)
      );
      if (!cloudRes.ok && sqlTableAvailability['orders'] === false) {
        return { ok: false, error: cloudRes.error };
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete order' };
  }
}

export async function uploadImageDirectlyToSupabaseStorage(
  file: File,
  bucketName: string = PUBLIC_IMAGES_BUCKET
): Promise<{ ok: boolean; publicUrl?: string; error?: string }> {
  if (!supabase) return { ok: false, error: 'Frontend Supabase client not configured' };
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `uploads/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(bucketName).upload(storagePath, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
    logSupabaseOp(bucketName, 'STORAGE_UPLOAD', 'OK', data.publicUrl);
    return { ok: true, publicUrl: data.publicUrl };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Direct storage upload failed' };
  }
}
