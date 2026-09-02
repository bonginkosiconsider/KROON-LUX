"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useProducts } from "@/hooks/use-products";
import { useAdminCategories } from "@/hooks/use-admin-categories";
import { slugify } from "@/lib/firebase-models";
import { reorderCategoryProducts, subscribeCategoryProductOrder } from "@/services/firebase-categories";

export function AdminCategoryProductsClient() {
  const params = useParams<{ slug: string }>();
  const { products, loading } = useProducts(false);
  const categories = useAdminCategories();
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const categoryName = categories.find((item) => slugify(item) === params.slug);
  const items = useMemo(() => categoryName ? products.filter((product) => product.category === categoryName || product.categories?.includes(categoryName)) : [], [categoryName, products]);
  useEffect(() => categoryName ? subscribeCategoryProductOrder(slugify(categoryName), setProductOrder) : undefined, [categoryName]);
  const orderedItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return [...productOrder.filter((id) => byId.has(id)).map((id) => byId.get(id)!), ...items.filter((item) => !productOrder.includes(item.id))];
  }, [items, productOrder]);

  async function dropProduct(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    if (!draggedId || draggedId === targetId || !categoryName) return;
    const next = [...orderedItems];
    const from = next.findIndex((item) => item.id === draggedId);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    const ids = next.map((item) => item.id);
    setProductOrder(ids); setDraggedId(null);
    await reorderCategoryProducts(slugify(categoryName), ids).catch(() => undefined);
  }

  if (!categoryName && !loading) return <section className="admin-panel category-products-page"><h1>Category not found</h1><Link className="button button-secondary" href="/admin/categories">Back to categories</Link></section>;

  return <>
    <header className="admin-page-header"><div><p className="eyebrow">Catalogue</p><h1>{categoryName ?? "Loading category…"}</h1><p>Products assigned to this category.</p></div><Link className="button button-secondary" href="/admin/categories">Back to categories</Link></header>
    <section className="admin-panel category-products-page"><div className="section-heading tight"><h2>Products</h2><span>{loading ? "Loading…" : `${items.length} product${items.length === 1 ? "" : "s"}`}</span></div>
      {orderedItems.length ? <div className="category-product-list">{orderedItems.map((product, index) => <div className={`category-product-list-row${draggedId === product.id ? " is-dragging" : ""}`} draggable key={product.id} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDragStart={() => setDraggedId(product.id)} onDrop={(event) => void dropProduct(event, product.id)}><span className="category-list-number">{index + 1}</span><span className="category-drag-handle">⠿</span><Link className="category-product-card" href={`/admin/products?edit=${product.id}`}>{product.imageUrls[0] ? <img alt="" src={product.imageUrls[0]} /> : <span className="admin-product-thumbnail-placeholder" />}<span><strong>{product.title}</strong><small>{product.sku || "No SKU"} · {product.status ?? (product.isPublished ? "Active" : "Draft")}</small></span></Link></div>)}</div> : <p className="empty-catalog">{loading ? "Loading products…" : "No products are assigned to this category."}</p>}
    </section>
  </>;
}
