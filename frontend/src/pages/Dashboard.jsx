import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const mainHubTools = [
  { id: "/upload", badge: "✦ START HERE", title: "Upload New Content", desc: "Drop your videos, audio links, or text articles here. Our AI will instantly break them down and get them ready for your social media platforms.", actionText: "Open Studio →", color: "#5b21b6", bg: "#e9d5ff", btnBg: "#5b21b6", btnColor: "#fff", border: "#d8b4fe" },
  { id: "/templates", badge: "⚡ PLATFORMS", title: "Choose Your Templates", desc: "Pick how you want your content to look. Easily turn one single video into perfect Twitter threads, LinkedIn posts, or Instagram captions.", actionText: "View Templates →", color: "#c2410c", bg: "#ffedd5", btnBg: "#c2410c", btnColor: "#fff", border: "#fed7aa" },
];

export default function Dashboard() {
  const context = useOutletContext() || {};
  const { navigateTo, user, currentUser, userId: contextUserId } = context;
  
  // Resolve active userId from context or localStorage fallback
  const activeUserId = contextUserId || user?.uid || user?.email || currentUser?.uid || currentUser?.email || localStorage.getItem("userId") || localStorage.getItem("userEmail") || "user_default";

  // State container to manage live metrics dynamically from your backend volume
  const [liveMetrics, setLiveMetrics] = useState({
    totalPosts: "0 Posts",
    latencyRate: "0.00s",
    loading: true
  });

  // Fetch operation scoped to activeUserId
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/analytics?userId=${encodeURIComponent(activeUserId)}`);
        const result = await response.json();
        if (result.success) {
          setLiveMetrics({
            totalPosts: `${result.analytics.totalGenerated} Posts`,
            latencyRate: `${result.analytics.averageLatency}s`,
            loading: false
          });
        } else {
          setLiveMetrics(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Dashboard metric data sync failed:", error);
        setLiveMetrics(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardStats();
  }, [activeUserId]);

  // Dynamic metric mapping grid layout template 
  const dynamicShowcaseData = [
    { 
      metric: "Total Posts Made", 
      value: liveMetrics.loading ? "..." : liveMetrics.totalPosts, 
      details: "Real-time records committed to database instance", 
      changeColor: "#6b21a8",
      badgeText: "✦ Performance Tracker",
      icon: null
    },
    { 
      metric: "AI Engine Latency", 
      value: liveMetrics.loading ? "..." : liveMetrics.latencyRate, 
      details: "Avg response speed for context synthesis tasks", 
      changeColor: "#71717a",
      badgeText: "⏱️ System Diagnostics",
      icon: null
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* TOOLS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {mainHubTools.map((tool) => (
          <div key={tool.id} className="premium-showcase-box" style={{ ...s.showcaseBox, background: tool.bg, color: tool.color, borderColor: tool.border }} onClick={() => navigateTo(tool.id)}>
            <div style={s.boxHeader}><span style={{ ...s.boxBadge, color: tool.color, opacity: 0.8 }}>{tool.badge}</span><span style={s.arrowIcon}>↗</span></div>
            <div style={s.boxContent}><h2 style={{ ...s.boxTitle, color: tool.color }}>{tool.title}</h2><p style={{ ...s.boxDesc, color: tool.color, opacity: 0.9 }}>{tool.desc}</p></div>
            <button style={{ ...s.boxCta, background: tool.btnBg, color: tool.btnColor, borderColor: "transparent" }}>{tool.actionText}</button>
          </div>
        ))}
      </div>
      
      {/* LIVE ANALYTICS METRIC GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {dynamicShowcaseData.map((data, index) => (
          <div key={index} className="premium-showcase-box" style={{ ...s.showcaseBox, background: "rgba(255, 255, 255, 0.85)", color: "#111", borderColor: "#e4e4e7", cursor: "default" }}>
            <div style={s.boxHeader}>
              <span style={{ ...s.boxBadge, color: index === 0 ? "#6b21a8" : "#71717a" }}>{data.badgeText}</span>
              {data.icon}
            </div>
            <div style={s.boxContent}>
              <span style={{ ...s.cardLabel, color: "#71717a" }}>{data.metric}</span>
              <div style={{ ...s.hugeMetricValue, color: index === 0 ? "#6b21a8" : "#111" }}>{data.value}</div>
              <p style={{ ...s.boxDesc, color: data.changeColor, margin: "8px 0 0", fontWeight: 600 }}>{data.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  showcaseBox: { backdropFilter: "blur(20px)", border: "1px solid", borderRadius: 16, padding: "48px 40px", boxSizing: "border-box", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340, boxShadow: "0 10px 30px rgba(0, 0, 0, 0.02)" },
  boxHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" },
  boxBadge: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" },
  arrowIcon: { fontSize: 20, fontWeight: 300 },
  boxContent: { margin: "auto 0", width: "100%" },
  boxTitle: { fontSize: 32, fontWeight: 600, margin: "0 0 16px", letterSpacing: "-0.03em", fontFamily: "Times New Roman, Georgia, serif" },
  boxDesc: { fontSize: 15, lineHeight: 1.6, margin: 0, fontWeight: 500 },
  boxCta: { width: "fit-content", padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  cardLabel: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block" },
  hugeMetricValue: { fontSize: 56, fontWeight: 700, letterSpacing: "-0.04em", marginTop: 12, fontFamily: "Times New Roman, Georgia, serif" }
};