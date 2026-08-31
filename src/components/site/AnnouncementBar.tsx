"use client";

import { useEffect, useState } from "react";
import { announcementBarConfig } from "@/config/announcement-bar";

export function AnnouncementBar() {
  const {
    announcements,
    autoRotate,
    isVisible,
    rotationIntervalMs,
    transitionDurationMs,
  } = announcementBarConfig;
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);

  useEffect(() => {
    if (!autoRotate || announcements.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveAnnouncement((current) => (current + 1) % announcements.length);
    }, rotationIntervalMs);

    return () => window.clearInterval(interval);
  }, [announcements.length, autoRotate, rotationIntervalMs]);

  if (!isVisible || announcements.length === 0) return null;

  return (
    <aside
      aria-label="Store announcements"
      className="announcement-bar"
      style={{ "--announcement-transition-duration": `${transitionDurationMs}ms` } as React.CSSProperties}
    >
      <div className="announcement-bar-content">
        {announcements.map((announcement, index) => (
          <p
            aria-hidden={index !== activeAnnouncement}
            className={`announcement-bar-message${index === activeAnnouncement ? " is-active" : ""}`}
            key={announcement}
          >
            {announcement}
          </p>
        ))}
      </div>
    </aside>
  );
}
