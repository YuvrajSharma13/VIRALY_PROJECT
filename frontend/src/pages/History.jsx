import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const typeColors = { 
  YouTube: { bg: "#fef2f2", color: "#dc2626" }, 
  Blog: { bg: "#f0fdf4", color: "#16a34a" }, 
  Text: { bg: "#faf5ff", color: "#9333ea" } 
};

const outputTagColors = { 
  "twitter": { bg: "#eff6ff", color: "#2563eb" }, 
  "linkedin": { bg: "#f0f9ff", color: "#0284c7" }, 
  "instagram": { bg: "#fdf4ff", color: "#a21caf" }, 
  "reel": { bg: "#fff7ed", color: "#ea580c" }, 
  "hashtags": { bg: "#f0fdf4", color: "#15803d" }, 
  "script": { bg: "#faf5ff", color: "#7c3aed" } 
};

export default function History() {
  const context = useOutletContext() || {};
  const { user, currentUser, userId: contextUserId } = context;

  // Resolve active userId from context or localStorage fallback
  const activeUserId = contextUserId || user?.uid || user?.email || currentUser?.uid || currentUser?.email || localStorage.getItem("userId") || localStorage.getItem("userEmail") || "user_default";

  const [historyLogs, setHistoryLogs] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [filter, setFilter] = useState("All");
  const [activeModalLog, setActiveModalLog] = useState(null);

  async function fetchHistory() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/history?userId=${encodeURIComponent(activeUserId)}`);
      const result = await response.json();
      if (result.success) {
        setHistoryLogs(result.data || []);
      }
    } catch (error) {
      console.error("Failed fetching database history:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, [activeUserId]);

  const determineType = (input) => {
    if (!input) return "Text";
    if (input.includes("youtube.com") || input.includes("youtu.be")) return "YouTube";
    if (input.length > 200) return "Blog";
    return "Text";
  };

  const cleanTitleSnippet = (text) => {
    if (!text) return "Empty Content Log";
    if (text.startsWith("data:application/pdf") || text.includes("base64")) return "📄 Processed Document Layout Binary Stream Data";
    return text.length > 60 ? text.substring(0, 60) + "..." : text;
  };

  const filtered = filter === "All" 
    ? historyLogs 
    : historyLogs.filter(h => determineType(h.sourceInput) === filter);

  return (
    <div style={s.pageWrap}>
      <div style={s.filterRow}>
        {["All", "YouTube", "Blog", "Text"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...s.filterBtn, ...(filter === f ? s.filterBtnActive : {}) }}>{f}</button>
        ))}
        <span style={s.filterCount}>{filtered.length} results</span>
      </div>
      
      <div style={s.historyCard}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#aaa", fontSize: 14, fontWeight: 500 }}>
            Syncing partitions with storage volumes...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#aaa", fontSize: 14, fontWeight: 500 }}>
            No transaction records found matching this partition scope.
          </div>
        ) : (
          filtered.map((item, i) => {
            const calculatedType = determineType(item.sourceInput);
            return (
              <div key={item._id || item.id} style={{ ...s.historyRow, borderBottom: i < filtered.length - 1 ? "1px solid #f0f0ee" : "none" }}>
                <div style={s.historyLeft}>
                  <span style={{ ...s.typePill, background: typeColors[calculatedType]?.bg, color: typeColors[calculatedType]?.color }}>{calculatedType}</span>
                  <div>
                    <div style={s.historyTitle}>{cleanTitleSnippet(item.sourceInput)}</div>
                    <div style={s.historyDate}>{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div style={s.historyRight}>
                  <div style={s.tagRow}>
                    {item.selectedFormats?.map(o => (
                      <span key={o} style={{ ...s.outputTag, background: outputTagColors[o]?.bg || "#f4f4f5", color: outputTagColors[o]?.color || "#555" }}>
                        {o.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => setActiveModalLog(item)} style={s.regenBtn}>👁 Inspect</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {activeModalLog && (
        <div style={s.overlay} onClick={() => setActiveModalLog(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>⚡ Content Repurposing Asset Inspection Log</h3>
                <p style={s.modalMetaText}>{new Date(activeModalLog.createdAt).toLocaleString()} • Tone: {activeModalLog.selectedTone || "Professional"}</p>
              </div>
              <button onClick={() => setActiveModalLog(null)} style={s.closeModalBtn}>✕</button>
            </div>
            
            <div style={s.modalContentScroll}>
              {activeModalLog.customInstructions && (
                <>
                  <h5 style={s.modalSectionLabel}>🎯 User Context / Custom Guidelines</h5>
                  <div style={s.modalInstructionsBox}>{activeModalLog.customInstructions}</div>
                </>
              )}

              <h5 style={s.modalSectionLabel}>✨ Generated Copy Output Assets</h5>
              <div style={s.modalOutputBox}>
                <pre style={s.preText}>{activeModalLog.generatedContent}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  pageWrap: { display: "flex", flexDirection: "column", gap: 24 },
  filterRow: { display: "flex", alignItems: "center", gap: 8 },
  filterBtn: { padding: "7px 18px", border: "1.5px solid #e4e4e7", borderRadius: 100, background: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#555", fontFamily: "inherit" },
  filterBtnActive: { background: "#6b21a8", color: "#fff", borderColor: "#6b21a8" },
  filterCount: { fontSize: 12, color: "#aaa", marginLeft: "auto" },
  historyCard: { background: "rgba(255,255,255,0.9)", borderRadius: 16, border: "1px solid #e4e4e7", backdropFilter: "blur(20px)", overflow: "hidden" },
  historyRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", gap: 12 },
  historyLeft: { display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 },
  typePill: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, flexShrink: 0 },
  historyTitle: { fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 2 },
  historyDate: { fontSize: 12, color: "#aaa" },
  historyRight: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  tagRow: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  outputTag: { fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 100 },
  regenBtn: { background: "none", border: "1px solid #e4e4e7", borderRadius: 7, fontSize: 12, color: "#555", cursor: "pointer", fontFamily: "inherit", padding: "5px 12px", whiteSpace: "nowrap", fontWeight: 500 },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 24 },
  modal: { background: "#fff", width: "100%", maxWidth: "800px", borderRadius: 16, border: "1px solid #e4e4e7", display: "flex", flexDirection: "column", maxHeight: "85vh", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f1f3", background: "#fafafa", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 2px", color: "#111" },
  modalMetaText: { fontSize: 12, color: "#71717a", margin: 0, fontWeight: 500 },
  closeModalBtn: { background: "transparent", border: "none", color: "#a1a1aa", fontSize: 20, cursor: "pointer", padding: "4px 8px", lineHeight: 1 },
  modalContentScroll: { padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 },
  modalSectionLabel: { fontSize: 11, fontWeight: 700, color: "#71717a", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" },
  modalInstructionsBox: { background: "#f4f4f5", padding: 14, borderRadius: 10, fontSize: 13.5, color: "#3f3f46", border: "1px solid #e4e4e7", lineHeight: 1.5, fontWeight: 500 },
  modalOutputBox: { background: "#0f172a", padding: "24px", borderRadius: 12, border: "1px solid #1e293b" },
  preText: { margin: 0, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, color: "#cbd5e1", fontFamily: "inherit" }
};