import express, { type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import { db } from './db.ts';
import {
  checkRateLimit,
  registerLoginFailure,
  resetLoginAttempts,
  verifyMasterSecret,
  createAdminSession,
  getAdminSession,
  revokeAdminSession,
  requireAdminAuth,
  requireSuperAdminAuth,
  requireRole,
} from './auth.ts';
import { askShoppingAssistant, generateAdminCopy, generateProductDetailsWithAi, generateInvoiceAiSummary } from './gemini.ts';
import { supabaseService } from './supabase.ts';
import type {
  Order,
  OrderStatus,
  Product,
  ProductStatus,
  AdminRole,
  Coupon,
  B2BInquiry,
  DeliveryZone,
  DeliveryArea,
  DeliverySettings,
  WarrantyRegistration,
  ServiceRequest,
  SupportTicket,
} from '../src/types/index.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use((req, _res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    req.body = {};
  }
  next();
});

// CORS & Preflight handling
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Security Headers middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// URL Normalization for Netlify Functions & Serverless Redirects
app.use((req, _res, next) => {
  const originalHeader =
    (req.headers['x-nf-original-path'] as string) ||
    (req.headers['x-rewrite-url'] as string) ||
    (req.headers['x-forwarded-uri'] as string);

  if (
    (req.url === '/.netlify/functions/api' || req.url === '/.netlify/functions/api/') &&
    originalHeader &&
    originalHeader.startsWith('/api')
  ) {
    req.url = originalHeader;
  } else if (req.url.startsWith('/.netlify/functions/api')) {
    const remainder = req.url.slice('/.netlify/functions/api'.length);
    req.url = remainder.startsWith('/api')
      ? remainder
      : remainder.startsWith('/')
      ? `/api${remainder}`
      : `/api/${remainder}`;
  } else if (
    (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) &&
    !req.url.startsWith('/api')
  ) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }
  next();
});

// ==========================================
// 1. AUTHENTICATION & ADMIN SECURITY ENDPOINTS
// ==========================================

// POST /api/auth/admin-login
app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    db.logAction('ADMIN_LOGIN_LOCKED', 'Unknown', `Rate limited IP: ${ip}`, ip);
    return res.status(429).json({
      error: 'Too Many Attempts',
      message: `Account temporarily locked due to repeated invalid attempts. Please wait ${rateLimit.remainingSeconds} seconds.`,
    });
  }

  const { masterSecret, username, password } = req.body;
  const security = db.getSecuritySettings();

  // 1. Master Secret Authentication (Server-Side verification only)
  if (masterSecret) {
    const isValid = verifyMasterSecret(masterSecret, security.masterSecret);
    if (isValid) {
      resetLoginAttempts(ip);
      const session = createAdminSession('M.A. Master Administrator (Super Admin)', 'superadmin');
      res.cookie('admin_session', session.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });
      db.logAction('ADMIN_LOGIN_SUCCESS', 'Superadmin', 'Authenticated via Master Secret with full access', ip);
      return res.json({
        success: true,
        role: session.role,
        username: session.username,
        token: session.token,
      });
    }
  }

  // 2. Staff Credentials Authentication
  if (username && password) {
    const trimmedUser = String(username).trim().toLowerCase();
    const matchedStaff = security.staffList.find(
      (s) => s.email.toLowerCase() === trimmedUser && s.password === password
    );

    if (matchedStaff) {
      resetLoginAttempts(ip);
      const role = matchedStaff.role === 'superadmin' ? 'superadmin' : 'admin';
      const session = createAdminSession(matchedStaff.name, role);
      res.cookie('admin_session', session.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });
      db.logAction('ADMIN_LOGIN_SUCCESS', matchedStaff.name, `Authenticated via staff credentials (${matchedStaff.email})`, ip);
      return res.json({
        success: true,
        role: session.role,
        username: session.username,
        token: session.token,
      });
    }
  }

  registerLoginFailure(ip);
  db.logAction('ADMIN_LOGIN_FAILED', username || 'MasterSecretAttempt', 'Invalid administrator credentials supplied', ip);
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid administrative credentials or Master Secret.',
  });
});

// POST /api/auth/admin-logout
app.post('/api/auth/admin-logout', (req: Request, res: Response) => {
  const token = req.cookies?.admin_session || req.headers['x-admin-token'];
  if (typeof token === 'string') {
    revokeAdminSession(token);
  }
  res.clearCookie('admin_session');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/admin-verify
app.get('/api/auth/admin-verify', (req: Request, res: Response) => {
  const token = req.cookies?.admin_session || req.headers['x-admin-token'];
  const session = getAdminSession(typeof token === 'string' ? token : undefined);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({
    authenticated: true,
    role: session.role,
    username: session.username,
  });
});

// ==========================================
// 1B. SUPER ADMIN SECURITY & CREDENTIALS API
// ==========================================

// GET /api/admin/security (Superadmin only)
app.get('/api/admin/security', requireSuperAdminAuth, (_req: Request, res: Response) => {
  const sec = db.getSecuritySettings();
  return res.json({
    masterSecret: sec.masterSecret,
    lastUpdated: sec.lastUpdated,
    staffList: sec.staffList,
  });
});

// POST /api/admin/security/master-secret (Superadmin only - change Master Secret password)
app.post('/api/admin/security/master-secret', requireSuperAdminAuth, (req: Request, res: Response) => {
  const { newSecret } = req.body;
  if (!newSecret || typeof newSecret !== 'string' || newSecret.trim().length < 4) {
    return res.status(400).json({ error: 'New Master Secret must be at least 4 characters long.' });
  }
  const session = (req as any).adminSession;
  db.updateMasterSecret(newSecret.trim(), session.username);
  return res.json({ success: true, message: 'Master Secret updated successfully!' });
});

// POST /api/admin/security/staff (Superadmin only - add new staff credential)
app.post('/api/admin/security/staff', requireSuperAdminAuth, (req: Request, res: Response) => {
  const { email, name, password, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Staff name, email, and password are required.' });
  }
  const session = (req as any).adminSession;
  const validRoles: AdminRole[] = ['superadmin', 'admin', 'manager', 'staff'];
  const assignedRole: AdminRole = validRoles.includes(role) ? role : 'staff';
  const created = db.addStaffMember(
    {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password: password.trim(),
      role: assignedRole,
    },
    session.username
  );
  return res.status(201).json(created);
});

// PUT /api/admin/security/staff/:id (Superadmin only - update staff credentials/password)
app.put('/api/admin/security/staff/:id', requireSuperAdminAuth, (req: Request, res: Response) => {
  const session = (req as any).adminSession;
  const updated = db.updateStaffMember(req.params.id, req.body, session.username);
  if (!updated) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }
  return res.json(updated);
});

// DELETE /api/admin/security/staff/:id (Superadmin only - delete staff credential)
app.delete('/api/admin/security/staff/:id', requireSuperAdminAuth, (req: Request, res: Response) => {
  const session = (req as any).adminSession;
  const success = db.deleteStaffMember(req.params.id, session.username);
  if (!success) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }
  return res.json({ success: true, message: 'Staff credentials deleted.' });
});

// ==========================================
// 2. PRODUCTS API (Supabase Persistent Database)
// ==========================================

/**
 * Helper to query the Supabase `products` table (and Cloud Storage backup)
 * and hydrate `db.ts` local state without duplication.
 */
async function hydrateProductsFromSupabase(): Promise<Product[]> {
  if (supabaseService.isConfigured()) {
    try {
      const supaProducts = await supabaseService.getProducts(db.getProducts());
      if (supaProducts !== null) {
        if (supaProducts.length > 0 || db.getProducts().length === 0) {
          db.syncProducts(supaProducts);
        }
        return supaProducts;
      }
    } catch (err) {
      console.warn('Supabase fetch error, falling back to local store:', err);
    }
  }
  return db.getProducts();
}

async function hydrateCategoriesFromSupabase() {
  if (supabaseService.isConfigured()) {
    try {
      const supaCats = await supabaseService.getCategories();
      if (supaCats !== null) {
        if (supaCats.length > 0 || db.getCategories().length === 0) {
          db.syncCategories(supaCats);
        }
      }
    } catch (err) {
      console.warn('Supabase categories fetch error:', err);
    }
  }
  return db.getCategories();
}

// GET /api/products
app.get('/api/products', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  let products = await hydrateProductsFromSupabase();

  // 2. Fallback to local store only if Supabase is not configured
  if (products.length === 0 && !supabaseService.isConfigured()) {
    products = db.getProducts();
  }

  const { search, category, brand, featured, bestseller, deal, minPrice, maxPrice, sort } = req.query;

  let filtered = [...products];

  if (category && typeof category === 'string' && category !== 'all') {
    filtered = filtered.filter(
      (p) => p.categoryId === category || p.slug === category || p.categoryName.toLowerCase() === category.toLowerCase()
    );
  }

  if (brand && typeof brand === 'string' && brand !== 'all') {
    filtered = filtered.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
  }

  if (featured === 'true') {
    filtered = filtered.filter((p) => p.isFeatured);
  }

  if (bestseller === 'true') {
    filtered = filtered.filter((p) => p.isBestSeller);
  }

  if (deal === 'true') {
    filtered = filtered.filter((p) => p.isDeal);
  }

  if (minPrice) {
    const min = parseFloat(minPrice as string);
    if (!isNaN(min)) filtered = filtered.filter((p) => (p.salePrice || p.price) >= min);
  }

  if (maxPrice) {
    const max = parseFloat(maxPrice as string);
    if (!isNaN(max)) filtered = filtered.filter((p) => (p.salePrice || p.price) <= max);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sorting
  if (sort === 'price-low') {
    filtered.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
  } else if (sort === 'price-high') {
    filtered.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
  } else if (sort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'newest') {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Cost & Profit privacy: never expose cost price to public visitors or staff
  const token = req.cookies?.admin_session || req.headers['x-admin-token'] || (typeof req.headers['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '').trim() : undefined);
  const session = getAdminSession(token);
  const canSeeCost = session && (session.role === 'superadmin' || session.role === 'admin');

  const sanitized = canSeeCost
    ? filtered
    : filtered.map((p) => {
        const { costPrice, ...rest } = p;
        return rest as Product;
      });

  return res.json(sanitized);
});

// GET /api/products/:id
app.get('/api/products/:id', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  await hydrateProductsFromSupabase();
  const product =
    db.getProductById(req.params.id) ||
    db.getProducts().find((p) => p.slug === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const token = req.cookies?.admin_session || req.headers['x-admin-token'] || (typeof req.headers['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '').trim() : undefined);
  const session = getAdminSession(token);
  const canSeeCost = session && (session.role === 'superadmin' || session.role === 'admin');

  if (!canSeeCost && product.costPrice !== undefined) {
    const { costPrice, ...rest } = product;
    return res.json(rest);
  }
  return res.json(product);
});

// POST /api/products (Admin Protected - Persists directly to Supabase)
app.post('/api/products', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateCategoriesFromSupabase();
  await hydrateProductsFromSupabase();

  const { name, price, stock, categoryName, categoryId } = req.body;

  // Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Product title is required.' });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ success: false, error: 'A valid product price (in PKR) is required.' });
  }

  const newProduct: Product = {
    ...req.body,
    id: req.body.id || 'prod-' + Date.now(),
    name: name.trim(),
    price: numPrice,
    stock: typeof stock === 'number' ? stock : (Number(stock) || 0),
    slug:
      req.body.slug ||
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    sku: req.body.sku || `SKU-${Date.now().toString().slice(-6)}`,
    categoryId: categoryId || 'cat-solar',
    categoryName: categoryName || 'Solar Products & Equipment',
    brand: req.body.brand || 'M.A. Certified',
    description: req.body.description || '',
    shortDescription: req.body.shortDescription || (req.body.description ? String(req.body.description).slice(0, 150) : ''),
    specifications: Array.isArray(req.body.specifications) ? req.body.specifications : [{ key: 'Quality', value: 'Certified Genuine' }],
    features: Array.isArray(req.body.features) ? req.body.features : ['Premium Industrial Standard', 'Verified Warranty'],
    images: Array.isArray(req.body.images) && req.body.images.length > 0
      ? req.body.images
      : [req.body.image_url || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80'],
    warranty: req.body.warranty || '1 Year Official Warranty',
    tags: Array.isArray(req.body.tags) ? req.body.tags : ['products'],
    status: req.body.status || 'active',
    rating: req.body.rating || 5.0,
    reviewCount: req.body.reviewCount || 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Require Supabase configuration for permanent database persistence
  if (!supabaseService.isConfigured()) {
    return res.status(500).json({
      success: false,
      error:
        'Product could not be saved: Supabase is not configured on the server. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in Netlify Environment Variables.',
    });
  }

  const supaRes = await supabaseService.insertProduct(newProduct, db.getProducts());
  if (!supaRes.success) {
    console.error('❌ Supabase product insert failed:', supaRes.error);
    return res.status(500).json({
      success: false,
      error: `Product could not be saved: ${supaRes.error || 'Failed to save product in Supabase database.'}`,
    });
  }

  let savedProduct = supaRes.data || newProduct;
  db.createProduct(savedProduct);

  // Re-query Supabase `products` table and hydrate `db.ts` local state after mutation
  const freshProducts = await supabaseService.getProducts();
  if (freshProducts !== null) {
    db.syncProducts(freshProducts);
    savedProduct = db.getProductById(savedProduct.id) || savedProduct;
  }

  db.logAction('CREATE_PRODUCT', (req as any).adminSession.username, `Created product in Supabase: ${savedProduct.name} (${savedProduct.sku})`);
  return res.status(201).json(savedProduct);
});

// PUT /api/products/:id (Admin Protected)
app.put('/api/products/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!supabaseService.isConfigured()) {
    return res.status(500).json({
      success: false,
      error:
        'Product could not be saved: Supabase is not configured on the server. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in Netlify Environment Variables.',
    });
  }

  await hydrateCategoriesFromSupabase();
  await hydrateProductsFromSupabase();

  const existingProduct = db.getProductById(id);
  const oldImages = existingProduct?.images || (existingProduct?.imageUrl ? [existingProduct.imageUrl] : []);

  const supaRes = await supabaseService.updateProduct(id, req.body, existingProduct, db.getProducts());
  if (!supaRes.success) {
    return res.status(500).json({
      success: false,
      error: `Product could not be saved: ${supaRes.error || 'Failed to update product in Supabase.'}`,
    });
  }

  let updated = db.updateProduct(id, req.body);
  if (supaRes.data) {
    updated = db.createProduct(supaRes.data);
  }

  // Re-query Supabase `products` table and hydrate `db.ts` local state after mutation
  const freshProducts = await supabaseService.getProducts();
  if (freshProducts !== null) {
    db.syncProducts(freshProducts);
    updated = db.getProductById(id) || updated;
  }

  const newImages = req.body.images || (req.body.imageUrl || req.body.image_url ? [req.body.imageUrl || req.body.image_url] : []);
  for (const oldImg of oldImages) {
    if (oldImg && oldImg.includes('/product-images/') && !newImages.includes(oldImg)) {
      const isUsedElsewhere = db.getProducts().some(
        (p) => p.id !== id && (p.images?.includes(oldImg) || p.imageUrl === oldImg)
      );
      if (!isUsedElsewhere) {
        await supabaseService.deleteImage(oldImg);
      }
    }
  }

  db.logAction('UPDATE_PRODUCT', (req as any).adminSession.username, `Updated product: ${id}`);
  return res.json(updated || supaRes.data);
});

// DELETE /api/products/:id (Admin/Superadmin Protected - Manager/Staff cannot delete products)
app.delete('/api/products/:id', requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Product ID is required.' });
  }

  await hydrateProductsFromSupabase();

  const existingProduct = db.getProductById(id);
  if (!existingProduct && !supabaseService.isConfigured()) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  // Delete Safety: Check if product is referenced in historical orders
  const referencedOrders = db.getOrders().filter(o => 
    o.items && o.items.some(item => item.productId === id || (existingProduct && item.productName.toLowerCase() === existingProduct.name.toLowerCase()))
  );

  const force = req.query.force === 'true';
  const shouldArchive = req.query.archive === 'true' || req.body?.archive === true;

  if (shouldArchive) {
    const updates = { status: 'archived' as const, isArchived: true };
    if (supabaseService.isConfigured()) {
      await supabaseService.updateProduct(id, updates, existingProduct, db.getProducts());
      const freshProducts = await supabaseService.getProducts();
      if (freshProducts !== null) db.syncProducts(freshProducts);
    }
    const archived = db.updateProduct(id, updates);
    db.logAction('ARCHIVE_PRODUCT', (req as any).adminSession.username, `Archived product: ${existingProduct?.name || id}`);
    return res.json({ success: true, archived: true, product: archived, message: 'Product archived successfully. Historical orders preserved.' });
  }

  if (referencedOrders.length > 0 && !force) {
    return res.status(409).json({
      success: false,
      referencedInOrders: true,
      orderCount: referencedOrders.length,
      sampleOrderNumbers: referencedOrders.slice(0, 3).map(o => o.orderNumber),
      error: `This product is linked to ${referencedOrders.length} existing customer order(s) (e.g. ${referencedOrders[0].orderNumber}). Deleting it permanently would break customer invoices and order history. Archiving is recommended to preserve records.`,
      suggestedAction: 'archive',
    });
  }

  const existingImages = existingProduct?.images || (existingProduct?.imageUrl ? [existingProduct.imageUrl] : []);

  if (supabaseService.isConfigured()) {
    const remainingFallback = db.getProducts().filter((p) => p.id !== id);
    const supaRes = await supabaseService.deleteProduct(id, remainingFallback);
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({
        success: false,
        error: supaRes.error || 'Failed to delete product from Supabase.',
      });
    }

    db.deleteProduct(id);

    // Re-query Supabase `products` table and hydrate `db.ts` local state after deletion
    const freshProducts = await supabaseService.getProducts();
    if (freshProducts !== null) {
      db.syncProducts(freshProducts);
    }

    // Requirement: Remove image from Supabase Storage when appropriate, ensuring no other product uses it
    for (const img of existingImages) {
      if (img && img.includes('/product-images/')) {
        const isUsedElsewhere = db.getProducts().some(
          (p) => p.id !== id && (p.images?.includes(img) || p.imageUrl === img)
        );
        if (!isUsedElsewhere) {
          await supabaseService.deleteImage(img);
        }
      }
    }

    const prodName = existingProduct?.name || id;
    db.logAction('DELETE_PRODUCT', (req as any).adminSession.username, `Deleted product: ${prodName} (ID: ${id})`);
    return res.json({ success: true, message: 'Product deleted successfully.' });
  }

  const success = db.deleteProduct(id);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }
  db.logAction('DELETE_PRODUCT', (req as any).adminSession.username, `Deleted product: ${existingProduct?.name || id} (ID: ${id})`);
  return res.json({ success: true, message: 'Product deleted successfully.' });
});

// POST /api/products/:id/duplicate (Duplicate product with new SKU and Copy name)
app.post('/api/products/:id/duplicate', requireRole(['superadmin', 'admin', 'manager']), async (req: Request, res: Response) => {
  const id = req.params.id;
  await hydrateProductsFromSupabase();
  const existing = db.getProductById(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Product not found to duplicate.' });
  }

  const newId = 'prod-' + Date.now();
  const newSku = `${existing.sku || 'MAG'}-COPY-${Math.floor(100 + Math.random() * 900)}`;
  const duplicated: Product = {
    ...existing,
    id: newId,
    sku: newSku,
    name: `${existing.name} (Copy)`,
    slug: `${existing.slug || 'product'}-copy-${Date.now().toString().slice(-4)}`,
    status: 'draft',
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let created = db.createProduct(duplicated);
  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.insertProduct(created, db.getProducts());
    if (!supaRes.success) {
      db.deleteProduct(created.id);
      return res.status(500).json({ success: false, error: supaRes.error || 'Failed to duplicate product in Supabase.' });
    }
    const freshProducts = await supabaseService.getProducts();
    if (freshProducts !== null) {
      db.syncProducts(freshProducts);
      created = db.getProductById(newId) || created;
    }
  }

  db.logAction('DUPLICATE_PRODUCT', (req as any).adminSession.username, `Duplicated product ${existing.name} into ${created.name} (${created.sku})`);
  return res.status(201).json(created);
});

// POST /api/products/:id/archive (Safely archive a product)
app.post('/api/products/:id/archive', requireRole(['superadmin', 'admin', 'manager']), async (req: Request, res: Response) => {
  const id = req.params.id;
  await hydrateProductsFromSupabase();
  const existing = db.getProductById(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const updates = { status: 'archived' as const, isArchived: true };
  if (supabaseService.isConfigured()) {
    await supabaseService.updateProduct(id, updates, existing, db.getProducts());
  }
  let updated = db.updateProduct(id, updates);
  if (supabaseService.isConfigured()) {
    const freshProducts = await supabaseService.getProducts();
    if (freshProducts !== null) {
      db.syncProducts(freshProducts);
      updated = db.getProductById(id) || updated;
    }
  }
  db.logAction('ARCHIVE_PRODUCT', (req as any).adminSession.username, `Archived product: ${existing.name} (${existing.sku})`);
  return res.json({ success: true, message: 'Product archived successfully.', product: updated });
});

// POST /api/products/:id/restore (Restore an archived product)
app.post('/api/products/:id/restore', requireRole(['superadmin', 'admin', 'manager']), async (req: Request, res: Response) => {
  const id = req.params.id;
  await hydrateProductsFromSupabase();
  const existing = db.getProductById(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const updates = { status: 'active' as const, isArchived: false };
  if (supabaseService.isConfigured()) {
    await supabaseService.updateProduct(id, updates, existing, db.getProducts());
  }
  let updated = db.updateProduct(id, updates);
  if (supabaseService.isConfigured()) {
    const freshProducts = await supabaseService.getProducts();
    if (freshProducts !== null) {
      db.syncProducts(freshProducts);
      updated = db.getProductById(id) || updated;
    }
  }
  db.logAction('RESTORE_PRODUCT', (req as any).adminSession.username, `Restored archived product: ${existing.name} (${existing.sku})`);
  return res.json({ success: true, message: 'Product restored successfully.', product: updated });
});

// PATCH /api/products/:id/status (Quick status change)
app.patch('/api/products/:id/status', requireRole(['superadmin', 'admin', 'manager']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!status || !['active', 'draft', 'archived', 'inactive'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid product status.' });
  }

  await hydrateProductsFromSupabase();
  const existing = db.getProductById(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const updates = {
    status: status as ProductStatus,
    isArchived: status === 'archived',
  };

  if (supabaseService.isConfigured()) {
    await supabaseService.updateProduct(id, updates, existing, db.getProducts());
  }
  let updated = db.updateProduct(id, updates);
  if (supabaseService.isConfigured()) {
    const freshProducts = await supabaseService.getProducts();
    if (freshProducts !== null) {
      db.syncProducts(freshProducts);
      updated = db.getProductById(id) || updated;
    }
  }
  db.logAction('UPDATE_PRODUCT_STATUS', (req as any).adminSession.username, `Changed status of ${existing.name} to ${status}`);
  return res.json({ success: true, product: updated });
});

// POST /api/upload (Admin Protected - Supabase Storage)
app.post('/api/upload', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { filename, fileData, contentType } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, error: 'No image data provided for upload.' });
    }

    if (!supabaseService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Supabase is not configured. Please ensure SUPABASE_URL and SUPABASE_ANON_KEY/SERVICE_ROLE_KEY are set.',
      });
    }

    let cleanBase64 = fileData;
    let mime = contentType || 'image/jpeg';
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const parts = fileData.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) mime = match[1];
      cleanBase64 = parts[1] || '';
    }

    // Validate supported image types: JPG, JPEG, PNG, WEBP
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mime.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Unsupported image format (${mime}). Please upload JPG, JPEG, PNG, or WEBP.`,
      });
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    // Enforce 10MB limit on server
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Image file exceeds 10MB limit.' });
    }

    const uploadRes = await supabaseService.uploadImage(buffer, filename || 'product-image.jpg', mime);

    if (!uploadRes.success) {
      return res.status(500).json({ success: false, error: uploadRes.error });
    }

    db.logAction('UPLOAD_IMAGE', (req as any).adminSession.username, `Uploaded product image to Supabase Storage: ${filename || 'image'}`);
    return res.json({ success: true, url: uploadRes.url });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to process image upload.' });
  }
});

// DELETE /api/upload (Admin Protected - Supabase Storage)
app.delete('/api/upload', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Image URL is required for deletion.' });
    }

    // Safety: check if another product uses this URL
    const isUsedElsewhere = db.getProducts().some(
      (p) => p.images?.includes(url) || p.imageUrl === url
    );
    if (isUsedElsewhere) {
      return res.json({ success: true, message: 'Image retained as it is linked to another product.' });
    }

    const delRes = await supabaseService.deleteImage(url);
    if (!delRes.success) {
      return res.status(500).json({ success: false, error: delRes.error });
    }

    db.logAction('DELETE_IMAGE', (req as any).adminSession.username, `Removed image from Supabase Storage: ${url}`);
    return res.json({ success: true, message: 'Image deleted from Supabase Storage.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to delete image.' });
  }
});

// ==========================================
// 3. CATEGORIES API
// ==========================================

app.get('/api/categories', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (supabaseService.isConfigured()) {
    try {
      const supaCats = await supabaseService.getCategories();
      if (supaCats !== null) {
        db.syncCategories(supaCats);
        return res.json(supaCats);
      }
    } catch (err: any) {
      console.error('Supabase categories fetch error:', err?.message);
    }
  }
  return res.json(db.getCategories());
});

app.post('/api/categories', requireAdminAuth, async (req: Request, res: Response) => {
  if (!req.body.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }
  if (supabaseService.isConfigured()) {
    const supaCats = await supabaseService.getCategories();
    if (supaCats && supaCats.length > 0) db.syncCategories(supaCats);
  }
  const newCat = {
    ...req.body,
    id: req.body.id || 'cat-' + Date.now(),
    slug:
      req.body.slug ||
      req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    subcategories: req.body.subcategories || [],
  };
  const created = db.createCategory(newCat);
  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.insertCategory(created);
    if (!supaRes.success && !supaRes.tableMissing) {
      db.deleteCategory(created.id);
      return res.status(500).json({ error: supaRes.error || 'Failed to save category to Supabase.' });
    }
    if (supaRes.data && supaRes.data.id !== created.id) {
      db.deleteCategory(created.id);
      const synced = db.createCategory({ ...created, id: supaRes.data.id });
      db.logAction('CREATE_CATEGORY', (req as any).adminSession.username, `Created category: ${synced.name}`);
      return res.status(201).json(synced);
    }
  }
  db.logAction('CREATE_CATEGORY', (req as any).adminSession.username, `Created category: ${created.name}`);
  return res.status(201).json(created);
});

app.put('/api/categories/:id', requireAdminAuth, async (req: Request, res: Response) => {
  if (supabaseService.isConfigured()) {
    const supaCats = await supabaseService.getCategories();
    if (supaCats && supaCats.length > 0) db.syncCategories(supaCats);
  }
  const existing = db.getCategoryById(req.params.id);
  const updated = db.updateCategory(req.params.id, req.body);
  if (!updated && !supabaseService.isConfigured()) {
    return res.status(404).json({ error: 'Category not found' });
  }
  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.updateCategory(req.params.id, req.body, updated || existing);
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({ error: supaRes.error || 'Failed to update category in Supabase.' });
    }
    if (supaRes.data && !updated) {
      return res.json(supaRes.data);
    }
  }
  db.logAction('UPDATE_CATEGORY', (req as any).adminSession.username, `Updated category: ${updated?.name || req.params.id}`);
  return res.json(updated);
});

app.delete('/api/categories/:id', requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Category ID is required.' });
  }

  if (supabaseService.isConfigured()) {
    const [supaCats, supaProds] = await Promise.all([
      supabaseService.getCategories(),
      supabaseService.getProducts(),
    ]);
    if (supaCats && supaCats.length > 0) db.syncCategories(supaCats);
    if (supaProds && supaProds.length > 0) db.syncProducts(supaProds);
  }

  const existingCategory = db.getCategories().find((c) => c.id === id);
  if (!existingCategory && !supabaseService.isConfigured()) {
    return res.status(404).json({ success: false, error: 'Category not found.' });
  }

  // Safety Check: Check if any products belong to this category
  const associatedProducts = db.getProducts().filter(
    (p) => !p.isArchived && (p.categoryId === id || (existingCategory && p.categoryName && p.categoryName.toLowerCase() === existingCategory.name.toLowerCase()))
  );

  if (associatedProducts.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Cannot delete category "${existingCategory?.name || id}". It is currently assigned to ${associatedProducts.length} product(s) (such as "${associatedProducts[0].name}"). Please reassign or delete these products first.`,
      productCount: associatedProducts.length,
      productNames: associatedProducts.slice(0, 3).map((p) => p.name),
    });
  }

  // Delete from Supabase if configured
  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.deleteCategory(id);
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({
        success: false,
        error: supaRes.error || 'Failed to delete category from Supabase.',
      });
    }
  }

  db.deleteCategory(id);
  db.logAction('DELETE_CATEGORY', (req as any).adminSession.username, `Deleted category: ${existingCategory?.name || id} (ID: ${id})`);
  return res.json({ success: true, message: 'Category deleted successfully.' });
});

app.post('/api/categories/:id/archive', requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const cat = db.getCategories().find((c) => c.id === id);
  if (!cat) return res.status(404).json({ success: false, error: 'Category not found.' });

  const updates = { isActive: false };
  if (supabaseService.isConfigured()) {
    await supabaseService.updateCategory(id, updates);
  }
  const updated = db.updateCategory(id, updates);
  db.logAction('ARCHIVE_CATEGORY', (req as any).adminSession.username, `Archived category: ${cat.name}`);
  return res.json({ success: true, category: updated });
});

app.post('/api/categories/:id/restore', requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const cat = db.getCategories().find((c) => c.id === id);
  if (!cat) return res.status(404).json({ success: false, error: 'Category not found.' });

  const updates = { isActive: true };
  if (supabaseService.isConfigured()) {
    await supabaseService.updateCategory(id, updates);
  }
  const updated = db.updateCategory(id, updates);
  db.logAction('RESTORE_CATEGORY', (req as any).adminSession.username, `Restored category: ${cat.name}`);
  return res.json({ success: true, category: updated });
});

// ==========================================
// 4. CERTIFIED MANUFACTURING PARTNERS & BRANDS API
// ==========================================

async function hydratePartnersFromSupabase() {
  if (supabaseService.isConfigured()) {
    try {
      const supaPartners = await supabaseService.getPartners(db.getBrands());
      if (supaPartners !== null) {
        if (supaPartners.length > 0) {
          db.syncBrands(supaPartners);
        } else if (db.getBrands().length > 0) {
          // Seed initial partners into Supabase cloud storage if none exist yet
          for (const b of db.getBrands()) {
            await supabaseService.insertPartner(b, db.getBrands());
          }
        }
      }
    } catch (err) {
      console.warn('Supabase partners fetch error:', err);
    }
  }
  return db.getBrands();
}

const handleGetPartners = async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const partners = await hydratePartnersFromSupabase();
  return res.json(partners);
};

const handleCreatePartner = async (req: Request, res: Response) => {
  if (!req.body.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: 'Partner/Manufacturer name is required.' });
  }
  await hydratePartnersFromSupabase();

  const logo = req.body.logoUrl || req.body.logo_url || '';
  const web = req.body.websiteUrl || req.body.website_url || '';
  const isVis =
    req.body.isVisible !== undefined
      ? Boolean(req.body.isVisible)
      : req.body.is_visible !== undefined
      ? Boolean(req.body.is_visible)
      : true;

  const newPartner = {
    ...req.body,
    id: req.body.id || 'partner-' + Date.now(),
    name: String(req.body.name).trim(),
    slug:
      req.body.slug ||
      String(req.body.name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
    logoUrl: logo,
    logo_url: logo,
    description: req.body.description || '',
    country: req.body.country || 'Pakistan',
    websiteUrl: web,
    website_url: web,
    certification: req.body.certification || '',
    categories: Array.isArray(req.body.categories) ? req.body.categories : [],
    partnerStatus: req.body.partnerStatus || 'Authorized Partner',
    displayOrder: Number(req.body.displayOrder ?? db.getBrands().length + 1),
    isVisible: isVis,
    isFeatured: req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : isVis,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let created = db.createBrand(newPartner);
  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.insertPartner(created, db.getBrands());
    if (!supaRes.success && !supaRes.tableMissing) {
      db.deleteBrand(created.id);
      return res.status(500).json({ error: supaRes.error || 'Failed to save partner to Supabase.' });
    }
    if (supaRes.data) {
      created = db.updateBrand(created.id, supaRes.data) || created;
    }
  }
  db.logAction(
    'CREATE_PARTNER',
    (req as any).adminSession?.username || 'Admin',
    `Added manufacturing partner: ${created.name}`
  );
  return res.status(201).json(created);
};

const handleUpdatePartner = async (req: Request, res: Response) => {
  await hydratePartnersFromSupabase();
  const id = req.params.id;
  const existing = db.getBrandById(id);
  if (!existing && !supabaseService.isConfigured()) {
    return res.status(404).json({ error: 'Manufacturing partner not found.' });
  }

  const updates: Record<string, any> = { ...req.body };
  if (updates.logoUrl !== undefined || updates.logo_url !== undefined) {
    const l = updates.logoUrl ?? updates.logo_url ?? '';
    updates.logoUrl = l;
    updates.logo_url = l;
  }
  if (updates.websiteUrl !== undefined || updates.website_url !== undefined) {
    const w = updates.websiteUrl ?? updates.website_url ?? '';
    updates.websiteUrl = w;
    updates.website_url = w;
  }
  if (updates.is_visible !== undefined && updates.isVisible === undefined) {
    updates.isVisible = Boolean(updates.is_visible);
  }

  let updated = db.updateBrand(id, updates);
  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.updatePartner(id, updates, updated || existing, db.getBrands());
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({ error: supaRes.error || 'Failed to update partner in Supabase.' });
    }
    if (supaRes.data) {
      updated = db.updateBrand(id, supaRes.data) || supaRes.data;
    }
  }
  db.logAction(
    'UPDATE_PARTNER',
    (req as any).adminSession?.username || 'Admin',
    `Updated manufacturing partner: ${updated?.name || id}`
  );
  return res.json(updated);
};

const handleDeletePartner = async (req: Request, res: Response) => {
  await hydratePartnersFromSupabase();
  const id = req.params.id;
  const existing = db.getBrandById(id);

  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.deletePartner(id, db.getBrands());
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({ success: false, error: supaRes.error || 'Failed to delete partner from Supabase.' });
    }
  }

  const success = db.deleteBrand(id);
  db.logAction(
    'DELETE_PARTNER',
    (req as any).adminSession?.username || 'Admin',
    `Deleted manufacturing partner: ${existing?.name || id}`
  );
  return res.json({ success: true, deletedId: id, wasFound: success || Boolean(existing) });
};

app.get('/api/partners', handleGetPartners);
app.post('/api/partners', requireAdminAuth, handleCreatePartner);
app.put('/api/partners/:id', requireAdminAuth, handleUpdatePartner);
app.patch('/api/partners/:id/visibility', requireAdminAuth, handleUpdatePartner);
app.delete('/api/partners/:id', requireAdminAuth, handleDeletePartner);

app.get('/api/brands', handleGetPartners);
app.post('/api/brands', requireAdminAuth, handleCreatePartner);
app.put('/api/brands/:id', requireAdminAuth, handleUpdatePartner);
app.delete('/api/brands/:id', requireAdminAuth, handleDeletePartner);

// ==========================================
// 5. ORDERS & CASH ON DELIVERY (COD) CHECKOUT
// ==========================================

// GET /api/orders (Admin Protected)
app.get('/api/orders', requireAdminAuth, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const { status, search } = req.query;
  let orders = db.getOrders();

  if (supabaseService.isConfigured()) {
    try {
      const supaOrders = await supabaseService.getOrders();
      if (supaOrders) {
        orders = supaOrders;
        db.syncOrders(supaOrders);
      }
    } catch {
      // Fallback to local db
    }
  }

  if (status && typeof status === 'string' && status !== 'all') {
    orders = orders.filter((o) => o.status.toLowerCase() === status.toLowerCase());
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.fullName.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.customer.city.toLowerCase().includes(q) ||
        (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q))
    );
  }

  return res.json(orders);
});

// In-memory idempotency cache to protect against duplicate requests/double clicks
const recentIdempotencyStore = new Map<string, { order: Order; timestamp: number }>();

// POST /api/orders (Public COD Checkout with Idempotency & Stock Validation)
app.post('/api/orders', async (req: Request, res: Response) => {
  const { customer, items, couponCode, customerNotes } = req.body;

  if (!customer || !customer.fullName || !customer.phone || !customer.addressLine || !customer.city) {
    return res.status(400).json({ error: 'Customer name, phone, address, and city are required.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  if (supabaseService.isConfigured()) {
    try {
      const [supaProducts, supaOrders] = await Promise.all([
        supabaseService.getProducts(),
        supabaseService.getOrders(),
      ]);
      if (supaProducts && supaProducts.length > 0) db.syncProducts(supaProducts);
      if (supaOrders) db.syncOrders(supaOrders);
    } catch {
      // Fallback to local cache
    }
  }

  // Validate real-time stock against database before creating order
  for (const item of items) {
    const product = db.getProductById(item.productId);
    if (product) {
      if (product.status === 'inactive' || product.status === 'archived' || product.isArchived) {
        return res.status(400).json({ error: `"${product.name}" is no longer available for purchase.` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error:
            product.stock <= 0
              ? `"${product.name}" is currently out of stock.`
              : `Only ${product.stock} unit(s) of "${product.name}" available in stock.`,
        });
      }
    }
  }

  const settings = db.getSettings();
  if (settings.maintenanceMode === true || settings.storefrontEnabled === false) {
    return res.status(503).json({
      error: "We're currently performing maintenance and improvements. Please check back shortly.",
    });
  }
  if (!settings.codEnabled) {
    return res.status(400).json({ error: 'Cash on delivery is currently unavailable.' });
  }

  // Validate category and subcategory visibility for ordered items
  const allCats = db.getCategories();
  for (const item of items) {
    const product = db.getProductById(item.productId);
    if (product) {
      const cat = allCats.find(
        (c) => c.id === product.categoryId || c.name.toLowerCase() === (product.categoryName || '').toLowerCase()
      );
      if (cat && cat.isActive === false) {
        return res.status(400).json({ error: `"${product.name}" is currently unavailable for purchase.` });
      }
      if (cat && product.subcategoryId) {
        const sub = (cat.subcategories || []).find((s) => s.id === product.subcategoryId || s.slug === product.subcategoryId);
        if (sub && sub.isActive === false) {
          return res.status(400).json({ error: `"${product.name}" is currently unavailable for purchase.` });
        }
      }
    }
  }

  // Idempotency Check: 1. By client-provided idempotency key or header
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
  if (idempotencyKey && recentIdempotencyStore.has(idempotencyKey)) {
    const cached = recentIdempotencyStore.get(idempotencyKey)!;
    return res.status(200).json(cached.order);
  }

  // Calculate Subtotal
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }

  // Validate discount
  let discount = 0;
  let validCoupon: any = null;
  if (couponCode) {
    validCoupon = db.getCouponByCode(couponCode);
    if (validCoupon) {
      if (!validCoupon.minOrderAmount || subtotal >= validCoupon.minOrderAmount) {
        if (validCoupon.discountType === 'percentage') {
          discount = Math.round((subtotal * validCoupon.discountValue) / 100);
          if (validCoupon.maxDiscount && discount > validCoupon.maxDiscount) {
            discount = validCoupon.maxDiscount;
          }
        } else {
          discount = validCoupon.discountValue;
        }
        validCoupon.timesUsed += 1;
      }
    }
  }

  // Authoritative 5-Tier Priority Delivery Calculation & COD Verification
  const deliverySnap = db.calculateDelivery({
    city: customer.city,
    province: customer.province,
    areaId: customer.areaId || req.body.areaId,
    areaName: customer.areaName || req.body.areaName,
    zoneId: customer.zoneId || req.body.zoneId,
    postalCode: customer.postalCode,
    items,
    subtotal,
    requestInstallation: Boolean(req.body.requestInstallation),
  });

  if (!deliverySnap.codAvailable && !deliverySnap.quoteRequired) {
    return res.status(400).json({
      error:
        deliverySnap.codBlockedReason ||
        'Cash on Delivery is currently unavailable for the selected area.',
    });
  }

  const shippingFee = deliverySnap.finalDeliveryCharge;
  const installationFee = deliverySnap.installationCharge || 0;
  const grandTotal = Math.max(0, subtotal - discount + shippingFee + installationFee);

  // Idempotency Check: 2. Prevent accidental rapid double-clicks
  const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
  const nowMs = Date.now();
  const recentDuplicate = db.getOrders().find((o) => {
    const oPhone = o.customer.phone.replace(/[^0-9]/g, '');
    const diffMs = nowMs - new Date(o.createdAt).getTime();
    return oPhone === cleanPhone && o.grandTotal === grandTotal && o.items.length === items.length && diffMs < 15000;
  });
  if (recentDuplicate) {
    return res.status(200).json(recentDuplicate);
  }

  // Generate unique Order Number (MA-ORD-YYYYMMDD-XXXX)
  const nowDate = new Date();
  const datePart = `${nowDate.getFullYear()}${String(nowDate.getMonth() + 1).padStart(2, '0')}${String(
    nowDate.getDate()
  ).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `MA-ORD-${datePart}-${randomSuffix}`;

  const enrichedCustomer = {
    ...customer,
    areaId: deliverySnap.areaId || customer.areaId,
    areaName: deliverySnap.areaName || customer.areaName,
    zoneId: deliverySnap.zoneId || customer.zoneId,
    zoneName: deliverySnap.zoneName || customer.zoneName,
  };

  const newOrder: Order = {
    id: 'ord-' + Date.now(),
    orderNumber,
    customerId: req.body.customerId || undefined,
    customer: enrichedCustomer,
    items,
    subtotal,
    discount,
    shippingFee,
    installationFee,
    remoteSurcharge: deliverySnap.remoteAreaSurcharge,
    heavySurcharge: deliverySnap.heavyOversizedSurcharge,
    grandTotal,
    status: 'Pending',
    deliveryStatus: 'Pending',
    deliverySnapshot: deliverySnap,
    codVerified: false,
    codVerificationStatus: 'Pending Verification',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'COD Pending',
    couponCode: validCoupon ? validCoupon.code : undefined,
    customerNotes,
    timeline: [
      {
        status: 'Pending',
        timestamp: new Date().toISOString(),
        note: `Order submitted via COD (${deliverySnap.ruleApplied}, Est. ${deliverySnap.estimatedDeliveryText}).`,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const savedOrder = db.createOrder(newOrder);

  // Save to idempotency store
  if (idempotencyKey) {
    recentIdempotencyStore.set(idempotencyKey, { order: savedOrder, timestamp: Date.now() });
  }
  if (recentIdempotencyStore.size > 200) {
    const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
    for (const [key, val] of recentIdempotencyStore.entries()) {
      if (val.timestamp < fifteenMinAgo) {
        recentIdempotencyStore.delete(key);
      }
    }
  }

  if (supabaseService.isConfigured()) {
    const supaOrderRes = await supabaseService.insertOrder(savedOrder, db.getOrders());
    if (!supaOrderRes.success && !supaOrderRes.tableMissing) {
      return res.status(500).json({
        error: supaOrderRes.error || 'Failed to save order to Supabase database.',
      });
    }
    // Sync updated product stock quantities to Supabase
    for (const item of items) {
      const updatedProd = db.getProductById(item.productId);
      if (updatedProd) {
        await supabaseService.updateProduct(updatedProd.id, { stock: updatedProd.stock }, updatedProd, db.getProducts());
      }
    }
    // Re-query and hydrate local db.ts state from Supabase after order & stock mutation
    const [freshProducts, freshOrders] = await Promise.all([
      supabaseService.getProducts(),
      supabaseService.getOrders(),
    ]);
    if (freshProducts !== null) db.syncProducts(freshProducts);
    if (freshOrders !== null) db.syncOrders(freshOrders);
  }

  db.logAction(
    'NEW_ORDER_COD',
    customer.fullName,
    `New order ${orderNumber} placed for Rs. ${grandTotal.toLocaleString()} COD.`
  );

  return res.status(201).json(savedOrder);
});

// GET /api/orders/track/:orderNumber (Public Order Tracking)
app.get('/api/orders/track/:orderNumber', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const { orderNumber } = req.params;
  const { phone } = req.query;

  if (supabaseService.isConfigured()) {
    try {
      const supaOrders = await supabaseService.getOrders();
      if (supaOrders) {
        db.syncOrders(supaOrders);
      }
    } catch {
      // Fallback to local
    }
  }

  const order = db.getOrderById(orderNumber);
  if (!order) {
    return res.status(404).json({ error: 'Order not found. Please check your Order ID (e.g. MAG-9214).' });
  }

  if (phone && typeof phone === 'string') {
    const cleanQueryPhone = phone.replace(/[^0-9]/g, '');
    const cleanOrderPhone = order.customer.phone.replace(/[^0-9]/g, '');
    if (!cleanOrderPhone.includes(cleanQueryPhone) && !cleanQueryPhone.includes(cleanOrderPhone)) {
      return res.status(401).json({ error: 'Phone number does not match order records.' });
    }
  }

  return res.json(order);
});

// PATCH /api/orders/:id/status & PUT /api/orders/:id (Admin Protected - Update Order Status, Items, Quantities, Customer Details)
const handleAdminOrderUpdate = async (req: Request, res: Response) => {
  const { status, paymentStatus, trackingNumber, courierName, internalNotes, items, customer, discount, shippingFee } = req.body;

  if (supabaseService.isConfigured()) {
    try {
      const [supaOrders, supaProducts] = await Promise.all([
        supabaseService.getOrders(),
        supabaseService.getProducts(),
      ]);
      if (supaOrders) db.syncOrders(supaOrders);
      if (supaProducts && supaProducts.length > 0) db.syncProducts(supaProducts);
    } catch {
      // fallback
    }
  }

  const existingOrder = db.getOrderById(req.params.id);

  if (!existingOrder) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updates: Partial<Order> = {};
  if (paymentStatus) updates.paymentStatus = paymentStatus;
  if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
  if (courierName !== undefined) updates.courierName = courierName;
  if (internalNotes !== undefined) updates.internalNotes = internalNotes;
  if (req.body.deliveryStatus !== undefined) updates.deliveryStatus = req.body.deliveryStatus;
  if (req.body.codVerified !== undefined) updates.codVerified = Boolean(req.body.codVerified);
  if (req.body.codVerificationStatus !== undefined) updates.codVerificationStatus = req.body.codVerificationStatus;
  if (req.body.codVerificationNotes !== undefined) updates.codVerificationNotes = req.body.codVerificationNotes;
  if (req.body.deliveryOverride && typeof req.body.deliveryOverride === 'object') {
    const overrideAmt = Math.max(0, Number(req.body.deliveryOverride.overrideCharge) || 0);
    updates.deliveryOverride = {
      previousCharge: existingOrder.shippingFee,
      overrideCharge: overrideAmt,
      reason: req.body.deliveryOverride.reason || 'Admin Manual Override',
      overriddenBy: (req as any).adminSession?.username || 'Admin',
      overriddenAt: new Date().toISOString(),
    };
    updates.shippingFee = overrideAmt;
    updates.grandTotal = Math.max(
      0,
      existingOrder.subtotal -
        (existingOrder.discount || 0) +
        overrideAmt +
        (existingOrder.installationFee || 0)
    );
  }
  if (customer && typeof customer === 'object') {
    updates.customer = {
      ...existingOrder.customer,
      ...customer,
    };
  }

  // If admin modified order items or quantities, recalculate subtotal, item totals, and grandTotal
  if (Array.isArray(items) && items.length > 0) {
    const normalizedItems = items.map((it: any) => {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitPrice = Number(it.price) || 0;
      return {
        ...it,
        quantity: qty,
        price: unitPrice,
        total: qty * unitPrice,
      };
    });
    const newSubtotal = normalizedItems.reduce((sum: number, it: any) => sum + it.total, 0);
    const effectiveDiscount = discount !== undefined ? Number(discount) : (existingOrder.discount || 0);
    const settings = db.getSettings();
    const effectiveShipping =
      shippingFee !== undefined
        ? Number(shippingFee)
        : newSubtotal >= (settings.freeShippingThreshold || 5000)
        ? 0
        : (settings.standardShippingFee || 450);

    updates.items = normalizedItems;
    updates.subtotal = newSubtotal;
    updates.discount = effectiveDiscount;
    updates.shippingFee = effectiveShipping;
    updates.grandTotal = Math.max(0, newSubtotal - effectiveDiscount + effectiveShipping);
  }

  if (status && status !== existingOrder.status) {
    updates.status = status as OrderStatus;
    const timeline = [...(existingOrder.timeline || [])];
    timeline.push({
      status: status as OrderStatus,
      timestamp: new Date().toISOString(),
      note: req.body.note || `Status updated to ${status} by admin.`,
    });
    updates.timeline = timeline;
    if (status === 'Delivered' && !paymentStatus) {
      updates.paymentStatus = 'COD Collected';
    } else if (status === 'Cancelled' && !paymentStatus) {
      updates.paymentStatus = 'Cancelled';
    }
  }

  const updated = db.updateOrder(req.params.id, updates);
  if (supabaseService.isConfigured() && updated) {
    const supaRes = await supabaseService.updateOrder(req.params.id, updates, updated, db.getOrders());
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({ error: supaRes.error || 'Failed to update order in Supabase.' });
    }
    if (status && status !== existingOrder.status) {
      for (const item of updated.items || []) {
        const prod = db.getProductById(item.productId);
        if (prod) {
          await supabaseService.updateProduct(prod.id, { stock: prod.stock }, prod, db.getProducts());
        }
      }
    }
    const [freshOrders, freshProducts] = await Promise.all([
      supabaseService.getOrders(),
      supabaseService.getProducts(),
    ]);
    if (freshOrders !== null) db.syncOrders(freshOrders);
    if (freshProducts !== null) db.syncProducts(freshProducts);
  }
  db.logAction(
    'UPDATE_ORDER_STATUS',
    (req as any).adminSession.username,
    `Order ${existingOrder.orderNumber} updated (Status: ${status || existingOrder.status}, Total: Rs. ${(updated?.grandTotal || existingOrder.grandTotal).toLocaleString()})`
  );

  return res.json(updated);
};

app.patch('/api/orders/:id/status', requireAdminAuth, handleAdminOrderUpdate);
app.put('/api/orders/:id', requireAdminAuth, handleAdminOrderUpdate);

// PATCH /api/admin/orders/:id/risk-review (Admin/Manager Protected)
app.patch('/api/admin/orders/:id/risk-review', requireRole(['superadmin', 'admin', 'manager']), (req: Request, res: Response) => {
  const session = (req as any).adminSession;
  const updated = db.markRiskReviewed(req.params.id, session.username);
  if (!updated) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  return res.json(updated);
});

// DELETE /api/orders/:id (Admin/Superadmin Protected - Manager/Staff cannot delete orders)
app.delete('/api/orders/:id', requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Order ID is required.' });
  }

  const existingOrder = db.getOrders().find((o) => o.id === id);
  if (!existingOrder && !supabaseService.isConfigured()) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  // Delete from Supabase if configured
  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.deleteOrder(id);
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({
        success: false,
        error: supaRes.error || 'Failed to delete order from Supabase database.',
      });
    }
  }

  const success = db.deleteOrder(id);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  const orderNum = existingOrder?.orderNumber || id;
  db.logAction('DELETE_ORDER', (req as any).adminSession.username, `Deleted order: ${orderNum} (ID: ${id})`);
  return res.json({ success: true, message: 'Order deleted successfully.' });
});

// ==========================================
// 5B. INVENTORY ENGINE & LEDGER API
// ==========================================

// GET /api/admin/inventory/ledger
app.get('/api/admin/inventory/ledger', requireRole(['superadmin', 'admin', 'manager', 'staff']), (req: Request, res: Response) => {
  const { productId } = req.query;
  const ledger = db.getInventoryLedger(productId as string | undefined);
  return res.json(ledger);
});

// POST /api/admin/inventory/adjust (Safe server-side stock adjustment)
app.post('/api/admin/inventory/adjust', requireRole(['superadmin', 'admin', 'manager']), async (req: Request, res: Response) => {
  const { productId, change, reason, referenceId, notes } = req.body;
  if (!productId || typeof change !== 'number' || change === 0) {
    return res.status(400).json({ error: 'Product ID and non-zero numeric stock change are required.' });
  }
  await hydrateProductsFromSupabase();
  const session = (req as any).adminSession;
  const result = db.adjustStock(
    productId,
    change,
    reason || 'Manual Adjustment',
    referenceId || 'ADJ-' + Date.now().toString().slice(-4),
    session.username,
    notes
  );
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  const updatedProd = db.getProductById(productId);
  if (supabaseService.isConfigured() && updatedProd) {
    const supaRes = await supabaseService.updateProduct(productId, { stock: updatedProd.stock }, updatedProd, db.getProducts());
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({ error: supaRes.error || 'Failed to sync stock adjustment to Supabase.' });
    }
    const freshProducts = await supabaseService.getProducts();
    if (freshProducts !== null) {
      db.syncProducts(freshProducts);
    }
  }
  return res.json(result);
});

// ==========================================
// 5C. CUSTOMER MANAGEMENT, AUTH PROFILE SYNC & SEGMENTATION API
// ==========================================

// POST /api/customers/sync (Syncs authenticated Supabase customer profile without storing passwords)
app.post('/api/customers/sync', async (req: Request, res: Response) => {
  const { id, fullName, email, phone, savedAddresses, accountStatus, createdAt } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Customer email is required.' });
  }
  const customerId = id || `cust-${email.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const userObj = db.upsertRegisteredCustomer({
    id: customerId,
    fullName: fullName || email.split('@')[0],
    email,
    phone: phone || '',
    savedAddresses: Array.isArray(savedAddresses) ? savedAddresses : [],
    accountStatus: accountStatus || 'Active',
    createdAt: createdAt || new Date().toISOString(),
  });
  return res.json({ success: true, customer: userObj });
});

// GET /api/customers/orders (Retrieves orders strictly belonging to the logged-in customer)
app.get('/api/customers/orders', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const { customerId, email, phone } = req.query;
  if (!customerId && !email && !phone) {
    return res.json([]);
  }
  if (supabaseService.isConfigured()) {
    try {
      const supaOrders = await supabaseService.getOrders();
      if (supaOrders) db.syncOrders(supaOrders);
    } catch {
      // ignore
    }
  }
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPhone = typeof phone === 'string' ? phone.replace(/[^0-9]/g, '') : '';
  const cleanId = typeof customerId === 'string' ? customerId.trim() : '';

  const myOrders = db.getOrders().filter((o) => {
    if (cleanId && o.customerId && o.customerId === cleanId) return true;
    if (cleanEmail && o.customer?.email && o.customer.email.trim().toLowerCase() === cleanEmail) return true;
    if (cleanPhone && cleanPhone.length >= 7 && o.customer?.phone) {
      const oPhone = o.customer.phone.replace(/[^0-9]/g, '');
      if (oPhone && (oPhone.includes(cleanPhone) || cleanPhone.includes(oPhone))) return true;
    }
    return false;
  });

  return res.json(myOrders);
});

// GET /api/admin/customers
app.get('/api/admin/customers', requireRole(['superadmin', 'admin', 'manager', 'staff']), async (_req: Request, res: Response) => {
  if (supabaseService.isConfigured()) {
    const supaOrders = await supabaseService.getOrders();
    if (supaOrders) db.syncOrders(supaOrders);
  }
  const customers = db.getCustomers();
  return res.json(customers);
});

// PATCH /api/admin/customers/:phone/notes (Internal Staff Notes)
app.patch('/api/admin/customers/:phone/notes', requireRole(['superadmin', 'admin', 'manager']), (req: Request, res: Response) => {
  const { notes } = req.body;
  const session = (req as any).adminSession;
  db.updateCustomerNote(req.params.phone, notes || '', session.username);
  return res.json({ success: true, message: 'Customer internal note updated successfully.' });
});

// ==========================================
// 6. BANNERS API
// ==========================================

app.get('/api/banners', (_req: Request, res: Response) => {
  return res.json(db.getBanners());
});

app.post('/api/banners', requireAdminAuth, (req: Request, res: Response) => {
  const newBanner = {
    ...req.body,
    id: 'b-' + Date.now(),
    displayOrder: req.body.displayOrder || db.getBanners().length + 1,
    isActive: req.body.isActive !== false,
  };
  const created = db.createBanner(newBanner);
  return res.status(201).json(created);
});

app.put('/api/banners/:id', requireAdminAuth, (req: Request, res: Response) => {
  const updated = db.updateBanner(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Banner not found' });
  return res.json(updated);
});

app.delete('/api/banners/:id', requireAdminAuth, (req: Request, res: Response) => {
  const success = db.deleteBanner(req.params.id);
  return res.json({ success });
});

// ==========================================
// 7. COUPONS & SMART OFFERS API
// ==========================================

async function hydrateCouponsFromSupabase() {
  if (supabaseService.isConfigured()) {
    try {
      const supaCoupons = await supabaseService.getCoupons();
      if (supaCoupons && supaCoupons.length > 0) {
        db.syncCoupons(supaCoupons);
      } else if (db.getCoupons().length > 0) {
        for (const c of db.getCoupons()) {
          await supabaseService.saveCoupon(c, db.getCoupons());
        }
      }
    } catch {
      // ignore
    }
  }
  return db.getCoupons();
}

app.get('/api/coupons', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const coupons = await hydrateCouponsFromSupabase();
  return res.json(coupons);
});

app.post('/api/coupons/validate', async (req: Request, res: Response) => {
  await hydrateCouponsFromSupabase();
  const { code, cartSubtotal, cartItems, customerEmail } = req.body;
  if (!code) return res.status(400).json({ valid: false, message: 'Please enter a coupon code' });

  const coupon = db.getCouponByCode(code);
  if (!coupon || !coupon.isActive) {
    return res.status(404).json({ valid: false, message: 'Invalid or disabled coupon code' });
  }

  const now = Date.now();
  if (coupon.startDate && new Date(coupon.startDate).getTime() > now) {
    return res.status(400).json({ valid: false, message: 'This coupon campaign has not started yet.' });
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
    return res.status(400).json({ valid: false, message: 'This coupon code has expired.' });
  }
  if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
    return res.status(400).json({ valid: false, message: 'This coupon has reached its maximum usage limit.' });
  }
  if (coupon.perCustomerLimit && customerEmail) {
    const usedByCustomer = db
      .getOrders()
      .filter(
        (o) =>
          o.status !== 'Cancelled' &&
          o.couponCode?.toUpperCase() === coupon.code.toUpperCase() &&
          o.customer?.email?.toLowerCase() === String(customerEmail).toLowerCase()
      ).length;
    if (usedByCustomer >= coupon.perCustomerLimit) {
      return res.status(400).json({
        valid: false,
        message: `You have already used this coupon the maximum allowed times (${coupon.perCustomerLimit}).`,
      });
    }
  }

  // Check product/category eligibility if specified
  if (
    Array.isArray(cartItems) &&
    cartItems.length > 0 &&
    ((coupon.applicableProductIds && coupon.applicableProductIds.length > 0) ||
      (coupon.applicableCategoryIds && coupon.applicableCategoryIds.length > 0))
  ) {
    const prodSet = new Set(coupon.applicableProductIds || []);
    const catSet = new Set(coupon.applicableCategoryIds || []);
    const hasEligibleItem = cartItems.some((item: any) => {
      const p = db.getProductById(item.productId);
      if (prodSet.has(item.productId)) return true;
      if (p && catSet.has(p.categoryId)) return true;
      return false;
    });
    if (!hasEligibleItem) {
      return res.status(400).json({
        valid: false,
        message: 'This coupon is only valid for selected promotional products or categories.',
      });
    }
  }

  if (coupon.minOrderAmount && cartSubtotal < coupon.minOrderAmount) {
    return res.status(400).json({
      valid: false,
      message: `Coupon requires a minimum order of PKR ${coupon.minOrderAmount.toLocaleString()}`,
    });
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = Math.round((cartSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  return res.json({
    valid: true,
    code: coupon.code,
    description: coupon.description,
    discount,
  });
});

app.post('/api/coupons', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateCouponsFromSupabase();
  const newCoupon: Coupon = {
    ...req.body,
    id: req.body.id || 'c-' + Date.now(),
    code: String(req.body.code || '').toUpperCase().trim(),
    description: req.body.description || 'Promotional Discount Coupon',
    discountType: req.body.discountType === 'percentage' ? 'percentage' : 'fixed',
    discountValue: Number(req.body.discountValue) || 0,
    minOrderAmount: req.body.minOrderAmount ? Number(req.body.minOrderAmount) : 0,
    maxDiscount: req.body.maxDiscount ? Number(req.body.maxDiscount) : undefined,
    usageLimit: req.body.usageLimit ? Number(req.body.usageLimit) : undefined,
    perCustomerLimit: req.body.perCustomerLimit ? Number(req.body.perCustomerLimit) : undefined,
    startDate: req.body.startDate || undefined,
    expiresAt: req.body.expiresAt || undefined,
    applicableProductIds: Array.isArray(req.body.applicableProductIds) ? req.body.applicableProductIds : [],
    applicableCategoryIds: Array.isArray(req.body.applicableCategoryIds) ? req.body.applicableCategoryIds : [],
    timesUsed: Number(req.body.timesUsed) || 0,
    isActive: req.body.isActive !== false,
    createdAt: req.body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const created = db.createCoupon(newCoupon);
  if (supabaseService.isConfigured()) {
    await supabaseService.saveCoupon(created, db.getCoupons());
  }
  return res.status(201).json(created);
});

app.put('/api/coupons/:id', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateCouponsFromSupabase();
  const updated = db.updateCoupon(req.params.id, {
    ...req.body,
    ...(req.body.code ? { code: String(req.body.code).toUpperCase().trim() } : {}),
  });
  if (!updated) return res.status(404).json({ error: 'Coupon not found' });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveCoupon(updated, db.getCoupons());
  }
  return res.json(updated);
});

app.delete('/api/coupons/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const success = db.deleteCoupon(req.params.id);
  if (supabaseService.isConfigured()) {
    await supabaseService.deleteCoupon(req.params.id, db.getCoupons());
  }
  return res.json({ success });
});

// --- SMART OFFERS API ---
async function hydrateSmartOffersFromSupabase() {
  if (supabaseService.isConfigured()) {
    try {
      const supaOffers = await supabaseService.getSmartOffers();
      if (supaOffers && supaOffers.length > 0) {
        db.syncSmartOffers(supaOffers);
      } else if (db.getSmartOffers().length > 0) {
        for (const o of db.getSmartOffers()) {
          await supabaseService.saveSmartOffer(o, db.getSmartOffers());
        }
      }
    } catch {
      // ignore
    }
  }
  return db.getSmartOffers();
}

app.get('/api/smart-offers', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const offers = await hydrateSmartOffersFromSupabase();
  return res.json(offers);
});

app.post('/api/smart-offers', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateSmartOffersFromSupabase();
  const offer = db.upsertSmartOffer({
    ...req.body,
    id: req.body.id || 'offer-' + Date.now(),
    name: String(req.body.name || 'Special Promotion').trim(),
    shortDescription: req.body.shortDescription || '',
    bannerImage:
      req.body.bannerImage ||
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    offerType: req.body.offerType || 'Flash Sale',
    discountPercentage: req.body.discountPercentage ? Number(req.body.discountPercentage) : undefined,
    fixedDiscountAmount: req.body.fixedDiscountAmount ? Number(req.body.fixedDiscountAmount) : undefined,
    minOrderValue: req.body.minOrderValue ? Number(req.body.minOrderValue) : undefined,
    maxDiscount: req.body.maxDiscount ? Number(req.body.maxDiscount) : undefined,
    startDate: req.body.startDate || new Date().toISOString(),
    endDate: req.body.endDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    applicableProductIds: Array.isArray(req.body.applicableProductIds) ? req.body.applicableProductIds : [],
    applicableCategoryIds: Array.isArray(req.body.applicableCategoryIds) ? req.body.applicableCategoryIds : [],
    applicableSubcategoryIds: Array.isArray(req.body.applicableSubcategoryIds) ? req.body.applicableSubcategoryIds : [],
    couponCode: req.body.couponCode ? String(req.body.couponCode).toUpperCase().trim() : undefined,
    displayPriority: Number(req.body.displayPriority ?? 1),
    isVisible: req.body.isVisible !== false,
    createdAt: req.body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveSmartOffer(offer, db.getSmartOffers());
  }
  db.logAction('UPSERT_SMART_OFFER', (req as any).adminSession?.username || 'Admin', `Saved Smart Offer: ${offer.name}`);
  return res.status(201).json(offer);
});

app.put('/api/smart-offers/:id', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateSmartOffersFromSupabase();
  const existing = db.getSmartOffers().find((o) => o.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Smart offer not found' });
  const updated = db.upsertSmartOffer({
    ...existing,
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveSmartOffer(updated, db.getSmartOffers());
  }
  return res.json(updated);
});

app.delete('/api/smart-offers/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const success = db.deleteSmartOffer(req.params.id);
  if (supabaseService.isConfigured()) {
    await supabaseService.deleteSmartOffer(req.params.id, db.getSmartOffers());
  }
  return res.json({ success });
});

// ==========================================
// 7B. COMPANY PROFILE PAGES API
// ==========================================

async function hydrateCompanyPagesFromSupabase() {
  if (supabaseService.isConfigured()) {
    try {
      const supaPages = await supabaseService.getCompanyPages();
      if (supaPages && supaPages.length > 0) {
        db.syncCompanyPages(supaPages);
      } else if (db.getCompanyPages().length > 0) {
        for (const p of db.getCompanyPages()) {
          await supabaseService.saveCompanyPage(p, db.getCompanyPages());
        }
      }
    } catch {
      // ignore
    }
  }
  return db.getCompanyPages();
}

app.get('/api/company-pages', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const pages = await hydrateCompanyPagesFromSupabase();
  return res.json(pages);
});

app.post('/api/company-pages', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateCompanyPagesFromSupabase();
  const title = String(req.body.title || 'Company Page').trim();
  const slug =
    req.body.slug ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const page = db.upsertCompanyPage({
    id: req.body.id || 'page-' + Date.now(),
    slug,
    title,
    subtitle: req.body.subtitle || '',
    heroImage: req.body.heroImage || '',
    content: req.body.content || '',
    sections: Array.isArray(req.body.sections) ? req.body.sections : [],
    buttons: Array.isArray(req.body.buttons) ? req.body.buttons : [],
    displayOrder: Number(req.body.displayOrder ?? db.getCompanyPages().length + 1),
    isVisible: req.body.isVisible !== false,
    createdAt: req.body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveCompanyPage(page, db.getCompanyPages());
  }
  db.logAction('UPSERT_COMPANY_PAGE', (req as any).adminSession?.username || 'Admin', `Saved company page: ${page.title}`);
  return res.status(201).json(page);
});

app.put('/api/company-pages/:id', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateCompanyPagesFromSupabase();
  const existing = db.getCompanyPages().find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Company page not found' });
  const updated = db.upsertCompanyPage({
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveCompanyPage(updated, db.getCompanyPages());
  }
  return res.json(updated);
});

app.delete('/api/company-pages/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const success = db.deleteCompanyPage(req.params.id);
  if (supabaseService.isConfigured()) {
    await supabaseService.deleteCompanyPage(req.params.id, db.getCompanyPages());
  }
  return res.json({ success });
});

// ==========================================
// 7C. BUILD YOUR SOLUTION API
// ==========================================

async function hydrateSolutionsFromSupabase() {
  if (supabaseService.isConfigured()) {
    try {
      const supaSolutions = await supabaseService.getSolutions();
      if (supaSolutions && supaSolutions.length > 0) {
        db.syncSolutions(supaSolutions);
      } else if (db.getSolutions().length > 0) {
        for (const s of db.getSolutions()) {
          await supabaseService.saveSolution(s, db.getSolutions());
        }
      }
    } catch {
      // ignore
    }
  }
  return db.getSolutions();
}

app.get('/api/solutions', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const solutions = await hydrateSolutionsFromSupabase();
  return res.json(solutions);
});

app.post('/api/solutions', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateSolutionsFromSupabase();
  const title = String(req.body.title || 'Custom Solution Package').trim();
  const slug =
    req.body.slug ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const solution = db.upsertSolution({
    id: req.body.id || 'sol-' + Date.now(),
    slug,
    title,
    subtitle: req.body.subtitle || '',
    description: req.body.description || '',
    imageUrl:
      req.body.imageUrl ||
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    categoryTag: req.body.categoryTag || 'Complete Solution',
    steps: Array.isArray(req.body.steps) ? req.body.steps : [],
    installationCharge: Number(req.body.installationCharge || 0),
    deliveryCharge: Number(req.body.deliveryCharge || 0),
    solutionDiscount: Number(req.body.solutionDiscount || 0),
    customServiceCharge: Number(req.body.customServiceCharge || 0),
    customServiceLabel: req.body.customServiceLabel || '',
    displayOrder: Number(req.body.displayOrder ?? db.getSolutions().length + 1),
    isVisible: req.body.isVisible !== false,
    createdAt: req.body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveSolution(solution, db.getSolutions());
  }
  db.logAction('UPSERT_SOLUTION', (req as any).adminSession?.username || 'Admin', `Saved solution package: ${solution.title}`);
  return res.status(201).json(solution);
});

app.put('/api/solutions/:id', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateSolutionsFromSupabase();
  const existing = db.getSolutions().find((s) => s.id === req.params.id || s.slug === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Solution package not found' });
  const updated = db.upsertSolution({
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveSolution(updated, db.getSolutions());
  }
  return res.json(updated);
});

app.delete('/api/solutions/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const success = db.deleteSolution(req.params.id);
  if (supabaseService.isConfigured()) {
    await supabaseService.deleteSolution(req.params.id, db.getSolutions());
  }
  return res.json({ success });
});

// Server-side Solution Pricing Validator
app.post('/api/solutions/calculate', async (req: Request, res: Response) => {
  await Promise.all([hydrateSolutionsFromSupabase(), hydrateProductsFromSupabase()]);
  const { solutionId, selections } = req.body;
  const solution = db.getSolutions().find((s) => s.id === solutionId || s.slug === solutionId);
  if (!solution) {
    return res.status(404).json({ error: 'Solution package not found.' });
  }

  const lineItems: any[] = [];
  let productsSubtotal = 0;

  if (Array.isArray(selections)) {
    for (const sel of selections) {
      const prod = db.getProductById(sel.productId);
      if (prod && prod.status !== 'inactive' && !prod.isArchived) {
        const qty = Math.max(1, Number(sel.quantity) || 1);
        const unitPrice = prod.salePrice || prod.discountPrice || prod.price;
        const total = unitPrice * qty;
        productsSubtotal += total;
        lineItems.push({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          productImage: prod.images?.[0] || prod.imageUrl || '',
          stepTitle: sel.stepTitle || '',
          quantity: qty,
          unitPrice,
          total,
        });
      }
    }
  }

  const installationCharge = Number(solution.installationCharge || 0);
  const deliveryCharge = Number(solution.deliveryCharge || 0);
  const customServiceCharge = Number(solution.customServiceCharge || 0);
  const solutionDiscount = Number(solution.solutionDiscount || 0);
  const estimatedTotal = Math.max(
    0,
    productsSubtotal + installationCharge + deliveryCharge + customServiceCharge - solutionDiscount
  );

  return res.json({
    solutionId: solution.id,
    solutionTitle: solution.title,
    lineItems,
    productsSubtotal,
    installationCharge,
    deliveryCharge,
    customServiceCharge,
    customServiceLabel: solution.customServiceLabel || 'Custom Engineering Service',
    solutionDiscount,
    estimatedTotal,
  });
});

// ==========================================
// 8. REVIEWS API
// ==========================================

app.get('/api/reviews', (req: Request, res: Response) => {
  const { productId } = req.query;
  const reviews = db.getReviews(typeof productId === 'string' ? productId : undefined);
  return res.json(reviews);
});

app.post('/api/reviews', (req: Request, res: Response) => {
  const { productId, customerName, customerEmail, rating, title, comment } = req.body;
  if (!productId || !customerName || !rating || !comment) {
    return res.status(400).json({ error: 'Missing required review fields' });
  }

  const review = db.createReview({
    id: 'rev-' + Date.now(),
    productId,
    customerName,
    customerEmail,
    rating: Math.min(5, Math.max(1, parseInt(rating, 10))),
    title: title || 'Verified Customer Review',
    comment,
    isVerifiedPurchase: true,
    status: 'approved', // auto-approve verified customer feedback
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json(review);
});

app.patch('/api/reviews/:id', requireAdminAuth, (req: Request, res: Response) => {
  const updated = db.updateReview(req.params.id, req.body);
  return res.json(updated);
});

// ==========================================
// 9. STORE SETTINGS API
// ==========================================

app.get('/api/settings', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (supabaseService.isConfigured()) {
    try {
      const supaSettings = await supabaseService.getSettings();
      if (supaSettings) {
        const merged = db.updateSettings(supaSettings);
        return res.json(merged);
      }
    } catch {
      // fallback
    }
  }
  return res.json(db.getSettings());
});

app.put('/api/settings', requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
  if (supabaseService.isConfigured()) {
    await supabaseService.saveSettings(updated);
  }
  db.logAction('UPDATE_SETTINGS', (req as any).adminSession.username, 'Updated store configurations');
  return res.json(updated);
});

// ==========================================
// 10. B2B / WHOLESALE & SOLUTION QUOTATIONS API (WITH PERMANENT TRACKING CODE)
// ==========================================

async function hydrateQuotationsFromSupabase() {
  if (supabaseService.isConfigured()) {
    try {
      const supaQuotes = await supabaseService.getQuotations();
      if (supaQuotes && supaQuotes.length > 0) {
        db.syncInquiries(supaQuotes);
      } else if (db.getInquiries().length > 0) {
        for (const q of db.getInquiries()) {
          await supabaseService.saveQuotation(q, db.getInquiries());
        }
      }
    } catch {
      // ignore
    }
  }
  return db.getInquiries();
}

app.post('/api/inquiries', async (req: Request, res: Response) => {
  await Promise.all([hydrateQuotationsFromSupabase(), hydrateProductsFromSupabase()]);
  const {
    quoteType,
    solutionId,
    solutionTitle,
    customerId,
    companyName,
    businessName,
    contactPerson,
    customerName,
    phone,
    email,
    address,
    city,
    categoryInterest,
    estimatedBudget,
    projectDetails,
    customerMessage,
    items,
    installationCharges,
    deliveryCharges,
    discount,
  } = req.body;

  const finalContact = contactPerson || customerName || '';
  const finalDetails = projectDetails || customerMessage || solutionTitle || 'Commercial Quotation Request';
  if (!finalContact || !phone) {
    return res.status(400).json({ error: 'Please provide contact person name and phone number.' });
  }

  // Server-side authoritative tracking code generation (Never trust client tracking code)
  const trackingCode = db.generateUniqueQuoteTrackingCode();

  // Calculate authoritative product line items if provided
  const validatedItems: any[] = [];
  let calculatedSubtotal = 0;
  if (Array.isArray(items)) {
    for (const it of items) {
      const prod = db.getProductById(it.productId);
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitPrice = prod
        ? prod.salePrice || prod.discountPrice || prod.price
        : Number(it.unitPrice || it.price || 0);
      const lineTotal = unitPrice * qty;
      calculatedSubtotal += lineTotal;
      validatedItems.push({
        productId: prod?.id || it.productId || 'custom',
        productName: prod?.name || it.productName || 'Equipment Item',
        sku: prod?.sku || it.sku || 'N/A',
        productImage: prod?.images?.[0] || prod?.imageUrl || it.productImage || '',
        stepTitle: it.stepTitle || '',
        quantity: qty,
        unitPrice,
        total: lineTotal,
      });
    }
  }

  const inst = Number(installationCharges || 0);
  const deliv = Number(deliveryCharges || 0);
  const disc = Number(discount || 0);
  const finalTotal = Math.max(0, calculatedSubtotal + inst + deliv - disc);

  const inquiry = db.createInquiry({
    id: 'inq-' + Date.now(),
    quoteTrackingCode: trackingCode,
    quote_tracking_code: trackingCode,
    quoteType: quoteType === 'solution' ? 'solution' : 'b2b',
    solutionId,
    solutionTitle,
    customerId,
    companyName: companyName || businessName || (quoteType === 'solution' ? 'Solution Package Client' : 'Private Contracting Project'),
    businessName: businessName || companyName || 'Private Contracting Project',
    contactPerson: finalContact,
    customerName: finalContact,
    phone,
    email: email || '',
    address: address || '',
    city: city || 'Lahore',
    categoryInterest: categoryInterest || solutionTitle || 'General Electrical & Solar',
    estimatedBudget: estimatedBudget || (finalTotal > 0 ? `PKR ${finalTotal.toLocaleString()}` : undefined),
    projectDetails: finalDetails,
    customerMessage: customerMessage || finalDetails,
    items: validatedItems,
    subtotal: calculatedSubtotal,
    discount: disc,
    deliveryCharges: deliv,
    installationCharges: inst,
    total: finalTotal,
    status: 'Requested',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (supabaseService.isConfigured()) {
    await supabaseService.saveQuotation(inquiry, db.getInquiries());
  }

  db.logAction(
    'B2B_QUOTATION_CREATED',
    finalContact,
    `Created quotation ${inquiry.quoteTrackingCode} from ${inquiry.city}`
  );

  return res.status(201).json({
    success: true,
    inquiryNumber: inquiry.quoteTrackingCode,
    quoteTrackingCode: inquiry.quoteTrackingCode,
    quote: inquiry,
  });
});

// Public / Customer Track Quote by Tracking Code (Strips private adminNotes)
app.get('/api/inquiries/track/:code', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  await hydrateQuotationsFromSupabase();
  const code = String(req.params.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'Please enter a valid Quote Tracking Code.' });
  }
  const quote = db.getInquiryByIdOrCode(code);
  if (!quote) {
    return res.status(404).json({ error: `No quotation found with tracking code "${code.toUpperCase()}".` });
  }
  const { adminNotes, ...publicQuote } = quote;
  return res.json(publicQuote);
});

// Customer My Quotes endpoint (returns quotes matching customerId, email, or phone without private adminNotes)
app.get('/api/customers/quotes', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  await hydrateQuotationsFromSupabase();
  const { customerId, email, phone } = req.query;
  if (!customerId && !email && !phone) {
    return res.json([]);
  }
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPhone = typeof phone === 'string' ? phone.replace(/[^0-9]/g, '') : '';
  const cleanId = typeof customerId === 'string' ? customerId.trim() : '';

  const matched = db
    .getInquiries()
    .filter((q) => {
      if (cleanId && q.customerId && q.customerId === cleanId) return true;
      if (cleanEmail && q.email && q.email.trim().toLowerCase() === cleanEmail) return true;
      if (cleanPhone && cleanPhone.length >= 7 && q.phone) {
        const qPhone = q.phone.replace(/[^0-9]/g, '');
        if (qPhone && (qPhone.includes(cleanPhone) || cleanPhone.includes(qPhone))) return true;
      }
      return false;
    })
    .map(({ adminNotes, ...safeQuote }) => safeQuote);

  return res.json(matched);
});

// Customer Confirm (Accept) or Reject Quotation — preserves tracking code permanently
app.post('/api/inquiries/:code/respond', async (req: Request, res: Response) => {
  await hydrateQuotationsFromSupabase();
  const code = String(req.params.code || '').trim();
  const { action, customerNote } = req.body; // action: 'accept' | 'reject'
  const existing = db.getInquiryByIdOrCode(code);
  if (!existing) {
    return res.status(404).json({ error: 'Quotation not found.' });
  }

  const nextStatus = action === 'reject' ? 'Rejected' : 'Customer Confirmed';
  const updated = db.updateInquiry(existing.id, {
    status: nextStatus,
    ...(action !== 'reject' ? { confirmedAt: new Date().toISOString() } : {}),
    ...(customerNote ? { customerMessage: `${existing.customerMessage || ''}\n[Customer Response]: ${customerNote}`.trim() } : {}),
  });

  if (updated && supabaseService.isConfigured()) {
    await supabaseService.saveQuotation(updated, db.getInquiries());
  }

  db.logAction(
    action === 'reject' ? 'QUOTE_REJECTED_BY_CUSTOMER' : 'QUOTE_CONFIRMED_BY_CUSTOMER',
    existing.contactPerson,
    `Customer ${action === 'reject' ? 'rejected' : 'confirmed'} quote ${existing.quoteTrackingCode}`
  );

  const { adminNotes, ...safeUpdated } = updated || existing;
  return res.json({
    success: true,
    message:
      action === 'reject'
        ? 'Quotation has been marked as Rejected.'
        : 'Your quotation has been confirmed successfully.',
    quote: safeUpdated,
  });
});

app.get('/api/inquiries', requireAdminAuth, async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const quotes = await hydrateQuotationsFromSupabase();
  return res.json(quotes);
});

// Admin Update Quotation (Pricing, Items, Status, Notes) — NEVER changes quoteTrackingCode
app.put('/api/inquiries/:id', requireAdminAuth, async (req: Request, res: Response) => {
  await hydrateQuotationsFromSupabase();
  const existing = db.getInquiryByIdOrCode(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Quotation not found.' });
  }

  const updates: Partial<B2BInquiry> = { ...req.body };
  delete (updates as any).quoteTrackingCode;
  delete (updates as any).quote_tracking_code;

  if (Array.isArray(updates.items)) {
    const recalcItems = updates.items.map((it) => {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitPrice = Number(it.unitPrice) || 0;
      return {
        ...it,
        quantity: qty,
        unitPrice,
        total: qty * unitPrice,
      };
    });
    const subtotal = recalcItems.reduce((sum, it) => sum + it.total, 0);
    const discount = updates.discount !== undefined ? Number(updates.discount) : Number(existing.discount || 0);
    const deliveryCharges =
      updates.deliveryCharges !== undefined
        ? Number(updates.deliveryCharges)
        : Number(existing.deliveryCharges || 0);
    const installationCharges =
      updates.installationCharges !== undefined
        ? Number(updates.installationCharges)
        : Number(existing.installationCharges || 0);
    const total = Math.max(0, subtotal + deliveryCharges + installationCharges - discount);

    updates.items = recalcItems;
    updates.subtotal = subtotal;
    updates.discount = discount;
    updates.deliveryCharges = deliveryCharges;
    updates.installationCharges = installationCharges;
    updates.total = total;
    updates.adminQuotationAmount = total;
  }

  if (updates.status === 'Quotation Sent' || updates.status === 'Quoted') {
    updates.quotedAt = new Date().toISOString();
  }
  if (updates.status === 'Customer Confirmed' && !existing.confirmedAt) {
    updates.confirmedAt = new Date().toISOString();
  }

  const updated = db.updateInquiry(existing.id, updates);
  if (updated && supabaseService.isConfigured()) {
    await supabaseService.saveQuotation(updated, db.getInquiries());
  }

  db.logAction(
    'UPDATE_QUOTATION',
    (req as any).adminSession?.username || 'Admin',
    `Updated quotation ${existing.quoteTrackingCode} (Status: ${updated?.status})`
  );

  return res.json(updated);
});

// Admin Convert Confirmed Quote to Order — Keeps original Quote ID & Quote Tracking Code
app.post('/api/inquiries/:id/convert-to-order', requireAdminAuth, async (req: Request, res: Response) => {
  await Promise.all([hydrateQuotationsFromSupabase(), hydrateProductsFromSupabase()]);
  const quote = db.getInquiryByIdOrCode(req.params.id);
  if (!quote) {
    return res.status(404).json({ error: 'Quotation not found.' });
  }

  if (quote.convertedOrderNumber) {
    return res.status(400).json({
      error: `This quotation is already linked to Order #${quote.convertedOrderNumber}.`,
    });
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const orderSeq = String(db.getOrders().length + 1).padStart(4, '0');
  const orderNumber = `MA-ORD-${dateStr}-${orderSeq}`;

  const orderItems =
    Array.isArray(quote.items) && quote.items.length > 0
      ? quote.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          productImage:
            it.productImage ||
            'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80',
          sku: it.sku || 'B2B-ITEM',
          price: it.unitPrice,
          quantity: it.quantity,
          total: it.total,
        }))
      : [
          {
            productId: 'b2b-custom',
            productName: `${quote.companyName} — ${quote.categoryInterest}`,
            productImage:
              'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80',
            sku: quote.quoteTrackingCode || 'B2B-QUOTE',
            price: Number(quote.total || quote.adminQuotationAmount || 0),
            quantity: 1,
            total: Number(quote.total || quote.adminQuotationAmount || 0),
          },
        ];

  const subtotal = Number(quote.subtotal || orderItems.reduce((s, i) => s + i.total, 0));
  const discount = Number(quote.discount || 0);
  const shippingFee = Number(quote.deliveryCharges || 0) + Number(quote.installationCharges || 0);
  const grandTotal = Math.max(0, subtotal - discount + shippingFee);

  const newOrder: Order = {
    id: 'ord-' + Date.now(),
    orderNumber,
    customerId: quote.customerId,
    customer: {
      fullName: quote.contactPerson || quote.customerName || quote.companyName,
      phone: quote.phone,
      email: quote.email || undefined,
      addressLine: quote.address || `${quote.companyName}, ${quote.city}`,
      city: quote.city || 'Lahore',
      province: 'Punjab',
    },
    items: orderItems,
    subtotal,
    discount,
    shippingFee,
    grandTotal,
    status: 'Confirmed',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'COD Pending',
    customerNotes: `Converted from B2B Quotation ${quote.quoteTrackingCode}. ${quote.customerMessage || ''}`.trim(),
    internalNotes: `Source Quote Tracking Code: ${quote.quoteTrackingCode} (Quote ID: ${quote.id})`,
    timeline: [
      {
        status: 'Confirmed',
        timestamp: new Date().toISOString(),
        note: `Created from confirmed B2B Quotation ${quote.quoteTrackingCode}`,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createdOrder = db.createOrder(newOrder);
  if (supabaseService.isConfigured()) {
    await supabaseService.insertOrder(createdOrder, db.getOrders());
  }

  const updatedQuote = db.updateInquiry(quote.id, {
    status: 'Processing',
    convertedOrderId: createdOrder.id,
    convertedOrderNumber: createdOrder.orderNumber,
  });
  if (updatedQuote && supabaseService.isConfigured()) {
    await supabaseService.saveQuotation(updatedQuote, db.getInquiries());
  }

  db.logAction(
    'CONVERT_QUOTE_TO_ORDER',
    (req as any).adminSession?.username || 'Admin',
    `Converted Quote ${quote.quoteTrackingCode} → Order ${createdOrder.orderNumber}`
  );

  return res.status(201).json({
    success: true,
    quote: updatedQuote,
    order: createdOrder,
  });
});

// DELETE /api/inquiries/:id (Admin Protected)
app.delete('/api/inquiries/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const existing = db.getInquiryByIdOrCode(req.params.id);
  const success = db.deleteInquiry(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Inquiry not found' });
  }
  if (supabaseService.isConfigured() && existing) {
    await supabaseService.deleteQuotation(existing.id, db.getInquiries());
  }
  db.logAction('DELETE_INQUIRY', (req as any).adminSession.username, `Deleted quotation inquiry: ${existing?.quoteTrackingCode || req.params.id}`);
  return res.json({ success: true, message: 'Quotation deleted successfully.' });
});

// ==========================================
// 11. ANALYTICS & AUDIT LOGS
// ==========================================

app.get('/api/admin/analytics', requireAdminAuth, async (_req: Request, res: Response) => {
  await hydrateProductsFromSupabase();
  if (supabaseService.isConfigured()) {
    try {
      const supaOrders = await supabaseService.getOrders();
      if (supaOrders !== null) db.syncOrders(supaOrders);
    } catch {
      // fallback
    }
  }
  const orders = db.getOrders();
  const products = db.getProducts();

  const totalSales = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysSales = orders
    .filter((o) => o.status !== 'Cancelled' && o.createdAt.startsWith(todayStr))
    .reduce((sum, o) => sum + o.grandTotal, 0);

  const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
  const completedOrders = orders.filter((o) => o.status === 'Delivered').length;
  const lowStockProducts = products.filter((p) => p.stock <= p.lowStockThreshold);

  // Category distribution
  const categoryCounts: Record<string, number> = {};
  for (const p of products) {
    categoryCounts[p.categoryName] = (categoryCounts[p.categoryName] || 0) + 1;
  }

  return res.json({
    totalSales,
    todaysSales,
    totalOrders: orders.length,
    pendingOrders,
    completedOrders,
    cancelledOrders: orders.filter((o) => o.status === 'Cancelled').length,
    totalProducts: products.length,
    lowStockCount: lowStockProducts.length,
    categoryCounts,
    lowStockProducts: lowStockProducts.slice(0, 5),
  });
});

app.get('/api/admin/analytics/advanced', requireRole(['superadmin', 'admin', 'manager']), async (req: Request, res: Response) => {
  await hydrateProductsFromSupabase();
  if (supabaseService.isConfigured()) {
    try {
      const supaOrders = await supabaseService.getOrders();
      if (supaOrders !== null) db.syncOrders(supaOrders);
    } catch {
      // ignore
    }
  }
  const range = (req.query.range as string) || 'month';
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const analytics = db.getAdvancedAnalytics(range, startDate, endDate);
  return res.json(analytics);
});

app.get('/api/admin/audit-logs', requireAdminAuth, (_req: Request, res: Response) => {
  return res.json(db.getAuditLogs());
});

// ==========================================
// 11B. COMPLETE DELIVERY, AREAS & ZONES API
// ==========================================

async function hydrateDeliveryFromSupabase() {
  if (supabaseService.isConfigured()) {
    try {
      const [sZones, sAreas, sSettings] = await Promise.all([
        supabaseService.getDeliveryZones(),
        supabaseService.getDeliveryAreas(),
        supabaseService.getDeliverySettings(),
      ]);
      if (sZones && sZones.length > 0) {
        db.syncDeliveryZones(sZones);
      } else {
        for (const z of db.getDeliveryZones()) {
          await supabaseService.saveDeliveryZone(z, db.getDeliveryZones());
        }
      }
      if (sAreas && sAreas.length > 0) {
        db.syncDeliveryAreas(sAreas);
      } else {
        for (const a of db.getDeliveryAreas()) {
          await supabaseService.saveDeliveryArea(a, db.getDeliveryAreas());
        }
      }
      if (sSettings) {
        db.updateDeliverySettings(sSettings);
      } else {
        await supabaseService.saveDeliverySettings(db.getDeliverySettings());
      }
    } catch {
      // ignore
    }
  }
}

app.get('/api/delivery/zones', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  await hydrateDeliveryFromSupabase();
  return res.json(db.getDeliveryZones());
});

app.post('/api/delivery/zones', requireAdminAuth, async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const zone: DeliveryZone = {
    id: req.body.id || 'zone-' + Date.now(),
    name: (req.body.name || 'New Delivery Zone').trim(),
    code: (req.body.code || 'ZN-' + Date.now().toString().slice(-3)).trim().toUpperCase(),
    description: req.body.description || '',
    province: req.body.province || 'Punjab',
    baseCharge: Number(req.body.baseCharge ?? 350),
    chargeType: req.body.chargeType || 'fixed',
    percentageRate: Number(req.body.percentageRate ?? 2),
    freeDeliveryThreshold:
      req.body.freeDeliveryThreshold !== undefined && req.body.freeDeliveryThreshold !== ''
        ? Number(req.body.freeDeliveryThreshold)
        : undefined,
    minDeliveryDays: Number(req.body.minDeliveryDays ?? 2),
    maxDeliveryDays: Number(req.body.maxDeliveryDays ?? 5),
    codEnabled: req.body.codEnabled !== false,
    codMinAmount: Number(req.body.codMinAmount ?? 500),
    codMaxAmount: Number(req.body.codMaxAmount ?? 400000),
    installationBaseCharge: Number(req.body.installationBaseCharge ?? 2000),
    isActive: req.body.isActive !== false,
    displayOrder: Number(req.body.displayOrder ?? db.getDeliveryZones().length + 1),
    notes: req.body.notes || '',
    createdAt: req.body.createdAt || now,
    updatedAt: now,
  };
  const saved = db.upsertDeliveryZone(zone);
  if (supabaseService.isConfigured()) {
    await supabaseService.saveDeliveryZone(saved, db.getDeliveryZones());
  }
  db.logAction(
    'DELIVERY_ZONE_SAVED',
    (req as any).adminSession?.username || 'Admin',
    `Saved delivery zone: ${saved.name} (Base Charge: Rs. ${saved.baseCharge})`
  );
  return res.status(201).json(saved);
});

app.put('/api/delivery/zones/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const existing = db.getDeliveryZones().find((z) => z.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Delivery zone not found' });
  }
  const updated = db.upsertDeliveryZone({
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveDeliveryZone(updated, db.getDeliveryZones());
  }
  db.logAction(
    'DELIVERY_ZONE_UPDATED',
    (req as any).adminSession?.username || 'Admin',
    `Updated delivery zone: ${updated.name} (Base Charge: Rs. ${updated.baseCharge}, Active: ${updated.isActive})`
  );
  return res.json(updated);
});

app.delete('/api/delivery/zones/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const existing = db.getDeliveryZones().find((z) => z.id === req.params.id);
  const ok = db.deleteDeliveryZone(req.params.id);
  if (supabaseService.isConfigured()) {
    await supabaseService.deleteDeliveryZone(req.params.id, db.getDeliveryZones());
  }
  if (existing) {
    db.logAction(
      'DELIVERY_ZONE_DELETED',
      (req as any).adminSession?.username || 'Admin',
      `Deleted delivery zone: ${existing.name}`
    );
  }
  return res.json({ success: ok });
});

app.get('/api/delivery/areas', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  await hydrateDeliveryFromSupabase();
  return res.json(db.getDeliveryAreas());
});

app.post('/api/delivery/areas', requireAdminAuth, async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const area: DeliveryArea = {
    id: req.body.id || 'area-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    zoneId: req.body.zoneId || 'zone-lahore',
    name: (req.body.name || 'New Delivery Area').trim(),
    code: (req.body.code || 'AR-' + Date.now().toString().slice(-3)).trim().toUpperCase(),
    city: (req.body.city || 'Lahore').trim(),
    province: (req.body.province || 'Punjab').trim(),
    postalCode: req.body.postalCode || '',
    deliveryCharge:
      req.body.deliveryCharge !== undefined &&
      req.body.deliveryCharge !== null &&
      req.body.deliveryCharge !== ''
        ? Number(req.body.deliveryCharge)
        : null,
    chargeType: req.body.chargeType || 'fixed',
    freeDeliveryThreshold:
      req.body.freeDeliveryThreshold !== undefined &&
      req.body.freeDeliveryThreshold !== null &&
      req.body.freeDeliveryThreshold !== ''
        ? Number(req.body.freeDeliveryThreshold)
        : null,
    minDeliveryDays:
      req.body.minDeliveryDays !== undefined && req.body.minDeliveryDays !== ''
        ? Number(req.body.minDeliveryDays)
        : null,
    maxDeliveryDays:
      req.body.maxDeliveryDays !== undefined && req.body.maxDeliveryDays !== ''
        ? Number(req.body.maxDeliveryDays)
        : null,
    codEnabled: req.body.codEnabled !== false,
    codMinAmount:
      req.body.codMinAmount !== undefined && req.body.codMinAmount !== ''
        ? Number(req.body.codMinAmount)
        : null,
    codMaxAmount:
      req.body.codMaxAmount !== undefined && req.body.codMaxAmount !== ''
        ? Number(req.body.codMaxAmount)
        : null,
    isRemoteArea: Boolean(req.body.isRemoteArea),
    remoteSurcharge: Number(req.body.remoteSurcharge || 0),
    installationCharge:
      req.body.installationCharge !== undefined && req.body.installationCharge !== ''
        ? Number(req.body.installationCharge)
        : null,
    isActive: req.body.isActive !== false,
    notes: req.body.notes || '',
    createdAt: req.body.createdAt || now,
    updatedAt: now,
  };
  const saved = db.upsertDeliveryArea(area);
  if (supabaseService.isConfigured()) {
    await supabaseService.saveDeliveryArea(saved, db.getDeliveryAreas());
  }
  db.logAction(
    'DELIVERY_AREA_SAVED',
    (req as any).adminSession?.username || 'Admin',
    `Saved delivery area: ${saved.name} (${saved.city}) in ${saved.zoneName}`
  );
  return res.status(201).json(saved);
});

app.post('/api/delivery/areas/bulk', requireAdminAuth, async (req: Request, res: Response) => {
  const { areas } = req.body;
  if (!Array.isArray(areas) || areas.length === 0) {
    return res.status(400).json({ error: 'Areas array is required for bulk operation' });
  }
  const now = new Date().toISOString();
  const savedList: DeliveryArea[] = [];
  for (const raw of areas) {
    const item: DeliveryArea = {
      id: raw.id || 'area-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      zoneId: raw.zoneId || 'zone-lahore',
      name: (raw.name || 'Area').trim(),
      code: (raw.code || 'AR-' + Math.floor(100 + Math.random() * 900)).trim().toUpperCase(),
      city: (raw.city || 'Lahore').trim(),
      province: (raw.province || 'Punjab').trim(),
      postalCode: raw.postalCode || '',
      deliveryCharge:
        raw.deliveryCharge !== undefined && raw.deliveryCharge !== null && raw.deliveryCharge !== ''
          ? Number(raw.deliveryCharge)
          : null,
      chargeType: raw.chargeType || 'fixed',
      freeDeliveryThreshold:
        raw.freeDeliveryThreshold !== undefined &&
        raw.freeDeliveryThreshold !== null &&
        raw.freeDeliveryThreshold !== ''
          ? Number(raw.freeDeliveryThreshold)
          : null,
      minDeliveryDays: raw.minDeliveryDays ? Number(raw.minDeliveryDays) : null,
      maxDeliveryDays: raw.maxDeliveryDays ? Number(raw.maxDeliveryDays) : null,
      codEnabled: raw.codEnabled !== false,
      isRemoteArea: Boolean(raw.isRemoteArea),
      remoteSurcharge: Number(raw.remoteSurcharge || 0),
      isActive: raw.isActive !== false,
      notes: raw.notes || '',
      createdAt: raw.createdAt || now,
      updatedAt: now,
    };
    const s = db.upsertDeliveryArea(item);
    savedList.push(s);
    if (supabaseService.isConfigured()) {
      await supabaseService.saveDeliveryArea(s, db.getDeliveryAreas());
    }
  }
  db.logAction(
    'BULK_DELIVERY_AREAS',
    (req as any).adminSession?.username || 'Admin',
    `Bulk created/updated ${savedList.length} delivery areas`
  );
  return res.json({ success: true, count: savedList.length, areas: db.getDeliveryAreas() });
});

app.put('/api/delivery/areas/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const existing = db.getDeliveryAreas().find((a) => a.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Delivery area not found' });
  }
  const updated = db.upsertDeliveryArea({
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveDeliveryArea(updated, db.getDeliveryAreas());
  }
  db.logAction(
    'DELIVERY_AREA_UPDATED',
    (req as any).adminSession?.username || 'Admin',
    `Updated delivery area: ${updated.name} (${updated.city})`
  );
  return res.json(updated);
});

app.delete('/api/delivery/areas/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const existing = db.getDeliveryAreas().find((a) => a.id === req.params.id);
  const ok = db.deleteDeliveryArea(req.params.id);
  if (supabaseService.isConfigured()) {
    await supabaseService.deleteDeliveryArea(req.params.id, db.getDeliveryAreas());
  }
  if (existing) {
    db.logAction(
      'DELIVERY_AREA_DELETED',
      (req as any).adminSession?.username || 'Admin',
      `Deleted delivery area: ${existing.name}`
    );
  }
  return res.json({ success: ok });
});

app.get('/api/delivery/settings', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  await hydrateDeliveryFromSupabase();
  return res.json(db.getDeliverySettings());
});

app.put('/api/delivery/settings', requireAdminAuth, async (req: Request, res: Response) => {
  const updated = db.updateDeliverySettings(req.body);
  if (supabaseService.isConfigured()) {
    await supabaseService.saveDeliverySettings(updated);
  }
  db.logAction(
    'DELIVERY_SETTINGS_UPDATED',
    (req as any).adminSession?.username || 'Admin',
    'Updated global delivery configuration, weight brackets, cut-off times & free delivery rules'
  );
  return res.json(updated);
});

// Live Checkout Delivery Calculation Endpoint (Trusted Backend Calculation)
app.post('/api/delivery/calculate', async (req: Request, res: Response) => {
  await Promise.all([hydrateDeliveryFromSupabase(), hydrateProductsFromSupabase()]);
  const snapshot = db.calculateDelivery({
    city: req.body.city,
    province: req.body.province,
    areaId: req.body.areaId,
    areaName: req.body.areaName,
    zoneId: req.body.zoneId,
    postalCode: req.body.postalCode,
    items: Array.isArray(req.body.items) ? req.body.items : [],
    subtotal: req.body.subtotal !== undefined ? Number(req.body.subtotal) : undefined,
    requestInstallation: Boolean(req.body.requestInstallation),
  });
  return res.json(snapshot);
});

// Delivery Analytics & Reports
app.get('/api/delivery/reports', requireAdminAuth, async (_req: Request, res: Response) => {
  await hydrateDeliveryFromSupabase();
  const orders = db.getOrders().filter((o) => o.status !== 'Cancelled');
  const byZone: Record<string, { orders: number; revenue: number; freeOrders: number }> = {};
  const byArea: Record<string, { orders: number; revenue: number; remoteOrders: number }> = {};
  let totalDeliveryRevenue = 0;
  let freeDeliveryOrders = 0;
  let remoteAreaOrders = 0;
  let overrideOrders = 0;
  let totalInstallationRevenue = 0;

  for (const o of orders) {
    const snap = o.deliverySnapshot;
    const zName = snap?.zoneName || o.customer.zoneName || o.customer.province || 'Unassigned Zone';
    const aName = snap?.areaName || o.customer.areaName || o.customer.city || 'General Area';
    const fee = Number(o.shippingFee || 0);
    const inst = Number(o.installationFee || snap?.installationCharge || 0);

    totalDeliveryRevenue += fee;
    totalInstallationRevenue += inst;
    if (fee === 0 || snap?.freeDeliveryApplied) freeDeliveryOrders += 1;
    if (snap?.isRemoteArea || (o.remoteSurcharge && o.remoteSurcharge > 0)) remoteAreaOrders += 1;
    if (o.deliveryOverride) overrideOrders += 1;

    if (!byZone[zName]) byZone[zName] = { orders: 0, revenue: 0, freeOrders: 0 };
    byZone[zName].orders += 1;
    byZone[zName].revenue += fee;
    if (fee === 0) byZone[zName].freeOrders += 1;

    if (!byArea[aName]) byArea[aName] = { orders: 0, revenue: 0, remoteOrders: 0 };
    byArea[aName].orders += 1;
    byArea[aName].revenue += fee;
    if (snap?.isRemoteArea) byArea[aName].remoteOrders += 1;
  }

  return res.json({
    totalOrders: orders.length,
    totalDeliveryRevenue,
    totalInstallationRevenue,
    freeDeliveryOrders,
    paidDeliveryOrders: Math.max(0, orders.length - freeDeliveryOrders),
    remoteAreaOrders,
    overrideOrders,
    averageDeliveryCharge:
      orders.length > 0 ? Math.round(totalDeliveryRevenue / orders.length) : 0,
    byZone,
    byArea,
  });
});

// ==========================================
// 11C. WARRANTY, SERVICE REQUESTS & SUPPORT TICKETS API
// ==========================================

app.get('/api/warranty', async (req: Request, res: Response) => {
  if (supabaseService.isConfigured()) {
    const s = await supabaseService.getWarranties();
    if (s) db.syncWarrantyRegistrations(s);
  }
  const phone = req.query.phone as string | undefined;
  const email = req.query.email as string | undefined;
  let list = db.getWarrantyRegistrations();
  if (phone || email) {
    list = list.filter(
      (w) =>
        (phone && w.customerPhone.includes(phone.replace(/[^0-9]/g, ''))) ||
        (email && (w.customerEmail || '').toLowerCase() === email.toLowerCase())
    );
  }
  return res.json(list);
});

app.post('/api/warranty', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item: WarrantyRegistration = {
    id: req.body.id || 'war-' + Date.now(),
    orderNumber: (req.body.orderNumber || '').trim(),
    productId: req.body.productId,
    productName: (req.body.productName || '').trim(),
    serialNumber: (req.body.serialNumber || '').trim(),
    purchaseDate: req.body.purchaseDate || now.slice(0, 10),
    warrantyPeriod: req.body.warrantyPeriod || '1 Year Official Warranty',
    customerName: (req.body.customerName || '').trim(),
    customerPhone: (req.body.customerPhone || '').trim(),
    customerEmail: req.body.customerEmail || '',
    city: req.body.city || 'Lahore',
    status: req.body.status || 'Active',
    adminNotes: req.body.adminNotes || '',
    createdAt: now,
    updatedAt: now,
  };
  const saved = db.upsertWarrantyRegistration(item);
  if (supabaseService.isConfigured()) {
    await supabaseService.saveWarranty(saved, db.getWarrantyRegistrations());
  }
  return res.status(201).json(saved);
});

app.put('/api/warranty/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const existing = db.getWarrantyRegistrations().find((w) => w.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Warranty record not found' });
  const updated = db.upsertWarrantyRegistration({
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveWarranty(updated, db.getWarrantyRegistrations());
  }
  return res.json(updated);
});

app.get('/api/service-requests', async (req: Request, res: Response) => {
  if (supabaseService.isConfigured()) {
    const s = await supabaseService.getServiceRequests();
    if (s) db.syncServiceRequests(s);
  }
  const phone = req.query.phone as string | undefined;
  const email = req.query.email as string | undefined;
  let list = db.getServiceRequests();
  if (phone || email) {
    list = list.filter(
      (r) =>
        (phone && r.customerPhone.includes(phone.replace(/[^0-9]/g, ''))) ||
        (email && (r.customerEmail || '').toLowerCase() === email.toLowerCase())
    );
  }
  return res.json(list);
});

app.post('/api/service-requests', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item: ServiceRequest = {
    id: req.body.id || 'srv-' + Date.now(),
    ticketNumber: req.body.ticketNumber || `MA-SRV-${Math.floor(1000 + Math.random() * 9000)}`,
    requestType: req.body.requestType || 'Installation',
    status: req.body.status || 'Submitted',
    orderNumber: req.body.orderNumber || '',
    productName: (req.body.productName || '').trim(),
    serialNumber: req.body.serialNumber || '',
    customerName: (req.body.customerName || '').trim(),
    customerPhone: (req.body.customerPhone || '').trim(),
    customerEmail: req.body.customerEmail || '',
    address: (req.body.address || '').trim(),
    city: req.body.city || 'Lahore',
    preferredDate: req.body.preferredDate || '',
    issueDescription: (req.body.issueDescription || '').trim(),
    assignedTechnician: req.body.assignedTechnician || '',
    adminNotes: req.body.adminNotes || '',
    createdAt: now,
    updatedAt: now,
  };
  const saved = db.upsertServiceRequest(item);
  if (supabaseService.isConfigured()) {
    await supabaseService.saveServiceRequest(saved, db.getServiceRequests());
  }
  return res.status(201).json(saved);
});

app.put('/api/service-requests/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const existing = db.getServiceRequests().find((s) => s.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Service request not found' });
  const updated = db.upsertServiceRequest({
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveServiceRequest(updated, db.getServiceRequests());
  }
  return res.json(updated);
});

app.get('/api/support-tickets', async (req: Request, res: Response) => {
  if (supabaseService.isConfigured()) {
    const s = await supabaseService.getSupportTickets();
    if (s) db.syncSupportTickets(s);
  }
  const email = req.query.email as string | undefined;
  let list = db.getSupportTickets();
  if (email) {
    list = list.filter((t) => (t.customerEmail || '').toLowerCase() === email.toLowerCase());
  }
  return res.json(list);
});

app.post('/api/support-tickets', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item: SupportTicket = {
    id: req.body.id || 'tkt-' + Date.now(),
    ticketNumber: req.body.ticketNumber || `MA-SUP-${Math.floor(1000 + Math.random() * 9000)}`,
    inquiryType: req.body.inquiryType || 'General Support',
    subject: (req.body.subject || 'Customer Support Inquiry').trim(),
    message: (req.body.message || '').trim(),
    customerName: (req.body.customerName || '').trim(),
    customerPhone: (req.body.customerPhone || '').trim(),
    customerEmail: req.body.customerEmail || '',
    orderOrQuoteRef: req.body.orderOrQuoteRef || '',
    status: 'Open',
    createdAt: now,
    updatedAt: now,
  };
  const saved = db.upsertSupportTicket(item);
  if (supabaseService.isConfigured()) {
    await supabaseService.saveSupportTicket(saved, db.getSupportTickets());
  }
  return res.status(201).json(saved);
});

app.put('/api/support-tickets/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const existing = db.getSupportTickets().find((t) => t.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Support ticket not found' });
  const updated = db.upsertSupportTicket({
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });
  if (supabaseService.isConfigured()) {
    await supabaseService.saveSupportTicket(updated, db.getSupportTickets());
  }
  return res.json(updated);
});

// ==========================================
// 12. AI ASSISTANT API
// ==========================================

// Customer Shopping Chat — M.A. SMART ASSISTANT
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, customerAccount } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await askShoppingAssistant(message, history || [], customerAccount);
    return res.json({
      reply: result.reply,
      recommendedProductIds: result.recommendedProductIds,
    });
  } catch (err: any) {
    console.error('AI chat endpoint error:', err);
    return res.status(500).json({
      error: 'M.A. SMART ASSISTANT temporarily unavailable',
      message: err.message,
    });
  }
});

// Admin Copy & Analysis Generation
app.post('/api/ai/admin-copy', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, type } = req.body;
    const result = await generateAdminCopy(prompt, type || 'product_description');
    return res.json({ result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin AI Structured Product Autofill
app.post('/api/ai/product-autofill', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name, categoryName, price, brand } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Product title is required for AI autofill.' });
    }
    const draft = await generateProductDetailsWithAi({ name, categoryName, price, brand });
    return res.json({ success: true, draft });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to autofill product details with AI.' });
  }
});

// Invoice AI Summary (Thank-You Message & Personalized Energy/Product Usage Tip)
app.post('/api/ai/invoice-summary', async (req: Request, res: Response) => {
  try {
    const { orderNumber, customerName, city, items, grandTotal } = req.body;
    const summary = await generateInvoiceAiSummary({
      orderNumber,
      customerName,
      city,
      items: Array.isArray(items) ? items : [],
      grandTotal: Number(grandTotal || 0),
    });
    return res.json({ success: true, summary });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to generate AI invoice summary.',
    });
  }
});

// ==========================================
// 13. DATABASE STATUS & SYNC AUDIT API
// ==========================================

app.get('/api/sync/audit', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const supabaseStatus = supabaseService.getStatus();
    let supaProductsCount = 0;
    let supaCategoriesCount = 0;
    let supaOrdersCount = 0;

    if (supabaseService.isConfigured()) {
      const [sProds, sCats, sOrds] = await Promise.all([
        supabaseService.getProducts(),
        supabaseService.getCategories(),
        supabaseService.getOrders(),
      ]);
      if (sProds !== null) {
        supaProductsCount = sProds.length;
        db.syncProducts(sProds);
      }
      if (sCats !== null) {
        supaCategoriesCount = sCats.length;
        db.syncCategories(sCats);
      }
      if (sOrds !== null) {
        supaOrdersCount = sOrds.length;
        db.syncOrders(sOrds);
      }
    }

    const localProducts = db.getProducts();
    const localCategories = db.getCategories();
    const localOrders = db.getOrders();
    const uniqueProductIds = new Set(localProducts.map((p) => p.id)).size;
    const uniqueOrderIds = new Set(localOrders.map((o) => o.id)).size;

    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      supabase: supabaseStatus,
      counts: {
        supabaseProducts: supaProductsCount,
        hydratedProducts: localProducts.length,
        uniqueProducts: uniqueProductIds,
        duplicateProducts: localProducts.length - uniqueProductIds,
        supabaseCategories: supaCategoriesCount,
        hydratedCategories: localCategories.length,
        supabaseOrders: supaOrdersCount,
        hydratedOrders: localOrders.length,
        uniqueOrders: uniqueOrderIds,
        duplicateOrders: localOrders.length - uniqueOrderIds,
      },
      aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY),
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Sync audit failed',
    });
  }
});

app.get('/api/database/status', async (_req: Request, res: Response) => {
  try {
    const status = await db.getDatabaseStatus();
    const supabase = supabaseService.getStatus();
    return res.json({
      ...status,
      supabase,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to retrieve database status',
      message: err?.message || String(err),
    });
  }
});

// 404 handler for API routes - ALWAYS returns JSON
app.all('/api/*', (req: Request, res: Response) => {
  return res.status(404).json({
    error: 'NotFound',
    message: `API endpoint ${req.method} ${req.originalUrl || req.url} does not exist.`,
  });
});

// Global Express Error Handler - ALWAYS returns JSON
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[API Server Error]:', err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  return res.status(status).json({
    error: err?.name || 'InternalServerError',
    message: err?.message || 'An unexpected server error occurred.',
  });
});

export { app };
export default app;

