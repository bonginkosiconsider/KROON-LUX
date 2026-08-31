"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGate } from "@/components/firebase/AdminGate";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { auth } from "@/lib/firebase";

const navigation = [
  ["/admin", "Overview"], ["/admin/products", "Products"], ["/admin/categories", "Categories"], ["/admin/brands", "Brands"], ["/admin/collections", "Collections"],
  ["/admin/shipping-zones", "Shipping Zones"], ["/admin/tax-rates", "Tax Rates"], ["/admin/analytics", "Analytics"],
  ["/admin/orders", "Orders"], ["/admin/returns", "Returns"], ["/admin/payouts", "Payouts"],
  ["/admin/my-store", "My Store"], ["/admin/settings", "Settings"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useFirebaseAuth();
  return <AdminGate><div className="admin-shell"><aside className="admin-sidebar"><Link className="wordmark" href="/admin"><span>K</span>ROON <b>admin</b></Link><nav aria-label="Admin navigation" className="admin-navigation"><p>Site management</p>{navigation.map(([href, label]) => <Link className={pathname === href ? "active" : undefined} href={href} key={href}>{label}</Link>)}</nav><div className="admin-bottom-actions"><Link className="text-link" href="/">View Live Store</Link><button className="text-link" onClick={() => signOut(auth)}>Logout</button></div></aside><main className="admin-main"><header className="admin-topbar"><div><strong>KROON LUXE</strong><span>Store dashboard</span></div><div><button aria-label="Notifications" className="admin-icon-button">●</button><span className="admin-avatar">{user?.email?.slice(0, 1).toUpperCase() ?? "A"}</span><span className="admin-user-email">{user?.email ?? "Administrator"}</span></div></header>{children}</main></div></AdminGate>;
}
