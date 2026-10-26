import { minimumOrderFor, minimumOrderText, sellingTypeLabel } from "../data/productSelling";
import { Link } from "react-router-dom";
import { ArrowRight, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { money } from "../data/catalog";
import { ProductImage } from "../components/ProductCard";
export function Summary({ total, children }) {
  return (
    <aside className="panel order-summary">
      <span className="eyebrow">YOUR WHOLESALE EDIT</span>
      <h2>Order summary</h2>
      <div>
        <span>Product subtotal</span>
        <strong>{money(total)}</strong>
      </div>
      <div>
        <span>Delivery</span>
        <span>Confirmed by supplier</span>
      </div>
      <p className="muted">
        Prices in USD. Delivery arrangements are confirmed with your suppliers.
      </p>
      <div className="summary-total">
        <span>Subtotal</span>
        <strong>{money(total)}</strong>
      </div>
      {children}
      <p className="summary-footnote">Thoughtful sourcing. Simple ordering.</p>
    </aside>
  );
}
export default function Cart() {
  const { items, update, remove, total } = useCart();
  return (
    <section className="container section">
      <div className="page-intro">
        <span className="eyebrow">ONE STEP CLOSER</span>
        <h1>Your shopping bag.</h1>
        <p>
          {items.length
            ? `${items.length} products with possibilities.`
            : "Your next great find is waiting."}
        </p>
      </div>
      {!items.length ? (
        <div className="empty">
          <ShoppingBag size={45} strokeWidth={1} />
          <h2>A little room for possibility.</h2>
          <p>Explore the collection and start building your wholesale order.</p>
          <Link className="button" to="/shop">
            Explore products <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <div className="cart-list">
            {items.map(({ product, quantity }) => (
              <article className="cart-row" key={product._id}>
                <Link to={`/products/${product._id}`}>
                  <ProductImage product={product} />
                </Link>
                <div>
                  <span className="eyebrow">
                    {product.supplier?.companyName}
                  </span>
                  <Link
                    className="product-name"
                    to={`/products/${product._id}`}
                  >
                    {product.name}
                  </Link>
                  <p>
                    {money(product.price)} / {product.unit} &middot; {sellingTypeLabel(product)}
                    <br />{minimumOrderText(product)}
                  </p>
                  <label className="cart-quantity">
                    Quantity{" "}
                    <input
                      type="number"
                      min={minimumOrderFor(product)}
                      max={product.stockQuantity}
                      value={quantity}
                      onChange={(e) =>
                        update(product._id, Number(e.target.value))
                      }
                    />
                  </label>
                </div>
                <div className="cart-row-total">
                  <strong>{money(product.price * quantity)}</strong>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${product.name}`}
                    onClick={() => remove(product._id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
            <Link className="text-link" to="/shop">
              Continue discovering <ArrowRight size={16} />
            </Link>
          </div>
          <Summary total={total}>
            <Link className="button full" to="/checkout">
              Continue to checkout <ArrowRight size={17} />
            </Link>
          </Summary>
        </div>
      )}
    </section>
  );
}
