import { useState } from "react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");

  // --- Profile State Management ---
  const [fullName, setFullName] = useState("Yuvraj");
  const [email, setEmail] = useState("yuvraj@example.com");

  // --- Dynamic Notification Toggles ---
  const [notifications, setNotifications] = useState({
    marketing: true,
    contentAlerts: true,
    weeklyReports: false,
    security: true,
  });

  const handleToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    // Connects hooks directly to updates or your backend log persistence layer
    alert(`Success! Profile updated. Emails will now route to: ${email}`);
  };

  const handleSaveNotifications = () => {
    alert("Notification preferences synchronized successfully!");
  };

  return (
    <div style={s.pageLayout}>
      {/* SIDEBAR: Billing option completely excised */}
      <div style={s.sidebar}>
        <button 
          onClick={() => setActiveTab("profile")} 
          style={{ ...s.sideBtn, ...(activeTab === "profile" ? s.sideBtnActive : {}) }}
        >
          👤 Profile
        </button>
        <button 
          onClick={() => setActiveTab("notifications")} 
          style={{ ...s.sideBtn, ...(activeTab === "notifications" ? s.sideBtnActive : {}) }}
        >
          🔔 Notifications
        </button>
      </div>

      {/* CENTER CONFIGURATION PANELS */}
      <div className="premium-showcase-box" style={s.contentCard}>
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} style={s.panelSection}>
            <h3 style={s.panelTitle}>Profile Settings</h3>
            
            <div style={s.avatarRow}>
              <div style={s.avatarCircle}>
                {fullName ? fullName.substring(0, 2).toUpperCase() : "YU"}
              </div>
              <button type="button" style={s.photoBtn} onClick={() => alert("Avatar upload service coming soon!")}>
                Change Photo
              </button>
            </div>

            <div style={s.inputGrid}>
              <div style={s.inputGroup}>
                <label style={s.fieldLabel}>Full Name</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  style={s.inputField} 
                  required
                />
              </div>

              <div style={s.inputGroup}>
                <label style={s.fieldLabel}>Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  style={s.inputField} 
                  required
                />
              </div>
            </div>

            <button type="submit" style={s.saveBtn}>Save Changes</button>
          </form>
        )}

        {activeTab === "notifications" && (
          <div style={s.panelSection}>
            <h3 style={s.panelTitle}>Notification Preferences</h3>
            <p style={s.panelSubtitle}>Configure how you receive automated delivery routing updates and copy dispatches</p>

            <div style={s.toggleList}>
              <div style={s.toggleRow}>
                <div>
                  <div style={s.toggleLabel}>Content Alerts & Recaps</div>
                  <div style={s.toggleDesc}>Receive direct email notifications every time a new asset generation task finishes processing</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifications.contentAlerts} 
                  onChange={() => handleToggle("contentAlerts")} 
                  style={s.switchInput}
                />
              </div>

              <div style={s.toggleRow}>
                <div>
                  <div style={s.toggleLabel}>Weekly Performance Insights</div>
                  <div style={s.toggleDesc}>Receive analytical summary reports detailing total outputs made and estimated time saved summaries</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifications.weeklyReports} 
                  onChange={() => handleToggle("weeklyReports")} 
                  style={s.switchInput}
                />
              </div>

              <div style={s.toggleRow}>
                <div>
                  <div style={s.toggleLabel}>Product Updates & Marketing</div>
                  <div style={s.toggleDesc}>Get notified about new template additions, tone engine modifications, and upcoming features</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifications.marketing} 
                  onChange={() => handleToggle("marketing")} 
                  style={s.switchInput}
                />
              </div>

              <div style={s.toggleRow}>
                <div>
                  <div style={s.toggleLabel}>Security Logs & System Account Notices</div>
                  <div style={s.toggleDesc}>Mandatory alert routing for database synchronization states and login adjustments</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifications.security} 
                  onChange={() => handleToggle("security")} 
                  style={s.switchInput}
                />
              </div>
            </div>

            <button onClick={handleSaveNotifications} style={s.saveBtn}>Apply Preferences</button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  pageLayout: { display: "flex", gap: 32, alignItems: "flex-start" },
  sidebar: { width: 200, display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 },
  sideBtn: { width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: "transparent", color: "#4b5563", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", transition: "all 0.2s" },
  sideBtnActive: { background: "#e9d5ff", color: "#6b21a8" },
  contentCard: { flex: 1, background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(20px)", borderRadius: 16, border: "1px solid #e4e4e7", padding: "40px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.02)" },
  panelSection: { display: "flex", flexDirection: "column" },
  panelTitle: { fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 4px", fontFamily: "inherit" },
  panelSubtitle: { fontSize: 13.5, color: "#71717a", margin: "0 0 24px", fontWeight: 500 },
  avatarRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 28 },
  avatarCircle: { width: 64, height: 64, borderRadius: "50%", background: "#6b21a8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" },
  photoBtn: { background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#3f3f46", cursor: "pointer" },
  inputGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 28 },
  inputGroup: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" },
  inputField: { padding: "12px 14px", border: "1px solid #e4e4e7", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", color: "#111", background: "#fff", fontWeight: 500 },
  saveBtn: { width: "fit-content", padding: "12px 24px", background: "#6b21a8", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(107,33,168,0.15)" },
  toggleList: { display: "flex", flexDirection: "column", gap: 20, marginBottom: 28, borderTop: "1px solid #f1f1f3", paddingTop: 20 },
  toggleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, paddingBottom: 20, borderBottom: "1px solid #f1f1f3" },
  toggleLabel: { fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 2 },
  toggleDesc: { fontSize: 12.5, color: "#71717a", lineHeight: 1.5, fontWeight: 500 },
  switchInput: { width: 40, height: 20, cursor: "pointer", accentColor: "#6b21a8" }
};