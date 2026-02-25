import { useState, useEffect, useRef, createContext, useContext } from "react";

// ===================== STORAGE (Google Sheets backend) =====================
const GAS_URL = "https://script.google.com/macros/s/AKfycbwuVnf-OA_Eed4jOrFIXbBqYysAEuYcaBD8RvDjP_xSXumn4Qd9aW1LKY9po1xWqK58/exec";

// Local cache so the UI stays fast
const _cache = {};

const storage = {
  get: async (key) => {
    if (_cache[key] !== undefined) return _cache[key];
    try {
      const res = await fetch(`${GAS_URL}?action=get&key=${encodeURIComponent(key)}`);
      const json = await res.json();
      const value = json.value ? JSON.parse(json.value) : null;
      _cache[key] = value;
      return value;
    } catch {
      // Fallback to localStorage if offline
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
    }
  },
  set: async (key, val) => {
    _cache[key] = val;
    // Write to localStorage immediately (instant)
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    // Write to Google Sheets in background
    try {
      await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "set", key, value: JSON.stringify(val) }),
      });
    } catch {}
  },
};

// ===================== THEME =====================
const ThemeCtx = createContext({});
const useTheme = () => useContext(ThemeCtx);

function makeTheme(isDark) {
  return isDark ? {
    bg:"#0e0e0e",bg2:"#111",bg3:"#1a1a1a",bg4:"#222",
    border:"#1e1e1e",border2:"#2a2a2a",
    text:"#e0e0e0",text2:"#ccc",text3:"#888",text4:"#555",text5:"#333",
    accent:"#c9a96e",accentHover:"#dbb97e",accentText:"#0e0e0e",
    inputBg:"#0e0e0e",inputColor:"#e0e0e0",
    weekendRow:"#1a1a2a",totalRow:"#161616",
    calToday:"#1a1508",calTodayBorder:"#c9a96e55",calEvent:"#1e2a1e",calEventText:"#4ade80",
    overlay:"rgba(0,0,0,0.7)",authBg:"linear-gradient(135deg,#0e0e0e,#1a1508)",
    greenBg:"#1a3a2a",redBg:"#3a1a1a",amberBg:"#3a2a1a",blueBg:"#1a1a3a",
    green:"#4ade80",red:"#f87171",amber:"#f59e0b",yellow:"#facc15",blue:"#60a5fa",
    spinnerBorder:"#2a2a2a",isDark:true,
  } : {
    bg:"#f5f4f0",bg2:"#fff",bg3:"#f0eeea",bg4:"#e8e6e0",
    border:"#e0ddd6",border2:"#ccc9c0",
    text:"#1a1a1a",text2:"#333",text3:"#666",text4:"#999",text5:"#ddd",
    accent:"#b8894a",accentHover:"#a07840",accentText:"#fff",
    inputBg:"#f9f8f5",inputColor:"#1a1a1a",
    weekendRow:"#f0eeff",totalRow:"#f0eeea",
    calToday:"#fdf6ec",calTodayBorder:"#b8894a55",calEvent:"#e8f5e9",calEventText:"#2e7d32",
    overlay:"rgba(0,0,0,0.4)",authBg:"linear-gradient(135deg,#f5f4f0,#fdf6ec)",
    greenBg:"#e8f5e9",redBg:"#fdecea",amberBg:"#fef9ec",blueBg:"#e8f0fe",
    green:"#2e7d32",red:"#c62828",amber:"#e65100",yellow:"#f57f17",blue:"#1565c0",
    spinnerBorder:"#e0ddd6",isDark:false,
  };
}

// ===================== CONSTANTS =====================
const APP = "gNt Hotel Manager";
const DEFAULT_ADMIN = { id:"1", username:"admin", password:"admin123", role:"admin", name:"Amministratore" };
const ROLES = ["admin","governante","cameriere","fornitore"];
const ROLE_LABELS = { admin:"Admin", governante:"Governante", cameriere:"Cameriere", fornitore:"Fornitore" };
const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTHS_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const CONTRACT_TYPES = ["Tempo indeterminato","Tempo determinato","Part-time","Stagionale","Collaborazione"];
const PRIO_COLORS = (t) => ({ urgente:t.red, normale:t.amber, bassa:t.text3 });
const NAV = [
  {id:"dashboard",icon:"👥",label:"Lavoratori"},
  {id:"ore",icon:"⏱",label:"Ore Lavorate"},
  {id:"presenze",icon:"📋",label:"Presenze"},
  {id:"ordini",icon:"🛒",label:"Ordini"},
  {id:"manutenzioni",icon:"🔧",label:"Manutenzioni"},
  {id:"calendario",icon:"📅",label:"Calendario"},
];

function getDaysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
function getDayName(y,m,d) { return ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"][new Date(y,m,d).getDay()]; }
function displayName(w) { return w?.nickname || w?.name || ""; }

// ===================== SHARED COMPONENTS =====================
function Inp({ style={}, textarea=false, ...props }) {
  const t = useTheme();
  const base = { width:"100%", padding:"0.55rem 0.75rem", background:t.inputBg, border:`1px solid ${t.border2}`, borderRadius:"0.45rem", color:t.inputColor, fontSize:"0.875rem", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", ...style };
  return textarea ? <textarea {...props} style={{...base,resize:"vertical"}}/> : <input {...props} style={base}/>;
}
function Sel({ style={}, children, ...props }) {
  const t = useTheme();
  return <select {...props} style={{ width:"100%", padding:"0.55rem 0.75rem", background:t.inputBg, border:`1px solid ${t.border2}`, borderRadius:"0.45rem", color:t.inputColor, fontSize:"0.875rem", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box", ...style }}>{children}</select>;
}
function SmSel({ style={}, children, ...props }) {
  const t = useTheme();
  return <select {...props} style={{ padding:"0.35rem 0.6rem", background:t.inputBg, border:`1px solid ${t.border2}`, borderRadius:"0.35rem", color:t.inputColor, fontSize:"0.8rem", fontFamily:"'DM Sans',sans-serif", ...style }}>{children}</select>;
}
function Lbl({ children }) {
  const t = useTheme();
  return <label style={{ display:"block", color:t.text3, fontSize:"0.72rem", marginBottom:"0.22rem", fontWeight:600 }}>{children}</label>;
}
function Btn({ onClick, children, variant="primary", style={} }) {
  const t = useTheme();
  const base = { padding:"0.5rem 1rem", border:"none", borderRadius:"0.45rem", fontWeight:700, fontSize:"0.8rem", cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif", transition:"opacity 0.15s", ...style };
  return variant==="primary"
    ? <button onClick={onClick} style={{...base, background:t.accent, color:t.accentText}}>{children}</button>
    : <button onClick={onClick} style={{...base, background:"none", border:`1px solid ${t.border2}`, color:t.text3}}>{children}</button>;
}
// Reliable icon button — always stopPropagation, always type=button
function IconBtn({ onClick, icon, color, title="" }) {
  const t = useTheme();
  const c = color || t.text3;
  return (
    <button
      type="button"
      title={title}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      style={{ background:"none", border:`1px solid ${c}44`, borderRadius:"0.35rem", cursor:"pointer", color:c, fontSize:"1rem", padding:"0.22rem 0.45rem", display:"inline-flex", alignItems:"center", justifyContent:"center", lineHeight:1, flexShrink:0 }}
    >{icon}</button>
  );
}
function Card({ children, style={} }) {
  const t = useTheme();
  return <div style={{ background:t.bg2, border:`1px solid ${t.border}`, borderRadius:"0.75rem", padding:"1.1rem", marginBottom:"1rem", ...style }}>{children}</div>;
}
function PageHeader({ title, children }) {
  const t = useTheme();
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.5rem" }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:t.accent, fontSize:"1.3rem", margin:0 }}>{title}</h2>
      <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>{children}</div>
    </div>
  );
}
function Empty({ msg }) {
  const t = useTheme(); return <div style={{ textAlign:"center", color:t.text4, padding:"2.5rem", fontSize:"0.9rem" }}>{msg}</div>;
}
function FGrid({ children, cols=2 }) {
  return <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fit,minmax(${cols===1?"100%":"12rem"},1fr))`, gap:"0.65rem" }}>{children}</div>;
}
function FilterBtns({ options, value, onChange }) {
  const t = useTheme();
  return (
    <div style={{ display:"flex", gap:"0.4rem", margin:"0.75rem 0", flexWrap:"wrap" }}>
      {options.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          style={{ padding:"0.3rem 0.8rem", background:"none", border:`1px solid ${value===o.v?t.accent:t.border2}`, borderRadius:"1.25rem", color:value===o.v?t.accent:t.text3, fontSize:"0.78rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
function Tag({ children, bg, color }) {
  return <span style={{ padding:"0.12rem 0.5rem", borderRadius:"1rem", fontSize:"0.66rem", fontWeight:600, background:bg, color }}>{children}</span>;
}
// Confirm dialog helper
async function confirmDel(msg="Eliminare?") { return window.confirm(msg); }

// ===================== MODAL =====================
function Modal({ title, onClose, children, wide=false }) {
  const t = useTheme();
  return (
    <div style={{ position:"fixed", inset:0, background:t.overlay, zIndex:1500, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
      onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:t.bg2, border:`1px solid ${t.border2}`, borderRadius:"1rem", width:"100%", maxWidth:wide?"58rem":"36rem", maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.9rem 1.2rem", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
          <span style={{ color:t.accent, fontWeight:700, fontFamily:"'Playfair Display',serif", fontSize:"1rem" }}>{title}</span>
          <button type="button" onClick={onClose} style={{ background:"none", border:"none", color:t.text3, fontSize:"1.2rem", cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:"1.1rem 1.2rem", overflowY:"auto" }}>{children}</div>
      </div>
    </div>
  );
}

// ===================== PRINT PREVIEW =====================
function PrintPreview({ htmlContent, title, onClose }) {
  const t = useTheme();
  const iframeRef = useRef(null);
  const doPrint = () => { iframeRef.current?.contentWindow?.focus(); iframeRef.current?.contentWindow?.print(); };
  return (
    <div style={{ position:"fixed", inset:0, background:t.overlay, zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div style={{ background:t.bg2, border:`1px solid ${t.border2}`, borderRadius:"1rem", width:"100%", maxWidth:"58rem", maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.9rem 1.2rem", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
          <span style={{ color:t.accent, fontWeight:700, fontFamily:"'Playfair Display',serif", fontSize:"1rem" }}>📄 Anteprima — {title}</span>
          <div style={{ display:"flex", gap:"0.5rem" }}>
            <button type="button" onClick={doPrint} style={{ padding:"0.45rem 1rem", background:t.accent, border:"none", borderRadius:"0.45rem", color:t.accentText, fontWeight:700, fontSize:"0.8rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>🖨 Stampa / PDF</button>
            <button type="button" onClick={onClose} style={{ padding:"0.45rem 0.75rem", background:"none", border:`1px solid ${t.border2}`, borderRadius:"0.45rem", color:t.text3, cursor:"pointer", fontSize:"0.8rem" }}>✕</button>
          </div>
        </div>
        <div style={{ flex:1, background:"#bbb", borderRadius:"0 0 1rem 1rem", overflow:"hidden", minHeight:0 }}>
          <iframe ref={iframeRef} srcDoc={htmlContent} style={{ width:"100%", height:"100%", border:"none", minHeight:"520px", display:"block" }} title="Anteprima"/>
        </div>
      </div>
    </div>
  );
}

function buildOrePrintHTML(md, year, month) {
  if (!md) return "";
  const totals = md.workers.map((_,wi) => {
    let h=0,r=0; md.days.forEach(d=>{const v=d.values[wi];if(v==="R")r++;else if(v&&!isNaN(+v))h+=+v;}); return {h:h.toFixed(1),r};
  });
  const hdrs = md.workers.map(w=>`<th>${displayName(w)}</th>`).join("");
  const rows = md.days.map(d=>{
    const dn=getDayName(year,month,d.day),we=dn==="Dom"||dn==="Sab";
    const cells=d.values.map(v=>`<td style="text-align:center;color:${v==="R"?"#c00":v==="M"?"#b8860b":v?"#1a6a1a":"#aaa"};font-weight:${v?700:400}">${v||"·"}</td>`).join("");
    return `<tr style="background:${we?"#f0f0f8":"#fff"}"><td style="width:2rem;font-weight:600">${d.day}</td><td style="width:2.5rem;color:#777;font-size:11px">${dn}</td>${cells}</tr>`;
  }).join("");
  const tots = totals.map(t=>`<td style="text-align:center;font-weight:700;color:#8b6914">${t.h}h/${t.r}R</td>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a1a}h1{font-family:Georgia,serif;color:#8b6914;font-size:18px;margin:0 0 4px}p{color:#888;font-size:12px;margin:0 0 14px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e0d8c8;padding:4px 7px}thead th{background:#f5f0e8;text-align:center;border-bottom:2px solid #c9a96e}@media print{body{padding:10px}}</style></head><body><h1>⏱ Ore Lavorate — ${APP}</h1><p>${MONTHS[month]} ${year}</p><table><thead><tr><th style="width:2rem">G</th><th style="width:2.5rem">Gg</th>${hdrs}</tr></thead><tbody>${rows}<tr style="background:#f5f0e8"><td colspan="2" style="font-weight:700;color:#8b6914;padding:5px 8px">TOTALE</td>${tots}</tr></tbody></table></body></html>`;
}
function buildPresenzePrintHTML(data, year, month) {
  if (!data) return "";
  const hdrs = data.workers.map(w=>`<th>${displayName(w)}</th>`).join("");
  const rows = data.days.map(d=>{
    const dn=getDayName(year,month,d.day),we=dn==="Dom"||dn==="Sab";
    const cells=d.values.map(v=>`<td style="text-align:center;color:${v==="R"?"#c00":v==="X"?"#1a6a1a":"#bbb"};font-weight:${v?700:400}">${v||""}</td>`).join("");
    return `<tr style="background:${we?"#f0f0f8":"#fff"}"><td style="width:2rem;font-weight:600">${d.day}</td><td style="width:2.5rem;color:#777;font-size:11px">${dn}</td>${cells}</tr>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a1a}h1{font-family:Georgia,serif;color:#8b6914;font-size:18px;margin:0 0 4px}p{color:#888;font-size:12px;margin:0 0 14px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e0d8c8;padding:4px 7px}thead th{background:#f5f0e8;text-align:center;border-bottom:2px solid #c9a96e}@media print{body{padding:10px}}</style></head><body><h1>📋 Previsione Presenze — ${APP}</h1><p>${MONTHS[month]} ${year}</p><table><thead><tr><th style="width:2rem">G</th><th style="width:2.5rem">Gg</th>${hdrs}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

// ===================== APP ROOT =====================
export default function App() {
  const [users, setUsers] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authView, setAuthView] = useState("login");
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [uiScale, setUiScale] = useState(2); // 1=small,2=normal,3=large,4=xl
  const [settingsOpen, setSettingsOpen] = useState(false);

  const t = makeTheme(isDark);

  useEffect(() => {
    const sizes = {1:"12px",2:"14px",3:"16px",4:"19px"};
    document.documentElement.style.fontSize = sizes[uiScale]||"14px";
    document.body.style.background = t.bg;
  }, [isDark, uiScale, t.bg]);

  useEffect(() => {
    (async () => {
      let u = await storage.get("users");
      if (!u||!u.length) { u=[DEFAULT_ADMIN]; await storage.set("users",u); }
      setUsers(u);
      const cu = await storage.get("currentUser"); if (cu) setCurrentUser(cu);
      const prefs = await storage.get("uiPrefs"); if (prefs) { setIsDark(prefs.isDark??true); setUiScale(prefs.uiScale??2); }
      setLoading(false);
    })();
  }, []);

  const savePrefs = (d,s) => storage.set("uiPrefs",{isDark:d,uiScale:s});
  const setTheme = d => { setIsDark(d); savePrefs(d,uiScale); };
  const setScale = s => { setUiScale(s); savePrefs(isDark,s); };
  const login = async (un,pw) => {
    const u = (users||[]).find(u=>u.username===un&&u.password===pw);
    if (!u) return "Credenziali non valide";
    setCurrentUser(u); await storage.set("currentUser",u); return null;
  };
  const logout = async () => { setCurrentUser(null); await storage.set("currentUser",null); setActiveTab("dashboard"); };
  const register = async (data) => {
    if ((users||[]).find(u=>u.username===data.username)) return "Username già in uso";
    const nu = [...(users||[]),{...data,id:Date.now().toString()}];
    setUsers(nu); await storage.set("users",nu); return null;
  };

  const scaleLabelMap = {1:"Piccola",2:"Normale",3:"Grande",4:"X-Large"};
  const canAccess = currentUser && (currentUser.role==="admin"||currentUser.role==="governante");

  if (loading) return (
    <ThemeCtx.Provider value={t}>
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:t.bg }}>
        <div style={{ width:"2.4rem",height:"2.4rem",border:`3px solid ${t.spinnerBorder}`,borderTop:`3px solid ${t.accent}`,borderRadius:"50%",animation:"spin 1s linear infinite" }}/>
        <p style={{ color:t.accent,marginTop:"1rem",fontFamily:"'Playfair Display',serif" }}>Caricamento...</p>
      </div>
    </ThemeCtx.Provider>
  );

  return (
    <ThemeCtx.Provider value={t}>
      {!currentUser ? (
        <AuthScreen view={authView} setView={setAuthView} onLogin={login} onRegister={register} />
      ) : (
        <div style={{ display:"flex", minHeight:"100vh", background:t.bg, fontFamily:"'DM Sans',sans-serif", fontSize:"1rem" }}>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout} user={currentUser}/>
          <main id="main-content" style={{ flex:1, marginLeft:"13.5rem", padding:"1.5rem", overflowY:"auto" }}>
            {!canAccess ? (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:"0.75rem" }}>
                <span style={{ fontSize:"3rem" }}>🔒</span>
                <h2 style={{ color:t.accent,fontFamily:"'Playfair Display',serif" }}>Accesso limitato</h2>
                <p style={{ color:t.text3 }}>Il tuo profilo non ha accesso al gestionale.</p>
              </div>
            ) : <>
              {activeTab==="dashboard"&&<DashboardWorkers/>}
              {activeTab==="ore"&&<OreLavorate/>}
              {activeTab==="presenze"&&<PrevisionePresenze/>}
              {activeTab==="ordini"&&<Ordini/>}
              {activeTab==="manutenzioni"&&<Manutenzioni/>}
              {activeTab==="calendario"&&<Calendario/>}
            </>}
          </main>

          {/* ⚙ Gear */}
          <button type="button" onClick={()=>setSettingsOpen(o=>!o)} title="Impostazioni"
            style={{ position:"fixed",bottom:"1.2rem",left:"1.2rem",zIndex:500,width:"2.6rem",height:"2.6rem",borderRadius:"50%",background:t.bg2,border:`1px solid ${t.border2}`,cursor:"pointer",fontSize:"1.2rem",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.3)",transition:"transform 0.4s",transform:settingsOpen?"rotate(90deg)":"none" }}>
            ⚙️
          </button>
          {settingsOpen && <>
            <div onClick={()=>setSettingsOpen(false)} style={{ position:"fixed",inset:0,zIndex:498 }}/>
            <div style={{ position:"fixed",bottom:"4.5rem",left:"1rem",zIndex:499,background:t.bg2,border:`1px solid ${t.border2}`,borderRadius:"0.85rem",padding:"1.1rem",width:"15rem",boxShadow:"0 8px 40px rgba(0,0,0,0.4)" }}>
              <div style={{ color:t.accent,fontWeight:700,fontSize:"0.85rem",marginBottom:"1rem",fontFamily:"'Playfair Display',serif",borderBottom:`1px solid ${t.border}`,paddingBottom:"0.6rem" }}>⚙️ Impostazioni</div>
              <div style={{ marginBottom:"1rem" }}>
                <div style={{ color:t.text3,fontSize:"0.68rem",marginBottom:"0.4rem",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px" }}>Tema</div>
                <div style={{ display:"flex",background:t.bg3,borderRadius:"0.45rem",padding:"0.18rem",gap:"0.1rem" }}>
                  {[{v:true,icon:"🌙",l:"Scuro"},{v:false,icon:"☀️",l:"Chiaro"}].map(o=>(
                    <button key={String(o.v)} type="button" onClick={()=>setTheme(o.v)}
                      style={{ flex:1,padding:"0.45rem 0.3rem",borderRadius:"0.35rem",border:"none",cursor:"pointer",fontSize:"0.8rem",background:isDark===o.v?t.accent:"transparent",color:isDark===o.v?t.accentText:t.text3,fontWeight:isDark===o.v?700:400,fontFamily:"'DM Sans',sans-serif" }}>
                      {o.icon} {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.55rem" }}>
                  <div style={{ color:t.text3,fontSize:"0.68rem",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px" }}>Dimensione UI</div>
                  <div style={{ color:t.accent,fontSize:"0.72rem",fontWeight:700,background:t.bg3,padding:"0.1rem 0.45rem",borderRadius:"0.6rem" }}>{scaleLabelMap[uiScale]}</div>
                </div>
                <input type="range" min={1} max={4} step={1} value={uiScale} onChange={e=>setScale(+e.target.value)}
                  style={{ width:"100%",cursor:"pointer",accentColor:t.accent }}/>
                <div style={{ display:"flex",justifyContent:"space-between",color:t.text3,marginTop:"0.3rem",alignItems:"flex-end" }}>
                  {[11,14,17,20].map((fs,i)=><span key={i} style={{ fontSize:`${fs}px` }}>A</span>)}
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",color:t.text4,fontSize:"0.55rem",marginTop:"0.1rem" }}>
                  <span>Piccola</span><span>Normale</span><span>Grande</span><span>X-Large</span>
                </div>
              </div>
            </div>
          </>}
        </div>
      )}
    </ThemeCtx.Provider>
  );
}

// ===================== AUTH =====================
function AuthScreen({ view, setView, onLogin, onRegister }) {
  const t = useTheme();
  const [form,setForm] = useState({username:"",password:"",name:"",role:"cameriere"});
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  const handle = async () => {
    setLoading(true); setError("");
    if (view==="login") { const e=await onLogin(form.username,form.password); if(e)setError(e); }
    else { if(!form.name||!form.username||!form.password){setError("Compila tutti i campi");setLoading(false);return;} const e=await onRegister(form);if(e)setError(e);else setView("login"); }
    setLoading(false);
  };
  const inp = { width:"100%",padding:"0.55rem 0.75rem",background:t.inputBg,border:`1px solid ${t.border2}`,borderRadius:"0.45rem",color:t.inputColor,fontSize:"0.875rem",boxSizing:"border-box",marginBottom:"0.55rem",fontFamily:"'DM Sans',sans-serif" };
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:t.authBg,padding:"1rem" }}>
      <div style={{ background:t.bg2,border:`1px solid ${t.border2}`,borderRadius:"1rem",padding:"2rem",width:"100%",maxWidth:"23rem" }}>
        <div style={{ textAlign:"center",marginBottom:"1.5rem" }}>
          <span style={{ fontSize:"2.2rem" }}>🏨</span>
          <h1 style={{ fontFamily:"'Playfair Display',serif",color:t.accent,fontSize:"1.5rem",margin:"0.4rem 0 0.2rem" }}>{APP}</h1>
          <p style={{ color:t.text3,fontSize:"0.78rem",margin:0 }}>Gestionale per Governante</p>
        </div>
        <div style={{ display:"flex",background:t.bg3,borderRadius:"0.45rem",padding:"0.18rem",marginBottom:"1rem" }}>
          {["login","register"].map(v=>(
            <button key={v} type="button" onClick={()=>{setView(v);setError("");}}
              style={{ flex:1,padding:"0.45rem 0.75rem",background:view===v?t.bg2:"transparent",border:"none",color:view===v?t.accent:t.text3,cursor:"pointer",borderRadius:"0.35rem",fontSize:"0.85rem",fontWeight:view===v?700:400,fontFamily:"'DM Sans',sans-serif" }}>
              {v==="login"?"Accedi":"Registrati"}
            </button>
          ))}
        </div>
        {view==="register"&&<>
          <input style={inp} placeholder="Nome completo" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <select style={inp} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
            {ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </>}
        <input style={inp} placeholder="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/>
        <input style={inp} type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        {error&&<p style={{ color:t.red,fontSize:"0.78rem",margin:"0 0 0.5rem" }}>{error}</p>}
        <button type="button" onClick={handle} disabled={loading}
          style={{ width:"100%",padding:"0.6rem",background:t.accent,border:"none",borderRadius:"0.45rem",color:t.accentText,fontWeight:700,fontSize:"0.875rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
          {loading?"...":view==="login"?"Accedi":"Registrati"}
        </button>
        <p style={{ color:t.text4,fontSize:"0.72rem",textAlign:"center",marginTop:"0.75rem" }}>Default: admin / admin123</p>
      </div>
    </div>
  );
}

// ===================== SIDEBAR =====================
function Sidebar({ activeTab, setActiveTab, onLogout, user }) {
  const t = useTheme();
  const [open,setOpen] = useState(false);
  return (
    <>
      <div id="mobile-bar" style={{ display:"none",position:"fixed",top:0,left:0,right:0,zIndex:99,background:t.bg2,borderBottom:`1px solid ${t.border}`,padding:"0.55rem 1rem",alignItems:"center",justifyContent:"space-between" }}>
        <button type="button" onClick={()=>setOpen(!open)} style={{ background:"none",border:"none",color:t.accent,fontSize:"1.3rem",cursor:"pointer" }}>☰</button>
        <span style={{ color:t.accent,fontFamily:"'Playfair Display',serif",fontSize:"0.9rem",fontWeight:700 }}>🏨 {APP}</span>
        <span style={{ color:t.text3,fontSize:"0.72rem" }}>{user.name||user.username}</span>
      </div>
      {open&&<div onClick={()=>setOpen(false)} style={{ position:"fixed",inset:0,background:t.overlay,zIndex:98 }}/>}
      <aside id="sidebar" style={{ width:"13.5rem",minHeight:"100vh",background:t.bg2,borderRight:`1px solid ${t.border}`,display:"flex",flexDirection:"column",padding:"1rem 0",position:"fixed",top:0,left:0,zIndex:100,transition:"transform 0.3s" }}>
        <div style={{ display:"flex",gap:"0.55rem",alignItems:"center",padding:"0 0.9rem 0.9rem",borderBottom:`1px solid ${t.border}`,marginBottom:"0.4rem" }}>
          <span style={{ fontSize:"1.6rem" }}>🏨</span>
          <div>
            <div style={{ color:t.accent,fontFamily:"'Playfair Display',serif",fontSize:"0.75rem",fontWeight:700,lineHeight:1.2 }}>{APP}</div>
            <div style={{ color:t.text3,fontSize:"0.65rem",marginTop:"0.1rem" }}>{ROLE_LABELS[user.role]} · {user.name||user.username}</div>
          </div>
        </div>
        <nav style={{ flex:1,overflowY:"auto" }}>
          {NAV.map(n=>(
            <button key={n.id} type="button" onClick={()=>{setActiveTab(n.id);setOpen(false);}}
              style={{ display:"flex",alignItems:"center",gap:"0.65rem",width:"100%",padding:"0.6rem 0.9rem",background:activeTab===n.id?`${t.accent}18`:"none",border:"none",borderRight:activeTab===n.id?`2px solid ${t.accent}`:"2px solid transparent",cursor:"pointer",color:activeTab===n.id?t.accent:t.text3,fontSize:"0.85rem",textAlign:"left",fontFamily:"'DM Sans',sans-serif" }}>
              <span style={{ fontSize:"1rem" }}>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" onClick={onLogout} style={{ margin:"0 0.65rem",padding:"0.45rem 0.65rem",background:"none",border:`1px solid ${t.border2}`,color:t.text3,borderRadius:"0.35rem",cursor:"pointer",fontSize:"0.78rem",fontFamily:"'DM Sans',sans-serif" }}>
          🚪 Logout
        </button>
      </aside>
    </>
  );
}

// ===================== DASHBOARD WORKERS =====================
function DashboardWorkers() {
  const t = useTheme();
  const [workers,setWorkers] = useState([]);
  const [oreData,setOreData] = useState({});
  const [showForm,setShowForm] = useState(false);
  const [editWorker,setEditWorker] = useState(null); // worker being edited
  const [selected,setSelected] = useState(null);
  const blank = { name:"",surname:"",nickname:"",contract:CONTRACT_TYPES[0],contractStart:"",contractEnd:"",active:true };
  const [form,setForm] = useState(blank);

  useEffect(()=>{(async()=>{ setWorkers(await storage.get("workers")||[]); setOreData(await storage.get("oreData")||{}); })();},[]);
  const save = async w => { setWorkers(w); await storage.set("workers",w); };

  const openAdd = () => { setForm(blank); setEditWorker(null); setShowForm(true); };
  const openEdit = w => { setForm({...w}); setEditWorker(w); setShowForm(true); };

  const submit = async () => {
    if (!form.name||!form.surname) return;
    let updated;
    if (editWorker) {
      updated = workers.map(w=>w.id===editWorker.id?{...w,...form}:w);
    } else {
      updated = [...workers, {...form, id:Date.now().toString()}];
    }
    await save(updated);
    setShowForm(false); setEditWorker(null); setForm(blank);
  };

  const toggleActive = async id => { await save(workers.map(w=>w.id===id?{...w,active:!w.active}:w)); };
  const remove = async id => {
    if (!await confirmDel("Eliminare questo lavoratore definitivamente?")) return;
    await save(workers.filter(w=>w.id!==id));
    if (selected?.id===id) setSelected(null);
  };

  const getStats = wid => {
    let h=0,r=0,m=0;
    Object.values(oreData).forEach(md=>{
      if(!md.workers)return;
      const wi=md.workers.findIndex(w=>w.id===wid);if(wi===-1)return;m++;
      md.days?.forEach(d=>{const v=d.values?.[wi];if(v==="R")r++;else if(v&&!isNaN(+v))h+=+v;});
    });
    return {h:Math.round(h*10)/10,r,m};
  };

  const FormContent = (
    <div>
      <FGrid>
        <div><Lbl>Nome *</Lbl><Inp placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div><Lbl>Cognome *</Lbl><Inp placeholder="Cognome" value={form.surname} onChange={e=>setForm({...form,surname:e.target.value})}/></div>
        <div><Lbl>Soprannome</Lbl><Inp placeholder="Soprannome" value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})}/></div>
        <div><Lbl>Tipo contratto</Lbl><Sel value={form.contract} onChange={e=>setForm({...form,contract:e.target.value})}>{CONTRACT_TYPES.map(c=><option key={c}>{c}</option>)}</Sel></div>
        <div><Lbl>Inizio contratto</Lbl><Inp type="date" value={form.contractStart} onChange={e=>setForm({...form,contractStart:e.target.value})}/></div>
        <div><Lbl>Fine contratto (opz.)</Lbl><Inp type="date" value={form.contractEnd} onChange={e=>setForm({...form,contractEnd:e.target.value})}/></div>
      </FGrid>
      <div style={{ marginTop:"0.5rem" }}>
        <label style={{ display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",color:t.text2,fontSize:"0.85rem" }}>
          <input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Attivo
        </label>
      </div>
      <div style={{ display:"flex",gap:"0.45rem",marginTop:"0.85rem" }}>
        <Btn onClick={submit}>{editWorker?"Aggiorna":"Salva"}</Btn>
        <Btn variant="secondary" onClick={()=>{setShowForm(false);setEditWorker(null);}}>Annulla</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:"75rem",margin:"0 auto" }}>
      <PageHeader title="👥 Lavoratori"><Btn onClick={openAdd}>+ Nuovo</Btn></PageHeader>
      {showForm && (
        <Modal title={editWorker?"✏️ Modifica Lavoratore":"➕ Nuovo Lavoratore"} onClose={()=>{setShowForm(false);setEditWorker(null);}}>
          {FormContent}
        </Modal>
      )}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(17.5rem,1fr))",gap:"0.9rem" }}>
        {workers.map(w=>{
          const s=getStats(w.id),isSel=selected?.id===w.id;
          return (
            <div key={w.id} onClick={()=>setSelected(isSel?null:w)}
              style={{ background:t.bg2,border:`1px solid ${isSel?t.accent:t.border}`,borderRadius:"0.75rem",padding:"0.95rem",cursor:"pointer",opacity:w.active?1:0.62,transition:"border-color 0.2s" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.7rem" }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ color:t.text,fontWeight:700,fontSize:"0.95rem",fontFamily:"'Playfair Display',serif" }}>{w.name} {w.surname}</div>
                  {w.nickname&&<div style={{ color:t.accent,fontSize:"0.78rem",fontStyle:"italic" }}>"{w.nickname}"</div>}
                  <div style={{ color:t.text3,fontSize:"0.72rem",marginTop:"0.1rem" }}>{w.contract}</div>
                  {(w.contractStart||w.contractEnd)&&<div style={{ color:t.text4,fontSize:"0.65rem",marginTop:"0.1rem" }}>
                    {w.contractStart&&`Dal ${w.contractStart}`}{w.contractEnd&&` al ${w.contractEnd}`}
                  </div>}
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:"0.25rem",alignItems:"flex-end",marginLeft:"0.4rem" }}>
                  <Tag bg={w.active?t.greenBg:t.redBg} color={w.active?t.green:t.red}>{w.active?"Attivo":"Inattivo"}</Tag>
                  <div style={{ display:"flex",gap:"0.22rem",marginTop:"0.1rem" }}>
                    <IconBtn onClick={()=>openEdit(w)} icon="✏️" color={t.blue} title="Modifica"/>
                    <IconBtn onClick={()=>toggleActive(w.id)} icon={w.active?"⏸":"▶"} color={t.text3} title={w.active?"Disattiva":"Attiva"}/>
                    <IconBtn onClick={()=>remove(w.id)} icon="🗑" color={t.red} title="Elimina"/>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex",gap:"0.4rem" }}>
                {[["Ore",s.h],["Riposi",s.r],["Mesi",s.m]].map(([l,v])=>(
                  <div key={l} style={{ flex:1,background:t.bg3,borderRadius:"0.45rem",padding:"0.45rem",textAlign:"center" }}>
                    <div style={{ color:t.accent,fontWeight:700,fontSize:"1.05rem" }}>{v}</div>
                    <div style={{ color:t.text4,fontSize:"0.6rem",marginTop:"0.1rem" }}>{l}</div>
                  </div>
                ))}
              </div>
              {isSel&&s.m>0&&<MiniChart workerId={w.id} oreData={oreData}/>}
            </div>
          );
        })}
        {workers.length===0&&<Empty msg="Nessun lavoratore. Aggiungine uno!"/>}
      </div>
    </div>
  );
}

function MiniChart({ workerId, oreData }) {
  const t = useTheme();
  const md = [];
  Object.entries(oreData).sort().forEach(([key,data])=>{
    if(!data.workers)return;
    const wi=data.workers.findIndex(w=>w.id===workerId); if(wi===-1)return;
    let h=0; data.days?.forEach(d=>{const v=d.values?.[wi];if(v&&!isNaN(+v))h+=+v;});
    const mi=parseInt(key.split("-")[1],10)-1;
    md.push({label:MONTHS_SHORT[mi]||key.slice(5),h});
  });
  if (!md.length) return null;
  const max = Math.max(...md.map(m=>m.h),1);
  return (
    <div style={{ marginTop:"0.7rem",borderTop:`1px solid ${t.border}`,paddingTop:"0.7rem" }}>
      <div style={{ color:t.text3,fontSize:"0.65rem",marginBottom:"0.45rem" }}>Ore per mese</div>
      <div style={{ display:"flex",alignItems:"flex-end",gap:"0.22rem",height:"3.5rem" }}>
        {md.map((m,i)=>(
          <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"0.1rem" }}>
            <div title={`${m.label}: ${m.h}h`} style={{ width:"100%",background:t.accent,borderRadius:"0.15rem",height:`${(m.h/max)*44}px`,minHeight:"2px",transition:"height 0.3s" }}/>
            <div style={{ color:t.text4,fontSize:"0.52rem",textAlign:"center",lineHeight:1 }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== ORE LAVORATE =====================
function OreLavorate() {
  const t = useTheme();
  const today = new Date();
  const [year,setYear] = useState(today.getFullYear());
  const [month,setMonth] = useState(today.getMonth());
  const [allWorkers,setAllWorkers] = useState([]);
  const [monthData,setMonthData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [printHtml,setPrintHtml] = useState(null);
  const key = `${year}-${String(month+1).padStart(2,"0")}`;

  useEffect(()=>{(async()=>{
    setLoading(true);
    const w=await storage.get("workers")||[];
    const active=w.filter(x=>x.active);
    setAllWorkers(active);
    const allOre=await storage.get("oreData")||{};
    const md=allOre[key];
    if(md)setMonthData(md);
    else setMonthData({workers:active.map(w=>({id:w.id,name:w.name,surname:w.surname,nickname:w.nickname||""})),days:Array.from({length:getDaysInMonth(year,month)},(_,i)=>({day:i+1,values:new Array(active.length).fill("")}))});
    setLoading(false);
  })();},[key]);

  const saveMD = async md => {
    setMonthData(md);
    const all = await storage.get("oreData")||{};
    all[key]=md;
    await storage.set("oreData",all);
  };
  const updCell = (di,wi,val) => { const md=JSON.parse(JSON.stringify(monthData)); md.days[di].values[wi]=val; saveMD(md); };
  const addW = async wId => {
    const w=allWorkers.find(w=>w.id===wId); if(!w||monthData.workers.find(x=>x.id===wId))return;
    const md=JSON.parse(JSON.stringify(monthData));
    md.workers.push({id:w.id,name:w.name,surname:w.surname,nickname:w.nickname||""});
    md.days.forEach(d=>d.values.push(""));
    await saveMD(md);
  };
  const remW = async wi => {
    if(!await confirmDel("Rimuovere questo lavoratore dal mese corrente?"))return;
    const md=JSON.parse(JSON.stringify(monthData));
    md.workers.splice(wi,1); md.days.forEach(d=>d.values.splice(wi,1));
    await saveMD(md);
  };
  const totals = (monthData?.workers||[]).map((_,wi)=>{
    let h=0,r=0; (monthData.days||[]).forEach(d=>{const v=d.values[wi];if(v==="R")r++;else if(v&&!isNaN(+v))h+=+v;}); return{h:h.toFixed(1),r};
  });
  const avail = allWorkers.filter(w=>!monthData?.workers.find(x=>x.id===w.id));

  if(loading)return <Empty msg="Caricamento..."/>;

  const thB = { background:t.bg3,color:t.text3,padding:"0.45rem 0.5rem",textAlign:"center",fontWeight:600,fontSize:"0.72rem",border:`1px solid ${t.border}`,whiteSpace:"nowrap" };
  const thFG = { ...thB,width:"2rem",minWidth:"2rem" };
  const thFGg = { ...thB,width:"2.6rem",minWidth:"2.6rem" };
  const td = { padding:"0.15rem 0.2rem",borderBottom:`1px solid ${t.border}`,textAlign:"center" };

  return (
    <div style={{ maxWidth:"90rem",margin:"0 auto" }}>
      <PageHeader title="⏱ Ore Lavorate">
        <Btn variant="secondary" onClick={()=>setPrintHtml(buildOrePrintHTML(monthData,year,month))}>🖨 Stampa</Btn>
      </PageHeader>
      <Card>
        <div style={{ display:"flex",gap:"0.5rem",alignItems:"center",flexWrap:"wrap" }}>
          <SmSel value={month} onChange={e=>setMonth(+e.target.value)}>{MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}</SmSel>
          <input style={{ padding:"0.35rem 0.6rem",background:t.inputBg,border:`1px solid ${t.border2}`,borderRadius:"0.35rem",color:t.inputColor,fontSize:"0.8rem",width:"4.8rem",fontFamily:"'DM Sans',sans-serif" }} type="number" value={year} onChange={e=>setYear(+e.target.value)}/>
          {avail.length>0&&<SmSel onChange={e=>{if(e.target.value){addW(e.target.value);e.target.value="";}}}>
            <option value="">+ Aggiungi lavoratore</option>
            {avail.map(w=><option key={w.id} value={w.id}>{displayName(w)}{w.surname?` ${w.surname}`:""}</option>)}
          </SmSel>}
        </div>
        <p style={{ color:t.text4,fontSize:"0.72rem",marginTop:"0.45rem",marginBottom:0 }}>Ore (es. 5.5) · R=Riposo · M=Malattia</p>
      </Card>
      {monthData&&<div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse",background:t.bg2,fontSize:"0.8rem" }}>
          <thead><tr>
            <th style={thFG}>G</th><th style={thFGg}>Gg</th>
            {monthData.workers.map((w,i)=>(
              <th key={i} style={thB}>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"0.1rem" }}>
                  <span>{displayName(w)}</span>
                  <IconBtn onClick={()=>remW(i)} icon="✕" color={t.red} title="Rimuovi dal mese"/>
                </div>
              </th>
            ))}
          </tr></thead>
          <tbody>
            {monthData.days.map((day,di)=>{
              const dn=getDayName(year,month,day.day),we=dn==="Dom"||dn==="Sab";
              return <tr key={di} style={{ background:we?t.weekendRow:"transparent" }}>
                <td style={{ ...td,width:"2rem",fontWeight:600,color:t.text }}>{day.day}</td>
                <td style={{ ...td,width:"2.6rem",color:t.text3,fontSize:"0.68rem" }}>{dn}</td>
                {day.values.map((v,wi)=><td key={wi} style={td}><OreCell value={v} onChange={val=>updCell(di,wi,val)}/></td>)}
              </tr>;
            })}
            <tr style={{ background:t.totalRow }}>
              <td style={{ ...td,color:t.accent,borderTop:`2px solid ${t.accent}`,fontWeight:700 }} colSpan={2}>TOT</td>
              {totals.map((tot,i)=><td key={i} style={{ ...td,borderTop:`2px solid ${t.accent}`,padding:"0.35rem 0.2rem" }}>
                <div style={{ color:t.accent,fontSize:"0.72rem",fontWeight:700 }}>{tot.h}h</div>
                <div style={{ color:t.text3,fontSize:"0.6rem" }}>{tot.r}R</div>
              </td>)}
            </tr>
          </tbody>
        </table>
      </div>}
      {printHtml&&<PrintPreview htmlContent={printHtml} title={`Ore ${MONTHS[month]} ${year}`} onClose={()=>setPrintHtml(null)}/>}
    </div>
  );
}

function OreCell({ value, onChange }) {
  const t = useTheme();
  const [edit,setEdit] = useState(false);
  const [val,setVal] = useState(value);
  useEffect(()=>setVal(value),[value]);
  const commit = () => { setEdit(false); onChange(val); };
  const color = val==="R"?t.red:val==="M"?t.yellow:val?t.green:t.text4;
  if (edit) return <input value={val} onChange={e=>setVal(e.target.value.toUpperCase())} onBlur={commit} autoFocus
    onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setVal(value);setEdit(false);}}}
    style={{ width:"3.5rem",background:t.bg3,border:`1px solid ${t.accent}`,borderRadius:"0.25rem",padding:"0.1rem 0.2rem",fontSize:"0.8rem",textAlign:"center",color,outline:"none",fontFamily:"'DM Sans',sans-serif" }}/>;
  return <div onClick={()=>setEdit(true)} style={{ minWidth:"2.3rem",height:"1.55rem",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"0.25rem",fontSize:"0.8rem",color,cursor:"pointer" }}>{val||"·"}</div>;
}

// ===================== PREVISIONE PRESENZE =====================
function PrevisionePresenze() {
  const t = useTheme();
  const today = new Date();
  const [year,setYear] = useState(today.getFullYear());
  const [month,setMonth] = useState(today.getMonth());
  const [allWorkers,setAllWorkers] = useState([]);
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [printHtml,setPrintHtml] = useState(null);
  const key = `pres-${year}-${String(month+1).padStart(2,"0")}`;

  useEffect(()=>{(async()=>{
    setLoading(true);
    const w=await storage.get("workers")||[];
    const active=w.filter(x=>x.active);
    setAllWorkers(active);
    const saved=await storage.get(key);
    if(saved)setData(saved);
    else setData({workers:active.map(w=>({id:w.id,name:w.name,nickname:w.nickname||""})),days:Array.from({length:getDaysInMonth(year,month)},(_,i)=>({day:i+1,values:new Array(active.length).fill("")}))});
    setLoading(false);
  })();},[key]);

  const save = async d => { setData(d); await storage.set(key,d); };
  const updCell = (di,wi) => {
    const d=JSON.parse(JSON.stringify(data));
    const v=d.days[di].values[wi];
    d.days[di].values[wi]=v===""?"X":v==="X"?"R":"";
    save(d);
  };
  const addW = async wId => {
    const w=allWorkers.find(w=>w.id===wId); if(!w||data.workers.find(x=>x.id===wId))return;
    const d=JSON.parse(JSON.stringify(data));
    d.workers.push({id:w.id,name:w.name,nickname:w.nickname||""});
    d.days.forEach(day=>day.values.push(""));
    await save(d);
  };
  const remW = async wi => {
    const d=JSON.parse(JSON.stringify(data));
    d.workers.splice(wi,1); d.days.forEach(day=>day.values.splice(wi,1));
    await save(d);
  };
  const avail = allWorkers.filter(w=>!data?.workers.find(x=>x.id===w.id));

  if(loading)return <Empty msg="Caricamento..."/>;
  const thB={background:t.bg3,color:t.text3,padding:"0.45rem 0.5rem",textAlign:"center",fontWeight:600,fontSize:"0.72rem",border:`1px solid ${t.border}`};
  const td={padding:"0.3rem 0.4rem",border:`1px solid ${t.border}`,textAlign:"center"};

  return (
    <div style={{ maxWidth:"90rem",margin:"0 auto" }}>
      <PageHeader title="📋 Previsione Presenze">
        <Btn variant="secondary" onClick={()=>setPrintHtml(buildPresenzePrintHTML(data,year,month))}>🖨 Stampa</Btn>
      </PageHeader>
      <Card>
        <div style={{ display:"flex",gap:"0.5rem",flexWrap:"wrap",alignItems:"center" }}>
          <SmSel value={month} onChange={e=>setMonth(+e.target.value)}>{MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}</SmSel>
          <input style={{ padding:"0.35rem 0.6rem",background:t.inputBg,border:`1px solid ${t.border2}`,borderRadius:"0.35rem",color:t.inputColor,fontSize:"0.8rem",width:"4.8rem",fontFamily:"'DM Sans',sans-serif" }} type="number" value={year} onChange={e=>setYear(+e.target.value)}/>
          {avail.length>0&&<SmSel onChange={e=>{if(e.target.value){addW(e.target.value);e.target.value=="";}}}><option value="">+ Aggiungi</option>{avail.map(w=><option key={w.id} value={w.id}>{displayName(w)}</option>)}</SmSel>}
        </div>
        <p style={{ color:t.text4,fontSize:"0.72rem",marginTop:"0.45rem",marginBottom:0 }}>Clic cella: vuoto → X → R → vuoto</p>
      </Card>
      {data&&<div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse",background:t.bg2,fontSize:"0.8rem" }}>
          <thead><tr>
            <th style={{ ...thB,width:"2rem" }}>G</th><th style={{ ...thB,width:"2.6rem" }}>Gg</th>
            {data.workers.map((w,i)=>(
              <th key={i} style={thB}>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"0.1rem" }}>
                  <span>{displayName(w)}</span>
                  <IconBtn onClick={()=>remW(i)} icon="✕" color={t.red} title="Rimuovi"/>
                </div>
              </th>
            ))}
          </tr></thead>
          <tbody>
            {data.days.map((day,di)=>{
              const dn=getDayName(year,month,day.day),we=dn==="Dom"||dn==="Sab";
              return <tr key={di} style={{ background:we?t.weekendRow:"transparent" }}>
                <td style={{ ...td,fontWeight:600,color:t.text }}>{day.day}</td>
                <td style={{ ...td,color:t.text3,fontSize:"0.68rem" }}>{dn}</td>
                {day.values.map((v,wi)=>(
                  <td key={wi} style={{ ...td,cursor:"pointer",minWidth:"2.4rem" }} onClick={()=>updCell(di,wi)}>
                    <span style={{ color:v==="X"?t.green:v==="R"?t.red:t.text5,fontSize:"0.85rem",fontWeight:700 }}>{v||"·"}</span>
                  </td>
                ))}
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
      {printHtml&&<PrintPreview htmlContent={printHtml} title={`Presenze ${MONTHS[month]} ${year}`} onClose={()=>setPrintHtml(null)}/>}
    </div>
  );
}

// ===================== ORDINI =====================
function Ordini() {
  const t = useTheme();
  const [orders,setOrders] = useState([]);
  const [suppliers,setSuppliers] = useState([]);
  const [showForm,setShowForm] = useState(false);
  const [editOrder,setEditOrder] = useState(null);
  const [filter,setFilter] = useState("all");
  const blankForm = { supplier:"",newSupplier:"",date:new Date().toISOString().slice(0,10),deadline:"",items:[{name:"",qty:""}],notes:"",completed:false };
  const [form,setForm] = useState(blankForm);

  useEffect(()=>{(async()=>{ setOrders(await storage.get("orders")||[]); setSuppliers(await storage.get("suppliers")||[]); })();},[]);
  const saveOrders = async o => { setOrders(o); await storage.set("orders",o); };
  const saveSup = async s => { setSuppliers(s); await storage.set("suppliers",s); };

  const openAdd = () => { setForm(blankForm); setEditOrder(null); setShowForm(true); };
  const openEdit = o => { setForm({...o,newSupplier:""}); setEditOrder(o); setShowForm(true); };

  const submit = async () => {
    let sup = form.supplier;
    if (form.newSupplier) { sup=form.newSupplier; if(!suppliers.includes(sup)) await saveSup([...suppliers,sup]); }
    if (!sup) return;
    const items = form.items.filter(i=>i.name);
    if (editOrder) {
      await saveOrders(orders.map(o=>o.id===editOrder.id?{...o,supplier:sup,date:form.date,deadline:form.deadline,items,notes:form.notes}:o));
    } else {
      await saveOrders([{id:Date.now().toString(),supplier:sup,date:form.date,deadline:form.deadline,items,notes:form.notes,completed:false,createdAt:new Date().toISOString()},...orders]);
    }
    setShowForm(false); setEditOrder(null); setForm(blankForm);
  };

  const toggleComplete = async id => saveOrders(orders.map(o=>o.id===id?{...o,completed:!o.completed}:o));
  const remove = async id => { if(!await confirmDel("Eliminare questo ordine?"))return; await saveOrders(orders.filter(o=>o.id!==id)); };
  const addItem = () => setForm({...form,items:[...form.items,{name:"",qty:""}]});
  const updItem = (i,f,v) => { const items=[...form.items];items[i][f]=v;setForm({...form,items}); };
  const removeItem = i => { const items=form.items.filter((_,idx)=>idx!==i);setForm({...form,items:items.length?items:[{name:"",qty:""}]}); };
  const filtered = orders.filter(o=>filter==="all"?true:filter==="active"?!o.completed:o.completed);

  const FormContent = (
    <div>
      <FGrid>
        <div><Lbl>Fornitore esistente</Lbl>
          <Sel value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value,newSupplier:""})}>
            <option value="">Seleziona...</option>{suppliers.map(s=><option key={s}>{s}</option>)}
          </Sel>
        </div>
        <div><Lbl>O nuovo fornitore</Lbl><Inp placeholder="Nome nuovo fornitore" value={form.newSupplier} onChange={e=>setForm({...form,newSupplier:e.target.value,supplier:""})}/></div>
        <div><Lbl>Data</Lbl><Inp type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        <div><Lbl>Scadenza (opz.)</Lbl><Inp type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></div>
      </FGrid>
      <div style={{ marginTop:"0.65rem" }}>
        <Lbl>Prodotti</Lbl>
        {form.items.map((item,i)=>(
          <div key={i} style={{ display:"flex",gap:"0.4rem",marginBottom:"0.35rem",alignItems:"center" }}>
            <Inp style={{ flex:3 }} placeholder="Prodotto" value={item.name} onChange={e=>updItem(i,"name",e.target.value)}/>
            <Inp style={{ flex:1 }} placeholder="Qtà" value={item.qty} onChange={e=>updItem(i,"qty",e.target.value)}/>
            <IconBtn onClick={()=>removeItem(i)} icon="✕" color={t.red} title="Rimuovi riga"/>
          </div>
        ))}
        <Btn variant="secondary" onClick={addItem}>+ Prodotto</Btn>
      </div>
      <Inp textarea style={{ marginTop:"0.55rem",height:"3.5rem" }} placeholder="Note (opz.)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
      <div style={{ display:"flex",gap:"0.4rem",marginTop:"0.75rem" }}>
        <Btn onClick={submit}>{editOrder?"Aggiorna":"Salva"}</Btn>
        <Btn variant="secondary" onClick={()=>{setShowForm(false);setEditOrder(null);}}>Annulla</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:"75rem",margin:"0 auto" }}>
      <PageHeader title="🛒 Ordini"><Btn onClick={openAdd}>+ Nuovo</Btn></PageHeader>
      {showForm&&<Modal title={editOrder?"✏️ Modifica Ordine":"➕ Nuovo Ordine"} onClose={()=>{setShowForm(false);setEditOrder(null);}}>{FormContent}</Modal>}
      <FilterBtns options={[{v:"all",label:"Tutti"},{v:"active",label:"Attivi"},{v:"completed",label:"Completati"}]} value={filter} onChange={setFilter}/>
      <div style={{ display:"flex",flexDirection:"column",gap:"0.55rem" }}>
        {filtered.map(o=>(
          <div key={o.id} style={{ background:t.bg2,border:`1px solid ${t.border}`,borderRadius:"0.65rem",padding:"0.85rem 0.95rem",opacity:o.completed?0.65:1 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"0.65rem" }}>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ color:t.accent,fontWeight:700,fontSize:"0.95rem" }}>{o.supplier}</div>
                <div style={{ color:t.text3,fontSize:"0.72rem",marginBottom:"0.4rem" }}>{o.date}{o.deadline&&` · Scad: ${o.deadline}`}</div>
                {o.items.map((item,i)=><div key={i} style={{ color:t.text2,fontSize:"0.8rem" }}>· {item.name}{item.qty&&` (${item.qty})`}</div>)}
                {o.notes&&<div style={{ color:t.text3,fontSize:"0.72rem",marginTop:"0.25rem" }}>{o.notes}</div>}
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"0.3rem",alignItems:"flex-end",flexShrink:0 }}>
                <Tag bg={o.completed?t.greenBg:t.amberBg} color={o.completed?t.green:t.amber}>{o.completed?"✓ Completato":"In attesa"}</Tag>
                <div style={{ display:"flex",gap:"0.25rem",marginTop:"0.2rem",flexWrap:"wrap",justifyContent:"flex-end" }}>
                  <Btn onClick={()=>toggleComplete(o.id)} style={{ fontSize:"0.72rem",padding:"0.28rem 0.55rem" }}>{o.completed?"↩ Riapri":"✓ Fatto"}</Btn>
                  <IconBtn onClick={()=>openEdit(o)} icon="✏️" color={t.blue} title="Modifica"/>
                  <IconBtn onClick={()=>remove(o.id)} icon="🗑" color={t.red} title="Elimina"/>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0&&<Empty msg="Nessun ordine"/>}
      </div>
    </div>
  );
}

// ===================== MANUTENZIONI =====================
function Manutenzioni() {
  const t = useTheme();
  const [items,setItems] = useState([]);
  const [showForm,setShowForm] = useState(false);
  const [editItem,setEditItem] = useState(null);
  const [filter,setFilter] = useState("open");
  const blank = { description:"",room:"",deadline:"",priority:"normale" };
  const [form,setForm] = useState(blank);

  useEffect(()=>{(async()=>{ setItems(await storage.get("manutenzioni")||[]); })();},[]);
  const save = async d => { setItems(d); await storage.set("manutenzioni",d); };

  const openAdd = () => { setForm(blank); setEditItem(null); setShowForm(true); };
  const openEdit = item => { setForm({description:item.description,room:item.room||"",deadline:item.deadline||"",priority:item.priority}); setEditItem(item); setShowForm(true); };

  const submit = async () => {
    if (!form.description) return;
    if (editItem) {
      await save(items.map(i=>i.id===editItem.id?{...i,...form}:i));
    } else {
      await save([{...form,id:Date.now().toString(),createdAt:new Date().toISOString(),done:false},...items]);
    }
    setShowForm(false); setEditItem(null); setForm(blank);
  };

  const toggle = async id => save(items.map(i=>i.id===id?{...i,done:!i.done}:i));
  const remove = async id => { if(!await confirmDel("Eliminare questa manutenzione?"))return; await save(items.filter(i=>i.id!==id)); };
  const filtered = items.filter(i=>filter==="all"?true:filter==="open"?!i.done:i.done);
  const PC = PRIO_COLORS(t);

  const FormContent = (
    <div>
      <FGrid>
        <div><Lbl>Priorità</Lbl>
          <Sel value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
            <option value="urgente">🔴 Urgente</option>
            <option value="normale">🟡 Normale</option>
            <option value="bassa">⚫ Bassa</option>
          </Sel>
        </div>
        <div><Lbl>N° Stanza (opz.)</Lbl><Inp placeholder="es. 204" value={form.room} onChange={e=>setForm({...form,room:e.target.value})}/></div>
        <div><Lbl>Scadenza (opz.)</Lbl><Inp type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></div>
      </FGrid>
      <div style={{ marginTop:"0.55rem" }}><Lbl>Descrizione *</Lbl><Inp textarea style={{ height:"4.5rem" }} placeholder="Descrizione del problema..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
      <div style={{ display:"flex",gap:"0.4rem",marginTop:"0.75rem" }}>
        <Btn onClick={submit}>{editItem?"Aggiorna":"Salva"}</Btn>
        <Btn variant="secondary" onClick={()=>{setShowForm(false);setEditItem(null);}}>Annulla</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:"75rem",margin:"0 auto" }}>
      <PageHeader title="🔧 Manutenzioni"><Btn onClick={openAdd}>+ Nuova</Btn></PageHeader>
      {showForm&&<Modal title={editItem?"✏️ Modifica Manutenzione":"➕ Nuova Manutenzione"} onClose={()=>{setShowForm(false);setEditItem(null);}}>{FormContent}</Modal>}
      <FilterBtns options={[{v:"open",label:"Aperte"},{v:"done",label:"Chiuse"},{v:"all",label:"Tutte"}]} value={filter} onChange={setFilter}/>
      <div style={{ display:"flex",flexDirection:"column",gap:"0.55rem" }}>
        {filtered.map(m=>(
          <div key={m.id} style={{ background:t.bg2,border:`1px solid ${t.border}`,borderLeft:`3px solid ${PC[m.priority]||t.text3}`,borderRadius:"0.65rem",padding:"0.85rem 0.95rem",opacity:m.done?0.62:1 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"0.65rem" }}>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"0.22rem" }}>
                  {m.room&&<Tag bg={t.bg3} color={t.text3}>Stanza {m.room}</Tag>}
                  <Tag bg="transparent" color={PC[m.priority]||t.text3}>{m.priority}</Tag>
                </div>
                <div style={{ color:t.text,fontSize:"0.875rem",marginBottom:"0.22rem" }}>{m.description}</div>
                <div style={{ color:t.text4,fontSize:"0.65rem" }}>
                  {new Date(m.createdAt).toLocaleDateString("it")}{m.deadline&&` · Scad: ${new Date(m.deadline).toLocaleDateString("it")}`}
                </div>
              </div>
              <div style={{ display:"flex",gap:"0.25rem",flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end",alignItems:"center" }}>
                <Btn onClick={()=>toggle(m.id)} style={{ fontSize:"0.72rem",padding:"0.28rem 0.55rem" }}>{m.done?"↩ Riapri":"✓ Fatto"}</Btn>
                <IconBtn onClick={()=>openEdit(m)} icon="✏️" color={t.blue} title="Modifica"/>
                <IconBtn onClick={()=>remove(m.id)} icon="🗑" color={t.red} title="Elimina"/>
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0&&<Empty msg="Nessuna manutenzione"/>}
      </div>
    </div>
  );
}

// ===================== CALENDARIO =====================
function Calendario() {
  const t = useTheme();
  const today = new Date();
  const [year,setYear] = useState(today.getFullYear());
  const [month,setMonth] = useState(today.getMonth());
  const [events,setEvents] = useState([]);
  const [selected,setSelected] = useState(null);
  const [showForm,setShowForm] = useState(false);
  const [editEvent,setEditEvent] = useState(null);
  const blank = { title:"",time:"",notes:"" };
  const [form,setForm] = useState(blank);

  useEffect(()=>{(async()=>{ setEvents(await storage.get("calEvents")||[]); })();},[]);
  const save = async e => { setEvents(e); await storage.set("calEvents",e); };

  const openAdd = () => { setForm(blank); setEditEvent(null); setShowForm(true); };
  const openEdit = ev => { setForm({title:ev.title,time:ev.time||"",notes:ev.notes||""}); setEditEvent(ev); setShowForm(true); };

  const submitEvent = async () => {
    if (!form.title) return;
    if (editEvent) {
      await save(events.map(e=>e.id===editEvent.id?{...e,...form}:e));
    } else {
      if (!selected) return;
      await save([...events,{...form,id:Date.now().toString(),date:selected}]);
    }
    setShowForm(false); setEditEvent(null); setForm(blank);
  };

  const remEvent = async id => { if(!await confirmDel("Eliminare questo evento?"))return; await save(events.filter(e=>e.id!==id)); };

  const days = getDaysInMonth(year,month);
  const firstDay = new Date(year,month,1).getDay();
  const cells = Array(firstDay===0?6:firstDay-1).fill(null).concat(Array.from({length:days},(_,i)=>i+1));
  const dateStr = d => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const dayEvs = d => events.filter(e=>e.date===dateStr(d));
  const selEvs = selected ? events.filter(e=>e.date===selected) : [];
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const FormContent = (
    <div>
      <div style={{ marginBottom:"0.5rem" }}><Lbl>Data</Lbl>
        <Inp type="date" value={editEvent?editEvent.date:selected||""} readOnly={!editEvent&&!!selected}
          onChange={e=>editEvent&&save(events.map(ev=>ev.id===editEvent.id?{...ev,date:e.target.value}:ev))}/>
      </div>
      <FGrid>
        <div><Lbl>Titolo *</Lbl><Inp placeholder="Titolo evento" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
        <div><Lbl>Ora (opz.)</Lbl><Inp type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></div>
      </FGrid>
      <div style={{ marginTop:"0.5rem" }}><Lbl>Note (opz.)</Lbl><Inp textarea style={{ height:"3.5rem" }} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
      <div style={{ display:"flex",gap:"0.4rem",marginTop:"0.75rem" }}>
        <Btn onClick={submitEvent}>{editEvent?"Aggiorna":"Salva"}</Btn>
        <Btn variant="secondary" onClick={()=>{setShowForm(false);setEditEvent(null);}}>Annulla</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:"75rem",margin:"0 auto" }}>
      <PageHeader title="📅 Calendario">
        <div style={{ display:"flex",alignItems:"center",gap:"0.3rem" }}>
          <button type="button" onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}} style={{ background:"none",border:"none",color:t.accent,fontSize:"1.3rem",cursor:"pointer",padding:"0 0.2rem" }}>‹</button>
          <span style={{ color:t.accent,fontWeight:700,minWidth:"9rem",textAlign:"center",fontSize:"0.9rem" }}>{MONTHS[month]} {year}</span>
          <button type="button" onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}} style={{ background:"none",border:"none",color:t.accent,fontSize:"1.3rem",cursor:"pointer",padding:"0 0.2rem" }}>›</button>
        </div>
      </PageHeader>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"0.18rem" }}>
        {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map(d=><div key={d} style={{ textAlign:"center",color:t.text3,fontSize:"0.72rem",padding:"0.35rem 0",fontWeight:600 }}>{d}</div>)}
        {cells.map((d,i)=>{
          const ds=d?dateStr(d):null,evs=d?dayEvs(d):[],isToday=ds===todayStr,isSel=ds===selected;
          return (
            <div key={i} onClick={()=>d&&setSelected(ds)}
              style={{ background:isToday?t.calToday:t.bg2,border:`1px solid ${isSel?t.accent:isToday?t.calTodayBorder:t.border}`,borderRadius:"0.5rem",padding:"0.45rem 0.35rem",minHeight:"4.2rem",cursor:d?"pointer":"default",overflow:"hidden" }}>
              {d&&<>
                <div style={{ fontSize:"0.78rem",fontWeight:isToday?700:400,color:isToday?t.accent:t.text2 }}>{d}</div>
                {evs.slice(0,2).map(e=><div key={e.id} style={{ background:t.calEvent,color:t.calEventText,fontSize:"0.55rem",borderRadius:"0.15rem",padding:"0.06rem 0.22rem",marginTop:"0.1rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.time&&`${e.time} `}{e.title}</div>)}
                {evs.length>2&&<div style={{ color:t.text3,fontSize:"0.55rem",marginTop:"0.1rem" }}>+{evs.length-2}</div>}
              </>}
            </div>
          );
        })}
      </div>
      {selected&&<Card style={{ marginTop:"0.9rem" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.65rem" }}>
          <div style={{ color:t.text,fontSize:"0.9rem",fontWeight:600,fontFamily:"'Playfair Display',serif" }}>
            {new Date(selected+"T00:00:00").toLocaleDateString("it",{weekday:"long",day:"numeric",month:"long"})}
          </div>
          <Btn onClick={openAdd}>+ Evento</Btn>
        </div>
        {selEvs.length===0&&<div style={{ color:t.text4,fontSize:"0.8rem" }}>Nessun evento</div>}
        {selEvs.sort((a,b)=>(a.time||"").localeCompare(b.time||"")).map(e=>(
          <div key={e.id} style={{ background:t.bg3,border:`1px solid ${t.border}`,borderRadius:"0.5rem",padding:"0.6rem 0.75rem",marginBottom:"0.35rem",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"0.5rem" }}>
            <div style={{ flex:1,minWidth:0 }}>
              {e.time&&<span style={{ color:t.accent,fontWeight:700,marginRight:"0.45rem",fontSize:"0.85rem" }}>{e.time}</span>}
              <span style={{ color:t.text,fontSize:"0.875rem" }}>{e.title}</span>
              {e.notes&&<div style={{ color:t.text3,fontSize:"0.72rem",marginTop:"0.1rem" }}>{e.notes}</div>}
            </div>
            <div style={{ display:"flex",gap:"0.22rem",flexShrink:0 }}>
              <IconBtn onClick={()=>openEdit(e)} icon="✏️" color={t.blue} title="Modifica"/>
              <IconBtn onClick={()=>remEvent(e.id)} icon="🗑" color={t.red} title="Elimina"/>
            </div>
          </div>
        ))}
      </Card>}
      {showForm&&<Modal title={editEvent?"✏️ Modifica Evento":"➕ Nuovo Evento"} onClose={()=>{setShowForm(false);setEditEvent(null);}}>{FormContent}</Modal>}
    </div>
  );
}

// ===================== GLOBAL CSS =====================
if (typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel="stylesheet"; link.href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `
    *{box-sizing:border-box;}html{font-size:14px;}body{margin:0;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:768px){#sidebar{transform:translateX(-100%)!important;}#main-content{margin-left:0!important;padding-top:3.5rem!important;}#mobile-bar{display:flex!important;}}
    input:focus,select:focus,textarea:focus{outline:2px solid #c9a96e;outline-offset:1px;}
    input[type=range]{height:6px;border-radius:3px;}
    ::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{border-radius:3px;background:#555;}
    button{font-family:'DM Sans',sans-serif;}
  `;
  document.head.appendChild(style);
}
