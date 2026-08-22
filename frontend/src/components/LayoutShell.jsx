import { useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";

const sidebarLinks = [
  { icon: "⊞", label: "Dashboard", id: "dashboard", path: "/dashboard" },
  { icon: "↑", label: "New Upload", id: "upload", path: "/upload" },
  { icon: "📅", label: "Content Calendar", id: "calendar", path: "/calendar" },
  { icon: "◷", label: "History", id: "history", path: "/history" },
  { icon: "⚡", label: "Templates", id: "templates", path: "/templates" },
  { icon: "📊", label: "Analytics", id: "analytics", path: "/analytics" },
];

export default function LayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const [collapsed, setCollapsed] = useState(false);

  const storedName = localStorage.getItem("userName");
  const storedId = localStorage.getItem("userId") || "user_default";
  const rawName = location.state?.userName || storedName || "Creator";
  const dynamicName = rawName.split(" ")[0];
  const avatarInitials = dynamicName.charAt(0).toUpperCase();

  const handleSidebarClick = (targetPath) => {
    if (currentPath === targetPath) return;
    navigate(targetPath, { state: { userName: dynamicName, userId: storedId } });
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    navigate("/", { replace: true });
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .sidebar-item { transition: all 0.2s ease !important; }
        .sidebar-item:hover { background: rgba(107, 33, 168, 0.06) !important; color: #6b21a8 !important; }
        button[title="Log Out"]:hover { background: rgba(220, 38, 38, 0.08) !important; color: #dc2626 !important; }
      `}</style>

      {/* Sidebar Frame */}
      <aside style={{ ...s.sidebar, width: collapsed ? 74 : 240 }}>
        <div style={s.sidebarTop}>
          <div style={s.logoWrap}>
            {!collapsed && (
              <>
                <div style={s.logoIcon}>
                  <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                    <path d="M4 14 L14 4 L24 14 L14 24 Z" stroke="#6b21a8" strokeWidth="2.5" fill="none" />
                    <path d="M9 14 L14 9 L19 14 L14 19 Z" fill="#ffedd5" />
                  </svg>
                </div>
                <span style={s.logoText}>Viraly</span>
              </>
            )}
            <button onClick={() => setCollapsed(!collapsed)} style={s.collapseBtn}>{collapsed ? "→" : "←"}</button>
          </div>
          <nav style={s.nav}>
            {sidebarLinks.map((link) => (
              <button key={link.id}
                onClick={() => handleSidebarClick(link.path)}
                className="sidebar-item"
                style={{ ...s.navLink, ...(currentPath === link.path ? s.navLinkActive : {}), justifyContent: collapsed ? "center" : "flex-start" }}
                title={collapsed ? link.label : ""}
              >
                <span style={{ ...s.navIcon, color: currentPath === link.path ? "#6b21a8" : "inherit" }}>{link.icon}</span>
                {!collapsed && <span style={s.navLabel}>{link.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div style={{ ...s.userWrap, justifyContent: collapsed ? "center" : "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
            <div style={s.avatar}>{avatarInitials}</div>
            {!collapsed && (
              <div style={s.userInfo}>
                <span style={s.userName}>{dynamicName}</span>
              </div>
            )}
          </div>
          
          {!collapsed && (
            <button 
              onClick={handleLogout} 
              style={s.logoutBtn}
              title="Log Out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <main style={s.main}>
        <header style={s.topbar}>
          <div>
            <h1 style={s.pageTitle}>
              {sidebarLinks.find(l => l.path === currentPath)?.label || "Dashboard"}
            </h1>
            <p style={s.pageSubtitle}>
              {currentPath === "/dashboard" ? `Welcome back, ${dynamicName} 👋` : `Manage your ${sidebarLinks.find(l => l.path === currentPath)?.label?.toLowerCase()}`}
            </p>
          </div>
          {currentPath !== "/upload" && (
            <button style={s.newUploadBtn} onClick={() => handleSidebarClick("/upload")}>+ New Upload</button>
          )}
        </header>
        
        <div>
          <Outlet context={{ dynamicName, userId: storedId, navigateTo: handleSidebarClick }} />
        </div>
      </main>
    </div>
  );
}

const s = {
  root: { display: "flex", minHeight: "100vh", backgroundColor: "#fff", backgroundImage: "url('https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=2074&auto=format&fit=crop')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#111" },
  sidebar: { background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRight: "1px solid #e4e4e7", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "24px 0", transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)", flexShrink: 0, position: "sticky", top: 0, height: "100vh", zIndex: 10 },
  sidebarTop: { display: "flex", flexDirection: "column", gap: 12 },
  logoWrap: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 20px", borderBottom: "1px solid #e4e4e7" },
  logoIcon: { display: "flex", alignItems: "center" },
  logoText: { fontSize: 16, fontWeight: 700, color: "#111", letterSpacing: "-0.02em", marginLeft: 8, flex: 1 },
  collapseBtn: { background: "none", border: "1px solid #e4e4e7", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#71717a", padding: "4px 8px" },
  nav: { display: "flex", flexDirection: "column", gap: 4, padding: "8px 12px 0" },
  navLink: { display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 14, color: "#71717a", fontFamily: "inherit", fontWeight: 500, width: "100%", textAlign: "left" },
  navLinkActive: { background: "rgba(107, 33, 168, 0.08)", color: "#6b21a8", fontWeight: 700 },
  navIcon: { fontSize: 16, width: 20, textAlign: "center" },
  navLabel: { whiteSpace: "nowrap", letterSpacing: "-0.01em" },
  userWrap: { display: "flex", alignItems: "center", padding: "16px 20px", borderTop: "1px solid #e4e4e7" },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "#71717a",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    marginLeft: "auto"
  },
  avatar: { width: 32, height: 32, borderRadius: "50%", background: "#6b21a8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 },
  userInfo: { display: "flex", flexDirection: "column", gap: 1, overflow: "hidden" },
  userName: { fontSize: 14, fontWeight: 700, color: "#111", whiteSpace: "nowrap" },
  main: { flex: 1, padding: "48px 64px", overflowY: "auto", position: "relative", zIndex: 1 },
  topbar: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 },
  pageTitle: { fontSize: 36, fontWeight: 700, color: "#111", margin: "0 0 6px", letterSpacing: "-0.04em", fontFamily: "Times New Roman, Georgia, serif" },
  pageSubtitle: { fontSize: 15, color: "#6b21a8", margin: 0, fontWeight: 700, letterSpacing: "0.02em" },
  newUploadBtn: { background: "#6b21a8", color: "#fff", border: "none", borderRadius: "100px", padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(107, 33, 168, 0.3)" },
};