YouSupply
Trade . Source . Grow
YouSupply is a B2B wholesale marketplace where small businesses and retailers find products from multiple suppliers, compare listings, place orders, and track fulfillment in one place. The development project is stored in the P2P folder.
Project stage: MVP under development. This README describes the intended system and features discussed during development. Screenshots shared so far show the storefront, category browsing, product-entry form, and an administrator user table. A feature listed below is not a claim that its full backend workflow has been tested.

1. The problem we are solving
Small businesses often source products through scattered suppliers and informal processes. This creates practical difficulties:
- Fragmented product discovery: finding electronics, clothing, shoes, beauty products, groceries, and other goods requires visiting different suppliers.
- Unclear wholesale conditions: buyers do not always see a consistent price, stock quantity, or minimum order quantity before ordering.
- Manual ordering: buyers and suppliers need an organized way to place and manage orders without long message exchanges.
- Poor order visibility: buyers struggle to follow progress after placing an order.
- Difficult supplier management: suppliers need a simple place to publish products, update stock, and handle demand.
- Limited platform oversight: an administrator needs a central view of users, supplier approvals, products, and orders.
2. Our solution
YouSupply provides one easy-to-use online marketplace for multiple product categories. Business buyers search and filter listings, check prices and minimum quantities, add products to a cart, and submit orders. Suppliers manage product listings and fulfillment. Administrators oversee accounts, approvals, listings, and platform activity.

Core buying journey: Browse products → Product details → Cart → Checkout → Order tracking.

YouSupply deliberately does not require customer-supplier chat. The system emphasizes straightforward product listings and structured orders.
3. Who uses the platform?
Role	Main responsibilities
Buyer	Register, browse categories, search products, view pricing and stock, add items to cart, checkout, track orders.
Supplier	Create a business profile, publish and update products, manage inventory, review incoming orders, update fulfillment.
Administrator	Manage users, suspend/reactivate accounts, review supplier verification, manage categories and listings, oversee orders.


Access to private operations must be enforced by the backend, not only by hiding frontend controls.
4. Product categories
The marketplace is not limited to electronics. Planned categories include:

Electronics · Clothing & Fashion · Shoes & Footwear · Beauty & Personal Care · Home & Kitchen · Bags & Accessories · Food & Groceries · Sports & Fitness · Office & Stationery · Toys & Kids · Automotive · Other Products.

Suppliers choose a selling type for each listing:
- Wholesale: the buyer must meet the supplier's minimum order quantity, typically 2 or more.
- Single Item: the minimum order quantity is 1.
Product listings also specify price in USD, stock quantity, category, description, and images.
5. What we have designed and worked on
Based on the current development discussions and screenshots:
- Brand identity: YouSupply logo, the tagline Trade . Source . Grow, and a navy, ivory, and gold palette.
- Storefront UI: a homepage with a hero section, search, navigation, mixed-product imagery, category cards, and promotional/benefit sections.
- Category browsing: cards for a range of product types, not an electronics-only catalog.
- Product management form: product name, price, available stock, minimum quantity, category, description, and selling type.
- Administrator interface: a users table showing account role and status with a suspend action.
- Buyer, supplier, and admin workflows: defined as part of the MVP requirements.
- Checkout design: cash on delivery plus a proposed demo-only simulated payment flow.
Verification status: visual screenshots confirm some frontend screens are present. They do not establish whether database persistence, authorization, checkout transactions, or simulated payment endpoints have passed end-to-end testing. Confirm these against the source code before a release.
6. Core MVP features
Feature	Expected behavior
Authentication	Register/login using protected role-based accounts.
Product catalog	Browse products from multiple suppliers and categories.
Search and filtering	Find products by name and category, with sorting where implemented.
Product details	Show images, descriptions, price, stock, supplier, and minimum order quantity.
Cart	Add, update, or remove products and review totals.
Checkout	Validate delivery data, current prices, inventory, and minimum quantities on the server.
Orders	Store purchased items and the unit price at purchase time.
Supplier dashboard	Manage listings, prices, inventory, and assigned fulfillment.
Admin dashboard	Oversee users, supplier approval, categories, listings, and orders.
Payment demo	Demonstrate success/failure without collecting real financial credentials.


7. Technology stack
Layer	Technology
Frontend	React.js, Vite, JavaScript (JSX)
Styling	Plain CSS, responsive layouts
Routing	React Router
API requests	Axios
Backend	Node.js, Express.js
Database	MongoDB
Database modeling	Mongoose
Authentication	JWT and bcryptjs
Development tools	npm, VS Code


Prisma is not used. This project uses MongoDB with Mongoose.
8. Project structure
A compact example of the planned structure is:
P2P/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── backend/
│   ├── config/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── .env.example
│   ├── server.js
│   └── package.json
└── README.md
The actual source files may differ. Use the repository contents as the source of truth.
9. Main data models
- User: name, email, password hash, role, account status.
- Supplier: user reference, business name, contact details, verification status.
- Category: name and description.
- Product: supplier, category, name, description, price, stock, minimum quantity, selling type, images, active status.
- Order: buyer, embedded order items, item price snapshots, totals, delivery details, payment status, fulfillment status.
An order may contain products from more than one supplier. Supplier-specific fulfillment rights and states should be enforced.
10. Local setup
Prerequisites
- A supported Node.js and npm installation.
- MongoDB running locally or a MongoDB Atlas connection.
- The project's frontend and backend source code.
Backend
From the root project folder:
cd backend
npm install
Create backend/.env using the environment variables expected by the backend. Typical values:
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/p2p
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
Then start the development server, if the backend package.json defines the dev script:
npm run dev
Typical backend address: http://localhost:5000.
Frontend
Open a second terminal:
cd frontend
npm install
Create frontend/.env if needed:
VITE_API_URL=http://localhost:5000/api
Start Vite:
npm run dev
Typical frontend address: http://localhost:5173.
Check the real package.json scripts, existing .env.example files, and backend routes before running. The repository was not available for inspection when this README was prepared.

11. Example API groups
The intended REST API includes:
/api/auth        Register, login, current user
/api/products    Browse, view, create, update, deactivate
/api/categories  Browse and manage categories
/api/suppliers   Supplier profiles, products, incoming orders
/api/orders      Checkout, buyer history, fulfillment
/api/admin       User management, verification, oversight
Exact endpoint names should be checked against the implemented Express routes.
12. Payments
The initial MVP supports Cash on Delivery as a simple payment choice. A separate Demo Online Payment experience may simulate success and failure for presentations.
- No real charges take place in demo mode.
- Do not collect credit-card details, PINs, or banking passwords for a simulation.
- A frontend simulation must not independently mark real orders as paid.
- A real payment gateway is outside the initial MVP scope.
13. Security and reliability goals
- Hash passwords and protect JWT secrets.
- Validate inputs and enforce role-based permissions server-side.
- Restrict suppliers to their own products and fulfillment updates.
- Restrict buyers to their own private order data.
- Recheck product price, available stock, and minimum quantity during checkout.
- Use atomic stock updates and supported MongoDB transactions for order placement.
- Preserve item prices in order history.
- Show clear errors for failed registration, unavailable products, and unsuccessful checkout.
14. Brand and design
Name: YouSupply
Tagline: Trade . Source . Grow
Color	Hex	Use
Deep Midnight Navy	#191B2A	Navigation, primary buttons, headings
Soft Ivory White	#FFFEFC	Main light surfaces
Classic Navy Blue	#23283C	Secondary dark panels
Champagne Gold	#9A7A51	Accents and hover states
Warm Beige	#D8CAB0	Supporting surfaces and borders


The design direction is premium minimalist, with visible product cards, category imagery, alternating section backgrounds, responsive grids, and restrained hover effects.
15. MVP boundaries and next steps
The first version focuses on product discovery, supplier listing management, ordering, and administrative oversight. It excludes customer-supplier messaging, auctions, subscriptions, AI recommendations, and real payment-gateway integration.

Before presenting the system as fully operational, verify registration/login, MongoDB persistence, supplier approval, product creation, category filtering, cart validation, order creation, multi-supplier fulfillment, admin suspension, and responsive layouts. Seed diverse sample products for a clearly labeled demo experience when necessary.
16. Project impact
YouSupply aims to help small businesses source different products from one platform, understand wholesale purchase requirements before ordering, and follow orders more easily. Suppliers gain a structured product and inventory interface. Administrators gain centralized account and marketplace oversight.

YouSupply: Trade . Source . Grow.
