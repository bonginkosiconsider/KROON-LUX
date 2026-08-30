import type { Timestamp } from "firebase/firestore";

export type FirestoreTimestamp = Timestamp | null;

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number;
  productType?: "simple" | "variable" | "grouped" | "external" | "downloadable" | "virtual";
  shortDescription?: string;
  sku?: string;
  stockStatus?: "in-stock" | "out-of-stock";
  backorders?: "not-allowed" | "allowed" | "allowed-with-notice";
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  shippingClass?: string;
  attributes?: { name: string; values: string }[];
  variations?: { name: string; price: number; inventoryCount: number }[];
  metaTitle?: string;
  metaDescription?: string;
  categories?: string[];
  tags?: string[];
  status?: "draft" | "published" | "pending-review" | "private";
  visibility?: "shop-and-search" | "shop-only" | "search-only" | "hidden";
  category: string;
  inventoryCount: number;
  imageUrls: string[];
  isPublished: boolean;
  featured: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

export type ProductInput = Omit<Product, "id" | "slug" | "createdAt" | "updatedAt"> & { slug?: string };

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
  totalAmount: number;
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
