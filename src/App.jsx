import React, { useState, useMemo, useEffect } from "react";
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
  Users,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Lock,
  X,
} from "lucide-react";
import { StoreProvider, useStore } from "./context/StoreContext.jsx";
import BillingView from "./components/BillingView.jsx";
import DashboardView from "./components/DashboardView.jsx";
import InventoryView from "./components/InventoryView.jsx";
import TransactionsView from "./components/TransactionsView.jsx";
import ReportsView from "./components/ReportsView.jsx";
import SettingsView from "./components/SettingsView.jsx";
import ReceiptModal from "./components/ReceiptModal.jsx";
import LoginView from "./components/LoginView.jsx";
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
    "Store identity, GST tax rules, invoice prefixes, and staff user management.",
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
    clearNotification,
    clearAllNotifications,
    handleNotificationClick,
    dbStatus,
    users,
    currentUser,
    switchUser,
    isAdmin,
    isAuthenticated,
    logout,
  } = useStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const selected = moduleText[activeTab] || moduleText.billing;
  const unreadCount = notifications.filter((n) => n.unread).length;

  // Role-based navigation: Admin has all tabs. Staff has strictly Billing, Dashboard, and Products & Inventory.
  const visibleNavItems = useMemo(() => {
    if (isAdmin) return navigation;
    return navigation.filter((item) =>
      ["billing", "dashboard", "inventory"].includes(item.id)
    );
  }, [isAdmin]);

  // If a staff user is on a restricted tab, automatically fallback to billing
  useEffect(() => {
    if (!isAdmin && !["billing", "dashboard", "inventory"].includes(activeTab)) {
      setActiveTab("billing");
    }
  }, [isAdmin, activeTab, setActiveTab]);

  // Show Login Screen if not authenticated
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="app-shell">
      {/* SIDEBAR (Strictly pinned on left; does not scroll when screen scrolls) */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-seal-logo-wrap">
            <img src="/logo.png" alt="JDS Traders Logo" className="brand-logo-circle" />
          </div>
          <div>
            <strong>JDS Traders</strong>
            <span>FOOTWEAR • SINCE 2014</span>
          </div>
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="sidebar-nav-scroll">
          {visibleNavItems.map(({ id, label, icon: Icon }) => (
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

        {/* CURRENT USER DETAILS AT LEFT BOTTOM CORNER */}
        <div className="sidebar-bottom-user-section">
          <div className="sidebar-current-user-card">
            <div className={`sidebar-user-avatar ${isAdmin ? "admin" : ""}`}>
              {currentUser?.name
                ? currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "JD"}
            </div>
            <div className="sidebar-user-details">
              <strong className="sidebar-user-name" title={currentUser?.name}>
                {currentUser?.name || "JDS Staff"}
              </strong>
              <span className={`sidebar-role-badge ${currentUser?.role?.toLowerCase() || "cashier"}`}>
                {isAdmin ? "★ Admin" : currentUser?.role || "Staff"}
              </span>
            </div>
            <div className="sidebar-user-controls">
              <button
                type="button"
                className="btn-sidebar-user-action"
                title="Switch Counter User"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <Users size={13} />
              </button>
              <button
                type="button"
                className="btn-sidebar-user-action logout"
                title="Lock Register / Logout"
                onClick={logout}
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>

          {/* User Switcher Dropdown Popover */}
          {showUserMenu && (
            <div className="sidebar-user-dropdown-popover">
              <div className="user-dropdown-header">
                <div>
                  <strong>Switch Counter User</strong>
                  <span className="sub-hint">Actions will be logged under this user</span>
                </div>
              </div>

              <div className="user-list">
                {users.map((u) => {
                  const isSelected = u.id === currentUser?.id;
                  const initials = u.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const isAdminUser = u.role === "Admin";

                  return (
                    <div
                      key={u.id}
                      className={`user-dropdown-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        switchUser(u.id);
                        setShowUserMenu(false);
                      }}
                    >
                      <div className={`user-item-avatar ${isAdminUser ? "admin" : ""}`}>
                        {initials}
                      </div>
                      <div className="user-item-meta">
                        <strong>{u.name}</strong>
                        <span className="sub-text">
                          {isAdminUser ? "★ Admin" : u.role || "Staff"}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={16} style={{ color: "#16a34a", marginLeft: "auto" }} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="user-dropdown-footer">
                {isAdmin && (
                  <button
                    className="btn-dropdown-manage"
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab("settings");
                    }}
                  >
                    <Users size={14} /> Manage Staff & Users
                  </button>
                )}
                <button
                  className="btn-dropdown-manage danger"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                >
                  <LogOut size={14} /> Lock & Sign Out
                </button>
              </div>
            </div>
          )}

          <div className="sidebar-footer">
            <span className={`online-dot ${dbStatus.connected ? "connected" : ""}`} />
            <span>
              {dbStatus.connected
                ? "Live PostgreSQL online"
                : "Local database active"}
            </span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER (Smooth independent scroll; sidebar remains strictly stationary) */}
      <main className="main">
        {/* Subtle circular logo watermark across the software */}
        <div className="software-watermark" aria-hidden="true">
          <img src="/logo.png" alt="" />
        </div>

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
                      <span className="notif-sub-hint">Click alert to open & clear</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          title="Mark all notifications as read"
                        >
                          Mark read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllNotifications}
                          title="Clear all store notifications"
                          style={{ color: "#dc2626" }}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: "20px 16px",
                          textAlign: "center",
                          color: "#94a3b8",
                          fontSize: "11px",
                        }}
                      >
                        ✓ All notifications cleared
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
                          title="Click to check details (clears notification)"
                        >
                          <div className="notif-item-title">
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {n.type === "sale" && <span className="notif-tag sale">SALE</span>}
                              {n.type === "stock" && <span className="notif-tag stock">STOCK</span>}
                              <strong>{n.title}</strong>
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>{n.time}</span>
                              <button
                                type="button"
                                className="notif-dismiss-btn"
                                title="Dismiss / Clear notification"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearNotification(n.id);
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
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

            {/* Lock Register / Sign Out Button in Topbar */}
            <button
              className="icon-button"
              title="Lock Counter Register"
              onClick={logout}
              aria-label="Lock Register"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* ACTIVE DASHBOARD VIEW */}
        <ViewErrorBoundary key={activeTab}>
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "billing" && <BillingView />}
          {activeTab === "inventory" && <InventoryView />}
          {isAdmin && activeTab === "transactions" && <TransactionsView />}
          {isAdmin && activeTab === "reports" && <ReportsView />}
          {isAdmin && activeTab === "settings" && <SettingsView />}
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
