import React, { useState, useEffect } from 'react';
import { Users, Key, Eye, ToggleLeft, ToggleRight, Check, ShoppingBag, Truck, Heart, Sparkles, Send, Flame } from 'lucide-react';

export default function PartnerRoom({ token, API_BASE, user, dashboardData, consents, handleGrantConsent, handleRevokeConsent, showToast }) {
  const [pairingKey, setPairingKey] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [orders, setOrders] = useState([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [sendingNudgeType, setSendingNudgeType] = useState(null);
  
  // Unbundled Consent States
  const [shareCycle, setShareCycle] = useState(true);
  const [shareHydration, setShareHydration] = useState(true);
  const [shareMood, setShareMood] = useState(false);
  const [shareSymptoms, setShareSymptoms] = useState(true);

  const isLinked = user?.linkedAccounts && user.linkedAccounts.length > 0;
  const linkedUser = isLinked ? user.linkedAccounts[0] : null;

  // Fetch active pairing key or generate on mount (if patient)
  useEffect(() => {
    if (user?.userType === 'patient' && !isLinked) {
      loadPairingKey();
    }
    if (isLinked) {
      loadOrders();
    }
  }, [user, isLinked]);

  const loadPairingKey = async () => {
    try {
      const res = await fetch(`${API_BASE}/partner/pairing-key`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPairingKey(data.pairingKey);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/partner/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const placeOrder = async (itemName, price) => {
    if (!linkedUser) return;
    setIsPlacingOrder(true);
    try {
      const res = await fetch(`${API_BASE}/partner/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemName,
          price,
          patientId: user.userType === 'patient' ? user._id : (linkedUser.userId?._id || linkedUser.userId)
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Ordered: ${itemName}!`);
        loadOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleSendNudge = async (type, label) => {
    if (!linkedUser) return;
    setSendingNudgeType(type);
    try {
      const res = await fetch(`${API_BASE}/partner/nudges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          message: `${user.fullName} sent you a ${label}: "Thinking of you today!" ❤️`,
          receiverId: linkedUser.userId?._id || linkedUser.userId
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${label} Sent!`);
      }
    } catch (err) {
      console.error("Nudge error:", err);
    } finally {
      setSendingNudgeType(null);
    }
  };

  const renderEmpathyGuidance = () => {
    const phase = dashboardData?.phase || 'follicular';
    let tipTitle = "";
    let tipText = "";
    
    if (phase === 'menstrual') {
      tipTitle = "❤️ Menstrual Phase (Low Estrogen)";
      tipText = "Her energy levels are at their lowest right now, and physical cramping is likely. Avoid scheduling high-energy outings. Offer deep reassurance, prepare warm beverages, or order the Spearmint Relief Tea & Hot Pack.";
    } else if (phase === 'follicular') {
      tipTitle = "🌸 Follicular Phase (Rising Estrogen)";
      tipText = "Estrogen is surging, bringing high energy, communication confidence, and cognitive focus. This is a wonderful window to plan active dates, collaborative projects, or try new things together.";
    } else if (phase === 'ovulatory') {
      tipTitle = "✨ Ovulatory Phase (Peak Estrogen & Testosterone)";
      tipText = "Peak physical energy and positive social confidence. Support her by planning outgoing activities, high-engagement exercises, or scheduling quality time together.";
    } else {
      tipTitle = "🌙 Luteal Phase / PMS Window";
      tipText = "Progesterone dominates, which can trigger mood sensitivities, premenstrual anxiety, or sleep disturbances (especially in PMDD). Avoid high-sodium meals, offer a comforting ear, and give plenty of reassurance.";
    }

    return (
      <div className="aura-card" style={{ background: 'var(--color-accent-light)', borderLeft: '4px solid var(--color-accent)', padding: '16px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary-dark)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--color-accent)' }}/> Empathy Support Tip
        </h4>
        <strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px', color: 'var(--color-primary-dark)' }}>{tipTitle}</strong>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4', margin: 0 }}>{tipText}</p>
      </div>
    );
  };

  const renderOrderStepper = (status) => {
    let step = 1;
    if (status.includes('Dispatched')) step = 2;
    if (status.includes('Courier')) step = 3;
    if (status.includes('Delivered')) step = 4;

    return (
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)' }}>
          <span style={{ fontWeight: step >= 1 ? 'bold' : 'normal', color: step >= 1 ? 'var(--color-primary)' : 'inherit' }}>Ordered</span>
          <span style={{ fontWeight: step >= 2 ? 'bold' : 'normal', color: step >= 2 ? 'var(--color-primary)' : 'inherit' }}>Prepared</span>
          <span style={{ fontWeight: step >= 3 ? 'bold' : 'normal', color: step >= 3 ? 'var(--color-primary)' : 'inherit' }}>Out for Delivery</span>
          <span style={{ fontWeight: step >= 4 ? 'bold' : 'normal', color: step >= 4 ? 'var(--color-success)' : 'inherit' }}>Delivered</span>
        </div>
        <div style={{ height: '6px', background: '#EFE3ED', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              background: step === 4 ? 'var(--color-success)' : 'var(--color-primary)', 
              width: `${(step / 4) * 100}%`,
              transition: 'width 300ms ease'
            }}
          ></div>
        </div>
      </div>
    );
  };

  const handlePairSubmit = (e) => {
    e.preventDefault();
    if (!partnerEmail) return;
    
    const scopes = [];
    if (shareCycle) scopes.push('cycle_phase');
    if (shareHydration) scopes.push('hydration');
    if (shareMood) scopes.push('mood_summary');
    if (shareSymptoms) scopes.push('red_flags');

    handleGrantConsent(partnerEmail, scopes);
    setPartnerEmail('');
  };

  // Mock Partner Dashboard Sync Simulation
  const renderSyncSimulator = () => {
    const logs = dashboardData?.logs || {};
    const phase = dashboardData?.phase || 'follicular';
    const day = dashboardData?.cycleDay || 10;

    return (
      <div 
        className="aura-card aura-glass" 
        style={{ 
          border: '1px solid var(--color-primary-border-translucent)', 
          background: 'rgba(255, 255, 255, 0.8)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
          <strong style={{ fontSize: '13px', color: 'var(--color-primary-dark)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            <Eye size={14} style={{ verticalAlign: 'text-top', marginRight: '4px' }}/> Rohan's Dashboard (Simulator Preview)
          </strong>
          <span className="aura-badge aura-badge-success" style={{ fontSize: '9px' }}>Live Sync</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          
          <div style={{ padding: '10px', background: shareCycle ? 'var(--color-surface)' : '#FDF1E6', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Cycle status</strong>
              {shareCycle ? <span className="aura-badge aura-badge-primary" style={{ fontSize: '9px' }}>Shared</span> : <span className="aura-badge aura-badge-error" style={{ fontSize: '9px' }}>Hidden</span>}
            </div>
            <p style={{ marginTop: '4px', fontSize: '12px', color: shareCycle ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontStyle: shareCycle ? 'normal' : 'italic' }}>
              {shareCycle ? `Current phase: ${phase.toUpperCase()} (Day ${day})` : '⚠ Cycle data scope access revoked.'}
            </p>
          </div>

          <div style={{ padding: '10px', background: shareHydration ? 'var(--color-surface)' : '#FDF1E6', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Hydration logs</strong>
              {shareHydration ? <span className="aura-badge aura-badge-primary" style={{ fontSize: '9px' }}>Shared</span> : <span className="aura-badge aura-badge-error" style={{ fontSize: '9px' }}>Hidden</span>}
            </div>
            <p style={{ marginTop: '4px', fontSize: '12px', color: shareHydration ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontStyle: shareHydration ? 'normal' : 'italic' }}>
              {shareHydration ? `Logged today: ${logs.hydration || 0} ml of water.` : '⚠ Hydration data scope access revoked.'}
            </p>
          </div>

          <div style={{ padding: '10px', background: shareMood ? 'var(--color-surface)' : '#FDF1E6', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Mood trends</strong>
              {shareMood ? <span className="aura-badge aura-badge-primary" style={{ fontSize: '9px' }}>Shared</span> : <span className="aura-badge aura-badge-error" style={{ fontSize: '9px' }}>Hidden</span>}
            </div>
            <p style={{ marginTop: '4px', fontSize: '12px', color: shareMood ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontStyle: shareMood ? 'normal' : 'italic' }}>
              {shareMood ? `Today's Mood: ${logs.mood ? `${logs.mood}/5 rating` : 'None logged today'}` : '⚠ Mood data scope access revoked.'}
            </p>
          </div>

          <div style={{ padding: '10px', background: shareSymptoms ? 'var(--color-surface)' : '#FDF1E6', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Symptom Warning Alerts</strong>
              {shareSymptoms ? <span className="aura-badge aura-badge-primary" style={{ fontSize: '9px' }}>Shared</span> : <span className="aura-badge aura-badge-error" style={{ fontSize: '9px' }}>Hidden</span>}
            </div>
            <p style={{ marginTop: '4px', fontSize: '12px', color: shareSymptoms ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontStyle: shareSymptoms ? 'normal' : 'italic' }}>
              {shareSymptoms ? (
                dashboardData?.redFlagAlert 
                  ? `🚨 Warning: ${dashboardData.redFlagMessage}` 
                  : '✓ No critical warnings logged.'
              ) : '⚠ Warning data scopes revoked.'}
            </p>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="anim-slide-in">
      <h2>Partner Connection Room</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Configure access parameters and sync your health dashboard live with your partner.</p>

      {!isLinked ? (
        // Pairing Page
        <div className="aura-dashboard-grid">
          
          {/* pairing key generator */}
          <div className="aura-card">
            <h3>Link Partner Connection</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Provide your Unique Connection ID to your partner to configure paired sync sync accounts securely.</p>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--color-surface)', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <code style={{ fontSize: '14px', fontWeight: 'bold', flexGrow: 1, fontFamily: 'monospace', color: 'var(--color-primary-dark)' }}>
                {user?.uniqueShareId || 'Not Generated Yet'}
              </code>
              <button 
                onClick={() => {
                  if (user?.uniqueShareId) {
                    navigator.clipboard.writeText(user.uniqueShareId);
                    showToast('Copied Connection ID!');
                  }
                }} 
                className="aura-btn aura-btn-secondary aura-btn-sm" 
                style={{ height: '32px', background: 'white' }}
              >
                Copy
              </button>
            </div>

            <form onSubmit={handlePairSubmit} style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              <div className="aura-input-group">
                <label className="aura-input-label">Partner Email Address</label>
                <input required type="email" placeholder="partner@aura.com" className="aura-input" value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)}/>
              </div>
              <button type="submit" className="aura-btn aura-btn-primary aura-btn-md" style={{ width: '100%' }}>Pair Accounts & Grant Scopes</button>
            </form>
          </div>

          {/* Unbundled Consent Control */}
          <div className="aura-card">
            <h3>Unbundled Consent Switches</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Independently toggle scopes to control exactly what parameters are shared.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px' }}>
                <div>
                  <strong>Share Cycle Phase</strong>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Displays cycle day number and phase labels</p>
                </div>
                <button onClick={() => setShareCycle(!shareCycle)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  {shareCycle ? <ToggleRight size={32} style={{ color: 'var(--color-primary)' }}/> : <ToggleLeft size={32} style={{ color: 'var(--color-text-muted)' }}/>}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px' }}>
                <div>
                  <strong>Share Hydration Quantity</strong>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Displays daily water intake totals</p>
                </div>
                <button onClick={() => setShareHydration(!shareHydration)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  {shareHydration ? <ToggleRight size={32} style={{ color: 'var(--color-primary)' }}/> : <ToggleLeft size={32} style={{ color: 'var(--color-text-muted)' }}/>}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px' }}>
                <div>
                  <strong>Share Mood trends</strong>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Displays mood emoji check-ins</p>
                </div>
                <button onClick={() => setShareMood(!shareMood)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  {shareMood ? <ToggleRight size={32} style={{ color: 'var(--color-primary)' }}/> : <ToggleLeft size={32} style={{ color: 'var(--color-text-muted)' }}/>}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px' }}>
                <div>
                  <strong>Share Warning alerts</strong>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Flags safety red-flag metrics to partner</p>
                </div>
                <button onClick={() => setShareSymptoms(!shareSymptoms)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  {shareSymptoms ? <ToggleRight size={32} style={{ color: 'var(--color-primary)' }}/> : <ToggleLeft size={32} style={{ color: 'var(--color-text-muted)' }}/>}
                </button>
              </div>

            </div>
          </div>

        </div>
      ) : (
        // Active linked room with chat AND order delivery placement system
        <div className="aura-dashboard-grid">
          
          {/* Simulator & Details */}
          <div>
            {renderSyncSimulator()}

            {user?.userType === 'partner' && renderEmpathyGuidance()}
            
            {/* Courier Delivery Order Placement System */}
            {user?.userType === 'partner' && (
              <div className="aura-card">
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>
                  <ShoppingBag size={18} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}/> Aura Wellness Care Courier
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Order support items to deliver directly to your patient partner's door.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div>
                      <strong>🍵 Spearmint Relief Tea & Hot Pack</strong>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Supports cramps relief & hormonal bloating control</p>
                    </div>
                    <button disabled={isPlacingOrder} onClick={() => placeOrder("Spearmint Relief Tea & Hot Pack", 350)} className="aura-btn aura-btn-primary aura-btn-sm">
                      Order ₹350
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div>
                      <strong>🍫 PMDD Comfort Dark Chocolate & Chamomile</strong>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Magnesium boosters to regulate premenstrual swings</p>
                    </div>
                    <button disabled={isPlacingOrder} onClick={() => placeOrder("PMDD Comfort Dark Chocolate & Chamomile", 499)} className="aura-btn aura-btn-primary aura-btn-sm">
                      Order ₹499
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div>
                      <strong>🌸 Aura Pelvic Therapy Premium Pack</strong>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Luxury relaxation and pelvic warming compressions</p>
                    </div>
                    <button disabled={isPlacingOrder} onClick={() => placeOrder("Aura Pelvic Therapy Premium Pack", 899)} className="aura-btn aura-btn-primary aura-btn-sm">
                      Order ₹899
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Empathetic Nudges Card */}
            {user?.userType === 'partner' && (
              <div className="aura-card" style={{ marginTop: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Heart size={18} style={{ color: 'var(--color-accent)' }}/> Empathetic Nudges
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Send virtual encouragement or reminders that appear instantly on her screen.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button 
                    disabled={sendingNudgeType !== null} 
                    onClick={() => handleSendNudge('hug', 'Virtual Hug')} 
                    className="aura-btn aura-btn-secondary aura-btn-sm" 
                    style={{ background: 'white', display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 8px', height: 'auto', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: '20px' }}>🤗</span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Send Hug</span>
                  </button>

                  <button 
                    disabled={sendingNudgeType !== null} 
                    onClick={() => handleSendNudge('hydration', 'Hydration Nudge')} 
                    className="aura-btn aura-btn-secondary aura-btn-sm" 
                    style={{ background: 'white', display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 8px', height: 'auto', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: '20px' }}>💧</span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Nudge Water</span>
                  </button>

                  <button 
                    disabled={sendingNudgeType !== null} 
                    onClick={() => handleSendNudge('support', 'Reassurance Note')} 
                    className="aura-btn aura-btn-secondary aura-btn-sm" 
                    style={{ background: 'white', display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 8px', height: 'auto', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: '20px' }}>💜</span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Send Love</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Orders History List */}
          <div className="aura-card" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 180px)' }}>
            <h3><Truck size={18} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}/> Dispatched Deliveries</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Courier tracking logs of care packages sent.</p>

            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                  No care packages ordered yet. Try ordering a wellness tea pack above!
                </div>
              ) : (
                orders.map((ord) => (
                  <div key={ord._id} style={{ padding: '12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                      <span>{ord.itemName}</span>
                      <span style={{ color: 'var(--color-primary)' }}>₹{ord.price}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--color-success)', fontWeight: '500' }}>
                      <Truck size={12}/>
                      <span>{ord.status}</span>
                    </div>
                    {renderOrderStepper(ord.status)}
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '8px', textAlign: 'right' }}>
                      Ordered at: {new Date(ord.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
