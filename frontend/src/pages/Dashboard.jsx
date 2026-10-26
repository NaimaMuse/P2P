import { sellingTypeFor } from "../data/productSelling";
import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Grid2X2,
  Building2,
  LogOut,
  Plus,
  ArrowUpRight,
  Check,
  X,
  Pencil,
  Trash2,
  UserRound,
  UserCheck,
  UserX,
  Search,
  Bell,
} from "lucide-react";
import { Brand } from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage, imageUrl } from "../services/api";
import {
  demoProducts,
  categories as demoCategories,
  money,
} from "../data/catalog";
export default function Dashboard({ kind }) {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const role = kind || user?.role || "buyer";
  const preview = !user;
  const allowed = preview || user.role === role;
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') === 'orders' ? 'orders' : new URLSearchParams(window.location.search).get('setup') === 'shop' ? 'profile' : 'overview'),
    [data, setData] = useState({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [editing, setEditing] = useState(null),
    [supplierProfileId, setSupplierProfileId] = useState(null),
    [busy, setBusy] = useState(false),
    [userStatusFilter, setUserStatusFilter] = useState("all"),
    [incomingOrderAlert, setIncomingOrderAlert] = useState(false);
  const previousSupplierOrderIds = useRef(null);
  const tabs =
    role === "admin"
      ? [
          ["overview", "Overview", LayoutDashboard],
          ["users", "Users", Users],
          ["suppliers", "Suppliers", Building2],
          ["products", "Products", Package],
          ["categories", "Categories", Grid2X2],
          ["orders", "Orders", ShoppingBag],
        ]
      : role === "supplier"
        ? [
            ["overview", "Overview", LayoutDashboard],
            ["products", "My products", Package],
            ["orders", "Incoming orders", ShoppingBag],
            ["profile", "Business profile", Building2],
          ]
        : [["overview", "Your account", LayoutDashboard]];
  const users = data.users || [];
  const [managementSearch, setManagementSearch] = useState('');
  const [managementStatus, setManagementStatus] = useState('all');
  const managementView = (role === 'admin' && ['suppliers', 'products', 'categories', 'orders'].includes(tab)) || (role === 'supplier' && ['products', 'orders'].includes(tab));
  const managementItems = data[tab] || [];
  const managementMatches = item => {
    const query = managementSearch.trim().toLowerCase();
    const matchesSearch = !query || [item.name, item.companyName, item.description, item.user?.email, item.category?.name, item.supplier?.companyName, item._id, item.deliveryAddress, ...(item.items || []).map(line => `${line.productName} ${line.supplierName || ''}`)].some(value => value?.toLowerCase().includes(query));
    const status = tab === 'orders' ? item.orderStatus : tab === 'suppliers' ? item.verificationStatus : item.isActive === false ? 'inactive' : 'active';
    return matchesSearch && (tab === 'categories' || managementStatus === 'all' || managementStatus === status);
  };
  const filteredUsers = users.filter((account) => {
    return (
      userStatusFilter === "all" ||
      account.accountStatus?.toLowerCase() === userStatusFilter
    );
  });
  const activeUserCount = users.filter(
    (account) => account.accountStatus?.toLowerCase() === "active",
  ).length;
  const suspendedUserCount = users.filter(
    (account) => account.accountStatus?.toLowerCase() === "suspended",
  ).length;
  const pendingSupplierOrders =
    role === "supplier"
      ? (data.orders || []).filter((order) =>
          order.items?.some((item) => item.fulfillmentStatus === "pending"),
        )
      : [];
  const load = useCallback(async (silent = false) => {
    if (!ready || !allowed) return;
    if (preview) {
      setData({
        products: demoProducts.slice(0, 6),
        categories: demoCategories,
        suppliers: [
          ...new Map(
            demoProducts.map((p) => [p.supplier._id, p.supplier]),
          ).values(),
        ],
        users: [],
        orders: [],
        profile: {
          companyName: "Your business",
          address: "Nairobi, Kenya",
          phone: "+254700000000",
          verificationStatus: "pending",
        },
      });
      return;
    }
    if (!silent) { setLoading(true); setError(""); }
    try {
      if (role === "admin") {
        const paths = ["users", "suppliers", "products", "orders"];
        const results = await Promise.all(
          paths.map((p) => api.get(`/admin/${p}?limit=100`)),
        );
        const c = await api.get("/categories");
        setData(
          Object.fromEntries([
            ...paths.map((p, i) => [p, results[i].data.data.items]),
            ["categories", c.data.data],
          ]),
        );
      } else if (role === "supplier") {
        let profile = null;
        try {
          profile = (await api.get("/suppliers/me")).data.data;
        } catch (e) {
          if (e.response?.status !== 404) throw e;
        }
        if (!profile) {
          const account = (await api.get('/auth/me')).data.data;
          setData({
            profile: { verificationStatus: account.supplierVerificationStatus || 'pending', verificationNotification: account.supplierVerificationNotification },
            products: [],
            orders: [],
            categories: (await api.get("/categories")).data.data,
          });
        } else {
          const [p, o, c] = await Promise.all([
            api.get("/suppliers/me/products?limit=100"),
            api.get("/suppliers/me/orders?limit=100"),
            api.get("/categories"),
          ]);
          const supplierOrders = o.data.data.items;
          const currentOrderIds = new Set(
            supplierOrders.map((order) => order._id),
          );
          if (previousSupplierOrderIds.current && silent) {
            const arrivedOrders = supplierOrders.filter(
              (order) =>
                !previousSupplierOrderIds.current.has(order._id) &&
                order.items?.some(
                  (item) => item.fulfillmentStatus === "pending",
                ),
            );
            if (arrivedOrders.length) setIncomingOrderAlert(true);
          }
          previousSupplierOrderIds.current = currentOrderIds;
          setData({
            profile,
            products: p.data.data.items,
            orders: supplierOrders,
            categories: c.data.data,
          });
        }
      }
    } catch (e) {
      if (!silent) setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [ready, allowed, preview, role]);
  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  useEffect(() => {
    if (preview || !ready || !allowed) return;
    const refresh = () => { if (!document.hidden) load(true); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load, preview, ready, allowed]);
  async function mutate(method, path, values) {
    if (preview) {
      setNotice(
        "This is a dashboard preview. Sign in with the correct role to make changes.",
      );
      return false;
    }
    setBusy(true);
    setError("");
    try {
      await api.request({ method, url: path, data: values });
      if (path.startsWith('/orders')) window.dispatchEvent(new Event('order-updated'));
      if (path.startsWith('/products') || path.startsWith('/suppliers')) window.dispatchEvent(new Event('catalog-updated'));
      setNotice("Changes saved successfully.");
      await load();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveShop(e) {
    e.preventDefault();
    if (preview) { setNotice('Register or sign in as a supplier to register your shop.'); return; }
    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(['companyName', 'address', 'phone', 'category', 'description'].map(key => [key, form.get(key)]));
    const file = form.get('shopImage');
    setBusy(true); setError('');
    try {
      if (file?.size) {
        if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP shop photo under 5 MB.');
        values.image = (await api.post('/suppliers/images', file, { headers: { 'Content-Type': file.type }, timeout: 30000 })).data.data.url;
      }
      if (await mutate('put', '/suppliers/me', values)) setNotice(!data.profile?._id && data.profile?.verificationStatus === 'approved' ? 'Shop details saved. Your supplier approval is already complete.' : 'Shop submitted. An administrator will review it before it appears publicly.');
    } catch (error) { setError(error.response || error.isAxiosError ? errorMessage(error) : error.message); }
    finally { setBusy(false); }
  }
  async function saveProduct(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const values = Object.fromEntries(
      ["name", "description", "category", "sellingType"].map((k) => [k, f.get(k)]),
    );
    for (const k of ["price", "stockQuantity"])
      values[k] = Number(f.get(k));
    values.minimumOrderQuantity = values.sellingType === "single" ? 1 : Number(f.get("minimumOrderQuantity"));
    if (values.sellingType === "wholesale" && (!Number.isSafeInteger(values.minimumOrderQuantity) || values.minimumOrderQuantity < 2)) {
      setError("Wholesale products require a minimum order quantity of at least 2.");
      return;
    }
    const files = f.getAll('imageFiles').filter(file => file.size);
    const existingImages = editing.images || [];
    if (files.length + existingImages.length > 10 || files.some(file => file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setError('Choose up to 10 JPEG, PNG, or WebP images, no larger than 5 MB each.');
      return;
    }
    if (preview) { setNotice('Sign in as a supplier to upload images and save products.'); return; }
    setBusy(true);
    setError('');
    try {
      values.images = [...existingImages];
      for (const file of files) {
        const result = await api.post('/products/images', file, { headers: { 'Content-Type': file.type }, timeout: 30000 });
        values.images.push(result.data.data.url);
      }
    } catch (error) {
      setError(errorMessage(error));
      setBusy(false);
      return;
    }
    if (
      await mutate(
        editing._id ? "put" : "post",
        editing._id ? `/products/${editing._id}` : "/products",
        values,
      )
    )
      setEditing(null);
  }
  if (!ready)
    return <div className="container empty">Loading your account…</div>;
  if (!user && !kind) return <Navigate to="/login" replace />;
  if (!allowed)
    return (
      <div className="container empty">
        <h1>This workspace is for {role}s.</h1>
        <p>Your signed-in role is {user.role}.</p>
        <Link className="button" to="/account">
          Go to your account
        </Link>
      </div>
    );
  if (role === "buyer")
    return (
      <section className="container section">
        <div className="panel account-panel">
          <Brand />
          <span className="eyebrow">YOUR YouSupply ACCOUNT</span>
          <h1>Hello, {user?.name || "there"}.</h1>
          <p>{user?.email}</p>
          <p>Your next business chapter is waiting.</p>
          <div className="hero-buttons">
            <Link className="button" to="/orders">
              My orders <ArrowUpRight size={16} />
            </Link>
            <Link className="button outline" to="/shop">
              Explore products
            </Link>
            <button
              className="text-link"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    );
  return (
    <section className={`dashboard container ${role}-dashboard`}>
      <aside className="dashboard-sidebar">
        {role !== "admin" && <Brand />}
        <span className="eyebrow">{role} workspace</span>
        <nav aria-label="Dashboard navigation">
          {tabs.map(([key, label, Icon]) => (
            <button
              className={tab === key ? "active" : ""}
              key={key}
              onClick={() => {
                setTab(key);
                setEditing(null);
                setNotice("");
                setManagementSearch('');
                setManagementStatus('all');
                if (role === "supplier" && key === "orders")
                  setIncomingOrderAlert(false);
              }}
              aria-label={
                role === "supplier" &&
                key === "orders" &&
                pendingSupplierOrders.length > 0
                  ? label
                  : undefined
              }
              aria-describedby={
                role === "supplier" &&
                key === "orders" &&
                pendingSupplierOrders.length > 0
                  ? "supplier-order-count"
                  : undefined
              }
            >
              {role === "supplier" &&
                key === "orders" &&
                pendingSupplierOrders.length > 0 && (
                  <span className="visually-hidden" id="supplier-order-count">
                    {pendingSupplierOrders.length} pending orders awaiting
                    action
                  </span>
                )}
              <Icon size={18} />
              {label}
              {role === "supplier" &&
                key === "orders" &&
                pendingSupplierOrders.length > 0 && (
                  <span
                    className="supplier-order-badge"
                    aria-hidden="true"
                  >
                    {pendingSupplierOrders.length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <Link className="text-link" to="/shop">
          Back to marketplace <ArrowUpRight size={15} />
        </Link>
        {user && (
          <button
            className="text-link"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        )}
      </aside>
      <div className={`dashboard-main ${managementView || role === 'supplier' ? 'management-view' : ''}`}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR BUSINESS AT A GLANCE</span>
            <h1>
              {tab === "overview"
                ? `Welcome ${user?.name?.split(" ")[0] || "to your workspace"}.`
                : tabs.find((t) => t[0] === tab)?.[1]}
            </h1>
          </div>
          <span className="status">
            {preview ? "Demo preview" : `${role} account`}
          </span>
        </div>
        {preview && (
          <div className="notice">
            Read-only dashboard preview. <Link to="/login">Sign in</Link> with a{" "}
            {role} account to manage real marketplace data.
          </div>
        )}
        {role === "supplier" &&
          tab === "overview" &&
          pendingSupplierOrders.length > 0 && (
            <div
              className={`supplier-order-notice${
                incomingOrderAlert ? " is-new" : ""
              }`}
              role={incomingOrderAlert ? "alert" : "status"}
            >
              <span className="supplier-order-notice-icon">
                <Bell size={19} />
              </span>
              <span className="supplier-order-notice-copy">
                <strong>
                  {incomingOrderAlert
                    ? "New order received"
                    : "Orders need attention"}
                </strong>
                <span>
                  You have {pendingSupplierOrders.length} pending{" "}
                  {pendingSupplierOrders.length === 1 ? "order" : "orders"} to
                  review.
                </span>
              </span>
              <button
                type="button"
                className="supplier-order-notice-link"
                onClick={() => {
                  setTab("orders");
                  setIncomingOrderAlert(false);
                }}
              >
                View incoming orders <ArrowUpRight size={16} />
              </button>
            </div>
          )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {role === 'supplier' && !preview && !loading && !data.profile?._id && <div className="notice" role="status">Your supplier account is registered and can be reviewed by an admin now. Add your shop details when ready. <button type="button" className="text-link" onClick={() => setTab('profile')}>Complete shop details</button></div>}
        {role === 'supplier' && data.profile?.verificationNotification && <div className="notice" role="status" aria-label="Shop verification notification">
          <strong>Shop verification: {data.profile.verificationNotification.status}</strong>
          <p>{data.profile.verificationNotification.message}</p>
          <small>{new Date(data.profile.verificationNotification.createdAt).toLocaleString()}</small>
        </div>}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {loading && <p>Loading your workspace…</p>}
        {managementView && <div className="management-tools">
          <p className="management-description">{tab === 'orders' ? 'Review purchases, fulfillment progress, and supplier commission in one place.' : tab === 'suppliers' ? 'Review supplier accounts and decide who can sell in your marketplace.' : tab === 'products' ? 'Keep your catalog organized, available, and ready for buyers.' : 'Organize your marketplace so every product is easy to find.'}</p>
          <div className="management-stats">
            <div><span>Total {tab}</span><strong>{managementItems.length}</strong></div>
            {tab === 'orders' ? <><div><span>Pending orders</span><strong>{managementItems.filter(order => order.orderStatus === 'pending').length}</strong></div><div><span>Recorded commission</span><strong className="management-stat-text">{money(managementItems.reduce((sum, order) => sum + (order.items || []).filter(item => item.fulfillmentStatus !== 'cancelled').reduce((subtotal, item) => subtotal + Math.round((item.commissionAmount || 0) * 100), 0), 0) / 100)}</strong></div></> : tab === 'suppliers' ? <><div><span>Awaiting review</span><strong>{managementItems.filter(item => item.verificationStatus === 'pending').length}</strong></div><div><span>Approved suppliers</span><strong>{managementItems.filter(item => item.verificationStatus === 'approved').length}</strong></div></> : tab === 'products' ? <><div><span>Active listings</span><strong>{managementItems.filter(item => item.isActive !== false).length}</strong></div><div><span>Available units</span><strong>{managementItems.reduce((sum, item) => sum + (item.isActive === false ? 0 : item.stockQuantity || 0), 0)}</strong></div></> : <><div><span>Listed products</span><strong>{data.products?.length || 0}</strong></div><div><span>Organization</span><strong className="management-stat-text">By category</strong></div></>}
          </div>
          <div className="management-toolbar">
            <label className="management-search"><Search size={18} /><input aria-label={`Search ${tab}`} placeholder={`Search ${tab}…`} value={managementSearch} onChange={event => setManagementSearch(event.target.value)} /></label>
            {tab !== 'categories' && <select aria-label={`Filter ${tab} by status`} value={managementStatus} onChange={event => setManagementStatus(event.target.value)}><option value="all">All statuses</option>{(tab === 'orders' ? ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] : tab === 'suppliers' ? ['pending', 'approved', 'rejected'] : ['active', 'inactive']).map(status => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select>}
            <span className="muted">{managementItems.filter(managementMatches).length} results</span>
          </div>
          {managementItems.length > 0 && !managementItems.some(managementMatches) && <p className="empty">No matches. Try another search or status.</p>}
        </div>}
        {tab === "overview" && (
          <>
            {role === 'supplier' && <div className="supplier-business-heading"><span className="eyebrow">YOUR SHOP, AT A GLANCE</span><h2>{data.profile?.companyName || 'Your supplier workspace'}</h2><p className="muted">Manage your catalog, follow orders, and keep your business moving.</p></div>}
            <div
              className={`stat-grid${
                role === "admin"
                  ? " admin-stat-grid"
                  : role === "supplier"
                    ? " supplier-stat-grid"
                    : ""
              }`}
            >
              {[
                [Package, "Products", data.products?.length || 0],
                [ShoppingBag, "Orders", data.orders?.length || 0],
                [
                  role === "admin" ? Users : Building2,
                  role === "admin" ? "Users" : "Verification",
                  role === "admin"
                    ? data.users?.length || 0
                    : data.profile?.verificationStatus || "Not created",
                ],
              ].map(([Icon, label, value]) => (
                <div
                  className={`panel${
                    role === "admin"
                      ? " admin-stat-card"
                      : role === "supplier"
                        ? " supplier-stat-card"
                        : ""
                  }`}
                  key={label}
                >
                  <Icon size={22} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {role === 'supplier' && <div className="management-stats supplier-earnings-overview">
              <div><span>Recorded net earnings</span><strong>{money((data.orders || []).reduce((sum, order) => sum + Math.round((order.supplierAmounts?.supplierNetAmount || 0) * 100), 0) / 100)}</strong></div>
              <div><span>Supplier commission</span><strong>{money((data.orders || []).reduce((sum, order) => sum + Math.round((order.supplierAmounts?.commissionAmount || 0) * 100), 0) / 100)}</strong></div>
              <div><span>Orders to process</span><strong>{(data.orders || []).filter(order => order.items?.some(item => ['pending', 'processing'].includes(item.fulfillmentStatus))).length}</strong></div>
            </div>}
            <div
              className={`panel workspace-welcome${
                role === "supplier"
                  ? " supplier-welcome"
                  : role === "admin"
                    ? " admin-welcome"
                    : ""
              }`}
            >
              <span className="eyebrow">A LITTLE MOMENTUM GOES A LONG WAY</span>
              <h2>
                {role === "admin"
                  ? "Build a marketplace people trust."
                  : "Make room for your next bestseller."}
              </h2>
              <p>
                {role === "admin"
                  ? "Review suppliers, keep listings relevant, and support a better wholesale experience."
                  : "Keep your catalog up to date, manage stock, and give every order a great start."}
              </p>
              <button
                className="button"
                onClick={() =>
                  setTab(role === "admin" ? "suppliers" : "profile")
                }
              >
                {role === "admin"
                  ? "Review suppliers"
                  : "Manage business profile"}
                <ArrowUpRight size={17} />
              </button>
            </div>
          </>
        )}
        {tab === "profile" && (
          <div className="supplier-profile-layout">
          <aside className="supplier-shop-summary panel">
            {data.profile?.image ? <img className="shop-photo" src={imageUrl(data.profile.image)} alt={data.profile.companyName} /> : <div className="supplier-shop-avatar"><Building2 size={32} /></div>}
            <span className="eyebrow">BUSINESS PROFILE</span><h2>{data.profile?.companyName || 'Build your shop'}</h2>
            <span className={`status management-status ${data.profile?.verificationStatus || 'pending'}`}>{data.profile?.verificationStatus || 'pending'}</span>
            <p className="muted">Add clear business details and a shop photo so buyers can recognize your business.</p>
            <div className="supplier-fee-note"><strong>$0.20 per item</strong><small>Supplier commission. Buyers pay the listed price. Cancelled items have no commission.</small></div>
          </aside>
          <form
            className="panel dashboard-form"
            onSubmit={saveShop}
          >
            <h2>{data.profile?._id ? 'Shop details' : 'Register your shop'}</h2>
            <p className="muted">
              Submit your shop details for admin verification. You cannot sell or publish products until an admin approves your shop. Changes to these details require another review.
            </p>
            {["companyName", "address", "phone"].map((key) => (
              <label key={key}>
                {
                  {
                    companyName: "Shop name",
                    address: "Business address",
                    phone: "Phone number",
                  }[key]
                }
                <input
                  key={data.profile?.[key] || key}
                  name={key}
                  required
                  defaultValue={data.profile?.[key] || ""}
                />
              </label>
            ))}
            <label>Shop category<select name="category" required defaultValue={data.profile?.category?._id || data.profile?.category || ''} key={data.profile?.category?._id || 'shop-category'}><option value="" disabled>Choose category</option>{data.categories?.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
            <label>About your shop<textarea name="description" maxLength={2000} defaultValue={data.profile?.description || ''} /></label>
            <label>Shop photo or logo<input type="file" name="shopImage" accept="image/jpeg,image/png,image/webp" /><small>JPEG, PNG, or WebP, up to 5 MB.</small></label>
            {data.profile?.image && <img className="shop-photo" src={imageUrl(data.profile.image)} alt={data.profile.companyName} />}
            <p className="muted">After approval, open My products to add product names, categories, prices, and photos.</p>
            <button className="button" disabled={busy}>
              Save business profile
            </button>
          </form>
          </div>
        )}
        {tab === "products" && (
          <>
            <div className="dashboard-toolbar">
              <p>
                {role === "supplier"
                  ? `Verification: ${data.profile?.verificationStatus || "Create your profile first"}`
                  : "Manage your marketplace catalog"}
              </p>
              {role === "supplier" && (
                <button
                  className="button"
                  onClick={() => setEditing({ sellingType: "wholesale", category: data.profile?.category })}
                  disabled={
                    !preview && (!data.profile?._id || data.profile?.verificationStatus !== "approved")
                  }
                >
                  <Plus size={16} /> Add product
                </button>
              )}
            </div>
            {editing && (
              <form key={editing._id || "new-product"} className="panel form-grid" onSubmit={saveProduct}>
                <h2 className="span-two">
                  {editing._id ? "Edit product" : "New wholesale product"}
                </h2>
                {[
                  ["name", "Product name", "text"],
                  ["price", "Unit price (USD)", "number"],
                  ["stockQuantity", "Stock quantity", "number"],
                ].map(([key, label, type]) => (
                  <label key={key}>
                    {label}
                    <input
                      required
                      name={key}
                      type={type}
                      min={
                        key === "price"
                          ? ".01"
                          : key === "stockQuantity"
                            ? "0"
                            : "1"
                      }
                      step={key === "price" ? ".01" : "1"}
                      defaultValue={editing[key] ?? ""}
                    />
                  </label>
                ))}
                <label>
                  Product Selling Type
                  <select name="sellingType" required value={sellingTypeFor(editing)} onChange={e => setEditing(previous => ({ ...previous, sellingType: e.target.value }))}>
                    <option value="wholesale">Wholesale</option>
                    <option value="single">Single Item</option>
                  </select>
                </label>
                {sellingTypeFor(editing) === "wholesale" && <label>
                  Minimum Order Quantity
                  <input name="minimumOrderQuantity" aria-label="Minimum Order Quantity" aria-describedby="wholesale-minimum-help" type="number" required min="2" step="1" defaultValue={editing.minimumOrderQuantity >= 2 ? editing.minimumOrderQuantity : ""} />
                  <small id="wholesale-minimum-help" className="muted">Wholesale orders must contain at least 2 items.</small>
                </label>}
                <label>
                  Category
                  <select
                    name="category"
                    aria-label="Category"
                    required
                    defaultValue={editing.category?._id || ""}
                  >
                    <option value="" disabled>
                      Choose category
                    </option>
                    {data.categories?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="span-two">
                  Product Description
                  <textarea
                    name="description"
                    defaultValue={editing.description}
                  />
                </label>
                <label className="span-two">
                  Product Images
                  <input aria-label="Product Images" name="imageFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple />
                  <small className="muted">Choose photos from your device. Up to 10 images, 5 MB each. JPEG, PNG, or WebP.</small>
                </label>
                {editing.images?.length > 0 && <div className="span-two product-upload-previews">
                  {editing.images.map((url, index) => <div key={`${url}-${index}`}>
                    <img src={imageUrl(url)} alt={`Product image ${index + 1}`} />
                    <button type="button" className="text-link" onClick={() => setEditing(previous => ({ ...previous, images: previous.images.filter((_, i) => i !== index) }))}>Remove image {index + 1}</button>
                  </div>)}
                </div>}
                <div className="hero-buttons span-two">
                  <button className="button" disabled={busy}>
                    Save product
                  </button>
                  <button
                    type="button"
                    className="button outline"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products?.filter(p => !managementView || managementMatches(p)).map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div className="management-product-cell">{<img src={imageUrl(p.images?.[0]) || '/product-placeholder.svg'} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/product-placeholder.svg'; }} />}<div><strong>{p.name}</strong><small>{p.supplier?.companyName}</small>{<small>{p.category?.name || 'Uncategorized'}</small>}</div></div>
                      </td>
                      <td>{money(p.price)}</td>
                      <td>{p.stockQuantity}</td>
                      <td>
                        <span className={`status management-status ${p.isActive === false ? 'inactive' : 'approved'}`}>
                          {p.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          {role === "supplier" && (
                            <button
                              className="icon-button"
                              aria-label={`Edit ${p.name}`}
                              onClick={() => setEditing(p)}
                              disabled={
                                !preview &&
                                data.profile?.verificationStatus !== "approved"
                              }
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          <button
                            className="icon-button"
                            disabled={
                              busy ||
                              p.isActive === false ||
                              (role === "supplier" &&
                                !preview &&
                                data.profile?.verificationStatus !== "approved")
                            }
                            aria-label={`Deactivate ${p.name}`}
                            onClick={() =>
                              mutate(
                                "delete",
                                role === "admin"
                                  ? `/admin/products/${p._id}`
                                  : `/products/${p._id}`,
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.products?.length && (
                <p className="empty">Your products will appear here.</p>
              )}
            </div>
          </>
        )}
        {tab === "users" && (
          <div className="admin-users">
            <div className="admin-users-intro">
              <div>
                <span className="eyebrow">PEOPLE &amp; ACCESS</span>
                <h2>Manage marketplace users</h2>
                <p>
                  Review account access and keep your community in good
                  standing.
                </p>
              </div>
              <span className="admin-users-total">
                <Users size={17} />
                {users.length} {users.length === 1 ? "account" : "accounts"}
              </span>
            </div>
            <div className="admin-user-stats">
              {[
                [UserRound, "All accounts", users.length, "all"],
                [UserCheck, "Active", activeUserCount, "active"],
                [UserX, "Suspended", suspendedUserCount, "suspended"],
              ].map(([Icon, label, count, filter]) => (
                <button
                  className={`admin-user-stat${
                    userStatusFilter === filter ? " selected" : ""
                  }`}
                  key={filter}
                  onClick={() => setUserStatusFilter(filter)}
                  aria-pressed={userStatusFilter === filter}
                >
                  <span className="admin-user-stat-icon">
                    <Icon size={18} />
                  </span>
                  <span className="admin-user-stat-copy">
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </span>
                </button>
              ))}
            </div>
            <div className="data-table admin-users-table">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Account status</th>
                    <th className="admin-user-action-heading">Access</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((account) => {
                    const status = account.accountStatus?.toLowerCase();
                    const initials = (account.name || account.email || "?")
                      .split(/[\s@]+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase();
                    return (
                      <tr key={account._id}>
                        <td>
                          <div className="admin-user-identity">
                            <span
                              className="admin-user-avatar"
                              aria-hidden="true"
                            >
                              {initials}
                            </span>
                            <span className="admin-user-details">
                              <strong>{account.name || "Unnamed user"}</strong>
                              <small>{account.email}</small>
                            </span>
                            {account._id === user?._id && (
                              <span className="admin-user-self">You</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`admin-user-role role-${account.role}`}
                          >
                            {account.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`admin-user-status status-${status}`}
                          >
                            <span />
                            {account.accountStatus}
                          </span>
                        </td>
                        <td className="admin-user-action">
                          <button
                            disabled={busy || account._id === user?._id}
                            className={`admin-user-toggle ${
                              status === "active" ? "suspend" : "activate"
                            }`}
                            onClick={() =>
                              mutate(
                                "patch",
                                `/admin/users/${account._id}/status`,
                                {
                                  accountStatus:
                                    status === "active" ? "suspended" : "active",
                                },
                              )
                            }
                          >
                            {status === "active"
                              ? "Suspend access"
                              : "Restore access"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredUsers.length && (
                <div className="admin-users-empty">
                  <span className="admin-user-empty-icon">
                    <Users size={22} />
                  </span>
                  <strong>
                    {users.length
                      ? `No ${userStatusFilter} users`
                      : "No users to display"}
                  </strong>
                  <p>
                    {users.length
                      ? "Select another account status to see more users."
                      : `User accounts will appear here when available${
                          preview ? " in the dashboard preview" : ""
                        }.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {tab === "suppliers" && (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {data.suppliers?.filter(managementMatches).map((s) => (
                  <Fragment key={s._id}><tr>
                    <td>
                      <button
                        type="button"
                        id={`supplier-trigger-${s._id}`}
                        className="supplier-profile-trigger"
                        aria-expanded={supplierProfileId === s._id}
                        aria-controls={`supplier-profile-${s._id}`}
                        onClick={() => setSupplierProfileId(current => current === s._id ? null : s._id)}
                      >
                        <strong><span className="management-avatar">{s.companyName?.slice(0, 1).toUpperCase()}</span>{s.companyName} <ArrowUpRight size={15} aria-hidden="true" /></strong>
                        <small>{s.user?.email || s.address}</small>
                        <span>{supplierProfileId === s._id ? "Hide profile" : "View supplier profile"}</span>
                      </button>
                    </td>
                    <td>
                      <span className={`status management-status ${s.verificationStatus}`}>{s.verificationStatus}</span>
                      {s.profileRequired && <small>Registered supplier account</small>}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "patch",
                              `/admin/suppliers/${s._id}/verification`,
                              { verificationStatus: "approved" },
                            )
                          }
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          className="button small outline"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "patch",
                              `/admin/suppliers/${s._id}/verification`,
                              { verificationStatus: "rejected" },
                            )
                          }
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                  {supplierProfileId === s._id && (
                    <tr className="supplier-profile-row"><td colSpan={3}>
                      <section id={`supplier-profile-${s._id}`} className="supplier-profile-review" aria-label={`${s.companyName} supplier profile`}>
                        <div className="supplier-profile-heading"><div><span className="eyebrow">SUPPLIER REVIEW</span><h2>{s.companyName}</h2><p>Review the submitted business details before making a verification decision.</p></div><span className="status">{s.verificationStatus}</span></div>
                        <dl className="supplier-profile-fields">
                          {[
                            ["Business name", s.companyName],
                            ["Shop category", s.category?.name],
                            ["About the shop", s.description],
                            ["Business address", s.address],
                            ["Business phone", s.phone],
                            ["Account holder", s.user?.name],
                            ["Account email", s.user?.email],
                            ["Account status", s.user?.accountStatus],
                            ["Profile submitted", s.createdAt ? new Date(s.createdAt).toLocaleDateString() : null],
                            ["Last updated", s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : null],
                          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>)}
                        </dl>
                        {s.image && <img className="shop-photo" src={imageUrl(s.image)} alt={`${s.companyName} shop`} />}
                        <p className="supplier-profile-footnote">Opening this profile does not approve or reject the supplier. Use the verification buttons above when you have finished reviewing.</p>
                      </section>
                    </td></tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "categories" && (
          <>
            <form
              className="panel inline-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                if (
                  await mutate(
                    editing?._id ? "put" : "post",
                    editing?._id ? `/categories/${editing._id}` : "/categories",
                    Object.fromEntries(new FormData(form)),
                  )
                ) {
                  setEditing(null);
                  form.reset();
                }
              }}
            >
              <div className="management-form-heading"><span className="eyebrow">CATALOG ORGANIZATION</span><h2>{editing ? 'Edit category' : 'Create a category'}</h2></div>
              <label>
                Category name
                <input
                  required
                  name="name"
                  key={`name-${editing?._id || ""}`}
                  defaultValue={editing?.name || ""}
                />
              </label>
              <label>
                Description
                <input
                  name="description"
                  key={`description-${editing?._id || ""}`}
                  defaultValue={editing?.description || ""}
                />
              </label>
              <button className="button" disabled={busy}>
                {editing ? "Save category" : "Add category"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              )}
            </form>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories?.filter(managementMatches).map((c) => (
                    <tr key={c._id}>
                      <td>{c.name}</td>
                      <td>{c.description}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${c.name}`}
                            onClick={() => setEditing(c)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Delete ${c.name}`}
                            disabled={busy}
                            onClick={() =>
                              mutate("delete", `/categories/${c._id}`)
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === "orders" && (
          <div className="orders-list">
            {role === 'supplier' && <p className="muted">Buyers have already placed these orders. Accept an order to start preparing it, then mark it shipped and delivered.</p>}
            {data.orders?.filter(order => !managementView || managementMatches(order)).map((o) => (
              <article className={`panel admin-order-card`} key={o._id}>
                <div className="section-heading">
                  <div><span className="eyebrow">PURCHASE RECORD</span><h3>Order #{o._id.slice(-8).toUpperCase()}</h3>{o.createdAt && <small className="muted">{new Date(o.createdAt).toLocaleDateString()} · {o.items.length} product{o.items.length === 1 ? '' : 's'}</small>}</div>
                  <span className={`status management-status ${o.orderStatus}`}>{o.orderStatus}</span>
                  <div className="admin-order-total"><small>Order total</small><strong>{money(o.totalAmount)}</strong></div>
                </div>
                {o.items.map((item) => (
                  <div className="fulfillment-row" key={item._id}>
                    <span>
                      {item.productName}
                      {item.commissionAmount !== undefined && <small>Supplier commission: {money(item.commissionAmount)} · Net earnings: {money(item.supplierNetAmount)}{item.fulfillmentStatus !== 'cancelled' ? ` ($0.20 × ${item.quantity} items)` : ' (cancelled)'}</small>}
                      <small>
                        {item.quantity} × {money(item.unitPrice)}
                      </small>
                    </span>
                    {role === "supplier" ? (
                      <div className="supplier-order-actions" role="group" aria-label={`Fulfillment for ${item.productName}`}>
                        <span className={`status management-status ${item.fulfillmentStatus}`}>{item.fulfillmentStatus}</span>
                        {['pending', 'processing', 'shipped'].includes(item.fulfillmentStatus) && <button type="button" className="button small" disabled={busy} onClick={() => mutate('patch', `/orders/${o._id}/fulfillment`, { itemId: item._id, fulfillmentStatus: ({ pending: 'processing', processing: 'shipped', shipped: 'delivered' })[item.fulfillmentStatus] })}>
                          {({ pending: 'Accept order', processing: 'Mark as shipped', shipped: 'Mark as delivered' })[item.fulfillmentStatus]}
                        </button>}
                        {['pending', 'processing'].includes(item.fulfillmentStatus) && <button type="button" className="text-link supplier-cancel-order" disabled={busy} onClick={() => {
                          if (window.confirm(`Cancel ${item.productName} from this order? The buyer will be notified and the stock will be restored.`)) mutate('patch', `/orders/${o._id}/fulfillment`, { itemId: item._id, fulfillmentStatus: 'cancelled' });
                        }}>Cancel item</button>}
                      </div>
                    ) : (
                      <span className={`status management-status ${item.fulfillmentStatus}`}>{item.fulfillmentStatus}</span>
                    )}
                  </div>
                ))}
                <div className="admin-order-delivery"><span className="muted">Delivery details</span><p>{o.deliveryAddress}</p>{role === 'admin' && <small className="muted">{o.paymentMethod === 'zaad_demo' ? 'Zaad (simulated)' : o.paymentMethod === 'edahab_demo' ? 'eDahab (simulated)' : 'Cash on Delivery'} · Payment: {o.paymentStatus || 'pending'}</small>}</div>
                {role === 'supplier' && o.supplierAmounts && <p className="supplier-financial-summary">Sales: {money(o.supplierAmounts.grossAmount)} · Commission: {money(o.supplierAmounts.commissionAmount)} · Net earnings: {money(o.supplierAmounts.supplierNetAmount)}<small className="muted"> Recorded amounts only; no automatic payment or payout.</small></p>}
                {role === 'admin' && o.agreement && <details className="agreement-record">
                  <summary>View buyer purchase agreement</summary>
                  <p>{o.agreement.text}</p>
                  <p>Accepted by {o.agreement.buyerName} ({o.agreement.buyerEmail}) on {new Date(o.agreement.acceptedAt).toLocaleString()}</p>
                  <p>Version: {o.agreement.version}</p>
                  <small>Agreement text SHA-256: {o.agreement.hash}</small>
                </details>}
              </article>
            ))}
            {!data.orders?.length && (
              <div className="panel empty">
                <ShoppingBag size={35} />
                <h2>No orders yet.</h2>
                <p>Incoming orders will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
