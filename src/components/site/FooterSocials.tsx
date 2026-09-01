"use client";

import type { SocialPlatform } from "@/services/firebase-settings";
import { useStoreSettings } from "@/hooks/use-store-settings";

const labels: Record<SocialPlatform, string> = { whatsapp: "WhatsApp", tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram" };

function SocialGlyph({ platform }: { platform: SocialPlatform }) {
  if (platform === "facebook") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M13.5 21v-8h2.75l.5-3h-3.25V8.05c0-.87.29-1.55 1.63-1.55h1.74V3.82A23 23 0 0 0 14.35 3C11.87 3 10 4.51 10 7.28V10H7v3h3v8h3.5Z" /></svg>;
  if (platform === "instagram") return <svg aria-hidden="true" className="footer-social-outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" /><circle cx="12" cy="12" r="4.1" /><circle cx="17.35" cy="6.65" r="1" fill="currentColor" stroke="none" /></svg>;
  if (platform === "whatsapp") return <svg aria-hidden="true" className="footer-social-outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.1 11.5a8.1 8.1 0 0 1-11.8 7.2L4 20l1.35-4.1A8.1 8.1 0 1 1 20.1 11.5Z" /><path d="M8.7 8.25c.25-.45.5-.48.8-.45l.75 1.72c.1.25.08.46-.1.65l-.52.55c.55 1.08 1.42 1.94 2.5 2.5l.55-.52c.2-.18.4-.2.65-.1l1.72.75c.03.3 0 .55-.45.8-.65.37-1.36.4-2.08.1-2.5-1.02-4.38-2.9-5.4-5.4-.3-.72-.27-1.43.1-2.08Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15.8 3c.2 1.7 1.15 2.75 2.95 2.95v3.1a8.2 8.2 0 0 1-2.95-.72v6.05a5.15 5.15 0 1 1-4.45-5.1v3.2a2 2 0 1 0 1.25 1.9V3h3.2Z" /></svg>;
}

export function FooterSocials() {
  const settings = useStoreSettings();
  const links = settings.socialLinks.filter((link) => link.enabled && link.url.trim());
  return <section aria-label="Follow us on social media" className="footer-socials"><span>FOLLOW US ON</span><div>{links.map((link) => <a aria-label={`Follow Kroon Luxe on ${labels[link.platform]}`} data-platform={link.platform} href={link.url} key={link.platform} rel="noopener noreferrer" target="_blank" title={labels[link.platform]}><SocialGlyph platform={link.platform} /></a>)}</div></section>;
}
