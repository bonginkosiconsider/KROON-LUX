import { LazyAdminWorkspace } from "@/components/firebase/LazyAdminWorkspace";

export default function AdminPromotersPage() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Marketing</p>
          <h1>Promoters</h1>
        </div>
        <span>Applications, discounts, and referrals</span>
      </header>
      <LazyAdminWorkspace workspace="promoters" />
    </>
  );
}
