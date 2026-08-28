"use client";

import { useEffect, useState } from "react";
import { dateLabel, type Order } from "@/lib/firebase-models";
import { subscribeOrders, updateOrderShippingStatus } from "@/services/firebase-orders";

const statuses: Order["shippingStatus"][] = ["pending", "processing", "shipped", "delivered", "cancelled"];

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => subscribeOrders((next) => { setOrders(next); setLoading(false); }), []);
  return { orders, loading };
}

export function AdminOrdersClient() {
  const { orders, loading } = useOrders();
  const [message, setMessage] = useState("");
  return <section className="admin-panel"><div className="section-heading tight"><div><p className="eyebrow gold">Fulfillment</p><h2>Live orders</h2></div><span>{loading ? "Loading…" : `${orders.length} orders`}</span></div><div className="admin-table"><div className="admin-table-row admin-table-head"><span>Order</span><span>Customer</span><span>Items</span><span>Total</span><span>Payment</span><span>Shipping status</span></div>{orders.length ? orders.map((order) => <div className="admin-table-row" key={order.id}><span>{order.id.slice(0, 8)}<small>{dateLabel(order.createdAt)}</small></span><span>{order.customer?.name ?? "Customer"}<small>{order.customer?.email}</small></span><span>{order.items?.reduce((total, item) => total + item.quantity, 0) ?? 0}</span><span>R {(order.totalAmount ?? 0).toFixed(2)}</span><span>{order.paymentStatus}</span><span><select aria-label={`Shipping status for ${order.id}`} value={order.shippingStatus} onChange={async (event) => { try { await updateOrderShippingStatus(order.id, event.target.value as Order["shippingStatus"]); } catch { setMessage("Order status could not be updated."); } }}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></span></div>) : <p className="empty-catalog">No Firebase orders have been created yet.</p>}</div>{message ? <p className="form-message">{message}</p> : null}</section>;
}
