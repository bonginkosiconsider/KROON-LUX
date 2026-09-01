"use client";

import Link from "next/link";
import { useStoreTaxonomies } from "@/hooks/use-store-taxonomies";

export function BrandsLineup() {
  const { items: brands, loading } = useStoreTaxonomies("brands");
  const activeBrands = brands.filter((brand) => brand.active !== false);
  return <section className="brands-lineup section" aria-labelledby="brands-lineup-title"><div className="brands-lineup-heading"><p className="eyebrow gold">The Kroon Luxe edit</p><h1 id="brands-lineup-title">Our brands lineup</h1></div>{loading ? <div className="brands-lineup-grid" aria-label="Loading brands">{Array.from({ length: 4 }, (_, index) => <div className="brand-lineup-card brand-lineup-skeleton" key={index} />)}</div> : activeBrands.length ? <div className="brands-lineup-grid">{activeBrands.map((brand) => <Link aria-label={`Shop ${brand.name}`} className="brand-lineup-card" href={`/collections/${brand.slug}`} key={brand.id}><div className="brand-lineup-logo">{brand.logoUrl ? <img alt={`${brand.name} logo`} loading="lazy" src={brand.logoUrl} /> : <span aria-hidden="true">{brand.name.slice(0, 1)}</span>}</div><span className="brand-lineup-name">{brand.name} <b aria-hidden="true">→</b></span></Link>)}</div> : <div className="empty-state"><h2>Brands arriving soon.</h2><p>Our curated lineup will appear here as it becomes available.</p></div>}</section>;
}
