# KROON LUXE Platform Architecture

## Technology stack

- **Web and API:** Next.js App Router, TypeScript, React Server Components, route handlers for HTTP APIs.
- **Database:** PostgreSQL with Prisma ORM. Transactions protect checkout, inventory, payments, and commissions.
- **Authentication:** Argon2id password hashing, secure HTTP-only same-site session cookies, email verification and reset-token flows. OAuth can be added behind the same user contract.
- **Payments:** Stripe Payment Intents and signed webhooks. The browser never receives secret keys and an order is paid only from server verification.
- **Media:** S3-compatible object storage behind a CDN. Uploads use short-lived signed URLs, MIME/size validation, and generated responsive derivatives.
- **Email and jobs:** Provider-neutral notification service with an outbox table and a queue worker for email, image processing, and reports.
- **Validation and observability:** Zod at API boundaries, structured logs with request IDs, OpenTelemetry-compatible instrumentation, and rate limiting at the edge/API layer.
- **Testing and delivery:** Vitest for domain logic, Playwright for critical flows, Docker Compose for local PostgreSQL, and CI for typecheck, lint, test, and build.

## Architecture boundaries

`app/` owns routes, layouts, metadata, and server actions. `components/` owns reusable UI. `server/` owns authentication, authorization, database access, domain services, payment, media, mail, jobs, and analytics. Domain services are called by both customer and admin endpoints so business rules are not duplicated in UI components.

Sensitive admin APIs call `requireAdmin()` independently. The initial authorization policy allows exactly two configured admin identities, while roles and permissions remain extensible. A customer session, client-side role, hidden route, or UI condition is never treated as authorization.

## Core relational model

- `User` -> customer identity, profile, verified email, password hash, status, timestamps.
- `AdminGrant` -> user, role, enabled flag; database constraint and bootstrap check enforce the two-admin deployment policy.
- `Session`, `VerificationToken`, `PasswordResetToken` -> hashed, expiring authentication artifacts.
- `Product`, `ProductImage`, `ProductVariant`, `ProductAttribute`, `Category`, `Collection`, `Tag`, and join tables -> normalized catalog with indexed slug, status, price, searchable fields, and variant SKU.
- `InventoryLedger` -> immutable stock movements plus current quantity/reserved quantity on variant; unique SKU and transactional reservation prevent overselling.
- `Cart`, `CartItem` -> user or signed guest cart; item identity includes `variantId` and never only `productId`.
- `Address`, `Order`, `OrderItem`, `Payment` -> immutable price snapshots, shipping snapshot, payment state, and fulfillment state.
- `Coupon`, `CouponRedemption` -> scoped rules, usage constraints, and transactional redemption.
- `WishlistItem`, `Review` -> unique user/product records and verified-purchase review eligibility.
- `Promoter`, `ReferralClick`, `ReferralAttribution`, `ReferralCommission` -> fraud-resistant attribution, unique qualifying order commission, approval and payout states.
- `Notification`, `OutboxEvent`, `AuditLog`, `StoreSetting` -> provider-neutral delivery, operational traceability, and encrypted/secret-backed settings.

Indexes cover product status/category/collection, full-text search fields, variant SKU, order customer/status/createdAt, referral code, and analytics date dimensions. Foreign keys, unique constraints, check constraints, and soft archive fields preserve history.

## API structure

- `/api/auth/*` - register, login, logout, verify email, reset password.
- `/api/catalog/*` - paginated products, filters, search suggestions, product details.
- `/api/cart/*` - read, add, update, remove, clear; server recalculates price and stock.
- `/api/checkout/*` - validate cart, create pending order/payment intent.
- `/api/payments/webhook` - verify Stripe signature, then execute the checkout transaction and enqueue notifications.
- `/api/orders/*` - customer-owned history/details; admin fulfillment operations are separate.
- `/api/referrals/*` - attribution, promoter dashboard, and public referral landing.
- `/api/admin/*` - independently protected products, inventory, orders, customers, coupons, referrals, analytics, settings, and audit log APIs.

Responses use `{ data }` for success and `{ error: { code, message, fieldErrors? } }` for failure. Pagination uses cursor/limit and all input is validated server-side.

## Checkout and referral transaction

The webhook handler re-fetches the cart and catalog data, verifies the payment amount and currency, locks eligible inventory rows, creates the order and immutable items, records payment, consumes a coupon, creates at most one commission for the qualifying order, and writes outbox/audit events in one database transaction. Failure rolls back the transaction and leaves the payment/order in a recoverable state. Referral attribution is signed/opaque, expires, rejects self-referrals, and is deduplicated by visitor/order constraints.

## Admin isolation

Admin pages use a server-side layout guard for UX, but every admin route handler repeats `requireAdmin()` and permission checks. Admin identity allowlisting is configured with two deployment secrets/identifiers and seeded as two `AdminGrant` rows; no public signup can create admin access. Login, changes to catalog/orders/financial settings, commission actions, and failed authorization attempts create audit records.

## Folder structure

```text
app/                 storefront routes, admin routes, API handlers
components/           shared storefront/admin UI
server/auth/          sessions, passwords, admin authorization
server/db/            Prisma client and repositories
server/domain/        catalog, cart, checkout, referrals, coupons, orders
server/services/      payments, storage, email, jobs, analytics
prisma/               schema and migrations
lib/                  shared validation, formatting, config, errors
tests/                unit/integration tests
public/                static brand assets only; product media stays in object storage
docs/                  runbooks and deployment notes
```

## Main risks and mitigations

- **Overselling or partial checkout:** row locks, idempotency keys, webhook-only payment confirmation, and one transaction.
- **Admin compromise:** Argon2id, secure sessions, rate limits, two-identity allowlist, repeated server checks, audit logs, and no secrets in client bundles.
- **Referral abuse:** signed expiring attribution, self-referral rejection, unique order commission, campaign eligibility, and manual approval/payout.
- **Search/catalog load:** indexed PostgreSQL search, cursor pagination, CDN images, cacheable read endpoints, and never loading the full catalog in the browser.
- **Upload/XSS risk:** signed uploads, strict content validation, image re-encoding, safe rendering, CSP, and no raw HTML from product content.
- **Operational scale:** connection pooling, cache boundaries, outbox/queue processing, structured telemetry, and stateless web instances.

## Delivery sequence

1. Foundation, schema, secure auth/admin boundary, design system, and storefront shell.
2. Catalog management and customer catalog/search/cart.
3. Checkout, payment webhooks, orders, inventory, coupons, and notifications.
4. Accounts, wishlist, reviews, referrals, promoter dashboard, and admin analytics.
5. Production hardening: object storage, queues, rate limits, observability, CI/CD, migrations, and end-to-end tests.
