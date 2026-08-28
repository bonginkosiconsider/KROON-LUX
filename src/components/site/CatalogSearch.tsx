"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setRecent(JSON.parse(window.localStorage.getItem(recentKey) ?? "[]"));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
      if (!response.ok) return;
      const body = (await response.json()) as { data: Suggestion[] };
      setSuggestions(body.data);
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

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
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15.2 15.2 4 4" /></svg>
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
