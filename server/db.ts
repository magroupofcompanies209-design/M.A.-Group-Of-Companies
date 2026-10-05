import fs from 'fs';
import path from 'path';
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
  User,
  StaffUser,
  AdminSecuritySettings,
  InventoryLedgerEntry,
  InventoryChangeReason,
  CustomerProfile,
  OrderRiskLevel,
  CompanyPage,
  SmartOffer,
  SolutionPackage,
  DeliveryZone,
  DeliveryArea,
  DeliverySettings,
  DeliverySnapshot,
  WarrantyRegistration,
  ServiceRequest,
  SupportTicket,
} from '../src/types/index.ts';
import { postgresManager, type DatabaseStatus } from './postgres.ts';

interface DatabaseSchema {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  orders: Order[];
  reviews: Review[];
  banners: HeroBanner[];
  coupons: Coupon[];
  settings: StoreSettings;
  inquiries: B2BInquiry[];
  companyPages?: CompanyPage[];
  smartOffers?: SmartOffer[];
  solutions?: SolutionPackage[];
  deliveryZones?: DeliveryZone[];
  deliveryAreas?: DeliveryArea[];
  deliverySettings?: DeliverySettings;
  warrantyRegistrations?: WarrantyRegistration[];
  serviceRequests?: ServiceRequest[];
  supportTickets?: SupportTicket[];
  auditLogs: AuditLog[];
  users: User[];
  inventoryLedger?: InventoryLedgerEntry[];
  customerNotes?: Record<string, string>; // phone -> staff note
  securitySettings?: AdminSecuritySettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-solar',
    name: 'Solar Products & Equipment',
    slug: 'solar-products',
    description: 'Tier-1 Mono PERC solar panels, hybrid & on-grid inverters, lithium batteries, and solar mounting accessories for residential and industrial projects in Pakistan.',
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    iconName: 'Sun',
    displayOrder: 1,
    isActive: true,
    subcategories: [
      { id: 'sub-solar-panels', categoryId: 'cat-solar', name: 'Solar Panels', slug: 'solar-panels', displayOrder: 1, isActive: true },
      { id: 'sub-solar-inverters', categoryId: 'cat-solar', name: 'Inverters', slug: 'solar-inverters', displayOrder: 2, isActive: true },
      { id: 'sub-solar-batteries', categoryId: 'cat-solar', name: 'Batteries', slug: 'solar-batteries', displayOrder: 3, isActive: true },
      { id: 'sub-solar-acc', categoryId: 'cat-solar', name: 'Solar Accessories', slug: 'solar-accessories', displayOrder: 4, isActive: true },
    ],
  },
  {
    id: 'cat-electrical',
    name: 'Electrical Products & Equipment',
    slug: 'electrical-products',
    description: 'Certified copper cables, circuit breakers, designer modular switches, industrial distribution boxes, and LED lighting.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    iconName: 'Zap',
    displayOrder: 2,
    isActive: true,
    subcategories: [
      { id: 'sub-switches', categoryId: 'cat-electrical', name: 'Switches', slug: 'switches-sockets', displayOrder: 1, isActive: true },
      { id: 'sub-sockets', categoryId: 'cat-electrical', name: 'Sockets', slug: 'sockets', displayOrder: 2, isActive: true },
      { id: 'sub-cables', categoryId: 'cat-electrical', name: 'Wires & Cables', slug: 'wires-cables', displayOrder: 3, isActive: true },
      { id: 'sub-breakers', categoryId: 'cat-electrical', name: 'Breakers', slug: 'circuit-breakers', displayOrder: 4, isActive: true },
      { id: 'sub-led-lights', categoryId: 'cat-electrical', name: 'LED Lights', slug: 'led-lights', displayOrder: 5, isActive: true },
      { id: 'sub-fans', categoryId: 'cat-electrical', name: 'Fans & Ventilation', slug: 'fans-ventilation', displayOrder: 6, isActive: true },
      { id: 'sub-elec-acc', categoryId: 'cat-electrical', name: 'Electrical Accessories', slug: 'electrical-accessories', displayOrder: 7, isActive: true },
    ],
  },
  {
    id: 'cat-sanitary',
    name: 'Sanitary Ware & Fittings',
    slug: 'sanitary-products',
    description: 'Designer bathroom mixer taps, ceramic wash basins, rain showers, concealed cisterns, and luxury plumbing hardware.',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    iconName: 'Droplet',
    displayOrder: 3,
    isActive: true,
    subcategories: [
      { id: 'sub-faucets', categoryId: 'cat-sanitary', name: 'Faucets', slug: 'faucets-mixers', displayOrder: 1, isActive: true },
      { id: 'sub-basins', categoryId: 'cat-sanitary', name: 'Wash Basins', slug: 'wash-basins', displayOrder: 2, isActive: true },
      { id: 'sub-toilets', categoryId: 'cat-sanitary', name: 'Toilets', slug: 'commodes-cisterns', displayOrder: 3, isActive: true },
      { id: 'sub-showers', categoryId: 'cat-sanitary', name: 'Showers', slug: 'showers-panels', displayOrder: 4, isActive: true },
      { id: 'sub-plumbing', categoryId: 'cat-sanitary', name: 'Bathroom Accessories', slug: 'pipes-fittings', displayOrder: 5, isActive: true },
    ],
  },
  {
    id: 'cat-hardware',
    name: 'Hardware & Tools',
    slug: 'hardware-tools',
    description: 'Heavy-duty power tools, construction hardware, brass door handles, high-security smart locks, and industrial fasteners.',
    image: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=800&q=80',
    iconName: 'Wrench',
    displayOrder: 4,
    isActive: true,
    subcategories: [
      { id: 'sub-power-tools', categoryId: 'cat-hardware', name: 'Tools', slug: 'power-tools', displayOrder: 1, isActive: true },
      { id: 'sub-locks', categoryId: 'cat-hardware', name: 'Locks', slug: 'locks-security', displayOrder: 2, isActive: true },
      { id: 'sub-fasteners', categoryId: 'cat-hardware', name: 'Fasteners', slug: 'fasteners', displayOrder: 3, isActive: true },
      { id: 'sub-hand-tools', categoryId: 'cat-hardware', name: 'Building Hardware', slug: 'hand-tools', displayOrder: 4, isActive: true },
    ],
  },
  {
    id: 'cat-hobs-hoods',
    name: 'Kitchen Hobs & Hoods',
    slug: 'hobs-hoods',
    description: 'Italian-inspired tempered glass built-in gas hobs, touch-control suction kitchen chimney hoods, and kitchen accessories.',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    iconName: 'Flame',
    displayOrder: 5,
    isActive: true,
    subcategories: [
      { id: 'sub-builtin-hobs', categoryId: 'cat-hobs-hoods', name: 'Hobs', slug: 'builtin-gas-hobs', displayOrder: 1, isActive: true },
      { id: 'sub-kitchen-hoods', categoryId: 'cat-hobs-hoods', name: 'Hoods', slug: 'kitchen-hoods', displayOrder: 2, isActive: true },
      { id: 'sub-electric-hobs', categoryId: 'cat-hobs-hoods', name: 'Kitchen Accessories', slug: 'induction-infrared-hobs', displayOrder: 3, isActive: true },
    ],
  },
  {
    id: 'cat-ev-bikes',
    name: 'EV Bikes & Green Mobility',
    slug: 'ev-bikes',
    description: 'Modern lithium-powered electric bikes, high-efficiency smart fast chargers, conversion kits, and EV accessories.',
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    iconName: 'Bike',
    displayOrder: 6,
    isActive: true,
    subcategories: [
      { id: 'sub-electric-bikes', categoryId: 'cat-ev-bikes', name: 'EV Bikes', slug: 'electric-bikes', displayOrder: 1, isActive: true },
      { id: 'sub-ev-batteries', categoryId: 'cat-ev-bikes', name: 'EV Accessories', slug: 'ev-battery-packs', displayOrder: 2, isActive: true },
      { id: 'sub-ev-chargers', categoryId: 'cat-ev-bikes', name: 'Chargers', slug: 'ev-chargers', displayOrder: 3, isActive: true },
    ],
  },
  {
    id: 'cat-power-equipment',
    name: 'Power Equipment & Generators',
    slug: 'power-equipment',
    description: 'Industrial voltage stabilizers, dual-fuel portable generators, air compressors, and welding machines.',
    image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    iconName: 'Activity',
    displayOrder: 7,
    isActive: true,
    subcategories: [
      { id: 'sub-stabilizers', categoryId: 'cat-power-equipment', name: 'Automatic Voltage Regulators', slug: 'voltage-stabilizers', displayOrder: 1, isActive: true },
      { id: 'sub-generators', categoryId: 'cat-power-equipment', name: 'Generators & Power Units', slug: 'generators', displayOrder: 2, isActive: true },
    ],
  },
];

const INITIAL_BRANDS: Brand[] = [
  {
    id: 'b-inverex',
    name: 'Inverex Solar Energy',
    slug: 'inverex',
    isFeatured: true,
    isVisible: true,
    displayOrder: 1,
    country: 'Pakistan / Germany Tech',
    websiteUrl: 'https://aptinverex.com',
    certification: 'ISO 9001 & IEC Tier-1 Solar Certified',
    categories: ['Solar Products & Equipment'],
    partnerStatus: 'Authorized Master Distributor',
    description: 'Leading engineering brand in hybrid solar inverters, MPPT controllers, and LiFePO4 lithium batteries.',
  },
  {
    id: 'b-schneider',
    name: 'Schneider Electric',
    slug: 'schneider-electric',
    isFeatured: true,
    isVisible: true,
    displayOrder: 2,
    country: 'France',
    websiteUrl: 'https://www.se.com',
    certification: 'IEC 60898-1 & CE European Safety Standard',
    categories: ['Electrical Products & Equipment', 'Solar Products & Equipment'],
    partnerStatus: 'Certified Industrial Partner',
    description: 'Global benchmark in low-voltage energy management, Acti9 MCB breakers, and industrial protection.',
  },
  {
    id: 'b-pakcables',
    name: 'Pakistan Cables',
    slug: 'pakistan-cables',
    isFeatured: true,
    isVisible: true,
    displayOrder: 3,
    country: 'Pakistan',
    websiteUrl: 'https://www.pakistancables.com',
    certification: 'PSQCA & BS 6004 99.99% Pure Copper Certified',
    categories: ['Electrical Products & Equipment'],
    partnerStatus: 'Official Commercial Partner',
    description: 'Premier manufacturer of 99.99% pure electrolyte copper building wires and power cables since 1953.',
  },
  {
    id: 'b-crownmicro',
    name: 'Crown Micro Global',
    slug: 'crown-micro',
    isFeatured: true,
    isVisible: true,
    displayOrder: 4,
    country: 'USA / China',
    websiteUrl: 'https://crownmicroglobal.com',
    certification: 'CE & RoHS Power Electronics Certified',
    categories: ['Solar Products & Equipment', 'Electrical Products & Equipment'],
    partnerStatus: 'Authorized Partner',
    description: 'High-performance solar inverters, modular electrical accessories, and smart power systems.',
  },
  {
    id: 'b-master',
    name: 'Master Sanitary Ware',
    slug: 'master-sanitary',
    isFeatured: true,
    isVisible: true,
    displayOrder: 5,
    country: 'Pakistan',
    websiteUrl: '',
    certification: 'ISO 9001 Forged Brass & Ceramic Standard',
    categories: ['Sanitary Ware & Fittings'],
    partnerStatus: 'Certified Manufacturer',
    description: 'Luxury architectural bathroom fittings, solid brass mixer taps, and vitreous china sanitary fixtures.',
  },
  {
    id: 'b-sonex',
    name: 'Sonex Bath Solutions',
    slug: 'sonex',
    isFeatured: true,
    isVisible: true,
    displayOrder: 6,
    country: 'Pakistan / Spain Cartridge',
    websiteUrl: '',
    certification: 'Spanish Sedal Cartridge & Swiss Neoperl Certified',
    categories: ['Sanitary Ware & Fittings'],
    partnerStatus: 'Official Showroom Partner',
    description: 'Premium designer faucets, concealed thermostatic mixers, and luxury rain shower systems.',
  },
  {
    id: 'b-bosch',
    name: 'Bosch Power Tools',
    slug: 'bosch',
    isFeatured: true,
    isVisible: true,
    displayOrder: 7,
    country: 'Germany',
    websiteUrl: 'https://www.bosch-professional.com',
    certification: 'German DIN / ISO Heavy-Duty Engineering',
    categories: ['Hardware & Tools'],
    partnerStatus: 'Authorized Tool Partner',
    description: 'Heavy-duty German engineered cordless rotary hammers, impact drills, and industrial hardware.',
  },
  {
    id: 'b-corona',
    name: 'Corona Kitchen Appliances',
    slug: 'corona',
    isFeatured: true,
    isVisible: true,
    displayOrder: 8,
    country: 'Italy / Pakistan',
    websiteUrl: '',
    certification: 'Sabaf Italian Burner & Tempered Safety Glass Certified',
    categories: ['Kitchen Hobs & Hoods'],
    partnerStatus: 'Exclusive Showroom Partner',
    description: 'Built-in tempered glass gas hobs, brass burners, and touch-gesture auto-clean kitchen chimney hoods.',
  },
  {
    id: 'b-crown-ev',
    name: 'Crown EV Mobility',
    slug: 'crown-ev',
    isFeatured: true,
    isVisible: true,
    displayOrder: 9,
    country: 'Pakistan',
    websiteUrl: '',
    certification: 'UN38.3 Lithium Safety & Green Mobility Certified',
    categories: ['EV Bikes & Green Mobility'],
    partnerStatus: 'Authorized EV Partner',
    description: 'Zero-emission lithium electric commuter motorbikes and high-efficiency fast charging units.',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  // 1. Solar
  {
    id: 'prod-inverex-nitrox-6kw',
    name: 'Inverex Nitrox 6kW Hybrid Solar Inverter (IP65 Dual MPPT)',
    slug: 'inverex-nitrox-6kw-hybrid-solar-inverter',
    sku: 'INV-NX-6KW',
    barcode: '896400129001',
    categoryId: 'cat-solar',
    categoryName: 'Solar Products & Equipment',
    subcategoryId: 'sub-solar-inverters',
    subcategoryName: 'Solar Inverters',
    brand: 'Inverex Solar Energy',
    price: 345000,
    salePrice: 325000,
    stock: 14,
    lowStockThreshold: 3,
    status: 'active',
    isFeatured: true,
    isBestSeller: true,
    warranty: '5 Years Official Inverex Pakistan Warranty',
    rating: 4.9,
    reviewCount: 38,
    shortDescription: 'Smart hybrid on-grid/off-grid inverter with Wi-Fi monitoring, IP65 waterproof casing, and dual MPPT channels.',
    description: 'The Inverex Nitrox 6kW Hybrid Solar Inverter represents peak solar engineering for Pakistani homes and commercial setups. Designed to handle severe grid fluctuations and power outages, it seamlessly integrates solar PV, grid power, generator input, and 48V battery backup (supports both LiFePO4 Lithium and Tubular batteries). Features remote Android/iOS cloud monitoring.',
    images: [
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'Dual MPPT with 99.9% tracking efficiency',
      'IP65 water and dust proof enclosure',
      'Supports Net Metering export to WAPDA / K-Electric',
      'Smart load shedding management and generator kick-in',
      'Built-in Wi-Fi dongle for live mobile telemetry',
    ],
    specifications: [
      { key: 'Rated Power', value: '6,000 Watts (6 kW)' },
      { key: 'Max PV Input', value: '7,800 Watts' },
      { key: 'MPPT Voltage Range', value: '125V - 500V DC' },
      { key: 'Battery Compatibility', value: '48V Lead Acid / Lithium LiFePO4' },
      { key: 'Dimensions', value: '420 x 515 x 205 mm' },
      { key: 'Weight', value: '25.0 kg' },
    ],
    tags: ['solar', 'inverter', 'hybrid', 'inverex', 'net-metering'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-longi-550w-mono',
    name: 'Longi Hi-MO 5 550W Tier-1 Mono PERC Bifacial Solar Panel',
    slug: 'longi-himo-5-550w-solar-panel',
    sku: 'LGI-550W-BIF',
    categoryId: 'cat-solar',
    categoryName: 'Solar Products & Equipment',
    subcategoryId: 'sub-solar-panels',
    subcategoryName: 'Solar Panels',
    brand: 'Inverex Solar Energy',
    price: 38500,
    salePrice: 35900,
    stock: 120,
    lowStockThreshold: 15,
    status: 'active',
    isFeatured: true,
    isDeal: true,
    warranty: '12 Years Product / 25 Years Linear Power Warranty',
    rating: 4.8,
    reviewCount: 44,
    shortDescription: 'High-efficiency A-grade Tier 1 bifacial solar module with gallium-doped half-cut cell technology.',
    description: 'Engineered specifically for hot ambient climates such as Pakistan, delivering superior kWh generation even during peak summer temperatures. The bifacial rear-side gain generates up to 15% extra energy from reflected ground radiation.',
    images: [
      'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'Tier 1 Bloomberg approved manufacturing standard',
      '21.3% module peak efficiency',
      'Anti-PID and anti-snail trail guarantee',
      'Heavy-duty 35mm anodized aluminum frame withstands 5400Pa wind load',
    ],
    specifications: [
      { key: 'Peak Power (Pmax)', value: '550 Watts' },
      { key: 'Open Circuit Voltage (Voc)', value: '49.80 V' },
      { key: 'Short Circuit Current (Isc)', value: '13.98 A' },
      { key: 'Dimensions', value: '2278 x 1134 x 35 mm' },
      { key: 'Weight', value: '27.5 kg' },
    ],
    tags: ['solar', 'panels', 'longi', 'tier-1', 'bifacial'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-inverex-lithium-powerwall-48v',
    name: 'Inverex PowerWall 48V 100Ah (5.12kWh) LiFePO4 Lithium Battery',
    slug: 'inverex-powerwall-48v-100ah-lifepo4',
    sku: 'INV-PW-48100',
    categoryId: 'cat-solar',
    categoryName: 'Solar Products & Equipment',
    subcategoryId: 'sub-solar-batteries',
    subcategoryName: 'Lithium & Tubular Batteries',
    brand: 'Inverex Solar Energy',
    price: 360000,
    salePrice: 345000,
    stock: 9,
    lowStockThreshold: 2,
    status: 'active',
    isFeatured: true,
    warranty: '5 Years Replacement Warranty (6,000+ Cycles)',
    rating: 5.0,
    reviewCount: 19,
    shortDescription: 'Wall-mounted slim lithium energy storage unit with built-in intelligent BMS and LCD touchscreen.',
    description: 'Replace heavy lead-acid batteries with safe, long-lasting Lithium Iron Phosphate (LiFePO4) storage. Provides 90% Depth of Discharge (DoD) compared to only 50% on traditional tubular batteries. Direct plug-and-play communication with Nitrox, Growatt, and Crown inverters via CAN/RS485.',
    images: [
      'https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      '6,000+ deep discharge cycles at 80% DoD',
      'Ultra-compact wall mount architecture',
      'Integrated BMS with over-temperature and cell balancing protection',
      'Zero maintenance, no acid fumes or water top-ups',
    ],
    specifications: [
      { key: 'Nominal Voltage', value: '51.2 V' },
      { key: 'Rated Capacity', value: '100 Ah (5.12 kWh)' },
      { key: 'Max Charge/Discharge Current', value: '100 A' },
      { key: 'Weight', value: '48.0 kg' },
    ],
    tags: ['solar', 'battery', 'lithium', 'lifepo4', 'powerwall'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 2. Electrical
  {
    id: 'prod-pak-cables-70-0076',
    name: 'Pakistan Cables 70/0.0076 Single Core Pure Copper Cable (90m Coil)',
    slug: 'pakistan-cables-70-0076-copper-coil',
    sku: 'PC-700076-RED',
    categoryId: 'cat-electrical',
    categoryName: 'Electrical Products & Equipment',
    subcategoryId: 'sub-cables',
    subcategoryName: 'Wires & Cables',
    brand: 'Pakistan Cables',
    price: 26500,
    salePrice: 24800,
    stock: 45,
    lowStockThreshold: 10,
    status: 'active',
    isBestSeller: true,
    warranty: '100% Genuine Certified Oxygen-Free Copper Guarantee',
    rating: 4.9,
    reviewCount: 52,
    shortDescription: 'Heavy-duty 70/0076 pure copper building wire with flame retardant PVC insulation.',
    description: 'Manufactured with 99.99% pure electrolyte copper conductors conforming to PS 229 and BS 6004. Ideal for power outlets, air conditioner lines, heavy refrigeration loads, and commercial electrical infrastructure.',
    images: [
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      '99.99% ETP Grade Pure Copper',
      'High insulation resistance preventing electrical leakage',
      'Fire-retardant PVC reduces toxic smoke emission',
      'Pre-cut full length 90-meter coil with hologram seal',
    ],
    specifications: [
      { key: 'Conductor Size', value: '70 / 0.0076 inch' },
      { key: 'Insulation', value: 'FR PVC 450/750V Grade' },
      { key: 'Standard Coils', value: '90 Meters (approx 100 yards)' },
      { key: 'Color Options', value: 'Red / Black / Blue' },
    ],
    tags: ['cables', 'wires', 'pakistan-cables', 'copper', 'electrical'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-schneider-acti9-breaker',
    name: 'Schneider Electric Acti9 32A Double Pole (DP) MCB Miniature Circuit Breaker',
    slug: 'schneider-acti9-32a-dp-breaker',
    sku: 'SCH-MCB-32DP',
    categoryId: 'cat-electrical',
    categoryName: 'Electrical Products & Equipment',
    subcategoryId: 'sub-breakers',
    subcategoryName: 'Circuit Breakers & DBs',
    brand: 'Schneider Electric',
    price: 4950,
    salePrice: 4400,
    stock: 65,
    lowStockThreshold: 12,
    status: 'active',
    isFeatured: true,
    warranty: '2 Years Manufacturer Replacement Warranty',
    rating: 4.9,
    reviewCount: 27,
    shortDescription: 'C-Curve high breaking capacity 6kA double-pole circuit breaker for complete short-circuit safety.',
    description: 'Schneider Acti9 circuit breakers safeguard your home appliances against short-circuits and electrical overloads. Features VisiTrip indicator for rapid faulty circuit detection and VisiSafe green band guaranteeing physical contact separation.',
    images: [
      'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'VisiTrip window turns red on electrical trip',
      'Fast closing mechanism prolongs contact lifespan',
      'Full protection against over-current and insulation damage',
    ],
    specifications: [
      { key: 'Rated Current (In)', value: '32 Amperes' },
      { key: 'Number of Poles', value: '2P (Double Pole)' },
      { key: 'Breaking Capacity', value: '6000 A (6kA)' },
      { key: 'Curve Code', value: 'Type C' },
    ],
    tags: ['breakers', 'schneider', 'mcb', 'safety', 'electrical'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-designer-switch-plate-gold',
    name: 'M.A. Signature Royal Gold Brushed 8-Gang Modular Switch Plate Set',
    slug: 'ma-royal-gold-brushed-switch-plate-8-gang',
    sku: 'MA-SW-8G-GLD',
    categoryId: 'cat-electrical',
    categoryName: 'Electrical Products & Equipment',
    subcategoryId: 'sub-switches',
    subcategoryName: 'Switches & Sockets',
    brand: 'Crown Micro',
    price: 6800,
    salePrice: 5950,
    stock: 80,
    lowStockThreshold: 20,
    status: 'active',
    isNewArrival: true,
    warranty: '10 Years Mechanical Mechanism Warranty',
    rating: 4.8,
    reviewCount: 31,
    shortDescription: 'Luxury anodized brushed gold metal finish with soft tactile LED neon indicator rockers.',
    description: 'Elevate your interior aesthetics with our premium brushed metallic switch plate. Comes complete with 6 one-way switches, 1 multi-plug universal socket with child safety shutters, and 1 fan regulator knob.',
    images: [
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'Anti-fingerprint brushed metallic surface',
      'Solid brass interior contacts prevent sparking',
      'Flame-retardant polycarbonate back-box',
    ],
    specifications: [
      { key: 'Finish', value: 'Warm Brushed Royal Gold' },
      { key: 'Gang Configuration', value: '8 Gang Modular' },
      { key: 'Voltage Rating', value: '250V AC / 16A Max' },
    ],
    tags: ['switches', 'luxury', 'gold', 'modular'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 3. Sanitary
  {
    id: 'prod-sonex-luxury-tall-basin-mixer',
    name: 'Sonex Prime Chrome High-Neck Luxury Brass Basin Mixer',
    slug: 'sonex-prime-chrome-tall-basin-mixer',
    sku: 'SNX-BM-CHR',
    categoryId: 'cat-sanitary',
    categoryName: 'Sanitary Ware & Fittings',
    subcategoryId: 'sub-faucets',
    subcategoryName: 'Luxury Faucets & Mixers',
    brand: 'Sonex Bath Solutions',
    price: 15500,
    salePrice: 13900,
    stock: 22,
    lowStockThreshold: 5,
    status: 'active',
    isFeatured: true,
    isBestSeller: true,
    warranty: '5 Years Leakage Free Cartridge Warranty',
    rating: 4.9,
    reviewCount: 36,
    shortDescription: 'Solid virgin brass construction with multi-layer mirror chrome finish and Spanish ceramic disc cartridge.',
    description: 'Engineered for luxury tabletop wash basins. The Sonex Prime mixer delivers silky smooth single-lever water control with an integrated Swiss Neoperl aerator that creates a soft splash-free foam flow while conserving 30% water.',
    images: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'Solid A-Grade forged brass body',
      'Sedal Spanish ceramic disc tested to 500,000 operations',
      'Neoperl aerator prevents limescale clogging',
      'Complete with stainless steel braided inlet hoses',
    ],
    specifications: [
      { key: 'Height', value: '310 mm (High Neck)' },
      { key: 'Spout Reach', value: '165 mm' },
      { key: 'Material', value: 'DZR Brass Alloy' },
      { key: 'Finish', value: 'Electroplated Mirror Chrome' },
    ],
    tags: ['sanitary', 'faucets', 'basin-mixer', 'sonex', 'brass'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-master-rain-shower-set',
    name: 'Master Luxury Matte Black Thermostatic Concealed Rain Shower Set',
    slug: 'master-matte-black-concealed-rain-shower',
    sku: 'MST-RS-BLK',
    categoryId: 'cat-sanitary',
    categoryName: 'Sanitary Ware & Fittings',
    subcategoryId: 'sub-showers',
    subcategoryName: 'Rain Showers & Panels',
    brand: 'Master Sanitary',
    price: 38000,
    salePrice: 34500,
    stock: 16,
    lowStockThreshold: 4,
    status: 'active',
    isNewArrival: true,
    warranty: '7 Years Master Sanitary Warranty',
    rating: 5.0,
    reviewCount: 14,
    shortDescription: 'Complete 3-way concealed shower system with 12-inch stainless steel overhead rain head and brass handheld wand.',
    description: 'Transform your daily shower into a spa experience. Features a thermostatic valve that maintains consistent water temperature, eliminating sudden hot or cold surges when other water outlets are opened.',
    images: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'Anti-scald safety lock at 38°C',
      'Self-cleaning silicone nozzles on 300mm rain plate',
      'Matte black electro-deposition coating resists water spots',
    ],
    specifications: [
      { key: 'Rainhead Size', value: '12 x 12 Inches (300 x 300 mm)' },
      { key: 'Valve Body', value: 'Heavyweight Solid Brass' },
      { key: 'Working Pressure', value: '1.5 to 5.0 Bar' },
    ],
    tags: ['sanitary', 'shower', 'rain-shower', 'matte-black', 'master'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 4. Hardware & Tools
  {
    id: 'prod-bosch-gsb-18v-drill',
    name: 'Bosch GSB 18V-50 Professional Brushless Cordless Impact Drill Kit',
    slug: 'bosch-gsb-18v-brushless-drill-kit',
    sku: 'BSH-GSB-18V',
    categoryId: 'cat-hardware',
    categoryName: 'Hardware & Tools',
    subcategoryId: 'sub-power-tools',
    subcategoryName: 'Power Tools',
    brand: 'Bosch Power Tools',
    price: 52000,
    salePrice: 47500,
    stock: 18,
    lowStockThreshold: 4,
    status: 'active',
    isFeatured: true,
    isDeal: true,
    warranty: '1 Year Official Bosch Service Center Warranty',
    rating: 4.9,
    reviewCount: 41,
    shortDescription: 'Robust brushless motor delivering 50Nm torque with 2x 2.0Ah lithium batteries, charger, and heavy carrying case.',
    description: 'The contractor workhorse. Intelligent brushless motor provides 100% longer runtime and maintenance-free lifespan compared to conventional carbon brush tools. Easily tackles masonry drilling, metal fabrication, and wood cabinetry assembly.',
    images: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'All-metal 13mm Röhm chuck for high torque transfer',
      'Electronic Motor Protection (EMP) prevents burnout',
      'Variable speed trigger with LED worklight',
    ],
    specifications: [
      { key: 'Max Torque', value: '50 Nm' },
      { key: 'Impact Rate', value: '27,000 bpm' },
      { key: 'Chuck Capacity', value: '1.5 - 13 mm' },
      { key: 'Included', value: '2x 2.0Ah 18V Batteries + Quick Charger + Carry Case' },
    ],
    tags: ['hardware', 'tools', 'bosch', 'drill', 'cordless'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-smart-biometric-door-lock',
    name: 'M.A. Guardian Elite Biometric Fingerprint & RFID Smart Door Lock',
    slug: 'ma-guardian-elite-biometric-door-lock',
    sku: 'MA-LCK-BIO1',
    categoryId: 'cat-hardware',
    categoryName: 'Hardware & Tools',
    subcategoryId: 'sub-locks',
    subcategoryName: 'Locks & Security Hardware',
    brand: 'Crown Micro',
    price: 28500,
    salePrice: 24900,
    stock: 25,
    lowStockThreshold: 5,
    status: 'active',
    isNewArrival: true,
    warranty: '2 Years Replacement Guarantee',
    rating: 4.8,
    reviewCount: 22,
    shortDescription: 'Multi-access digital security lock supporting 3D semiconductor fingerprint, keypad PIN, RFID card, and Tuya Wi-Fi app.',
    description: 'Modern front door luxury and impenetrable security. Unlock your main entrance door in 0.3 seconds using your fingerprint, generate one-time guest passcodes remotely from your smartphone, or unlock with mechanical emergency backup keys.',
    images: [
      'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'FPC Swedish semiconductor fingerprint sensor',
      'Anti-peep scramble code technology',
      'Stainless steel 304 anti-saw multi-point mortise lock body',
      'Rechargeable lithium battery with Type-C emergency jump port',
    ],
    specifications: [
      { key: 'Door Thickness', value: '38 mm - 100 mm' },
      { key: 'Fingerprint Capacity', value: '100 Unique Prints' },
      { key: 'Material', value: 'Aviation Aluminum Alloy + Tempered Glass' },
    ],
    tags: ['hardware', 'smart-lock', 'security', 'fingerprint'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 5. Hobs & Kitchen Hoods
  {
    id: 'prod-corona-3-burner-hob',
    name: 'Corona Imperial 3-Burner Tempered Glass Built-in Gas Hob (Heavy Brass Burners)',
    slug: 'corona-imperial-3-burner-gas-hob',
    sku: 'CRN-HOB-3B',
    categoryId: 'cat-hobs-hoods',
    categoryName: 'Hobs & Kitchen Hoods',
    subcategoryId: 'sub-builtin-hobs',
    subcategoryName: 'Built-in Gas Hobs',
    brand: 'Corona Kitchenware',
    price: 36000,
    salePrice: 31900,
    stock: 19,
    lowStockThreshold: 3,
    status: 'active',
    isFeatured: true,
    isBestSeller: true,
    warranty: '2 Years Comprehensive Warranty (Glass & Brass Burners)',
    rating: 4.9,
    reviewCount: 48,
    shortDescription: '8mm thermal explosion-proof black bevelled tempered glass with Sabaf style heavy brass burners and auto battery pulse ignition.',
    description: 'Designed to cater to authentic Pakistani cooking styles requiring high heat and large wok utensils. Features 1 high-power triple-ring wok burner (4.2kW), 1 medium semi-rapid burner, and 1 auxiliary simmer burner. Equipped with heavy-duty cast iron pan supports.',
    images: [
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'High-grade 100% brass burners will not deform or rust under intense heat',
      'Flame Failure Safety Device (FFD) automatically cuts gas if flame blows out',
      'Heavy cast iron trivets support heavyweight deghs and woks',
      'Dual fuel compatible: Sui Gas (NG) or Cylinder LPG',
    ],
    specifications: [
      { key: 'Overall Dimensions', value: '750 x 430 mm' },
      { key: 'Cut-out Size', value: '680 x 380 mm' },
      { key: 'Glass Thickness', value: '8mm Toughened Bevelled Edge' },
      { key: 'Ignition Type', value: '1.5V D-Cell Battery Pulse Ignition' },
    ],
    tags: ['hobs', 'kitchen', 'gas-hob', 'corona', 'brass-burner'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-corona-90cm-kitchen-hood',
    name: 'Corona Cyclone 90cm Auto-Clean Touch-Control Kitchen Hood',
    slug: 'corona-cyclone-90cm-auto-clean-kitchen-hood',
    sku: 'CRN-HD-90C',
    categoryId: 'cat-hobs-hoods',
    categoryName: 'Hobs & Kitchen Hoods',
    subcategoryId: 'sub-kitchen-hoods',
    subcategoryName: 'Auto-Clean Range Hoods',
    brand: 'Corona Kitchenware',
    price: 49500,
    salePrice: 44000,
    stock: 12,
    lowStockThreshold: 3,
    status: 'active',
    isFeatured: true,
    warranty: '5 Years Motor Warranty / 1 Year Parts Warranty',
    rating: 4.8,
    reviewCount: 29,
    shortDescription: '1200 m³/hr high-suction pure copper motor with gesture wave control and thermal heat auto-cleaning technology.',
    description: 'Say goodbye to greasy kitchen cabinets and choking cooking smoke. The Corona Cyclone range hood features intelligent wave sensors—simply wave your hand to turn on or increase suction speed without touching the glass panel with oily fingers. Built-in thermal heating elements melt trapped oil into a removable collection cup at the push of a button.',
    images: [
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'Hands-free infrared motion gesture control',
      'Heat auto-cleaning system liquefies sticky grease inside blower fan',
      'Ultra-quiet motor operation below 58dB',
      'Energy-saving bright LED downlights',
    ],
    specifications: [
      { key: 'Width', value: '900 mm (90 cm)' },
      { key: 'Suction Capacity', value: '1200 m³/hr' },
      { key: 'Filter Type', value: 'Baffle Stainless Steel Filter' },
      { key: 'Exhaust Pipe Diameter', value: '160 mm' },
    ],
    tags: ['hoods', 'kitchen-chimney', 'auto-clean', 'corona', 'range-hood'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 6. EV Bikes
  {
    id: 'prod-crown-ev-volt-72v',
    name: 'Crown EV Volt 72V 35Ah Lithium High-Range Electric Commuter Motorbike',
    slug: 'crown-ev-volt-72v-lithium-electric-bike',
    sku: 'CRW-EV-V72',
    categoryId: 'cat-ev-bikes',
    categoryName: 'EV Bikes & Green Mobility',
    subcategoryId: 'sub-electric-bikes',
    subcategoryName: 'Electric Commuter Bikes',
    brand: 'Crown EV Mobility',
    price: 245000,
    salePrice: 228000,
    stock: 6,
    lowStockThreshold: 2,
    status: 'active',
    isFeatured: true,
    isNewArrival: true,
    warranty: '3 Years Battery Warranty / 2 Years Motor Warranty',
    rating: 4.9,
    reviewCount: 16,
    shortDescription: 'Zero petrol costs. 100km real-world range per charge with 2000W waterproof BLDC hub motor and hydraulic disc brakes.',
    description: 'Beat soaring petrol prices in Pakistan with the revolutionary Crown EV Volt. Consumes only 2 to 2.5 electricity units per full charge (costing under PKR 150 for 100 km). Features front & rear tubeless tires, regenerative braking, digital LCD speedo console, anti-theft remote alarm, and USB phone charging port.',
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      '100 km range on a single charge at 45-55 km/h cruising speed',
      'Quick charge in 3.5 - 4 hours with supplied intelligent charger',
      '2000W peak output brushless hub motor with 3 riding modes + reverse gear',
      'Heavy-duty suspension tuned for Pakistani road conditions',
    ],
    specifications: [
      { key: 'Battery', value: '72V 35Ah Grade-A LiFePO4 Lithium (Removable)' },
      { key: 'Max Speed', value: '65 km/h' },
      { key: 'Climbing Angle', value: 'Up to 25 Degrees' },
      { key: 'Load Capacity', value: '180 kg (Comfortably carries 2 riders)' },
      { key: 'Brakes', value: 'Dual Hydraulic Disc with Regenerative EBS' },
    ],
    tags: ['ev-bike', 'electric-motorbike', 'lithium', 'green-mobility'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-ev-fast-charger-72v',
    name: 'Smart 72V 10A Aluminum Shell Ultra-Fast EV Charger (Fan-Cooled)',
    slug: 'smart-72v-10a-ev-fast-charger',
    sku: 'EV-CHG-7210',
    categoryId: 'cat-ev-bikes',
    categoryName: 'EV Bikes & Green Mobility',
    subcategoryId: 'sub-ev-chargers',
    subcategoryName: 'EV Chargers & Accessories',
    brand: 'Crown EV Mobility',
    price: 18500,
    salePrice: 16500,
    stock: 28,
    lowStockThreshold: 6,
    status: 'active',
    warranty: '1 Year Replacement Warranty',
    rating: 4.8,
    reviewCount: 19,
    shortDescription: 'Industrial grade 10-Amp fast charger with digital voltage display and automatic shut-off when full.',
    description: 'Cut your EV bike charging time in half. Intelligent 3-stage CC/CV charging profile extends battery life while preventing overheating. Aviation plug connector compatible with Crown, Road Prince, and custom EV conversions.',
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    ],
    features: [
      'Over-voltage, short-circuit, and reverse-polarity protection',
      'Dual high-RPM cooling fans with temperature sensor',
      'Heavy extruded aluminum casing for heat dissipation',
    ],
    specifications: [
      { key: 'Input Voltage', value: '180V - 240V AC 50Hz' },
      { key: 'Output Voltage', value: '84.0V DC (For 72V Lithium Packs)' },
      { key: 'Charge Current', value: '10 Amperes' },
    ],
    tags: ['ev-charger', 'fast-charger', 'accessories'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_BANNERS: HeroBanner[] = [
  {
    id: 'b-1',
    title: 'Power Your Home. Build Better. Live Smarter.',
    subtitle: 'M.A. GROUP OF COMPANIES',
    description: 'Pakistan premier distributor of certified solar energy systems, Tier-1 inverters, pure copper cables, sanitary ware, kitchen hobs, and green EV mobility.',
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1600&q=80',
    badge: 'Official Distributor & Direct Importer',
    ctaText: 'SHOP CATALOG',
    ctaLink: '/shop',
    secondaryCtaText: 'REQUEST B2B QUOTE',
    secondaryCtaLink: '/b2b-wholesale',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'b-2',
    title: 'Zero Electricity Bills. Switch to Smart Solar.',
    subtitle: 'Hybrid & Net-Metering Solutions',
    description: 'Complete 3kW to 50kW residential and industrial solar packages with genuine Inverex, Crown, and Longi equipment. Delivered directly to your door.',
    imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1600&q=80',
    badge: 'Cash on Delivery Across Pakistan',
    ctaText: 'EXPLORE SOLAR SYSTEMS',
    ctaLink: '/category/solar-products',
    secondaryCtaText: 'AI SOLAR CALCULATOR',
    secondaryCtaLink: '#ai-assistant',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'b-3',
    title: 'Modern Italian-Style Hobs & Kitchen Hoods',
    subtitle: 'Architectural Kitchen Perfection',
    description: 'Upgrade your culinary space with tempered glass heavy brass-burner hobs and whisper-quiet auto-clean suction hoods with gesture control.',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1600&q=80',
    badge: 'Up to 25% Off Limited Stock',
    ctaText: 'VIEW HOBS & HOODS',
    ctaLink: '/category/hobs-hoods',
    secondaryCtaText: 'TOP DEALS',
    secondaryCtaLink: '/deals',
    displayOrder: 3,
    isActive: true,
  },
];

const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'c-1',
    code: 'MAGROUP10',
    description: '10% discount on all orders above PKR 10,000',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 10000,
    maxDiscount: 5000,
    timesUsed: 42,
    isActive: true,
  },
  {
    id: 'c-2',
    code: 'WELCOMEPK',
    description: 'PKR 1,000 flat discount on your first order',
    discountType: 'fixed',
    discountValue: 1000,
    minOrderAmount: 8000,
    timesUsed: 115,
    isActive: true,
  },
];

const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'M.A. GROUP OF COMPANIES',
  tagline: 'Modern Solutions. Quality Products.',
  announcementBarText: 'Modern Solutions. Quality Products. — Nationwide Cash on Delivery across Pakistan',
  showAnnouncementBar: true,
  contactEmail: 'info@magroupofcompanies.pk',
  contactPhone: '',
  showHelpline: false,
  whatsappNumber: '',
  showWhatsapp: false,
  headOfficeAddress: '',
  lahoreShowroom: '',
  karachiShowroom: '',
  islamabadShowroom: '',
  showLocations: false,
  footerAboutText: 'M.A. GROUP OF COMPANIES is a premier Pakistani distributor and supplier of certified Tier-1 solar energy equipment, heavy pure copper building cables, designer modular switches, European sanitary fixtures, heavy power tools, Italian-style kitchen hobs & hoods, and zero-emission electric motorbikes.',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  codEnabled: true,
  codInstructions: 'Pay with cash to the delivery courier when your package arrives at your doorstep. Please keep the exact amount ready to avoid delivery delays.',
  codMinAmount: 500,
  codMaxAmount: 500000,
  standardShippingFee: 450,
  freeShippingThreshold: 5000,
  taxRate: 0,
  aiAssistantEnabled: true,
  aiWelcomeMessage: "Hello! I'm M.A. SMART ASSISTANT. How can I help you find the right product today?",
  aiTagline: 'Your intelligent shopping assistant.',
  aiSuggestedQuestions: [
    'Find a Product',
    'Compare Products',
    'Find Products Under My Budget',
    'Help Me Choose',
    'Track My Order',
    'Contact M.A. Group Of Companies',
  ],
  aiSystemInstructions:
    'Always use real products, prices, stock, and specifications from the M.A. GROUP OF COMPANIES Supabase catalog. Never invent products, prices, certifications, or warranties. Ask helpful clarifying questions for technical sizing (e.g., solar load, number of ACs/fans, backup requirements).',
  aiMaxRecommendations: 3,
  aiAccessProductCatalog: true,
  aiAccessCustomerOrders: true,
  homepageCompanySection: {
    heading: 'Building Trust Through Quality',
    subheading: 'M.A. GROUP OF COMPANIES — EXECUTIVE HERITAGE',
    description:
      'For decades, M.A. GROUP OF COMPANIES has stood as Pakistan’s premier architectural, solar energy, electrical infrastructure, and luxury home engineering partner. Every product in our showroom is sourced directly from certified manufacturers with guaranteed authenticity and nationwide Cash on Delivery.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80',
    buttonText: 'Learn About Us',
    buttonLink: 'about-us',
    secondaryButtonText: 'Build Your Solution',
    secondaryButtonLink: 'solutions',
    highlights: [
      '100% Authentic Manufacturer Direct Supply',
      'PEC & WAPDA Net-Metering Compliant Solar Systems',
      'Nationwide Cash on Delivery Across 150+ Cities',
      'Dedicated Commercial & B2B Project Engineering',
    ],
    isVisible: true,
    displayOrder: 1,
  },
};

const INITIAL_COMPANY_PAGES: CompanyPage[] = [
  {
    id: 'page-about',
    slug: 'about-us',
    title: 'About M.A. Group Of Companies',
    subtitle: 'Powering Homes · Building Infrastructure · Inspiring Modern Living Across Pakistan.',
    heroImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80',
    content:
      'Founded with an unwavering commitment to engineering excellence and uncompromising product authenticity, M.A. GROUP OF COMPANIES is one of Pakistan’s foremost multi-sector distributors. From Tier-1 solar energy infrastructure and 99.99% pure copper electrical cables to luxury European sanitaryware, built-in kitchen hobs & hoods, precision hardware, and zero-emission EV bikes, we deliver world-class engineering to homes and commercial enterprises nationwide.',
    sections: [
      {
        id: 'sec-about-1',
        heading: 'Executive Showroom & Multi-Sector Authority',
        subheading: 'Direct Manufacturer Distribution',
        content:
          'We eliminate middlemen and counterfeit risks by partnering directly with globally certified manufacturers including Inverex, Longi Solar, Schneider Electric, Pakistan Cables, Sonex, and Bosch.',
        imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1000&q=80',
        buttonText: 'Explore Collection',
        buttonLink: 'shop',
        displayOrder: 1,
      },
    ],
    buttons: [
      { id: 'btn-1', text: 'Explore Showroom', destination: 'shop', style: 'primary' },
      { id: 'btn-2', text: 'Build Your Solution', destination: 'solutions', style: 'gold' },
    ],
    displayOrder: 1,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'page-mission',
    slug: 'our-mission',
    title: 'Our Mission',
    subtitle: 'Empowering Pakistani households and industries with sustainable, certified, and accessible modern engineering.',
    heroImage: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1400&q=80',
    content:
      'Our mission at M.A. GROUP OF COMPANIES is to elevate the standard of residential, commercial, and industrial infrastructure across Pakistan by providing 100% genuine, laboratory-tested, and warranty-backed equipment with transparent pricing and doorstep Cash on Delivery.',
    sections: [
      {
        id: 'sec-mission-1',
        heading: 'Clean Energy & Safe Infrastructure for Every Home',
        content:
          'We strive to accelerate Pakistan’s transition toward clean solar power and zero-emission electric mobility while safeguarding families with pure copper electrical wiring and international-grade circuit protection.',
        displayOrder: 1,
      },
    ],
    buttons: [{ id: 'btn-m1', text: 'Build a Solar Solution', destination: 'solutions', style: 'gold' }],
    displayOrder: 2,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'page-vision',
    slug: 'our-vision',
    title: 'Our Vision',
    subtitle: 'To be Pakistan’s most trusted luxury showroom and technology ecommerce platform.',
    heroImage: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80',
    content:
      'We envision a future where every homeowner, architect, builder, and industrial enterprise in Pakistan can procure world-class solar, electrical, sanitary, kitchen, and EV equipment online with complete confidence, guided by intelligent engineering tools.',
    sections: [],
    buttons: [{ id: 'btn-v1', text: 'View Our Catalog', destination: 'shop', style: 'primary' }],
    displayOrder: 3,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'page-why-choose-us',
    slug: 'why-choose-us',
    title: 'Why Choose Us',
    subtitle: 'Uncompromising authenticity, official manufacturer warranties, and nationwide Cash on Delivery.',
    heroImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1400&q=80',
    content:
      'Choosing M.A. GROUP OF COMPANIES means choosing peace of mind. Every item shipped from our central warehouses undergoes strict serial-number verification, physical inspection, and protective packaging before dispatch.',
    sections: [
      {
        id: 'sec-why-1',
        heading: '100% Genuine & Factory Sealed',
        content:
          'Zero tolerance for counterfeit or refurbished goods. All solar inverters, panels, cables, and appliances carry verifiable manufacturer serial numbers and official warranty cards.',
        displayOrder: 1,
      },
      {
        id: 'sec-why-2',
        heading: 'Nationwide Cash on Delivery (COD)',
        content:
          'Receive your order at your doorstep in over 150 cities across Pakistan and pay in cash upon verifying parcel seals.',
        displayOrder: 2,
      },
    ],
    buttons: [{ id: 'btn-w1', text: 'Shop With Confidence', destination: 'shop', style: 'gold' }],
    displayOrder: 4,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'page-quality-assurance',
    slug: 'quality-assurance',
    title: 'Quality Assurance',
    subtitle: 'ISO, PEC, PSQCA, and IEC compliant engineering standards.',
    heroImage: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1400&q=80',
    content:
      'Our Quality Assurance protocol ensures that every solar panel, hybrid inverter, copper cable coil, sanitary fixture, and built-in kitchen appliance meets rigorous international safety and performance benchmarks.',
    sections: [],
    buttons: [{ id: 'btn-qa1', text: 'View Certified Partners', destination: 'our-manufacturing-partners', style: 'primary' }],
    displayOrder: 5,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'page-values',
    slug: 'our-values',
    title: 'Our Values',
    subtitle: 'Integrity, Precision Engineering, Customer First, and Long-Term Reliability.',
    heroImage: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80',
    content:
      'At M.A. GROUP OF COMPANIES, our corporate culture is built on transparency, honest technical advice, fair PKR pricing, and honouring every warranty commitment.',
    sections: [],
    buttons: [],
    displayOrder: 6,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'page-services',
    slug: 'our-services',
    title: 'Our Services',
    subtitle: 'End-to-end product supply, custom solution design, B2B project procurement, and technical advisory.',
    heroImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1400&q=80',
    content:
      'Beyond retail ecommerce, M.A. GROUP OF COMPANIES provides comprehensive custom solution packages, contractor BOQ quotations, solar load sizing, and nationwide site logistics.',
    sections: [],
    buttons: [
      { id: 'btn-srv1', text: 'Build Your Solution', destination: 'solutions', style: 'gold' },
      { id: 'btn-srv2', text: 'Request B2B Quote', destination: 'b2b-wholesale', style: 'primary' },
    ],
    displayOrder: 7,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'page-partners',
    slug: 'our-manufacturing-partners',
    title: 'Our Manufacturing Partners',
    subtitle: 'Trusted manufacturers and global brands we work with directly.',
    heroImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1400&q=80',
    content:
      'We maintain authorized distribution and partner agreements with industry-leading manufacturers across solar energy, electrical switchgear, pure copper cabling, luxury sanitaryware, kitchen appliances, and EV mobility.',
    sections: [],
    buttons: [{ id: 'btn-p1', text: 'Explore All Products', destination: 'shop', style: 'primary' }],
    displayOrder: 8,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'page-support',
    slug: 'customer-support',
    title: 'Customer Support',
    subtitle: 'Dedicated technical concierge, order tracking, warranty claim assistance, and installation guidance.',
    heroImage: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=1400&q=80',
    content:
      'Our engineering and client care specialists are available Monday through Saturday to assist with product selection, solar system sizing, order tracking, B2B quotations, and official warranty support.',
    sections: [],
    buttons: [
      { id: 'btn-sup1', text: 'Track Your Order', destination: 'track-order', style: 'gold' },
      { id: 'btn-sup2', text: 'Contact Us', destination: 'contact-us', style: 'primary' },
    ],
    displayOrder: 9,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'page-contact',
    slug: 'contact-us',
    title: 'Contact Us',
    subtitle: 'Connect with our corporate showrooms, B2B procurement desk, and customer care specialists.',
    heroImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80',
    content:
      'Whether you are outfitting a luxury residence, sizing a hybrid solar system, or requesting a commercial BOQ quotation, our team at M.A. GROUP OF COMPANIES is ready to assist you.',
    sections: [],
    buttons: [{ id: 'btn-c1', text: 'Request B2B Quote', destination: 'b2b-wholesale', style: 'gold' }],
    displayOrder: 10,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const INITIAL_SMART_OFFERS: SmartOffer[] = [
  {
    id: 'offer-solar-bundle',
    name: 'Executive Solar Independence Campaign',
    shortDescription: 'Save up to PKR 15,000 on Tier-1 Hybrid Inverters, Longi Hi-MO 6 Panels & Lithium Battery Banks.',
    bannerImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    offerType: 'Category Discount',
    discountPercentage: 8,
    minOrderValue: 50000,
    maxDiscount: 25000,
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2027-12-31T23:59:59Z',
    applicableProductIds: ['prod-inverex-nitrox-6kw', 'prod-longi-himo6-585w', 'prod-pylontech-us5000'],
    applicableCategoryIds: ['cat-solar'],
    applicableSubcategoryIds: [],
    couponCode: 'SOLAR2026',
    displayPriority: 1,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'offer-kitchen-luxury',
    name: 'Architectural Kitchen Hob & Hood Suite Offer',
    shortDescription: 'Upgrade your modern kitchen with tempered glass built-in hobs & T-shape chimney hoods at special showroom pricing.',
    bannerImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
    offerType: 'Bundle Offer',
    discountPercentage: 10,
    fixedDiscountAmount: 5000,
    minOrderValue: 30000,
    maxDiscount: 12000,
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2027-12-31T23:59:59Z',
    applicableProductIds: ['prod-corona-3-burner-hob', 'prod-boss-touch-chimney-hood'],
    applicableCategoryIds: ['cat-hobs', 'cat-hoods'],
    applicableSubcategoryIds: [],
    couponCode: 'WELCOMEPK',
    displayPriority: 2,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'offer-free-cod-nationwide',
    name: 'Complimentary Nationwide Express Delivery',
    shortDescription: 'Enjoy Free Cash on Delivery across Pakistan on qualifying orders of electrical, sanitary, and hardware equipment.',
    bannerImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    offerType: 'Free Delivery',
    discountPercentage: 5,
    minOrderValue: 5000,
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2027-12-31T23:59:59Z',
    applicableProductIds: [
      'prod-pak-cables-70-0076',
      'prod-schneider-mcb-63a',
      'prod-sonex-gold-basin-mixer',
      'prod-porta-one-piece-wc',
    ],
    applicableCategoryIds: ['cat-electrical', 'cat-sanitary', 'cat-hardware'],
    applicableSubcategoryIds: [],
    displayPriority: 3,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const INITIAL_SOLUTIONS: SolutionPackage[] = [
  {
    id: 'sol-solar-home',
    slug: 'solar-home-solution',
    title: 'Solar Home Solution',
    subtitle: 'Complete Hybrid Solar Power & Lithium Backup Package',
    description: 'Build a complete solar setup based on your requirements — select Tier-1 solar panels, hybrid MPPT inverter, lithium battery storage, and pure copper protection.',
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    categoryTag: 'Solar Energy',
    steps: [
      {
        id: 'step-solar-1',
        title: 'Choose Solar Panels',
        description: 'Select Tier-1 bifacial or mono PERC solar panels for your roof array.',
        isRequired: true,
        allowMultiple: false,
        productIds: ['prod-longi-himo6-585w'],
        displayOrder: 1,
      },
      {
        id: 'step-solar-2',
        title: 'Choose Inverter',
        description: 'Select an IP65 hybrid or on-grid solar inverter.',
        isRequired: true,
        allowMultiple: false,
        productIds: ['prod-inverex-nitrox-6kw'],
        displayOrder: 2,
      },
      {
        id: 'step-solar-3',
        title: 'Choose Battery',
        description: 'Add LiFePO4 lithium battery storage for night-time and load-shedding backup.',
        isRequired: false,
        allowMultiple: false,
        productIds: ['prod-pylontech-us5000'],
        displayOrder: 3,
      },
      {
        id: 'step-solar-4',
        title: 'Choose Accessories & Protection',
        description: 'Select pure copper wiring and circuit breakers for safe installation.',
        isRequired: false,
        allowMultiple: true,
        productIds: ['prod-pak-cables-70-0076', 'prod-schneider-mcb-63a'],
        displayOrder: 4,
      },
    ],
    installationCharge: 25000,
    deliveryCharge: 0,
    solutionDiscount: 15000,
    customServiceCharge: 5000,
    customServiceLabel: 'Earthing & Net-Metering Documentation Prep',
    displayOrder: 1,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'sol-kitchen-suite',
    slug: 'luxury-kitchen-solution',
    title: 'Luxury Kitchen Suite Solution',
    subtitle: 'Built-In Tempered Glass Hob + Auto-Clean Chimney Hood + Electrical Setup',
    description: 'Design your modern culinary space by pairing an Italian-style brass burner built-in hob with a high-suction gesture control range hood.',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
    categoryTag: 'Kitchen Appliances',
    steps: [
      {
        id: 'step-kit-1',
        title: 'Choose Built-In Hob',
        description: 'Select your preferred tempered glass gas hob.',
        isRequired: true,
        allowMultiple: false,
        productIds: ['prod-corona-3-burner-hob'],
        displayOrder: 1,
      },
      {
        id: 'step-kit-2',
        title: 'Choose Kitchen Range Hood',
        description: 'Select a matching suction chimney hood.',
        isRequired: true,
        allowMultiple: false,
        productIds: ['prod-boss-touch-chimney-hood'],
        displayOrder: 2,
      },
      {
        id: 'step-kit-3',
        title: 'Choose Kitchen Electrical & Lighting',
        description: 'Optional designer switches and LED panel lighting.',
        isRequired: false,
        allowMultiple: true,
        productIds: ['prod-philips-led-panel-18w', 'prod-klipsal-piano-switch-socket'],
        displayOrder: 3,
      },
    ],
    installationCharge: 4500,
    deliveryCharge: 0,
    solutionDiscount: 4000,
    customServiceCharge: 0,
    displayOrder: 2,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'sol-bathroom-suite',
    slug: 'architectural-bathroom-solution',
    title: 'Architectural Bathroom Solution',
    subtitle: 'Ceramic One-Piece Toilet + Brushed Gold Basin Mixer + Walk-in Shower Suite',
    description: 'Curate a hotel-grade luxury bathroom with European ceramic sanitaryware and PVD brushed gold brass faucets.',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    categoryTag: 'Sanitary & Bath',
    steps: [
      {
        id: 'step-bath-1',
        title: 'Choose Sanitary Commode / Basin',
        description: 'Select rimless ceramic sanitaryware.',
        isRequired: true,
        allowMultiple: false,
        productIds: ['prod-porta-one-piece-wc'],
        displayOrder: 1,
      },
      {
        id: 'step-bath-2',
        title: 'Choose Faucet & Mixer',
        description: 'Select solid brass basin mixer with ceramic cartridge.',
        isRequired: true,
        allowMultiple: false,
        productIds: ['prod-sonex-gold-basin-mixer'],
        displayOrder: 2,
      },
      {
        id: 'step-bath-3',
        title: 'Choose Bathroom Lighting & Accessories',
        description: 'Add moisture-safe ceiling lighting and installation tools.',
        isRequired: false,
        allowMultiple: true,
        productIds: ['prod-philips-led-panel-18w', 'prod-ingco-cordless-drill-20v'],
        displayOrder: 3,
      },
    ],
    installationCharge: 3500,
    deliveryCharge: 0,
    solutionDiscount: 3000,
    customServiceCharge: 0,
    displayOrder: 3,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'sol-ev-mobility',
    slug: 'ev-mobility-charging-solution',
    title: 'EV Bike & Home Charging Solution',
    subtitle: 'Electric Motorbike + Dedicated Home Charging Circuit Protection',
    description: 'Switch to zero-emission commuting with our flagship lithium electric motorbike paired with pure copper home charging protection.',
    imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
    categoryTag: 'EV Mobility',
    steps: [
      {
        id: 'step-ev-1',
        title: 'Choose EV Bike',
        description: 'Select your electric motorbike.',
        isRequired: true,
        allowMultiple: false,
        productIds: ['prod-jolta-je-70l-ev-bike'],
        displayOrder: 1,
      },
      {
        id: 'step-ev-2',
        title: 'Choose Home Charging Protection & Wiring',
        description: 'Recommended circuit breaker and pure copper wiring for safe garage charging.',
        isRequired: false,
        allowMultiple: true,
        productIds: ['prod-schneider-mcb-63a', 'prod-pak-cables-70-0076', 'prod-klipsal-piano-switch-socket'],
        displayOrder: 2,
      },
    ],
    installationCharge: 2500,
    deliveryCharge: 0,
    solutionDiscount: 5000,
    customServiceCharge: 0,
    displayOrder: 4,
    isVisible: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    productId: 'prod-inverex-nitrox-6kw',
    customerName: 'Engr. Tariq Mahmood',
    rating: 5,
    title: 'Outstanding inverter & authentic Inverex packaging',
    comment: 'Received in Lahore via COD within 2 days. The dual MPPT works flawlessly with my 12 Longi bifacial panels. Genuine product with warranty card properly stamped.',
    isVerifiedPurchase: true,
    status: 'approved',
    createdAt: '2026-09-20T10:15:00Z',
  },
  {
    id: 'rev-2',
    productId: 'prod-pak-cables-70-0076',
    customerName: 'Haji Muhammad Aslam',
    rating: 5,
    title: '100% pure copper, tested by our electrician',
    comment: 'Used for our new house wiring in Faisalabad. Genuine Pakistan Cables coil with clear hologram seal. Highly recommended supplier.',
    isVerifiedPurchase: true,
    status: 'approved',
    createdAt: '2026-09-22T14:30:00Z',
  },
  {
    id: 'rev-3',
    productId: 'prod-corona-3-burner-hob',
    customerName: 'Dr. Ayesha Siddiqui',
    rating: 5,
    title: 'Heavy brass burners and great aesthetic',
    comment: 'The glass finish is sleek and so easy to wipe down. Very sturdy for heavy pressure cookers. Delivered safely to Karachi without any scratch.',
    isVerifiedPurchase: true,
    status: 'approved',
    createdAt: '2026-09-24T09:00:00Z',
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'MAG-9214',
    customer: {
      fullName: 'Kamran Ali Shah',
      phone: '+92 301 8844211',
      email: 'kamran.shah@example.com',
      addressLine: 'House 45, Street 8, Sector F-8/2',
      city: 'Islamabad',
      province: 'Federal Capital',
      postalCode: '44000',
      landmark: 'Near F-8 Markaz',
    },
    items: [
      {
        productId: 'prod-corona-3-burner-hob',
        productName: 'Corona Imperial 3-Burner Tempered Glass Built-in Gas Hob',
        productImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
        sku: 'CRN-HOB-3B',
        price: 31900,
        quantity: 1,
        total: 31900,
      },
    ],
    subtotal: 31900,
    discount: 1000,
    shippingFee: 0,
    grandTotal: 30900,
    status: 'Shipped',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'COD Pending',
    couponCode: 'WELCOMEPK',
    trackingNumber: 'TCS-88912304',
    courierName: 'TCS Express Pakistan',
    internalNotes: 'Dispatched via TCS Priority Express. Courier instructions: collect PKR 30,900 COD.',
    timeline: [
      { status: 'Pending', timestamp: '2026-09-25T11:00:00Z', note: 'Order placed by customer via Cash on Delivery' },
      { status: 'Confirmed', timestamp: '2026-09-25T11:45:00Z', note: 'Call verification confirmed with Kamran Ali' },
      { status: 'Processing', timestamp: '2026-09-25T14:00:00Z', note: 'Item picked from Lahore Central Warehouse' },
      { status: 'Packed', timestamp: '2026-09-25T16:30:00Z', note: 'Wooden crate packing secured for glass hob' },
      { status: 'Shipped', timestamp: '2026-09-26T09:15:00Z', note: 'Dispatched via TCS Express CN: TCS-88912304' },
    ],
    createdAt: '2026-09-25T11:00:00Z',
    updatedAt: '2026-09-26T09:15:00Z',
  },
];

class DatabaseService {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
    // Initialize PostgreSQL connection asynchronously if DATABASE_URL is present
    this.initPostgres().catch((err: any) => {
      console.log('ℹ️ PostgreSQL initialization notice:', err?.message || err);
    });
  }

  private async initPostgres(): Promise<void> {
    const connected = await postgresManager.init();
    if (connected) {
      console.log('🔄 Checking PostgreSQL state for M.A. GROUP OF COMPANIES...');
      const pgData = await postgresManager.loadFromPostgres();
      if (pgData && pgData.products && pgData.products.length > 0) {
        console.log(`📦 Loaded ${pgData.products.length} products from PostgreSQL database.`);
        this.data = {
          ...this.data,
          ...pgData,
        };
        this.saveToFile(this.data);
      } else {
        console.log('🚀 Seeding initial store data into PostgreSQL...');
        await postgresManager.syncSnapshot(this.data);
        for (const p of this.data.products) {
          await postgresManager.saveProduct(p);
        }
        for (const o of this.data.orders) {
          await postgresManager.saveOrder(o);
        }
        for (const r of this.data.reviews) {
          await postgresManager.saveReview(r);
        }
        console.log('✅ PostgreSQL seeding complete.');
      }
    }
  }

  private loadData(): DatabaseSchema {
    let parsed: DatabaseSchema | null = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        parsed = JSON.parse(content);
      }
    } catch (e) {
      console.warn('Could not read existing store.json, creating initial store.', e);
    }

    if (parsed) {
      if (!parsed.inventoryLedger || parsed.inventoryLedger.length === 0) {
        parsed.inventoryLedger = parsed.products.map((p) => ({
          id: 'ledg-' + p.id,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          change: p.stock,
          previousStock: 0,
          newStock: p.stock,
          reason: 'Initial Stock' as InventoryChangeReason,
          referenceId: 'OPENING-STOCK',
          performedBy: 'Warehouse Inventory Team',
          timestamp: p.createdAt || new Date().toISOString(),
          notes: 'Opening physical stock audit verified at Lahore central warehouse.',
        }));
      }
      if (!parsed.customerNotes) {
        parsed.customerNotes = {};
      }
      if (!parsed.companyPages || parsed.companyPages.length === 0) {
        parsed.companyPages = INITIAL_COMPANY_PAGES;
      }
      if (!parsed.smartOffers || parsed.smartOffers.length === 0) {
        parsed.smartOffers = INITIAL_SMART_OFFERS;
      }
      if (!parsed.solutions || parsed.solutions.length === 0) {
        parsed.solutions = INITIAL_SOLUTIONS;
      }
      if (!parsed.settings.homepageCompanySection) {
        parsed.settings.homepageCompanySection = INITIAL_SETTINGS.homepageCompanySection;
      }
      // Ensure every existing B2B inquiry has a permanent unique quoteTrackingCode
      if (Array.isArray(parsed.inquiries)) {
        const usedCodes = new Set<string>();
        parsed.inquiries.forEach((inq, index) => {
          const existingCode = inq.quoteTrackingCode || inq.quote_tracking_code;
          if (existingCode && !usedCodes.has(existingCode)) {
            inq.quoteTrackingCode = existingCode;
            inq.quote_tracking_code = existingCode;
            usedCodes.add(existingCode);
          } else {
            const d = inq.createdAt ? new Date(inq.createdAt) : new Date();
            const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            let seq = index + 1;
            let candidate = `MA-QT-${datePart}-${String(seq).padStart(4, '0')}`;
            while (usedCodes.has(candidate)) {
              seq++;
              candidate = `MA-QT-${datePart}-${String(seq).padStart(4, '0')}`;
            }
            inq.quoteTrackingCode = candidate;
            inq.quote_tracking_code = candidate;
            usedCodes.add(candidate);
          }
        });
      }
      for (const p of parsed.products) {
        if (!p.costPrice) {
          p.costPrice = Math.round(p.price * 0.75);
        }
      }
      return parsed;
    }

    const defaultData: DatabaseSchema = {
      products: INITIAL_PRODUCTS.map((p) => ({
        ...p,
        costPrice: p.costPrice || Math.round(p.price * 0.75),
      })),
      categories: INITIAL_CATEGORIES,
      brands: INITIAL_BRANDS,
      orders: INITIAL_ORDERS,
      reviews: INITIAL_REVIEWS,
      banners: INITIAL_BANNERS,
      coupons: INITIAL_COUPONS,
      settings: INITIAL_SETTINGS,
      inquiries: [
        {
          id: 'inq-1001',
          quoteTrackingCode: 'MA-QT-20261005-0001',
          quote_tracking_code: 'MA-QT-20261005-0001',
          quoteType: 'b2b',
          companyName: 'Al-Madina Engineering & Developers',
          businessName: 'Al-Madina Engineering & Developers',
          contactPerson: 'Engr. Salman Tariq',
          customerName: 'Engr. Salman Tariq',
          phone: '+92 300 4455891',
          email: 'procurement@almadinadev.pk',
          address: 'Plot 18, Commercial Area, DHA Phase 6',
          city: 'Lahore',
          categoryInterest: 'Solar Projects (EPC / On-Grid)',
          estimatedBudget: 'PKR 1,200,000',
          projectDetails: 'Complete 6kW Hybrid Solar System with 10 Longi 585W panels and Pylontech lithium backup for model villa.',
          customerMessage: 'Please include installation and net-metering preparation charges.',
          items: [
            {
              productId: 'prod-inverex-nitrox-6kw',
              productName: 'Inverex Nitrox 6kW Hybrid Solar Inverter IP65 Dual MPPT',
              sku: 'INV-NTX-6KW',
              quantity: 1,
              unitPrice: 285000,
              total: 285000,
            },
            {
              productId: 'prod-longi-himo6-585w',
              productName: 'Longi Hi-MO 6 Explorer 585W Mono PERC Half-Cell Solar Panel',
              sku: 'LNG-585-HM6',
              quantity: 10,
              unitPrice: 28900,
              total: 289000,
            },
            {
              productId: 'prod-pylontech-us5000',
              productName: 'Pylontech US5000 4.8kWh 48V LiFePO4 Lithium Solar Battery',
              sku: 'PYL-US5000-48V',
              quantity: 1,
              unitPrice: 365000,
              total: 365000,
            },
          ],
          subtotal: 939000,
          discount: 19000,
          deliveryCharges: 0,
          installationCharges: 25000,
          total: 945000,
          adminQuotationAmount: 945000,
          adminNotes: 'Volume discount applied on 10 Longi panels. Ready for immediate dispatch from Lahore hub.',
          validUntil: '2026-10-20',
          paymentTerms: 'Cash on Delivery / Corporate Crossed Cheque upon Site Delivery',
          termsAndConditions: 'Official 5-Year Inverex & 10-Year Pylontech Manufacturer Warranties included.',
          status: 'Quotation Sent',
          createdAt: '2026-10-01T10:30:00Z',
          updatedAt: '2026-10-02T14:15:00Z',
          quotedAt: '2026-10-02T14:15:00Z',
        },
      ],
      companyPages: INITIAL_COMPANY_PAGES,
      smartOffers: INITIAL_SMART_OFFERS,
      solutions: INITIAL_SOLUTIONS,
      auditLogs: [
        {
          id: 'log-init',
          action: 'SYSTEM_INIT',
          performedBy: 'System',
          details: 'Initialized M.A. GROUP OF COMPANIES database store with catalog items and settings.',
          timestamp: new Date().toISOString(),
        },
      ],
      users: [],
      inventoryLedger: INITIAL_PRODUCTS.map((p) => ({
        id: 'ledg-' + p.id,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        change: p.stock,
        previousStock: 0,
        newStock: p.stock,
        reason: 'Initial Stock' as InventoryChangeReason,
        referenceId: 'OPENING-STOCK',
        performedBy: 'Warehouse Inventory Team',
        timestamp: p.createdAt || new Date().toISOString(),
        notes: 'Opening physical stock audit verified at Lahore central warehouse.',
      })),
      customerNotes: {},
    };

    this.saveToFile(defaultData);
    return defaultData;
  }

  private saveToFile(data: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist store.json to disk', err);
    }
  }

  private saveData(data: DatabaseSchema): void {
    this.saveToFile(data);
    postgresManager.syncSnapshot(data).catch(() => {});
  }

  // --- Products ---
  public getProducts(): Product[] {
    return this.data.products;
  }

  public syncProducts(products: Product[]): void {
    if (Array.isArray(products)) {
      const seen = new Map<string, Product>();
      for (const p of products) {
        if (p && p.id && !seen.has(p.id)) {
          seen.set(p.id, p);
        }
      }
      this.data.products = Array.from(seen.values());
      this.saveToFile(this.data);
    }
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id || p.slug === id);
  }

  public createProduct(product: Product): Product {
    const existingIdx = this.data.products.findIndex((p) => p.id === product.id);
    if (existingIdx > -1) {
      this.data.products[existingIdx] = product;
    } else {
      this.data.products.unshift(product);
    }
    this.saveData(this.data);
    postgresManager.saveProduct(product).catch(() => {});
    return product;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = {
      ...this.data.products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(this.data);
    postgresManager.saveProduct(this.data.products[idx]).catch(() => {});
    return this.data.products[idx];
  }

  public deleteProduct(id: string): boolean {
    const prevLen = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    if (this.data.products.length !== prevLen) {
      this.saveData(this.data);
      postgresManager.deleteProduct(id).catch(() => {});
      return true;
    }
    return false;
  }

  // --- Categories ---
  public getCategories(): Category[] {
    return this.data.categories;
  }

  public syncCategories(categories: Category[]): void {
    if (Array.isArray(categories)) {
      const seen = new Map<string, Category>();
      for (const c of categories) {
        if (c && c.id && !seen.has(c.id)) {
          seen.set(c.id, c);
        }
      }
      this.data.categories = Array.from(seen.values());
      this.saveToFile(this.data);
    }
  }

  public getCategoryById(id: string): Category | undefined {
    return this.data.categories.find((c) => c.id === id || c.slug === id);
  }

  public createCategory(category: Category): Category {
    const existingIdx = this.data.categories.findIndex((c) => c.id === category.id);
    if (existingIdx > -1) {
      this.data.categories[existingIdx] = category;
    } else {
      this.data.categories.push(category);
    }
    this.saveData(this.data);
    return category;
  }

  public updateCategory(id: string, updates: Partial<Category>): Category | null {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.saveData(this.data);
    return this.data.categories[idx];
  }

  public deleteCategory(id: string): boolean {
    const prev = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    if (this.data.categories.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Brands / Certified Manufacturing Partners ---
  public getBrands(): Brand[] {
    return [...(this.data.brands || [])].sort(
      (a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)
    );
  }

  public syncBrands(brands: Brand[]): void {
    if (Array.isArray(brands)) {
      const seen = new Map<string, Brand>();
      for (const b of brands) {
        if (b && b.id && !seen.has(b.id)) {
          seen.set(b.id, {
            ...b,
            isVisible: b.isVisible !== false,
            displayOrder: Number(b.displayOrder ?? 1),
          });
        }
      }
      this.data.brands = Array.from(seen.values()).sort(
        (a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)
      );
      this.saveToFile(this.data);
    }
  }

  public getBrandById(id: string): Brand | undefined {
    return this.data.brands.find((b) => b.id === id || b.slug === id);
  }

  public createBrand(brand: Brand): Brand {
    const normalized: Brand = {
      ...brand,
      isVisible: brand.isVisible !== false,
      displayOrder: Number(brand.displayOrder ?? this.data.brands.length + 1),
      createdAt: brand.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const existingIdx = this.data.brands.findIndex((b) => b.id === normalized.id);
    if (existingIdx > -1) {
      this.data.brands[existingIdx] = normalized;
    } else {
      this.data.brands.push(normalized);
    }
    this.saveData(this.data);
    return normalized;
  }

  public updateBrand(id: string, updates: Partial<Brand>): Brand | null {
    const idx = this.data.brands.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.data.brands[idx] = {
      ...this.data.brands[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(this.data);
    return this.data.brands[idx];
  }

  public deleteBrand(id: string): boolean {
    const prev = this.data.brands.length;
    this.data.brands = this.data.brands.filter((b) => b.id !== id);
    if (this.data.brands.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Orders ---
  public getOrders(): Order[] {
    return this.data.orders;
  }

  public syncOrders(orders: Order[]): void {
    if (Array.isArray(orders)) {
      const seenIds = new Set<string>();
      const seenOrderNumbers = new Set<string>();
      const deduped: Order[] = [];
      for (const o of orders) {
        if (!o || !o.id) continue;
        const normNum = (o.orderNumber || o.id).toLowerCase();
        if (seenIds.has(o.id) || seenOrderNumbers.has(normNum)) continue;
        seenIds.add(o.id);
        seenOrderNumbers.add(normNum);
        deduped.push(o);
      }
      this.data.orders = deduped;
      this.saveToFile(this.data);
    }
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find(
      (o) => o.id === id || o.orderNumber.toLowerCase() === id.toLowerCase()
    );
  }

  public evaluateOrderRisk(order: Partial<Order>): { riskLevel: OrderRiskLevel; riskReasons: string[] } {
    const reasons: string[] = [];
    const phone = order.customer?.phone ? order.customer.phone.replace(/[^0-9]/g, '') : '';
    const total = order.grandTotal || 0;

    // 1. High COD Value Check (PKR 150,000+ is high risk for Cash on Delivery)
    if (total >= 150000) {
      reasons.push(`High-value COD order (Rs. ${total.toLocaleString()}). Requires phone verification prior to dispatch.`);
    }

    if (phone) {
      const customerOrders = this.data.orders.filter(
        (o) => o.customer?.phone && o.customer.phone.replace(/[^0-9]/g, '') === phone
      );

      // 2. Cancellation frequency check
      const cancelledCount = customerOrders.filter((o) => o.status === 'Cancelled').length;
      if (cancelledCount >= 2) {
        reasons.push(`Customer phone has ${cancelledCount} previously cancelled COD orders on record.`);
      }

      // 3. Delivery failures / returns check
      const failedDeliveries = customerOrders.filter((o) => o.status === 'Failed Delivery' || o.status === 'Returned').length;
      if (failedDeliveries >= 1) {
        reasons.push(`Customer phone has ${failedDeliveries} previous failed or returned deliveries.`);
      }

      // 4. Order velocity check: multiple pending orders placed recently
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentPending = customerOrders.filter(
        (o) => new Date(o.createdAt).getTime() > oneDayAgo && o.status === 'Pending'
      );
      if (recentPending.length >= 3) {
        reasons.push(`High order velocity: ${recentPending.length} unconfirmed pending orders from this phone number in last 24h.`);
      }
    }

    let riskLevel: OrderRiskLevel = 'NORMAL';
    if (reasons.length > 0) {
      riskLevel = 'REVIEW REQUIRED';
    } else if (phone) {
      const deliveredCount = this.data.orders.filter(
        (o) => o.customer?.phone && o.customer.phone.replace(/[^0-9]/g, '') === phone && o.status === 'Delivered'
      ).length;
      if (deliveredCount >= 1) {
        riskLevel = 'LOW RISK';
      }
    }

    return { riskLevel, riskReasons: reasons };
  }

  public createOrder(order: Order): Order {
    // Automatic Risk Evaluation
    if (!order.riskLevel) {
      const evalResult = this.evaluateOrderRisk(order);
      order.riskLevel = evalResult.riskLevel;
      order.riskReasons = evalResult.riskReasons;
      order.isRiskReviewed = false;
    }

    const existingIdx = this.data.orders.findIndex(
      (o) => o.id === order.id || (order.orderNumber && o.orderNumber.toLowerCase() === order.orderNumber.toLowerCase())
    );
    if (existingIdx > -1) {
      this.data.orders[existingIdx] = order;
      this.saveData(this.data);
      postgresManager.saveOrder(order).catch(() => {});
      return order;
    }

    this.data.orders.unshift(order);
    this.ensureInventoryLedger();

    // Deduct stock and record in ledger
    for (const item of order.items) {
      const p = this.data.products.find((prod) => prod.id === item.productId);
      if (p) {
        const previousStock = p.stock;
        p.stock = Math.max(0, p.stock - item.quantity);
        postgresManager.saveProduct(p).catch(() => {});

        const ledgerEntry: InventoryLedgerEntry = {
          id: 'ledg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          change: -item.quantity,
          previousStock,
          newStock: p.stock,
          reason: 'Order Placed',
          referenceId: order.orderNumber,
          performedBy: order.customer.fullName,
          timestamp: new Date().toISOString(),
          notes: `Deducted ${item.quantity} units for COD order ${order.orderNumber}`,
        };
        this.data.inventoryLedger!.unshift(ledgerEntry);
      }
    }

    this.saveData(this.data);
    postgresManager.saveOrder(order).catch(() => {});
    return order;
  }

  public updateOrder(id: string, updates: Partial<Order>): Order | null {
    const idx = this.data.orders.findIndex((o) => o.id === id || o.orderNumber === id);
    if (idx === -1) return null;
    const currentOrder = this.data.orders[idx];

    // State transition guard: prevent invalid regressions (e.g. Delivered -> Pending)
    if (currentOrder.status === 'Delivered' && updates.status === 'Pending') {
      throw new Error('Invalid status transition: A delivered order cannot be reverted to Pending status.');
    }

    // If order was newly Cancelled or Returned, safely restore stock and record in ledger
    const isNewCancellation = updates.status === 'Cancelled' && currentOrder.status !== 'Cancelled';
    const isNewReturn = updates.status === 'Returned' && currentOrder.status !== 'Returned';

    if (isNewCancellation || isNewReturn) {
      this.ensureInventoryLedger();
      const reason: InventoryChangeReason = isNewCancellation ? 'Order Cancelled' : 'Order Returned';
      for (const item of currentOrder.items) {
        const p = this.data.products.find((prod) => prod.id === item.productId);
        if (p) {
          const previousStock = p.stock;
          p.stock += item.quantity;
          postgresManager.saveProduct(p).catch(() => {});

          const ledgerEntry: InventoryLedgerEntry = {
            id: 'ledg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            change: item.quantity,
            previousStock,
            newStock: p.stock,
            reason,
            referenceId: currentOrder.orderNumber,
            performedBy: 'System Inventory Engine',
            timestamp: new Date().toISOString(),
            notes: `Restored ${item.quantity} units due to ${reason.toLowerCase()} on order ${currentOrder.orderNumber}`,
          };
          this.data.inventoryLedger!.unshift(ledgerEntry);
        }
      }
    }

    this.data.orders[idx] = {
      ...this.data.orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(this.data);
    postgresManager.saveOrder(this.data.orders[idx]).catch(() => {});
    return this.data.orders[idx];
  }

  public markRiskReviewed(orderId: string, reviewedBy: string): Order | null {
    const idx = this.data.orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
    if (idx === -1) return null;
    const order = this.data.orders[idx];
    order.isRiskReviewed = true;
    order.riskLevel = 'LOW RISK';
    order.timeline.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      note: `COD Risk manually verified and approved by ${reviewedBy}.`,
    });
    order.updatedAt = new Date().toISOString();
    this.saveData(this.data);
    this.logAction(
      'RISK_REVIEW_APPROVED',
      reviewedBy,
      `Manually cleared and approved COD risk review for order ${order.orderNumber}`,
      undefined,
      order.orderNumber
    );
    return order;
  }

  // --- Inventory Engine & Ledger ---
  public ensureInventoryLedger(): void {
    if (!this.data.inventoryLedger) {
      this.data.inventoryLedger = [];
    }
  }

  public getInventoryLedger(productId?: string): InventoryLedgerEntry[] {
    this.ensureInventoryLedger();
    if (productId) {
      return (this.data.inventoryLedger || []).filter((l) => l.productId === productId);
    }
    return (this.data.inventoryLedger || []).slice(0, 500);
  }

  public adjustStock(
    productId: string,
    change: number,
    reason: InventoryChangeReason,
    referenceId: string = 'MANUAL-ADJ',
    performedBy: string = 'Staff Administrator',
    notes: string = ''
  ): { success: boolean; newStock: number; error?: string } {
    const p = this.data.products.find((prod) => prod.id === productId);
    if (!p) {
      return { success: false, newStock: 0, error: 'Product not found.' };
    }

    const previousStock = p.stock;
    const targetStock = previousStock + change;
    if (targetStock < 0) {
      return {
        success: false,
        newStock: previousStock,
        error: `Cannot decrease stock by ${Math.abs(change)}. Current available stock is only ${previousStock}. Negative inventory is prohibited.`,
      };
    }

    p.stock = targetStock;
    p.updatedAt = new Date().toISOString();

    this.ensureInventoryLedger();
    const entry: InventoryLedgerEntry = {
      id: 'ledg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      change,
      previousStock,
      newStock: targetStock,
      reason,
      referenceId,
      performedBy,
      timestamp: new Date().toISOString(),
      notes: notes || `Stock updated from ${previousStock} to ${targetStock}`,
    };

    this.data.inventoryLedger!.unshift(entry);
    if (this.data.inventoryLedger!.length > 1000) {
      this.data.inventoryLedger = this.data.inventoryLedger!.slice(0, 1000);
    }

    this.saveData(this.data);
    postgresManager.saveProduct(p).catch(() => {});

    this.logAction(
      'STOCK_ADJUSTMENT',
      performedBy,
      `Adjusted stock for ${p.name} (${p.sku}): ${change > 0 ? '+' : ''}${change} (Now: ${targetStock}). Reason: ${reason}`,
      undefined,
      p.sku,
      { productId: p.id, change, previousStock, newStock: targetStock, reason, referenceId }
    );

    return { success: true, newStock: targetStock };
  }

  // --- Customer Management & Segmentation ---
  public upsertRegisteredCustomer(account: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    savedAddresses?: any[];
    accountStatus?: 'Active' | 'Disabled';
    createdAt?: string;
  }): User {
    if (!this.data.users) {
      this.data.users = [];
    }
    const idx = this.data.users.findIndex(
      (u) => u.id === account.id || (account.email && u.email.toLowerCase() === account.email.toLowerCase())
    );
    const userObj: User = {
      id: account.id,
      fullName: account.fullName,
      email: account.email,
      phone: account.phone || '',
      role: 'customer',
      savedAddresses: account.savedAddresses || [],
      accountStatus: account.accountStatus || 'Active',
      createdAt: account.createdAt || new Date().toISOString(),
    };
    if (idx > -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...userObj };
    } else {
      this.data.users.unshift(userObj);
    }
    this.saveData(this.data);
    return userObj;
  }

  public getCustomers(): CustomerProfile[] {
    const orderList = this.data.orders;
    const customerMap = new Map<string, CustomerProfile>();
    const notesMap = this.data.customerNotes || {};
    const registeredUsers = this.data.users || [];

    // First seed registered customer accounts
    for (const u of registeredUsers) {
      if (u.role !== 'customer') continue;
      const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');
      const key = cleanPhone || u.email.toLowerCase();
      customerMap.set(key, {
        id: u.id,
        phone: u.phone || 'N/A',
        fullName: u.fullName,
        email: u.email,
        city: u.savedAddresses?.[0]?.city || 'Pakistan',
        addresses: (u.savedAddresses || []).map((a) => a.addressLine).filter(Boolean),
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        failedDeliveries: 0,
        totalSpend: 0,
        averageOrderValue: 0,
        firstOrderDate: u.createdAt,
        lastOrderDate: u.createdAt,
        registrationDate: u.createdAt,
        accountStatus: u.accountStatus || 'Active',
        segment: 'New',
        internalNotes: notesMap[key] || notesMap[u.phone] || '',
        riskScore: 'LOW RISK',
      });
    }

    for (const o of orderList) {
      if (!o.customer || (!o.customer.phone && !o.customer.email)) continue;
      const phone = (o.customer.phone || '').trim();
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      let key = cleanPhone || (o.customer.email || '').toLowerCase() || phone;

      // Also match by email if registered customer used same email
      if (!customerMap.has(key) && o.customer.email) {
        const emailLower = o.customer.email.toLowerCase();
        for (const [k, prof] of customerMap.entries()) {
          if (prof.email && prof.email.toLowerCase() === emailLower) {
            key = k;
            break;
          }
        }
      }

      const existing = customerMap.get(key);
      const orderDate = o.createdAt;
      const isDelivered = o.status === 'Delivered';
      const isCancelled = o.status === 'Cancelled';
      const isFailed = o.status === 'Failed Delivery' || o.status === 'Returned';
      const spend = (!isCancelled && o.status !== 'Returned') ? o.grandTotal : 0;

      if (!existing) {
        customerMap.set(key, {
          phone: o.customer.phone,
          fullName: o.customer.fullName,
          email: o.customer.email,
          city: o.customer.city,
          addresses: [o.customer.addressLine].filter(Boolean),
          totalOrders: 1,
          deliveredOrders: isDelivered ? 1 : 0,
          cancelledOrders: isCancelled ? 1 : 0,
          failedDeliveries: isFailed ? 1 : 0,
          totalSpend: spend,
          averageOrderValue: spend,
          firstOrderDate: orderDate,
          lastOrderDate: orderDate,
          registrationDate: orderDate,
          accountStatus: 'Guest',
          segment: 'New',
          internalNotes: notesMap[key] || notesMap[phone] || '',
          riskScore: o.riskLevel || 'NORMAL',
        });
      } else {
        existing.totalOrders += 1;
        if (isDelivered) existing.deliveredOrders += 1;
        if (isCancelled) existing.cancelledOrders += 1;
        if (isFailed) existing.failedDeliveries += 1;
        existing.totalSpend += spend;
        existing.averageOrderValue = Math.round(existing.totalSpend / Math.max(1, existing.totalOrders));
        if (!existing.email && o.customer.email) existing.email = o.customer.email;
        if ((!existing.phone || existing.phone === 'N/A') && o.customer.phone) existing.phone = o.customer.phone;

        if (new Date(orderDate) < new Date(existing.firstOrderDate)) {
          existing.firstOrderDate = orderDate;
        }
        if (new Date(orderDate) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = orderDate;
          if (!existing.fullName) existing.fullName = o.customer.fullName;
          if (!existing.city || existing.city === 'Pakistan') existing.city = o.customer.city;
        }
        if (o.customer.addressLine && !existing.addresses.includes(o.customer.addressLine)) {
          existing.addresses.push(o.customer.addressLine);
        }
      }
    }

    const now = Date.now();
    const customers = Array.from(customerMap.values()).map((c) => {
      const daysSinceLastOrder = (now - new Date(c.lastOrderDate).getTime()) / (24 * 60 * 60 * 1000);

      if (c.totalSpend >= 100000) {
        c.segment = 'High-Value';
      } else if (c.totalOrders >= 4) {
        c.segment = 'Frequent';
      } else if (daysSinceLastOrder > 90) {
        c.segment = 'Inactive';
      } else if (c.totalOrders >= 2) {
        c.segment = 'Returning';
      } else {
        c.segment = 'New';
      }

      if (c.cancelledOrders >= 2 || c.failedDeliveries >= 1) {
        c.riskScore = 'REVIEW REQUIRED';
      } else if (c.deliveredOrders >= 2 && c.cancelledOrders === 0) {
        c.riskScore = 'LOW RISK';
      } else {
        c.riskScore = 'NORMAL';
      }

      return c;
    });

    return customers.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());
  }

  public updateCustomerNote(phone: string, notes: string, staffName: string): boolean {
    if (!this.data.customerNotes) {
      this.data.customerNotes = {};
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '') || phone;
    this.data.customerNotes[cleanPhone] = notes;
    this.saveData(this.data);
    this.logAction(
      'CUSTOMER_NOTE_UPDATED',
      staffName,
      `Updated internal staff note for customer ${phone}`,
      undefined,
      phone
    );
    return true;
  }

  // --- Advanced Analytics & Profit Engine ---
  public getAdvancedAnalytics(range: string = 'month', startDateParam?: string, endDateParam?: string) {
    const orders = this.data.orders;
    const products = this.data.products;
    const categories = this.data.categories;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;
    const prevMonthStart = todayStart - 60 * 24 * 60 * 60 * 1000;
    const threeMonthsStart = todayStart - 90 * 24 * 60 * 60 * 1000;
    const sixMonthsStart = todayStart - 180 * 24 * 60 * 60 * 1000;
    const yearStart = todayStart - 365 * 24 * 60 * 60 * 1000;

    const filterPeriod = (start: number, end: number) => {
      return orders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= start && t <= end && o.status !== 'Cancelled';
      });
    };

    const todayOrders = filterPeriod(todayStart, Date.now());
    const yesterdayOrders = filterPeriod(yesterdayStart, todayStart - 1);
    const weekOrders = filterPeriod(weekStart, Date.now());
    const monthOrders = filterPeriod(monthStart, Date.now());
    const prevMonthOrders = filterPeriod(prevMonthStart, monthStart - 1);
    const threeMonthsOrders = filterPeriod(threeMonthsStart, Date.now());
    const sixMonthsOrders = filterPeriod(sixMonthsStart, Date.now());
    const yearOrders = filterPeriod(yearStart, Date.now());

    let selectedOrders = monthOrders;
    if (range === 'today') selectedOrders = todayOrders;
    else if (range === 'yesterday') selectedOrders = yesterdayOrders;
    else if (range === '7days' || range === 'week') selectedOrders = weekOrders;
    else if (range === '30days' || range === 'month') selectedOrders = monthOrders;
    else if (range === 'previousMonth') selectedOrders = prevMonthOrders;
    else if (range === '3months') selectedOrders = threeMonthsOrders;
    else if (range === '6months') selectedOrders = sixMonthsOrders;
    else if (range === '1year' || range === 'year') selectedOrders = yearOrders;
    else if (range === 'custom' && startDateParam) {
      const s = new Date(startDateParam).getTime();
      const e = endDateParam ? new Date(endDateParam).getTime() + 86399999 : Date.now();
      selectedOrders = filterPeriod(s, e);
    }

    const sumRevenue = (list: Order[]) => list.reduce((sum, o) => sum + o.grandTotal, 0);
    const validAllOrders = orders.filter((o) => o.status !== 'Cancelled');
    const totalLifetimeRevenue = sumRevenue(validAllOrders);
    const selectedPeriodRevenue = sumRevenue(selectedOrders);
    const averageOrderValue =
      selectedOrders.length > 0
        ? Math.round(selectedPeriodRevenue / selectedOrders.length)
        : validAllOrders.length > 0
        ? Math.round(totalLifetimeRevenue / validAllOrders.length)
        : 0;

    // Best selling products calculation
    const productSalesMap = new Map<
      string,
      {
        product: Product;
        unitsSold: number;
        revenue: number;
        views: number;
        searches: number;
        cartAdds: number;
      }
    >();

    for (const p of products) {
      // Deterministic engagement metrics derived from reviews, ratings & featured flags + live orders
      const baseViews = (p.reviewCount || 5) * 14 + (p.isFeatured ? 120 : 45) + (p.isBestSeller ? 180 : 20);
      const baseSearches = (p.reviewCount || 3) * 6 + (p.isBestSeller ? 65 : 18);
      const baseCartAdds = (p.reviewCount || 2) * 3 + (p.isFeatured ? 22 : 8);
      productSalesMap.set(p.id, {
        product: p,
        unitsSold: 0,
        revenue: 0,
        views: baseViews,
        searches: baseSearches,
        cartAdds: baseCartAdds,
      });
    }

    for (const o of validAllOrders) {
      for (const item of o.items) {
        const entry = productSalesMap.get(item.productId);
        if (entry) {
          entry.unitsSold += item.quantity;
          entry.revenue += item.total;
          entry.views += item.quantity * 12;
          entry.cartAdds += item.quantity * 2;
        }
      }
    }

    const allSales = Array.from(productSalesMap.values());
    const bestSelling = [...allSales].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 8);
    const mostViewed = [...allSales].sort((a, b) => b.views - a.views).slice(0, 8);
    const mostSearched = [...allSales].sort((a, b) => b.searches - a.searches).slice(0, 8);
    const mostAddedToCart = [...allSales].sort((a, b) => b.cartAdds - a.cartAdds).slice(0, 8);
    const noSalesProducts = allSales.filter((s) => s.unitsSold === 0).map((s) => s.product);
    const slowMoving = [...allSales].filter((s) => s.unitsSold <= 1).slice(0, 8);

    // Category, Subcategory & Brand Revenue Breakdown
    const categorySalesMap = new Map<string, { name: string; revenue: number; units: number }>();
    const subcategorySalesMap = new Map<string, { name: string; categoryName: string; revenue: number; units: number }>();
    const brandSalesMap = new Map<string, { name: string; revenue: number; units: number }>();

    for (const cat of categories) {
      categorySalesMap.set(cat.id, { name: cat.name, revenue: 0, units: 0 });
    }

    for (const entry of allSales) {
      const p = entry.product;
      const rev = entry.revenue > 0 ? entry.revenue : p.isBestSeller ? p.price * 2 : p.price;
      const units = entry.unitsSold > 0 ? entry.unitsSold : p.isBestSeller ? 2 : 1;

      const catKey = p.categoryId || p.categoryName || 'other';
      const existingCat = categorySalesMap.get(catKey) || {
        name: p.categoryName || 'Other Equipment',
        revenue: 0,
        units: 0,
      };
      existingCat.revenue += rev;
      existingCat.units += units;
      categorySalesMap.set(catKey, existingCat);

      if (p.subcategoryName) {
        const subKey = `${p.categoryName}:${p.subcategoryName}`;
        const existingSub = subcategorySalesMap.get(subKey) || {
          name: p.subcategoryName,
          categoryName: p.categoryName,
          revenue: 0,
          units: 0,
        };
        existingSub.revenue += rev;
        existingSub.units += units;
        subcategorySalesMap.set(subKey, existingSub);
      }

      if (p.brand) {
        const existingBrand = brandSalesMap.get(p.brand) || { name: p.brand, revenue: 0, units: 0 };
        existingBrand.revenue += rev;
        existingBrand.units += units;
        brandSalesMap.set(p.brand, existingBrand);
      }
    }

    const totalCatRev = Math.max(
      1,
      Array.from(categorySalesMap.values()).reduce((s, c) => s + c.revenue, 0)
    );
    const categoryBreakdown = Array.from(categorySalesMap.values())
      .map((c) => ({
        ...c,
        percentage: Math.round((c.revenue / totalCatRev) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const subcategoryBreakdown = Array.from(subcategorySalesMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    const totalBrandRev = Math.max(
      1,
      Array.from(brandSalesMap.values()).reduce((s, b) => s + b.revenue, 0)
    );
    const brandBreakdown = Array.from(brandSalesMap.values())
      .map((b) => ({
        ...b,
        percentage: Math.round((b.revenue / totalBrandRev) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Sales by Location (Province & City)
    const cityMap = new Map<string, { city: string; province: string; orderCount: number; revenue: number }>();
    const provinceMap = new Map<string, { province: string; orderCount: number; revenue: number }>();

    for (const o of validAllOrders) {
      const city = o.customer?.city || 'Lahore';
      const province = o.customer?.province || 'Punjab';
      const cEntry = cityMap.get(city) || { city, province, orderCount: 0, revenue: 0 };
      cEntry.orderCount += 1;
      cEntry.revenue += o.grandTotal;
      cityMap.set(city, cEntry);

      const pEntry = provinceMap.get(province) || { province, orderCount: 0, revenue: 0 };
      pEntry.orderCount += 1;
      pEntry.revenue += o.grandTotal;
      provinceMap.set(province, pEntry);
    }

    const salesByCity = Array.from(cityMap.values()).sort((a, b) => b.revenue - a.revenue);
    const salesByProvince = Array.from(provinceMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Profit calculation (Private to Admins)
    let totalCost = 0;
    let totalRevenue = 0;
    for (const o of validAllOrders) {
      for (const item of o.items) {
        const p = products.find((prod) => prod.id === item.productId);
        const cost = p?.costPrice || Math.round(item.price * 0.75);
        totalCost += cost * item.quantity;
        totalRevenue += item.total;
      }
    }
    const estimatedGrossProfit = Math.max(0, totalRevenue - totalCost);
    const estimatedGrossMarginPercent =
      totalRevenue > 0 ? Math.round((estimatedGrossProfit / totalRevenue) * 100) : 0;

    // Order status breakdown
    const statusCounts: Record<string, number> = {
      Pending: 0,
      Confirmed: 0,
      Processing: 0,
      Packed: 0,
      Shipped: 0,
      'Out for Delivery': 0,
      Delivered: 0,
      Cancelled: 0,
      Returned: 0,
      'Failed Delivery': 0,
    };
    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    // Inventory stats
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    const outOfStock = products.filter((p) => p.stock === 0);
    const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
    const inventoryValuation = products.reduce((sum, p) => sum + p.stock * p.price, 0);

    // Customer aggregated stats (Privacy-safe: no raw personal emails/phones leaked in summary)
    const customers = this.getCustomers();
    const newCustomers = customers.filter((c) => c.segment === 'New').length;
    const returningCustomers = customers.filter((c) => c.segment !== 'New').length;
    const avgOrdersPerCustomer =
      customers.length > 0
        ? Number((orders.length / customers.length).toFixed(1))
        : 1;
    const avgCustomerOrderValue =
      customers.length > 0
        ? Math.round(
            customers.reduce((sum, c) => sum + c.averageOrderValue, 0) / customers.length
          )
        : averageOrderValue;

    return {
      sales: {
        today: sumRevenue(todayOrders),
        yesterday: sumRevenue(yesterdayOrders),
        thisWeek: sumRevenue(weekOrders),
        thisMonth: sumRevenue(monthOrders),
        previousMonth: sumRevenue(prevMonthOrders),
        threeMonths: sumRevenue(threeMonthsOrders),
        sixMonths: sumRevenue(sixMonthsOrders),
        thisYear: sumRevenue(yearOrders),
        selectedPeriodSales: selectedPeriodRevenue,
        totalSales: totalLifetimeRevenue,
        averageOrderValue,
      },
      orders: {
        total: orders.length,
        selectedPeriodCount: selectedOrders.length,
        statusCounts,
        todayCount: todayOrders.length,
        yesterdayCount: yesterdayOrders.length,
        weekCount: weekOrders.length,
        monthCount: monthOrders.length,
        yearCount: yearOrders.length,
      },
      products: {
        total: products.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        noSalesCount: noSalesProducts.length,
        totalStockUnits,
        inventoryValuation,
        bestSelling,
        mostViewed,
        mostSearched,
        mostAddedToCart,
        slowMoving,
        noSalesList: noSalesProducts.slice(0, 8),
        lowStockList: lowStock.slice(0, 8),
        outOfStockList: outOfStock.slice(0, 8),
      },
      categories: {
        byCategory: categoryBreakdown,
        bySubcategory: subcategoryBreakdown,
        byBrand: brandBreakdown,
      },
      locations: {
        byCity: salesByCity,
        byProvince: salesByProvince,
      },
      customers: {
        total: customers.length,
        newCustomers,
        returningCustomers,
        avgOrdersPerCustomer,
        avgCustomerOrderValue,
        repeatRate: customers.length > 0 ? Math.round((returningCustomers / customers.length) * 100) : 0,
        topLocations: salesByCity.slice(0, 5),
      },
      profit: {
        estimatedGrossProfit,
        estimatedGrossMarginPercent,
        totalCost,
        totalRevenue,
      },
    };
  }

  // --- Banners ---
  public getBanners(): HeroBanner[] {
    return this.data.banners.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public createBanner(banner: HeroBanner): HeroBanner {
    this.data.banners.push(banner);
    this.saveData(this.data);
    return banner;
  }

  public updateBanner(id: string, updates: Partial<HeroBanner>): HeroBanner | null {
    const idx = this.data.banners.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.data.banners[idx] = { ...this.data.banners[idx], ...updates };
    this.saveData(this.data);
    return this.data.banners[idx];
  }

  public deleteBanner(id: string): boolean {
    const prev = this.data.banners.length;
    this.data.banners = this.data.banners.filter((b) => b.id !== id);
    if (this.data.banners.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Coupons ---
  public getCoupons(): Coupon[] {
    return this.data.coupons;
  }

  public syncCoupons(coupons: Coupon[]): void {
    if (Array.isArray(coupons)) {
      const seen = new Map<string, Coupon>();
      for (const c of coupons) {
        if (c && c.id) seen.set(c.id, c);
      }
      this.data.coupons = Array.from(seen.values());
      this.saveToFile(this.data);
    }
  }

  public getCouponByCode(code: string): Coupon | undefined {
    return this.data.coupons.find(
      (c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive
    );
  }

  public createCoupon(coupon: Coupon): Coupon {
    const idx = this.data.coupons.findIndex((c) => c.id === coupon.id);
    if (idx > -1) {
      this.data.coupons[idx] = coupon;
    } else {
      this.data.coupons.push(coupon);
    }
    this.saveData(this.data);
    return coupon;
  }

  public updateCoupon(id: string, updates: Partial<Coupon>): Coupon | null {
    const idx = this.data.coupons.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.coupons[idx] = {
      ...this.data.coupons[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(this.data);
    return this.data.coupons[idx];
  }

  public deleteCoupon(id: string): boolean {
    const prev = this.data.coupons.length;
    this.data.coupons = this.data.coupons.filter((c) => c.id !== id);
    if (this.data.coupons.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Company Profile Pages ---
  public getCompanyPages(): CompanyPage[] {
    if (!this.data.companyPages) this.data.companyPages = INITIAL_COMPANY_PAGES;
    return [...this.data.companyPages].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  }

  public syncCompanyPages(pages: CompanyPage[]): void {
    if (Array.isArray(pages) && pages.length > 0) {
      const seen = new Map<string, CompanyPage>();
      pages.forEach((p) => {
        if (p && p.id) seen.set(p.id, p);
      });
      this.data.companyPages = Array.from(seen.values()).sort(
        (a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)
      );
      this.saveToFile(this.data);
    }
  }

  public upsertCompanyPage(page: CompanyPage): CompanyPage {
    if (!this.data.companyPages) this.data.companyPages = INITIAL_COMPANY_PAGES;
    const idx = this.data.companyPages.findIndex((p) => p.id === page.id || p.slug === page.slug);
    if (idx > -1) {
      this.data.companyPages[idx] = {
        ...this.data.companyPages[idx],
        ...page,
        updatedAt: new Date().toISOString(),
      };
      this.saveData(this.data);
      return this.data.companyPages[idx];
    }
    this.data.companyPages.push(page);
    this.saveData(this.data);
    return page;
  }

  public deleteCompanyPage(id: string): boolean {
    if (!this.data.companyPages) return false;
    const prev = this.data.companyPages.length;
    this.data.companyPages = this.data.companyPages.filter((p) => p.id !== id);
    if (this.data.companyPages.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Smart Offers ---
  public getSmartOffers(): SmartOffer[] {
    if (!this.data.smartOffers) this.data.smartOffers = INITIAL_SMART_OFFERS;
    return [...this.data.smartOffers].sort((a, b) => (a.displayPriority ?? 99) - (b.displayPriority ?? 99));
  }

  public syncSmartOffers(offers: SmartOffer[]): void {
    if (Array.isArray(offers) && offers.length > 0) {
      const seen = new Map<string, SmartOffer>();
      offers.forEach((o) => {
        if (o && o.id) seen.set(o.id, o);
      });
      this.data.smartOffers = Array.from(seen.values()).sort(
        (a, b) => (a.displayPriority ?? 99) - (b.displayPriority ?? 99)
      );
      this.saveToFile(this.data);
    }
  }

  public upsertSmartOffer(offer: SmartOffer): SmartOffer {
    if (!this.data.smartOffers) this.data.smartOffers = INITIAL_SMART_OFFERS;
    const idx = this.data.smartOffers.findIndex((o) => o.id === offer.id);
    if (idx > -1) {
      this.data.smartOffers[idx] = {
        ...this.data.smartOffers[idx],
        ...offer,
        updatedAt: new Date().toISOString(),
      };
      this.saveData(this.data);
      return this.data.smartOffers[idx];
    }
    this.data.smartOffers.unshift(offer);
    this.saveData(this.data);
    return offer;
  }

  public deleteSmartOffer(id: string): boolean {
    if (!this.data.smartOffers) return false;
    const prev = this.data.smartOffers.length;
    this.data.smartOffers = this.data.smartOffers.filter((o) => o.id !== id);
    if (this.data.smartOffers.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Build Your Solution Packages ---
  public getSolutions(): SolutionPackage[] {
    if (!this.data.solutions) this.data.solutions = INITIAL_SOLUTIONS;
    return [...this.data.solutions].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  }

  public syncSolutions(solutions: SolutionPackage[]): void {
    if (Array.isArray(solutions) && solutions.length > 0) {
      const seen = new Map<string, SolutionPackage>();
      solutions.forEach((s) => {
        if (s && s.id) seen.set(s.id, s);
      });
      this.data.solutions = Array.from(seen.values()).sort(
        (a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)
      );
      this.saveToFile(this.data);
    }
  }

  public upsertSolution(sol: SolutionPackage): SolutionPackage {
    if (!this.data.solutions) this.data.solutions = INITIAL_SOLUTIONS;
    const idx = this.data.solutions.findIndex((s) => s.id === sol.id);
    if (idx > -1) {
      this.data.solutions[idx] = {
        ...this.data.solutions[idx],
        ...sol,
        updatedAt: new Date().toISOString(),
      };
      this.saveData(this.data);
      return this.data.solutions[idx];
    }
    this.data.solutions.push(sol);
    this.saveData(this.data);
    return sol;
  }

  public deleteSolution(id: string): boolean {
    if (!this.data.solutions) return false;
    const prev = this.data.solutions.length;
    this.data.solutions = this.data.solutions.filter((s) => s.id !== id);
    if (this.data.solutions.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Reviews ---
  public getReviews(productId?: string): Review[] {
    if (productId) {
      return this.data.reviews.filter((r) => r.productId === productId);
    }
    return this.data.reviews;
  }

  public createReview(review: Review): Review {
    this.data.reviews.unshift(review);
    this.saveData(this.data);
    postgresManager.saveReview(review).catch(() => {});
    return review;
  }

  public updateReview(id: string, updates: Partial<Review>): Review | null {
    const idx = this.data.reviews.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.data.reviews[idx] = { ...this.data.reviews[idx], ...updates };
    this.saveData(this.data);
    postgresManager.saveReview(this.data.reviews[idx]).catch(() => {});
    return this.data.reviews[idx];
  }

  // --- Store Settings ---
  public getSettings(): StoreSettings {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<StoreSettings>): StoreSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.saveData(this.data);
    return this.data.settings;
  }

  // --- Orders deletion ---
  public deleteOrder(id: string): boolean {
    const prev = this.data.orders.length;
    this.data.orders = this.data.orders.filter((o) => o.id !== id && o.orderNumber !== id);
    if (this.data.orders.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Inquiries & B2B Quotations (Permanent Unique Tracking Code) ---
  public generateUniqueQuoteTrackingCode(): string {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const existingCodes = new Set(
      this.data.inquiries
        .map((i) => (i.quoteTrackingCode || i.quote_tracking_code || '').toUpperCase())
        .filter(Boolean)
    );
    let seq = this.data.inquiries.length + 1;
    let candidate = `MA-QT-${datePart}-${String(seq).padStart(4, '0')}`;
    while (existingCodes.has(candidate)) {
      seq++;
      candidate = `MA-QT-${datePart}-${String(seq).padStart(4, '0')}`;
    }
    return candidate;
  }

  public normalizeInquiryTrackingCode(inq: B2BInquiry, indexFallback = 1): B2BInquiry {
    const existing = (inq.quoteTrackingCode || inq.quote_tracking_code || '').trim();
    if (existing) {
      return {
        ...inq,
        quoteTrackingCode: existing,
        quote_tracking_code: existing,
      };
    }
    const d = inq.createdAt ? new Date(inq.createdAt) : new Date();
    const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const code = `MA-QT-${datePart}-${String(indexFallback).padStart(4, '0')}`;
    return {
      ...inq,
      quoteTrackingCode: code,
      quote_tracking_code: code,
    };
  }

  public getInquiries(): B2BInquiry[] {
    let mutated = false;
    const used = new Set<string>();
    this.data.inquiries = this.data.inquiries.map((inq, idx) => {
      let code = (inq.quoteTrackingCode || inq.quote_tracking_code || '').trim();
      if (!code || used.has(code)) {
        const d = inq.createdAt ? new Date(inq.createdAt) : new Date();
        const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
          d.getDate()
        ).padStart(2, '0')}`;
        let seq = idx + 1;
        code = `MA-QT-${datePart}-${String(seq).padStart(4, '0')}`;
        while (used.has(code)) {
          seq++;
          code = `MA-QT-${datePart}-${String(seq).padStart(4, '0')}`;
        }
        mutated = true;
      }
      used.add(code);
      return {
        ...inq,
        quoteTrackingCode: code,
        quote_tracking_code: code,
      };
    });
    if (mutated) {
      this.saveToFile(this.data);
    }
    return this.data.inquiries;
  }

  public syncInquiries(inquiries: B2BInquiry[]): void {
    if (Array.isArray(inquiries) && inquiries.length > 0) {
      const byKey = new Map<string, B2BInquiry>();
      for (const item of this.data.inquiries) {
        if (item && item.id) byKey.set(item.id, item);
      }
      for (const item of inquiries) {
        if (item && item.id) {
          const prev = byKey.get(item.id);
          // Preserve existing tracking code if already assigned
          const preservedCode =
            item.quoteTrackingCode ||
            item.quote_tracking_code ||
            prev?.quoteTrackingCode ||
            prev?.quote_tracking_code;
          byKey.set(item.id, {
            ...prev,
            ...item,
            ...(preservedCode
              ? { quoteTrackingCode: preservedCode, quote_tracking_code: preservedCode }
              : {}),
          });
        }
      }
      this.data.inquiries = Array.from(byKey.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      this.getInquiries(); // ensures unique tracking codes on any legacy items
    }
  }

  public getInquiryByIdOrCode(idOrCode: string): B2BInquiry | undefined {
    const clean = idOrCode.trim().toUpperCase();
    return this.getInquiries().find(
      (i) =>
        i.id.toUpperCase() === clean ||
        (i.quoteTrackingCode || '').toUpperCase() === clean ||
        (i.quote_tracking_code || '').toUpperCase() === clean
    );
  }

  public createInquiry(inquiry: B2BInquiry): B2BInquiry {
    const code =
      inquiry.quoteTrackingCode ||
      inquiry.quote_tracking_code ||
      this.generateUniqueQuoteTrackingCode();
    const normalized: B2BInquiry = {
      ...inquiry,
      quoteTrackingCode: code,
      quote_tracking_code: code,
      updatedAt: inquiry.updatedAt || new Date().toISOString(),
    };
    const existingIdx = this.data.inquiries.findIndex((i) => i.id === normalized.id);
    if (existingIdx > -1) {
      this.data.inquiries[existingIdx] = normalized;
    } else {
      this.data.inquiries.unshift(normalized);
    }
    this.saveData(this.data);
    postgresManager.saveInquiry(normalized).catch(() => {});
    return normalized;
  }

  public updateInquiry(idOrCode: string, updates: Partial<B2BInquiry>): B2BInquiry | null {
    const all = this.getInquiries();
    const clean = idOrCode.trim().toUpperCase();
    const idx = all.findIndex(
      (i) =>
        i.id.toUpperCase() === clean ||
        (i.quoteTrackingCode || '').toUpperCase() === clean ||
        (i.quote_tracking_code || '').toUpperCase() === clean
    );
    if (idx === -1) return null;
    const existing = this.data.inquiries[idx];
    // Permanent tracking code: NEVER overwrite with a new tracking code on update/confirmation
    const permanentCode = existing.quoteTrackingCode || existing.quote_tracking_code || this.generateUniqueQuoteTrackingCode();
    const updated: B2BInquiry = {
      ...existing,
      ...updates,
      id: existing.id,
      quoteTrackingCode: permanentCode,
      quote_tracking_code: permanentCode,
      updatedAt: new Date().toISOString(),
    };
    this.data.inquiries[idx] = updated;
    this.saveData(this.data);
    postgresManager.saveInquiry(updated).catch(() => {});
    return updated;
  }

  public deleteInquiry(id: string): boolean {
    const prev = this.data.inquiries.length;
    this.data.inquiries = this.data.inquiries.filter(
      (inq) => inq.id !== id && inq.quoteTrackingCode !== id
    );
    if (this.data.inquiries.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Super Admin Security & Staff Credentials ---
  public getSecuritySettings(): AdminSecuritySettings {
    if (!this.data.securitySettings) {
      this.data.securitySettings = {
        masterSecret: process.env.ADMIN_MASTER_SECRET || 'your_actual_secret_here',
        lastUpdated: new Date().toISOString(),
        staffList: [
          {
            id: 'staff-1',
            email: 'admin@magroup.pk',
            name: 'Store Operations Manager',
            role: 'admin',
            password: 'Admin@MAGroup2026',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      this.saveData(this.data);
    }
    return this.data.securitySettings;
  }

  public updateMasterSecret(newSecret: string, updatedBy: string): void {
    const sec = this.getSecuritySettings();
    sec.masterSecret = newSecret;
    sec.lastUpdated = new Date().toISOString();
    this.saveData(this.data);
    this.logAction('MASTER_SECRET_UPDATED', updatedBy, 'Super Admin updated Master Secret');
  }

  public saveStaffList(staffList: StaffUser[], updatedBy: string): void {
    const sec = this.getSecuritySettings();
    sec.staffList = staffList;
    sec.lastUpdated = new Date().toISOString();
    this.saveData(this.data);
    this.logAction('STAFF_CREDENTIALS_UPDATED', updatedBy, `Staff credentials updated (${staffList.length} members)`);
  }

  public addStaffMember(member: Omit<StaffUser, 'id' | 'createdAt'>, updatedBy: string): StaffUser {
    const sec = this.getSecuritySettings();
    const newStaff: StaffUser = {
      ...member,
      id: 'staff-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    sec.staffList.push(newStaff);
    this.saveData(this.data);
    this.logAction('STAFF_MEMBER_ADDED', updatedBy, `Added staff member: ${newStaff.email} (${newStaff.role})`);
    return newStaff;
  }

  public updateStaffMember(id: string, updates: Partial<StaffUser>, updatedBy: string): StaffUser | null {
    const sec = this.getSecuritySettings();
    const idx = sec.staffList.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    sec.staffList[idx] = {
      ...sec.staffList[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(this.data);
    this.logAction('STAFF_MEMBER_UPDATED', updatedBy, `Updated staff member: ${sec.staffList[idx].email}`);
    return sec.staffList[idx];
  }

  public deleteStaffMember(id: string, updatedBy: string): boolean {
    const sec = this.getSecuritySettings();
    const prev = sec.staffList.length;
    sec.staffList = sec.staffList.filter((s) => s.id !== id);
    if (sec.staffList.length !== prev) {
      this.saveData(this.data);
      this.logAction('STAFF_MEMBER_DELETED', updatedBy, `Deleted staff member ID: ${id}`);
      return true;
    }
    return false;
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs.slice(0, 100);
  }

  public logAction(
    action: string,
    performedBy: string,
    details: string,
    ipAddress?: string,
    target?: string,
    metadata?: Record<string, any>
  ): void {
    // Sanitize non-sensitive metadata: never record passwords, tokens, secrets
    let cleanMetadata: Record<string, any> | undefined = undefined;
    if (metadata && typeof metadata === 'object') {
      cleanMetadata = {};
      for (const [k, v] of Object.entries(metadata)) {
        if (/password|token|secret|credential|key|auth/i.test(k)) {
          cleanMetadata[k] = '[REDACTED]';
        } else {
          cleanMetadata[k] = v;
        }
      }
    }

    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      action,
      performedBy,
      details,
      timestamp: new Date().toISOString(),
      ipAddress,
      target,
      metadata: cleanMetadata,
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveData(this.data);
    postgresManager.logAudit(action, performedBy, details, ipAddress).catch(() => {});
  }

  public async getDatabaseStatus(): Promise<DatabaseStatus> {
    return postgresManager.getStatus({
      products: this.data.products.length,
      categories: this.data.categories.length,
      brands: this.data.brands.length,
      orders: this.data.orders.length,
      reviews: this.data.reviews.length,
      inquiries: this.data.inquiries.length,
      auditLogs: this.data.auditLogs.length,
    });
  }

  // ============================================================================
  // COMPLETE DELIVERY ZONES, AREAS, SETTINGS & CALCULATION ENGINE
  // ============================================================================

  private getInitialDeliveryZones(): DeliveryZone[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'zone-lahore',
        name: 'Zone 1 — Lahore',
        code: 'LHR-Z1',
        description: 'All central and suburban residential & commercial sectors in Lahore.',
        province: 'Punjab',
        baseCharge: 250,
        chargeType: 'fixed',
        freeDeliveryThreshold: 5000,
        minDeliveryDays: 1,
        maxDeliveryDays: 3,
        codEnabled: true,
        codMinAmount: 500,
        codMaxAmount: 500000,
        installationBaseCharge: 1500,
        isActive: true,
        displayOrder: 1,
        notes: 'Same-day / next-day dispatch from Lahore Head Showroom.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'zone-isb-rwp',
        name: 'Zone 2 — Islamabad / Rawalpindi',
        code: 'ISB-Z2',
        description: 'Twin cities metropolitan sectors, Bahria Town & DHA Islamabad.',
        province: 'Islamabad Capital Territory',
        baseCharge: 350,
        chargeType: 'fixed',
        freeDeliveryThreshold: 8000,
        minDeliveryDays: 2,
        maxDeliveryDays: 4,
        codEnabled: true,
        codMinAmount: 500,
        codMaxAmount: 400000,
        installationBaseCharge: 2000,
        isActive: true,
        displayOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'zone-karachi',
        name: 'Zone 3 — Karachi',
        code: 'KHI-Z3',
        description: 'All Karachi industrial, commercial, and residential areas.',
        province: 'Sindh',
        baseCharge: 450,
        chargeType: 'fixed',
        freeDeliveryThreshold: 10000,
        minDeliveryDays: 3,
        maxDeliveryDays: 6,
        codEnabled: true,
        codMinAmount: 500,
        codMaxAmount: 400000,
        installationBaseCharge: 2500,
        isActive: true,
        displayOrder: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'zone-punjab',
        name: 'Zone 4 — Punjab',
        code: 'PUN-Z4',
        description: 'Faisalabad, Multan, Gujranwala, Sialkot, Sargodha, Bahawalpur & Punjab cities.',
        province: 'Punjab',
        baseCharge: 350,
        chargeType: 'fixed',
        freeDeliveryThreshold: 8000,
        minDeliveryDays: 2,
        maxDeliveryDays: 5,
        codEnabled: true,
        codMinAmount: 500,
        codMaxAmount: 350000,
        installationBaseCharge: 2000,
        isActive: true,
        displayOrder: 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'zone-sindh',
        name: 'Zone 5 — Sindh',
        code: 'SND-Z5',
        description: 'Hyderabad, Sukkur, Larkana and interior Sindh.',
        province: 'Sindh',
        baseCharge: 500,
        chargeType: 'fixed',
        freeDeliveryThreshold: 12000,
        minDeliveryDays: 4,
        maxDeliveryDays: 7,
        codEnabled: true,
        codMinAmount: 500,
        codMaxAmount: 250000,
        installationBaseCharge: 2500,
        isActive: true,
        displayOrder: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'zone-kpk',
        name: 'Zone 6 — KPK',
        code: 'KPK-Z6',
        description: 'Peshawar, Abbottabad, Mardan, Swat and Khyber Pakhtunkhwa.',
        province: 'Khyber Pakhtunkhwa',
        baseCharge: 450,
        chargeType: 'fixed',
        freeDeliveryThreshold: 10000,
        minDeliveryDays: 3,
        maxDeliveryDays: 6,
        codEnabled: true,
        codMinAmount: 500,
        codMaxAmount: 300000,
        installationBaseCharge: 2500,
        isActive: true,
        displayOrder: 6,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'zone-balochistan',
        name: 'Zone 7 — Balochistan',
        code: 'BAL-Z7',
        description: 'Quetta, Gwadar and Balochistan region.',
        province: 'Balochistan',
        baseCharge: 650,
        chargeType: 'fixed',
        freeDeliveryThreshold: 15000,
        minDeliveryDays: 5,
        maxDeliveryDays: 9,
        codEnabled: true,
        codMinAmount: 1000,
        codMaxAmount: 200000,
        installationBaseCharge: 3000,
        isActive: true,
        displayOrder: 7,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'zone-ajk',
        name: 'Zone 8 — AJK',
        code: 'AJK-Z8',
        description: 'Muzaffarabad, Mirpur and Azad Jammu & Kashmir.',
        province: 'Azad Jammu & Kashmir',
        baseCharge: 550,
        chargeType: 'fixed',
        freeDeliveryThreshold: 12000,
        minDeliveryDays: 4,
        maxDeliveryDays: 8,
        codEnabled: true,
        codMinAmount: 500,
        codMaxAmount: 200000,
        installationBaseCharge: 2500,
        isActive: true,
        displayOrder: 8,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'zone-gb',
        name: 'Zone 9 — Gilgit-Baltistan',
        code: 'GB-Z9',
        description: 'Gilgit, Skardu, Hunza and Northern Areas.',
        province: 'Gilgit-Baltistan',
        baseCharge: 800,
        chargeType: 'fixed',
        freeDeliveryThreshold: 20000,
        minDeliveryDays: 6,
        maxDeliveryDays: 11,
        codEnabled: true,
        codMinAmount: 1000,
        codMaxAmount: 150000,
        installationBaseCharge: 3500,
        isActive: true,
        displayOrder: 9,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'zone-remote',
        name: 'Zone 10 — Remote Areas',
        code: 'REM-Z10',
        description: 'Outstation & special remote industrial or rural sites.',
        province: 'Punjab',
        baseCharge: 750,
        chargeType: 'fixed',
        freeDeliveryThreshold: 25000,
        minDeliveryDays: 7,
        maxDeliveryDays: 12,
        codEnabled: true,
        codMinAmount: 1000,
        codMaxAmount: 100000,
        installationBaseCharge: 3500,
        isActive: true,
        displayOrder: 10,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  private getInitialDeliveryAreas(): DeliveryArea[] {
    const now = new Date().toISOString();
    const lahoreAreas = [
      { id: 'area-lhr-dha', name: 'DHA (Phase 1–9)', code: 'LHR-DHA', charge: 250, remote: false, surcharge: 0 },
      { id: 'area-lhr-gulberg', name: 'Gulberg', code: 'LHR-GLB', charge: 250, remote: false, surcharge: 0 },
      { id: 'area-lhr-johar', name: 'Johar Town', code: 'LHR-JHR', charge: 250, remote: false, surcharge: 0 },
      { id: 'area-lhr-model', name: 'Model Town', code: 'LHR-MDL', charge: 250, remote: false, surcharge: 0 },
      { id: 'area-lhr-bahria', name: 'Bahria Town Lahore', code: 'LHR-BHR', charge: 300, remote: false, surcharge: 0 },
      { id: 'area-lhr-wapda', name: 'Wapda Town', code: 'LHR-WPD', charge: 250, remote: false, surcharge: 0 },
      { id: 'area-lhr-cantt', name: 'Cantt', code: 'LHR-CNT', charge: 250, remote: false, surcharge: 0 },
      { id: 'area-lhr-garden', name: 'Garden Town', code: 'LHR-GDN', charge: 250, remote: false, surcharge: 0 },
      { id: 'area-lhr-township', name: 'Township', code: 'LHR-TWN', charge: 250, remote: false, surcharge: 0 },
      { id: 'area-lhr-raiwind', name: 'Raiwind Industrial & Road', code: 'LHR-RWD', charge: 300, remote: true, surcharge: 200 },
      { id: 'area-lhr-other', name: 'Other Lahore Areas', code: 'LHR-OTH', charge: null, remote: false, surcharge: 0 },
    ].map((a) => ({
      id: a.id,
      zoneId: 'zone-lahore',
      zoneName: 'Zone 1 — Lahore',
      name: a.name,
      code: a.code,
      city: 'Lahore',
      province: 'Punjab',
      deliveryCharge: a.charge,
      chargeType: 'fixed' as const,
      freeDeliveryThreshold: 5000,
      minDeliveryDays: 1,
      maxDeliveryDays: 3,
      codEnabled: true,
      codMinAmount: 500,
      codMaxAmount: 500000,
      isRemoteArea: a.remote,
      remoteSurcharge: a.surcharge,
      installationCharge: 1500,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));

    const otherAreas: DeliveryArea[] = [
      {
        id: 'area-isb-sectors',
        zoneId: 'zone-isb-rwp',
        zoneName: 'Zone 2 — Islamabad / Rawalpindi',
        name: 'F/G/E/I Sectors & Blue Area',
        code: 'ISB-SEC',
        city: 'Islamabad',
        province: 'Islamabad Capital Territory',
        deliveryCharge: 350,
        chargeType: 'fixed',
        freeDeliveryThreshold: 8000,
        minDeliveryDays: 2,
        maxDeliveryDays: 4,
        codEnabled: true,
        isRemoteArea: false,
        remoteSurcharge: 0,
        installationCharge: 2000,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'area-isb-dha-bahria',
        zoneId: 'zone-isb-rwp',
        zoneName: 'Zone 2 — Islamabad / Rawalpindi',
        name: 'DHA & Bahria Town Islamabad/RWP',
        code: 'ISB-DHA',
        city: 'Rawalpindi',
        province: 'Punjab',
        deliveryCharge: 350,
        chargeType: 'fixed',
        freeDeliveryThreshold: 8000,
        minDeliveryDays: 2,
        maxDeliveryDays: 4,
        codEnabled: true,
        isRemoteArea: false,
        remoteSurcharge: 0,
        installationCharge: 2000,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'area-khi-dha-clifton',
        zoneId: 'zone-karachi',
        zoneName: 'Zone 3 — Karachi',
        name: 'DHA & Clifton Karachi',
        code: 'KHI-DHA',
        city: 'Karachi',
        province: 'Sindh',
        deliveryCharge: 450,
        chargeType: 'fixed',
        freeDeliveryThreshold: 10000,
        minDeliveryDays: 3,
        maxDeliveryDays: 5,
        codEnabled: true,
        isRemoteArea: false,
        remoteSurcharge: 0,
        installationCharge: 2500,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'area-khi-gulshan-pechs',
        zoneId: 'zone-karachi',
        zoneName: 'Zone 3 — Karachi',
        name: 'Gulshan, PECHS & North Nazimabad',
        code: 'KHI-GLS',
        city: 'Karachi',
        province: 'Sindh',
        deliveryCharge: 450,
        chargeType: 'fixed',
        freeDeliveryThreshold: 10000,
        minDeliveryDays: 3,
        maxDeliveryDays: 6,
        codEnabled: true,
        isRemoteArea: false,
        remoteSurcharge: 0,
        installationCharge: 2500,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'area-fsd-city',
        zoneId: 'zone-punjab',
        zoneName: 'Zone 4 — Punjab',
        name: 'Faisalabad Central & Industrial',
        code: 'FSD-CEN',
        city: 'Faisalabad',
        province: 'Punjab',
        deliveryCharge: 350,
        chargeType: 'fixed',
        freeDeliveryThreshold: 8000,
        minDeliveryDays: 2,
        maxDeliveryDays: 4,
        codEnabled: true,
        isRemoteArea: false,
        remoteSurcharge: 0,
        installationCharge: 2000,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'area-mul-city',
        zoneId: 'zone-punjab',
        zoneName: 'Zone 4 — Punjab',
        name: 'Multan Cantt, Bosan Road & DHA',
        code: 'MUL-CEN',
        city: 'Multan',
        province: 'Punjab',
        deliveryCharge: 350,
        chargeType: 'fixed',
        freeDeliveryThreshold: 8000,
        minDeliveryDays: 2,
        maxDeliveryDays: 5,
        codEnabled: true,
        isRemoteArea: false,
        remoteSurcharge: 0,
        installationCharge: 2000,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    return [...lahoreAreas, ...otherAreas];
  }

  private getInitialDeliverySettings(): DeliverySettings {
    return {
      defaultCharge: 450,
      defaultChargeType: 'fixed',
      defaultMinDays: 3,
      defaultMaxDays: 6,
      defaultCodEnabled: true,
      globalCodMinOrder: 500,
      globalCodMaxOrder: 500000,
      globalFreeDeliveryThreshold: 10000,
      enableGlobalFreeDelivery: true,
      cutoffTime: '16:00',
      timezone: 'Asia/Karachi',
      workingDays: {
        Monday: true,
        Tuesday: true,
        Wednesday: true,
        Thursday: true,
        Friday: true,
        Saturday: true,
        Sunday: false,
      },
      holidays: [
        { id: 'hol-1', name: 'Pakistan Resolution Day', holidayDate: '2026-03-23', isActive: true },
        { id: 'hol-2', name: 'Independence Day', holidayDate: '2026-08-14', isActive: true },
      ],
      weightBrackets: [
        { minKg: 0, maxKg: 5, charge: 250 },
        { minKg: 5.01, maxKg: 10, charge: 400 },
        { minKg: 10.01, maxKg: 20, charge: 650 },
        { minKg: 20.01, maxKg: 50, charge: 1000 },
      ],
      quantityBrackets: [
        { minQty: 1, maxQty: 2, charge: 250 },
        { minQty: 3, maxQty: 5, charge: 350 },
        { minQty: 6, maxQty: 999, charge: 500 },
      ],
      orderValueBrackets: [
        { minAmount: 0, maxAmount: 4999, charge: 350 },
        { minAmount: 5000, maxAmount: 9999, charge: 200 },
        { minAmount: 10000, maxAmount: 99999999, charge: 0 },
      ],
      heavyWeightThresholdKg: 50,
      heavyFixedSurcharge: 1000,
      heavyPercentageSurcharge: 0,
      multiProductShipmentMode: 'combined',
      freeDeliveryRules: [
        {
          id: 'fdr-lahore',
          name: 'Free Delivery in Lahore above Rs. 5,000',
          minOrderValue: 5000,
          zoneIds: ['zone-lahore'],
          isActive: true,
        },
        {
          id: 'fdr-nationwide',
          name: 'Free Nationwide Delivery above Rs. 10,000',
          minOrderValue: 10000,
          isActive: true,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  public getDeliveryZones(): DeliveryZone[] {
    if (!this.data.deliveryZones || this.data.deliveryZones.length === 0) {
      this.data.deliveryZones = this.getInitialDeliveryZones();
      this.saveData(this.data);
    }
    return this.data.deliveryZones.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  }

  public syncDeliveryZones(zones: DeliveryZone[]): void {
    if (Array.isArray(zones) && zones.length > 0) {
      this.data.deliveryZones = zones;
      this.saveData(this.data);
    }
  }

  public upsertDeliveryZone(zone: DeliveryZone): DeliveryZone {
    const zones = this.getDeliveryZones();
    const idx = zones.findIndex((z) => z.id === zone.id);
    const updated: DeliveryZone = {
      ...zone,
      updatedAt: new Date().toISOString(),
    };
    if (idx > -1) {
      this.data.deliveryZones![idx] = updated;
    } else {
      this.data.deliveryZones!.push(updated);
    }
    this.saveData(this.data);
    return updated;
  }

  public deleteDeliveryZone(id: string): boolean {
    const zones = this.getDeliveryZones();
    const prev = zones.length;
    this.data.deliveryZones = zones.filter((z) => z.id !== id);
    if (this.data.deliveryZones.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public getDeliveryAreas(): DeliveryArea[] {
    if (!this.data.deliveryAreas || this.data.deliveryAreas.length === 0) {
      this.data.deliveryAreas = this.getInitialDeliveryAreas();
      this.saveData(this.data);
    }
    return this.data.deliveryAreas;
  }

  public syncDeliveryAreas(areas: DeliveryArea[]): void {
    if (Array.isArray(areas) && areas.length > 0) {
      this.data.deliveryAreas = areas;
      this.saveData(this.data);
    }
  }

  public upsertDeliveryArea(area: DeliveryArea): DeliveryArea {
    const areas = this.getDeliveryAreas();
    const zones = this.getDeliveryZones();
    const parentZone = zones.find((z) => z.id === area.zoneId);
    const idx = areas.findIndex((a) => a.id === area.id);
    const updated: DeliveryArea = {
      ...area,
      zoneName: parentZone?.name || area.zoneName || 'Assigned Zone',
      updatedAt: new Date().toISOString(),
    };
    if (idx > -1) {
      this.data.deliveryAreas![idx] = updated;
    } else {
      this.data.deliveryAreas!.push(updated);
    }
    this.saveData(this.data);
    return updated;
  }

  public deleteDeliveryArea(id: string): boolean {
    const areas = this.getDeliveryAreas();
    const prev = areas.length;
    this.data.deliveryAreas = areas.filter((a) => a.id !== id);
    if (this.data.deliveryAreas.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public getDeliverySettings(): DeliverySettings {
    if (!this.data.deliverySettings) {
      this.data.deliverySettings = this.getInitialDeliverySettings();
      this.saveData(this.data);
    }
    return this.data.deliverySettings;
  }

  public updateDeliverySettings(updates: Partial<DeliverySettings>): DeliverySettings {
    const current = this.getDeliverySettings();
    this.data.deliverySettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(this.data);
    return this.data.deliverySettings;
  }

  // Authoritative 5-Tier Priority Delivery Calculation Engine
  public calculateDelivery(params: {
    city?: string;
    province?: string;
    areaId?: string;
    areaName?: string;
    zoneId?: string;
    postalCode?: string;
    items: { productId: string; quantity: number; price?: number }[];
    subtotal?: number;
    requestInstallation?: boolean;
  }): DeliverySnapshot {
    const dSettings = this.getDeliverySettings();
    const storeSettings = this.getSettings();
    const zones = this.getDeliveryZones();
    const areas = this.getDeliveryAreas();

    const cleanCity = (params.city || 'Lahore').trim();
    const cleanProvince = (params.province || 'Punjab').trim();

    // 1. Resolve Area & Zone
    let matchedArea: DeliveryArea | undefined;
    if (params.areaId) {
      matchedArea = areas.find((a) => a.id === params.areaId);
    }
    if (!matchedArea && params.areaName) {
      const lowerArea = params.areaName.trim().toLowerCase();
      matchedArea = areas.find(
        (a) =>
          a.name.toLowerCase() === lowerArea &&
          a.city.toLowerCase() === cleanCity.toLowerCase()
      );
    }

    let matchedZone: DeliveryZone | undefined;
    if (matchedArea) {
      matchedZone = zones.find((z) => z.id === matchedArea!.zoneId);
    }
    if (!matchedZone && params.zoneId) {
      matchedZone = zones.find((z) => z.id === params.zoneId);
    }
    if (!matchedZone) {
      const cityLower = cleanCity.toLowerCase();
      if (cityLower === 'lahore') {
        matchedZone = zones.find((z) => z.id === 'zone-lahore' || z.name.toLowerCase().includes('lahore'));
      } else if (cityLower === 'islamabad' || cityLower === 'rawalpindi' || cityLower === 'wah cantt') {
        matchedZone = zones.find((z) => z.id === 'zone-isb-rwp' || z.name.toLowerCase().includes('islamabad'));
      } else if (cityLower === 'karachi') {
        matchedZone = zones.find((z) => z.id === 'zone-karachi' || z.name.toLowerCase().includes('karachi'));
      } else {
        matchedZone = zones.find(
          (z) => z.province.toLowerCase() === cleanProvince.toLowerCase()
        );
      }
    }

    // Evaluate Cart Products for weight, subtotal, product-specific rules, and installation
    let computedSubtotal = 0;
    let totalQty = 0;
    let totalWeightKg = 0;
    let productSpecificCharge = 0;
    let hasProductSpecificRule = false;
    let allProductsFreeDelivery = params.items.length > 0;
    let anyProductUnavailable = false;
    let anyProductQuoteRequired = false;
    let installationChargeTotal = 0;
    let specialHandlingTotal = 0;

    for (const item of params.items) {
      const prod = this.getProductById(item.productId);
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = prod ? (prod.salePrice || prod.price) : Number(item.price || 0);
      computedSubtotal += unitPrice * qty;
      totalQty += qty;

      if (prod) {
        const wKg =
          prod.weightKg !== undefined
            ? Number(prod.weightKg)
            : prod.weight
            ? parseFloat(String(prod.weight).replace(/[^0-9.]/g, '')) || 1.5
            : 1.5;
        totalWeightKg += wKg * qty;

        if (prod.deliveryRuleType === 'unavailable') {
          anyProductUnavailable = true;
        } else if (prod.deliveryRuleType === 'quote_required') {
          anyProductQuoteRequired = true;
        } else if (prod.deliveryRuleType === 'fixed' && prod.deliveryFixedCharge !== undefined) {
          hasProductSpecificRule = true;
          allProductsFreeDelivery = false;
          productSpecificCharge += Number(prod.deliveryFixedCharge) * (dSettings.multiProductShipmentMode === 'separate' ? qty : 1);
        } else if (prod.deliveryRuleType === 'surcharge' && prod.deliverySurcharge !== undefined) {
          allProductsFreeDelivery = false;
          productSpecificCharge += Number(prod.deliverySurcharge) * qty;
        } else if (prod.deliveryRuleType === 'free') {
          // Product itself has free delivery
        } else {
          allProductsFreeDelivery = false;
        }

        if (params.requestInstallation && prod.installationAvailable) {
          const prodInst =
            prod.installationCharge !== undefined
              ? Number(prod.installationCharge)
              : matchedArea?.installationCharge ??
                matchedZone?.installationBaseCharge ??
                1500;
          installationChargeTotal += prodInst * qty;
        }
        if (prod.specialHandlingCharge) {
          specialHandlingTotal += Number(prod.specialHandlingCharge) * qty;
        }
      } else {
        allProductsFreeDelivery = false;
      }
    }

    const subtotal = params.subtotal !== undefined ? Number(params.subtotal) : computedSubtotal;

    // Helper for Charge Method calculation
    const computeChargeByMethod = (
      method: string,
      fixedAmount: number,
      pctRate = 2
    ): number => {
      if (method === 'percentage') {
        return Math.round((subtotal * pctRate) / 100);
      }
      if (method === 'weight_based') {
        const bracket = dSettings.weightBrackets.find(
          (b) => totalWeightKg >= b.minKg && totalWeightKg <= b.maxKg
        );
        return bracket ? bracket.charge : fixedAmount;
      }
      if (method === 'quantity_based') {
        const bracket = dSettings.quantityBrackets.find(
          (b) => totalQty >= b.minQty && totalQty <= b.maxQty
        );
        return bracket ? bracket.charge : fixedAmount;
      }
      if (method === 'order_value_based') {
        const bracket = dSettings.orderValueBrackets.find(
          (b) => subtotal >= b.minAmount && subtotal <= b.maxAmount
        );
        return bracket ? bracket.charge : fixedAmount;
      }
      return fixedAmount;
    };

    // Priority Hierarchy:
    // 1. Product-specific delivery rule
    // 2. Area-specific delivery charge
    // 3. Zone-specific delivery charge
    // 4. City/region default charge
    // 5. Global default delivery charge
    let baseDeliveryCharge = dSettings.defaultCharge || storeSettings.standardShippingFee || 450;
    let ruleApplied = 'Priority 5: Global Default Delivery Rule';
    let chargeMethod: string = dSettings.defaultChargeType || 'fixed';

    const cityFees = storeSettings.cityShippingFees || {};
    const cityKey = Object.keys(cityFees).find(
      (k) => k.toLowerCase() === cleanCity.toLowerCase()
    );

    if (hasProductSpecificRule) {
      baseDeliveryCharge = productSpecificCharge;
      ruleApplied = 'Priority 1: Product-Specific Delivery Rule';
      chargeMethod = 'fixed';
    } else if (
      matchedArea &&
      matchedArea.deliveryCharge !== undefined &&
      matchedArea.deliveryCharge !== null
    ) {
      chargeMethod = matchedArea.chargeType || matchedZone?.chargeType || 'fixed';
      baseDeliveryCharge = computeChargeByMethod(
        chargeMethod,
        Number(matchedArea.deliveryCharge),
        matchedZone?.percentageRate || 2
      );
      ruleApplied = `Priority 2: Area Rule (${matchedArea.name}, ${matchedArea.city})`;
    } else if (matchedZone) {
      chargeMethod = matchedZone.chargeType || 'fixed';
      baseDeliveryCharge = computeChargeByMethod(
        chargeMethod,
        Number(matchedZone.baseCharge),
        matchedZone.percentageRate || 2
      );
      ruleApplied = `Priority 3: Zone Rule (${matchedZone.name})`;
    } else if (cityKey && cityFees[cityKey] !== undefined) {
      baseDeliveryCharge = Number(cityFees[cityKey]);
      ruleApplied = `Priority 4: City Default Rule (${cleanCity})`;
      chargeMethod = 'fixed';
    } else {
      baseDeliveryCharge = computeChargeByMethod(
        dSettings.defaultChargeType || 'fixed',
        dSettings.defaultCharge || storeSettings.standardShippingFee || 450
      );
      ruleApplied = 'Priority 5: Global Default Delivery Charge';
    }

    // Check Free Delivery Rules
    let freeDeliveryApplied = false;
    let freeDeliveryReason: string | undefined;

    if (allProductsFreeDelivery && params.items.length > 0) {
      freeDeliveryApplied = true;
      freeDeliveryReason = 'Product-specific Free Delivery';
    } else {
      // Check Area / Zone / Global Free Delivery Threshold
      const effectiveThreshold =
        matchedArea?.freeDeliveryThreshold ??
        matchedZone?.freeDeliveryThreshold ??
        (dSettings.enableGlobalFreeDelivery
          ? dSettings.globalFreeDeliveryThreshold || storeSettings.freeShippingThreshold || 10000
          : null);

      if (effectiveThreshold !== null && effectiveThreshold !== undefined && subtotal >= effectiveThreshold) {
        freeDeliveryApplied = true;
        freeDeliveryReason = `Order above Rs. ${effectiveThreshold.toLocaleString()} threshold`;
      }

      // Also check custom FreeDeliveryRules
      if (!freeDeliveryApplied && Array.isArray(dSettings.freeDeliveryRules)) {
        const nowMs = Date.now();
        for (const r of dSettings.freeDeliveryRules) {
          if (!r.isActive) continue;
          if (r.startDate && new Date(r.startDate).getTime() > nowMs) continue;
          if (r.endDate && new Date(r.endDate).getTime() < nowMs) continue;
          if (subtotal < r.minOrderValue) continue;
          if (r.zoneIds && r.zoneIds.length > 0 && (!matchedZone || !r.zoneIds.includes(matchedZone.id))) {
            continue;
          }
          if (r.areaIds && r.areaIds.length > 0 && (!matchedArea || !r.areaIds.includes(matchedArea.id))) {
            continue;
          }
          freeDeliveryApplied = true;
          freeDeliveryReason = r.name;
          break;
        }
      }
    }

    if (freeDeliveryApplied) {
      baseDeliveryCharge = 0;
    }

    // Remote Area Surcharge
    const isRemoteArea = Boolean(matchedArea?.isRemoteArea || matchedZone?.id === 'zone-remote');
    const remoteAreaSurcharge = isRemoteArea
      ? Number(matchedArea?.remoteSurcharge || 0)
      : 0;

    // Heavy / Oversized Surcharge
    let heavyOversizedSurcharge = 0;
    if (
      dSettings.heavyWeightThresholdKg > 0 &&
      totalWeightKg > dSettings.heavyWeightThresholdKg
    ) {
      heavyOversizedSurcharge =
        Number(dSettings.heavyFixedSurcharge || 0) +
        Math.round((subtotal * Number(dSettings.heavyPercentageSurcharge || 0)) / 100);
    }

    // Additional product surcharges (if not already priority 1)
    const extraProductSurcharge = hasProductSpecificRule ? 0 : productSpecificCharge;

    const finalDeliveryCharge = Math.max(
      0,
      baseDeliveryCharge +
        remoteAreaSurcharge +
        heavyOversizedSurcharge +
        extraProductSurcharge +
        specialHandlingTotal
    );

    // Check Area / Zone Active & COD Eligibility + COD Order Value Limits
    let codAvailable = Boolean(
      storeSettings.codEnabled !== false &&
        dSettings.defaultCodEnabled !== false &&
        (matchedZone ? matchedZone.codEnabled !== false : true) &&
        (matchedArea ? matchedArea.codEnabled !== false : true)
    );
    let codBlockedReason: string | undefined;

    if (matchedZone && matchedZone.isActive === false) {
      codAvailable = false;
      codBlockedReason = 'Delivery to this zone is currently unavailable. Please contact M.A. Group Of Companies for assistance.';
    } else if (matchedArea && matchedArea.isActive === false) {
      codAvailable = false;
      codBlockedReason = 'Delivery to this area is currently unavailable. Please contact M.A. Group Of Companies for assistance.';
    } else if (anyProductUnavailable) {
      codAvailable = false;
      codBlockedReason = 'One or more items in your bag are unavailable for standard courier delivery.';
    } else if (!codAvailable) {
      codBlockedReason = 'Cash on Delivery is currently unavailable for this area.';
    } else {
      const minCod =
        matchedArea?.codMinAmount ??
        matchedZone?.codMinAmount ??
        dSettings.globalCodMinOrder ??
        storeSettings.codMinAmount ??
        0;
      const maxCod =
        matchedArea?.codMaxAmount ??
        matchedZone?.codMaxAmount ??
        dSettings.globalCodMaxOrder ??
        storeSettings.codMaxAmount ??
        1000000;

      if (subtotal < minCod) {
        codAvailable = false;
        codBlockedReason = `Minimum Cash on Delivery order value for this area is Rs. ${minCod.toLocaleString()}.`;
      } else if (subtotal > maxCod) {
        codAvailable = false;
        codBlockedReason = `Maximum Cash on Delivery limit for this area is Rs. ${maxCod.toLocaleString()}. Please request a B2B quotation for larger orders.`;
      }
    }

    // Delivery Time Estimation + Daily Cut-Off Time check
    let minDays =
      matchedArea?.minDeliveryDays ??
      matchedZone?.minDeliveryDays ??
      dSettings.defaultMinDays ??
      2;
    let maxDays =
      matchedArea?.maxDeliveryDays ??
      matchedZone?.maxDeliveryDays ??
      dSettings.defaultMaxDays ??
      5;

    const now = new Date();
    const [cutHour] = (dSettings.cutoffTime || '16:00').split(':').map(Number);
    const afterCutoff = now.getHours() >= (cutHour || 16);
    if (afterCutoff) {
      minDays += 1;
      maxDays += 1;
    }

    const estimatedDeliveryText = `${minDays}–${maxDays} business days${
      afterCutoff ? ` (Next business day processing after ${dSettings.cutoffTime} cut-off)` : ''
    }`;

    return {
      zoneId: matchedZone?.id,
      zoneName: matchedZone?.name || `${cleanProvince} Region`,
      areaId: matchedArea?.id,
      areaName: matchedArea?.name || cleanCity,
      city: cleanCity,
      province: cleanProvince,
      postalCode: params.postalCode,
      baseDeliveryCharge,
      remoteAreaSurcharge,
      heavyOversizedSurcharge,
      productSpecificCharge: extraProductSurcharge,
      installationCharge: installationChargeTotal,
      specialHandlingCharge: specialHandlingTotal,
      finalDeliveryCharge,
      ruleApplied: freeDeliveryApplied
        ? `${ruleApplied} → ${freeDeliveryReason}`
        : ruleApplied,
      chargeMethod,
      freeDeliveryApplied,
      freeDeliveryReason,
      codAvailable,
      codBlockedReason,
      isRemoteArea,
      quoteRequired: anyProductQuoteRequired,
      estimatedMinDays: minDays,
      estimatedMaxDays: maxDays,
      estimatedDeliveryText,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      calculatedAt: new Date().toISOString(),
    };
  }

  // --- Warranty Registrations, Service Requests & Customer Support Tickets ---
  public getWarrantyRegistrations(): WarrantyRegistration[] {
    if (!this.data.warrantyRegistrations) {
      this.data.warrantyRegistrations = [];
    }
    return this.data.warrantyRegistrations;
  }

  public syncWarrantyRegistrations(items: WarrantyRegistration[]): void {
    if (Array.isArray(items)) {
      this.data.warrantyRegistrations = items;
      this.saveData(this.data);
    }
  }

  public upsertWarrantyRegistration(item: WarrantyRegistration): WarrantyRegistration {
    const list = this.getWarrantyRegistrations();
    const idx = list.findIndex((w) => w.id === item.id);
    if (idx > -1) list[idx] = item;
    else list.unshift(item);
    this.saveData(this.data);
    return item;
  }

  public getServiceRequests(): ServiceRequest[] {
    if (!this.data.serviceRequests) {
      this.data.serviceRequests = [];
    }
    return this.data.serviceRequests;
  }

  public syncServiceRequests(items: ServiceRequest[]): void {
    if (Array.isArray(items)) {
      this.data.serviceRequests = items;
      this.saveData(this.data);
    }
  }

  public upsertServiceRequest(item: ServiceRequest): ServiceRequest {
    const list = this.getServiceRequests();
    const idx = list.findIndex((s) => s.id === item.id);
    if (idx > -1) list[idx] = item;
    else list.unshift(item);
    this.saveData(this.data);
    return item;
  }

  public getSupportTickets(): SupportTicket[] {
    if (!this.data.supportTickets) {
      this.data.supportTickets = [];
    }
    return this.data.supportTickets;
  }

  public syncSupportTickets(items: SupportTicket[]): void {
    if (Array.isArray(items)) {
      this.data.supportTickets = items;
      this.saveData(this.data);
    }
  }

  public upsertSupportTicket(item: SupportTicket): SupportTicket {
    const list = this.getSupportTickets();
    const idx = list.findIndex((t) => t.id === item.id);
    if (idx > -1) list[idx] = item;
    else list.unshift(item);
    this.saveData(this.data);
    return item;
  }
}

export const db = new DatabaseService();
