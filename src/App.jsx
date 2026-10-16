import { useState } from "react";
import { LayoutDashboard, ShoppingCart, Boxes, ReceiptText, ChartNoAxesCombined, Settings, Search, Bell, Wifi } from "lucide-react";
import "./styles/app.css";

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "billing", label: "Billing / POS", icon: ShoppingCart },
  { id: "inventory", label: "Products & Inventory", icon: Boxes },
  { id: "transactions", label: "Sales & Transactions", icon: ReceiptText },
  { id: "reports", label: "Reports & Analytics", icon: ChartNoAxesCombined },
  { id: "settings", label: "Settings", icon: Settings },
];

const moduleText = {
  dashboard: ["Business overview", "Sales, stock and profit indicators will appear here once the database is connected."],
  billing: ["Billing counter", "Search footwear, choose an in-stock size, add it to the cart, and complete payment."],
  inventory: ["Products & inventory", "Manage product details, sizes, barcodes, purchase cost and available quantities."],
  transactions: ["Sales & transactions", "Search completed invoices, review payment methods and reprint bills."],
  reports: ["Reports & analytics", "View real sales trends, low-stock products, popular models and profit summaries."],
  settings: ["Shop settings", "Configure shop details, tax rules, invoice layout and staff permissions."],
};

export default function App() {
  const [active, setActive] = useState("billing");
  const [search, setSearch] = useState("");
  const selected = moduleText[active];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-seal">JDS</div>
          <div><strong>JDS Traders</strong><span>FOOTWEAR • SINCE 2014</span></div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${active === id ? "active" : ""}`} onClick={() => setActive(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="online-dot" /> Application ready for Supabase setup
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">JDS TRADERS / WORKSPACE</div>
            <h1>{selected[0]}</h1>
          </div>
          <div className="top-actions">
            <div className="connection"><Wifi size={15} /> Backend not connected</div>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <div className="avatar">JD</div>
          </div>
        </header>

        {active === "billing" ? (
          <section className="billing-layout">
            <div className="panel catalog-panel">
              <div className="panel-heading">
                <div><h2>Product catalogue</h2><p>Search by product, article code or barcode</p></div>
                <span className="small-tag">LIVE STOCK AFTER CONNECTION</span>
              </div>
              <div className="search-row">
                <Search size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search footwear, SKU or barcode..." />
                <kbd>Enter</kbd>
              </div>
              <div className="empty-state">
                <div className="empty-icon"><Boxes size={25} /></div>
                <h3>Products will appear here</h3>
                <p>{search ? `Search for “${search}” will run when Supabase is connected.` : "Connect your database to load products and in-stock sizes."}</p>
              </div>
            </div>

            <div className="panel cart-panel">
              <div className="panel-heading"><div><h2>Current bill</h2><p>Invoice created at checkout</p></div><span className="cart-count">0 items</span></div>
              <div className="cart-empty"><ShoppingCart size={30} /><strong>Your cart is empty</strong><span>Select a product and size to begin.</span></div>
              <div className="totals">
                <div><span>Subtotal</span><strong>₹0.00</strong></div>
                <div><span>Discount</span><strong>₹0.00</strong></div>
                <div><span>GST</span><strong>₹0.00</strong></div>
                <div className="grand-total"><span>Grand total</span><strong>₹0.00</strong></div>
                <button className="checkout-button" disabled>Checkout · ₹0.00</button>
                <p className="checkout-note">Checkout enables after products and database are connected.</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="module-panel panel">
            <div className="module-icon">{navigation.find((item) => item.id === active)?.icon({ size: 24 })}</div>
            <h2>{selected[0]}</h2>
            <p>{selected[1]}</p>
            <div className="module-note">This module will use live PostgreSQL data. No sample financial values are shown.</div>
          </section>
        )}
      </main>
    </div>
  );
}
