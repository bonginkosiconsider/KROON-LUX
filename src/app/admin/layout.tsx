import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect("/account?next=/admin");
  }

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
      <main className="admin-main">{children}</main>
    </div>
  );
}

