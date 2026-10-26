import { minimumOrderFor, validProductQuantity } from "../data/productSelling";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  PackageCheck,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { loadSaved, money } from "../data/catalog";
import api, { errorMessage } from "../services/api";
import { Summary } from "./Cart";
export default function Checkout() {
  const { items, total, clear } = useCart(),
    { user } = useAuth(),
    navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [payment, setPayment] = useState("zaad");
  const [review, setReview] = useState(null);
  const demo = items.some((i) => i.product.isDemo);
  const mixed = demo && items.some((i) => !i.product.isDemo);
  async function submit(e) {
    e.preventDefault();
    setError("");
    const invalid = items.find(i => !validProductQuantity(i.product, i.quantity));
    if (invalid) {
      setError(`Check the quantity for ${invalid.product.name}. Minimum Order: ${minimumOrderFor(invalid.product)} item(s); available stock: ${invalid.product.stockQuantity}.`);
      return;
    }
    if (mixed) {
      setError("Please checkout demo products and live products separately.");
      return;
    }
    setBusy(true);
    const f = new FormData(e.currentTarget),
      address = [f.get("name"), f.get("phone"), f.get("address")].filter(Boolean).join(" · ");
    try {
      const agreement = demo ? { version: 'demo-2', text: 'I confirm this demo order. No money will be charged.' } : (await api.get('/orders/agreement')).data.data;
      if (!agreement?.version || !agreement?.text) throw new Error('Agreement unavailable');
      if (!demo && user?.role !== 'buyer') {
        setError('Please sign in with a buyer account before ordering.');
        return;
      }
      const reviewedItems = demo ? [...items] : await Promise.all(items.map(async item => ({ ...item, product: (await api.get(`/products/${item.product._id}`)).data.data })));
      if (reviewedItems.some(item => !validProductQuantity(item.product, item.quantity))) {
        setError('Stock or minimum quantities have changed. Return to your bag and update the quantities.');
        return;
      }
      const reviewedTotal = reviewedItems.reduce((sum, item) => sum + Math.round(item.product.price * 100) * item.quantity, 0) / 100;
      setReview({ agreement, address, items: reviewedItems, total: reviewedTotal, payment });
    } catch {
      setError('Unable to load the purchase agreement. Check your connection and try again.');
    } finally { setBusy(false); }
  }
  async function confirmOrder() {
    if (!review || busy) return;
    setBusy(true);
    setError('');
    const { items, total, address, agreement } = review;
    try {
      if (demo) {
        const order = {
          _id: `DEMO-${Date.now()}`,
          isDemo: true,
          createdAt: new Date().toISOString(),
          deliveryAddress: address,
          totalAmount: total,
          paymentMethod: review.payment,
          paymentStatus: "pending",
          orderStatus: "pending",
          simulatedPayment: true,
          agreement: { ...agreement, accepted: true, acceptedAt: new Date().toISOString(), buyerName: user?.name || 'Demo buyer', isDemo: true },
          items: items.map(({ product, quantity }) => ({
            product: product._id,
            productName: product.name,
            supplier: product.supplier._id,
            supplierName: product.supplier.companyName,
            quantity,
            unitPrice: product.price,
            subtotal: product.price * quantity,
            fulfillmentStatus: "pending",
          })),
        };
        localStorage.setItem(
          "p2p-demo-orders",
          JSON.stringify([order, ...loadSaved("p2p-demo-orders", [])]),
        );
        clear();
        navigate("/orders?placed=demo");
      } else {
        if (!user) {
          setError("Please sign in with a buyer account to place this order.");
          return;
        }
        if (user.role !== "buyer") {
          setError("Only buyer accounts can place orders.");
          return;
        }
        await api.post("/orders", {
          agreement: { accepted: true, version: agreement.version },
          expectedTotal: total,
          items: items.map((i) => ({
            product: i.product._id,
            quantity: i.quantity,
          })),
          deliveryAddress: address,
          paymentMethod: `${review.payment}_demo`,
        });
        clear();
        navigate("/orders?placed=live");
        window.dispatchEvent(new Event('order-updated'));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  if (!items.length)
    return (
      <div className="container empty">
        <h1>Your bag is empty.</h1>
        <Link className="button" to="/shop">
          Find your next bestseller
        </Link>
      </div>
    );
  return (
    <section className="container section">
      <div className="page-intro">
        <span className="eyebrow">A SIMPLE NEXT STEP</span>
        <h1>Make it yours.</h1>
        <p>Confirm your delivery details and place your wholesale order.</p>
      </div>
      {demo && (
        <div className="notice">
          Demo checkout — sample products only. No real order or payment will be
          created. Details stay in this browser.
        </div>
      )}
      <form className="checkout-layout" onSubmit={submit}>
        <div className="panel">
          <h2>{demo ? "Your details" : "Delivery details"}</h2>
          <div className="form-grid">
            <label>
              Full name
              <input
                required
                maxLength={100}
                name="name"
                autoComplete="name"
                defaultValue={user?.name}
              />
            </label>
            <label>
              Phone number (optional)
              <input
                required={false}
                type="tel"
                maxLength={40}
                name="phone"
                autoComplete="tel"
              />
            </label>
            <label className="span-two">
              Location (optional)
              <input
                required={false}
                maxLength={500}
                name="address"
                autoComplete="street-address"
              />
            </label>

          </div>
          <h2 className="form-subheading">Payment</h2>
          <div className="demo-payment-options" role="group" aria-label="Demo payment method">
            {[["zaad", "Zaad"], ["edahab", "eDahab"]].map(([value, label]) => <label className={payment === value ? "selected" : ""} key={value}>
              <input type="radio" name="demoPayment" value={value} checked={payment === value} onChange={() => setPayment(value)} />{label}
            </label>)}
          </div>
          <p className="muted">Simulated payment only. No money will be charged.</p>
          {!demo && !user && (
            <p className="notice">
              Please <Link to="/login?next=/checkout">sign in</Link> with a
              buyer account before ordering.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <Summary total={total}>
          <button
            className="button full"
            disabled={busy || mixed}
            type="submit"
          >
            {busy
              ? "Placing order…"
              : demo
                ? "Place demo order"
                : "Review order"}
            <ArrowRight size={17} />
          </button>
          <Link to="/cart" className="text-link">
            Return to your bag
          </Link>
        </Summary>
      </form>
      {review && <PurchaseConfirmation review={review} demo={demo} busy={busy} error={error} onCancel={() => setReview(null)} onConfirm={confirmOrder} />}
    </section>
  );
}

function PurchaseConfirmation({ review, demo, busy, error, onCancel, onConfirm }) {
  const dialog = useRef(null);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { dialog.current.showModal(); }, []);
  return (
    <dialog
      ref={dialog}
      className="purchase-agreement"
      aria-labelledby="purchase-agreement-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="confirmation-content">
        <header className="confirmation-header">
          <span className="confirmation-mark">
            <PackageCheck size={24} />
          </span>
          <div>
            <span className="eyebrow">FINAL ORDER REVIEW</span>
            <h2 id="purchase-agreement-title">Confirm your purchase</h2>
            <p>Check your items and delivery details before placing your order.</p>
          </div>
        </header>

        {demo && (
          <div className="confirmation-demo-notice" role="status">
            <ShieldCheck size={18} />
            <span>
              <strong>Demo order</strong>
              No live order will be sent and no money will be charged.
            </span>
          </div>
        )}

        <section className="confirmation-items" aria-labelledby="confirmation-items-title">
          <div className="confirmation-section-heading">
            <h3 id="confirmation-items-title">Order items</h3>
            <span>{review.items.length} {review.items.length === 1 ? "item" : "items"}</span>
          </div>
          <div className="confirmation-item-list">
            {review.items.map(({ product, quantity }) => (
              <div className="confirmation-item" key={product._id}>
                <span className="confirmation-item-icon" aria-hidden="true">
                  <PackageCheck size={18} />
                </span>
                <span className="confirmation-item-copy">
                  <strong>{product.name}</strong>
                  <small>{product.supplier?.companyName || "Marketplace supplier"}</small>
                  <small>{quantity} × {money(product.price)}</small>
                </span>
                <strong className="confirmation-item-total">
                  {money(quantity * product.price)}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <div className="confirmation-meta">
          <div className="confirmation-meta-card">
            <span className="confirmation-meta-icon"><MapPin size={18} /></span>
            <span>
              <small>Deliver to</small>
              <strong>{review.address}</strong>
            </span>
          </div>
          <div className="confirmation-meta-card">
            <span className="confirmation-meta-icon"><WalletCards size={18} /></span>
            <span>
              <small>Payment method</small>
              <strong>
                {review.payment === "zaad" ? "Zaad" : "eDahab"}{" "}
                <em>(simulated)</em>
              </strong>
            </span>
          </div>
        </div>

        {!demo && (
          <details className="agreement-record confirmation-terms" open>
            <summary>
              <span className="confirmation-terms-icon"><BadgeCheck size={18} /></span>
              <span>
                <strong>Purchase agreement</strong>
                <small>Review the terms before confirming</small>
              </span>
            </summary>
            <div className="confirmation-terms-copy">
              <p>{review.agreement.text}</p>
              <small>Agreement version: {review.agreement.version}</small>
            </div>
          </details>
        )}

        <div className="confirmation-total">
          <span>
            <small>Order total</small>
            <strong>{money(review.total)}</strong>
          </span>
          <span>Payment is collected according to the selected method.</span>
        </div>

        {!demo && (
          <label className="checkbox-label confirmation-acceptance">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              disabled={busy}
            />
            <span>
              I have reviewed this order and agree to the purchase agreement.
            </span>
          </label>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="confirmation-actions">
          <button
            type="button"
            className="button outline"
            disabled={busy}
            onClick={onCancel}
          >
            Go back
          </button>
          <button
            type="button"
            className="button"
            disabled={(!demo && !accepted) || busy}
            onClick={onConfirm}
          >
            {busy
              ? "Placing order…"
              : demo
                ? "Confirm demo order"
                : "Agree and confirm purchase"}
            {!busy && <ArrowRight size={17} />}
          </button>
        </div>
      </div>
    </dialog>
  );
}
