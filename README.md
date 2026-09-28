# M.A. GROUP OF COMPANIES — Full-Stack E-Commerce Platform

Official production-ready e-commerce platform for **M.A. GROUP OF COMPANIES**, serving retail and B2B customers across Pakistan.

## 1. System Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, responsive mobile-first architecture.
- **Backend API**: Node.js, Express, TypeScript, full REST API with strict server-side authorization.
- **Database & Storage**: Structured relational schema with zero-setup file persistence in `data/store.json`, ready for PostgreSQL / Cloud SQL via standard SQL/Prisma/Drizzle schema.
- **Payment Method**: Strictly **Cash on Delivery (COD)** across all Pakistani cities.
- **AI Integration**: Server-side `@google/genai` with model `gemini-3.8-flash` for the **M.A. Smart Assistant**, grounded directly in the live catalog with no hallucinations.
- **Security**: Timing-safe Master Secret verification (`crypto.timingSafeEqual`), brute-force IP rate limiting, HTTP-only secure cookie sessions, and audit logging.

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env`:

```env
# AI Studio & Gemini API Keys
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
AI_API_KEY="YOUR_AI_API_KEY"

# Host URL
APP_URL="https://your-domain.com"

# Relational Database (Optional PostgreSQL Production Connection)
DATABASE_URL="postgres://user:password@localhost:5432/magroup_db"

# Session & Auth
AUTH_SECRET="your_production_auth_secret_token_change_in_prod"

# Admin Master Secret: Private secret read ONLY by the server for superadmin access
ADMIN_MASTER_SECRET=your_actual_secret_here

# Object Storage (S3 / Cloud Storage)
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
```

---

## 3. Administrator Access

- **Admin Route**: Access via `#/secure-admin`
- **Authentication**:
  1. **Master Secret Mode**: Enter your private `ADMIN_MASTER_SECRET` value. Verification is executed 100% on the server in constant time with brute-force rate limiting.
  2. **Staff Credentials Mode**: Default manager account `admin@magroup.pk` / `Admin@MAGroup2026`.

### Admin Capabilities:
- **Dashboard Overview**: Live sales in PKR, total orders, pending verification queue, low-stock alerts.
- **Product Management**: Full CRUD, multiple image URLs, technical specifications, warranties, SKU, pricing, discounts, stock levels.
- **Category & Subcategory Management**: Unlimited nested categories with custom icons.
- **Order & COD Tracking**: Search orders, change order status (`Pending`, `Confirmed`, `Processing`, `Packed`, `Shipped`, `Out for Delivery`, `Delivered`), update COD collection status (`COD Pending`, `COD Collected`), add courier tracking numbers (TCS, Leopards, Trax).
- **Hero Slider**: Manage homepage banners, headings, promotional messages, and CTA buttons.
- **Coupons**: Percentage and fixed PKR discount codes with minimum order constraints.
- **B2B Wholesale Quotations**: View and process contractor inquiries.
- **AI Admin Assistant**: Automated product description generation, SEO meta tags, and inventory trend summaries.
- **Store & COD Settings**: Update helpline, Lahore/Karachi/Islamabad showroom addresses, WhatsApp number, and free shipping minimums.

---

## 4. Cash on Delivery (COD) Workflow

1. Customer selects equipment and proceeds to checkout.
2. Customer enters contact number, delivery address, and selects their Pakistani city (e.g. Lahore, Karachi, Islamabad, Faisalabad, Multan, Peshawar, Quetta, etc.).
3. The order is recorded with status `Pending` and payment status `COD Pending`.
4. M.A. Group logistics dispatches parcel with courier consignment number.
5. Customer tracks delivery progression live at `#/track-order`.
6. Courier delivers package; customer inspects seal and pays cash to courier upon receipt.

---

## 5. Development & Production Commands

```bash
# Install dependencies
npm install

# Start development full-stack server (Port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check / Lint
npm run lint
```
