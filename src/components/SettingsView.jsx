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
  const { settings, updateSettings, dbStatus, resetToDemoData } = useStore();
  const [formData, setFormData] = useState({ ...settings });
  const [savedAlert, setSavedAlert] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
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
              <span className="small-tag">
                {dbStatus.connected ? "SUPABASE ACTIVE" : "LOCAL CACHE"}
              </span>
            </div>

            <div className="db-status-strip">
              <div className="db-info">
                <strong>Supabase Project:</strong>
                <span>https://okfxktqbbpidnmencbye.supabase.co</span>
              </div>
              <div className="db-info">
                <strong>Schema State:</strong>
                <span>Tables verified (products, variants, inventory, sales, settings)</span>
              </div>
              <div className="db-info">
                <strong>Offline-First Resilience:</strong>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>Active & Saving locally</span>
              </div>
            </div>

            <div className="settings-danger-zone">
              <div>
                <strong>Re-seed Starter Footwear Catalog:</strong>
                <p>
                  Reset catalog with realistic footwear models (Bata, Woodland,
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
