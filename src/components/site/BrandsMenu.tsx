"use client";

import Link from "next/link";
import { useState } from "react";
import { useStoreTaxonomies } from "@/hooks/use-store-taxonomies";

export function BrandsMenu() {
  const { items: brands } = useStoreTaxonomies("brands");
  const [open, setOpen] = useState(false);
  return <div className={`brands-menu${open ? " is-open" : ""}`}><button aria-expanded={open} aria-haspopup="true" className="brands-menu-trigger" onClick={() => setOpen((current) => !current)} type="button">Brands <span aria-hidden="true">⌄</span></button><div className="brands-menu-panel">{brands.length ? brands.map((brand) => <Link href={`/collections/${brand.slug}`} key={brand.id} onClick={() => setOpen(false)}>{brand.name}</Link>) : <span>No brands available yet</span>}</div></div>;
}
