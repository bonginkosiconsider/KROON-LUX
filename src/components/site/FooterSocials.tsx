"use client";

import { useEffect, useState } from "react";
import { defaultStoreSettings, subscribeStoreSettings, type SocialPlatform } from "@/services/firebase-settings";

const labels: Record<SocialPlatform, string> = { whatsapp: "WhatsApp", tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram" };

function SocialGlyph({ platform }: { platform: SocialPlatform }) {
  if (platform === "facebook") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.7.3-1 1-1Z" /></svg>;
  if (platform === "instagram") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
  if (platform === "whatsapp") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" /><path d="M8.5 8.5c.3-.5.6-.5.9-.5l.7 1.6c.1.3.1.5-.1.7l-.5.5c.6 1.1 1.5 1.8 2.7 2.3l.5-.6c.2-.2.4-.2.7-.1l1.5.7c.3.1.3.4.2.8-.2.8-.9 1.3-1.7 1.3-2.7-.2-5.2-2.7-5.4-5.4 0-.5.2-1 .5-1.3Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14.5 4v10.2a3.8 3.8 0 1 1-3-3.7v3.1a1 1 0 1 0 1 1V7h3.8c.2 1.5 1 2.5 2.7 3V7.2c-1.5-.3-2.2-1.2-2.5-3.2h-2Z" /></svg>;
}

export function FooterSocials() {
  const [settings, setSettings] = useState(defaultStoreSettings);
  useEffect(() => subscribeStoreSettings(setSettings), []);
  const links = settings.socialLinks.filter((link) => link.enabled && link.url.trim());
  return <section aria-label="Follow us on social media" className="footer-socials"><span>FOLLOW US ON</span><div>{links.map((link) => <a aria-label={`Follow Kroon Luxe on ${labels[link.platform]}`} data-platform={link.platform} href={link.url} key={link.platform} rel="noopener noreferrer" target="_blank" title={labels[link.platform]}><SocialGlyph platform={link.platform} /></a>)}</div></section>;
}
