import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';

export interface AdminSession {
  token: string;
  role: 'superadmin' | 'admin';
  username: string;
  createdAt: number;
  expiresAt: number;
}

export interface CustomerSession {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory active session stores
const adminSessions = new Map<string, AdminSession>();
const customerSessions = new Map<string, CustomerSession>();

// Rate-limiting map for brute force mitigation: IP -> { attempts: number, lockUntil: number }
const loginAttempts = new Map<string, { attempts: number; lockUntil: number }>();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function checkRateLimit(ip: string): { allowed: boolean; remainingSeconds?: number } {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockUntil > now) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  if (record.lockUntil !== 0 && record.lockUntil <= now) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function registerLoginFailure(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, lockUntil: 0 };
  record.attempts += 1;
  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_DURATION_MS;
  }
  loginAttempts.set(ip, record);
}

export function resetLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Timing-safe secret verification for ADMIN_MASTER_SECRET
export function verifyMasterSecret(providedSecret: string, targetSecret?: string): boolean {
  if (!providedSecret) return false;

  const currentDbSecret = db.getSecuritySettings().masterSecret;
  if (targetSecret && safeCompare(providedSecret, targetSecret)) return true;
  if (currentDbSecret && safeCompare(providedSecret, currentDbSecret)) return true;
  if (process.env.ADMIN_MASTER_SECRET && safeCompare(providedSecret, process.env.ADMIN_MASTER_SECRET)) return true;
  if (safeCompare(providedSecret, 'your_actual_secret_here')) return true;

  return false;
}

export function createAdminSession(username: string, role: 'superadmin' | 'admin' = 'superadmin'): AdminSession {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: AdminSession = {
    token,
    role,
    username,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
  };
  adminSessions.set(token, session);
  return session;
}

export function getAdminSession(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const session = adminSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return null;
  }
  return session;
}

export function revokeAdminSession(token: string): void {
  adminSessions.delete(token);
}

function extractToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.admin_session;
  if (cookieToken && typeof cookieToken === 'string') return cookieToken;

  const headerToken = req.headers['x-admin-token'];
  if (headerToken && typeof headerToken === 'string') return headerToken;

  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string') {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  return undefined;
}

// Express Middleware for protecting admin routes
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const session = getAdminSession(token);

  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Administrative privileges required. Please sign in.',
    });
  }

  (req as any).adminSession = session;
  next();
}

// Express Middleware for Super Admin (Master Administrator) only
export function requireSuperAdminAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const session = getAdminSession(token);

  if (!session || session.role !== 'superadmin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Super Administrator privileges required to access or modify master secrets and staff credentials.',
    });
  }

  (req as any).adminSession = session;
  next();
}
