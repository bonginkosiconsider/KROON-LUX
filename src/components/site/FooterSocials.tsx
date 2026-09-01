"use client";

import { useEffect, useState } from "react";
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { defaultStoreSettings, subscribeStoreSettings, type SocialPlatform } from "@/services/firebase-settings";

const labels: Record<SocialPlatform, string> = { whatsapp: "WhatsApp", tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram" };
const icons: Record<SocialPlatform, IconType> = { whatsapp: FaWhatsapp, tiktok: FaTiktok, facebook: FaFacebookF, instagram: FaInstagram };

export function FooterSocials() {
  const [settings, setSettings] = useState(defaultStoreSettings);
  useEffect(() => subscribeStoreSettings(setSettings), []);
  const links = settings.socialLinks.filter((link) => link.enabled && link.url.trim());
  return <section aria-label="Follow us on social media" className="footer-socials"><span>FOLLOW US ON</span><div>{links.map((link) => { const Icon = icons[link.platform]; return <a aria-label={`Follow Kroon Luxe on ${labels[link.platform]}`} data-platform={link.platform} href={link.url} key={link.platform} rel="noopener noreferrer" target="_blank" title={labels[link.platform]}><Icon aria-hidden="true" /></a>; })}</div></section>;
}
