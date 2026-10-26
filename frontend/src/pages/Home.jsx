import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  PackageCheck,
  Truck,
  Search,
} from "lucide-react";
import { categories, demoProducts } from "../data/catalog";
import { useCatalog } from "../context/CatalogContext";
import ProductCard from "../components/ProductCard";
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  to,
  link = "View all products",
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {to && (
        <Link className="text-link" to={to}>
          {link}
          <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function CategoryCards({ all = false }) {
  return (
    <div className="category-grid">
      {categories.slice(0, all ? 12 : 8).map((c) => (
        <Link
          to={`/shop?category=${encodeURIComponent(c.name)}`}
          className="category-card"
          aria-label={c.name}
          key={c._id}
        >
          <div className="category-visual">
            <img
              src={c.image}
              alt={c.name}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = "/product-placeholder.svg";
              }}
            />

          </div>
          <div className="category-card-copy">
          <h3>
            {{
              "Beauty & Personal Care": "Beauty",
              "Bags & Accessories": "Bags",
              "Food & Groceries": "Groceries",
              "Sports & Fitness": "Sports",
            }[c.name] || c.name}
          </h3>
          <p>{c.description}</p>
          <span className="category-explore">Explore category <ArrowRight size={14}/></span>
          </div>
        </Link>
      ))}
    </div>
  );
}
export default function Home() {
  const { products, mode } = useCatalog();
  const navigate = useNavigate();
  const [collection, setCollection] = useState("featured");
  const newest = [...products].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const featured = (collection === "new" ? newest : collection === "under15" ? products.filter(p => p.price < 15) : products).slice(0, 8);
  function changeTabWithKey(event) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll('[role="tab"]')];
    const current = buttons.indexOf(event.target);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus(); buttons[next].click();
  }
  return (
    <div className="homepage">
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <h1>
              Everything Your
              <br />
              Business Needs,
              <br />
              <em>In One Place.</em>
            </h1>
            <p>
              Explore wholesale electronics, clothing, footwear, beauty
              products, home essentials, and more from multiple suppliers.
            </p>
            <form className="hero-search" action="/shop" onSubmit={e => {
                e.preventDefault();
                const query = new FormData(e.currentTarget).get("search").trim();
                navigate(query ? `/shop?search=${encodeURIComponent(query)}` : "/shop");
              }} role="search" aria-label="Find wholesale products">
              <Search size={19} aria-hidden="true" />
              <input name="search" type="search" aria-label="Search wholesale products" placeholder="Search clothing, shoes, electronics, beauty, and more..." maxLength={200} />
              <button type="submit" aria-label="Search the marketplace"><ArrowRight size={19} /></button>
            </form>
            <div className="hero-buttons">
              <Link className="button" to="/shop">
                Shop Now <ArrowUpRight size={18} />
              </Link>
              <Link className="button outline" to="/categories">
                Explore Categories <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <div
            className="hero-composition"
            aria-label="A selection of wholesale fashion, footwear, beauty, kitchen and electronic products"
          >
            <div className="hero-arch" />
            <div className="hero-photo hero-bag">
              <img src={demoProducts[3].images[0]} alt="Wholesale handbags" />
            </div>
            <div className="hero-photo hero-shirt">
              <img src={demoProducts[0].images[0]} alt="Cotton clothing" />
            </div>
            <div className="hero-photo hero-shoe">
              <img src={demoProducts[2].images[0]} alt="Everyday sneakers" />
            </div>
            <div className="hero-photo hero-perfume">
              <img src={demoProducts[4].images[0]} alt="Signature perfume" />
            </div>
            <div className="hero-photo hero-headphones">
              <img src={demoProducts[1].images[0]} alt="Wireless headphones" />
            </div>
            <div className="hero-photo hero-kitchen">
              <img
                src={demoProducts[11].images[0]}
                alt="Ceramic kitchen essentials"
              />
            </div>
            <div className="floating-label">
              <span className="label-icon">
                <Boxes size={21} />
              </span>
              <div>
                <strong>One marketplace.</strong>
                <span>Every kind of possibility.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="benefit-strip container" aria-label="Marketplace benefits">
        <div className="benefit-item">
          <span className="benefit-icon"><BadgeCheck size={20} /></span>
          <span>Quality you can count on</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon"><Boxes size={20} /></span>
          <span>Multiple suppliers, one marketplace</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon"><PackageCheck size={20} /></span>
          <span>Wholesale made effortless</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon"><Truck size={20} /></span>
          <span>Follow every order</span>
        </div>
      </div>
      <section className="categories-section section"><div className="container">
        <SectionTitle
          eyebrow="FIND YOUR NEXT OPPORTUNITY"
          title="A category for every business."
          subtitle="From everyday essentials to your next bestsellers. Explore it all."
          to="/categories"
          link="View all categories"
        />
        <CategoryCards />
      </div></section>
      <section className="products-section section"><div className="container">
        <SectionTitle
          eyebrow="THE WHOLESALE EDIT"
          title="Good finds. Great business."
          subtitle="A little of everything. A lot of potential."
          to="/shop"
        />
        {mode === "loading" ? (
          <p className="loading">Finding your next bestsellers…</p>
        ) : (
          <>
            <div className="collection-toolbar">
              <div className="collection-tabs" role="tablist" aria-label="Featured product collections" onKeyDown={changeTabWithKey}>
                {[["featured", "Featured Products"], ["new", "New & Noteworthy"], ["under15", "Under $15"]].map(([key, label]) => (
                  <button type="button" key={key} id={`collection-tab-${key}`} role="tab" aria-selected={collection === key} aria-controls="featured-product-panel" tabIndex={collection === key ? 0 : -1} className={collection === key ? "selected" : ""} onClick={() => setCollection(key)}>{label}</button>
                ))}
              </div>
            </div>
            <div id="featured-product-panel" role="tabpanel" aria-labelledby={`collection-tab-${collection}`}>
              <div className="product-grid">{featured.map(p => <ProductCard key={p._id} product={p}/>)}</div>
              {!featured.length && <div className="collection-empty"><h3>No products in this collection yet.</h3><p>Explore the full collection to find more for your business.</p><Link className="button outline" to="/shop">View all products <ArrowRight size={16}/></Link></div>}
            </div>
          </>
        )}
      </div></section>
      <section className="container promo-section">
        <div className="promo">
          <div>
            <span className="eyebrow">LESS SEARCHING. MORE GROWING.</span>
            <h2>
              Wholesale Shopping
              <br />
              Made Simple.
            </h2>
            <p>
              One marketplace. Multiple suppliers. Thousands of possibilities.
            </p>
            <Link className="button ivory" to="/shop">
              Explore Wholesale Deals <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="promo-images">
            <img
              src={demoProducts[10].images[0]}
              alt="Canvas backpacks"
              loading="lazy"
            />
            <img
              src={demoProducts[4].images[0]}
              alt="Perfume collection"
              loading="lazy"
            />
            <img
              src={demoProducts[11].images[0]}
              alt="Kitchen ceramics"
              loading="lazy"
            />
          </div>
        </div>
      </section>
      <section className="why-section">
        <div className="container">
          <span className="eyebrow">BUILT AROUND YOUR BUSINESS</span>
          <h2>
            More than a marketplace.
            <br />A better way to stock up.
          </h2>
          <div className="why-grid">
            {[
              [
                BadgeCheck,
                "Wholesale Prices",
                "Better margins start with better sourcing.",
              ],
              [
                Boxes,
                "Multiple Product Categories",
                "Everything you need, all in one place.",
              ],
              [
                PackageCheck,
                "Easy Ordering",
                "A simple path from discovery to checkout.",
              ],
              [Truck, "Order Tracking", "Know where every order stands."],
            ].map(([Icon, title, description]) => (
              <article className="service-card" key={title} tabIndex={0}>
                <span className="service-icon"><Icon strokeWidth={1.5} size={29} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="container join-banner">
        <div>
          <span className="eyebrow">LET’S BUILD WHAT’S NEXT</span>
          <h2>Your business deserves better supply.</h2>
        </div>
        <Link className="button" to="/register">
          Start your journey <ArrowUpRight size={18} />
        </Link>
      </section>
    </div>
  );
}
