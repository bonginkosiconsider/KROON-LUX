type AnnouncementBarConfig = {
  isVisible: boolean;
  autoRotate: boolean;
  rotationIntervalMs: number;
  transitionDurationMs: number;
  announcements: string[];
};

/**
 * Announcement bar settings
 * Edit the messages and behaviour here.
 */
export const announcementBarConfig: AnnouncementBarConfig = {
  isVisible: true,
  autoRotate: true,
  rotationIntervalMs: 4000,
  transitionDurationMs: 420,
  announcements: [
    "FREE DELIVERIES ON ORDERS ABOVE R999",
    "DELIVERY TAKES 2-5 BUSINESS DAYS",
  ],
};
