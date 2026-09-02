"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useProducts } from "@/hooks/use-products";

type Suggestion = {
  id: string;
  label: string;
  slug: string;
  brand: string | null;
  category: string | null;
};

const recentKey = "kroon-luxe-recent-searches";

export function CatalogSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { products } = useProducts();
  const suggestions = useMemo<Suggestion[]>(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return products.filter((product) => [product.title, product.category, product.sku, product.tags?.join(" ")].filter(Boolean).some((value) => String(value).toLowerCase().includes(term))).slice(0, 8).map((product) => ({ id: product.id, label: product.title, slug: product.slug, brand: null, category: product.category }));
  }, [products, query]);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = JSON.parse(window.localStorage.getItem(recentKey) ?? "[]");
      window.setTimeout(() => { if (!cancelled && Array.isArray(stored)) setRecent(stored.filter((item): item is string => typeof item === "string")); }, 0);
    } catch {
      window.setTimeout(() => { if (!cancelled) setRecent([]); }, 0);
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function remember(value: string) {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 5);
    setRecent(next);
    window.localStorage.setItem(recentKey, JSON.stringify(next));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!query.trim()) event.preventDefault();
    else remember(query.trim());
  }

  return (
    <div className="catalog-search" ref={dialogRef}>
      <button className="header-icon" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="catalog-search-panel">
        <span className="sr-only">Search the catalog</span>
        <FiSearch aria-hidden="true" />
      </button>
      {open ? (
        <div className="search-popover" id="catalog-search-panel">
          <form action="/shop" onSubmit={submit}>
            <label className="sr-only" htmlFor="catalog-search">Search products</label>
            <input id="catalog-search" name="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pieces, brands or categories" />
            <button className="button button-dark" type="submit">Search</button>
          </form>
          {suggestions.length > 0 ? (
            <div className="search-results" aria-live="polite">
              <p className="eyebrow">Suggestions</p>
              {suggestions.map((item) => (
                <Link href={`/products/${item.slug}`} key={item.id} onClick={() => { remember(query.trim()); setOpen(false); }}>
                  <strong>{item.label}</strong><span>{item.brand ?? item.category ?? "Kroon Luxe"}</span>
                </Link>
              ))}
            </div>
          ) : query.trim().length >= 2 ? <p className="search-empty">No pieces found. Try a different search.</p> : recent.length > 0 ? (
            <div className="recent-searches"><p className="eyebrow">Recent searches</p>{recent.map((item) => <Link href={`/shop?search=${encodeURIComponent(item)}`} key={item} onClick={() => setOpen(false)}>{item}</Link>)}</div>
          ) : <p className="search-empty">Search the current collection.</p>}
        </div>
      ) : null}
    </div>
  );
}
