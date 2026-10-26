<div align="center">

YouSupply
Trade · Source · Grow
A simple B2B wholesale marketplace for buyers and suppliers.

A single place to explore products, compare wholesale offers, place orders, and manage sales.

React · Node.js · Express · MongoDB
</div>

Overview
YouSupply is a multi-category marketplace designed for small businesses, retailers, and suppliers. Buyers browse products from different sellers without needing to negotiate through direct messages. Suppliers publish listings, control inventory, and process orders. Administrators oversee marketplace activity.

The project is an MVP under development. This README describes the product scope and development setup. Feature availability depends on the current implementation.
The problem
Small businesses often buy stock through scattered suppliers and manual conversations. This creates several challenges:
- Hard to find products: buyers search different suppliers for clothing, shoes, electronics, beauty products, groceries, and more.
- Unclear buying terms: wholesale prices, available stock, and minimum order quantities are not always visible upfront.
- Time-consuming ordering: businesses rely on calls or messages to agree on orders.
- Limited order visibility: buyers struggle to follow order progress.
- Difficult inventory management: suppliers need an organized way to manage products and incoming demand.
Our solution
YouSupply brings product discovery, ordering, and supplier management into one platform.
For business buyers	For suppliers	For administrators
Browse and search products	Create and edit listings	Manage accounts
Compare prices and minimum quantities	Set prices and stock	Review supplier verification
Add items to a cart and checkout	Review incoming orders	Moderate product listings
View order history and status	Update fulfillment status	Oversee orders


How the platform works
Supplier adds products
        ↓
Buyer searches and compares products
        ↓
Buyer adds products to cart
        ↓
Checkout validates quantities and stock
        ↓
Buyer places an order
        ↓
Supplier fulfills the order
        ↓
Buyer tracks the order status
Product categories
YouSupply is not limited to electronics. The marketplace is intended to support:
- Electronics
- Clothing and fashion
- Shoes and footwear
- Beauty and personal care
- Home and kitchen
- Bags and accessories
- Food and groceries
- Sports and fitness
- Office and stationery
- Toys and kids
- Automotive
- Other products
Products can be listed as Wholesale (minimum quantity greater than one) or Single Item (minimum quantity of one).
Key features and MVP scope
Area	Features in scope
Accounts	Buyer and supplier registration, login, role-based access
Catalog	Category browsing, product search, product details
Products	Images, unit prices, stock, selling type, minimum quantities
Cart	Add/remove products and change quantities
Checkout	Delivery details, stock checks, order summary
Orders	Purchase history and fulfillment status
Supplier dashboard	Listings, inventory, prices, incoming orders
Admin dashboard	Users, supplier approval, categories, products, orders
Payments	Cash on delivery and clearly labeled demo payment simulation


Payment note: Demo payments are for testing and presentation only. They do not transfer real money. Live payment integration is outside the initial MVP.

Messaging note: Buyers do not directly message suppliers through the platform. The primary journey is browse → cart → checkout → tracking.
Technology stack
Layer	Technology
Frontend	React + Vite
Styling	Plain CSS
Routing	React Router
HTTP client	Axios
Backend	Node.js + Express.js
Database	MongoDB
Data models	Mongoose
Authentication	JWT + bcryptjs


React frontend
      │ HTTP / JSON
      ▼
Express REST API
      │
      ▼
Mongoose models
      │
      ▼
MongoDB database
Project structure
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
│   └── package.json
├── backend/
│   ├── config/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   └── package.json
└── README.md
Illustrative structure. Some directories may differ in your local checkout.
Getting started
Requirements
- Node.js and npm
- MongoDB running locally, or a MongoDB Atlas connection string
1. Clone and open the project
git clone <YOUR_REPOSITORY_URL>
cd P2P
If you already have the P2P project on your computer, open that folder instead.
2. Configure the backend
cd backend
npm install
Create backend/.env with the values expected by your backend configuration. Typical local settings:
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/p2p
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
Start the backend:
npm run dev
3. Configure and start the frontend
In a second terminal:
cd frontend
npm install
npm run dev
If your API client reads VITE_API_URL, add a frontend/.env file:
VITE_API_URL=http://localhost:5000/api
Local addresses
Service	Address
Frontend	http://localhost:5173
Backend API	http://localhost:5000/api


Verify scripts, port numbers, and environment variable names against your actual code before deployment.
Design system
YouSupply uses a premium minimalist interface with strong contrast, visible product cards, and simple navigation.
Color	Hex	Use
Deep Midnight Navy	#191B2A	Primary brand color
Soft Ivory White	#FFFEFC	Main light background
Classic Navy Blue	#23283C	Secondary dark surfaces
Champagne Gold	#9A7A51	Highlights and accents
Warm Beige	#D8CAB0	Warm surfaces and borders


Brand line: Trade · Source · Grow
What we have designed so far
Based on the project work and screenshots shared during development:
- Homepage with a hero section, search, and mixed product category visuals
- Category browsing experience for varied product types
- Product creation form with price, stock, selling type, and minimum order quantity
- Administrator user table with account status and suspend controls
- Buyer, supplier, and administrator roles in the system design
- Checkout and simulated payment workflow in the MVP requirements
Implementation status: Screenshots confirm portions of the UI. They do not verify every API endpoint, database operation, authorization rule, checkout action, or payment flow. Confirm these in your local code and tests before claiming full completion.
Planned improvements
- Complete end-to-end testing of registration, product creation, checkout, and order tracking
- Improve product image consistency and mobile layouts
- Verify supplier ownership and role permissions
- Validate stock and minimum quantities server-side
- Add real payment integration only after a provider is selected
- Add deployment configuration and production monitoring
Project purpose
YouSupply aims to help small businesses find stock faster, understand purchase terms upfront, and order from multiple suppliers through a single interface. The platform also gives suppliers a straightforward way to reach business buyers and manage wholesale listings.
<div align="center">

YouSupply
Trade · Source · Grow
</div>
