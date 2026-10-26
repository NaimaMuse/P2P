# YouSupply Wholesale Marketplace

Express 5 / Mongoose backend for buyers, wholesale suppliers and administrators. The existing frontend is unchanged.

## Backend structure

```text
backend/
  config/db.js
  models/{User,Supplier,Category,Product,Order}.js
  controllers/{auth,supplier,product,category,order,admin}Controller.js
  routes/{auth,supplier,product,category,order,admin}Routes.js
  middleware/{authMiddleware,roleMiddleware,errorMiddleware}.js
  utils/{generateToken,helpers}.js
  tests/api.test.js
  .env                 # local only, ignored
  .env.example
  .gitignore
  package.json
  package-lock.json
  server.js
```

## Configure and run

Requires Node.js 20.19+ (Node 24 recommended) and a MongoDB replica set or sharded cluster. A standalone MongoDB server cannot run checkout transactions; startup rejects it. Atlas supports transactions. Use a database user authorized for the application database and allow the backend host in Atlas network access.

```powershell
cd backend
npm install
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Paste the generated secret into `.env` as `JWT_SECRET`. Set `MONGO_URI` to your Atlas connection string or local replica-set URI. Set `CLIENT_URL` to the React origin. Never commit `.env` or database credentials.

For a fresh local development database, start a dedicated MongoDB process in one terminal (adjust the executable path). Do not reuse the data directory of an existing MongoDB service:

```powershell
New-Item -ItemType Directory -Force .mongo-data
& 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe' --dbpath .mongo-data --replSet p2p-rs --bind_ip 127.0.0.1 --port 27018
```

In a second terminal initialize it with mongosh:

```powershell
mongosh "mongodb://127.0.0.1:27018" --eval "rs.initiate()"
```

Wait for PRIMARY, then configure:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27018/p2p?replicaSet=p2p-rs
JWT_SECRET=your_generated_secret
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

```powershell
npm run dev
# or
npm start
```

`GET http://localhost:5000/api/health` returns `{ "success": true, "message": "YouSupply API is running" }`.

## Authentication and first administrator

Registration accepts only `buyer` or `supplier` (buyer by default). Passwords require at least 8 characters and at most 72 UTF-8 bytes. Tokens expire after 7 days. Send `Authorization: Bearer <token>` on private requests. Every private request checks the current account status and role in MongoDB.

Register a normal account for the initial administrator, then promote that specific email using a trusted database connection in mongosh:

```javascript
use p2p
db.users.updateOne({ email: 'admin@example.com' }, { $set: { role: 'admin' } })
```

There is no public admin creation or role-change endpoint. Log in to obtain the administrator token. Suppliers create their profile with `PUT /api/suppliers/me`; approval is required before product changes. Changing business details resets verification to pending. Suspended suppliers and unapproved profiles have no public listings.

## API endpoints

All paths start with `/api`. Success responses have `success`, `message`, and `data` (health omits data). Errors have `success: false` and `message`. Lists use `data.items` and `data.pagination`, except categories return an array. Pagination: `?page=1&limit=20` (maximum 100).

| Method | Path | Access / purpose |
| --- | --- | --- |
| GET | /health | Public health |
| POST | /auth/register | Public registration |
| POST | /auth/login | Public login |
| GET | /auth/me | Authenticated account |
| GET | /products | Public; search, category, page, limit |
| GET | /products/:id | Public active product |
| POST | /products | Approved supplier |
| PUT | /products/:id | Approved owner supplier |
| DELETE | /products/:id | Approved owner; deactivate |
| GET | /categories | Public |
| POST | /categories | Admin |
| PUT | /categories/:id | Admin |
| DELETE | /categories/:id | Admin; blocked if referenced |
| GET | /suppliers/me | Supplier's own profile |
| PUT | /suppliers/me | Supplier; create/update business profile |
| GET | /suppliers/me/products | Supplier's private product list |
| GET | /suppliers/me/orders | Supplier's incoming items only |
| GET | /suppliers/:id | Public approved business details |
| POST | /orders | Buyer checkout |
| GET | /orders/my-orders | Buyer's history |
| GET | /orders/:id | Owner buyer, relevant supplier, admin |
| PATCH | /orders/:id/fulfillment | Supplier's own item only |
| GET | /admin/users | Admin |
| PATCH | /admin/users/:id/status | Admin; active or suspended |
| GET | /admin/suppliers | Admin |
| PATCH | /admin/suppliers/:id/verification | Admin; pending, approved, rejected |
| GET | /admin/products | Admin; includes inactive |
| DELETE | /admin/products/:id | Admin; deactivate |
| GET | /admin/orders | Admin |

## Postman walkthrough

Create variables `baseUrl=http://localhost:5000/api`, `buyerToken`, `supplierToken`, `adminToken`, `categoryId`, `productId`, `orderId`. Select raw JSON bodies and Content-Type application/json. Use Postman's Bearer Token authorization for private requests.

1. POST `{{baseUrl}}/auth/register` with `{ "name": "Buyer", "email": "buyer@example.com", "password": "StrongPass123!", "role": "buyer" }`. Save `data.token` as buyerToken. Repeat with a supplier email and role supplier. POST `/auth/login` with email and password to refresh tokens.
2. As supplier, PUT `/suppliers/me` with `{ "companyName": "Wholesale Ltd", "address": "Nairobi", "phone": "+254700000000" }`. Save `data._id`.
3. As admin, PATCH `/admin/suppliers/<supplierId>/verification` with `{ "verificationStatus": "approved" }`.
4. As admin, POST `/categories` with `{ "name": "Food", "description": "Wholesale groceries" }`. Save the category ID.
5. As supplier, POST `/products` with `{ "category": "<categoryId>", "name": "Bulk Rice", "description": "Wholesale rice", "price": 1250, "stockQuantity": 100, "minimumOrderQuantity": 5, "unit": "bag", "images": [] }`.
6. GET `/products?search=rice&category=<categoryId>&page=1&limit=20` publicly.
7. As buyer, POST `/orders` with `{ "items": [{ "product": "<productId>", "quantity": 5 }], "deliveryAddress": "Shop 10, Nairobi", "paymentMethod": "cash_on_delivery" }`. Save the order and item IDs. Do not send prices or totals. Repeat with items from another supplier to test a shared order.
8. As supplier, GET `/suppliers/me/orders`, then PATCH `/orders/<orderId>/fulfillment` with `{ "itemId": "<embeddedItemId>", "fulfillmentStatus": "processing" }`. Advance to shipped, then delivered. As buyer, GET `/orders/my-orders` or `/orders/<orderId>`.
9. Negative checks: submit quantity below MOQ or above stock; use another buyer token to read an order; use another supplier token to update an item; access `/admin/users` with buyerToken. Expect 400/409 or 403 errors.

## Order rules

Checkout uses database prices, integer cents for totals, embedded price/name snapshots, and conditional stock decrements within one transaction. A failed item rolls back every decrement and the order. Duplicate product IDs are rejected. Only cash_on_delivery is supported; payment always starts pending.

Item transitions: pending -> processing -> shipped -> delivered. Pending or processing can become cancelled; cancellation restores stock once, in the same transaction. Repeating the same status is idempotent. Shipped/delivered/cancelled cannot move backwards. Suppliers may fulfill existing orders while their business profile awaits re-verification, provided their user account remains active.

Overall status: all cancelled -> cancelled; ignoring cancelled items, all delivered -> delivered; all shipped/delivered -> shipped; all items pending -> pending; otherwise processing. Supplier responses contain only their own items, their own subtotal, delivery address, payment method and overall order status; buyer identity and whole-order payment status are omitted.

## Automated tests

```powershell
cd backend
npm test
```

Uses Node's test runner and mongodb-memory-server to start an isolated disposable single-node replica set. Tests never clear or connect to your application database. On this Windows installation it uses the existing MongoDB 8.3 binary. On other machines the helper downloads a MongoDB binary (internet access required); `MONGOMS_SYSTEM_BINARY` can identify a preinstalled binary. MongoDB integration setup failures fail the suite rather than silently claiming success.

Covers registration, login, invalid credentials, suspension, admin restrictions, supplier approval, products, ownership, search/filter/pagination, invalid checkout, rollback, multi-supplier orders, stored prices, access control, fulfillment, cancellation/restocking, and concurrent checkout preventing overselling.

## MVP boundaries

No frontend, uploads, cart persistence, live payments, courier integration, refunds, email verification, password reset or payment reconciliation endpoint. Image URLs are supplied by suppliers. Payment remains pending until a future trusted reconciliation workflow is added. No buyer cancellation endpoint. Production hosting should add HTTPS and request throttling. There is no checkout idempotency key; do not automatically retry an ambiguous successful checkout at the client. Category deletion checks existing references; category management and product creation should not be performed concurrently when removing categories.

## Verification results

Executed on 21 October 2026 with Node 24.16.0 and an isolated MongoDB 8.3.4 replica set: `npm test` passed 12 tests, 0 failures, 0 skipped, including all integration checks and concurrent checkout. JavaScript syntax checks also executed successfully.

`npm audit` reported three high-severity development dependency findings through nodemon -> chokidar -> braces. The suggested forced fix downgrades nodemon to an old major version, so it was not applied. Production deployments should use `npm ci --omit=dev` and `npm start`.

Production dependency audit: npm audit --omit=dev reported 0 vulnerabilities. Existing tracked backend/.env and backend/node_modules were removed from Git's index while keeping local files; .gitignore now excludes them.

## Registration repair and local startup

Registration was unreachable because the API would not start against the standalone MongoDB configured on port 27017. The local `.env` now points to a persistent, dedicated development replica set on port 27018. The existing standalone database and service are unchanged. The replica set is required to preserve transactional checkout.

Run these in separate terminals from the project folder:

```powershell
# Terminal 1 — persistent local database (automatically initializes its replica set)
cd backend
npm run db:local

# Terminal 2 — API
cd backend
npm run dev

# Terminal 3 — frontend
cd frontend
npm run dev
```

`db:local` uses your installed MongoDB executable, stores data in ignored `backend/.mongo-data`, and binds only to 127.0.0.1. Keep that terminal open; restarting the command reuses the data. If MongoDB is elsewhere, set `MONGOD_BINARY` to its executable path. Atlas users should retain their Atlas MONGO_URI and do not need db:local. The helper does not manage or stop an existing MongoDB service on 27017.

Buyer registration redirects to `/shop`. Supplier registration redirects to `/supplier/dashboard`, where the business profile can be created and submitted for admin verification. Registration posts `{ name, email, password, role }` to `/api/auth/register`; only buyer/supplier roles are accepted. Password whitespace is preserved, passwords are hashed by the User model, emails are normalized, and duplicate-email races return HTTP 409. Both localhost:5173 and 127.0.0.1:5173 are allowed in development; production retains only the configured CLIENT_URL origin. The server reads backend/.env even when launched from the project root.

Registration verification commands:

```powershell
cd backend
npm test
# In frontend, while the local database and API are running:
npm run test:registration
```

Executed after the repair: 17 backend tests passed; 5 browser registration tests passed against the real local API/MongoDB, including buyer/supplier persistence, working authentication, redirects, duplicate email, invalid inputs, and network error feedback. The live suite removes only the test accounts it creates. Normal frontend `npm test` excludes the opt-in live registration suite and continues using mocked API responses.

The final frontend regression run also passed all 7 tests (including responsive layouts). API health returned HTTP 200, the configured local replica set was PRIMARY, and no temporary registration-check accounts remained after cleanup.

Files changed for this repair:
- `backend/controllers/authController.js`: email/password validation, preserve password whitespace, sign JWT before saving an account.
- `backend/middleware/errorMiddleware.js`: consistent duplicate-email errors even during concurrent signups.
- `backend/server.js`: resolve .env from backend, ensure email index readiness, support both development loopback origins.
- `backend/scripts/startLocalMongo.js`, `backend/package.json`: repeatable persistent local replica-set startup.
- `backend/.env`, `backend/.env.example`: local replica-set URI (local secrets remain ignored).
- `frontend/src/pages/Login.jsx`: shared registration validation and role-specific redirect; Register.jsx itself and CSS are unchanged.
- `frontend/src/services/api.js`: actionable network/timeout errors.
- `frontend/src/context/AuthContext.jsx`: validate auth responses and prevent a stale session check overwriting newly registered authentication.
- `backend/tests/auth.test.js`, `frontend/tests/registration.live.spec.js`: authentication/database/browser coverage.
- `frontend/playwright.config.js`, `frontend/playwright.registration.config.js`, `frontend/package.json`: opt-in real registration test command.
- Root and frontend README files: setup, explanation and verification results.

## Product selling types

Suppliers now choose **Product Selling Type** instead of entering a visible measurement unit:

- `wholesale`: an integer minimum order quantity of at least 2 is required.
- `single`: minimumOrderQuantity is always normalized to 1, even if the client sends another numeric minimum. Buyers may order one or more items within available stock.

Both POST and PUT `/api/products` accept `sellingType`. A wholesale request includes `"sellingType": "wholesale", "minimumOrderQuantity": 10`; a single-item request includes `"sellingType": "single"`. Supplier approval and ownership rules are unchanged. Invalid types and invalid wholesale minimums return HTTP 400. Checkout validates the database selling type and minimum inside the existing stock transaction.

The `unit` measurement field is retained in MongoDB and supported by the API for backward compatibility. New products default to `piece`; editing through the updated form does not send or overwrite an existing unit. No database migration is required: older products without sellingType infer wholesale when their existing minimum is greater than 1, otherwise single. Their original minimum and measurement unit remain intact. The inferred type is included in API responses and persisted when a legacy product is subsequently saved.

Cards, details and cart show Wholesale / Single Item labels and item-based minimums. The form hides the minimum for single items and lets approved suppliers upload JPEG, PNG, or WebP photos (up to 10 images, 5 MB each). Photos are stored in `backend/uploads`; preserve this directory on persistent storage when deploying. Existing image URLs remain supported by the API. Frontend cart/checkout validation and authoritative backend order validation share the same selling-type rules.

### Shop registration

Order notifications: database-backed checkout saves a buyer confirmation and one new-order notification per supplier. Supplier fulfillment changes save buyer notifications for processing, shipping, delivery, and cancellation. Notifications are written in the same MongoDB transaction as the order update, and repeated updates to the same status do not generate duplicates. The navbar bell shows unread notifications and links to the relevant orders. Notifications refresh every 10 seconds while visible and on focus; supplier order lists refresh every 15 seconds and buyer My Orders every 10 seconds. Partial cancellations name the affected product and retain the correct overall multi-supplier status. GET `/api/auth/notifications` returns the current user's latest 30 notices and unread count; PATCH `/api/auth/notifications/:id/read` marks only that user's notice as read. These are in-app notifications, not email/SMS or browser push alerts. Sample orders remain local demonstrations.

The admin Suppliers tab includes every registered supplier account immediately. Admins can approve or reject accounts before shop details are submitted. Account approval is retained when the supplier first creates their shop profile. A shop profile is still needed to list products. Admin decisions are saved as in-app verification notifications and displayed on the supplier dashboard, which refreshes every 15 seconds while visible and on window focus. No email or SMS is sent.

Supplier commission is **$0.20 per purchased item** for new database-backed orders. It is deducted from supplier earnings; buyer prices and totals are unchanged. Each order item stores its rate, commission, and net supplier amount using integer-cent calculations. Cancelled items have zero commission and zero earnings. Supplier order totals include only that supplier's items, and administrators can review the individual fees. Historical orders have no retroactive fees. These are accounting records only: simulated payments do not collect commission or transfer payouts. The fixed fee can exceed an item's price if the supplier lists a product below $0.20.
 
Shop registration: open **Suppliers → Register your shop**, create a supplier account, then submit the shop name, category, business address, phone, description, and optional uploaded photo/logo. Administrators open **Suppliers**, click the shop name to review its details/photo, and approve or reject it. Approved shops appear in the public supplier directory even without products. After approval, the owner uses **My products → Add product** to enter product names, prices, quantities, categories, and uploaded photos. Shop profile changes require another admin review. Existing shops without category/photo remain compatible. Public shop listings use GET `/api/suppliers`; authenticated suppliers can upload their shop photo via POST `/api/suppliers/images` and save its returned URL with PUT `/api/suppliers/me`.

Checkout uses a short form: name is required; phone and location are optional for this demonstration. Buyers select Zaad or eDahab. These are **simulated payment choices**, with no PIN entry, wallet connection, transfer, or automatic paid status. Sample orders stay in the browser. Database-backed orders save the choice as `zaad_demo` or `edahab_demo` and keep `paymentStatus: pending`. The API still accepts `cash_on_delivery` for existing integrations. Sample checkout uses a short confirmation; database-backed orders retain explicit agreement acceptance with the terms collapsed for easier reading.

Checkout opens a purchase agreement dialog with refreshed product prices, quantities, suppliers, delivery address, and Cash on Delivery total. Buyers must check the acceptance box and choose **Agree and confirm purchase**. Going back or closing the dialog does not place an order. Demo checkout remains local and explicitly creates no real purchase contract.

API clients must first GET `/api/orders/agreement`, then POST `/api/orders` with the usual order fields plus `agreement: { accepted: true, version: "<returned version>" }` and `expectedTotal` matching the amount reviewed. The server rejects missing acceptance, outdated terms, and price changes; stock deductions roll back on failure. The server chooses the stored agreement text, hash, buyer identity, and acceptance time. Update the version in `backend/utils/purchaseAgreement.js` whenever changing its text.

New orders retain the agreement snapshot alongside product/supplier names, quantities, prices, total, and delivery address. Buyers can view and download the order record from My Orders; administrators can view acceptance in their Orders dashboard. Historical orders have no retroactive acceptance. The text hash identifies the saved terms; this is an application purchase record, not a digital signature or an externally tamper-proof archive.

Validation commands: `cd backend; npm test`, and in another terminal `cd frontend; npm test`. Added backend coverage includes new/edit operations, invalid minimums, normalization, raw legacy MongoDB records, retained measurement units, and mixed-type orders. Browser coverage includes form submission payloads, multiple image URLs, visibility of minimum fields, both purchase modes and restored carts.

Selling-type verification results: all 23 backend tests passed. All 3 new selling-type browser checks passed, covering single/bulk purchases, saved carts, supplier creation/editing, multiple images and hidden-unit preservation. The broader frontend run passed 16 checks; its remaining stale assertion expected the previously removed demo banner. That assertion was corrected and the affected supplier/admin preview check passed on rerun. Build and lint passed without warnings. The development API was restarted with the updated model/controllers and health returned HTTP 200. Test accounts/products were confined to the isolated backend test database or mocked browser API; application records were not migrated or rewritten.
