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
      { id: 'sub-solar-panels', categoryId: 'cat-solar', name: 'Solar Panels', slug: 'solar-panels' },
      { id: 'sub-solar-inverters', categoryId: 'cat-solar', name: 'Solar Inverters', slug: 'solar-inverters' },
      { id: 'sub-solar-batteries', categoryId: 'cat-solar', name: 'Lithium & Tubular Batteries', slug: 'solar-batteries' },
      { id: 'sub-solar-acc', categoryId: 'cat-solar', name: 'Solar Accessories & Cables', slug: 'solar-accessories' },
    ],
  },
  {
    id: 'cat-electrical',
    name: 'Electrical Products & Equipment',
    slug: 'electrical-products',
    description: 'Certified copper cables, circuit breakers, designer modular switches, industrial distribution boxes, and ceiling fans.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    iconName: 'Zap',
    displayOrder: 2,
    isActive: true,
    subcategories: [
      { id: 'sub-switches', categoryId: 'cat-electrical', name: 'Switches & Sockets', slug: 'switches-sockets' },
      { id: 'sub-cables', categoryId: 'cat-electrical', name: 'Wires & Cables', slug: 'wires-cables' },
      { id: 'sub-breakers', categoryId: 'cat-electrical', name: 'Circuit Breakers & DBs', slug: 'circuit-breakers' },
      { id: 'sub-fans', categoryId: 'cat-electrical', name: 'Fans & Ventilation', slug: 'fans-ventilation' },
      { id: 'sub-elec-acc', categoryId: 'cat-electrical', name: 'Electrical Accessories', slug: 'electrical-accessories' },
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
      { id: 'sub-faucets', categoryId: 'cat-sanitary', name: 'Luxury Faucets & Mixers', slug: 'faucets-mixers' },
      { id: 'sub-basins', categoryId: 'cat-sanitary', name: 'Wash Basins & Vanities', slug: 'wash-basins' },
      { id: 'sub-showers', categoryId: 'cat-sanitary', name: 'Rain Showers & Panels', slug: 'showers-panels' },
      { id: 'sub-toilets', categoryId: 'cat-sanitary', name: 'Commodes & Cisterns', slug: 'commodes-cisterns' },
      { id: 'sub-plumbing', categoryId: 'cat-sanitary', name: 'Pipes & Plumbing Fittings', slug: 'pipes-fittings' },
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
      { id: 'sub-power-tools', categoryId: 'cat-hardware', name: 'Power Tools', slug: 'power-tools' },
      { id: 'sub-hand-tools', categoryId: 'cat-hardware', name: 'Hand Tools', slug: 'hand-tools' },
      { id: 'sub-locks', categoryId: 'cat-hardware', name: 'Locks & Security Hardware', slug: 'locks-security' },
      { id: 'sub-fasteners', categoryId: 'cat-hardware', name: 'Fasteners & Architectural Hardware', slug: 'fasteners' },
    ],
  },
  {
    id: 'cat-hobs-hoods',
    name: 'Hobs & Kitchen Hoods',
    slug: 'hobs-hoods',
    description: 'Italian-inspired tempered glass built-in gas hobs, touch-control suction kitchen chimney hoods, and electric induction cooktops.',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    iconName: 'Flame',
    displayOrder: 5,
    isActive: true,
    subcategories: [
      { id: 'sub-builtin-hobs', categoryId: 'cat-hobs-hoods', name: 'Built-in Gas Hobs', slug: 'builtin-gas-hobs' },
      { id: 'sub-electric-hobs', categoryId: 'cat-hobs-hoods', name: 'Induction & Infrared Hobs', slug: 'induction-infrared-hobs' },
      { id: 'sub-kitchen-hoods', categoryId: 'cat-hobs-hoods', name: 'Auto-Clean Range Hoods', slug: 'kitchen-hoods' },
    ],
  },
  {
    id: 'cat-ev-bikes',
    name: 'EV Bikes & Green Mobility',
    slug: 'ev-bikes',
    description: 'Modern lithium-powered electric bikes, high-efficiency smart fast chargers, conversion kits, and replacement parts.',
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    iconName: 'Bike',
    displayOrder: 6,
    isActive: true,
    subcategories: [
      { id: 'sub-electric-bikes', categoryId: 'cat-ev-bikes', name: 'Electric Commuter Bikes', slug: 'electric-bikes' },
      { id: 'sub-ev-chargers', categoryId: 'cat-ev-bikes', name: 'EV Chargers & Accessories', slug: 'ev-chargers' },
      { id: 'sub-ev-batteries', categoryId: 'cat-ev-bikes', name: 'Lithium Battery Packs', slug: 'ev-battery-packs' },
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
      { id: 'sub-stabilizers', categoryId: 'cat-power-equipment', name: 'Automatic Voltage Regulators', slug: 'voltage-stabilizers' },
      { id: 'sub-generators', categoryId: 'cat-power-equipment', name: 'Generators & Power Units', slug: 'generators' },
    ],
  },
];

const INITIAL_BRANDS: Brand[] = [
  { id: 'b-inverex', name: 'Inverex Solar Energy', slug: 'inverex', isFeatured: true, description: 'Pakistan leading brand in solar inverters and LiFePO4 batteries.' },
  { id: 'b-schneider', name: 'Schneider Electric', slug: 'schneider-electric', isFeatured: true, description: 'Global benchmark in energy management and electrical protection.' },
  { id: 'b-pakcables', name: 'Pakistan Cables', slug: 'pakistan-cables', isFeatured: true, description: 'Premier manufacturer of 99.99% pure copper electric cables.' },
  { id: 'b-crownmicro', name: 'Crown Micro', slug: 'crown-micro', isFeatured: true, description: 'High-performance solar and power electronics systems.' },
  { id: 'b-master', name: 'Master Sanitary', slug: 'master-sanitary', isFeatured: true, description: 'Luxury bathroom fittings, brass taps, and sanitary fixtures.' },
  { id: 'b-sonex', name: 'Sonex Bath Solutions', slug: 'sonex', isFeatured: true, description: 'Premium designer faucets and rain shower systems.' },
  { id: 'b-bosch', name: 'Bosch Power Tools', slug: 'bosch', isFeatured: true, description: 'Heavy-duty German engineered cordless power tools and drills.' },
  { id: 'b-corona', name: 'Corona Kitchenware', slug: 'corona', isFeatured: true, description: 'Built-in tempered glass hobs and auto-clean kitchen hoods.' },
  { id: 'b-crown-ev', name: 'Crown EV Mobility', slug: 'crown-ev', isFeatured: true, description: 'Reliable Pakistani electric motorbikes and battery packs.' },
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
  aiWelcomeMessage: 'Welcome to M.A. GROUP OF COMPANIES! I am your Smart Assistant. Ask me anything about solar sizing, electrical cable ratings, sanitary fixtures, hobs & hoods, or tracking your order.',
};

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
      inquiries: [],
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
    if (Array.isArray(products) && products.length > 0) {
      this.data.products = products;
      this.saveToFile(this.data);
    }
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id || p.slug === id);
  }

  public createProduct(product: Product): Product {
    this.data.products.unshift(product);
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
    if (Array.isArray(categories) && categories.length > 0) {
      this.data.categories = categories;
      this.saveToFile(this.data);
    }
  }

  public getCategoryById(id: string): Category | undefined {
    return this.data.categories.find((c) => c.id === id || c.slug === id);
  }

  public createCategory(category: Category): Category {
    this.data.categories.push(category);
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

  // --- Brands ---
  public getBrands(): Brand[] {
    return this.data.brands;
  }

  public createBrand(brand: Brand): Brand {
    this.data.brands.push(brand);
    this.saveData(this.data);
    return brand;
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
      this.data.orders = orders;
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
  public getCustomers(): CustomerProfile[] {
    const orderList = this.data.orders;
    const customerMap = new Map<string, CustomerProfile>();
    const notesMap = this.data.customerNotes || {};

    for (const o of orderList) {
      if (!o.customer || !o.customer.phone) continue;
      const phone = o.customer.phone.trim();
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const key = cleanPhone || phone;

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

        if (new Date(orderDate) < new Date(existing.firstOrderDate)) {
          existing.firstOrderDate = orderDate;
        }
        if (new Date(orderDate) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = orderDate;
          existing.fullName = o.customer.fullName;
          existing.city = o.customer.city;
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
  public getAdvancedAnalytics(range: string = 'month') {
    const orders = this.data.orders;
    const products = this.data.products;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;
    const prevMonthStart = todayStart - 60 * 24 * 60 * 60 * 1000;

    const filterPeriod = (start: number, end: number) => {
      return orders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= start && t < end && o.status !== 'Cancelled';
      });
    };

    const todayOrders = filterPeriod(todayStart, Date.now());
    const yesterdayOrders = filterPeriod(yesterdayStart, todayStart);
    const weekOrders = filterPeriod(weekStart, Date.now());
    const monthOrders = filterPeriod(monthStart, Date.now());
    const prevMonthOrders = filterPeriod(prevMonthStart, monthStart);

    const sumRevenue = (list: Order[]) => list.reduce((sum, o) => sum + o.grandTotal, 0);

    // Best selling products calculation
    const productSalesMap = new Map<string, { product: Product; unitsSold: number; revenue: number }>();
    for (const p of products) {
      productSalesMap.set(p.id, { product: p, unitsSold: 0, revenue: 0 });
    }

    for (const o of orders) {
      if (o.status === 'Cancelled') continue;
      for (const item of o.items) {
        const entry = productSalesMap.get(item.productId);
        if (entry) {
          entry.unitsSold += item.quantity;
          entry.revenue += item.total;
        }
      }
    }

    const allSales = Array.from(productSalesMap.values());
    const bestSelling = [...allSales].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 8);
    const slowMoving = [...allSales].filter((s) => s.unitsSold <= 1).slice(0, 8);

    // Profit calculation (Private to Admins)
    let totalCost = 0;
    let totalRevenue = 0;
    for (const o of orders) {
      if (o.status === 'Cancelled') continue;
      for (const item of o.items) {
        const p = products.find((prod) => prod.id === item.productId);
        const cost = p?.costPrice || Math.round(item.price * 0.75);
        totalCost += cost * item.quantity;
        totalRevenue += item.total;
      }
    }
    const estimatedGrossProfit = Math.max(0, totalRevenue - totalCost);
    const estimatedGrossMarginPercent = totalRevenue > 0 ? Math.round((estimatedGrossProfit / totalRevenue) * 100) : 0;

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

    // Customer stats
    const customers = this.getCustomers();
    const newCustomers = customers.filter((c) => c.segment === 'New').length;
    const returningCustomers = customers.filter((c) => c.segment !== 'New').length;

    return {
      sales: {
        today: sumRevenue(todayOrders),
        yesterday: sumRevenue(yesterdayOrders),
        thisWeek: sumRevenue(weekOrders),
        thisMonth: sumRevenue(monthOrders),
        previousMonth: sumRevenue(prevMonthOrders),
        totalSales: sumRevenue(orders.filter((o) => o.status !== 'Cancelled')),
      },
      orders: {
        total: orders.length,
        statusCounts,
        todayCount: todayOrders.length,
        weekCount: weekOrders.length,
        monthCount: monthOrders.length,
      },
      products: {
        total: products.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        totalStockUnits,
        inventoryValuation,
        bestSelling,
        slowMoving,
        lowStockList: lowStock.slice(0, 6),
        outOfStockList: outOfStock.slice(0, 6),
      },
      customers: {
        total: customers.length,
        newCustomers,
        returningCustomers,
        repeatRate: customers.length > 0 ? Math.round((returningCustomers / customers.length) * 100) : 0,
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

  public getCouponByCode(code: string): Coupon | undefined {
    return this.data.coupons.find(
      (c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive
    );
  }

  public createCoupon(coupon: Coupon): Coupon {
    this.data.coupons.push(coupon);
    this.saveData(this.data);
    return coupon;
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

  // --- Inquiries ---
  public getInquiries(): B2BInquiry[] {
    return this.data.inquiries;
  }

  public createInquiry(inquiry: B2BInquiry): B2BInquiry {
    this.data.inquiries.unshift(inquiry);
    this.saveData(this.data);
    postgresManager.saveInquiry(inquiry).catch(() => {});
    return inquiry;
  }

  public deleteInquiry(id: string): boolean {
    const prev = this.data.inquiries.length;
    this.data.inquiries = this.data.inquiries.filter((inq) => inq.id !== id);
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
}

export const db = new DatabaseService();
