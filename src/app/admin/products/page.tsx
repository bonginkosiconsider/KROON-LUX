import { formatMoney } from "@/lib/format";
import { listAdminProducts } from "@/server/admin/catalog";

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow gold">Catalog</p>
          <h1>Products</h1>
        </div>
        <span>{products.length} loaded</span>
      </header>

      <section className="admin-panel">
        <div className="admin-table">
          <div className="admin-table-row admin-table-head">
            <span>Product</span>
            <span>Status</span>
            <span>Price</span>
            <span>Variants</span>
            <span>Stock</span>
          </div>
          {products.length > 0 ? (
            products.map((product) => {
              const stock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity - variant.reservedStock, 0);
              return (
                <div className="admin-table-row" key={product.id}>
                  <span>{product.name}</span>
                  <span>{product.status}</span>
                  <span>{formatMoney(product.startingPriceCents)}</span>
                  <span>{product.variants.length}</span>
                  <span>{stock}</span>
                </div>
              );
            })
          ) : (
            <p className="empty-catalog">Create products through the protected `/api/admin/products` endpoint.</p>
          )}
        </div>
      </section>
    </>
  );
}

