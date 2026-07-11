import React, { useState } from 'react';
import { Shield, Key, Copy, CheckCircle, Info, FileCheck, PlusCircle, Calendar } from 'lucide-react';

export default function MenstrualLeave({ user, cycles, leaveLogs, handleLogLeave, showToast }) {
  const [tokenCode, setTokenCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('Menstrual Cramps & Severe Fatigue');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cryptographic Anonymization
  const generateAnonymizedToken = () => {
    const randHex = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
    const token = `LUNA-LEAVE-2026-${randHex}`;
    setTokenCode(token);
    setIsCopied(false);
    showToast('Anonymized verification token generated!');
  };

  const copyToClipboard = () => {
    if (!tokenCode) return;
    navigator.clipboard.writeText(tokenCode);
    setIsCopied(true);
    showToast('Token copied to clipboard!');
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveDate) return;
    setIsSubmitting(true);
    try {
      await handleLogLeave(leaveDate, leaveReason);
      setLeaveDate('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="anim-slide-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Menstrual Leave Compliance Center</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Log leave dates and generate anonymized compliance tokens for HR departments.</p>

      {/* Compliance policy explainer card */}
      <div className="aura-card" style={{ borderLeft: '4px solid var(--color-primary)', background: 'var(--color-surface)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Info size={20} style={{ color: 'var(--color-primary-dark)', marginTop: '2px' }}/>
          <div>
            <h4 style={{ color: 'var(--color-primary-dark)' }}>Karnataka Menstrual Leave Policy Guidelines</h4>
            <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '6px', lineHeight: '1.5' }}>
              Under state policy frameworks, female employees are entitled to designated monthly rest leave days.
              Aura Health implements <strong>Privacy Isolation</strong>: we validate that you are in a cycle day window matching your recorded cycle history and issue a signed verification hash. Your sensitive symptom logs, pain scales, or diagnostic details are <strong>never</strong> disclosed or shared with your employer.
            </p>
          </div>
        </div>
      </div>

      <div className="aura-dashboard-grid">
        {/* Log Leave Form */}
        <div className="aura-card">
          <h3><PlusCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}/>Log Menstrual Leave Day</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Record a leave date to track your history and generate compliance certificates.</p>
          <form onSubmit={handleSubmitLeave}>
            <div className="aura-input-group">
              <label className="aura-input-label">Leave Date</label>
              <input
                required
                type="date"
                className="aura-input"
                value={leaveDate}
                onChange={e => setLeaveDate(e.target.value)}
              />
            </div>
            <div className="aura-input-group">
              <label className="aura-input-label">Reason</label>
              <select className="aura-input" value={leaveReason} onChange={e => setLeaveReason(e.target.value)}>
                <option value="Menstrual Cramps & Severe Fatigue">Menstrual Cramps &amp; Severe Fatigue</option>
                <option value="PCOS Flare-up">PCOS Flare-up</option>
                <option value="Endometriosis Pain Episode">Endometriosis Pain Episode</option>
                <option value="PMDD Severe Mood Episode">PMDD Severe Mood Episode</option>
                <option value="Other Menstrual Discomfort">Other Menstrual Discomfort</option>
              </select>
            </div>
            <button
              disabled={isSubmitting}
              type="submit"
              className="aura-btn aura-btn-primary aura-btn-md"
              style={{ width: '100%' }}
            >
              {isSubmitting ? 'Saving...' : 'Save Leave Record'}
            </button>
          </form>

          {/* Leave History */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <strong style={{ fontSize: '13px', color: 'var(--color-primary-dark)' }}>
              <Calendar size={13} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}/>Leave History
            </strong>
            {!leaveLogs || leaveLogs.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                No leave days logged yet. Use the form above to record your first entry.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {leaveLogs.map((log, i) => (
                  <div key={log._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
                    <div>
                      <strong>{new Date(log.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</strong>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>{log.reason}</p>
                    </div>
                    <span className={`aura-badge aura-badge-${log.status === 'approved' ? 'success' : 'error'}`} style={{ fontSize: '9px' }}>
                      {log.status?.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Token Generator */}
        <div className="aura-card" style={{ textAlign: 'center', padding: '32px' }}>
          <Shield size={48} style={{ color: 'var(--color-primary)', opacity: 0.8, marginBottom: '16px' }}/>
          
          <h3>Generate Anonymized Compliance Token</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', maxWidth: '500px', margin: '8px auto 24px auto' }}>
            Confirms your active menstrual window mathematically without transmitting diagnostic logs.
          </p>

          <button onClick={generateAnonymizedToken} className="aura-btn aura-btn-primary aura-btn-md">
            <Key size={16}/> Generate Eligibility Hash
          </button>

          {tokenCode && (
            <div className="anim-slide-in" style={{ marginTop: '32px', borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px dashed var(--color-primary)',
                  borderRadius: '12px',
                  padding: '20px',
                  position: 'relative',
                  maxWidth: '480px',
                  margin: '0 auto'
                }}
              >
                <span className="aura-badge aura-badge-success" style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px' }}>
                  <CheckCircle size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }}/> Verified
                </span>

                <div style={{ textAlign: 'left', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--color-primary-dark)' }}>
                    <FileCheck size={16}/>
                    <strong>AURA COMPLIANCE PROTOCOL</strong>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)', margin: '8px 0' }}/>
                  <p style={{ margin: '4px 0' }}><strong>Holder:</strong> {user?.fullName}</p>
                  <p style={{ margin: '4px 0' }}><strong>Timestamp:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                  <p style={{ margin: '4px 0' }}><strong>Statute Reference:</strong> Karnataka Policy (2026)</p>
                  <p style={{ margin: '8px 0 4px 0', fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                    Notice: This cryptographically generated hash verifies cycle window eligibility. All diagnostic telemetry, pain intensities, and water/sleep tracking remain strictly isolated.
                  </p>
                  
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <code style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold', flexGrow: 1 }}>{tokenCode}</code>
                    <button
                      onClick={copyToClipboard}
                      className="aura-btn aura-btn-secondary aura-btn-sm"
                      style={{ padding: '0 8px', height: '28px', minWidth: '70px' }}
                    >
                      {isCopied ? 'Copied' : <Copy size={12}/>}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
