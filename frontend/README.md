# YouSupply frontend

React + Vite, React Router, Axios, Lucide icons and plain CSS. Uses the requested navy, ivory, champagne and beige palette. Backend files are unchanged.

## Run

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The development server must use this origin for the backend's existing CORS configuration. Optional `.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the existing backend separately after configuring its MongoDB replica set/Atlas connection. The frontend uses the live API when it responds; if catalog loading fails it displays a labeled demo catalog with sixteen products across all twelve requested categories. An empty live catalog also shows a clearly labeled sample collection. Demo items keep their isDemo flag, so checkout creates only local sample orders. Real products always take priority.

## Pages and behavior

- `/`: mixed-product hero, eight category cards, featured products, promotional collection, diverse new arrivals, four service benefits, footer.
- `/shop`: search products/suppliers, twelve category filters, minimum/maximum price, sorting, pagination, supplier-specific collections.
- `/categories`, `/suppliers`: category and supplier directories.
- `/products/:id`: product photography, supplier, stock, wholesale pricing and validated minimum quantity.
- `/cart`: browser-persisted bag, quantity changes, removal, subtotal.
- `/checkout`: delivery information, Cash on Delivery, optional payment simulation. Demo carts create local demo orders only. Real carts use POST /api/orders; frontend prices and payment status are never submitted. Mixed live/demo carts must be checked out separately.
- `/orders`: real buyer order history plus separately labeled browser-local demo orders, item statuses and progress.
- `/login`, `/register`: API authentication, validation feedback and buyer/supplier registration. Public admin registration is unavailable.
- `/account`: role-specific account workspace.
- `/supplier/dashboard`: supplier profile, verification status, create/edit/deactivate products, inventory/prices, incoming items and permitted fulfillment transitions.
- `/admin/dashboard`: user suspension, supplier verification, listing deactivation, category management and order inspection.

Unauthenticated supplier/admin dashboard visits display labeled read-only sample previews. Only real authenticated role accounts can make API changes. JWTs are stored in sessionStorage; the cart and demo orders use localStorage. Never enter sensitive personal information into a demo checkout on a shared device. Real account registration and login require the backend and do not fall back to simulated authentication.

## Branding and photography

The specified `src/assets/caleed logo.png` was absent. The existing `src/assets/logo.png` (Your Supply / Trade, Source, Grow artwork) is used unchanged in the shared Brand component. If a different official file is supplied, update its import in `src/components/Navbar.jsx`. The Furniro screenshot was not present in the task attachments; the interface follows the written brief.

Sample photographs were downloaded from Unsplash's image CDN into `public/catalog/`. Filenames preserve the source image IDs; original URLs follow `https://images.unsplash.com/<image-id>`. These are illustrative demo images, not claims about actual supplier inventory or product brands. Use supplier-owned photos for a live catalog. Image failures have a local branded fallback. No external fonts or image services are required for the demo.

## Checks

```powershell
npm run build
npm run lint
npx playwright install chromium
npm test
```

Playwright starts/reuses a local Vite server. Tests intercept API traffic, so they do not create backend users, orders, payments, or inventory changes. They check diverse catalog imagery, search/filter/sort/pagination, MOQ, persistent cart, simulated checkout, pending payment status, auth errors, mocked live COD payloads, dashboard previews, and horizontal overflow across 320 / 390 / 768 / 1440 px widths. Desktop/mobile screenshots are produced in the ignored `test-results/` directory. Live integration still requires your configured backend database.

Production: `npm run build` outputs `dist/`. Deploy with SPA history fallback to index.html and set VITE_API_URL at build time. Browser-local cart totals are estimates; authoritative stock and totals are validated by the backend at checkout. Delivery prices are confirmed by suppliers. No real payment credentials are collected.

## Executed verification — 21 October 2026

- `npm run build`: passed.
- `npm run lint`: passed without warnings.
- `npm test`: all 7 Chromium browser tests passed (49.3 seconds).
- All 44 responsive route/width combinations passed the horizontal overflow check, with mobile navigation and category interaction also verified.
- Demo checkout was verified at 390 px: no real API order request and payment remained pending.
- Mocked live checkout submitted only product IDs/quantities, deliveryAddress and cash_on_delivery; no client totals or paid status.
- Live backend end-to-end verification was not executed because the application's MongoDB replica set has not been configured. Browser tests use intercepted responses and do not change backend data.
- Installing the final frontend dependency set reported zero npm vulnerabilities.

Screenshots: `test-results/home-desktop.png` and `test-results/home-mobile.png`.

## Live registration checks

The local database/API startup issue has been repaired. From backend run `npm run db:local`, then `npm run dev` in another terminal. See the root README's registration repair section. Buyer signup redirects to `/shop`; supplier signup redirects to `/supplier/dashboard`.

With the local API and database running, `npm run test:registration` runs 5 real browser registration checks against MongoDB. This suite is deliberately separate from `npm test`: it uses unique temporary test accounts and removes only those accounts afterwards. It refuses a non-local MongoDB URI. Both localhost and 127.0.0.1 frontend origins are supported in development.

Executed after the repair: all 5 live registration checks passed; all 17 backend tests passed; frontend build and lint passed. This supersedes the earlier note that live integration was unavailable.

## Earlier homepage refinements (superseded by the premium-card update below)

The homepage now uses a pure-white canvas, including the hero and benefits section, with subtle section borders. The existing navy navigation, footer and promotional panel remain. Desktop navigation is 86 px; hero type/spacing and the original mixed-product collage scale to 1440, 1024, 768 and 375 px.

The hero search submits to the existing `/shop?search=...` flow. Homepage demo mode shows only “Showing sample products.” near featured listings; live mode hides it. Demo fallback remains available. Other pages retain their existing demo notices.

Three original generic product photos (handbag, perfume and sneaker) were generated with the imagegen skill and saved in `public/catalog/*-unbranded.png` to replace branded demonstration photos. The logo file is unchanged; navigation wrapper borders/shadows are explicitly removed. The requested `caleed logo.png` is still absent, so the existing `src/assets/logo.png` remains in use.

Changes are limited to homepage markup/styles, homepage notice placement, demo photography and related browser checks. Authentication, cart, checkout and backend logic are unchanged. Run `npm run dev` to preview, or `npm test` for the browser suite. Homepage screenshots are written to `test-results/home-white-<width>.png` and `test-results/hero-white-<width>.png`.

Homepage verification: npm run build and npm run lint passed. All 12 browser tests passed, including white backgrounds, the 86px desktop navigation, live/demo notice behavior, functional hero search, and responsive checks at 1440 / 1024 / 768 / 375 px.

## Premium marketplace cards and mixed backgrounds

The latest homepage update supersedes the all-white design. Hero and benefits use Soft Ivory (#FFFEFC), categories use #F4F1EB, featured products use white, new arrivals use #F7F5F0, and the promotional banner/navigation/footer retain midnight navy. Existing typography, mixed-product hero collage, search, and branding are preserved.

- Category cards now include a visible white container, description and arrow. Layout: four columns on desktop/laptop, two on tablet/mobile.
- The shared ProductCard includes pricing, MOQ, supplier, stock availability, View Details and a navy Add to Cart button. Cards have consistent image sizing, borders, rounded corners, shadows and hover/focus treatments.
- Homepage Featured Products / New & Noteworthy / Under $15 tabs filter or sort the displayed grid in place. Arrow keys, Home and End move between tabs.
- Featured and arrival grids show local sample products when the API is unavailable **or returns no products**. Labels identify the sample collection; sample checkouts remain local simulations. Existing real products are never supplemented or replaced with samples just to fill a grid. Category API failures retain real products and derive category filters from their metadata.
- Arrivals are sorted by createdAt. Sample dates provide a different mixed-category arrivals edit from the featured selection.
- Four visible benefit cards provide subtle hover/focus feedback. Reduced-motion preferences disable movement.
- No backend, authentication, cart or checkout implementation changes were made. The existing logo asset remains unchanged; the requested caleed logo.png is still absent.

Tests in tests/homepage.spec.js cover section colors/card structure at 1440/1024/768/375 px, working tabs and search, stock/actions, empty-catalog fallback and demo-only checkout, preservation of real products, keyboard navigation, focus styles and reduced motion. The existing marketplace regression suite remains in place. Screenshots: test-results/premium-home-<width>.png and premium-hero-<width>.png.

Premium-card verification completed: production build and lint passed. All 14 browser tests passed, including the four requested screen widths, functional tabs/search, demo fallback for an empty database, preservation of live products, keyboard/reduced-motion checks, and existing marketplace regression tests.

## Product selling type

The supplier add/edit product form now uses a Wholesale / Single Item dropdown. Wholesale requires an integer minimum of at least two; Single Item hides that field and submits a minimum of one. Product image URLs can be entered on separate lines. Existing measurement units remain in the database and are not overwritten by form edits.

Shared helpers in `src/data/productSelling.js` keep selling labels, displayed minimums, product details, persisted carts and checkout validation consistent. Legacy products infer their type from their original minimum. Sample handbags demonstrate Single Item; other sample products retain wholesale minimums. Backend validation remains authoritative when placing real orders.

Use `npm test` to run the new selling-type browser tests alongside the existing regression suite. Backend tests run separately with `npm test` in backend.

Verification: 23 backend tests and all 3 new selling-type browser checks passed. Build and lint passed. The existing frontend checks were verified as well, including rerunning the supplier/admin preview after correcting its old removed-banner assertion.
