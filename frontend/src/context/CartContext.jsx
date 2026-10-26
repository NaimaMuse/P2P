import { minimumOrderFor, validProductQuantity } from "../data/productSelling";
import { createContext, useContext, useEffect, useState } from "react";
import { loadSaved } from "../data/catalog";
const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [items, setItems] = useState(() =>
    loadSaved("p2p-cart", []).filter(
      (i) =>
        i?.product?._id &&
        validProductQuantity(i.product, i.quantity),
    ),
  );
  const [notice, setNotice] = useState("");
  useEffect(() => {
    localStorage.setItem("p2p-cart", JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  function add(product, quantity = minimumOrderFor(product)) {
    if (!validProductQuantity(product, quantity)) {
      setNotice(`Order at least ${minimumOrderFor(product)} item(s), within available stock.`);
      return false;
    }
    const existing = items.find((i) => i.product._id === product._id);
    const total = (existing?.quantity || 0) + quantity;
    if (total > product.stockQuantity) {
      setNotice("This quantity exceeds available stock.");
      return false;
    }
    setItems((prev) =>
      existing
        ? prev.map((i) =>
            i.product._id === product._id ? { ...i, quantity: total } : i,
          )
        : [...prev, { product, quantity }],
    );
    setNotice(`${product.name} added to your cart`);
    return true;
  }
  function update(id, quantity) {
    setItems((prev) =>
      prev.map((i) =>
        i.product._id === id
          ? {
              ...i,
              quantity: Math.min(
                i.product.stockQuantity,
                Math.max(
                  minimumOrderFor(i.product),
                  Number.isSafeInteger(quantity)
                    ? quantity
                    : minimumOrderFor(i.product),
                ),
              ),
            }
          : i,
      ),
    );
  }
  return (
    <CartContext.Provider
      value={{
        items,
        add,
        update,
        remove: (id) =>
          setItems((prev) => prev.filter((i) => i.product._id !== id)),
        clear: () => setItems([]),
        total:
          items.reduce(
            (sum, i) => sum + Math.round(i.product.price * 100) * i.quantity,
            0,
          ) / 100,
        notice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
// Context hooks intentionally share their provider module.
// eslint-disable-next-line react/only-export-components
export const useCart = () => useContext(CartContext);
