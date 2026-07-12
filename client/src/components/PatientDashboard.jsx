import React, { useState } from 'react';
import { 
  Shield, AlertTriangle, Calendar, Plus, Activity, 
  Sparkles, CheckCircle, RefreshCw, Droplet
} from 'lucide-react';

export default function PatientDashboard({
  user,
  dashboardData,
  weeklyData = [],
  pendingOtps,
  redFlagAlert,
  redFlagMessage,
  token,
  API_BASE,
  handleQuickLog,
  handleRoutineToggle,
  handleOtpAction,
  setCurrentView,
  showToast,
  loadPatientDashboard
}) {
  const [painIntensity, setPainIntensity] = useState(0);
  const [waterCups, setWaterCups] = useState(0);
  const [selectedMood, setSelectedMood] = useState(3);
  const [exerciseMin, setExerciseMin] = useState(0);
  const [isSyncingTelemetry, setIsSyncingTelemetry] = useState(false);

  const handleSyncTelemetry = async () => {
    setIsSyncingTelemetry(true);
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/telemetry/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sleepHours: 5.8,
            sleepQuality: 'Poor',
            basalBodyTemp: 36.8,
            hrv: 38,
            source: 'Apple HealthKit'
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Biometrics synced from Apple HealthKit!');
          loadPatientDashboard();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSyncingTelemetry(false);
      }
    }, 1500);
  };

  if (!dashboardData) return <div style={{ padding: '48px', textAlign: 'center' }}>Loading summary dashboard...</div>;

  const { phase, cycleDay, routine, logs, recommendations } = dashboardData;
  // weeklyData arrives as a prop (loaded from /timeline/weekly); the summary
  // endpoint itself does not include weekly aggregates.

  const handleLogSymptom = () => {
    handleQuickLog('symptom', { symptom: 'pain', intensity: painIntensity }, 'Logged pain level');
    setPainIntensity(0);
  };

  const handleLogWater = () => {
    handleQuickLog('hydration', waterCups, 'Logged water intake');
    setWaterCups(0);
  };

  const handleLogExercise = () => {
    handleQuickLog('exercise', exerciseMin, 'Logged exercise minutes');
    setExerciseMin(0);
  };

  return (
    <div className="anim-slide-in">
      {/* Connection/OTP Approvals Panel */}
      {pendingOtps && pendingOtps.length > 0 && (
        <div className="aura-card" style={{ borderLeft: '4px solid var(--color-warning)', background: 'var(--color-surface)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Shield size={24} style={{ color: 'var(--color-warning)', marginTop: '2px', flexShrink: 0 }}/>
            <div style={{ flexGrow: 1 }}>
              <h4 style={{ color: 'var(--color-primary-dark)', margin: '0 0 6px 0' }}>Pending Connection OTP Approvals</h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                A trusted person is attempting to log in and link to your account. Please approve or decline their request.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingOtps.map(req => (
                  <div key={req._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--color-primary-dark)' }}>{req.trustedEmail}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        OTP Code: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.5px', color: 'var(--color-primary)' }}>{req.otpCode}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleOtpAction(req._id, 'approve')} className="aura-btn aura-btn-primary aura-btn-sm" style={{ background: 'var(--color-success)', color: 'white' }}>Approve</button>
                      <button onClick={() => handleOtpAction(req._id, 'reject')} className="aura-btn aura-btn-secondary aura-btn-sm">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Red flag escalations */}
      {redFlagAlert && (
        <div className="aura-alert aura-alert-warning">
          <AlertTriangle size={24}/>
          <div>
            <strong>Safety Escalation Alert</strong>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>{redFlagMessage}</p>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            Hello, {user?.fullName?.split(' ')[0]}! 
            <span className="aura-badge" style={{ background: 'var(--color-accent-light)', color: 'var(--color-primary)', border: '1px solid var(--color-accent)', fontSize: '12px', padding: '4px 10px', borderRadius: '100px', fontWeight: '600' }}>
              Profile
            </span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '4px', fontSize: '15px' }}>
            Welcome to your wellness overview ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
          </p>
        </div>
        <button onClick={() => setCurrentView('cycles')} className="aura-btn aura-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16}/> Set New Goal
        </button>
      </div>

      <div className="aura-dashboard-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Daily Hydration Tracking */}
          <div className="aura-card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--color-primary-dark)', fontSize: '18px', fontWeight: '700' }}>
                <Droplet size={18} style={{ color: 'var(--color-primary)' }}/> Daily Hydration
              </h3>
            </div>
            {/* 3D Hydration Visualizer */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '28px', margin: '24px 0 16px' }}>
              {/* 3D Glass Cylinder */}
              <div style={{
                position: 'relative',
                width: '80px',
                height: '160px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 100%)',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '16px 16px 20px 20px',
                boxShadow: 'inset 0 8px 12px rgba(255,255,255,0.6), inset 0 -8px 12px rgba(0,0,0,0.05), inset 0 0 12px rgba(61,139,147,0.18), 0 8px 24px rgba(31, 38, 135, 0.08)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {/* Cylinder Top Lip Highlight */}
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: '10%',
                  width: '80%',
                  height: '6px',
                  border: '1px solid rgba(255,255,255,0.5)',
                  borderRadius: '50%',
                  zIndex: 4,
                  background: 'rgba(255,255,255,0.1)'
                }} />

                {/* Glossy vertical shine */}
                <div style={{
                  position: 'absolute',
                  top: '5%',
                  left: '8%',
                  width: '6px',
                  height: '90%',
                  background: 'linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 100%)',
                  borderRadius: '3px',
                  zIndex: 5,
                  pointerEvents: 'none'
                }} />

                {/* Cylinder Measurement Markings (ticks) */}
                <div style={{
                  position: 'absolute',
                  right: '6px',
                  top: '15%',
                  height: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  zIndex: 3,
                  pointerEvents: 'none'
                }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ width: i % 2 === 0 ? '6px' : '4px', height: '1.5px', background: 'rgba(61,139,147,0.22)', alignSelf: 'flex-end' }} />
                  ))}
                </div>

                {(() => {
                  const hydrationLogged = logs?.hydration || 0;
                  const goal = 2500; // 2.5 Liters
                  const percent = Math.min((hydrationLogged / goal) * 100, 100);
                  
                  return (
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: `${percent}%`,
                      background: 'linear-gradient(to top, var(--color-primary-dark) 0%, var(--color-primary) 60%, var(--color-accent) 100%)',
                      transition: 'height 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 2,
                    }}>
                      {/* 3D Water Surface Ellipse */}
                      {percent > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '-4px',
                          left: 0,
                          width: '100%',
                          height: '8px',
                          background: 'var(--color-accent)',
                          borderRadius: '50%',
                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.7), 0 1.5px 3px rgba(0,0,0,0.15)',
                          zIndex: 3
                        }} />
                      )}

                      {/* Bubbles */}
                      {percent > 15 && (
                        <>
                          <div className="aura-water-bubble" style={{ position: 'absolute', bottom: '15%', left: '20%', width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'bubbleUp 2.5s infinite' }} />
                          <div className="aura-water-bubble" style={{ position: 'absolute', bottom: '45%', left: '65%', width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'bubbleUp 3.2s infinite' }} />
                          <div className="aura-water-bubble" style={{ position: 'absolute', bottom: '70%', left: '35%', width: '2.5px', height: '2.5px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)', animation: 'bubbleUp 2s infinite' }} />
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Cylinder Bottom Curve Base Overlay */}
                {(() => {
                  const hydrationLogged = logs?.hydration || 0;
                  const goal = 2500;
                  const percent = Math.min((hydrationLogged / goal) * 100, 100);
                  return (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height: '14px',
                      background: percent > 3 ? 'var(--color-primary-dark)' : 'transparent',
                      borderRadius: '0 0 18px 18px',
                      zIndex: 3,
                      pointerEvents: 'none',
                      opacity: 0.9,
                      boxShadow: percent > 3 ? 'inset 0 -4px 5px rgba(0,0,0,0.25)' : 'none'
                    }} />
                  );
                })()}
              </div>

              {/* Stats and status on the right */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                {(() => {
                  const hydrationLogged = logs?.hydration || 0;
                  const goal = 2500;
                  const percent = Math.min((hydrationLogged / goal) * 100, 100);
                  
                  let statusMsg = 'Start Hydrating';
                  let statusColor = 'var(--color-text-muted)';
                  if (percent > 0 && percent < 40) {
                    statusMsg = 'Hydrating';
                    statusColor = 'var(--color-primary)';
                  } else if (percent >= 40 && percent < 80) {
                    statusMsg = 'Optimal Level';
                    statusColor = 'var(--color-success)';
                  } else if (percent >= 80) {
                    statusMsg = 'Goal Met!';
                    statusColor = 'var(--color-primary-dark)';
                  }

                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '36px', fontWeight: '800', color: 'var(--color-primary-dark)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                          {Math.round(percent)}%
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: '700', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em', 
                        color: statusColor,
                        background: 'var(--color-accent-light)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        width: 'fit-content'
                      }}>
                        {statusMsg}
                      </span>
                      <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                        {((logs?.hydration || 0) / 1000).toFixed(1)} / 2.5 L
                      </strong>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                        Daily Goal (2.5L)
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Bottles row */}
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '8px', marginBottom: '20px', padding: '0 8px' }}>
              {[
                { time: '9:00 AM', ml: 625 },
                { time: '11:30 AM', ml: 1250 },
                { time: '1:45 PM', ml: 1875 },
                { time: '3:30 PM', ml: 2500 }
              ].map((item, idx) => {
                const hydrationLogged = logs?.hydration || 0;
                const isFilled = hydrationLogged >= item.ml;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <svg width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="7" y="2" width="10" height="4" rx="1" fill={isFilled ? 'var(--color-primary)' : 'var(--color-border-focus)'} />
                      <rect x="4" y="6" width="16" height="32" rx="4" fill={isFilled ? 'var(--color-accent-light)' : 'var(--color-white)'} stroke={isFilled ? 'var(--color-primary)' : 'var(--color-border)'} strokeWidth="1.5" />
                      {isFilled && (
                        <rect x="5.5" y="16" width="13" height="20" rx="2.5" fill="var(--color-primary)" opacity="0.8"/>
                      )}
                    </svg>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '500' }}>{item.time}</span>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => handleQuickLog('hydration', 250, 'Logged +250ml water intake')}
              className="aura-btn aura-btn-primary" 
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Plus size={16}/> Log +250ml Water
            </button>
          </div>

          {/* Quick Log Health Metrics */}
          <div className="aura-card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--color-primary-dark)', fontSize: '18px', fontWeight: '700' }}>
              <Activity size={18} style={{ color: 'var(--color-accent)' }}/> Quick Health Logging
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: '20px' }}>
              Easily log symptoms, mood state, and physical activity metrics.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Mood Logging */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Mood State (1 - Very Low to 5 - Very High)</label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '4px' }}>
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = selectedMood === val;
                    const stroke = isSelected ? 'var(--color-primary-dark)' : 'var(--color-text-muted)';
                    const fill = isSelected ? 'var(--color-accent-light)' : 'none';
                    const strokeWidth = 2;

                    const renderMoodVector = () => {
                      switch(val) {
                        case 1: // Very Sad
                          return (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}>
                              <circle cx="12" cy="12" r="10" />
                              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                              <path d="M16 17a4 4 0 0 0-8 0" />
                            </svg>
                          );
                        case 2: // Sad
                          return (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}>
                              <circle cx="12" cy="12" r="10" />
                              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                              <path d="M16 16a2 2 0 0 0-8 0" />
                            </svg>
                          );
                        case 3: // Neutral
                          return (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}>
                              <circle cx="12" cy="12" r="10" />
                              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                              <line x1="8" y1="15" x2="16" y2="15" />
                            </svg>
                          );
                        case 4: // Happy
                          return (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}>
                              <circle cx="12" cy="12" r="10" />
                              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                              <path d="M8 15a4 4 0 0 0 8 0" />
                            </svg>
                          );
                        case 5: // Very Happy
                          return (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}>
                              <circle cx="12" cy="12" r="10" />
                              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                              <path d="M8 14a4 4 0 0 0 8 0" fill={isSelected ? 'var(--color-primary)' : 'none'} />
                              <line x1="8" y1="14" x2="16" y2="14" />
                            </svg>
                          );
                        default:
                          return null;
                      }
                    };

                    return (
                      <button 
                        key={val} 
                        type="button"
                        onClick={() => setSelectedMood(val)}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          background: isSelected ? 'var(--color-accent-light)' : 'var(--color-surface)',
                          border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 200ms ease'
                        }}
                        title={`Mood ${val}`}
                      >
                        {renderMoodVector()}
                      </button>
                    );
                  })}
                </div>
                <button 
                  onClick={() => {
                    handleQuickLog('mood', selectedMood, 'Logged mood state');
                    showToast('Mood logged successfully!');
                  }} 
                  className="aura-btn aura-btn-secondary aura-btn-sm" 
                  style={{ width: '100%', marginTop: '6px', justifyContent: 'center' }}
                >
                  Save Mood
                </button>
              </div>

              {/* Pain Intensity Logging */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Pain Intensity ({painIntensity}/10)</label>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    {painIntensity === 0 ? 'No Pain' : painIntensity <= 3 ? 'Mild' : painIntensity <= 7 ? 'Moderate' : 'Severe'}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  className="aura-input" 
                  style={{ padding: 0, height: '6px', background: 'var(--color-border)', borderRadius: '3px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                  value={painIntensity} 
                  onChange={e => setPainIntensity(Number(e.target.value))}
                />
                <button 
                  onClick={handleLogSymptom} 
                  className="aura-btn aura-btn-secondary aura-btn-sm" 
                  style={{ width: '100%', marginTop: '4px', justifyContent: 'center' }}
                >
                  Save Pain Level
                </button>
              </div>

              {/* Exercise Minutes Logging */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Exercise Minutes Today</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    min="0" 
                    max="300"
                    className="aura-input" 
                    placeholder="Minutes"
                    value={exerciseMin || ''} 
                    onChange={e => setExerciseMin(Number(e.target.value))}
                    style={{ flexGrow: 1, height: '36px' }}
                  />
                  <button 
                    onClick={handleLogExercise} 
                    className="aura-btn aura-btn-primary aura-btn-sm" 
                    style={{ height: '36px', whiteSpace: 'nowrap' }}
                  >
                    Save Minutes
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Cycle Insights Summary */}
          <div className="aura-card" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 6%, white), color-mix(in srgb, var(--color-accent) 8%, white))', border: '1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              <h3 style={{ margin: 0, color: 'var(--color-primary-dark)', fontSize: '15px', fontWeight: '700' }}>Cycle Insights</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Current Phase', value: phase ? phase.charAt(0).toUpperCase() + phase.slice(1) : '—', color: 'var(--color-primary)' },
                { label: 'Cycle Day', value: cycleDay ? `Day ${cycleDay}` : '—', color: 'var(--color-accent)' },
                { label: 'Avg Cycle Length', value: `${dashboardData?.avgCycleLength || 28} days`, color: 'var(--color-primary-dark)' },
                { label: 'Logged Symptoms', value: `${dashboardData?.symptomsToday || 0} today`, color: 'var(--color-text-primary)' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '500' }}>{item.label}</span>
                  <strong style={{ fontSize: '13px', color: item.color, fontWeight: '700' }}>{item.value}</strong>
                </div>
              ))}
            </div>
            <button onClick={() => setCurrentView('cycles')} className="aura-btn aura-btn-secondary aura-btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '12px', background: 'rgba(255,255,255,0.8)', border: '1px solid var(--color-border)' }}>
              View Full Cycle History
            </button>
          </div>

          {/* Wearable Telemetry Sync Widget */}
          <div className="aura-card" style={{ borderLeft: '4px solid var(--color-primary)', background: 'var(--color-surface)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Activity size={18} style={{ color: 'var(--color-primary)' }}/>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Wearable Sync</h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              Sync Apple HealthKit or Google Health Connect metrics to recalculate daily restorative actions.
            </p>
            
            {isSyncingTelemetry ? (
              <div style={{ padding: '16px', textAlign: 'center', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
                <div className="anim-pulse-orb" style={{ width: '16px', height: '16px', margin: '0 auto 8px auto', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
                <strong style={{ color: 'var(--color-primary-dark)' }}>Connecting Health SDKs...</strong>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {user?.telemetryLogs && user.telemetryLogs.length > 0 && (
                  <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Sleep Sync:</span>
                      <strong>{user.telemetryLogs[user.telemetryLogs.length - 1].sleepHours}h ({user.telemetryLogs[user.telemetryLogs.length - 1].sleepQuality})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Avg HRV Score:</span>
                      <strong>{user.telemetryLogs[user.telemetryLogs.length - 1].hrv} ms</strong>
                    </div>
                  </div>
                )}
                <button onClick={handleSyncTelemetry} className="aura-btn aura-btn-primary aura-btn-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <RefreshCw size={12}/> Sync Telemetry Metrics
                </button>
              </div>
            )}
          </div>

          {/* Streak & Unique Connection ID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="aura-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px', textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>
                7
              </div>
              <strong style={{ fontSize: '11px' }}>7 Day Streak</strong>
            </div>

            <div className="aura-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <strong style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Connection ID</strong>
              <code style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.uniqueShareId || 'Not Generated'}
              </code>
              <button 
                onClick={() => {
                  if (user?.uniqueShareId) {
                    navigator.clipboard.writeText(user.uniqueShareId);
                    showToast('Copied Share ID!');
                  }
                }} 
                className="aura-btn aura-btn-secondary aura-btn-sm" 
                style={{ padding: 0, height: '22px', background: 'white', marginTop: '6px', fontSize: '10px' }}
              >
                Copy Code
              </button>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Cycle Phase Timeline */}
          <div className="aura-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--color-primary-dark)', fontSize: '18px', fontWeight: '700' }}>
                  <Calendar size={18} style={{ color: 'var(--color-primary)' }}/> Cycle Phase Timeline
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Cycle Progress</span>
              </div>
              <span style={{ color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>•••</span>
            </div>

            {/* Progress timeline */}
            <div style={{ margin: '50px 0 20px 0', padding: '0 20px', position: 'relative' }}>
              <div style={{ height: '8px', background: 'var(--color-accent-light)', borderRadius: '4px', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  height: '100%',
                  background: 'var(--color-primary)',
                  borderRadius: '4px',
                  width: `${Math.min((cycleDay / 28) * 100, 100)}%`,
                  zIndex: 1
                }}/>

                {/* Node 1: Period - Day 1 */}
                <div style={{ position: 'absolute', left: '0%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: phase === 'menstrual' ? 'var(--color-primary)' : 'var(--color-border-focus)', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}/>
                  {phase === 'menstrual' && (
                    <span style={{ position: 'absolute', top: '-30px', background: 'var(--color-primary)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                      Menstrual
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: '600' }}>Day 1</span>
                </div>

                {/* Node 2: Follicular - Day 6 */}
                <div style={{ position: 'absolute', left: '18%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: phase === 'follicular' ? 'var(--color-primary)' : 'var(--color-border-focus)', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}/>
                  {phase === 'follicular' && (
                    <span style={{ position: 'absolute', top: '-30px', background: 'var(--color-primary)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                      Follicular
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: '600' }}>Day 6</span>
                </div>

                {/* Node 3: Ovulatory - Day 14 */}
                <div style={{ position: 'absolute', left: '46%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: phase === 'ovulatory' ? 'var(--color-primary)' : 'var(--color-border-focus)', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}/>
                  {phase === 'ovulatory' && (
                    <span style={{ position: 'absolute', top: '-30px', background: 'var(--color-primary)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                      Ovulatory
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: '600' }}>Day 14</span>
                </div>

                {/* Node 4: Luteal - Day 15-28 */}
                <div style={{ position: 'absolute', left: '80%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: phase === 'luteal' ? 'var(--color-primary)' : 'var(--color-border-focus)', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}/>
                  {phase === 'luteal' && (
                    <span style={{ position: 'absolute', top: '-30px', background: 'var(--color-primary)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                      Luteal
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: '600' }}>Day 22</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                <span>Oct 3</span>
                <span>Day 6</span>
                <span>Day 9</span>
                <span>Day 14</span>
                <span>Day 15</span>
                <span>Day 18</span>
                <span>Day 24</span>
                <span>Day 1</span>
              </div>
            </div>
          </div>

          {/* Bottom Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="aura-dashboard-subgrid-responsive">
            
            {/* Activity Summary line chart */}
            <div className="aura-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--color-primary-dark)', fontSize: '16px', fontWeight: '700' }}>
                    <Activity size={16} style={{ color: 'var(--color-primary)' }}/> Activity Summary
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Activity Minutes</span>
                </div>
                <span style={{ color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>•••</span>
              </div>

              <div style={{ margin: '12px 0 16px 0', position: 'relative' }}>
                {(() => {
                  const maxAct = Math.max(...weeklyData.map(a => a.exercise), 30);
                  const actPoints = weeklyData.map((a, idx) => {
                    const x = 10 + idx * 30;
                    const y = 90 - (a.exercise / maxAct) * 70;
                    return { x, y, val: a.exercise, label: a.label };
                  });

                  let pathD = '';
                  if (actPoints.length > 0) {
                    pathD = `M ${actPoints[0].x} ${actPoints[0].y}`;
                    for (let i = 0; i < actPoints.length - 1; i++) {
                      const p0 = actPoints[i];
                      const p1 = actPoints[i + 1];
                      const cpX1 = p0.x + 15;
                      const cpY1 = p0.y;
                      const cpX2 = p1.x - 15;
                      const cpY2 = p1.y;
                      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
                    }
                  }
                  const areaD = pathD ? `${pathD} L 190 95 L 10 95 Z` : '';

                  return (
                    <>
                      <svg width="100%" height="100" viewBox="0 0 200 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        <line x1="0" y1="20" x2="200" y2="20" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2 2" />
                        <line x1="0" y1="50" x2="200" y2="50" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2 2" />
                        <line x1="0" y1="80" x2="200" y2="80" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2 2" />

                        {areaD && <path d={areaD} fill="url(#chart-grad)" />}
                        {pathD && (
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="var(--color-primary)" 
                            strokeWidth="2.5" 
                            strokeLinecap="round"
                          />
                        )}

                        {actPoints.map((p, idx) => (
                          <circle 
                            key={idx} 
                            cx={p.x} 
                            cy={p.y} 
                            r="3.5" 
                            fill="var(--color-primary)" 
                            stroke="white" 
                            strokeWidth="1"
                            title={`${p.val} minutes`}
                          />
                        ))}
                      </svg>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '4px', padding: '0 4px' }}>
                        {actPoints.map((p, idx) => (
                          <span key={idx} style={{ width: '22px', textAlign: 'center' }}>
                            {p.label.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              <button onClick={() => setCurrentView('timeline')} className="aura-btn aura-btn-secondary aura-btn-sm" style={{ width: '100%', justifyContent: 'center', background: 'var(--color-accent-light)', border: 'none', color: 'var(--color-primary-dark)' }}>
                View Activity Timeline
              </button>
            </div>

            {/* Next check in and Community insights stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
              {/* Next Check-in */}
              <div className="aura-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--color-primary-dark)', fontSize: '14px' }}>Next Check-in</strong>
                  <span style={{ background: 'var(--color-accent-light)', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--color-primary)' }}>••</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  Welcome to your wellness overview (Oct 16, 2023)
                </p>
                <button onClick={() => setCurrentView('timeline')} className="aura-btn aura-btn-primary aura-btn-sm" style={{ width: '100%', justifyContent: 'center', height: '32px' }}>
                  Log Entry
                </button>
              </div>

              {/* Community Insights */}
              <div className="aura-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <strong style={{ color: 'var(--color-primary-dark)', fontSize: '14px' }}>Community Insights</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  Join thousands of HerRhythm members sharing advice, symptoms, and coping strategies in our anonymous peer support channels.
                </p>
                <button onClick={() => setCurrentView('forum')} className="aura-btn aura-btn-primary aura-btn-sm" style={{ width: '100%', justifyContent: 'center', height: '32px' }}>
                  Explore Forum
                </button>
              </div>
            </div>

            {/* Personalized AI Wellness Tips */}
            <div className="aura-card" style={{ borderLeft: '4px solid var(--color-primary)', background: 'linear-gradient(135deg, white, var(--color-accent-light))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ background: 'var(--color-primary-light)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} style={{ color: 'var(--color-primary)' }}/>
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--color-primary-dark)', fontSize: '16px', fontWeight: '700' }}>Personalized AI Wellness Tips</h3>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Based on your recent patterns:</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {recommendations && recommendations.length > 0 ? (
                  recommendations.slice(0, 2).map((rec, i) => (
                    <div key={i} style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--color-text-primary)', borderBottom: i === 0 ? '1px solid var(--color-border)' : 'none', paddingBottom: i === 0 ? '12px' : 0 }}>
                      <strong>Tip {i + 1}:</strong> {rec.description} <a onClick={() => setCurrentView('luna')} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }}>(Read More)</a>
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                      <strong>Tip 1:</strong> Prioritize 7-8 hours of restful sleep to boost mood and energy levels. <a onClick={() => setCurrentView('luna')} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }}>(Read More)</a>
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--color-text-primary)' }}>
                      <strong>Tip 2:</strong> Add hydration-rich foods (cucumber, celery) during the Luteal phase. <a onClick={() => setCurrentView('reports')} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }}>(View List)</a>
                    </div>
                  </>
                )}
              </div>

              <button onClick={() => setCurrentView('luna')} className="aura-btn aura-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                View Tips
              </button>
            </div>

          </div>

          {/* AI Daily Routine Checklist */}
          <div className="aura-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--color-primary-dark)', fontSize: '16px', fontWeight: '700' }}>
              <CheckCircle size={18} style={{ color: 'var(--color-primary)' }}/> AI Daily Routine Checklist
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: '16px' }}>
              Customized checklist for your {phase?.toUpperCase()} phase and active symptoms.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {routine?.items && routine.items.length > 0 ? (
                routine.items.map(item => (
                  <label 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '12px', 
                      padding: '12px', 
                      background: item.completed ? 'var(--color-accent-light)' : 'white', 
                      border: '1px solid var(--color-border)', 
                      borderLeft: item.completed ? '4px solid var(--color-success)' : '4px solid var(--color-primary)',
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 200ms ease'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={item.completed} 
                      onChange={() => handleRoutineToggle(routine._id, item.id, item.completed)} 
                      style={{ marginTop: '3px', accentColor: 'var(--color-primary)' }}
                    />
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        color: item.completed ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                        textDecoration: item.completed ? 'line-through' : 'none'
                      }}>
                        {item.title}
                      </span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                        {item.description}
                      </p>
                    </div>
                  </label>
                ))
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                  No routine checklist items generated for today.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
