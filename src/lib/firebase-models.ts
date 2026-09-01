import type { Timestamp } from "firebase/firestore";

export type FirestoreTimestamp = Timestamp | null;
export type ProductType = "simple" | "variable" | "grouped" | "external" | "downloadable" | "virtual";
export type ProductStockStatus = "in-stock" | "out-of-stock" | "on-backorder";
export type BackorderPolicy = "not-allowed" | "allowed" | "allowed-with-notice";
export type ProductStatus = "draft" | "published" | "pending-review" | "private";
export type ProductVisibility = "shop-and-search" | "shop-only" | "search-only" | "hidden";
export type ProductDimensions = { length?: number; width?: number; height?: number };
export type ProductAttribute = { name: string; values: string; usedForVariations?: boolean };
export type ProductVariation = {
  id: string;
  name: string;
  sku?: string;
  price: number;
  salePrice?: number;
  manageStock?: boolean;
  inventoryCount: number;
  lowStockThreshold?: number;
  stockStatus?: ProductStockStatus;
  imageUrl?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  attributes?: Record<string, string>;
};

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number;
  productType?: ProductType;
  shortDescription?: string;
  sku?: string;
  manageStock?: boolean;
  stockStatus?: ProductStockStatus;
  lowStockThreshold?: number;
  backorders?: BackorderPolicy;
  weight?: number;
  dimensions?: ProductDimensions;
  shippingClass?: string;
  attributes?: ProductAttribute[];
  variations?: ProductVariation[];
  metaTitle?: string;
  metaDescription?: string;
  categories?: string[];
  tags?: string[];
  status?: ProductStatus;
  visibility?: ProductVisibility;
  category: string;
  brandId?: string;
  brandName?: string;
  collectionIds?: string[];
  inventoryCount: number;
  imageUrls: string[];
  isPublished: boolean;
  featured: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

export type ProductInput = Omit<Product, "id" | "slug" | "createdAt" | "updatedAt"> & { slug?: string };

export type StoreTaxonomy = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  /** Brands created before this field existed are treated as active. */
  active?: boolean;
  /** Used only by the storefront brand lineup. */
  logoUrl?: string;
  sortOrder: number;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

export type Testimonial = {
  id: string;
  customerName: string;
  message: string;
  rating: number;
  imageUrl?: string;
  active: boolean;
  sortOrder: number;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

export type OrderItem = {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
};

export type Order = {
  id: string;
  customerId?: string;
  customer: { name: string; email: string; phone?: string; address?: string };
  items: OrderItem[];
  subtotalAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  referralCode?: string | null;
  promoterId?: string | null;
  referralDiscountPercent?: number | null;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  shippingStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

export type UserProfile = {
  id: string;
  email: string;
  role: "admin" | "customer";
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function dateLabel(value: FirestoreTimestamp) {
  return value ? value.toDate().toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "Just now";
}
