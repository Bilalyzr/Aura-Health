import React, { useState, useEffect } from 'react';
import { 
  Heart, Activity, Calendar, Users, BarChart3, Settings, 
  LogOut, Shield, ChevronRight, Check, AlertTriangle, Plus, 
  ThumbsUp, Send, Trash2, PlusCircle, CheckCircle, RefreshCw, Info, Key
} from 'lucide-react';
import './App.css';

import LunaChat from './components/LunaChat';
import Timeline from './components/Timeline';
import Reports from './components/Reports';
import MenstrualLeave from './components/MenstrualLeave';
import PartnerRoom from './components/PartnerRoom';

const API_BASE = 'http://localhost:5001/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('aura_token') || '');
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing');
  const [toast, setToast] = useState(null);
  
  // Patient State
  const [dashboardData, setDashboardData] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [pendingOtps, setPendingOtps] = useState([]);

  // Forum State
  const [threads, setThreads] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [currentThread, setCurrentThread] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);

  // Sharing & Settings State
  const [consents, setConsents] = useState([]);

  // Sub-roles State
  const [sharedPatients, setSharedPatients] = useState([]);
  const [activePatientData, setActivePatientData] = useState(null);
  const [activePatientId, setActivePatientId] = useState('');

  // Admin State
  const [adminUsers, setAdminUsers] = useState([]);
  const [moderationQueue, setModerationQueue] = useState({ threads: [], replies: [] });

  // Luna AI & Timeline & Menstrual Leave & Partner messaging States
  const [chatMessages, setChatMessages] = useState([
    { sender: 'luna', text: "Hello! I am Luna, your personalized AI health companion. Ask me anything about your cycle phases, symptom relief (for PCOS, Endometriosis, PMDD), or exercise tips!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isLunaTyping, setIsLunaTyping] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [leaveLogs, setLeaveLogs] = useState([]);
  const [partnerMessages, setPartnerMessages] = useState([]);
  const [partnerInput, setPartnerInput] = useState('');

  // API Call Loaders
  const loadTimeline = async () => {
    try {
      const res = await fetch(`${API_BASE}/timeline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTimelineEvents(data.timeline);
      }
    } catch (err) { console.error(err); }
  };

  const loadLeaveLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/leave`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeaveLogs(data.leaveLogs);
      }
    } catch (err) { console.error(err); }
  };

  const loadPartnerMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/partner/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPartnerMessages(data.messages);
      }
    } catch (err) { console.error(err); }
  };

  const sendLunaMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setIsLunaTyping(true);
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { sender: 'luna', text: data.response }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLunaTyping(false);
    }
  };

  const handleLogLeave = async (date, reason) => {
    try {
      const res = await fetch(`${API_BASE}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date, reason })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Menstrual leave logged successfully!');
        loadLeaveLogs();
      }
    } catch (err) { console.error(err); }
  };

  const sendPartnerMessage = async (e) => {
    e.preventDefault();
    if (!partnerInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/partner/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ body: partnerInput })
      });
      const data = await res.json();
      if (data.success) {
        setPartnerMessages(prev => [...prev, data.message]);
        setPartnerInput('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // TOAST NOTIFICATIONS
  // ----------------------------------------------------
  const showToast = (message, duration = 3000) => {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  };

  // ----------------------------------------------------
  // REFRESH / AUTH PERSISTENCE
  // ----------------------------------------------------
  useEffect(() => {
    if (token) {
      localStorage.setItem('aura_token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('aura_token');
      setUser(null);
      if (currentView !== 'login' && currentView !== 'register') {
        setCurrentView('landing');
      }
    }
  }, [token]);

  // Viewport Scroll Intersection Observer Reveal Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const targets = document.querySelectorAll('.aura-scroll-reveal');
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('aura-revealed');
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1 });
        targets.forEach(t => observer.observe(t));
        return () => {
          targets.forEach(t => observer.unobserve(t));
        };
      } else {
        targets.forEach(t => t.classList.add('aura-revealed'));
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentView]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        
        // Redirect based on role on refresh
        if (data.user.userType === 'patient') {
          if (!data.user.conditionTags || data.user.conditionTags.length === 0) {
            // New patient with no survey yet
            setCurrentView('onboarding');
          } else {
            setCurrentView('dashboard');
            loadPatientDashboard();
            loadCycles();
            loadTimeline();
            loadLeaveLogs();
            loadPartnerMessages();
          }
        } else if (data.user.userType === 'admin') {
          setCurrentView('admin');
          loadAdminConsole();
        } else {
          // Doctor / Partner / Guardian
          setCurrentView('sharing');
          loadSharedAccess(data.user);
          loadPartnerMessages();
        }
      } else {
        // Token invalid
        setToken('');
      }
    } catch (err) {
      console.error(err);
      setToken('');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setCurrentView('landing');
    showToast('Logged out successfully.');
  };

  // ----------------------------------------------------
  // PATIENT DATA LOADERS
  // ----------------------------------------------------
  const loadPatientDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
        loadPendingOtps();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPendingOtps = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/consents/otp-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPendingOtps(data.requests);
      }
    } catch (err) { console.error(err); }
  };

  const handleOtpAction = async (requestId, action) => {
    try {
      const res = await fetch(`${API_BASE}/consents/otp-requests/${requestId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        showToast(action === 'approve' ? 'Trusted person access approved!' : 'Access request declined.');
        // Reload dashboard to update user.linkedAccounts list and clear pending approvals
        const profileRes = await fetch(`${API_BASE}/users/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profileData = await profileRes.json();
        if (profileData.success) {
          setUser(profileData.user);
        }
        loadPatientDashboard();
      } else {
        showToast(`Error: ${data.error.message}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed.');
    }
  };

  const loadCycles = async () => {
    try {
      const cRes = await fetch(`${API_BASE}/cycles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const cData = await cRes.json();
      if (cData.success) {
        setCycles(cData.cycles);
      }

      const pRes = await fetch(`${API_BASE}/cycles/prediction`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pData = await pRes.json();
      if (pData.success) {
        setPrediction(pData.prediction);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // LOGGING ACTIONS
  // ----------------------------------------------------
  const handleQuickLog = async (type, value, note = '') => {
    try {
      const res = await fetch(`${API_BASE}/logs/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value, note })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} logged successfully!`);
        // Reload dashboard AND timeline so both views reflect the new entry immediately
        loadPatientDashboard();
        loadTimeline();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoutineToggle = async (routineId, itemId, currentCompleted) => {
    try {
      // Optimistic update
      if (dashboardData && dashboardData.routine) {
        const updatedItems = dashboardData.routine.items.map(item => 
          item.id === itemId ? { ...item, completed: !currentCompleted } : item
        );
        setDashboardData({
          ...dashboardData,
          routine: { ...dashboardData.routine, items: updatedItems }
        });
      }

      const res = await fetch(`${API_BASE}/routines/${routineId}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed: !currentCompleted })
      });
      const data = await res.json();
      if (!data.success) {
        // Rollback
        loadPatientDashboard();
      }
    } catch (err) {
      console.error(err);
      loadPatientDashboard();
    }
  };

  // ----------------------------------------------------
  // FORUM ACTIONS
  // ----------------------------------------------------
  const loadForumThreads = async (category = 'general') => {
    try {
      const res = await fetch(`${API_BASE}/forum/threads?category=${category}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setThreads(data.threads);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const viewThread = async (threadId) => {
    try {
      const res = await fetch(`${API_BASE}/forum/threads/${threadId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCurrentThread(data.thread);
        setThreadReplies(data.replies);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateThread = async (title, body, category) => {
    try {
      const res = await fetch(`${API_BASE}/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, body, category })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Thread posted successfully.');
        loadForumThreads(selectedCategory);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostReply = async (threadId, body) => {
    try {
      const res = await fetch(`${API_BASE}/forum/threads/${threadId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ body })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Reply added!');
        viewThread(threadId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpvoteThread = async (threadId) => {
    try {
      const res = await fetch(`${API_BASE}/forum/threads/${threadId}/upvote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        viewThread(threadId);
        loadForumThreads(selectedCategory);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportContent = async (targetId, targetType, reason) => {
    try {
      const res = await fetch(`${API_BASE}/forum/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetId, targetType, reason })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Report submitted. Flagged for review.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // SHARING CONSENTS (PATIENT VIEW)
  // ----------------------------------------------------
  const loadConsents = async () => {
    try {
      const res = await fetch(`${API_BASE}/consents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConsents(data.consents);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGrantConsent = async (granteeEmail, scope) => {
    try {
      const res = await fetch(`${API_BASE}/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ granteeEmail, scope })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Consent granted successfully.');
        loadConsents();
      } else {
        showToast(data.error.message || 'Error granting consent.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeConsent = async (consentId) => {
    try {
      const res = await fetch(`${API_BASE}/consents/${consentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Consent revoked.');
        loadConsents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // SHARED ACCESS (DOCTOR / PARTNER / GUARDIAN VIEW)
  // ----------------------------------------------------
  const loadSharedAccess = async (currentUser) => {
    if (!currentUser.linkedAccounts || currentUser.linkedAccounts.length === 0) return;
    setSharedPatients(currentUser.linkedAccounts);
  };

  const handleViewPatientData = async (patientId) => {
    try {
      const res = await fetch(`${API_BASE}/shared/patient/${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActivePatientId(patientId);
        setActivePatientData(data.data);
      } else {
        showToast(data.error.message || 'Access Denied.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // ADMIN CONSOLE ACTIONS
  // ----------------------------------------------------
  const loadAdminConsole = async () => {
    try {
      const uRes = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const uData = await uRes.json();
      if (uData.success) {
        setAdminUsers(uData.users);
      }

      const qRes = await fetch(`${API_BASE}/admin/moderation-queue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const qData = await qRes.json();
      if (qData.success) {
        setModerationQueue(qData.flagged);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleModerateContent = async (type, id, action) => {
    try {
      const res = await fetch(`${API_BASE}/admin/content/${type}/${id}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action }) // 'approve' or 'remove'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Moderated: ${action}`);
        loadAdminConsole();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('User account suspended.');
        loadAdminConsole();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // RENDER HEADER / NAVIGATION
  // ----------------------------------------------------
  const renderNav = () => {
    if (!user) return null;

    const userProfileWidget = (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
        {user.profileImage ? (
          <img src={user.profileImage} alt={user.fullName} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-primary)' }} />
        ) : (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary-hover)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
            {user.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{user.fullName}</span>
      </div>
    );

    if (user.userType === 'patient') {
      return (
        <nav className="aura-nav">
          <a onClick={() => { setCurrentView('dashboard'); loadPatientDashboard(); }} className={`aura-nav-link ${currentView === 'dashboard' ? 'active' : ''}`}><Heart size={15}/> Dashboard</a>
          <a onClick={() => { setCurrentView('luna'); }} className={`aura-nav-link ${currentView === 'luna' ? 'active' : ''}`}><Activity size={15}/> Luna AI Chat</a>
          <a onClick={() => { setCurrentView('timeline'); loadTimeline(); }} className={`aura-nav-link ${currentView === 'timeline' ? 'active' : ''}`}><RefreshCw size={15}/> Timeline</a>
          <a onClick={() => { setCurrentView('cycles'); loadCycles(); }} className={`aura-nav-link ${currentView === 'cycles' ? 'active' : ''}`}><Calendar size={15}/> Cycle Tracker</a>
          <a onClick={() => { setCurrentView('reports'); loadAnalytics(); }} className={`aura-nav-link ${currentView === 'reports' ? 'active' : ''}`}><BarChart3 size={15}/> Reports</a>
          <a onClick={() => { setCurrentView('leave'); loadLeaveLogs(); }} className={`aura-nav-link ${currentView === 'leave' ? 'active' : ''}`}><Shield size={15}/> Leave</a>
          <a onClick={() => { setCurrentView('partner_room'); loadPartnerMessages(); }} className={`aura-nav-link ${currentView === 'partner_room' ? 'active' : ''}`}><Users size={15}/> Partner Room</a>
          <a onClick={() => { setCurrentView('sharing'); loadConsents(); }} className={`aura-nav-link ${currentView === 'sharing' ? 'active' : ''}`}><Settings size={15}/> Consent Center</a>
          {userProfileWidget}
          <button onClick={handleLogout} className="aura-btn aura-btn-secondary aura-btn-sm"><LogOut size={13}/> Logout</button>
        </nav>
      );
    }

    if (user.userType === 'admin') {
      return (
        <nav className="aura-nav">
          <a onClick={() => { setCurrentView('admin'); loadAdminConsole(); }} className={`aura-nav-link ${currentView === 'admin' ? 'active' : ''}`}><Shield size={15}/> Admin Console</a>
          <a onClick={() => { setCurrentView('forum'); loadForumThreads(selectedCategory); }} className={`aura-nav-link ${currentView === 'forum' ? 'active' : ''}`}><Users size={15}/> Forum</a>
          {userProfileWidget}
          <button onClick={handleLogout} className="aura-btn aura-btn-secondary aura-btn-sm"><LogOut size={13}/> Logout</button>
        </nav>
      );
    }

    // Doctor / Partner / Guardian
    return (
      <nav className="aura-nav flex-wrap-mobile">
        <a onClick={() => { setCurrentView('sharing'); loadSharedAccess(user); }} className={`aura-nav-link ${currentView === 'sharing' ? 'active' : ''}`}><Shield size={15}/> Shared Patients</a>
        {user.userType === 'partner' && (
          <a onClick={() => { setCurrentView('partner_room'); loadPartnerMessages(); }} className={`aura-nav-link ${currentView === 'partner_room' ? 'active' : ''}`}><Users size={15}/> Partner Room</a>
        )}
        <a onClick={() => { setCurrentView('forum'); loadForumThreads(selectedCategory); }} className={`aura-nav-link ${currentView === 'forum' ? 'active' : ''}`}><Users size={15}/> Forum</a>
        {userProfileWidget}
        <button onClick={handleLogout} className="aura-btn aura-btn-secondary aura-btn-sm"><LogOut size={13}/> Logout</button>
      </nav>
    );
  };

  // ----------------------------------------------------
  // SUB-VIEWS RENDERING
  // ----------------------------------------------------

  // 1. Landing Page
  const LandingPage = () => (
    <div className="aura-landing-hero anim-slide-in">
      <h1 className="aura-landing-headline">Your Personalized Companion for Hormonal and Cycle Health</h1>
      <p className="aura-landing-subhead">Aura Health matches symptom logs and cycle phases with AI personalization to help you understand your body and manage chronic conditions like PCOS, endometriosis, and PMDD.</p>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '48px' }}>
        <button onClick={() => setCurrentView('register')} className="aura-btn aura-btn-primary aura-btn-lg">Create Account <ChevronRight size={18}/></button>
        <button onClick={() => setCurrentView('login')} className="aura-btn aura-btn-secondary aura-btn-lg">Login</button>
      </div>

      <div className="aura-landing-grid">
        <div className="aura-card aura-feature-card">
          <div className="aura-feature-icon"><Activity size={24}/></div>
          <h3>AI Daily Routine</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '8px' }}>Get daily lists of diet, exercise, and hydration goals customized to your cycle phase and conditions.</p>
        </div>
        <div className="aura-card aura-feature-card">
          <div className="aura-feature-icon"><Calendar size={24}/></div>
          <h3>Phase Cycle Tracker</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '8px' }}>Log period dates and check predictions mapping to Menstrual, Follicular, Ovulatory, and Luteal phases.</p>
        </div>
        <div className="aura-card aura-feature-card">
          <div className="aura-feature-icon"><Users size={24}/></div>
          <h3>Consented Data Sharing</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '8px' }}>Granularly share cycle info, moods, or symptom trends with partners, guardians, or gynecologists.</p>
        </div>
      </div>

      <div className="aura-testimonial-section">
        <div className="aura-testimonial-carousel">
          <p className="aura-testimonial-text">"Tracking on Aura feels entirely different. Instead of just numbers, it gives me practical lifestyle items for my PCOS symptoms everyday."</p>
          <strong style={{ color: 'var(--color-primary)' }}>— Ananya, Bengaluru</strong>
        </div>
      </div>
    </div>
  );

  // 2. Login & Register Page
  const AuthPage = ({ type }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState('');
    const [userType, setUserType] = useState('patient');
    const [isPartnerLogin, setIsPartnerLogin] = useState(false);
    const [pairingKeyInput, setPairingKeyInput] = useState('');
    
    // Trusted Person Login states
    const [isTrustedUidLogin, setIsTrustedUidLogin] = useState(false);
    const [trustedUid, setTrustedUid] = useState('');
    const [trustedEmail, setTrustedEmail] = useState('');
    const [pendingRequestId, setPendingRequestId] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    const [err, setErr] = useState('');

    useEffect(() => {
      let interval = null;
      if (pendingRequestId) {
        setIsPolling(true);
        interval = setInterval(async () => {
          try {
            const res = await fetch(`${API_BASE}/auth/trusted-login/status/${pendingRequestId}`);
            const data = await res.json();
            if (data.success) {
              if (data.status === 'approved') {
                clearInterval(interval);
                setIsPolling(false);
                setPendingRequestId(null);
                showToast('Access approved! Welcome to Aura.');
                setToken(data.token);
              } else if (data.status === 'rejected') {
                clearInterval(interval);
                setIsPolling(false);
                setPendingRequestId(null);
                setErr('The connection request was declined or has expired.');
              }
            }
          } catch (e) {
            console.error('Error polling status:', e);
          }
        }, 2000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [pendingRequestId]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setErr('');

      if (isTrustedUidLogin) {
        if (!trustedUid || !trustedEmail) return;
        try {
          const res = await fetch(`${API_BASE}/auth/trusted-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uniqueShareId: trustedUid.trim(), trustedEmail: trustedEmail.trim() })
          });
          const data = await res.json();
          if (data.success) {
            setPendingRequestId(data.requestId);
          } else {
            setErr(data.error.message || 'Trusted person login failed.');
          }
        } catch (err) {
          setErr('Server connection failed.');
        }
        return;
      }
      
      if (isPartnerLogin) {
        try {
          const res = await fetch(`${API_BASE}/auth/partner-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pairingKey: pairingKeyInput })
          });
          const data = await res.json();
          if (data.success) {
            showToast('Partner pairing successful! Welcome.');
            setToken(data.token);
          } else {
            setErr(data.error.message || 'Pairing authentication failed.');
          }
        } catch (err) {
          setErr('Server connection failed.');
        }
        return;
      }

      const path = type === 'login' ? 'login' : 'register';
      const payload = type === 'login' 
        ? { email, password } 
        : { email, password, fullName, dateOfBirth: dob, userType };

      try {
        const res = await fetch(`${API_BASE}/auth/${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(type === 'login' ? 'Logged in!' : 'Registered successfully.');
          setToken(data.token);
        } else {
          setErr(data.error.message || 'Operation failed.');
        }
      } catch (err) {
        setErr('Server connection failed.');
      }
    };

    return (
      <div className="aura-auth-container anim-slide-in">
        <div className="aura-card aura-auth-card">
          <h2 className="aura-auth-title">
            {pendingRequestId ? 'Awaiting Approval' : isTrustedUidLogin ? 'Trusted Person Login' : isPartnerLogin ? 'Partner Link Login' : (type === 'login' ? 'Welcome Back' : 'Get Started')}
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
            {pendingRequestId
              ? 'Please wait while the original user approves this login.'
              : isTrustedUidLogin
              ? 'Enter patient Unique Connection ID and your email.'
              : isPartnerLogin 
              ? 'Enter email and pairing key to fast link accounts.' 
              : (type === 'login' ? 'Enter credentials to access Aura Health.' : 'Create your secure health companion profile.')}
          </p>

          {err && <div className="aura-badge aura-badge-error" style={{ display: 'block', padding: '8px', marginBottom: '16px', textTransform: 'none' }}>{err}</div>}

          {pendingRequestId ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div className="luna-typing-dot" style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-primary)', animation: 'luna-bounce 1.4s infinite both' }} />
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '16px', lineHeight: '1.5' }}>
                A secure OTP request has been sent to the patient. Once they click <strong>Approve</strong> on their dashboard connection panel, you will be logged in automatically.
              </p>
              <button 
                onClick={() => {
                  setPendingRequestId(null);
                  setIsPolling(false);
                }} 
                className="aura-btn aura-btn-secondary aura-btn-sm" 
                style={{ marginTop: '20px' }}
              >
                Cancel Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {type === 'login' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                  <a 
                    onClick={() => {
                      setIsPartnerLogin(!isPartnerLogin);
                      setIsTrustedUidLogin(false);
                      setErr('');
                    }} 
                    style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline' }}
                  >
                    {isPartnerLogin ? '← Use Standard Account Login' : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Key size={13} style={{ verticalAlign: 'middle' }} /> Partner Fast Login (Pairing Key)
                      </span>
                    )}
                  </a>

                  {!isPartnerLogin && (
                    <a 
                      onClick={() => {
                        setIsTrustedUidLogin(!isTrustedUidLogin);
                        setIsPartnerLogin(false);
                        setErr('');
                      }} 
                      style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline' }}
                    >
                      {isTrustedUidLogin ? '← Use Standard Account Login' : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Shield size={13} style={{ verticalAlign: 'middle' }} /> Login as Trusted Person (Unique ID)
                        </span>
                      )}
                    </a>
                  )}
                </div>
              )}

              {isTrustedUidLogin ? (
                <>
                  <div className="aura-input-group anim-slide-in">
                    <label className="aura-input-label">Patient Unique Connection ID</label>
                    <input required type="text" placeholder="e.g. AURA-UID-XXXXXX" className="aura-input" value={trustedUid} onChange={e => setTrustedUid(e.target.value)}/>
                  </div>
                  <div className="aura-input-group anim-slide-in">
                    <label className="aura-input-label">Your Email Address</label>
                    <input required type="email" placeholder="e.g. trusted@gmail.com" className="aura-input" value={trustedEmail} onChange={e => setTrustedEmail(e.target.value)}/>
                  </div>
                </>
              ) : (
                <>
                  {type === 'register' && (
                    <>
                      <div className="aura-input-group">
                        <label className="aura-input-label">Full Name</label>
                        <input required type="text" className="aura-input" value={fullName} onChange={e => setFullName(e.target.value)}/>
                      </div>
                      <div className="aura-input-group">
                        <label className="aura-input-label">Date of Birth</label>
                        <input required type="date" className="aura-input" value={dob} onChange={e => setDob(e.target.value)}/>
                      </div>
                      <div className="aura-input-group">
                        <label className="aura-input-label">I am registering as a</label>
                        <select className="aura-input" value={userType} onChange={e => setUserType(e.target.value)}>
                          <option value="patient">Patient (Primary Cycle/Symptom Tracking)</option>
                          <option value="partner">Partner (Consented view to support spouse/partner)</option>
                          <option value="guardian">Guardian (Parental link for minors)</option>
                          <option value="doctor">Medical Professional (Gynecologist/Clinician)</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="aura-input-group">
                    <label className="aura-input-label">Email Address</label>
                    <input required type="email" className="aura-input" value={email} onChange={e => setEmail(e.target.value)}/>
                  </div>

                  {isPartnerLogin ? (
                    <div className="aura-input-group anim-slide-in">
                      <label className="aura-input-label">Connection Pairing Key</label>
                      <input required type="text" placeholder="e.g. AURA-PAIR-8831" className="aura-input" value={pairingKeyInput} onChange={e => setPairingKeyInput(e.target.value)}/>
                    </div>
                  ) : (
                    <div className="aura-input-group">
                      <label className="aura-input-label">Password</label>
                      <input required type="password" className="aura-input" value={password} onChange={e => setPassword(e.target.value)}/>
                    </div>
                  )}
                </>
              )}

              <button type="submit" className="aura-btn aura-btn-primary aura-btn-md" style={{ width: '100%', marginTop: '16px' }}>
                {isTrustedUidLogin ? 'Request Access Connection' : isPartnerLogin ? 'Pair & Login as Partner' : (type === 'login' ? 'Login' : 'Create Account')}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            {type === 'login' ? (
              <>New to Aura? <a onClick={() => { setCurrentView('register'); setIsTrustedUidLogin(false); }} style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold' }}>Register here</a></>
            ) : (
              <>Already have an account? <a onClick={() => { setCurrentView('login'); setIsTrustedUidLogin(false); }} style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold' }}>Login here</a></>
            )}
          </p>
        </div>
      </div>
    );
  };

  // 3. Onboarding Survey Page (For Patients)
  const OnboardingSurvey = () => {
    const [step, setStep] = useState(1);
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [cycleDate, setCycleDate] = useState('');

    const toggleCondition = (tag) => {
      if (selectedConditions.includes(tag)) {
        setSelectedConditions(selectedConditions.filter(t => t !== tag));
      } else {
        setSelectedConditions([...selectedConditions, tag]);
      }
    };

    const handleSurveySubmit = async () => {
      try {
        const res = await fetch(`${API_BASE}/onboarding/survey`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conditionTags: selectedConditions,
            cycleStartDate: cycleDate
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Onboarding completed! Welcome.');
          setUser(data.user);
          setCurrentView('dashboard');
          loadPatientDashboard();
        }
      } catch (err) {
        console.error(err);
      }
    };

    return (
      <div className="aura-onboarding-card aura-card anim-slide-in">
        <div className="aura-onboarding-progress">
          <div className="aura-onboarding-bar" style={{ width: `${(step / 2) * 100}%` }}></div>
        </div>

        {step === 1 && (
          <div>
            <h2 className="aura-auth-title" style={{ marginBottom: '16px' }}>Do you have any diagnosed hormonal health conditions?</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Selecting a tag customizes your daily AI routine checklist and alerts library. You can select multiple or skip.</p>
            
            <div className="aura-condition-selector">
              <div 
                className={`aura-condition-option ${selectedConditions.includes('pcos') ? 'selected' : ''}`}
                onClick={() => toggleCondition('pcos')}
              >
                <div style={{ flexGrow: 1 }}>
                  <strong>PCOS (Polycystic Ovary Syndrome)</strong>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Focuses on insulin sensitivity, diet items, and strength building routines.</p>
                </div>
              </div>

              <div 
                className={`aura-condition-option ${selectedConditions.includes('endometriosis') ? 'selected' : ''}`}
                onClick={() => toggleCondition('endometriosis')}
              >
                <div style={{ flexGrow: 1 }}>
                  <strong>Endometriosis</strong>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Tailored around pelvic floor exercises, soothing pain hacks, and fatigue logs.</p>
                </div>
              </div>

              <div 
                className={`aura-condition-option ${selectedConditions.includes('pmdd') ? 'selected' : ''}`}
                onClick={() => toggleCondition('pmdd')}
              >
                <div style={{ flexGrow: 1 }}>
                  <strong>PMDD (Premenstrual Dysphoric Disorder)</strong>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Highlights mood tracking anomalies, stress relievers, and luteal sleep routines.</p>
                </div>
              </div>
            </div>

            <button onClick={() => setStep(2)} className="aura-btn aura-btn-primary aura-btn-md" style={{ float: 'right', marginTop: '16px' }}>Next Step <ChevronRight size={16}/></button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="aura-auth-title" style={{ marginBottom: '16px' }}>When did your last period start?</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Used to calculate cycle length, ovulation cycles, and sync daily health recommendations.</p>

            <div className="aura-input-group">
              <label className="aura-input-label">Start Date</label>
              <input required type="date" className="aura-input" value={cycleDate} onChange={e => setCycleDate(e.target.value)}/>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button onClick={() => setStep(1)} className="aura-btn aura-btn-secondary aura-btn-md">Back</button>
              <button onClick={handleSurveySubmit} className="aura-btn aura-btn-primary aura-btn-md">Complete Onboarding</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 4. Patient Dashboard View
  const PatientDashboard = () => {
    const [painIntensity, setPainIntensity] = useState(0);
    const [waterCups, setWaterCups] = useState(0);
    const [selectedMood, setSelectedMood] = useState(3);
    const [exerciseMin, setExerciseMin] = useState(0);

    if (!dashboardData) return <div style={{ padding: '48px', textAlign: 'center' }}>Loading summary dashboard...</div>;

    const { phase, cycleDay, routine, logs, recommendations, redFlagAlert, redFlagMessage } = dashboardData;

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

        <div className="aura-dashboard-header">
          <div>
            <h2>Welcome back, {user?.fullName}</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Here is your personalized summary based on your health profile.</p>
          </div>
          <div className="aura-cycle-badge-container">
            <div style={{ textAlign: 'right' }}>
              <strong style={{ color: 'var(--color-primary-dark)', textTransform: 'capitalize' }}>{phase} Phase</strong>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Average length: 28 days</p>
            </div>
            <div className="aura-cycle-ring">
              <span className="aura-cycle-ring-day">{cycleDay}</span>
              <span className="aura-cycle-ring-lbl">Day</span>
            </div>
          </div>
        </div>

        <div className="aura-dashboard-grid">
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Daily Routine checklist */}
            <div className="aura-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>Today's AI Daily Routine</h3>
                <span className="aura-badge aura-badge-primary">AI Tailored</span>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Mark off daily actions targeted to combat symptoms of {user?.conditionTags?.join(', ').toUpperCase()}.</p>
              
              <div className="aura-routine-list">
                {routine?.items?.map((item) => (
                  <div key={item.id} className={`aura-routine-item ${item.completed ? 'completed' : ''}`}>
                    <div 
                      className={`aura-routine-checkbox ${item.completed ? 'checked' : ''}`}
                      onClick={() => handleRoutineToggle(routine._id, item.id, item.completed)}
                    >
                      {item.completed && <Check size={14}/>}
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <strong style={{ fontSize: '14px', textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</strong>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{item.rationale}</p>
                    </div>
                    <span className="aura-badge aura-badge-primary" style={{ fontSize: '9px' }}>{item.category}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Logging Widgets */}
            <div className="aura-card">
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>Quick Health Loggers</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Persist logs instantly in the cloud to update calculations across screens.</p>

              <div className="aura-today-widget-grid">
                
                {/* Mood selector */}
                <div className="aura-card" style={{ padding: '16px', background: 'var(--color-surface)' }}>
                  <label className="aura-input-label">Current Mood</label>

                  {/* SVG vector mood faces */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'space-between' }}>
                    {[
                      // 1 — Very Low: crying, down-curved mouth, furrowed brows
                      { val: 1, label: 'Very Low', face: (
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="18" fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="1.5"/>
                          {/* Furrowed brows */}
                          <path d="M10 14 Q13 11 16 13" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <path d="M24 13 Q27 11 30 14" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          {/* Sad eyes */}
                          <circle cx="14" cy="18" r="2" fill="var(--color-primary-dark)"/>
                          <circle cx="26" cy="18" r="2" fill="var(--color-primary-dark)"/>
                          {/* Tears */}
                          <path d="M13 21 Q12 24 13 26" stroke="#7EB8D4" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                          <path d="M27 21 Q28 24 27 26" stroke="#7EB8D4" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                          {/* Down-curved mouth */}
                          <path d="M13 30 Q20 25 27 30" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                        </svg>
                      )},
                      // 2 — Low: flat-sad mouth, slight brow dip
                      { val: 2, label: 'Low', face: (
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="18" fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="1.5"/>
                          {/* Mild brows */}
                          <path d="M11 15 Q14 13 16 14.5" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <path d="M24 14.5 Q26 13 29 15" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          {/* Downcast eyes */}
                          <circle cx="14" cy="19" r="2" fill="var(--color-primary-dark)"/>
                          <circle cx="26" cy="19" r="2" fill="var(--color-primary-dark)"/>
                          {/* Slightly sad mouth */}
                          <path d="M14 29 Q20 26 26 29" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                        </svg>
                      )},
                      // 3 — Moderate: neutral flat mouth, relaxed brows
                      { val: 3, label: 'Moderate', face: (
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="18" fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="1.5"/>
                          {/* Flat brows */}
                          <path d="M11 15 L16 15" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M24 15 L29 15" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round"/>
                          {/* Neutral eyes */}
                          <circle cx="14" cy="20" r="2" fill="var(--color-primary-dark)"/>
                          <circle cx="26" cy="20" r="2" fill="var(--color-primary-dark)"/>
                          {/* Straight mouth */}
                          <path d="M14 28 L26 28" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )},
                      // 4 — High: slight smile, raised brows
                      { val: 4, label: 'High', face: (
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="18" fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="1.5"/>
                          {/* Slightly raised brows */}
                          <path d="M11 14 Q14 12.5 16 13.5" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <path d="M24 13.5 Q26 12.5 29 14" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          {/* Happy eyes — slight squint */}
                          <path d="M12 19 Q14 17 16 19" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <path d="M24 19 Q26 17 28 19" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          {/* Smile */}
                          <path d="M13 26 Q20 31 27 26" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                        </svg>
                      )},
                      // 5 — Very High: big smile, cheeks, squinted eyes
                      { val: 5, label: 'Very High', face: (
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="18" fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="1.5"/>
                          {/* High arched brows */}
                          <path d="M11 13 Q14 10 16 12" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <path d="M24 12 Q26 10 29 13" stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          {/* Squinted happy eyes */}
                          <path d="M11 18 Q14 15.5 17 18" stroke="var(--color-primary-dark)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                          <path d="M23 18 Q26 15.5 29 18" stroke="var(--color-primary-dark)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                          {/* Rosy cheeks */}
                          <circle cx="10" cy="23" r="3" fill="var(--color-accent)" opacity="0.35"/>
                          <circle cx="30" cy="23" r="3" fill="var(--color-accent)" opacity="0.35"/>
                          {/* Big open smile */}
                          <path d="M12 25 Q20 33 28 25" stroke="var(--color-primary-dark)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                        </svg>
                      )},
                    ].map(({ val, label, face }) => {
                      const isSelected = logs?.mood === val;
                      const hasAny = logs?.mood != null;
                      return (
                        <button
                          key={val}
                          title={label}
                          onClick={() => handleQuickLog('mood', val, 'Quick mood log')}
                          style={{
                            width: 44, height: 44,
                            padding: 0, border: 'none', background: 'none',
                            cursor: 'pointer', borderRadius: '50%',
                            transform: isSelected ? 'scale(1.25)' : 'scale(1)',
                            opacity: hasAny && !isSelected ? 0.45 : 1,
                            outline: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent',
                            outlineOffset: '2px',
                            boxShadow: isSelected ? '0 0 0 4px var(--color-accent-light)' : 'none',
                            transition: 'all 220ms cubic-bezier(.34,1.56,.64,1)',
                          }}
                        >
                          {face}
                        </button>
                      );
                    })}
                  </div>

                  <p style={{ fontSize: '12px', marginTop: '10px', color: 'var(--color-text-muted)' }}>
                    Current log: {logs?.mood ? ['Very Low', 'Low', 'Moderate', 'High', 'Very High'][logs.mood - 1] : 'None logged today'}
                  </p>
                </div>

                {/* Hydration Logger */}
                <div className="aura-card" style={{ padding: '16px', background: 'var(--color-surface)' }}>
                  <label className="aura-input-label">Hydration (Target: 3L)</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <input 
                      type="number" 
                      placeholder="e.g. 250" 
                      className="aura-input" 
                      style={{ height: '32px' }} 
                      value={waterCups || ''} 
                      onChange={e => setWaterCups(Number(e.target.value))}
                    />
                    <button onClick={handleLogWater} className="aura-btn aura-btn-primary aura-btn-sm">Log (ml)</button>
                  </div>
                  <div style={{ marginTop: '12px', height: '6px', background: '#EFE3ED', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--color-primary)', width: `${Math.min((logs?.hydration / 3000) * 100, 100)}%` }}></div>
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--color-text-muted)' }}>
                    Logged today: {logs?.hydration || 0} / 3000 ml
                  </p>
                </div>

                {/* Pain Intensity Slider */}
                <div className="aura-card" style={{ padding: '16px', background: 'var(--color-surface)' }}>
                  <label className="aura-input-label">Pain Level (0 - 10)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                    <input 
                      type="range" min="0" max="10" 
                      style={{ flexGrow: 1 }} 
                      value={painIntensity} 
                      onChange={e => setPainIntensity(Number(e.target.value))}
                    />
                    <span style={{ fontWeight: 'bold', minWidth: '20px' }}>{painIntensity}</span>
                    <button onClick={handleLogSymptom} className="aura-btn aura-btn-primary aura-btn-sm">Log</button>
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--color-text-muted)' }}>
                    Today's peak pain: {logs?.pain != null ? `${logs.pain}/10` : 'None logged'}
                  </p>
                </div>

                {/* Exercise log */}
                <div className="aura-card" style={{ padding: '16px', background: 'var(--color-surface)' }}>
                  <label className="aura-input-label">Exercise minutes</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <input 
                      type="number" 
                      placeholder="min" 
                      className="aura-input" 
                      style={{ height: '32px' }} 
                      value={exerciseMin || ''} 
                      onChange={e => setExerciseMin(Number(e.target.value))}
                    />
                    <button onClick={handleLogExercise} className="aura-btn aura-btn-primary aura-btn-sm">Log</button>
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--color-text-muted)' }}>
                    Today's total: {logs?.exercise || 0} minutes
                  </p>
                </div>

              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* AI Recommendation Orb */}
            <div className="aura-card aura-ai-card">
              <div className="aura-ai-card-bg"></div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Activity className="anim-float" size={20}/>
                  <strong style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' }}>Aura AI Guidance</strong>
                </div>
                {recommendations && recommendations.length > 0 ? (
                  <div>
                    <h4 style={{ fontSize: '18px', marginBottom: '8px' }}>{recommendations[0].title}</h4>
                    <p style={{ fontSize: '13px', lineHeight: '1.4', opacity: 0.9 }}>{recommendations[0].description}</p>
                    
                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                      <strong>Why am I seeing this?</strong>
                      <p style={{ marginTop: '4px', opacity: 0.9 }}>
                        Condition: {user?.conditionTags?.join(', ').toUpperCase()}. Current phase: {phase}. Logs evaluated.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px' }}>AI evaluates logs daily. Keeping tracking consistency improves outputs.</p>
                )}
              </div>
            </div>

            {/* Streak & Adherence */}
            <div className="aura-card">
              <h3>Streak & Adherence</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <strong>7</strong>
                </div>
                <div>
                  <strong>7 Day Logging Streak</strong>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Keep tracking daily to preserve AI precision metrics!</p>
                </div>
              </div>
            </div>

            {/* Unique Share ID Card */}
            <div className="aura-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Key size={18} style={{ color: 'var(--color-primary)' }}/>
                <h3 style={{ margin: 0 }}>Unique Connection ID</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                Share this ID with a trusted partner or loved one to link profiles via secure OTP validation.
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <code style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold', flexGrow: 1, color: 'var(--color-primary-dark)' }}>
                  {user?.uniqueShareId || 'Not Generated Yet'}
                </code>
                <button 
                  onClick={() => {
                    if (user?.uniqueShareId) {
                      navigator.clipboard.writeText(user.uniqueShareId);
                      showToast('Copied Share ID!');
                    }
                  }} 
                  className="aura-btn aura-btn-secondary aura-btn-sm" 
                  style={{ padding: '0 8px', height: '28px', background: 'white' }}
                >
                  Copy
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // 5. Cycle Tracker View
  const CycleTracker = () => {
    const [startDate, setStartDate] = useState('');
    const [logDate, setLogDate] = useState('');
    const [flowLevel, setFlowLevel] = useState('medium');

    const handleCycleSubmit = async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(`${API_BASE}/cycles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ startDate })
        });
        const data = await res.json();
        if (data.success) {
          showToast('New cycle started successfully.');
          loadCycles();
          setStartDate('');
        }
      } catch (err) {
        console.error(err);
      }
    };

    const handleFlowSubmit = async (e) => {
      e.preventDefault();
      // Find current active cycle
      const active = cycles.find(c => c.endDate === null);
      if (!active) {
        showToast('Please start a cycle before logging flow level.');
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/cycles/${active._id}/flow`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ date: logDate, level: flowLevel })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Flow intensity logged!');
          loadCycles();
          setLogDate('');
        }
      } catch (err) {
        console.error(err);
      }
    };

    // Build interactive calendar grid for current month
    const renderCalendar = () => {
      const days = [];
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
      const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

      // Placeholder empty days
      for (let i = 0; i < firstDayIndex; i++) {
        days.push(<div key={`empty-${i}`} className="aura-calendar-day" style={{ border: 'none', opacity: 0 }}></div>);
      }

      // Generate days
      for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const dayDate = new Date(currentYear, currentMonth, dayNum);
        dayDate.setHours(0, 0, 0, 0);

        let dayClass = '';
        let isToday = dayDate.getTime() === new Date().setHours(0, 0, 0, 0);
        let hasFlow = false;
        let flowLevelName = '';

        // Match cycles for phase styling
        cycles.forEach(c => {
          const start = new Date(c.startDate);
          start.setHours(0, 0, 0, 0);
          
          let end = c.endDate ? new Date(c.endDate) : new Date();
          end.setHours(0, 0, 0, 0);

          if (dayDate >= start && dayDate <= end) {
            // Find difference
            const diffDays = Math.ceil(Math.abs(dayDate - start) / (1000 * 60 * 60 * 24)) + 1;
            const cycleDay = ((diffDays - 1) % 28) + 1;

            if (cycleDay <= 5) dayClass = 'menstrual';
            else if (cycleDay <= 12) dayClass = 'follicular';
            else if (cycleDay <= 16) dayClass = 'ovulatory';
            else dayClass = 'luteal';

            // Check if flow logged for date
            const flowLog = c.flowIntensity.find(f => {
              const d = new Date(f.date);
              d.setHours(0, 0, 0, 0);
              return d.getTime() === dayDate.getTime();
            });
            if (flowLog) {
              hasFlow = true;
              flowLevelName = flowLog.level;
            }
          }
        });

        // Match predicted start date
        if (prediction && prediction.predictedNextStart) {
          const pred = new Date(prediction.predictedNextStart);
          pred.setHours(0, 0, 0, 0);
          if (dayDate.getTime() === pred.getTime()) {
            dayClass = 'predicted';
          }
        }

        days.push(
          <div key={dayNum} className={`aura-calendar-day ${dayClass} ${isToday ? 'today' : ''}`} title={hasFlow ? `Flow: ${flowLevelName}` : ''}>
            {dayNum}
            {hasFlow && <div className="aura-flow-dot"></div>}
          </div>
        );
      }

      return days;
    };

    return (
      <div className="anim-slide-in">
        <h2>Cycle Tracking Calendar</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Log start dates and view predictions of the four cycle phases.</p>

        {prediction && (
          <div className="aura-alert" style={{ background: '#FBEFF2', borderLeft: '4px solid var(--color-accent)', color: 'var(--color-primary-dark)' }}>
            <Calendar size={20}/>
            <div>
              <strong>Next Period Prediction</strong>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>
                Your next cycle is predicted to start on <strong>{new Date(prediction.predictedNextStart).toLocaleDateString()}</strong> (28-day model cycle average).
              </p>
            </div>
          </div>
        )}

        <div className="aura-dashboard-grid">
          {/* Calendar */}
          <div className="aura-card">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            
            <div className="aura-calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="aura-calendar-day-header">{d}</div>
              ))}
              {renderCalendar()}
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '24px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#FBEFF2' }}></span> Menstrual</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#E8F5EE' }}></span> Follicular</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#FFF9E6' }}></span> Ovulatory</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#F3EFFB' }}></span> Luteal</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px dashed var(--color-accent)' }}></span> Predicted Start</div>
            </div>
          </div>

          {/* Loggers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="aura-card">
              <h3>Start a New Cycle</h3>
              <form onSubmit={handleCycleSubmit} style={{ marginTop: '16px' }}>
                <div className="aura-input-group">
                  <label className="aura-input-label">Cycle Start Date</label>
                  <input required type="date" className="aura-input" value={startDate} onChange={e => setStartDate(e.target.value)}/>
                </div>
                <button type="submit" className="aura-btn aura-btn-primary aura-btn-md" style={{ width: '100%' }}>Log Cycle Start</button>
              </form>
            </div>

            <div className="aura-card">
              <h3>Log Flow Level</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Log flow intensity for dates in active cycle.</p>
              <form onSubmit={handleFlowSubmit} style={{ marginTop: '16px' }}>
                <div className="aura-input-group">
                  <label className="aura-input-label">Date</label>
                  <input required type="date" className="aura-input" value={logDate} onChange={e => setLogDate(e.target.value)}/>
                </div>
                <div className="aura-input-group">
                  <label className="aura-input-label">Flow Level</label>
                  <select className="aura-input" value={flowLevel} onChange={e => setFlowLevel(e.target.value)}>
                    <option value="light">Light</option>
                    <option value="medium">Medium</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </div>
                <button type="submit" className="aura-btn aura-btn-secondary aura-btn-md" style={{ width: '100%' }}>Save Flow Intensity</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 6. Community Forum View
  const ForumView = () => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [replyBody, setReplyBody] = useState('');
    const [showNewThreadForm, setShowNewThreadForm] = useState(false);

    const handleCreateSubmit = (e) => {
      e.preventDefault();
      handleCreateThread(title, body, selectedCategory);
      setTitle('');
      setBody('');
      setShowNewThreadForm(false);
    };

    const handleReplySubmit = (e) => {
      e.preventDefault();
      handlePostReply(currentThread._id, replyBody);
      setReplyBody('');
    };

    if (currentThread) {
      return (
        <div className="anim-slide-in">
          <button onClick={() => setCurrentThread(null)} className="aura-btn aura-btn-secondary aura-btn-sm" style={{ marginBottom: '16px' }}>← Back to Threads</button>
          
          <div className="aura-card">
            <span className="aura-badge aura-badge-primary">{currentThread.category}</span>
            <h2 style={{ fontFamily: 'var(--font-display)', marginTop: '8px', color: 'var(--color-primary-dark)' }}>{currentThread.title}</h2>
            
            <p style={{ marginTop: '16px', fontSize: '15px', color: 'var(--color-text-primary)' }}>{currentThread.body}</p>
            
            <div className="aura-thread-meta">
              <span>By {currentThread.authorId?.fullName} ({currentThread.authorId?.userType})</span>
              <span>•</span>
              <span>{new Date(currentThread.createdAt).toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              <button onClick={() => handleUpvoteThread(currentThread._id)} className="aura-btn aura-btn-secondary aura-btn-sm">
                <ThumbsUp size={14}/> Upvote ({currentThread.upvotes?.length || 0})
              </button>
              <button onClick={() => handleReportContent(currentThread._id, 'thread', 'Inappropriate content')} className="aura-btn aura-btn-outline aura-btn-sm" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
                Report
              </button>
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px 0', fontFamily: 'var(--font-display)' }}>Replies</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {threadReplies.map((reply) => (
              <div key={reply._id} className="aura-card" style={{ padding: '16px' }}>
                <p style={{ fontSize: '14px' }}>{reply.body}</p>
                <div className="aura-thread-meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>By {reply.authorId?.fullName} ({reply.authorId?.userType})</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
                    <a onClick={() => handleReportContent(reply._id, 'reply', 'Reported reply')} style={{ color: 'var(--color-error)', cursor: 'pointer' }}>Report</a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Reply */}
          <div className="aura-card">
            <h3>Add Reply</h3>
            <form onSubmit={handleReplySubmit} style={{ marginTop: '16px' }}>
              <div className="aura-input-group">
                <textarea required className="aura-input" style={{ height: '80px', padding: '12px' }} placeholder="Write a supportive reply..." value={replyBody} onChange={e => setReplyBody(e.target.value)}></textarea>
              </div>
              <button type="submit" className="aura-btn aura-btn-primary aura-btn-md">Post Reply <Send size={14}/></button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="anim-slide-in">
        <div className="aura-forum-header">
          <div>
            <h2>Community Forums</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Share symptoms, tips, and coping remedies with others.</p>
          </div>
          <button onClick={() => setShowNewThreadForm(!showNewThreadForm)} className="aura-btn aura-btn-primary aura-btn-md">
            {showNewThreadForm ? 'Cancel' : 'Create Thread'} <Plus size={16}/>
          </button>
        </div>

        {/* Create Thread Form */}
        {showNewThreadForm && (
          <div className="aura-card" style={{ marginBottom: '24px' }}>
            <h3>Create a New Thread</h3>
            <form onSubmit={handleCreateSubmit} style={{ marginTop: '16px' }}>
              <div className="aura-input-group">
                <label className="aura-input-label">Title</label>
                <input required type="text" className="aura-input" placeholder="e.g. Managing endometriosis cramps?" value={title} onChange={e => setTitle(e.target.value)}/>
              </div>
              <div className="aura-input-group">
                <label className="aura-input-label">Content Body</label>
                <textarea required className="aura-input" style={{ height: '100px', padding: '12px' }} placeholder="Explain what symptoms or advice you need..." value={body} onChange={e => setBody(e.target.value)}></textarea>
              </div>
              <button type="submit" className="aura-btn aura-btn-primary aura-btn-md">Post Thread</button>
            </form>
          </div>
        )}

        <div className="aura-forum-tabs" style={{ marginBottom: '24px' }}>
          {['general', 'pcos', 'endometriosis', 'pmdd'].map(cat => (
            <button 
              key={cat} 
              className={`aura-forum-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => { setSelectedCategory(cat); loadForumThreads(cat); }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="aura-forum-thread-list">
          {threads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
              No threads found in this board. Be the first to start a conversation!
            </div>
          ) : (
            threads.map(thread => (
              <div 
                key={thread._id} 
                className="aura-card aura-card-interactive aura-thread-card"
                onClick={() => viewThread(thread._id)}
              >
                <span className="aura-badge aura-badge-primary">{thread.category}</span>
                <h3 style={{ color: 'var(--color-primary-dark)', marginTop: '8px', cursor: 'pointer' }}>{thread.title}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '8px' }}>
                  {thread.body.substring(0, 150)}{thread.body.length > 150 ? '...' : ''}
                </p>
                <div className="aura-thread-meta">
                  <span>Posted by {thread.authorId?.fullName} ({thread.authorId?.userType})</span>
                  <span>•</span>
                  <span>{thread.upvotes?.length || 0} Upvotes</span>
                  <span>•</span>
                  <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ReportsView has been refactored to modular component imports/Reports.jsx

  // 8. Sharing & Settings View (Patient Consent Management)
  const SharingSettings = () => {
    const [email, setEmail] = useState('');
    const [selectedScope, setSelectedScope] = useState(['cycle_phase']);
    
    const [profileName, setProfileName] = useState(user?.fullName || '');
    const [profileDob, setProfileDob] = useState(user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '');
    const [profileImg, setProfileImg] = useState(user?.profileImage || '');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleScopeChange = (sc) => {
      if (selectedScope.includes(sc)) {
        setSelectedScope(selectedScope.filter(s => s !== sc));
      } else {
        setSelectedScope([...selectedScope, sc]);
      }
    };

    const handleAddSubmit = (e) => {
      e.preventDefault();
      handleGrantConsent(email, selectedScope);
      setEmail('');
    };

    const handleSurveyRetakeClick = async () => {
      if (window.confirm("Retaking the survey will overwrite your existing AI daily routine checklist. Proceed?")) {
        setCurrentView('onboarding');
      }
    };

    return (
      <div className="anim-slide-in">
        <h2>Sharing Settings & Health Profile</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Control who has visibility to track your data per DPDP-compliant provisions.</p>

        <div className="aura-dashboard-grid">
          {/* Grant Access Form */}
          <div className="aura-card">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>Grant Access to Partner, Guardian, or Doctor</h3>
            <form onSubmit={handleAddSubmit} style={{ marginTop: '16px' }}>
              <div className="aura-input-group">
                <label className="aura-input-label">User Email Address</label>
                <input required type="email" placeholder="e.g. doctor@aura.com" className="aura-input" value={email} onChange={e => setEmail(e.target.value)}/>
              </div>

              <div className="aura-input-group">
                <label className="aura-input-label">Consented Data Scope</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input type="checkbox" checked={selectedScope.includes('cycle_phase')} onChange={() => handleScopeChange('cycle_phase')}/> Shared Cycle Phase (Follicular, Luteal, etc.)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input type="checkbox" checked={selectedScope.includes('mood_summary')} onChange={() => handleScopeChange('mood_summary')}/> Shared Mood Ratings History
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input type="checkbox" checked={selectedScope.includes('symptom_trends')} onChange={() => handleScopeChange('symptom_trends')}/> Shared Pain & Symptom Charts
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input type="checkbox" checked={selectedScope.includes('red_flags')} onChange={() => handleScopeChange('red_flags')}/> Critical Red-flag Alerts feed only
                  </label>
                </div>
              </div>

              <button type="submit" className="aura-btn aura-btn-primary aura-btn-md" style={{ width: '100%', marginTop: '16px' }}>Grant Consent</button>
            </form>
          </div>

          {/* Active Access List */}
          <div className="aura-card">
            <h3>Who can view your data</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {consents.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>You haven't granted data access to anyone yet.</p>
              ) : (
                consents.map(consent => (
                  <div key={consent._id} className="aura-card" style={{ padding: '12px', background: 'var(--color-surface)', position: 'relative' }}>
                    <strong>{consent.granteeId?.fullName}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Role: {consent.granteeId?.userType}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {consent.scope.map(s => (
                        <span key={s} className="aura-badge aura-badge-primary" style={{ fontSize: '8px' }}>{s.replace('_', ' ')}</span>
                      ))}
                    </div>
                    {consent.status === 'active' ? (
                      <button 
                        onClick={() => handleRevokeConsent(consent._id)} 
                        className="aura-btn aura-btn-danger aura-btn-sm" 
                        style={{ position: 'absolute', top: '12px', right: '12px', height: '24px', padding: '0 8px' }}
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="aura-badge aura-badge-error" style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px' }}>Revoked</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="aura-card" style={{ marginTop: '24px' }}>
          <h3>Health Profile Settings</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Update your personal registration details and profile picture.
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsUpdating(true);
            try {
              const res = await fetch(`${API_BASE}/users/profile`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  fullName: profileName,
                  dateOfBirth: profileDob,
                  profileImage: profileImg
                })
              });
              const data = await res.json();
              if (data.success) {
                showToast("Profile details updated successfully!");
                setUser(prev => ({
                  ...prev,
                  fullName: profileName,
                  dateOfBirth: new Date(profileDob),
                  profileImage: profileImg
                }));
              } else {
                showToast(data.error.message || "Failed to update profile.");
              }
            } catch (err) {
              console.error(err);
              showToast("Server error updating profile.");
            } finally {
              setIsUpdating(false);
            }
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="aura-input-group">
                <label className="aura-input-label">Full Name</label>
                <input required type="text" className="aura-input" value={profileName} onChange={e => setProfileName(e.target.value)}/>
              </div>
              <div className="aura-input-group">
                <label className="aura-input-label">Date of Birth</label>
                <input required type="date" className="aura-input" value={profileDob} onChange={e => setProfileDob(e.target.value)}/>
              </div>
            </div>

            <div className="aura-input-group" style={{ marginTop: '12px' }}>
              <label className="aura-input-label">Profile Image (Upload or Base64 String)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                {profileImg ? (
                  <img src={profileImg} alt="Preview" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-surface)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    No Photo
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfileImg(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }} 
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button disabled={isUpdating} type="submit" className="aura-btn aura-btn-primary aura-btn-md">
                {isUpdating ? 'Saving...' : 'Save Profile Changes'}
              </button>
              <button type="button" onClick={handleSurveyRetakeClick} className="aura-btn aura-btn-secondary aura-btn-md">
                Retake Onboarding Survey
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 9. Sub-Role shared dashboards (Partner, Guardian, Doctor view)
  const SubRoleDashboard = () => {
    return (
      <div className="anim-slide-in">
        <h2>Shared Health Portals</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Select an account that has explicitly granted you access parameters.</p>

        <div className="aura-dashboard-grid">
          {/* Linked accounts selection */}
          <div className="aura-card">
            <h3>Linked Patients</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {sharedPatients.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No patients have shared active scopes with your account.</p>
              ) : (
                sharedPatients.map(acc => (
                  <button 
                    key={acc.userId?._id || acc.userId}
                    onClick={() => handleViewPatientData(acc.userId?._id || acc.userId)}
                    className="aura-btn aura-btn-secondary aura-btn-md"
                    style={{ justifyContent: 'space-between', width: '100%' }}
                  >
                    <span>Patient Name: {acc.userId?.fullName || acc.userId} ({acc.relationship})</span>
                    <ChevronRight size={16}/>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Consented views rendered */}
          {activePatientData ? (
            <div className="aura-card">
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-dark)' }}>Consented View: {activePatientData.fullName}</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Granted Scopes: {activePatientData.scopes?.join(', ')}</p>

              {/* Cycle Scope */}
              {activePatientData.cycle && (
                <div className="aura-card" style={{ marginTop: '16px', background: 'var(--color-surface)' }}>
                  <strong>Current Cycle Summary</strong>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>
                    Current phase: <span className="aura-badge aura-badge-primary">{activePatientData.cycle.phase}</span>
                  </p>
                  <p style={{ fontSize: '14px', marginTop: '4px' }}>Cycle Day: {activePatientData.cycle.cycleDay}</p>

                  {/* Partner Specific Support tips */}
                  {user?.userType === 'partner' && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                      <strong style={{ color: 'var(--color-primary)' }}><Info size={14} style={{ verticalAlign: 'text-bottom' }}/> How to support today:</strong>
                      <p style={{ fontSize: '13px', fontStyle: 'italic', marginTop: '4px', color: 'var(--color-text-muted)' }}>
                        {activePatientData.cycle.phase === 'menstrual' && `${activePatientData.fullName ? activePatientData.fullName.split(' ')[0] : 'Your partner'} is menstruating today. Offer a warm heating compress or help make a warm, iron-rich lunch.`}
                        {activePatientData.cycle.phase === 'follicular' && 'Estrogen levels are high. Suggest an active outdoor activity or start a fun collaborative project!'}
                        {activePatientData.cycle.phase === 'ovulatory' && 'Energy levels spike. Good timing to schedule social outings or active gym workouts.'}
                        {activePatientData.cycle.phase === 'luteal' && `${activePatientData.fullName ? activePatientData.fullName.split(' ')[0] : 'Your partner'} is in the luteal phase. Progesterone spikes can trigger PMS. Offer extra emotional support and rest.`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Red Flags scope (Guardian alerts feed) */}
              {activePatientData.scopes?.includes('red_flags') && (
                <div className="aura-card" style={{ marginTop: '16px' }}>
                  <strong>Red-Flag Status Alerts</strong>
                  {activePatientData.redFlagAlert ? (
                    <div className="aura-alert aura-alert-warning" style={{ marginTop: '8px', marginBottom: 0 }}>
                      <AlertTriangle size={18}/>
                      <p style={{ fontSize: '12px' }}>{activePatientData.redFlagMessage}</p>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--color-success)', fontSize: '13px', marginTop: '8px' }}>✓ No critical red-flag alerts reported in the last 7 days.</p>
                  )}
                </div>
              )}

              {/* Mood list */}
              {activePatientData.moodLogs && (
                <div className="aura-card" style={{ marginTop: '16px' }}>
                  <strong>Recent Mood logs</strong>
                  <ul style={{ paddingLeft: '16px', fontSize: '13px', marginTop: '8px' }}>
                    {activePatientData.moodLogs.map((log, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>
                        {new Date(log.date).toLocaleDateString()}: Rated {log.value}/5. Note: "{log.note}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Symptom logs */}
              {activePatientData.symptomLogs && (
                <div className="aura-card" style={{ marginTop: '16px' }}>
                  <strong>Recent Pain symptom logs</strong>
                  <ul style={{ paddingLeft: '16px', fontSize: '13px', marginTop: '8px' }}>
                    {activePatientData.symptomLogs.map((log, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>
                        {new Date(log.date).toLocaleDateString()}: Pain Intensity {log.value?.intensity}/10. Note: "{log.note}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
              Select a patient from the list to populate consented diagnostic logs.
            </div>
          )}
        </div>
      </div>
    );
  };

  // 10. Admin Console View
  const AdminConsole = () => {
    return (
      <div className="anim-slide-in">
        <h2>System Administration</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Moderate flagged content, verify doctor credentials, and audit security events.</p>

        <div className="aura-dashboard-grid">
          {/* Moderation queue */}
          <div className="aura-card">
            <h3>Flagged Moderation Queue</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Flagged Threads */}
              <div>
                <strong>Flagged Threads</strong>
                {moderationQueue.threads?.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>No threads reported.</p>
                ) : (
                  moderationQueue.threads.map(t => (
                    <div key={t._id} className="aura-card" style={{ padding: '12px', background: 'var(--color-surface)', marginTop: '8px' }}>
                      <strong>{t.title}</strong>
                      <p style={{ fontSize: '12px', marginTop: '4px' }}>{t.body}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={() => handleModerateContent('thread', t._id, 'approve')} className="aura-btn aura-btn-secondary aura-btn-sm" style={{ height: '24px' }}>Approve</button>
                        <button onClick={() => handleModerateContent('thread', t._id, 'remove')} className="aura-btn aura-btn-danger aura-btn-sm" style={{ height: '24px' }}>Remove</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Flagged Replies */}
              <div style={{ marginTop: '16px' }}>
                <strong>Flagged Replies</strong>
                {moderationQueue.replies?.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>No replies reported.</p>
                ) : (
                  moderationQueue.replies.map(r => (
                    <div key={r._id} className="aura-card" style={{ padding: '12px', background: 'var(--color-surface)', marginTop: '8px' }}>
                      <p style={{ fontSize: '12px' }}>{r.body}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={() => handleModerateContent('reply', r._id, 'approve')} className="aura-btn aura-btn-secondary aura-btn-sm" style={{ height: '24px' }}>Approve</button>
                        <button onClick={() => handleModerateContent('reply', r._id, 'remove')} className="aura-btn aura-btn-danger aura-btn-sm" style={{ height: '24px' }}>Remove</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>

          {/* User management */}
          <div className="aura-card">
            <h3>Aura User Database</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {adminUsers.map(u => (
                <div key={u._id} className="aura-card" style={{ padding: '12px', background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{u.fullName}</strong>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{u.email} • {u.userType.toUpperCase()}</p>
                  </div>
                  {!u.deletedAt ? (
                    <button onClick={() => handleSuspendUser(u._id)} className="aura-btn aura-btn-danger aura-btn-sm" style={{ height: '24px', padding: '0 8px' }}>Suspend</button>
                  ) : (
                    <span className="aura-badge aura-badge-error">Suspended</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // MAIN ROUTER SWITCH
  // ----------------------------------------------------
  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage/>;
      case 'login':
        return <AuthPage type="login"/>;
      case 'register':
        return <AuthPage type="register"/>;
      case 'onboarding':
        return <OnboardingSurvey/>;
      case 'dashboard':
        return <PatientDashboard/>;
      case 'luna':
        return <LunaChat token={token} API_BASE={API_BASE} user={user} dashboardData={dashboardData} showToast={showToast} handleQuickLog={handleQuickLog} />;
      case 'timeline':
        return <Timeline user={user} timelineEvents={timelineEvents} dashboardData={dashboardData} token={token} API_BASE={API_BASE} />;
      case 'cycles':
        return <CycleTracker/>;
      case 'forum':
        return <ForumView/>;
      case 'reports':
        return <Reports user={user} analyticsData={analyticsData} showToast={showToast} />;
      case 'leave':
        return <MenstrualLeave user={user} cycles={cycles} leaveLogs={leaveLogs} handleLogLeave={handleLogLeave} showToast={showToast} />;
      case 'partner_room':
        return <PartnerRoom token={token} API_BASE={API_BASE} user={user} dashboardData={dashboardData} consents={consents} handleGrantConsent={handleGrantConsent} handleRevokeConsent={handleRevokeConsent} showToast={showToast} />;
      case 'sharing':
        return user?.userType === 'patient' ? <SharingSettings/> : <SubRoleDashboard/>;
      case 'admin':
        return <AdminConsole/>;
      default:
        return <LandingPage/>;
    }
  };

  return (
    <div className="ambient-morning" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Notifications */}
      {toast && (
        <div className="aura-toast">
          <CheckCircle size={18} style={{ color: 'var(--color-success)' }}/>
          <span>{toast}</span>
        </div>
      )}

      {/* Global Header */}
      <header className="aura-header">
        <div className="aura-container aura-header-inner">
          <a onClick={() => { if (user) { if (user.userType === 'patient') setCurrentView('dashboard'); else if (user.userType === 'admin') setCurrentView('admin'); else setCurrentView('sharing'); } else { setCurrentView('landing'); } }} className="aura-logo" style={{ cursor: 'pointer' }}>
            <div className="aura-logo-icon">A</div>
            <span>Aura Health</span>
          </a>
          
          {renderNav()}

          {!user && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setCurrentView('login')} className="aura-btn aura-btn-secondary aura-btn-sm">Login</button>
              <button onClick={() => setCurrentView('register')} className="aura-btn aura-btn-primary aura-btn-sm">Get Started</button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container Content */}
      <main className="aura-container" style={{ flexGrow: 1, padding: '32px 16px' }}>
        {renderView()}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '24px 0', background: 'var(--color-surface)', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
        <div className="aura-container">
          <p>© 2026 Aura Health. All rights reserved. Compliant under provisions of India's DPDP Act.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
            <a style={{ color: 'inherit', textDecoration: 'none' }} href="#">Privacy Policy</a>
            <span>•</span>
            <a style={{ color: 'inherit', textDecoration: 'none' }} href="#">Terms of Service</a>
            <span>•</span>
            <a style={{ color: 'inherit', textDecoration: 'none' }} href="#">Grievance Redressal Officer Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
