import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";

/* ── Dark Mode Context ── */
const ThemeContext = createContext({ dark: false, toggle: () => {} });
function useTheme() { return useContext(ThemeContext); }

/* ── Toast Notification System ── */
const ToastContext = createContext({ addToast: () => {} });
function useToast() { return useContext(ToastContext); }

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const colors = {
    success: { bg: "rgba(16,185,129,0.12)", border: "#10B981", color: "#34D399", icon: "✅" },
    error: { bg: "rgba(239,68,68,0.12)", border: "#EF4444", color: "#F87171", icon: "❌" },
    warning: { bg: "rgba(245,158,11,0.12)", border: "#F59E0B", color: "#FBBF24", icon: "⚠️" },
    info: { bg: "rgba(56,189,248,0.12)", border: "#38BDF8", color: "#7DD3FC", icon: "ℹ️" },
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 99999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} style={{ padding: "12px 18px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, color: c.color, fontSize: 14, fontWeight: 500, boxShadow: "0 8px 30px rgba(0,0,0,0.25), 0 0 40px rgba(56,189,248,0.06)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", gap: 10, animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/* ── Dark Mode CSS — Deep Space 2026 ── */
const darkModeCSS = `
  /* ══════════════════════════════════════════════════════
     BLITZ CRM v11.03 — "Aurora" Design System
     Deep dark base · Vivid accent palette · Glass surfaces
  ══════════════════════════════════════════════════════ */

  :root {
    --void:          #05070F;
    --deep:          #090D1A;
    --base:          #0D1220;
    --surface:       #121829;
    --elevated:      #182035;
    --overlay:       #1E2840;
    --rim:           rgba(99,179,237,0.10);
    --rim-bright:    rgba(99,179,237,0.22);
    --rim-glow:      rgba(99,179,237,0.35);
    --cyan:   #38BDF8;
    --blue:   #60A5FA;
    --indigo: #818CF8;
    --violet: #A78BFA;
    --pink:   #F472B6;
    --rose:   #FB7185;
    --amber:  #FBBF24;
    --lime:   #A3E635;
    --teal:   #2DD4BF;
    --green:  #34D399;
    --orange: #FB923C;
    --t1: #F0F6FF;
    --t2: #9BB3CC;
    --t3: #5C7A99;
    --t4: #3A5068;
    --grad-header: linear-gradient(180deg, rgba(9,13,26,0.97) 0%, rgba(9,13,26,0.93) 100%);
    --grad-card:   linear-gradient(135deg, rgba(18,24,41,0.9) 0%, rgba(12,17,32,0.95) 100%);
    --shadow-sm:  0 2px 8px rgba(0,0,0,0.35);
    --shadow-md:  0 4px 24px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3);
    --shadow-lg:  0 8px 48px rgba(0,0,0,0.55), 0 2px 12px rgba(0,0,0,0.4);
    --shadow-xl:  0 20px 80px rgba(0,0,0,0.65), 0 4px 20px rgba(0,0,0,0.5);
    --glow-cyan:  0 0 24px rgba(56,189,248,0.18), 0 0 60px rgba(56,189,248,0.06);
    --r-xs: 6px; --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 20px; --r-2xl: 28px;
    --ease: cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideIn    { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes fadeUp     { from { opacity: 0; transform: translateY(14px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes fadeIn     { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse      { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
  @keyframes shimmer    { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes rowIn      { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes glowPulse  { 0%,100% { box-shadow: var(--glow-cyan); } 50% { box-shadow: 0 0 40px rgba(56,189,248,0.28), 0 0 80px rgba(56,189,248,0.1); } }
  @keyframes float      { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes stagger-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes border-flow { 0%,100% { border-color: var(--rim); } 50% { border-color: var(--rim-bright); } }
  @keyframes pulse-glow  { 0%,100% { box-shadow: var(--glow-cyan); } 50% { box-shadow: 0 0 32px rgba(56,189,248,0.3); } }

  .dark-mode {
    background: var(--void) !important;
    color: var(--t1) !important;
    font-family: 'Inter', 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif !important;
    font-feature-settings: 'cv02','cv03','cv04','cv11','ss01';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .dark-mode * {
    transition: background 0.2s var(--ease), border-color 0.2s var(--ease), color 0.15s var(--ease), box-shadow 0.2s var(--ease);
    box-sizing: border-box;
  }

  .dark-mode ::-webkit-scrollbar { width: 5px; height: 5px; }
  .dark-mode ::-webkit-scrollbar-track { background: var(--void); }
  .dark-mode ::-webkit-scrollbar-thumb { background: rgba(99,179,237,0.18); border-radius: 3px; }
  .dark-mode ::-webkit-scrollbar-thumb:hover { background: rgba(99,179,237,0.35); }
  .dark-mode ::selection { background: rgba(56,189,248,0.28); color: #FFF; }

  .dark-mode .blitz-header {
    background: var(--grad-header) !important;
    backdrop-filter: blur(24px) saturate(200%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(200%) !important;
    border-bottom: 1px solid var(--rim) !important;
    box-shadow: 0 1px 0 rgba(99,179,237,0.06), 0 4px 40px rgba(0,0,0,0.5) !important;
  }

  .dark-mode .blitz-main { animation: fadeUp 0.35s var(--ease); background: var(--void) !important; }

  .dark-mode input, .dark-mode select, .dark-mode textarea {
    background: var(--base) !important;
    color: var(--t1) !important;
    border: 1.5px solid var(--rim) !important;
    border-radius: var(--r-sm) !important;
    caret-color: var(--cyan);
    font-family: 'Inter', sans-serif !important;
    font-size: 13px !important;
  }
  .dark-mode input:focus, .dark-mode select:focus, .dark-mode textarea:focus {
    border-color: var(--cyan) !important;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.12), 0 0 20px rgba(56,189,248,0.06) !important;
    outline: none !important;
    background: var(--deep) !important;
  }
  .dark-mode input::placeholder { color: var(--t4) !important; }
  .dark-mode select option { background: var(--surface) !important; color: var(--t1) !important; }

  /* ══ TABLES ══ */
  .dark-mode table {
    color: var(--t1) !important;
    border-collapse: collapse !important;
    border-spacing: 0 !important;
    width: 100% !important;
    border: 1px solid var(--rim) !important;
  }
  .dark-mode table thead tr {
    background: linear-gradient(90deg, rgba(14,20,40,0.98) 0%, rgba(18,24,41,0.95) 100%) !important;
  }
  .dark-mode table thead th {
    color: var(--t3) !important;
    text-transform: uppercase !important;
    font-size: 10.5px !important;
    font-weight: 700 !important;
    letter-spacing: 1.2px !important;
    border-bottom: 1px solid var(--rim-bright) !important;
    border-right: 1px solid var(--rim) !important;
    border-top: none !important;
    padding: 11px 14px !important;
    white-space: nowrap;
    background: transparent !important;
  }
  .dark-mode table thead th:last-child { border-right: none !important; }
  .dark-mode table tbody tr {
    border-bottom: 1px solid rgba(99,179,237,0.07) !important;
    animation: rowIn 0.25s var(--ease) both;
  }
  .dark-mode table tbody tr:nth-child(even) { background: rgba(255,255,255,0.013) !important; }
  .dark-mode table tbody tr:hover {
    background: rgba(56,189,248,0.055) !important;
    box-shadow: inset 3px 0 0 0 var(--cyan) !important;
  }
  .dark-mode table td {
    color: var(--t2) !important;
    border-bottom: 1px solid rgba(99,179,237,0.07) !important;
    border-right: 1px solid var(--rim) !important;
    padding: 10px 14px !important;
    font-size: 13px !important;
    vertical-align: middle !important;
  }
  .dark-mode table td:last-child { border-right: none !important; }
  .dark-mode table td:first-child { color: var(--t1) !important; font-weight: 500 !important; }
  .dark-mode table tfoot tr {
    background: rgba(56,189,248,0.04) !important;
    border-top: 1px solid var(--rim-bright) !important;
  }
  .dark-mode table tfoot td {
    border-right: 1px solid var(--rim) !important;
  }
  .dark-mode table tfoot td:last-child { border-right: none !important; }

  /* ══ SURFACES ══ */
  .dark-mode [style*="background: #FFFFFF"], .dark-mode [style*="background:#FFFFFF"],
  .dark-mode [style*="background: white"], .dark-mode [style*="background:white"] {
    background: var(--surface) !important;
    border: 1px solid var(--rim) !important;
    box-shadow: var(--shadow-md) !important;
  }
  .dark-mode [style*="background: #F8FAFC"], .dark-mode [style*="background:#F8FAFC"],
  .dark-mode [style*="background: #F9FAFB"], .dark-mode [style*="background:#F9FAFB"] { background: var(--base) !important; }
  .dark-mode [style*="background: #F1F5F9"], .dark-mode [style*="background:#F1F5F9"] { background: var(--void) !important; }
  .dark-mode [style*="background: #E2E8F0"], .dark-mode [style*="background:#E2E8F0"] { background: var(--elevated) !important; color: var(--t2) !important; }

  /* ══ CARDS ══ */
  .dark-mode [style*="borderRadius: 14"], .dark-mode [style*="borderRadius: 16"], .dark-mode [style*="borderRadius: 12"] {
    backdrop-filter: blur(16px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
  }
  .dark-mode [style*="borderRadius: 14"]:hover, .dark-mode [style*="borderRadius: 16"]:hover {
    border-color: var(--rim-bright) !important;
    box-shadow: var(--glow-cyan), var(--shadow-md) !important;
    transform: translateY(-1px);
  }

  /* ══ BORDERS ══ */
  .dark-mode [style*="border: 1px solid #E2E8F0"], .dark-mode [style*="border:1px solid #E2E8F0"],
  .dark-mode [style*="border: 1px solid #CBD5E1"], .dark-mode [style*="borderColor: #E2E8F0"],
  .dark-mode [style*="border-color: #E2E8F0"] { border-color: var(--rim) !important; }
  .dark-mode [style*="border-bottom: 2px solid #E2E8F0"], .dark-mode [style*="borderBottom: 2px solid #E2E8F0"] { border-color: var(--rim-bright) !important; }
  .dark-mode [style*="border-bottom: 1px solid #E2E8F0"], .dark-mode [style*="borderBottom: 1px solid #E2E8F0"] { border-color: var(--rim) !important; }

  /* ══ TEXT ══ */
  .dark-mode [style*="color: #0F172A"], .dark-mode [style*="color:#0F172A"],
  .dark-mode [style*="color: #1E293B"], .dark-mode [style*="color:#1E293B"] { color: var(--t1) !important; }
  .dark-mode [style*="color: #334155"], .dark-mode [style*="color:#334155"],
  .dark-mode [style*="color: #475569"], .dark-mode [style*="color:#475569"] { color: var(--t2) !important; }
  .dark-mode [style*="color: #64748B"], .dark-mode [style*="color:#64748B"],
  .dark-mode [style*="color: #94A3B8"], .dark-mode [style*="color:#94A3B8"] { color: var(--t3) !important; }

  /* ══ STATUS BADGES ══ */
  .dark-mode [style*="background: #ECFDF5"], .dark-mode [style*="background:#ECFDF5"] {
    background: rgba(52,211,153,0.12) !important; color: var(--green) !important; border: 1px solid rgba(52,211,153,0.25) !important;
  }
  .dark-mode [style*="background: #FEF3C7"], .dark-mode [style*="background:#FEF3C7"],
  .dark-mode [style*="background: #FFFBEB"], .dark-mode [style*="background:#FFFBEB"] {
    background: rgba(251,191,36,0.12) !important; color: var(--amber) !important; border: 1px solid rgba(251,191,36,0.25) !important;
  }
  .dark-mode [style*="background: #EFF6FF"], .dark-mode [style*="background:#EFF6FF"],
  .dark-mode [style*="background: #DBEAFE"], .dark-mode [style*="background:#DBEAFE"] {
    background: rgba(96,165,250,0.1) !important; color: var(--blue) !important; border: 1px solid rgba(96,165,250,0.22) !important;
  }
  .dark-mode [style*="background: #FEF2F2"], .dark-mode [style*="background:#FEF2F2"],
  .dark-mode [style*="background: #FFF1F2"], .dark-mode [style*="background:#FFF1F2"] {
    background: rgba(251,113,133,0.1) !important; color: var(--rose) !important; border: 1px solid rgba(251,113,133,0.22) !important;
  }
  .dark-mode [style*="background: #F5F3FF"], .dark-mode [style*="background:#F5F3FF"],
  .dark-mode [style*="background: #EDE9FE"], .dark-mode [style*="background:#EDE9FE"] {
    background: rgba(167,139,250,0.1) !important; color: var(--violet) !important; border: 1px solid rgba(167,139,250,0.22) !important;
  }
  .dark-mode [style*="background: #ECFEFF"], .dark-mode [style*="background:#ECFEFF"] {
    background: rgba(45,212,191,0.1) !important; color: var(--teal) !important; border: 1px solid rgba(45,212,191,0.22) !important;
  }

  /* ══ BUTTONS ══ */
  .dark-mode button { transition: all 0.15s var(--ease) !important; font-family: 'Inter', sans-serif !important; }
  .dark-mode button:active { transform: scale(0.95) !important; }
  .dark-mode button:not([disabled]):hover { box-shadow: 0 0 16px rgba(56,189,248,0.14), 0 2px 8px rgba(0,0,0,0.25) !important; }
  .dark-mode button[style*="background: linear-gradient"]:hover, .dark-mode button[style*="background:linear-gradient"]:hover {
    filter: brightness(1.12) saturate(1.1) !important;
    box-shadow: 0 0 28px rgba(14,165,233,0.4) !important;
  }

  /* ══ MODAL ══ */
  .dark-mode .blitz-modal-content {
    background: rgba(18,24,41,0.97) !important;
    backdrop-filter: blur(28px) saturate(200%) !important;
    -webkit-backdrop-filter: blur(28px) saturate(200%) !important;
    border: 1px solid var(--rim-bright) !important;
    box-shadow: var(--shadow-xl), var(--glow-cyan) !important;
    animation: fadeUp 0.3s var(--ease) !important;
    border-radius: var(--r-xl) !important;
  }

  /* ══ NAV DROPDOWN ══ */
  .dark-mode .nav-dropdown-panel {
    background: rgba(18,24,41,0.98) !important;
    border: 1px solid var(--rim-bright) !important;
    box-shadow: var(--shadow-xl), 0 0 60px rgba(0,0,0,0.6) !important;
    backdrop-filter: blur(24px) !important;
    border-radius: var(--r-md) !important;
  }
  .dark-mode .nav-dropdown-panel button:hover { background: rgba(56,189,248,0.07) !important; color: var(--cyan) !important; }

  /* ══ MOBILE NAV ══ */
  .dark-mode [style*="position: fixed"][style*="background: #FFFFFF"] {
    background: rgba(9,13,26,0.99) !important;
    border-color: var(--rim-bright) !important;
    backdrop-filter: blur(24px) !important;
  }

  /* ══ ACCENT COLOURS ══ */
  .dark-mode [style*="color: #10B981"], .dark-mode [style*="color:#10B981"] { color: var(--green) !important; }
  .dark-mode [style*="color: #059669"], .dark-mode [style*="color:#059669"] { color: var(--teal) !important; }
  .dark-mode [style*="color: #EF4444"], .dark-mode [style*="color:#EF4444"] { color: var(--rose) !important; }
  .dark-mode [style*="color: #F59E0B"], .dark-mode [style*="color:#F59E0B"] { color: var(--amber) !important; }
  .dark-mode [style*="color: #0EA5E9"], .dark-mode [style*="color:#0EA5E9"] { color: var(--cyan) !important; }
  .dark-mode [style*="color: #6366F1"], .dark-mode [style*="color:#6366F1"] { color: var(--indigo) !important; }
  .dark-mode [style*="color: #8B5CF6"], .dark-mode [style*="color:#8B5CF6"] { color: var(--violet) !important; }
  .dark-mode [style*="color: #EC4899"], .dark-mode [style*="color:#EC4899"] { color: var(--pink) !important; }
  .dark-mode [style*="color: #F97316"], .dark-mode [style*="color:#F97316"] { color: var(--orange) !important; }
  .dark-mode [style*="color: #14B8A6"], .dark-mode [style*="color:#14B8A6"] { color: var(--teal) !important; }
  .dark-mode [style*="color: #A3E635"], .dark-mode [style*="color:#A3E635"] { color: var(--lime) !important; }
  .dark-mode [style*="color: #38BDF8"], .dark-mode [style*="color:#38BDF8"] { color: var(--cyan) !important; }

  /* ══ TABLE CONTAINER ══ */
  .dark-mode .blitz-table-responsive {
    border: 1px solid var(--rim) !important;
    border-radius: var(--r-lg) !important;
    overflow: hidden !important;
    box-shadow: var(--shadow-md) !important;
  }

  /* ══ SUMMARY GRID CARDS ══ */
  .dark-mode .blitz-summary > div {
    background: var(--grad-card) !important;
    border: 1px solid var(--rim) !important;
    border-radius: var(--r-lg) !important;
    box-shadow: var(--shadow-md) !important;
    transition: all 0.25s var(--ease) !important;
    position: relative;
    overflow: hidden;
  }
  .dark-mode .blitz-summary > div:hover {
    border-color: var(--rim-bright) !important;
    box-shadow: var(--glow-cyan), var(--shadow-lg) !important;
    transform: translateY(-2px) !important;
  }

  /* ══ RECHARTS ══ */
  .dark-mode [class*="recharts"] text { fill: var(--t3) !important; font-size: 11px !important; }
  .dark-mode [class*="recharts-cartesian-grid"] line { stroke: rgba(99,179,237,0.08) !important; }
  .dark-mode [class*="recharts-tooltip-wrapper"] > div {
    background: var(--elevated) !important;
    border: 1px solid var(--rim-bright) !important;
    border-radius: var(--r-md) !important;
    box-shadow: var(--shadow-lg) !important;
    color: var(--t1) !important;
  }

  /* ══ PROGRESS BARS ══ */
  .dark-mode [style*="background: #E2E8F0"][style*="borderRadius"][style*="height"] { background: var(--elevated) !important; }

  /* ══ GRADIENT CARDS (overview) ══ */
  .dark-mode [style*="background: linear-gradient"][style*="borderRadius"] { border: 1px solid rgba(255,255,255,0.06) !important; }

  /* ══ LOGIN SCREEN ══ */
  .dark-mode [style*="minHeight"][style*="100vh"] {
    background: radial-gradient(ellipse at 20% 50%, rgba(56,189,248,0.06) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(167,139,250,0.05) 0%, transparent 50%),
                radial-gradient(ellipse at 60% 80%, rgba(251,191,36,0.04) 0%, transparent 50%),
                var(--void) !important;
  }

  /* ══ MONOSPACE (wallet addresses etc) ══ */
  .dark-mode code, .dark-mode [style*="JetBrains Mono"] { color: var(--cyan) !important; }

  /* ══ HR ══ */
  .dark-mode hr { border-color: var(--rim) !important; }
`

/* ── Global Table Design — Monday.com style (v11.05) ── */
const globalTableCSS = `
  /* ══ BLITZ TABLE SYSTEM — Monday.com inspired ══
     Clean white bg · Full cell borders · Sharp readable text
  ══════════════════════════════════════════════════════ */

  /* Light mode: all tables get Monday.com treatment */
  :not(.dark-mode) table {
    border-collapse: collapse !important;
    font-family: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif !important;
    -webkit-font-smoothing: antialiased;
    border: 1px solid #E5E7EB !important;
    border-radius: 8px !important;
    overflow: hidden !important;
  }

  /* Header row */
  :not(.dark-mode) table thead th {
    background: #FAFBFC !important;
    color: #6B7280 !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.6px !important;
    padding: 9px 14px !important;
    border-bottom: 1.5px solid #E5E7EB !important;
    border-right: 1px solid #E5E7EB !important;
    white-space: nowrap !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 2 !important;
  }
  :not(.dark-mode) table thead th:last-child { border-right: none !important; }

  /* Body cells */
  :not(.dark-mode) table tbody td {
    padding: 9px 14px !important;
    font-size: 13px !important;
    font-weight: 400 !important;
    color: #111827 !important;
    border-bottom: 1px solid #E5E7EB !important;
    border-right: 1px solid #E5E7EB !important;
    vertical-align: middle !important;
    background: #FFFFFF !important;
    line-height: 1.4 !important;
  }
  :not(.dark-mode) table tbody td:last-child { border-right: none !important; }

  /* Row hover */
  :not(.dark-mode) table tbody tr:hover td {
    background: #F9FAFB !important;
  }

  /* Footer cells */
  :not(.dark-mode) table tfoot td {
    padding: 9px 14px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    color: #374151 !important;
    border-top: 1.5px solid #E5E7EB !important;
    border-right: 1px solid #E5E7EB !important;
    background: #F9FAFB !important;
  }
  :not(.dark-mode) table tfoot td:last-child { border-right: none !important; }

  /* Table container */
  :not(.dark-mode) .blitz-table-wrap {
    border: 1px solid #E5E7EB !important;
    border-radius: 10px !important;
    overflow: hidden !important;
    background: #FFF !important;
  }

  /* Input cells inside tables — keep them clean */
  :not(.dark-mode) table tbody td input {
    border: 1px solid #E5E7EB !important;
    border-radius: 5px !important;
    padding: 4px 8px !important;
    font-size: 12px !important;
    font-family: 'JetBrains Mono', monospace !important;
    background: #FAFBFC !important;
    color: #111827 !important;
    outline: none !important;
    transition: border-color 0.15s !important;
  }
  :not(.dark-mode) table tbody td input:focus {
    border-color: #6366F1 !important;
    background: #FFF !important;
    box-shadow: 0 0 0 2px rgba(99,102,241,0.1) !important;
  }

  /* Number / mono values in cells */
  :not(.dark-mode) table tbody td[style*="JetBrains Mono"],
  :not(.dark-mode) table tbody td[style*="monospace"] {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    letter-spacing: -0.3px !important;
  }

  /* Positive / negative color overrides stay as-is (green/red) */
  /* Zebra stripe — very subtle */
  :not(.dark-mode) table tbody tr:nth-child(even) td {
    background: #FAFBFC !important;
  }
  :not(.dark-mode) table tbody tr:nth-child(even):hover td {
    background: #F3F4F6 !important;
  }
`

/* ── Mobile Responsive CSS ── */
const mobileCSS = `
@media (max-width: 768px) {
  .blitz-header { padding: 10px 12px !important; }
  .blitz-header .nav-links { display: none !important; }
  .blitz-header .desktop-actions { display: none !important; }
  .blitz-header .mobile-menu-btn { display: flex !important; }
  .blitz-main { padding: 16px 12px !important; }
  .blitz-main h1 { font-size: 20px !important; }
  .blitz-toolbar { flex-direction: column !important; align-items: stretch !important; }
  .blitz-toolbar input { width: 100% !important; }
  .blitz-summary { grid-template-columns: 1fr 1fr !important; }
  .blitz-modal-content { width: 95vw !important; max-width: 95vw !important; margin: 10px !important; padding: 20px 16px !important; }
  .blitz-modal-content .grid-2col { grid-template-columns: 1fr !important; }
  .blitz-form-grid { grid-template-columns: 1fr !important; }
  button { min-height: 44px !important; }
  /* FIX 9.20: Enhanced mobile card layout styling */
  .blitz-table-responsive table { display: none !important; }
  .blitz-table-responsive .mobile-cards { display: flex !important; }
}
@media (min-width: 769px) {
  .blitz-table-responsive .mobile-cards { display: none !important; }
}
@media (max-width: 480px) {
  .blitz-summary { grid-template-columns: 1fr !important; }
  .blitz-main > div[style*="display: flex"][style*="gap"] { flex-direction: column !important; }
}
`;

function useMobile() {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

function MobileNav({ pages, current, userAccess, onNav, onClose }) {
  // v9.05: Grouped mobile navigation
  const MOBILE_GROUPS = [
    { title: null, items: [{ key: "overview", label: "📊 Dashboard", color: "#6366F1" }] },
    { title: "Finance", items: [
      { key: "payments", label: "💳 Payments", color: "#0EA5E9" },
      { key: "customers", label: "👥 Customer Payments", color: "#0EA5E9" },
      { key: "dailycalcs", label: "🧮 Daily Calcs", color: "#EF4444" },
    ]},
    { title: "Deals", items: [
      { key: "crg", label: "📋 CRG Deals", color: "#F59E0B" },
      { key: "deals", label: "🏷️ Offers", color: "#10B981" },
      { key: "dailycap", label: "📈 Daily Cap", color: "#8B5CF6" },
    ]},
    { title: "Info", items: [
      { key: "partners", label: "🎯 Partners", color: "#EC4899" },
      { key: "monthlystats", label: "📊 Blitz Report", color: "#6366F1" },
      { key: "ftdsinfo", label: "📈 FTDs Info", color: "#10B981" },
    ]},
    { title: null, items: [
      { key: "settings", label: "⚙️ Settings", color: "#64748B" },
      ...(pages.some(p => p.key === "admin") ? [{ key: "admin", label: "🔒 Admin", color: "#DC2626" }] : []),
    ]},
  ];

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={onClose}>
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 280, background: "#FFFFFF", boxShadow: "-4px 0 30px rgba(0,0,0,0.15)", zIndex: 9999, padding: "20px 0", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "0 20px 16px", borderBottom: "1px solid #E2E8F0", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Menu</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#64748B", padding: 4 }}>✕</button>
        </div>
        {MOBILE_GROUPS.map((group, gi) => {
          const visible = group.items.filter(i => i.key === "admin" ? pages.some(p => p.key === "admin") : (userAccess || []).includes(i.key));
          if (visible.length === 0) return null;
          return (
            <div key={gi}>
              {group.title && (
                <div style={{ padding: "12px 24px 4px", fontSize: 10, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2 }}>
                  {group.title}
                </div>
              )}
              {visible.map(pg => {
                const isActive = current === pg.key;
                return (
                  <button key={pg.key} onClick={() => { onNav(pg.key); onClose(); }}
                    style={{
                      display: "block", width: "100%", padding: "12px 24px", border: "none",
                      background: isActive ? `${pg.color}12` : "transparent",
                      color: isActive ? pg.color : "#334155", fontSize: 14, fontWeight: isActive ? 700 : 500,
                      cursor: "pointer", textAlign: "left",
                      borderLeft: isActive ? `4px solid ${pg.color}` : "4px solid transparent",
                      transition: "all 0.15s",
                    }}>
                    {pg.label}
                  </button>
                );
              })}
              {gi < MOBILE_GROUPS.length - 1 && visible.length > 0 && (
                <div style={{ height: 1, background: "#F1F5F9", margin: "6px 20px" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Password Hashing (SHA-256 pure JS - works on HTTP) ── */
function hashPassword(password) {
  // Pure JS SHA-256 implementation
  function sha256(ascii) {
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = [];
    const k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    ascii += '\x80';
    while ((ascii.length % 64) - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      if (j >> 8) return;
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (let j = 0; j < words.length;) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash.slice(0);
      hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7] +
          (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] = i < 16 ? w[i] : (
            w[i - 16] +
            (((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3)) +
            w[i - 7] +
            (((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10))
          ) | 0);
        const temp2 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }
  return sha256(password);
}

const INITIAL_USERS = [
  { email: "sophia@blitz-affiliates.marketing", passwordHash: "0db6b937e90449977f5daa522c82b1492aae0b1edb11f5d7a9c0fbfc6f71fdd1", name: "Sophia" },
  { email: "office1092021@gmail.com", passwordHash: "0db6b937e90449977f5daa522c82b1492aae0b1edb11f5d7a9c0fbfc6f71fdd1", name: "Office" },
  { email: "y0505300530@gmail.com", passwordHash: "0db6b937e90449977f5daa522c82b1492aae0b1edb11f5d7a9c0fbfc6f71fdd1", name: "Y Admin" },
  { email: "zack@blitz-affiliates.marketing", passwordHash: "3f21a8490cef2bfb60a9702e9d2ddb7a805c9bd1a263557dfd51a7d0e9dfa93e", name: "Zack" },
  { email: "cameron@blitz-affiliates.marketing", passwordHash: "249194fd43bdcfbb0748eebd6f45baa76c383f8579cdb3ddf9d359d44fbdd476", name: "Cameron" },
  { email: "wpnayanray@gmail.com", passwordHash: "d6a72b1098615c3354d725f4b539b7fdf91e8213cd03af08c4ae3c8729526bd0", name: "Nayan" },
  { email: "kazarian.oleksandra.v@gmail.com", passwordHash: "4531edf6d1a36b47db61e9ac2f83af8f03920c48eec79a308e89d45cb751e020", name: "Oleksandra" },
  { email: "kate@blitz-affiliates.marketing", passwordHash: "b7cb217334dc1f94c975370b003efb532b57b1b99ac81b424199f1da854cf6e8", name: "Kate" },
  { email: "alehandro@blitz-affiliates.marketing", passwordHash: "1635c8525afbae58c37bede3c9440844e9143727cc7c160bed665ec378d8a262", name: "Alehandro" },
  { email: "john.leon@blitz-affiliates.marketing", passwordHash: "77dbc78facad3377d2c8dc621e532a70e82b3931a19dfe5bc972d748ff535a90", name: "John Leon" },
];

const ADMIN_EMAILS = ["y0505300530@gmail.com", "wpnayanray@gmail.com", "office1092021@gmail.com"];
const isAdmin = (email) => ADMIN_EMAILS.includes(email);
const VERSION = "12.02";

// ═══════════════════════════════════════════════════════════════
// v10.09: DEFAULT AFFILIATE & BRAND/NETWORK LOOKUP TABLES
// Used for dropdowns, name resolution, and Telegram bot mapping
// ═══════════════════════════════════════════════════════════════
const AFFILIATES = [
  { id: "137", name: "Tokomedia" },
  { id: "225", name: "ExTraffic" },
  { id: "211", name: "ExTraffic" },
  { id: "123", name: "MeeseeksMedia" },
  { id: "165", name: "BUFU" },
  { id: "168", name: "PLASH" },
  { id: "83", name: "Leading Media" },
  { id: "194", name: "Q16" },
  { id: "226", name: "Affilihub" },
  { id: "49", name: "Matar" },
  { id: "60", name: "Traffic Lab" },
  { id: "134", name: "Traffic Lab" },
  { id: "183", name: "PandaAds" },
  { id: "159", name: "Farah" },
  { id: "171", name: "MediaPro" },
  { id: "139", name: "20C" },
  { id: "133", name: "Whitefly" },
  { id: "64", name: "Punch" },
  { id: "12", name: "Punch" },
  { id: "51", name: "Liquid Group" },
  { id: "28", name: "Bugle" },
  { id: "131", name: "Bugle" },
  { id: "33", name: "RVG" },
  { id: "167", name: "RVG" },
  { id: "103", name: "Affiliate 103" },
  { id: "101", name: "Affiliate 101" },
  { id: "202", name: "Affiliate 202" },
  { id: "122", name: "Affiliate 122" },
  { id: "222", name: "Affiliate 222" },
  { id: "245", name: "Affiliate 245" },
  { id: "196", name: "Affiliate 196" },
  { id: "71", name: "Affiliate 71" },
  { id: "117", name: "Affiliate 117" },
  { id: "162", name: "Affiliate 162" },
  { id: "164", name: "Affiliate 164" },
  { id: "30", name: "Affiliate 30" },
  { id: "130", name: "Affiliate 130" },
  { id: "140", name: "Affiliate 140" },
  { id: "191", name: "Affiliate 191" },
  { id: "80", name: "Affiliate 80" },
  { id: "17", name: "Affiliate 17" },
  { id: "37", name: "Affiliate 37" },
  { id: "111", name: "Affiliate 111" },
  { id: "212", name: "Affiliate 212" },
];

const BRANDS_NETWORKS = [
  { id: "152", altId: "162", name: "Helios" },
  { id: "1761", altId: "1941", name: "PRX Ave" },
  { id: "2992", name: "12Mark" },
  { id: "2682", name: "May" },
  { id: "182", name: "Kalipso" },
  { id: "2031", name: "Photonics" },
  { id: "3132", altId: "3122", name: "Fintrix" },
  { id: "582", altId: "592", name: "Avelux / Serenity" },
  { name: "Enthrone" },
  { id: "1071", name: "Evest" },
  { id: "1192", name: "Legion" },
  { id: "2522", name: "UBP" },
  { id: "452", name: "TenX" },
  { name: "Banana" },
  { id: "2642", name: "Crypto Galassia" },
  { id: "1581", name: "DM partners" },
  { name: "Techinvest" },
  { id: "3162", name: "Imperius" },
  { id: "3052", name: "Mi Tang" },
  { name: "TMS" },
  { id: "1971", name: "VenturyFX" },
  { id: "472", name: "Pantheramedia" },
  { id: "3322", name: "MW" },
  { id: "632", name: "StoneWall" },
  { id: "462", name: "GSI markets" },
  { id: "192", name: "Unitraff" },
  { id: "3273", name: "FX-Q" },
  { id: "2722", name: "Theta Holding" },
  { id: "352", altId: "2021", name: "ClickBait" },
  { id: "1871", altId: "302", name: "Capex" },
  { id: "802", name: "UNIT" },
  { id: "642", name: "Miltonia" },
  { id: "2051", name: "No limits" },
  { id: "2171", name: "Michael" },
  { id: "2251", altId: "2261", name: "Fugazi" },
  { id: "1261", name: "Celestia" },
  { id: "282", name: "Level markets" },
  { id: "292", name: "X Brand" },
  { id: "1001", name: "MediaNow" },
  { id: "2952", name: "WhiteRhino" },
  { id: "1601", name: "Fusion" },
  { id: "312", name: "EMP313" },
  { id: "2111", name: "Eurotrade / Z" },
  { id: "252", name: "Monstrack" },
  { id: "3283", name: "BB" },
  { id: "3022", name: "TraderTok" },
  { id: "212", altId: "222", name: "SM / Nexus" },
  { id: "272", altId: "1961", name: "MN" },
  { id: "652", name: "Capitan" },
  { id: "2212", altId: "2232", name: "Swin" },
];

// Helper: resolve affiliate name from ID
function getAffiliateName(id) {
  if (!id) return "";
  const found = AFFILIATES.find(a => a.id === String(id));
  return found ? found.name : "";
}

// Helper: resolve brand/network name from ID
function getBrandName(id) {
  if (!id) return "";
  const idStr = String(id);
  const found = BRANDS_NETWORKS.find(b => b.id === idStr || b.altId === idStr);
  return found ? found.name : "";
}

// ── Storage Layer ──
// Priority: API (shared between all users) > localStorage (offline backup)
const LS_KEYS = { users: 'blitz_users', payments: 'blitz_payments', 'customer-payments': 'blitz_cp', 'crg-deals': 'blitz_crg', 'daily-cap': 'blitz_dc', 'deals': 'blitz_deals', 'wallets': 'blitz_wallets', 'offers': 'blitz_offers', 'partners': 'blitz_partners', 'ftd-entries': 'blitz_ftd', 'daily-calcs-data': 'blitz_dailycalcs' };
const LS_VERSIONS_KEY = 'blitz_data_versions';

// ── Version change detection: clear stale localStorage on upgrade ──
const PREV_VERSION_KEY = 'blitz_app_version';
const prevVersion = localStorage.getItem(PREV_VERSION_KEY);
if (prevVersion !== VERSION) {
  console.log(`🔄 Version upgrade: ${prevVersion || 'unknown'} → ${VERSION}`);
  // v10.25: Only clear version tracking — do NOT purge table data
  // Server is the source of truth. On next fetch, server data will be loaded.
  // Purging localStorage was causing data loss when server fetch failed or raced with autosave.
  try { localStorage.removeItem(LS_VERSIONS_KEY); } catch {}
  localStorage.setItem(PREV_VERSION_KEY, VERSION);
  console.log(`✅ Version updated to ${VERSION} — server data will be fetched on next load`);
}

function lsGet(key, fallback) { try { const r = localStorage.getItem(LS_KEYS[key]); return r ? JSON.parse(r) : fallback; } catch(e) { return fallback; } }
function lsSave(key, data) {
  try {
    localStorage.setItem(LS_KEYS[key], JSON.stringify(data));
  } catch(e) {
    // FIX C8: localStorage full — warn user, don't silently lose data
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.error("❌ localStorage FULL — data NOT cached locally for:", key);
      // Try to free space by removing oldest non-essential cache
      try {
        ['crg-deals', 'daily-cap', 'deals'].forEach(k => { if (k !== key) localStorage.removeItem(LS_KEYS[k]); });
        localStorage.setItem(LS_KEYS[key], JSON.stringify(data)); // retry
      } catch {}
    }
  }
}

// Load persisted data versions from localStorage (survives page refresh)
function loadPersistedVersions() {
  try {
    const stored = localStorage.getItem(LS_VERSIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) { return {}; }
}

// Save data versions to localStorage
function savePersistedVersions(versions) {
  try {
    localStorage.setItem(LS_VERSIONS_KEY, JSON.stringify(versions));
  } catch (e) {}
}

const API_BASE = (() => {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3001/api';
  return '/api';
})();

const WS_URL = (() => {
  const h = window.location.hostname;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (h === 'localhost' || h === '127.0.0.1') return 'ws://localhost:3001/ws';
  // Include port if non-standard (important for direct server access without reverse proxy)
  const port = window.location.port;
  const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : '';
  return `${proto}//${h}${portSuffix}/ws`;
})();

let serverOnline = false;

// ── Session token management (FIX C4: auth on all endpoints) ──
let sessionToken = null;
function setSessionToken(token) { sessionToken = token; if (token) localStorage.setItem('blitz_token', token); else localStorage.removeItem('blitz_token'); }
function getSessionToken() { if (sessionToken) return sessionToken; sessionToken = localStorage.getItem('blitz_token'); return sessionToken; }
function authHeaders() { const t = getSessionToken(); return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }; }

// ── Version tracking per table (for conflict resolution)
// Load persisted versions from localStorage to survive page refreshes
const dataVersions = loadPersistedVersions();

// Flag to force logout on 401 (avoids reload loop)
let sessionExpiredFlag = false;
let justLoggedIn = false; // Grace period — don't expire session right after login

async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, { headers: authHeaders(), signal: AbortSignal.timeout(6000) }); // v9.05: 6s (was 4s)
    if (res.status === 401) {
      // v9.05: Retry twice before expiring session — prevents flicker-based logouts
      if (justLoggedIn) {
        console.log(`⚠️ 401 on ${endpoint} during login grace period — retrying...`);
        await new Promise(r => setTimeout(r, 500));
        const retry = await fetch(`${API_BASE}/${endpoint}`, { headers: authHeaders(), signal: AbortSignal.timeout(6000) });
        if (retry.ok) {
          serverOnline = true;
          const json = await retry.json();
          const data = json.data || json;
          if (json.version && json.version !== dataVersions[endpoint]) { dataVersions[endpoint] = json.version; savePersistedVersions(dataVersions); } // v11.02 L4
          if (Array.isArray(data)) lsSave(endpoint, data);
          return data;
        }
        return null;
      }
      // Not during login — retry once more before killing session (network flicker protection)
      try {
        await new Promise(r => setTimeout(r, 1500));
        const retry2 = await fetch(`${API_BASE}/${endpoint}`, { headers: authHeaders(), signal: AbortSignal.timeout(6000) });
        if (retry2.ok) {
          serverOnline = true;
          const json = await retry2.json();
          const data = json.data || json;
          if (json.version) { dataVersions[endpoint] = json.version; savePersistedVersions(dataVersions); }
          if (Array.isArray(data)) lsSave(endpoint, data);
          return data;
        }
      } catch {}
      // Both retries failed — real session expiry
      setSessionToken(null);
      localStorage.removeItem('blitz_session');
      sessionExpiredFlag = true;
      return null;
    }
    if (!res.ok) throw new Error('not ok');
    serverOnline = true;
    const json = await res.json();
    let data = json.data || json;
    if (json.version && json.version !== dataVersions[endpoint]) { // v11.02 L4: only write when changed
          dataVersions[endpoint] = json.version;
          savePersistedVersions(dataVersions);
        }
    // v10.05: Process tombstoned IDs from server GET response
    if (json.tombstoned) {
      processTombstoned(endpoint, json.tombstoned);
    }
    // v10.05: Filter tombstoned records from response data
    if (Array.isArray(data)) {
      data = filterTombstoned(endpoint, data);
      lsSave(endpoint, data); // Always save, even empty arrays (important after deletes)
    }
    return data;
  } catch (e) {
    // v9.05 FIX: Don't immediately mark offline on a single timeout — could be a flicker
    // Only mark offline if we were already having issues (consecutive failures)
    if (!serverOnline) return null; // Already offline, stay offline
    // First failure — try a quick health check before killing online status
    try {
      const h = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (h.ok) { /* Server is fine, just this request failed */ return null; }
    } catch {}
    serverOnline = false;
    return null;
  }
}

// ── Pending saves queue: retry failed saves when server comes back ──
const pendingSaves = new Map(); // key: endpoint, value: { data, userEmail, retries }
let lastSaveTimestamps = {}; // FIX C1: Track when each table was last saved to prevent echo saves

// ── Conflict resolution: when apiSave gets 409, merge server data into React state ──
const conflictSetters = {}; // Registered by React component: { 'payments': setPayments, ... }
function registerConflictSetter(table, setter) { conflictSetters[table] = setter; }

function handleConflictResolution(endpoint, serverData, serverVersion) {
  // 1. Update version so next save uses correct version
  if (serverVersion) { dataVersions[endpoint] = serverVersion; savePersistedVersions(dataVersions); }
  // 2. Merge with localStorage and compare before touching React state
  const lsData = lsGet(endpoint, null) || [];
  const setter = conflictSetters[endpoint];
  if (setter && typeof mergeByIDGlobal === 'function') {
    const merged = mergeByIDGlobal(lsData, serverData, endpoint, 'sync');
    lsSave(endpoint, merged);
    if (JSON.stringify(merged) !== JSON.stringify(lsData)) {
      setter(merged);
      console.log(`🔄 Conflict on ${endpoint} — merged server v${serverVersion} into state (changed)`);
    } else {
      console.log(`🔄 Conflict on ${endpoint} — server v${serverVersion} same as local, no state update`);
    }
  } else {
    lsSave(endpoint, serverData);
    console.log(`🔄 Conflict on ${endpoint} — saved server v${serverVersion} to localStorage (no setter)`);
  }
}

// Global reference to mergeByID (set by React component after mount)
let mergeByIDGlobal = null;

async function flushPendingSaves() {
  if (pendingSaves.size === 0) return;
  // v11.02 M2: drop saves that have failed too many times
  const token = getSessionToken();
  if (!token) return;
  for (const [endpoint, save] of [...pendingSaves]) {
    // v11.02 M2: drop after 5 retries to prevent infinite hammering
    if ((save.retries || 0) >= 5) { console.warn(`⚠️ Dropping pending save for ${endpoint} after 5 retries`); pendingSaves.delete(endpoint); continue; }
    pendingSaves.set(endpoint, { ...save, retries: (save.retries || 0) + 1 });
    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ data: save.data, version: dataVersions[endpoint] || 0, user: save.userEmail || 'unknown', deleted: save.deleted || [] }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.version) { dataVersions[endpoint] = json.version; savePersistedVersions(dataVersions); }
        pendingSaves.delete(endpoint);
        console.log(`✅ Flushed pending save: ${endpoint}`);
      } else if (res.status === 409) {
        // v9.15: Conflict — our data is stale, discard and re-fetch from server
        pendingSaves.delete(endpoint);
        console.log(`⚠️ Stale data for ${endpoint} — discarding and will re-fetch`);
        try {
          const body = await res.json();
          if (body.error === "stale_data") {
            toast(`⚠️ Refreshing ${endpoint} — server has newer data`);
            // Force page reload to get fresh data
            setTimeout(() => window.location.reload(), 1500);
          }
        } catch {}
      } else if (res.status === 400) {
        pendingSaves.delete(endpoint);
        console.log(`⚠️ Removed blocked pending save for ${endpoint}`);
      }
    } catch {}
  }
}
// Try to flush pending saves every 30 seconds
setInterval(flushPendingSaves, 30000);

// ── Track explicit deletes per table so server-side merge can honor them ──
const deletedIDs = {}; // { 'payments': Set(['id1','id2']), ... }
// v9.15: Persistent deleted IDs — survives merge cycles so Telegram offers don't re-add deleted deals
const persistDeletedIDs = {};
// v10.05: Track tombstoned IDs per table — records the server has permanently deleted
const tombstonedIDs = {}; // { 'payments': Set(['id1','id2']), ... }

function trackDelete(table, id) {
  if (!deletedIDs[table]) deletedIDs[table] = new Set();
  deletedIDs[table].add(id);
  if (!persistDeletedIDs[table]) persistDeletedIDs[table] = new Set();
  persistDeletedIDs[table].add(id);
}
function isDeleted(table, id) {
  return (persistDeletedIDs[table] && persistDeletedIDs[table].has(id)) ||
         (tombstonedIDs[table] && tombstonedIDs[table].has(id));
}

// v10.05: Process tombstoned IDs from server response — purge from local state
function processTombstoned(table, tombstoned) {
  if (!Array.isArray(tombstoned) || tombstoned.length === 0) return;
  if (!tombstonedIDs[table]) tombstonedIDs[table] = new Set();
  tombstoned.forEach(id => tombstonedIDs[table].add(id));
  // Also add to persistDeletedIDs so isDeleted() catches them
  if (!persistDeletedIDs[table]) persistDeletedIDs[table] = new Set();
  tombstoned.forEach(id => persistDeletedIDs[table].add(id));
  // Remove from pending deletes — server already knows about these
  if (deletedIDs[table]) {
    tombstoned.forEach(id => deletedIDs[table].delete(id));
  }
  // Clean localStorage — remove tombstoned records
  const local = lsGet(table, null);
  if (Array.isArray(local)) {
    const filtered = local.filter(r => !tombstonedIDs[table].has(r.id));
    if (filtered.length < local.length) {
      lsSave(table, filtered);
      console.log(`🪦 [${table}]: Purged ${local.length - filtered.length} tombstoned records from localStorage`);
    }
  }
}

// v10.05: Filter tombstoned records from any data array
function filterTombstoned(table, data) {
  if (!Array.isArray(data)) return data;
  if (!tombstonedIDs[table] || tombstonedIDs[table].size === 0) return data;
  return data.filter(r => !tombstonedIDs[table].has(r.id));
}

// v10.05: Stamp updatedAt on records for last-write-wins merge
function stampUpdatedAt(record) {
  if (record && typeof record === 'object') record.updatedAt = Date.now();
  return record;
}

function getAndClearDeletes(table) {
  const ids = deletedIDs[table] ? Array.from(deletedIDs[table]) : [];
  if (deletedIDs[table]) deletedIDs[table].clear();
  return ids;
}

// Track last known record counts per table to detect data loss
const lastKnownCounts = {};

async function apiSave(endpoint, data, userEmail) {
  // SAFETY: Never save empty array to server unless there are explicit deletes
  const hasPendingDeletes = deletedIDs[endpoint] && deletedIDs[endpoint].size > 0;
  const pendingDeleteCount = hasPendingDeletes ? deletedIDs[endpoint].size : 0;
  if (Array.isArray(data) && data.length === 0 && !hasPendingDeletes) {
    console.warn(`⚠️ BLOCKED empty save to ${endpoint} — no pending deletes, likely a bug`);
    return false;
  }

  // SAFETY v2: Block saves that lose too many records at once (crash protection)
  // If we previously had N records and now have much fewer, something went wrong
  if (Array.isArray(data) && lastKnownCounts[endpoint] > 0) {
    const prev = lastKnownCounts[endpoint];
    const curr = data.length;
    const maxAllowedDrop = Math.max(prev * 0.2, pendingDeleteCount + 2); // v9.09: stricter 20% drop (was 30%)
    if (prev - curr > maxAllowedDrop) {
      console.error(`🛑 BLOCKED suspicious save to ${endpoint}: ${prev} → ${curr} records (drop of ${prev - curr}, only ${pendingDeleteCount} explicit deletes). This looks like a crash-induced data loss.`);
      // v9.09: Attempt to recover from server before giving up
      try {
        const serverData = await apiGet(endpoint);
        if (Array.isArray(serverData) && serverData.length > curr) {
          console.log(`🔄 Recovering ${endpoint} from server: ${serverData.length} records`);
          lsSave(endpoint, serverData);
          lastKnownCounts[endpoint] = serverData.length;
        }
      } catch {}
      return false;
    }
  }
  // SAFETY v3: If we have NO baseline yet, check localStorage for a count
  // This catches the case after version upgrade when lastKnownCounts is empty
  if (Array.isArray(data) && !lastKnownCounts[endpoint]) {
    const lsData = lsGet(endpoint, null);
    if (Array.isArray(lsData) && lsData.length > 0) {
      lastKnownCounts[endpoint] = lsData.length;
      // Now apply the same guard
      if (lsData.length > 10 && data.length < lsData.length * 0.3 && pendingDeleteCount === 0) { // v9.05: 30% (was 50%)
        console.error(`🛑 BLOCKED suspicious save to ${endpoint}: localStorage has ${lsData.length} but saving only ${data.length}. Likely stale data after version upgrade.`);
        return false;
      }
    }
  }
  // Update last known count after safety check passes
  if (Array.isArray(data) && data.length > 0) {
    lastKnownCounts[endpoint] = data.length;
  }

  // FIX C1: Debounce — don't save same table within 1 second
  const now = Date.now();
  if (!hasPendingDeletes && lastSaveTimestamps[endpoint] && now - lastSaveTimestamps[endpoint] < 1000) {
    return true; // Skip, too soon after last save
  }
  lastSaveTimestamps[endpoint] = now;

  // Collect any explicit deletes for this table
  // v11.02 C2 FIX: capture deleted ONCE before first attempt so retry reuses same list
  const deleted = getAndClearDeletes(endpoint);

  // ALWAYS save to localStorage first — this is the safety net
  lsSave(endpoint, data);
  // Then push to server with version info + auth token + deleted IDs
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ data, version: dataVersions[endpoint] || 0, user: userEmail || 'unknown', deleted }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401) {
      if (!justLoggedIn) {
        setSessionToken(null);
        localStorage.removeItem('blitz_session');
        sessionExpiredFlag = true;
      }
      pendingSaves.set(endpoint, { data, userEmail, deleted });
      return false;
    }
    if (res.status === 409) {
      // Server rejected — our version is stale. Merge server data into our state.
      try {
        const conflict = await res.json();
        if (conflict.serverData && Array.isArray(conflict.serverData)) {
          handleConflictResolution(endpoint, conflict.serverData, conflict.serverVersion);
        }
      } catch {}
      pendingSaves.delete(endpoint); // Don't retry stale data
      return false;
    }
    if (!res.ok) {
      // Log but don't crash on 400 errors (e.g. empty array protection)
      const errBody = await res.json().catch(() => ({}));
      console.warn(`⚠️ apiSave ${endpoint} got ${res.status}:`, errBody.error || 'unknown');
      if (res.status === 400) return false; // Don't retry 400s
      throw new Error('save failed');
    }
    const json = await res.json();
    if (json.version) {
      dataVersions[endpoint] = json.version;
      savePersistedVersions(dataVersions);
    }
    // v10.06: Process tombstoned IDs from server — purge zombie records locally
    if (json.tombstoned && json.tombstoned.length > 0) {
      processTombstoned(endpoint, json.tombstoned);
      // v10.06: Actively purge zombies from React state immediately
      const setter = conflictSetters[endpoint];
      if (setter && tombstonedIDs[endpoint] && tombstonedIDs[endpoint].size > 0) {
        setter(prev => {
          if (!Array.isArray(prev)) return prev;
          const filtered = prev.filter(r => !tombstonedIDs[endpoint].has(r.id));
          if (filtered.length < prev.length) {
            console.log(`🪦 [${endpoint}]: Purged ${prev.length - filtered.length} zombies from React state`);
            lsSave(endpoint, filtered);
            lastKnownCounts[endpoint] = filtered.length;
          }
          return filtered;
        });
      }
    }
    // v10.05: Handle throttled response — server accepted but skipped actual write
    if (json.throttled) {
      serverOnline = true;
      pendingSaves.delete(endpoint);
      return true;
    }
    // v10.06: Handle unchanged response — server had nothing new to write
    if (json.unchanged) {
      serverOnline = true;
      pendingSaves.delete(endpoint);
      return true;
    }
    // FIX 9.20: If server returned merged data (with records from other users),
    // sync it back into React state to prevent "disappearing rows"
    if (json.data && Array.isArray(json.data) && json.data.length > data.length) {
      const setter = conflictSetters[endpoint];
      if (setter) {
        console.log(`🔄 Post-save sync [${endpoint}]: server has ${json.data.length} records (we sent ${data.length}) — syncing`);
        const filtered = filterTombstoned(endpoint, json.data);
        setter(filtered);
        lsSave(endpoint, filtered);
        lastKnownCounts[endpoint] = filtered.length;
      }
    }
    serverOnline = true;
    pendingSaves.delete(endpoint);
    return true;
  } catch (e) {
    // v9.05 FIX: Don't immediately kill serverOnline — retry first
    // Retry once after 2 seconds
    try {
      await new Promise(r => setTimeout(r, 2000));
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ data, version: dataVersions[endpoint] || 0, user: userEmail || 'unknown', deleted }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) { 
        const json = await res.json(); 
        if (json.version && json.version !== dataVersions[endpoint]) { // v11.02 L4
          dataVersions[endpoint] = json.version;
          savePersistedVersions(dataVersions);
        }
        serverOnline = true;
        pendingSaves.delete(endpoint);
        return true; 
      }
    } catch (e2) {}
    // Both attempts failed — queue for later retry
    pendingSaves.set(endpoint, { data, userEmail, deleted });
    console.log(`⚠️ Queued pending save: ${endpoint} (will retry in 30s)`);
    return false;
  }
}

// ── WebSocket Manager (real-time sync) ──
let wsConnection = null;
let wsReconnectTimer = null;
let wsReconnectAttempts = 0;
const wsListeners = new Set();

function connectWebSocket() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) return;
  if (wsConnection && wsConnection.readyState === WebSocket.CONNECTING) return; // v9.09: don't double-connect
  const token = getSessionToken();
  if (!token) return; // Don't connect without auth
  try {
    console.log(`🔌 WebSocket connecting to ${WS_URL}...`);
    wsConnection = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    let closedHandled = false; // v9.09: prevent double-fire from onerror+onclose
    wsConnection.onopen = () => {
      console.log('🔌 WebSocket connected');
      wsReconnectAttempts = 0; // Reset backoff on success
      serverOnline = true;
      flushPendingSaves();
    };
    wsConnection.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'update') {
          if (msg.version) dataVersions[msg.table] = msg.version;
          // v10.06: Process both deleted (current deletes) and tombstoned (full tombstone list) from WS
          if (Array.isArray(msg.deleted) && msg.deleted.length > 0) {
            processTombstoned(msg.table, msg.deleted);
          }
          if (Array.isArray(msg.tombstoned) && msg.tombstoned.length > 0) {
            processTombstoned(msg.table, msg.tombstoned);
          }
          if (Array.isArray(msg.data)) {
            // v10.05: Filter tombstoned records before saving
            const filtered = filterTombstoned(msg.table, msg.data);
            lsSave(msg.table, filtered);
            // Pass filtered data to listeners
            wsListeners.forEach(fn => fn({ ...msg, data: filtered }));
          } else {
            wsListeners.forEach(fn => fn(msg));
          }
        } else if (msg.type === 'versions') {
          Object.entries(msg.versions).forEach(([k, v]) => { dataVersions[k] = v; });
        } else if (msg.type === 'heartbeat' && msg.v && msg.v !== VERSION) {
          console.warn(`⚠️ Server v${msg.v} ≠ Client v${VERSION} — consider refreshing`);
        }
      } catch {}
    };
    wsConnection.onclose = (e) => {
      if (closedHandled) return; // v9.09: prevent double reconnect
      closedHandled = true;
      wsConnection = null;
      // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(2000 * Math.pow(2, wsReconnectAttempts), 30000);
      wsReconnectAttempts++;
      if (wsReconnectAttempts <= 5) console.log(`🔌 WebSocket closed (code=${e.code}, reason=${e.reason || 'none'}). Reconnect #${wsReconnectAttempts} in ${delay/1000}s...`);
      if (!wsReconnectTimer) wsReconnectTimer = setTimeout(() => { wsReconnectTimer = null; connectWebSocket(); }, delay);
    };
    wsConnection.onerror = (e) => {
      if (wsReconnectAttempts === 0) console.warn('🔌 WebSocket error — will reconnect');
      if (closedHandled) return; // v9.09: onclose will handle reconnect
      closedHandled = true;
      wsConnection = null;
      const delay = Math.min(2000 * Math.pow(2, wsReconnectAttempts), 30000);
      wsReconnectAttempts++;
      if (!wsReconnectTimer) wsReconnectTimer = setTimeout(() => { wsReconnectTimer = null; connectWebSocket(); }, delay);
    };
  } catch (e) {
    console.warn('🔌 WebSocket creation failed:', e.message, '— using HTTP polling');
  }
}

function onWsUpdate(fn) { wsListeners.add(fn); return () => wsListeners.delete(fn); }

// ── useDebouncedSave: DEPRECATED (v11.02) — replaced by debouncedSave() in AppInner ──
// Kept as stub to avoid breaking any external references; do not use.
function useDebouncedSave() {}

// Telegram API functions
async function telegramTest() {
  try {
    const res = await fetch(`${API_BASE}/telegram/test`, { headers: authHeaders(), signal: AbortSignal.timeout(4000) });
    return await res.json();
  } catch (e) {
    return { status: "error", error: e.message };
  }
}

async function telegramNotify(message) {
  try {
    const res = await fetch(`${API_BASE}/telegram/notify`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ message }), signal: AbortSignal.timeout(4000),
    });
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

const STATUS_OPTIONS = ["Open", "On the way", "Approved to pay", "Paid"];
const OPEN_STATUSES = ["Open", "On the way", "Approved to pay"];
const TYPE_OPTIONS = ["Affiliate Payment", "Brand Refund"];
const STATUS_COLORS = {
  Open:              { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" },
  "On the way":       { bg: "#EEF2FF", text: "#4338CA", border: "#818CF8" },
  "Approved to pay":  { bg: "#ECFDF5", text: "#065F46", border: "#34D399" },
  Paid:               { bg: "#ECFDF5", text: "#065F46", border: "#34D399" },
  Pending:            { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" },
  Received:           { bg: "#ECFDF5", text: "#065F46", border: "#34D399" },
  Refund:             { bg: "#FFF1F2", text: "#9F1239", border: "#FB7185" },
  Cancelled:          { bg: "#FFF1F2", text: "#9F1239", border: "#FB7185" },
  Processing:         { bg: "#EFF6FF", text: "#1D4ED8", border: "#60A5FA" },
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g,'').slice(0,9) : Math.random().toString(36).substr(2, 9)); // v11.02 M4: crypto-safe IDs
// v10.05: Stamp new records with updatedAt for LWW merge
const stampNew = (record) => ({ ...record, updatedAt: Date.now() });

// Convert 2-letter country code to flag emoji (3-4 letter codes show text only)
const countryFlag = code => {
  if (!code) return "";
  if (code.length === 2) {
    const offset = 127397;
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + offset));
  }
  return ""; // 3-4 letter codes don't have flag emoji
};

const INITIAL = []; // REMOVED: hardcoded demo data caused production data loss on deploy

/* ── Icons ── */
const I = {
  logo: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="28" y2="28"><stop offset="0%" stopColor="#38BDF8"/><stop offset="100%" stopColor="#A78BFA"/></linearGradient></defs><rect width="28" height="28" rx="8" fill="url(#lg)"/><path d="M8 10h12M8 14h8M8 18h10" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.9"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  edit: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 15H4a1 1 0 01-1-1V4a1 1 0 011-1h3M11 12l3-3-3-3M7 9h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevL: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  search: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  close: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  openBox: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="6" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 10h14M7 3l-4 7M13 3l4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  calendar: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  admin: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2a3 3 0 100 6 3 3 0 000-6zM4 15a5 5 0 0110 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 8l1.5 1.5M14 11V8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  back: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0110.89-3.48M14 2v4h-4M14 8a6 6 0 01-10.89 3.48M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

/* ── Shared styles ── */
const inp = {
  width: "100%", padding: "11px 15px", background: "#FFFFFF",
  border: "2px solid #E2E8F0", borderRadius: 12,
  color: "#0F172A", fontSize: 14, outline: "none", boxSizing: "border-box",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
};

/* ── Components ── */
const TEAM_NAMES_DEFAULT = ["Alex", "John", "Katie", "Joy", "Oksana", "Donald"];
const TEAM_NAMES_REF = { current: [...TEAM_NAMES_DEFAULT] };

// ── Agent name normalization — merge aliases into canonical names ──
const AGENT_ALIASES = {
  "john leon": "John", "johnleon": "John", "john l": "John",
  "kate": "Katie", "katey": "Katie",
  "kristy": "Oksana", "kristy b": "Oksana",
};
function normalizeAgent(name) {
  if (!name) return name;
  const key = name.trim().toLowerCase();
  return AGENT_ALIASES[key] || name.trim();
}

const PEOPLE_COLORS = {
  Alex: "#579BFC", Katie: "#E2445C", Oksana: "#A25DDC", Joy: "#00C875", John: "#7F5347", Donald: "#FDAB3D",
};
const getPersonColor = name => {
  if (PEOPLE_COLORS[name]) return PEOPLE_COLORS[name];
  let h = 0; for (let i = 0; i < (name||"").length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const colors = ["#FF6B9D","#00BCD4","#FF9800","#9C27B0","#4CAF50","#E91E63","#3F51B5","#009688"];
  return colors[Math.abs(h) % colors.length];
};

function NameCombo({ value, onChange, placeholder }) {
  const [custom, setCustom] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const isCustom = value && !TEAM_NAMES_REF.current.includes(value);

  if (custom || (isCustom && value)) {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <input style={{ ...inp, flex: 1 }} value={isCustom ? value : customVal}
          onChange={e => { setCustomVal(e.target.value); onChange(e.target.value); }}
          placeholder="Type custom name..." autoFocus />
        <button onClick={() => { setCustom(false); setCustomVal(""); onChange(""); }}
          style={{ padding: "6px 10px", borderRadius: 8, background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {TEAM_NAMES_REF.current.map(name => (
        <button key={name} onClick={() => onChange(name)}
          style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: value === name ? `2px solid ${getPersonColor(name)}` : "2px solid #E2E8F0",
            background: value === name ? `${getPersonColor(name)}15` : "#F8FAFC",
            color: value === name ? getPersonColor(name) : "#64748B",
            transition: "all 0.15s",
          }}
        >{name}</button>
      ))}
      <button onClick={() => setCustom(true)}
        style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
          border: "2px dashed #CBD5E1", background: "transparent", color: "#94A3B8", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#0EA5E9"; e.currentTarget.style.color = "#0EA5E9"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#94A3B8"; }}
      >+ Other</button>
    </div>
  );
}

function SyncStatus() {
  const [status, setStatus] = useState("checking");
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    const iv = setInterval(async () => {
      setPendingCount(pendingSaves.size);
      // v9.05 FIX: Active health check — don't rely solely on stale serverOnline flag
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        setStatus("live");
      } else if (serverOnline) {
        setStatus("poll");
      } else {
        // serverOnline is false — but is the server actually down? Quick check.
        try {
          const r = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
          if (r.ok) { serverOnline = true; setStatus("poll"); }
          else setStatus("offline");
        } catch {
          setStatus("offline");
        }
      }
    }, 3000);
    return () => clearInterval(iv);
  }, []);
  const isOk = status === "live";
  const isPoll = status === "poll";
  const isBad = status === "offline";
  const cfg = {
    live: { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.30)", color: "#10B981", text: "Live" },
    poll: { bg: "rgba(56,189,248,0.10)", border: "rgba(56,189,248,0.30)", color: "#38BDF8", text: "Synced" },
    offline: { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.30)", color: "#EF4444", text: "Offline" },
    checking: { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", color: "#94A3B8", text: "..." },
  }[status] || { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", color: "#94A3B8", text: "..." };
  return (
    <div title={isOk ? "WebSocket live — real-time sync" : isPoll ? "Connected via polling — data synced" : isBad ? "Server offline — data saved locally" : "Checking..."}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "default",
        background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 0.3 }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 900, color: "#FFF", lineHeight: 1,
        background: isOk ? "linear-gradient(135deg, #059669, #10B981)" : isPoll ? "linear-gradient(135deg, #0284C7, #38BDF8)" : isBad ? "linear-gradient(135deg, #DC2626, #EF4444)" : "#94A3B8",
        boxShadow: isOk ? "0 0 8px rgba(16,185,129,0.5)" : isPoll ? "0 0 8px rgba(56,189,248,0.4)" : isBad ? "0 0 8px rgba(239,68,68,0.5)" : "none" }}>
        {isOk ? "\u2713" : isPoll ? "\u2713" : isBad ? "!" : "\u2022"}
      </span>
      {cfg.text}{pendingCount > 0 && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>({pendingCount}⏳)</span>}
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: "#F1F5F9", text: "#475569", border: "#94A3B8" };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 7px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}55`, whiteSpace: "nowrap", letterSpacing: "0.2px" }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.border, flexShrink: 0, boxShadow: `0 0 5px ${c.border}90` }} />
    {status}
  </span>;
}

// ── Currency & Branding Badges (₿ / € / $ / 🇺🇦) ──
function CurrencyBadges() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div title="Bitcoin" style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #F7931A, #FFB74D)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(247,147,26,0.35)", cursor: "default" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFF"><path d="M14.24 10.56c-.31-1.55-2.07-2.09-3.44-2.22l.56-2.25-1.36-.34-.54 2.18c-.36-.09-.72-.17-1.08-.26l.55-2.19-1.36-.34-.56 2.25c-.3-.07-.59-.14-.87-.21L4.47 5l-.35 1.46s1 .23 1 .24c.55.14.65.5.63.79l-.63 2.54.09.02-.09-.02-.89 3.57c-.07.16-.23.41-.6.32.01.02-1-.25-1-.25L2 15.24l1.65.41c.31.08.61.16.9.23l-.57 2.28 1.36.34.56-2.26c.37.1.74.2 1.1.28l-.56 2.24 1.37.34.57-2.27c2.34.44 4.1.26 4.84-1.86.6-1.7-.03-2.68-1.26-3.32.9-.2 1.57-.79 1.75-2zm-3.13 4.39c-.42 1.71-3.32.79-4.26.55l.76-3.04c.94.23 3.94.7 3.5 2.49zm.43-4.41c-.39 1.55-2.8.76-3.58.57l.69-2.76c.78.2 3.3.56 2.89 2.19z"/></svg>
      </div>
      <div title="Euro" style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #2563EB, #60A5FA)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(37,99,235,0.3)", cursor: "default" }}>
        <span style={{ color: "#FFF", fontSize: 17, fontWeight: 800, fontFamily: "serif", lineHeight: 1 }}>€</span>
      </div>
      <div title="US Dollar" style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #16A34A, #4ADE80)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(22,163,74,0.3)", cursor: "default" }}>
        <span style={{ color: "#FFF", fontSize: 17, fontWeight: 800, fontFamily: "serif", lineHeight: 1 }}>$</span>
      </div>
      <div title="Ukraine" style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,87,183,0.3)", cursor: "default", position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "#005BB5" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "#FFD500" }} />
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  const [show, setShow] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setShow(true)); }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,7,15,0.7)", backdropFilter: "blur(10px) saturate(180%)", WebkitBackdropFilter: "blur(10px) saturate(180%)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12, opacity: show ? 1 : 0, transition: "opacity 0.3s ease" }} onClick={onClose}>
      <div className="blitz-modal-content" onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #E2E8F0", padding: 32, width: 540, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05)", transform: show ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)", opacity: show ? 1 : 0, transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: "#0F172A", fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 4, transition: "all 0.15s", borderRadius: 8 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(100,116,139,0.1)"; e.currentTarget.style.transform = "rotate(90deg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.transform = "rotate(0)"; }}
          >{I.close}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 18 }}><label style={{ display: "block", color: "#64748B", fontSize: 11, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>{children}</div>;
}

function CopyInput({ label, value, onChange, placeholder, style: extraStyle }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input style={{ ...inp, flex: 1, fontSize: 13, fontFamily: "'JetBrains Mono',monospace", wordBreak: "break-all", ...extraStyle }} value={value || ""} onChange={onChange} placeholder={placeholder} />
        <button type="button" onClick={copy} title="Copy" style={{ flexShrink: 0, padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E8F0", background: copied ? "#ECFDF5" : "#F8FAFC", color: copied ? "#10B981" : "#64748B", cursor: value ? "pointer" : "default", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s", whiteSpace: "nowrap", opacity: value ? 1 : 0.4 }}
          onMouseEnter={e => { if (value) e.currentTarget.style.borderColor = "#0EA5E9"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
        >{copied ? "✓" : "📋"}</button>
      </div>
    </Field>
  );
}

function getAvailableStatuses(userEmail) {
  // Everyone can set: Open, On the way
  // y0505300530@gmail.com can also set: Approved to pay, Paid
  // office1092021@gmail.com can also set: Paid
  const base = ["Open", "On the way"];
  if (userEmail === "y0505300530@gmail.com") {
    return ["Open", "On the way", "Approved to pay", "Paid"];
  }
  if (userEmail === "office1092021@gmail.com") {
    return ["Open", "On the way", "Paid"];
  }
  return base;
}

/* ── Fee Helper ── */
// Fee can be: "2%" (percentage), "50" (flat $), or empty
function calcFee(fee, amount) {
  if (!fee) return 0;
  const f = fee.trim();
  const amt = parseFloat(amount) || 0;
  if (f.endsWith('%')) {
    const pct = parseFloat(f.replace('%', ''));
    return isNaN(pct) ? 0 : Math.round(amt * pct / 100);
  }
  const flat = parseFloat(f);
  return isNaN(flat) ? 0 : flat;
}

function fmtFee(fee, amount) {
  if (!fee) return "—";
  const val = calcFee(fee, amount);
  return fee.trim().endsWith('%') ? `${fee.trim()} (${val.toLocaleString("en-US")}$)` : `${val.toLocaleString("en-US")}$`;
}

/* ── Dropdown Nav Menu ── */
function NavDropdown({ label, icon, items, activePage, userAccess, onNav, accentColor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hasActive = items.some(i => i.key === activePage);
  const visibleItems = items.filter(i => (userAccess || []).includes(i.key));
  if (visibleItems.length === 0) return null;

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
          background: hasActive ? `${accentColor}15` : "transparent",
          border: hasActive ? `1.5px solid ${accentColor}40` : "1.5px solid transparent",
          color: hasActive ? accentColor : "#64748B",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={e => { if (!hasActive) { e.currentTarget.style.background = "rgba(100,116,139,0.06)"; e.currentTarget.style.color = accentColor; } }}
        onMouseLeave={e => { if (!hasActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; } }}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        {label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 200,
          background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(99,102,241,0.12)", boxShadow: "0 4px 20px rgba(99,102,241,0.07)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          padding: "6px", zIndex: 200, animation: "fadeUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}>
          {visibleItems.map(pg => {
            const isActive = activePage === pg.key;
            return (
              <button key={pg.key} onClick={() => { onNav(pg.key); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px",
                  border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: "left",
                  background: isActive ? `${pg.color}12` : "transparent",
                  color: isActive ? pg.color : "#334155",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F8FAFC"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? pg.color : "#CBD5E1", transition: "all 0.15s" }} />
                {pg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Shared Responsive Header ── */
function BlitzHeader({ user, activePage, userAccess, onNav, onAdmin, onLogout, accentColor }) {
  const mobile = useMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const { dark, toggle: toggleDark } = useTheme();

  // v9.05: Grouped navigation structure
  const NAV_GROUPS = [
    { label: "Dashboard", icon: "📊", type: "single", key: "overview", color: "#6366F1" },
    { label: "Finance", icon: "💰", type: "dropdown", color: "#0EA5E9", items: [
      { key: "payments", label: "Payments", color: "#0EA5E9" },
      { key: "customers", label: "Customer Payments", color: "#0EA5E9" },
      { key: "dailycalcs", label: "Daily Calcs", color: "#EF4444" },
    ]},
    { label: "Deals", icon: "📋", type: "dropdown", color: "#F59E0B", items: [
      { key: "crg", label: "CRG Deals", color: "#F59E0B" },
      { key: "deals", label: "Offers", color: "#10B981" },
      { key: "dailycap", label: "Daily Cap", color: "#8B5CF6" },
    ]},
    { label: "Info", icon: "📊", type: "dropdown", color: "#EC4899", items: [
      { key: "partners", label: "Partners", color: "#EC4899" },
      { key: "monthlystats", label: "Blitz Report", color: "#6366F1" },
      { key: "ftdsinfo", label: "FTDs Info", color: "#10B981" },
    ]},
    { label: "Settings", icon: "⚙️", type: "single", key: "settings", color: "#64748B" },
  ];

  // Flat list for mobile + admin
  const allNavPages = [
    { key: "overview", label: "Dashboard", color: "#6366F1" },
    { key: "payments", label: "Payments", color: "#0EA5E9" },
    { key: "customers", label: "Customer Payments", color: "#0EA5E9" },
    { key: "crg", label: "CRG Deals", color: "#F59E0B" },
    { key: "dailycap", label: "Daily Cap", color: "#8B5CF6" },
    { key: "deals", label: "Offers", color: "#10B981" },
    { key: "partners", label: "Partners", color: "#EC4899" },
    { key: "monthlystats", label: "Blitz Report", color: "#6366F1" },
    { key: "ftdsinfo", label: "FTDs Info", color: "#10B981" },
    { key: "dailycalcs", label: "Daily Calcs", color: "#EF4444" },
    { key: "settings", label: "Settings", color: "#64748B" },
  ];
  if (isAdmin(user.email)) allNavPages.push({ key: "admin", label: "⚙️ Admin", color: "#DC2626" });

  return (
    <>
      <header className="blitz-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", borderBottom: "1px solid #E2E8F0", background: "rgba(10,15,30,0.97)", backdropFilter: "blur(24px) saturate(200%)", WebkitBackdropFilter: "blur(24px) saturate(200%)", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(99,102,241,0.25), 0 4px 32px rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 12 }}>
          {I.logo}
          {!mobile && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, letterSpacing: -0.5, background: "linear-gradient(135deg, #38BDF8 0%, #A78BFA 50%, #F472B6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Blitz CRM</span>}
          <span style={{ fontSize: 11, color: "#A5B4FC", fontFamily: "'JetBrains Mono',monospace", background: "rgba(99,102,241,0.15)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(99,102,241,0.35)", fontWeight: 700, letterSpacing: "0.3px" }}>v{VERSION}</span>
          {!mobile && <>
            <span style={{ color: "rgba(99,102,241,0.3)", margin: "0 4px" }}>|</span>
            <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {NAV_GROUPS.map(group => {
                if (group.type === "single") {
                  if (!(userAccess || []).includes(group.key)) return null;
                  const isActive = activePage === group.key;
                  return isActive
                    ? <span key={group.key} style={{ display: "flex", alignItems: "center", gap: 5, background: `${group.color}15`, border: `1.5px solid ${group.color}40`, color: group.color, padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}><span style={{ fontSize: 14 }}>{group.icon}</span>{group.label}</span>
                    : <button key={group.key} onClick={() => onNav(group.key)} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1.5px solid transparent", color: "#94A3B8", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "5px 12px", borderRadius: 8, transition: "all 0.15s", background: "transparent" }}
                        onMouseEnter={e => { e.currentTarget.style.color = group.color; e.currentTarget.style.background = "rgba(99,102,241,0.12)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.background = "transparent"; }}
                      ><span style={{ fontSize: 14 }}>{group.icon}</span>{group.label}</button>;
                }
                return <NavDropdown key={group.label} label={group.label} icon={group.icon} items={group.items} activePage={activePage} userAccess={userAccess} onNav={onNav} accentColor={group.color} />;
              })}
            </div>
          </>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 6 : 12 }}>
          {!mobile && <>
            <div className="desktop-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {isAdmin(user.email) && <button onClick={onAdmin} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 10, background: "linear-gradient(135deg, #DC2626 0%, #F43F5E 100%)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>⚙️ Admin</button>}
              <div style={{ padding: "5px 16px", borderRadius: 20, background: "rgba(99,102,241,0.15)", border: "1.5px solid rgba(99,102,241,0.4)", fontSize: 13, color: "#A5B4FC", fontWeight: 600, letterSpacing: "0.2px" }}>{user.name}</div>
              <SyncStatus />
              <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "6px 8px", borderRadius: 8 }}
                onMouseEnter={e => e.currentTarget.style.color = "#F87171"} onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
              >{I.logout}<span>Logout</span></button>
            </div>
          </>}
          {mobile && <>
            <SyncStatus />
            <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #E2E8F0", color: "#334155", cursor: "pointer", padding: "6px 10px", borderRadius: 8, fontSize: 18 }}>☰</button>
          </>}
        </div>
      </header>
      {mobile && menuOpen && (
        <MobileNav pages={allNavPages} current={activePage} userAccess={userAccess} onNav={onNav} onClose={() => setMenuOpen(false)} />
      )}
    </>
  );
}

function PaymentForm({ payment, onSave, onClose, userEmail, userName }) {
  const [f, setF] = useState(payment || { invoice: "", paidDate: new Date().toISOString().split("T")[0], status: "Open", amount: "", fee: "", openBy: userName || "", type: "Affiliate Payment", trcAddress: "", ercAddress: "", usdcAddress: "", paymentHash: "" });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };
  const availableStatuses = getAvailableStatuses(userEmail);

  const handleSave = () => {
    if (!f.invoice.trim() || isNaN(f.invoice) || parseInt(f.invoice) < 1 || parseInt(f.invoice) > 999) {
      setError("Invoice must be a number between 1 and 999");
      return;
    }
    if (!f.amount || parseFloat(f.amount) <= 0) {
      setError("Amount is required");
      return;
    }
    if (f.status === "Paid" && !f.paymentHash.trim()) {
      setError("Payment Hash is required when marking as Paid");
      return;
    }
    onSave(f);
  };

  return (
    <>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Affiliate ID"><input style={inp} value={f.invoice} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); s("invoice", v); }} placeholder="e.g. 100" maxLength={3} /></Field>
        <Field label="Amount ($)"><input style={inp} type="number" value={f.amount} onChange={e => s("amount", e.target.value)} placeholder="0.00" /></Field>
        <Field label="Fee (number or %)">
          <input style={inp} value={f.fee || ""} onChange={e => s("fee", e.target.value)} placeholder="e.g. 2% or 50" />
          {f.fee && f.amount && <div style={{ fontSize: 11, color: "#0EA5E9", marginTop: 4 }}>Fee: {fmtFee(f.fee, f.amount)}</div>}
        </Field>
        <Field label="Status">
          <select style={{ ...inp, cursor: "pointer" }} value={f.status} onChange={e => {
            const ns = e.target.value;
            setF(prev => ({
              ...prev,
              status: ns,
              paidDate: ns === "Paid" ? new Date().toISOString().split("T")[0] : "",
            }));
            setError("");
          }}>
            {availableStatuses.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          {!availableStatuses.includes(f.status) && f.status && (
            <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 4 }}>Current status "{f.status}" — you don't have permission to change it</div>
          )}
        </Field>
        <Field label="Type">
          <select style={{ ...inp, cursor: "pointer" }} value={f.type || "Affiliate Payment"} onChange={e => s("type", e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Paid Date">
          <div style={{ ...inp, background: "#e8ecf0", color: f.paidDate ? "#1E293B" : "#94A3B8", cursor: "default", display: "flex", alignItems: "center" }}>
            {f.paidDate || "Auto-set when marked Paid"}
          </div>
        </Field>
        <Field label="Open By"><NameCombo value={f.openBy} onChange={v => s("openBy", v)} placeholder="Select name" /></Field>
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <CopyInput label="TRC Address" value={f.trcAddress || ""} onChange={e => s("trcAddress", e.target.value)} placeholder="e.g. TYUWBpmzSqCcz9r5rRVG..." />
        <CopyInput label="ERC Address" value={f.ercAddress || ""} onChange={e => s("ercAddress", e.target.value)} placeholder="e.g. 0x5066d63E126Cb3F893..." />
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <CopyInput label="USDC Address" value={f.usdcAddress || ""} onChange={e => s("usdcAddress", e.target.value)} placeholder="e.g. 0x5066d63E126Cb3F893..." />
        <div />
      </div>
      <CopyInput label="Payment Hash (Crypto Wallet)" value={f.paymentHash} onChange={e => s("paymentHash", e.target.value)} placeholder="e.g. 0xabc123..."
        style={{ borderColor: error && f.status === "Paid" && !f.paymentHash.trim() ? "#EF4444" : undefined }} />
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(14,165,233,0.3)" }}>{payment ? "Save Changes" : "Add Payment"}</button>
      </div>
    </>
  );
}

/* ── Payment Table ── */
// ── Bulk Action Bar — floating bottom bar when rows are selected ──
function BulkActionBar({ count, onDelete, onDuplicate, onArchive, onClear }) {
  if (count === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200,
      background: "#FFFFFF", borderRadius: 16, padding: "10px 20px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
      display: "flex", alignItems: "center", gap: 6, border: "1px solid #E2E8F0",
      animation: "fadeUp 0.25s ease both",
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "#0EA5E9", color: "#FFF", fontWeight: 800, fontSize: 13, marginRight: 4 }}>{count}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginRight: 8 }}>selected</span>
      <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 4px" }} />
      {onDuplicate && <button onClick={onDuplicate} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px", borderRadius: 8, color: "#475569" }}
        onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4a2 2 0 012-2h12"/></svg>
        <span style={{ fontSize: 10, fontWeight: 600 }}>Duplicate</span>
      </button>}
      {onArchive && <button onClick={onArchive} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px", borderRadius: 8, color: "#475569" }}
        onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
        <span style={{ fontSize: 10, fontWeight: 600 }}>Archive</span>
      </button>}
      {onDelete && <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px", borderRadius: 8, color: "#DC2626" }}
        onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        <span style={{ fontSize: 10, fontWeight: 600 }}>Delete</span>
      </button>}
      <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 4px" }} />
      <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8, color: "#94A3B8", display: "flex", alignItems: "center", fontSize: 18 }}
        onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "none"}>✕</button>
    </div>
  );
}

function PaymentTable({ payments: rawPayments, onEdit, onDelete, onStatusChange, onFieldUpdate, emptyMsg, statusOptions, sortMode, onMove, onDuplicate, onArchive, onBulkDelete }) {
  const payments = rawPayments || [];
  const fmt = a => { const n = parseFloat(a) || 0; return n.toLocaleString("en-US") + "$"; };
  const [selected, setSelected] = useState(new Set());
  const mobile = useMobile();
  const sorted = sortMode === "alpha"
    ? [...payments].sort((a, b) => (a.invoice || "").localeCompare(b.invoice || "", undefined, { numeric: true }))
    : [...payments].sort((a, b) => (a.paidDate || "").localeCompare(b.paidDate || ""));
  const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const toggleSelect = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(p => p.id)));
  const clearSelection = () => setSelected(new Set());
  const selArr = [...selected];

  // Date range
  const dates = payments.filter(p => p.paidDate).map(p => new Date(p.paidDate)).sort((a, b) => a - b);
  const fmtShort = d => { const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${months[d.getMonth()]} ${d.getDate()}`; };
  const dateRange = dates.length > 0 ? (dates.length === 1 ? fmtShort(dates[0]) : `${fmtShort(dates[0])} - ${fmtShort(dates[dates.length - 1])}`) : "";

  if (payments.length === 0) return <div style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>{emptyMsg}</div>;

  const openByColors = ["#FF6B9D", "#00BCD4", "#FF9800", "#9C27B0", "#4CAF50", "#E91E63"];
  const getOpenByColor = name => { let h = 0; for (let i = 0; i < (name||"").length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return openByColors[Math.abs(h) % openByColors.length]; };

  const statusStyle = status => {
    const styles = {
      Open: { background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", color: "#92400E", border: "1px solid #FDE68A" },
      "On the way": { background: "linear-gradient(135deg, #818CF8, #6366F1)", color: "#FFF", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" },
      "Approved to pay": { background: "linear-gradient(135deg, #34D399, #10B981)", color: "#FFF", boxShadow: "0 2px 8px rgba(16,185,129,0.3)" },
      Paid: { background: "linear-gradient(135deg, #10B981, #059669)", color: "#FFF", boxShadow: "0 2px 8px rgba(16,185,129,0.3)" },
    };
    return styles[status] || { background: "#F1F5F9", color: "#475569" };
  };

  if (mobile) {
    return (
      <div>
        {sorted.map(p => (
          <div key={p.id} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span onClick={() => onEdit(p)} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: "#0EA5E9", cursor: "pointer" }}>{p.invoice}{getAffiliateName(p.invoice) ? ` - ${getAffiliateName(p.invoice)}` : ""}</span>
                <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, ...statusStyle(p.status) }}>{p.status}</span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>{fmt(p.amount)}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 12, color: "#64748B", marginBottom: 8 }}>
              {p.paidDate && <span>📅 {new Date(p.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
              <span style={{ padding: "2px 8px", borderRadius: 4, background: (p.type || "Affiliate Payment") === "Brand Refund" ? "#FEE2E2" : "#EFF6FF", color: (p.type || "Affiliate Payment") === "Brand Refund" ? "#DC2626" : "#2563EB", fontSize: 10, fontWeight: 600 }}>{p.type || "Affiliate Payment"}</span>
              {p.fee && <span>Fee: {fmtFee(p.fee, p.amount)}</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ padding: "3px 10px", borderRadius: 4, background: getPersonColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 12 }}>{p.openBy}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {p.status !== "Paid" && statusOptions && onStatusChange && (
                  <select value={p.status} onChange={e => onStatusChange(p.id, e.target.value)}
                    style={{ padding: "4px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "1px solid #E2E8F0", ...statusStyle(p.status) }}>
                    {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                )}
                <button onClick={() => onEdit(p)} style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                <button onClick={() => onDelete(p.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
              </div>
            </div>
            {(p.trcAddress || p.ercAddress || p.usdcAddress || p.paymentHash) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "#94A3B8", display: "flex", flexDirection: "column", gap: 2 }}>
                {p.trcAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>TRC: {p.trcAddress}</div>}
                {p.ercAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ERC: {p.ercAddress}</div>}
                {p.usdcAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>USDC: {p.usdcAddress}</div>}
                {p.paymentHash && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Hash: {p.paymentHash}</div>}
              </div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "12px", flexWrap: "wrap" }}>
          {dateRange && <span style={{ padding: "5px 14px", borderRadius: 20, background: "#F472B6", color: "#FFF", fontWeight: 700, fontSize: 12 }}>{dateRange}</span>}
          <span style={{ padding: "5px 14px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 12 }}>{payments.length} payments</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{total.toLocaleString("en-US")}$</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "3%" }} />{/* Checkbox */}
          <col style={{ width: "18%" }} />{/* Affiliate ID + Name */}
          <col style={{ width: "12%" }} />{/* Date */}
          <col style={{ width: "10%" }} />{/* Status */}
          <col style={{ width: "12%" }} />{/* Amount */}
          <col style={{ width: "8%" }} />{/* Fee */}
          <col style={{ width: "10%" }} />{/* Open By */}
          <col style={{ width: "15%" }} />{/* Hash */}
          <col style={{ width: "12%" }} />{/* Actions */}
        </colgroup>
        <thead>
          <tr style={{ background: "#FAFBFC" }}>
            <th style={{ padding: "9px 10px", borderBottom: "1.5px solid #E5E7EB", borderRight: "1px solid #E5E7EB", textAlign: "center", background: "#FAFBFC" }}>
              <input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0} onChange={toggleAll} style={{ cursor: "pointer", width: 15, height: 15, accentColor: "#0EA5E9" }} />
            </th>
            {["Affiliate ID","Date","Status","Amount","Fee","Open By","Hash","Actions"].map(h =>
              <th key={h} style={{ padding: "9px 12px", textAlign: "left", color: "#6B7280", fontSize: 11, fontWeight: 600, letterSpacing: "0.6px", textTransform: "uppercase", borderBottom: "1.5px solid #E5E7EB", borderRight: "1px solid #E5E7EB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "#FAFBFC" }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            // Color-coded row backgrounds
            const amt = parseFloat(p.amount) || 0;
            const isHighValue = amt >= 5000;
            const isOverdue = p.status === "Open" && p.paidDate && new Date(p.paidDate) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const isSel = selected.has(p.id);
            const rowBg = isSel ? "rgba(14,165,233,0.1)" : isOverdue ? "rgba(239,68,68,0.05)" : isHighValue ? "rgba(14,165,233,0.04)" : "transparent";
            const rowBorder = isSel ? "#93C5FD" : isOverdue ? "#FECACA" : isHighValue ? "#BAE6FD" : "#F1F5F9";
            return (
            <tr key={p.id}
              style={{ borderBottom: `1px solid ${rowBorder}`, transition: "background 0.15s", background: rowBg, borderLeft: isSel ? "3px solid #0EA5E9" : isOverdue ? "3px solid #EF4444" : isHighValue ? "3px solid #0EA5E9" : "3px solid transparent" }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = isOverdue ? "rgba(239,68,68,0.08)" : isHighValue ? "rgba(14,165,233,0.08)" : "rgba(99,102,241,0.04)"; }}
              onMouseLeave={e => e.currentTarget.style.background = rowBg}
            >
              <td style={{ padding: "4px 4px", textAlign: "center", borderRight: "1px solid #CBD5E1" }}>
                <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)} style={{ cursor: "pointer", width: 15, height: 15, accentColor: "#0EA5E9" }} />
              </td>
              <td style={{ padding: "7px 6px", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, borderRight: "1px solid #CBD5E1" }}>
                <span onClick={() => onEdit(p)} style={{ cursor: "pointer", color: "#0EA5E9", textDecoration: "underline", textDecorationColor: "rgba(14,165,233,0.3)", textUnderlineOffset: 3 }}
                  onMouseEnter={e => e.currentTarget.style.textDecorationColor = "#0EA5E9"}
                  onMouseLeave={e => e.currentTarget.style.textDecorationColor = "rgba(14,165,233,0.3)"}
                >{p.invoice}{getAffiliateName(p.invoice) ? <span style={{ fontWeight: 400, color: "#64748B", fontSize: 11, marginLeft: 4 }}>- {getAffiliateName(p.invoice)}</span> : ""}</span>
              </td>
              <td style={{ padding: "4px 4px", borderRight: "1px solid #CBD5E1" }}>
                <input type="date" value={p.paidDate || ""} onChange={e => { const updated = { ...p, paidDate: e.target.value, updatedAt: Date.now() }; onFieldUpdate && onFieldUpdate(p.id, "paidDate", e.target.value); }} style={{ padding: "2px 4px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono',monospace", cursor: "pointer", width: "100%", maxWidth: 120 }} />
              </td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #CBD5E1" }}>
                {p.status !== "Paid" && statusOptions && onStatusChange ? (
                  <select value={p.status} onChange={e => onStatusChange(p.id, e.target.value)}
                    style={{ padding: "3px 4px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "1px solid #E2E8F0", cursor: "pointer", ...(statusStyle(p.status)), appearance: "auto", outline: "none", maxWidth: "100%" }}>
                    {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                ) : (
                  <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.3, ...statusStyle(p.status) }}>{p.status}</span>
                )}
              </td>
              <td style={{ padding: "7px 6px", fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#0F172A", borderRight: "1px solid #CBD5E1", whiteSpace: "nowrap" }}>{fmt(p.amount)}</td>
              <td style={{ padding: "7px 6px", fontSize: 10, color: p.fee ? "#0EA5E9" : "#CBD5E1", borderRight: "1px solid #CBD5E1", fontFamily: "'JetBrains Mono',monospace" }}>{fmtFee(p.fee, p.amount)}</td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #CBD5E1" }}>
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: getPersonColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 11 }}>{p.openBy}</span>
              </td>
              <td style={{ padding: "7px 6px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #CBD5E1" }}>{p.paymentHash || "—"}</td>
              <td style={{ padding: "4px 4px" }}>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  {onMove && sortMode !== "alpha" && <>
                    <button onClick={() => onMove(p.id, "up")} title="Move up" disabled={i === 0}
                      style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 3px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 10 }}>▲</button>
                    <button onClick={() => onMove(p.id, "down")} title="Move down" disabled={i === sorted.length - 1}
                      style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 3px", cursor: i === sorted.length - 1 ? "default" : "pointer", color: i === sorted.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 10 }}>▼</button>
                  </>}
                  <button onClick={() => onEdit(p)} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 5, padding: 4, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                  <button onClick={() => onDelete(p.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 5, padding: 4, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                </div>
              </td>
            </tr>
          );})}
        </tbody>
      </table>
      {/* Footer summary bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 24,
        padding: "12px 20px", background: "#F8FAFC", borderTop: "2px solid #E2E8F0",
        flexWrap: "wrap",
      }}>
        {dateRange && (
          <span style={{ padding: "5px 16px", borderRadius: 20, background: "#F472B6", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{dateRange}</span>
        )}
        <span style={{ padding: "5px 16px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{payments.length} payments</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{total.toLocaleString("en-US")}$</span>
        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>sum</span>
      </div>
      <BulkActionBar count={selected.size} onClear={clearSelection}
        onDelete={onBulkDelete ? () => { if (confirm(`Delete ${selected.size} selected payment(s)?`)) { onBulkDelete(selArr); clearSelection(); } } : null}
        onDuplicate={onDuplicate ? () => { onDuplicate(selArr); clearSelection(); } : null}
        onArchive={onArchive ? () => { onArchive(selArr); clearSelection(); } : null}
      />
    </div>
  );
}

/* ── Group Header ── */
function GroupHeader({ icon, title, count, total, accentColor, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  const fmt = a => { const n = parseFloat(a) || 0; return n.toLocaleString("en-US") + "$"; };

  return (
    <div style={{ marginBottom: 24, animation: "fadeUp 0.4s ease both" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "18px 24px", background: "linear-gradient(135deg, #FAFBFF 0%, #FFFFFF 100%)",
        border: "1px solid rgba(99,102,241,0.12)", borderRadius: open ? "16px 16px 0 0" : 16,
        cursor: "pointer", color: "#0F172A", fontSize: 16, fontWeight: 800,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.06), 0 0 20px ${accentColor}10`; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
      >
        <span style={{ color: accentColor, display: "flex", fontSize: 18 }}>{icon}</span>
        <span style={{ color: accentColor }}>{title}</span>
        <span style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`, color: "#FFF", borderRadius: 20, padding: "3px 14px", fontSize: 13, fontWeight: 700, marginLeft: 4, boxShadow: `0 2px 8px ${accentColor}30` }}>{count}</span>
        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 800, color: "#0F172A", letterSpacing: -0.5 }}>{fmt(total)}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", marginLeft: 8 }}>
          <path d="M4 6l4 4 4-4" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={{
        background: "#FFFFFF",
        border: "1px solid rgba(99,102,241,0.12)",
        borderTop: "none",
        borderRadius: "0 0 16px 16px",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(99,102,241,0.06), 0 2px 8px rgba(0,0,0,0.03)",
        maxHeight: open ? "5000px" : "0px",
        opacity: open ? 1 : 0,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Admin Panel ── */
const ALL_PAGES = [
  { key: "overview", label: "Dashboard", color: "#6366F1" },
  { key: "payments", label: "Payments", color: "#0EA5E9" },
  { key: "customers", label: "Customer Payments", color: "#0EA5E9" },
  { key: "crg", label: "CRG Deals", color: "#F59E0B" },
  { key: "dailycap", label: "Daily Cap", color: "#8B5CF6" },
  { key: "deals", label: "Offers", color: "#10B981" },
  { key: "partners", label: "Partners", color: "#EC4899" },
  { key: "monthlystats", label: "Blitz Report", color: "#6366F1" },
  { key: "ftdsinfo", label: "FTDs Info", color: "#10B981" },
  { key: "dailycalcs", label: "Daily Calcs", color: "#EF4444" },
  { key: "settings", label: "Settings", color: "#64748B" },
];

function getPageAccess(user) {
  if (isAdmin(user.email)) return ALL_PAGES.map(p => p.key);
  let access = user.pageAccess || ALL_PAGES.map(p => p.key);
  // Migrate old "dashboard" key to new page structure
  if (access.includes("dashboard")) {
    access = access.filter(k => k !== "dashboard");
    if (!access.includes("overview")) access.unshift("overview");
    if (!access.includes("payments")) access.splice(1, 0, "payments");
  }
  // Ensure overview and settings are always accessible
  if (!access.includes("overview")) access.unshift("overview");
  if (!access.includes("settings")) access.push("settings");
  return access;
}

function PageAccessToggles({ access, onChange }) {
  const toggle = key => {
    const current = access || ALL_PAGES.map(p => p.key);
    if (current.includes(key)) {
      if (current.length <= 1) return; // must have at least 1
      onChange(current.filter(k => k !== key));
    } else {
      onChange([...current, key]);
    }
  };
  const current = access || ALL_PAGES.map(p => p.key);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {ALL_PAGES.map(pg => {
        const active = current.includes(pg.key);
        return (
          <button key={pg.key} onClick={() => toggle(pg.key)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: active ? `2px solid ${pg.color}` : "2px solid #E2E8F0",
              background: active ? `${pg.color}15` : "transparent",
              color: active ? pg.color : "#94A3B8",
              transition: "all 0.15s",
            }}
          >
            {active ? "✓ " : ""}{pg.label}
          </button>
        );
      })}
    </div>
  );
}

function AdminPanel({ users, setUsers, wallets, setWallets, onBack, user }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", pageAccess: ALL_PAGES.map(p => p.key) });
  const [delConfirm, setDelConfirm] = useState(null);
  const [editingWallet, setEditingWallet] = useState(null); // null or wallet id being edited
  const [walletForm, setWalletForm] = useState({ date: "", trc: "", erc: "", btc: "" });

  // v10.15: Cache last valid users list — fall back to INITIAL_USERS instead of empty "Loading..."
  const usersCache = useRef(users && users.length > 0 ? users : INITIAL_USERS);
  if (users && users.length > 0) usersCache.current = users;
  const displayUsers = usersCache.current;

  const handleAddUser = () => {
    if (!newUser.email || !newUser.password || !newUser.name) return;
    if (users.some(u => u.email === newUser.email)) return;
    const hashed = hashPassword(newUser.password);
    setUsers(prev => [...prev, { email: newUser.email, passwordHash: hashed, name: newUser.name, pageAccess: newUser.pageAccess }]);
    setNewUser({ email: "", password: "", name: "", pageAccess: ALL_PAGES.map(p => p.key) });
    setAddOpen(false);
  };

  const handleUpdateUser = () => {
    if (!editUser) return;
    setUsers(prev => prev.map(u => {
      if (u.email !== editUser.originalEmail) return u;
      const updated = { email: editUser.email, name: editUser.name, pageAccess: editUser.pageAccess || ALL_PAGES.map(p => p.key), updatedAt: Date.now() }; // v10.07: stamp updatedAt so server knows this is admin change
      if (editUser.password && editUser.password.trim()) {
        updated.passwordHash = hashPassword(editUser.password);
      } else {
        updated.passwordHash = u.passwordHash;
      }
      return updated;
    }));
    setEditUser(null);
  };

  const handleDeleteUser = (email) => {
    if (isAdmin(email)) return; // can't delete admin
    if (!confirm("Are you sure you want to remove this user? They will no longer be able to log in.")) return;
    setUsers(prev => prev.filter(u => u.email !== email));
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", borderBottom: "1px solid #E2E8F0", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {I.logo}
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Blitz CRM</span>
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono',monospace", background: "#E2E8F0", padding: "2px 8px", borderRadius: 6 }}>v{VERSION}</span>
          <span style={{ color: "#64748B", fontSize: 14 }}>/ Admin</span>
          <SyncStatus />
        </div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 8 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#38BDF8"; e.currentTarget.style.color = "#38BDF8"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#94A3B8"; }}
        >{I.back}<span>Back to Dashboard</span></button>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>User Management</h1>
          <button onClick={() => setAddOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(14,165,233,0.3)" }}
          >{I.plus} Add User</button>
        </div>

        {/* Users Table */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          {(!displayUsers || displayUsers.length === 0) ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
              Loading users... If this persists, check server connection.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Name</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Email</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Last Login</th>
                  <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Access</th>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.map((u, i) => (
                  <tr key={u.email} style={{ borderBottom: i < users.length - 1 ? "1px solid #F1F5F9" : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                        {isAdmin(u.email) && (
                          <span style={{ padding: "1px 6px", borderRadius: 6, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", fontSize: 9, fontWeight: 700, color: "#F87171", textTransform: "uppercase" }}>Admin</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#64748B" }}>{u.email}</td>
                    <td style={{ padding: "10px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: u.lastLogin ? "#64748B" : "#CBD5E1", whiteSpace: "nowrap" }}>
                      {u.lastLogin ? (() => { const d = new Date(u.lastLogin); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })() : "Never"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
                        {ALL_PAGES.map(pg => {
                          const hasAccess = isAdmin(u.email) || (u.pageAccess || ALL_PAGES.map(p => p.key)).includes(pg.key);
                          return hasAccess ? <span key={pg.key} style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${pg.color}15`, color: pg.color }}>{pg.label}</span> : null;
                        })}
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => setEditUser({ ...u, originalEmail: u.email })} title="Edit"
                          style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#38BDF8", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}
                        >{I.edit}</button>
                        {!isAdmin(u.email) && (
                          <button onClick={() => handleDeleteUser(u.email)} title="Remove"
                            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#F87171", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}
                          >{I.trash}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Telegram Bot Section */}
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>📬 Telegram Notifications</h2>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "24px" }}>
            <p style={{ color: "#64748B", fontSize: 14, marginBottom: 16 }}>
              Notifications are sent to your Telegram group when payments are created, status changes, etc.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={async () => {
                const res = await telegramTest();
                alert(res.status === "ok" ? "✅ Telegram bot is connected!" : "❌ Telegram not configured: " + (res.error || "Unknown error"));
              }}
                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #0088cc, #00aaff)", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
              >🤖 Test Connection</button>
              <button onClick={async () => {
                const res = await telegramNotify("🔔 Test notification from Blitz CRM — everything is working!");
                alert(res.ok ? "✅ Test message sent!" : "❌ Failed: " + (res.error || "Unknown error"));
              }}
                style={{ padding: "10px 20px", background: "transparent", border: "2px solid #0088cc", borderRadius: 8, color: "#0088cc", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
              >📤 Send Test Message</button>
            </div>
          </div>
        </div>

        {/* Wallets Section */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>💳 Wallets</h2>
            <button onClick={() => {
              const newW = { id: genId(), date: new Date().toISOString().split("T")[0], trc: "", erc: "", btc: "", updatedAt: Date.now(), createdAt: Date.now() };
              setWallets(prev => [newW, ...prev]);
              setEditingWallet(newW.id);
              setWalletForm({ date: newW.date, trc: "", erc: "", btc: "" });
            }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 10px rgba(14,165,233,0.3)" }}
            >{I.plus} Add Wallet</button>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
            {(!wallets || wallets.length === 0) && (
              <div style={{ padding: "30px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No wallets added yet.</div>
            )}
            {(wallets || []).map((w, wi) => {
              const isEditing = editingWallet === w.id;
              return (
                <div key={w.id} style={{ padding: "18px 24px", borderBottom: wi < wallets.length - 1 ? "1px solid #CBD5E1" : "none" }}>
                  {isEditing ? (
                    <div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Date</label>
                        <input type="date" value={walletForm.date} onChange={e => setWalletForm(p => ({ ...p, date: e.target.value }))}
                          style={{ ...inp, marginTop: 4, maxWidth: 200 }} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>TRC</label>
                        <input value={walletForm.trc} onChange={e => setWalletForm(p => ({ ...p, trc: e.target.value }))}
                          style={{ ...inp, marginTop: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }} placeholder="TRC20 address..." />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>ERC USDT/USDC</label>
                        <input value={walletForm.erc} onChange={e => setWalletForm(p => ({ ...p, erc: e.target.value }))}
                          style={{ ...inp, marginTop: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }} placeholder="ERC20 address..." />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>USDC</label>
                        <input value={walletForm.usdc || ""} onChange={e => setWalletForm(p => ({ ...p, usdc: e.target.value }))}
                          style={{ ...inp, marginTop: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }} placeholder="USDC address..." />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>BTC</label>
                        <input value={walletForm.btc} onChange={e => setWalletForm(p => ({ ...p, btc: e.target.value }))}
                          style={{ ...inp, marginTop: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }} placeholder="BTC address..." />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => {
                          setWallets(prev => prev.map(ww => ww.id === w.id ? { ...ww, ...walletForm } : ww));
                          setEditingWallet(null);
                        }}
                          style={{ padding: "8px 18px", background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
                        <button onClick={() => setEditingWallet(null)}
                          style={{ padding: "8px 18px", background: "transparent", border: "1px solid #E2E8F0", borderRadius: 8, color: "#64748B", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                          Wallets ({w.date ? (() => { const d = new Date(w.date + "T00:00:00"); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; })() : "—"})
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setEditingWallet(w.id); setWalletForm({ date: w.date || "", trc: w.trc || "", erc: w.erc || "", usdc: w.usdc || "", btc: w.btc || "" }); }}
                            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                          <button onClick={() => { trackDelete('wallets', w.id); setWallets(prev => prev.filter(ww => ww.id !== w.id)); }}
                            style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                        </div>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <tbody>
                          <tr style={{ borderBottom: "1px solid #CBD5E1" }}>
                            <td style={{ padding: "8px 0", fontWeight: 700, color: "#64748B", width: 120 }}>TRC:</td>
                            <td style={{ padding: "8px 0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#0F172A", wordBreak: "break-all" }}>{w.trc || "—"}</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #CBD5E1" }}>
                            <td style={{ padding: "8px 0", fontWeight: 700, color: "#64748B" }}>ERC USDT/USDC:</td>
                            <td style={{ padding: "8px 0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#0F172A", wordBreak: "break-all" }}>{w.erc || "—"}</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #CBD5E1" }}>
                            <td style={{ padding: "8px 0", fontWeight: 700, color: "#64748B" }}>USDC:</td>
                            <td style={{ padding: "8px 0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#0F172A", wordBreak: "break-all" }}>{w.usdc || "—"}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "8px 0", fontWeight: 700, color: "#64748B" }}>BTC:</td>
                            <td style={{ padding: "8px 0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#0F172A", wordBreak: "break-all" }}>{w.btc || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
      {addOpen && (
        <Modal title="Add New User" onClose={() => setAddOpen(false)}>
          <Field label="Name"><input style={inp} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Display name" /></Field>
          <Field label="Email"><input style={inp} type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="user@email.com" /></Field>
          <Field label="Password"><input style={inp} value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Password" /></Field>
          <Field label="Page Access">
            <PageAccessToggles access={newUser.pageAccess} onChange={pa => setNewUser(p => ({ ...p, pageAccess: pa }))} />
          </Field>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setAddOpen(false)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={handleAddUser} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(14,165,233,0.3)" }}>Add User</button>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <Field label="Name"><input style={inp} value={editUser.name} onChange={e => setEditUser(p => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Email"><input style={inp} type="email" value={editUser.email} onChange={e => setEditUser(p => ({ ...p, email: e.target.value }))} /></Field>
          <Field label="New Password"><input style={inp} value={editUser.password || ""} onChange={e => setEditUser(p => ({ ...p, password: e.target.value }))} placeholder="Leave blank to keep current" /></Field>
          {!isAdmin(editUser.email) && (
            <Field label="Page Access">
              <PageAccessToggles access={editUser.pageAccess || ALL_PAGES.map(p => p.key)} onChange={pa => setEditUser(p => ({ ...p, pageAccess: pa }))} />
            </Field>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setEditUser(null)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={handleUpdateUser} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(14,165,233,0.3)" }}>Save Changes</button>
          </div>
        </Modal>
      )}

      {/* ── Restore Database (Admin only) ── */}
      <RestoreDatabase user={user} />

      {/* Server Diagnostics — Admin only */}
      <ServerDiagnostics />

      {/* Delete Confirm */}
    </div>
  );
}

/* ── Restore Database (Admin only) ── */
function RestoreDatabase({ user }) {
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState(null);

  const fetchBackups = async () => {
    setBackupsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/backups`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBackups((Array.isArray(data) ? data : data.backups || []).slice(0, 3));
      }
    } catch (e) { console.error("Failed to fetch backups:", e); }
    setBackupsLoading(false);
  };

  const handleRestore = async (backupName) => {
    if (!confirm(`⚠️ RESTORE DATABASE\n\nThis will replace ALL current data with the backup:\n${backupName}\n\nThis cannot be undone. A safety backup of current data will be created first.\n\nAre you sure?`)) return;
    if (!confirm(`FINAL CONFIRMATION\n\nRestore from: ${backupName}\n\nAll current data will be overwritten. Continue?`)) return;
    setRestoreStatus(`Restoring ${backupName}...`);
    try {
      const res = await fetch(`${API_BASE}/restore/${encodeURIComponent(backupName)}`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ user: user?.email || "admin" })
      });
      const data = await res.json();
      if (data.ok) {
        setRestoreStatus(`✅ Restored from ${backupName}! Reloading...`);
        Object.values(LS_KEYS).forEach(k => { try { localStorage.removeItem(k); } catch {} });
        try { localStorage.removeItem(LS_VERSIONS_KEY); } catch {}
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setRestoreStatus(`❌ Restore failed: ${data.error || "Unknown error"}`);
      }
    } catch (e) { setRestoreStatus(`❌ Restore failed: ${e.message}`); }
  };

  const handleFileRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const tables = ['users', 'payments', 'customer-payments', 'crg-deals', 'daily-cap', 'deals', 'wallets', 'offers', 'ftd-entries'];
      const found = tables.filter(t => data[t] && Array.isArray(data[t]));
      if (found.length === 0) { alert("❌ Invalid backup file — no data tables found."); return; }
      const summary = found.map(t => `  ${t}: ${data[t].length} records`).join("\n");
      if (!confirm(`📦 Backup file: ${file.name}\n\nContains:\n${summary}\n\n⚠️ This will OVERWRITE all current data.\n\nContinue?`)) return;
      if (!confirm("FINAL CONFIRMATION — Restore now? This cannot be undone.")) return;
      setRestoreStatus("Uploading and restoring...");
      try { await fetch(`${API_BASE}/admin/backup`, { method: "POST", headers: authHeaders() }); } catch {}
      let ok = 0;
      for (const t of found) {
        try {
          const res = await fetch(`${API_BASE}/${t}`, {
            method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ data: data[t], version: 0, user: user?.email || "restore", forceOverwrite: true })
          });
          if (res.ok) ok++;
        } catch {}
      }
      if (ok > 0) {
        setRestoreStatus(`✅ Restored ${ok}/${found.length} tables from ${file.name}! Reloading...`);
        Object.values(LS_KEYS).forEach(k => { try { localStorage.removeItem(k); } catch {} });
        try { localStorage.removeItem(LS_VERSIONS_KEY); } catch {}
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setRestoreStatus("❌ Restore failed — no tables were saved successfully.");
      }
    } catch (err) { setRestoreStatus("❌ Invalid file: " + err.message); }
  };

  return (
    <div style={{ marginTop: 32, padding: "20px 24px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 14 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#92400E", marginBottom: 16 }}>🔄 Restore Database</div>

      {/* Server backups */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>Server Backups (last 3)</span>
          <button onClick={fetchBackups} style={{ padding: "6px 14px", borderRadius: 8, background: "#F59E0B", border: "none", color: "#FFF", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            {backupsLoading ? "Loading..." : "↻ Load Backups"}
          </button>
        </div>
        {backups.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {backups.map((b, i) => (
              <div key={b.name || i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#FFF", border: "1px solid #FDE68A", borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", fontFamily: "'JetBrains Mono',monospace" }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>
                    {b.files ? `${b.files} files` : ""}{b.date ? ` • ${new Date(b.date).toLocaleString()}` : b.timestamp ? ` • ${b.timestamp}` : ""}
                  </div>
                </div>
                <button onClick={() => handleRestore(b.name)}
                  style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#EF4444,#F87171)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                  ⏪ Restore
                </button>
              </div>
            ))}
          </div>
        )}
        {backups.length === 0 && !backupsLoading && (
          <div style={{ fontSize: 12, color: "#B45309", padding: "10px 14px", background: "#FFF", borderRadius: 8, border: "1px dashed #FDE68A" }}>Click "Load Backups" to fetch server backups, or use file upload below.</div>
        )}
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0" }}>
        <div style={{ flex: 1, height: 1, background: "#FDE68A" }} />
        <span style={{ fontSize: 12, color: "#B45309", fontWeight: 600 }}>OR</span>
        <div style={{ flex: 1, height: 1, background: "#FDE68A" }} />
      </div>

      {/* File upload restore */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#92400E", display: "block", marginBottom: 8 }}>Restore from Backup File</span>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px", background: "#FFF", border: "2px dashed #FDE68A", borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#F59E0B"; e.currentTarget.style.background = "#FFFEF5"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#FDE68A"; e.currentTarget.style.background = "#FFF"; }}
        >
          <span style={{ fontSize: 22 }}>📂</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#92400E" }}>Choose backup JSON file...</span>
          <input type="file" accept=".json" style={{ display: "none" }} onChange={handleFileRestore} />
        </label>
      </div>

      {restoreStatus && (
        <div style={{ marginTop: 10, fontSize: 13, color: restoreStatus.startsWith("✅") ? "#16A34A" : restoreStatus.startsWith("❌") ? "#DC2626" : "#92400E", padding: "10px 14px", background: "#FFF", borderRadius: 8, fontWeight: 500 }}>
          {restoreStatus}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#B45309", marginTop: 10 }}>⚠️ Restoring will overwrite ALL current data. A safety backup is created automatically first.</div>
    </div>
  );
}

/* ── Server Diagnostics (Admin only) ── */
function ServerDiagnostics() {
  const [diag, setDiag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDiag = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/diagnostics`, { headers: authHeaders(), signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`${res.status}`);
      setDiag(await res.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const downloadLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/logs/download`, { headers: authHeaders() });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `blitz-diagnostics-${new Date().toISOString().split('T')[0]}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError("Download failed: " + e.message); }
  };

  useEffect(() => { fetchDiag(); const iv = setInterval(fetchDiag, 30000); return () => clearInterval(iv); }, []);

  const cardStyle = { background: "#FFFFFF", borderRadius: 16, padding: 20, border: "1px solid rgba(99,102,241,0.1)", boxShadow: "0 2px 12px rgba(99,102,241,0.06)" };
  const labelStyle = { fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 };
  const valStyle = { fontSize: 20, fontWeight: 700, color: "#0F172A", fontFamily: "'JetBrains Mono',monospace" };

  if (loading && !diag) return <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>Loading diagnostics...</div>;
  if (error && !diag) return <div style={{ textAlign: "center", padding: 40, color: "#EF4444" }}>Error: {error}</div>;
  if (!diag) return null;

  const mem = diag.memory || {};
  const isHighMem = mem.heapUsed > 300;
  const history = diag.memoryHistory || [];

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Server Diagnostics</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchDiag} style={{ padding: "6px 14px", borderRadius: 8, background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#475569", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Refresh</button>
          <button onClick={downloadLogs} style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(14,165,233,0.3)" }}>Download Full Logs</button>
          <button onClick={async () => {
            if (!confirm("Remove duplicate CRG deals and Daily Cap entries? (Keeps the record with more data)")) return;
            try {
              const res = await fetch(`${API_BASE}/admin/dedup`, { method: "POST", headers: authHeaders() });
              const data = await res.json();
              if (data.ok) {
                const r = data.results;
                alert(`Dedup complete!\n\nCRG Deals: ${r["crg-deals"]?.removed || 0} duplicates removed\nDaily Cap: ${r["daily-cap"]?.removed || 0} duplicates removed`);
                fetchDiag();
              }
            } catch (e) { alert("Dedup failed: " + e.message); }
          }} style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#F59E0B,#FBBF24)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(245,158,11,0.3)" }}>🧹 Dedup Data</button>
          <button onClick={async () => {
            try {
              const res = await fetch(`${API_BASE}/admin/backup`, { method: "POST", headers: authHeaders() });
              const data = await res.json();
              if (data.ok) alert(`✅ Backup created: ${data.backup}\n\nUse this before deploying new versions!`);
              else alert("❌ Backup failed: " + (data.error || "Unknown error"));
            } catch (e) { alert("❌ Backup failed: " + e.message); }
          }} style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#8B5CF6,#A78BFA)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(139,92,246,0.3)" }}>💾 Create Backup</button>
          <button onClick={async () => {
            try {
              const res = await fetch(`${API_BASE}/telegram/screenshot/all`, { method: "POST", headers: authHeaders() });
              const data = await res.json();
              if (data.ok) alert("✅ Both screenshots sent to Telegram!");
              else alert("❌ " + (data.error || "Failed to send screenshots"));
            } catch (e) { alert("❌ " + e.message); }
          }} style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(16,185,129,0.3)" }}>📸 Send All Screenshots</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={cardStyle}><div style={labelStyle}>Version</div><div style={valStyle}>{diag.server?.version || "—"}</div></div>
        <div style={cardStyle}><div style={labelStyle}>Uptime</div><div style={valStyle}>{diag.server?.uptimeFormatted || "—"}</div></div>
        <div style={cardStyle}><div style={labelStyle}>Heap Used</div><div style={{ ...valStyle, color: isHighMem ? "#EF4444" : "#10B981" }}>{mem.heapUsed || 0} MB</div></div>
        <div style={cardStyle}><div style={labelStyle}>RSS Memory</div><div style={valStyle}>{mem.rss || 0} MB</div></div>
        <div style={cardStyle}><div style={labelStyle}>WS Clients</div><div style={valStyle}>{diag.connections?.webSocketClients || 0}</div></div>
        <div style={cardStyle}><div style={labelStyle}>Sessions</div><div style={valStyle}>{diag.connections?.activeSessions || 0}</div></div>
        <div style={cardStyle}><div style={labelStyle}>Crashes</div><div style={{ ...valStyle, color: (diag.server?.crashes || 0) > 0 ? "#EF4444" : "#10B981" }}>{diag.server?.crashes || 0}</div></div>
        <div style={cardStyle}><div style={labelStyle}>TG Errors</div><div style={{ ...valStyle, color: (diag.telegram?.pollingErrors || 0) > 5 ? "#EF4444" : "#10B981" }}>{diag.telegram?.pollingErrors || 0}</div></div>
        <div style={cardStyle}><div style={labelStyle}>Backups</div><div style={{ ...valStyle, color: (diag.backups?.count || 0) > 0 ? "#10B981" : "#EF4444" }}>{diag.backups?.count || 0}</div><div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{diag.backups?.latest ? `Latest: ${diag.backups.latest.slice(0,19)}` : "No backups!"}</div></div>
      </div>

      {/* v9.06: Crash Log — show recent crashes if any */}
      {diag.server?.recentCrashes && diag.server.recentCrashes.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16, borderLeft: "3px solid #EF4444" }}>
          <div style={labelStyle}>⚠️ Recent Crashes ({diag.server.recentCrashes.length})</div>
          <div style={{ maxHeight: 150, overflowY: "auto", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6, color: "#DC2626" }}>
            {diag.server.recentCrashes.slice(-5).reverse().map((c, i) => (
              <div key={i} style={{ marginBottom: 4, padding: "4px 8px", background: "rgba(239,68,68,0.05)", borderRadius: 4 }}>
                <span style={{ color: "#94A3B8" }}>{c.time?.slice(11,19) || "?"}</span> [{c.type}] {c.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={labelStyle}>Memory Trend (Last {history.length} min)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 60, marginTop: 8 }}>
            {history.map((h, i) => {
              const maxH = Math.max(...history.map(x => x.heapUsed), 100);
              const pct = (h.heapUsed / maxH) * 100;
              return <div key={i} style={{ flex: 1, background: h.heapUsed > 300 ? "#EF4444" : h.heapUsed > 200 ? "#F59E0B" : "#10B981", height: `${pct}%`, borderRadius: 2, minWidth: 2 }} title={`${h.heapUsed}MB at ${h.timestamp?.split('T')[1]?.slice(0,5) || ''}`} />;
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginTop: 4 }}>
            <span>{history[0]?.timestamp?.split('T')[1]?.slice(0,5) || ''}</span>
            <span>{history[history.length-1]?.timestamp?.split('T')[1]?.slice(0,5) || ''}</span>
          </div>
        </div>
      )}

      {diag.data && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={labelStyle}>Data Records</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
            {Object.entries(diag.data).map(([k, v]) => (
              <span key={k} style={{ fontSize: 12, color: "#475569" }}><strong>{k}:</strong> {v}</span>
            ))}
          </div>
        </div>
      )}

      {/* v9.06: Audit Trail — "Who changed what and when" */}
      {diag.recentAudit && diag.recentAudit.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={labelStyle}>📋 Recent Activity (Audit Trail)</div>
          <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 8 }}>
            {diag.recentAudit.map((auditFile, fi) => (
              <div key={fi}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", padding: "6px 0 4px", borderBottom: "1px solid #E2E8F0", marginBottom: 4 }}>{auditFile.file}</div>
                {(auditFile.entries || []).slice(-20).reverse().map((entry, ei) => {
                  if (typeof entry === 'string') return null;
                  const timeStr = entry.timestamp ? entry.timestamp.slice(11, 19) : "?";
                  const actionColor = { login_success: "#10B981", logout: "#94A3B8", update: "#0EA5E9", create: "#8B5CF6", delete: "#EF4444", shutdown: "#F59E0B", blocked_request: "#DC2626", "auto-dedup": "#F59E0B", restore: "#6366F1" }[entry.action] || "#475569";
                  return (
                    <div key={ei} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", fontSize: 11, borderBottom: "1px solid #F8FAFC" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#94A3B8", minWidth: 55 }}>{timeStr}</span>
                      <span style={{ padding: "1px 6px", borderRadius: 4, background: `${actionColor}15`, color: actionColor, fontWeight: 700, fontSize: 10, minWidth: 55, textAlign: "center" }}>{entry.action}</span>
                      <span style={{ color: "#64748B", fontWeight: 600, minWidth: 70 }}>{entry.table}</span>
                      <span style={{ color: "#94A3B8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.user?.split("@")[0] || "system"} — {(entry.details || "").slice(0, 60)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Dashboard ── */
// ═══════════════════════════════════════════════════════════════
// OVERVIEW DASHBOARD — Dedicated analytics & KPI page
// ═══════════════════════════════════════════════════════════════
function OverviewDashboard({ user, onLogout, onNav, payments: rawOvPayments, crgDeals: rawOvCrg, dcEntries: rawOvDc, cpPayments: rawOvCp, dealsData: rawOvDeals, partnersData: rawOvPartners, userAccess }) {
  const payments = Array.isArray(rawOvPayments) ? rawOvPayments : [];
  const crgDeals = Array.isArray(rawOvCrg) ? rawOvCrg : [];
  const dcEntries = Array.isArray(rawOvDc) ? rawOvDc : [];
  const cpPayments = Array.isArray(rawOvCp) ? rawOvCp : [];
  const offers = Array.isArray(rawOvDeals) ? rawOvDeals : [];
  const partnersAll = Array.isArray(rawOvPartners) ? rawOvPartners : [];
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // ── Period selector state ──
  const [period, setPeriod] = useState("today"); // today | week | month | custom
  const [compare, setCompare] = useState(true);
  const [customRange, setCustomRange] = useState({ from: today, to: today });
  const [periodDropOpen, setPeriodDropOpen] = useState(false);

  // ── Date range helpers ──
  const getDateRange = (p) => {
    const d = new Date();
    if (p === "today") return { from: today, to: today, label: "Today", prevLabel: "Yesterday" };
    if (p === "yesterday") { d.setDate(d.getDate() - 1); const y = d.toISOString().split("T")[0]; return { from: y, to: y, label: "Yesterday", prevLabel: "Day before" }; }
    if (p === "week") {
      const dayOfWeek = d.getDay() || 7;
      const mon = new Date(d); mon.setDate(d.getDate() - dayOfWeek + 1);
      return { from: mon.toISOString().split("T")[0], to: today, label: "This Week", prevLabel: "Last Week" };
    }
    if (p === "month") {
      const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      return { from: first, to: today, label: "This Month", prevLabel: "Last Month" };
    }
    if (p === "custom") return { from: customRange.from, to: customRange.to, label: "Custom", prevLabel: "Prev Period" };
    return { from: today, to: today, label: "Today", prevLabel: "Yesterday" };
  };

  const getPrevRange = (range) => {
    const fromDate = new Date(range.from + "T00:00:00");
    const toDate = new Date(range.to + "T00:00:00");
    const span = Math.max(1, Math.round((toDate - fromDate) / 86400000) + 1);
    const prevTo = new Date(fromDate); prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - span + 1);
    return { from: prevFrom.toISOString().split("T")[0], to: prevTo.toISOString().split("T")[0] };
  };

  const range = getDateRange(period);
  const prevRange = getPrevRange(range);

  // Filter helpers
  const inRange = (dateStr, r) => dateStr >= r.from && dateStr <= r.to;
  const inRangeMonth = (month, year, r) => {
    // For payment records that store month/year separately
    const payDate = `${year}-${String(month + 1).padStart(2, "0")}-15`;
    return payDate >= r.from && payDate <= r.to;
  };

  // ── FINANCE — current period ──
  const curPaid = payments.filter(p => p.status === "Paid" && inRange(p.paidDate || "", range));
  const curPaidTotal = curPaid.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const curCp = cpPayments.filter(p => inRange(p.date || p.receivedDate || "", range));
  const curCpTotal = curCp.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const openPay = payments.filter(p => OPEN_STATUSES.includes(p.status));
  const openPayTotal = openPay.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  // Previous period
  const prevPaid = payments.filter(p => p.status === "Paid" && inRange(p.paidDate || "", prevRange));
  const prevPaidTotal = prevPaid.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const prevCp = cpPayments.filter(p => inRange(p.date || p.receivedDate || "", prevRange));
  const prevCpTotal = prevCp.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  // ── CRG DEALS ──
  const curCrg = crgDeals.filter(d => inRange(d.date || "", range));
  const curCap = curCrg.reduce((s, d) => s + (parseInt(d.cap) || 0), 0);
  const curStarted = curCrg.filter(d => d.started).length;
  const curFtd = curCrg.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);
  const curConv = curStarted > 0 ? ((curFtd / curStarted) * 100).toFixed(1) : "0";

  const prevCrg = crgDeals.filter(d => inRange(d.date || "", prevRange));
  const prevCapVal = prevCrg.reduce((s, d) => s + (parseInt(d.cap) || 0), 0);
  const prevStartedVal = prevCrg.filter(d => d.started).length;
  const prevFtdVal = prevCrg.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);

  // Extract country from CRG affiliate field (e.g. "33 AU" → "AU")
  const extractCountry = (aff) => { const m = (aff || "").match(/[A-Z]{2,4}$/); return m ? m[0] : "??"; };

  // Top 5 countries
  const crgCountryMap = {};
  curCrg.forEach(d => { const c = extractCountry(d.affiliate); crgCountryMap[c] = (crgCountryMap[c] || 0) + 1; });
  const topCrgCountries = Object.entries(crgCountryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top brokers
  const brokerCapMap = {};
  curCrg.forEach(d => { const b = (d.brokerCap || "").trim(); if (b) brokerCapMap[b] = (brokerCapMap[b] || 0) + (parseInt(d.cap) || 0); });
  const topBrokers = Object.entries(brokerCapMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top affiliates
  const affCapMap = {};
  curCrg.forEach(d => { const a = (d.affiliate || "").trim(); if (a) affCapMap[a] = (affCapMap[a] || 0) + (parseInt(d.cap) || 0); });
  const topAffCap = Object.entries(affCapMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── AGENTS ──
  const curDc = dcEntries.filter(d => inRange(d.date || "", range));
  const agentAff = {}, agentBrand = {};
  curDc.forEach(d => {
    const agent = normalizeAgent((d.agent || "").trim());
    if (!agent) return;
    agentAff[agent] = (agentAff[agent] || 0) + (parseInt(d.affiliates) || 0);
    agentBrand[agent] = (agentBrand[agent] || 0) + (parseInt(d.brands) || 0);
  });
  const agentList = [...new Set([...Object.keys(agentAff), ...Object.keys(agentBrand)])].sort();

  // Agent CRG CAP
  const agentCap = {};
  curCrg.forEach(d => { const a = normalizeAgent((d.manageAff || "").trim()); if (a) agentCap[a] = (agentCap[a] || 0) + (parseInt(d.cap) || 0); });
  const topAgents = Object.entries(agentCap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── OFFERS ──
  const offerCountryMap = {};
  offers.forEach(d => { const c = (d.country || "").trim().toUpperCase(); if (c) offerCountryMap[c] = (offerCountryMap[c] || 0) + 1; });
  const topOfferCountries = Object.entries(offerCountryMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // ── CHART DATA — daily breakdown for the period ──
  const getDaysArray = (from, to) => {
    const days = []; const d = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    while (d <= end) { days.push(d.toISOString().split("T")[0]); d.setDate(d.getDate() + 1); }
    return days;
  };
  const chartDays = getDaysArray(range.from, range.to);
  const prevDays = getDaysArray(prevRange.from, prevRange.to);

  const chartData = chartDays.map((date, i) => {
    const dayCrg = crgDeals.filter(d => d.date === date);
    const dayPay = payments.filter(p => p.status === "Paid" && p.paidDate === date);
    const prevDate = prevDays[i] || "";
    const prevDayCrg = crgDeals.filter(d => d.date === prevDate);
    const prevDayPay = payments.filter(p => p.status === "Paid" && p.paidDate === prevDate);
    return {
      date: date.slice(5), // MM-DD
      fullDate: date,
      cap: dayCrg.reduce((s, d) => s + (parseInt(d.cap) || 0), 0),
      ftd: dayCrg.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0),
      deals: dayCrg.length,
      paid: dayPay.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      prevCap: prevDayCrg.reduce((s, d) => s + (parseInt(d.cap) || 0), 0),
      prevFtd: prevDayCrg.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0),
      prevDeals: prevDayCrg.length,
      prevPaid: prevDayPay.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
    };
  });

  // Chart metric selector
  const [chartMetric, setChartMetric] = useState("cap"); // cap | ftd | deals | paid

  // ── Comparison % helper ──
  const pctChange = (cur, prev) => {
    if (prev === 0 && cur === 0) return null;
    if (prev === 0) return { pct: 100, up: true };
    const change = ((cur - prev) / prev) * 100;
    return { pct: Math.abs(change).toFixed(1), up: change >= 0 };
  };

  // ── Styles ──
  const cardStyle = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)" };
  const sectionTitle = (icon, title) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#334155" }}>{title}</h3>
    </div>
  );

  const rankedBar = (entries, maxVal, color, unit) => entries.map(([name, val], i) => (
    <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#F59E0B" : "#64748B", width: 16 }}>{i + 1}.</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#334155", minWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={name}>{name}</span>
      <div style={{ flex: 1, height: 6, background: "#F1F5F9", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: (maxVal > 0 ? (val / maxVal) * 100 : 0) + "%", background: i === 0 ? color : "#CBD5E1", borderRadius: 5, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#334155", minWidth: 45, textAlign: "right" }}>{val.toLocaleString()}{unit ? " " + unit : ""}</span>
    </div>
  ));

  // KPI card with comparison
  const KpiCard = ({ label, value, prevValue, icon, accent, bg, onClick, prefix, suffix }) => {
    const ch = compare ? pctChange(typeof value === "string" ? parseFloat(value) || 0 : value, prevValue || 0) : null;
    return (
      <div onClick={onClick} style={{ background: bg, border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : "default", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.1), 0 0 0 2px ${accent}22`; } }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}88)`, borderRadius: "14px 14px 0 0" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: accent }}>{prefix || ""}{typeof value === "number" ? value.toLocaleString() : value}{suffix || ""}</div>
            {compare && ch !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: ch.up ? "#10B981" : "#EF4444" }}>
                  {ch.up ? "↑" : "↓"} {ch.pct}%
                </span>
                <span style={{ fontSize: 10, color: "#94A3B8" }}>vs {range.prevLabel.toLowerCase()}</span>
              </div>
            )}
            {compare && ch === null && prevValue !== undefined && (
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Prev: {prefix || ""}{(prevValue || 0).toLocaleString()}{suffix || ""}</div>
            )}
          </div>
          <span style={{ fontSize: 24 }}>{icon}</span>
        </div>
      </div>
    );
  };

  // ── Period selector dropdown ──
  const PeriodSelector = () => (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setPeriodDropOpen(!periodDropOpen)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "#FFF", border: "2px solid #6366F1", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#6366F1" }}>
        <span>{range.label}</span>
        <span style={{ fontSize: 10 }}>▼</span>
      </button>
      {periodDropOpen && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", zIndex: 100, minWidth: 220, overflow: "hidden" }}>
          {[
            { key: "today", label: "Today", icon: "📅" },
            { key: "yesterday", label: "Yesterday", icon: "⏪" },
            { key: "week", label: "This Week", icon: "📆" },
            { key: "month", label: "This Month", icon: "🗓️" },
          ].map(opt => (
            <div key={opt.key} onClick={() => { setPeriod(opt.key); setPeriodDropOpen(false); }}
              style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: period === opt.key ? "#EEF2FF" : "transparent", borderLeft: period === opt.key ? "3px solid #6366F1" : "3px solid transparent", transition: "all 0.15s" }}
              onMouseEnter={e => { if (period !== opt.key) e.currentTarget.style.background = "#F8FAFC"; }}
              onMouseLeave={e => { if (period !== opt.key) e.currentTarget.style.background = "transparent"; }}>
              <span>{opt.icon}</span>
              <span style={{ fontSize: 13, fontWeight: period === opt.key ? 700 : 500, color: period === opt.key ? "#6366F1" : "#334155" }}>{opt.label}</span>
              {period === opt.key && <span style={{ marginLeft: "auto", color: "#6366F1", fontSize: 14 }}>✓</span>}
            </div>
          ))}
          <div style={{ borderTop: "1px solid #E2E8F0", padding: "10px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setCompare(!compare)}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Compare to previous period</span>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: compare ? "#6366F1" : "#CBD5E1", padding: 2, transition: "background 0.2s", cursor: "pointer" }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: "#FFF", transform: compare ? "translateX(16px)" : "translateX(0)", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #E2E8F0", padding: "10px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Custom Range</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="date" value={customRange.from} onChange={e => setCustomRange(p => ({ ...p, from: e.target.value }))}
                style={{ flex: 1, padding: "4px 6px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 11 }} />
              <span style={{ color: "#94A3B8", fontSize: 11 }}>→</span>
              <input type="date" value={customRange.to} onChange={e => setCustomRange(p => ({ ...p, to: e.target.value }))}
                style={{ flex: 1, padding: "4px 6px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 11 }} />
            </div>
            <button onClick={() => { setPeriod("custom"); setPeriodDropOpen(false); }}
              style={{ marginTop: 6, width: "100%", padding: "6px", borderRadius: 6, background: "#6366F1", border: "none", color: "#FFF", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Area Chart Component ──
  const AreaChart = ({ data, currentKey, prevKey, color, prevColor, height, showLabels }) => {
    if (!data || data.length === 0) return null;
    const vals = data.map(d => d[currentKey] || 0);
    const prevVals = compare ? data.map(d => d[prevKey] || 0) : [];
    const allVals = [...vals, ...prevVals];
    const maxVal = Math.max(...allVals, 1);
    const w = 100;
    const h = height || 120;
    const padX = 0; const padY = 5;
    const plotW = w; const plotH = h - padY * 2;

    const toPoint = (arr, i) => {
      const x = arr.length > 1 ? (i / (arr.length - 1)) * plotW : plotW / 2;
      const y = padY + plotH - (arr[i] / maxVal) * plotH;
      return `${x},${y}`;
    };

    const makePath = (arr) => arr.map((_, i) => toPoint(arr, i)).join(" ");
    const makeArea = (arr) => {
      const points = arr.map((_, i) => toPoint(arr, i));
      return `${padX},${h - padY} ${points.join(" ")} ${plotW},${h - padY}`;
    };

    return (
      <div style={{ position: "relative", width: "100%", height: h }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <line key={pct} x1={0} x2={w} y1={padY + plotH * (1 - pct)} y2={padY + plotH * (1 - pct)} stroke="#F1F5F9" strokeWidth="0.3" />
          ))}
          {/* Previous period area */}
          {compare && prevVals.length > 0 && (
            <>
              <polygon points={makeArea(prevVals)} fill={prevColor || "#FDE68A"} opacity="0.4" />
              <polyline points={makePath(prevVals)} fill="none" stroke={prevColor || "#F59E0B"} strokeWidth="0.5" opacity="0.6" />
            </>
          )}
          {/* Current period area */}
          <polygon points={makeArea(vals)} fill={color || "#818CF8"} opacity="0.3" />
          <polyline points={makePath(vals)} fill="none" stroke={color || "#6366F1"} strokeWidth="0.7" />
          {/* Data points */}
          {vals.map((v, i) => (
            <circle key={i} cx={parseFloat(toPoint(vals, i).split(",")[0])} cy={parseFloat(toPoint(vals, i).split(",")[1])} r="0.8" fill={color || "#6366F1"} />
          ))}
        </svg>
        {/* X-axis labels */}
        {showLabels !== false && data.length <= 31 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            {data.filter((_, i) => data.length <= 7 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1).map((d, i) => (
              <span key={i} style={{ fontSize: 9, color: "#94A3B8" }}>{d.date}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const metricOptions = [
    { key: "cap", label: "CAP", color: "#6366F1", prev: "prevCap" },
    { key: "ftd", label: "FTD", color: "#F59E0B", prev: "prevFtd" },
    { key: "deals", label: "Deals", color: "#10B981", prev: "prevDeals" },
    { key: "paid", label: "Paid $", color: "#0EA5E9", prev: "prevPaid" },
  ];
  const activeMetric = metricOptions.find(m => m.key === chartMetric) || metricOptions[0];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="overview" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#6366F1" />

      <main className="blitz-main" style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>
        {/* ═══ Header + Period Selector ═══ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>📊 Dashboard</h2>
          <CurrencyBadges />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {compare && <span style={{ fontSize: 11, color: "#94A3B8", background: "#F8FAFC", padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E8F0" }}>vs {range.prevLabel} ({prevRange.from.slice(5)} → {prevRange.to.slice(5)})</span>}
            <PeriodSelector />
          </div>
        </div>

        {/* ═══════════ FIX 9.20: PERFORMANCE OVERVIEW ═══════════ */}
        {(() => {
          const FTD_TARGET = 200;
          const monthCrg = crgDeals.filter(d => {
            if (!d.date) return false;
            return d.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
          });
          const monthFtd = monthCrg.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);
          const ftdPct = Math.min(100, FTD_TARGET > 0 ? (monthFtd / FTD_TARGET) * 100 : 0);

          const todayCrg = crgDeals.filter(d => d.date === today);
          const todayCap = todayCrg.reduce((s, d) => s + (parseInt(d.cap) || 0), 0);
          const todayCapReceived = todayCrg.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0);
          const dailyLimit = todayCap || 1;
          const capPct = Math.min(100, dailyLimit > 0 ? (todayCapReceived / dailyLimit) * 100 : 0);

          const getColor = pct => pct < 30 ? "#EF4444" : pct < 75 ? "#F59E0B" : "#10B981";
          const getColorBg = pct => pct < 30 ? "rgba(239,68,68,0.1)" : pct < 75 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)";

          const RadialProgress = ({ pct, color, bg, label, value, total, size = 120 }) => {
            const r = (size - 12) / 2;
            const circ = 2 * Math.PI * r;
            const offset = circ - (circ * Math.min(pct, 100)) / 100;
            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                  <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={10} />
                  <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                </svg>
                <div style={{ position: "relative", marginTop: -size + 10, height: size - 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color }}>{Math.round(pct)}%</div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{value} / {total}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", textAlign: "center", marginTop: 4 }}>{label}</div>
              </div>
            );
          };

          return (
            <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", marginBottom: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Performance Overview</span>
                <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginLeft: "auto" }}>March {now.getFullYear()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 60, flexWrap: "wrap" }}>
                <RadialProgress pct={ftdPct} color={getColor(ftdPct)} bg={getColorBg(ftdPct)} label="FTD Target (March)" value={monthFtd} total={FTD_TARGET} size={140} />
                <RadialProgress pct={capPct} color={getColor(capPct)} bg={getColorBg(capPct)} label="Daily CAP Usage" value={todayCapReceived} total={todayCap || 0} size={140} />
              </div>
            </div>
          );
        })()}

        {/* ═══════════ FINANCE ═══════════ */}
        {sectionTitle("💰", "Finance")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 28 }}>
          <KpiCard label="Payments" value={curPaidTotal} prevValue={prevPaidTotal} icon="💳" accent="#10B981" bg="linear-gradient(135deg,#ECFDF5,#D1FAE5)" onClick={() => onNav("payments")} prefix="$" />
          <KpiCard label="Customer Payments" value={curCpTotal} prevValue={prevCpTotal} icon="🏦" accent="#0EA5E9" bg="#EFF6FF" onClick={() => onNav("customers")} prefix="$" />
          <KpiCard label="Open Payments" value={openPayTotal} icon="⏳" accent="#EF4444" bg="#FEF2F2" onClick={() => onNav("payments")} prefix="$" />
          <KpiCard label={"Paid Count"} value={curPaid.length} prevValue={prevPaid.length} icon="📝" accent="#8B5CF6" bg="linear-gradient(135deg,#F5F3FF,#EDE9FE)" />
          <KpiCard label="CP Count" value={curCp.length} prevValue={prevCp.length} icon="📋" accent="#6366F1" bg="#EEF2FF" />
        </div>

        {/* ═══════════ CRG DEALS ═══════════ */}
        {sectionTitle("📋", "CRG Deals")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
          <KpiCard label="CAP" value={curCap} prevValue={prevCapVal} icon="📊" accent="#6366F1" bg="#EEF2FF" onClick={() => onNav("crg")} />
          <KpiCard label="Deals" value={curCrg.length} prevValue={prevCrg.length} icon="📝" accent="#F59E0B" bg="linear-gradient(135deg,#FFFBEB,#FEF3C7)" onClick={() => onNav("crg")} />
          <KpiCard label="Started" value={curStarted} prevValue={prevStartedVal} icon="🚀" accent="#10B981" bg="linear-gradient(135deg,#ECFDF5,#D1FAE5)" />
          <KpiCard label="FTD" value={curFtd} prevValue={prevFtdVal} icon="🎯" accent="#F59E0B" bg="#FFFBEB" />
          <KpiCard label="Conversion" value={curConv} icon="📈" accent="#0EA5E9" bg="#EFF6FF" suffix="%" />
        </div>

        {/* ═══ Chart — Period Trend with metric selector ═══ */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>📉 {range.label} Trend</div>
            <div style={{ display: "flex", gap: 4 }}>
              {metricOptions.map(m => (
                <button key={m.key} onClick={() => setChartMetric(m.key)}
                  style={{ padding: "4px 12px", borderRadius: 6, border: chartMetric === m.key ? `2px solid ${m.color}` : "1px solid #E2E8F0", background: chartMetric === m.key ? m.color + "15" : "#FFF", color: chartMetric === m.key ? m.color : "#64748B", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>{m.label}</button>
              ))}
            </div>
          </div>
          <AreaChart data={chartData} currentKey={activeMetric.key} prevKey={activeMetric.prev} color={activeMetric.color} prevColor="#F59E0B" height={140} />
          <div style={{ display: "flex", gap: 20, marginTop: 10, borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 4, borderRadius: 2, background: activeMetric.color }} /><span style={{ fontSize: 11, color: "#64748B" }}>{range.label}: <b style={{ color: activeMetric.color }}>{chartData.reduce((s, d) => s + (d[activeMetric.key] || 0), 0).toLocaleString()}</b></span></div>
            {compare && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 4, borderRadius: 2, background: "#F59E0B" }} /><span style={{ fontSize: 11, color: "#64748B" }}>{range.prevLabel}: <b style={{ color: "#F59E0B" }}>{chartData.reduce((s, d) => s + (d[activeMetric.prev] || 0), 0).toLocaleString()}</b></span></div>}
          </div>
        </div>

        {/* ═══ CRG Rankings ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 12 }}>🌍 Top 5 Countries (CRG)</div>
            {topCrgCountries.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 12 }}>No data</div> : rankedBar(topCrgCountries, topCrgCountries[0]?.[1] || 1, "#6366F1", "deals")}
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 12 }}>🏢 Top Broker CAP</div>
            {topBrokers.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 12 }}>No data</div> : rankedBar(topBrokers, topBrokers[0]?.[1] || 1, "#10B981", "cap")}
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 12 }}>👤 Top Affiliate CAP</div>
            {topAffCap.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 12 }}>No data</div> : rankedBar(topAffCap, topAffCap[0]?.[1] || 1, "#F59E0B", "cap")}
          </div>
        </div>

        {/* ═══════════ AGENTS ═══════════ */}
        {sectionTitle("👥", `Agents — ${range.label} Summary`)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
          {/* Top Agents by CAP */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 10 }}>🔥 Top Agents (CAP)</div>
            {topAgents.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 12 }}>No data</div> :
              topAgents.map(([name, cap], i) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#F59E0B" : "#64748B", width: 16 }}>{i + 1}.</span>
                  <span style={{ display: "inline-block", padding: "3px 0", background: getPersonColor(name), color: "#FFF", fontWeight: 700, fontSize: 11, textAlign: "center", width: 60, borderRadius: 4 }}>{name}</span>
                  <div style={{ flex: 1, height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: (topAgents[0][1] > 0 ? (cap / topAgents[0][1]) * 100 : 0) + "%", background: i === 0 ? "linear-gradient(90deg, #F59E0B, #FBBF24)" : "#CBD5E1", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#334155", minWidth: 35, textAlign: "right" }}>{cap}</span>
                </div>
              ))
            }
          </div>
          {/* Affiliates per Agent */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 10 }}>📊 Affiliates / Agent</div>
            {agentList.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 12 }}>No data</div> :
              agentList.map(agent => (
                <div key={agent} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ display: "inline-block", padding: "2px 0", background: getPersonColor(agent), color: "#FFF", fontWeight: 700, fontSize: 10, textAlign: "center", width: 55, borderRadius: 4 }}>{agent}</span>
                  <div style={{ flex: 1, height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: (Math.max(...Object.values(agentAff), 1) > 0 ? ((agentAff[agent] || 0) / Math.max(...Object.values(agentAff), 1)) * 100 : 0) + "%", background: "#6366F1", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#334155", minWidth: 30, textAlign: "right" }}>{(agentAff[agent] || 0)}</span>
                </div>
              ))
            }
            {agentList.length > 0 && <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 4, marginTop: 6, textAlign: "right", fontSize: 11, fontWeight: 800, color: "#6366F1" }}>Total: {Object.values(agentAff).reduce((s, v) => s + v, 0)}</div>}
          </div>
          {/* Brands per Agent */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 10 }}>🏢 Brands / Agent</div>
            {agentList.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 12 }}>No data</div> :
              agentList.map(agent => (
                <div key={agent} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ display: "inline-block", padding: "2px 0", background: getPersonColor(agent), color: "#FFF", fontWeight: 700, fontSize: 10, textAlign: "center", width: 55, borderRadius: 4 }}>{agent}</span>
                  <div style={{ flex: 1, height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: (Math.max(...Object.values(agentBrand), 1) > 0 ? ((agentBrand[agent] || 0) / Math.max(...Object.values(agentBrand), 1)) * 100 : 0) + "%", background: "#10B981", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#334155", minWidth: 30, textAlign: "right" }}>{(agentBrand[agent] || 0)}</span>
                </div>
              ))
            }
            {agentList.length > 0 && <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 4, marginTop: 6, textAlign: "right", fontSize: 11, fontWeight: 800, color: "#10B981" }}>Total: {Object.values(agentBrand).reduce((s, v) => s + v, 0)}</div>}
          </div>
        </div>

        {/* ═══ Agent Targets Table ═══ */}
        {(() => {
          const targetKey = `blitz_cap_targets_${now.getFullYear()}_${now.getMonth()}`;
          const savedTgt = JSON.parse(localStorage.getItem(targetKey) || '{}');
          const getAgentTgt = (agent) => { const v = savedTgt[agent]; if (!v) return [0,0]; const p = String(v).split(","); return [parseInt(p[0]) || 0, parseInt(p[1]) || 0]; };
          const [editTgt, setEditTgt] = useState(false);
          const [tmpTgt, setTmpTgt] = useState({...savedTgt});
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const dayOfMonth = now.getDate();
          const pace = dayOfMonth / daysInMonth;
          const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const monthDcAll = dcEntries.filter(d => (d.date || "").startsWith(monthPrefix));
          const todayStr = now.toISOString().split("T")[0];
          const todayDc = dcEntries.filter(d => d.date === todayStr);
          const todayBrands = todayDc.reduce((s, d) => s + (parseInt(d.brands) || 0), 0);
          const todayAff = todayDc.reduce((s, d) => s + (parseInt(d.affiliates) || 0), 0);
          const mAgentAff = {}; const mAgentBrand = {};
          monthDcAll.forEach(d => {
            let a = normalizeAgent((d.agent || "").trim());
            if (!a) return;
            // Split Alex/Kate (and similar combos) 50/50 into Alex and Katie
            if (/alex.*kate|kate.*alex/i.test(a)) {
              const aff = parseInt(d.affiliates) || 0;
              const brd = parseInt(d.brands) || 0;
              mAgentAff["Alex"] = (mAgentAff["Alex"] || 0) + Math.round(aff / 2);
              mAgentBrand["Alex"] = (mAgentBrand["Alex"] || 0) + Math.round(brd / 2);
              mAgentAff["Katie"] = (mAgentAff["Katie"] || 0) + Math.floor(aff / 2);
              mAgentBrand["Katie"] = (mAgentBrand["Katie"] || 0) + Math.floor(brd / 2);
              return;
            }
            mAgentAff[a] = (mAgentAff[a] || 0) + (parseInt(d.affiliates) || 0);
            mAgentBrand[a] = (mAgentBrand[a] || 0) + (parseInt(d.brands) || 0);
          });
          const tAgentAff = {}; const tAgentBrand = {};
          todayDc.forEach(d => {
            let a = normalizeAgent((d.agent || "").trim());
            if (!a) return;
            // Split Alex/Kate 50/50 for today too
            if (/alex.*kate|kate.*alex/i.test(a)) {
              const aff = parseInt(d.affiliates) || 0;
              const brd = parseInt(d.brands) || 0;
              tAgentAff["Alex"] = (tAgentAff["Alex"] || 0) + Math.round(aff / 2);
              tAgentBrand["Alex"] = (tAgentBrand["Alex"] || 0) + Math.round(brd / 2);
              tAgentAff["Katie"] = (tAgentAff["Katie"] || 0) + Math.floor(aff / 2);
              tAgentBrand["Katie"] = (tAgentBrand["Katie"] || 0) + Math.floor(brd / 2);
              return;
            }
            tAgentAff[a] = (tAgentAff[a] || 0) + (parseInt(d.affiliates) || 0);
            tAgentBrand[a] = (tAgentBrand[a] || 0) + (parseInt(d.brands) || 0);
          });
          const totalBrands = Object.values(mAgentBrand).reduce((s, v) => s + v, 0);
          const totalAff = Object.values(mAgentAff).reduce((s, v) => s + v, 0);
          const avgBrands = dayOfMonth > 0 ? (totalBrands / dayOfMonth).toFixed(1) : 0;
          const avgAff = dayOfMonth > 0 ? (totalAff / dayOfMonth).toFixed(1) : 0;
          const tgtAgents = Object.keys(savedTgt).filter(k => !k.startsWith("__"));
          const allA = [...new Set([...Object.keys(mAgentAff), ...Object.keys(mAgentBrand), ...Object.keys(tAgentAff), ...Object.keys(tAgentBrand), ...tgtAgents])].sort();
          const totalBrandTgt = allA.reduce((s, a) => s + getAgentTgt(a)[0], 0);
          const totalAffTgt = allA.reduce((s, a) => s + getAgentTgt(a)[1], 0);
          const brandPct = totalBrandTgt > 0 ? Math.round((totalBrands / totalBrandTgt) * 100) : null;
          const affPct = totalAffTgt > 0 ? Math.round((totalAff / totalAffTgt) * 100) : null;
          const pc = (v) => v === null ? "#94A3B8" : v >= 100 ? "#10B981" : v >= 70 ? "#F59E0B" : "#EF4444";
          const thC = { padding: "7px 5px", textAlign: "center", fontWeight: 700, fontSize: 9, whiteSpace: "nowrap" };
          return allA.length > 0 || isAdmin(user.email) ? (
            <div style={{ ...cardStyle, marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>🎯 {MONTHS[now.getMonth()]} — Daily Sales & Targets</div>
                {isAdmin(user.email) && <button onClick={() => { setEditTgt(!editTgt); setTmpTgt({...savedTgt}); }} style={{ padding: "5px 14px", borderRadius: 6, background: editTgt ? "#EF4444" : "#0EA5E9", border: "none", color: "#FFF", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{editTgt ? "Cancel" : "Set Targets"}</button>}
              </div>
              {editTgt && (
                <div style={{ marginBottom: 12, padding: 12, background: "#F8FAFC", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 8 }}>SET MONTHLY TARGETS PER AGENT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6 }}>
                    {allA.map(agent => { const cur = String(tmpTgt[agent] || ",").split(","); return (
                      <div key={agent} style={{ display: "flex", alignItems: "center", gap: 4, background: "#FFF", padding: "4px 8px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                        <span style={{ display: "inline-block", padding: "2px 0", background: getPersonColor(agent), color: "#FFF", borderRadius: 4, fontSize: 10, fontWeight: 700, minWidth: 60, textAlign: "center" }}>{agent}</span>
                        <span style={{ fontSize: 9, color: "#10B981", fontWeight: 700 }}>B:</span>
                        <input value={cur[0] || ""} onChange={e => { const p = String(tmpTgt[agent] || ",").split(","); p[0] = e.target.value; setTmpTgt(prev => ({ ...prev, [agent]: p.join(",") })); }}
                          style={{ width: 52, padding: "3px 4px", border: "1px solid #A7F3D0", borderRadius: 4, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }} placeholder="0" type="number" />
                        <span style={{ fontSize: 9, color: "#8B5CF6", fontWeight: 700 }}>A:</span>
                        <input value={cur[1] || ""} onChange={e => { const p = String(tmpTgt[agent] || ",").split(","); p[1] = e.target.value; setTmpTgt(prev => ({ ...prev, [agent]: p.join(",") })); }}
                          style={{ width: 52, padding: "3px 4px", border: "1px solid #C4B5FD", borderRadius: 4, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }} placeholder="0" type="number" />
                        <button onClick={() => { if (window.confirm(`Remove ${agent} from targets?`)) { setTmpTgt(prev => { const n = {...prev}; delete n[agent]; return n; }); } }}
                          style={{ marginLeft: "auto", padding: "2px 6px", borderRadius: 4, background: "#FEE2E2", border: "1px solid #FECACA", color: "#EF4444", cursor: "pointer", fontSize: 11, fontWeight: 700, lineHeight: 1 }} title="Remove agent">×</button>
                      </div>
                    ); })}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={() => { const name = prompt("Agent name:"); if (name && name.trim()) setTmpTgt(p => ({ ...p, [name.trim()]: "," })); }} style={{ padding: "4px 12px", borderRadius: 6, background: "#0EA5E9", border: "none", color: "#FFF", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>+ Add Agent</button>
                    <button onClick={() => { localStorage.setItem(targetKey, JSON.stringify(tmpTgt)); toast("✅ Targets saved!"); setEditTgt(false); window.location.reload(); }} style={{ padding: "4px 14px", borderRadius: 6, background: "#10B981", border: "none", color: "#FFF", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Save</button>
                  </div>
                </div>
              )}
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: 12, background: "#ECFDF5", borderRadius: 10, border: "1px solid #A7F3D0" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#10B981", textTransform: "uppercase", marginBottom: 6 }}>Brands Cap</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <div><div style={{ fontSize: 9, color: "#64748B" }}>Today</div><div style={{ fontSize: 16, fontWeight: 800, color: "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>{todayBrands}</div></div>
                    <div><div style={{ fontSize: 9, color: "#64748B" }}>Monthly</div><div style={{ fontSize: 16, fontWeight: 800, color: "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>{totalBrands}{totalBrandTgt > 0 && <span style={{ fontSize: 9, color: "#94A3B8" }}>/{totalBrandTgt}</span>}</div></div>
                    <div><div style={{ fontSize: 9, color: "#64748B" }}>Avg/day</div><div style={{ fontSize: 16, fontWeight: 800, color: "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>{avgBrands}</div></div>
                  </div>
                  {totalBrandTgt > 0 && <div style={{ height: 6, background: "#D1FAE5", borderRadius: 3, overflow: "hidden", marginTop: 6 }}><div style={{ height: "100%", width: `${Math.min(100, brandPct)}%`, background: "#10B981", borderRadius: 3 }} /></div>}
                </div>
                <div style={{ padding: 12, background: "#F5F3FF", borderRadius: 10, border: "1px solid #C4B5FD" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8B5CF6", textTransform: "uppercase", marginBottom: 6 }}>Affiliates Cap</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <div><div style={{ fontSize: 9, color: "#64748B" }}>Today</div><div style={{ fontSize: 16, fontWeight: 800, color: "#8B5CF6", fontFamily: "'JetBrains Mono',monospace" }}>{todayAff}</div></div>
                    <div><div style={{ fontSize: 9, color: "#64748B" }}>Monthly</div><div style={{ fontSize: 16, fontWeight: 800, color: "#8B5CF6", fontFamily: "'JetBrains Mono',monospace" }}>{totalAff}{totalAffTgt > 0 && <span style={{ fontSize: 9, color: "#94A3B8" }}>/{totalAffTgt}</span>}</div></div>
                    <div><div style={{ fontSize: 9, color: "#64748B" }}>Avg/day</div><div style={{ fontSize: 16, fontWeight: 800, color: "#8B5CF6", fontFamily: "'JetBrains Mono',monospace" }}>{avgAff}</div></div>
                  </div>
                  {totalAffTgt > 0 && <div style={{ height: 6, background: "#EDE9FE", borderRadius: 3, overflow: "hidden", marginTop: 6 }}><div style={{ height: "100%", width: `${Math.min(100, affPct)}%`, background: "#8B5CF6", borderRadius: 3 }} /></div>}
                </div>
              </div>
              {/* Per-agent table with per-agent targets */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: "#F8FAFC" }}>
                    <th style={{ ...thC, textAlign: "left", color: "#64748B" }}>Agent</th>
                    <th style={{ ...thC, color: "#10B981", borderLeft: "2px solid #E2E8F0" }}>Today B</th>
                    <th style={{ ...thC, color: "#10B981" }}>Monthly</th>
                    <th style={{ ...thC, color: "#10B981" }}>Tgt</th>
                    <th style={{ ...thC, color: "#10B981" }}>Avg/d</th>
                    <th style={{ ...thC, color: "#8B5CF6", borderLeft: "2px solid #E2E8F0" }}>Today A</th>
                    <th style={{ ...thC, color: "#8B5CF6" }}>Monthly</th>
                    <th style={{ ...thC, color: "#8B5CF6" }}>Tgt</th>
                    <th style={{ ...thC, color: "#8B5CF6" }}>Avg/d</th>
                    <th style={{ ...thC, color: "#64748B", borderLeft: "2px solid #E2E8F0" }}>Status</th>
                  </tr></thead>
                  <tbody>{allA.filter(a => (mAgentAff[a] || 0) > 0 || (mAgentBrand[a] || 0) > 0 || (tAgentAff[a] || 0) > 0 || (tAgentBrand[a] || 0) > 0 || getAgentTgt(a)[0] > 0 || getAgentTgt(a)[1] > 0).map(agent => {
                    const bM = mAgentBrand[agent] || 0; const aM = mAgentAff[agent] || 0;
                    const bToday = tAgentBrand[agent] || 0; const aToday = tAgentAff[agent] || 0;
                    const [bTgt, aTgt] = getAgentTgt(agent);
                    const bAvg = dayOfMonth > 0 ? (bM / dayOfMonth).toFixed(1) : "0";
                    const aAvg = dayOfMonth > 0 ? (aM / dayOfMonth).toFixed(1) : "0";
                    const bPct = bTgt > 0 ? Math.round((bM / bTgt) * 100) : null;
                    const aPct = aTgt > 0 ? Math.round((aM / aTgt) * 100) : null;
                    const onTrack = (bPct === null || bPct >= Math.round(pace * 100)) && (aPct === null || aPct >= Math.round(pace * 100));
                    const completed = (bPct !== null && bPct >= 100) || (aPct !== null && aPct >= 100);
                    return (
                      <tr key={agent} style={{ borderBottom: "1px solid rgba(99,102,241,0.06)" }}>
                        <td style={{ padding: "7px 6px" }}><span style={{ display: "inline-block", padding: "2px 0", background: getPersonColor(agent), color: "#FFF", fontWeight: 700, fontSize: 10, textAlign: "center", width: 65, borderRadius: 4 }}>{agent}</span></td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: bToday > 0 ? "#10B981" : "#CBD5E1", borderLeft: "2px solid #E2E8F0" }}>{bToday}</td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#334155" }}>{bM}{bPct !== null && <span style={{ fontSize: 8, color: pc(bPct), marginLeft: 2 }}>({bPct}%)</span>}</td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: bTgt > 0 ? "#10B981" : "#CBD5E1" }}>{bTgt || "—"}</td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#94A3B8" }}>{bAvg}</td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: aToday > 0 ? "#8B5CF6" : "#CBD5E1", borderLeft: "2px solid #E2E8F0" }}>{aToday}</td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#334155" }}>{aM}{aPct !== null && <span style={{ fontSize: 8, color: pc(aPct), marginLeft: 2 }}>({aPct}%)</span>}</td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: aTgt > 0 ? "#8B5CF6" : "#CBD5E1" }}>{aTgt || "—"}</td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#94A3B8" }}>{aAvg}</td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontSize: 13, borderLeft: "2px solid #E2E8F0" }}>{completed ? "🏆" : onTrack ? "✓" : "⚠"}</td>
                      </tr>
                    );
                  })}</tbody>
                  <tfoot><tr style={{ background: "#F8FAFC", borderTop: "2px solid #E2E8F0" }}>
                    <td style={{ padding: "7px 6px", fontWeight: 800, fontSize: 11 }}>Total</td>
                    <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#10B981", borderLeft: "2px solid #E2E8F0" }}>{todayBrands}</td>
                    <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#10B981" }}>{totalBrands}</td>
                    <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#10B981" }}>{totalBrandTgt || "—"}</td>
                    <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#64748B" }}>{avgBrands}</td>
                    <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#8B5CF6", borderLeft: "2px solid #E2E8F0" }}>{todayAff}</td>
                    <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#8B5CF6" }}>{totalAff}</td>
                    <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#8B5CF6" }}>{totalAffTgt || "—"}</td>
                    <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#64748B" }}>{avgAff}</td>
                    <td style={{ borderLeft: "2px solid #E2E8F0" }}></td>
                  </tr></tfoot>
                </table>
                <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Day {dayOfMonth}/{daysInMonth} — {Math.round(pace * 100)}% through month</div>
              </div>
            </div>
          ) : null;
        })()}

        {/* ═══════════ OFFERS ═══════════ */}
        {sectionTitle("🤝", "Offers — Top 8 Countries")}
        <div style={{ ...cardStyle, marginBottom: 28 }}>
          {topOfferCountries.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 12 }}>No offers data</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
              {topOfferCountries.map(([country, count], i) => {
                const maxC = topOfferCountries[0][1];
                const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#0EA5E9", "#EC4899", "#14B8A6"];
                return (
                  <div key={country} style={{ textAlign: "center", padding: "12px 8px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{country}</div>
                    <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, margin: "6px 0", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: (maxC > 0 ? (count / maxC) * 100 : 0) + "%", background: colors[i] || "#CBD5E1", borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: colors[i] || "#334155", fontFamily: "'JetBrains Mono',monospace" }}>{count}</div>
                    <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600 }}>offers</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 10, textAlign: "right", fontSize: 11, color: "#64748B" }}>Total: <b>{offers.length}</b> offers across <b>{Object.keys(offerCountryMap).length}</b> countries</div>
        </div>

        {/* ═══════════ PARTNERS ═══════════ */}
        {(() => {
          const monthPfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const monthPartners = partnersAll.filter(p => (p.date || "").startsWith(monthPfx));
          const partnerAgentMap = {};
          monthPartners.forEach(p => {
            const a = normalizeAgent((p.agent || "").trim());
            if (a) partnerAgentMap[a] = (partnerAgentMap[a] || 0) + 1;
          });
          const topPartnerAgents = Object.entries(partnerAgentMap).sort((a, b) => b[1] - a[1]);
          const typeBreakdown = {};
          monthPartners.forEach(p => { typeBreakdown[p.type || "?"] = (typeBreakdown[p.type || "?"] || 0) + 1; });

          return (
            <>
              {sectionTitle("🤝", `Partners — ${MONTHS[now.getMonth()]} ${now.getFullYear()}`)}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>🏆 Partnerships per Agent</div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#EC4899", fontFamily: "'JetBrains Mono',monospace" }}>{monthPartners.length}</span>
                  </div>
                  {topPartnerAgents.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 12 }}>No partners this month</div> :
                    topPartnerAgents.map(([name, count], i) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#F59E0B" : "#64748B", width: 20 }}>#{i + 1}</span>
                        <span style={{ display: "inline-block", padding: "3px 0", background: getPersonColor(name), color: "#FFF", fontWeight: 700, fontSize: 11, textAlign: "center", width: 60, borderRadius: 4 }}>{name}</span>
                        <div style={{ flex: 1, height: 6, background: "#F1F5F9", borderRadius: 5, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: (topPartnerAgents[0][1] > 0 ? (count / topPartnerAgents[0][1]) * 100 : 0) + "%", background: i === 0 ? "linear-gradient(90deg, #EC4899, #F472B6)" : "#CBD5E1", borderRadius: 5 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", fontFamily: "'JetBrains Mono',monospace", minWidth: 25, textAlign: "right" }}>{count}</span>
                      </div>
                    ))
                  }
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 12 }}>📊 Type Breakdown</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {[["Brand", "#6366F1"], ["Network", "#0EA5E9"], ["Affiliate", "#10B981"]].map(([type, color]) => (
                      <div key={type} style={{ flex: 1, minWidth: 90, textAlign: "center", padding: "14px 8px", background: color + "08", borderRadius: 12, border: `1px solid ${color}20` }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'JetBrains Mono',monospace" }}>{typeBreakdown[type] || 0}</div>
                        <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginTop: 2 }}>{type}s</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* ═══ Quick Links ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {[
            { label: "Payments", desc: `${openPay.length} open`, key: "payments", accent: "#0EA5E9", icon: "💳" },
            { label: "Customer Pay", desc: `${curCp.length} ${range.label.toLowerCase()}`, key: "customers", accent: "#0EA5E9", icon: "🏦" },
            { label: "CRG Deals", desc: `${curCrg.length} ${range.label.toLowerCase()}`, key: "crg", accent: "#F59E0B", icon: "📋" },
            { label: "Daily Cap", desc: `${curDc.length} entries`, key: "dailycap", accent: "#8B5CF6", icon: "📊" },
            { label: "Offers", desc: `${offers.length} total`, key: "deals", accent: "#10B981", icon: "🤝" },
            { label: "Partners", desc: `${partnersAll.filter(p => (p.date||"").startsWith(now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0"))).length} this month`, key: "partners", accent: "#EC4899", icon: "💼" },
          ].map((q, i) => (
            <button key={i} onClick={() => onNav(q.key)} style={{ ...cardStyle, cursor: "pointer", border: "1px solid #E2E8F0", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = q.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.transform = "none"; }}>
              <span style={{ fontSize: 26 }}>{q.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{q.label}</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>{q.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FTDS INFO PAGE — Full CRUD table with inline edit (v9.09)
// ═══════════════════════════════════════════════════════════════
function FtdsInfoPage({ user, onLogout, onNav, onAdmin, ftdEntries: rawFtd, setFtdEntries, userAccess }) {
  const crg = Array.isArray(rawFtd) ? rawFtd : [];
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // ── State ──
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [newFtd, setNewFtd] = useState({ affiliate: "", brokerCap: "", cap: "", capReceived: "", ftd: "", started: false, date: today, hours: "", funnel: "", manageAff: "", country: "" });

  const getRange = () => {
    if (period === "today") return { from: today, to: today };
    if (period === "yesterday") { const d = new Date(now); d.setDate(d.getDate() - 1); const y = d.toISOString().split("T")[0]; return { from: y, to: y }; }
    if (period === "week") { const d = new Date(now); const dow = d.getDay() || 7; d.setDate(d.getDate() - dow + 1); return { from: d.toISOString().split("T")[0], to: today }; }
    if (period === "month") { return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to: today }; }
    if (period === "custom") return { from: customFrom, to: customTo };
    return { from: today, to: today };
  };
  const range = getRange();

  const extractCountry = (aff) => { const m = (aff || "").match(/[A-Z]{2,4}$/); return m ? m[0] : "??"; };
  const extractAffId = (aff) => { const m = (aff || "").match(/^[*]?(\d+)/); return m ? m[1] : ""; };

  // Filter
  const filtered = crg.filter(d => {
    const date = d.date || "";
    if (date < range.from || date > range.to) return false;
    if (countryFilter !== "all" && extractCountry(d.affiliate) !== countryFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!(d.affiliate || "").toLowerCase().includes(s) && !(d.brokerCap || "").toLowerCase().includes(s) && !(d.manageAff || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Group by date
  const grouped = {};
  filtered.forEach(d => { const date = d.date || "unknown"; if (!grouped[date]) grouped[date] = []; grouped[date].push(d); });
  const sortedDates = Object.keys(grouped).sort().reverse();
  const allCountries = [...new Set(crg.filter(d => d.date >= range.from && d.date <= range.to).map(d => extractCountry(d.affiliate)))].sort();

  // Stats
  const totalFtds = filtered.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);

  const fmtDate = (ds) => { if (!ds) return "—"; const [y, m, d] = ds.split("-"); const dt = new Date(ds + "T00:00:00"); const dn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; return `${dn[dt.getDay()]}, ${d}/${m}/${y}`; };

  // ── CRUD handlers ──
  const updateField = (id, field, value) => {
    setFtdEntries(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this FTD entry?")) return;
    trackDelete('ftd-entries', id);
    setFtdEntries(prev => prev.filter(d => d.id !== id));
  };

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selected.size} selected entries?`)) return;
    selected.forEach(id => trackDelete('ftd-entries', id));
    setFtdEntries(prev => prev.filter(d => !selected.has(d.id)));
    setSelected(new Set());
  };

  const handleBulkDuplicate = () => {
    const dupes = [];
    crg.forEach(d => {
      if (selected.has(d.id)) {
        dupes.push({ ...d, id: crypto.randomUUID ? crypto.randomUUID() : `ftd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      }
    });
    setFtdEntries(prev => [...prev, ...dupes]);
    setSelected(new Set());
    toast(`✅ Duplicated ${dupes.length} entries`);
  };

  const handleAdd = () => {
    if (!newFtd.affiliate) return;
    // If country provided and not already in affiliate string, append it
    let aff = newFtd.affiliate.trim();
    if (newFtd.country && !aff.toUpperCase().endsWith(newFtd.country.toUpperCase())) {
      aff = `${aff} ${newFtd.country.toUpperCase()}`;
    }
    const entry = {
      ...newFtd,
      affiliate: aff,
      id: crypto.randomUUID ? crypto.randomUUID() : `ftd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      cap: newFtd.cap || "0",
      capReceived: newFtd.capReceived || "0",
      ftd: newFtd.ftd || "0",
      started: newFtd.started || false,
    };
    setFtdEntries(prev => [entry, ...prev]);
    setNewFtd({ affiliate: "", brokerCap: "", cap: "", capReceived: "", ftd: "", started: false, date: today, hours: "", funnel: "", manageAff: "" });
    setAddOpen(false);
    toast("✅ FTD entry added");
  };

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (dayDeals) => {
    const dayIds = dayDeals.map(d => d.id);
    const allSelected = dayIds.every(id => selected.has(id));
    setSelected(prev => { const n = new Set(prev); dayIds.forEach(id => allSelected ? n.delete(id) : n.add(id)); return n; });
  };

  const btnS = (active) => ({ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid", background: active ? "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)" : "#FFF", borderColor: active ? "#10B981" : "#E2E8F0", color: active ? "#FFF" : "#64748B" });
  const thS = { padding: "9px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", whiteSpace: "nowrap", background: "#FAFBFC", borderBottom: "1.5px solid #E5E7EB", borderRight: "1px solid #E5E7EB" };
  const tdS = { padding: "9px 14px", fontSize: 13, verticalAlign: "middle", color: "#111827", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid #E5E7EB" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="ftdsinfo" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#10B981" />

      <main className="blitz-main" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#334155" }}>📈 FTDs Info</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CurrencyBadges />
            <button onClick={() => setAddOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(16,185,129,0.3)" }}>{I.plus} New FTD</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            { label: "FTDs", value: totalFtds, color: "#10B981" },
            { label: "Deals", value: filtered.length, color: "#EC4899" },
          ].map((c, i) => (
            <div key={i} style={{ padding: "12px 14px", background: "#FFF", borderRadius: 10, border: "1px solid #E2E8F0", borderLeft: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color, fontFamily: "'JetBrains Mono',monospace" }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, alignItems: "center" }}>
          {["today", "yesterday", "week", "month", "custom"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={btnS(period === p)}>{p === "today" ? "Today" : p === "yesterday" ? "Yesterday" : p === "week" ? "This Week" : p === "month" ? "This Month" : "Custom"}</button>
          ))}
          {period === "custom" && <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
            <span style={{ color: "#94A3B8" }}>→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
          </>}
          <span style={{ color: "#CBD5E1" }}>|</span>
          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12, fontWeight: 600, color: "#475569" }}>
            <option value="all">All Countries</option>
            {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12, width: 150 }} />
        </div>

        {/* ── Tables by day ── */}
        {sortedDates.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94A3B8", fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
            No FTD data for the selected period.
          </div>
        ) : sortedDates.map(date => {
          const dayDeals = grouped[date];
          const dayFtd = dayDeals.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);
          const dayAllSelected = dayDeals.length > 0 && dayDeals.every(d => selected.has(d.id));

          return (
            <div key={date} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", marginBottom: 14, boxShadow: "0 2px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "linear-gradient(135deg, #F8FAFC, #EFF6FF)", borderBottom: "2px solid #E2E8F0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" checked={dayAllSelected} onChange={() => toggleAll(dayDeals)} style={{ cursor: "pointer", width: 15, height: 15, accentColor: "#10B981" }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#334155" }}>📅 {fmtDate(date)}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 16, background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: 11, fontWeight: 700 }}>{dayDeals.length}</span>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                  <span style={{ color: "#10B981" }}>FTD: {dayFtd}</span>
                </div>
              </div>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ ...thS, width: 30 }}></th>
                      <th style={thS}>Country</th>
                      <th style={thS}>Affiliate</th>
                      <th style={thS}>Aff ID</th>
                      <th style={thS}>Brand</th>
                      <th style={thS}>Brand ID</th>
                      <th style={thS}>FTD</th>
                      <th style={{ ...thS, width: 50 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayDeals.map(d => {
                      const country = extractCountry(d.affiliate);
                      const affId = extractAffId(d.affiliate);
                      const brokerRaw = (d.brokerCap || "").trim();
                      const brandIdMatch = brokerRaw.match(/^(\d+)/);
                      const brandId = brandIdMatch ? brandIdMatch[1] : "";
                      const brandName = brokerRaw.replace(/^\d+\s*[-]?\s*/, "").trim() || brokerRaw || "";
                      const isChecked = selected.has(d.id);

                      return (
                        <tr key={d.id} style={{ borderBottom: "1px solid #F1F5F9", background: isChecked ? "rgba(16,185,129,0.04)" : "transparent" }}>
                          <td style={tdS}><input type="checkbox" checked={isChecked} onChange={() => toggleSelect(d.id)} style={{ cursor: "pointer", accentColor: "#10B981" }} /></td>
                          <td style={tdS}>
                            <span style={{ padding: "2px 6px", borderRadius: 4, background: `${getPersonColor(country)}15`, color: getPersonColor(country), fontSize: 11, fontWeight: 700 }}>{country}</span>
                          </td>
                          <td style={tdS}><InlineCell value={d.affiliate || ""} onSave={v => updateField(d.id, "affiliate", v)} style={{ fontWeight: 600, color: "#334155", fontSize: 13, padding: "0 8px" }} /></td>
                          <td style={{ ...tdS, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#0EA5E9", fontWeight: 700 }}>{affId}</td>
                          <td style={tdS}><InlineCell value={brandName} onSave={v => { const newBroker = brandId ? `${brandId} ${v}` : v; updateField(d.id, "brokerCap", newBroker); }} style={{ fontWeight: 600, color: "#334155", fontSize: 13, padding: "0 8px" }} /></td>
                          <td style={{ ...tdS, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#8B5CF6", fontWeight: 700 }}>{brandId || "—"}</td>
                          <td style={tdS}><InlineCell value={String(d.ftd || "0")} onSave={v => updateField(d.id, "ftd", v)} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: parseInt(d.ftd) > 0 ? "#10B981" : "#CBD5E1", padding: "0 8px", textAlign: "center" }} /></td>
                          <td style={tdS}>
                            <button onClick={() => handleDelete(d.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 4, cursor: "pointer", color: "#DC2626", display: "flex", fontSize: 11 }}>{I.trash}</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* ── Bulk Action Bar ── */}
        <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}
          onDelete={handleBulkDelete}
          onDuplicate={handleBulkDuplicate}
        />
      </main>

      {/* ── Add New FTD Modal ── */}
      {addOpen && (
        <Modal title="Add New FTD Entry" onClose={() => setAddOpen(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Affiliate (e.g. 211 UK)"><input style={inp} value={newFtd.affiliate} onChange={e => setNewFtd(p => ({ ...p, affiliate: e.target.value }))} placeholder="211 UK" /></Field>
            <Field label="Broker / Brand"><input style={inp} value={newFtd.brokerCap} onChange={e => setNewFtd(p => ({ ...p, brokerCap: e.target.value }))} placeholder="3102 Helios" /></Field>
            <Field label="Country"><input style={inp} value={newFtd.country} onChange={e => setNewFtd(p => ({ ...p, country: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) }))} placeholder="e.g. UK, DE, ES" maxLength={4} /></Field>
            <Field label="FTD Count"><input style={inp} type="number" value={newFtd.ftd} onChange={e => setNewFtd(p => ({ ...p, ftd: e.target.value }))} placeholder="0" /></Field>
            <Field label="Date"><input style={inp} type="date" value={newFtd.date} onChange={e => setNewFtd(p => ({ ...p, date: e.target.value }))} /></Field>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => setAddOpen(false)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={handleAdd} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}>Add FTD</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BLITZ REPORT PAGE — v9.20 rewrite: matches screenshot, auto-save, working-day EST
// ═══════════════════════════════════════════════════════════════
function MonthlyStatsPage({ user, onLogout, onNav, onAdmin, crgDeals: rawCrg, dcEntries: rawDc, cpPayments: rawCp, payments: rawPay, dealsData: rawDeals, partnersData: rawPartners, userAccess }) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const curLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // ── All saved reports from localStorage ──
  const REPORTS_KEY = "blitz_reports_all";
  const loadAllReports = () => {
    try { return JSON.parse(localStorage.getItem(REPORTS_KEY) || '{}'); } catch { return {}; }
  };
  const [allReports, setAllReports] = useState(loadAllReports);
  const [activeMonth, setActiveMonth] = useState(curMonth);

  const emptyReport = () => ({
    date: today,
    yFtds: "", monthlyFtds: "", monthlyEst: "", monthlyEstOverride: false,
    salesTarget: "", superTarget: "",
    yBrandFtds: "", monthlyBrandFtds: "", monthlyBrandEst: "", brandEstOverride: false,
    newAffiliates: "", newBrands: "",
    yCrgCap: "", highestDailyCap: "", highestDailyCapDate: "",
    refundAffiliates: "", refundBrands: "",
    dailyFtdsRecord: "", dailyFtdsDate: "",
    dailyFtdsRecord2: "", dailyFtdsDate2: "",
    weekendFtdsRecord: "", weekendFtdsDate: "",
    weeklyFtdsRecord: "", weeklyFtdsDate: "",
    monthlyFtdsRecord: "", monthlyFtdsDate: "",
  });

  const getReport = (month) => allReports[month] || emptyReport();
  const [report, setReport] = useState(getReport(activeMonth));

  useEffect(() => { setReport(getReport(activeMonth)); }, [activeMonth]);

  // ── v9.20: Auto-save with debounce (1.5s after last edit) ──
  const autoSaveTimer = useRef(null);
  const persistReport = (rpt) => {
    const updated = { ...allReports, [activeMonth]: { ...rpt, lastSaved: new Date().toISOString() } };
    setAllReports(updated);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
  };
  // Auto-save on every report change (debounced)
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { persistReport(report); }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [report]);

  // Manual save
  const saveReport = () => { persistReport(report); toast("✅ Report saved!"); };

  const deleteReport = (month) => {
    if (!confirm(`Delete report for ${month}?`)) return;
    const updated = { ...allReports };
    delete updated[month];
    setAllReports(updated);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
    if (activeMonth === month) { setActiveMonth(curMonth); setReport(getReport(curMonth)); }
  };

  const set = (field, val) => setReport(p => ({ ...p, [field]: val }));

  // ── v9.20: Monthly EST calculation based on working days remaining ──
  const calcMonthlyEst = (monthlyVal) => {
    const mFtds = parseInt(monthlyVal) || 0;
    if (mFtds === 0) return "";
    const [aY, aM] = activeMonth.split("-").map(Number);
    const todayDate = new Date();
    // Count working days (Mon-Fri) elapsed and total in the month
    const daysInMonth = new Date(aY, aM, 0).getDate();
    let workedDays = 0, totalWorkDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(aY, aM - 1, d);
      const dow = dt.getDay();
      if (dow >= 1 && dow <= 5) { // Mon-Fri
        totalWorkDays++;
        if (dt <= todayDate) workedDays++;
      }
    }
    if (workedDays === 0) return mFtds.toString();
    const dailyAvg = mFtds / workedDays;
    return Math.round(dailyAvg * totalWorkDays).toString();
  };

  const calcBrandEst = (monthlyVal) => {
    const mFtds = parseInt(monthlyVal) || 0;
    if (mFtds === 0) return "";
    const [aY, aM] = activeMonth.split("-").map(Number);
    const todayDate = new Date();
    const daysInMonth = new Date(aY, aM, 0).getDate();
    let workedDays = 0, totalWorkDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(aY, aM - 1, d);
      const dow = dt.getDay();
      if (dow >= 1 && dow <= 5) { totalWorkDays++; if (dt <= todayDate) workedDays++; }
    }
    if (workedDays === 0) return mFtds.toString();
    return Math.round((mFtds / workedDays) * totalWorkDays).toString();
  };

  // Auto-compute EST when monthly FTDs change (unless manually overridden)
  useEffect(() => {
    if (report.monthlyFtds && !report.monthlyEstOverride) {
      const est = calcMonthlyEst(report.monthlyFtds);
      if (est !== report.monthlyEst) setReport(p => ({ ...p, monthlyEst: est }));
    }
  }, [report.monthlyFtds]);

  useEffect(() => {
    if (report.monthlyBrandFtds && !report.brandEstOverride) {
      const est = calcBrandEst(report.monthlyBrandFtds);
      if (est !== report.monthlyBrandEst) setReport(p => ({ ...p, monthlyBrandEst: est }));
    }
  }, [report.monthlyBrandFtds]);

  const oldMonths = Object.keys(allReports).filter(m => m !== curMonth).sort().reverse();

  // ── Styles — matching screenshot exactly ──
  const inputBase = { padding: "4px 6px", border: "1px solid #CBD5E1", borderRadius: 4, fontSize: 13, fontWeight: 700, textAlign: "center", fontFamily: "'JetBrains Mono',monospace", background: "#FFF", outline: "none" };
  const inp = (w) => ({ ...inputBase, width: w || 64 });
  const inp2 = (w) => ({ ...inputBase, width: w || 72, fontSize: 9, fontWeight: 500, color: "#64748B", marginTop: 2 });
  const estInp = (w) => ({ ...inputBase, width: w || 64, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A" });

  // Table cell styles — compact layout (v9.20: 20% smaller)
  const cellBorder = "1px solid #E2E8F0";
  const hdrCell = { padding: "7px 10px", fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center", background: "#F8FAFC", borderBottom: cellBorder, borderRight: cellBorder, verticalAlign: "middle", fontFamily: "'Plus Jakarta Sans',sans-serif" };
  const valCell = (bg) => ({ padding: "8px 10px", textAlign: "center", borderBottom: cellBorder, borderRight: cellBorder, verticalAlign: "middle", background: bg || "#FFF" });
  const lblCell = { ...hdrCell, textAlign: "left", fontSize: 11, fontWeight: 800, color: "#1E293B", minWidth: 90, background: "#F8FAFC" };
  
  // Section backgrounds
  const bBg = "rgba(56,189,248,0.06)";
  const gBg = "rgba(16,185,129,0.06)";
  const aBg = "rgba(245,158,11,0.06)";
  const pBg = "rgba(236,72,153,0.06)";

  const isCurrentMonth = activeMonth === curMonth;
  const monthLabel = (() => {
    const [y, m] = activeMonth.split("-");
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  })();

  // ── Working days info for display ──
  const getWorkDayInfo = () => {
    const [aY, aM] = activeMonth.split("-").map(Number);
    const daysInMonth = new Date(aY, aM, 0).getDate();
    const todayDate = new Date();
    let worked = 0, total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(aY, aM - 1, d);
      const dow = dt.getDay();
      if (dow >= 1 && dow <= 5) { total++; if (dt <= todayDate) worked++; }
    }
    return { worked, total, remaining: total - worked };
  };
  const wdInfo = getWorkDayInfo();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="monthlystats" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#6366F1" />

      <main className="blitz-main" style={{ maxWidth: 960, margin: "0 auto", padding: "20px 24px" }}>
        {/* ── Header bar ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#334155", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26 }}>📊</span> <span style={{ background: "linear-gradient(135deg, #1E293B, #6366F1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Blitz Report</span>
            <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginLeft: 6 }}>auto-saves</span>
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <CurrencyBadges />
            {!isCurrentMonth && <button onClick={() => setActiveMonth(curMonth)} style={{ padding: "6px 14px", borderRadius: 8, background: "#6366F1", border: "none", color: "#FFF", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>← Current Month</button>}
            <button onClick={saveReport} style={{ padding: "8px 20px", borderRadius: 10, background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}>💾 Save Report</button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MAIN REPORT — Matching screenshot layout exactly          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: 24 }}>
          {/* Dark header bar */}
          <div style={{ background: "linear-gradient(135deg,#334155 0%,#475569 100%)", color: "#FFF", padding: "10px 20px", fontSize: 15, fontWeight: 800, textAlign: "center", letterSpacing: 0.5 }}>
            Blitz Report — {monthLabel}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "15%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
            </colgroup>
            <tbody>
              {/* ═══ SECTION 1: FTDs ═══ */}
              <tr>
                <td style={lblCell}>
                  <input value={report.date || today} onChange={e => set("date", e.target.value)} style={{ ...inp(95), fontSize: 11 }} />
                </td>
                <td style={hdrCell}>Y FTDS</td>
                <td style={hdrCell}>MONTHLY FTDS</td>
                <td style={hdrCell}>MONTHLY EST</td>
                <td style={hdrCell}></td>
                <td style={hdrCell}>SALES TARGET</td>
              </tr>
              <tr>
                <td style={valCell()}></td>
                <td style={valCell(bBg)}><input value={report.yFtds} onChange={e => set("yFtds", e.target.value)} style={inp()} /></td>
                <td style={valCell(bBg)}><input value={report.monthlyFtds} onChange={e => set("monthlyFtds", e.target.value)} style={inp()} /></td>
                <td style={valCell(gBg)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <input value={report.monthlyEst} onChange={e => set("monthlyEst", e.target.value) || set("monthlyEstOverride", true)} style={{ ...estInp(), border: report.monthlyEstOverride ? "1px solid #FBBF24" : "1px solid #BBF7D0" }} title={`Working days: ${wdInfo.worked}/${wdInfo.total} (${wdInfo.remaining} left)${report.monthlyEstOverride ? " — manual override" : ""}`} />
                    {report.monthlyEstOverride && <button onClick={() => { const est = calcMonthlyEst(report.monthlyFtds); setReport(p => ({ ...p, monthlyEst: est, monthlyEstOverride: false })); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }} title="Recalculate from working days">🔄</button>}
                  </div>
                  <div style={{ fontSize: 8, color: "#94A3B8", marginTop: 2 }}>{wdInfo.worked}/{wdInfo.total} work days</div>
                </td>
                <td style={valCell()}></td>
                <td style={valCell(aBg)}><input value={report.salesTarget} onChange={e => set("salesTarget", e.target.value)} style={inp()} /></td>
              </tr>

              {/* Super Target row */}
              <tr>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={{ ...hdrCell, borderBottom: cellBorder }}>SUPER TARGET</td>
              </tr>
              <tr>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell(gBg)}><input value={report.superTarget} onChange={e => set("superTarget", e.target.value)} style={inp()} /></td>
              </tr>

              {/* ═══ DIVIDER ═══ */}
              <tr><td colSpan={6} style={{ height: 6, background: "#F1F5F9", borderBottom: cellBorder }}></td></tr>

              {/* ═══ SECTION 2: Brand FTDs (🐦) ═══ */}
              <tr>
                <td style={lblCell}></td>
                <td style={hdrCell}>YESTERDAY 🐦</td>
                <td style={hdrCell}>MONTHLY 🐦</td>
                <td style={hdrCell}>MONTHLY EST 🐦</td>
                <td style={hdrCell}></td>
                <td style={hdrCell}></td>
              </tr>
              <tr>
                <td style={valCell()}></td>
                <td style={valCell(bBg)}><input value={report.yBrandFtds} onChange={e => set("yBrandFtds", e.target.value)} style={inp()} /></td>
                <td style={valCell(bBg)}><input value={report.monthlyBrandFtds} onChange={e => set("monthlyBrandFtds", e.target.value)} style={inp()} /></td>
                <td style={valCell(gBg)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <input value={report.monthlyBrandEst} onChange={e => set("monthlyBrandEst", e.target.value) || set("brandEstOverride", true)} style={{ ...estInp(), border: report.brandEstOverride ? "1px solid #FBBF24" : "1px solid #BBF7D0" }} title={`Working days: ${wdInfo.worked}/${wdInfo.total}${report.brandEstOverride ? " — manual override" : ""}`} />
                    {report.brandEstOverride && <button onClick={() => { const est = calcBrandEst(report.monthlyBrandFtds); setReport(p => ({ ...p, monthlyBrandEst: est, brandEstOverride: false })); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }} title="Recalculate">🔄</button>}
                  </div>
                  <div style={{ fontSize: 8, color: "#94A3B8", marginTop: 2 }}>{wdInfo.worked}/{wdInfo.total} work days</div>
                </td>
                <td style={hdrCell}>NEW AFFILIATES</td>
                <td style={hdrCell}>NEW BRANDS</td>
              </tr>
              <tr>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell(bBg)}><input value={report.newAffiliates} onChange={e => set("newAffiliates", e.target.value)} style={inp()} /></td>
                <td style={valCell(gBg)}><input value={report.newBrands} onChange={e => set("newBrands", e.target.value)} style={inp()} /></td>
              </tr>

              {/* ═══ DIVIDER ═══ */}
              <tr><td colSpan={6} style={{ height: 6, background: "#F1F5F9", borderBottom: cellBorder }}></td></tr>

              {/* ═══ SECTION 3: CRG Cap ═══ */}
              <tr>
                <td style={hdrCell}>Y CRG CAP</td>
                <td style={hdrCell}>HIGHEST DAILY CRG CAP</td>
                <td style={hdrCell}></td>
                <td style={hdrCell}></td>
                <td style={hdrCell}>REFUND AFFILIATES</td>
                <td style={hdrCell}>REFUND BRANDS</td>
              </tr>
              <tr>
                <td style={valCell(bBg)}><input value={report.yCrgCap} onChange={e => set("yCrgCap", e.target.value)} style={inp()} /></td>
                <td style={valCell(aBg)}>
                  <input value={report.highestDailyCap} onChange={e => set("highestDailyCap", e.target.value)} style={inp()} />
                  <div><input value={report.highestDailyCapDate} onChange={e => set("highestDailyCapDate", e.target.value)} style={inp2(100)} placeholder="dd/mm/yyyy" /></div>
                </td>
                <td style={valCell()}></td>
                <td style={valCell()}></td>
                <td style={valCell(pBg)}><input value={report.refundAffiliates} onChange={e => set("refundAffiliates", e.target.value)} style={inp()} /></td>
                <td style={valCell(pBg)}><input value={report.refundBrands} onChange={e => set("refundBrands", e.target.value)} style={inp()} /></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* BLITZ RECORDS — Separate card like screenshot              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: 24 }}>
          <div style={{ background: "linear-gradient(135deg,#334155 0%,#475569 100%)", color: "#FFF", padding: "8px 20px", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "#10B981", padding: "2px 12px", borderRadius: 6, fontSize: 13 }}>Blitz Records</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={hdrCell}>DAILY FTDS</td>
                <td style={hdrCell}>DAILY FTDS</td>
                <td style={hdrCell}>WEEKEND FTDS</td>
                <td style={hdrCell}>WEEKLY FTDS</td>
                <td style={hdrCell}>MONTHLY FTDS</td>
              </tr>
              <tr>
                <td style={valCell(gBg)}>
                  <input value={report.dailyFtdsRecord} onChange={e => set("dailyFtdsRecord", e.target.value)} style={inp()} />
                  <div><input value={report.dailyFtdsDate} onChange={e => set("dailyFtdsDate", e.target.value)} style={inp2()} placeholder="date" /></div>
                </td>
                <td style={valCell(gBg)}>
                  <input value={report.dailyFtdsRecord2 || ""} onChange={e => set("dailyFtdsRecord2", e.target.value)} style={inp()} />
                  <div><input value={report.dailyFtdsDate2 || ""} onChange={e => set("dailyFtdsDate2", e.target.value)} style={inp2()} placeholder="date" /></div>
                </td>
                <td style={valCell(gBg)}>
                  <input value={report.weekendFtdsRecord} onChange={e => set("weekendFtdsRecord", e.target.value)} style={inp()} />
                  <div><input value={report.weekendFtdsDate} onChange={e => set("weekendFtdsDate", e.target.value)} style={inp2()} placeholder="date range" /></div>
                </td>
                <td style={valCell(gBg)}>
                  <input value={report.weeklyFtdsRecord} onChange={e => set("weeklyFtdsRecord", e.target.value)} style={inp()} />
                  <div><input value={report.weeklyFtdsDate} onChange={e => set("weeklyFtdsDate", e.target.value)} style={inp2()} placeholder="date range" /></div>
                </td>
                <td style={valCell(gBg)}>
                  <input value={report.monthlyFtdsRecord} onChange={e => set("monthlyFtdsRecord", e.target.value)} style={inp()} />
                  <div><input value={report.monthlyFtdsDate} onChange={e => set("monthlyFtdsDate", e.target.value)} style={inp2()} placeholder="month" /></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Working Days Info Bar ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 600, color: "#1E40AF", flex: 1, minWidth: 140, textAlign: "center" }}>
            📅 Working days: <b>{wdInfo.worked}</b> / {wdInfo.total} <span style={{ color: "#64748B" }}>({wdInfo.remaining} remaining)</span>
          </div>
          {report.monthlyFtds && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 600, color: "#166534", flex: 1, minWidth: 140, textAlign: "center" }}>
            📈 Daily avg: <b>{(parseInt(report.monthlyFtds) / Math.max(1, wdInfo.worked)).toFixed(1)}</b> FTDs/day → EST: <b>{report.monthlyEst}</b> by month end
          </div>}
        </div>

        {/* ── Target Progress ── */}
        {(report.salesTarget || report.superTarget) && report.monthlyFtds && (
          <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 18px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 10 }}>🎯 Target Progress — {monthLabel}</div>
            {[
              { label: "Sales Target", target: parseInt(report.salesTarget) || 0, color: "#F59E0B" },
              ...(report.superTarget ? [{ label: "Super Target", target: parseInt(report.superTarget) || 0, color: "#10B981" }] : []),
            ].filter(t => t.target > 0).map(t => {
              const actual = parseInt(report.monthlyFtds) || 0;
              const est = parseInt(report.monthlyEst) || 0;
              const pct = Math.min(100, Math.round((actual / t.target) * 100));
              const estPct = Math.min(100, Math.round((est / t.target) * 100));
              return (
                <div key={t.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    <span>{t.label}: {t.target}</span>
                    <span>{actual}/{t.target} ({pct}%) — EST: {est} ({estPct}%)</span>
                  </div>
                  <div style={{ height: 20, background: "#F1F5F9", borderRadius: 10, overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", height: "100%", width: `${estPct}%`, background: `${t.color}30`, borderRadius: 10, transition: "width 0.5s" }} />
                    <div style={{ position: "absolute", height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}CC)`, borderRadius: 10, transition: "width 0.5s", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                      {pct > 15 && <span style={{ fontSize: 10, fontWeight: 700, color: "#FFF" }}>{pct}%</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ OLD REPORTS ═══ */}
        {oldMonths.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#64748B", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>📁 Previous Reports ({oldMonths.length})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {oldMonths.map(month => {
                const r = allReports[month] || {};
                const [y, m] = month.split("-");
                const label = `${MONTHS[parseInt(m) - 1]} ${y}`;
                const saved = r.lastSaved ? new Date(r.lastSaved).toLocaleDateString() : "—";
                return (
                  <div key={month} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.15)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#334155" }}>{label}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteReport(month); }} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: 2 }} title="Delete">×</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12, color: "#64748B", marginBottom: 10 }}>
                      <span>FTDs: <b style={{ color: "#10B981" }}>{r.monthlyFtds || "—"}</b></span>
                      <span>EST: <b style={{ color: "#0EA5E9" }}>{r.monthlyEst || "—"}</b></span>
                      <span>Target: <b style={{ color: "#F59E0B" }}>{r.salesTarget || "—"}</b></span>
                      <span>CRG Cap: <b style={{ color: "#8B5CF6" }}>{r.yCrgCap || "—"}</b></span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#94A3B8" }}>Saved: {saved}</span>
                      <button onClick={() => setActiveMonth(month)} style={{ padding: "4px 12px", borderRadius: 6, background: "#6366F1", border: "none", color: "#FFF", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>View / Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DAILY CALCULATIONS RESULT PAGE — Side-by-side Affiliate + Brand tables
// ═══════════════════════════════════════════════════════════════
function DailyCalcsPage({ user, onLogout, onNav, calcs, setCalcs, payments, setPayments, cpPayments, setCpPayments, userAccess }) {
  const data = Array.isArray(calcs) ? calcs : [];
  const [search, setSearch] = useState("");
  const [editRow, setEditRow] = useState(null);
  const [editSide, setEditSide] = useState(null); // 'affiliate' or 'brand'

  // v11.05: Date-change rule — when date changes, Balance Today → Balance Yesterday, Today resets to 0
  const todayStr = new Date().toISOString().slice(0, 10);
  const storedDateKey = 'daily-calcs-last-date';
  const [calcDate, setCalcDate] = useState(() => {
    try { return localStorage.getItem(storedDateKey) || todayStr; } catch { return todayStr; }
  });

  const handleCalcDateChange = (newDate) => {
    if (!newDate || newDate === calcDate) return;
    const hasData = data.some(r => r.type === 'affiliate' || r.type === 'brand');
    if (!hasData) { setCalcDate(newDate); try { localStorage.setItem(storedDateKey, newDate); } catch {} return; }
    if (!confirm(`⚠️ Changing date to ${newDate}\n\nThis will:\n• Move Balance Today → Balance Yesterday for ALL affiliates & brands\n• Reset Balance Today to 0 for ALL affiliates & brands\n\nAre you sure?`)) return;
    setCalcs(prev => (prev || []).map(r => {
      if (r.type !== 'affiliate' && r.type !== 'brand') return r;
      return { ...r, balanceNoCrg: r.balanceWithCrg || "0", balanceWithCrg: "0", transferred: "", updatedAt: Date.now() };
    }));
    setCalcDate(newDate);
    try { localStorage.setItem(storedDateKey, newDate); } catch {}
  };
  const [sortAff, setSortAff] = useState("manual");
  const [sortBrand, setSortBrand] = useState("manual");
  const [sortAffToday, setSortAffToday] = useState(false);
  const [sortBrandToday, setSortBrandToday] = useState(false);
  const userName = user?.name || user?.email || "";

  // v10.12: Load default affiliates & brands data
  const loadDefaults = () => {
    if (data.length > 15 && !confirm("This will REPLACE all current data with defaults. Are you sure?")) return;
    const defaults = [];
    // Affiliates with balances from 2026-03-10 table
    const DEFAULT_AFFILIATES = [
      { name: "AFF 137 - Tokomedia", noCrg: "16393", withCrg: "14293" },
      { name: "AFF 225 / 211 - ExTraffic", noCrg: "10815", withCrg: "10115", sent: true },
      { name: "AFF 123 - MeeseeksMedia", noCrg: "3107", withCrg: "3107" },
      { name: "AFF 165 - BUFU", noCrg: "2335", withCrg: "2335" },
      { name: "AFF 168 - PLASH", noCrg: "2048", withCrg: "2048" },
      { name: "AFF 83 - Leading Media", noCrg: "1666", withCrg: "1666" },
      { name: "AFF 194 - Q16", noCrg: "1000", withCrg: "1000" },
      { name: "AFF 226 - Affilihub", noCrg: "768", withCrg: "768" },
      { name: "AFF 49 - Matar", noCrg: "463", withCrg: "463" },
      { name: "AFF 60 / 134 - Traffic Lab", noCrg: "0", withCrg: "-360" },
      { name: "AFF 183 - PandaAds", noCrg: "-383", withCrg: "-383" },
      { name: "AFF 159 - Farah", noCrg: "-1187", withCrg: "-1187" },
      { name: "AFF 171 - MediaPro", noCrg: "0", withCrg: "-1650" },
      { name: "AFF 139 - 20C", noCrg: "-1650", withCrg: "-1650", sent: true },
      { name: "AFF 133 - Whitefly", noCrg: "-2400", withCrg: "-2400" },
      { name: "AFF 64 / 12 - Punch", noCrg: "-3325", withCrg: "-3325" },
      { name: "AFF 51 - Liquid Group", noCrg: "-7370", withCrg: "-7370" },
      { name: "AFF 28 / 131 - Bugle", noCrg: "-12450", withCrg: "-12450" },
      { name: "AFF 33 / 167 - RVG", noCrg: "-14454", withCrg: "-14529" },
    ];
    DEFAULT_AFFILIATES.forEach(a => {
      defaults.push({ id: genId(), type: "affiliate", name: a.name, balanceNoCrg: a.noCrg, balanceWithCrg: a.withCrg, sent: !!a.sent, comment: "", updatedAt: Date.now(), createdAt: Date.now() });
    });
    // Brands/Networks with balances from 2026-03-10 table
    const DEFAULT_BRANDS = [
      { name: "Helios (ID 152 / 162)", noCrg: "10838", withCrg: "10838" },
      { name: "PRX Ave (ID 1761 1941)", noCrg: "9138", withCrg: "9138" },
      { name: "12Mark (ID 2992)", noCrg: "4757", withCrg: "4217" },
      { name: "May (ID 2682)", noCrg: "3372", withCrg: "3372" },
      { name: "Kalipso (ID 182)", noCrg: "2801", withCrg: "2801" },
      { name: "Photonics (ID 2031)", noCrg: "2694", withCrg: "2694" },
      { name: "Fintrix (ID 3132 3122)", noCrg: "2679", withCrg: "2679" },
      { name: "Avelux / Serenity (ID 582 592)", noCrg: "2041", withCrg: "2041" },
      { name: "Enthrone", noCrg: "1885", withCrg: "1885" },
      { name: "Evest (ID 1071)", noCrg: "1879", withCrg: "1679" },
      { name: "Legion (ID 1192)", noCrg: "1853", withCrg: "1853", sent: true },
      { name: "UBP (ID 2522)", noCrg: "1632", withCrg: "1632" },
      { name: "TenX (ID 452)", noCrg: "1500", withCrg: "1500" },
      { name: "Banana", noCrg: "1400", withCrg: "1400" },
      { name: "Crypto Galassia (ID 2642)", noCrg: "1319", withCrg: "1319" },
      { name: "DM partners (ID 1581)", noCrg: "1163", withCrg: "1163" },
      { name: "Techinvest", noCrg: "1150", withCrg: "1150" },
      { name: "Imperius (ID 3162)", noCrg: "1062", withCrg: "1062" },
      { name: "Mi Tang (ID 3052)", noCrg: "840", withCrg: "840" },
      { name: "TMS", noCrg: "800", withCrg: "800" },
      { name: "VenturyFX (ID 1971)", noCrg: "750", withCrg: "750" },
      { name: "Pantheramedia (ID 472)", noCrg: "727", withCrg: "727" },
      { name: "MW (ID 3322)", noCrg: "864", withCrg: "864" },
      { name: "StoneWall (ID 632)", noCrg: "626", withCrg: "626" },
      { name: "GSI markets (ID 462)", noCrg: "671", withCrg: "571" },
      { name: "Unitraff (ID 192)", noCrg: "534", withCrg: "534" },
      { name: "FX-Q (ID 3273)", noCrg: "524", withCrg: "524" },
      { name: "Theta Holding (ID 2722)", noCrg: "489", withCrg: "489" },
      { name: "ClickBait (ID 352 2021)", noCrg: "718", withCrg: "718" },
      { name: "Capex (ID 1871 / 302)", noCrg: "437", withCrg: "437" },
      { name: "UNIT (ID 802)", noCrg: "140", withCrg: "140" },
      { name: "Miltonia (ID 642)", noCrg: "371", withCrg: "371" },
      { name: "No limits (ID 2051)", noCrg: "434", withCrg: "434" },
      { name: "Michael (ID 2171)", noCrg: "162", withCrg: "162" },
      { name: "Fugazi (ID 2251 / 2261)", noCrg: "161", withCrg: "161" },
      { name: "Celestia (ID 1261)", noCrg: "135", withCrg: "135" },
      { name: "Level markets (ID 282)", noCrg: "100", withCrg: "100" },
      { name: "X Brand (ID 292)", noCrg: "79", withCrg: "79", comment: "postpay" },
      { name: "MediaNow (ID 1001)", noCrg: "-32", withCrg: "-32" },
      { name: "WhiteRhino (ID 2952)", noCrg: "-280", withCrg: "-280" },
      { name: "Fusion (ID 1601)", noCrg: "-1050", withCrg: "-1050", comment: "postpay - Wednesday" },
      { name: "EMP313 (ID 312)", noCrg: "-2577", withCrg: "-2577" },
      { name: "Eurotrade / Z (ID 2111)", noCrg: "-2700", withCrg: "-2700", comment: "postpay" },
      { name: "Monstrack (ID 252)", noCrg: "-3300", withCrg: "-3300" },
      { name: "BB (ID 3283)", noCrg: "-3900", withCrg: "-3900", comment: "postpay" },
      { name: "TraderTok (ID 3022)", noCrg: "-5200", withCrg: "-5200" },
      { name: "SM / Nexus (ID 212 / 222)", noCrg: "-7045", withCrg: "-7045", comment: "postpay" },
      { name: "MN (ID 272 1961)", noCrg: "-10150", withCrg: "-10150", comment: "postpay" },
      { name: "Capitan (ID 652)", noCrg: "0", withCrg: "-507", sent: true },
      { name: "Swin (ID 2212 2232)", noCrg: "-25210", withCrg: "-28473" },
    ];
    DEFAULT_BRANDS.forEach(b => {
      defaults.push({ id: genId(), type: "brand", name: b.name, balanceNoCrg: b.noCrg, balanceWithCrg: b.withCrg, sent: !!b.sent, comment: b.comment || "", updatedAt: Date.now(), createdAt: Date.now() });
    });
    setCalcs(defaults);
  };

  // v10.13: Auto-seed if less than 55 rows
  // v10.25: Auto-seed REMOVED — data is preserved across versions. Use "Load Defaults" button if needed.

  // Split data into affiliates and brands
  const affiliates = data.filter(r => r.type === 'affiliate');
  const brands = data.filter(r => r.type === 'brand');

  // Component-level: yesterday payment helpers (used in both Yesterday Payments and PNL Daily sections)
  const _yesterday = new Date(); _yesterday.setDate(_yesterday.getDate() - 1);
  const _yStr = _yesterday.toISOString().split("T")[0];
  const _isYesterday = (p) => {
    if (p.paidDate === _yStr) return true;
    if (!p.paidDate && p.createdAt) {
      const d = new Date(p.createdAt).toISOString().split("T")[0];
      return d === _yStr;
    }
    return false;
  };
  const recentAffPay = (payments || []).filter(p => _isYesterday(p) && p.type !== "Brand Refund");
  const recentCpPay = (cpPayments || []).filter(p => _isYesterday(p));

  const addRow = (type) => {
    const base = { id: genId(), type, name: "", updatedAt: Date.now(), createdAt: Date.now() };
    if (type === 'buy-affiliate' || type === 'buy-brand') {
      setCalcs(prev => [...(prev || []), { ...base, ftdsCost: "", crgCost: "" }]);
    } else {
      setCalcs(prev => [...(prev || []), { ...base, balanceNoCrg: "", balanceWithCrg: "", sent: false, comment: "" }]);
    }
  };

  const updateField = (id, field, value) => {
    setCalcs(prev => (prev || []).map(r => r.id === id ? { ...r, [field]: value, updatedAt: Date.now() } : r));
  };

  const deleteRow = (id) => {
    if (!confirm("Delete this row?")) return;
    trackDelete('daily-calcs-data', id);
    setCalcs(prev => (prev || []).filter(r => r.id !== id));
  };

  const duplicateRow = (id) => {
    const orig = data.find(r => r.id === id);
    if (orig) setCalcs(prev => [...(prev || []), { ...orig, id: genId(), updatedAt: Date.now(), createdAt: Date.now() }]);
  };

  const moveRow = (id, direction, type) => {
    setCalcs(prev => {
      const arr = [...(prev || [])];
      const subset = arr.filter(r => r.type === type);
      const others = arr.filter(r => r.type !== type);
      const idx = subset.findIndex(r => r.id === id);
      if (idx < 0) return prev;
      if (direction === "up" && idx > 0) [subset[idx], subset[idx - 1]] = [subset[idx - 1], subset[idx]];
      if (direction === "down" && idx < subset.length - 1) [subset[idx], subset[idx + 1]] = [subset[idx + 1], subset[idx]];
      return [...others, ...subset];
    });
  };

  const handleSort = (type) => {
    const setter = type === 'affiliate' ? setSortAff : setSortBrand;
    const current = type === 'affiliate' ? sortAff : sortBrand;
    // Deactivate Today sort when switching to alpha
    if (type === 'affiliate') setSortAffToday(false); else setSortBrandToday(false);
    if (current === "alpha") { setter("manual"); return; }
    setter("alpha");
    setCalcs(prev => {
      const arr = [...(prev || [])];
      const subset = arr.filter(r => r.type === type);
      const others = arr.filter(r => r.type !== type);
      subset.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { numeric: true }));
      return [...others, ...subset];
    });
  };

  const handleSortToday = (type) => {
    const isSortingToday = type === 'affiliate' ? sortAffToday : sortBrandToday;
    const setToday = type === 'affiliate' ? setSortAffToday : setSortBrandToday;
    const setAlpha = type === 'affiliate' ? setSortAff : setSortBrand;
    if (isSortingToday) { setToday(false); return; } // toggle off
    // Deactivate alpha sort
    setAlpha("manual");
    setToday(true);
    setCalcs(prev => {
      const arr = [...(prev || [])];
      const subset = arr.filter(r => r.type === type);
      const others = arr.filter(r => r.type !== type);
      subset.sort((a, b) => parseNum(b.balanceWithCrg) - parseNum(a.balanceWithCrg));
      return [...others, ...subset];
    });
  };

  const matchSearch = r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [r.name, r.comment, r.balanceNoCrg, r.balanceWithCrg].some(v => (v || "").toString().toLowerCase().includes(q));
  };

  const filteredAff = affiliates.filter(matchSearch);
  const filteredBrand = brands.filter(matchSearch);

  const parseNum = v => { const n = parseFloat(String(v || "0").replace(/[,$]/g, "")); return isNaN(n) ? 0 : n; };
  const affTotal = filteredAff.reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);
  const brandTotal = filteredBrand.reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);
  const fmtMoney = n => { const s = Math.abs(n).toLocaleString("en-US"); return n < 0 ? `-$${s}` : `$${s}`; };

  const inp = { width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", background: "#FAFBFC" };
  const thStyle = { padding: "9px 14px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", color: "#6B7280", borderBottom: "1.5px solid #E5E7EB", borderRight: "1px solid #E5E7EB", background: "#FAFBFC", position: "sticky", top: 0, zIndex: 2, whiteSpace: "nowrap" };
  const tdStyle = { padding: "9px 14px", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid #E5E7EB", fontSize: 13, verticalAlign: "middle", color: "#111827", background: "#FFF" };
  const btnSm = { background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 13, borderRadius: 4, lineHeight: 1 };

  const renderTable = (rows, type, sort) => {
    const isBrand = type === 'brand';
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isBrand ? "#7C3AED" : "#DC2626" }}>
              {isBrand ? "🏢 Brand / Network" : "👤 Affiliates"}
            </h3>
            <span style={{ padding: "2px 8px", borderRadius: 10, background: isBrand ? "#EDE9FE" : "#FEE2E2", color: isBrand ? "#7C3AED" : "#DC2626", fontSize: 11, fontWeight: 700 }}>{rows.length}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => handleSort(type)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: sort === "alpha" ? "#0EA5E9" : "#FFF", color: sort === "alpha" ? "#FFF" : "#64748B", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>A→Z</button>
            <button
              onClick={() => handleSortToday(type)}
              title="Sort by Balance Today (high → low)"
              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: (type === 'affiliate' ? sortAffToday : sortBrandToday) ? "#F59E0B" : "#FFF", color: (type === 'affiliate' ? sortAffToday : sortBrandToday) ? "#FFF" : "#64748B", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>$↓</button>
            <button onClick={() => addRow(type)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: isBrand ? "#7C3AED" : "#DC2626", color: "#FFF", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
          </div>
        </div>
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isBrand ? 520 : 460 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 30 }}>#</th>
                <th style={thStyle}>{isBrand ? "Brand / Network" : "Affiliate"}</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Balance Yesterday</th>
                <th
                  style={{ ...thStyle, textAlign: "right", cursor: "pointer", userSelect: "none" }}
                  title="Click to sort high → low"
                  onClick={() => handleSortToday(type)}
                >
                  Balance Today {(type === 'affiliate' ? sortAffToday : sortBrandToday) ? " ▼" : ""}
                </th>
                <th style={{ ...thStyle, textAlign: "center", width: 50 }}>Active</th>
                {isBrand && <th style={thStyle}>Comment</th>}
                <th style={{ ...thStyle, width: 80, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={isBrand ? 7 : 6} style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#CBD5E1", fontSize: 13 }}>No entries yet — click "+ Add" above</td></tr>
              )}
              {rows.map((r, i) => {
                const bal = parseNum(r.balanceWithCrg);
                const balColor = bal > 0 ? "#16A34A" : bal < 0 ? "#DC2626" : "#64748B";
                return (
                  <tr key={r.id} style={{ transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ ...tdStyle, color: "#94A3B8", fontSize: 11, textAlign: "center", fontWeight: 600 }}>{i + 1}</td>
                    <td style={tdStyle}>
                      <input value={r.name || ""} onChange={e => updateField(r.id, "name", e.target.value)} style={{ ...inp, fontWeight: 600, color: "#0F172A" }} placeholder={isBrand ? "Brand name..." : "AFF ID - Name"} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <input value={r.balanceNoCrg || ""} onChange={e => updateField(r.id, "balanceNoCrg", e.target.value)} style={{ ...inp, textAlign: "right", width: 90 }} placeholder="$0" />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <input value={r.balanceWithCrg || ""} onChange={e => updateField(r.id, "balanceWithCrg", e.target.value)} style={{ ...inp, textAlign: "right", width: 90, color: balColor, fontWeight: 700 }} placeholder="$0" />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {(() => { const y = parseNum(r.balanceNoCrg); const t = parseNum(r.balanceWithCrg); const active = y !== t; return active ? <span style={{ color: "#16A34A", fontSize: 16, fontWeight: 800 }}>✓</span> : <span style={{ color: "#CBD5E1", fontSize: 14 }}>—</span>; })()}
                    </td>
                    {isBrand && (
                      <td style={tdStyle}>
                        <input value={r.comment || ""} onChange={e => updateField(r.id, "comment", e.target.value)} style={{ ...inp, fontSize: 11, color: "#64748B" }} placeholder="note..." />
                      </td>
                    )}
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                        <button onClick={() => moveRow(r.id, "up", type)} style={btnSm} title="Move up">▲</button>
                        <button onClick={() => moveRow(r.id, "down", type)} style={btnSm} title="Move down">▼</button>
                        <button onClick={() => duplicateRow(r.id)} style={{ ...btnSm, color: "#0EA5E9" }} title="Duplicate">⧉</button>
                        <button onClick={() => deleteRow(r.id)} style={{ ...btnSm, color: "#EF4444" }} title="Delete">✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#F8FAFC" }}>
                <td colSpan={2} style={{ ...tdStyle, fontWeight: 700, fontSize: 12, borderTop: "2px solid #E2E8F0" }}>Total ({rows.length})</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontSize: 12, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace" }}>{fmtMoney(rows.reduce((s, r) => s + parseNum(r.balanceNoCrg), 0))}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, fontSize: 13, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace", color: affTotal >= 0 ? "#16A34A" : "#DC2626" }}>{type === 'affiliate' ? fmtMoney(affTotal) : fmtMoney(brandTotal)}</td>
                <td colSpan={isBrand ? 3 : 2} style={{ ...tdStyle, borderTop: "2px solid #E2E8F0" }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="dailycalcs" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#EF4444" />
      <main className="blitz-main" style={{ maxWidth: 1500, margin: "0 auto", padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>📊 Daily Calculations Result</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* v11.05: Date selector — changing date triggers Balance Today → Yesterday shift */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, background: calcDate === todayStr ? "#F0FDF4" : "#FFF7ED", border: `1px solid ${calcDate === todayStr ? "#BBF7D0" : "#FED7AA"}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: calcDate === todayStr ? "#15803D" : "#C2410C" }}>📅 Date:</span>
              <input
                type="date"
                value={calcDate}
                onChange={e => handleCalcDateChange(e.target.value)}
                style={{ border: "none", background: "transparent", fontSize: 13, fontWeight: 700, color: calcDate === todayStr ? "#15803D" : "#C2410C", cursor: "pointer", outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
              />
              {calcDate !== todayStr && <span style={{ fontSize: 10, color: "#C2410C", fontWeight: 600 }}>⚠ Not today</span>}
            </div>
            {data.length === 0 && <button onClick={loadDefaults} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0F172A", color: "#FFF", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📥 Load Default Data</button>}
            <div style={{ position: "relative" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ padding: "8px 14px 8px 34px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, width: 200, background: "#FFF" }} />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 14 }}>🔍</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
          {(() => {
            const affDebt = filteredAff.filter(r => parseNum(r.balanceWithCrg) < 0).reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);
            const affPP = filteredAff.filter(r => parseNum(r.balanceWithCrg) > 0).reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);
            const brandDebt = filteredBrand.filter(r => parseNum(r.balanceWithCrg) < 0).reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);
            const brandPP = filteredBrand.filter(r => parseNum(r.balanceWithCrg) > 0).reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);
            return [
              { label: "Affiliate Debt", value: fmtMoney(affDebt), color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
              { label: "Affiliate PP", value: fmtMoney(affPP), color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
              { label: "Brands Debt", value: fmtMoney(brandDebt), color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
              { label: "Brands PP", value: fmtMoney(brandPP), color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
            ];
          })().map((c, i) => (
            <div key={i} style={{ padding: "14px 18px", borderRadius: 12, background: c.bg, border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748B", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color, fontFamily: "'JetBrains Mono',monospace" }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Two Tables Side by Side */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {renderTable(filteredAff, 'affiliate', sortAff)}
          {renderTable(filteredBrand, 'brand', sortBrand)}
        </div>

        {/* ═══ YESTERDAY PAYMENTS — Auto from CRM data + Add/Edit/Delete ═══ */}
        {(() => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = yesterday.toISOString().split("T")[0];
          const today = new Date().toISOString().split("T")[0];

          // Auto-populate: paidDate = yesterday OR (no paidDate but createdAt was yesterday)
          const isYesterday = (p) => {
            if (p.paidDate === yStr) return true;
            if (!p.paidDate && p.createdAt) {
              const d = new Date(p.createdAt).toISOString().split("T")[0];
              return d === yStr;
            }
            return false;
          };

          const affPayTotal = recentAffPay.reduce((s, p) => s + parseNum(p.amount), 0);
          const affFeeTotal = recentAffPay.reduce((s, p) => { const f = String(p.fee || "0"); if (f.includes("%")) return s; return s + parseNum(f); }, 0);
          const cpPayTotal = recentCpPay.reduce((s, p) => s + parseNum(p.amount), 0);
          const cpFeeTotal = recentCpPay.reduce((s, p) => { const f = String(p.fee || "0"); if (f.includes("%")) return s; return s + parseNum(f); }, 0);

          const handlePayField = (id, field, value) => {
            setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value, updatedAt: Date.now() } : p));
          };
          const handleCpField = (id, field, value) => {
            setCpPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value, updatedAt: Date.now() } : p));
          };
          const deleteAffPay = (id) => {
            if (!confirm("Remove this affiliate payment?")) return;
            trackDelete('payments', id);
            setPayments(prev => prev.filter(p => p.id !== id));
          };
          const deleteCpPay = (id) => {
            if (!confirm("Remove this brand payment?")) return;
            trackDelete('customer-payments', id);
            setCpPayments(prev => prev.filter(p => p.id !== id));
          };
          const addAffPay = () => {
            const newP = { id: genId(), invoice: "", paidDate: yStr, status: "Open", amount: "", fee: "", openBy: user?.name || "", type: "Affiliate Payment", instructions: "", paymentHash: "", month: yesterday.getMonth(), year: yesterday.getFullYear(), createdAt: Date.now(), updatedAt: Date.now() };
            setPayments(prev => [newP, ...(prev || [])]);
          };
          const addCpPay = () => {
            const newP = { id: genId(), invoice: "", amount: "", fee: "", status: "Open", type: "Customer Payment", openBy: user?.name || "", paidDate: yStr, paymentHash: "", trcAddress: "", ercAddress: "", brand: "", walletMatched: false, month: yesterday.getMonth(), year: yesterday.getFullYear(), createdAt: Date.now(), updatedAt: Date.now() };
            setCpPayments(prev => [newP, ...(prev || [])]);
          };

          const miniInp = { padding: "3px 6px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", background: "#FAFBFC", width: "100%" };
          const miniSel = { padding: "3px 5px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, background: "#FAFBFC", cursor: "pointer", width: "100%" };
          const statusBg = (s) => s === "Paid" || s === "Received" ? "#D1FAE5" : s === "Open" ? "#FEF3C7" : "#DBEAFE";
          const statusColor = (s) => s === "Paid" || s === "Received" ? "#065F46" : s === "Open" ? "#92400E" : "#1E40AF";

          return (
            <div style={{ marginTop: 36 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0F172A" }}>💳 Yesterday Payments</h2>
                <span style={{ padding: "3px 10px", borderRadius: 20, background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 10, fontWeight: 700, color: "#15803D" }}>⟳ Auto-synced from Payments page · {yStr}</span>
              </div>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

                {/* ── Affiliate Payments ── */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#DC2626" }}>
                      👤 Affiliate Payments <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>({recentAffPay.length})</span>
                    </h3>
                    <button onClick={addAffPay} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#DC2626", color: "#FFF", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add Row</button>
                  </div>
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 340 }}>
                      <thead><tr>
                        <th style={thStyle}>Affiliate</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Fee</th>
                        <th style={{ ...thStyle, textAlign: "center", width: 80 }}>Status</th>
                        <th style={{ ...thStyle, width: 30 }}></th>
                      </tr></thead>
                      <tbody>
                        {recentAffPay.length === 0 && (
                          <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", padding: 20, color: "#CBD5E1", fontSize: 12 }}>
                            No affiliate payments for {yStr} — click "+ Add Row" to add one
                          </td></tr>
                        )}
                        {recentAffPay.map(p => (
                          <tr key={p.id} onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background=""}>
                            <td style={tdStyle}>
                              <input value={p.invoice || ""} onChange={e => handlePayField(p.id, "invoice", e.target.value)} style={{ ...miniInp, fontWeight: 700, color: "#0EA5E9" }} placeholder="Invoice / AFF ID" />
                              {getAffiliateName(p.invoice) && <div style={{ fontSize: 9, color: "#64748B", marginTop: 1 }}>{getAffiliateName(p.invoice)}</div>}
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>
                              <input value={p.amount || ""} onChange={e => handlePayField(p.id, "amount", e.target.value)} style={{ ...miniInp, textAlign: "right", fontWeight: 700, color: "#0F172A" }} placeholder="0" />
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>
                              <input value={p.fee || ""} onChange={e => handlePayField(p.id, "fee", e.target.value)} style={{ ...miniInp, textAlign: "right", color: "#0EA5E9" }} placeholder="0" />
                            </td>
                            <td style={{ ...tdStyle, textAlign: "center", padding: "4px 6px" }}>
                              <select value={p.status || "Open"} onChange={e => handlePayField(p.id, "status", e.target.value)}
                                style={{ ...miniSel, background: statusBg(p.status), color: statusColor(p.status), fontWeight: 700 }}>
                                {["Open", "On the way", "Approved to pay", "Paid"].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td style={{ ...tdStyle, textAlign: "center", padding: "4px 4px" }}>
                              <button onClick={() => deleteAffPay(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14, padding: "2px 4px", borderRadius: 4 }} title="Delete">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr style={{ background: "#F8FAFC" }}>
                        <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid #E2E8F0" }}>Total ({recentAffPay.length})</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace" }}>{fmtMoney(affPayTotal)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace", color: "#0EA5E9" }}>{fmtMoney(affFeeTotal)}</td>
                        <td colSpan={2} style={{ ...tdStyle, borderTop: "2px solid #E2E8F0" }}></td>
                      </tr></tfoot>
                    </table>
                  </div>
                </div>

                {/* ── Brand / Customer Payments ── */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#7C3AED" }}>
                      🏢 Brand Payments <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>({recentCpPay.length})</span>
                    </h3>
                    <button onClick={addCpPay} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#7C3AED", color: "#FFF", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add Row</button>
                  </div>
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 340 }}>
                      <thead><tr>
                        <th style={thStyle}>Brand Name</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Fee</th>
                        <th style={{ ...thStyle, textAlign: "center", width: 80 }}>Status</th>
                        <th style={{ ...thStyle, width: 30 }}></th>
                      </tr></thead>
                      <tbody>
                        {recentCpPay.length === 0 && (
                          <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", padding: 20, color: "#CBD5E1", fontSize: 12 }}>
                            No brand payments for {yStr} — click "+ Add Row" to add one
                          </td></tr>
                        )}
                        {recentCpPay.map(p => (
                          <tr key={p.id} onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background=""}>
                            <td style={tdStyle}>
                              <input value={p.invoice || ""} onChange={e => handleCpField(p.id, "invoice", e.target.value)} style={{ ...miniInp, fontWeight: 700, color: "#7C3AED" }} placeholder="Invoice / Brand" />
                              {p.brand && <div style={{ fontSize: 9, color: "#64748B", marginTop: 1 }}>{p.brand}</div>}
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>
                              <input value={p.amount || ""} onChange={e => handleCpField(p.id, "amount", e.target.value)} style={{ ...miniInp, textAlign: "right", fontWeight: 700, color: "#0F172A" }} placeholder="0" />
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>
                              <input value={p.fee || ""} onChange={e => handleCpField(p.id, "fee", e.target.value)} style={{ ...miniInp, textAlign: "right", color: "#0EA5E9" }} placeholder="0" />
                            </td>
                            <td style={{ ...tdStyle, textAlign: "center", padding: "4px 6px" }}>
                              <select value={p.status || "Open"} onChange={e => handleCpField(p.id, "status", e.target.value)}
                                style={{ ...miniSel, background: statusBg(p.status), color: statusColor(p.status), fontWeight: 700 }}>
                                {["Open", "Pending", "Received", "Refund"].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td style={{ ...tdStyle, textAlign: "center", padding: "4px 4px" }}>
                              <button onClick={() => deleteCpPay(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14, padding: "2px 4px", borderRadius: 4 }} title="Delete">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr style={{ background: "#F8FAFC" }}>
                        <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid #E2E8F0" }}>Total ({recentCpPay.length})</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace" }}>{fmtMoney(cpPayTotal)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace", color: "#0EA5E9" }}>{fmtMoney(cpFeeTotal)}</td>
                        <td colSpan={2} style={{ ...tdStyle, borderTop: "2px solid #E2E8F0" }}></td>
                      </tr></tfoot>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* ═══ TOTAL BUYING YESTERDAY ═══ */}
        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: "#0F172A" }}>📊 PNL Daily</h2>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

            {/* ── Affiliate PNL with edit/delete/add ── */}
            {(() => {
              const activeAff = affiliates.filter(r => parseNum(r.balanceNoCrg) !== parseNum(r.balanceWithCrg));
              const affPnlTotal = activeAff.reduce((s, r) => s + (parseNum(r.balanceWithCrg) - parseNum(r.balanceNoCrg)), 0);
              const affTransTotal = activeAff.reduce((s, r) => s + parseNum(r.transferred || 0), 0);
              const miniInp2 = { padding: "3px 7px", borderRadius: 5, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", background: "#FAFBFC", width: "100%" };
              return (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#DC2626" }}>
                      👤 Affiliate PNL <span style={{ fontSize: 11, fontWeight: 500, color: "#64748B" }}>({activeAff.length} active)</span>
                    </h3>
                    <button onClick={() => addRow('affiliate')} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#DC2626", color: "#FFF", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                  </div>
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                      <thead><tr>
                        <th style={thStyle}>Affiliate</th>
                        <th style={{ ...thStyle, textAlign: "right", width: 90 }}>Yesterday</th>
                        <th style={{ ...thStyle, textAlign: "right", width: 90 }}>Today</th>
                        <th style={{ ...thStyle, textAlign: "right", width: 80 }}>PNL</th>
                        <th style={{ ...thStyle, textAlign: "right", color: "#7C3AED", width: 90 }}>Transferred</th>
                        <th style={{ ...thStyle, width: 28 }}></th>
                      </tr></thead>
                      <tbody>
                        {activeAff.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", padding: 24, color: "#CBD5E1", fontSize: 13 }}>No active affiliates — update balances above</td></tr>}
                        {activeAff.map(r => {
                          const pnl = parseNum(r.balanceWithCrg) - parseNum(r.balanceNoCrg);
                          const affId = (r.id || "").toString();
                          const affName = (r.name || "").toLowerCase();
                          const matchPay = recentAffPay.find(p => {
                            const inv = (p.invoice || "").toString().trim();
                            return inv === affId || affName.includes(inv.toLowerCase()) || inv.toLowerCase().includes(affName.split(" ")[0]);
                          });
                          const autoVal = matchPay ? parseNum(matchPay.amount) : null;
                          const stored = r.transferred;
                          const transVal = stored !== undefined && stored !== "" ? stored : (autoVal !== null ? autoVal : "");
                          return (
                            <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background=""}>
                              <td style={{ ...tdStyle, padding: "4px 6px" }}>
                                <input value={r.name || ""} onChange={e => updateField(r.id, "name", e.target.value)} style={{ ...miniInp2, fontWeight: 600, color: "#0F172A" }} placeholder="AFF ID - Name" />
                              </td>
                              <td style={{ ...tdStyle, textAlign: "right", padding: "4px 6px" }}>
                                <input type="number" value={r.balanceNoCrg || ""} onChange={e => updateField(r.id, "balanceNoCrg", e.target.value)} style={{ ...miniInp2, textAlign: "right", width: 80 }} placeholder="0" />
                              </td>
                              <td style={{ ...tdStyle, textAlign: "right", padding: "4px 6px" }}>
                                <input type="number" value={r.balanceWithCrg || ""} onChange={e => updateField(r.id, "balanceWithCrg", e.target.value)} style={{ ...miniInp2, textAlign: "right", width: 80, color: parseNum(r.balanceWithCrg) >= 0 ? "#16A34A" : "#DC2626", fontWeight: 700 }} placeholder="0" />
                              </td>
                              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: pnl >= 0 ? "#16A34A" : "#DC2626" }}>{fmtMoney(pnl)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={transVal}
                                  onChange={e => updateField(r.id, "transferred", e.target.value)}
                                  style={{ ...miniInp2, textAlign: "right", width: 80, fontWeight: 700, color: "#7C3AED", background: transVal ? "#F5F3FF" : "#FAFAFA", border: "1px solid #DDD6FE" }}
                                  placeholder={autoVal !== null ? String(autoVal) : "0"}
                                  title={matchPay ? "Auto-filled from Yesterday Payments" : "Enter transferred amount"}
                                />
                              </td>
                              <td style={{ ...tdStyle, textAlign: "center", padding: "4px 2px" }}>
                                <button onClick={() => deleteRow(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13, padding: "2px 4px", borderRadius: 4 }} title="Delete">✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot><tr style={{ background: "#F8FAFC" }}>
                        <td colSpan={3} style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid #E2E8F0" }}>Total ({activeAff.length})</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: affPnlTotal >= 0 ? "#16A34A" : "#DC2626" }}>{fmtMoney(affPnlTotal)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#7C3AED" }}>{fmtMoney(affTransTotal)}</td>
                        <td style={{ ...tdStyle, borderTop: "2px solid #E2E8F0" }}></td>
                      </tr></tfoot>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* ── Brand PNL with edit/delete/add ── */}
            {(() => {
              const activeBr = brands.filter(r => parseNum(r.balanceNoCrg) !== parseNum(r.balanceWithCrg));
              const brPnlTotal = activeBr.reduce((s, r) => s + (parseNum(r.balanceWithCrg) - parseNum(r.balanceNoCrg)), 0);
              const brTransTotal = activeBr.reduce((s, r) => s + parseNum(r.transferred || 0), 0);
              const miniInp2 = { padding: "3px 7px", borderRadius: 5, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", background: "#FAFBFC", width: "100%" };
              return (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#7C3AED" }}>
                      🏢 Brand / Network PNL <span style={{ fontSize: 11, fontWeight: 500, color: "#64748B" }}>({activeBr.length} active)</span>
                    </h3>
                    <button onClick={() => addRow('brand')} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#7C3AED", color: "#FFF", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                  </div>
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                      <thead><tr>
                        <th style={thStyle}>Brand / Network</th>
                        <th style={{ ...thStyle, textAlign: "right", width: 90 }}>Yesterday</th>
                        <th style={{ ...thStyle, textAlign: "right", width: 90 }}>Today</th>
                        <th style={{ ...thStyle, textAlign: "right", width: 80 }}>PNL</th>
                        <th style={{ ...thStyle, textAlign: "right", color: "#7C3AED", width: 90 }}>Transferred</th>
                        <th style={{ ...thStyle, width: 28 }}></th>
                      </tr></thead>
                      <tbody>
                        {activeBr.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", padding: 24, color: "#CBD5E1", fontSize: 13 }}>No active brands — update balances above</td></tr>}
                        {activeBr.map(r => {
                          const pnl = parseNum(r.balanceWithCrg) - parseNum(r.balanceNoCrg);
                          const brName = (r.name || "").toLowerCase().replace(/\s*\(id.*\)$/i, "").trim();
                          const matchPay = recentCpPay.find(p => {
                            const inv = (p.invoice || p.brand || "").toLowerCase().trim();
                            return brName && (inv.includes(brName) || brName.includes(inv) || inv.includes(brName.split(" ")[0]));
                          });
                          const autoVal = matchPay ? parseNum(matchPay.amount) : null;
                          const stored = r.transferred;
                          const transVal = stored !== undefined && stored !== "" ? stored : (autoVal !== null ? autoVal : "");
                          return (
                            <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background=""}>
                              <td style={{ ...tdStyle, padding: "4px 6px" }}>
                                <input value={r.name || ""} onChange={e => updateField(r.id, "name", e.target.value)} style={{ ...miniInp2, fontWeight: 600, color: "#0F172A" }} placeholder="Brand name..." />
                              </td>
                              <td style={{ ...tdStyle, textAlign: "right", padding: "4px 6px" }}>
                                <input type="number" value={r.balanceNoCrg || ""} onChange={e => updateField(r.id, "balanceNoCrg", e.target.value)} style={{ ...miniInp2, textAlign: "right", width: 80 }} placeholder="0" />
                              </td>
                              <td style={{ ...tdStyle, textAlign: "right", padding: "4px 6px" }}>
                                <input type="number" value={r.balanceWithCrg || ""} onChange={e => updateField(r.id, "balanceWithCrg", e.target.value)} style={{ ...miniInp2, textAlign: "right", width: 80, color: parseNum(r.balanceWithCrg) >= 0 ? "#16A34A" : "#DC2626", fontWeight: 700 }} placeholder="0" />
                              </td>
                              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: pnl >= 0 ? "#16A34A" : "#DC2626" }}>{fmtMoney(pnl)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={transVal}
                                  onChange={e => updateField(r.id, "transferred", e.target.value)}
                                  style={{ ...miniInp2, textAlign: "right", width: 80, fontWeight: 700, color: "#7C3AED", background: transVal ? "#F5F3FF" : "#FAFAFA", border: "1px solid #DDD6FE" }}
                                  placeholder={autoVal !== null ? String(autoVal) : "0"}
                                  title={matchPay ? "Auto-filled from Yesterday Payments" : "Enter transferred amount"}
                                />
                              </td>
                              <td style={{ ...tdStyle, textAlign: "center", padding: "4px 2px" }}>
                                <button onClick={() => deleteRow(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13, padding: "2px 4px", borderRadius: 4 }} title="Delete">✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot><tr style={{ background: "#F8FAFC" }}>
                        <td colSpan={3} style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid #E2E8F0" }}>Total ({activeBr.length})</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: brPnlTotal >= 0 ? "#16A34A" : "#DC2626" }}>{fmtMoney(brPnlTotal)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, borderTop: "2px solid #E2E8F0", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#7C3AED" }}>{fmtMoney(brTransTotal)}</td>
                        <td style={{ ...tdStyle, borderTop: "2px solid #E2E8F0" }}></td>
                      </tr></tfoot>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ═══ PROFIT SUMMARY BAR ═══ */}
        {(() => {
          const profitRow = data.find(r => r.type === 'profit-summary');
          const ensureProfitRow = () => {
            if (!profitRow) {
              setCalcs(prev => [...(prev || []), { id: genId(), type: 'profit-summary', totalProfit: "", yesterdayProfit: "", gillette: "", dolphins: "", fee: "", updatedAt: Date.now() }]);
            }
          };
          if (!profitRow) {
            return (
              <div style={{ marginTop: 32, textAlign: "center" }}>
                <button onClick={ensureProfitRow} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#0F172A", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Profit Summary</button>
              </div>
            );
          }
          const pf = (field) => profitRow[field] || "";
          const upf = (field, val) => updateField(profitRow.id, field, val);
          const profitInp = { ...inp, textAlign: "center", fontWeight: 700, fontSize: 14, padding: "10px 12px" };
          // v10.20: Auto-calculate Yesterday Profit = Brand PNL - Affiliate PNL
          const activeBrands = brands.filter(r => parseNum(r.balanceNoCrg) !== parseNum(r.balanceWithCrg));
          const brandPnl = activeBrands.reduce((s, r) => s + (parseNum(r.balanceWithCrg) - parseNum(r.balanceNoCrg)), 0);
          const activeAffs = affiliates.filter(r => parseNum(r.balanceNoCrg) !== parseNum(r.balanceWithCrg));
          const affPnl = activeAffs.reduce((s, r) => s + (parseNum(r.balanceWithCrg) - parseNum(r.balanceNoCrg)), 0);
          const yesterdayProfitCalc = brandPnl - affPnl;
          return (
            <div style={{ marginTop: 32 }}>
              <div style={{ overflowX: "auto", borderRadius: 12, border: "2px solid #1E293B", background: "#FFF" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead><tr>
                    {[
                      { label: "Total Profit", icon: "💰", bg: "#1E293B", color: "#FFF" },
                      { label: "Yesterday Profit", icon: "📅", bg: "#334155", color: "#FFF" },
                      { label: "Gillette ✏️", bg: "#4682B4", color: "#FFF" },
                      { label: "Dolphins 🐬", bg: "#5B9BD5", color: "#FFF" },
                      { label: "Fee 🏠", bg: "#7FB3D8", color: "#FFF" },
                    ].map((h, i) => (
                      <th key={i} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: h.color, background: h.bg, borderBottom: "2px solid #0F172A", textAlign: "center", whiteSpace: "nowrap" }}>{h.icon ? `${h.icon} ` : ""}{h.label}</th>
                    ))}
                  </tr></thead>
                  <tbody><tr>
                    <td style={{ ...tdStyle, textAlign: "center", background: "#F8FAFC" }}><input value={pf("totalProfit")} onChange={e => upf("totalProfit", e.target.value)} style={{ ...profitInp, color: "#16A34A" }} placeholder="$0" /></td>
                    <td style={{ ...tdStyle, textAlign: "center", background: "#F8FAFC" }}><span style={{ ...profitInp, color: yesterdayProfitCalc >= 0 ? "#16A34A" : "#DC2626", display: "inline-block" }}>{fmtMoney(yesterdayProfitCalc)}</span></td>
                    <td style={{ ...tdStyle, textAlign: "center", background: "#F8FAFC" }}><input value={pf("gillette")} onChange={e => upf("gillette", e.target.value)} style={profitInp} placeholder="$0" /></td>
                    <td style={{ ...tdStyle, textAlign: "center", background: "#F8FAFC" }}><input value={pf("dolphins")} onChange={e => upf("dolphins", e.target.value)} style={profitInp} placeholder="$0" /></td>
                    <td style={{ ...tdStyle, textAlign: "center", background: "#F8FAFC" }}><input value={pf("fee")} onChange={e => upf("fee", e.target.value)} style={profitInp} placeholder="$0" /></td>
                  </tr></tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ═══ DAILY SUMMARY TABLE ═══ */}
        {(() => {
          const profitRow = data.find(r => r.type === 'profit-summary');
          const pf = (field) => (profitRow && profitRow[field]) || "";
          const upf = (field, val) => { if (profitRow) updateField(profitRow.id, field, val); };
          const sumInp = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", background: "#FAFBFC", textAlign: "right", fontWeight: 700 };

          // Auto-calc from tables above
          const affDebt = filteredAff.filter(r => parseNum(r.balanceWithCrg) < 0).reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);
          const affPP = filteredAff.filter(r => parseNum(r.balanceWithCrg) > 0).reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);
          const brandDebt = filteredBrand.filter(r => parseNum(r.balanceWithCrg) < 0).reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);
          const brandPP = filteredBrand.filter(r => parseNum(r.balanceWithCrg) > 0).reduce((s, r) => s + parseNum(r.balanceWithCrg), 0);

          const balance = parseNum(pf("ds_balance"));
          const tBalance = parseNum(pf("ds_tbalance"));

          const monthlyProfit = parseNum(pf("ds_monthlyProfit_reports"));
          const dailyProfit = parseNum(pf("ds_dailyProfit_reports"));
          const monthlyProfitCam = parseNum(pf("ds_monthlyProfit_cameron"));
          const dailyProfitCam = parseNum(pf("ds_dailyProfit_cameron"));
          const diffMonthly = monthlyProfit - monthlyProfitCam;
          const diffDaily = dailyProfit - dailyProfitCam;

          const expense = parseNum(pf("ds_expense"));
          const wallets = parseNum(pf("ds_wallets"));
          const b2 = parseNum(pf("ds_b2"));

          const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

          const hdrCell = { padding: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center", borderBottom: "2px solid #CBD5E1" };
          const valCell = { padding: "6px 8px", borderBottom: "1px solid #F1F5F9", textAlign: "center", verticalAlign: "middle" };
          const autoVal = (v, color) => <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color }}>{fmtMoney(v)}</span>;

          return (
            <div style={{ marginTop: 28 }}>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {/* LEFT: Affiliates & Brands summary */}
                <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={{ borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th colSpan={2} style={{ ...hdrCell, background: "#DBEAFE", color: "#1E40AF" }}>Affiliates</th>
                        <th colSpan={2} style={{ ...hdrCell, background: "#FEF3C7", color: "#92400E" }}>Brands</th>
                        <th style={{ ...hdrCell, width: 30 }}></th>
                        <th style={{ ...hdrCell, background: "#D1FAE5", color: "#065F46" }}>Balance</th>
                        <th style={{ ...hdrCell, background: "#D1FAE5", color: "#065F46" }}>T Balance</th>
                      </tr></thead>
                      <tbody>
                        <tr>
                          <td style={valCell}>{autoVal(affDebt, "#DC2626")}</td>
                          <td style={valCell}>{autoVal(affPP, "#16A34A")}</td>
                          <td style={valCell}>{autoVal(brandDebt, "#DC2626")}</td>
                          <td style={valCell}>{autoVal(brandPP, "#16A34A")}</td>
                          <td style={valCell}></td>
                          <td style={valCell}><input value={pf("ds_balance")} onChange={e => upf("ds_balance", e.target.value)} style={{ ...sumInp, color: balance >= 0 ? "#16A34A" : "#DC2626" }} placeholder="$0" /></td>
                          <td style={valCell}><input value={pf("ds_tbalance")} onChange={e => upf("ds_tbalance", e.target.value)} style={{ ...sumInp, color: tBalance >= 0 ? "#16A34A" : "#DC2626" }} placeholder="$0" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Monthly/Daily Profit */}
                  <div style={{ borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF", overflow: "hidden", marginTop: 12 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={{ ...hdrCell, background: "#F8FAFC" }}></th>
                        <th style={{ ...hdrCell, background: "#DBEAFE", color: "#1E40AF" }}>Monthly Profit</th>
                        <th style={{ ...hdrCell, background: "#FEF3C7", color: "#92400E" }}>Daily Profit</th>
                        <th style={{ ...hdrCell, width: 30 }}></th>
                        <th style={{ ...hdrCell, background: "#FDE8E8", color: "#991B1B" }}>Expense</th>
                        <th style={{ ...hdrCell, background: "#DBEAFE", color: "#1E40AF" }}>Wallets</th>
                        <th style={{ ...hdrCell, background: "#E0E7FF", color: "#3730A3" }}>B2</th>
                      </tr></thead>
                      <tbody>
                        <tr>
                          <td style={{ ...valCell, fontWeight: 700, fontSize: 12, color: "#334155" }}>Reports</td>
                          <td style={valCell}><input value={pf("ds_monthlyProfit_reports")} onChange={e => upf("ds_monthlyProfit_reports", e.target.value)} style={{ ...sumInp, color: "#16A34A" }} placeholder="$0" /></td>
                          <td style={valCell}><input value={pf("ds_dailyProfit_reports")} onChange={e => upf("ds_dailyProfit_reports", e.target.value)} style={{ ...sumInp, color: "#16A34A" }} placeholder="$0" /></td>
                          <td style={valCell}></td>
                          <td style={valCell}><input value={pf("ds_expense")} onChange={e => upf("ds_expense", e.target.value)} style={{ ...sumInp, color: "#DC2626" }} placeholder="$0" /></td>
                          <td style={valCell}><input value={pf("ds_wallets")} onChange={e => upf("ds_wallets", e.target.value)} style={{ ...sumInp, color: "#1E40AF" }} placeholder="$0" /></td>
                          <td style={valCell}><input value={pf("ds_b2")} onChange={e => upf("ds_b2", e.target.value)} style={sumInp} placeholder="$0" /></td>
                        </tr>
                        <tr>
                          <td style={{ ...valCell, fontWeight: 700, fontSize: 12, color: "#334155" }}>Cameron</td>
                          <td style={valCell}><input value={pf("ds_monthlyProfit_cameron")} onChange={e => upf("ds_monthlyProfit_cameron", e.target.value)} style={sumInp} placeholder="$0" /></td>
                          <td style={valCell}><input value={pf("ds_dailyProfit_cameron")} onChange={e => upf("ds_dailyProfit_cameron", e.target.value)} style={sumInp} placeholder="$0" /></td>
                          <td style={valCell}></td>
                          <td style={valCell}></td>
                          <td style={valCell}></td>
                          <td style={{ ...valCell, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 11, color: "#64748B" }}>{autoVal(parseNum(pf("ds_b2")), "#3730A3")}</td>
                        </tr>
                        <tr style={{ background: "#FEF3C7" }}>
                          <td style={{ ...valCell, fontWeight: 800, fontSize: 12, color: "#92400E" }}>Difference</td>
                          <td style={valCell}>{autoVal(diffMonthly, diffMonthly >= 0 ? "#16A34A" : "#DC2626")}</td>
                          <td style={valCell}>{autoVal(diffDaily, diffDaily >= 0 ? "#16A34A" : "#DC2626")}</td>
                          <td style={valCell}></td>
                          <td colSpan={3} style={{ ...valCell, fontWeight: 700, fontSize: 13, color: "#64748B", fontFamily: "'JetBrains Mono',monospace" }}>{today}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// v10.28: ZIP DATA EXPORT / IMPORT COMPONENT
// ═══════════════════════════════════════════════════════════════
function ZipDataSection({ user }) {
  const [zipStatus, setZipStatus] = useState(null); // { type: 'ok'|'error'|'loading', msg: string }
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);

  const sectionStyle = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
  const sectionTitle = { fontSize: 15, fontWeight: 700, color: "#334155", marginBottom: 4 };

  // ── Download all data as ZIP ──
  const handleDownloadZip = async () => {
    setZipStatus({ type: 'loading', msg: 'Preparing ZIP…' });
    try {
      const res = await fetch(`${API_BASE}/data/download-zip`, { headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const dateStr = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blitz-data-${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setZipStatus({ type: 'ok', msg: `✅ Downloaded blitz-data-${dateStr}.zip` });
    } catch (e) {
      setZipStatus({ type: 'error', msg: '❌ Download failed: ' + e.message });
    }
  };

  // ── Upload ZIP to restore data ──
  const handleUploadZip = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    if (!file.name.endsWith('.zip')) {
      setZipStatus({ type: 'error', msg: '❌ Please select a .zip file (exported from this CRM)' });
      return;
    }

    const confirmed = window.confirm(
      `Upload "${file.name}" and restore all data?\n\n` +
      `⚠️ This will REPLACE all current data (payments, deals, CRG, etc.)\n` +
      `Users and permissions are preserved.\n\n` +
      `Make sure you have a backup before proceeding.`
    );
    if (!confirmed) return;

    setZipStatus({ type: 'loading', msg: `Uploading ${file.name}…` });
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/data/upload-zip`, {
        method: 'POST',
        headers: authHeaders(), // NOTE: do NOT set Content-Type — browser sets multipart boundary
        body: formData,
      });

      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || 'Upload failed');

      const summary = result.restored.map(r => `${r.table}: ${r.count} records`).join(', ');
      const skippedMsg = result.skipped?.length ? `\nSkipped: ${result.skipped.join(', ')}` : '';
      const errMsg = result.errors?.length ? `\nErrors: ${result.errors.join(', ')}` : '';

      setZipStatus({ type: 'ok', msg: `✅ Restored! ${summary}${skippedMsg}${errMsg}` });
      setUploadProgress(null);

      window.alert(
        `✅ ZIP restore complete!\n\n${summary}${skippedMsg}${errMsg}\n\nRefresh the page to see updated data.`
      );
    } catch (e) {
      setZipStatus({ type: 'error', msg: '❌ Upload failed: ' + e.message });
      setUploadProgress(null);
    }
  };

  const statusColor = zipStatus?.type === 'ok' ? '#10B981' : zipStatus?.type === 'error' ? '#EF4444' : '#64748B';

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>🗂️</span>
        <div style={sectionTitle}>Data Export / Import (ZIP)</div>
      </div>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
        Export all CRM data as a <b>.zip</b> file containing one JSON file per table. Use the same ZIP to update your lab or any other instance — upload it and all tables are restored instantly.
        <br /><span style={{ color: '#94A3B8' }}>Users and passwords are always preserved during import.</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {/* Download button */}
        <button
          onClick={handleDownloadZip}
          disabled={zipStatus?.type === 'loading'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10,
            background: zipStatus?.type === 'loading' ? '#94A3B8' : 'linear-gradient(135deg,#0EA5E9,#38BDF8)',
            border: 'none', color: '#FFF', cursor: zipStatus?.type === 'loading' ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700, boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
            transition: 'opacity 0.2s',
          }}
        >
          <span style={{ fontSize: 16 }}>⬇️</span>
          {zipStatus?.type === 'loading' ? 'Preparing…' : 'Download Data (.zip)'}
        </button>

        {/* Upload button */}
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 10,
          background: 'linear-gradient(135deg,#8B5CF6,#A78BFA)',
          color: '#FFF', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
        }}>
          <span style={{ fontSize: 16 }}>⬆️</span>
          Upload & Restore (.zip)
          <input
            ref={fileInputRef}
            type='file'
            accept='.zip'
            style={{ display: 'none' }}
            onChange={handleUploadZip}
          />
        </label>
      </div>

      {/* Status message */}
      {zipStatus && (
        <div style={{
          marginTop: 14, padding: '8px 12px', borderRadius: 8,
          background: zipStatus.type === 'ok' ? '#F0FDF4' : zipStatus.type === 'error' ? '#FEF2F2' : '#F8FAFC',
          border: `1px solid ${zipStatus.type === 'ok' ? '#BBF7D0' : zipStatus.type === 'error' ? '#FECACA' : '#E2E8F0'}`,
          fontSize: 12, color: statusColor, fontWeight: 500, lineHeight: 1.5,
        }}>
          {zipStatus.msg}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 10 }}>
        💡 <b>Workflow:</b> Download from production → Upload to lab to sync. Or download from lab → Upload to production to push changes.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS PAGE — All configurable settings
// ═══════════════════════════════════════════════════════════════
function SettingsPage({ user, onLogout, onNav, userAccess }) {
  const now = new Date();
  const [backupStatus, setBackupStatus] = useState(null);
  const [diagData, setDiagData] = useState(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/diagnostics`, { headers: authHeaders() });
      if (res.ok) setDiagData(await res.json());
    } catch {}
  };
  useEffect(() => { if (isAdmin(user.email)) fetchHealth(); }, []);

  const handleBackup = async () => {
    setBackupStatus("creating...");
    try {
      const res = await fetch(`${API_BASE}/admin/backup`, { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (data.ok) { setBackupStatus(`✅ ${data.backup}`); fetchBackups(); }
      else setBackupStatus("❌ Failed");
    } catch (e) { setBackupStatus("❌ " + e.message); }
  };

  // ── Backup Restore moved to Admin Panel ──

  const handleDedup = async () => {
    if (!confirm("Remove duplicate CRG deals and Daily Cap entries?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/dedup`, { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (data.ok) {
        const r = data.results;
        alert(`Dedup complete!\n\nCRG Deals: ${r["crg-deals"]?.removed || 0} removed\nDaily Cap: ${r["daily-cap"]?.removed || 0} removed`);
      }
    } catch (e) { alert("Failed: " + e.message); }
  };

  const sectionStyle = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
  const sectionTitle = { fontSize: 15, fontWeight: 700, color: "#334155", marginBottom: 12 };
  const btnStyle = (bg) => ({ padding: "8px 16px", borderRadius: 8, background: bg, border: "none", color: "#FFF", cursor: "pointer", fontSize: 12, fontWeight: 700 });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="settings" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#64748B" />

      <main className="blitz-main" style={{ maxWidth: 800, margin: "0 auto", padding: "28px 32px" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#334155" }}>⚙️ Settings</h2>

        {/* ═══ Data Management ═══ */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>💾 Data Management</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <button onClick={handleBackup} style={btnStyle("linear-gradient(135deg,#8B5CF6,#A78BFA)")}>💾 Create Backup Now</button>
            {isAdmin(user.email) && <button onClick={handleDedup} style={btnStyle("linear-gradient(135deg,#F59E0B,#FBBF24)")}>🧹 Dedup Data</button>}
            {isAdmin(user.email) && <button onClick={async () => {
              try {
                const res = await fetch(`${API_BASE}/telegram/screenshot/all`, { method: "POST", headers: authHeaders() });
                const data = await res.json();
                alert(data.ok ? "✅ Screenshots sent!" : "❌ " + (data.error || "Failed"));
              } catch (e) { alert("❌ " + e.message); }
            }} style={btnStyle("linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)")}>📸 Send All Screenshots</button>}
          </div>

          {/* v10.23: Download Full Backup & Restore */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, paddingTop: 10, borderTop: "1px solid #E2E8F0" }}>
            <button onClick={async () => {
              try {
                const res = await fetch(`${API_BASE}/backup/download`, { headers: authHeaders() });
                if (!res.ok) throw new Error("Download failed");
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `blitz-backup-${new Date().toISOString().split("T")[0]}.json`; a.click();
                URL.revokeObjectURL(url);
                setBackupStatus("✅ Full backup downloaded!");
              } catch (e) { setBackupStatus("❌ Download failed: " + e.message); }
            }} style={btnStyle("linear-gradient(135deg,#0F172A,#334155)")}>📥 Download Full Backup</button>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg,#DC2626,#EF4444)", color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(220,38,38,0.3)" }}>
              📤 Restore from Backup
              <input type="file" accept=".json" style={{ display: "none" }} onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (!confirm(`Restore from "${file.name}"? This will REPLACE all current data (except users). Are you sure?`)) { e.target.value = ""; return; }
                try {
                  const text = await file.text();
                  const backup = JSON.parse(text);
                  if (!backup.tables) { alert("❌ Invalid backup file — missing 'tables' field"); return; }
                  const res = await fetch(`${API_BASE}/backup/restore`, {
                    method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify(backup),
                  });
                  const result = await res.json();
                  if (result.ok) {
                    const summary = result.restored.map(r => `${r.table}: ${r.count}`).join(", ");
                    setBackupStatus(`✅ Restored! ${summary}`);
                    alert(`✅ Restore complete!\n\n${summary}\n\nRefresh the page to see updated data.`);
                  } else { setBackupStatus("❌ Restore failed: " + (result.error || "unknown")); }
                } catch (err) { setBackupStatus("❌ " + err.message); }
                e.target.value = "";
              }} />
            </label>
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, marginBottom: 8 }}>
            💡 <b>Download</b> saves all tables to a single .json file. <b>Restore</b> uploads that file to replace all data (users/permissions are preserved). Use this to transfer data between production and local servers.
          </div>

          {backupStatus && <div style={{ fontSize: 12, color: "#64748B", padding: "6px 10px", background: "#F8FAFC", borderRadius: 6 }}>Backup: {backupStatus}</div>}
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>Backups run hourly + daily snapshots at 02:00 (7-day retention). Auto-dedup runs nightly at 03:00. Always create a manual backup before deploying a new version.</div>

          {/* Restore moved to Admin Panel */}
        </div>

        {/* ═══ v10.28: ZIP Data Export / Import ═══ */}
        <ZipDataSection user={user} />

        {/* ═══ Monthly Targets Per Agent ═══ */}
        {isAdmin(user.email) && (() => {
          const targetKey = `blitz_cap_targets_${now.getFullYear()}_${now.getMonth()}`;
          const savedTgt = JSON.parse(localStorage.getItem(targetKey) || '{}');
          const [targets, setTargets] = useState({...savedTgt});
          const agentKeys = Object.keys(targets).filter(k => !k.startsWith("__")).sort();

          const getVal = (agent, idx) => { const p = String(targets[agent] || ",").split(","); return p[idx] || ""; };
          const setVal = (agent, idx, val) => { const p = String(targets[agent] || ",").split(","); p[idx] = val; setTargets(prev => ({ ...prev, [agent]: p.join(",") })); };

          const saveTargets = () => {
            localStorage.setItem(targetKey, JSON.stringify(targets));
            alert("✅ Targets saved for " + MONTHS[now.getMonth()]);
          };

          return (
            <div style={sectionStyle}>
              <div style={sectionTitle}>🎯 Monthly Targets Per Agent — {MONTHS[now.getMonth()]} {now.getFullYear()}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>Set individual Brands Cap and Affiliates Cap targets per agent. Dashboard will show progress vs these targets.</div>
              {agentKeys.length === 0 && <div style={{ color: "#94A3B8", fontSize: 12, marginBottom: 12 }}>No agents yet. Add agents below or they will appear from Daily Cap data.</div>}
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                {agentKeys.map(agent => (
                  <div key={agent} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                    <span style={{ display: "inline-block", padding: "3px 0", background: getPersonColor(agent), color: "#FFF", borderRadius: 5, fontSize: 12, fontWeight: 700, minWidth: 75, textAlign: "center" }}>{agent}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#10B981", marginBottom: 2 }}>Brands Cap Target</div>
                      <input value={getVal(agent, 0)} onChange={e => setVal(agent, 0, e.target.value)} type="number"
                        style={{ width: "100%", padding: "6px 8px", border: "2px solid #A7F3D0", borderRadius: 6, fontSize: 16, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#10B981", background: "#FFF" }} placeholder="0" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#8B5CF6", marginBottom: 2 }}>Affiliates Cap Target</div>
                      <input value={getVal(agent, 1)} onChange={e => setVal(agent, 1, e.target.value)} type="number"
                        style={{ width: "100%", padding: "6px 8px", border: "2px solid #C4B5FD", borderRadius: 6, fontSize: 16, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#8B5CF6", background: "#FFF" }} placeholder="0" />
                    </div>
                    <button onClick={() => setTargets(p => { const n = {...p}; delete n[agent]; return n; })} title="Remove" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#DC2626", fontSize: 14, fontWeight: 700 }}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { const name = prompt("Agent name:"); if (name && name.trim()) setTargets(p => ({ ...p, [name.trim()]: "," })); }} style={btnStyle("#0EA5E9")}>+ Add Agent</button>
                <button onClick={saveTargets} style={btnStyle("linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)")}>💾 Save Targets</button>
              </div>
            </div>
          );
        })()}

        {/* ═══ Server Health ═══ */}
        {isAdmin(user.email) && diagData && (
          <div style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={sectionTitle}>🖥️ Server Health</div>
              <button onClick={fetchHealth} style={{ padding: "4px 10px", borderRadius: 6, background: "#F1F5F9", border: "1px solid #E2E8F0", cursor: "pointer", fontSize: 11, color: "#64748B" }}>Refresh</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {[
                { label: "Version", value: diagData.server?.version || VERSION, color: "#6366F1" },
                { label: "Uptime", value: diagData.server?.uptimeFormatted || `${Math.floor((diagData.server?.uptime || 0) / 3600)}h ${Math.floor(((diagData.server?.uptime || 0) % 3600) / 60)}m`, color: "#10B981" },
                { label: "Heap Used", value: `${diagData.memory?.heapUsed || 0}MB`, color: (diagData.memory?.heapUsed || 0) > 300 ? "#EF4444" : "#10B981" },
                { label: "RSS Memory", value: `${diagData.memory?.rss || 0}MB`, color: "#0EA5E9" },
                { label: "WS Clients", value: diagData.connections?.webSocketClients ?? diagData.memory?.wsClients ?? 0, color: "#8B5CF6" },
                { label: "Sessions", value: diagData.connections?.activeSessions ?? diagData.memory?.sessions ?? 0, color: "#F59E0B" },
                { label: "Crashes", value: diagData.server?.crashes ?? 0, color: (diagData.server?.crashes || 0) > 0 ? "#EF4444" : "#10B981" },
                { label: "TG Errors", value: diagData.telegram?.pollingErrors ?? 0, color: (diagData.telegram?.pollingErrors || 0) > 5 ? "#EF4444" : "#10B981" },
                { label: "Backups", value: diagData.backups?.count ?? "?", color: (diagData.backups?.count || 0) > 0 ? "#10B981" : "#EF4444" },
              ].map((c, i) => (
                <div key={i} style={{ padding: "10px 12px", background: "#F8FAFC", borderRadius: 8, borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>{c.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: c.color, fontFamily: "'JetBrains Mono',monospace" }}>{c.value}</div>
                </div>
              ))}
            </div>
            {diagData.backups?.latest && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>Latest backup: {diagData.backups.latest.slice(0, 19)}</div>}
          </div>
        )}

        {/* ═══ About ═══ */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>ℹ️ About</div>
          <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.8 }}>
            <div><b>Version:</b> {VERSION}</div>
            <div><b>User:</b> {user.name} ({user.email})</div>
            <div><b>Role:</b> {isAdmin(user.email) ? "Admin" : "User"}</div>
            <div><b>Pages:</b> {(userAccess || []).join(", ")}</div>
          </div>
        </div>

        {/* ═══ Navigation ═══ */}
        {isAdmin(user.email) && (
          <div style={sectionStyle}>
            <div style={sectionTitle}>🔧 Admin Quick Access</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onNav("admin")} style={btnStyle("#DC2626")}>👥 User Management</button>
              <button onClick={async () => {
                try {
                  const res = await fetch(`${API_BASE}/admin/logs/download`, { headers: authHeaders() });
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `blitz-logs-${new Date().toISOString().split("T")[0]}.json`; a.click();
                } catch (e) { alert("Failed: " + e.message); }
              }} style={btnStyle("#0EA5E9")}>📥 Download Logs</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Dashboard({ user, onLogout, onAdmin, onNav, payments: rawPayments, setPayments, userAccess }) {
  const payments = Array.isArray(rawPayments) ? rawPayments : [];
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPay, setEditPay] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [paySort, setPaySort] = useState("manual");
  const availStatuses = getAvailableStatuses(user.email);

  const handlePayMove = (id, direction) => {
    setPayments(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      if (direction === "up" && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
      if (direction === "down" && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handlePaySortAlpha = () => {
    if (paySort === "alpha") { setPaySort("manual"); return; }
    setPaySort("alpha");
    setPayments(prev => [...prev].sort((a, b) => (a.invoice || "").localeCompare(b.invoice || "", undefined, { numeric: true })));
  };

  const handleStatusChange = (id, newStatus) => {
    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, status: newStatus, updatedAt: Date.now() }; // v10.07: stamp updatedAt on status change
      if (newStatus === "Paid") {
        updated.month = month;
        updated.year = year;
        if (!updated.paidDate) updated.paidDate = new Date().toISOString().split("T")[0];
      }
      return updated;
    }));
  };

  // v10.22: Inline field update for date and other fields
  const handleFieldUpdate = (id, field, value) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value, updatedAt: Date.now() } : p));
  };

  const matchSearch = p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.invoice, getAffiliateName(p.invoice), p.openBy, p.status, p.trcAddress, p.ercAddress, p.usdcAddress, p.instructions, p.paymentHash].some(v => (v || "").toLowerCase().includes(q));
  };

  // Open payments: any payment NOT "Paid"
  const openPayments = (payments || []).filter(p => OPEN_STATUSES.includes(p.status) && matchSearch(p));
  // Paid payments: filtered by selected month
  const paidPayments = (payments || []).filter(p => p.status === "Paid" && p.month === month && p.year === year && matchSearch(p));

  const openTotal = openPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const paidTotal = paidPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleSave = form => { 
    if (editPay) { 
      const updated = { ...editPay, ...form, updatedAt: Date.now() }; // v10.07: always stamp updatedAt on edit
      if (form.status === "Paid" && editPay.status !== "Paid") { 
        updated.month = month; 
        updated.year = year; 
        if (!updated.paidDate) { updated.paidDate = new Date().toISOString().split("T")[0]; } 
      }
      setPayments(prev => prev.map(p => p.id === editPay.id ? updated : p)); 
    } else { 
      // New payment added
      const newPayment = { ...form, id: genId(), month, year, updatedAt: Date.now(), createdAt: Date.now() }; // v10.07: stamp both
      setPayments(prev => [...prev, newPayment]);
    } 
    setModalOpen(false); 
    setEditPay(null); 
  };

  const handleDelete = id => { if (!confirm("Are you sure? This can't be undone.")) return; trackDelete('payments', id); setPayments(prev => prev.filter(p => p.id !== id)); };

  // Bulk actions
  const handleBulkDelete = (ids) => {
    ids.forEach(id => trackDelete('payments', id));
    setPayments(prev => prev.filter(p => !ids.includes(p.id)));
  };
  const handleBulkDuplicate = (ids) => {
    setPayments(prev => {
      const copies = [];
      ids.forEach(id => {
        const orig = prev.find(p => p.id === id);
        if (orig) copies.push({ ...orig, id: genId(), status: "Open", paymentHash: "", paidDate: new Date().toISOString().split("T")[0], updatedAt: Date.now() });
      });
      return [...prev, ...copies];
    });
  };
  const handleBulkArchive = (ids) => {
    if (!confirm(`Archive ${ids.length} invoice(s)? They will be marked as Archived.`)) return;
    setPayments(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: "Archived", updatedAt: Date.now() } : p));
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="payments" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#0EA5E9" />

      <main className="blitz-main" style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 32px" }}>
        {/* ═══ Payments Section ═══ */}
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#334155" }}>Payments</h2>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={prevMonth} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 8, cursor: "pointer", color: "#64748B", display: "flex" }}>{I.chevL}</button>
            <div style={{ minWidth: 200, textAlign: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{MONTHS[month]}</span>
              <span style={{ fontSize: 22, fontWeight: 300, color: "#64748B", marginLeft: 10 }}>{year}</span>
            </div>
            <button onClick={nextMonth} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 8, cursor: "pointer", color: "#64748B", display: "flex" }}>{I.chevR}</button>
          </div>
          <CurrencyBadges />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 500, marginLeft: 24 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14 }} />
            </div>
            <button onClick={() => { setEditPay(null); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(14,165,233,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Payment</button>
            <button onClick={handlePaySortAlpha}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: paySort === "alpha" ? "#0EA5E9" : "transparent", border: `2px solid ${paySort === "alpha" ? "#0EA5E9" : "#94A3B8"}`, borderRadius: 10, color: paySort === "alpha" ? "#FFF" : "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >{paySort === "alpha" ? "✓ A→Z" : "A→Z"}</button>
          </div>
        </div>

        {/* Summary Cards — Bento Glass */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Open Payments", value: openPayments.length, accent: "#F59E0B", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", isMoney: false },
            { label: "Open Total", value: openTotal, accent: "#F59E0B", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", isMoney: true },
            { label: "Paid This Month", value: paidPayments.length, accent: "#10B981", bg: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", isMoney: false },
            { label: "Paid Total", value: paidTotal, accent: "#10B981", bg: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", isMoney: true },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", position: "relative", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", animation: `stagger-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.08}s both`, cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.08), 0 0 20px ${c.accent}15`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${c.accent}, ${c.accent}88)`, borderRadius: "16px 16px 0 0" }} />
              <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 10 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: c.accent, letterSpacing: -1 }}>
                {c.isMoney ? c.value.toLocaleString("en-US") + "$" : c.value}
              </div>
            </div>
          ))}
        </div>

        {/* Open Payments Group */}
        <GroupHeader icon={I.openBox} title="Open Payments" count={openPayments.length} total={openTotal} accentColor="#F59E0B" defaultOpen={true}>
          <PaymentTable payments={openPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={handleDelete} onBulkDelete={handleBulkDelete} onStatusChange={handleStatusChange} onFieldUpdate={handleFieldUpdate} statusOptions={availStatuses} emptyMsg="No open payments — all caught up!" sortMode={paySort} onMove={handlePayMove} onDuplicate={handleBulkDuplicate} onArchive={handleBulkArchive} />
        </GroupHeader>

        {/* Paid This Month Group */}
        <GroupHeader icon={I.calendar} title={`${MONTHS[month].toUpperCase()} ${year}`} count={paidPayments.length} total={paidTotal} accentColor="#EC4899" defaultOpen={true}>
          <PaymentTable payments={paidPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={handleDelete} onBulkDelete={handleBulkDelete} onFieldUpdate={handleFieldUpdate} emptyMsg={`No paid payments for ${MONTHS[month]} ${year}`} sortMode={paySort} onMove={handlePayMove} onDuplicate={handleBulkDuplicate} onArchive={handleBulkArchive} />
        </GroupHeader>
      </main>

      {/* Modals */}
      {modalOpen && (
        <Modal title={editPay ? "Edit Payment" : "New Payment"} onClose={() => { setModalOpen(false); setEditPay(null); }}>
          <PaymentForm payment={editPay} onSave={handleSave} onClose={() => { setModalOpen(false); setEditPay(null); }} userEmail={user.email} userName={user.name} />
        </Modal>
      )}
    </div>
  );
}

/* ── Login ── */
function LoginScreen({ onLogin, users }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(0);
  const [serverStatus, setServerStatus] = useState("checking");
  const [debugData, setDebugData] = useState(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) { setServerStatus("online"); serverOnline = true; }
        else setServerStatus("offline");
      } catch { setServerStatus("offline"); }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (blocked > 0) return;
    setLoading(true); setError(""); setDebugData(null);

    const hashed = hashPassword(password);
    const emailClean = email.toLowerCase().trim();

    // ── TRY 1: Server login ──
    let serverWorked = false;
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailClean, passwordHash: hashed }),
        signal: AbortSignal.timeout(8000),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        console.log("⚠️ Server returned non-JSON:", text.substring(0, 200));
        throw new Error("non-json");
      }

      serverWorked = true;

      if (res.ok && data.ok) {
        if (data.token) setSessionToken(data.token);
        onLogin(data.user);
        setLoading(false);
        return;
      } else if (res.status === 429 && data.error === "blocked") {
        setBlocked(data.minutes || 15);
        setError(`IP blocked for ${data.minutes || 15} min.`);
        const iv = setInterval(() => { setBlocked(prev => { if (prev <= 1) { clearInterval(iv); return 0; } return prev - 1; }); }, 60000);
        if (data.debug) setDebugData(data.debug);
        setLoading(false);
        return;
      } else if (res.status === 401) {
        setError("Invalid email or password.");
        if (data.debug) setDebugData({ ...data.debug, clientHash8: hashed.substring(0, 8), clientHashFull: hashed });
        setLoading(false);
        return;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (fetchErr) {
      // ── TRY 2: Offline login using INITIAL_USERS ──
      const u = INITIAL_USERS.find(u => u.email === emailClean && u.passwordHash === hashed);
      if (u) {
        console.log("✅ Offline login success for:", emailClean);
        onLogin({ email: u.email, name: u.name, pageAccess: u.pageAccess });
      } else {
        const emailExists = INITIAL_USERS.some(u => u.email === emailClean);
        if (emailExists) {
          setError(serverWorked ? "Invalid email or password." : "Server unreachable. Password doesn't match offline records.");
        } else {
          setError(serverWorked ? "Invalid email or password." : "Server unreachable. This account requires server access to login.");
        }
      }
    }
    setLoading(false);
  };

  const diagStyle = { background: "#FEF3C7", border: "1px solid #F59E0B40", borderRadius: 10, padding: 14, marginTop: 12, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#92400E", lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" };

  // Floating decoration SVGs
  const BitcoinSVG = ({ style }) => (
    <svg style={{ position: "absolute", pointerEvents: "none", filter: "drop-shadow(0 4px 12px rgba(247,181,0,0.3))", ...style }} width="90" height="90" viewBox="0 0 100 100">
      <defs><linearGradient id="btcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFD700"/><stop offset="50%" stopColor="#F7B500"/><stop offset="100%" stopColor="#E5A000"/></linearGradient></defs>
      <circle cx="50" cy="50" r="46" fill="url(#btcg)" stroke="#D4940080" strokeWidth="3"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#FFF4" strokeWidth="1.5"/>
      <text x="50" y="66" textAnchor="middle" fill="#FFF" fontSize="42" fontWeight="800" fontFamily="Arial,sans-serif" style={{textShadow:"0 2px 4px rgba(0,0,0,0.2)"}}>₿</text>
    </svg>
  );

  const AirpodsSVG = ({ style }) => (
    <svg style={{ position: "absolute", pointerEvents: "none", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.1))", ...style }} width="85" height="100" viewBox="0 0 85 100">
      {/* Left airpod */}
      <ellipse cx="25" cy="32" rx="14" ry="18" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
      <ellipse cx="25" cy="28" rx="5" ry="5" fill="#E2E8F0"/>
      <rect x="22" y="48" width="6" height="32" rx="3" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1"/>
      {/* Right airpod */}
      <ellipse cx="58" cy="26" rx="14" ry="18" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
      <ellipse cx="58" cy="22" rx="5" ry="5" fill="#E2E8F0"/>
      <rect x="55" y="42" width="6" height="35" rx="3" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1"/>
      {/* Cute face on right one */}
      <circle cx="53" cy="24" r="1.8" fill="#334155"/>
      <circle cx="63" cy="24" r="1.8" fill="#334155"/>
      <ellipse cx="58" cy="30" rx="4" ry="3" fill="none" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" style={{strokeDasharray:"0 7 7 0"}}/>
    </svg>
  );

  const UkraineFlagSVG = ({ style }) => (
    <svg style={{ position: "absolute", pointerEvents: "none", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.12))", ...style }} width="80" height="65" viewBox="0 0 80 65">
      {/* Pole */}
      <rect x="8" y="5" width="3.5" height="58" rx="1.5" fill="#B0B8C4"/>
      <circle cx="9.75" cy="6" r="3.5" fill="#F59E0B"/>
      {/* Flag body with wave */}
      <path d="M13 10 Q35 6 55 12 Q70 16 75 13 L75 35 Q60 31 55 35 Q35 41 13 37 Z" fill="#0057B8"/>
      <path d="M13 37 Q35 41 55 35 Q60 31 75 35 L75 55 Q60 52 55 56 Q35 62 13 58 Z" fill="#FFD700"/>
    </svg>
  );

  // Sparkle/star decorations
  const Sparkle = ({ x, y, size, color, delay }) => (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none", animation: `sparkle 2s ease-in-out ${delay || 0}s infinite` }}>
      <svg width={size || 14} height={size || 14} viewBox="0 0 24 24">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" fill={color || "#38BDF8"} opacity="0.6"/>
      </svg>
    </div>
  );

  const Dot = ({ x, y, size, color }) => (
    <div style={{ position: "absolute", left: x, top: y, width: size || 8, height: size || 8, borderRadius: "50%", background: color || "#38BDF8", opacity: 0.4, pointerEvents: "none", animation: `float 3s ease-in-out infinite` }} />
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0A0F1E 0%, #0F172A 30%, #1E1B4B 60%, #0A0F1E 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <style>{globalTableCSS}{mobileCSS}{`
        @keyframes sparkle { 0%,100% { opacity:0.3; transform:scale(0.8) rotate(0deg); } 50% { opacity:1; transform:scale(1.2) rotate(180deg); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes floatSlow { 0%,100% { transform:translateY(0) rotate(-5deg); } 50% { transform:translateY(-12px) rotate(5deg); } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.15); } 50% { box-shadow: 0 0 0 12px rgba(14,165,233,0); } }
      `}</style>

      {/* ══ Background decorations ══ */}
      {/* Soft gradient orbs */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)", top: "-15%", right: "-10%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)", bottom: "-10%", left: "-8%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 70%)", top: "20%", left: "5%", pointerEvents: "none" }} />

      {/* ══ Floating illustrations ══ */}
      <BitcoinSVG style={{ top: "8%", left: "8%", animation: "floatSlow 4s ease-in-out infinite", zIndex: 2 }} />
      <AirpodsSVG style={{ top: "12%", right: "6%", animation: "floatSlow 5s ease-in-out 0.5s infinite", transform: "rotate(15deg)", zIndex: 2 }} />
      <UkraineFlagSVG style={{ bottom: "12%", left: "10%", animation: "floatSlow 4.5s ease-in-out 1s infinite", zIndex: 2 }} />

      {/* Currency scale (€ vs $) — bottom center-left */}
      <svg style={{ position: "absolute", bottom: "14%", left: "18%", pointerEvents: "none", opacity: 0.85, animation: "floatSlow 5s ease-in-out 1.5s infinite", zIndex: 2 }} width="110" height="80" viewBox="0 0 110 80">
        {/* Scale base */}
        <rect x="48" y="40" width="14" height="36" rx="3" fill="#B0B8C4" opacity="0.5"/>
        <ellipse cx="55" cy="76" rx="22" ry="4" fill="#CBD5E1" opacity="0.4"/>
        {/* Scale beam */}
        <rect x="10" y="38" width="90" height="4" rx="2" fill="#94A3B8" transform="rotate(-5 55 40)"/>
        {/* Euro side (higher = lighter) */}
        <text x="18" y="34" fontSize="28" fontWeight="800" fill="#FFB800" fontFamily="Arial" style={{filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.15))"}}>€</text>
        {/* Dollar side (lower = heavier) */}
        <text x="78" y="42" fontSize="28" fontWeight="800" fill="#FFB800" fontFamily="Arial" style={{filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.15))"}}>$</text>
      </svg>

      {/* Call center girl — right side */}
      <svg style={{ position: "absolute", bottom: "5%", right: "3%", pointerEvents: "none", zIndex: 2, opacity: 0.9 }} width="160" height="200" viewBox="0 0 160 200">
        {/* Laptop */}
        <rect x="20" y="145" width="80" height="50" rx="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5"/>
        <rect x="25" y="148" width="70" height="38" rx="2" fill="#F8FAFC"/>
        <circle cx="60" cy="167" r="4" fill="#CBD5E1"/>
        <rect x="15" y="194" width="90" height="4" rx="2" fill="#CBD5E1"/>
        {/* Body */}
        <ellipse cx="95" cy="165" rx="25" ry="30" fill="#BFDBFE"/>
        {/* Neck */}
        <rect x="88" y="110" width="14" height="15" rx="5" fill="#FDDEB5"/>
        {/* Head */}
        <ellipse cx="95" cy="90" rx="24" ry="28" fill="#FDDEB5"/>
        {/* Hair */}
        <ellipse cx="95" cy="72" rx="26" ry="18" fill="#8B6914"/>
        <ellipse cx="75" cy="90" rx="8" ry="25" fill="#A07420"/>
        <ellipse cx="115" cy="90" rx="8" ry="25" fill="#A07420"/>
        <ellipse cx="120" cy="115" rx="6" ry="18" fill="#A07420"/>
        <ellipse cx="70" cy="115" rx="6" ry="18" fill="#A07420"/>
        {/* Eyes */}
        <ellipse cx="86" cy="88" rx="3.5" ry="4" fill="#FFF"/>
        <ellipse cx="104" cy="88" rx="3.5" ry="4" fill="#FFF"/>
        <circle cx="87" cy="89" r="2" fill="#4A3520"/>
        <circle cx="105" cy="89" r="2" fill="#4A3520"/>
        <circle cx="87.5" cy="88" r="0.8" fill="#FFF"/>
        <circle cx="105.5" cy="88" r="0.8" fill="#FFF"/>
        {/* Smile */}
        <path d="M89 98 Q95 104 101 98" fill="none" stroke="#D4845A" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Headset */}
        <path d="M70 82 Q70 60 95 58 Q120 60 120 82" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
        <rect x="65" y="80" width="10" height="16" rx="5" fill="#334155"/>
        <rect x="115" y="80" width="10" height="16" rx="5" fill="#334155"/>
        {/* Mic arm */}
        <path d="M68 92 Q60 100 65 108" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="65" cy="110" r="4" fill="#334155"/>
        {/* Arm on laptop */}
        <path d="M80 155 Q70 140 55 148" fill="none" stroke="#FDDEB5" strokeWidth="8" strokeLinecap="round"/>
      </svg>

      {/* Sparkles and dots scattered around */}
      <Sparkle x="15%" y="25%" size={16} color="#FFD700" delay={0} />
      <Sparkle x="85%" y="30%" size={12} color="#38BDF8" delay={0.5} />
      <Sparkle x="75%" y="70%" size={14} color="#A78BFA" delay={1} />
      <Sparkle x="20%" y="75%" size={10} color="#38BDF8" delay={1.5} />
      <Sparkle x="50%" y="10%" size={12} color="#FFD700" delay={0.8} />
      <Sparkle x="90%" y="55%" size={10} color="#F472B6" delay={2} />
      <Dot x="25%" y="15%" size={8} color="#38BDF8" />
      <Dot x="80%" y="20%" size={6} color="#FFD700" />
      <Dot x="12%" y="60%" size={10} color="#A78BFA" />
      <Dot x="88%" y="75%" size={7} color="#38BDF8" />
      <Dot x="45%" y="85%" size={6} color="#FFD700" />
      <Dot x="70%" y="8%" size={9} color="#F472B6" />

      {/* ══ Login Card ══ */}
      <div style={{ width: 440, maxWidth: "92vw", background: "rgba(15,23,42,0.85)", backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderRadius: 24, border: "1px solid rgba(99,102,241,0.25)", padding: "44px 40px", boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1) inset", animation: "fadeSlideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)", position: "relative", zIndex: 10 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          {I.logo}
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 24, background: "linear-gradient(135deg, #38BDF8, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: -0.5 }}>Blitz CRM</span>
          <span style={{ fontSize: 11, color: "#0EA5E9", fontFamily: "'JetBrains Mono',monospace", background: "#EFF6FF", padding: "3px 12px", borderRadius: 20, border: "1px solid #BFDBFE", fontWeight: 600 }}>v{VERSION}</span>
        </div>

        {/* Server status */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 24, padding: "8px 14px", borderRadius: 10,
          background: serverStatus === "online" ? "#ECFDF5" : serverStatus === "offline" ? "#FEF3C7" : "#F8FAFC",
          border: `1px solid ${serverStatus === "online" ? "#A7F3D0" : serverStatus === "offline" ? "#FDE68A" : "#E2E8F0"}` }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%",
            background: serverStatus === "online" ? "#10B981" : serverStatus === "offline" ? "#F59E0B" : "#94A3B8",
            boxShadow: serverStatus === "online" ? "0 0 8px rgba(16,185,129,0.5)" : "none",
            animation: serverStatus === "online" ? "pulse 2s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: 13, color: serverStatus === "online" ? "#065F46" : serverStatus === "offline" ? "#92400E" : "#64748B", fontWeight: 600 }}>
            {serverStatus === "online" ? "Server connected" : serverStatus === "offline" ? "Server offline — offline login available" : "Checking server..."}
          </span>
        </div>

        <form onSubmit={submit} method="post" autoComplete="on">
          <label htmlFor="login-email" style={{ display: "block", color: "#94A3B8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Email</label>
          <input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
            style={{ width: "100%", padding: "14px 18px", background: "rgba(30,41,59,0.8)", border: "2px solid rgba(99,102,241,0.2)", borderRadius: 14, color: "#F1F5F9", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 20, transition: "all 0.2s ease", caretColor: "#818CF8" }}
            onFocus={e => { e.target.style.borderColor = "#38BDF8"; e.target.style.boxShadow = "0 0 0 4px rgba(56,189,248,0.1)"; }}
            onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }} />

          <label htmlFor="login-password" style={{ display: "block", color: "#334155", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Password</label>
          <div style={{ position: "relative", marginBottom: 20 }}>
            <input id="login-password" name="password" type={showPass ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              style={{ width: "100%", padding: "14px 18px", paddingRight: 50, background: "rgba(30,41,59,0.8)", border: "2px solid rgba(99,102,241,0.2)", borderRadius: 14, color: "#F1F5F9", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "all 0.2s ease", caretColor: "#818CF8" }}
              onFocus={e => { e.target.style.borderColor = "#38BDF8"; e.target.style.boxShadow = "0 0 0 4px rgba(56,189,248,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }} />
            <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={-1}
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: showPass ? "#0EA5E9" : "#94A3B8", transition: "color 0.2s" }}>
              {showPass
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              }
            </button>
          </div>

          {error && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "#FEF2F2", borderRadius: 12, border: "1px solid #FECACA", fontWeight: 500 }}>{error}</div>}

          {/* DEBUG PANEL */}
          {debugData && (
            <div style={diagStyle}>
              <div style={{ color: "#92400E", fontWeight: 700, marginBottom: 8 }}>🔍 DEBUG DIAGNOSTIC (v{VERSION})</div>
              <div>Server version: {debugData.v || "unknown (old server?)"}</div>
              <div>Data dir: {debugData.dataDir || "?"}</div>
              <div>users.json exists: {debugData.fileExists ? "✅ YES" : "❌ NO"}</div>
              <div>─────────────────────────</div>
              <div>Users in file: {debugData.fileUsersCount ?? "?"}</div>
              <div style={{ color: debugData.fileUsersWithHash === debugData.fileUsersCount ? "#065F46" : "#DC2626" }}>
                With passwordHash: {debugData.fileUsersWithHash ?? "?"} / {debugData.fileUsersCount ?? "?"}
              </div>
              {debugData.fileUsersNoHash && debugData.fileUsersNoHash.length > 0 && (
                <div style={{ color: "#DC2626" }}>⚠️ MISSING HASH: {debugData.fileUsersNoHash.join(", ")}</div>
              )}
              <div>─────────────────────────</div>
              <div>Email in file: {debugData.emailInFile ? "✅" : "❌"}</div>
              <div>Email in seed: {debugData.emailInSeed ? "✅" : "❌"}</div>
              <div>File has hash: {debugData.fileHasHash ? "✅" : "❌ ← PROBLEM"}</div>
              <div>Seed has hash: {debugData.seedHasHash ? "✅" : "❌"}</div>
              <div style={{ color: debugData.hashMatchFile || debugData.hashMatchSeed ? "#065F46" : "#DC2626" }}>
                Hash match (file): {debugData.hashMatchFile ? "✅ MATCH" : "❌ NO MATCH"}
              </div>
              <div style={{ color: debugData.hashMatchSeed ? "#065F46" : "#DC2626" }}>
                Hash match (seed): {debugData.hashMatchSeed ? "✅ MATCH" : "❌ NO MATCH"}
              </div>
              <div>─────────────────────────</div>
              <div>Server hash (file): {debugData.serverHash8 || "NONE"}</div>
              <div>Server hash (seed): {debugData.seedHash8 || "NONE"}</div>
              <div>Client hash: {debugData.clientHash8 || "?"}</div>
              {debugData.clientHashFull && <div>Client full: {debugData.clientHashFull}</div>}
            </div>
          )}

          <button type="submit" disabled={loading || blocked > 0}
            style={{ width: "100%", padding: 16, background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #A78BFA 100%)", color: "#FFF", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: loading ? "wait" : "pointer", boxShadow: loading ? "none" : "0 6px 30px rgba(99,102,241,0.45)", transition: "all 0.2s", letterSpacing: 0.5, marginTop: 8 }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        {/* Open in App */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href={window.location.href}
            onClick={(e) => {
              e.preventDefault();
              if (/iPhone|iPad|Android/i.test(navigator.userAgent)) {
                alert("To open as app:\n\niPhone/iPad: Tap Share → Add to Home Screen\nAndroid: Tap ⋮ → Add to Home Screen");
              } else {
                window.open(window.location.href, '_blank', 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=420,height=800');
              }
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, color: "#475569", fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.borderColor = "#BFDBFE"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            Open in App
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Customer Payments Page ── */
const CP_STATUS_OPTIONS = ["Open", "Pending", "Received", "Refund"];
const CP_STATUS_COLORS = {
  Open: { background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", color: "#92400E", border: "1px solid #FDE68A" },
  Pending: { background: "#818CF8", color: "#FFF" },
  Received: { background: "#10B981", color: "#FFF" },
  Refund: { background: "#EF4444", color: "#FFF" },
};

const CP_TYPE_OPTIONS = ["Brand Payment", "Affiliate Refund"];

const CP_INITIAL = []; // REMOVED: hardcoded demo data caused production data loss

function CPForm({ payment, onSave, onClose, userName }) {
  const [f, setF] = useState(payment || { invoice: "", paidDate: new Date().toISOString().split("T")[0], status: "Open", amount: "", fee: "", openBy: userName || "", type: "Brand Payment", trcAddress: "", ercAddress: "", usdcAddress: "", paymentHash: "" });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };

  const handleSave = () => {
    if (!f.invoice.trim()) { setError("Invoice name is required"); return; }
    if (!f.amount || parseFloat(f.amount) <= 0) { setError("Amount is required"); return; }
    onSave(f);
  };

  return (
    <>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Brand Name"><input style={inp} value={f.invoice} onChange={e => s("invoice", e.target.value)} placeholder="e.g. Swin, 12Mark" /></Field>
        <Field label="Invoice Amount ($)"><input style={inp} type="number" value={f.amount} onChange={e => s("amount", e.target.value)} placeholder="0.00" /></Field>
        <Field label="Fee (number or %)">
          <input style={inp} value={f.fee || ""} onChange={e => s("fee", e.target.value)} placeholder="e.g. 2% or 50" />
          {f.fee && f.amount && <div style={{ fontSize: 11, color: "#0EA5E9", marginTop: 4 }}>Fee: {fmtFee(f.fee, f.amount)}</div>}
        </Field>
        <Field label="Status">
          <select style={{ ...inp, cursor: "pointer" }} value={f.status} onChange={e => {
            const ns = e.target.value;
            setF(prev => ({ ...prev, status: ns, paidDate: ns === "Received" ? new Date().toISOString().split("T")[0] : "" }));
            setError("");
          }}>
            {CP_STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select style={{ ...inp, cursor: "pointer" }} value={f.type || "Brand Payment"} onChange={e => s("type", e.target.value)}>
            {CP_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Paid Date">
          <div style={{ ...inp, background: "#E2E8F0", color: f.paidDate ? "#1E293B" : "#94A3B8", cursor: "default", display: "flex", alignItems: "center" }}>
            {f.paidDate ? new Date(f.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Auto-set when Received"}
          </div>
        </Field>
        <Field label="Open By"><NameCombo value={f.openBy} onChange={v => s("openBy", v)} /></Field>
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <CopyInput label="TRC Address" value={f.trcAddress || ""} onChange={e => s("trcAddress", e.target.value)} placeholder="e.g. TYUWBpmzSqCcz9r5rRVG..." />
        <CopyInput label="ERC Address" value={f.ercAddress || ""} onChange={e => s("ercAddress", e.target.value)} placeholder="e.g. 0x5066d63E126Cb3F893..." />
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <CopyInput label="USDC Address" value={f.usdcAddress || ""} onChange={e => s("usdcAddress", e.target.value)} placeholder="e.g. 0x5066d63E126Cb3F893..." />
        <div />
      </div>
      <CopyInput label="Payment Hash" value={f.paymentHash || ""} onChange={e => s("paymentHash", e.target.value)} placeholder="Transaction hash..." />
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(14,165,233,0.3)" }}>{payment ? "Save Changes" : "Add Payment"}</button>
      </div>
    </>
  );
}

function CPTable({ payments: rawPayments, onEdit, onDelete, onStatusChange, onFieldUpdate, statusOptions, emptyMsg, sortMode, onMove, onDuplicate, onArchive, onBulkDelete }) {
  const payments = rawPayments || [];
  const fmt = a => { const n = parseFloat(a) || 0; return n.toLocaleString("en-US") + "$"; };
  const [selected, setSelected] = useState(new Set());
  const mobile = useMobile();
  const sorted = sortMode === "alpha"
    ? [...payments].sort((a, b) => (a.invoice || "").localeCompare(b.invoice || "", undefined, { numeric: true }))
    : [...payments].sort((a, b) => (a.paidDate || "").localeCompare(b.paidDate || ""));
  const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const toggleSelect = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(p => p.id)));
  const clearSelection = () => setSelected(new Set());
  const selArr = [...selected];
  const dates = payments.filter(p => p.paidDate).map(p => new Date(p.paidDate)).sort((a, b) => a - b);
  const fmtShort = d => { const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${m[d.getMonth()]} ${d.getDate()}`; };
  const dateRange = dates.length > 0 ? (dates.length === 1 ? fmtShort(dates[0]) : `${fmtShort(dates[0])} - ${fmtShort(dates[dates.length - 1])}`) : "";

  const openByColors = ["#FF6B9D", "#00BCD4", "#FF9800", "#9C27B0", "#4CAF50", "#E91E63"];
  const getColor = name => { let h = 0; for (let i = 0; i < (name||"").length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return openByColors[Math.abs(h) % openByColors.length]; };

  if (payments.length === 0) return <div style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>{emptyMsg}</div>;

  if (mobile) {
    return (
      <div>
        {sorted.map(p => (
          <div key={p.id} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span onClick={() => onEdit(p)} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: "#0EA5E9", cursor: "pointer" }}>#{p.invoice}</span>
                <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, ...(CP_STATUS_COLORS[p.status] || { background: "#F1F5F9", color: "#475569" }) }}>{p.status}</span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>{fmt(p.amount)}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 12, color: "#64748B", marginBottom: 8 }}>
              {p.paidDate && <span>📅 {new Date(p.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
              <span style={{ padding: "2px 8px", borderRadius: 4, background: (p.type || "Brand Payment") === "Affiliate Refund" ? "#FEE2E2" : "#EFF6FF", color: (p.type || "Brand Payment") === "Affiliate Refund" ? "#DC2626" : "#2563EB", fontSize: 10, fontWeight: 600 }}>{p.type || "Brand Payment"}</span>
              {p.fee && <span>Fee: {fmtFee(p.fee, p.amount)}</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ padding: "3px 10px", borderRadius: 4, background: getPersonColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 12 }}>{p.openBy}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {!["Received", "Refund"].includes(p.status) && statusOptions && onStatusChange && (
                  <select value={p.status} onChange={e => onStatusChange(p.id, e.target.value)}
                    style={{ padding: "4px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "1px solid #E2E8F0", ...(CP_STATUS_COLORS[p.status] || {}) }}>
                    {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                )}
                <button onClick={() => onEdit(p)} style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                <button onClick={() => onDelete(p.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
              </div>
            </div>
            {(p.trcAddress || p.ercAddress || p.usdcAddress || p.paymentHash) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "#94A3B8", display: "flex", flexDirection: "column", gap: 2 }}>
                {p.trcAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>TRC: {p.trcAddress}</div>}
                {p.ercAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ERC: {p.ercAddress}</div>}
                {p.usdcAddress && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>USDC: {p.usdcAddress}</div>}
                {p.paymentHash && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Hash: {p.paymentHash}</div>}
              </div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "12px", flexWrap: "wrap" }}>
          {dateRange && <span style={{ padding: "5px 14px", borderRadius: 20, background: "#F472B6", color: "#FFF", fontWeight: 700, fontSize: 12 }}>{dateRange}</span>}
          <span style={{ padding: "5px 14px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 12 }}>{payments.length} invoices</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{total.toLocaleString("en-US")}$</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "3%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            <th style={{ padding: "8px 4px", borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #CBD5E1", textAlign: "center" }}>
              <input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0} onChange={toggleAll} style={{ cursor: "pointer", width: 15, height: 15, accentColor: "#0EA5E9" }} />
            </th>
            {["Brand Name","Date","Status","Amount","Fee","Open By","Hash","Actions"].map(h =>
              <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: "#64748B", fontSize: 10, fontWeight: 700, borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #CBD5E1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const isSel = selected.has(p.id);
            return (
            <tr key={p.id} style={{ borderBottom: "1px solid #CBD5E1", transition: "background 0.15s", background: isSel ? "rgba(14,165,233,0.1)" : "transparent", borderLeft: isSel ? "3px solid #0EA5E9" : "3px solid transparent" }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "#F8FAFC"; }}
              onMouseLeave={e => e.currentTarget.style.background = isSel ? "rgba(14,165,233,0.1)" : "transparent"}
            >
              <td style={{ padding: "4px 4px", textAlign: "center", borderRight: "1px solid #CBD5E1" }}>
                <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)} style={{ cursor: "pointer", width: 15, height: 15, accentColor: "#0EA5E9" }} />
              </td>
              <td style={{ padding: "4px 6px", fontWeight: 700, fontSize: 13, borderRight: "1px solid #CBD5E1" }}>
                <input value={p.invoice || ""} onChange={e => onFieldUpdate && onFieldUpdate(p.id, "invoice", e.target.value)} onClick={e => e.stopPropagation()} style={{ width: "100%", padding: "3px 6px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 12, fontWeight: 700, color: "#0EA5E9", fontFamily: "'JetBrains Mono',monospace", background: "#FAFBFC" }} />
              </td>
              <td style={{ padding: "4px 4px", borderRight: "1px solid #CBD5E1" }}>
                <input type="date" value={p.paidDate || ""} onChange={e => onFieldUpdate && onFieldUpdate(p.id, "paidDate", e.target.value)} style={{ padding: "2px 4px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono',monospace", cursor: "pointer", width: "100%", maxWidth: 120 }} />
              </td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #CBD5E1" }}>
                {!["Received", "Refund"].includes(p.status) && statusOptions && onStatusChange ? (
                  <select value={p.status} onChange={e => onStatusChange(p.id, e.target.value)}
                    style={{ padding: "3px 4px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "1px solid #E2E8F0", cursor: "pointer", ...(CP_STATUS_COLORS[p.status] || {}), appearance: "auto", outline: "none", maxWidth: "100%" }}>
                    {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                ) : (
                  <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, ...(CP_STATUS_COLORS[p.status] || { background: "#F1F5F9", color: "#475569" }) }}>{p.status}</span>
                )}
              </td>
              <td style={{ padding: "7px 6px", fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#0F172A", borderRight: "1px solid #CBD5E1", whiteSpace: "nowrap" }}>{fmt(p.amount)}</td>
              <td style={{ padding: "7px 6px", fontSize: 10, color: p.fee ? "#0EA5E9" : "#CBD5E1", borderRight: "1px solid #CBD5E1", fontFamily: "'JetBrains Mono',monospace" }}>{fmtFee(p.fee, p.amount)}</td>
              <td style={{ padding: "7px 6px", borderRight: "1px solid #CBD5E1" }}>
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: getPersonColor(p.openBy), color: "#FFF", fontWeight: 700, fontSize: 11 }}>{p.openBy}</span>
              </td>
              <td style={{ padding: "7px 6px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #CBD5E1" }}>{p.paymentHash || "—"}</td>
              <td style={{ padding: "4px 4px" }}>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  {onMove && sortMode !== "alpha" && <>
                    <button onClick={() => onMove(p.id, "up")} title="Move up" disabled={i === 0}
                      style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 3px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 10 }}>▲</button>
                    <button onClick={() => onMove(p.id, "down")} title="Move down" disabled={i === sorted.length - 1}
                      style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 3px", cursor: i === sorted.length - 1 ? "default" : "pointer", color: i === sorted.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 10 }}>▼</button>
                  </>}
                  <button onClick={() => onEdit(p)} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 5, padding: 4, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                  <button onClick={() => onDelete(p.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 5, padding: 4, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                </div>
              </td>
            </tr>
          );})}
        </tbody>
      </table>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "12px 20px", background: "#F8FAFC", borderTop: "2px solid #E2E8F0", flexWrap: "wrap" }}>
        {dateRange && <span style={{ padding: "5px 16px", borderRadius: 20, background: "#F472B6", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{dateRange}</span>}
        <span style={{ padding: "5px 16px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{payments.length} invoices</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{total.toLocaleString("en-US")}$</span>
        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>sum</span>
      </div>
      <BulkActionBar count={selected.size} onClear={clearSelection}
        onDelete={onBulkDelete ? () => { if (confirm(`Delete ${selected.size} selected?`)) { onBulkDelete(selArr); clearSelection(); } } : null}
        onDuplicate={onDuplicate ? () => { onDuplicate(selArr); clearSelection(); } : null}
        onArchive={onArchive ? () => { onArchive(selArr); clearSelection(); } : null}
      />
    </div>
  );
}

function CustomerPayments({ user, onLogout, onNav, onAdmin, payments: rawCpPayments, setPayments, userAccess }) {
  const payments = Array.isArray(rawCpPayments) ? rawCpPayments : [];
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPay, setEditPay] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [cpSort, setCpSort] = useState("manual");

  const handleCpMove = (id, direction) => {
    setPayments(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      if (direction === "up" && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
      if (direction === "down" && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handleCpSortAlpha = () => {
    if (cpSort === "alpha") { setCpSort("manual"); return; }
    setCpSort("alpha");
    setPayments(prev => [...prev].sort((a, b) => (a.invoice || "").localeCompare(b.invoice || "", undefined, { numeric: true })));
  };

  // v10.22: Inline field update for date and other fields
  const handleFieldUpdate = (id, field, value) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value, updatedAt: Date.now() } : p));
  };

  // v10.22: Inline field update for CP
  const handleCpFieldUpdate = (id, field, value) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value, updatedAt: Date.now() } : p));
  };
  const matchSearch = p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.invoice, p.openBy, p.status, p.trcAddress, p.ercAddress, p.usdcAddress].some(v => (v || "").toLowerCase().includes(q));
  };

  const openPayments = (payments || []).filter(p => ["Open", "Pending"].includes(p.status) && matchSearch(p));
  const receivedPayments = (payments || []).filter(p => ["Received", "Refund"].includes(p.status) && p.month === month && p.year === year && matchSearch(p));

  const openTotal = openPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const receivedTotal = receivedPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleSave = form => {
    if (editPay) {
      const updated = { ...editPay, ...form, updatedAt: Date.now() }; // v10.07: stamp updatedAt
      if (["Received", "Refund"].includes(form.status) && !["Received", "Refund"].includes(editPay.status)) {
        updated.month = month;
        updated.year = year;
        if (!updated.paidDate) updated.paidDate = new Date().toISOString().split("T")[0];
      }
      setPayments(prev => prev.map(p => p.id === editPay.id ? updated : p));
    } else {
      setPayments(prev => [...prev, { ...form, id: genId(), month, year, updatedAt: Date.now(), createdAt: Date.now() }]); // v10.07
    }
    setModalOpen(false);
    setEditPay(null);
  };

  const handleDelete = id => { if (!confirm("Are you sure? This can't be undone.")) return; trackDelete('customer-payments', id); setPayments(prev => prev.filter(p => p.id !== id)); };

  const handleBulkDelete = (ids) => {
    ids.forEach(id => trackDelete('customer-payments', id));
    setPayments(prev => prev.filter(p => !ids.includes(p.id)));
  };
  const handleCpBulkDuplicate = (ids) => {
    setPayments(prev => {
      const copies = [];
      ids.forEach(id => { const o = prev.find(p => p.id === id); if (o) copies.push({ ...o, id: genId(), status: "Open", paymentHash: "", updatedAt: Date.now() }); });
      return [...prev, ...copies];
    });
  };
  const handleCpBulkArchive = (ids) => {
    if (!confirm(`Archive ${ids.length} invoice(s)?`)) return;
    setPayments(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: "Archived", updatedAt: Date.now() } : p));
  };

  const handleCpStatusChange = (id, newStatus) => {
    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, status: newStatus, updatedAt: Date.now() }; // v10.07: stamp updatedAt
      if (["Received", "Refund"].includes(newStatus)) {
        updated.month = month;
        updated.year = year;
        if (!updated.paidDate) updated.paidDate = new Date().toISOString().split("T")[0];
      }
      return updated;
    }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="customers" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#0EA5E9" />

      <main className="blitz-main" style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={prevMonth} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 8, cursor: "pointer", color: "#64748B", display: "flex" }}>{I.chevL}</button>
            <div style={{ minWidth: 200, textAlign: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{MONTHS[month]}</span>
              <span style={{ fontSize: 22, fontWeight: 300, color: "#64748B", marginLeft: 10 }}>{year}</span>
            </div>
            <button onClick={nextMonth} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 8, cursor: "pointer", color: "#64748B", display: "flex" }}>{I.chevR}</button>
          </div>
          <CurrencyBadges />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 500, marginLeft: 24 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14 }} />
            </div>
            <button onClick={() => { setEditPay(null); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(14,165,233,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Invoice</button>
            <button onClick={handleCpSortAlpha}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: cpSort === "alpha" ? "#0EA5E9" : "transparent", border: `2px solid ${cpSort === "alpha" ? "#0EA5E9" : "#94A3B8"}`, borderRadius: 10, color: cpSort === "alpha" ? "#FFF" : "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >{cpSort === "alpha" ? "✓ A→Z" : "A→Z"}</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Open Invoices", value: openPayments.length, accent: "#F59E0B", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", isMoney: false },
            { label: "Open Total", value: openTotal, accent: "#F59E0B", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", isMoney: true },
            { label: "Received This Month", value: receivedPayments.length, accent: "#10B981", bg: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", isMoney: false },
            { label: "Received Total", value: receivedTotal, accent: "#10B981", bg: "#ECFDF5", isMoney: true },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.25s ease" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: c.accent }} />
              <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: c.accent }}>
                {c.isMoney ? c.value.toLocaleString("en-US") + "$" : c.value}
              </div>
            </div>
          ))}
        </div>

        <GroupHeader icon={I.openBox} title="Open Invoices" count={openPayments.length} total={openTotal} accentColor="#F59E0B" defaultOpen={true}>
          <CPTable payments={openPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={handleDelete} onBulkDelete={handleBulkDelete} onStatusChange={handleCpStatusChange} onFieldUpdate={handleCpFieldUpdate} statusOptions={CP_STATUS_OPTIONS} emptyMsg="No open invoices — all caught up!" sortMode={cpSort} onMove={handleCpMove} onDuplicate={handleCpBulkDuplicate} onArchive={handleCpBulkArchive} />
        </GroupHeader>

        <GroupHeader icon={I.calendar} title={`${MONTHS[month].toUpperCase()} ${year}`} count={receivedPayments.length} total={receivedTotal} accentColor="#EC4899" defaultOpen={true}>
          <CPTable payments={receivedPayments} onEdit={p => { setEditPay(p); setModalOpen(true); }} onDelete={handleDelete} onBulkDelete={handleBulkDelete} onFieldUpdate={handleCpFieldUpdate} emptyMsg={`No received payments for ${MONTHS[month]} ${year}`} sortMode={cpSort} onMove={handleCpMove} onDuplicate={handleCpBulkDuplicate} onArchive={handleCpBulkArchive} />
        </GroupHeader>
      </main>

      {modalOpen && (
        <Modal title={editPay ? "Edit Invoice" : "New Customer Invoice"} onClose={() => { setModalOpen(false); setEditPay(null); }}>
          <CPForm payment={editPay} onSave={handleSave} onClose={() => { setModalOpen(false); setEditPay(null); }} userName={user.name} />
        </Modal>
      )}
    </div>
  );
}

/* ── CRG Deals Page ── */
const CRG_INITIAL = []; // REMOVED: hardcoded demo data caused production data loss


function CRGForm({ deal, allDeals, onSave, onClose, defaultDate }) {
  const [f, setF] = useState(deal || { affiliate: "", deal: "", brokerCap: "", manageAff: "", cap: "", affOverride: "", madeSale: "", started: false, capReceived: "", ftd: "", hours: "", funnel: "", date: defaultDate || new Date().toISOString().split("T")[0] });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };

  // Duplicate detection: same affiliate + same date
  const dupWarning = (() => {
    if (!f.affiliate || !f.date) return null;
    const matches = (allDeals || []).filter(d => {
      if (deal && d.id === deal.id) return false;
      return (d.affiliate || "").trim().toLowerCase() === f.affiliate.trim().toLowerCase()
        && d.date === f.date
        && (d.brokerCap || "").trim().toLowerCase() === (f.brokerCap || "").trim().toLowerCase();
    });
    if (matches.length > 0) {
      return `⚠ A CRG deal for "${f.affiliate}" with broker "${f.brokerCap || "same"}" already exists on ${f.date}`;
    }
    return null;
  })();

  const handleSave = () => {
    if (!f.affiliate.trim()) { setError("Affiliate is required"); return; }
    onSave(f);
  };

  return (
    <>
      {/* Date selector - prominent at top */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)", borderRadius: 10, marginBottom: 16, border: "1px solid #F59E0B40" }}>
        <span style={{ fontSize: 20 }}>📅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#92400E", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Date</div>
          <input style={{ ...inp, background: "#FFF", border: "2px solid #F59E0B", fontWeight: 700, fontSize: 15 }} type="date" value={f.date} onChange={e => s("date", e.target.value)} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#92400E" }}>
            {(() => { const d = new Date(f.date + "T00:00:00"); const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${days[d.getDay()]}`; })()}
          </div>
        </div>
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Affiliate"><input style={inp} value={f.affiliate} onChange={e => s("affiliate", e.target.value)} placeholder="e.g. 33 AU, 47 DE" /></Field>
        <Field label="Deal"><input style={inp} value={f.deal || ""} onChange={e => s("deal", e.target.value)} placeholder="Deal info" /></Field>
        <Field label="Broker / Cap"><input style={inp} value={f.brokerCap} onChange={e => s("brokerCap", e.target.value)} placeholder="e.g. Swin 15" /></Field>
        <Field label="Manage the AFF"><NameCombo value={f.manageAff} onChange={v => s("manageAff", v)} /></Field>
        <Field label="CAP"><input style={inp} type="number" value={f.cap} onChange={e => s("cap", e.target.value)} placeholder="0" /></Field>
        <Field label="Aff Override"><input style={inp} type="number" value={f.affOverride || ""} onChange={e => s("affOverride", e.target.value)} placeholder="12" /></Field>
        <Field label="Made the SALE"><NameCombo value={f.madeSale} onChange={v => s("madeSale", v)} /></Field>
        <Field label="Started">
          <div onClick={() => s("started", !f.started)} style={{ ...inp, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, border: f.started ? "none" : "2px solid #CBD5E1", background: f.started ? "#10B981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 14, fontWeight: 700 }}>{f.started ? "✓" : ""}</span>
            <span style={{ color: f.started ? "#10B981" : "#94A3B8", fontWeight: 500 }}>{f.started ? "Yes" : "No"}</span>
          </div>
        </Field>
        <Field label="CAP Received"><input style={inp} type="number" value={f.capReceived} onChange={e => s("capReceived", e.target.value)} placeholder="0" /></Field>
        <Field label="FTD"><input style={inp} type="number" value={f.ftd} onChange={e => s("ftd", e.target.value)} placeholder="0" /></Field>
        <Field label="Hours"><input style={inp} value={f.hours} onChange={e => s("hours", e.target.value)} placeholder="e.g. 04-13 gmt+2" /></Field>
      </div>
      <Field label="Funnel"><textarea style={{ ...inp, minHeight: 50, resize: "vertical" }} value={f.funnel || ""} onChange={e => s("funnel", e.target.value)} placeholder="Funnel info..." /></Field>
      {dupWarning && <div style={{ color: "#B45309", fontSize: 13, padding: "8px 12px", background: "#FFFBEB", borderRadius: 8, marginBottom: 8, border: "1px solid #FDE68A", fontWeight: 600 }}>{dupWarning}</div>}
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#F59E0B,#FBBF24)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(245,158,11,0.3)" }}>{deal ? "Save Changes" : "Add Deal"}</button>
      </div>
    </>
  );
}

// ── Inline Editable Cell ──
function InlineCell({ value, onSave, style, type = "text", placeholder = "" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const ref = useRef(null);
  useEffect(() => { setVal(value || ""); }, [value]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  const save = () => { setEditing(false); if (val !== (value || "")) onSave(val); };
  // v9.05: Tab to next cell — find next InlineCell sibling and click it
  const tabToNext = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      save();
      const td = e.target.closest("td");
      const next = e.shiftKey ? td?.previousElementSibling : td?.nextElementSibling;
      if (next) setTimeout(() => next.click(), 50);
    }
  };
  if (!editing) {
    return (
      <td style={{ ...style, cursor: "pointer", userSelect: "none" }} onClick={() => setEditing(true)} title="Click to edit">
        {type === "checkbox" ? (value ? <span style={{ color: "#00C875", fontSize: 18, fontWeight: 700 }}>✓</span> : <span style={{ color: "#C5C7D0", fontSize: 14 }}>○</span>) : (value || <span style={{ color: "#C5C7D0" }}>{placeholder || "—"}</span>)}
      </td>
    );
  }
  if (type === "checkbox") {
    setTimeout(() => { onSave(!value); setEditing(false); }, 0);
    return <td style={style}><span style={{ color: "#00C875", fontSize: 18, fontWeight: 700 }}>✓</span></td>;
  }
  return (
    <td style={{ ...style, padding: 0 }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(value || ""); setEditing(false); } tabToNext(e); }}
        style={{ width: "100%", height: "100%", padding: "4px 8px", border: "2px solid #0EA5E9", borderRadius: 0, outline: "none", fontSize: 13, fontFamily: type === "number" ? "'JetBrains Mono',monospace" : "inherit", fontWeight: 600, background: "#EFF6FF", boxSizing: "border-box" }}
      />
    </td>
  );
}

function CRGDeals({ user, onLogout, onNav, onAdmin, deals: rawDeals, setDeals, userAccess }) {
  const deals = Array.isArray(rawDeals) ? rawDeals : [];
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [newDayDate, setNewDayDate] = useState(null);
  const [crgSort, setCrgSort] = useState("manual"); // "manual" | "alpha"

  // Get the latest date in deals
  const allDates = [...new Set((deals || []).map(d => d.date).filter(Boolean))].sort();
  const latestDate = allDates[allDates.length - 1] || new Date().toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  const handleCopyPrevDay = (targetDate) => {
    const prevDayEntries = (deals || []).filter(d => d.date === latestDate);
    if (prevDayEntries.length === 0) return;
    // CHECK: if target date already has records, don't duplicate
    const existingForDate = (deals || []).filter(d => d.date === targetDate);
    if (existingForDate.length > 0) {
      if (!confirm(`${targetDate} already has ${existingForDate.length} entries. Copy anyway? (existing entries will be kept)`)) return;
    }
    // Only copy entries whose affiliate doesn't already exist on target date
    const existingAffiliates = new Set(existingForDate.map(d => (d.affiliate || "").trim().toLowerCase()));
    const newEntries = prevDayEntries
      .filter(d => !existingAffiliates.has((d.affiliate || "").trim().toLowerCase()))
      .map(d => ({
        ...d, id: genId(), date: targetDate,
        started: false, capReceived: "", ftd: "", funnel: "",
        status: "pending", confirmRotation: false, confirmCap: false, confirmFinance: false,
        rotationBy: "", capBy: "", financeBy: "", createdAt: Date.now(), updatedAt: Date.now(),
      }));
    if (newEntries.length === 0) return;
    setDeals(prev => [...prev, ...newEntries]);
  };

  // Inline field update
  const updateField = (id, field, value) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, [field]: value, updatedAt: Date.now() } : d));
  };

  // Move a deal up or down within its date group
  const handleMove = (dealId, direction) => {
    setDeals(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(d => d.id === dealId);
      if (idx < 0) return prev;
      const item = arr[idx];
      const dateKey = item.date;
      // Find all indices for this date
      const dateIndices = arr.map((d, i) => d.date === dateKey ? i : -1).filter(i => i >= 0);
      const posInDate = dateIndices.indexOf(idx);
      if (direction === "up" && posInDate > 0) {
        const swapIdx = dateIndices[posInDate - 1];
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      } else if (direction === "down" && posInDate < dateIndices.length - 1) {
        const swapIdx = dateIndices[posInDate + 1];
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      }
      return arr;
    });
  };

  // Sort all deals alphabetically by affiliate within each date group
  const handleSortAlpha = () => {
    if (crgSort === "alpha") {
      setCrgSort("manual");
      return;
    }
    setCrgSort("alpha");
    setDeals(prev => {
      const arr = [...prev];
      // Group by date, sort each group, reassemble
      const groups = {};
      const order = [];
      arr.forEach((d, i) => {
        const key = d.date || "Unknown";
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(d);
      });
      const sorted = [];
      // Keep date order, sort items within each date
      const dateOrder = [...new Set(arr.map(d => d.date || "Unknown"))];
      dateOrder.forEach(dk => {
        const items = arr.filter(d => (d.date || "Unknown") === dk);
        items.sort((a, b) => (a.affiliate || "").localeCompare(b.affiliate || "", undefined, { numeric: true }));
        sorted.push(...items);
      });
      return sorted;
    });
  };

  const matchSearch = d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.affiliate, d.deal, d.brokerCap, d.manageAff, d.madeSale, d.hours, d.funnel, d.affOverride].some(v => (v || "").toLowerCase().includes(q));
  };

  // Separate pending deals from active/confirmed deals
  const pendingDeals = (deals || []).filter(d => d.status === "pending");
  const activeDeals = (deals || []).filter(d => d.status !== "pending");

  const filtered = activeDeals.filter(matchSearch);

  // Group by date
  const grouped = {};
  filtered.forEach(d => {
    const key = d.date || "Unknown";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // newest first

  const fmtDate = ds => {
    if (!ds || ds === "Unknown") return "Unknown";
    const d = new Date(ds + "T00:00:00");
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${days[d.getDay()]}`;
  };

  const handleSave = form => {
    if (editDeal) {
      setDeals(prev => prev.map(d => d.id === editDeal.id ? { ...editDeal, ...form, updatedAt: Date.now() } : d));
    } else {
      // New deals start as "pending" — need 3 confirmations before going live
      setDeals(prev => [...prev, { ...form, id: genId(), status: "pending", confirmRotation: false, confirmCap: false, confirmFinance: false, rotationBy: "", capBy: "", financeBy: "", createdAt: Date.now() }]);
    }
    setModalOpen(false);
    setEditDeal(null);
    setNewDayDate(null);
  };

  const handleDelete = id => { if (!confirm("Are you sure? This can't be undone.")) return; trackDelete('crg-deals', id); setDeals(prev => prev.filter(d => d.id !== id)); };

  const handleDuplicate = deal => {
    const dup = { ...deal, id: genId(), updatedAt: Date.now(), createdAt: Date.now() };
    setDeals(prev => {
      const idx = prev.findIndex(d => d.id === deal.id);
      const arr = [...prev];
      arr.splice(idx + 1, 0, dup);
      return arr;
    });
  };

  // ── Confirmation workflow — role-based approvals ──
  const userEmail = (user?.email || "").toLowerCase().trim();
  const stageUsers = ["kate@blitz-affiliates.marketing", "alehandro@blitz-affiliates.marketing", "zack@blitz-affiliates.marketing", "kazarian.oleksandra.v@gmail.com", "sophia@blitz-affiliates.marketing", "y0505300530@gmail.com", "wpnayanray@gmail.com", "office1092021@gmail.com"];
  const canConfirmRotation = stageUsers.some(e => e.toLowerCase() === userEmail) || isAdmin(user?.email);
  const canConfirmCap = stageUsers.some(e => e.toLowerCase() === userEmail) || isAdmin(user?.email);
  const canConfirmFinance = stageUsers.some(e => e.toLowerCase() === userEmail) || isAdmin(user?.email);

  const handleConfirmToggle = (dealId, field) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const newVal = !d[field];
      const byField = field === "confirmRotation" ? "rotationBy" : field === "confirmCap" ? "capBy" : "financeBy";
      const updated = { ...d, [field]: newVal, [byField]: newVal ? (user?.name || user?.email) : "", updatedAt: Date.now() };
      // Auto-promote to active when all 3 confirmed
      if (updated.confirmRotation && updated.confirmCap && updated.confirmFinance) {
        updated.status = "active";
      } else if (updated.status === "active") {
        updated.status = "pending"; // Un-confirm reverts to pending
      }
      return updated;
    }));
  };

  // Summary totals — TODAY ONLY (active deals only)
  const todayDeals = activeDeals.filter(d => d.date === today && matchSearch(d));
  const totalCap = todayDeals.reduce((s, d) => s + (parseInt(d.cap) || 0), 0);
  const totalCapRec = todayDeals.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0);
  const startedCount = todayDeals.filter(d => d.started).length;

  const personBadge = (name) => {
    if (!name) return <span style={{ color: "#CBD5E1", fontSize: 13 }}>—</span>;
    return <span style={{ display: "inline-block", padding: "6px 0", borderRadius: 0, background: getPersonColor(name), color: "#FFF", fontWeight: 700, fontSize: 13, textAlign: "center", width: "100%", letterSpacing: 0.3 }}>{name}</span>;
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="crg" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#F59E0B" />

      <main className="blitz-main" style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>CRG Deals</h1>
          <CurrencyBadges />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 500, marginLeft: 24 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14 }} />
            </div>
            <button onClick={() => { setEditDeal(null); setNewDayDate(today); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#F59E0B,#FBBF24)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(245,158,11,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Deal</button>
          </div>
        </div>

        {/* Day action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => { setEditDeal(null); setNewDayDate(today); setModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#10B981", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📅 New Entry (Today)</button>
          <button onClick={() => { setEditDeal(null); setNewDayDate(tomorrow); setModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#6366F1", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📅 New Entry (Tomorrow)</button>
          <button onClick={() => handleCopyPrevDay(today)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #F59E0B", borderRadius: 8, color: "#F59E0B", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📋 Copy Last Day → Today</button>
          <button onClick={() => handleCopyPrevDay(tomorrow)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #6366F1", borderRadius: 8, color: "#6366F1", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📋 Copy Last Day → Tomorrow</button>
          <button onClick={handleSortAlpha}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: crgSort === "alpha" ? "#0EA5E9" : "transparent", border: `2px solid ${crgSort === "alpha" ? "#0EA5E9" : "#94A3B8"}`, borderRadius: 8, color: crgSort === "alpha" ? "#FFF" : "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 600, marginLeft: "auto" }}
          >{crgSort === "alpha" ? "✓ A→Z Sorted" : "A→Z Sort"}</button>
          <button onClick={async () => {
            try {
              const res = await fetch(`${API_BASE}/telegram/screenshot/crg`, { method: "POST", headers: authHeaders() });
              const data = await res.json();
              if (data.ok) alert("✅ CRG screenshot sent to Telegram!");
              else alert("❌ " + (data.error || "Failed to send screenshot"));
            } catch (e) { alert("❌ " + e.message); }
          }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #10B981", borderRadius: 8, color: "#10B981", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📸 CRG Screenshot</button>
        </div>

        {/* Summary cards — Today only */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Deals Today", value: todayDeals.length, accent: "#F59E0B", bg: "#FFFBEB" },
            { label: "CAP Sum Today", value: totalCap, accent: "#6366F1", bg: "#EEF2FF" },
            { label: "Started Today", value: `${startedCount} / ${todayDeals.length}`, accent: "#10B981", bg: "#ECFDF5" },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.25s ease" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: c.accent }} />
              <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: c.accent }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* ═══ Waiting for Confirmation ═══ */}
        {pendingDeals.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>⏳</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#B45309" }}>Waiting for Confirmation</h2>
              <span style={{ padding: "3px 10px", borderRadius: 20, background: "#FEF3C7", color: "#92400E", fontSize: 12, fontWeight: 700 }}>{pendingDeals.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {pendingDeals.map(d => {
                const allDone = d.confirmRotation && d.confirmCap && d.confirmFinance;
                return (
                  <div key={d.id} style={{ background: "#FFF", border: allDone ? "2px solid #10B981" : "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "all 0.2s" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{d.affiliate || "—"}</div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{d.brokerCap || "—"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setEditDeal(d); setModalOpen(true); }} style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 4, cursor: "pointer", color: "#2563EB", display: "flex", fontSize: 11 }}>{I.edit}</button>
                        <button onClick={() => handleDelete(d.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 4, cursor: "pointer", color: "#DC2626", display: "flex", fontSize: 11 }}>{I.trash}</button>
                      </div>
                    </div>
                    {/* Info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 12, color: "#475569", marginBottom: 12 }}>
                      <div><span style={{ color: "#94A3B8" }}>Aff:</span> <strong>{d.cap || "—"}</strong></div>
                      <div><span style={{ color: "#94A3B8" }}>Aff override:</span> <strong>{d.affOverride || "—"}</strong></div>
                      <div><span style={{ color: "#94A3B8" }}>Cap:</span> <strong style={{ color: parseInt(d.cap) >= 100 ? "#DC2626" : "#0F172A" }}>{d.cap || "—"}</strong></div>
                      <div><span style={{ color: "#94A3B8" }}>WH:</span> <strong>{d.hours || "—"}</strong></div>
                      <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#94A3B8" }}>Funnel:</span> <strong>{d.funnel || "—"}</strong></div>
                    </div>
                    {/* 3 Confirmation checkboxes */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        { field: "confirmRotation", label: "Rotation set", can: canConfirmRotation, by: d.rotationBy, who: "Kate / Alehandro / Zack / Oleksandra" },
                        { field: "confirmCap", label: "Cap ordered", can: canConfirmCap, by: d.capBy, who: "Kate / Alehandro / Zack / Oleksandra" },
                        { field: "confirmFinance", label: "Finance approved", can: canConfirmFinance, by: d.financeBy, who: "Kate / Alehandro / Zack / Oleksandra" },
                      ].map(c => {
                        const checked = !!d[c.field];
                        return (
                          <div key={c.field}
                            onClick={() => c.can && handleConfirmToggle(d.id, c.field)}
                            style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, cursor: c.can ? "pointer" : "default",
                              background: checked ? "#F0FDF4" : c.can ? "#FAFAFA" : "#F8FAFC",
                              border: `1px solid ${checked ? "#86EFAC" : "#E2E8F0"}`,
                              opacity: c.can || checked ? 1 : 0.6,
                              transition: "all 0.15s",
                            }}
                          >
                            <div style={{
                              width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                              border: checked ? "none" : "2px solid #CBD5E1",
                              background: checked ? "#10B981" : "#FFF",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#FFF", fontSize: 13, fontWeight: 700,
                            }}>{checked ? "✓" : ""}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: checked ? "#166534" : "#475569" }}>{c.label}</div>
                              {checked && c.by && <div style={{ fontSize: 10, color: "#6B7280" }}>by {c.by}</div>}
                            </div>
                            {!checked && !c.can && <span style={{ fontSize: 9, color: "#94A3B8" }}>{c.who}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Grouped by date */}
        {sortedDates.map(dateKey => {
          const items = grouped[dateKey];
          const sortedItems = crgSort === "alpha"
            ? [...items].sort((a, b) => (a.affiliate || "").localeCompare(b.affiliate || "", undefined, { numeric: true }))
            : items;
          const dayCap = sortedItems.reduce((s, d) => s + (parseInt(d.cap) || 0), 0);
          const dayCapRec = sortedItems.reduce((s, d) => s + (parseInt(d.capReceived) || 0), 0);
          const dayFtd = sortedItems.reduce((s, d) => s + (parseInt(d.ftd) || 0), 0);
          const dayStarted = sortedItems.filter(d => d.started).length;

          return (
            <GroupHeader key={dateKey} icon={I.calendar} title={fmtDate(dateKey)} count={sortedItems.length} total={dayCap} accentColor="#F59E0B" defaultOpen={true}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#FFFFFF" }}>
                      {["Affiliate","Deal","Broker / Cap","Manage AFF","CAP","Aff OVR","Made SALE","Started","CAP Rec.","FTD","Hours","Funnel","Actions"].map(h =>
                        <th key={h} style={{ padding: "8px 12px", textAlign: "center", color: "#676879", fontSize: 12, fontWeight: 600, borderBottom: "2px solid #94A3B8", borderRight: "1px solid #CBD5E1", whiteSpace: "nowrap", ...(h === "Affiliate" ? { textAlign: "left", paddingLeft: 14 } : {}) }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((d, rowIdx) => (
                      <tr key={d.id} style={{ borderBottom: "1px solid #CBD5E1", transition: "background 0.15s", height: 37 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F5F6F8"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "0 14px", fontWeight: 600, fontSize: 14, borderRight: "1px solid #CBD5E1", color: "#323338" }}>
                          <span onClick={() => { setEditDeal(d); setModalOpen(true); }} style={{ cursor: "pointer", color: "#0073EA", textDecoration: "none" }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                          >{d.affiliate}</span>
                        </td>
                        <td style={{ padding: "0 12px", borderRight: "1px solid #CBD5E1", fontSize: 13, color: "#323338" }}>{d.deal || ""}</td>
                        <td style={{ padding: "0 14px", borderRight: "1px solid #CBD5E1", fontSize: 13, color: "#323338", textAlign: "center" }}>{d.brokerCap || ""}</td>
                        <td style={{ padding: 0, borderRight: "1px solid #CBD5E1", background: d.manageAff ? getPersonColor(d.manageAff) : "transparent", textAlign: "center" }}>
                          <span style={{ color: "#FFF", fontWeight: 600, fontSize: 13, letterSpacing: 0.2 }}>{d.manageAff || ""}</span>
                        </td>
                        <InlineCell value={d.cap} onSave={v => updateField(d.id, "cap", v)} type="number" style={{ padding: "0 10px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 14, borderRight: "1px solid #CBD5E1", textAlign: "center", color: "#323338" }} />
                        <InlineCell value={d.affOverride} onSave={v => updateField(d.id, "affOverride", v)} type="number" style={{ padding: "0 10px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 13, borderRight: "1px solid #CBD5E1", textAlign: "center", color: d.affOverride ? "#323338" : "#C5C7D0" }} />
                        <td style={{ padding: 0, borderRight: "1px solid #CBD5E1", background: d.madeSale ? getPersonColor(d.madeSale) : "transparent", textAlign: "center" }}>
                          <span style={{ color: "#FFF", fontWeight: 600, fontSize: 13, letterSpacing: 0.2 }}>{d.madeSale || ""}</span>
                        </td>
                        <InlineCell value={d.started} onSave={v => updateField(d.id, "started", v)} type="checkbox" style={{ padding: "0 10px", borderRight: "1px solid #CBD5E1", textAlign: "center" }} />
                        <InlineCell value={d.capReceived} onSave={v => updateField(d.id, "capReceived", v)} type="number" placeholder="" style={{ padding: "0 10px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 13, borderRight: "1px solid #CBD5E1", textAlign: "center", color: d.capReceived ? "#323338" : "#C5C7D0" }} />
                        <InlineCell value={d.ftd} onSave={v => updateField(d.id, "ftd", v)} type="number" placeholder="" style={{ padding: "0 10px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 13, borderRight: "1px solid #CBD5E1", textAlign: "center", color: d.ftd ? "#323338" : "#C5C7D0" }} />
                        <InlineCell value={d.hours} onSave={v => updateField(d.id, "hours", v)} style={{ padding: "0 12px", fontSize: 13, color: "#676879", borderRight: "1px solid #CBD5E1", whiteSpace: "nowrap" }} />
                        <InlineCell value={d.funnel} onSave={v => updateField(d.id, "funnel", v)} style={{ padding: "0 12px", fontSize: 13, color: "#676879", borderRight: "1px solid #CBD5E1", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
                        <td style={{ padding: "4px 8px" }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {crgSort === "manual" && <>
                              <button onClick={() => handleMove(d.id, "up")} title="Move up" disabled={rowIdx === 0}
                                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: rowIdx === 0 ? "default" : "pointer", color: rowIdx === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▲</button>
                              <button onClick={() => handleMove(d.id, "down")} title="Move down" disabled={rowIdx === sortedItems.length - 1}
                                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: rowIdx === sortedItems.length - 1 ? "default" : "pointer", color: rowIdx === sortedItems.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▼</button>
                            </>}
                            <button onClick={() => handleDuplicate(d)} title="Duplicate" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: 5, cursor: "pointer", color: "#16A34A", display: "flex", fontSize: 12 }}>⧉</button>
                            <button onClick={() => { setEditDeal(d); setModalOpen(true); }} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                            <button onClick={() => handleDelete(d.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Quick add inside the group */}
                <button onClick={() => { setEditDeal(null); setNewDayDate(dateKey); setModalOpen(true); }}
                  style={{ width: "100%", padding: "8px 16px", background: "transparent", border: "none", borderTop: "1px dashed #E6E9EF", color: "#F59E0B", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#FFFBEB"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{I.plus} Add Deal</button>
                {/* Day footer */}
                <div style={{ background: "#FAFBFC", borderTop: "1px solid #E6E9EF" }}>
                  {/* Color bar row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "7px 16px", flexWrap: "wrap", borderBottom: "1px solid #F1F3F5" }}>
                    <div style={{ display: "flex", height: 16, borderRadius: 4, overflow: "hidden", minWidth: 80 }}>
                      {Object.entries(sortedItems.reduce((acc, d) => { if (d.manageAff) acc[d.manageAff] = (acc[d.manageAff] || 0) + 1; return acc; }, {})).map(([name, count]) =>
                        <div key={name} style={{ width: count * 20, background: getPersonColor(name), minWidth: 12 }} title={`${name}: ${count}`} />
                      )}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 12, color: "#323338" }}>{dayCap} <span style={{ color: "#C5C7D0", fontWeight: 400 }}>sum</span></span>
                    <div style={{ display: "flex", height: 16, borderRadius: 4, overflow: "hidden", minWidth: 80 }}>
                      {Object.entries(sortedItems.reduce((acc, d) => { if (d.madeSale) acc[d.madeSale] = (acc[d.madeSale] || 0) + 1; return acc; }, {})).map(([name, count]) =>
                        <div key={name} style={{ width: count * 20, background: getPersonColor(name), minWidth: 12 }} title={`${name}: ${count}`} />
                      )}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 12, color: "#323338" }}>{dayStarted}/{sortedItems.length}</span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: "#323338" }}>{dayCapRec} <span style={{ color: "#C5C7D0", fontWeight: 400 }}>sum</span></span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: "#323338" }}>{dayFtd} <span style={{ color: "#C5C7D0", fontWeight: 400 }}>sum</span></span>
                  </div>
                  {/* Table Summary */}
                  {(() => {
                    const capPct = dayCap > 0 ? Math.round((dayCapRec / dayCap) * 100) : 0;
                    const pctColor = capPct >= 80 ? "#16A34A" : capPct >= 50 ? "#F59E0B" : "#DC2626";
                    const pctBg = capPct >= 80 ? "#F0FDF4" : capPct >= 50 ? "#FFFBEB" : "#FEF2F2";
                    const stats = [
                      { label: "Total CAP", value: dayCap, color: "#6366F1", bg: "#EEF2FF", icon: "🎯" },
                      { label: "Total Received", value: dayCapRec, color: "#0EA5E9", bg: "#F0F9FF", icon: "📥" },
                      { label: "% of CAP", value: `${capPct}%`, color: pctColor, bg: pctBg, icon: "📊" },
                      { label: "FTDs Count", value: dayFtd, color: "#10B981", bg: "#F0FDF4", icon: "⭐" },
                    ];
                    return (
                      <div style={{ display: "flex", alignItems: "stretch", gap: 0, padding: "10px 16px", flexWrap: "wrap", gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px", alignSelf: "center", marginRight: 4 }}>Table Summary</span>
                        {stats.map(st => (
                          <div key={st.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: st.bg, borderRadius: 8, border: `1px solid ${st.color}22` }}>
                            <span style={{ fontSize: 14 }}>{st.icon}</span>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.2 }}>{st.label}</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: st.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.3 }}>{st.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </GroupHeader>
          );
        })}

        {sortedDates.length === 0 && <div style={{ padding: "60px 16px", textAlign: "center", color: "#94A3B8", fontSize: 15 }}>No deals yet. Click "New Deal" to add one.</div>}
      </main>

      {modalOpen && (
        <Modal title={editDeal ? "Edit Deal" : "New Deal"} onClose={() => { setModalOpen(false); setEditDeal(null); }}>
          <CRGForm deal={editDeal} allDeals={deals} onSave={handleSave} onClose={() => { setModalOpen(false); setEditDeal(null); setNewDayDate(null); }} defaultDate={newDayDate} />
        </Modal>
      )}
    </div>
  );
}

/* ── Daily Cap Page ── */
const DC_INITIAL = [];

function DCForm({ entry, allEntries, onSave, onClose, defaultDate }) {
  const [f, setF] = useState(entry || { agent: "", affiliates: "", brands: "", date: defaultDate || new Date().toISOString().split("T")[0] });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };
  const total = (parseInt(f.affiliates) || 0) + (parseInt(f.brands) || 0);

  // Duplicate detection: same agent + same date
  const dupWarning = (() => {
    if (!f.agent || !f.date) return null;
    const matches = (allEntries || []).filter(d => {
      if (entry && d.id === entry.id) return false;
      return (d.agent || "").trim().toLowerCase() === f.agent.trim().toLowerCase() && d.date === f.date;
    });
    if (matches.length > 0) return `⚠ Agent "${f.agent}" already has an entry for ${f.date}`;
    return null;
  })();

  const handleSave = () => {
    if (!f.agent.trim()) { setError("Agent name is required"); return; }
    onSave(f);
  };

  return (
    <>
      {/* Date selector - prominent at top */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", borderRadius: 10, marginBottom: 16, border: "1px solid #8B5CF640" }}>
        <span style={{ fontSize: 20 }}>📅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#5B21B6", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Date</div>
          <input style={{ ...inp, background: "#FFF", border: "2px solid #8B5CF6", fontWeight: 700, fontSize: 15 }} type="date" value={f.date} onChange={e => s("date", e.target.value)} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#5B21B6" }}>
            {(() => { const d = new Date(f.date + "T00:00:00"); const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${days[d.getDay()]}`; })()}
          </div>
        </div>
      </div>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Agent"><NameCombo value={f.agent} onChange={v => s("agent", v)} /></Field>
        <div />
        <Field label="Affiliates"><input style={inp} type="number" value={f.affiliates} onChange={e => s("affiliates", e.target.value)} placeholder="0" /></Field>
        <Field label="Brands"><input style={inp} type="number" value={f.brands} onChange={e => s("brands", e.target.value)} placeholder="0" /></Field>
      </div>
      <div style={{ padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 600 }}>Total:</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: "#0F172A" }}>{total}</span>
      </div>
      {dupWarning && <div style={{ color: "#B45309", fontSize: 13, padding: "8px 12px", background: "#FFFBEB", borderRadius: 8, marginBottom: 8, border: "1px solid #FDE68A", fontWeight: 600 }}>{dupWarning}</div>}
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg,#8B5CF6,#A78BFA)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(139,92,246,0.3)" }}>{entry ? "Save Changes" : "Add Agent"}</button>
      </div>
    </>
  );
}

function DailyCap({ user, onLogout, onNav, onAdmin, entries: rawEntries, setEntries, crgDeals: rawCrgDeals, userAccess }) {
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  const crgDeals = Array.isArray(rawCrgDeals) ? rawCrgDeals : [];
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [newDayDate, setNewDayDate] = useState(null);
  const [dcSort, setDcSort] = useState("manual");

  // Auto-sync Daily Cap from CRG Deals
  // manageAff + cap → agent Affiliates
  // madeSale + cap → agent Brands
  const syncFromCRG = () => {
    if (!crgDeals || crgDeals.length === 0) return;

    // Build a map: { date: { agentName: { affiliates: sum, brands: sum } } }
    const capMap = {};
    crgDeals.forEach(deal => {
      const date = deal.date;
      if (!date) return;
      const capVal = parseInt(deal.cap) || 0;
      if (capVal === 0) return;

      if (!capMap[date]) capMap[date] = {};

      // manageAff → affiliates
      const mAff = (deal.manageAff || "").trim();
      if (mAff) {
        const normAff = normalizeAgent(mAff.charAt(0).toUpperCase() + mAff.slice(1).toLowerCase());
        if (!capMap[date][normAff]) capMap[date][normAff] = { affiliates: 0, brands: 0 };
        capMap[date][normAff].affiliates += capVal;
      }

      // madeSale → brands
      const mSale = (deal.madeSale || "").trim();
      if (mSale) {
        const normSale = normalizeAgent(mSale.charAt(0).toUpperCase() + mSale.slice(1).toLowerCase());
        if (!capMap[date][normSale]) capMap[date][normSale] = { affiliates: 0, brands: 0 };
        capMap[date][normSale].brands += capVal;
      }
    });

    // Now update/create entries (case-insensitive dedup)
    setEntries(prev => {
      const updated = [...prev];
      // Normalize agent names in existing entries
      updated.forEach((e, i) => { if (e && e.agent) updated[i] = { ...e, agent: normalizeAgent(e.agent) }; });
      const existingMap = {};
      updated.forEach((e, i) => {
        const key = `${e.date}__${(e.agent || "").trim().toLowerCase()}`;
        if (existingMap[key] === undefined) {
          existingMap[key] = i;
        } else {
          // Duplicate found! Merge into the first occurrence
          const firstIdx = existingMap[key];
          const first = updated[firstIdx];
          updated[firstIdx] = {
            ...first,
            affiliates: String((parseInt(first.affiliates) || 0) + (parseInt(e.affiliates) || 0)),
            brands: String((parseInt(first.brands) || 0) + (parseInt(e.brands) || 0)),
          };
          updated[i] = null; // Mark for removal
        }
      });

      // Remove nulls (merged duplicates)
      const cleaned = updated.filter(Boolean);

      // Rebuild existingMap after cleanup
      const cleanMap = {};
      cleaned.forEach((e, i) => {
        const key = `${e.date}__${(e.agent || "").trim().toLowerCase()}`;
        cleanMap[key] = i;
      });

      Object.keys(capMap).forEach(date => {
        Object.keys(capMap[date]).forEach(agent => {
          const { affiliates, brands } = capMap[date][agent];
          const key = `${date}__${agent.toLowerCase()}`;
          if (cleanMap[key] !== undefined) {
            const idx = cleanMap[key];
            cleaned[idx] = { ...cleaned[idx], agent, affiliates: String(affiliates), brands: String(brands) };
          } else {
            cleaned.push({ id: genId(), agent, affiliates: String(affiliates), brands: String(brands), date });
            cleanMap[key] = cleaned.length - 1;
          }
        });
      });

      return cleaned;
    });
  };

  // Auto-sync when crgDeals change
  useEffect(() => {
    syncFromCRG();
  }, [crgDeals]);

  const allDates = [...new Set((entries || []).map(d => d.date).filter(Boolean))].sort();
  const latestDate = allDates[allDates.length - 1] || new Date().toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  const handleCopyPrevDay = (targetDate) => {
    const prevDayEntries = entries.filter(d => d.date === latestDate);
    if (prevDayEntries.length === 0) return;
    // CHECK: if target date already has records, don't duplicate
    const existingForDate = (entries || []).filter(d => d.date === targetDate);
    if (existingForDate.length > 0) {
      if (!confirm(`${targetDate} already has ${existingForDate.length} entries. Copy anyway? (existing entries will be kept)`)) return;
    }
    // Only copy agents that don't already exist on target date
    const existingAgents = new Set(existingForDate.map(d => (d.agent || "").trim().toLowerCase()));
    const newEntries = prevDayEntries
      .filter(d => !existingAgents.has((d.agent || "").trim().toLowerCase()))
      .map(d => ({
        ...d, id: genId(), date: targetDate,
        affiliates: "", brands: "", updatedAt: Date.now(), createdAt: Date.now(),
      }));
    if (newEntries.length === 0) return;
    setEntries(prev => [...prev, ...newEntries]);
  };

  const handleDcMove = (id, direction) => {
    setEntries(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(d => d.id === id);
      if (idx < 0) return prev;
      const item = arr[idx];
      const dateKey = item.date;
      const dateIndices = arr.map((d, i) => d.date === dateKey ? i : -1).filter(i => i >= 0);
      const posInDate = dateIndices.indexOf(idx);
      if (direction === "up" && posInDate > 0) {
        const swapIdx = dateIndices[posInDate - 1];
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      } else if (direction === "down" && posInDate < dateIndices.length - 1) {
        const swapIdx = dateIndices[posInDate + 1];
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      }
      return arr;
    });
  };

  const handleDcSortAlpha = () => {
    if (dcSort === "alpha") { setDcSort("manual"); return; }
    setDcSort("alpha");
    setEntries(prev => {
      const dateOrder = [...new Set(prev.map(d => d.date || "Unknown"))];
      const sorted = [];
      dateOrder.forEach(dk => {
        const items = prev.filter(d => (d.date || "Unknown") === dk);
        items.sort((a, b) => (a.agent || "").localeCompare(b.agent || "", undefined, { numeric: true }));
        sorted.push(...items);
      });
      return sorted;
    });
  };

  const matchSearch = d => {
    if (!search) return true;
    return (d.agent || "").toLowerCase().includes(search.toLowerCase());
  };

  const filtered = (entries || []).filter(matchSearch);

  // Group by date — merge entries with same normalized agent name
  const grouped = {};
  filtered.forEach(d => {
    const key = d.date || "Unknown";
    const normAgent = normalizeAgent(d.agent);
    if (!grouped[key]) grouped[key] = [];
    const existing = grouped[key].find(e => (e.agent || "").toLowerCase() === (normAgent || "").toLowerCase());
    if (existing) {
      existing.affiliates = String((parseInt(existing.affiliates) || 0) + (parseInt(d.affiliates) || 0));
      existing.brands = String((parseInt(existing.brands) || 0) + (parseInt(d.brands) || 0));
    } else {
      grouped[key].push({ ...d, agent: normAgent });
    }
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // newest first

  const fmtDate = ds => {
    if (!ds || ds === "Unknown") return "Unknown";
    const d = new Date(ds + "T00:00:00");
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
  };

  const handleSave = form => {
    if (editEntry) {
      setEntries(prev => prev.map(d => d.id === editEntry.id ? { ...editEntry, ...form, updatedAt: Date.now() } : d));
    } else {
      setEntries(prev => [...prev, { ...form, id: genId(), updatedAt: Date.now(), createdAt: Date.now() }]);
    }
    setModalOpen(false);
    setEditEntry(null);
    setNewDayDate(null);
  };

  const handleDelete = id => { if (!confirm("Are you sure? This can't be undone.")) return; trackDelete('daily-cap', id); setEntries(prev => prev.filter(d => d.id !== id)); };

  const updateField = (id, field, value) => {
    setEntries(prev => prev.map(d => d.id === id ? { ...d, [field]: value, updatedAt: Date.now() } : d));
  };

  const todayEntries = filtered.filter(d => d.date === today);
  const grandAff = todayEntries.reduce((s, d) => s + (parseInt(d.affiliates) || 0), 0);
  const grandBrands = todayEntries.reduce((s, d) => s + (parseInt(d.brands) || 0), 0);
  const activeAgents = todayEntries.length;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="dailycap" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#8B5CF6" />

      <main className="blitz-main" style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Daily Cap</h1>
          <CurrencyBadges />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agent..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, width: 220 }} />
            </div>
            <button onClick={syncFromCRG} title="Recalculate from CRG Deals"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "transparent", border: "2px solid #F59E0B", borderRadius: 10, color: "#F59E0B", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#F59E0B"; e.currentTarget.style.color = "#FFF"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#F59E0B"; }}
            >🔄 Sync CRG</button>
            <button onClick={() => { setEditEntry(null); setNewDayDate(today); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#8B5CF6,#A78BFA)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(139,92,246,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Agent</button>
          </div>
        </div>

        {/* Day action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => { setEditEntry(null); setNewDayDate(today); setModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#10B981", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📅 New Entry (Today)</button>
          <button onClick={() => { setEditEntry(null); setNewDayDate(tomorrow); setModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#6366F1", border: "none", borderRadius: 8, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📅 New Entry (Tomorrow)</button>
          <button onClick={() => handleCopyPrevDay(today)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #8B5CF6", borderRadius: 8, color: "#8B5CF6", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📋 Copy Last Day → Today</button>
          <button onClick={() => handleCopyPrevDay(tomorrow)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #6366F1", borderRadius: 8, color: "#6366F1", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📋 Copy Last Day → Tomorrow</button>
          <button onClick={handleDcSortAlpha}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: dcSort === "alpha" ? "#0EA5E9" : "transparent", border: `2px solid ${dcSort === "alpha" ? "#0EA5E9" : "#94A3B8"}`, borderRadius: 8, color: dcSort === "alpha" ? "#FFF" : "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 600, marginLeft: "auto" }}
          >{dcSort === "alpha" ? "✓ A→Z Sorted" : "A→Z Sort"}</button>
          <button onClick={async () => {
            try {
              const res = await fetch(`${API_BASE}/telegram/screenshot/agents`, { method: "POST", headers: authHeaders() });
              const data = await res.json();
              if (data.ok) alert("✅ Agents screenshot sent to Telegram!");
              else alert("❌ " + (data.error || "Failed to send screenshot"));
            } catch (e) { alert("❌ " + e.message); }
          }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "2px solid #10B981", borderRadius: 8, color: "#10B981", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >📸 Agents Screenshot</button>
        </div>

        {/* Summary cards — Today only */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Affiliate CAP Today", value: grandAff, accent: "#8B5CF6", bg: "#F5F3FF" },
            { label: "Brands CAP Today", value: grandBrands, accent: "#0EA5E9", bg: "#EFF6FF" },
            { label: "Active Agents", value: activeAgents, accent: "#10B981", bg: "#ECFDF5" },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.25s ease" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: c.accent }} />
              <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: c.accent }}>{c.value}</div>
            </div>
          ))}
        </div>

        {sortedDates.map(dateKey => {
          const items = grouped[dateKey];
          const sortedItems = dcSort === "alpha"
            ? [...items].sort((a, b) => (a.agent || "").localeCompare(b.agent || "", undefined, { numeric: true }))
            : items;
          const dayAff = sortedItems.reduce((s, d) => s + (parseInt(d.affiliates) || 0), 0);
          const dayBrands = sortedItems.reduce((s, d) => s + (parseInt(d.brands) || 0), 0);
          const dayTotal = dayAff + dayBrands;

          return (
            <GroupHeader key={dateKey} icon={I.calendar} title={fmtDate(dateKey)} count={sortedItems.length} total={dayTotal} accentColor="#8B5CF6" defaultOpen={true}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["Agent","Affiliates","Brands","Total","Actions"].map(h =>
                        <th key={h} style={{ padding: "12px 16px", textAlign: h === "Agent" ? "left" : "center", color: "#64748B", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #CBD5E1", whiteSpace: "nowrap" }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Find highest affiliate and brands cap for this day
                      const maxAff = Math.max(...sortedItems.map(d => parseInt(d.affiliates) || 0));
                      const maxBrands = Math.max(...sortedItems.map(d => parseInt(d.brands) || 0));
                      return sortedItems.map((d, rowIdx) => {
                      const t = (parseInt(d.affiliates) || 0) + (parseInt(d.brands) || 0);
                      const isTopAff = maxAff > 0 && (parseInt(d.affiliates) || 0) === maxAff;
                      const isTopBrands = maxBrands > 0 && (parseInt(d.brands) || 0) === maxBrands;
                      return (
                        <tr key={d.id} style={{ borderBottom: "1px solid #CBD5E1", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "12px 16px", borderRight: "1px solid #CBD5E1" }}>
                            <span onClick={() => { setEditEntry(d); setModalOpen(true); }} style={{ cursor: "pointer", color: "#0EA5E9", textDecoration: "underline", textDecorationColor: "rgba(14,165,233,0.3)", textUnderlineOffset: 3, fontWeight: 700, fontSize: 15 }}
                              onMouseEnter={e => e.currentTarget.style.textDecorationColor = "#0EA5E9"}
                              onMouseLeave={e => e.currentTarget.style.textDecorationColor = "rgba(14,165,233,0.3)"}
                            >{d.agent}</span>
                          </td>
                          <td style={{ padding: "0", borderRight: "1px solid #CBD5E1", position: "relative" }}>
                            <InlineCell value={d.affiliates} onSave={v => updateField(d.id, "affiliates", v)} type="number" style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 16, color: d.affiliates ? "#8B5CF6" : "#CBD5E1" }} />
                            {isTopAff && <span style={{ position: "absolute", top: 2, right: 4, fontSize: 12 }} title="Top Affiliate Cap">🔥</span>}
                          </td>
                          <td style={{ padding: "0", borderRight: "1px solid #CBD5E1", position: "relative" }}>
                            <InlineCell value={d.brands} onSave={v => updateField(d.id, "brands", v)} type="number" style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 16, color: d.brands ? "#0EA5E9" : "#CBD5E1" }} />
                            {isTopBrands && <span style={{ position: "absolute", top: 2, right: 4, fontSize: 12 }} title="Top Brand Cap">🔥</span>}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 16, color: "#0F172A", borderRight: "1px solid #CBD5E1" }}>{t || ""}</td>
                          <td style={{ padding: "8px 8px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                              {dcSort !== "alpha" && <>
                                <button onClick={() => handleDcMove(d.id, "up")} title="Move up" disabled={rowIdx === 0}
                                  style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: rowIdx === 0 ? "default" : "pointer", color: rowIdx === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▲</button>
                                <button onClick={() => handleDcMove(d.id, "down")} title="Move down" disabled={rowIdx === sortedItems.length - 1}
                                  style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: rowIdx === sortedItems.length - 1 ? "default" : "pointer", color: rowIdx === sortedItems.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▼</button>
                              </>}
                              <button onClick={() => { setEditEntry(d); setModalOpen(true); }} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                              <button onClick={() => handleDelete(d.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                    })()}
                  </tbody>
                </table>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "12px 16px", background: "#F8FAFC", borderTop: "2px solid #E2E8F0" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14 }}><span style={{ color: "#64748B" }}>Affiliates:</span> <span style={{ color: "#8B5CF6" }}>{dayAff}</span></span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14 }}><span style={{ color: "#64748B" }}>Brands:</span> <span style={{ color: "#0EA5E9" }}>{dayBrands}</span></span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 14 }}><span style={{ color: "#64748B" }}>Total:</span> {dayTotal}</span>
                </div>
              </div>
            </GroupHeader>
          );
        })}

        {sortedDates.length === 0 && <div style={{ padding: "60px 16px", textAlign: "center", color: "#94A3B8", fontSize: 15 }}>No entries yet. Click "New Agent" to add one.</div>}
      </main>

      {modalOpen && (
        <Modal title={editEntry ? "Edit Agent" : "New Agent"} onClose={() => { setModalOpen(false); setEditEntry(null); setNewDayDate(null); }}>
          <DCForm entry={editEntry} allEntries={entries} onSave={handleSave} onClose={() => { setModalOpen(false); setEditEntry(null); setNewDayDate(null); }} defaultDate={newDayDate} />
        </Modal>
      )}
    </div>
  );
}

/* ── Deals Page ── */
const DEALS_INITIAL = []; // REMOVED: hardcoded demo data caused production data loss

function DealsForm({ deal, allDeals, onSave, onClose, userName }) {
  const [f, setF] = useState(deal || { affiliate: "", country: "", price: "", crg: "", dealType: "CRG", funnels: "", source: "", deduction: "", date: new Date().toISOString().split("T")[0], openBy: userName || "" });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };

  // Duplicate detection: check if affiliate + country + funnels matches existing record
  const dupWarning = (() => {
    if (!f.affiliate || !f.country) return null;
    const matches = (allDeals || []).filter(d => {
      if (deal && d.id === deal.id) return false; // skip self when editing
      return (d.affiliate || "").trim().toLowerCase() === f.affiliate.trim().toLowerCase()
        && (d.country || "").trim().toLowerCase() === f.country.trim().toLowerCase();
    });
    if (matches.length > 0) {
      return `⚠ An offer for affiliate ${f.affiliate} + ${f.country} already exists (${matches.map(m => m.funnels || m.dealType || "").join(", ")})`;
    }
    return null;
  })();

  const handleSave = () => {
    if (!f.affiliate.trim()) { setError("Affiliate is required"); return; }
    if (!f.price) { setError("Price is required"); return; }
    onSave(f);
  };

  return (
    <>
      <div className="blitz-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Affiliate (number)">
          <input style={inp} value={f.affiliate} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); s("affiliate", v); }} placeholder="e.g. 17" maxLength={3} />
        </Field>
        <Field label="Country">
          <input style={inp} value={f.country} onChange={e => { const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4); s("country", v); }} placeholder="e.g. DE" maxLength={4} />
        </Field>
        <Field label="Price ($)">
          <input style={inp} type="number" value={f.price} onChange={e => s("price", e.target.value)} placeholder="e.g. 1800" />
        </Field>
        <Field label="CRG">
          <input style={inp} type="number" value={f.crg} onChange={e => s("crg", e.target.value)} placeholder="e.g. 15" />
        </Field>
        <Field label="Deal Type">
          <select style={{ ...inp, cursor: "pointer" }} value={f.dealType || "CRG"} onChange={e => s("dealType", e.target.value)}>
            <option value="CRG">CRG</option>
            <option value="CPA">CPA</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </Field>
        <Field label="Deduction">
          <input style={inp} value={f.deduction || ""} onChange={e => s("deduction", e.target.value)} placeholder="e.g. Upto 5% or leave empty" />
        </Field>
        <Field label="Funnels">
          <input style={inp} value={f.funnels || ""} onChange={e => s("funnels", e.target.value)} placeholder="e.g. Immediate mix, Quantum" />
        </Field>
        <Field label="Source">
          <input style={inp} value={f.source || ""} onChange={e => s("source", e.target.value)} placeholder="e.g. Google, Twitter" />
        </Field>
        <Field label="Date">
          <input style={inp} type="date" value={f.date || ""} onChange={e => s("date", e.target.value)} />
        </Field>
        <Field label="Open By">
          <NameCombo value={f.openBy || ""} onChange={v => s("openBy", v)} placeholder="e.g. Sophia" />
        </Field>
      </div>
      {dupWarning && <div style={{ color: "#B45309", fontSize: 13, padding: "8px 12px", background: "#FFFBEB", borderRadius: 8, marginBottom: 8, border: "1px solid #FDE68A", fontWeight: 600 }}>{dupWarning}</div>}
      {error && <div style={{ color: "#DC2626", fontSize: 13, padding: "8px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 8, marginBottom: 8, border: "1px solid rgba(220,38,38,0.2)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}>{deal ? "Save Changes" : "Add Deal"}</button>
      </div>
    </>
  );
}

function DealsPage({ user, onLogout, onNav, onAdmin, deals: rawDealsPage, setDeals, userAccess }) {
  const deals = Array.isArray(rawDealsPage) ? rawDealsPage : [];
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [inlineEdit, setInlineEdit] = useState(null); // { id, field } for inline editing
  const [selected, setSelected] = useState(new Set());

  const toggleSelect = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => setSelected(new Set());

  const handleColumnSort = col => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortCol(null); setSortDir("asc"); } // third click = clear sort
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const handleMove = (dealId, direction) => {
    setDeals(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(d => d.id === dealId);
      if (idx < 0) return prev;
      if (direction === "up" && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
      if (direction === "down" && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handleSave = form => {
    if (editDeal) {
      setDeals(prev => prev.map(d => d.id === editDeal.id ? { ...editDeal, ...form, updatedAt: Date.now() } : d));
    } else {
      setDeals(prev => [...prev, { ...form, id: genId(), updatedAt: Date.now(), createdAt: Date.now() }]);
    }
    setModalOpen(false);
    setEditDeal(null);
  };

  const handleDelete = id => { if (!confirm("Are you sure? This can't be undone.")) return; trackDelete('deals', id); setDeals(prev => prev.filter(d => d.id !== id)); };

  const handleDuplicate = deal => {
    const dup = { ...deal, id: genId(), updatedAt: Date.now(), createdAt: Date.now() };
    setDeals(prev => {
      const idx = prev.findIndex(d => d.id === deal.id);
      const arr = [...prev];
      arr.splice(idx + 1, 0, dup);
      return arr;
    });
  };

  const handleBulkDelete = (ids) => {
    ids.forEach(id => trackDelete('deals', id));
    setDeals(prev => prev.filter(d => !ids.includes(d.id)));
    clearSelection();
  };

  const handleBulkDuplicate = (ids) => {
    setDeals(prev => {
      const arr = [...prev];
      const newItems = [];
      ids.forEach(id => {
        const orig = arr.find(d => d.id === id);
        if (orig) newItems.push({ ...orig, id: genId(), updatedAt: Date.now(), createdAt: Date.now() });
      });
      return [...arr, ...newItems];
    });
    clearSelection();
  };

  const handleBulkArchive = (ids) => {
    setDeals(prev => prev.map(d => ids.includes(d.id) ? { ...d, archived: true, updatedAt: Date.now() } : d));
    clearSelection();
  };

  const handleInlineChange = (id, field, value) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, [field]: value, updatedAt: Date.now() } : d));
  };

  const matchSearch = d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.affiliate, d.country, d.funnels, d.source, d.dealType, d.deduction, d.openBy].some(v => (v || "").toLowerCase().includes(q));
  };

  const filtered = (deals || []).filter(matchSearch);
  const sorted = (() => {
    if (!sortCol) return filtered;
    const arr = [...filtered];
    const numCols = ["price", "crg", "affiliate"];
    const isNum = numCols.includes(sortCol);
    arr.sort((a, b) => {
      const va = a[sortCol] || "";
      const vb = b[sortCol] || "";
      let cmp;
      if (isNum) cmp = (parseFloat(va) || 0) - (parseFloat(vb) || 0);
      else cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  })();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="deals" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#10B981" />

      <main className="blitz-main" style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Offers</h1>
          <CurrencyBadges />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 600, marginLeft: 24 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{I.search}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search offers..."
                style={{ ...inp, paddingLeft: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14 }} />
            </div>
            {sortCol && <button onClick={() => { setSortCol(null); setSortDir("asc"); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "#10B981", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >↕ Sort: {sortCol} {sortDir === "asc" ? "↑" : "↓"} ✕</button>}
            <button onClick={() => { setEditDeal(null); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)", border: "none", borderRadius: 10, color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(16,185,129,0.3)", whiteSpace: "nowrap" }}
            >{I.plus} New Offer</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 28, maxWidth: 300 }}>
          <div style={{ background: "#ECFDF5", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#10B981" }} />
            <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Total Offers</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: "#10B981" }}>{filtered.length}</div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ padding: "12px 8px", width: 40, textAlign: "center", borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #CBD5E1" }}>
                    <input type="checkbox" checked={sorted.length > 0 && selected.size === sorted.length} onChange={() => setSelected(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(d => d.id)))}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#0EA5E9" }} />
                  </th>
                  {[
                    { key: "affiliate", label: "Affiliate ID" },
                    { key: "country", label: "Country" },
                    { key: "price", label: "Price" },
                    { key: "crg", label: "CRG" },
                    { key: "dealType", label: "Deal Type" },
                    { key: "deduction", label: "Deductions" },
                    { key: "funnels", label: "Funnels" },
                    { key: "source", label: "Source" },
                    { key: "date", label: "Date" },
                    { key: "openBy", label: "Open By" },
                    { key: null, label: "Actions" },
                  ].map(h =>
                    <th key={h.label} onClick={h.key ? () => handleColumnSort(h.key) : undefined}
                      style={{ padding: "12px 14px", textAlign: h.label === "Funnels" || h.label === "Source" ? "left" : "center", color: sortCol === h.key ? "#0F172A" : "#64748B", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #CBD5E1", whiteSpace: "nowrap", cursor: h.key ? "pointer" : "default", userSelect: "none", background: sortCol === h.key ? "#E2E8F0" : "transparent", transition: "background 0.15s" }}
                      onMouseEnter={e => { if (h.key) e.currentTarget.style.background = "#E2E8F0"; }}
                      onMouseLeave={e => { if (h.key) e.currentTarget.style.background = sortCol === h.key ? "#E2E8F0" : "transparent"; }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {h.label}
                        {h.key && sortCol === h.key && <span style={{ fontSize: 14, color: "#0EA5E9" }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        {h.key && sortCol !== h.key && <span style={{ fontSize: 10, color: "#CBD5E1", marginLeft: 2 }}>↕</span>}
                      </span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={12} style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No offers yet. Click "New Offer" to add one.</td></tr>
                )}
                {sorted.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #CBD5E1", transition: "background 0.15s", background: selected.has(d.id) ? "#EFF6FF" : "transparent" }}
                    onMouseEnter={e => { if (!selected.has(d.id)) e.currentTarget.style.background = "#F8FAFC"; }}
                    onMouseLeave={e => { if (!selected.has(d.id)) e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "12px 8px", textAlign: "center", borderRight: "1px solid #CBD5E1" }}>
                      <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)}
                        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#0EA5E9" }} />
                    </td>
                    {/* Client: affiliate + country */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, fontSize: 15, borderRight: "1px solid #CBD5E1" }}>
                      <span onClick={() => { setEditDeal(d); setModalOpen(true); }} style={{ cursor: "pointer", color: "#0EA5E9", textDecoration: "underline", textDecorationColor: "rgba(14,165,233,0.3)", textUnderlineOffset: 3 }}
                        onMouseEnter={e => e.currentTarget.style.textDecorationColor = "#0EA5E9"}
                        onMouseLeave={e => e.currentTarget.style.textDecorationColor = "rgba(14,165,233,0.3)"}
                      >{d.affiliate}</span>
                    </td>
                    {/* Country badge — click to edit */}
                    <td style={{ padding: "12px 14px", textAlign: "center", borderRight: "1px solid #CBD5E1" }}>
                      {inlineEdit && inlineEdit.id === d.id && inlineEdit.field === "country" ? (
                        <input autoFocus value={d.country || ""} onChange={e => handleInlineChange(d.id, "country", e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))}
                          onBlur={() => setInlineEdit(null)} onKeyDown={e => { if (e.key === "Enter" || e.key === "Tab") setInlineEdit(null); }}
                          style={{ ...inp, width: 50, textAlign: "center", fontSize: 13, fontWeight: 700, padding: "4px 6px" }} maxLength={2} />
                      ) : (
                        <span onClick={() => setInlineEdit({ id: d.id, field: "country" })} style={{ cursor: "pointer", background: "#EFF6FF", color: "#2563EB", padding: "3px 10px", borderRadius: 4, fontSize: 13, fontWeight: 700, display: "inline-block" }}
                          title="Click to edit">{d.country || "—"}</span>
                      )}
                    </td>
                    {/* Price — click to edit */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 15, color: "#0F172A", borderRight: "1px solid #CBD5E1" }}>
                      {inlineEdit && inlineEdit.id === d.id && inlineEdit.field === "price" ? (
                        <input autoFocus type="number" value={d.price || ""} onChange={e => handleInlineChange(d.id, "price", e.target.value)}
                          onBlur={() => setInlineEdit(null)} onKeyDown={e => { if (e.key === "Enter" || e.key === "Tab") setInlineEdit(null); }}
                          style={{ ...inp, width: 80, textAlign: "center", fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", padding: "4px 6px" }} />
                      ) : (
                        <span onClick={() => setInlineEdit({ id: d.id, field: "price" })} style={{ cursor: "pointer" }}
                          title="Click to edit">{d.price ? `${parseFloat(d.price).toLocaleString("en-US")}` : "—"}</span>
                      )}
                    </td>
                    {/* CRG — click to edit */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14, borderRight: "1px solid #CBD5E1" }}>
                      {inlineEdit && inlineEdit.id === d.id && inlineEdit.field === "crg" ? (
                        <input autoFocus type="number" value={d.crg || ""} onChange={e => handleInlineChange(d.id, "crg", e.target.value)}
                          onBlur={() => setInlineEdit(null)} onKeyDown={e => { if (e.key === "Enter" || e.key === "Tab") setInlineEdit(null); }}
                          style={{ ...inp, width: 60, textAlign: "center", fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", padding: "4px 6px" }} />
                      ) : (
                        <span onClick={() => setInlineEdit({ id: d.id, field: "crg" })} style={{ cursor: "pointer" }}
                          title="Click to edit">{d.crg || "—"}</span>
                      )}
                    </td>
                    {/* Deal Type */}
                    <td style={{ padding: "12px 14px", textAlign: "center", borderRight: "1px solid #CBD5E1" }}>
                      <span style={{ background: "#0EA5E9", color: "#FFF", padding: "4px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>{d.dealType || "CRG"}</span>
                    </td>
                    {/* Deductions */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 13, fontWeight: 600, borderRight: "1px solid #CBD5E1" }}>
                      {d.deduction ? <span style={{ background: "#FEF3C7", color: "#92400E", padding: "4px 12px", borderRadius: 4 }}>{d.deduction}</span> : <span style={{ color: "#CBD5E1" }}>Not specified</span>}
                    </td>
                    {/* Funnels */}
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#334155", borderRight: "1px solid #CBD5E1", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.funnels || ""}</td>
                    {/* Source */}
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#334155", borderRight: "1px solid #CBD5E1", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.source || ""}</td>
                    {/* Date */}
                    <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 12, color: "#64748B", borderRight: "1px solid #CBD5E1", whiteSpace: "nowrap" }}>
                      {d.date ? (() => { const dt = new Date(d.date + "T00:00:00"); return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`; })() : ""}
                    </td>
                    {/* Open By */}
                    <td style={{ padding: "12px 14px", textAlign: "center", borderRight: "1px solid #CBD5E1" }}>
                      {d.openBy ? <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: getPersonColor(d.openBy), color: "#FFF", fontWeight: 700, fontSize: 11 }}>{d.openBy}</span> : <span style={{ color: "#CBD5E1" }}>—</span>}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
                        {!sortCol && <>
                          <button onClick={() => handleMove(d.id, "up")} title="Move up" disabled={i === 0}
                            style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▲</button>
                          <button onClick={() => handleMove(d.id, "down")} title="Move down" disabled={i === sorted.length - 1}
                            style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 4px", cursor: i === sorted.length - 1 ? "default" : "pointer", color: i === sorted.length - 1 ? "#E2E8F0" : "#64748B", display: "flex", fontSize: 11 }}>▼</button>
                        </>}
                        <button onClick={() => handleDuplicate(d)} title="Duplicate" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: 5, cursor: "pointer", color: "#16A34A", display: "flex", fontSize: 12 }}>⧉</button>
                        <button onClick={() => { setEditDeal(d); setModalOpen(true); }} title="Edit" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: 5, cursor: "pointer", color: "#2563EB", display: "flex" }}>{I.edit}</button>
                        <button onClick={() => handleDelete(d.id)} title="Delete" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 5, cursor: "pointer", color: "#DC2626", display: "flex" }}>{I.trash}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "12px 20px", background: "#F8FAFC", borderTop: "2px solid #E2E8F0", flexWrap: "wrap" }}>
            <span style={{ padding: "5px 16px", borderRadius: 20, background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{filtered.length} offers</span>
          </div>
        </div>
      </main>

      <BulkActionBar count={selected.size}
        onDelete={() => { if (confirm(`Delete ${selected.size} selected offer(s)?`)) { handleBulkDelete([...selected]); } }}
        onDuplicate={() => { handleBulkDuplicate([...selected]); }}
        onArchive={() => { handleBulkArchive([...selected]); }}
        onClear={clearSelection}
      />

      {modalOpen && (
        <Modal title={editDeal ? "Edit Offer" : "New Offer"} onClose={() => { setModalOpen(false); setEditDeal(null); }}>
          <DealsForm deal={editDeal} allDeals={deals} onSave={handleSave} onClose={() => { setModalOpen(false); setEditDeal(null); }} userName={user.name} />
        </Modal>
      )}
    </div>
  );
}

/* ── App ── */

// Session management with token
// ═══════════════════════════════════════════════════════════════
// PARTNERS PAGE — Monthly Successful Partnerships
// ═══════════════════════════════════════════════════════════════
const PARTNER_TYPES = ["Brand", "Network", "Affiliate"];
const PARTNER_ACTIVITY = ["CPA", "CRG", "CPA + CRG"];
const PARTNER_STATUS_COLORS = {
  Brand: { background: "#6366F1", color: "#FFF" },
  Network: { background: "#0EA5E9", color: "#FFF" },
  Affiliate: { background: "#10B981", color: "#FFF" },
};
const PARTNER_ACT_COLORS = {
  CPA: { background: "#FEF3C7", color: "#92400E" },
  CRG: { background: "#ECFDF5", color: "#065F46" },
  "CPA + CRG": { background: "#EEF2FF", color: "#3730A3" },
};

function PartnerForm({ partner, onSave, onClose }) {
  const userName = getSession()?.name || "";
  const [f, setF] = useState(partner || {
    name: "", agent: "", type: "Brand", activity: "CRG", notes: "",
    date: new Date().toISOString().split("T")[0], openBy: userName
  });
  const [error, setError] = useState("");
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(""); };

  const handleSave = () => {
    if (!f.name.trim()) { setError("Partner name is required"); return; }
    if (!f.agent.trim()) { setError("Agent is required"); return; }
    onSave(f);
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Partner Name"><input style={inp} value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. Finzeratix" /></Field>
        <Field label="Agent (Hunter)"><NameCombo value={f.agent} onChange={v => s("agent", v)} /></Field>
        <Field label="Type">
          <select style={{ ...inp, cursor: "pointer" }} value={f.type} onChange={e => s("type", e.target.value)}>
            {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Financial Activity">
          <select style={{ ...inp, cursor: "pointer" }} value={f.activity} onChange={e => s("activity", e.target.value)}>
            {PARTNER_ACTIVITY.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Date"><input style={inp} type="date" value={f.date} onChange={e => s("date", e.target.value)} /></Field>
        <Field label="Notes"><input style={inp} value={f.notes || ""} onChange={e => s("notes", e.target.value)} placeholder="Optional notes" /></Field>
      </div>
      {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#FEF2F2", borderRadius: 8 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 10, background: "#F1F5F9", border: "none", color: "#64748B", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: "8px 24px", borderRadius: 10, background: "linear-gradient(135deg, #EC4899, #F472B6)", border: "none", color: "#FFF", cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 14px rgba(236,72,153,0.3)" }}>Save Partner</button>
      </div>
    </>
  );
}

function PartnersPage({ user, onLogout, onNav, onAdmin, partners: rawPartners, setPartners, userAccess }) {
  const partners = Array.isArray(rawPartners) ? rawPartners : [];
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPartner, setEditPartner] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [selected, setSelected] = useState(new Set());

  useDebouncedSave("partners", partners, 500, user.email);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const filtered = partners.filter(p => {
    const d = p.date || "";
    if (!d.startsWith(monthPrefix)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.name, p.agent, p.type, p.activity, p.notes, p.openBy].some(v => (v || "").toLowerCase().includes(q));
  });

  const handleSave = (data) => {
    if (editPartner) {
      setPartners(prev => prev.map(p => p.id === editPartner.id ? { ...editPartner, ...data, updatedAt: Date.now() } : p));
    } else {
      const newP = { ...data, id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2), createdAt: Date.now(), updatedAt: Date.now() };
      setPartners(prev => [...prev, newP]);
    }
    setModalOpen(false);
    setEditPartner(null);
  };

  const handleDelete = (id) => {
    setPartners(prev => prev.filter(p => p.id !== id));
    setDelConfirm(null);
  };

  const handleBulkDelete = (ids) => {
    setPartners(prev => prev.filter(p => !ids.includes(p.id)));
    setSelected(new Set());
  };

  // Monthly stats
  const agentMap = {};
  filtered.forEach(p => {
    const a = normalizeAgent((p.agent || "").trim());
    if (a) agentMap[a] = (agentMap[a] || 0) + 1;
  });
  const topAgents = Object.entries(agentMap).sort((a, b) => b[1] - a[1]);

  const typeMap = {};
  filtered.forEach(p => { const t = p.type || "?"; typeMap[t] = (typeMap[t] || 0) + 1; });

  const actMap = {};
  filtered.forEach(p => { const a = p.activity || "?"; actMap[a] = (actMap[a] || 0) + 1; });

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(filtered.map(p => p.id))); };

  const cardStyle = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF2FF 0%, #F5F7FF 40%, #FAFBFF 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <BlitzHeader user={user} activePage="partners" userAccess={userAccess} onNav={onNav} onAdmin={() => onNav("admin")} onLogout={onLogout} accentColor="#EC4899" />

      <main className="blitz-main" style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>
        {/* ═══ Header ═══ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>🤝 Partners</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Successful monthly partnerships</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CurrencyBadges />
            <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
              style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{I.chevL}</button>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#334155", minWidth: 120, textAlign: "center" }}>{MONTHS[month]} {year}</span>
            <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
              style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{I.chevR}</button>
            <div style={{ position: "relative", marginLeft: 8 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }}>{I.search}</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ ...inp, paddingLeft: 36, width: 180 }} />
            </div>
            <button onClick={() => { setEditPartner(null); setModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 12, background: "linear-gradient(135deg, #EC4899, #F472B6)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(236,72,153,0.3)" }}>
              {I.plus} New Partner
            </button>
          </div>
        </div>

        {/* ═══ Monthly Summary Cards ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
          <div style={{ ...cardStyle, borderTop: "3px solid #EC4899" }}>
            <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Total Partners</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#EC4899", fontFamily: "'JetBrains Mono',monospace" }}>{filtered.length}</div>
          </div>
          {PARTNER_TYPES.map(t => (
            <div key={t} style={{ ...cardStyle, borderTop: `3px solid ${PARTNER_STATUS_COLORS[t].background}` }}>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{t}s</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: PARTNER_STATUS_COLORS[t].background, fontFamily: "'JetBrains Mono',monospace" }}>{typeMap[t] || 0}</div>
            </div>
          ))}
          {PARTNER_ACTIVITY.map(a => (
            <div key={a} style={{ ...cardStyle, borderTop: `3px solid ${PARTNER_ACT_COLORS[a]?.background || "#E2E8F0"}` }}>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{a}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: PARTNER_ACT_COLORS[a]?.color || "#334155", fontFamily: "'JetBrains Mono',monospace" }}>{actMap[a] || 0}</div>
            </div>
          ))}
        </div>

        {/* ═══ Agent Leaderboard ═══ */}
        {topAgents.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 12 }}>🏆 Top Agents — Partnerships This Month</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {topAgents.map(([name, count], i) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: i === 0 ? "#FFFBEB" : "#F8FAFC", borderRadius: 10, border: `1px solid ${i === 0 ? "#FDE68A" : "#E2E8F0"}` }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? "#F59E0B" : "#64748B" }}>#{i + 1}</span>
                  <span style={{ display: "inline-block", padding: "3px 10px", background: getPersonColor(name), color: "#FFF", fontWeight: 700, fontSize: 12, borderRadius: 6 }}>{name}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", fontFamily: "'JetBrains Mono',monospace" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Table ═══ */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", width: 32 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} />
                  </th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Partner Name</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Agent</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Type</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Activity</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Date</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Notes</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No partners for {MONTHS[month]} {year}. Click "New Partner" to add one.</td></tr>
                )}
                {filtered.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #F1F5F9", background: selected.has(p.id) ? "#FDF2F8" : idx % 2 === 0 ? "#FFF" : "#FAFBFC" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => { const s = new Set(selected); s.has(p.id) ? s.delete(p.id) : s.add(p.id); setSelected(s); }} style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0F172A", fontSize: 14 }}>{p.name}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ display: "inline-block", padding: "3px 10px", background: getPersonColor(normalizeAgent(p.agent || "")), color: "#FFF", fontWeight: 700, fontSize: 12, borderRadius: 6 }}>{p.agent}</span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, ...(PARTNER_STATUS_COLORS[p.type] || { background: "#E2E8F0", color: "#334155" }) }}>{p.type}</span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, ...(PARTNER_ACT_COLORS[p.activity] || { background: "#F1F5F9", color: "#64748B" }) }}>{p.activity}</span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 13, color: "#64748B", fontFamily: "'JetBrains Mono',monospace" }}>{p.date}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748B", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.notes}>{p.notes || "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        <button onClick={() => { setEditPartner(p); setModalOpen(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#0EA5E9", padding: 4 }} title="Edit">{I.edit}</button>
                        <button onClick={() => setDelConfirm(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }} title="Delete">{I.trash}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #F1F5F9", background: "#FAFBFC" }}>
            <span style={{ padding: "5px 16px", borderRadius: 20, background: "#EC4899", color: "#FFF", fontWeight: 700, fontSize: 13 }}>{filtered.length} partners</span>
            {selected.size > 0 && (
              <button onClick={() => { if (confirm(`Delete ${selected.size} selected partner(s)?`)) handleBulkDelete([...selected]); }}
                style={{ padding: "6px 16px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Delete {selected.size} selected</button>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <Modal title={editPartner ? "Edit Partner" : "New Partner"} onClose={() => { setModalOpen(false); setEditPartner(null); }}>
          <PartnerForm partner={editPartner} onSave={handleSave} onClose={() => { setModalOpen(false); setEditPartner(null); }} />
        </Modal>
      )}

      {/* Delete confirmation */}
      {delConfirm && (
        <Modal title="Delete Partner" onClose={() => setDelConfirm(null)}>
          <p style={{ color: "#64748B", marginBottom: 20 }}>Are you sure you want to delete this partner?</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setDelConfirm(null)} style={{ padding: "8px 20px", borderRadius: 10, background: "#F1F5F9", border: "none", color: "#64748B", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => handleDelete(delConfirm)} style={{ padding: "8px 20px", borderRadius: 10, background: "#EF4444", border: "none", color: "#FFF", cursor: "pointer", fontWeight: 700 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function generateSessionToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function getSession() {
  try {
    const s = localStorage.getItem('blitz_session');
    if (!s) return null;
    const session = JSON.parse(s);
    // Session expires after 7 days
    if (Date.now() - session.loginTime > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('blitz_session');
      return null;
    }
    return session;
  } catch { return null; }
}

function saveSession(user) {
  const session = {
    email: user.email,
    name: user.name,
    pageAccess: user.pageAccess,
    token: getSessionToken() || generateSessionToken(), // Use server token if available
    loginTime: Date.now(),
  };
  localStorage.setItem('blitz_session', JSON.stringify(session));
  return session;
}

function clearSession() {
  // Notify server of logout
  const token = getSessionToken();
  if (token) {
    try { fetch(`${API_BASE}/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).catch(() => {}); } catch {}
  }
  setSessionToken(null);
  localStorage.removeItem('blitz_session');
}

function AppInner() {
  const [user, setUser] = useState(() => {
    const session = getSession();
    // Restore server session token on page reload
    if (session && session.token) setSessionToken(session.token);
    return session ? { email: session.email, name: session.name, pageAccess: session.pageAccess } : null;
  });
  const [users, setUsers] = useState(() => lsGet('users', null) || []);
  const [_payments, _setPayments] = useState(() => lsGet('payments', null) || []);
  const [_cpPayments, _setCpPayments] = useState(() => lsGet('customer-payments', null) || []);
  // Safe wrappers: NEVER allow state to become null/undefined (prevents crash on empty delete)
  const payments = Array.isArray(_payments) ? _payments : [];
  const cpPayments = Array.isArray(_cpPayments) ? _cpPayments : [];
  const setPayments = useCallback((v) => _setPayments(prev => { const a = Array.isArray(prev) ? prev : []; const n = typeof v === 'function' ? v(a) : v; return Array.isArray(n) ? n : a; }), []);
  const setCpPayments = useCallback((v) => _setCpPayments(prev => { const a = Array.isArray(prev) ? prev : []; const n = typeof v === 'function' ? v(a) : v; return Array.isArray(n) ? n : a; }), []);
  const [crgDeals, setCrgDeals] = useState(() => lsGet('crg-deals', null) || []);
  const [dcEntries, setDcEntries] = useState(() => lsGet('daily-cap', null) || []);
  const [dealsData, setDealsData] = useState(() => lsGet('deals', null) || []);
  const [walletsData, setWalletsData] = useState(() => lsGet('wallets', null) || []);
  const [partnersData, setPartnersData] = useState(() => lsGet('partners', null) || []);
  const [ftdEntries, setFtdEntries] = useState(() => lsGet('ftd-entries', null) || []);
  const [dailyCalcs, setDailyCalcs] = useState(() => lsGet('daily-calcs-data', null) || []);
  const [page, setPage] = useState("overview");
  const [loaded, setLoaded] = useState(false);

  // ── Keep TEAM_NAMES in sync with User Management ──
  useEffect(() => {
    if (users && users.length > 0) {
      const names = users.map(u => u.name).filter(Boolean);
      if (names.length > 0) TEAM_NAMES_REF.current = names;
    }
  }, [users]);
  const skipSave = useRef(true);
  const serverFetchDone = useRef(false); // CRITICAL: block saves until first server fetch completes

  // ═══════════════════════════════════════════════════════════════
  // SYNC ENGINE v3.26 — LOCAL-FIRST WITH ID-BASED MERGE
  // ═══════════════════════════════════════════════════════════════
  //
  // THE OLD BUG: Server has 50 records, localStorage has 80 (30 new offline edits).
  //   Old code did setCrgDeals(serverData) → 30 local records SILENTLY DELETED.
  //
  // THE FIX: Merge by record ID. Records only in local = NEW → KEEP.
  //   Records only on server = from other users → KEEP. Both = newest wins.
  //
  // GOLDEN RULE: NEVER replace local state with server data. ALWAYS merge.
  // ═══════════════════════════════════════════════════════════════

  function mergeByID(localArr, serverArr, tableName, mode) {
    // mode: 'init' = initial load (merge local into server), 'sync' = poll/WS (server is authority)
    // Server returned null = fetch failed, keep local
    if (serverArr === null || serverArr === undefined) return localArr || [];
    // v9.09 FIX: Don't blindly trust empty server response if local has data
    if (serverArr.length === 0 && Array.isArray(localArr) && localArr.length > 5) {
      console.warn(`⚠️ Server returned 0 records for ${tableName} but local has ${localArr.length}. Keeping local data and pushing to server.`);
      return localArr;
    }
    // v9.16: If server returns empty AND local is empty, check lastKnownCounts
    // This catches the case where deploy wiped both server data and localStorage
    if (serverArr.length === 0 && (!localArr || localArr.length === 0)) {
      const lastKnown = lastKnownCounts[tableName] || 0;
      if (lastKnown > 5) {
        console.error(`🔴 DATA LOSS [${tableName}]: server=0, local=0, but last known count was ${lastKnown}. Data may have been wiped during deploy.`);
        toast(`⚠️ ${tableName} appears empty — may need server backup restore`);
      }
      return [];
    }
    if (serverArr.length === 0) return [];
    if (!localArr || localArr.length === 0) return serverArr;

    // FIX: Respect locally deleted records — don't resurrect them from server data
    // v9.15: Also check persistDeletedIDs which survives clear cycles
    // v10.06: Also check tombstonedIDs — records permanently deleted on server
    const localDeletedSet = deletedIDs[tableName] || new Set();
    const persistDeleted = persistDeletedIDs[tableName] || new Set();
    const tombstoned = tombstonedIDs[tableName] || new Set();

    const merged = new Map();
    serverArr.forEach(r => {
      if (r && r.id && !localDeletedSet.has(r.id) && !persistDeleted.has(r.id) && !tombstoned.has(r.id)) merged.set(r.id, r);
    });
    let added = 0, updated = 0;
    localArr.forEach(r => {
      if (!r || !r.id) return;
      // v10.06: Skip tombstoned records from local data
      if (tombstoned.has(r.id) || localDeletedSet.has(r.id) || persistDeleted.has(r.id)) return;
      const srv = merged.get(r.id);
      if (!srv) {
        // Local record not on server
        if (mode === 'sync') {
          // During sync: server is authority — DON'T add old local records
          // Only add if it was created recently (within last 5 minutes = likely user just created it)
          const age = Date.now() - (r.createdAt || r.updatedAt || 0);
          if (age < 30 * 60 * 1000) { merged.set(r.id, r); added++; } // v11.02: extended from 5min to 30min
          // else: skip — this is a ghost record from stale localStorage
        } else {
          // During init: push local records to server (offline edits)
          merged.set(r.id, r); added++;
        }
      }
      else {
        const lt = r.updatedAt || r.lastModified || 0;
        const st = srv.updatedAt || srv.lastModified || 0;
        if (lt > st) { merged.set(r.id, r); updated++; }
      }
    });
    const result = Array.from(merged.values());
    if (added > 0 || updated > 0) console.log(`\u{1F500} MERGE [${tableName}] (${mode || 'init'}): server=${serverArr.length} +local_new=${added} +local_updated=${updated} = ${result.length}`);
    return result;
  }

  // Expose mergeByID for global conflict resolution + register all setters
  mergeByIDGlobal = mergeByID;
  registerConflictSetter('users', setUsers);
  registerConflictSetter('payments', setPayments);
  registerConflictSetter('customer-payments', setCpPayments);
  registerConflictSetter('crg-deals', setCrgDeals);
  registerConflictSetter('daily-cap', setDcEntries);
  registerConflictSetter('deals', setDealsData);
  registerConflictSetter('wallets', setWalletsData);
  registerConflictSetter('partners', setPartnersData);
  registerConflictSetter('ftd-entries', setFtdEntries);
  registerConflictSetter('daily-calcs-data', setDailyCalcs);

  useEffect(() => {
    (async () => {
      skipSave.current = true;

      // Step 0: Check server health
      try {
        const healthRes = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
        if (healthRes.ok) serverOnline = true;
      } catch { serverOnline = false; }

      const hasToken = !!getSessionToken();

      // Step 1: ALWAYS load localStorage FIRST (local-first — instant paint)
      const local = {
        users: lsGet('users', null), payments: lsGet('payments', null),
        'customer-payments': lsGet('customer-payments', null), 'crg-deals': lsGet('crg-deals', null),
        'daily-cap': lsGet('daily-cap', null), deals: lsGet('deals', null), wallets: lsGet('wallets', null),
        // v11.02 L1+L2: added missing tables so offline edits survive first load
        partners: lsGet('partners', null), 'ftd-entries': lsGet('ftd-entries', null), 'daily-calcs-data': lsGet('daily-calcs-data', null),
      };
      if (local.users && local.users.length > 0) setUsers(local.users);
      if (Array.isArray(local.payments)) setPayments(local.payments);
      if (Array.isArray(local['customer-payments'])) setCpPayments(local['customer-payments']);
      if (Array.isArray(local['crg-deals'])) setCrgDeals(local['crg-deals']);
      if (Array.isArray(local['daily-cap'])) setDcEntries(local['daily-cap']);
      if (Array.isArray(local.deals)) setDealsData(local.deals);
      if (Array.isArray(local.wallets)) setWalletsData(local.wallets);

      // Step 2: Fetch server data + MERGE (if online + authenticated)
      if (hasToken && serverOnline) {
        const [su, sp, scp, scrg, sdc, sdl, swl, sof, spt, sftd, sdcalc] = await Promise.all([
          apiGet('users'), apiGet('payments'), apiGet('customer-payments'),
          apiGet('crg-deals'), apiGet('daily-cap'), apiGet('deals'), apiGet('wallets'), apiGet('offers'), apiGet('partners'), apiGet('ftd-entries'), apiGet('daily-calcs-data'),
        ]);
        if (sessionExpiredFlag) {
          sessionExpiredFlag = false; setUser(null); skipSave.current = false; serverFetchDone.current = false; setLoaded(true); return;
        }
        const anySuccess = [su, sp, scp, scrg, sdc, sdl, swl, sof, spt, sftd].some(d => d !== null);
        if (!anySuccess && justLoggedIn) {
          console.log("\u26A0\uFE0F All fetches failed during login grace \u2014 using local data");
          setLoaded(true); serverFetchDone.current = true; setTimeout(() => { skipSave.current = false; }, 8000); return; // v9.05
        }

        if (anySuccess) {
          const pushTasks = [];

          // USERS — v10.16: Server is source of truth for pageAccess
          if (su !== null) {
            const serverMap = new Map((Array.isArray(su) ? su : []).map(u => [u.email, u]));
            const seedMap = new Map(INITIAL_USERS.map(x => [x.email, x]));
            INITIAL_USERS.forEach(seed => {
              if (!serverMap.has(seed.email)) serverMap.set(seed.email, seed);
            });
            const usersFinal = Array.from(serverMap.values()).map(u => {
              if (!u.passwordHash) { const seed = seedMap.get(u.email); if (seed) return { ...u, passwordHash: seed.passwordHash }; }
              return u;
            });
            setUsers(usersFinal);
            saveBaselines.current['users'] = JSON.stringify(usersFinal);
            // DON'T push users to server on load — server owns pageAccess
          }

          // DATA TABLES \u2014 merge by ID
          const tables = [
            { key: 'payments', srv: sp, setter: setPayments, ref: 'payments' },
            { key: 'customer-payments', srv: scp, setter: setCpPayments, ref: 'customer-payments' },
            { key: 'crg-deals', srv: scrg, setter: setCrgDeals, ref: 'crg-deals' },
            { key: 'daily-cap', srv: sdc, setter: setDcEntries, ref: 'daily-cap' },
            { key: 'deals', srv: sdl, setter: setDealsData, ref: 'deals' },
            { key: 'wallets', srv: swl, setter: setWalletsData, ref: 'wallets' },
            { key: 'partners', srv: spt, setter: setPartnersData, ref: 'partners' },
            { key: 'ftd-entries', srv: sftd, setter: setFtdEntries, ref: 'ftd-entries' },
            { key: 'daily-calcs-data', srv: sdcalc, setter: setDailyCalcs, ref: 'daily-calcs-data' },
          ];
          for (const t of tables) {
            if (t.srv !== null) {
              const merged = mergeByID(local[t.key], t.srv, t.key);
              t.setter(merged);
              lsSave(t.key, merged);
              lastKnownCounts[t.key] = merged.length; // Set baseline for data loss protection
              if (t.ref) {
                const mergedJson = JSON.stringify(merged);
                saveBaselines.current[t.ref] = mergedJson;
                if (lastSavedHash.current) lastSavedHash.current[t.ref] = mergedJson; // v10.28: seed server-sent hash
              }
              if (merged.length > t.srv.length) pushTasks.push(apiSave(t.key, merged, user?.email));
            } else if (local[t.key] && local[t.key].length > 0) {
              t.setter(local[t.key]);
              lastKnownCounts[t.key] = local[t.key].length; // Set baseline for data loss protection
              if (t.ref) t.ref.current = JSON.stringify(local[t.key]);
              pushTasks.push(apiSave(t.key, local[t.key], user?.email));
            }
            // NO FALLBACK — if both server and localStorage empty, state stays [] (safe)
          }

          // ── Merge Telegram offers into deals (single source of truth) ──
          if (sof !== null && Array.isArray(sof) && sof.length > 0) {
            setDealsData(prev => {
              const existing = new Map((prev || []).map(d => [d.id, d]));
              let added = 0;
              sof.forEach(o => { if (o && o.id && !existing.has(o.id) && !isDeleted('deals', o.id)) { existing.set(o.id, o); added++; } });
              if (added > 0) {
                const merged = Array.from(existing.values());
                console.log(`📋 Merged ${added} Telegram offers into deals (${prev.length} → ${merged.length})`);
                lsSave('deals', merged);
                saveBaselines.current['deals'] = JSON.stringify(merged);
                lastKnownCounts['deals'] = merged.length;
                return merged;
              }
              return prev;
            });
          }

          if (pushTasks.length > 0) await Promise.all(pushTasks);
        }
      }

      setLoaded(true);
      serverFetchDone.current = true;
      setTimeout(() => { skipSave.current = false; console.log('🔓 Save lock released — auto-save enabled'); }, 12000); // v9.09: 12s safety window (was 8s)
    })();
  }, [user]); // Re-run when user logs in

  // \u2500\u2500 WebSocket Real-Time Sync \u2014 MERGE, never replace \u2500\u2500
  useEffect(() => {
    if (!loaded || !getSessionToken()) return;
    connectWebSocket();
    const unsub = onWsUpdate((msg) => {
      if (msg.type !== 'update' || !msg.table || !Array.isArray(msg.data)) return;
      const setters = {
        users: setUsers, payments: setPayments, 'customer-payments': setCpPayments,
        'crg-deals': setCrgDeals, 'daily-cap': setDcEntries, deals: setDealsData, wallets: setWalletsData, 'ftd-entries': setFtdEntries
      };
      // If WS pushes offers update, merge into deals instead
      if (msg.table === 'offers') {
        const lsDeals = lsGet('deals', null) || [];
        const existing = new Map(lsDeals.map(d => [d.id, d]));
        let added = 0;
        msg.data.forEach(o => { if (o && o.id && !existing.has(o.id) && !isDeleted('deals', o.id)) { existing.set(o.id, o); added++; } });
        if (added > 0) {
          skipSave.current = true;
          const merged = filterTombstoned('deals', Array.from(existing.values())); // v11.02 C3: tombstone check
          lsSave('deals', merged);
          setDealsData(merged);
          setTimeout(() => { skipSave.current = false; }, 2000);
        }
        return;
      }
      const setter = setters[msg.table];
      if (setter) {
        const lsData = lsGet(msg.table, null) || [];
        const merged = mergeByID(lsData, msg.data, msg.table, 'sync');
        if (JSON.stringify(merged) !== JSON.stringify(lsData)) {
          skipSave.current = true;
          lsSave(msg.table, merged);
          setter(merged);
          setTimeout(() => { skipSave.current = false; }, 2000);
        }
      }
    });

    // Fallback polling every 15s \u2014 MERGE, never replace
    const poll = async () => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) return;
      if (!serverOnline) { try { const h = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) }); if (h.ok) { serverOnline = true; console.log("🔌 Server back online"); connectWebSocket(); } } catch {} }
      // v9.09: If server is online but WS isn't connected, keep trying
      if (serverOnline && (!wsConnection || wsConnection.readyState !== WebSocket.OPEN)) { connectWebSocket(); }
      if (!serverOnline) return;
      const [su, sp, scp, scrg, sdc, sdl, swl, sof, spt, sftd, sdcalc2] = await Promise.all([
        apiGet('users'), apiGet('payments'), apiGet('customer-payments'), apiGet('crg-deals'), apiGet('daily-cap'), apiGet('deals'), apiGet('wallets'), apiGet('offers'), apiGet('partners'), apiGet('ftd-entries'), apiGet('daily-calcs-data'),
      ]);
      skipSave.current = true;
      // v11.01: Handle users separately — server is ALWAYS source of truth for pageAccess
      if (su !== null && Array.isArray(su)) {
        const currentUsers = lsGet('users', null) || [];
        const currentMap = new Map(currentUsers.map(u => [u.email, u]));
        // Merge: server wins on pageAccess, preserve local passwordHash
        const pollMerged = su.map(srv => {
          const local = currentMap.get(srv.email);
          return {
            ...srv,
            // pageAccess: always use server value (admin edits land here)
            pageAccess: Array.isArray(srv.pageAccess) ? srv.pageAccess : (local?.pageAccess || []),
            // passwordHash: never sent by server, keep local copy
            passwordHash: local?.passwordHash || undefined,
          };
        });
        const currentStr = JSON.stringify(currentUsers.map(u => ({email:u.email,pageAccess:u.pageAccess})).sort((a,b)=>a.email.localeCompare(b.email)));
        const pollStr = JSON.stringify(pollMerged.map(u => ({email:u.email,pageAccess:u.pageAccess})).sort((a,b)=>a.email.localeCompare(b.email)));
        if (currentStr !== pollStr) {
          lsSave('users', pollMerged);
          setUsers(pollMerged);
        }
      }

      const all = [
        { d: sp, s: setPayments, k: 'payments' },
        { d: scp, s: setCpPayments, k: 'customer-payments' }, { d: scrg, s: setCrgDeals, k: 'crg-deals' },
        { d: sdc, s: setDcEntries, k: 'daily-cap' }, { d: sdl, s: setDealsData, k: 'deals' },
        { d: swl, s: setWalletsData, k: 'wallets' }, { d: spt, s: setPartnersData, k: 'partners' },
        { d: sftd, s: setFtdEntries, k: 'ftd-entries' },
        { d: sdcalc2, s: setDailyCalcs, k: 'daily-calcs-data' },
      ];
      let anyChanged = false;
      for (const t of all) {
        if (t.d !== null) {
          // Compare server data with localStorage BEFORE touching React state
          const lsData = lsGet(t.k, null) || [];
          const merged = mergeByID(lsData, t.d, t.k, 'sync');
          const lsStr = JSON.stringify(lsData);
          const mergedStr = JSON.stringify(merged);
          if (mergedStr !== lsStr) {
            lsSave(t.k, merged);
            t.s(merged); // Direct set, not functional update
            anyChanged = true;
          }
        }
      }
      // Merge Telegram offers into deals during poll
      if (sof !== null && Array.isArray(sof) && sof.length > 0) {
        const lsDeals = lsGet('deals', null) || [];
        const existing = new Map(lsDeals.map(d => [d.id, d]));
        let added = 0;
        sof.forEach(o => { if (o && o.id && !existing.has(o.id) && !isDeleted('deals', o.id)) { existing.set(o.id, o); added++; } });
        if (added > 0) {
          const merged = filterTombstoned('deals', Array.from(existing.values())); // v11.02 C4: tombstone check
          lsSave('deals', merged);
          setDealsData(merged);
          anyChanged = true;
        }
      }
      setTimeout(() => { skipSave.current = false; }, 2000);
    };
    const interval = setInterval(poll, 30000); // v8: 30s poll (was 15s)
    const reconnectFlush = setInterval(() => { if (serverOnline && pendingSaves.size > 0) flushPendingSaves(); }, 10000);
    return () => { clearInterval(interval); clearInterval(reconnectFlush); unsub(); };
  }, [loaded]);

  // ── Unified debounced auto-save (v10.28) ──
  // Single system: debounce 3s (matches server throttle), skip if unchanged from baseline, block during init
  // v10.28 FIX: lastSavedHash tracks the exact JSON that was last successfully sent to the server.
  // This prevents the autosave loop where the baseline drifted out of sync with the server state,
  // causing zero-change saves to fire repeatedly (287 saves/day observed in diagnostics).
  const saveBaselines = useRef({});
  const saveTimers = useRef({});
  const lastSavedHash = useRef({}); // v10.28: tracks what was ACTUALLY sent to server

  // v11.01: Track the last updatedAt seen in users — only push users to server when admin made a real edit
  const lastUsersUpdatedAt = useRef(0);

  const debouncedSave = (table, data) => {
    if (!serverFetchDone.current || !loaded || skipSave.current) return;
    if (!Array.isArray(data)) return;
    // v11.01: For users table, only push if an admin edit happened (updatedAt changed)
    // This prevents the polling merge from triggering a redundant users save that could overwrite pageAccess
    if (table === 'users') {
      const maxUpdatedAt = data.reduce((m, u) => Math.max(m, u.updatedAt || 0), 0); // v11.02 H5: avoid spread stack overflow
      if (maxUpdatedAt <= lastUsersUpdatedAt.current) return; // No admin edit since last save
      lastUsersUpdatedAt.current = maxUpdatedAt;
    }
    const json = JSON.stringify(data);
    // v10.28: Skip if identical to what we LAST SENT to server (not just baseline)
    if (json === (lastSavedHash.current[table] || null)) return;
    // Also skip if identical to baseline (unchanged since last load/merge)
    if (json === (saveBaselines.current[table] || '[]')) return;
    lsSave(table, data);
    if (saveTimers.current[table]) clearTimeout(saveTimers.current[table]);
    saveTimers.current[table] = setTimeout(async () => {
      if (skipSave.current) return;
      const currentJson = JSON.stringify(data);
      // v10.28: Double-check against both baseline AND last server-sent hash
      if (currentJson === (saveBaselines.current[table] || '[]')) return;
      if (currentJson === (lastSavedHash.current[table] || null)) return;
      saveBaselines.current[table] = currentJson;
      lastSavedHash.current[table] = currentJson; // v10.28: record what we're sending
      const ok = await apiSave(table, data, user?.email);
      // v10.28: If server returned unchanged (throttled/no-op), update baseline to prevent re-fire
      if (ok) saveBaselines.current[table] = currentJson;
    }, 3000); // v10.05: 3s (was 2s) to match server-side throttle
  };

  useEffect(() => { debouncedSave('users', users); }, [users]);
  useEffect(() => { debouncedSave('payments', _payments); }, [_payments]);
  useEffect(() => { debouncedSave('customer-payments', _cpPayments); }, [_cpPayments]);
  useEffect(() => { debouncedSave('crg-deals', crgDeals); }, [crgDeals]);
  useEffect(() => { debouncedSave('daily-cap', dcEntries); }, [dcEntries]);
  useEffect(() => { debouncedSave('deals', dealsData); }, [dealsData]);
  useEffect(() => { debouncedSave('wallets', walletsData); }, [walletsData]);
  useEffect(() => { debouncedSave('partners', partnersData); }, [partnersData]);
  useEffect(() => { debouncedSave('ftd-entries', ftdEntries); }, [ftdEntries]);
  useEffect(() => { debouncedSave('daily-calcs-data', dailyCalcs); }, [dailyCalcs]);

  const handleLogout = () => { clearSession(); setUser(null); setPage("overview"); };

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #080B14 0%, #0C1021 40%, #111729 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <style>{globalTableCSS}{mobileCSS}{darkModeCSS}</style>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <div style={{ textAlign: "center", animation: "fadeUp 0.5s ease" }}>
        {I.logo}
        <div style={{ fontSize: 24, fontWeight: 800, color: "#F1F5F9", marginBottom: 8, marginTop: 16, fontFamily: "'JetBrains Mono',monospace" }}>Blitz CRM</div>
        <div style={{ color: "#64748B", fontSize: 14 }}>Initializing v{VERSION}...</div>
        <div style={{ width: 120, height: 2, background: "rgba(56,189,248,0.15)", borderRadius: 2, margin: "20px auto 0", overflow: "hidden", position: "relative" }}>
          <div style={{ width: "40%", height: "100%", background: "linear-gradient(90deg, transparent, #38BDF8, transparent)", borderRadius: 2, animation: "shimmer 1.5s ease infinite", backgroundSize: "200% 100%" }} />
        </div>
      </div>
    </div>
  );

  if (!user) return (<><LoginScreen onLogin={u => { justLoggedIn = true; saveSession(u); setUser(u); setTimeout(() => { justLoggedIn = false; }, 10000); }} users={users} /></>);

  const userAccess = getPageAccess(user);
  const canAccess = pg => userAccess.includes(pg);
  const firstPage = userAccess[0] || "overview";

  // Redirect to first allowed page if current page is blocked
  if (page !== "admin" && !canAccess(page)) {
    setPage(firstPage);
    return null;
  }

  if (page === "admin" && isAdmin(user.email)) return (<><AdminPanel users={users} setUsers={setUsers} wallets={walletsData} setWallets={setWalletsData} onBack={() => setPage(firstPage)} user={user} /></>);
  if (page === "payments" && canAccess("payments")) return (<><Dashboard user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} payments={payments} setPayments={setPayments} userAccess={userAccess} /></>);
  if (page === "customers" && canAccess("customers")) return (<><CustomerPayments user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} payments={cpPayments} setPayments={setCpPayments} userAccess={userAccess} /></>);
  if (page === "crg" && canAccess("crg")) return (<><CRGDeals user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} deals={crgDeals} setDeals={setCrgDeals} userAccess={userAccess} /></>);
  if (page === "dailycap" && canAccess("dailycap")) return (<><DailyCap user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} entries={dcEntries} setEntries={setDcEntries} crgDeals={crgDeals} userAccess={userAccess} /></>);
  if (page === "deals" && canAccess("deals")) return (<><DealsPage user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} deals={dealsData} setDeals={setDealsData} userAccess={userAccess} /></>);
  if (page === "partners" && canAccess("partners")) return (<><PartnersPage user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} partners={partnersData} setPartners={setPartnersData} userAccess={userAccess} /></>);
  if (page === "monthlystats" && canAccess("monthlystats")) return (<><MonthlyStatsPage user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} crgDeals={crgDeals} dcEntries={dcEntries} cpPayments={cpPayments} payments={payments} dealsData={dealsData} partnersData={partnersData} userAccess={userAccess} /></>);
  if (page === "ftdsinfo" && canAccess("ftdsinfo")) return (<><FtdsInfoPage user={user} onLogout={handleLogout} onNav={setPage} onAdmin={() => setPage("admin")} ftdEntries={ftdEntries} setFtdEntries={setFtdEntries} userAccess={userAccess} /></>);
  if (page === "dailycalcs" && canAccess("dailycalcs")) return (<><DailyCalcsPage user={user} onLogout={handleLogout} onNav={setPage} calcs={dailyCalcs} setCalcs={setDailyCalcs} payments={payments} setPayments={setPayments} cpPayments={cpPayments} setCpPayments={setCpPayments} userAccess={userAccess} /></>);
  if (page === "settings") return (<><SettingsPage user={user} onLogout={handleLogout} onNav={setPage} userAccess={userAccess} /></>);
  return (<><OverviewDashboard user={user} onLogout={handleLogout} onNav={setPage} payments={payments} crgDeals={crgDeals} dcEntries={dcEntries} cpPayments={cpPayments} dealsData={dealsData} partnersData={partnersData} userAccess={userAccess} /></>);
}

// ── Error Boundary — prevents white screen crashes ──
class CrashGuard extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("🔴 CrashGuard caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const info = this.state.errorInfo;
      const stack = err?.stack || "";
      const componentStack = info?.componentStack || "";
      return React.createElement("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F172A", fontFamily: "monospace", color: "#E2E8F0", padding: 20 } },
        React.createElement("div", { style: { maxWidth: 700, width: "100%" } },
          React.createElement("h1", { style: { color: "#EF4444", fontSize: 24, marginBottom: 8 } }, "⚠️ Blitz CRM Crash Report"),
          React.createElement("p", { style: { color: "#94A3B8", fontSize: 14, marginBottom: 20 } }, `v${VERSION} — Copy this info and send it for debugging:`),
          React.createElement("div", { style: { background: "#1E293B", border: "1px solid #334155", borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 300, overflow: "auto" } },
            "Error: " + String(err?.message || err) + "\n\n" +
            "Stack:\n" + stack.split("\n").slice(0, 8).join("\n") + "\n\n" +
            "Component:\n" + componentStack.split("\n").slice(0, 10).join("\n")
          ),
          React.createElement("div", { style: { display: "flex", gap: 12 } },
            React.createElement("button", {
              onClick: () => { try { navigator.clipboard.writeText("Error: " + String(err?.message || err) + "\nStack: " + stack + "\nComponent: " + componentStack); } catch(e) {} },
              style: { padding: "10px 24px", borderRadius: 8, background: "#6366F1", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }
            }, "📋 Copy Error"),
            React.createElement("button", {
              onClick: () => this.setState({ hasError: false, error: null, errorInfo: null }),
              style: { padding: "10px 24px", borderRadius: 8, background: "#0EA5E9", border: "none", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }
            }, "🔄 Try Again"),
            React.createElement("button", {
              onClick: () => window.location.reload(),
              style: { padding: "10px 24px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94A3B8", cursor: "pointer", fontSize: 14 }
            }, "Reload Page")
          )
        )
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [dark, setDark] = useState(() => { const stored = localStorage.getItem('blitz_dark'); return stored === null ? true : stored === 'true'; });
  const toggle = () => setDark(prev => { const n = !prev; localStorage.setItem('blitz_dark', n); return n; });

  return (
    React.createElement(CrashGuard, null,
      React.createElement(ThemeContext.Provider, { value: { dark, toggle } },
        React.createElement(ToastProvider, null,
          React.createElement("div", { className: dark ? "dark-mode" : "" },
            React.createElement(AppInner, null)
          )
        )
      )
    )
  );
}
