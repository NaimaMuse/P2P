import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Package, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage } from "../services/api";
import { loadSaved, money } from "../data/catalog";
export default function Orders() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get("order"));
  const [params] = useSearchParams();
  const demoOrders = loadSaved("p2p-demo-orders", []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    function refresh() {
      if (user?.role === 'buyer') {
        api.get('/orders/my-orders?limit=100')
          .then((response) => {
            if (active) { setOrders(response.data.data.items); setError(''); }
          })
          .catch((error) => { if (active) setError(errorMessage(error)); })
          .finally(() => { if (active) setLoading(false); });
      } else {
        Promise.resolve().then(() => { if (active) setLoading(false); });
      }
    }
    refresh();
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 10000);
    window.addEventListener("focus", refresh);
    window.addEventListener("order-updated", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("order-updated", refresh);
    };
  }, [user, ready]);
  const all = [...orders, ...demoOrders].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  return (
    <section className="container section buyer-orders-page">
      <div className="page-intro">
        <span className="eyebrow">EVERY ORDER, IN ONE PLACE</span>
        <h1>Your business, in motion.</h1>
        <p>From the first click to the final delivery.</p>
      </div>
      {params.get("placed") && (
        <div className="notice success" role="status">
          {params.get("placed") === "demo"
            ? "Demo order created locally. No real order or payment was submitted."
            : "Your order is placed. Payment is pending."}
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!user && (
        <p className="notice">
          <Link to="/login?next=/orders">Sign in</Link> to see your real orders.
          Demo orders are stored only in this browser.
        </p>
      )}
      {loading && <p>Loading your orders…</p>}
      <div className="orders-list">
        {all.map((o) => {
          const steps = ["pending", "processing", "shipped", "delivered"];
          const progress = steps.indexOf(o.orderStatus);
          const cancelled = o.orderStatus === "cancelled";
          return (
          <article className="panel buyer-order-card" key={o._id}>
            <button
              className="order-toggle buyer-order-toggle"
              onClick={() => setOpen(open === o._id ? null : o._id)}
              aria-expanded={open === o._id}
              aria-controls={`order-details-${o._id}`}
            >
              <span className="order-package buyer-order-package">
                <Package size={25} />
              </span>
              <span className="buyer-order-heading">
                <strong className="buyer-order-number">
                  {o.isDemo ? "Demo order" : "Order"} #
                  {o._id.slice(-8).toUpperCase()}
                </strong>
                <span className="buyer-order-meta">
                  <time dateTime={new Date(o.createdAt).toISOString()}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </time>
                  <span aria-hidden="true">·</span>
                  {o.items.length} {o.items.length === 1 ? "product" : "products"}
                </span>
              </span>
              <span className={`status buyer-order-status ${o.orderStatus}`}>
                {o.orderStatus}
              </span>
              <strong className="buyer-order-total">{money(o.totalAmount)}</strong>
              <ChevronDown className="buyer-order-chevron" size={19} />
            </button>
            {cancelled ? (
              <div className="buyer-order-cancelled" role="status">
                This order was cancelled.
              </div>
            ) : (
              <div
                className="order-progress buyer-order-progress"
                aria-label={`Order progress: ${o.orderStatus}`}
              >
                {steps.map((status, i) => (
                  <span
                    key={status}
                    className={i <= progress ? "complete" : ""}
                    aria-current={i === progress ? "step" : undefined}
                  >
                    <i />
                    {status}
                  </span>
                ))}
              </div>
            )}
            {open === o._id && (
              <div className="order-expanded buyer-order-expanded" id={`order-details-${o._id}`}>
                {o.items.map((item, i) => (
                  <div className="buyer-order-item" key={item._id || i}>
                    <span>
                      <strong>{item.productName}</strong>
                      {item.supplierName && <small>Supplier: {item.supplierName}</small>}
                      <small>
                        {item.quantity} × {money(item.unitPrice)} ·{" "}
                        {item.fulfillmentStatus}
                      </small>
                    </span>
                    <strong>{money(item.subtotal)}</strong>
                  </div>
                ))}
                <p>Deliver to: {o.deliveryAddress}</p>
                <p>{['zaad', 'edahab', 'zaad_demo', 'edahab_demo'].includes(o.paymentMethod) ? `${o.paymentMethod.startsWith('zaad') ? 'Zaad' : 'eDahab'} (simulated) · No money charged` : `Cash on Delivery · Payment: ${o.paymentStatus}`}</p>
                {o.agreement && <details className="agreement-record">
                  <summary>View purchase agreement</summary>
                  <p>{o.agreement.text}</p>
                  <p>Accepted by: {o.agreement.buyerName}{o.agreement.buyerEmail ? ` (${o.agreement.buyerEmail})` : ''}</p>
                  <p>Accepted: {new Date(o.agreement.acceptedAt).toLocaleString()} · Version: {o.agreement.version}</p>
                  {o.agreement.hash && <small>Agreement text SHA-256: {o.agreement.hash}</small>}
                  <button type="button" className="text-link" onClick={() => {
                    const record = new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(record);
                    const link = document.createElement('a'); link.href = url; link.download = `order-${o._id}-agreement.json`; link.click(); URL.revokeObjectURL(url);
                  }}>Download order and agreement</button>
                </details>}
                {o.isDemo && (
                  <span className="gold">
                    Demo only · Stored in this browser
                  </span>
                )}
              </div>
            )}
          </article>
          );
        })}
      </div>
      {!loading && !all.length && (
        <div className="empty">
          <Package size={40} />
          <h2>Your next chapter starts here.</h2>
          <p>Your orders will appear here once you checkout.</p>
          <Link className="button" to="/shop">
            Discover products
          </Link>
        </div>
      )}
    </section>
  );
}
