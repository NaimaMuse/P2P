import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Link,
} from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider, useCart } from "./context/CartContext";
import { CatalogProvider } from "./context/CatalogContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Shop, { Categories, Suppliers } from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import "./App.css";
function Shell() {
  const location = useLocation(),
    { notice } = useCart();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "YouSupply — Your next business chapter";
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders key={location.search} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={<Dashboard />} />
          <Route
            path="/supplier/dashboard"
            element={<Dashboard key={location.search} kind="supplier" />}
          />
          <Route path="/admin/dashboard" element={<Dashboard kind="admin" />} />
          <Route
            path="*"
            element={
              <div className="container empty">
                <h1>A little off the beaten path.</h1>
                <Link className="button" to="/">
                  Back to home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
      {notice && (
        <div className="toast" role="status">
          {notice}
          <Link to="/cart">View bag →</Link>
        </div>
      )}
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <CatalogProvider>
            <Shell />
          </CatalogProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
