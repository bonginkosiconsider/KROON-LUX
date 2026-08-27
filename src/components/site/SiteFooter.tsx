import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="wordmark" href="/">
        <span>K</span>ROON LUXE
      </Link>
      <p>Modern heirlooms designed in Johannesburg.</p>
      <div className="footer-links">
        <Link href="/shop">Shop</Link>
        <Link href="/account">Account</Link>
        <Link href="/#newsletter">Newsletter</Link>
      </div>
      <small>Copyright 2026 Kroon Luxe</small>
    </footer>
  );
}

