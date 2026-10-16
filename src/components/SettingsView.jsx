import React, { useState } from "react";
import {
  Store,
  Receipt,
  Database,
  Save,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Building,
} from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";

export default function SettingsView() {
  const {
    settings,
    updateSettings,
    dbStatus,
    resetToDemoData,
    clearAllData,
    syncCatalogToSupabase,
  } = useStore();
  const [formData, setFormData] = useState({ ...settings });
  const [savedAlert, setSavedAlert] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const handleClearMock = () => {
    if (
      confirm(
        "Are you sure you want to clear all mock products, transactions, and sample notifications to start with a fresh real-time store catalog?"
      )
    ) {
      clearAllData();
      alert("Mock details cleared! The store catalog is now clean and ready for your real inventory.");
    }
  };

  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to reset all store data to the default starter footwear catalog? Any test sales will be reset."
      )
    ) {
      resetToDemoData();
      setSavedAlert(true);
      setTimeout(() => setSavedAlert(false), 3000);
    }
  };

  return (
    <div className="settings-container">
      {savedAlert && (
        <div className="toast-success">
          <CheckCircle size={16} /> Store settings updated and persisted successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="settings-grid">
          {/* Shop Profile Panel */}
          <div className="panel settings-card">
            <div className="panel-heading">
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div className="setting-icon-box">
                  <Store size={18} />
                </div>
                <div>
                  <h2>Shop Identity & Profile</h2>
                  <p>Store name, branding, and contact printed on receipts</p>
                </div>
              </div>
            </div>

            <div className="settings-form-body">
              <div className="form-field">
                <label>Store Name</label>
                <input
                  type="text"
                  required
                  value={formData.shop_name}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_name: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>Tagline / Brand Subtitle</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) =>
                    setFormData({ ...formData, tagline: e.target.value })
                  }
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Store Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Store Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Store Address (printed on invoices)</label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>GSTIN / Tax Number</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData({ ...formData, gstin: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* POS & Invoice Settings Panel */}
          <div className="panel settings-card">
            <div className="panel-heading">
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div className="setting-icon-box">
                  <Receipt size={18} />
                </div>
                <div>
                  <h2>POS & Invoicing Rules</h2>
                  <p>Tax slabs, invoice numbering, and footer terms</p>
                </div>
              </div>
            </div>

            <div className="settings-form-body">
              <div className="form-field">
                <label>Default Footwear GST Rate</label>
                <select
                  value={formData.default_tax_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_tax_rate: Number(e.target.value),
                    })
                  }
                >
                  <option value="5">5% (Footwear below ₹1,000)</option>
                  <option value="12">12% (Footwear ₹1,000 and above)</option>
                  <option value="0">0% (Tax Exempt)</option>
                  <option value="18">18% Standard</option>
                </select>
              </div>

              <div className="form-field">
                <label>Invoice Number Prefix</label>
                <input
                  type="text"
                  value={formData.invoice_prefix}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_prefix: e.target.value })
                  }
                  placeholder="JDS-INV-"
                />
              </div>

              <div className="form-field">
                <label>Receipt Footer Note & Return Policy</label>
                <textarea
                  rows="3"
                  value={formData.footer_note}
                  onChange={(e) =>
                    setFormData({ ...formData, footer_note: e.target.value })
                  }
                />
              </div>

              <div className="pos-hint-box" style={{ marginTop: "12px" }}>
                <ShieldCheck size={16} style={{ color: "#c5a15c", flexShrink: 0 }} />
                <span>
                  Footwear billing conforms to Indian GST standards. Invoices
                  include HSN/SAC references, shop GSTIN, customer details and
                  separate tax calculations.
                </span>
              </div>
            </div>
          </div>

          {/* Database & Architecture Panel */}
          <div className="panel settings-card" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-heading">
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div className="setting-icon-box">
                  <Database size={18} />
                </div>
                <div>
                  <h2>Database & System Storage</h2>
                  <p>Supabase PostgreSQL integration and resilient local cache</p>
                </div>
              </div>
              <span className="small-tag" style={{ background: dbStatus.connected ? "#dcfce7" : "#fef3c7", color: dbStatus.connected ? "#15803d" : "#b45309" }}>
                {dbStatus.mode}
              </span>
            </div>

            <div className="db-status-strip">
              <div className="db-info">
                <strong>Supabase Project:</strong>
                <span>https://okfxktqbbpidnmencbye.supabase.co</span>
              </div>
              <div className="db-info">
                <strong>Realtime Publication:</strong>
                <span>products, product_variants, inventory, sales, payments, notifications</span>
              </div>
              <div className="db-info">
                <strong>Offline-First Resilience:</strong>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>Active & Saving locally</span>
              </div>
            </div>

            {/* Cloud Sync & Action Row */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <strong style={{ fontSize: "12px", color: "#101c35" }}>Sync Catalog & Stock to Supabase:</strong>
                <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#64748b" }}>
                  Uploads all footwear models, sizes, barcoded variants, and inventory levels to your Supabase PostgreSQL tables.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  if (syncCatalogToSupabase) {
                    const res = await syncCatalogToSupabase();
                    alert(res.message);
                  }
                }}
              >
                Sync to Supabase
              </button>
            </div>

            {/* Supabase SQL Instructions */}
            <div style={{ background: "#faf7f0", border: "1px solid #efe2c5", borderRadius: "8px", padding: "14px", marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "12px", color: "#7c632e" }}>
                  Supabase Realtime & DB Tables Setup Script (schema.sql)
                </strong>
                <button
                  type="button"
                  className="btn-chip"
                  onClick={() => {
                    const sql = `-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/okfxktqbbpidnmencbye/sql\n-- File: supabase/schema.sql in this project`;
                    navigator.clipboard?.writeText(sql);
                    alert("SQL schema file is saved at supabase/schema.sql in your project directory!");
                  }}
                >
                  schema.sql saved in repo
                </button>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "#856404", lineHeight: "1.5" }}>
                The complete SQL schema for tables (<code>products</code>, <code>product_variants</code>, <code>inventory</code>, <code>sales</code>, <code>sale_items</code>, <code>payments</code>, <code>notifications</code>, <code>settings</code>), RLS policies, and Realtime publications has been written to <strong>supabase/schema.sql</strong>.
              </p>
            </div>

            <div className="settings-danger-zone">
              <div>
                <strong>Clear Mock Data (Start Fresh Blank Store):</strong>
                <p>
                  Removes all mock footwear models, sample sales, and test notifications so you can begin entering your real inventory and real-time counter sales.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ borderColor: "#ef4444", color: "#b91c1c" }}
                onClick={handleClearMock}
              >
                <RotateCcw size={14} /> Clear Mock Data
              </button>
            </div>

            <div className="settings-danger-zone" style={{ marginTop: "10px" }}>
              <div>
                <strong>Re-seed Starter Footwear Catalog:</strong>
                <p>
                  Reset catalog with starter footwear models (Bata, Woodland,
                  Campus, Metro, Sparx) with sizes 6 to 10 and sample billing
                  history.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
              >
                <RotateCcw size={14} /> Reset Demo Data
              </button>
            </div>
          </div>
        </div>

        <div className="settings-submit-bar">
          <button type="submit" className="btn-primary" style={{ padding: "12px 24px" }}>
            <Save size={16} /> Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
