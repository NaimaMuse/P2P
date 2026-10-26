import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import logo from "../assets/logo.jpeg";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import NotificationBell from './NotificationBell';
// Shared brand component is also used on authentication and dashboard pages.
export function Brand({ large = false }) {
  return (
    <Link
      to="/"
      className={`brand image-brand ${large ? "large" : ""}`}
      aria-label="YourSupply home"
    >
      <span className="brand-image-frame"><img src={logo} alt="Your Supply — Trade, Source, Grow" /></span>
    </Link>
  );
}
export default function Navbar() {
  const { items } = useCart(),
    { user } = useAuth();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(false);
  const navigate = useNavigate();
  return (
      <header className="navbar">
        <div className="nav-inner">
          <Brand />
          <nav className={open ? "open" : ""} aria-label="Main navigation">
            {[
              ["/", "Home"],
              ["/shop", "Shop"],
              ["/categories", "Categories"],
              ["/suppliers", "Suppliers"],
            ].map(([path, label]) => (
              <NavLink key={path} end to={path} onClick={() => setOpen(false)}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-actions">
            <NotificationBell key={user?._id || 'guest'} />
            <button
              aria-label="Search products"
              onClick={() => setSearch(!search)}
            >
              <Search size={21} />
            </button>
            <Link
              to="/cart"
              aria-label={`Cart, ${items.length} products`}
              className="cart-icon"
            >
              <ShoppingBag size={21} />
              {items.length > 0 && <b>{items.length}</b>}
            </Link>
            <Link to={user ? "/account" : "/login"} aria-label="Account">
              <UserRound size={21} />
            </Link>
            <button
              className="mobile-menu"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {search && (
          <form
            className="nav-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(
                `/shop?search=${encodeURIComponent(new FormData(e.currentTarget).get("search"))}`,
              );
              setSearch(false);
            }}
          >
            <input
              name="search"
              aria-label="Search products"
              placeholder="What does your business need?"
              autoFocus
            />
            <button className="button">
              Search <Search size={16} />
            </button>
          </form>
        )}
      </header>
  );
}
