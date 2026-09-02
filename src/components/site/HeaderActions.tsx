"use client";

import Link from "next/link";
import { useState } from "react";
import { FiShoppingBag, FiUser } from "react-icons/fi";
import { CatalogSearch } from "@/components/site/CatalogSearch";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useFirebaseCart } from "@/hooks/use-firebase-cart";
import { useStoreTaxonomies } from "@/hooks/use-store-taxonomies";

export function HeaderActions() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useFirebaseAuth();
  const signedIn = Boolean(user);
  const { itemCount } = useFirebaseCart();
  const { items: brands } = useStoreTaxonomies("brands");
  const activeBrands = brands.filter((brand) => brand.active !== false);

  return (
    <>
      <div className="header-actions">
        <CatalogSearch />
        <Link className="header-icon" href="/account" aria-label={signedIn ? "Open your account" : "Sign in to your account"} title={signedIn ? "Account" : "Sign in"}>
          <FiUser aria-hidden="true" />
        </Link>
        <Link className="header-icon bag-link" href="/cart" aria-label={`Open shopping bag, ${itemCount} items`} title="Shopping bag">
          <FiShoppingBag aria-hidden="true" /><span>{itemCount}</span>
        </Link>
        <button className="header-icon menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label="Toggle navigation" title="Menu">
          <span className="menu-lines" aria-hidden="true"><i /><i /></span>
        </button>
      </div>
      {menuOpen ? <nav className="mobile-navigation" id="mobile-navigation" aria-label="Mobile navigation">
        <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
        <Link href="/collections/new-arrivals" onClick={() => setMenuOpen(false)}>New arrivals</Link>
        <details className="mobile-brands"><summary>Brands</summary>{activeBrands.map((brand) => <Link href={`/collections/${brand.slug}`} key={brand.id} onClick={() => setMenuOpen(false)}>{brand.name}</Link>)}</details>
        <Link href="/collections/accessories" onClick={() => setMenuOpen(false)}>Accessories</Link>
        <Link href="/collections/sale" onClick={() => setMenuOpen(false)}>Sale</Link>
        <Link href="/collections/soccer-jerseys" onClick={() => setMenuOpen(false)}>Soccer jerseys</Link>
      </nav> : null}
    </>
  );
}
