"use client";

import { FormEvent, useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { ProductMediaDropzone, type ProductMediaItem } from "@/components/firebase/ProductMediaDropzone";
import type { Product, ProductInput } from "@/lib/firebase-models";
import { createProduct, removeProduct, updateProduct } from "@/services/firebase-products";
import { uploadProductImage } from "@/services/firebase-storage";
import { useAdminCategories } from "@/hooks/use-admin-categories";

const tabs = ["General", "Inventory", "Shipping", "Attributes", "Variations", "SEO"] as const;
type Tab = typeof tabs[number];
const empty = { id: "", title: "", slug: "", description: "", shortDescription: "", price: 0, inventoryCount: 0, category: "", imageUrls: [], isPublished: false, featured: false, createdAt: null, updatedAt: null } as Product;

export function AdminProductsClient() {
  const { products, loading } = useProducts(false);
  const categoryOptions = useAdminCategories();
  const [editing, setEditing] = useState<Product | null>(null);
  const [tab, setTab] = useState<Tab>("General");
  const [media, setMedia] = useState<ProductMediaItem[]>([]);
  const [attributes, setAttributes] = useState<{ name: string; values: string }[]>([]);
  const [variations, setVariations] = useState<{ name: string; price: number; inventoryCount: number }[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const product = editing ?? empty;
  const startEdit = (next: Product | null) => {
    setMedia((current) => {
      current.forEach((item) => { if (item.file) URL.revokeObjectURL(item.url); });
      return (next?.imageUrls ?? []).map((url, index) => ({ id: `saved-${index}-${url}`, url }));
    });
    setEditing(next); setTab("General"); setAttributes(next?.attributes ?? []); setVariations(next?.variations ?? []); setMessage("");
  };

  function addMedia(files: File[]) {
    setMedia((current) => [...current, ...files.map((file) => ({ id: `upload-${crypto.randomUUID()}`, file, url: URL.createObjectURL(file) }))]);
  }

  function removeMedia(id: string) {
    setMedia((current) => current.filter((item) => {
      if (item.id === id && item.file) URL.revokeObjectURL(item.url);
      return item.id !== id;
    }));
  }

  function reorderMedia(fromId: string, toId: string) {
    setMedia((current) => {
      const from = current.findIndex((item) => item.id === fromId);
      const to = current.findIndex((item) => item.id === toId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("Uploading product details and images…");
    const form = new FormData(event.currentTarget);
    try {
      const uploaded = await Promise.all(media.map((item) => item.file ? uploadProductImage(item.file) : item.url));
      const status = String(form.get("status")) as Product["status"];
      const selectedCategories = categoryOptions.filter((name) => form.get(`category-${name}`) === "on");
      const payload: ProductInput = {
        title: String(form.get("title")).trim(), productType: String(form.get("productType")) as Product["productType"], price: Number(form.get("price")), salePrice: form.get("salePrice") ? Number(form.get("salePrice")) : undefined, description: String(form.get("description")), shortDescription: String(form.get("shortDescription")), sku: String(form.get("sku")), stockStatus: String(form.get("stockStatus")) as Product["stockStatus"], inventoryCount: Number(form.get("inventoryCount")), backorders: String(form.get("backorders")) as Product["backorders"], weight: Number(form.get("weight")) || undefined, dimensions: { length: Number(form.get("length")) || undefined, width: Number(form.get("width")) || undefined, height: Number(form.get("height")) || undefined }, shippingClass: String(form.get("shippingClass")), attributes, variations, slug: String(form.get("slug")), metaTitle: String(form.get("metaTitle")), metaDescription: String(form.get("metaDescription")), categories: selectedCategories, category: selectedCategories[0] ?? "Uncategorized", tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean), imageUrls: uploaded, status, visibility: String(form.get("visibility")) as Product["visibility"], isPublished: status === "published", featured: form.get("featured") === "on",
      };
      const wasEditing = Boolean(editing);
      if (editing) await updateProduct(editing.id, payload); else await createProduct(payload);
      const confirmation = status === "published"
        ? wasEditing ? "Product updated and published." : "Product published successfully."
        : wasEditing ? "Product updated successfully." : "Product saved as a draft.";
      startEdit(null); setMessage(confirmation);
    } catch (error) { setMessage(`Could not save product. ${error instanceof Error ? error.message : "Please try again."}`); } finally { setSaving(false); }
  }

  return <div className="product-manager"><div className="product-manager-heading"><div><h2>{editing ? `Edit: ${product.title}` : "Add new product"}</h2><p>Build a complete listing, add product media, then publish when ready.</p></div>{editing ? <button className="button button-secondary" onClick={() => startEdit(null)}>Add new</button> : null}</div><form className="product-editor" key={editing?.id ?? "new"} onSubmit={save}><div className="product-editor-main"><nav className="product-tabs">{tabs.map((item) => <button type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav><section className="admin-panel editor-panel">{tab === "General" && <><label>Product name<input name="title" defaultValue={product.title} required /></label><div className="form-grid"><label>Product type<select name="productType" defaultValue={product.productType ?? "simple"}>{["simple", "variable", "grouped", "external", "downloadable", "virtual"].map((type) => <option key={type} value={type}>{type === "external" ? "External / Affiliate" : type[0].toUpperCase() + type.slice(1)}</option>)}</select></label><label>Regular price (R)<input name="price" type="number" min="0" step="0.01" defaultValue={product.price} required /></label><label>Sale price (R)<input name="salePrice" type="number" min="0" step="0.01" defaultValue={product.salePrice} /></label></div><label>Full description<textarea name="description" rows={9} defaultValue={product.description} /></label><label>Short description<textarea name="shortDescription" rows={3} defaultValue={product.shortDescription} /></label></>}{tab === "Inventory" && <div className="form-grid"><label>SKU<input name="sku" defaultValue={product.sku} /></label><label>Stock status<select name="stockStatus" defaultValue={product.stockStatus ?? "in-stock"}><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option></select></label><label>Stock quantity<input name="inventoryCount" type="number" min="0" defaultValue={product.inventoryCount} /></label><label>Backorders<select name="backorders" defaultValue={product.backorders ?? "not-allowed"}><option value="not-allowed">Do not allow</option><option value="allowed">Allow</option><option value="allowed-with-notice">Allow with notice</option></select></label></div>}{tab === "Shipping" && <div className="form-grid"><label>Weight (kg)<input name="weight" type="number" min="0" step="0.01" defaultValue={product.weight} /></label><label>Shipping class<select name="shippingClass" defaultValue={product.shippingClass}><option value="">No shipping class</option><option>Standard</option><option>Oversized</option></select></label><label>Length (cm)<input name="length" type="number" min="0" defaultValue={product.dimensions?.length} /></label><label>Width (cm)<input name="width" type="number" min="0" defaultValue={product.dimensions?.width} /></label><label>Height (cm)<input name="height" type="number" min="0" defaultValue={product.dimensions?.height} /></label></div>}{tab === "Attributes" && <div className="attribute-editor"><p>Define values such as colour, size, or material.</p>{attributes.map((attribute, index) => <div className="attribute-row" key={index}><input value={attribute.name} onChange={(event) => setAttributes((all) => all.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} placeholder="Attribute name" /><input value={attribute.values} onChange={(event) => setAttributes((all) => all.map((item, i) => i === index ? { ...item, values: event.target.value } : item))} placeholder="Values, separated by commas" /><button type="button" className="text-button danger" onClick={() => setAttributes((all) => all.filter((_, i) => i !== index))}>Remove</button></div>)}<button type="button" className="button button-secondary" onClick={() => setAttributes((all) => [...all, { name: "", values: "" }])}>Add attribute</button></div>}{tab === "Variations" && <div className="attribute-editor"><button type="button" className="button button-secondary" onClick={() => setVariations(attributes.flatMap((attribute) => attribute.values.split(",").filter(Boolean).map((value) => ({ name: `${attribute.name}: ${value.trim()}`, price: product.price, inventoryCount: 0 }))))}>Generate variations</button>{variations.map((variation, index) => <div className="variation-row" key={index}><strong>{variation.name}</strong><input type="number" value={variation.price} onChange={(event) => setVariations((all) => all.map((item, i) => i === index ? { ...item, price: Number(event.target.value) } : item))} /><input type="number" value={variation.inventoryCount} onChange={(event) => setVariations((all) => all.map((item, i) => i === index ? { ...item, inventoryCount: Number(event.target.value) } : item))} /></div>)}</div>}{tab === "SEO" && <div className="form-grid"><label>Slug<input name="slug" defaultValue={product.slug} /></label><label>Meta title<input name="metaTitle" defaultValue={product.metaTitle} /></label><label className="wide-field">Meta description<textarea name="metaDescription" rows={4} defaultValue={product.metaDescription} /></label></div>}</section></div><aside className="product-editor-aside"><section className="admin-panel editor-panel"><h3>Publish</h3><label>Status<select name="status" defaultValue={product.status ?? (product.isPublished ? "published" : "draft")}><option value="draft">Draft</option><option value="published">Published</option><option value="pending-review">Pending review</option><option value="private">Private</option></select></label><label>Visibility<select name="visibility" defaultValue={product.visibility ?? "shop-and-search"}><option value="shop-and-search">Shop and search</option><option value="shop-only">Shop only</option><option value="search-only">Search only</option><option value="hidden">Hidden</option></select></label><label className="admin-checks"><input name="featured" type="checkbox" defaultChecked={product.featured} /> Featured product</label><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save product"}</button></section><section className="admin-panel editor-panel"><h3>Categories & tags</h3><div className="taxonomy-checklist">{categoryOptions.map((name) => <label key={name}><input name={`category-${name}`} type="checkbox" defaultChecked={product.categories?.includes(name) || product.category === name} />{name}</label>)}</div><label>Tags<input name="tags" defaultValue={product.tags?.join(", ")} placeholder="Comma-separated" /></label></section><section className="admin-panel editor-panel"><h3>Product media</h3><ProductMediaDropzone media={media} onAddFiles={addMedia} onRemove={removeMedia} onReorder={reorderMedia} /></section></aside></form>{message ? <p className="form-message">{message}</p> : null}<section className="admin-panel product-list-panel"><div className="section-heading tight"><div><p className="eyebrow">Catalogue</p><h2>All products</h2></div><span>{loading ? "Loading…" : `${products.length} products`}</span></div><div className="admin-table"><div className="admin-table-row admin-table-head"><span>Product</span><span>SKU</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span></div>{products.map((item) => <div className="admin-table-row" key={item.id}><span><strong>{item.title}</strong><small>{item.categories?.join(", ") || item.category}</small></span><span>{item.sku || "—"}</span><span>R {item.price.toFixed(2)}</span><span>{item.inventoryCount}</span><span>{item.status ?? (item.isPublished ? "published" : "draft")}</span><span className="admin-actions"><button type="button" className="text-button" onClick={() => startEdit(item)}>Edit</button><button type="button" className="text-button danger" onClick={() => { if (confirm(`Delete ${item.title}?`)) removeProduct(item.id).catch(() => setMessage("Product could not be deleted.")); }}>Delete</button></span></div>)}</div></section></div>;
}
