import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./Navbar";
const footerYear = new Date().getFullYear();
export default function Footer() {
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Brand large />
          <p>
            Good products. Better connections.
            <br />
            More possibilities for your business.
          </p>
        </div>
        <div>
          <h3>Explore</h3>
          <Link to="/shop">Shop all products</Link>
          <Link to="/categories">Our categories</Link>
          <Link to="/suppliers">Meet the suppliers</Link>
        </div>
        <div>
          <h3>Your business</h3>
          <Link to="/orders">My orders</Link>
          <Link to="/register">
            Become a supplier <ArrowUpRight size={13} />
          </Link>
          <Link to="/account">Your account</Link>
        </div>
        <div>
          <h3>Let’s grow together.</h3>
          <p>
            Your next business chapter
            <br />
            starts with the right supply.
          </p>
          <Link className="footer-cta" to="/register">
            Join the marketplace <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {footerYear} YouSupply Marketplace. All rights reserved.</span>
        <span>Trade. Source. Grow.</span>
        <span>USD · English</span>
      </div>
    </footer>
  );
}
