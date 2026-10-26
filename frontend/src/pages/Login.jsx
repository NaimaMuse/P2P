import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { Brand } from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";
export default function Login({ register = false }) {
  const { authenticate } = useAuth(),
    navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const values = { email: form.get("email").trim(), password: form.get("password") };
    if (register)
      Object.assign(values, { name: form.get("name").trim(), role: form.get("role") });
    if (register && !values.name) {
      setError("Full name is required.");
      setBusy(false);
      return;
    }
    if (register && (!values.password.trim() || values.password.length < 8 || new TextEncoder().encode(values.password).length > 72)) {
      setError("Password must be at least 8 characters and at most 72 UTF-8 bytes.");
      setBusy(false);
      return;
    }
    try {
      const user = await authenticate(register ? "register" : "login", values);
      const next = params.get("next");
      navigate(
        next?.startsWith("/") && !next.startsWith("//")
          ? next
          : user.role === "buyer"
            ? "/shop"
            : user.role === "supplier"
              ? register ? "/supplier/dashboard?setup=shop" : "/supplier/dashboard"
              : "/admin/dashboard",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container auth-layout">
      <div className="auth-editorial">
        <Brand large />
        <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
        <h1>
          Better sourcing.
          <br />
          Bigger possibilities.
        </h1>
        <p>
          A world of wholesale products, and the people who help your business
          grow.
        </p>
        <span className="auth-bottom">TRADE. SOURCE. GROW.</span>
      </div>
      <div className="auth-form">
        <span className="eyebrow">WELCOME TO YouSupply</span>
        <h2>
          {register ? "Room for your ambition." : "Good to have you back."}
        </h2>
        <p>
          {register
            ? "Create an account. Open up possibilities."
            : "Sign in to pick up where you left off."}
        </p>
        <form onSubmit={submit}>
          {register && (
            <label>
              Full name
              <input name="name" autoComplete="name" required maxLength={120} />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <span className="password-input">
              <input
                name="password"
                type={show ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 8 : undefined}
                maxLength={72}
                required
              />
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {register && (
            <>
              <p className="muted">
                At least 8 characters. Maximum 72 UTF-8 bytes.
              </p>
              <label>
                I’m here to
                <select name="role" defaultValue={params.get('role') === 'supplier' ? 'supplier' : 'buyer'}>
                  <option value="buyer">Buy wholesale products</option>
                  <option value="supplier">Sell as a supplier</option>
                </select>
              </label>
              <p className="muted">Suppliers must submit their shop details and receive admin approval before selling.</p>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy
              ? "One moment…"
              : register
                ? "Create your account"
                : "Sign in"}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already part of YouSupply?" : "New to the marketplace?"}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <p className="muted">
          {register
            ? "Supplier accounts require admin approval before listing products."
            : "Explore the demo collection without an account."}
        </p>
        <Link className="text-link" to="/shop">
          Explore the marketplace <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}
