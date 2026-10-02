export type ProductStatus = 'active' | 'draft' | 'archived' | 'inactive';

export interface ProductSpecification {
  key: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "5kW", "10kW" or "White", "Chrome"
  price: number;
  salePrice?: number;
  stock: number;
  sku: string;
  image?: string;
  status?: 'active' | 'inactive';
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  brand: string;
  description: string;
  shortDescription: string;
  specifications: ProductSpecification[];
  features: string[];
  images: string[];
  image_url?: string;
  imageUrl?: string;
  videoUrl?: string;
  price: number; // in PKR
  salePrice?: number; // in PKR
  costPrice?: number; // private product cost in PKR (Admins only)
  stock: number;
  reservedStock?: number;
  availableStock?: number;
  lowStockThreshold: number;
  unit?: string; // e.g. "piece", "meter", "set", "box"
  variants?: ProductVariant[];
  isArchived?: boolean;
  weight?: string;
  dimensions?: string;
  warranty: string;
  tags: string[];
  status: ProductStatus;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isDeal?: boolean;
  dealEndsAt?: string;
  rating: number;
  reviewCount: number;
  frequentlyBoughtWith?: string[]; // array of product IDs
  relatedProductIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  iconName: string;
  displayOrder: number;
  isActive: boolean;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  isFeatured: boolean;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Failed Delivery'
  | 'Refunded';

export type OrderRiskLevel = 'LOW RISK' | 'NORMAL' | 'REVIEW REQUIRED';

export type PaymentStatus =
  | 'COD Pending'
  | 'COD Collected'
  | 'Cancelled'
  | 'Refunded';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
  variantId?: string;
  variantName?: string;
}

export interface CustomerAddress {
  fullName: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode?: string;
  landmark?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "MAG-8921"
  customerId?: string;
  customer: CustomerAddress;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  grandTotal: number;
  status: OrderStatus;
  paymentMethod: 'Cash on Delivery';
  paymentStatus: PaymentStatus;
  couponCode?: string;
  trackingNumber?: string;
  courierName?: string;
  internalNotes?: string;
  customerNotes?: string;
  riskLevel?: OrderRiskLevel;
  riskReasons?: string[];
  isRiskReviewed?: boolean;
  timeline: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin' | 'superadmin';
  address?: CustomerAddress;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  customerEmail?: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  badge?: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  expiresAt?: string;
  usageLimit?: number;
  timesUsed: number;
  isActive: boolean;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  announcementBarText?: string;
  showAnnouncementBar?: boolean;
  contactEmail: string;
  contactPhone: string;
  showHelpline?: boolean;
  whatsappNumber: string;
  showWhatsapp?: boolean;
  headOfficeAddress: string;
  lahoreShowroom: string;
  karachiShowroom: string;
  islamabadShowroom: string;
  showLocations?: boolean;
  footerAboutText?: string;
  currency: string;
  currencySymbol: string;
  codEnabled: boolean;
  codInstructions: string;
  codMinAmount: number;
  codMaxAmount: number;
  standardShippingFee: number;
  freeShippingThreshold: number;
  taxRate: number; // 0 for retail COD default
  lowStockThreshold?: number;
  cityShippingFees?: Record<string, number>;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  warrantyPolicyText?: string;
  returnPolicyText?: string;
  termsConditionsText?: string;
  privacyPolicyText?: string;
  aiAssistantEnabled: boolean;
  aiWelcomeMessage: string;
}

export interface B2BInquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  categoryInterest: string;
  estimatedBudget?: string;
  projectDetails: string;
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  createdAt: string;
}

export type AdminRole = 'superadmin' | 'admin' | 'manager' | 'staff';

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
  target?: string;
  metadata?: Record<string, any>;
}

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  password: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminSecuritySettings {
  masterSecret: string;
  lastUpdated?: string;
  staffList: StaffUser[];
}

export type InventoryChangeReason =
  | 'Stock Received'
  | 'Order Placed'
  | 'Order Cancelled'
  | 'Order Returned'
  | 'Manual Adjustment'
  | 'Damaged/Discarded'
  | 'Initial Stock';

export interface InventoryLedgerEntry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  change: number; // e.g. +20, -2, -1
  previousStock: number;
  newStock: number;
  reason: InventoryChangeReason;
  referenceId?: string; // e.g. "MAG-8921" or PO number
  performedBy: string;
  timestamp: string;
  notes?: string;
}

export type CustomerSegment = 'New' | 'Returning' | 'Frequent' | 'High-Value' | 'Inactive';

export interface CustomerProfile {
  phone: string;
  fullName: string;
  email?: string;
  city: string;
  addresses: string[];
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  failedDeliveries: number;
  totalSpend: number;
  averageOrderValue: number;
  firstOrderDate: string;
  lastOrderDate: string;
  segment: CustomerSegment;
  internalNotes?: string;
  riskScore: 'LOW RISK' | 'NORMAL' | 'REVIEW REQUIRED';
}
