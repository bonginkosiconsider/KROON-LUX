# Firebase setup

1. In the Firebase console for `jozi-plug`, enable **Authentication → Sign-in method → Email/Password**, create your administrator account, and enable Firestore Database and Storage.
2. Start the site with `npm run dev`. The supplied client configuration is in `.env.local`; it is ignored by Git.
3. After the admin account has signed in once, create `users/<Firebase Auth UID>` in Firestore with:

   ```json
   { "email": "admin@example.com", "role": "admin" }
   ```

   Only do this manually for trusted administrators. All ordinary user profiles must use `role: "customer"`.
4. Install the Firebase CLI and deploy the included policies:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use jozi-plug
   firebase deploy --only firestore:rules,storage
   ```

The admin UI writes `products`, reads/updates `orders`, and uploads product files at `products/<uuid>-<filename>`. The included rules allow only an authenticated user whose Firestore profile has `role: "admin"` to manage products, orders, or uploads. Published products and product images remain public.

Customer order creation is available through `createOrder` in `src/services/firebase-orders.ts`; pass the authenticated user's UID as `customerId` to satisfy the Firestore rule.
