"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useProducts } from "@/hooks/use-products";
import {
  createCategory,
  removeCategory,
  renameCategory,
  subscribeCategories,
  type AdminCategory,
} from "@/services/firebase-categories";

function friendlyCategoryError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "CATEGORY_EXISTS") return "That category already exists.";
    if (error.message === "CATEGORY_NAME_REQUIRED") return "Enter a category name.";
    if (error.message === "CATEGORY_NOT_RENAMEABLE") return "Default categories cannot be renamed.";
    if (error.message === "CATEGORY_NOT_REMOVEABLE") return "This category is required as the product fallback.";
    return error.message;
  }
  return "Please try again.";
}

export function AdminCategoriesClient() {
  const { products, loading: productsLoading } = useProducts(false);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => subscribeCategories((next) => {
    setCategories(next);
    setLoading(false);
  }), []);

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const names = new Set([product.category, ...(product.categories ?? [])].filter(Boolean));
      names.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));
    });
    return counts;
  }, [products]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();

    setSaving(true);
    setMessage("");

    try {
      await createCategory(name);
      form.reset();
      setMessage("Category added.");
    } catch (error) {
      setMessage(`Category could not be added. ${friendlyCategoryError(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function rename(category: AdminCategory, name: string) {
    const nextName = name.trim();
    if (!nextName || nextName === category.name) return;

    setBusyId(category.id);
    setMessage("");

    try {
      await renameCategory(category, nextName);
      setMessage("Category renamed.");
    } catch (error) {
      setMessage(`Category could not be renamed. ${friendlyCategoryError(error)}`);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(category: AdminCategory) {
    if (!confirm(`Remove ${category.name}? Products using it will move to Uncategorized.`)) return;

    setBusyId(category.id);
    setMessage("");

    try {
      await removeCategory(category);
      setMessage("Category removed.");
    } catch (error) {
      setMessage(`Category could not be removed. ${friendlyCategoryError(error)}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Site management</p>
          <h1>Categories</h1>
          <p>Create, rename, or remove the product groups available to the store team.</p>
        </div>
        <span>{loading ? "Loading..." : `${categories.length} available`}</span>
      </header>

      <div className="admin-dashboard-columns">
        <section className="admin-panel">
          <h2>Add category</h2>
          <form className="admin-form" onSubmit={add}>
            <label>
              Category name
              <input name="name" required />
            </label>
            <button className="button button-primary" disabled={saving}>{saving ? "Adding..." : "Add category"}</button>
          </form>
        </section>

        <section className="admin-panel">
          <h2>Available categories</h2>
          <p>{productsLoading ? "Counting products..." : "These are the categories shown in product and homepage settings."}</p>
          {message ? <p className="form-message">{message}</p> : null}
        </section>
      </div>

      <section className="admin-panel">
        <div className="section-heading tight">
          <div>
            <p className="eyebrow">Catalogue taxonomy</p>
            <h2>Category list</h2>
          </div>
          <span>{loading ? "Loading..." : `${categories.length} categories`}</span>
        </div>

        <div className="admin-table">
          <div className="admin-table-row admin-table-head">
            <span>Name</span>
            <span>Slug</span>
            <span>Source</span>
            <span>Products</span>
            <span>Actions</span>
          </div>
          {categories.length ? categories.map((category) => (
            <div className="admin-table-row" key={category.id}>
              <span>
                {category.canRename ? (
                  <input
                    aria-label={`Rename ${category.name}`}
                    defaultValue={category.name}
                    disabled={busyId === category.id}
                    onBlur={(event) => rename(category, event.target.value)}
                  />
                ) : (
                  <strong>{category.name}</strong>
                )}
              </span>
              <span>{category.slug}</span>
              <span>{category.source === "default" ? "Default" : "Custom"}</span>
              <span>{productCounts.get(category.name) ?? 0}</span>
              <span className="admin-actions">
                {category.canRemove ? (
                  <button className="text-button danger" disabled={busyId === category.id} onClick={() => remove(category)} type="button">
                    Remove
                  </button>
                ) : (
                  <small>Required fallback</small>
                )}
              </span>
            </div>
          )) : <p className="empty-catalog">No categories are available yet.</p>}
        </div>
      </section>
    </>
  );
}
