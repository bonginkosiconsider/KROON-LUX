"use client";

import { useEffect, useState } from "react";
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

  return (
    <aside
      aria-label="Store announcements"
      className="announcement-bar"
      style={{ "--announcement-transition-duration": `${transitionDurationMs}ms` } as React.CSSProperties}
    >
      <div className="announcement-bar-content">
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
    </aside>
  );
}
