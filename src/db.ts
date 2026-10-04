/**
 * Client-side reference bridge to the application's Database & Sync types.
 * Note: The authoritative backend local store and `syncProducts` engine lives in `/server/db.ts`,
 * which is hydrated from Supabase (`products`, `categories`, `orders`) on startup and after every mutation in `/server/app.ts`.
 */
export type {
  Product,
  Category,
  Brand,
  Order,
  OrderItem,
  CustomerDetails,
  Coupon,
  Review,
  StoreSettings,
  HeroBanner,
  B2BInquiry,
} from './types/index';

export {
  supabase,
  isFrontendSupabaseConfigured,
  supabaseProjectId,
  fetchProductsFromSupabase,
  insertOrUpdateProductInSupabase,
  deleteProductInSupabase,
  fetchCategoriesFromSupabase,
  insertOrUpdateCategoryInSupabase,
  deleteCategoryInSupabase,
  fetchOrdersFromSupabase,
  insertOrderInSupabase,
  updateOrderInSupabase,
  deleteOrderInSupabase,
} from './lib/supabaseClient';
