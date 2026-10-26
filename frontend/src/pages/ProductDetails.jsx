import { minimumOrderFor, minimumOrderText, sellingTypeLabel } from "../data/productSelling";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ShoppingBag,
  BadgeCheck,
  PackageCheck,
  Truck,
  Minus,
  Plus,
} from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { useCart } from "../context/CartContext";
import { money } from "../data/catalog";
import { ProductImage } from "../components/ProductCard";
import ProductCard from "../components/ProductCard";
import { SectionTitle } from "./Home";
export default function ProductDetails() {
  const { id } = useParams(),
    { products, mode } = useCatalog(),
    { add } = useCart();
  const product = products.find((p) => p._id === id);
  if (mode === "loading")
    return <div className="container empty">Loading product…</div>;
  if (!product)
    return (
      <div className="container empty">
        <h1>Product unavailable.</h1>
        <Link className="button" to="/shop">
          Back to shop
        </Link>
      </div>
    );
  return <Details key={id} product={product} products={products} add={add} />;
}
function Details({ product, products, add }) {
  const [quantity, setQuantity] = useState(minimumOrderFor(product)),
    [image, setImage] = useState(0);
  const id = product._id;
  return (
    <section className="container section">
      <div className="breadcrumb">
        <Link to="/shop">Shop</Link>
        <span>/</span>
        {product.category?.name}
        <span>/</span>
        {product.name}
      </div>
      <div className="detail-layout">
        <div>
          <div className="detail-image">
            {image === 0 ? (
              <ProductImage product={product} />
            ) : (
              <img
                src={product.images[image]}
                alt={`${product.name}, view ${image + 1}`}
              />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="thumbnails">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  aria-label={`View product image ${i + 1}`}
                  onClick={() => setImage(i)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {product.category?.name} &middot; {sellingTypeLabel(product)}
          </span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="detail-price">
            {money(product.price)} <span>/ {product.unit}</span>
          </div>
          <p className="gold">
            {minimumOrderText(product)}
          </p>
          <div className="supplier-detail">
            <BadgeCheck size={22} />
            <div>
              <strong>{product.supplier?.companyName}</strong>
              <span>
                Approved wholesale supplier{" "}
                {product.isDemo && "· Demo collection"}
              </span>
            </div>
          </div>
          <label className="quantity-label">Quantity</label>
          <div className="detail-purchase">
            <div className="quantity">
              <button
                aria-label="Decrease quantity"
                disabled={quantity <= minimumOrderFor(product)}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus size={15} />
              </button>
              <input
                aria-label="Product quantity"
                type="number"
                min={minimumOrderFor(product)}
                max={product.stockQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <button
                aria-label="Increase quantity"
                disabled={quantity >= product.stockQuantity}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              className="button"
              disabled={
                !Number.isSafeInteger(quantity) ||
                quantity < minimumOrderFor(product) ||
                quantity > product.stockQuantity
              }
              onClick={() => add(product, quantity)}
            >
              <ShoppingBag size={18} /> Add to Cart
            </button>
          </div>
          <p className="muted">
            {product.stockQuantity} available · Subtotal{" "}
            {money(product.price * quantity)}
          </p>
          <div className="detail-perks">
            <span>
              <PackageCheck size={18} /> Simple wholesale ordering
            </span>
            <span>
              <Truck size={18} /> Track your order progress
            </span>
          </div>
        </div>
      </div>
      <SectionTitle
        eyebrow="KEEP EXPLORING"
        title="More for your business."
        to="/shop"
      />
      <div className="product-grid">
        {products
          .filter((p) => p._id !== id)
          .slice(0, 4)
          .map((p) => (
            <ProductCard product={p} key={p._id} />
          ))}
      </div>
    </section>
  );
}
