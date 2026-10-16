import React, { useState } from "react";
import { Lock, Shield, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, User } from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";

export default function LoginView() {
  const { users, login } = useStore();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || "");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  const handleKeyClick = (val) => {
    if (val === "clear") {
      setPin("");
      setErrorMsg("");
    } else if (val === "backspace") {
      setPin((prev) => prev.slice(0, -1));
      setErrorMsg("");
    } else {
      if (pin.length < 6) {
        setPin((prev) => prev + val);
        setErrorMsg("");
      }
    }
  };

  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault();
    if (!selectedUser) return;
    if (!pin.trim()) {
      setErrorMsg("Please enter security PIN.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    setTimeout(() => {
      const res = login(selectedUser.id, pin);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg(res.message || "Invalid PIN. Please try again.");
      }
    }, 250);
  };

  return (
    <div className="login-screen-wrapper">
      {/* Background Ambience */}
      <div className="login-bg-glow" />

      <div className="login-card-container">
        {/* Brand Header with Circular Transparent Logo */}
        <div className="login-brand-header">
          <div className="login-logo-seal">
            <img src="/logo.png" alt="JDS Traders Logo" className="login-logo-img" />
          </div>
          <h1>JDS TRADERS</h1>
          <div className="login-tagline">FOOTWEAR • RETAIL POS & INVENTORY SYSTEM</div>
        </div>

        {/* User Selection Grid */}
        <div className="login-user-select-section">
          <label className="login-section-label">SELECT COUNTER OPERATOR / USER</label>
          <div className="login-users-grid">
            {users.map((u) => {
              const isSelected = u.id === selectedUser?.id;
              const initials = u.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const isAdminUser = u.role === "Admin";

              return (
                <button
                  key={u.id}
                  type="button"
                  className={`login-user-card ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setPin("");
                    setErrorMsg("");
                  }}
                >
                  <div className={`login-user-avatar ${isAdminUser ? "admin" : ""}`}>
                    {initials}
                  </div>
                  <div className="login-user-details">
                    <span className="login-user-name">{u.name}</span>
                    <span className={`login-user-role ${u.role?.toLowerCase()}`}>
                      {isAdminUser ? "★ Admin" : u.role || "Staff"}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="login-check-indicator">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN Entry Form */}
        <form onSubmit={handleLoginSubmit} className="login-pin-form">
          <div className="login-pin-input-group">
            <div className="pin-label-row">
              <label>
                <KeyRound size={14} style={{ color: "var(--gold)" }} />
                <span>Security PIN for <strong>{selectedUser?.name}</strong></span>
              </label>
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPin(!showPin)}
                tabIndex={-1}
              >
                {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>{showPin ? "Hide" : "Show"}</span>
              </button>
            </div>

            <div className="pin-display-wrapper">
              <input
                type={showPin ? "text" : "password"}
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/[^0-9]/g, ""));
                  setErrorMsg("");
                }}
                placeholder="Enter 4-digit PIN"
                className="pin-display-input"
                autoFocus
              />
            </div>
          </div>

          {errorMsg && (
            <div className="login-error-alert">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick On-Screen Touchpad for POS Terminals */}
          <div className="login-keypad-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                className="btn-keypad"
                onClick={() => handleKeyClick(String(num))}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="btn-keypad action-clear"
              onClick={() => handleKeyClick("clear")}
            >
              C
            </button>
            <button
              type="button"
              className="btn-keypad"
              onClick={() => handleKeyClick("0")}
            >
              0
            </button>
            <button
              type="button"
              className="btn-keypad action-back"
              onClick={() => handleKeyClick("backspace")}
            >
              ⌫
            </button>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="btn-login-submit"
            disabled={isLoading || pin.length < 3}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <span>
                <Lock size={16} /> Unlock Counter as {selectedUser?.name}
              </span>
            )}
          </button>

          {/* PIN Helper for quick demo */}
          <div className="login-demo-hint">
            <span>
              Default PINs: <strong>Moni (Admin): 1234</strong> • Raj (Staff): 2345 • Aakif: 1111 • Nishok: 2222
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
