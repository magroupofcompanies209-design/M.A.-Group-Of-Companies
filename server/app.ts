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
import type { Order, OrderStatus, Product, AdminRole } from '../src/types/index.ts';

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
  let products: Product[] = [];

  // 1. Fetch directly from Supabase if configured (single source of truth)
  if (supabaseService.isConfigured()) {
    try {
      const supaProducts = await supabaseService.getProducts();
      if (supaProducts && supaProducts.length > 0) {
        products = supaProducts;
        db.syncProducts(supaProducts);
      }
    } catch (err) {
      console.warn('Supabase fetch error, falling back to local store:', err);
    }
  }

  // 2. Fallback to local store if Supabase is empty or not yet configured
  if (products.length === 0) {
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

  // 1. If Supabase is configured, insert and confirm database save
  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.insertProduct(newProduct);
    const isTableMissing =
      supaRes.error &&
      (supaRes.error.includes('not found') ||
        supaRes.error.includes('schema cache') ||
        supaRes.error.includes('Could not find the table'));

    if (!supaRes.success && !isTableMissing) {
      console.log('ℹ️ Supabase product insert notice:', supaRes.error);
      return res.status(500).json({
        success: false,
        error: supaRes.error || 'Failed to save product in Supabase database.',
      });
    }

    if (isTableMissing) {
      const created = db.createProduct(newProduct);
      db.logAction('CREATE_PRODUCT', (req as any).adminSession.username, `Created product (store): ${created.name} (${created.sku})`);
      return res.status(201).json({
        ...created,
        notice: 'Saved to persistent local storage. Run supabase_schema.sql in your Supabase SQL Editor to sync to remote table.',
      });
    }

    const savedProduct = supaRes.data || newProduct;
    db.createProduct(savedProduct);
    db.logAction('CREATE_PRODUCT', (req as any).adminSession.username, `Created product in Supabase: ${savedProduct.name} (${savedProduct.sku})`);
    return res.status(201).json(savedProduct);
  }

  // 2. If Supabase is not configured, fall back to local database
  const created = db.createProduct(newProduct);
  db.logAction('CREATE_PRODUCT', (req as any).adminSession.username, `Created product: ${created.name} (${created.sku})`);
  return res.status(201).json(created);
});

// PUT /api/products/:id (Admin Protected)
app.put('/api/products/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const id = req.params.id;
  const existingProduct = db.getProductById(id);
  const oldImages = existingProduct?.images || (existingProduct?.imageUrl ? [existingProduct.imageUrl] : []);

  if (supabaseService.isConfigured()) {
    const supaRes = await supabaseService.updateProduct(id, req.body);
    const isTableMissing =
      supaRes.error &&
      (supaRes.error.includes('not found') ||
        supaRes.error.includes('schema cache') ||
        supaRes.error.includes('Could not find the table'));

    if (!supaRes.success && !isTableMissing) {
      return res.status(500).json({
        success: false,
        error: supaRes.error || 'Failed to update product in Supabase.',
      });
    }

    const updated = db.updateProduct(id, req.body);

    // Requirement 7: If the new image uploaded successfully and replaced old image, remove old image if not used elsewhere
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
  }

  const updated = db.updateProduct(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Product not found' });
  }
  db.logAction('UPDATE_PRODUCT', (req as any).adminSession.username, `Updated product: ${updated.name} (${updated.sku})`);
  return res.json(updated);
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

    // Requirement 6: Remove image from Supabase Storage when appropriate, ensuring no other product uses it
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
  if (supabaseService.isConfigured()) {
    try {
      const supaCats = await supabaseService.getCategories();
      if (supaCats && supaCats.length > 0) {
        return res.json(supaCats);
      }
    } catch {
      // Fallback to local
    }
  }
  return res.json(db.getCategories());
});

app.post('/api/categories', requireAdminAuth, async (req: Request, res: Response) => {
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
    supabaseService.insertCategory(created).catch((err) => {
      console.warn('Could not mirror category to Supabase:', err);
    });
  }
  db.logAction('CREATE_CATEGORY', (req as any).adminSession.username, `Created category: ${created.name}`);
  return res.status(201).json(created);
});

app.put('/api/categories/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const updated = db.updateCategory(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Category not found' });
  }
  if (supabaseService.isConfigured()) {
    supabaseService.updateCategory(req.params.id, req.body).catch((err) => {
      console.warn('Could not mirror category update to Supabase:', err);
    });
  }
  db.logAction('UPDATE_CATEGORY', (req as any).adminSession.username, `Updated category: ${updated.name}`);
  return res.json(updated);
});

app.delete('/api/categories/:id', requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Category ID is required.' });
  }

  const existingCategory = db.getCategories().find((c) => c.id === id);
  if (!existingCategory) {
    return res.status(404).json({ success: false, error: 'Category not found.' });
  }

  // Safety Check: Check if any products belong to this category
  const associatedProducts = db.getProducts().filter(
    (p) => p.categoryId === id || (p.categoryName && p.categoryName.toLowerCase() === existingCategory.name.toLowerCase())
  );

  if (associatedProducts.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Cannot delete category "${existingCategory.name}". It is currently assigned to ${associatedProducts.length} product(s) (such as "${associatedProducts[0].name}"). Please reassign or delete these products first.`,
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

  const success = db.deleteCategory(id);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Category not found in store.' });
  }

  db.logAction('DELETE_CATEGORY', (req as any).adminSession.username, `Deleted category: ${existingCategory.name} (ID: ${id})`);
  return res.json({ success: true, message: 'Category deleted successfully.' });
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
  const { status, search } = req.query;
  let orders = db.getOrders();

  if (supabaseService.isConfigured()) {
    try {
      const supaOrders = await supabaseService.getOrders();
      if (supaOrders && supaOrders.length > 0) {
        orders = supaOrders;
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

// POST /api/orders (Public COD Checkout with Idempotency Protection)
app.post('/api/orders', (req: Request, res: Response) => {
  const { customer, items, couponCode, customerNotes } = req.body;

  if (!customer || !customer.fullName || !customer.phone || !customer.addressLine || !customer.city) {
    return res.status(400).json({ error: 'Customer name, phone, address, and city are required.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
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

  // Idempotency Check: 2. Prevent accidental rapid double-clicks (same phone + same grandTotal + items length within 15 seconds)
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
  // Periodically clean cache older than 15 minutes
  if (recentIdempotencyStore.size > 200) {
    const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
    for (const [key, val] of recentIdempotencyStore.entries()) {
      if (val.timestamp < fifteenMinAgo) {
        recentIdempotencyStore.delete(key);
      }
    }
  }
  if (supabaseService.isConfigured()) {
    supabaseService.insertOrder(newOrder).catch((err) => {
      console.warn('Could not mirror order to Supabase:', err);
    });
  }
  db.logAction(
    'NEW_ORDER_COD',
    customer.fullName,
    `New order ${orderNumber} placed for Rs. ${grandTotal.toLocaleString()} COD.`
  );

  return res.status(201).json(savedOrder);
});

// GET /api/orders/track/:orderNumber (Public Order Tracking)
app.get('/api/orders/track/:orderNumber', (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const { phone } = req.query;

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

// PATCH /api/orders/:id/status (Admin Protected)
app.patch('/api/orders/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  const { status, paymentStatus, trackingNumber, courierName, internalNotes } = req.body;
  const existingOrder = db.getOrderById(req.params.id);

  if (!existingOrder) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updates: Partial<Order> = {};
  if (paymentStatus) updates.paymentStatus = paymentStatus;
  if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
  if (courierName !== undefined) updates.courierName = courierName;
  if (internalNotes !== undefined) updates.internalNotes = internalNotes;

  if (status && status !== existingOrder.status) {
    updates.status = status as OrderStatus;
    const timeline = existingOrder.timeline || [];
    timeline.push({
      status: status as OrderStatus,
      timestamp: new Date().toISOString(),
      note: req.body.note || `Status updated to ${status} by admin.`,
    });
    updates.timeline = timeline;
  }

  const updated = db.updateOrder(req.params.id, updates);
  if (supabaseService.isConfigured()) {
    supabaseService.updateOrder(req.params.id, updates).catch((err) => {
      console.warn('Could not mirror order update to Supabase:', err);
    });
  }
  db.logAction(
    'UPDATE_ORDER_STATUS',
    (req as any).adminSession.username,
    `Order ${existingOrder.orderNumber} status changed to ${status || existingOrder.status}`
  );

  return res.json(updated);
});

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
app.post('/api/admin/inventory/adjust', requireRole(['superadmin', 'admin', 'manager']), (req: Request, res: Response) => {
  const { productId, change, reason, referenceId, notes } = req.body;
  if (!productId || typeof change !== 'number' || change === 0) {
    return res.status(400).json({ error: 'Product ID and non-zero numeric stock change are required.' });
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
  return res.json(result);
});

// ==========================================
// 5C. CUSTOMER MANAGEMENT & SEGMENTATION API
// ==========================================

// GET /api/admin/customers
app.get('/api/admin/customers', requireRole(['superadmin', 'admin', 'manager', 'staff']), (_req: Request, res: Response) => {
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

app.get('/api/settings', (_req: Request, res: Response) => {
  return res.json(db.getSettings());
});

app.put('/api/settings', requireRole(['superadmin', 'admin']), (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
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

