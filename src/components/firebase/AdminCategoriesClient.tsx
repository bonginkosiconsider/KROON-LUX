"use client";

import { FormEvent, useEffect, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addAdminRecord, subscribeAdminCollection, updateAdminRecord, type AdminRecord } from "@/services/firebase-admin-data";

export function AdminCategoriesClient() {
  const [categories, setCategories] = useState<AdminRecord[]>([]); const [message, setMessage] = useState("");
  useEffect(() => subscribeAdminCollection("categories", setCategories), []);
  async function add(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { await addAdminRecord("categories", { name: String(form.get("name")).trim() }); event.currentTarget.reset(); setMessage("Category added."); } catch { setMessage("Category could not be added."); } }
  return <><header className="admin-page-header"><div><p className="eyebrow">Site management</p><h1>Categories</h1><p>Create, rename, or remove the product groups used across your store.</p></div></header><div className="admin-dashboard-columns"><section className="admin-panel"><h2>Add category</h2><form className="admin-form" onSubmit={add}><label>Category name<input name="name" required /></label><button className="button button-primary">Add category</button>{message ? <p className="form-message">{message}</p> : null}</form></section><section className="admin-panel"><h2>Your categories</h2><div className="admin-activity-list">{categories.length ? categories.map((category) => <div key={category.id}><input aria-label="Category name" defaultValue={String(category.name ?? "")} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== category.name) updateAdminRecord("categories", category.id, { name }).catch(() => setMessage("Category could not be renamed.")); }} /><button className="text-button danger" onClick={() => { if (confirm(`Delete ${category.name}?`)) deleteDoc(doc(db, "categories", category.id)).catch(() => setMessage("Category could not be deleted.")); }}>Delete</button></div>) : <p className="empty-catalog">No custom categories yet.</p>}</div></section></div></>;
}
