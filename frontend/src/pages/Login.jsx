import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const existingUsers = JSON.parse(localStorage.getItem("viraly_users") || "[]");
    
    setTimeout(() => {
      setLoading(false);

      if (!isLogin) {
        // --- SIGN UP LOGIC ---
        if (!name.trim() || !email.trim() || !password.trim()) {
          setErrorMessage("Please fill in all fields.");
          return;
        }

        const userExists = existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase().trim());
        if (userExists) {
          setErrorMessage("An account with this email already exists!");
          return;
        }

        const newUser = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password
        };

        existingUsers.push(newUser);
        localStorage.setItem("viraly_users", JSON.stringify(existingUsers));
        localStorage.setItem("userId", newUser.email);
        localStorage.setItem("userEmail", newUser.email);
        localStorage.setItem("userName", newUser.name);

        setShowModal(false);
        navigate("/dashboard", { state: { userName: newUser.name, userId: newUser.email } });

      } else {
        // --- SIGN IN LOGIC ---
        if (!email.trim() || !password.trim()) {
          setErrorMessage("Please enter both email and password.");
          return;
        }

        const foundUser = existingUsers.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

        if (foundUser && foundUser.password === password) {
          localStorage.setItem("userId", foundUser.email);
          localStorage.setItem("userEmail", foundUser.email);
          localStorage.setItem("userName", foundUser.name);

          setShowModal(false);
          navigate("/dashboard", { state: { userName: foundUser.name, userId: foundUser.email } });
        } else {
          setErrorMessage("Invalid email or password!");
        }
      }
    }, 800);
  };

  const openModal = (loginMode) => {
    setIsLogin(loginMode);
    setErrorMessage("");
    setShowModal(true);
  };

  const inputStyle = (field) => ({
    width: "100%",
    padding: "12px 14px",
    background: "#fff",
    border: `1.5px solid ${focusedField === field ? "#111" : "#e5e5e5"}`,
    borderRadius: 10,
    color: "#111",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
  });

  return (
    <div style={s.root}>
      <style>{`
        @keyframes waveMove1 {
          0% { transform: translateX(0px); }
          50% { transform: translateX(-60px) scaleY(1.02); }
          100% { transform: translateX(0px); }
        }
        @keyframes waveMove2 {
          0% { transform: translateX(0px); }
          50% { transform: translateX(40px) scaleY(0.98); }
          100% { transform: translateX(0px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#818cf8" }}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            <path d="M6 12c0-1.657 2.686-3 6-3s6 1.343 6 3-2.686 3-6 3-6-1.343-6-3z" opacity="0.5" />
          </svg>
          <span style={s.navBrand}>Viraly</span>
        </div>
        <div style={s.navActions}>
          <button style={s.navSignIn} onClick={() => openModal(true)}>Sign In</button>
          <button style={s.navGetStarted} onClick={() => openModal(false)}>Launch App</button>
        </div>
      </nav>

      {/* Hero Content */}
      <div style={s.hero}>
        <div style={s.badge}>✦ AI-Powered Content Repurposing</div>
        <h1 style={s.heroTitle}>One upload.<br />Every platform.</h1>
        <p style={s.heroSub}>
          Turn your videos, podcasts & blogs into<br />
          threads, captions, and scripts — instantly.
        </p>

        <button style={s.centerCta} onClick={() => openModal(false)}>
          Launch Viraly Engine →
        </button>

        {/* Waves Background */}
        <div style={s.waveWrap}>
          <svg viewBox="0 0 1400 320" preserveAspectRatio="none" style={s.waveSvg} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#fca5a5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#fbcfe8" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <path d="M0,160 C120,220 280,60 420,140 C560,220 640,80 780,120 C920,160 1020,240 1140,160 C1260,80 1340,200 1400,140 L1400,320 L0,320 Z" fill="url(#wave2)" style={s.wavePath2} />
            <path d="M0,180 C100,100 240,260 400,180 C560,100 660,240 820,160 C980,80 1080,220 1220,160 C1300,130 1360,80 1400,100 L1400,320 L0,320 Z" fill="url(#wave1)" style={s.wavePath1} />
          </svg>
        </div>
      </div>

      {/* MODAL POPUP */}
      {showModal && (
        <div style={s.modalBackdrop} onClick={() => setShowModal(false)}>
          <div style={s.card} onClick={(e) => e.stopPropagation()}>
            <button style={s.closeModalBtn} onClick={() => setShowModal(false)}>✕</button>

            <div style={s.toggleWrap}>
              <button onClick={() => setIsLogin(true)} style={{ ...s.toggleBtn, ...(isLogin ? s.toggleActive : {}) }}>Sign In</button>
              <button onClick={() => setIsLogin(false)} style={{ ...s.toggleBtn, ...(!isLogin ? s.toggleActive : {}) }}>Sign Up</button>
            </div>

            <h2 style={s.cardTitle}>{isLogin ? "Welcome back" : "Create your account"}</h2>

            {errorMessage && (
              <div style={s.errorBox}>{errorMessage}</div>
            )}

            <form onSubmit={handleSubmit} style={s.form}>
              {!isLogin && (
                <div style={s.field}>
                  <label style={s.label}>Full Name</label>
                  <input type="text" placeholder="Yuvraj Sharma" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle("name")} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} required />
                </div>
              )}
              <div style={s.field}>
                <label style={s.label}>Email</label>
                <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle("email")} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} required />
              </div>
              <div style={s.field}>
                <div style={s.labelRow}>
                  <label style={s.label}>Password</label>
                </div>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle("password"), paddingRight: 44 }} onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeBtn}>{showPassword ? "🙈" : "👁️"}</button>
                </div>
              </div>

              <button type="submit" style={s.submitBtn} disabled={loading}>
                {loading ? <span style={s.spinner} /> : isLogin ? "Launch Studio Engine →" : "Create Account & Launch →"}
              </button>
            </form>

            <p style={s.switchText}>
              {isLogin ? "No account? " : "Already have one? "}
              <button onClick={() => setIsLogin(!isLogin)} style={s.switchBtn}>{isLogin ? "Sign up" : "Sign in"}</button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#fff", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", position: "relative" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 64px", background: "#fff" },
  navLogo: { display: "flex", alignItems: "center", gap: 8 },
  navBrand: { fontSize: 18, fontWeight: 700, color: "#111", letterSpacing: "-0.02em" },
  navActions: { display: "flex", alignItems: "center", gap: 16 },
  navSignIn: { background: "none", border: "none", fontSize: 14, color: "#111", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 },
  navGetStarted: { background: "#18181b", border: "1px solid #18181b", borderRadius: 8, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, padding: "8px 16px" },
  hero: { textAlign: "center", paddingTop: "72px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" },
  badge: { display: "inline-block", fontSize: 13, fontWeight: 500, color: "#71717a", background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: 100, padding: "5px 14px", marginBottom: 24 },
  heroTitle: { fontSize: 68, fontWeight: 600, color: "#09090b", lineHeight: 1.15, letterSpacing: "-0.03em", margin: "0 0 24px", fontFamily: "Times New Roman, Georgia, serif" },
  heroSub: { fontSize: 18, color: "#71717a", lineHeight: 1.6, margin: "0 0 32px", fontWeight: 400 },
  centerCta: { background: "#000", color: "#fff", border: "none", borderRadius: "100px", padding: "12px 28px", fontSize: 15, fontWeight: 500, cursor: "pointer", zIndex: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  waveWrap: { width: "100%", height: 240, marginTop: "auto", position: "relative", zIndex: 1 },
  waveSvg: { width: "140%", marginLeft: "-20%", height: "100%", display: "block" },
  wavePath1: { transformOrigin: "center bottom", animation: "waveMove1 6s ease-in-out infinite" },
  wavePath2: { transformOrigin: "center bottom", animation: "waveMove2 4s ease-in-out infinite" },
  modalBackdrop: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  card: { width: "100%", maxWidth: 400, background: "#fff", padding: "40px 32px 32px", borderRadius: 16, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", position: "relative" },
  closeModalBtn: { position: "absolute", top: 16, right: 20, background: "none", border: "none", fontSize: 16, color: "#a1a1aa", cursor: "pointer" },
  toggleWrap: { display: "flex", background: "#f4f4f5", borderRadius: 8, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, padding: "8px 0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500, background: "transparent", color: "#71717a", transition: "all 0.2s ease", fontFamily: "inherit" },
  toggleActive: { background: "#fff", color: "#18181b", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  cardTitle: { fontSize: 22, fontWeight: 600, color: "#18181b", margin: "0 0 20px", letterSpacing: "-0.02em" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 500, color: "#27272a" },
  labelRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  eyeBtn: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 0 },
  submitBtn: { width: "100%", padding: "12px", background: "#18181b", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44 },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  switchText: { textAlign: "center", fontSize: 13, color: "#71717a", marginTop: 18 },
  switchBtn: { background: "none", border: "none", color: "#18181b", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" },
  errorBox: { background: "#fef2f2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16, border: "1px solid #fee2e2" }
};