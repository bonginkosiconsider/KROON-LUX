"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { Testimonial } from "@/lib/firebase-models";
import { removeTestimonialImage, uploadTestimonialImage } from "@/services/firebase-storage";
import { createTestimonial, maxTestimonials, moveTestimonial, removeTestimonial, subscribeTestimonials, updateTestimonial } from "@/services/firebase-testimonials";

type FormState = { customerName: string; message: string; rating: number; active: boolean };
const emptyForm: FormState = { customerName: "", message: "", rating: 5, active: true };

function ImagePreview({ src, name }: { src: string; name: string }) {
  return <div className="testimonial-admin-image">{src ? (
    // Firebase Storage download URLs are dynamic, so a plain image preserves the existing upload pattern.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={`${name || "Customer"} preview`} src={src} />
  ) : <span aria-hidden="true">{name.slice(0, 1).toUpperCase() || "?"}</span>}</div>;
}

export function AdminTestimonialsClient() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => subscribeTestimonials(setItems), []);

  function selectImage(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0] ?? null; setImageFile(file); setPreview(file ? URL.createObjectURL(file) : ""); }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try { const imageUrl = imageFile ? await uploadTestimonialImage(imageFile) : ""; await createTestimonial({ ...form, imageUrl }); setForm(emptyForm); setImageFile(null); setPreview(""); event.currentTarget.reset(); setNotice("Testimonial added."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not add testimonial."); }
    finally { setSaving(false); }
  }
  const full = items.length >= maxTestimonials;

  return <><header className="admin-page-header"><div><p className="eyebrow">Storefront content</p><h1>Testimonials</h1><p>Manage up to six customer reviews shown in the homepage carousel.</p></div></header><p aria-live="polite" className="form-message">{full ? "Maximum of 6 testimonials reached. Delete one to add another." : notice}</p><div className="admin-dashboard-columns"><section className="admin-panel"><h2>Add testimonial</h2>{full ? null : <form className="admin-form" onSubmit={add}><TestimonialFields form={form} onChange={setForm} /><label>Customer image <input accept="image/jpeg,image/png,image/webp" onChange={selectImage} type="file" /></label><ImagePreview name={form.customerName} src={preview} /><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Add testimonial"}</button></form>}</section><section className="admin-panel"><h2>Current testimonials ({items.length}/{maxTestimonials})</h2><div className="testimonial-admin-list">{items.length ? items.map((item, index) => <TestimonialRow index={index} item={item} items={items} key={`${item.id}-${item.updatedAt?.toMillis() ?? "new"}`} onMessage={setNotice} />) : <p className="empty-catalog">No testimonials yet.</p>}</div></section></div></>;
}

function TestimonialFields({ form, onChange }: { form: FormState; onChange: (form: FormState) => void }) {
  return <><label>Customer name<input onChange={(event) => onChange({ ...form, customerName: event.target.value })} required value={form.customerName} /></label><label>Testimonial<textarea maxLength={700} onChange={(event) => onChange({ ...form, message: event.target.value })} required rows={4} value={form.message} /></label><label>Rating<select onChange={(event) => onChange({ ...form, rating: Number(event.target.value) })} value={form.rating}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>)}</select></label><label>Status<select onChange={(event) => onChange({ ...form, active: event.target.value === "true" })} value={String(form.active)}><option value="true">Active</option><option value="false">Disabled</option></select></label></>;
}

function TestimonialRow({ item, items, index, onMessage }: { item: Testimonial; items: Testimonial[]; index: number; onMessage: (message: string) => void }) {
  const [form, setForm] = useState<FormState>({ customerName: item.customerName, message: item.message, rating: item.rating, active: item.active });
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState(""); const [removeImage, setRemoveImage] = useState(false); const [saving, setSaving] = useState(false);
  function selectImage(event: ChangeEvent<HTMLInputElement>) { const next = event.target.files?.[0] ?? null; setFile(next); setPreview(next ? URL.createObjectURL(next) : ""); setRemoveImage(false); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try { const previous = item.imageUrl || ""; const imageUrl = removeImage ? "" : file ? await uploadTestimonialImage(file) : previous; await updateTestimonial(item.id, { ...form, imageUrl }); if (previous && (removeImage || file)) await removeTestimonialImage(previous).catch(() => undefined); setFile(null); setPreview(""); setRemoveImage(false); onMessage(`${item.customerName} updated.`); }
    catch (error) { onMessage(error instanceof Error ? error.message : "Could not update testimonial."); }
    finally { setSaving(false); }
  }
  const image = removeImage ? "" : preview || item.imageUrl || "";
  return <form className="testimonial-admin-row" onSubmit={save}><div className="testimonial-admin-row-head"><span>Display order: {index + 1}</span><span className={item.active ? "admin-status-pill admin-status-published" : "admin-status-pill admin-status-draft"}>{item.active ? "Active" : "Disabled"}</span></div><div className="testimonial-admin-edit"><ImagePreview name={form.customerName} src={image} /><div className="admin-form"><TestimonialFields form={form} onChange={setForm} /><label>Replace customer image<input accept="image/jpeg,image/png,image/webp" onChange={selectImage} type="file" /></label>{image ? <button className="text-button danger" onClick={() => { setRemoveImage(true); setFile(null); setPreview(""); }} type="button">Remove image</button> : null}</div></div><div className="admin-actions"><button className="text-button" disabled={index === 0} onClick={() => moveTestimonial(items, item.id, "up").catch(() => onMessage("Could not move testimonial."))} type="button">Move up</button><button className="text-button" disabled={index === items.length - 1} onClick={() => moveTestimonial(items, item.id, "down").catch(() => onMessage("Could not move testimonial."))} type="button">Move down</button><button className="text-button" disabled={saving} type="submit">{saving ? "Saving…" : "Save"}</button><button className="text-button danger" onClick={() => { if (confirm(`Delete testimonial from ${item.customerName}?`)) removeTestimonial(item.id).then(() => item.imageUrl ? removeTestimonialImage(item.imageUrl).catch(() => undefined) : undefined).catch(() => onMessage("Could not delete testimonial.")); }} type="button">Delete</button></div></form>;
}
