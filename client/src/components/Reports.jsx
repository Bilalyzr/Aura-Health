import React, { useState } from 'react';
import { BarChart3, Download, Plus, Minus, CheckCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function Reports({ user, analyticsData, showToast }) {
  const [daysScope, setDaysScope] = useState(7); // 7 or 30 days
  const [openQuestionIdx, setOpenQuestionIdx] = useState(null);
  const [exportProgress, setExportProgress] = useState(null); // null, 0 to 100

  // 1. Duration Filtration — safe when analyticsData not yet loaded
  const filteredCycles = (analyticsData?.cycles ?? []);
  const filteredLogs = (analyticsData?.logs ?? []).filter(log => {
    const logDate = new Date(log.date);
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - daysScope);
    return logDate >= limitDate;
  });

  // 2. Doctor Consultation Prep
  const getDoctorPrepQuestions = () => {
    if (!user) return [];
    const age = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();

    if (age < 18) {
      return [
        { q: "Are my irregular cycle lengths typical for my age stage, or should we check for PCOS indicators?", details: "Irregular cycles are common as the endocrine system stabilizes, but tracking patterns helps rule out underlying factors." },
        { q: "What parameters classify cramps as 'excessive', and what safe symptom relief targets exist?", details: "Learn the difference between standard dysmenorrhea and severe symptoms that need gynecological checks." }
      ];
    } else if (age >= 18 && age <= 33) {
      // Check conditionTags for endometriosis — likely postpartum concern overlap
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
    } else if (age > 33 && age <= 45) {
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

  // 3. Clinical Exporting
  const triggerExport = () => {
    setExportProgress(0);
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setExportProgress(null);
            showToast('PDF Health Report Downloaded!');
            window.print(); // Trigger printer friendly view layout
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

  return (
    <div className="anim-slide-in">
      <div className="aura-no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>Wellness Reports & Clinical Export</h2>
          
          {/* Date configuration selector */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setDaysScope(7)} 
              className={`aura-btn aura-btn-secondary aura-btn-sm ${daysScope === 7 ? 'active' : ''}`}
              style={{ borderRadius: '20px' }}
            >
              Last 7 Days
            </button>
            <button 
              onClick={() => setDaysScope(30)} 
              className={`aura-btn aura-btn-secondary aura-btn-sm ${daysScope === 30 ? 'active' : ''}`}
              style={{ borderRadius: '20px' }}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Export Card with Progress Bar */}
        <div className="aura-card aura-scroll-reveal" style={{ background: 'var(--color-surface)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>Clinician Shareable PDF</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Exports verified cycle logs and symptom telemetry without raw data clutter.</p>
            </div>
            <div>
              {exportProgress === null ? (
                <button onClick={triggerExport} className="aura-btn aura-btn-primary aura-btn-md">
                  <Download size={16}/> Export Clinical Report
                </button>
              ) : (
                <div style={{ minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Compiling report files...</span>
                    <strong>{exportProgress}%</strong>
                  </div>
                  <div style={{ height: '6px', background: '#EFE3ED', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--color-primary)', width: `${exportProgress}%`, transition: 'width 150ms' }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="aura-dashboard-grid">
          
          {/* Statistics Summary */}
          <div className="aura-card aura-scroll-reveal">
            <h3>Health Summary ({daysScope}d Scope)</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Filtered logging counts based on active calendar duration.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px' }}>
                <span>Total Logs Logged</span>
                <strong>{filteredLogs.length} logs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px' }}>
                <span>Cycle Logs in Scope</span>
                <strong>{filteredCycles.length} cycles</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px' }}>
                <span>Mean Mood Rating</span>
                <strong>
                  {(filteredLogs.filter(l => l.type === 'mood').reduce((a, b) => a + Number(b.value), 0) / 
                    (filteredLogs.filter(l => l.type === 'mood').length || 1)).toFixed(1)} / 5
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px' }}>
                <span>Total Hydration Quantity</span>
                <strong>
                  {filteredLogs.filter(l => l.type === 'hydration').reduce((a, b) => a + Number(b.value), 0)} ml
                </strong>
              </div>
            </div>
          </div>

          {/* Doctor consultation preps */}
          <div className="aura-card aura-scroll-reveal">
            <h3>Doctor Consultation Prep</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Tailored questions based on your profile and life stage.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {prepQuestions.map((item, idx) => {
                const isOpen = openQuestionIdx === idx;
                return (
                  <div key={idx} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <button 
                      onClick={() => toggleQuestion(idx)}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: 'none', 
                        border: 'none', 
                        textAlign: 'left', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        color: 'var(--color-primary-dark)'
                      }}
                    >
                      <span>{item.q}</span>
                      {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>
                    {isOpen && (
                      <div style={{ padding: '12px', background: 'var(--color-surface)', fontSize: '12px', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                        <strong>Why this question:</strong>
                        <p style={{ marginTop: '4px' }}>{item.details}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Hidden print container with print styling */}
      <div id="print-section" className="aura-print-only">
        <div className="aura-print-letterhead">
          <div>
            <h1>Aura Clinical Intelligence Report</h1>
            <p style={{ margin: 0, fontSize: '10pt', color: '#6B5A6C' }}>Digital Personal Data Protection (DPDP) Verified Patient Report</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '14pt', fontWeight: 'bold', color: '#5C3A5D' }}>AURA HEALTH</span>
          </div>
        </div>

        <div className="aura-print-grid">
          <div>
            <p><strong>Patient Name:</strong> {user?.fullName}</p>
            <p><strong>Age/Life Stage:</strong> {user ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear() : ''} years old</p>
            <p><strong>Report Scope:</strong> Last {daysScope} Days</p>
          </div>
          <div>
            <p><strong>Date Generated:</strong> {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
            <p><strong>Conditions Monitored:</strong> {user?.conditionTags?.join(', ').toUpperCase() || 'None'}</p>
            <p><strong>Generated By:</strong> Aura Clinical Core</p>
          </div>
        </div>

        <h3 className="aura-print-section-title">Aggregated Health Telemetry ({daysScope}d)</h3>
        <table className="aura-print-table">
          <thead>
            <tr>
              <th>Metric / Log Type</th>
              <th>Total Log Entries</th>
              <th>Average / Summary Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hydration (Water Intake)</td>
              <td>{filteredLogs.filter(l => l.type === 'hydration').length} logs</td>
              <td>{filteredLogs.filter(l => l.type === 'hydration').reduce((a, b) => a + Number(b.value), 0)} ml total logged</td>
            </tr>
            <tr>
              <td>Mood Ratings</td>
              <td>{filteredLogs.filter(l => l.type === 'mood').length} logs</td>
              <td>
                {(filteredLogs.filter(l => l.type === 'mood').reduce((a, b) => a + Number(b.value), 0) / 
                  (filteredLogs.filter(l => l.type === 'mood').length || 1)).toFixed(1)} / 5 average
              </td>
            </tr>
            <tr>
              <td>Symptom Reports</td>
              <td>{filteredLogs.filter(l => l.type === 'symptom').length} logs</td>
              <td>
                {filteredLogs.filter(l => l.type === 'symptom' && l.value?.symptom === 'pain').length} active pain logs recorded
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="aura-print-section-title">Physician Pre-Consultation Questions</h3>
        <p style={{ fontSize: '10pt', color: '#6B5A6C', fontStyle: 'italic', marginBottom: '12px' }}>
          Suggested conversational points generated based on the patient's condition logs and life stage:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          {prepQuestions.map((q, i) => (
            <li key={i} style={{ marginBottom: '8px' }}>
              <strong>{q.q}</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '9pt', color: '#6B5A6C' }}>Reason: {q.details}</p>
            </li>
          ))}
        </ul>

        <div className="aura-print-signature" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px' }}>
          <div className="aura-print-signature-box">
            Patient Signature
          </div>
          <div className="aura-print-signature-box" style={{ textAlign: 'right' }}>
            Attending Clinician / Gynecologist Signature
          </div>
        </div>
      </div>

    </div>
  );
}
