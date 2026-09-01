"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Testimonial } from "@/lib/firebase-models";
import { subscribeTestimonials } from "@/services/firebase-testimonials";

const ROTATION_MS = 6000;

function Stars({ rating }: { rating: number }) {
  return <div aria-label={`${rating} out of 5 stars`} className="testimonial-stars">{Array.from({ length: 5 }, (_, index) => <svg aria-hidden="true" className={index < rating ? "is-filled" : ""} key={index} viewBox="0 0 24 24"><path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z" /></svg>)}</div>;
}

function Portrait({ testimonial }: { testimonial: Testimonial }) {
  return <div className="testimonial-portrait">{testimonial.imageUrl ? (
    // Firebase Storage download URLs are dynamic, so a plain image preserves the existing upload pattern.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={`${testimonial.customerName}'s portrait`} src={testimonial.imageUrl} />
  ) : <span aria-hidden="true">{testimonial.customerName.slice(0, 1).toUpperCase()}</span>}</div>;
}

export function TestimonialCarousel() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [index, setIndex] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const touchStart = useRef<number | null>(null);

  useEffect(() => subscribeTestimonials((items) => setTestimonials(items.filter((item) => item.active))), []);

  const visibleIndex = testimonials.length ? index % testimonials.length : 0;
  const change = useCallback((next: number) => {
    if (!testimonials.length) return;
    setIndex((next + testimonials.length) % testimonials.length);
    setTimerKey((key) => key + 1);
  }, [testimonials.length]);

  useEffect(() => {
    if (testimonials.length < 2) return;
    const timer = window.setTimeout(() => change(visibleIndex + 1), ROTATION_MS);
    return () => window.clearTimeout(timer);
  }, [change, testimonials.length, timerKey, visibleIndex]);

  if (!testimonials.length) return null;
  const testimonial = testimonials[visibleIndex];

  return <section aria-label="Customer testimonials" className="testimonials" onTouchEnd={(event) => {
    if (touchStart.current === null) return;
    const difference = event.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(difference) >= 40) change(visibleIndex + (difference < 0 ? 1 : -1));
  }} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}>
    <div className="testimonial-content" key={testimonial.id}><Portrait testimonial={testimonial} /><Stars rating={testimonial.rating} /><blockquote>“{testimonial.message}”</blockquote><p className="testimonial-name">— {testimonial.customerName}</p></div>
    {testimonials.length > 1 ? <div aria-label="Testimonial navigation" className="testimonial-dots">{testimonials.map((item, dotIndex) => <button aria-current={dotIndex === visibleIndex ? "true" : undefined} aria-label={`Show testimonial from ${item.customerName}`} className={dotIndex === visibleIndex ? "is-active" : ""} key={item.id} onClick={() => change(dotIndex)} type="button" />)}</div> : null}
  </section>;
}
