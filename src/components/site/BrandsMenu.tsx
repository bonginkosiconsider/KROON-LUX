"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStoreTaxonomies } from "@/hooks/use-store-taxonomies";

export function BrandsMenu() {
  const { items: brands } = useStoreTaxonomies("brands");
  const activeBrands = brands.filter((brand) => brand.active !== false);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  function clearCloseTimer() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function closeMenu() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  }

  useEffect(() => clearCloseTimer, []);

  return (
    <div className={`brands-menu${open ? " is-open" : ""}`} onMouseEnter={openMenu} onMouseLeave={closeMenu}>
      <button aria-expanded={open} aria-haspopup="true" className="brands-menu-trigger" onClick={() => setOpen((current) => !current)} type="button">
        Brands <span aria-hidden="true">⌄</span>
      </button>
      <div className="brands-menu-panel" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
        {activeBrands.length ? activeBrands.map((brand) => <Link href={`/collections/${brand.slug}`} key={brand.id} onClick={() => setOpen(false)}>{brand.name}</Link>) : <span>No brands available yet</span>}
      </div>
    </div>
  );
}
