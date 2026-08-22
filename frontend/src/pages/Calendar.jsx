import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatColors = {
  twitter: { bg: "#eff6ff", color: "#2563eb" },
  linkedin: { bg: "#f0f9ff", color: "#0284c7" },
  instagram: { bg: "#fdf4ff", color: "#a21caf" },
  reel: { bg: "#fff7ed", color: "#ea580c" },
  hashtags: { bg: "#f0fdf4", color: "#15803d" },
  script: { bg: "#faf5ff", color: "#7c3aed" },
  answer: { bg: "#f3f4f6", color: "#4b5563" }
};

export default function Calendar() {
  const context = useOutletContext() || {};
  const navigate = useNavigate();
  const { user, currentUser, userId: contextUserId } = context;

  // Resolve active userId
  const activeUserId = contextUserId || user?.uid || user?.email || currentUser?.uid || currentUser?.email || localStorage.getItem("userId") || localStorage.getItem("userEmail") || "user_default";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [stats, setStats] = useState({ totalPosts: 0, activeDays: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeModalLog, setActiveModalLog] = useState(null);

  // AI Content Strategist state
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');

  // Fetch Calendar Activity Data
  async function fetchCalendarData() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/calendar?userId=${encodeURIComponent(activeUserId)}`);
      const data = await res.json();
      if (data.success) {
        setCalendarData(data.calendar || {});
        setStats(data.stats || { totalPosts: 0, activeDays: 0 });
      }
    } catch (err) {
      console.error("Calendar fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Generate AI Content Plan
  async function generatePlan() {
    try {
      setLoadingSuggestions(true);
      setSuggestionError('');
      const res = await fetch(`${API_URL}/api/calendar/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        throw new Error(data.error || 'Could not generate recommendations.');
      }
    } catch (err) {
      setSuggestionError(err.message);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  useEffect(() => {
    fetchCalendarData();
  }, [activeUserId]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const selectedPosts = calendarData[selectedDate] || [];

  const handleSendToStudio = (item) => {
    navigate('/upload', {
      state: {
        prefilledPrompt: item.brief || item.title,
        prefilledFormat: item.format || 'linkedin',
        initialTab: 'raw'
      }
    });
  };

  return (
    <div style={s.pageWrap}>
      {/* Header Banner */}
      <div style={s.headerCard}>
        <div>
          <span style={s.eyebrow}>AI CONTENT STRATEGY & SCHEDULE</span>
          <h2 style={s.heroTitle}>Content Calendar & Smart Roadmaps</h2>
          <p style={s.heroSub}>Track your creation history and let AI engineer your upcoming content pipeline based on your proven topics.</p>
        </div>
        <div style={s.headerStatsRow}>
          <div style={s.statBadge}>
            <span style={s.statNum}>{stats.activeDays}</span>
            <span style={s.statLabel}>Active Days</span>
          </div>
          <div style={s.statBadge}>
            <span style={s.statNum}>{stats.totalPosts}</span>
            <span style={s.statLabel}>Repurposed Outputs</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar Grid (Left) + Selected Day Inspector (Right) */}
      <div style={s.mainGrid}>
        {/* CALENDAR VIEW */}
        <div className="premium-showcase-box" style={s.calendarCard}>
          {/* Calendar Header Navigation */}
          <div style={s.calHeader}>
            <div style={s.calTitleWrap}>
              <h3 style={s.calMonthTitle}>{monthNames[month]} {year}</h3>
              <button style={s.todayBtn} onClick={handleToday}>Today</button>
            </div>
            <div style={s.navButtons}>
              <button style={s.navBtn} onClick={handlePrevMonth}>←</button>
              <button style={s.navBtn} onClick={handleNextMonth}>→</button>
            </div>
          </div>

          {/* Weekday headers */}
          <div style={s.weekDaysRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <span key={day} style={s.weekDayLabel}>{day}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div style={s.daysGrid}>
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} style={s.blankDay} />
            ))}

            {/* Month days */}
            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayPosts = calendarData[dateKey] || [];
              const hasActivity = dayPosts.length > 0;
              const isSelected = selectedDate === dateKey;
              const isToday = new Date().toISOString().split('T')[0] === dateKey;

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  style={{
                    ...s.dayCell,
                    ...(isSelected ? s.dayCellSelected : {}),
                    ...(hasActivity ? s.dayCellActive : {})
                  }}
                >
                  <div style={s.dayNumRow}>
                    <span style={{ ...s.dayNum, ...(isToday ? s.todayCircle : {}) }}>{dayNum}</span>
                    {hasActivity && <span style={s.activityCountPill}>{dayPosts.length}</span>}
                  </div>
                  {hasActivity && (
                    <div style={s.dotsRow}>
                      {dayPosts.slice(0, 3).map((p, pIndex) => (
                        <span key={pIndex} style={{ ...s.dot, background: formatColors[p.selectedFormats?.[0]]?.color || "#7c3aed" }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* DAY DETAILS INSPECTOR DRAWER */}
        <div className="premium-showcase-box" style={s.dayInspectorCard}>
          <div style={s.inspectorHeader}>
            <div>
              <span style={s.inspectorBadge}>DAY INSPECTOR</span>
              <h4 style={s.inspectorDate}>{new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</h4>
            </div>
            <span style={s.dayCountBadge}>{selectedPosts.length} {selectedPosts.length === 1 ? 'item' : 'items'}</span>
          </div>

          <div style={s.postsListWrap}>
            {loading ? (
              <p style={s.emptyMsg}>Syncing date activity...</p>
            ) : selectedPosts.length === 0 ? (
              <div style={s.noPostsState}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                <strong style={{ color: "#111", fontSize: 14 }}>No Content Recorded</strong>
                <p style={{ color: "#71717a", fontSize: 12.5, margin: "4px 0 16px" }}>No repurposed generations were committed on this calendar date.</p>
                <button style={s.quickCreateBtn} onClick={() => navigate('/upload')}>+ Create for This Date</button>
              </div>
            ) : (
              selectedPosts.map((post, idx) => (
                <div key={post._id || idx} style={s.postCardItem}>
                  <div style={s.postCardTop}>
                    <span style={s.postTypePill}>{post.sourceType?.toUpperCase()}</span>
                    <span style={s.postTimeText}>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={s.postSnippetText}>
                    {post.customInstructions || post.sourceInput?.substring(0, 80) || "Generated Social Asset"}
                  </div>
                  <div style={s.postCardFooter}>
                    <div style={s.formatTagsRow}>
                      {post.selectedFormats?.slice(0, 2).map(f => (
                        <span key={f} style={{ ...s.formatPill, background: formatColors[f]?.bg, color: formatColors[f]?.color }}>
                          {f}
                        </span>
                      ))}
                    </div>
                    <button style={s.inspectBtn} onClick={() => setActiveModalLog(post)}>Inspect 👁</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- AI CONTENT STRATEGIST SUGGESTIONS SECTION --- */}
      <section className="premium-showcase-box" style={s.suggestionsContainer}>
        <div style={s.suggestHeaderRow}>
          <div>
            <span style={s.aiBadge}>✨ AI ROADMAP ENGINE</span>
            <h3 style={s.suggestSectionTitle}>Smart Upcoming Content Suggestions</h3>
            <p style={s.suggestSectionSub}>AI analyzes your previously generated topics to forecast high-converting angles for the next 7 days.</p>
          </div>
          <button style={s.generatePlanBtn} onClick={generatePlan} disabled={loadingSuggestions}>
            {loadingSuggestions ? 'Engineering 7-Day Plan…' : '✨ Generate AI Content Plan'}
          </button>
        </div>

        {suggestionError && (
          <div style={s.errorBox}>{suggestionError}</div>
        )}

        {suggestions.length > 0 && (
          <div style={s.suggestionsGrid}>
            {suggestions.map((item, index) => (
              <div key={index} style={s.suggestionCard}>
                <div style={s.suggestTopRow}>
                  <span style={s.dayPill}>{item.day}</span>
                  <span style={{ ...s.formatPill, background: formatColors[item.format]?.bg || "#eff6ff", color: formatColors[item.format]?.color || "#2563eb" }}>
                    {item.format?.toUpperCase()}
                  </span>
                </div>
                <div style={s.themeTag}>{item.theme}</div>
                <h5 style={s.suggestTitle}>{item.title}</h5>
                <div style={s.hookBox}>
                  <strong>Hook:</strong> "{item.hook}"
                </div>
                <p style={s.briefText}>{item.brief}</p>
                <button style={s.useInStudioBtn} onClick={() => handleSendToStudio(item)}>
                  Send to Studio →
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* INSPECTION MODAL */}
      {activeModalLog && (
        <div style={s.overlay} onClick={() => setActiveModalLog(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>⚡ Content Repurposing Inspection Log</h3>
                <p style={s.modalMetaText}>{new Date(activeModalLog.createdAt).toLocaleString()} • Tone: {activeModalLog.selectedTone || "Professional"}</p>
              </div>
              <button onClick={() => setActiveModalLog(null)} style={s.closeModalBtn}>✕</button>
            </div>
            <div style={s.modalContentScroll}>
              {activeModalLog.customInstructions && (
                <>
                  <h5 style={s.modalSectionLabel}>🎯 Context / Prompt</h5>
                  <div style={s.modalInstructionsBox}>{activeModalLog.customInstructions}</div>
                </>
              )}
              <h5 style={s.modalSectionLabel}>✨ Generated Copy Output</h5>
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
  pageWrap: { display: "flex", flexDirection: "column", gap: 28, fontFamily: "inherit" },
  headerCard: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.9)", padding: "28px 32px", borderRadius: 16, border: "1px solid #e4e4e7", backdropFilter: "blur(20px)" },
  eyebrow: { fontSize: 11, fontWeight: 800, color: "#7c3aed", letterSpacing: "0.1em", textTransform: "uppercase" },
  heroTitle: { fontSize: 26, fontWeight: 700, margin: "6px 0 4px", color: "#111", fontFamily: "Times New Roman, Georgia, serif" },
  heroSub: { fontSize: 14, color: "#6b7280", margin: 0, maxWidth: 620, lineHeight: 1.5 },
  headerStatsRow: { display: "flex", gap: 14 },
  statBadge: { background: "#faf5ff", border: "1px solid #e9d5ff", padding: "12px 20px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 },
  statNum: { fontSize: 24, fontWeight: 800, color: "#6b21a8" },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#7e22ce", textTransform: "uppercase", marginTop: 2 },

  mainGrid: { display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24, alignItems: "stretch" },
  calendarCard: { background: "rgba(255,255,255,0.92)", borderRadius: 16, border: "1px solid #e4e4e7", padding: "24px 28px", backdropFilter: "blur(20px)" },
  calHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  calTitleWrap: { display: "flex", alignItems: "center", gap: 12 },
  calMonthTitle: { fontSize: 20, fontWeight: 700, color: "#111", margin: 0 },
  todayBtn: { background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#3f3f46" },
  navButtons: { display: "flex", gap: 6 },
  navBtn: { background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#374151" },
  weekDaysRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, textAlign: "center", marginBottom: 8 },
  weekDayLabel: { fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" },
  daysGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 },
  blankDay: { minHeight: 74, background: "transparent" },
  dayCell: { minHeight: 74, padding: "8px 10px", background: "#fff", border: "1px solid #f1f1f3", borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "all 0.15s ease" },
  dayCellActive: { background: "#fbf9ff", borderColor: "#e9d5ff" },
  dayCellSelected: { border: "2px solid #7c3aed", background: "#faf5ff", boxShadow: "0 0 0 3px #ede9fe" },
  dayNumRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  dayNum: { fontSize: 13, fontWeight: 600, color: "#374151" },
  todayCircle: { background: "#7c3aed", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11 },
  activityCountPill: { background: "#6b21a8", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 100 },
  dotsRow: { display: "flex", gap: 4, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: "50%" },

  dayInspectorCard: { background: "rgba(255,255,255,0.92)", borderRadius: 16, border: "1px solid #e4e4e7", padding: "24px", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column" },
  inspectorHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: "1px solid #f1f1f3" },
  inspectorBadge: { fontSize: 10, fontWeight: 800, color: "#7c3aed", letterSpacing: "0.08em" },
  inspectorDate: { fontSize: 17, fontWeight: 700, margin: "2px 0 0", color: "#111" },
  dayCountBadge: { background: "#f4f4f5", color: "#3f3f46", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 100 },
  postsListWrap: { marginTop: 16, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, maxHeight: 380 },
  emptyMsg: { color: "#9ca3af", fontSize: 13, textAlign: "center", margin: "auto 0" },
  noPostsState: { textAlign: "center", padding: "32px 16px", margin: "auto 0" },
  quickCreateBtn: { background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  postCardItem: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 },
  postCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  postTypePill: { fontSize: 10, fontWeight: 800, color: "#6b21a8", background: "#f3e8ff", padding: "2px 6px", borderRadius: 4 },
  postTimeText: { fontSize: 11, color: "#9ca3af" },
  postSnippetText: { fontSize: 13, fontWeight: 600, color: "#1f2937", lineHeight: 1.4 },
  postCardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  formatTagsRow: { display: "flex", gap: 4 },
  formatPill: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100 },
  inspectBtn: { background: "none", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, color: "#4b5563", padding: "3px 8px", cursor: "pointer", fontWeight: 600 },

  suggestionsContainer: { background: "rgba(255,255,255,0.92)", borderRadius: 16, border: "1px solid #e4e4e7", padding: "32px", backdropFilter: "blur(20px)" },
  suggestHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" },
  aiBadge: { fontSize: 11, fontWeight: 800, color: "#9333ea", letterSpacing: "0.08em" },
  suggestSectionTitle: { fontSize: 22, fontWeight: 700, color: "#111", margin: "4px 0 4px", fontFamily: "Times New Roman, Georgia, serif" },
  suggestSectionSub: { fontSize: 13.5, color: "#6b7280", margin: 0 },
  generatePlanBtn: { background: "linear-gradient(135deg,#7c3aed,#9333ea)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.25)" },
  errorBox: { background: "#fef2f2", color: "#991b1b", padding: "12px", borderRadius: 8, fontSize: 13, marginBottom: 16 },
  suggestionsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 },
  suggestionCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" },
  suggestTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  dayPill: { fontSize: 11, fontWeight: 800, color: "#374151" },
  themeTag: { fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" },
  suggestTitle: { fontSize: 15, fontWeight: 700, color: "#111", margin: 0, lineHeight: 1.35 },
  hookBox: { background: "#fbf9ff", border: "1px solid #ede9fe", borderRadius: 8, padding: "10px", fontSize: 12.5, color: "#4c1d95", lineHeight: 1.4 },
  briefText: { fontSize: 12.5, color: "#6b7280", lineHeight: 1.5, margin: 0, flex: 1 },
  useInStudioBtn: { width: "100%", background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginTop: 6 },

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
