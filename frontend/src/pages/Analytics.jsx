import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Analytics() {
  const context = useOutletContext() || {};
  const { user, currentUser, userId: contextUserId } = context;

  // Resolve active userId from context or localStorage fallback
  const activeUserId = contextUserId || user?.uid || user?.email || currentUser?.uid || currentUser?.email || localStorage.getItem("userId") || localStorage.getItem("userEmail") || "user_default";

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/analytics?userId=${encodeURIComponent(activeUserId)}`);
      const result = await response.json();
      if (result.success) {
        setMetrics(result.analytics);
      }
    } catch (error) {
      console.error("Frontend client analytics pipeline failed fetch operation:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, [activeUserId]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#aaa", fontSize: 14, fontWeight: 500 }}>
        Mapping live database transaction log metrics...
      </div>
    );
  }

  if (!metrics || metrics.totalGenerated === 0) {
    return (
      <div style={{ padding: "60px 40px", textAlign: "center", color: "#71717a", background: "rgba(255,255,255,0.8)", borderRadius: 16, border: "1px solid #e4e4e7" }}>
        <div style={{ fontSize: 42, marginBottom: 16 }}>📊</div>
        <h3 style={{ margin: "0 0 6px", color: "#111", fontFamily: "Times New Roman, Georgia, serif", fontSize: 20 }}>No Data Volumes Compiled</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: "#a1a1aa" }}>Run some multi-platform conversions on the Upload workspace to seed analytics metrics blocks.</p>
      </div>
    );
  }

  // Helper macro to clean raw platform property keys into polished titles
  const formatKeyName = (key) => key.charAt(0).toUpperCase() + key.slice(1);

  return (
    <div style={s.container}>
      <h2 style={s.pageTitle}>Viraly Engine System Metrics</h2>
      <p style={s.pageSubtitle}>Real-time analysis of cross-platform distribution pipelines and content allocation metrics</p>

      {/* --- TOP ROW: HIGHLIGHT PERFORMANCE CARDS --- */}
      <div style={s.statsGrid}>
        <div style={s.card}>
          <div style={s.cardLabel}>Total Repurposed Cycles</div>
          <div style={s.cardValue}>{metrics.totalGenerated}</div>
          <div style={{ ...s.cardSub, color: "#16a34a" }}>Active Database Records</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Estimated Structural Content Hours Saved</div>
          <div style={s.cardValue}>⏳ {metrics.estimatedHoursSaved}h</div>
          <div style={{ ...s.cardSub, color: "#6b21a8" }}>Calculated Content Lifecycles</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Aggregated Volume Allocation</div>
          <div style={s.cardValue}>{metrics.totalEstimatedTokens}</div>
          <div style={{ ...s.cardSub, color: "#71717a" }}>Estimated System Tokens Used</div>
        </div>
      </div>

      {/* --- BOTTOM ROW: DISTRIBUTION SEGMENT ANALYSIS --- */}
      <div style={s.chartsSplit}>
        {/* PLATFORM PREFERENCE CHART LAYOUT */}
        <div style={s.chartBox}>
          <h4 style={s.chartTitle}>Platform Copy Outputs Generated</h4>
          <div style={s.listWrap}>
            {Object.entries(metrics.platformCounts || {}).map(([platform, count]) => {
              const percentage = metrics.totalGenerated > 0 ? Math.round((count / metrics.totalGenerated) * 100) : 0;
              return (
                <div key={platform} style={s.metricRow}>
                  <div style={s.rowTextWrap}>
                    <span style={s.rowLabel}>{formatKeyName(platform)} Outputs</span>
                    <span style={s.rowValue}>{count} instances</span>
                  </div>
                  <div style={s.barTrack}>
                    <div style={{ ...s.barFill, width: `${Math.max(percentage, 3)}%`, background: "#6b21a8" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TONAL STYLE DISTRIBUTIONS */}
        <div style={s.chartBox}>
          <h4 style={s.chartTitle}>Engine Vocal Tonal Profiling</h4>
          <div style={s.listWrap}>
            {Object.entries(metrics.toneCounts || {}).map(([tone, count]) => {
              const percentage = metrics.totalGenerated > 0 ? Math.round((count / metrics.totalGenerated) * 100) : 0;
              return (
                <div key={tone} style={s.metricRow}>
                  <div style={s.rowTextWrap}>
                    <span style={s.rowLabel}>{tone} Style Engine Mapping</span>
                    <span style={s.rowValue}>{count} times</span>
                  </div>
                  <div style={s.barTrack}>
                    <div style={{ ...s.barFill, width: `${Math.max(percentage, 3)}%`, background: "#ea580c" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", gap: 6, fontFamily: "inherit" },
  pageTitle: { fontSize: 24, fontWeight: 600, color: "#111", margin: "0 0 4px", fontFamily: "Times New Roman, Georgia, serif" },
  pageSubtitle: { fontSize: 14, color: "#4b5563", margin: "0 0 28px", fontWeight: 500 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 28 },
  card: { background: "rgba(255,255,255,0.9)", padding: "24px 28px", borderRadius: 16, border: "1px solid #e4e4e7", backdropFilter: "blur(20px)" },
  cardLabel: { fontSize: 12, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  cardValue: { fontSize: 32, fontWeight: 700, color: "#111", marginBottom: 6, letterSpacing: "-0.02em" },
  cardSub: { fontSize: 12, fontWeight: 600 },
  chartsSplit: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 24 },
  chartBox: { background: "rgba(255,255,255,0.9)", padding: "28px", borderRadius: 16, border: "1px solid #e4e4e7", backdropFilter: "blur(20px)" },
  chartTitle: { fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 20px" },
  listWrap: { display: "flex", flexDirection: "column", gap: 18 },
  metricRow: { display: "flex", flexDirection: "column", gap: 6 },
  rowTextWrap: { display: "flex", justifyContent: "space-between", fontSize: 13 },
  rowLabel: { color: "#3f3f46", fontWeight: 600 },
  rowValue: { color: "#71717a", fontWeight: 500 },
  barTrack: { width: "100%", height: 7, background: "#f4f4f5", borderRadius: 100, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 100, transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }
};