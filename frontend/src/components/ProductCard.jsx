import { minimumOrderFor, minimumOrderText, sellingTypeLabel } from "../data/productSelling";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, Check, CircleCheck, PackageX } from "lucide-react";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import { money } from "../data/catalog";
export function ProductImage({ product, ...props }) {
  return <img src={product.images?.[0] || "/product-placeholder.svg"} alt={product.name} loading="lazy" onError={e => {
    if (!e.currentTarget.src.endsWith('/product-placeholder.svg')) e.currentTarget.src = "/product-placeholder.svg";
  }} {...props}/>;
}
export default function ProductCard({ product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const available = product.stockQuantity >= minimumOrderFor(product);
  return <article className="product-card">
    <Link to={`/products/${product._id}`} className="product-image" aria-label={`View ${product.name}`}>
      <ProductImage product={product}/>
      {product.isDemo && <span className="product-tag">SAMPLE COLLECTION</span>}
      <span className="product-arrow"><ArrowUpRight size={17}/></span>
    </Link>
    <div className="product-card-body">
      <div className="product-meta">{product.category?.name || "Wholesale"}<span className="selling-type-label">{sellingTypeLabel(product)}</span></div>
      <Link className="product-name" to={`/products/${product._id}`}>{product.name}</Link>
      <div className="product-price-row">
        <div className="price">{money(product.price)} <span>/ {product.unit || "piece"}</span></div>
        <p className="product-minimum">{minimumOrderText(product)}</p>
      </div>
      <div className="product-supplier-row">
        <p className="product-supplier">{product.supplier?.companyName || "Independent supplier"}</p>
        <p className={`product-stock ${available ? 'available' : 'unavailable'}`}>
          {available ? <CircleCheck size={13}/> : <PackageX size={13}/>}
          {available ? `In stock · ${product.stockQuantity} available` : 'Below minimum order quantity'}
        </p>
      </div>
      <div className="product-card-actions">
        <Link to={`/products/${product._id}`} className="product-details-link">View details <ArrowUpRight size={13}/></Link>
        <button className="add-button" aria-label={`Add ${product.name} to cart`} title="Add minimum quantity to cart" disabled={!available} onClick={() => {
          if (add(product)) { setAdded(true); setTimeout(() => setAdded(false), 1800); }
        }}>{added ? <Check size={15}/> : <Plus size={15}/>}<span>{added ? "Added" : "Add to cart"}</span></button>
      </div>
    </div>
  </article>;
}
