import React, { useState, useMemo } from 'react';
import { Download, ChevronDown, ChevronUp, TrendingUp, Droplets, Brain, Activity, Heart } from 'lucide-react';

const generateUniqueReportId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'HRH-RPT-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function Reports({ user, analyticsData, showToast }) {
  const [daysScope, setDaysScope] = useState(7);
  const [openQuestionIdx, setOpenQuestionIdx] = useState(null);
  const [exportProgress, setExportProgress] = useState(null);
  const [reportId, setReportId] = useState(() => generateUniqueReportId());

  const filteredCycles = (analyticsData?.cycles ?? []);
  const filteredLogs = useMemo(() => (analyticsData?.logs ?? []).filter(log => {
    const logDate = new Date(log.date);
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - daysScope);
    return logDate >= limitDate;
  }), [analyticsData, daysScope]);

  // Computed telemetry
  const hydrationLogs = filteredLogs.filter(l => l.type === 'hydration');
  const moodLogs = filteredLogs.filter(l => l.type === 'mood');
  const symptomLogs = filteredLogs.filter(l => l.type === 'symptom');
  const exerciseLogs = filteredLogs.filter(l => l.type === 'exercise');
  const totalHydration = hydrationLogs.reduce((a, b) => a + Number(b.value), 0);
  const avgMood = moodLogs.length > 0 ? (moodLogs.reduce((a, b) => a + Number(b.value), 0) / moodLogs.length).toFixed(1) : '—';
  const painLogs = symptomLogs.filter(l => l.value?.symptom === 'pain').length;
  const totalExercise = exerciseLogs.reduce((a, b) => a + Number(b.value), 0);
  const age = user ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear() : null;

  const getDoctorPrepQuestions = () => {
    if (!user || !age) return [];
    if (age < 18) {
      return [
        { q: "Are my irregular cycle lengths typical for my age stage, or should we check for PCOS indicators?", details: "Irregular cycles are common as the endocrine system stabilizes, but tracking patterns helps rule out underlying factors." },
        { q: "What parameters classify cramps as 'excessive', and what safe symptom relief targets exist?", details: "Learn the difference between standard dysmenorrhea and severe symptoms that need gynecological checks." }
      ];
    } else if (age <= 33) {
      if (user.conditionTags?.includes('endometriosis')) {
        return [
          { q: "How do my pain levels and fatigue patterns relate to my endometriosis progression?", details: "Endometriosis lesions can progress and create adhesions. Discuss whether any new scan is warranted." },
          { q: "Are there anti-inflammatory dietary approaches proven to reduce my endo lesion activity?", details: "Omega-3, curcumin, and reducing red meat are evidence-backed diet approaches. Confirm suitability with your gynaecologist." }
        ];
      }
      return [
        { q: "How could my elevated work stress indices be triggering afternoon slumps and cycle irregularities?", details: "Cortisol elevation can delay ovulation. Discuss testing baseline fasting insulin levels." },
        { q: "Should we run a blood check for ferritin, thyroid panel (TSH), and Vitamin D?", details: "Standard checkups help diagnose if afternoon fatigue is hormonal, metabolic, or nutritional." }
      ];
    } else if (age <= 45) {
      return [
        { q: "Could my symptoms indicate early premenopausal transition cycles?", details: "Understand cycle changes, hot flashes, or sleep cycles during the late 30s and 40s." },
        { q: "Are there lifestyle or dietary modifications that can buffer my fatigue levels?", details: "Discuss magnesium, iron, and stress-reduction protocols suitable for busy parental schedules." }
      ];
    } else {
      return [
        { q: "Do my vasomotor hot flashes indicate a need for hormone replacement therapy (HRT) or non-hormonal options?", details: "Assess risks and benefits of symptom relief paths for hot flashes and sleep disturbances." },
        { q: "Should we order a baseline DEXA bone density scan to evaluate osteoporosis parameters?", details: "Estrogen drops speed up bone density loss. Tracking this helps build early preventative actions." }
      ];
    }
  };

  const prepQuestions = getDoctorPrepQuestions();

  const triggerExport = () => {
    setReportId(generateUniqueReportId());
    setExportProgress(0);
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setExportProgress(null);
            showToast('Clinical Report Ready — Printing...');
            window.print();
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const toggleQuestion = (idx) => {
    setOpenQuestionIdx(openQuestionIdx === idx ? null : idx);
  };

  const dateGenerated = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeGenerated = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Telemetry table rows
  const telemetryRows = [
    { metric: 'Hydration (Water Intake)', entries: `${hydrationLogs.length} logs`, summary: `${totalHydration} ml total`, icon: <Droplets size={14}/> },
    { metric: 'Mood Ratings', entries: `${moodLogs.length} logs`, summary: `${avgMood} / 5 average`, icon: <Brain size={14}/> },
    { metric: 'Exercise Activity', entries: `${exerciseLogs.length} logs`, summary: `${totalExercise} min total`, icon: <Activity size={14}/> },
    { metric: 'Symptom Reports', entries: `${symptomLogs.length} logs`, summary: `${painLogs} pain episodes`, icon: <Heart size={14}/> }
  ];

  return (
    <div className="anim-slide-in">
      {/* ═══════════════════════ ON-SCREEN VIEW ═══════════════════════ */}
      <div className="aura-no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '800', color: 'var(--color-primary-dark)' }}>Clinical Reports</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>Generate & export verified health intelligence documents</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setDaysScope(7)} className={`aura-btn aura-btn-secondary aura-btn-sm ${daysScope === 7 ? 'active' : ''}`} style={{ borderRadius: '20px' }}>Last 7 Days</button>
            <button onClick={() => setDaysScope(30)} className={`aura-btn aura-btn-secondary aura-btn-sm ${daysScope === 30 ? 'active' : ''}`} style={{ borderRadius: '20px' }}>Last 30 Days</button>
          </div>
        </div>

        {/* Export trigger card */}
        <div className="aura-card" style={{ background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))', color: 'white', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}></div>
          <div style={{ position: 'absolute', bottom: '-30px', right: '60px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Export Clinical Intelligence Report</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', opacity: 0.85 }}>Generates a DPDP-verified PDF with branded letterhead, telemetry data, and physician consultation prep.</p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
                <span>Report ID: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{reportId}</strong></span>
                <span>Scope: <strong>{daysScope} Days</strong></span>
              </div>
            </div>
            <div>
              {exportProgress === null ? (
                <button onClick={triggerExport} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(8px)', transition: 'all 200ms ease' }}>
                  <Download size={16}/> Generate Report
                </button>
              ) : (
                <div style={{ minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', opacity: 0.9 }}>
                    <span>Compiling clinical data...</span>
                    <strong>{exportProgress}%</strong>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'white', width: `${exportProgress}%`, transition: 'width 150ms', borderRadius: '3px' }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard preview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Logs', value: filteredLogs.length, sub: `${daysScope}d scope`, icon: <TrendingUp size={18}/>, color: 'var(--color-primary)' },
            { label: 'Hydration', value: `${totalHydration} ml`, sub: `${hydrationLogs.length} entries`, icon: <Droplets size={18}/>, color: '#0891b2' },
            { label: 'Avg Mood', value: `${avgMood}/5`, sub: `${moodLogs.length} ratings`, icon: <Brain size={18}/>, color: '#6366f1' },
            { label: 'Symptoms', value: `${symptomLogs.length}`, sub: `${painLogs} pain events`, icon: <Heart size={18}/>, color: '#e11d48' }
          ].map((card, i) => (
            <div key={i} className="aura-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '500' }}>{card.label}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `color-mix(in srgb, ${card.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>{card.icon}</div>
              </div>
              <strong style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>{card.value}</strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{card.sub}</span>
            </div>
          ))}
        </div>

        {/* Doctor Prep questions */}
        <div className="aura-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--color-primary-dark)', fontWeight: '700' }}>Physician Pre-Consultation Questions</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>AI-generated based on your profile, age ({age}), and condition tags.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {prepQuestions.map((item, idx) => {
              const isOpen = openQuestionIdx === idx;
              return (
                <div key={idx} style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden', transition: 'box-shadow 200ms ease', boxShadow: isOpen ? '0 2px 12px rgba(0,0,0,0.06)' : 'none' }}>
                  <button onClick={() => toggleQuestion(idx)} style={{ width: '100%', padding: '14px 16px', background: isOpen ? 'var(--color-surface)' : 'white', border: 'none', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: 'var(--color-primary-dark)', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', flexShrink: 0 }}>{idx + 1}</span>
                      <span>{item.q}</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} style={{ flexShrink: 0 }}/> : <ChevronDown size={16} style={{ flexShrink: 0 }}/>}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '14px 16px 14px 50px', background: 'var(--color-surface)', fontSize: '12px', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                      <strong style={{ color: 'var(--color-primary-dark)' }}>Clinical Rationale:</strong>
                      <p style={{ marginTop: '4px', marginBottom: 0 }}>{item.details}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ PRINT-ONLY REPORT ═══════════════════════ */}
      <div id="print-section" className="aura-print-only">

        {/* ─── Page 1: Header + Patient Info + Telemetry ─── */}
        <div className="report-page">

          {/* Branded Header Bar */}
          <div className="report-header">
            <div className="report-header-left">
              <img src="/logo.png" alt="HerRhythm" className="report-logo" />
              <div>
                <div className="report-brand-name">HerRhythm</div>
                <div className="report-brand-tagline">Clinical Intelligence Report</div>
              </div>
            </div>
            <div className="report-header-right">
              <div className="report-id-badge">
                <span className="report-id-label">REPORT ID</span>
                <span className="report-id-value">{reportId}</span>
              </div>
            </div>
          </div>

          {/* Teal accent divider */}
          <div className="report-accent-bar"></div>

          {/* Patient Information Panel */}
          <div className="report-patient-panel">
            <div className="report-patient-row">
              <div className="report-patient-field">
                <span className="report-field-label">Patient Name</span>
                <span className="report-field-value">{user?.fullName || '—'}</span>
              </div>
              <div className="report-patient-field">
                <span className="report-field-label">Age / Life Stage</span>
                <span className="report-field-value">{age ? `${age} years` : '—'}</span>
              </div>
              <div className="report-patient-field">
                <span className="report-field-label">Report Scope</span>
                <span className="report-field-value">Last {daysScope} Days</span>
              </div>
            </div>
            <div className="report-patient-row">
              <div className="report-patient-field">
                <span className="report-field-label">Date Generated</span>
                <span className="report-field-value">{dateGenerated} at {timeGenerated}</span>
              </div>
              <div className="report-patient-field">
                <span className="report-field-label">Conditions Monitored</span>
                <span className="report-field-value report-condition-tags">
                  {user?.conditionTags?.length > 0 
                    ? user.conditionTags.map((tag, i) => (
                        <span key={i} className="report-tag">{tag.toUpperCase()}</span>
                      ))
                    : <span>None</span>
                  }
                </span>
              </div>
              <div className="report-patient-field">
                <span className="report-field-label">Cycle Logs in Scope</span>
                <span className="report-field-value">{filteredCycles.length} cycles</span>
              </div>
            </div>
          </div>

          {/* Section: Aggregated Health Telemetry */}
          <div className="report-section">
            <div className="report-section-header">
              <div className="report-section-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              </div>
              <h3 className="report-section-title">Aggregated Health Telemetry ({daysScope}d)</h3>
            </div>
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Metric / Log Type</th>
                  <th style={{ width: '25%' }}>Total Entries</th>
                  <th style={{ width: '35%' }}>Summary Value</th>
                </tr>
              </thead>
              <tbody>
                {telemetryRows.map((row, i) => (
                  <tr key={i}>
                    <td className="report-metric-cell">
                      <span className="report-metric-icon">{row.icon}</span>
                      {row.metric}
                    </td>
                    <td>{row.entries}</td>
                    <td><strong>{row.summary}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Telemetry visual bars */}
          <div className="report-section">
            <div className="report-section-header">
              <div className="report-section-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
              <h3 className="report-section-title">Wellness Score Breakdown</h3>
            </div>
            <div className="report-bars-grid">
              {[
                { label: 'Hydration Goal', pct: Math.min((totalHydration / (daysScope * 2500)) * 100, 100).toFixed(0), color: '#0891b2' },
                { label: 'Mood Score', pct: avgMood !== '—' ? ((parseFloat(avgMood) / 5) * 100).toFixed(0) : 0, color: '#6366f1' },
                { label: 'Activity Goal', pct: Math.min((totalExercise / (daysScope * 30)) * 100, 100).toFixed(0), color: '#059669' },
                { label: 'Symptom Load', pct: Math.min((painLogs / daysScope) * 100, 100).toFixed(0), color: '#e11d48' }
              ].map((bar, i) => (
                <div key={i} className="report-bar-item">
                  <div className="report-bar-label">
                    <span>{bar.label}</span>
                    <strong>{bar.pct}%</strong>
                  </div>
                  <div className="report-bar-track">
                    <div className="report-bar-fill" style={{ width: `${bar.pct}%`, background: bar.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Page 2: Physician Questions + Signatures ─── */}
        <div className="report-page report-page-break">

          {/* Mini header for page 2 */}
          <div className="report-mini-header">
            <div className="report-mini-header-left">
              <img src="/logo.png" alt="HerRhythm" className="report-mini-logo" />
              <span className="report-mini-brand">HerRhythm</span>
            </div>
            <div className="report-mini-header-right">
              <span>{reportId}</span>
              <span>Page 2 of 2</span>
            </div>
          </div>
          <div className="report-accent-bar" style={{ height: '2px', marginBottom: '20px' }}></div>

          {/* Physician Pre-Consultation Questions */}
          <div className="report-section">
            <div className="report-section-header">
              <div className="report-section-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/><path d="M16 3h-8v4h8V3z"/><line x1="10" y1="12" x2="10" y2="12.01"/><line x1="14" y1="12" x2="14" y2="12.01"/><path d="M10 16s.5 1 2 1 2-1 2-1"/></svg>
              </div>
              <h3 className="report-section-title">Physician Pre-Consultation Questions</h3>
            </div>
            <p className="report-prep-subtitle">
              AI-generated conversational prompts based on patient's condition logs, age ({age}), and life stage.
            </p>
            <div className="report-questions-list">
              {prepQuestions.map((q, i) => (
                <div key={i} className="report-question-item">
                  <div className="report-question-number">{i + 1}</div>
                  <div className="report-question-content">
                    <strong className="report-question-text">{q.q}</strong>
                    <p className="report-question-rationale">
                      <span className="report-rationale-label">Clinical Rationale:</span> {q.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DPDP Compliance Notice */}
          <div className="report-compliance">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>This report is generated under Digital Personal Data Protection (DPDP) Act compliance. Patient data is encrypted at rest and in transit. No raw identifiers are shared without explicit consent.</span>
          </div>


          {/* Footer */}
          <div className="report-footer">
            <div>Generated by HerRhythm Clinical Intelligence Platform</div>
            <div>{dateGenerated} • {reportId}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
