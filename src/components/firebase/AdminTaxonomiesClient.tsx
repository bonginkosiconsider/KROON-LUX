"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import type { StoreTaxonomy } from "@/lib/firebase-models";
import { useStoreTaxonomies } from "@/hooks/use-store-taxonomies";
import { removeBrandLogo, uploadBrandLogo } from "@/services/firebase-storage";
import { createTaxonomy, moveTaxonomy, removeTaxonomy, updateTaxonomy, type TaxonomyKind } from "@/services/firebase-taxonomies";

export function AdminTaxonomiesClient({ kind }: { kind: TaxonomyKind }) {
  const { items, loading } = useStoreTaxonomies(kind);
  const [message, setMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const singular = kind === "brands" ? "brand" : "collection";
  const title = kind === "brands" ? "Brands" : "Collections";
  function selectLogo(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0] ?? null; setLogoFile(file); setLogoPreview(file ? URL.createObjectURL(file) : ""); }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      const logoUrl = kind === "brands" && logoFile ? await uploadBrandLogo(logoFile) : "";
      await createTaxonomy(kind, { name: String(form.get("name")), slug: String(form.get("slug")), description: String(form.get("description")), active: form.get("active") !== "false", logoUrl });
      event.currentTarget.reset(); setLogoFile(null); setLogoPreview(""); setMessage(`${title.slice(0, -1)} added.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : `Could not add ${singular}.`); }
  }
  return <><header className="admin-page-header"><div><p className="eyebrow">Catalogue management</p><h1>{title}</h1><p>Use Move up and Move down to set the exact storefront order.</p></div></header><div className="admin-dashboard-columns"><section className="admin-panel"><h2>Add {singular}</h2><form className="admin-form" onSubmit={add}><label>Name<input name="name" required /></label><label>URL slug <small>(optional)</small><input name="slug" placeholder={singular === "brand" ? "nike" : "soccer-jerseys"} /></label>{kind === "brands" ? <><label>Brand logo <small>(used only in the Brands Lineup)</small><input accept="image/*" onChange={selectLogo} type="file" /></label>{logoPreview ? <LogoPreview src={logoPreview} /> : null}<label>Status<select defaultValue="true" name="active"><option value="true">Active</option><option value="false">Inactive</option></select></label></> : null}<label>Description <small>(optional)</small><textarea name="description" rows={3} /></label><button className="button button-primary">Add {singular}</button>{message ? <p className="form-message">{message}</p> : null}</form></section><section className="admin-panel"><h2>Your {title.toLowerCase()}</h2><div className="taxonomy-list">{loading ? <p>Loading…</p> : items.length ? items.map((item, index) => <TaxonomyRow index={index} item={item} items={items} kind={kind} key={item.id} onMessage={setMessage} />) : <p className="empty-catalog">No {title.toLowerCase()} yet.</p>}</div></section></div></>;
}

function LogoPreview({ src }: { src: string }) { return <div className="brand-logo-preview"><img alt="Brand logo preview" src={src} /></div>; }

function TaxonomyRow({ item, items, index, kind, onMessage }: { item: StoreTaxonomy; items: StoreTaxonomy[]; index: number; kind: TaxonomyKind; onMessage: (value: string) => void }) {
  const [logoFile, setLogoFile] = useState<File | null>(null); const [logoPreview, setLogoPreview] = useState(""); const [removeLogo, setRemoveLogo] = useState(false); const [saving, setSaving] = useState(false);
  function selectLogo(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0] ?? null; setLogoFile(file); setLogoPreview(file ? URL.createObjectURL(file) : ""); setRemoveLogo(false); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true);
    try {
      const previousLogoUrl = item.logoUrl || "";
      const logoUrl = kind !== "brands" ? undefined : removeLogo ? "" : logoFile ? await uploadBrandLogo(logoFile) : previousLogoUrl;
      await updateTaxonomy(kind, item.id, { name: String(form.get("name")), slug: String(form.get("slug")), description: String(form.get("description")), active: form.get("active") !== "false", logoUrl });
      if (kind === "brands" && previousLogoUrl && (removeLogo || logoFile)) await removeBrandLogo(previousLogoUrl).catch(() => undefined);
      setLogoFile(null); setLogoPreview(""); setRemoveLogo(false); onMessage(`${item.name} updated.`);
    } catch (error) { onMessage(error instanceof Error ? error.message : `${item.name} could not be updated.`); } finally { setSaving(false); }
  }
  const preview = removeLogo ? "" : logoPreview || item.logoUrl || "";
  return <form className="taxonomy-row" onSubmit={save}><div className="form-grid"><label>Name<input name="name" defaultValue={item.name} required /></label><label>Slug<input name="slug" defaultValue={item.slug} required /></label>{kind === "brands" ? <><label>Status<select defaultValue={item.active === false ? "false" : "true"} name="active"><option value="true">Active</option><option value="false">Inactive</option></select></label><label>Brand logo<input accept="image/*" onChange={selectLogo} type="file" /></label>{preview ? <div className="wide-field brand-logo-control"><LogoPreview src={preview} /><button className="text-button danger" onClick={() => { setRemoveLogo(true); setLogoFile(null); setLogoPreview(""); }} type="button">Remove logo</button></div> : <p className="wide-field product-taxonomy-help">No logo uploaded. The card will show a clean name fallback.</p>}</> : null}<label className="wide-field">Description<textarea name="description" defaultValue={item.description} rows={2} /></label></div><div className="admin-actions"><span className="product-taxonomy-help">Display order: {index + 1}</span><button className="text-button" disabled={index === 0} type="button" onClick={() => moveTaxonomy(kind, items, item.id, "up").catch(() => onMessage(`${item.name} could not be moved.`))}>Move up</button><button className="text-button" disabled={index === items.length - 1} type="button" onClick={() => moveTaxonomy(kind, items, item.id, "down").catch(() => onMessage(`${item.name} could not be moved.`))}>Move down</button><button className="text-button" disabled={saving} type="submit">{saving ? "Saving…" : "Save"}</button><button className="text-button danger" type="button" onClick={() => { if (confirm(`Delete ${item.name}? Assigned products will be unlinked.`)) removeTaxonomy(kind, item.id).catch(() => onMessage(`${item.name} could not be deleted.`)); }}>Delete</button></div></form>;
}
