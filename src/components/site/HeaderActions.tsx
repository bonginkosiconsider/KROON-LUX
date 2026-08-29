"use client";

import Link from "next/link";
import { useState } from "react";
import { CatalogSearch } from "@/components/site/CatalogSearch";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export function HeaderActions({ isSignedIn, itemCount }: { isSignedIn: boolean; itemCount: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useFirebaseAuth();
  const signedIn = isSignedIn || Boolean(user);

  return (
    <>
      <div className="header-actions">
        <CatalogSearch />
        <Link className="header-icon" href="/account" aria-label={signedIn ? "Open your account" : "Sign in to your account"} title={signedIn ? "Account" : "Sign in"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.2 3-5 7-5s6.2 1.8 7 5" /></svg>
        </Link>
        <Link className="header-icon bag-link" href="/cart" aria-label={`Open shopping bag, ${itemCount} items`} title="Shopping bag">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg><span>{itemCount}</span>
        </Link>
        <button className="header-icon menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label="Toggle navigation" title="Menu">
          <span className="menu-lines" aria-hidden="true"><i /><i /></span>
        </button>
      </div>
      {menuOpen ? <nav className="mobile-navigation" id="mobile-navigation" aria-label="Mobile navigation">
        <Link href="/shop" onClick={() => setMenuOpen(false)}>Shop</Link>
        <Link href="/shop?sort=newest" onClick={() => setMenuOpen(false)}>New arrivals</Link>
        <Link href="/shop?sort=best-selling" onClick={() => setMenuOpen(false)}>Best sellers</Link>
        <Link href="/#story" onClick={() => setMenuOpen(false)}>House</Link>
      </nav> : null}
    </>
  );
}
