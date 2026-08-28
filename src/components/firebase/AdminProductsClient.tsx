"use client";

import { FormEvent, useState } from "react";
import { useProducts } from "@/hooks/use-products";
import type { Product, ProductInput } from "@/lib/firebase-models";
import { createProduct, removeProduct, updateProduct } from "@/services/firebase-products";
import { uploadProductImage } from "@/services/firebase-storage";

const initial = { title: "", description: "", price: 0, category: "", inventoryCount: 0, imageUrls: [], isPublished: true, featured: false };

export function AdminProductsClient() {
  const { products, loading } = useProducts(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const product = editing ?? ({ id: "", slug: "", ...initial, createdAt: null, updatedAt: null } as Product);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage("");
    try {
      const uploaded = await Promise.all(images.map(uploadProductImage));
      const payload: ProductInput = { title: String(form.get("title")), description: String(form.get("description")), price: Number(form.get("price")), category: String(form.get("category")), inventoryCount: Number(form.get("inventoryCount")), imageUrls: [...product.imageUrls, ...uploaded], isPublished: form.get("isPublished") === "on", featured: form.get("featured") === "on" };
      if (editing) await updateProduct(editing.id, payload); else await createProduct(payload);
      setEditing(null); setImages([]); setMessage("Product saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Product could not be saved."); }
    finally { setBusy(false); }
  }

  return <div className="admin-products-workspace"><section className="admin-panel"><div className="section-heading tight"><div><p className="eyebrow gold">Catalog editor</p><h2>{editing ? "Edit product" : "New product"}</h2></div>{editing ? <button className="text-button" onClick={() => setEditing(null)}>Cancel edit</button> : null}</div><form className="admin-form" onSubmit={save}><label>Title<input name="title" defaultValue={product.title} required /></label><label>Description<textarea name="description" defaultValue={product.description} rows={4} /></label><div className="form-grid"><label>Price (ZAR)<input name="price" type="number" min="0" step="0.01" defaultValue={product.price} required /></label><label>Inventory<input name="inventoryCount" type="number" min="0" step="1" defaultValue={product.inventoryCount} required /></label></div><label>Category<input name="category" defaultValue={product.category} required /></label><label>Product images<input type="file" accept="image/*" multiple onChange={(event) => setImages(Array.from(event.target.files ?? []))} /></label>{product.imageUrls.length ? <div className="admin-image-list">{product.imageUrls.map((url) => <img key={url} src={url} alt="Product" />)}</div> : null}<div className="admin-checks"><label><input name="isPublished" type="checkbox" defaultChecked={product.isPublished} /> Published</label><label><input name="featured" type="checkbox" defaultChecked={product.featured} /> Featured</label></div>{message ? <p className="form-message">{message}</p> : null}<button className="button button-light" disabled={busy}>{busy ? "Saving…" : "Save product"}</button></form></section><section className="admin-panel"><div className="section-heading tight"><div><p className="eyebrow">Live catalog</p><h2>Listings</h2></div><span>{loading ? "Loading…" : `${products.length} products`}</span></div><div className="admin-table"><div className="admin-table-row admin-table-head"><span>Product</span><span>Category</span><span>Price</span><span>Inventory</span><span>State</span><span>Actions</span></div>{products.map((item) => <div className="admin-table-row" key={item.id}><span>{item.title}</span><span>{item.category}</span><span>R {item.price.toFixed(2)}</span><span>{item.inventoryCount}</span><span>{item.isPublished ? "Published" : "Draft"}</span><span className="admin-actions"><button className="text-button" onClick={() => { setEditing(item); setImages([]); }}>Edit</button><button className="text-button danger" onClick={() => { if (confirm(`Delete ${item.title}?`)) removeProduct(item.id).catch(() => setMessage("Product could not be deleted.")); }}>Delete</button></span></div>)}</div></section></div>;
}
