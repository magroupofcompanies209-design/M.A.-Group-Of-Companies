import { Pool, type PoolConfig } from 'pg';
import dotenv from 'dotenv';
import type {
  Product,
  Category,
  Brand,
  Order,
  Review,
  HeroBanner,
  Coupon,
  StoreSettings,
  B2BInquiry,
  AuditLog,
} from '../src/types/index.ts';

dotenv.config();

export interface DatabaseStatus {
  configured: boolean;
  connected: boolean;
  databaseType: 'PostgreSQL' | 'Local JSON Storage';
  connectionStatus: 'connected' | 'fallback_local_storage';
  connectionStringMasked?: string;
  host?: string;
  database?: string;
  port?: number;
  user?: string;
  ssl: boolean;
  tableCounts?: {
    products: number;
    categories: number;
    brands: number;
    orders: number;
    reviews: number;
    inquiries: number;
    auditLogs: number;
  };
  lastCheck: string;
  notice?: string;
  hint?: string;
}

class PostgresManager {
  private pool: Pool | null = null;
  private isConnected = false;
  private connectionError: string | null = null;
  private databaseUrl: string | undefined = undefined;

  constructor() {
    this.databaseUrl = process.env.DATABASE_URL?.trim();
  }

  public getMaskedUrl(): string | undefined {
    if (!this.databaseUrl) return undefined;
    try {
      const url = new URL(this.databaseUrl);
      if (url.password) {
        url.password = '******';
      }
      return url.toString();
    } catch {
      return this.databaseUrl.replace(/:([^:@]+)@/, ':******@');
    }
  }

  public async init(): Promise<boolean> {
    this.databaseUrl = process.env.DATABASE_URL?.trim();

    if (!this.databaseUrl) {
      console.log('ℹ️ Local JSON storage active (data/store.json).');
      this.isConnected = false;
      return false;
    }

    // Check if it's the unconfigured default template from .env.example
    if (
      this.databaseUrl.includes('user:password@localhost') ||
      this.databaseUrl.includes('example.com')
    ) {
      console.log('ℹ️ Template DATABASE_URL detected. Operating in local JSON storage mode (data/store.json).');
      this.isConnected = false;
      return false;
    }

    try {
      const maskedUrl = this.getMaskedUrl();
      console.log(`ℹ️ Checking PostgreSQL connection: ${maskedUrl}`);

      const isLocalhost =
        this.databaseUrl.includes('localhost') ||
        this.databaseUrl.includes('127.0.0.1');

      const isSslDisabled = this.databaseUrl.includes('sslmode=disable');
      const isSsl = !isLocalhost && !isSslDisabled;

      const config: PoolConfig = {
        connectionString: this.databaseUrl,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 3500, // fast timeout so it never hangs
        ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      };

      const candidatePool = new Pool(config);

      // Handle pool runtime errors safely
      candidatePool.on('error', (err) => {
        this.isConnected = false;
        this.connectionError = err?.message || String(err);
      });

      // Test connection with timeout
      const client = await candidatePool.connect();
      try {
        const res = await client.query('SELECT NOW() AS current_time, current_database() AS db_name');
        console.log(`✅ PostgreSQL Connected successfully to [${res.rows[0].db_name}]`);
        this.pool = candidatePool;
        this.isConnected = true;
        this.connectionError = null;

        // Auto-migrate tables
        await this.createTables(client);
        return true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.isConnected = false;
      this.connectionError = err?.message || String(err);
      if (this.pool) {
        try {
          await this.pool.end();
        } catch {
          // ignore cleanup error
        }
        this.pool = null;
      }
      console.log(`ℹ️ PostgreSQL notice: ${this.connectionError}. Operating in local JSON storage mode (data/store.json).`);
      return false;
    }
  }

  private async createTables(client: any): Promise<void> {
    try {
      await client.query(`
        -- 1. App State / Document Store fallback
        CREATE TABLE IF NOT EXISTS app_state (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Products table
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(100) PRIMARY KEY,
          slug VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          brand_id VARCHAR(100),
          category_id VARCHAR(100) NOT NULL,
          subcategory_id VARCHAR(100),
          sku VARCHAR(100),
          price NUMERIC NOT NULL,
          compare_at_price NUMERIC,
          in_stock BOOLEAN DEFAULT TRUE,
          stock_quantity INTEGER DEFAULT 0,
          rating NUMERIC DEFAULT 5,
          review_count INTEGER DEFAULT 0,
          is_featured BOOLEAN DEFAULT FALSE,
          is_deal BOOLEAN DEFAULT FALSE,
          deal_discount_percent INTEGER,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 3. Categories table
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(100) PRIMARY KEY,
          slug VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          display_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 4. Brands table
        CREATE TABLE IF NOT EXISTS brands (
          id VARCHAR(100) PRIMARY KEY,
          slug VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          is_featured BOOLEAN DEFAULT FALSE,
          display_order INTEGER DEFAULT 0,
          data JSONB NOT NULL
        );

        -- 5. Orders table
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(100) PRIMARY KEY,
          order_number VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          payment_status VARCHAR(50) NOT NULL,
          grand_total NUMERIC NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 6. Reviews table
        CREATE TABLE IF NOT EXISTS reviews (
          id VARCHAR(100) PRIMARY KEY,
          product_id VARCHAR(100) NOT NULL,
          rating INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'approved',
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 7. Inquiries table
        CREATE TABLE IF NOT EXISTS inquiries (
          id VARCHAR(100) PRIMARY KEY,
          company_name VARCHAR(255),
          contact_person VARCHAR(255),
          status VARCHAR(50) DEFAULT 'pending',
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 8. Audit logs table
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(100) PRIMARY KEY,
          action VARCHAR(100) NOT NULL,
          performed_by VARCHAR(255),
          details TEXT,
          ip_address VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ PostgreSQL database tables verified.');
    } catch (e: any) {
      console.log('ℹ️ Table check notice:', e?.message || e);
    }
  }

  // Check if PostgreSQL has existing products
  public async loadFromPostgres(): Promise<{
    products?: Product[];
    categories?: Category[];
    brands?: Brand[];
    orders?: Order[];
    reviews?: Review[];
    banners?: HeroBanner[];
    coupons?: Coupon[];
    settings?: StoreSettings;
    inquiries?: B2BInquiry[];
    auditLogs?: AuditLog[];
  } | null> {
    if (!this.isConnected || !this.pool) return null;

    try {
      // 1. Check for single state blob first
      const stateRes = await this.pool.query('SELECT value FROM app_state WHERE key = $1', ['store_snapshot']);
      if (stateRes.rows.length > 0) {
        return stateRes.rows[0].value;
      }

      // 2. Otherwise assemble from tables
      const prodRes = await this.pool.query('SELECT data FROM products ORDER BY created_at DESC');
      const catRes = await this.pool.query('SELECT data FROM categories ORDER BY display_order ASC');
      const brandRes = await this.pool.query('SELECT data FROM brands ORDER BY display_order ASC');
      const ordRes = await this.pool.query('SELECT data FROM orders ORDER BY created_at DESC');
      const revRes = await this.pool.query('SELECT data FROM reviews ORDER BY created_at DESC');
      const inqRes = await this.pool.query('SELECT data FROM inquiries ORDER BY created_at DESC');

      if (prodRes.rows.length > 0) {
        return {
          products: prodRes.rows.map((r) => r.data),
          categories: catRes.rows.map((r) => r.data),
          brands: brandRes.rows.map((r) => r.data),
          orders: ordRes.rows.map((r) => r.data),
          reviews: revRes.rows.map((r) => r.data),
          inquiries: inqRes.rows.map((r) => r.data),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // Sync whole store state or single entity to PostgreSQL
  public async syncSnapshot(snapshot: any): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO app_state (key, value, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        ['store_snapshot', JSON.stringify(snapshot)]
      );
    } catch (err: any) {
      this.handleQueryError(err);
    }
  }

  public async saveProduct(product: Product): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO products (
          id, slug, name, brand_id, category_id, subcategory_id, sku, price, 
          compare_at_price, in_stock, stock_quantity, rating, review_count, 
          is_featured, is_deal, deal_discount_percent, data, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          name = EXCLUDED.name,
          brand_id = EXCLUDED.brand_id,
          category_id = EXCLUDED.category_id,
          subcategory_id = EXCLUDED.subcategory_id,
          sku = EXCLUDED.sku,
          price = EXCLUDED.price,
          compare_at_price = EXCLUDED.compare_at_price,
          in_stock = EXCLUDED.in_stock,
          stock_quantity = EXCLUDED.stock_quantity,
          rating = EXCLUDED.rating,
          review_count = EXCLUDED.review_count,
          is_featured = EXCLUDED.is_featured,
          is_deal = EXCLUDED.is_deal,
          deal_discount_percent = EXCLUDED.deal_discount_percent,
          data = EXCLUDED.data,
          updated_at = NOW()`,
        [
          product.id,
          product.slug,
          product.name,
          product.brand || null,
          product.categoryId,
          product.subcategoryId || null,
          product.sku,
          product.price,
          product.salePrice || null,
          product.stock > 0,
          product.stock,
          product.rating,
          product.reviewCount,
          product.isFeatured || false,
          product.isDeal || false,
          product.salePrice ? Math.round(((product.price - product.salePrice) / product.price) * 100) : null,
          JSON.stringify(product),
        ]
      );
    } catch (err: any) {
      this.handleQueryError(err);
    }
  }

  public async deleteProduct(id: string): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.pool.query('DELETE FROM products WHERE id = $1', [id]);
    } catch (err: any) {
      this.handleQueryError(err);
    }
  }

  public async saveOrder(order: Order): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO orders (id, order_number, status, payment_method, payment_status, grand_total, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           payment_method = EXCLUDED.payment_method,
           payment_status = EXCLUDED.payment_status,
           grand_total = EXCLUDED.grand_total,
           data = EXCLUDED.data,
           updated_at = NOW()`,
        [
          order.id,
          order.orderNumber,
          order.status,
          order.paymentMethod,
          order.paymentStatus,
          order.grandTotal,
          JSON.stringify(order),
        ]
      );
    } catch (err: any) {
      this.handleQueryError(err);
    }
  }

  public async saveReview(review: Review): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO reviews (id, product_id, rating, status, data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           data = EXCLUDED.data`,
        [review.id, review.productId, review.rating, review.status, JSON.stringify(review)]
      );
    } catch (err: any) {
      this.handleQueryError(err);
    }
  }

  public async saveInquiry(inquiry: B2BInquiry): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO inquiries (id, company_name, contact_person, status, data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           data = EXCLUDED.data`,
        [inquiry.id, inquiry.companyName, inquiry.contactPerson, inquiry.status, JSON.stringify(inquiry)]
      );
    } catch (err: any) {
      this.handleQueryError(err);
    }
  }

  public async logAudit(action: string, performedBy: string, details: string, ipAddress?: string): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      const id = 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      await this.pool.query(
        `INSERT INTO audit_logs (id, action, performed_by, details, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, action, performedBy, details, ipAddress || null]
      );
    } catch (err: any) {
      this.handleQueryError(err);
    }
  }

  private handleQueryError(err: any): void {
    this.connectionError = err?.message || String(err);
    // If connection dropped, transition smoothly to fallback
    if (
      err?.code === 'ECONNREFUSED' ||
      err?.code === '57P01' ||
      err?.message?.includes('closed') ||
      err?.message?.includes('terminat')
    ) {
      this.isConnected = false;
      if (this.pool) {
        this.pool.end().catch(() => {});
        this.pool = null;
      }
    }
  }

  // Get current connection & diagnostics status
  public async getStatus(localCounts: any): Promise<DatabaseStatus> {
    const isConfigured = Boolean(this.databaseUrl);
    let host: string | undefined;
    let database: string | undefined;
    let port: number | undefined;
    let user: string | undefined;

    if (this.databaseUrl) {
      try {
        const u = new URL(this.databaseUrl);
        host = u.hostname;
        database = u.pathname.replace(/^\//, '');
        port = u.port ? parseInt(u.port, 10) : 5432;
        user = u.username;
      } catch {
        // Non-standard format
      }
    }

    let tableCounts = localCounts;

    if (this.isConnected && this.pool) {
      try {
        const [pCount, oCount, rCount, iCount] = await Promise.all([
          this.pool.query('SELECT COUNT(*) FROM products'),
          this.pool.query('SELECT COUNT(*) FROM orders'),
          this.pool.query('SELECT COUNT(*) FROM reviews'),
          this.pool.query('SELECT COUNT(*) FROM inquiries'),
        ]);

        tableCounts = {
          ...localCounts,
          products: parseInt(pCount.rows[0].count, 10),
          orders: parseInt(oCount.rows[0].count, 10),
          reviews: parseInt(rCount.rows[0].count, 10),
          inquiries: parseInt(iCount.rows[0].count, 10),
        };
      } catch {
        // Retain local counts
      }
    }

    let hint: string | undefined;
    if (this.connectionError) {
      if (this.connectionError.includes('password authentication failed')) {
        hint = 'Database credentials rejected: Check the username and password in your DATABASE_URL.';
      } else if (this.connectionError.includes('ECONNREFUSED')) {
        hint = 'Database connection refused: Verify that your PostgreSQL server is running, the host and port (default 5432) are correct, and public access/firewall permissions are allowed.';
      } else if (this.connectionError.includes('timeout')) {
        hint = 'Connection timed out: Check network connectivity or firewall rules for your PostgreSQL host.';
      }
    }

    return {
      configured: isConfigured,
      connected: this.isConnected,
      databaseType: this.isConnected ? 'PostgreSQL' : 'Local JSON Storage',
      connectionStatus: this.isConnected ? 'connected' : 'fallback_local_storage',
      connectionStringMasked: this.getMaskedUrl(),
      host,
      database,
      port,
      user,
      ssl: Boolean(this.databaseUrl && (this.databaseUrl.includes('sslmode') || process.env.NODE_ENV === 'production')),
      tableCounts,
      lastCheck: new Date().toISOString(),
      notice: this.connectionError ? `PostgreSQL offline (${this.connectionError}). App operating on local persistent store.` : undefined,
      hint,
    };
  }

  // Direct SQL query execution helper
  public async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool || !this.isConnected) {
      throw new Error('PostgreSQL database is not connected. Operating in local storage mode.');
    }
    return this.pool.query(text, params);
  }
}

export const postgresManager = new PostgresManager();
