import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import api, { imageUrl } from '../services/api';
import { useCatalog } from "../context/CatalogContext";
import ProductCard from "../components/ProductCard";
import { CategoryCards } from "./Home";
import { categories as demoCategories } from "../data/catalog";
function categoryKey(name = '') {
  const key = name.toLowerCase().replaceAll('&', 'and').replace(/\s+/g, ' ').trim();
  return ({ beauty: 'beauty and personal care', bags: 'bags and accessories', groceries: 'food and groceries', sports: 'sports and fitness', stationery: 'office and stationery' })[key] || key;
}
export function Categories() {
  return (
    <section className="container section">
      <div className="page-intro">
        <span className="eyebrow">EVERY BUSINESS BELONGS HERE</span>
        <h1>Explore the possibilities.</h1>
        <p>Twelve ways to find your next bestseller.</p>
      </div>
      <CategoryCards all />
    </section>
  );
}
export function Suppliers() {
  const { products, mode } = useCatalog();
  const [shops, setShops] = useState(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.get('/suppliers?limit=100');
        if (active && Array.isArray(response.data.data.items)) setShops(response.data.data.items);
      } catch { /* Existing sample collections stay available offline. */ }
    };
    load(); window.addEventListener('focus', load); window.addEventListener('catalog-updated', load);
    return () => { active = false; window.removeEventListener('focus', load); window.removeEventListener('catalog-updated', load); };
  }, []);
  const suppliers = shops?.length || (shops && mode === 'live') ? shops : [
    ...new Map(
      products
        .filter((p) => p.supplier?._id)
        .map((p) => [p.supplier._id, p.supplier]),
    ).values(),
  ];
  return (
    <section className="container section">
      <div className="page-intro">
        <span className="eyebrow">BETTER CONNECTIONS. BETTER BUSINESS.</span>
        <h1>Meet your next supplier.</h1>
        <p>
          Discover the businesses behind your favorite products.
          {mode === "demo" && !shops?.length && " Sample suppliers shown in demo mode."}
        </p>
        <Link to="/register?role=supplier" className="button outline">Register your shop</Link>
      </div>
      <div className="supplier-grid">
        {suppliers.map((s) => (
          <article className="panel supplier-card" key={s._id}>
            {s.image && <img className="shop-photo" src={imageUrl(s.image)} alt={s.companyName} />}
            <span className="supplier-monogram">
              {s.companyName?.slice(0, 1)}
            </span>
            <span className="eyebrow">
              {shops?.some(shop => shop._id === s._id) ? "APPROVED SHOP" : mode === "demo" ? "DEMO SUPPLIER" : "APPROVED SUPPLIER"}
            </span>
            <h2>{s.companyName}</h2>
            {s.category?.name && <p className="gold">{s.category.name}</p>}
            {s.description && <p>{s.description}</p>}
            <p>{s.address}</p>
            <p>
              {products.filter((p) => p.supplier._id === s._id).length} products
              to discover
            </p>
            <Link
              className="text-link"
              to={`/shop?supplier=${encodeURIComponent(s._id)}`}
            >
              Explore collection <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
      {!suppliers.length && (
        <p className="empty">
          Supplier collections will appear here when available.
        </p>
      )}
    </section>
  );
}
function CategoryShops({ category, supplier }) {
  const [shops, setShops] = useState([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.get('/suppliers?limit=100');
        if (active && Array.isArray(response.data.data.items)) setShops(response.data.data.items);
      } catch { /* Product browsing remains available when shop details cannot load. */ }
    };
    load(); window.addEventListener('focus', load); window.addEventListener('catalog-updated', load);
    return () => { active = false; window.removeEventListener('focus', load); window.removeEventListener('catalog-updated', load); };
  }, []);
  const visible = shops.filter(shop => supplier ? shop._id === supplier : category && (shop.category?._id === category || categoryKey(shop.category?.name) === categoryKey(category)));
  if (!visible.length) return null;
  return <section className="category-shops" aria-label="Approved shops">
    <h2>{supplier ? 'Shop collection' : 'Shops in this category'}</h2>
    <div className="supplier-grid">{visible.map(shop => <article className="panel supplier-card" key={shop._id}>
      {shop.image && <img className="shop-photo" src={imageUrl(shop.image)} alt={shop.companyName} />}
      <span className="eyebrow">APPROVED SHOP</span>
      <h3>{shop.companyName}</h3>
      <p>{shop.description || shop.category?.name}</p>
      <p>{shop.address}</p>
      {!supplier && <Link className="text-link" to={`/shop?supplier=${encodeURIComponent(shop._id)}`}>Visit shop <ArrowRight size={16} /></Link>}
    </article>)}</div>
  </section>;
}
export default function Shop() {
  const { products, categories, mode } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const search = params.get("search") || "",
    category = params.get("category") || "",
    sort = params.get("sort") || "featured",
    max = params.get("max") || "",
    min = params.get("min") || "";
  const requestedPage = Number(params.get("page") || 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  function filter(key, value) {
    // Read the current URL so rapid filter changes cannot reuse a stale render.
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  let filtered = products.filter(
    (p) =>
      (!search ||
        `${p.name} ${p.supplier?.companyName}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!category ||
        categoryKey(p.category?.name) === categoryKey(category) ||
        p.category?._id === category) &&
      (!max || p.price <= Number(max)) &&
      (!min || p.price >= Number(min)) &&
      (!params.get("supplier") || p.supplier?._id === params.get("supplier")),
  );
  if (sort === "low") filtered.sort((a, b) => a.price - b.price);
  if (sort === "high") filtered.sort((a, b) => b.price - a.price);
  if (sort === "new")
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pages = Math.max(1, Math.ceil(filtered.length / 8)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * 8, current * 8);
  return (
    <section className="container section">
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>Shop
      </div>
      <div className="page-intro">
        <span className="eyebrow">THE WHOLESALE COLLECTION</span>
        <h1>Find your next bestseller.</h1>
        <p>
          Good products. Thoughtful suppliers. Possibilities in every category.
        </p>
      </div>
      <div className="shop-search">
        <Search size={20} />
        <input
          aria-label="Search catalog"
          placeholder="Search products or suppliers…"
          value={search}
          onChange={(e) => filter("search", e.target.value)}
        />
      </div>
      {(category || params.get('supplier')) && <CategoryShops category={category} supplier={params.get('supplier')} />}
      <div className="shop-layout">
        <aside className={`filters ${filtersOpen ? "visible" : ""}`}>
          <div className="filter-heading">
            <h3>Filters</h3>
            <button className="text-link" onClick={() => setParams({})}>
              Clear all
            </button>
          </div>
          <fieldset>
            <legend>Categories</legend>
            <label>
              <input
                type="radio"
                name="category"
                checked={!category}
                onChange={() => filter("category", "")}
              />
              All products
            </label>
            {(mode === "demo" ? demoCategories : categories).map((c) => (
              <label key={c._id}>
                <input
                  type="radio"
                  name="category"
                  checked={categoryKey(category) === categoryKey(c.name) || category === c._id}
                  onChange={() => filter("category", c.name)}
                />
                {c.name}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Wholesale price</legend>
            <div className="price-inputs">
              <label>
                Min $
                <input
                  type="number"
                  min="0"
                  value={min}
                  onChange={(e) => filter("min", e.target.value)}
                />
              </label>
              <span>—</span>
              <label>
                Max $
                <input
                  type="number"
                  min="0"
                  value={max}
                  onChange={(e) => filter("max", e.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <div className="filter-note">
            A better way
            <br />
            <strong>to buy in bulk.</strong>
            <p>Made for businesses like yours.</p>
          </div>
        </aside>
        <div>
          <div className="shop-toolbar">
            <span>{filtered.length} thoughtfully selected products</span>
            <button
              className="mobile-filter text-link"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal size={16} /> Filters
            </button>
            <label>
              Sort by{" "}
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => filter("sort", e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="new">Newest arrivals</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
          </div>
          {mode === "loading" ? (
            <p className="empty">Loading the collection…</p>
          ) : (
            <div className="product-grid shop-grid">
              {visible.map((p, i) => (
                <ProductCard key={p._id} product={p} index={i} />
              ))}
            </div>
          )}
          {mode !== "loading" && !visible.length && (
            <div className="empty">
              <h2>{params.get('supplier') ? 'No products listed yet.' : 'No products found.'}</h2>
              <p>{params.get('supplier') ? 'This shop has not listed matching products yet. Check back soon or explore other shops.' : 'Try another category or a wider price range.'}</p>
              <button className="button" onClick={() => setParams({})}>
                Reset filters
              </button>
            </div>
          )}
          <div className="pagination" aria-label="Product pages">
            {Array.from({ length: pages }, (_, i) => (
              <button
                aria-label={`Page ${i + 1}`}
                aria-current={current === i + 1 ? "page" : undefined}
                className={current === i + 1 ? "active" : ""}
                key={i}
                onClick={() => filter("page", String(i + 1))}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
