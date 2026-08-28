import Link from "next/link";
import { AdminGate } from "@/components/firebase/AdminGate";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="wordmark" href="/admin">
          <span>K</span>ROON OPS
        </Link>
        <nav aria-label="Admin navigation">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/products">Products</Link>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/admin/referrals">Referrals</Link>
          <Link href="/admin/settings">Settings</Link>
        </nav>
        <Link className="text-link" href="/">
          Storefront
        </Link>
      </aside>
      <main className="admin-main"><AdminGate>{children}</AdminGate></main>
    </div>
  );
}

