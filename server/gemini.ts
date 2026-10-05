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
      const [supaProducts, supaCats, supaOrders, supaPartners, supaSettings] = await Promise.all([
        supabaseService.getProducts(),
        supabaseService.getCategories(),
        supabaseService.getOrders(),
        supabaseService.getPartners(),
        supabaseService.getSettings(),
      ]);
      if (supaProducts !== null) db.syncProducts(supaProducts);
      if (supaCats !== null) db.syncCategories(supaCats);
      if (supaOrders !== null) db.syncOrders(supaOrders);
      if (supaPartners !== null && supaPartners.length > 0) db.syncBrands(supaPartners);
      if (supaSettings !== null) db.updateSettings(supaSettings);
    } catch {
      // Fallback to local hydrated db
    }
  }
  return {
    products: db.getProducts(),
    categories: db.getCategories(),
    partners: db.getBrands(),
    orders: db.getOrders(),
    settings: db.getSettings(),
  };
}

export async function askShoppingAssistant(
  userQuery: string,
  chatHistory: { role: 'user' | 'model'; text: string }[] = [],
  customerAccount?: { id?: string; email?: string; phone?: string; fullName?: string } | null
): Promise<{ reply: string; recommendedProductIds: string[] }> {
  const { products, categories, partners, orders, settings } = await getHydratedCatalog();

  if (settings.aiAssistantEnabled === false) {
    return {
      reply:
        'M.A. SMART ASSISTANT is currently offline for scheduled updates. Please browse our catalog directly or contact M.A. GROUP OF COMPANIES support.',
      recommendedProductIds: [],
    };
  }

  const visibleCats = categories.filter((c) => c.isActive !== false);
  const visiblePartners = partners.filter((p) => p.isVisible !== false);
  const activeProducts = products.filter((p) => {
    if (p.status === 'archived' || p.status === 'inactive' || p.isArchived) return false;
    const parentCat = categories.find(
      (c) => c.id === p.categoryId || c.name.toLowerCase() === (p.categoryName || '').toLowerCase()
    );
    if (parentCat && parentCat.isActive === false) return false;
    if (parentCat && p.subcategoryId) {
      const sub = (parentCat.subcategories || []).find(
        (s) => s.id === p.subcategoryId || s.slug === p.subcategoryId
      );
      if (sub && sub.isActive === false) return false;
    }
    return true;
  });

  const canAccessCatalog = settings.aiAccessProductCatalog !== false;
  const canAccessOrders = settings.aiAccessCustomerOrders !== false;
  const maxRecs = Math.max(1, Math.min(6, Number(settings.aiMaxRecommendations || 3)));

  // Filter authenticated customer's own orders strictly
  let customerOwnOrders: typeof orders = [];
  if (canAccessOrders && customerAccount && (customerAccount.id || customerAccount.email || customerAccount.phone)) {
    const cleanEmail = (customerAccount.email || '').trim().toLowerCase();
    const cleanPhone = (customerAccount.phone || '').replace(/[^0-9]/g, '');
    const cleanId = (customerAccount.id || '').trim();

    customerOwnOrders = orders.filter((o) => {
      if (cleanId && o.customerId && o.customerId === cleanId) return true;
      if (cleanEmail && o.customer?.email && o.customer.email.trim().toLowerCase() === cleanEmail) return true;
      if (cleanPhone && cleanPhone.length >= 7 && o.customer?.phone) {
        const oPhone = o.customer.phone.replace(/[^0-9]/g, '');
        if (oPhone && (oPhone.includes(cleanPhone) || cleanPhone.includes(oPhone))) return true;
      }
      return false;
    });
  }

  // Create real-time catalog context grounded in Supabase
  const catalogSummary = canAccessCatalog
    ? activeProducts
        .map((p) => {
          const specsStr = (p.specifications || [])
            .map((s) => `${s.key}: ${s.value}`)
            .join(', ');
          return `- [ID: ${p.id}] [Category: ${p.categoryName}${p.subcategoryName ? ` > ${p.subcategoryName}` : ''}] "${p.name}" | Brand: ${p.brand} | SKU: ${p.sku} | Price: PKR ${(p.salePrice || p.price).toLocaleString()}${p.salePrice && p.salePrice < p.price ? ` (Regular PKR ${p.price.toLocaleString()})` : ''} | Stock: ${p.stock > 0 ? `${p.stock} units In Stock` : 'Out of Stock'} | Warranty: ${p.warranty} | Specs: ${specsStr || 'Standard'}`;
        })
        .join('\n')
    : 'Product catalog access is currently disabled by administrator.';

  const categoriesSummary = visibleCats
    .map(
      (c) =>
        `- ${c.name}: Subcategories: ${(c.subcategories || [])
          .filter((s) => s.isActive !== false)
          .map((s) => s.name)
          .join(', ') || 'General'}`
    )
    .join('\n');

  const partnersSummary = visiblePartners
    .map(
      (pt) =>
        `- ${pt.name} (${pt.country || 'Pakistan'}) — ${pt.partnerStatus || 'Certified Partner'} | Certification: ${pt.certification || 'Verified'} | Categories: ${(pt.categories || []).join(', ')}`
    )
    .join('\n');

  const customerOrderContext =
    canAccessOrders && customerAccount
      ? customerOwnOrders.length > 0
        ? `AUTHENTICATED CUSTOMER (${customerAccount.fullName || customerAccount.email}) ORDERS:\n` +
          customerOwnOrders
            .map(
              (o) =>
                `- Order #${o.orderNumber}: Status="${o.status}", Payment="${o.paymentStatus}" (PKR ${o.grandTotal.toLocaleString()} COD),Placed: ${new Date(o.createdAt).toLocaleDateString()}, Items: ${o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}${o.trackingNumber ? `, Tracking: ${o.trackingNumber} (${o.courierName || 'Courier'})` : ''}`
            )
            .join('\n')
        : `AUTHENTICATED CUSTOMER (${customerAccount.fullName || customerAccount.email}) currently has 0 orders on record.`
      : 'CUSTOMER IS NOT SIGNED IN (Guest Session). For privacy, you CANNOT access or reveal any specific order details unless the customer signs in to their account first.';

  const customAdminInstructions = settings.aiSystemInstructions
    ? `\nADDITIONAL ADMIN INSTRUCTIONS:\n${settings.aiSystemInstructions}\n`
    : '';

  const systemInstruction = `You are "M.A. SMART ASSISTANT" ("${settings.aiTagline || 'Your intelligent shopping assistant.'}"), the official AI shopping assistant for "M.A. GROUP OF COMPANIES".

OUR STORE PROFILE & POLICIES:
- Brand Name: M.A. GROUP OF COMPANIES
- Assistant Name: M.A. SMART ASSISTANT
- Primary Market: Pakistan (Nationwide delivery).
- Payment Method: Cash on Delivery (COD) in PKR. Customers pay cash at their doorstep upon delivery inspection.
- Currency: Pakistani Rupees (PKR).
- Shipping: Free delivery across Pakistan on orders above PKR ${(settings.freeShippingThreshold || 5000).toLocaleString()}. Standard delivery fee PKR ${settings.standardShippingFee || 450}.
- Contact Email: ${settings.contactEmail || 'info@magroupofcompanies.pk'}${settings.contactPhone ? ` | Phone: ${settings.contactPhone}` : ''}.

LIVE CATEGORIES & SUBCATEGORIES:
${categoriesSummary}

CERTIFIED MANUFACTURING PARTNERS:
${partnersSummary}

LIVE SUPABASE PRODUCT CATALOG (GROUNDED SOURCE OF TRUTH):
${catalogSummary}

AUTHENTICATED CUSTOMER ORDER CONTEXT:
${customerOrderContext}
${customAdminInstructions}
CRITICAL AI SAFETY & ACCURACY RULES:
1. NEVER invent products, prices, stock quantities, specifications, certifications, manufacturer relationships, or warranties. Only use the exact data listed above.
2. If a customer asks for a product or budget (e.g., "solar inverter under PKR 200,000") and no matching product exists in the live catalog under that budget, clearly and honestly state that there are currently no matching products under that price in our catalog, and show the closest actual available option with its real PKR price.
3. When comparing two or more products, compare their actual database attributes: Price (PKR), Brand, Specifications, Warranty, and Stock Availability.
4. For technical shopping advice (such as choosing a solar system), ask helpful clarifying questions when needed:
   - Estimated electricity usage, number of ACs, number of fans, refrigerator, other appliances, day/night usage, and battery backup requirements.
   - Then recommend matching available products from our catalog or suggest requesting a formal quotation via our B2B / Wholesale section.
5. PRIVACY & SECURITY: Never reveal another customer's order, personal data, admin credentials, or database keys. If a guest asks to check an order, politely ask them to sign in to their account or use the "Track Order" page with their Order ID and registered phone number.`;

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
          temperature: 0.4,
        },
      });

      if (response && response.text) {
        replyText = response.text;
      }
    } catch (error) {
      console.warn('Gemini generateContent error, switching to grounded catalog rule engine:', error);
    }
  }

  const q = userQuery.toLowerCase();

  if (!replyText) {
    // Check if user is asking about orders / tracking
    if (q.includes('track') || q.includes('my order') || q.includes('order status') || q.includes('mag-')) {
      if (!canAccessOrders) {
        replyText =
          'Order lookup via chat is currently disabled. Please use the **Track Order** page in the top navigation bar with your Order ID (e.g., `MAG-9214`) and phone number.';
      } else if (customerAccount && customerOwnOrders.length > 0) {
        const orderLines = customerOwnOrders
          .slice(0, 3)
          .map(
            (o) =>
              `• **Order #${o.orderNumber}** — Status: **${o.status}** | Total: **PKR ${o.grandTotal.toLocaleString()}** (${o.paymentStatus})${o.trackingNumber ? ` | Tracking: \`${o.trackingNumber}\`` : ''}`
          )
          .join('\n');
        replyText = `Here is the live status of your authenticated account orders with **M.A. GROUP OF COMPANIES**:\n\n${orderLines}\n\nYou can also view full delivery timelines and print your official invoice under **My Account → My Orders**.`;
      } else if (customerAccount && customerOwnOrders.length === 0) {
        replyText = `Hello ${customerAccount.fullName || ''}! You are signed in, but there are currently no orders linked to your account (${customerAccount.email}). If you placed an order as a guest, you can track it anytime on the **Track Order** page using your Order Number and phone number.`;
      } else {
        replyText =
          'To protect customer privacy, **M.A. SMART ASSISTANT** only displays order details for your own signed-in account.\n\nPlease **Sign In** via the Account menu to view your orders here, or visit the **Track Order** page with your Order ID and registered phone number.';
      }
    } else if (q.includes('under') || q.includes('budget') || q.includes('below') || q.includes('less than')) {
      // Parse numeric budget from query (e.g. "under PKR 200,000" or "under 50000")
      const numMatch = userQuery.replace(/,/g, '').match(/(\d{3,8})/);
      const budget = numMatch ? Number(numMatch[1]) : null;
      const categoryKeyword = ['solar', 'inverter', 'panel', 'battery', 'cable', 'wire', 'breaker', 'switch', 'sanitary', 'faucet', 'basin', 'hob', 'hood', 'ev', 'bike', 'tool', 'drill'].find((kw) =>
        q.includes(kw)
      );

      let pool = activeProducts;
      if (categoryKeyword) {
        pool = activeProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(categoryKeyword) ||
            p.categoryName.toLowerCase().includes(categoryKeyword) ||
            (p.subcategoryName || '').toLowerCase().includes(categoryKeyword) ||
            p.description.toLowerCase().includes(categoryKeyword)
        );
      }

      if (budget !== null) {
        const withinBudget = pool
          .filter((p) => (p.salePrice || p.price) <= budget)
          .sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));

        if (withinBudget.length > 0) {
          const list = withinBudget
            .slice(0, maxRecs)
            .map(
              (p) =>
                `• **${p.name}** (SKU: \`${p.sku}\`) — **PKR ${(p.salePrice || p.price).toLocaleString()}** | Stock: ${p.stock > 0 ? `${p.stock} In Stock` : 'Out of Stock'} | Warranty: ${p.warranty}`
            )
            .join('\n');
          replyText = `Here are the matching products from the **M.A. GROUP OF COMPANIES** catalog under **PKR ${budget.toLocaleString()}**:\n\n${list}\n\nAll items are available via **Cash on Delivery (COD)** across Pakistan.`;
        } else {
          const closest = [...pool].sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price))[0];
          replyText = `We currently do not have a matching ${categoryKeyword || 'product'} under **PKR ${budget.toLocaleString()}** in our live catalog.${
            closest
              ? `\n\nThe closest genuine option available in our catalog is:\n• **${closest.name}** (SKU: \`${closest.sku}\`) — **PKR ${(closest.salePrice || closest.price).toLocaleString()}** (${closest.warranty})`
              : ''
          }\n\nPlease let me know if you would like to explore other categories or adjust your budget!`;
        }
      } else {
        const affordable = [...activeProducts]
          .sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price))
          .slice(0, maxRecs)
          .map(
            (p) =>
              `• **${p.name}** (SKU: \`${p.sku}\`) — **PKR ${(p.salePrice || p.price).toLocaleString()}** (${p.categoryName})`
          )
          .join('\n');
        replyText = `Please share your target budget in **PKR** and the product category you are looking for (e.g., *"Solar inverter under PKR 350,000"* or *"Kitchen hob under PKR 40,000"*).\n\nHere are some of our popular value picks across the catalog:\n\n${affordable}`;
      }
    } else if (q.includes('compare')) {
      const sample = activeProducts.slice(0, 2);
      if (sample.length === 2) {
        replyText = `I can compare any products from our live catalog side-by-side! Here is a comparison of two popular items:\n\n1. **${sample[0].name}** (SKU: \`${sample[0].sku}\`)\n   - **Brand:** ${sample[0].brand}\n   - **Price:** PKR ${(sample[0].salePrice || sample[0].price).toLocaleString()}\n   - **Warranty:** ${sample[0].warranty}\n   - **Availability:** ${sample[0].stock > 0 ? `${sample[0].stock} units In Stock` : 'Out of Stock'}\n\n2. **${sample[1].name}** (SKU: \`${sample[1].sku}\`)\n   - **Brand:** ${sample[1].brand}\n   - **Price:** PKR ${(sample[1].salePrice || sample[1].price).toLocaleString()}\n   - **Warranty:** ${sample[1].warranty}\n   - **Availability:** ${sample[1].stock > 0 ? `${sample[1].stock} units In Stock` : 'Out of Stock'}\n\nTell me which two products or categories you would like me to compare!`;
      }
    } else if (q.includes('help me choose') || q.includes('solar') || q.includes('inverter') || q.includes('panel') || q.includes('battery')) {
      const solarProds = activeProducts.filter(
        (p) => p.categoryId === 'cat-solar' || p.categoryName.toLowerCase().includes('solar')
      );
      const items = solarProds
        .slice(0, maxRecs)
        .map(
          (p) =>
            `• **${p.name}** (SKU: \`${p.sku}\`) — **PKR ${(p.salePrice || p.price).toLocaleString()}** | ${p.warranty} | ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}`
        )
        .join('\n');
      replyText = `I would be happy to help you choose the right solar or electrical solution! To give you an exact recommendation, please share:\n- **Number of ACs** (e.g., 1x or 2x 1.5-Ton Inverter ACs)\n- **Number of Fans & Lights**\n- **Refrigerator / Water Pump usage**\n- **Daytime vs. Nighttime backup requirements**\n\nHere are the verified solar products currently available in our catalog:\n\n${items}`;
    } else if (q.includes('contact') || q.includes('support') || q.includes('quote')) {
      replyText = `You can reach **M.A. GROUP OF COMPANIES** through any of the following official channels:\n\n• **Email:** ${settings.contactEmail || 'info@magroupofcompanies.pk'}\n${settings.contactPhone ? `• **Phone:** ${settings.contactPhone}\n` : ''}• **B2B & Project Quotations:** Click **Contact** or **B2B / Wholesale** in the navigation menu to request a customized commercial quote.\n• **Payment & Delivery:** Nationwide Cash on Delivery (COD) in PKR across Pakistan.`;
    } else {
      const matched = activeProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          (p.subcategoryName || '').toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => q.includes(t.toLowerCase()))
      );
      if (matched.length > 0) {
        const top = matched
          .slice(0, maxRecs)
          .map(
            (p) =>
              `• **${p.name}** (SKU: \`${p.sku}\`) — **PKR ${(p.salePrice || p.price).toLocaleString()}** [${p.stock > 0 ? `${p.stock} In Stock` : 'Out of Stock'}] (${p.warranty})`
          )
          .join('\n');
        replyText = `Here are the matching products from the **M.A. GROUP OF COMPANIES** live Supabase catalog:\n\n${top}\n\nAll items are backed by official warranty and nationwide **Cash on Delivery (COD)**.`;
      } else {
        const featured = activeProducts
          .slice(0, maxRecs)
          .map(
            (p) =>
              `• **${p.name}** (SKU: \`${p.sku}\`) — **PKR ${(p.salePrice || p.price).toLocaleString()}** (${p.categoryName})`
          )
          .join('\n');
        replyText = `Hello! I'm **M.A. SMART ASSISTANT**. I can help you search products by category or subcategory, filter within your PKR budget, compare technical specifications, or check your order status.\n\nHere are some featured items from our live catalog:\n\n${featured}`;
      }
    }
  }

  // Match recommended products from reply or query
  const lowerReply = replyText.toLowerCase();
  const recommended = canAccessCatalog
    ? activeProducts
        .filter((p) => {
          const skuMatch = p.sku && (lowerReply.includes(p.sku.toLowerCase()) || q.includes(p.sku.toLowerCase()));
          const nameWords = p.name
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3);
          const nameHit =
            nameWords.length > 0 && nameWords.slice(0, 3).every((w) => lowerReply.includes(w) || q.includes(w));
          return skuMatch || nameHit;
        })
        .slice(0, maxRecs)
        .map((p) => p.id)
    : [];

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

