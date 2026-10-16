import React, { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  ReceiptText,
  ChartNoAxesCombined,
  Settings,
  Bell,
  Wifi,
  Database,
  CheckCircle2,
} from "lucide-react";
import { StoreProvider, useStore } from "./context/StoreContext.jsx";
import BillingView from "./components/BillingView.jsx";
import DashboardView from "./components/DashboardView.jsx";
import InventoryView from "./components/InventoryView.jsx";
import TransactionsView from "./components/TransactionsView.jsx";
import ReportsView from "./components/ReportsView.jsx";
import SettingsView from "./components/SettingsView.jsx";
import ReceiptModal from "./components/ReceiptModal.jsx";
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
  dashboard: [
    "Business overview",
    "Live indicators for retail footwear sales, active stock, and profitability.",
  ],
  billing: [
    "Billing counter",
    "Search footwear, tap an in-stock size, add to bill, and generate instant tax invoice.",
  ],
  inventory: [
    "Products & inventory",
    "Footwear models, sizes 6-10 stock counts, barcodes, purchase costs, and quick adjustments.",
  ],
  transactions: [
    "Sales & transactions",
    "Complete tax invoice records, digital & cash breakdowns, receipt reprinting and returns.",
  ],
  reports: [
    "Reports & analytics",
    "Footwear size velocity demand, daily gross margin, category sales and CSV exports.",
  ],
  settings: [
    "Shop settings",
    "Store identity, GST tax rules, invoice prefixes, and database management.",
  ],
};

class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("View Error Caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", textAlign: "center", background: "#fff", borderRadius: "10px", margin: "20px" }}>
          <h2 style={{ color: "#dc2626", fontSize: "16px", marginBottom: "8px" }}>Notice: Issue loading this view</h2>
          <p style={{ color: "#64748b", margin: "0 0 16px", fontSize: "12px" }}>{this.state.error?.message || "An unexpected error occurred."}</p>
          <button className="btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>
            Reload View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainWorkspace() {
  const {
    activeTab,
    setActiveTab,
    notifications,
    markAllNotificationsRead,
    handleNotificationClick,
    dbStatus,
  } = useStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const selected = moduleText[activeTab] || moduleText.billing;
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-seal">JDS</div>
          <div>
            <strong>JDS Traders</strong>
            <span>FOOTWEAR • SINCE 2014</span>
          </div>
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className={`online-dot ${dbStatus.connected ? "connected" : ""}`} />
          <span>
            {dbStatus.connected
              ? "Live PostgreSQL connected"
              : "Application ready for Supabase setup"}
          </span>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="eyebrow">JDS TRADERS / WORKSPACE</div>
            <h1>{selected[0]}</h1>
          </div>

          <div className="top-actions">
            {/* Connection Status Pill */}
            <div
              className="connection"
              title={dbStatus.message}
              style={{ cursor: "default" }}
            >
              <Wifi size={14} style={{ color: dbStatus.connected ? "#16a34a" : "#f59e0b" }} />
              <span>{dbStatus.mode}</span>
            </div>

            {/* Notifications Button */}
            <div style={{ position: "relative" }}>
              <button
                className="icon-button"
                aria-label="Notifications"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notif-badge-pill">{unreadCount}</span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notif-header">
                    <div>
                      <strong>Store Notifications</strong>
                      <span className="notif-sub-hint">Click any alert to navigate</span>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllNotificationsRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: "#94a3b8",
                          fontSize: "11px",
                        }}
                      >
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item clickable ${n.unread ? "unread" : ""}`}
                          onClick={() => {
                            handleNotificationClick(n);
                            setShowNotifications(false);
                          }}
                          role="button"
                          tabIndex={0}
                          title="Click to navigate directly to this item"
                        >
                          <div className="notif-item-title">
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {n.type === "sale" && <span className="notif-tag sale">SALE</span>}
                              {n.type === "stock" && <span className="notif-tag stock">STOCK</span>}
                              <strong>{n.title}</strong>
                            </span>
                            <span>{n.time}</span>
                          </div>
                          <p>{n.message}</p>
                          <div className="notif-nav-action">
                            {n.targetTab === "transactions" || n.type === "sale"
                              ? "View Invoice & Receipt →"
                              : n.targetTab === "inventory" || n.type === "stock"
                              ? "Inspect Stock in Inventory →"
                              : "Open Module →"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="avatar" title="JDS Traders Staff">
              JD
            </div>
          </div>
        </header>

        {/* ACTIVE DASHBOARD VIEW */}
        <ViewErrorBoundary key={activeTab}>
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "billing" && <BillingView />}
          {activeTab === "inventory" && <InventoryView />}
          {activeTab === "transactions" && <TransactionsView />}
          {activeTab === "reports" && <ReportsView />}
          {activeTab === "settings" && <SettingsView />}
        </ViewErrorBoundary>
      </main>

      {/* Global Invoice / Receipt Print Modal */}
      <ReceiptModal />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainWorkspace />
    </StoreProvider>
  );
}
