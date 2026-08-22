import { useOutletContext } from "react-router-dom";

// Find the templates array at the top of src/pages/Templates.jsx and update item 3:
const templates = [
  { id: 1, name: "Twitter Thread", icon: "𝕏", desc: "Turn long content into engaging threaded tweets", color: "#1d9bf0", bg: "#eff6ff", border: "#bfdbfe", tags: ["Social", "Short-form"] },
  { id: 2, name: "LinkedIn Post", icon: "in", desc: "Professional posts that drive engagement and leads", color: "#0a66c2", bg: "#f0f9ff", border: "#bae6fd", tags: ["Professional", "B2B"] },
  
  // UPDATE THIS ONE: Replaced placeholder icon string with an inline SVG path
  { 
    id: 3, 
    name: "Instagram Caption", 
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ), 
    desc: "Catchy captions with the perfect tone for your audience", 
    color: "#e1306c", 
    bg: "#fdf4ff", 
    border: "#f0abfc", 
    tags: ["Social", "Visual"] 
  },
  
  { id: 4, name: "Reel Hook", icon: "▶", desc: "Grab attention in the first 3 seconds of your reel", color: "#ff6b35", bg: "#fff7ed", border: "#fed7aa", tags: ["Video", "Short-form"] },
];

export default function Templates() {
  const { navigateTo } = useOutletContext();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
      {templates.map(t => (
        <div key={t.id} className="premium-showcase-box" style={{ ...s.templateCard, background: t.bg, borderColor: t.border }}>
          <div style={s.templateTop}>
            <div style={{ ...s.templateIcon, color: t.color }}>{t.icon}</div>
            <div style={s.templateTags}>{t.tags.map(tag => (<span key={tag} style={{ ...s.templateTag, color: t.color, background: "rgba(255,255,255,0.7)" }}>{tag}</span>))}</div>
          </div>
          <h3 style={{ ...s.templateName, color: t.color }}>{t.name}</h3>
          <p style={{ ...s.templateDesc, color: t.color, opacity: 0.75 }}>{t.desc}</p>
          <button style={{ ...s.templateBtn, background: t.color }} onClick={() => navigateTo("/upload")}>Use Template →</button>
        </div>
      ))}
    </div>
  );
}

const s = {
  templateCard: { border: "1px solid", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 10, backdropFilter: "blur(20px)" },
  templateTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  templateIcon: { fontSize: 28, fontWeight: 700 },
  templateTags: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" },
  templateTag: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, letterSpacing: "0.04em" },
  templateName: { fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  templateDesc: { fontSize: 13, lineHeight: 1.5, margin: 0, flex: 1 },
  templateBtn: { color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }
};