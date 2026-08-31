"use client";

import Link from "next/link";
import { useProducts } from "@/hooks/use-products";
import { useOrders } from "@/components/firebase/AdminOrdersClient";
import { dateLabel } from "@/lib/firebase-models";

export function AdminDashboardClient() {
  const { products } = useProducts(false);
  const { orders } = useOrders();
  const paid = orders.filter((order) => order.paymentStatus === "paid");
  const revenue = paid.reduce((total, order) => total + (order.totalAmount || 0), 0);
  const lowStock = products.filter((product) => product.inventoryCount <= 5);
  return <><section className="admin-grid"><article><p className="eyebrow">Revenue</p><strong>R {revenue.toFixed(2)}</strong><span>Paid orders</span></article><article><p className="eyebrow">Orders</p><strong>{orders.length}</strong><span>All-time orders</span></article><article><p className="eyebrow">Published</p><strong>{products.filter((product) => product.isPublished).length}</strong><span>Live products</span></article><article><p className="eyebrow">Attention</p><strong>{lowStock.length}</strong><span>Low-stock products</span></article></section><section className="admin-dashboard-columns"><section className="admin-panel"><div className="section-heading tight"><div><p className="eyebrow">Latest activity</p><h2>Recent orders</h2></div><Link className="text-link" href="/admin/orders">View all</Link></div>{orders.length ? <div className="admin-activity-list">{orders.slice(0, 5).map((order) => <div key={order.id}><span><strong>#{order.id.slice(0, 8)}</strong><small>{order.customer?.name ?? "Customer"} · {dateLabel(order.createdAt)}</small></span><b>R {(order.totalAmount ?? 0).toFixed(2)}</b><em className={`status status-${order.shippingStatus}`}>{order.shippingStatus}</em></div>)}</div> : <p className="empty-catalog">Orders will appear here as customers check out.</p>}</section><section className="admin-panel"><div className="section-heading tight"><div><p className="eyebrow">Inventory</p><h2>Needs attention</h2></div><Link className="text-link" href="/admin/products">Manage products</Link></div>{lowStock.length ? <div className="admin-activity-list">{lowStock.slice(0, 5).map((product) => <div key={product.id}><span><strong>{product.title}</strong><small>{product.category}</small></span><b>{product.inventoryCount} left</b></div>)}</div> : <p className="empty-catalog">All products have more than five units in stock.</p>}</section></section><section className="admin-welcome"><div><p className="eyebrow">Quick actions</p><h2>Manage your store.</h2><p>Add a product, fulfil orders, or invite a promoter. Changes update in Firebase immediately.</p></div><div><Link className="button button-primary" href="/admin/products">Add product</Link><Link className="button button-secondary" href="/admin/promoters">Manage promoters</Link></div></section></>;
}
