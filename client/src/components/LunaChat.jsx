import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Info, Layers, RefreshCw, Check, Calendar, Activity, Coffee, Compass } from 'lucide-react';

// ----------------------------------------------------
// FILE-LEVEL WIDGETS TO PREVENT FLICKERING (React Antipattern Fix)
// ----------------------------------------------------

// 1. MicroStretchWidget
const MicroStretchWidget = ({ activeCards, setActiveCards }) => {
  const [timeLeft, setTimeLeft] = useState(120);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const getStretchAction = () => {
    if (timeLeft > 90) return "Roll your shoulders slowly backward (15s)";
    if (timeLeft > 60) return "Gently tilt head left-to-right (15s)";
    if (timeLeft > 30) return "Extend arms overhead and interlock fingers (15s)";
    return "Slow deep breathing, releasing pelvic floor tension (15s)";
  };

  return (
    <div className="aura-card" style={{ borderLeft: '4px solid var(--color-primary)', background: 'var(--color-surface)', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: 'var(--color-primary-dark)', fontSize: '14px' }}>
          <Activity size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}/> Luna 2-Min MicroStretch Pacer
        </strong>
        <span className="aura-badge aura-badge-primary">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
      </div>
      <p style={{ fontSize: '13px', marginTop: '8px', fontWeight: '500' }}>{getStretchAction()}</p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={() => setIsActive(!isActive)} className="aura-btn aura-btn-secondary aura-btn-sm">
          {isActive ? 'Pause' : 'Resume'}
        </button>
        <button onClick={() => setTimeLeft(120)} className="aura-btn aura-btn-outline aura-btn-sm">Reset</button>
        <button onClick={() => setActiveCards(activeCards.filter(c => c !== 'stretch'))} style={{ fontSize: '12px', marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Dismiss</button>
      </div>
    </div>
  );
};

// 2. HydrationBooster
const HydrationBooster = ({ handleQuickLog, showToast, activeCards, setActiveCards }) => {
  const [logged, setLogged] = useState(false);

  const logHerbalTea = async () => {
    await handleQuickLog('hydration', 350, 'Luna Spearmint Tea recommendation');
    setLogged(true);
    showToast('Logged +350ml Hot Herbal Tea!');
  };

  return (
    <div className="aura-card" style={{ borderLeft: '4px solid var(--color-accent)', background: 'var(--color-surface)', marginTop: '12px' }}>
      <strong style={{ color: 'var(--color-primary-dark)', fontSize: '14px' }}>
        <Coffee size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}/> Luna Hydration Recommendation
      </strong>
      <p style={{ fontSize: '13px', marginTop: '6px' }}>Luna recommends drinking a hot herbal infusion (+350ml) to relieve tension and support metabolic rate.</p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
        {!logged ? (
          <button onClick={logHerbalTea} className="aura-btn aura-btn-primary aura-btn-sm">Log +350ml Herbal Tea</button>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 'bold' }}>✓ Tea Intake Logged!</span>
        )}
        <button onClick={() => setActiveCards(activeCards.filter(c => c !== 'hydration'))} style={{ fontSize: '12px', marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Dismiss</button>
      </div>
    </div>
  );
};

// 3. CalmPulse Breathing Guide
const CalmPulse = ({ activeCards, setActiveCards }) => {
  const [state, setState] = useState('Inhale'); // Inhale, Hold, Exhale, Hold
  const [tick, setTick] = useState(4);

  useEffect(() => {
    // Single stable interval driven entirely by functional updaters, so the
    // 4-3-2-1 countdown ticks at a steady 1 Hz instead of being recreated
    // (and delayed a full second) on every phase change.
    const interval = setInterval(() => {
      setTick(t => {
        if (t === 1) {
          setState(s => {
            if (s === 'Inhale') return 'Hold';
            if (s === 'Hold') return 'Exhale';
            if (s === 'Exhale') return 'Hold ';
            return 'Inhale';
          });
          return 4;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="aura-card" style={{ borderLeft: '4px solid var(--color-success)', background: 'var(--color-surface)', marginTop: '12px', textAlign: 'center' }}>
      <strong style={{ color: 'var(--color-primary-dark)', fontSize: '14px', float: 'left' }}>CalmPulse Breathing Pacer</strong>
      <button onClick={() => setActiveCards(activeCards.filter(c => c !== 'breathing'))} style={{ fontSize: '12px', float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Dismiss</button>
      <div style={{ clear: 'both', padding: '16px 0' }}>
        <div 
          style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'var(--color-accent-light)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            transition: 'transform 4s ease-in-out',
            transform: state === 'Inhale' || state === 'Hold' ? 'scale(1.25)' : 'scale(0.95)'
          }}
        >
          <strong style={{ color: 'var(--color-primary)' }}>{state.trim()}</strong>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Hold state for {tick}s (4-4-4-4 cycle)</p>
      </div>
    </div>
  );
};

// 4. LogOverrideCard
const LogOverrideCard = ({ handleQuickLog, showToast, activeCards, setActiveCards }) => {
  const [fatigueLevel, setFatigueLevel] = useState(true);
  const [crampsLogged, setCrampsLogged] = useState(true);

  const updateSymptomLogs = () => {
    handleQuickLog('symptom', { symptom: 'fatigue', level: fatigueLevel ? 'High' : 'Low' }, 'Luna override update');
    handleQuickLog('symptom', { symptom: 'cramps', level: crampsLogged ? 'Present' : 'Absent' }, 'Luna override update');
    showToast('Logs synchronized with database!');
  };

  return (
    <div className="aura-card" style={{ borderLeft: '4px solid var(--color-warning)', background: 'var(--color-surface)', marginTop: '12px' }}>
      <strong style={{ color: 'var(--color-primary-dark)', fontSize: '14px' }}>LogOverride: Fast Track Sync</strong>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Fast track check-ins to synchronize your database telemetry.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0' }}>
        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={fatigueLevel} onChange={e => setFatigueLevel(e.target.checked)}/> Log Fatigue (High)
        </label>
        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={crampsLogged} onChange={e => setCrampsLogged(e.target.checked)}/> Log Cramps (Active)
        </label>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={updateSymptomLogs} className="aura-btn aura-btn-primary aura-btn-sm">Synchronize Logs</button>
        <button onClick={() => setActiveCards(activeCards.filter(c => c !== 'override'))} className="aura-btn aura-btn-secondary aura-btn-sm">Dismiss</button>
      </div>
    </div>
  );
};

// 5. UHI Referral Booking
const UHIDiagnosticBooking = ({ showToast, activeCards, setActiveCards }) => {
  const [bookedRef, setBookedRef] = useState('');

  const handleBook = () => {
    const ref = `UHI-APOLLO-${Math.floor(1000 + Math.random() * 9000)}`;
    setBookedRef(ref);
    showToast(`Referral booking successful. Code: ${ref}`);
  };

  return (
    <div className="aura-card" style={{ borderLeft: '4px solid #1A1321', background: 'var(--color-surface)', marginTop: '12px' }}>
      <strong style={{ color: 'var(--color-primary-dark)', fontSize: '14px' }}>
        <Compass size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}/> UHI Referral Laboratories Booking
      </strong>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
        Luna detected keywords matching laboratory queries. Book clinical check-ups under Unified Health Interface (UHI) protocol rails.
      </p>
      <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', margin: '12px 0', fontSize: '13px' }}>
        <strong>PCOS / Hormonal Baseline Profile</strong>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Includes: Free Testosterone, Fasting Glucose, HbA1c, TSH</p>
        <p style={{ fontWeight: 'bold', marginTop: '4px' }}>Lab Partner: Apollo Laboratories Bangalore</p>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {!bookedRef ? (
          <button onClick={handleBook} className="aura-btn aura-btn-primary aura-btn-sm">Book Lab Checkup via UHI</button>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 'bold' }}>✓ Booked! Ref ID: {bookedRef}</div>
        )}
        <button onClick={() => setActiveCards(activeCards.filter(c => c !== 'uhi'))} style={{ fontSize: '12px', marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Dismiss</button>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// MAIN LUNA AI CHAT COMPANION
// ----------------------------------------------------
export default function LunaChat({ token, API_BASE, user, dashboardData, showToast, handleQuickLog }) {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'luna', text: "Hello! I am Luna. Ask me anything about your cycle phases, symptom relief, or wellness practices. You can type or use the mic button to speak in English, Tamil, or Kannada!" }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en', 'ta', 'kn'
  const [showRAGInspector, setShowRAGInspector] = useState(false);
  const [activeCards, setActiveCards] = useState([]); // Array of injected widget types
  
  const voiceTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeCards, isTyping]);

  // Clean up voice recording timeout
  useEffect(() => {
    return () => {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    };
  }, []);

  // Simulating Bhashini ASR Pipeline
  const handleVoiceListen = () => {
    if (isListening) {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      setIsListening(false);
      return;
    }

    setIsListening(true);
    showToast(`ASR Listening in ${language === 'en' ? 'English' : language === 'ta' ? 'Tamil' : 'Kannada'}...`);

    voiceTimeoutRef.current = setTimeout(() => {
      setIsListening(false);
      let simulatedSpeech = "";
      if (language === 'ta') {
        simulatedSpeech = "எனக்கு மிகவும் சோர்வாக இருக்கிறது, தாகமாகவும் இருக்கிறது"; // I feel very tired and thirsty
      } else if (language === 'kn') {
        simulatedSpeech = "ನನಗೆ ತುಂಬಾ ಆಯಾಸವಾಗಿದೆ ಮತ್ತು ಬಾಯಾರಿಕೆಯಾಗಿದೆ"; // I feel very tired and thirsty
      } else {
        simulatedSpeech = "I feel very tired and thirsty today";
      }
      setInput(simulatedSpeech);
      showToast("Speech transcribed!");
    }, 3000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    // Append User Message
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: query }]);
    setInput('');

    // Trigger Dynamic Card Injections based on keywords
    const lowercaseQuery = query.toLowerCase();
    const newCards = [];

    if (lowercaseQuery.includes('tired') || lowercaseQuery.includes('fatigue') || lowercaseQuery.includes('ಆಯಾಸ') || lowercaseQuery.includes('சோர்வாக')) {
      newCards.push('stretch');
      newCards.push('override');
    }
    if (lowercaseQuery.includes('thirsty') || lowercaseQuery.includes('thirst') || lowercaseQuery.includes('தாக') || lowercaseQuery.includes('ಬಾಯಾರಿಕೆ')) {
      newCards.push('hydration');
    }
    if (lowercaseQuery.includes('breath') || lowercaseQuery.includes('stress') || lowercaseQuery.includes('anxious')) {
      newCards.push('breathing');
    }
    if (lowercaseQuery.includes('book') || lowercaseQuery.includes('lab') || lowercaseQuery.includes('test') || lowercaseQuery.includes('uhi')) {
      newCards.push('uhi');
    }

    if (newCards.length > 0) {
      setActiveCards(prev => [...new Set([...prev, ...newCards])]);
    }

    // Call Backend AI response (streamed via Server-Sent Events)
    setIsTyping(true);
    const lunaId = `luna-${Date.now()}`;
    let appended = false;

    // Append a delta to Luna's streaming message, creating it on first token
    const pushDelta = (delta) => {
      if (!delta) return;
      setMessages(prev => {
        if (!appended) {
          appended = true;
          return [...prev, { id: lunaId, sender: 'luna', text: delta }];
        }
        return prev.map(m => m.id === lunaId ? { ...m, text: m.text + delta } : m);
      });
    };

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: query, stream: true })
      });

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && res.body) {
        // Stream tokens as they arrive so the reply appears instantly.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let firstToken = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nlIndex;
          while ((nlIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nlIndex).trim();
            buffer = buffer.slice(nlIndex + 1);
            if (!line.startsWith('data:')) continue;
            try {
              const evt = JSON.parse(line.slice(5).trim());
              if (evt.delta) {
                if (firstToken) { setIsTyping(false); firstToken = false; }
                pushDelta(evt.delta);
              }
            } catch {
              // ignore keep-alive / partial lines
            }
          }
        }
      } else {
        // Fallback: non-streaming JSON response
        const data = await res.json();
        if (data.success) pushDelta(data.response);
      }
    } catch (err) {
      console.error(err);
      if (!appended) {
        setMessages(prev => [...prev, { id: lunaId, sender: 'luna', text: "I'm having trouble linking with my central database right now. Let me know if you would like me to retry." }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="aura-chat-grid-wrapper" style={{ display: 'grid', gridTemplateColumns: showRAGInspector ? '2fr 1fr' : '1fr', gap: '24px', transition: 'all 250ms ease' }}>
      
      {/* Conversation Area */}
      <div className="aura-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="anim-pulse-orb" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--grad-ai)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>L</div>
            <div>
              <h3>Luna AI Companion</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Connected to Bhashini multilingual translation engine</p>
            </div>
          </div>
          <button 
            onClick={() => setShowRAGInspector(!showRAGInspector)} 
            className={`aura-btn aura-btn-secondary aura-btn-sm ${showRAGInspector ? 'active' : ''}`}
            title="Inspect background Prompt / RAG vector searches"
          >
            <Layers size={14}/> Prompt Inspector
          </button>
        </div>

        {/* Message Thread Area */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
              <div 
                style={{ 
                  maxWidth: '80%', 
                  padding: '12px var(--space-md)', 
                  borderRadius: '16px',
                  background: msg.sender === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: msg.sender === 'user' ? 'white' : 'var(--color-text-primary)',
                  boxShadow: 'var(--shadow-sm)',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'anim-slide-in 200ms ease' }}>
              <style>{`
                @keyframes luna-bounce {
                  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                  40% { transform: translateY(-6px); opacity: 1; }
                }
              `}</style>
              <div 
                style={{ 
                  maxWidth: '80%', 
                  padding: '12px var(--space-md)', 
                  borderRadius: '16px 16px 16px 4px',
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)', animation: 'luna-bounce 1.4s infinite both', animationDelay: '0s' }}></div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)', animation: 'luna-bounce 1.4s infinite both', animationDelay: '0.2s' }}></div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)', animation: 'luna-bounce 1.4s infinite both', animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          {activeCards.includes('stretch') && (
            <MicroStretchWidget activeCards={activeCards} setActiveCards={setActiveCards} />
          )}
          {activeCards.includes('hydration') && (
            <HydrationBooster handleQuickLog={handleQuickLog} showToast={showToast} activeCards={activeCards} setActiveCards={setActiveCards} />
          )}
          {activeCards.includes('breathing') && (
            <CalmPulse activeCards={activeCards} setActiveCards={setActiveCards} />
          )}
          {activeCards.includes('override') && (
            <LogOverrideCard handleQuickLog={handleQuickLog} showToast={showToast} activeCards={activeCards} setActiveCards={setActiveCards} />
          )}
          {activeCards.includes('uhi') && (
            <UHIDiagnosticBooking showToast={showToast} activeCards={activeCards} setActiveCards={setActiveCards} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Inputs Area */}
        <form onSubmit={handleSend} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            className="aura-input" 
            style={{ width: '100px', height: '40px', padding: '0 6px', fontSize: '13px' }} 
            value={language} 
            onChange={e => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ta">தமிழ் (ta)</option>
            <option value="kn">ಕನ್ನಡ (kn)</option>
          </select>

          <button 
            type="button" 
            onClick={handleVoiceListen}
            className={`aura-btn ${isListening ? 'aura-btn-danger' : 'aura-btn-secondary'}`} 
            style={{ width: '40px', height: '40px', padding: 0 }}
            title="ASR voice input"
          >
            <Mic size={16}/>
          </button>

          <input 
            type="text" 
            className="aura-input" 
            placeholder="Type your message or click mic to dictate..." 
            value={input}
            onChange={e => setInput(e.target.value)}
          />

          <button type="submit" className="aura-btn aura-btn-primary aura-btn-md" style={{ padding: '0 20px' }}>
            <Send size={14}/>
          </button>
        </form>

      </div>

      {/* RAG Context Sidebar */}
      {showRAGInspector && (
        <div className="aura-card anim-slide-in" style={{ height: 'calc(100vh - 160px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <Info size={16} style={{ color: 'var(--color-primary)' }}/>
            <h4>RAG & Prompt Inspector</h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
            <div>
              <strong style={{ textTransform: 'uppercase', color: 'var(--color-primary)' }}>System Prompt Guidelines</strong>
              <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--color-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', marginTop: '6px', fontFamily: 'monospace' }}>
{`You are Luna, a clinical assistant companion.
Guidelines:
1. Defer to doctors for diagnostics.
2. Maintain warm Display typeface titles.
3. Suggest targeted condition adjustments.
4. Suppress warning data scopes unless consented.`}
              </pre>
            </div>

            <div>
              <strong style={{ textTransform: 'uppercase', color: 'var(--color-primary)' }}>User Context Variables</strong>
              <div style={{ background: 'var(--color-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', marginTop: '6px' }}>
                <p><strong>Name:</strong> {user?.fullName}</p>
                <p><strong>Conditions:</strong> {user?.conditionTags?.join(', ').toUpperCase()}</p>
                <p><strong>Cycle Phase:</strong> {dashboardData?.phase || 'Follicular'}</p>
                <p><strong>Life Stage:</strong> Working Professional (28, Mumbai)</p>
              </div>
            </div>

            <div>
              <strong style={{ textTransform: 'uppercase', color: 'var(--color-primary)' }}>Vector DB Search (Mock RAG)</strong>
              <div style={{ background: 'var(--color-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', marginTop: '6px' }}>
                <p style={{ fontStyle: 'italic' }}>Query matching tokenized terms...</p>
                <ul style={{ paddingLeft: '16px', marginTop: '6px' }}>
                  <li>PCOS Spearmint Tea research citation: "Spearmint herbal infusion exhibits anti-androgen control (p &lt; 0.05)"</li>
                  <li>Endometriosis castor oil pack guidelines: "Locally applied pelvic warming packs reduce inflammatory flare indicators."</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
