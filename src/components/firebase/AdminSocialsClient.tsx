"use client";

import { FormEvent, useEffect, useState } from "react";
import { defaultStoreSettings, saveStoreSettings, subscribeStoreSettings, type SocialLink, type SocialPlatform, type StoreSettings } from "@/services/firebase-settings";

const labels: Record<SocialPlatform, string> = { whatsapp: "WhatsApp", tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram" };
export function AdminSocialsClient() {
  const [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => subscribeStoreSettings(setSettings), []);
  function update(platform: SocialPlatform, changes: Partial<SocialLink>) { setSettings((current) => ({ ...current, socialLinks: current.socialLinks.map((link) => link.platform === platform ? { ...link, ...changes } : link) })); }
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setMessage(""); try { for (const link of settings.socialLinks) { if (link.url && !/^https:\/\//i.test(link.url)) throw new Error(`${labels[link.platform]} needs a full https:// URL.`); } await saveStoreSettings(settings); setMessage("Social links saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Social links could not be saved."); } finally { setSaving(false); } }
  return <section className="admin-panel"><form className="admin-form admin-socials-form" onSubmit={save}><h2>Follow Us On</h2>{settings.socialLinks.map((link) => <fieldset key={link.platform}><legend>{labels[link.platform]}</legend><label>URL<input onChange={(event) => update(link.platform, { url: event.target.value })} placeholder={link.platform === "whatsapp" ? "https://wa.me/XXXXXXXXXXX" : "https://"} type="url" value={link.url} /></label><label className="toggle-line"><input checked={link.enabled} onChange={(event) => update(link.platform, { enabled: event.target.checked })} type="checkbox" />Enabled</label></fieldset>)}{message ? <p aria-live="polite" className="form-message">{message}</p> : null}<button className="button button-primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button></form></section>;
}
