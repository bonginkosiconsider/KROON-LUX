"use client";

import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { announcementBarConfig } from "@/config/announcement-bar";
import { useStoreSettings } from "@/hooks/use-store-settings";

export function AnnouncementBar() {
  const {
    announcements,
    autoRotate,
    isVisible,
    rotationIntervalMs,
    transitionDurationMs,
  } = announcementBarConfig;
  const { announcement } = useStoreSettings();
  const messages = announcement.trim() ? [announcement.trim()] : announcements;
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);

  useEffect(() => {
    if (!autoRotate || messages.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveAnnouncement((current) => (current + 1) % messages.length);
    }, rotationIntervalMs);

    return () => window.clearInterval(interval);
  }, [messages.length, autoRotate, rotationIntervalMs]);

  if (!isVisible || messages.length === 0) return null;
  const active = activeAnnouncement % messages.length;
  const selectPrevious = () => setActiveAnnouncement((current) => (current - 1 + messages.length) % messages.length);
  const selectNext = () => setActiveAnnouncement((current) => (current + 1) % messages.length);

  return (
    <aside
      aria-label="Store announcements"
      className="announcement-bar"
      style={{ "--announcement-transition-duration": `${transitionDurationMs}ms` } as React.CSSProperties}
    >
      <button className="announcement-bar-control announcement-bar-control-previous" type="button" onClick={selectPrevious} aria-label="Previous announcement">
        <FiChevronLeft aria-hidden="true" />
      </button>
      <div className="announcement-bar-content" aria-live="polite">
        {messages.map((message, index) => (
          <p
            aria-hidden={index !== active}
            className={`announcement-bar-message${index === active ? " is-active" : ""}`}
            key={message}
          >
            {message}
          </p>
        ))}
      </div>
      <button className="announcement-bar-control announcement-bar-control-next" type="button" onClick={selectNext} aria-label="Next announcement">
        <FiChevronRight aria-hidden="true" />
      </button>
    </aside>
  );
}
