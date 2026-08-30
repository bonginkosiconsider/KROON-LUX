"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useAdminCategories } from "@/hooks/use-admin-categories";
import { slugify } from "@/lib/firebase-models";
import { uploadHeroImage } from "@/services/firebase-storage";
import { defaultStoreSettings, saveStoreSettings, subscribeStoreSettings, type StoreSettings } from "@/services/firebase-settings";

export function AdminSettingsClient() {
  const [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState<number | null>(null);
  const categories = useAdminCategories();

  useEffect(() => subscribeStoreSettings(setSettings), []);

  function updateSetting<Key extends keyof StoreSettings>(key: Key, value: StoreSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateSlide(index: number, key: "linkUrl" | "altText", value: string) {
    setSettings((current) => ({ ...current, heroSlides: current.heroSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, [key]: value } : slide) }));
  }

  async function uploadSlideImage(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingSlide(index);
    setMessage("");
    try {
      const imageUrl = await uploadHeroImage(file);
      setSettings((current) => ({ ...current, heroSlides: current.heroSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, imageUrl } : slide) }));
      setMessage(`Slide ${index + 1} image uploaded. Save changes to publish it.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploadingSlide(null);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await saveStoreSettings(settings);
      setMessage("Settings saved. Your slideshow is live.");
    } catch {
      setMessage("Settings could not be saved. Confirm your Firebase admin role and rules are deployed.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="admin-panel admin-settings-panel"><form className="admin-form" onSubmit={save}><div className="form-grid"><label>Store name<input onChange={(event) => updateSetting("storeName", event.target.value)} required value={settings.storeName} /></label><label>Currency<select onChange={(event) => updateSetting("currency", event.target.value)} value={settings.currency}><option value="ZAR">ZAR — South African rand</option><option value="USD">USD — US dollar</option><option value="GBP">GBP — Pound sterling</option></select></label><label>Contact email<input onChange={(event) => updateSetting("contactEmail", event.target.value)} type="email" value={settings.contactEmail} /></label><label>Contact phone<input onChange={(event) => updateSetting("contactPhone", event.target.value)} type="tel" value={settings.contactPhone} /></label></div><label>Store announcement<textarea onChange={(event) => updateSetting("announcement", event.target.value)} placeholder="Optional message shown to your customers" rows={4} value={settings.announcement} /></label><fieldset className="hero-settings"><legend>Homepage hero slideshow</legend><p>Upload an image, choose its product category, and provide concise alt text for each slide.</p><div className="hero-settings-grid">{settings.heroSlides.map((slide, index) => <section className="hero-settings-card" key={index}><h2>Slide {index + 1}</h2><img alt={slide.altText || `Hero slide ${index + 1} preview`} className="hero-settings-preview" src={slide.imageUrl} /><label>Image upload<input accept="image/*" disabled={uploadingSlide !== null} onChange={(event) => uploadSlideImage(index, event)} type="file" /></label><label>Product category<select onChange={(event) => { if (event.target.value) updateSlide(index, "linkUrl", `/shop?category=${slugify(event.target.value)}`); }} value={categories.find((category) => slide.linkUrl === `/shop?category=${slugify(category)}`) ?? ""}><option value="">Custom link / choose a category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>Link URL<input inputMode="url" onChange={(event) => updateSlide(index, "linkUrl", event.target.value)} placeholder="/shop?category=fashion" type="text" value={slide.linkUrl} /></label><label>Alt text<input onChange={(event) => updateSlide(index, "altText", event.target.value)} placeholder="Describe the image" value={slide.altText} /></label>{uploadingSlide === index ? <small>Uploading image…</small> : null}</section>)}</div></fieldset>{message ? <p className="form-message">{message}</p> : null}<button className="button button-primary" disabled={saving || uploadingSlide !== null}>{saving ? "Saving…" : "Save changes"}</button></form></section>;
}
