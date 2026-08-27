import { formatMoney } from "@/lib/format";
import { listAdminReferrals } from "@/server/admin/dashboard";

export default async function AdminReferralsPage() {
  const promoters = await listAdminReferrals();

  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow gold">Growth</p>
          <h1>Referrals</h1>
        </div>
        <span>{promoters.length} promoters</span>
      </header>

      <section className="admin-panel">
        <div className="admin-table">
          <div className="admin-table-row admin-table-head">
            <span>Promoter</span>
            <span>Code</span>
            <span>Status</span>
            <span>Clicks</span>
            <span>Commission</span>
          </div>
          {promoters.length > 0 ? (
            promoters.map((promoter) => {
              const commissionCents = promoter.commissions.reduce((sum, commission) => sum + commission.amountCents, 0);
              return (
                <div className="admin-table-row" key={promoter.id}>
                  <span>{promoter.user.firstName} {promoter.user.lastName}</span>
                  <span>{promoter.code}</span>
                  <span>{promoter.status}</span>
                  <span>{promoter._count.clicks}</span>
                  <span>{formatMoney(commissionCents)}</span>
                </div>
              );
            })
          ) : (
            <p className="empty-catalog">Approved promoters, clicks, conversions, and commissions will appear here.</p>
          )}
        </div>
      </section>
    </>
  );
}

