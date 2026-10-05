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
  discountPrice?: number; // in PKR
  costPrice?: number; // private product cost in PKR (Admins only)
  stock: number;
  reservedStock?: number;
  availableStock?: number;
  lowStockThreshold: number;
  unit?: string; // e.g. "piece", "meter", "set", "box"
  variants?: ProductVariant[];
  isArchived?: boolean;
  isActive?: boolean;
  isVisible?: boolean;
  weight?: string;
  weightKg?: number;
  weightUnit?: 'kg' | 'g';
  dimensions?: string;
  warranty: string;
  deliveryRuleType?: 'standard' | 'free' | 'fixed' | 'surcharge' | 'unavailable' | 'quote_required';
  deliveryFixedCharge?: number;
  deliverySurcharge?: number;
  installationAvailable?: boolean;
  installationCharge?: number;
  specialHandlingCharge?: number;
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

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  displayOrder?: number;
  isActive?: boolean;
  isVisible?: boolean;
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
  isVisible?: boolean;
  subcategories: Subcategory[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  logo_url?: string;
  description?: string;
  country?: string;
  websiteUrl?: string;
  website_url?: string;
  certification?: string;
  categories?: string[];
  partnerStatus?: string;
  displayOrder?: number;
  isVisible?: boolean;
  isFeatured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ManufacturingPartner = Brand;

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
  id?: string;
  label?: string; // e.g. "Home", "Office", "Site"
  fullName: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  addressLine: string;
  areaId?: string;
  areaName?: string;
  zoneId?: string;
  zoneName?: string;
  city: string;
  province: string;
  country?: string;
  postalCode?: string;
  landmark?: string;
  isDefault?: boolean;
}

export type DeliveryChargeMethod =
  | 'fixed'
  | 'percentage'
  | 'weight_based'
  | 'quantity_based'
  | 'order_value_based';

export type DeliveryShipmentStatus =
  | 'Pending'
  | 'Processing'
  | 'Dispatched'
  | 'In Transit'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Delivery Attempted'
  | 'Failed Delivery'
  | 'Returned'
  | 'Cancelled';

export interface DeliverySnapshot {
  zoneId?: string;
  zoneName: string;
  areaId?: string;
  areaName: string;
  city: string;
  province: string;
  postalCode?: string;
  baseDeliveryCharge: number;
  remoteAreaSurcharge: number;
  heavyOversizedSurcharge: number;
  productSpecificCharge: number;
  installationCharge: number;
  specialHandlingCharge: number;
  finalDeliveryCharge: number;
  ruleApplied: string;
  chargeMethod: string;
  freeDeliveryApplied: boolean;
  freeDeliveryReason?: string;
  codAvailable: boolean;
  codBlockedReason?: string;
  isRemoteArea: boolean;
  quoteRequired?: boolean;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  estimatedDeliveryText: string;
  totalWeightKg: number;
  calculatedAt: string;
}

export interface DeliveryOverrideRecord {
  previousCharge: number;
  overrideCharge: number;
  reason: string;
  overriddenBy: string;
  overriddenAt: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "MA-ORD-20261005-0001" or "MAG-8921"
  customerId?: string;
  customer: CustomerAddress;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  installationFee?: number;
  remoteSurcharge?: number;
  heavySurcharge?: number;
  grandTotal: number;
  status: OrderStatus;
  deliveryStatus?: DeliveryShipmentStatus;
  deliverySnapshot?: DeliverySnapshot;
  deliveryOverride?: DeliveryOverrideRecord;
  codVerified?: boolean;
  codVerificationStatus?: 'Pending Verification' | 'Verified' | 'Flagged' | 'Rejected';
  codVerificationNotes?: string;
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

export interface CustomerAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  savedAddresses: CustomerAddress[];
  cart?: OrderItem[];
  wishlist?: string[];
  accountStatus: 'Active' | 'Disabled';
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
  savedAddresses?: CustomerAddress[];
  accountStatus?: 'Active' | 'Disabled';
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
  startDate?: string;
  expiresAt?: string;
  usageLimit?: number;
  perCustomerLimit?: number;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  timesUsed: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type OfferType =
  | 'Flash Sale'
  | 'Percentage Discount'
  | 'Fixed PKR Discount'
  | 'Category Discount'
  | 'Product Discount'
  | 'Buy More Save More'
  | 'Bundle Offer'
  | 'Free Delivery'
  | 'Limited-Time Offer'
  | 'New Customer Offer'
  | 'Seasonal Offer';

export type SmartOfferType = OfferType;

export interface SmartOffer {
  id: string;
  name: string;
  shortDescription: string;
  bannerImage: string;
  offerType: OfferType;
  discountPercentage?: number;
  fixedDiscountAmount?: number;
  minOrderValue?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  applicableSubcategoryIds?: string[];
  applicableProducts?: string[];
  applicableCategories?: string[];
  couponCode?: string;
  badgeText?: string;
  countdownTimerEnabled?: boolean;
  showOnHomepage?: boolean;
  displayPriority?: number;
  priorityOrder?: number;
  isVisible?: boolean;
  isActive?: boolean;
  ctaText?: string;
  ctaLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyPageSection {
  id: string;
  heading: string;
  subheading?: string;
  content: string;
  imageUrl?: string;
  image?: string;
  buttonText?: string;
  buttonLink?: string;
  displayOrder: number;
}

export interface CompanyPageButton {
  id: string;
  text: string;
  destination: string;
  style?: 'primary' | 'secondary' | 'gold';
}

export interface CompanyPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  heroImage?: string;
  content: string;
  sections: CompanyPageSection[];
  buttons?: CompanyPageButton[];
  buttonText?: string;
  buttonLink?: string;
  displayOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HomepageCompanySection {
  heading: string;
  subheading?: string;
  description: string;
  imageUrl?: string;
  image?: string;
  buttonText: string;
  buttonLink: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  highlights?: string[];
  isVisible: boolean;
  displayOrder: number;
}

export type SolutionType =
  | 'Solar Solution'
  | 'Electrical House Wiring Solution'
  | 'Bathroom Sanitary Solution'
  | 'Kitchen Appliance Solution'
  | 'EV Charging Solution'
  | 'Hardware & Tools Package'
  | 'Commercial / Project Solution';

export interface SolutionStep {
  id: string;
  title: string;
  description?: string;
  isRequired: boolean;
  allowMultiple?: boolean;
  productIds: string[];
  displayOrder: number;
}

export interface SolutionPackage {
  id: string;
  slug: string;
  title?: string;
  name?: string;
  subtitle?: string;
  solutionType?: SolutionType;
  targetPropertyType?: string;
  propertySize?: string;
  budgetTier?: 'Economy' | 'Standard' | 'Luxury';
  description: string;
  imageUrl?: string;
  image?: string;
  categoryTag?: string;
  steps?: SolutionStep[];
  recommendedProducts?: string[];
  estimatedMinPrice?: number;
  estimatedMaxPrice?: number;
  packageDiscount?: number;
  includesList?: string[];
  specifications?: Record<string, string>;
  installationCharge?: number;
  deliveryCharge?: number;
  solutionDiscount?: number; // fixed PKR discount or bundle savings
  customServiceCharge?: number;
  customServiceLabel?: string;
  displayOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerSavedAddress = CustomerAddress;

export interface QuotationLineItem {
  productId: string;
  productName: string;
  sku: string;
  productImage?: string;
  stepTitle?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type QuoteLifecycleStatus =
  | 'Requested'
  | 'Under Review'
  | 'Quotation Sent'
  | 'Customer Confirmed'
  | 'Processing'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled'
  | 'Expired';

export interface StoreSettings {
  storeName: string;
  tagline: string;
  receiptLogoUrl?: string;
  receiptFooterNote?: string;
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
  storefrontEnabled?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  requireLoginForCheckout?: boolean;
  warrantyPolicyText?: string;
  returnPolicyText?: string;
  termsConditionsText?: string;
  privacyPolicyText?: string;
  aiAssistantEnabled: boolean;
  aiWelcomeMessage: string;
  aiTagline?: string;
  aiSuggestedQuestions?: string[];
  aiSystemInstructions?: string;
  aiMaxRecommendations?: number;
  aiAccessProductCatalog?: boolean;
  aiAccessCustomerOrders?: boolean;
  homepageCompanySection?: HomepageCompanySection;
}

export interface B2BInquiry {
  id: string;
  quoteTrackingCode?: string; // e.g. MA-QT-20261005-0001
  quote_tracking_code?: string;
  quoteType?: 'b2b' | 'solution';
  solutionId?: string;
  solutionTitle?: string;
  solutionType?: string;
  propertyType?: string;
  estimatedQuantity?: string;
  productsRequired?: string;
  notes?: string;
  customerId?: string;
  companyName: string;
  businessName?: string;
  contactPerson: string;
  customerName?: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  categoryInterest?: string;
  estimatedBudget?: string;
  projectDetails?: string;
  customerMessage?: string;
  items?: QuotationLineItem[];
  subtotal?: number;
  discount?: number;
  deliveryCharges?: number;
  installationCharges?: number;
  customServiceCharges?: number;
  total?: number;
  adminQuotationAmount?: number;
  adminNotes?: string;
  validUntil?: string;
  termsAndConditions?: string;
  paymentTerms?: string;
  convertedOrderId?: string;
  convertedOrderNumber?: string;
  status:
    | QuoteLifecycleStatus
    | 'Submitted'
    | 'Quotation Prepared'
    | 'Sent to Customer'
    | 'Approved'
    | 'Closed'
    | 'new'
    | 'contacted'
    | 'quoted'
    | 'closed'
    | 'New'
    | 'Reviewing'
    | 'Quoted'
    | 'Accepted';
  createdAt: string;
  updatedAt?: string;
  quotedAt?: string;
  confirmedAt?: string;
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
  id?: string;
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
  registrationDate?: string;
  accountStatus?: 'Active' | 'Guest' | 'Disabled';
  segment: CustomerSegment;
  internalNotes?: string;
  riskScore: 'LOW RISK' | 'NORMAL' | 'REVIEW REQUIRED';
}

// ============================================================================
// COMPLETE DELIVERY, AREAS & ZONES MANAGEMENT SYSTEM TYPES
// ============================================================================

export interface WeightBracket {
  minKg: number;
  maxKg: number;
  charge: number;
}

export interface QuantityBracket {
  minQty: number;
  maxQty: number;
  charge: number;
}

export interface OrderValueBracket {
  minAmount: number;
  maxAmount: number;
  charge: number;
}

export interface DeliveryZone {
  id: string;
  name: string; // e.g. "Zone 1 — Lahore"
  code: string; // e.g. "LHR-Z1"
  description?: string;
  province: string; // e.g. "Punjab"
  baseCharge: number;
  chargeType: DeliveryChargeMethod;
  percentageRate?: number;
  freeDeliveryThreshold?: number;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  codEnabled: boolean;
  codMinAmount?: number;
  codMaxAmount?: number;
  installationBaseCharge?: number;
  isActive: boolean;
  displayOrder: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryArea {
  id: string;
  zoneId: string;
  zoneName?: string;
  name: string; // e.g. "DHA Phase 1–8", "Gulberg", "Johar Town"
  code: string; // e.g. "LHR-DHA"
  city: string; // e.g. "Lahore"
  province: string; // e.g. "Punjab"
  postalCode?: string;
  deliveryCharge?: number | null; // null/undefined falls back to zone charge
  chargeType?: DeliveryChargeMethod;
  freeDeliveryThreshold?: number | null;
  minDeliveryDays?: number | null;
  maxDeliveryDays?: number | null;
  codEnabled: boolean;
  codMinAmount?: number | null;
  codMaxAmount?: number | null;
  isRemoteArea: boolean;
  remoteSurcharge: number;
  installationCharge?: number | null;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FreeDeliveryRule {
  id: string;
  name: string;
  minOrderValue: number;
  zoneIds?: string[];
  areaIds?: string[];
  productIds?: string[];
  categoryIds?: string[];
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface DeliveryHoliday {
  id: string;
  name: string;
  holidayDate: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface DeliverySettings {
  defaultCharge: number;
  defaultChargeType: DeliveryChargeMethod;
  defaultMinDays: number;
  defaultMaxDays: number;
  defaultCodEnabled: boolean;
  globalCodMinOrder: number;
  globalCodMaxOrder: number;
  globalFreeDeliveryThreshold: number;
  enableGlobalFreeDelivery: boolean;
  cutoffTime: string; // e.g. "16:00"
  timezone: string; // e.g. "Asia/Karachi"
  workingDays: {
    Monday: boolean;
    Tuesday: boolean;
    Wednesday: boolean;
    Thursday: boolean;
    Friday: boolean;
    Saturday: boolean;
    Sunday: boolean;
  };
  holidays: DeliveryHoliday[];
  weightBrackets: WeightBracket[];
  quantityBrackets: QuantityBracket[];
  orderValueBrackets: OrderValueBracket[];
  heavyWeightThresholdKg: number;
  heavyFixedSurcharge: number;
  heavyPercentageSurcharge: number;
  multiProductShipmentMode: 'combined' | 'highest_rule' | 'separate';
  freeDeliveryRules: FreeDeliveryRule[];
  updatedAt: string;
}

export type ServiceRequestType =
  | 'Installation'
  | 'Repair'
  | 'Inspection'
  | 'Maintenance'
  | 'Warranty Service';

export type ServiceRequestStatus =
  | 'Submitted'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Closed';

export interface WarrantyRegistration {
  id: string;
  orderNumber: string;
  productId?: string;
  productName: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyPeriod: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city?: string;
  status: 'Active' | 'Pending Verification' | 'Expired' | 'Claimed';
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceRequest {
  id: string;
  ticketNumber: string;
  requestType: ServiceRequestType;
  status: ServiceRequestStatus;
  orderNumber?: string;
  productName: string;
  serialNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  city: string;
  preferredDate?: string;
  issueDescription: string;
  assignedTechnician?: string;
  adminNotes?: string;
  resolutionSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  inquiryType:
    | 'Contact Form'
    | 'Product Inquiry'
    | 'Callback Request'
    | 'Order Inquiry'
    | 'Quote Inquiry'
    | 'Service Request'
    | 'General Support';
  subject: string;
  message: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderOrQuoteRef?: string;
  status: 'Open' | 'In Progress' | 'Replied' | 'Closed';
  assignedTo?: string;
  adminReply?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

