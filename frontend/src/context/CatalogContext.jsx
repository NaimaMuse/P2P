import { createContext, useContext, useEffect, useState } from "react";
import api, { imageUrl } from "../services/api";
import { categories, demoProducts } from "../data/catalog";
const CatalogContext = createContext(null);
export function CatalogProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [mode, setMode] = useState("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('catalog-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('catalog-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  useEffect(() => {
    let active = true;
    function sampleCollection() {
      if (!active) return;
      setProducts(demoProducts);
      setCats(categories);
      setMode("demo");
    }
    async function load() {
      try {
        const response = await api.get("/products?limit=100");
        let all = response.data.data.items;
        if (!Array.isArray(all)) throw new Error("Invalid product response");
        for (let page = 2; page <= response.data.data.pagination.pages; page++) {
          const r = await api.get(`/products?limit=100&page=${page}`);
          all = all.concat(r.data.data.items);
        }
        if (!all.length) {
          sampleCollection();
          return;
        }
        // A category endpoint failure must never replace real products with demos.
        let liveCategories;
        try {
          const c = await api.get("/categories");
          liveCategories = c.data.data;
          if (!Array.isArray(liveCategories)) throw new Error("Invalid category response");
        } catch {
          liveCategories = [...new Map(all.filter(p => p.category?._id).map(p => [p.category._id, p.category])).values()];
        }
        if (active) {
          setProducts(all.map(product => ({ ...product, images: (product.images || []).map(imageUrl) })));
          setCats(liveCategories);
          setMode("live");
        }
      } catch {
        sampleCollection();
      }
    }
    load();
    return () => { active = false; };
  }, [revision]);
  return <CatalogContext.Provider value={{ products, categories: cats, mode }}>{children}</CatalogContext.Provider>;
}
// Context hooks intentionally share their provider module.
// eslint-disable-next-line react/only-export-components
export const useCatalog = () => useContext(CatalogContext);
