import { LazyAdminWorkspace } from "@/components/firebase/LazyAdminWorkspace";

export default function AdminProductsPage() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow gold">Catalog</p>
          <h1>Products</h1>
        </div>
        <span>Real-time catalog</span>
      </header>

      <LazyAdminWorkspace workspace="products" />
    </>
  );
}

