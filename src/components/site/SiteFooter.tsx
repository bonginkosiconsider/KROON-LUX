"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ManagedPage } from "@/lib/firebase-models";
import { pageHref, subscribeFooterPages } from "@/services/firebase-pages";
import { NewsletterSignup } from "@/components/site/NewsletterSignup";
import { FooterSocials } from "@/components/site/FooterSocials";

export function SiteFooter() {
  const [pages, setPages] = useState<ManagedPage[]>([]);
  useEffect(() => subscribeFooterPages(setPages), []);
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <section className="footer-private-access" id="newsletter">
        <div><p className="footer-eyebrow">Private access</p><h2>Stay in the know.</h2></div>
        <NewsletterSignup />
      </section>
      <section className="footer-main">
        <FooterSocials />
        <nav aria-label="Footer navigation" className="footer-links"><Link href="/shop">Shop</Link><Link href="/account">Account</Link><a href="#newsletter">Newsletter</a></nav>
      </section>
      <div className="footer-legal-row">
        {pages.length ? <nav aria-label="Legal and information pages" className="footer-legal-links">{pages.map((page) => <Link href={pageHref(page)} key={page.id}>{page.title}</Link>)}</nav> : null}
        <small>© {year} Kroon Luxe. All Rights Reserved</small>
      </div>
    </footer>
  );
}

