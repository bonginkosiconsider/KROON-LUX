"use client";

import { useProducts } from "@/hooks/use-products";
import { useOrders } from "@/components/firebase/AdminOrdersClient";

export function AdminDashboardClient() {
  const { products } = useProducts(false);
  const { orders } = useOrders();
  const paid = orders.filter((order) => order.paymentStatus === "paid");
  const revenue = paid.reduce((total, order) => total + (order.totalAmount || 0), 0);
  return <><section className="admin-grid"><article><p className="eyebrow">Revenue</p><strong>R {revenue.toFixed(2)}</strong><span>Paid orders</span></article><article><p className="eyebrow">Orders</p><strong>{orders.length}</strong><span>Real-time total</span></article><article><p className="eyebrow">Products</p><strong>{products.filter((product) => product.isPublished).length}</strong><span>Published catalog</span></article><article><p className="eyebrow">Low stock</p><strong>{products.filter((product) => product.inventoryCount <= 5).length}</strong><span>5 units or less</span></article></section><section className="admin-panel"><p className="eyebrow gold">Firebase connected</p><h2>Operations are live.</h2><p>Product, inventory, and order changes update directly from Firestore.</p></section></>;
}
