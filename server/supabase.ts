import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Product, Category, Order } from '../src/types/index.ts';

dotenv.config();

export interface SupabaseConfigStatus {
  configured: boolean;
  connected: boolean;
  url?: string;
  maskedKey?: string;
  hasServiceRoleKey: boolean;
  tableExists: boolean;
  productCount?: number;
  storageReady?: boolean;
  error?: string | null;
  notice?: string;
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private url: string | null = null;
  private key: string | null = null;
  private isServiceRole = false;
  private tableExists: boolean | null = null;
  private lastTableCheckTime = 0;

  constructor() {
    this.init();
  }

  public init(): boolean {
    let supabaseUrl =
      process.env.SUPABASE_URL?.trim() ||
      process.env.VITE_SUPABASE_URL?.trim();

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const anonKey =
      process.env.SUPABASE_ANON_KEY?.trim() ||
      process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
      process.env.SUPABASE_KEY?.trim();

    // Auto-detect Supabase URL from DATABASE_URL if not explicitly set
    if (!supabaseUrl && process.env.DATABASE_URL) {
      try {
        const u = new URL(process.env.DATABASE_URL);
        // e.g. postgres.kfzaeumrupzshpyzshpd in username or db.kfzaeumrupzshpyzshpd.supabase.co
        const match =
          u.username.match(/^postgres\.([a-z0-9_-]+)$/) ||
          u.hostname.match(/^db\.([a-z0-9_-]+)\.supabase\.co$/) ||
          u.hostname.match(/([a-z0-9_-]+)\.pooler\.supabase\.com$/);

        if (match && match[1]) {
          supabaseUrl = `https://${match[1]}.supabase.co`;
        }
      } catch {
        // ignore parse error
      }
    }

    const key = serviceKey || anonKey;

    if (supabaseUrl && key) {
      this.url = supabaseUrl;
      this.key = key;
      this.isServiceRole = !!serviceKey;
      this.client = createClient(supabaseUrl, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log(`✅ Supabase client initialized for [${this.url}] (Key type: ${this.isServiceRole ? 'Service Role' : 'Anon/Standard'})`);
      return true;
    }

    this.client = null;
    return false;
  }

  public isConfigured(): boolean {
    return !!this.client;
  }

  public getStatus(): SupabaseConfigStatus {
    const configured = this.isConfigured();
    let maskedKey: string | undefined;
    if (this.key) {
      maskedKey = this.key.slice(0, 6) + '...' + this.key.slice(-4);
    }

    return {
      configured,
      connected: configured,
      url: this.url || undefined,
      maskedKey,
      hasServiceRoleKey: this.isServiceRole,
      tableExists: Boolean(this.tableExists),
      storageReady: true,
      notice: this.tableExists === false
        ? 'Table "public.products" needs to be created in Supabase SQL Editor. Run supabase_schema.sql to enable remote table sync.'
        : undefined,
    };
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Reset table cache to force re-checking if table exists in Supabase
   */
  public resetTableCheck(): void {
    this.tableExists = null;
    this.lastTableCheckTime = 0;
  }

  /**
   * Map a Supabase row to the application Product interface
   */
  public mapRowToProduct(row: any): Product {
    const extra = row.data && typeof row.data === 'object' ? row.data : {};
    const primaryImg = row.image_url || extra.images?.[0] || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80';
    
    let images: string[] = [];
    if (Array.isArray(row.images) && row.images.length > 0) {
      images = row.images;
    } else if (Array.isArray(extra.images) && extra.images.length > 0) {
      images = extra.images;
    } else {
      images = [primaryImg];
    }

    const categoryStr = row.category || extra.categoryName || extra.categoryId || 'General';

    return {
      id: String(row.id),
      name: String(row.name || extra.name || 'Untitled Product'),
      slug: String(
        row.slug ||
        extra.slug ||
        (row.name ? row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : row.id)
      ),
      sku: String(row.sku || extra.sku || `SKU-${String(row.id).slice(-6)}`),
      categoryId: String(row.category_id || extra.categoryId || (categoryStr.startsWith('cat-') ? categoryStr : 'cat-solar')),
      categoryName: String(row.category_name || extra.categoryName || categoryStr),
      subcategoryId: row.subcategory_id || extra.subcategoryId,
      subcategoryName: row.subcategory_name || extra.subcategoryName,
      brand: String(row.brand || extra.brand || 'M.A. Certified'),
      description: String(row.description || extra.description || ''),
      shortDescription: String(row.short_description || extra.shortDescription || (row.description ? String(row.description).slice(0, 150) : '')),
      specifications: Array.isArray(row.specifications)
        ? row.specifications
        : Array.isArray(extra.specifications)
        ? extra.specifications
        : [{ key: 'Quality', value: 'Certified Genuine' }],
      features: Array.isArray(row.features)
        ? row.features
        : Array.isArray(extra.features)
        ? extra.features
        : ['Premium Industrial Standard', 'Verified Warranty'],
      images,
      price: Number(row.price) || 0,
      salePrice: row.sale_price !== null && row.sale_price !== undefined ? Number(row.sale_price) : (extra.salePrice ? Number(extra.salePrice) : undefined),
      stock: typeof row.stock === 'number' ? row.stock : (Number(row.stock) || 0),
      lowStockThreshold: Number(row.low_stock_threshold || extra.lowStockThreshold || 5),
      warranty: String(row.warranty || extra.warranty || '1 Year Official Warranty'),
      tags: Array.isArray(row.tags) ? row.tags : Array.isArray(extra.tags) ? extra.tags : ['products'],
      status: (row.status || extra.status || 'active') as any,
      isFeatured: Boolean(row.is_featured ?? extra.isFeatured ?? false),
      isBestSeller: Boolean(row.is_bestseller ?? extra.isBestSeller ?? false),
      isNewArrival: Boolean(row.is_new_arrival ?? extra.isNewArrival ?? false),
      isDeal: Boolean(row.is_deal ?? extra.isDeal ?? false),
      rating: Number(row.rating || extra.rating || 5.0),
      reviewCount: Number(row.review_count || extra.reviewCount || 1),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Fetch all products from Supabase table 'products'
   */
  public async getProducts(): Promise<Product[] | null> {
    if (!this.client) return null;

    // Rate-limit checks if table was recently confirmed missing (check at most once per 60 seconds)
    if (this.tableExists === false && Date.now() - this.lastTableCheckTime < 60000) {
      return null;
    }

    try {
      this.lastTableCheckTime = Date.now();
      const { data, error } = await this.client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table') || error.message.includes('schema cache')) {
          this.tableExists = false;
          console.log('ℹ️ Supabase table "public.products" not yet created in Supabase schema. Catalog running in local storage mode. Run supabase_schema.sql to sync.');
        } else {
          console.log('ℹ️ Supabase notice:', error.message);
        }
        return null;
      }

      this.tableExists = true;
      if (!data) return [];
      return data.map((row) => this.mapRowToProduct(row));
    } catch (err: any) {
      console.log('ℹ️ Supabase getProducts notice:', err?.message || err);
      return null;
    }
  }

  /**
   * Insert product into Supabase table 'products'
   * Validates and ensures persistence
   */
  public async insertProduct(product: Product): Promise<{ success: boolean; data?: Product; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in environment variables.' };
    }

    const imageUrl = product.images?.[0] || '';
    const now = new Date().toISOString();

    // 1. Try inserting with rich schema (includes extra fields + data jsonb)
    const richRow: Record<string, any> = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price) || 0,
      category: product.categoryName || product.categoryId || 'General',
      image_url: imageUrl,
      stock: Number(product.stock) || 0,
      slug: product.slug,
      sku: product.sku,
      brand: product.brand || 'M.A. Certified',
      category_id: product.categoryId,
      category_name: product.categoryName,
      sale_price: product.salePrice ? Number(product.salePrice) : null,
      images: product.images || [imageUrl],
      features: product.features || [],
      specifications: product.specifications || [],
      warranty: product.warranty || '',
      tags: product.tags || [],
      status: product.status || 'active',
      is_featured: product.isFeatured || false,
      is_bestseller: product.isBestSeller || false,
      is_deal: product.isDeal || false,
      rating: product.rating || 5.0,
      review_count: product.reviewCount || 1,
      data: product,
      created_at: product.createdAt || now,
      updated_at: now,
    };

    let { data, error } = await this.client
      .from('products')
      .insert(richRow)
      .select()
      .single();

    // 2. If it failed due to schema mismatch (e.g. table only has core 9 columns), retry with core 9 columns
    if (error && (error.message.includes('column') || error.code === '42703' || error.message.includes('not find'))) {
      console.warn('ℹ️ Supabase schema has subset of columns. Retrying insert with core 9 columns (id, name, description, price, category, image_url, stock, created_at, updated_at)...');
      
      const coreRow = {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: Number(product.price) || 0,
        category: product.categoryName || product.categoryId || 'General',
        image_url: imageUrl,
        stock: Number(product.stock) || 0,
        created_at: product.createdAt || now,
        updated_at: now,
      };

      const retryRes = await this.client
        .from('products')
        .insert(coreRow)
        .select()
        .single();

      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table') || error.message.includes('schema cache')) {
        this.tableExists = false;
        console.log('ℹ️ Notice: Table "public.products" not found in Supabase schema. Execute supabase_schema.sql to create table.');
      } else {
        console.log('ℹ️ Supabase insertProduct notice:', error.message);
      }
      return { success: false, error: `Supabase insert failed: ${error.message}` };
    }

    this.tableExists = true;
    return { success: true, data: this.mapRowToProduct(data) };
  }

  /**
   * Update existing product in Supabase table 'products'
   */
  public async updateProduct(id: string, updates: Partial<Product>): Promise<{ success: boolean; data?: Product; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    const imageUrl = updates.images?.[0];
    const now = new Date().toISOString();

    const richUpdates: Record<string, any> = {
      updated_at: now,
    };

    if (updates.name !== undefined) richUpdates.name = updates.name;
    if (updates.description !== undefined) richUpdates.description = updates.description;
    if (updates.price !== undefined) richUpdates.price = Number(updates.price);
    if (updates.stock !== undefined) richUpdates.stock = Number(updates.stock);
    if (updates.categoryName || updates.categoryId) {
      richUpdates.category = updates.categoryName || updates.categoryId;
      richUpdates.category_name = updates.categoryName;
      richUpdates.category_id = updates.categoryId;
    }
    if (imageUrl) {
      richUpdates.image_url = imageUrl;
      richUpdates.images = updates.images;
    }
    if (updates.sku !== undefined) richUpdates.sku = updates.sku;
    if (updates.brand !== undefined) richUpdates.brand = updates.brand;
    if (updates.salePrice !== undefined) richUpdates.sale_price = updates.salePrice ? Number(updates.salePrice) : null;
    if (updates.features !== undefined) richUpdates.features = updates.features;
    if (updates.specifications !== undefined) richUpdates.specifications = updates.specifications;
    if (updates.warranty !== undefined) richUpdates.warranty = updates.warranty;
    if (updates.tags !== undefined) richUpdates.tags = updates.tags;
    if (updates.status !== undefined) richUpdates.status = updates.status;
    if (updates.isFeatured !== undefined) richUpdates.is_featured = updates.isFeatured;
    if (updates.isBestSeller !== undefined) richUpdates.is_bestseller = updates.isBestSeller;
    if (updates.isDeal !== undefined) richUpdates.is_deal = updates.isDeal;
    richUpdates.data = updates;

    let { data, error } = await this.client
      .from('products')
      .update(richUpdates)
      .eq('id', id)
      .select()
      .single();

    // Fallback to core columns if column mismatch
    if (error && (error.message.includes('column') || error.code === '42703')) {
      const coreUpdates: Record<string, any> = { updated_at: now };
      if (updates.name !== undefined) coreUpdates.name = updates.name;
      if (updates.description !== undefined) coreUpdates.description = updates.description;
      if (updates.price !== undefined) coreUpdates.price = Number(updates.price);
      if (updates.stock !== undefined) coreUpdates.stock = Number(updates.stock);
      if (updates.categoryName || updates.categoryId) {
        coreUpdates.category = updates.categoryName || updates.categoryId;
      }
      if (imageUrl) coreUpdates.image_url = imageUrl;

      const retryRes = await this.client
        .from('products')
        .update(coreUpdates)
        .eq('id', id)
        .select()
        .single();

      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      return { success: false, error: `Supabase update failed: ${error.message}` };
    }

    return { success: true, data: this.mapRowToProduct(data) };
  }

  /**
   * Delete product row from Supabase
   */
  public async deleteProduct(id: string): Promise<{ success: boolean; error?: string; tableMissing?: boolean; deletedCount?: number }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    try {
      const { data, error } = await this.client
        .from('products')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        const isTableMissing =
          error.code === 'PGRST205' ||
          error.message.includes('Could not find the table') ||
          error.message.includes('schema cache');
        if (isTableMissing) {
          this.tableExists = false;
          return { success: false, tableMissing: true, error: error.message };
        }
        return { success: false, error: `Supabase delete failed: ${error.message}` };
      }

      this.tableExists = true;
      return { success: true, deletedCount: data ? data.length : 1 };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Delete category row from Supabase
   */
  public async deleteCategory(id: string): Promise<{ success: boolean; error?: string; tableMissing?: boolean; deletedCount?: number }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    try {
      const { data, error } = await this.client
        .from('categories')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        const isTableMissing =
          error.code === 'PGRST205' ||
          error.message.includes('Could not find the table') ||
          error.message.includes('schema cache');
        if (isTableMissing) {
          return { success: false, tableMissing: true, error: error.message };
        }
        return { success: false, error: `Supabase delete failed: ${error.message}` };
      }

      return { success: true, deletedCount: data ? data.length : 1 };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Delete order row from Supabase
   */
  public async deleteOrder(id: string): Promise<{ success: boolean; error?: string; tableMissing?: boolean; deletedCount?: number }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    try {
      const { data, error } = await this.client
        .from('orders')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        const isTableMissing =
          error.code === 'PGRST205' ||
          error.message.includes('Could not find the table') ||
          error.message.includes('schema cache');
        if (isTableMissing) {
          return { success: false, tableMissing: true, error: error.message };
        }
        return { success: false, error: `Supabase delete failed: ${error.message}` };
      }

      return { success: true, deletedCount: data ? data.length : 1 };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Fetch all categories from Supabase
   */
  public async getCategories(): Promise<Category[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        return null;
      }
      if (!data || data.length === 0) return [];

      return data.map((row: any) => {
        if (row.data && typeof row.data === 'object' && row.data.name) {
          return {
            ...row.data,
            id: row.id || row.data.id,
            name: row.name || row.data.name,
            slug: row.slug || row.data.slug,
            description: row.description || row.data.description || '',
            image: row.image || row.data.image || '',
            displayOrder: Number(row.display_order ?? row.data.displayOrder ?? 0),
          };
        }
        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description || '',
          image: row.image || '',
          iconName: row.icon_name || 'Grid',
          displayOrder: Number(row.display_order || 0),
          isActive: row.is_active !== false,
          subcategories: row.subcategories || [],
        };
      });
    } catch {
      return null;
    }
  }

  /**
   * Insert category into Supabase
   */
  public async insertCategory(cat: Category): Promise<{ success: boolean; data?: Category; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured.' };
    }
    const now = new Date().toISOString();
    try {
      const row: Record<string, any> = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        image: cat.image || '',
        display_order: cat.displayOrder ?? 0,
        data: cat,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await this.client
        .from('categories')
        .insert(row)
        .select()
        .single();

      if (error) {
        if (error.message.includes('column') || error.code === '42703') {
          const minimalRow = {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description || '',
            image: cat.image || '',
            display_order: cat.displayOrder ?? 0,
          };
          const res = await this.client.from('categories').insert(minimalRow).select().single();
          if (res.error) return { success: false, error: res.error.message };
          return { success: true, data: cat };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data: cat };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Update category in Supabase
   */
  public async updateCategory(id: string, updates: Partial<Category>): Promise<{ success: boolean; data?: Category; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured.' };
    }
    const now = new Date().toISOString();
    try {
      const updateData: Record<string, any> = {
        updated_at: now,
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.slug !== undefined) updateData.slug = updates.slug;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.image !== undefined) updateData.image = updates.image;
      if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
      updateData.data = updates;

      const { data, error } = await this.client
        .from('categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.message.includes('column') || error.code === '42703') {
          delete updateData.data;
          const res = await this.client.from('categories').update(updateData).eq('id', id).select().single();
          if (res.error) return { success: false, error: res.error.message };
          return { success: true };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Fetch all orders from Supabase
   */
  public async getOrders(): Promise<Order[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return null;
      if (!data || data.length === 0) return [];

      return data.map((row: any) => {
        if (row.data && typeof row.data === 'object' && row.data.orderNumber) {
          return {
            ...row.data,
            id: row.id || row.data.id,
            orderNumber: row.order_number || row.data.orderNumber,
            status: row.status || row.data.status,
            grandTotal: Number(row.grand_total ?? row.data.grandTotal ?? 0),
          };
        }
        return {
          id: row.id,
          orderNumber: row.order_number,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          status: row.status || 'Pending Verification',
          customer: {
            fullName: row.customer_name || 'Customer',
            phone: row.customer_phone || '',
            addressLine: '',
            city: row.customer_city || '',
            province: 'Punjab',
          },
          items: [],
          subtotal: Number(row.grand_total || 0),
          shippingFee: 0,
          discountAmount: 0,
          grandTotal: Number(row.grand_total || 0),
          paymentMethod: row.payment_method || 'Cash on Delivery (COD)',
          paymentStatus: row.payment_status || 'Pending (COD on Delivery)',
        };
      });
    } catch {
      return null;
    }
  }

  /**
   * Insert order into Supabase
   */
  public async insertOrder(order: Order): Promise<{ success: boolean; data?: Order; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured.' };
    }
    const now = new Date().toISOString();
    try {
      const row: Record<string, any> = {
        id: order.id,
        order_number: order.orderNumber,
        customer_name: order.customer?.fullName || 'Customer',
        customer_phone: order.customer?.phone || '',
        customer_city: order.customer?.city || '',
        grand_total: order.grandTotal || 0,
        status: order.status || 'Pending Verification',
        payment_method: order.paymentMethod || 'Cash on Delivery (COD)',
        payment_status: order.paymentStatus || 'Pending (COD on Delivery)',
        data: order,
        created_at: order.createdAt || now,
        updated_at: now,
      };

      const { data, error } = await this.client
        .from('orders')
        .insert(row)
        .select()
        .single();

      if (error) {
        if (error.message.includes('column') || error.code === '42703') {
          delete row.data;
          const res = await this.client.from('orders').insert(row).select().single();
          if (res.error) return { success: false, error: res.error.message };
          return { success: true, data: order };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data: order };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Update order status/details in Supabase
   */
  public async updateOrder(id: string, updates: Partial<Order>): Promise<{ success: boolean; data?: Order; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured.' };
    }
    const now = new Date().toISOString();
    try {
      const updateData: Record<string, any> = {
        updated_at: now,
      };
      if (updates.status) updateData.status = updates.status;
      if (updates.paymentStatus) updateData.payment_status = updates.paymentStatus;
      if (updates.grandTotal !== undefined) updateData.grand_total = updates.grandTotal;
      updateData.data = updates;

      const { data, error } = await this.client
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.message.includes('column') || error.code === '42703') {
          delete updateData.data;
          const res = await this.client.from('orders').update(updateData).eq('id', id).select().single();
          if (res.error) return { success: false, error: res.error.message };
          return { success: true };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Upload image to Supabase Storage and return public URL
   */
  public async uploadImage(
    buffer: Buffer | Uint8Array,
    filename: string,
    contentType: string = 'image/jpeg'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client not configured.' };
    }

    const bucketName = 'product-images';
    const cleanFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    try {
      // 1. Try uploading to bucket 'product-images'
      let uploadResult = await this.client.storage
        .from(bucketName)
        .upload(cleanFilename, buffer, {
          contentType,
          upsert: true,
        });

      // If bucket doesn't exist, try creating it or fallback to 'products' bucket
      if (uploadResult.error && (uploadResult.error.message.includes('not found') || uploadResult.error.message.includes('bucket'))) {
        try {
          await this.client.storage.createBucket(bucketName, { public: true });
          uploadResult = await this.client.storage
            .from(bucketName)
            .upload(cleanFilename, buffer, {
              contentType,
              upsert: true,
            });
        } catch {
          // ignore bucket creation error and try 'products' bucket
          uploadResult = await this.client.storage
            .from('products')
            .upload(cleanFilename, buffer, {
              contentType,
              upsert: true,
            });
        }
      }

      if (uploadResult.error) {
        return { success: false, error: `Storage upload failed: ${uploadResult.error.message}` };
      }

      // 2. Obtain Public URL
      const { data: urlData } = this.client.storage
        .from(bucketName)
        .getPublicUrl(cleanFilename);

      if (!urlData || !urlData.publicUrl) {
        return { success: false, error: 'Failed to generate public URL for uploaded image.' };
      }

      return { success: true, url: urlData.publicUrl };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Storage upload error' };
    }
  }

  /**
   * Delete an image from Supabase Storage bucket 'product-images'
   */
  public async deleteImage(imageUrlOrPath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client || !imageUrlOrPath) {
      return { success: false, error: 'No client or path' };
    }

    try {
      let filePath = '';
      if (imageUrlOrPath.includes('/product-images/')) {
        filePath = imageUrlOrPath.split('/product-images/')[1].split('?')[0];
      } else if (!imageUrlOrPath.startsWith('http://') && !imageUrlOrPath.startsWith('https://')) {
        filePath = imageUrlOrPath.replace(/^product-images\//, '');
      }

      if (!filePath) {
        // External URL (e.g. Unsplash), no storage deletion needed
        return { success: true };
      }

      const { error } = await this.client.storage
        .from('product-images')
        .remove([filePath]);

      if (error) {
        console.warn('ℹ️ Notice deleting image from storage:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Storage delete error' };
    }
  }
}

export const supabaseService = new SupabaseService();
export default supabaseService;
