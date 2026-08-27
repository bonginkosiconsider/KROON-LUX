export default function AdminSettingsPage() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow gold">Configuration</p>
          <h1>Settings</h1>
        </div>
        <span>Secrets stay in environment variables</span>
      </header>

      <section className="settings-grid">
        <article>
          <p className="eyebrow">Store</p>
          <h2>Brand and commerce defaults</h2>
          <p>Store name, currency, contact details, policy links, and social profiles are modeled in `StoreSetting` for admin-managed configuration.</p>
        </article>
        <article>
          <p className="eyebrow">Payments</p>
          <h2>Server-side verification</h2>
          <p>Payment provider secrets are read only on the server and orders are not marked paid until webhook verification is implemented.</p>
        </article>
        <article>
          <p className="eyebrow">Media</p>
          <h2>CDN-compatible storage</h2>
          <p>Product media fields store URLs and object keys so S3-compatible upload signing can be added without storing product images in the app server.</p>
        </article>
        <article>
          <p className="eyebrow">Referral rules</p>
          <h2>Commission controls</h2>
          <p>Promoter records contain attribution duration, commission rate, fixed commission, minimum payout, and campaign windows.</p>
        </article>
      </section>
    </>
  );
}

