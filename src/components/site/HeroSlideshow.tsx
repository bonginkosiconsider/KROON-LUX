"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStoreTaxonomies } from "@/hooks/use-store-taxonomies";
import { defaultStoreSettings, subscribeStoreSettings, type HeroSlide, type StoreSettings } from "@/services/firebase-settings";
import styles from "./HeroSlideshow.module.css";

export function HeroSlideshow() {
  const [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings);
  const [activeIndex, setActiveIndex] = useState(0);
  const [navigationVersion, setNavigationVersion] = useState(0);
  const { items: brands } = useStoreTaxonomies("brands");
  useEffect(() => subscribeStoreSettings(setSettings), []);

  const slides = useMemo(() => settings.heroSlides.filter((slide) => slide.enabled && slide.imageUrl).sort((a, b) => a.sortOrder - b.sortOrder), [settings.heroSlides]);
  const selectSlide = useCallback((index: number) => { setActiveIndex((index + slides.length) % slides.length); setNavigationVersion((current) => current + 1); }, [slides.length]);
  useEffect(() => {
    setActiveIndex((current) => slides.length ? current % slides.length : 0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % slides.length), settings.heroAutoplaySeconds * 1000);
    return () => window.clearInterval(timer);
  }, [navigationVersion, settings.heroAutoplaySeconds, slides.length]);
  if (!slides.length) return null;
  const displayedIndex = activeIndex % slides.length;

  return <section aria-roledescription="carousel" aria-label="Featured collections" className={styles.hero} onKeyDown={(event) => { if (event.key === "ArrowLeft") selectSlide(displayedIndex - 1); if (event.key === "ArrowRight") selectSlide(displayedIndex + 1); }} tabIndex={0}>
    <div className={styles.slides}>{slides.map((slide, index) => <SlideVisual active={index === displayedIndex} key={slide.id} slide={slide} />)}</div>
    {slides.map((slide, index) => {
      const brand = brands.find((item) => item.id === slide.brandId);
      const href = brand ? `/collections/${brand.slug}` : "/shop";
      return <div aria-hidden={index !== displayedIndex} className={`${styles.overlay} ${styles[slide.textPosition]} ${index === displayedIndex ? styles.contentActive : ""}`} key={`content-${slide.id}`}>
        <p className={styles.eyebrow}>{brand?.name || "Kroon Luxe"}</p>{slide.headline ? <h1>{slide.headline}</h1> : null}<a className={styles.cta} href={href} tabIndex={index === displayedIndex ? 0 : -1}>{slide.ctaText || "SHOP THE COLLECTION"}</a>
      </div>;
    })}
    {slides.length > 1 ? <><div className={styles.controls}><button aria-label="Previous slide" onClick={() => selectSlide(displayedIndex - 1)} type="button">←</button><button aria-label="Next slide" onClick={() => selectSlide(displayedIndex + 1)} type="button">→</button></div><div aria-label="Hero slideshow navigation" className={styles.dots}>{slides.map((slide, index) => <button aria-current={index === displayedIndex ? "true" : undefined} aria-label={`Show slide ${index + 1}`} className={`${styles.dot} ${index === displayedIndex ? styles.activeDot : ""}`} key={slide.id} onClick={() => selectSlide(index)} type="button" />)}</div></> : null}
  </section>;
}

function SlideVisual({ active, slide }: { active: boolean; slide: HeroSlide }) {
  return <div aria-hidden={!active} className={`${styles.slide} ${active ? styles.active : ""}`}><picture>{slide.mobileImageUrl ? <source media="(max-width: 767px)" srcSet={slide.mobileImageUrl} /> : null}<img alt={active ? slide.altText : ""} className={styles.image} fetchPriority={active ? "high" : "auto"} src={slide.imageUrl} /></picture></div>;
}
