import { GoogleGenAI, Type } from '@google/genai';
import { db } from './db.ts';
import { supabaseService } from './supabase.ts';

const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '';

let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

async function getHydratedCatalog() {
  if (supabaseService.isConfigured()) {
    try {
      const [supaProducts, supaCats, supaOrders] = await Promise.all([
        supabaseService.getProducts(),
        supabaseService.getCategories(),
        supabaseService.getOrders(),
      ]);
      if (supaProducts !== null) db.syncProducts(supaProducts);
      if (supaCats !== null) db.syncCategories(supaCats);
      if (supaOrders !== null) db.syncOrders(supaOrders);
    } catch {
      // Fallback to local hydrated db
    }
  }
  return {
    products: db.getProducts(),
    categories: db.getCategories(),
    orders: db.getOrders(),
    settings: db.getSettings(),
  };
}

export async function askShoppingAssistant(
  userQuery: string,
  chatHistory: { role: 'user' | 'model'; text: string }[] = []
): Promise<{ reply: string; recommendedProductIds: string[] }> {
  const { products, settings } = await getHydratedCatalog();
  const activeProducts = products.filter(
    (p) => p.status !== 'archived' && p.status !== 'inactive' && !p.isArchived
  );

  // Create real-time catalog context grounded in Supabase
  const catalogSummary = activeProducts
    .map(
      (p) =>
        `- [ID: ${p.id}] [${p.categoryName}] ${p.name} (SKU: ${p.sku}, Price: Rs. ${(p.salePrice || p.price).toLocaleString()}, Stock: ${p.stock > 0 ? `${p.stock} In Stock` : 'Out of Stock'}, Warranty: ${p.warranty}). Key Features: ${(p.features || []).slice(0, 3).join('; ')}`
    )
    .join('\n');

  const systemInstruction = `You are "M.A. Smart Assistant", the knowledgeable technical sales and engineering advisor for "M.A. GROUP OF COMPANIES" (Headquartered in Lahore, Pakistan).

OUR STORE PROFILE & POLICIES:
- Store Name: M.A. GROUP OF COMPANIES
- Primary Market: Pakistan (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, and all cities).
- Payment Method: ONLY Cash on Delivery (COD). Customers pay cash at their doorstep to courier upon inspection.
- Currency: Pakistani Rupees (PKR / Rs.).
- Shipping: Free delivery across Pakistan on orders above Rs. ${(settings.freeShippingThreshold || 5000).toLocaleString()}. Standard delivery Rs. ${settings.standardShippingFee || 450}. Delivery within 2-4 business days.
- Contact: ${settings.contactPhone || 'Official Support'} / Email: ${settings.contactEmail}.

STORE REAL PRODUCT CATALOG (GROUNDED IN SUPABASE — YOU MUST ONLY RECOMMEND THESE PRODUCTS):
${catalogSummary}

CRITICAL RULES:
1. ONLY recommend real products that exist in our catalog above. NEVER invent products, prices, fake warranty periods, or nonexistent specs.
2. Always include the exact SKU or product name when recommending items so the customer can add them to their cart.
3. If asked about solar sizing (e.g. for a 1.5-ton inverter AC or 5-Marla / 10-Marla house):
   - A 1.5-ton inverter AC consumes approx 1.2kW - 1.8kW during startup/run.
   - Recommend matching solar inverters, panels, and lithium batteries from our live catalog with exact prices in PKR.
4. If asked about electrical cables or switches, explain safety specs (e.g., pure copper 70/0.0076 for AC lines/power circuits, circuit breakers).
5. Always maintain a polite, professional, and helpful tone. Mention Cash on Delivery availability across Pakistan.`;

  let replyText = '';

  if (ai) {
    try {
      const contents: any[] = [];
      for (const item of chatHistory.slice(-6)) {
        contents.push({
          role: item.role,
          parts: [{ text: item.text }],
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: userQuery }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });

      if (response && response.text) {
        replyText = response.text;
      }
    } catch (error) {
      console.warn('Gemini generateContent error, switching to catalog rule fallback:', error);
    }
  }

  const q = userQuery.toLowerCase();

  if (!replyText) {
    if (q.includes('solar') || q.includes('inverter') || q.includes('panel') || q.includes('battery') || q.includes('ac')) {
      const solarProds = activeProducts.filter(
        (p) => p.categoryId === 'cat-solar' || p.categoryName.toLowerCase().includes('solar')
      );
      const items = solarProds
        .slice(0, 3)
        .map((p) => `• **${p.name}** (SKU: ${p.sku}) - Rs. ${(p.salePrice || p.price).toLocaleString()} (${p.warranty})`)
        .join('\n');
      replyText = `Hello! For solar systems in Pakistan, M.A. GROUP OF COMPANIES supplies Tier-1 certified equipment with official manufacturer warranties:\n\n${items}\n\nWe provide nationwide delivery with 100% Cash on Delivery (COD) across Pakistan.`;
    } else if (q.includes('cable') || q.includes('wire') || q.includes('breaker') || q.includes('switch')) {
      const elecProds = activeProducts.filter(
        (p) => p.categoryId === 'cat-electrical' || p.categoryName.toLowerCase().includes('electrical')
      );
      const items = elecProds
        .slice(0, 3)
        .map((p) => `• **${p.name}** (SKU: ${p.sku}) - Rs. ${(p.salePrice || p.price).toLocaleString()}`)
        .join('\n');
      replyText = `M.A. GROUP OF COMPANIES is an authorized distributor of 99.99% pure copper cables and certified circuit breakers:\n\n${items}\n\nAll electrical accessories are delivered directly via Cash on Delivery (COD) anywhere in Pakistan.`;
    } else if (q.includes('hob') || q.includes('hood') || q.includes('kitchen')) {
      const kitchenProds = activeProducts.filter(
        (p) => p.categoryId === 'cat-hobs-hoods' || p.categoryName.toLowerCase().includes('hob')
      );
      const items = kitchenProds
        .map((p) => `• **${p.name}** (SKU: ${p.sku}) - Rs. ${(p.salePrice || p.price).toLocaleString()}`)
        .join('\n');
      replyText = `Our Italian-inspired kitchen appliances collection includes:\n\n${items}\n\nFeatures include auto-ignition, heavy brass burners, and wave-gesture suction hoods with full warranty.`;
    } else if (q.includes('ev') || q.includes('bike') || q.includes('electric bike')) {
      const evProds = activeProducts.filter(
        (p) => p.categoryId === 'cat-ev-bikes' || p.categoryName.toLowerCase().includes('ev')
      );
      const items = evProds
        .map((p) => `• **${p.name}** (SKU: ${p.sku}) - Rs. ${(p.salePrice || p.price).toLocaleString()}`)
        .join('\n');
      replyText = `Our Green Mobility division features high-range Lithium Electric Commuter Motorbikes:\n\n${items}\n\nDelivers up to 100 km real-world range per charge with doorstep COD delivery!`;
    } else {
      const matched = activeProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => q.includes(t.toLowerCase()))
      );
      if (matched.length > 0) {
        const top = matched
          .slice(0, 3)
          .map((p) => `• **${p.name}** (SKU: ${p.sku}) - Rs. ${(p.salePrice || p.price).toLocaleString()} [${p.stock > 0 ? 'In Stock' : 'Out of Stock'}]`)
          .join('\n');
        replyText = `Here are the matching products from the M.A. GROUP OF COMPANIES live Supabase catalog:\n\n${top}\n\nAll products come with genuine manufacturer warranty and Cash on Delivery (COD) across Pakistan.`;
      } else {
        const newest = activeProducts
          .slice(0, 3)
          .map((p) => `• **${p.name}** (SKU: ${p.sku}) - Rs. ${(p.salePrice || p.price).toLocaleString()}`)
          .join('\n');
        replyText = `Welcome to M.A. GROUP OF COMPANIES! Here are some of our top catalog products available with Cash on Delivery across Pakistan:\n\n${newest}\n\nFeel free to ask about product specifications, solar load calculations, or order delivery!`;
      }
    }
  }

  // Match recommended products from reply or query
  const lowerReply = replyText.toLowerCase();
  const recommended = activeProducts
    .filter((p) => {
      const skuMatch = p.sku && (lowerReply.includes(p.sku.toLowerCase()) || q.includes(p.sku.toLowerCase()));
      const nameWords = p.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const nameHit = nameWords.length > 0 && nameWords.slice(0, 3).every((w) => lowerReply.includes(w) || q.includes(w));
      return skuMatch || nameHit;
    })
    .slice(0, 3)
    .map((p) => p.id);

  return {
    reply: replyText,
    recommendedProductIds: recommended,
  };
}

export async function generateAdminCopy(
  prompt: string,
  type: 'product_description' | 'seo_meta' | 'inventory_insight'
): Promise<string> {
  const { products, orders } = await getHydratedCatalog();

  if (ai) {
    try {
      const contextInfo =
        type === 'inventory_insight'
          ? `\nLive Catalog Summary (${products.length} products, ${orders.length} orders):\n` +
            products
              .slice(0, 15)
              .map((p) => `- ${p.name} (SKU: ${p.sku}): Price Rs.${p.price}, Stock: ${p.stock}`)
              .join('\n')
          : '';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an expert e-commerce copywriter and inventory analyst for M.A. GROUP OF COMPANIES, a premier industrial and residential supplier in Pakistan.\n\nTask Type: ${type}\nPrompt: ${prompt}${contextInfo}\n\nProvide concise, professional, production-grade output formatted in clean text/Markdown tailored for the Pakistani market (PKR currency, WAPDA/K-Electric standards, Cash on Delivery).`,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (e) {
      console.warn('Gemini error for admin copy:', e);
    }
  }

  return `### AI Recommendation for: ${prompt}\n- High quality engineering standard meeting Pakistani electrical & building compliance.\n- Tested under local ambient conditions.\n- Recommended customer warranty: 2 to 5 years.\n- Nationwide Cash on Delivery (COD) ready across Pakistan.`;
}

export interface GeneratedProductDraft {
  description: string;
  shortDescription: string;
  warranty: string;
  brand: string;
  features: string[];
  specifications: { key: string; value: string }[];
  tags: string[];
}

export async function generateProductDetailsWithAi(input: {
  name: string;
  categoryName?: string;
  price?: number;
  brand?: string;
}): Promise<GeneratedProductDraft> {
  const title = input.name.trim() || 'Industrial Equipment';
  const cat = input.categoryName || 'Electrical & Solar Equipment';
  const priceStr = input.price ? `Rs. ${Number(input.price).toLocaleString()} PKR` : 'Competitive PKR Pricing';

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate structured e-commerce product details for a product sold by "M.A. GROUP OF COMPANIES" in Pakistan.\nProduct Title: ${title}\nCategory: ${cat}\nPrice: ${priceStr}\nBrand: ${input.brand || 'M.A. Certified'}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: {
                type: Type.STRING,
                description: 'Detailed 2-3 sentence technical and commercial description tailored for Pakistani homes and projects.',
              },
              shortDescription: {
                type: Type.STRING,
                description: 'Concise 1-sentence summary under 140 characters.',
              },
              warranty: {
                type: Type.STRING,
                description: 'Realistic official warranty period in Pakistan (e.g. 2 Years Official M.A. Group Replacement Warranty).',
              },
              brand: {
                type: Type.STRING,
                description: 'Brand name inferred from product title or M.A. Certified.',
              },
              features: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 key technical bullet points.',
              },
              specifications: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    value: { type: Type.STRING },
                  },
                  required: ['key', 'value'],
                },
                description: '4 technical specification key-value pairs.',
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 relevant search tags in lowercase.',
              },
            },
            required: ['description', 'shortDescription', 'warranty', 'brand', 'features', 'specifications', 'tags'],
          },
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        return parsed as GeneratedProductDraft;
      }
    } catch (err) {
      console.warn('Gemini structured product generation fallback:', err);
    }
  }

  return {
    description: `${title} is engineered for high durability and peak performance under Pakistani residential and commercial operating conditions. Supplied by M.A. GROUP OF COMPANIES with full quality verification and nationwide Cash on Delivery (COD).`,
    shortDescription: `Certified ${title} in ${cat} with official warranty and nationwide COD delivery.`,
    warranty: '2 Years Official M.A. Group Warranty',
    brand: input.brand || 'M.A. Certified',
    features: [
      '100% Genuine Certified Components',
      'Engineered for Pakistani voltage and climate conditions',
      'Heavy-duty build quality for long service life',
      'Nationwide Cash on Delivery (COD) with doorstep inspection',
    ],
    specifications: [
      { key: 'Category', value: cat },
      { key: 'Quality Standard', value: 'ISO / PSQCA Compliant' },
      { key: 'Payment Method', value: 'Cash on Delivery (COD)' },
      { key: 'Warranty Coverage', value: 'Official Pakistan Warranty' },
    ],
    tags: [cat.toLowerCase().split(' ')[0] || 'equipment', 'pakistan', 'cod', 'genuine'],
  };
}

export interface GeneratedInvoiceAiSummary {
  thankYouMessage: string;
  energyProductUsageTip: string;
}

export async function generateInvoiceAiSummary(input: {
  orderNumber?: string;
  customerName?: string;
  city?: string;
  items: { productName: string; quantity: number; price?: number; sku?: string }[];
  grandTotal?: number;
}): Promise<GeneratedInvoiceAiSummary> {
  const customerName = input.customerName?.trim() || 'Valued Customer';
  const city = input.city?.trim() || 'Pakistan';
  const itemsList = Array.isArray(input.items) && input.items.length > 0
    ? input.items.map((it) => `${it.quantity}x ${it.productName}${it.sku ? ` (SKU: ${it.sku})` : ''}`).join(', ')
    : 'M.A. Group Certified Equipment';

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate a professional invoice 'AI Summary' section for an order from "M.A. GROUP OF COMPANIES" in Pakistan.\nCustomer Name: ${customerName}\nCity: ${city}\nOrder Number: ${input.orderNumber || 'N/A'}\nPurchased Items: ${itemsList}\nOrder Total: Rs. ${(input.grandTotal || 0).toLocaleString()} PKR`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              thankYouMessage: {
                type: Type.STRING,
                description:
                  'A warm, executive, 1-2 sentence thank-you message addressed to the customer by name for choosing M.A. GROUP OF COMPANIES.',
              },
              energyProductUsageTip: {
                type: Type.STRING,
                description:
                  'A specific, practical 1-2 sentence Energy Efficiency, Installation Safety, or Product Maintenance tip tailored directly to the purchased items.',
              },
            },
            required: ['thankYouMessage', 'energyProductUsageTip'],
          },
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (parsed.thankYouMessage && parsed.energyProductUsageTip) {
          return parsed as GeneratedInvoiceAiSummary;
        }
      }
    } catch (err) {
      console.warn('Gemini invoice summary fallback:', err);
    }
  }

  // Tailored intelligent fallback based on purchased item keywords
  const lowerItems = itemsList.toLowerCase();
  let customTip =
    'Ensure all equipment is installed according to manufacturer specifications and inspected periodically for optimal efficiency and longevity.';

  if (lowerItems.includes('solar') || lowerItems.includes('inverter') || lowerItems.includes('panel') || lowerItems.includes('battery')) {
    customTip =
      'Clean solar panels every 2–3 weeks to remove dust buildup (which can boost kWh output by up to 18% in Pakistan) and install inverters in a well-ventilated, shaded area with proper earthing and DC surge protection.';
  } else if (lowerItems.includes('cable') || lowerItems.includes('wire') || lowerItems.includes('breaker') || lowerItems.includes('switch')) {
    customTip =
      'Always pair pure copper wiring with appropriately rated MCB circuit breakers and ensure tight terminal connections to prevent voltage drops, overheating, and unnecessary energy loss.';
  } else if (lowerItems.includes('hob') || lowerItems.includes('hood') || lowerItems.includes('burner') || lowerItems.includes('kitchen')) {
    customTip =
      'Run the range hood thermal auto-clean cycle monthly to maintain peak suction efficiency and keep brass hob burner ports clear for a clean, fuel-efficient blue flame.';
  } else if (lowerItems.includes('ev') || lowerItems.includes('bike') || lowerItems.includes('charger')) {
    customTip =
      'Avoid discharging your lithium EV battery below 20% and allow the pack to cool for 20 minutes after riding before connecting the fast charger to maximize cycle life.';
  } else if (lowerItems.includes('mixer') || lowerItems.includes('faucet') || lowerItems.includes('shower') || lowerItems.includes('sanitary')) {
    customTip =
      'Clean chrome and matte sanitary fittings using a soft microfiber cloth with mild soap—avoid harsh acidic cleaners to preserve the electroplated finish and ceramic cartridge seal.';
  }

  return {
    thankYouMessage: `Dear ${customerName}, thank you for choosing M.A. GROUP OF COMPANIES for your order (${itemsList}). We appreciate your trust in our certified products and nationwide service.`,
    energyProductUsageTip: customTip,
  };
}

