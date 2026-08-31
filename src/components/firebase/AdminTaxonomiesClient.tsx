"use client";

import { FormEvent, useState } from "react";
import { useStoreTaxonomies } from "@/hooks/use-store-taxonomies";
import { createTaxonomy, moveTaxonomy, removeTaxonomy, updateTaxonomy, type TaxonomyKind } from "@/services/firebase-taxonomies";

export function AdminTaxonomiesClient({ kind }: { kind: TaxonomyKind }) {
  const { items, loading } = useStoreTaxonomies(kind);
  const [message, setMessage] = useState("");
  const singular = kind === "brands" ? "brand" : "collection";
  const title = kind === "brands" ? "Brands" : "Collections";

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await createTaxonomy(kind, { name: String(form.get("name")), slug: String(form.get("slug")), description: String(form.get("description")) });
      event.currentTarget.reset(); setMessage(`${title.slice(0, -1)} added.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : `Could not add ${singular}.`); }
  }

  return <><header className="admin-page-header"><div><p className="eyebrow">Catalogue management</p><h1>{title}</h1><p>Use Move up and Move down to set the exact storefront order.</p></div></header><div className="admin-dashboard-columns"><section className="admin-panel"><h2>Add {singular}</h2><form className="admin-form" onSubmit={add}><label>Name<input name="name" required /></label><label>URL slug <small>(optional)</small><input name="slug" placeholder={singular === "brand" ? "nike" : "soccer-jerseys"} /></label><label>Description <small>(optional)</small><textarea name="description" rows={3} /></label><button className="button button-primary">Add {singular}</button>{message ? <p className="form-message">{message}</p> : null}</form></section><section className="admin-panel"><h2>Your {title.toLowerCase()}</h2><div className="taxonomy-list">{loading ? <p>Loading…</p> : items.length ? items.map((item, index) => <TaxonomyRow index={index} item={item} items={items} kind={kind} key={item.id} onMessage={setMessage} />) : <p className="empty-catalog">No {title.toLowerCase()} yet.</p>}</div></section></div></>;
}

function TaxonomyRow({ item, items, index, kind, onMessage }: { item: (ReturnType<typeof useStoreTaxonomies>["items"])[number]; items: ReturnType<typeof useStoreTaxonomies>["items"]; index: number; kind: TaxonomyKind; onMessage: (value: string) => void }) {
  return <form className="taxonomy-row" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await updateTaxonomy(kind, item.id, { name: String(form.get("name")), slug: String(form.get("slug")), description: String(form.get("description")) }); onMessage(`${item.name} updated.`); } catch { onMessage(`${item.name} could not be updated.`); } }}><div className="form-grid"><label>Name<input name="name" defaultValue={item.name} required /></label><label>Slug<input name="slug" defaultValue={item.slug} required /></label><label className="wide-field">Description<textarea name="description" defaultValue={item.description} rows={2} /></label></div><div className="admin-actions"><button className="text-button" disabled={index === 0} type="button" onClick={() => moveTaxonomy(kind, items, item.id, "up").catch(() => onMessage(`${item.name} could not be moved.`))}>Move up</button><button className="text-button" disabled={index === items.length - 1} type="button" onClick={() => moveTaxonomy(kind, items, item.id, "down").catch(() => onMessage(`${item.name} could not be moved.`))}>Move down</button><button className="text-button" type="submit">Save</button><button className="text-button danger" type="button" onClick={() => { if (confirm(`Delete ${item.name}? Assigned products will be unlinked.`)) removeTaxonomy(kind, item.id).catch(() => onMessage(`${item.name} could not be deleted.`)); }}>Delete</button></div></form>;
}
