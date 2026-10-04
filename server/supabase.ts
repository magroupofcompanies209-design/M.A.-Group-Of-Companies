import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Product, Category, Order, StoreSettings, AdminSecuritySettings } from '../src/types/index.ts';

let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

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

export function mapSupabaseRowToProduct(row: any): Product {
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

export async function fetchAllSupabaseProducts(): Promise<Product[] | null> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      const { data: fallbackData, error: fallbackErr } = await sb.from('products').select('*');
      if (fallbackErr) return null;
      return (fallbackData || []).map(mapSupabaseRowToProduct);
    }
    if (!data) return [];
    return data.map(mapSupabaseRowToProduct);
  } catch {
    return null;
  }
}

export async function upsertSupabaseProduct(product: Product): Promise<{ ok: boolean; product?: Product; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const row = mapProductToSupabaseRow(product);
    const { data, error } = await sb.from('products').upsert(row, { onConflict: 'id' }).select('*').maybeSingle();
    if (error) {
      const coreWithId = mapProductToCoreSupabaseRow(product, true);
      const { data: fb1Data, error: fb1Err } = await sb.from('products').upsert(coreWithId, { onConflict: 'id' }).select('*').maybeSingle();
      if (!fb1Err) {
        return { ok: true, product: fb1Data ? mapSupabaseRowToProduct(fb1Data) : product };
      }

      const coreWithoutId = mapProductToCoreSupabaseRow(product, false);
      if (product.id) {
        const { data: existingRows } = await sb.from('products').select('id').eq('id', product.id).limit(1);
        if (existingRows && existingRows.length > 0) {
          const { data: updData, error: updErr } = await sb.from('products').update(coreWithoutId).eq('id', product.id).select('*').maybeSingle();
          if (!updErr) {
            return { ok: true, product: updData ? mapSupabaseRowToProduct(updData) : product };
          }
        }
      }
      const { data: insData, error: insErr } = await sb.from('products').insert(coreWithoutId).select('*').maybeSingle();
      if (insErr) {
        return { ok: false, error: insErr.message };
      }
      return { ok: true, product: insData ? mapSupabaseRowToProduct(insData) : product };
    }
    return { ok: true, product: data ? mapSupabaseRowToProduct(data) : product };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Unknown Supabase error' };
  }
}

export async function deleteSupabaseProductById(id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const { error } = await sb.from('products').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete product' };
  }
}

export async function fetchAllSupabaseCategories(): Promise<Category[] | null> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      const { data: fallbackData, error: fallbackErr } = await sb.from('categories').select('*');
      if (fallbackErr) return null;
      return (fallbackData || []).map(mapSupabaseRowToCategory);
    }
    if (!data) return [];
    return data.map(mapSupabaseRowToCategory);
  } catch {
    return null;
  }
}

export async function upsertSupabaseCategory(category: Category): Promise<{ ok: boolean; category?: Category; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const row = mapCategoryToSupabaseRow(category);
    const { data, error } = await sb.from('categories').upsert(row, { onConflict: 'id' }).select('*').maybeSingle();
    if (error) {
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

      const minimalNoId = {
        name: category.name,
        slug: category.slug,
        description: category.description || '',
      };
      if (category.id) {
        const { data: existing } = await sb.from('categories').select('id').eq('id', category.id).limit(1);
        if (existing && existing.length > 0) {
          const { data: updData, error: updErr } = await sb.from('categories').update(minimalNoId).eq('id', category.id).select('*').maybeSingle();
          if (!updErr) {
            return { ok: true, category: updData ? { ...category, id: String(updData.id) } : category };
          }
        }
      }
      const { data: insData, error: insErr } = await sb.from('categories').insert(minimalNoId).select('*').maybeSingle();
      if (insErr) {
        const { data: nameOnlyData, error: nameOnlyErr } = await sb.from('categories').insert({ name: category.name }).select('*').maybeSingle();
        if (nameOnlyErr) return { ok: false, error: insErr.message };
        return { ok: true, category: nameOnlyData ? { ...category, id: String(nameOnlyData.id) } : category };
      }
      return { ok: true, category: insData ? { ...category, id: String(insData.id) } : category };
    }
    return { ok: true, category: data ? mapSupabaseRowToCategory(data) : category };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to save category' };
  }
}

export async function deleteSupabaseCategoryById(id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const { error } = await sb.from('categories').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete category' };
  }
}

export async function fetchAllSupabaseOrders(): Promise<Order[] | null> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      const { data: fallbackData, error: fallbackErr } = await sb.from('orders').select('*');
      if (fallbackErr) return null;
      return (fallbackData || []).map(mapSupabaseRowToOrder);
    }
    if (!data) return [];
    return data.map(mapSupabaseRowToOrder);
  } catch {
    return null;
  }
}

export async function upsertSupabaseOrder(order: Order): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const row = mapOrderToSupabaseRow(order);
    const { data, error } = await sb.from('orders').upsert(row, { onConflict: 'id' }).select('*').maybeSingle();
    if (error) {
      const coreWithId = mapOrderToCoreSupabaseRow(order, true);
      const { data: fb1Data, error: fb1Err } = await sb.from('orders').upsert(coreWithId, { onConflict: 'id' }).select('*').maybeSingle();
      if (!fb1Err) {
        return { ok: true, order: fb1Data ? mapSupabaseRowToOrder(fb1Data) : order };
      }

      const coreNoId = mapOrderToCoreSupabaseRow(order, false);
      if (order.id) {
        const { data: existing } = await sb.from('orders').select('id').eq('id', order.id).limit(1);
        if (existing && existing.length > 0) {
          const { data: updData, error: updErr } = await sb.from('orders').update(coreNoId).eq('id', order.id).select('*').maybeSingle();
          if (!updErr) {
            return { ok: true, order: updData ? mapSupabaseRowToOrder(updData) : order };
          }
        }
      }
      const { data: insData, error: insErr } = await sb.from('orders').insert(coreNoId).select('*').maybeSingle();
      if (insErr) return { ok: false, error: insErr.message };
      return { ok: true, order: insData ? mapSupabaseRowToOrder(insData) : order };
    }
    return { ok: true, order: data ? mapSupabaseRowToOrder(data) : order };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to save order' };
  }
}

export async function deleteSupabaseOrderById(id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  try {
    const { error } = await sb.from('orders').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
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
    if (error) return null;
    if (!data) return [];
    return data.map((row: any) => (row.data && typeof row.data === 'object' ? { ...row.data, id: row.id } : row)) as T[];
  } catch {
    return null;
  }
}

export async function upsertSupabaseGenericRow(tableName: string, id: string, item: any): Promise<boolean> {
  const sb = getSupabaseAdmin() || getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from(tableName).upsert({ id, data: item });
    return !error;
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

function isTableMissingError(err?: string): boolean {
  if (!err) return false;
  const lower = err.toLowerCase();
  return (
    lower.includes('not found') ||
    lower.includes('schema cache') ||
    lower.includes('could not find the table') ||
    lower.includes('relation') && lower.includes('does not exist')
  );
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
    };
  },

  async getProducts(): Promise<Product[] | null> {
    return fetchAllSupabaseProducts();
  },

  async insertProduct(product: Product): Promise<{ success: boolean; data?: Product; error?: string; tableMissing?: boolean }> {
    const res = await upsertSupabaseProduct(product);
    return {
      success: res.ok,
      data: res.product || product,
      error: res.error,
      tableMissing: isTableMissingError(res.error),
    };
  },

  async updateProduct(id: string, updates: Partial<Product>, existingProduct?: Product): Promise<{ success: boolean; data?: Product; error?: string; tableMissing?: boolean }> {
    const sb = getSupabaseAdmin() || getSupabase();
    if (!sb) return { success: false, error: 'Supabase not configured' };

    let base: Product | undefined = existingProduct;
    if (!base) {
      const { data: row } = await sb.from('products').select('*').eq('id', id).maybeSingle();
      if (row) {
        base = mapSupabaseRowToProduct(row);
      }
    }

    const merged: Product = {
      ...(base || ({
        id,
        name: updates.name || 'Product',
        slug: updates.slug || 'product',
        sku: updates.sku || `SKU-${id}`,
        categoryId: updates.categoryId || 'cat-solar',
        categoryName: updates.categoryName || 'Solar Products & Equipment',
        brand: updates.brand || 'M.A. Group',
        description: updates.description || '',
        shortDescription: updates.shortDescription || '',
        specifications: updates.specifications || [],
        features: updates.features || [],
        images: updates.images || [],
        price: Number(updates.price ?? 0),
        stock: Number(updates.stock ?? 0),
        lowStockThreshold: 5,
        warranty: 'Official Warranty',
        tags: [],
        status: 'active',
        rating: 4.8,
        reviewCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Product)),
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

    const res = await upsertSupabaseProduct(merged);
    return {
      success: res.ok,
      data: res.product || merged,
      error: res.error,
      tableMissing: isTableMissingError(res.error),
    };
  },

  async deleteProduct(id: string): Promise<{ success: boolean; error?: string; tableMissing?: boolean }> {
    const res = await deleteSupabaseProductById(id);
    return {
      success: res.ok,
      error: res.error,
      tableMissing: isTableMissingError(res.error),
    };
  },

  async getCategories(): Promise<Category[] | null> {
    return fetchAllSupabaseCategories();
  },

  async insertCategory(category: Category): Promise<{ success: boolean; data?: Category; error?: string; tableMissing?: boolean }> {
    const res = await upsertSupabaseCategory(category);
    return {
      success: res.ok,
      data: res.category || category,
      error: res.error,
      tableMissing: isTableMissingError(res.error),
    };
  },

  async updateCategory(id: string, updates: Partial<Category>, existingCategory?: Category): Promise<{ success: boolean; data?: Category; error?: string; tableMissing?: boolean }> {
    const sb = getSupabaseAdmin() || getSupabase();
    if (!sb) return { success: false, error: 'Supabase not configured' };

    let base: Category | undefined = existingCategory;
    if (!base) {
      const { data: row } = await sb.from('categories').select('*').eq('id', id).maybeSingle();
      if (row) {
        base = mapSupabaseRowToCategory(row);
      }
    }

    const merged: Category = {
      ...(base || ({
        id,
        name: updates.name || 'Category',
        slug: updates.slug || 'category',
        description: updates.description || '',
        image: updates.image || '',
        iconName: updates.iconName || 'Zap',
        displayOrder: updates.displayOrder ?? 1,
        isActive: updates.isActive ?? true,
        subcategories: updates.subcategories || [],
      } as Category)),
      ...updates,
      id,
    };

    const res = await upsertSupabaseCategory(merged);
    return {
      success: res.ok,
      data: res.category || merged,
      error: res.error,
      tableMissing: isTableMissingError(res.error),
    };
  },

  async deleteCategory(id: string): Promise<{ success: boolean; error?: string; tableMissing?: boolean }> {
    const res = await deleteSupabaseCategoryById(id);
    return {
      success: res.ok,
      error: res.error,
      tableMissing: isTableMissingError(res.error),
    };
  },

  async getOrders(): Promise<Order[] | null> {
    return fetchAllSupabaseOrders();
  },

  async insertOrder(order: Order): Promise<{ success: boolean; data?: Order; error?: string; tableMissing?: boolean }> {
    const res = await upsertSupabaseOrder(order);
    return {
      success: res.ok,
      data: res.order || order,
      error: res.error,
      tableMissing: isTableMissingError(res.error),
    };
  },

  async updateOrder(id: string, updates: Partial<Order>, existingOrder?: Order): Promise<{ success: boolean; data?: Order; error?: string; tableMissing?: boolean }> {
    const sb = getSupabaseAdmin() || getSupabase();
    if (!sb) return { success: false, error: 'Supabase not configured' };

    let base: Order | undefined = existingOrder;
    if (!base) {
      const { data: row } = await sb.from('orders').select('*').eq('id', id).maybeSingle();
      if (row) {
        base = mapSupabaseRowToOrder(row);
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

    const res = await upsertSupabaseOrder(merged);
    return {
      success: res.ok,
      data: res.order || merged,
      error: res.error,
      tableMissing: isTableMissingError(res.error),
    };
  },

  async deleteOrder(id: string): Promise<{ success: boolean; error?: string; tableMissing?: boolean }> {
    const res = await deleteSupabaseOrderById(id);
    return {
      success: res.ok,
      error: res.error,
      tableMissing: isTableMissingError(res.error),
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
