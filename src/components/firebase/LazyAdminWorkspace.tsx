"use client";

import dynamic from "next/dynamic";

const Products = dynamic(() => import("@/components/firebase/AdminProductsClient").then((module) => module.AdminProductsClient), {
  ssr: false,
  loading: () => <div className="admin-workspace-loading">Loading product workspace...</div>,
});
const Orders = dynamic(() => import("@/components/firebase/AdminOrdersClient").then((module) => module.AdminOrdersClient), {
  ssr: false,
  loading: () => <div className="admin-workspace-loading">Loading orders...</div>,
});
const Promoters = dynamic(() => import("@/components/firebase/AdminPromotersClient").then((module) => module.AdminPromotersClient), {
  ssr: false,
  loading: () => <div className="admin-workspace-loading">Loading promoters...</div>,
});

export function LazyAdminWorkspace({ workspace }: { workspace: "products" | "orders" | "referrals" | "promoters" }) {
  if (workspace === "products") return <Products />;
  if (workspace === "orders") return <Orders />;
  return <Promoters />;
}
