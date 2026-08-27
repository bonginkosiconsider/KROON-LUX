import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://kroonluxe.example"),
  title: {
    default: "KROON LUXE | Modern heirlooms",
    template: "%s | KROON LUXE",
  },
  description: "A considered wardrobe of modern heirlooms, designed in Johannesburg.",
  openGraph: {
    title: "KROON LUXE",
    description: "A considered wardrobe of modern heirlooms, designed in Johannesburg.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
