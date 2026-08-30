"use client";

import { useEffect, useState } from "react";
import { defaultStoreSettings, subscribeStoreSettings, type HeroSlide } from "@/services/firebase-settings";
import styles from "./HeroSlideshow.module.css";

const AUTOPLAY_DELAY = 3000;

export function HeroSlideshow() {
  const [slides, setSlides] = useState<HeroSlide[]>(defaultStoreSettings.heroSlides);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => subscribeStoreSettings((settings) => setSlides(settings.heroSlides.filter((slide) => slide.imageUrl))), []);

  useEffect(() => {
    if (slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_DELAY);

    return () => window.clearInterval(interval);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <section className={styles.hero} aria-label="Featured collections">
      <div className={styles.slides}>
        {slides.map((slide, index) => (
          <a
            aria-hidden={index !== activeIndex}
            className={`${styles.slide} ${index === activeIndex ? styles.active : ""}`}
            href={slide.linkUrl || "/shop"}
            key={`${slide.imageUrl}-${index}`}
            tabIndex={index === activeIndex ? 0 : -1}
          >
            <img alt={slide.altText} className={styles.image} src={slide.imageUrl} />
          </a>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className={styles.dots} aria-label="Hero slideshow navigation">
          {slides.map((slide, index) => (
            <button
              aria-current={index === activeIndex ? "true" : undefined}
              aria-label={`Show slide ${index + 1}`}
              className={`${styles.dot} ${index === activeIndex ? styles.activeDot : ""}`}
              key={`dot-${slide.imageUrl}-${index}`}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
