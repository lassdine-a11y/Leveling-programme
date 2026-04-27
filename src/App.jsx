import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   SOLO LEVELING — SYSTÈME D'ÉVOLUTION PERSONNELLE
   ═══════════════════════════════════════════════════════════════ */

// ── CONSTANTS ────────────────────────────────────────────────────
const DIVISIONS = [
  { name: "Bronze",       rank: "E",  min: 0,      max: 3000,    color: "#8B4513", glow: "#8B451360", bg: "#1a0d00" },
  { name: "Argent",       rank: "D",  min: 3001,   max: 7900,    color: "#aaaaaa", glow: "#aaaaaa50", bg: "#111115" },
  { name: "Or",           rank: "C",  min: 8000,   max: 15999,   color: "#FFD700", glow: "#FFD70060", bg: "#1a1500" },
  { name: "Platine",      rank: "B",  min: 16000,  max: 31999,   color: "#00cfff", glow: "#00cfff55", bg: "#001520" },
  { name: "Diamant",      rank: "A",  min: 32000,  max: 63999,   color: "#a78bfa", glow: "#a78bfa55", bg: "#0d0020" },
  { name: "Héroïque",    rank: "S",  min: 64000,  max: 160000,  color: "#ff6600", glow: "#ff660060", bg: "#1a0a00" },
  { name: "Grand Maître", rank: "SS", min: 160001, max: Infinity, color: "#ff00ff", glow: "#ff00ff60", bg: "#1a001a" },
];

const MISSION_TYPES = [
  { id: "daily",    label: "Quotidienne",  icon: "☀", xpDefault: 10,  maxPerDay: 10, color: "#00cfff" },
  { id: "weekly",   label: "Hebdomadaire", icon: "◈", xpDefault: 50,  maxPerDay: 3,  color: "#a78bfa" },
  { id: "monthly",  label: "Mensuelle",    icon: "◆", xpDefault: 100, maxPerDay: 4,  color: "#FFD700" },
  { id: "critical", label: "Critique",     icon: "⚠", xpDefault: 200, maxPerDay: 1,  color: "#ff4444" },
  { id: "hunter",   label: "Chasseur",     icon: "⚔", xpDefault: 75,  maxPerDay: 5,  color: "#ff6600" },
  { id: "identity", label: "Identité",     icon: "◉", xpDefault: 60,  maxPerDay: 3,  color: "#00ff88" },
  { id: "zone",     label: "Zone",         icon: "▣", xpDefault: 5,   maxPerDay: 4,  color: "#888" },
];

const SKILL_RANKS = ["F","E","D","C","B","A","S","SS"];

const INITIAL_MISSIONS = [
  { id: "m1", title: "Méditation 10 min",        type: "daily",    xp: 10,  done: false, deadline: "", repeat: "daily",   note: "" },
  { id: "m2", title: "30 min de sport",           type: "daily",    xp: 10,  done: false, deadline: "", repeat: "daily",   note: "" },
  { id: "m3", title: "Lire 20 pages",             type: "daily",    xp: 10,  done: false, deadline: "", repeat: "daily",   note: "" },
  { id: "m4", title: "Réviser l'espagnol",        type: "weekly",   xp: 50,  done: false, deadline: "", repeat: "weekly",  note: "" },
  { id: "m5", title: "Écrire 500 mots du livre", type: "monthly",  xp: 100, done: false, deadline: "", repeat: "monthly", note: "Objectif : livre sur la gamification" },
  { id: "m6", title: "Pratiquer l'art oratoire", type: "hunter",   xp: 75,  done: false, deadline: "", repeat: "weekly",  note: "Compétence : rang C actuel" },
  { id: "m7", title: "Agir comme sociologue",    type: "identity", xp: 60,  done: false, deadline: "", repeat: "daily",   note: "Rejoindre une structure sociologique" },
];

const INITIAL_SKILLS = [
  { id: "s1", name: "Art Oratoire",   rank: 2, icon: "🎙", xpToNext: 150, current: 80 },
  { id: "s2", name: "Espagnol",       rank: 1, icon: "🌐", xpToNext: 200, current: 40 },
  { id: "s3", name: "Japonais",       rank: 0, icon: "⛩",  xpToNext: 300, current: 10 },
  { id: "s4", name: "Sociologie",     rank: 3, icon: "📖", xpToNext: 180, current: 120 },
  { id: "s5", name: "Entrepreneuriat",rank: 1, icon: "💼", xpToNext: 200, current: 60 },
  { id: "s6", name: "Écriture",      rank: 2, icon: "✦",  xpToNext: 150, current: 90 },
];

const INITIAL_HISTORY = [
  { date: "J-6", xp: 120 }, { date: "J-5", xp: 280 }, { date: "J-4", xp: 410 },
  { date: "J-3", xp: 560 }, { date: "J-2", xp: 740 }, { date: "J-1", xp: 920 },
  { date: "Auj.", xp: 1050 },
];

// ── HELPERS ──────────────────────────────────────────────────────
const getDivision = xp => DIVISIONS.find(d => xp >= d.min && xp <= d.max) || DIVISIONS[0];
const getLevel = xp => Math.min(100, Math.floor(xp / 1600) + 1);
const getLevelProgress = xp => {
  const lvl = getLevel(xp);
  const base = (lvl - 1) * 1600;
  return { lvl, current: xp - base, needed: 1600 };
};
const genId = () => `m${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

// ── STORAGE (localStorage bridge — swap for Supabase later) ──────
const STORAGE_KEY = "sl_evolution_v1";
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   VISUAL COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

// Animated scanline overlay
function Scanlines() {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999,
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)",
    }} />
  );
}

// Particle background
function ParticleField({ color }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: i % 3 === 0 ? 3 : 2,
          height: i % 3 === 0 ? 3 : 2,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}`,
          left: `${(i * 17 + 5) % 100}%`,
          top: `${(i * 13 + 8) % 100}%`,
          animation: `float${i % 4} ${4 + (i % 5)}s ease-in-out infinite`,
          animationDelay: `${i * 0.4}s`,
          opacity: 0.4,
        }} />
      ))}
    </div>
  );
}

// XP Bar — Solo Leveling style (segmented)
function XPBar({ current, needed, color, height = 10 }) {
  const pct = Math.min(100, (current / needed) * 100);
  const segments = 20;
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: segments }).map((_, i) => {
        const filled = (i / segments) * 100 < pct;
        return (
          <div key={i} style={{
            flex: 1, height,
            background: filled ? color : "#0a0a1a",
            boxShadow: filled ? `0 0 6px ${color}` : "none",
            transition: "all 0.3s",
            clipPath: "polygon(2px 0%, 100% 0%, calc(100% - 2px) 100%, 0% 100%)",
          }} />
        );
      })}
    </div>
  );
}

// System notification popup (Solo Leveling UI style)
function SystemAlert({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%,-50%)",
      zIndex: 9999, textAlign: "center", pointerEvents: "none",
      animation: "sysAlert 2.2s ease-out forwards",
    }}>
      <div style={{
        border: "1px solid #00cfff88",
        background: "linear-gradient(135deg, #00000099, #001020cc)",
        backdropFilter: "blur(20px)",
        padding: "20px 40px",
        position: "relative",
        clipPath: "polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)",
      }}>
        <div style={{ color: "#00cfff55", fontSize: 9, letterSpacing: 4, marginBottom: 6 }}>◈ SYSTEM ◈</div>
        <div style={{ color: "#00ff88", fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 900, letterSpacing: 2, textShadow: "0 0 30px #00ff88" }}>
          {msg}
        </div>
        <div style={{ position: "absolute", top: -1, left: -1, right: -1, height: 1, background: "linear-gradient(90deg, transparent, #00cfff, transparent)" }} />
        <div style={{ position: "absolute", bottom: -1, left: -1, right: -1, height: 1, background: "linear-gradient(90deg, transparent, #00cfff, transparent)" }} />
      </div>
    </div>
  );
}

// Rank badge
function RankBadge({ rank, color, size = 36 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Orbitron', monospace", fontWeight: 900,
      color, fontSize: size * 0.35,
      boxShadow: `0 0 16px ${color}66, inset 0 0 16px ${color}11`,
      clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
      background: `${color}11`,
      flexShrink: 0,
    }}>
      {rank}
    </div>
  );
}

// Mini line chart
function LineChart({ data, color }) {
  const W = 300, H = 90, PAD = 16;
  const maxV = Math.max(...data.map(d => d.xp), 1);
  const minV = Math.min(...data.map(d => d.xp));
  const x = i => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const y = v => H - PAD - ((v - minV) / (maxV - minV || 1)) * (H - PAD * 2);
  const line = data.map((d, i) => `${x(i)},${y(d.xp)}`).join(" ");
  const area = `M ${x(0)},${H} ${data.map((d, i) => `L ${x(i)},${y(d.xp)}`).join(" ")} L ${x(data.length-1)},${H} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d={area} fill="url(#lg)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" filter="url(#glow)" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.xp)} r={4} fill={color} filter="url(#glow)" />
          <text x={x(i)} y={H - 2} textAnchor="middle" fill="#333" fontSize={8} fontFamily="Orbitron">{d.date}</text>
        </g>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MISSION MODAL — full CRUD
   ═══════════════════════════════════════════════════════════════ */
function MissionModal({ mission, onSave, onDelete, onClose, div }) {
  const isNew = !mission.id;
  const [form, setForm] = useState(mission);
  const typeInfo = MISSION_TYPES.find(t => t.id === form.type) || MISSION_TYPES[0];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000dd",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 500, padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(160deg, #060614 0%, #0a0a20 100%)",
        border: `1px solid ${div.color}55`,
        maxWidth: 480, width: "100%", borderRadius: 4,
        boxShadow: `0 0 60px ${div.glow}, 0 0 120px ${div.glow}`,
        position: "relative", overflow: "hidden",
      }}>
        {/* top line */}
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${div.color}, transparent)` }} />
        <div style={{ padding: "24px 28px 28px" }}>
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ fontFamily: "'Orbitron', monospace", color: div.color, fontSize: 10, letterSpacing: 4 }}>
              ◈ SYSTEM · {isNew ? "NOUVELLE MISSION" : "MODIFIER MISSION"}
            </div>
            <div style={{ flex: 1, height: 1, background: `${div.color}33` }} />
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          {/* Title */}
          <label style={labelStyle}>TITRE DE LA MISSION</label>
          <input value={form.title} onChange={e => set("title", e.target.value)}
            placeholder="Ex : Méditer 10 minutes..."
            style={inputStyle(div.color)} />

          {/* Type */}
          <label style={labelStyle}>TYPE DE MISSION</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {MISSION_TYPES.map(t => (
              <button key={t.id} onClick={() => { set("type", t.id); set("xp", t.xpDefault); }} style={{
                padding: "7px 12px", border: `1px solid ${form.type === t.id ? t.color : "#222"}`,
                borderRadius: 3, background: form.type === t.id ? `${t.color}22` : "transparent",
                color: form.type === t.id ? t.color : "#555",
                fontFamily: "'Orbitron', monospace", fontSize: 9, cursor: "pointer",
                letterSpacing: 1, transition: "all 0.15s",
                clipPath: "polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* XP */}
          <label style={labelStyle}>POINTS XP</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <input type="range" min={5} max={500} step={5} value={form.xp}
              onChange={e => set("xp", +e.target.value)}
              style={{ flex: 1, accentColor: typeInfo.color }} />
            <div style={{
              fontFamily: "'Orbitron', monospace", color: typeInfo.color,
              fontSize: 18, fontWeight: 900, minWidth: 60, textAlign: "right",
              textShadow: `0 0 12px ${typeInfo.color}`,
            }}>+{form.xp}</div>
          </div>

          {/* Repeat & Deadline */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>RÉCURRENCE</label>
              <select value={form.repeat} onChange={e => set("repeat", e.target.value)} style={selectStyle(div.color)}>
                <option value="">Aucune</option>
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>DEADLINE</label>
              <input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)}
                style={inputStyle(div.color)} />
            </div>
          </div>

          {/* Note */}
          <label style={labelStyle}>NOTE / OBJECTIF LIÉ</label>
          <textarea value={form.note} onChange={e => set("note", e.target.value)}
            placeholder="Contexte, motivation, lien avec un objectif..."
            rows={2}
            style={{ ...inputStyle(div.color), resize: "vertical" }} />

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => onSave(form)} style={{
              flex: 2, padding: "13px",
              background: `linear-gradient(135deg, ${div.color}cc, ${div.color}66)`,
              border: "none", color: "#000", fontFamily: "'Orbitron', monospace",
              fontWeight: 900, fontSize: 12, cursor: "pointer",
              clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
              letterSpacing: 1,
            }}>CONFIRMER</button>
            {!isNew && (
              <button onClick={() => onDelete(form.id)} style={{
                flex: 1, padding: "13px",
                background: "transparent",
                border: "1px solid #ff444488", color: "#ff4444",
                fontFamily: "'Orbitron', monospace", fontSize: 11, cursor: "pointer",
                clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
              }}>SUPPRIMER</button>
            )}
          </div>
        </div>
        {/* bottom line */}
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${div.color}, transparent)` }} />
      </div>
    </div>
  );
}

const labelStyle = { display: "block", color: "#444", fontSize: 9, letterSpacing: 3, marginBottom: 6, fontFamily: "'Orbitron', monospace" };
const inputStyle = (color) => ({
  width: "100%", boxSizing: "border-box",
  background: "#06060e", border: `1px solid ${color}33`,
  borderRadius: 3, padding: "10px 12px",
  color: "#ccc", fontFamily: "'Rajdhani', sans-serif", fontSize: 14,
  marginBottom: 14, outline: "none",
  transition: "border-color 0.2s",
});
const selectStyle = (color) => ({
  ...inputStyle(color), marginBottom: 0, appearance: "none",
});

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════ */
export default function App() {
  // Load from storage or use defaults
  const saved = loadState();
  const [missions, setMissions]   = useState(saved?.missions  || INITIAL_MISSIONS);
  const [skills,   setSkills]     = useState(saved?.skills    || INITIAL_SKILLS);
  const [history,  setHistory]    = useState(saved?.history   || INITIAL_HISTORY);
  const [prestige, setPrestige]   = useState(saved?.prestige  || 340);
  const [playerName, setPlayerName] = useState(saved?.playerName || "CHASSEUR");

  const [tab,          setTab]    = useState("dashboard");
  const [modal,        setModal]  = useState(null);   // null | { mission } | "new"
  const [alert,        setAlert]  = useState(null);   // string | null
  const [editingName,  setEditingName] = useState(false);

  const totalXP = history[history.length - 1].xp;
  const div     = getDivision(totalXP);
  const { lvl, current: lvlCur, needed: lvlNeeded } = getLevelProgress(totalXP);
  const divPct  = Math.min(100, ((totalXP - div.min) / (Math.max(1, div.max - div.min))) * 100);
  const doneMissions = missions.filter(m => m.done);

  // Auto-save
  useEffect(() => {
    saveState({ missions, skills, history, prestige, playerName });
  }, [missions, skills, history, prestige, playerName]);

  // Toggle mission done/undone
  function toggleMission(id) {
    setMissions(prev => prev.map(m => {
      if (m.id !== id) return m;
      const nowDone = !m.done;
      const delta = nowDone ? m.xp : -m.xp;
      setHistory(h => {
        const last = h[h.length - 1];
        return [...h.slice(0, -1), { ...last, xp: Math.max(0, last.xp + delta) }];
      });
      setPrestige(p => Math.max(0, p + Math.floor(Math.abs(delta) * 0.1) * (nowDone ? 1 : -1)));
      if (nowDone) setAlert(`+${m.xp} XP · Mission accomplie !`);
      return { ...m, done: nowDone };
    }));
  }

  // Save mission (new or edit)
  function saveMission(form) {
    if (!form.title.trim()) return;
    if (!form.id) {
      setMissions(prev => [...prev, { ...form, id: genId(), done: false }]);
      setAlert("Nouvelle mission enregistrée !");
    } else {
      setMissions(prev => prev.map(m => m.id === form.id ? { ...form } : m));
      setAlert("Mission mise à jour !");
    }
    setModal(null);
  }

  function deleteMission(id) {
    setMissions(prev => prev.filter(m => m.id !== id));
    setModal(null);
    setAlert("Mission supprimée.");
  }

  const newMissionTemplate = { id: "", title: "", type: "daily", xp: 10, done: false, deadline: "", repeat: "daily", note: "" };

  // Tabs
  const TABS = [
    { id: "dashboard", icon: "◈", label: "Tableau" },
    { id: "missions",  icon: "⚔", label: "Missions" },
    { id: "progress",  icon: "◆", label: "Rang" },
    { id: "skills",    icon: "◉", label: "Skills" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#04040f", color: "#ddd", fontFamily: "'Rajdhani', sans-serif", overflowX: "hidden" }}>
      <Scanlines />
      <ParticleField color={div.color} />

      {/* CSS animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap');
        @keyframes float0 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-35px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
        @keyframes float3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-28px)} }
        @keyframes sysAlert { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.8)} 15%{opacity:1;transform:translate(-50%,-50%) scale(1)} 80%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.05)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes borderGlow { 0%,100%{box-shadow:0 0 10px ${div.color}44} 50%{box-shadow:0 0 30px ${div.color}88} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; background: #04040f; }
        ::-webkit-scrollbar-thumb { background: ${div.color}44; }
        select option { background: #060614; color: #ccc; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        button:active { transform: scale(0.97); }
      `}</style>

      {/* System Alert */}
      {alert && <SystemAlert msg={alert} onDone={() => setAlert(null)} />}

      {/* Mission modal */}
      {modal && (
        <MissionModal
          mission={modal === "new" ? newMissionTemplate : modal}
          onSave={saveMission}
          onDelete={deleteMission}
          onClose={() => setModal(null)}
          div={div}
        />
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 14px 100px", position: "relative", zIndex: 1 }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 28, animation: "slideIn 0.6s ease" }}>
          {/* system label */}
          <div style={{ color: div.color, fontFamily: "'Orbitron', monospace", fontSize: 9, letterSpacing: 6, marginBottom: 10, textShadow: `0 0 20px ${div.color}`, animation: "pulse 3s infinite" }}>
            ◈ ─── SYSTÈME D'ÉVOLUTION PERSONNELLE ─── ◈
          </div>

          {/* Player name editable */}
          {editingName ? (
            <input
              autoFocus
              defaultValue={playerName}
              onBlur={e => { setPlayerName(e.target.value || "CHASSEUR"); setEditingName(false); }}
              onKeyDown={e => e.key === "Enter" && e.target.blur()}
              style={{
                background: "none", border: "none", borderBottom: `1px solid ${div.color}`,
                color: "#fff", fontFamily: "'Orbitron', monospace", fontSize: 22,
                fontWeight: 900, textAlign: "center", outline: "none", width: "100%",
                letterSpacing: 4,
              }}
            />
          ) : (
            <h1 onClick={() => setEditingName(true)} style={{
              margin: 0, fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900,
              background: `linear-gradient(135deg, #ffffff, ${div.color})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: 4, cursor: "pointer",
            }} title="Cliquer pour modifier le nom">
              {playerName} · LVL {lvl}
            </h1>
          )}

          {/* Division */}
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 10,
            border: `1px solid ${div.color}55`, padding: "6px 20px",
            background: `${div.color}0a`, backdropFilter: "blur(10px)",
            clipPath: "polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)",
            animation: "borderGlow 3s infinite",
          }}>
            <RankBadge rank={div.rank} color={div.color} size={28} />
            <span style={{ fontFamily: "'Orbitron', monospace", color: div.color, fontSize: 12, letterSpacing: 2 }}>
              {div.name.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── STAT CARDS ──────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { l: "XP TOTAL", v: totalXP.toLocaleString(), c: div.color },
            { l: "NIVEAU",   v: lvl,                       c: "#a78bfa" },
            { l: "PRESTIGE", v: prestige,                  c: "#FFD700" },
            { l: "MISSIONS", v: `${doneMissions.length}/${missions.length}`, c: "#00ff88" },
          ].map(s => (
            <div key={s.l} style={{
              background: "#07071a", border: `1px solid ${s.c}22`,
              padding: "12px 10px", textAlign: "center",
              clipPath: "polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)",
            }}>
              <div style={{ color: "#444", fontSize: 7, letterSpacing: 2, fontFamily: "'Orbitron', monospace" }}>{s.l}</div>
              <div style={{ color: s.c, fontSize: 20, fontFamily: "'Orbitron', monospace", fontWeight: 900, textShadow: `0 0 12px ${s.c}` }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── BARS ───────────────────────────────────────────── */}
        <div style={{ background: "#07071a", border: "1px solid #111128", padding: "14px 16px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#333", fontSize: 9, letterSpacing: 2, fontFamily: "'Orbitron', monospace" }}>NIVEAU {lvl} → {lvl + 1}</span>
            <span style={{ color: "#a78bfa", fontSize: 9, fontFamily: "'Orbitron', monospace" }}>{lvlCur} / {lvlNeeded} XP</span>
          </div>
          <XPBar current={lvlCur} needed={lvlNeeded} color="#a78bfa" height={8} />
        </div>

        <div style={{ background: "#07071a", border: `1px solid ${div.color}22`, padding: "14px 16px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#333", fontSize: 9, letterSpacing: 2, fontFamily: "'Orbitron', monospace" }}>DIVISION {div.name.toUpperCase()}</span>
            <span style={{ color: div.color, fontSize: 9, fontFamily: "'Orbitron', monospace" }}>{totalXP.toLocaleString()} XP</span>
          </div>
          <XPBar current={totalXP - div.min} needed={div.max === Infinity ? 1 : div.max - div.min} color={div.color} height={8} />
          {/* rank ladder mini */}
          <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
            {DIVISIONS.map(d => (
              <div key={d.name} title={d.name} style={{
                flex: 1, height: 3,
                background: totalXP >= d.min ? d.color : "#111",
                boxShadow: totalXP >= d.min ? `0 0 6px ${d.color}` : "none",
              }} />
            ))}
          </div>
        </div>

        {/* ── TABS ────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 3, marginBottom: 24, borderBottom: `1px solid ${div.color}22`, paddingBottom: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 4px", border: "none",
              background: tab === t.id ? `${div.color}18` : "transparent",
              borderBottom: `2px solid ${tab === t.id ? div.color : "transparent"}`,
              color: tab === t.id ? div.color : "#444",
              fontFamily: "'Orbitron', monospace", fontSize: 9, letterSpacing: 1,
              cursor: "pointer", transition: "all 0.2s",
            }}>
              {t.icon}<br />{t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB: DASHBOARD
           ══════════════════════════════════════════════════════ */}
        {tab === "dashboard" && (
          <div style={{ animation: "slideIn 0.3s ease" }}>
            {/* Chart */}
            <div style={{ background: "#07071a", border: "1px solid #111128", padding: "18px 16px", marginBottom: 14 }}>
              <div style={{ color: "#333", fontSize: 9, letterSpacing: 3, fontFamily: "'Orbitron', monospace", marginBottom: 12 }}>◈ COURBE XP · 7 JOURS</div>
              <LineChart data={history} color={div.color} />
            </div>

            {/* Today's missions */}
            <div style={{ color: "#333", fontSize: 9, letterSpacing: 3, fontFamily: "'Orbitron', monospace", marginBottom: 10 }}>
              ☀ MISSIONS DU JOUR
            </div>
            {missions.filter(m => m.type === "daily").map(m => (
              <MissionRow key={m.id} m={m} onToggle={toggleMission} onEdit={() => setModal(m)} div={div} />
            ))}

            {/* Stagnation warning */}
            {doneMissions.length === 0 && (
              <div style={{
                marginTop: 12, border: "1px solid #ff444433",
                background: "#0d0000", padding: "14px 16px",
                clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
              }}>
                <div style={{ color: "#ff4444", fontSize: 9, letterSpacing: 3, fontFamily: "'Orbitron', monospace", marginBottom: 4 }}>⚠ ALERTE STAGNATION</div>
                <div style={{ color: "#663333", fontSize: 12 }}>Aucune mission complétée. Risque de perte de <strong style={{ color: "#ff4444" }}>25% XP</strong> en début de saison.</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: MISSIONS
           ══════════════════════════════════════════════════════ */}
        {tab === "missions" && (
          <div style={{ animation: "slideIn 0.3s ease" }}>
            <button onClick={() => setModal("new")} style={{
              width: "100%", padding: "14px",
              background: `linear-gradient(135deg, ${div.color}33, ${div.color}11)`,
              border: `1px solid ${div.color}55`, color: div.color,
              fontFamily: "'Orbitron', monospace", fontSize: 11, cursor: "pointer",
              letterSpacing: 2, marginBottom: 20,
              clipPath: "polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)",
              boxShadow: `0 0 20px ${div.glow}`,
            }}>
              ＋ NOUVELLE MISSION
            </button>

            {MISSION_TYPES.map(type => {
              const list = missions.filter(m => m.type === type.id);
              if (!list.length) return null;
              return (
                <div key={type.id} style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: type.color, fontSize: 9, fontFamily: "'Orbitron', monospace", letterSpacing: 3 }}>
                      {type.icon} {type.label.toUpperCase()}
                    </span>
                    <div style={{ flex: 1, height: 1, background: `${type.color}22` }} />
                    <span style={{ color: "#333", fontSize: 9, fontFamily: "'Orbitron', monospace" }}>
                      {list.filter(m => m.done).length}/{list.length}
                    </span>
                  </div>
                  {list.map(m => (
                    <MissionRow key={m.id} m={m} onToggle={toggleMission} onEdit={() => setModal(m)} div={div} />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: RANG / PROGRESSION
           ══════════════════════════════════════════════════════ */}
        {tab === "progress" && (
          <div style={{ animation: "slideIn 0.3s ease" }}>
            <div style={{ background: "#07071a", border: "1px solid #111128", padding: "18px 16px", marginBottom: 16 }}>
              <div style={{ color: "#333", fontSize: 9, letterSpacing: 3, fontFamily: "'Orbitron', monospace", marginBottom: 14 }}>◈ PROGRESSION XP</div>
              <LineChart data={history} color={div.color} />
            </div>

            {[...DIVISIONS].reverse().map(d => {
              const reached = totalXP >= d.min;
              const active  = getDivision(totalXP).name === d.name;
              return (
                <div key={d.name} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px", marginBottom: 6,
                  background: active ? `${d.color}0a` : "#07071a",
                  border: `1px solid ${active ? d.color + "55" : "#111128"}`,
                  clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
                  transition: "all 0.3s",
                }}>
                  <RankBadge rank={d.rank} color={reached ? d.color : "#222"} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: reached ? d.color : "#333", letterSpacing: 1 }}>
                      {d.name.toUpperCase()}
                      {active && <span style={{ marginLeft: 8, background: d.color, color: "#000", fontSize: 7, padding: "2px 6px", letterSpacing: 1 }}>EN COURS</span>}
                    </div>
                    <div style={{ color: "#333", fontSize: 10, marginTop: 2 }}>
                      {d.min.toLocaleString()} – {d.max === Infinity ? "∞" : d.max.toLocaleString()} XP
                    </div>
                    {active && (
                      <div style={{ marginTop: 6 }}>
                        <XPBar current={totalXP - d.min} needed={d.max === Infinity ? 1 : d.max - d.min} color={d.color} height={4} />
                      </div>
                    )}
                  </div>
                  {reached && <span style={{ color: d.color, fontSize: 16, textShadow: `0 0 10px ${d.color}` }}>✦</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: SKILLS
           ══════════════════════════════════════════════════════ */}
        {tab === "skills" && (
          <div style={{ animation: "slideIn 0.3s ease" }}>
            <div style={{ color: "#333", fontSize: 9, letterSpacing: 3, fontFamily: "'Orbitron', monospace", marginBottom: 14 }}>
              ◉ COMPÉTENCES DU CHASSEUR
            </div>
            {skills.map(skill => {
              const rankIdx = skill.rank;
              const rankLabel = SKILL_RANKS[rankIdx];
              const rankColor = rankIdx >= 6 ? "#ff00ff" : rankIdx >= 5 ? "#ff6600" : rankIdx >= 3 ? "#a78bfa" : rankIdx >= 1 ? "#00cfff" : "#555";
              return (
                <div key={skill.id} style={{
                  background: "#07071a", border: `1px solid ${rankColor}22`,
                  padding: "14px 16px", marginBottom: 10,
                  clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{skill.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#ccc", fontSize: 14, fontWeight: 700 }}>{skill.name}</div>
                    </div>
                    <RankBadge rank={rankLabel} color={rankColor} size={34} />
                  </div>
                  {/* rank ladder */}
                  <div style={{ display: "flex", gap: 3 }}>
                    {SKILL_RANKS.map((r, i) => (
                      <div key={r} style={{
                        flex: 1, height: 5,
                        background: i <= rankIdx ? rankColor : "#111",
                        boxShadow: i <= rankIdx ? `0 0 6px ${rankColor}` : "none",
                        position: "relative",
                      }}>
                        <div style={{ position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)", color: i <= rankIdx ? rankColor : "#333", fontSize: 7, fontFamily: "'Orbitron', monospace" }}>{r}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ color: "#333", fontSize: 9, fontFamily: "'Orbitron', monospace", letterSpacing: 2 }}>XP VERS {SKILL_RANKS[Math.min(7, rankIdx + 1)]}</span>
                      <span style={{ color: rankColor, fontSize: 9, fontFamily: "'Orbitron', monospace" }}>{skill.current}/{skill.xpToNext}</span>
                    </div>
                    <XPBar current={skill.current} needed={skill.xpToNext} color={rankColor} height={5} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(180deg, transparent, #04040f 30%)",
        padding: "6px 14px 14px",
        display: "flex", gap: 3, maxWidth: 680, margin: "0 auto",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 4px",
            background: tab === t.id ? `${div.color}18` : "#07071a",
            border: `1px solid ${tab === t.id ? div.color + "55" : "#111128"}`,
            color: tab === t.id ? div.color : "#555",
            fontFamily: "'Orbitron', monospace", fontSize: 9,
            cursor: "pointer", transition: "all 0.2s",
            clipPath: "polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)",
            boxShadow: tab === t.id ? `0 0 16px ${div.glow}` : "none",
          }}>
            {t.icon}<br />{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MISSION ROW
   ═══════════════════════════════════════════════════════════════ */
function MissionRow({ m, onToggle, onEdit, div }) {
  const type = MISSION_TYPES.find(t => t.id === m.type) || MISSION_TYPES[0];
  const isOverdue = m.deadline && new Date(m.deadline) < new Date() && !m.done;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "11px 14px", marginBottom: 7,
      background: m.done ? "#001a0a" : isOverdue ? "#1a0000" : "#07071a",
      border: `1px solid ${m.done ? "#00ff8833" : isOverdue ? "#ff444433" : "#111128"}`,
      clipPath: "polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)",
      transition: "all 0.2s",
      cursor: "pointer",
    }}>
      {/* Checkbox */}
      <div onClick={() => onToggle(m.id)} style={{
        width: 20, height: 20, border: `2px solid ${m.done ? "#00ff88" : type.color + "66"}`,
        background: m.done ? "#00ff88" : "transparent", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        clipPath: "polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)",
        transition: "all 0.2s", boxShadow: m.done ? "0 0 10px #00ff8866" : "none",
      }}>
        {m.done && <span style={{ color: "#000", fontSize: 11, fontWeight: 900 }}>✓</span>}
      </div>

      {/* Type icon */}
      <span style={{ color: type.color, fontSize: 14, flexShrink: 0 }}>{type.icon}</span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }} onClick={() => onToggle(m.id)}>
        <div style={{ color: m.done ? "#00ff8888" : "#ccc", fontSize: 13, fontWeight: 600, textDecoration: m.done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {m.title}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <span style={{ color: "#333", fontSize: 9, fontFamily: "'Orbitron', monospace" }}>{type.label}</span>
          {m.deadline && <span style={{ color: isOverdue ? "#ff4444" : "#444", fontSize: 9, fontFamily: "'Orbitron', monospace" }}>⏱ {m.deadline}</span>}
          {m.repeat && <span style={{ color: "#333", fontSize: 9 }}>↺ {m.repeat}</span>}
        </div>
      </div>

      {/* XP */}
      <div style={{ color: m.done ? "#00ff8888" : "#FFD700", fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
        +{m.xp}
      </div>

      {/* Edit button */}
      <button onClick={onEdit} style={{
        background: "none", border: "none", color: "#333", cursor: "pointer",
        fontSize: 13, padding: "2px 4px", flexShrink: 0,
        transition: "color 0.15s",
      }} onMouseEnter={e => e.target.style.color = div.color} onMouseLeave={e => e.target.style.color = "#333"}>
        ✎
      </button>
    </div>
  );
}
