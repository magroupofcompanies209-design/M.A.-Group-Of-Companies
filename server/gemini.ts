import { GoogleGenAI } from '@google/genai';
import { db } from './db.ts';

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

export async function askShoppingAssistant(
  userQuery: string,
  chatHistory: { role: 'user' | 'model'; text: string }[] = []
): Promise<string> {
  const products = db.getProducts();
  const categories = db.getCategories();
  const settings = db.getSettings();

  // Create real-time catalog context
  const catalogSummary = products
    .filter((p) => p.status === 'active')
    .map(
      (p) =>
        `- [${p.categoryName}] ${p.name} (SKU: ${p.sku}, Price: Rs. ${p.price.toLocaleString()}, Stock: ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}, Warranty: ${p.warranty}). Key Features: ${p.features.slice(0, 3).join('; ')}`
    )
    .join('\n');

  const systemInstruction = `You are "M.A. Smart Assistant", the knowledgeable technical sales and engineering advisor for "M.A. GROUP OF COMPANIES" (Headquartered in Lahore, Pakistan).

OUR STORE PROFILE & POLICIES:
- Store Name: M.A. GROUP OF COMPANIES
- Primary Market: Pakistan (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, and all cities).
- Payment Method: ONLY Cash on Delivery (COD). Customers pay cash at their doorstep to courier upon inspection.
- Currency: Pakistani Rupees (PKR / Rs.).
- Shipping: Free delivery across Pakistan on orders above Rs. ${settings.freeShippingThreshold.toLocaleString()}. Standard delivery Rs. ${settings.standardShippingFee}. Delivery within 2-4 business days.
- Showrooms: Lahore (Montgomery Road), Karachi (Saddar Electrical Market), Islamabad (I-9 Industrial).
- Contact: ${settings.contactPhone} / WhatsApp: ${settings.whatsappNumber}.

STORE REAL PRODUCT CATALOG (YOU MUST ONLY RECOMMEND THESE PRODUCTS):
${catalogSummary}

CRITICAL RULES:
1. ONLY recommend real products that exist in our catalog above. NEVER invent products, prices, fake warranty periods, or nonexistent specs.
2. If asked about solar sizing (e.g. for a 1.5-ton inverter AC or 5-Marla / 10-Marla house):
   - A 1.5-ton inverter AC consumes approx 1.2kW - 1.8kW during startup/run.
   - For 1 AC + fans + fridge: recommend at least a 3kW to 6kW Hybrid Inverter (like the Inverex Nitrox 6kW) with 6 to 10 Mono PERC 550W panels and a 48V Lithium or tubular battery.
   - Quote exact prices in PKR from our catalog.
3. If asked about electrical cables or switches, explain safety specs (e.g., Pakistan Cables 99.99% pure copper 70/0.0076 for AC lines/power circuits, Schneider Acti9 breakers).
4. If asked about kitchen equipment, recommend our Corona 3-burner gas hobs and 90cm gesture-control auto-clean hoods.
5. If asked about EV motorbikes, describe the Crown EV Volt 72V (100km range, Rs. 150 charging cost, zero petrol).
6. Always maintain a polite, professional, and helpful tone. Mention Cash on Delivery availability across Pakistan.`;

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
          temperature: 0.7,
        },
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (error) {
      console.warn('Gemini generateContent error, switching to catalog rule fallback:', error);
    }
  }

  // Graceful catalog-grounded fallback
  const q = userQuery.toLowerCase();
  const matched = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.tags.some((t) => q.includes(t))
  );

  if (q.includes('solar') || q.includes('inverter') || q.includes('panel') || q.includes('battery')) {
    const solarProds = products.filter((p) => p.categoryId === 'cat-solar');
    const items = solarProds.slice(0, 3).map((p) => `• **${p.name}** - Rs. ${p.price.toLocaleString()} (${p.warranty})`).join('\n');
    return `Hello! For solar systems in Pakistan, M.A. GROUP OF COMPANIES supplies Tier-1 certified equipment with official manufacturer warranties:\n\n${items}\n\nWe provide free shipping and 100% Cash on Delivery (COD) across Pakistan. Would you like a sizing calculation based on your home appliances?`;
  }

  if (q.includes('cable') || q.includes('wire') || q.includes('breaker') || q.includes('switch')) {
    const elecProds = products.filter((p) => p.categoryId === 'cat-electrical');
    const items = elecProds.slice(0, 3).map((p) => `• **${p.name}** - Rs. ${p.price.toLocaleString()}`).join('\n');
    return `M.A. GROUP OF COMPANIES is an authorized distributor of 99.99% pure copper cables and certified circuit breakers:\n\n${items}\n\nAll electrical accessories are delivered directly via Cash on Delivery (COD) anywhere in Pakistan.`;
  }

  if (q.includes('hob') || q.includes('hood') || q.includes('kitchen')) {
    const kitchenProds = products.filter((p) => p.categoryId === 'cat-hobs-hoods');
    const items = kitchenProds.map((p) => `• **${p.name}** - Rs. ${p.price.toLocaleString()}`).join('\n');
    return `Our Italian-inspired kitchen appliances collection includes:\n\n${items}\n\nFeatures include auto-ignition, heavy brass burners, and wave-gesture suction hoods with full warranty.`;
  }

  if (q.includes('ev') || q.includes('bike') || q.includes('electric bike')) {
    const evProds = products.filter((p) => p.categoryId === 'cat-ev-bikes');
    const items = evProds.map((p) => `• **${p.name}** - Rs. ${p.price.toLocaleString()}`).join('\n');
    return `Our Green Mobility division features the Crown EV Volt 72V Electric Commuter Motorbike:\n\n${items}\n\nDelivers a 100 km real-world range per charge (under Rs. 150 electricity cost) with 3 years battery warranty and doorstep COD delivery!`;
  }

  if (matched.length > 0) {
    const top = matched.slice(0, 3).map((p) => `• **${p.name}** (SKU: ${p.sku}) - Rs. ${p.price.toLocaleString()} [${p.stock > 0 ? 'In Stock' : 'Out of Stock'}]`).join('\n');
    return `Here are the matching products from the M.A. GROUP OF COMPANIES catalog:\n\n${top}\n\nAll products come with genuine manufacturer warranty and Cash on Delivery (COD) across Pakistan. How can I assist you with your project?`;
  }

  return `Welcome to M.A. GROUP OF COMPANIES! We provide certified Electrical, Solar, Sanitary, Hardware, Hobs & Kitchen Hoods, and EV Bikes across Pakistan with 100% Cash on Delivery. Feel free to ask about product specifications, solar sizing calculations, or order delivery!`;
}

export async function generateAdminCopy(prompt: string, type: 'product_description' | 'seo_meta' | 'inventory_insight'): Promise<string> {
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an expert e-commerce copywriter and inventory analyst for M.A. GROUP OF COMPANIES, a premium industrial and residential supplier in Pakistan.\n\nTask Type: ${type}\nPrompt: ${prompt}\n\nProvide concise, professional, production-grade output formatted in Markdown.`,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (e) {
      console.warn('Gemini error for admin copy:', e);
    }
  }

  return `### AI Recommendation for: ${prompt}\n- High quality engineering standard meeting Pakistani electrical & building compliance.\n- Tested under local environmental conditions.\n- Recommended customer warranty: 2 to 5 years.\n- Target search keywords: genuine Pakistan distributor, COD electrical store.`;
}
