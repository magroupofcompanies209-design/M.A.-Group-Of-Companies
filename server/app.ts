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
import { askShoppingAssistant, generateAdminCopy } from './gemini.ts';
import { supabaseService } from './supabase.ts';
import type { Order, OrderStatus, Product, ProductStatus, AdminRole } from '../src/types/index.ts';

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

// GET /api/products
app.get('/api/products', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  let products: Product[] = [];

  // 1. Fetch directly from Supabase if configured (single source of truth)
  if (supabaseService.isConfigured()) {
    try {
      const supaProducts = await supabaseService.getProducts(db.getProducts());
      if (supaProducts !== null) {
        products = supaProducts;
        db.syncProducts(supaProducts);
      }
    } catch (err) {
      console.warn('Supabase fetch error, falling back to local store:', err);
    }
  }

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
app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = db.getProductById(req.params.id);
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

  const savedProduct = supaRes.data || newProduct;
  db.createProduct(savedProduct);
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

  try {
    const supaProducts = await supabaseService.getProducts();
    if (supaProducts && supaProducts.length > 0) {
      db.syncProducts(supaProducts);
    }
  } catch {
    // ignore
  }

  const existingProduct = db.getProductById(id);
  const oldImages = existingProduct?.images || (existingProduct?.imageUrl ? [existingProduct.imageUrl] : []);

  const supaRes = await supabaseService.updateProduct(id, req.body, existingProduct, db.getProducts());
  if (!supaRes.success) {
    return res.status(500).json({
      success: false,
      error: `Product could not be saved: ${supaRes.error || 'Failed to update product in Supabase.'}`,
    });
  }

  const updated = db.updateProduct(id, req.body);

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
  return res.json(supaRes.data || updated);
});

// DELETE /api/products/:id (Admin/Superadmin Protected - Manager/Staff cannot delete products)
app.delete('/api/products/:id', requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Product ID is required.' });
  }

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
      await supabaseService.updateProduct(id, updates);
    }
    const archived = db.updateProduct(id, updates);
    db.logAction('ARCHIVE_PRODUCT', (req as any).adminSession.username, `Archived product: ${existingProduct?.name || id}`);
    return res.json({ success: true, archived: true, message: 'Product archived successfully. Historical orders preserved.' });
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
    const supaRes = await supabaseService.deleteProduct(id);
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({
        success: false,
        error: supaRes.error || 'Failed to delete product from Supabase.',
      });
    }

    db.deleteProduct(id);

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

  if (supabaseService.isConfigured()) {
    await supabaseService.insertProduct(duplicated);
  }

  const created = db.createProduct(duplicated);
  db.logAction('DUPLICATE_PRODUCT', (req as any).adminSession.username, `Duplicated product ${existing.name} into ${created.name} (${created.sku})`);
  return res.status(201).json(created);
});

// POST /api/products/:id/archive (Safely archive a product)
app.post('/api/products/:id/archive', requireRole(['superadmin', 'admin', 'manager']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const existing = db.getProductById(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const updates = { status: 'archived' as const, isArchived: true };
  if (supabaseService.isConfigured()) {
    await supabaseService.updateProduct(id, updates);
  }
  const updated = db.updateProduct(id, updates);
  db.logAction('ARCHIVE_PRODUCT', (req as any).adminSession.username, `Archived product: ${existing.name} (${existing.sku})`);
  return res.json({ success: true, message: 'Product archived successfully.', product: updated });
});

// POST /api/products/:id/restore (Restore an archived product)
app.post('/api/products/:id/restore', requireRole(['superadmin', 'admin', 'manager']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const existing = db.getProductById(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const updates = { status: 'active' as const, isArchived: false };
  if (supabaseService.isConfigured()) {
    await supabaseService.updateProduct(id, updates);
  }
  const updated = db.updateProduct(id, updates);
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

  const existing = db.getProductById(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const updates = {
    status: status as ProductStatus,
    isArchived: status === 'archived',
  };

  if (supabaseService.isConfigured()) {
    await supabaseService.updateProduct(id, updates);
  }
  const updated = db.updateProduct(id, updates);
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
      if (supaCats && supaCats.length > 0) {
        db.syncCategories(supaCats);
        return res.json(supaCats);
      }
    } catch {
      // Fallback to local
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
// 4. BRANDS API
// ==========================================

app.get('/api/brands', (_req: Request, res: Response) => {
  return res.json(db.getBrands());
});

app.post('/api/brands', requireAdminAuth, (req: Request, res: Response) => {
  const newBrand = {
    ...req.body,
    id: req.body.id || 'brand-' + Date.now(),
    slug: req.body.slug || req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  };
  const created = db.createBrand(newBrand);
  return res.status(201).json(created);
});

app.delete('/api/brands/:id', requireAdminAuth, (req: Request, res: Response) => {
  const success = db.deleteBrand(req.params.id);
  return res.json({ success });
});

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
  if (!settings.codEnabled) {
    return res.status(400).json({ error: 'Cash on delivery is currently unavailable.' });
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

  // Shipping calculation
  const shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
  const grandTotal = Math.max(0, subtotal - discount + shippingFee);

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

  // Generate unique Order Number
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `MAG-${randomSuffix}`;

  const newOrder: Order = {
    id: 'ord-' + Date.now(),
    orderNumber,
    customer,
    items,
    subtotal,
    discount,
    shippingFee,
    grandTotal,
    status: 'Pending',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'COD Pending',
    couponCode: validCoupon ? validCoupon.code : undefined,
    customerNotes,
    timeline: [
      {
        status: 'Pending',
        timestamp: new Date().toISOString(),
        note: 'Order submitted with Cash on Delivery payment.',
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
    const supaOrderRes = await supabaseService.insertOrder(savedOrder);
    if (!supaOrderRes.success && !supaOrderRes.tableMissing) {
      return res.status(500).json({
        error: supaOrderRes.error || 'Failed to save order to Supabase database.',
      });
    }
    // Sync updated product stock quantities to Supabase
    for (const item of items) {
      const updatedProd = db.getProductById(item.productId);
      if (updatedProd) {
        await supabaseService.updateProduct(updatedProd.id, { stock: updatedProd.stock }, updatedProd);
      }
    }
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
    const supaRes = await supabaseService.updateOrder(req.params.id, updates, updated);
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({ error: supaRes.error || 'Failed to update order in Supabase.' });
    }
    if (status && status !== existingOrder.status) {
      for (const item of updated.items || []) {
        const prod = db.getProductById(item.productId);
        if (prod) {
          await supabaseService.updateProduct(prod.id, { stock: prod.stock }, prod);
        }
      }
    }
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
  if (supabaseService.isConfigured()) {
    const supaProds = await supabaseService.getProducts();
    if (supaProds && supaProds.length > 0) db.syncProducts(supaProds);
  }
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
    const supaRes = await supabaseService.updateProduct(productId, { stock: updatedProd.stock }, updatedProd);
    if (!supaRes.success && !supaRes.tableMissing) {
      return res.status(500).json({ error: supaRes.error || 'Failed to sync stock adjustment to Supabase.' });
    }
  }
  return res.json(result);
});

// ==========================================
// 5C. CUSTOMER MANAGEMENT & SEGMENTATION API
// ==========================================

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
// 7. COUPONS API
// ==========================================

app.get('/api/coupons', requireAdminAuth, (_req: Request, res: Response) => {
  return res.json(db.getCoupons());
});

app.post('/api/coupons/validate', (req: Request, res: Response) => {
  const { code, cartSubtotal } = req.body;
  if (!code) return res.status(400).json({ valid: false, message: 'Please enter a coupon code' });

  const coupon = db.getCouponByCode(code);
  if (!coupon) {
    return res.status(404).json({ valid: false, message: 'Invalid or expired coupon code' });
  }

  if (coupon.minOrderAmount && cartSubtotal < coupon.minOrderAmount) {
    return res.status(400).json({
      valid: false,
      message: `Coupon requires a minimum order of Rs. ${coupon.minOrderAmount.toLocaleString()}`,
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

app.post('/api/coupons', requireAdminAuth, (req: Request, res: Response) => {
  const newCoupon = {
    ...req.body,
    id: 'c-' + Date.now(),
    code: req.body.code.toUpperCase().trim(),
    timesUsed: 0,
    isActive: true,
  };
  const created = db.createCoupon(newCoupon);
  return res.status(201).json(created);
});

app.delete('/api/coupons/:id', requireAdminAuth, (req: Request, res: Response) => {
  const success = db.deleteCoupon(req.params.id);
  return res.json({ success });
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
// 10. B2B / WHOLESALE INQUIRIES API
// ==========================================

app.post('/api/inquiries', (req: Request, res: Response) => {
  const { companyName, contactPerson, phone, email, city, categoryInterest, estimatedBudget, projectDetails } = req.body;
  if (!contactPerson || !phone || !projectDetails) {
    return res.status(400).json({ error: 'Please provide contact person, phone number, and project details.' });
  }

  const inquiry = db.createInquiry({
    id: 'inq-' + Date.now(),
    companyName: companyName || 'Private Contracting Project',
    contactPerson,
    phone,
    email: email || '',
    city: city || 'Pakistan',
    categoryInterest: categoryInterest || 'General Electrical & Solar',
    estimatedBudget,
    projectDetails,
    status: 'new',
    createdAt: new Date().toISOString(),
  });

  db.logAction('B2B_INQUIRY_RECEIVED', contactPerson, `New B2B quotation inquiry from ${city}`);
  return res.status(201).json({ success: true, inquiryNumber: inquiry.id });
});

app.get('/api/inquiries', requireAdminAuth, (_req: Request, res: Response) => {
  return res.json(db.getInquiries());
});

// DELETE /api/inquiries/:id (Admin Protected)
app.delete('/api/inquiries/:id', requireAdminAuth, (req: Request, res: Response) => {
  const success = db.deleteInquiry(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Inquiry not found' });
  }
  db.logAction('DELETE_INQUIRY', (req as any).adminSession.username, `Deleted quotation inquiry: ${req.params.id}`);
  return res.json({ success: true, message: 'Inquiry deleted successfully.' });
});

// ==========================================
// 11. ANALYTICS & AUDIT LOGS
// ==========================================

app.get('/api/admin/analytics', requireAdminAuth, (_req: Request, res: Response) => {
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

app.get('/api/admin/analytics/advanced', requireRole(['superadmin', 'admin', 'manager']), (req: Request, res: Response) => {
  const range = (req.query.range as string) || 'month';
  const analytics = db.getAdvancedAnalytics(range);
  return res.json(analytics);
});

app.get('/api/admin/audit-logs', requireAdminAuth, (_req: Request, res: Response) => {
  return res.json(db.getAuditLogs());
});

// ==========================================
// 12. AI ASSISTANT API
// ==========================================

// Customer Shopping Chat
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const reply = await askShoppingAssistant(message, history || []);
    return res.json({ reply });
  } catch (err: any) {
    console.error('AI chat endpoint error:', err);
    return res.status(500).json({
      error: 'AI assistant temporarily unavailable',
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

// ==========================================
// 13. DATABASE STATUS & CONNECTION API
// ==========================================

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

