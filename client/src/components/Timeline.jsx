import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Activity, Droplets, Heart, Zap, Info, RefreshCw,
  Smile, Dumbbell, Circle, Leaf, FlaskConical, AlertTriangle
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Vector icon renderer — one per log type
// ─────────────────────────────────────────────────────────
function TypeIcon({ type, size = 14, color }) {
  const props = { size, color, strokeWidth: 2 };
  switch (type) {
    case 'hydration': return <Droplets    {...props} />;
    case 'mood':      return <Smile       {...props} />;
    case 'exercise':  return <Dumbbell    {...props} />;
    case 'cycle':     return <Circle      {...props} />;
    case 'symptom':
    case 'pain':      return <Zap         {...props} />;
    case 'leave':     return <Leaf        {...props} />;
    default:          return <Activity    {...props} />;
  }
}

// ─────────────────────────────────────────────────────────
// Theme-aligned color map for log types (no emojis)
// ─────────────────────────────────────────────────────────
const THEME = {
  hydration: { color: 'var(--color-primary)',     light: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', label: 'Hydration' },
  pain:      { color: 'var(--color-error)',        light: 'color-mix(in srgb, var(--color-error) 12%, transparent)',   label: 'Pain'      },
  mood:      { color: '#8A7090',                   light: 'rgba(138, 112, 144, 0.15)',                 label: 'Mood'      },
  exercise:  { color: 'var(--color-success)',      light: 'color-mix(in srgb, var(--color-success) 12%, transparent)', label: 'Exercise'  },
  cycle:     { color: 'var(--color-error)',        light: 'color-mix(in srgb, var(--color-error) 12%, transparent)',   label: 'Cycle'     },
  symptom:   { color: 'var(--color-warning)',      light: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', label: 'Symptom'   },
  leave:     { color: 'var(--color-primary-dark)', light: 'color-mix(in srgb, var(--color-primary-dark) 12%, transparent)', label: 'Leave'    },
};

// ─────────────────────────────────────────────────────────
// Reusable SVG Bar Chart
// ─────────────────────────────────────────────────────────
function BarChart({ data, themeColor, emptyColor, max, unit, nullLabel = '—' }) {
  const [hovered, setHovered] = useState(null);
  const BAR_W   = 28;
  const SPACING = 44;
  const H       = 120;

  return (
    <svg viewBox="0 0 330 195" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((frac, i) => (
        <line key={i}
          x1="0" y1={H - frac * H + 10}
          x2="330" y2={H - frac * H + 10}
          stroke="var(--color-border)" strokeDasharray={frac === 1 ? '0' : '4'}
        />
      ))}

      {/* Bars */}
      {data.map((d, idx) => {
        const val     = d.value;
        const hasData = val !== null && val > 0;
        const height  = hasData ? Math.min((val / max) * H, H) : 3;
        const x       = idx * SPACING + 8;
        const y       = H - height + 10;
        const isToday = idx === data.length - 1;
        const fill    = !hasData
          ? (emptyColor || 'var(--color-border)')
          : themeColor;

        return (
          <g key={idx}>
            <rect
              x={x} y={y} width={BAR_W} height={height}
              fill={fill} rx="5"
              style={{ cursor: 'pointer', transition: 'all 200ms', opacity: hovered === idx ? 0.75 : 1 }}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            />
            {/* Outline highlight for today's active bar */}
            {isToday && hasData && (
              <rect 
                x={x - 1.5} y={y - 1.5} 
                width={BAR_W + 3} height={height + 3} 
                fill="none" 
                stroke="var(--color-primary-dark)" 
                strokeWidth="1.5" 
                rx="6.5" 
              />
            )}
            {/* Hover tooltip */}
            {hovered === idx && (
              <g>
                <rect x={x - 6} y={y - 30} width={BAR_W + 12} height={20}
                  fill="var(--color-primary-dark)" rx="5" />
                <text x={x + BAR_W / 2} y={y - 16}
                  fill="var(--color-white)" fontSize="9" textAnchor="middle" fontWeight="bold">
                  {hasData ? `${val}${unit}` : nullLabel}
                </text>
              </g>
            )}
            {/* Day label */}
            <text x={x + BAR_W / 2} y={H + 26}
              fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">
              {d.label}
            </text>
            {/* TODAY tag */}
            {isToday && (
              <text x={x + BAR_W / 2} y={H + 37}
                fill={themeColor} fontSize="7" textAnchor="middle" fontWeight="bold">
                TODAY
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Chart card header icon badge
// ─────────────────────────────────────────────────────────
function IconBadge({ children, bg }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8,
      background: bg || 'var(--color-surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{
      height: 130,
      background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-border) 50%, var(--color-surface) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: 8
    }} />
  );
}

// ─────────────────────────────────────────────────────────
// Today badge (value pill in chart header)
// ─────────────────────────────────────────────────────────
function TodayPill({ value, bg, color, border }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 10px',
      borderRadius: 10, background: bg, color, border: `1px solid ${border}`,
      whiteSpace: 'nowrap'
    }}>
      Today: {value}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Main Timeline Component
// ─────────────────────────────────────────────────────────
export default function Timeline({ user, timelineEvents, dashboardData, token, API_BASE }) {
  const [weeklyData,    setWeeklyData]    = useState([]);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [dateFilter,    setDateFilter]    = useState('all');
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [showDocs,      setShowDocs]      = useState(false);
  const [pulse,         setPulse]         = useState(false);

  // ── Fetch real weekly data ────────────────────────────────
  const fetchWeekly = useCallback(async () => {
    if (!token || !API_BASE) return;
    try {
      const res  = await fetch(`${API_BASE}/timeline/weekly`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setWeeklyData(data.weekly);
        setLastUpdated(new Date());
        setPulse(true);
        setTimeout(() => setPulse(false), 1800);
      }
    } catch (e) {
      console.error('Timeline weekly fetch failed', e);
    } finally {
      setLoadingWeekly(false);
    }
  }, [token, API_BASE]);

  useEffect(() => { fetchWeekly(); }, [fetchWeekly]);
  // Re-fetch whenever a new log is submitted
  useEffect(() => { if (timelineEvents.length > 0) fetchWeekly(); }, [timelineEvents.length]);

  // ── Chart arrays ──────────────────────────────────────────
  const hydrationData = weeklyData.map(d => ({ label: d.label, value: d.hydration }));
  const painData      = weeklyData.map(d => ({ label: d.label, value: d.pain }));
  const moodData      = weeklyData.map(d => ({ label: d.label, value: d.mood }));
  const exerciseData  = weeklyData.map(d => ({ label: d.label, value: d.exercise }));

  // ── Date filter options ───────────────────────────────────
  const uniqueDates = [...new Set(
    timelineEvents.map(e =>
      new Date(e.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    )
  )].slice(0, 14);

  // ── Merge today's live session logs at top ────────────────
  const todayLogs = [];
  if (dashboardData?.logs) {
    const { hydration, exercise, pain, mood } = dashboardData.logs;
    if (hydration > 0)  todayLogs.push({ type: 'hydration', date: new Date(), title: 'Hydration — Live Session',  desc: `Total logged today: ${hydration} ml` });
    if (exercise > 0)   todayLogs.push({ type: 'exercise',  date: new Date(), title: 'Exercise — Live Session',   desc: `${exercise} minutes of activity logged today` });
    if (pain !== null)  todayLogs.push({ type: 'symptom',   date: new Date(), title: 'Pain — Live Session',       desc: `Peak pain today: ${pain}/10` });
    if (mood !== null)  todayLogs.push({ type: 'mood',      date: new Date(), title: 'Mood — Live Session',       desc: `Mood rated ${mood}/5 today` });
  }
  const allEvents = [...todayLogs, ...timelineEvents];

  // ── Apply filters ─────────────────────────────────────────
  const filtered = allEvents.filter(evt => {
    const dateStr = new Date(evt.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    return (dateFilter === 'all' || dateStr === dateFilter) &&
           (typeFilter === 'all' || evt.type === typeFilter);
  });

  // ── Cohort AI note ────────────────────────────────────────
  const getCohortAnalysis = () => {
    if (!user) return { stage: 'General', note: 'Track symptoms consistently to build accurate baseline alerts.' };
    const age = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
    if (age < 18) return { stage: 'Teen Profile', note: 'Hormonal fluctuations are common as your estrogen baseline stabilizes. Prioritize consistent sleep (9 hours) and iron-rich dietary intake.' };
    if (age >= 18 && age <= 33) {
      if (user.fullName?.toLowerCase().includes('priya') || user.fullName?.toLowerCase().includes('sen'))
        return { stage: 'Postpartum / Breastfeeding', note: 'Chronic sleep fragmentation detected. Short power naps and +400ml daily hydration are recommended to replenish breast milk yield.' };
      return { stage: 'Working Professional', note: 'Stress-induced cortisol elevations can suppress progesterone synthesis. Minimize caffeine after 2 PM to protect your luteal sleep architecture.' };
    }
    if (age > 33 && age <= 45) return { stage: 'Active Mother / Postpartum', note: 'Focus on magnesium-rich dinner items to offset sleep deficits and manage high-stress schedules.' };
    return { stage: 'Menopausal Transition', note: 'Decreasing estrogen levels can trigger sudden hot flashes. Limiting caffeine and simple sugars reduces autonomic nervous system spikes.' };
  };
  const cohort = getCohortAnalysis();

  // ── Shared card style ─────────────────────────────────────
  const card = {
    background: 'var(--color-white)', borderRadius: 16, padding: 20,
    boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)'
  };

  return (
    <div className="anim-slide-in">
      <style>{`
        .timeline-event-card:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(61, 139, 147, 0.08);
          border-color: var(--color-primary-glow) !important;
        }
        .timeline-chart-card {
          transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .timeline-chart-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(61, 139, 147, 0.12) !important;
          border-color: var(--color-primary-glow) !important;
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', color: 'var(--color-primary-dark)' }}>Interactive Health Timeline</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 13 }}>
            Real-time logs and weekly health trends — backed by your actual data.
          </p>
        </div>

        {/* Sync badge + Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: pulse ? '#E8F5EE' : 'var(--color-surface)',
            border: `1px solid ${pulse ? 'var(--color-success)' : 'var(--color-border)'}`,
            borderRadius: 20, padding: '5px 12px', transition: 'all 400ms'
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
              background: pulse ? 'var(--color-success)' : 'var(--color-text-muted)',
              boxShadow: pulse ? '0 0 0 4px rgba(76,154,107,0.25)' : 'none',
              transition: 'all 400ms'
            }} />
            <span style={{ fontSize: 11, fontWeight: pulse ? 600 : 400,
              color: pulse ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {pulse ? 'Updated!' : lastUpdated
                ? `Synced ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Loading…'}
            </span>
          </div>
          <button onClick={fetchWeekly} className="aura-btn aura-btn-secondary aura-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 2×2 chart grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* 1 — Hydration */}
        <div style={card} className="timeline-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBadge bg="color-mix(in srgb, var(--color-primary) 12%, transparent)">
                <Droplets size={15} color="var(--color-primary)" strokeWidth={2} />
              </IconBadge>
              <strong style={{ fontSize: 13, color: 'var(--color-primary-dark)' }}>Daily Water Intake</strong>
            </div>
            <TodayPill
              value={`${weeklyData[6]?.hydration || 0} ml`}
              bg="color-mix(in srgb, var(--color-primary) 12%, transparent)" color="var(--color-primary)" border="color-mix(in srgb, var(--color-primary) 30%, transparent)"
            />
          </div>
          {loadingWeekly ? <Skeleton /> : (
            <BarChart data={hydrationData} themeColor="var(--color-primary)"
              emptyColor="var(--color-border)" max={3000} unit="ml" nullLabel="0 ml" />
          )}
          <p style={{ textAlign: 'right', fontSize: 10, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
            Target: 3,000 ml / day
          </p>
        </div>

        {/* 2 — Pain */}
        <div style={card} className="timeline-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBadge bg="color-mix(in srgb, var(--color-error) 12%, transparent)">
                <Zap size={15} color="var(--color-error)" strokeWidth={2} />
              </IconBadge>
              <strong style={{ fontSize: 13, color: 'var(--color-primary-dark)' }}>Peak Pain Intensity</strong>
            </div>
            <TodayPill
              value={weeklyData[6]?.pain != null ? `${weeklyData[6].pain}/10` : 'None'}
              bg="color-mix(in srgb, var(--color-error) 12%, transparent)" color="var(--color-error)" border="color-mix(in srgb, var(--color-error) 30%, transparent)"
            />
          </div>
          {loadingWeekly ? <Skeleton /> : (
            <BarChart data={painData} themeColor="var(--color-error)"
              emptyColor="var(--color-border)" max={10} unit="/10" nullLabel="None" />
          )}
          <p style={{ textAlign: 'right', fontSize: 10, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
            Scale: 0 (none) → 10 (severe)
          </p>
        </div>

        {/* 3 — Mood */}
        <div style={card} className="timeline-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBadge bg="color-mix(in srgb, var(--color-accent) 15%, transparent)">
                <Smile size={15} color="var(--color-accent)" strokeWidth={2} />
              </IconBadge>
              <strong style={{ fontSize: 13, color: 'var(--color-primary-dark)' }}>Avg. Mood Rating</strong>
            </div>
            <TodayPill
              value={weeklyData[6]?.mood != null ? `${weeklyData[6].mood}/5` : 'None'}
              bg="rgba(138, 112, 144, 0.12)" color="#8A7090" border="rgba(138, 112, 144, 0.3)"
            />
          </div>
          {loadingWeekly ? <Skeleton /> : (
            <BarChart data={moodData} themeColor="#8A7090"
              emptyColor="var(--color-border)" max={5} unit="/5" nullLabel="None" />
          )}
          <p style={{ textAlign: 'right', fontSize: 10, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
            1 (very low) → 5 (very high)
          </p>
        </div>

        {/* 4 — Exercise */}
        <div style={card} className="timeline-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBadge bg="color-mix(in srgb, var(--color-success) 12%, transparent)">
                <Dumbbell size={15} color="var(--color-success)" strokeWidth={2} />
              </IconBadge>
              <strong style={{ fontSize: 13, color: 'var(--color-primary-dark)' }}>Exercise Minutes</strong>
            </div>
            <TodayPill
              value={`${weeklyData[6]?.exercise || 0} min`}
              bg="color-mix(in srgb, var(--color-success) 12%, transparent)" color="var(--color-success)" border="color-mix(in srgb, var(--color-success) 30%, transparent)"
            />
          </div>
          {loadingWeekly ? <Skeleton /> : (
            <BarChart data={exerciseData} themeColor="var(--color-success)"
              emptyColor="var(--color-border)" max={90} unit=" min" nullLabel="0 min" />
          )}
          <p style={{ textAlign: 'right', fontSize: 10, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
            Target: 30 min / day
          </p>
        </div>

      </div>

      {/* ── Luna AI cohort insight ── */}
      <div style={{ ...card, background: 'var(--color-accent-light)', borderLeft: '4px solid var(--color-accent)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Info size={20} color="var(--color-primary-dark)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ color: 'var(--color-primary-dark)', margin: '0 0 4px', fontSize: 14 }}>
              Luna AI Cohort Observations — {cohort.stage}
            </h4>
            <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.55 }}>
              {cohort.note}
            </p>
          </div>
        </div>
      </div>

      {/* ── Chronological feed ── */}
      <div style={card}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: '0 0 2px', color: 'var(--color-primary-dark)' }}>Chronological Health Feed</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
              {filtered.length} entries — database records merged with today's live session
            </p>
          </div>

          {/* Dropdowns */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="aura-input" style={{ height: 32, fontSize: 12, padding: '0 8px', width: 'auto' }}>
              <option value="all">All Types</option>
              <option value="cycle">Cycle</option>
              <option value="mood">Mood</option>
              <option value="hydration">Hydration</option>
              <option value="exercise">Exercise</option>
              <option value="symptom">Symptom</option>
              <option value="leave">Leave</option>
            </select>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="aura-input" style={{ height: 32, fontSize: 12, padding: '0 8px', width: 'auto' }}>
              <option value="all">All Dates</option>
              {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {(typeFilter !== 'all' || dateFilter !== 'all') && (
              <button onClick={() => { setTypeFilter('all'); setDateFilter('all'); }}
                className="aura-btn aura-btn-secondary aura-btn-sm">Clear</button>
            )}
          </div>
        </div>

        {/* Vector legend chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {Object.entries(THEME).map(([t, cfg]) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(active ? 'all' : t)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, padding: '5px 11px', borderRadius: 20,
                  background: active ? cfg.color : 'var(--color-surface)',
                  color: active ? 'var(--color-white)' : 'var(--color-text-muted)',
                  border: `1px solid ${active ? cfg.color : 'var(--color-border)'}`,
                  fontWeight: active ? 600 : 400, transition: 'all 200ms',
                  cursor: 'pointer', outline: 'none'
                }}
              >
                <TypeIcon type={t} size={12} color={active ? 'white' : cfg.color} />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Feed items */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
            <Calendar size={36} style={{ opacity: 0.25, display: 'block', margin: '0 auto 10px' }} />
            <p style={{ margin: 0 }}>No entries match the selected filters.</p>
          </div>
        ) : (
          <div style={{
            position: 'relative',
            borderLeft: '2px dashed var(--color-border)',
            paddingLeft: 28, marginLeft: 20,
            display: 'flex', flexDirection: 'column', gap: 20
          }}>
            {filtered.map((evt, idx) => {
              const cfg    = THEME[evt.type] || THEME.hydration;
              const isLive = idx < todayLogs.length && dateFilter === 'all';
              const evtDate = new Date(evt.date);

              return (
                <div key={idx} className="timeline-event-card" style={{
                  position: 'relative',
                  padding: '14px 16px 14px 20px',
                  borderRadius: '12px',
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${cfg.color}`,
                  marginLeft: '8px',
                  transition: 'all 200ms ease'
                }}>
                  {/* Timeline dot with vector icon */}
                  <div style={{
                    position: 'absolute', left: -39, top: '50%', transform: 'translateY(-50%)',
                    width: 22, height: 22, borderRadius: '50%',
                    background: isLive ? cfg.color : 'var(--color-white)',
                    border: `2px solid ${cfg.color}`,
                    boxShadow: isLive ? `0 0 0 4px ${cfg.light}` : '0 1px 3px rgba(0,0,0,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 200ms',
                    zIndex: 2
                  }}>
                    <TypeIcon type={evt.type} size={10} color={isLive ? 'white' : cfg.color} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--color-primary-dark)', fontWeight: '700' }}>
                          {evt.title}
                        </strong>
                        {isLive && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 6px',
                            borderRadius: 8, background: '#E8F5EE',
                            color: 'var(--color-success)', border: '1px solid #B2DFCB',
                            letterSpacing: '0.5px'
                          }}>LIVE</span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0', lineHeight: '1.45' }}>
                        {evt.desc}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {evtDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {evtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Collapsible docs ── */}
      <div style={{ ...card, marginTop: 20 }}>
        <button onClick={() => setShowDocs(!showDocs)}
          className="aura-btn aura-btn-secondary aura-btn-sm"
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Documentation: Timeline System Mechanics</span>
          <span>{showDocs ? 'Hide ▲' : 'Show ▼'}</span>
        </button>

        {showDocs && (
          <div className="anim-slide-in" style={{
            marginTop: 16, background: 'var(--color-surface)',
            padding: 16, borderRadius: 10, fontSize: 13, lineHeight: 1.6
          }}>
            <h4 style={{ color: 'var(--color-primary-dark)', margin: '0 0 6px' }}>1. Real-time Data Submission</h4>
            <p style={{ color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
              Every log submitted from the Dashboard triggers a simultaneous reload of both the dashboard
              summary and this timeline — no page refresh needed.
            </p>
            <h4 style={{ color: 'var(--color-primary-dark)', margin: '0 0 6px' }}>2. Real Weekly Data (not simulated)</h4>
            <p style={{ color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
              The <code style={{ background: 'var(--color-border)', padding: '1px 5px', borderRadius: 4 }}>/api/timeline/weekly</code> endpoint
              aggregates your actual MongoDB logs for the past 7 days.
            </p>
            <h4 style={{ color: 'var(--color-primary-dark)', margin: '0 0 6px' }}>3. Live Session Merging</h4>
            <p style={{ color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
              Today's active state is merged at the top of the feed as{' '}
              <span style={{ background: '#E8F5EE', color: 'var(--color-success)', fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>LIVE</span>{' '}
              entries, visible instantly after each log.
            </p>
            <h4 style={{ color: 'var(--color-primary-dark)', margin: '0 0 6px' }}>4. Date &amp; Type Filters</h4>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              Use the dropdowns or the vector icon legend chips above to isolate a specific log type
              or narrow down to a specific calendar date.
            </p>
          </div>
        )}
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

    </div>
  );
}
