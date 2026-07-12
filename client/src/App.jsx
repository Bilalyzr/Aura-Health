import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Activity, Calendar, Users, BarChart3, Settings, 
  LogOut, Shield, ChevronRight, ChevronLeft, ChevronDown, Check, AlertTriangle, Plus, 
  ThumbsUp, Send, Trash2, PlusCircle, CheckCircle, RefreshCw, Info, Key,
  Sparkles, Droplet, MessageSquare, Flame
} from 'lucide-react';
import './App.css';

import LunaChat from './components/LunaChat';
import Timeline from './components/Timeline';
import Reports from './components/Reports';
import MenstrualLeave from './components/MenstrualLeave';
import PartnerRoom from './components/PartnerRoom';
import PatientDashboard from './components/PatientDashboard';

const API_BASE = 'http://localhost:5001/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('aura_token') || '');
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState(localStorage.getItem('aura_token') ? 'loading' : 'landing');
  const [toast, setToast] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Keep the branded loading animation on screen for a minimum time on boot,
  // so a fast token check doesn't make it flash by invisibly.
  const bootTimeRef = useRef(Date.now());
  const initialLoadRef = useRef(!!localStorage.getItem('aura_token'));
  const MIN_LOADING_MS = 1200;
  
  // Patient State
  const [dashboardData, setDashboardData] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [pendingOtps, setPendingOtps] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);

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

  const toggleSidebar = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    localStorage.setItem('sidebar_collapsed', nextVal ? 'true' : 'false');
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

  // Poll for partner nudges (live support popups)
  useEffect(() => {
    if (!token || !user || user.userType !== 'patient') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/partner/nudges`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.nudges && data.nudges.length > 0) {
          data.nudges.forEach(nudge => {
            showToast(nudge.message);
          });
        }
      } catch (err) {
        console.error("Nudge polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [token, user]);

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
        const applyRedirect = () => {
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
        };

        // On the very first boot load, hold the loading animation for a minimum
        // duration so it's actually seen; afterwards redirect immediately.
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          const remaining = Math.max(0, MIN_LOADING_MS - (Date.now() - bootTimeRef.current));
          setTimeout(applyRedirect, remaining);
        } else {
          applyRedirect();
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
  const loadWeeklyData = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/timeline/weekly`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setWeeklyData(data.weekly);
      }
    } catch (err) {
      console.error("Weekly data load error:", err);
    }
  };

  const loadPatientDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
        loadPendingOtps();
        loadWeeklyData();
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

    if (user.userType === 'patient') {
      return (
        <>
          <a title="Dashboard" onClick={() => { setCurrentView('dashboard'); loadPatientDashboard(); }} className={`aura-nav-link ${currentView === 'dashboard' ? 'active' : ''}`}><Heart size={15}/> <span className="aura-nav-text">Dashboard</span></a>
          <a title="Luna AI Chat" onClick={() => { setCurrentView('luna'); }} className={`aura-nav-link ${currentView === 'luna' ? 'active' : ''}`}><Activity size={15}/> <span className="aura-nav-text">Luna AI Chat</span></a>
          <a title="Timeline" onClick={() => { setCurrentView('timeline'); loadTimeline(); }} className={`aura-nav-link ${currentView === 'timeline' ? 'active' : ''}`}><RefreshCw size={15}/> <span className="aura-nav-text">Timeline</span></a>
          <a title="Cycle Tracker" onClick={() => { setCurrentView('cycles'); loadCycles(); }} className={`aura-nav-link ${currentView === 'cycles' ? 'active' : ''}`}><Calendar size={15}/> <span className="aura-nav-text">Cycle Tracker</span></a>
          <a title="Reports" onClick={() => { setCurrentView('reports'); loadAnalytics(); }} className={`aura-nav-link ${currentView === 'reports' ? 'active' : ''}`}><BarChart3 size={15}/> <span className="aura-nav-text">Reports</span></a>
          <a title="Leave" onClick={() => { setCurrentView('leave'); loadLeaveLogs(); }} className={`aura-nav-link ${currentView === 'leave' ? 'active' : ''}`}><Shield size={15}/> <span className="aura-nav-text">Leave</span></a>
          <a title="Partner Room" onClick={() => { setCurrentView('partner_room'); loadPartnerMessages(); }} className={`aura-nav-link ${currentView === 'partner_room' ? 'active' : ''}`}><Users size={15}/> <span className="aura-nav-text">Partner Room</span></a>
          <a title="Forum" onClick={() => { setCurrentView('forum'); loadForumThreads(selectedCategory); }} className={`aura-nav-link ${currentView === 'forum' ? 'active' : ''}`}><Users size={15}/> <span className="aura-nav-text">Forum</span></a>
          <a title="Consent Center" onClick={() => { setCurrentView('sharing'); loadConsents(); }} className={`aura-nav-link ${currentView === 'sharing' ? 'active' : ''}`}><Settings size={15}/> <span className="aura-nav-text">Consent Center</span></a>
        </>
      );
    }

    if (user.userType === 'admin') {
      return (
        <>
          <a title="Admin Console" onClick={() => { setCurrentView('admin'); loadAdminConsole(); }} className={`aura-nav-link ${currentView === 'admin' ? 'active' : ''}`}><Shield size={15}/> <span className="aura-nav-text">Admin Console</span></a>
          <a title="Forum" onClick={() => { setCurrentView('forum'); loadForumThreads(selectedCategory); }} className={`aura-nav-link ${currentView === 'forum' ? 'active' : ''}`}><Users size={15}/> <span className="aura-nav-text">Forum</span></a>
        </>
      );
    }

    // Doctor / Partner / Guardian
    return (
      <>
        <a title="Shared Patients" onClick={() => { setCurrentView('sharing'); loadSharedAccess(user); }} className={`aura-nav-link ${currentView === 'sharing' ? 'active' : ''}`}><Shield size={15}/> <span className="aura-nav-text">Shared Patients</span></a>
        {user.userType === 'partner' && (
          <a title="Partner Room" onClick={() => { setCurrentView('partner_room'); loadPartnerMessages(); }} className={`aura-nav-link ${currentView === 'partner_room' ? 'active' : ''}`}><Users size={15}/> <span className="aura-nav-text">Partner Room</span></a>
        )}
        <a title="Forum" onClick={() => { setCurrentView('forum'); loadForumThreads(selectedCategory); }} className={`aura-nav-link ${currentView === 'forum' ? 'active' : ''}`}><Users size={15}/> <span className="aura-nav-text">Forum</span></a>
      </>
    );
  };

  // ----------------------------------------------------
  // SUB-VIEWS RENDERING
  // ----------------------------------------------------

  // 0. Lunar Phase Cycle Loader
  const LunarLoader = () => {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        setPhase(p => (p + 1) % 8);
      }, 750);
      return () => clearInterval(timer);
    }, []);

    const phases = [
      // 1. New Moon
      <svg key="0" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ transition: 'all 600ms ease' }}>
        <circle cx="12" cy="12" r="9" strokeDasharray="2 2" opacity="0.4" />
      </svg>,
      // 2. Waxing Crescent
      <svg key="1" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ transition: 'all 600ms ease' }}>
        <circle cx="12" cy="12" r="9" strokeDasharray="2 2" opacity="0.2" />
        <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 6 6 0 0 0 0-18Z" fill="var(--color-primary)" />
      </svg>,
      // 3. First Quarter
      <svg key="2" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ transition: 'all 600ms ease' }}>
        <circle cx="12" cy="12" r="9" strokeDasharray="2 2" opacity="0.2" />
        <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9V3Z" fill="var(--color-primary)" />
      </svg>,
      // 4. Waxing Gibbous
      <svg key="3" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ transition: 'all 600ms ease' }}>
        <circle cx="12" cy="12" r="9" strokeDasharray="2 2" opacity="0.2" />
        <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 3 3 0 0 1 0-18Z" fill="var(--color-primary)" />
      </svg>,
      // 5. Full Moon
      <svg key="4" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ transition: 'all 600ms ease' }}>
        <circle cx="12" cy="12" r="9" fill="var(--color-primary)" />
      </svg>,
      // 6. Waning Gibbous
      <svg key="5" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ transition: 'all 600ms ease' }}>
        <circle cx="12" cy="12" r="9" strokeDasharray="2 2" opacity="0.2" />
        <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 3 3 0 0 0 0-18Z" fill="var(--color-primary)" />
      </svg>,
      // 7. Third Quarter
      <svg key="6" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ transition: 'all 600ms ease' }}>
        <circle cx="12" cy="12" r="9" strokeDasharray="2 2" opacity="0.2" />
        <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9V3Z" fill="var(--color-primary)" />
      </svg>,
      // 8. Waning Crescent
      <svg key="7" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ transition: 'all 600ms ease' }}>
        <circle cx="12" cy="12" r="9" strokeDasharray="2 2" opacity="0.2" />
        <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 6 6 0 0 1 0-18Z" fill="var(--color-primary)" />
      </svg>
    ];

    const phaseNames = [
      'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
      'Full Moon', 'Waning Gibbous', 'Third Quarter', 'Waning Crescent'
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--color-accent-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(61, 139, 147, 0.06), inset 0 2px 4px rgba(255,255,255,0.8)',
          border: '1px solid var(--color-border)'
        }}>
          {phases[phase]}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '15px', color: 'var(--color-primary-dark)', fontWeight: '600', letterSpacing: '0.03em' }}>
            Loading HerRhythm
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 600ms' }}>
            {phaseNames[phase]}
          </div>
        </div>
      </div>
    );
  };

  // 1. Landing Page
  const LandingPage = () => (
    <div className="aura-landing-hero">
      {/* Animated aurora / mesh-gradient backdrop */}
      <div className="aura-aurora">
        <span className="aura-aurora-blob aura-blob-1"></span>
        <span className="aura-aurora-blob aura-blob-2"></span>
        <span className="aura-aurora-blob aura-blob-3"></span>
        <div className="aura-aurora-grid"></div>
      </div>

      <div className="aura-container aura-hero-inner">
        <div className="aura-hero-content">
          <div className="aura-hero-badge">
            <Sparkles size={14} /> AI-powered hormonal &amp; cycle intelligence
          </div>

          <h1 className="aura-landing-headline">
            Your personalized companion for{' '}
            <span className="aura-headline-accent">hormonal &amp; cycle health</span>
          </h1>

          <p className="aura-landing-subhead">
            HerRhythm pairs your symptom logs and cycle phases with AI personalization — so you can
            truly understand your body and manage chronic conditions like PCOS, endometriosis, and PMDD.
          </p>

          <div className="aura-hero-cta">
            <button onClick={() => setCurrentView('register')} className="aura-btn aura-btn-primary aura-btn-lg">
              Create Account <ChevronRight size={18} />
            </button>
            <button onClick={() => setCurrentView('login')} className="aura-btn aura-btn-secondary aura-btn-lg">
              Login
            </button>
          </div>

          <div className="aura-hero-stats">
            <div className="aura-hero-stat">
              <strong>3</strong>
              <span>Conditions supported</span>
            </div>
            <div className="aura-hero-stat-divider" />
            <div className="aura-hero-stat">
              <strong>4</strong>
              <span>Cycle phases tracked</span>
            </div>
            <div className="aura-hero-stat-divider" />
            <div className="aura-hero-stat">
              <strong>24/7</strong>
              <span>Luna AI guidance</span>
            </div>
          </div>
        </div>

        <div className="aura-landing-grid">
          <div className="aura-card aura-feature-card aura-scroll-reveal" style={{ transitionDelay: '0ms' }}>
            <div className="aura-feature-icon"><Activity size={24} /></div>
            <h3>AI Daily Routine</h3>
            <p>Get daily diet, exercise, and hydration goals customized to your cycle phase and conditions.</p>
          </div>
          <div className="aura-card aura-feature-card aura-scroll-reveal" style={{ transitionDelay: '90ms' }}>
            <div className="aura-feature-icon"><Calendar size={24} /></div>
            <h3>Phase Cycle Tracker</h3>
            <p>Log period dates and get predictions across Menstrual, Follicular, Ovulatory, and Luteal phases.</p>
          </div>
          <div className="aura-card aura-feature-card aura-scroll-reveal" style={{ transitionDelay: '180ms' }}>
            <div className="aura-feature-icon"><Users size={24} /></div>
            <h3>Consented Data Sharing</h3>
            <p>Granularly share cycle info, moods, or symptom trends with partners, guardians, or gynecologists.</p>
          </div>
        </div>

        <div className="aura-testimonial-section aura-scroll-reveal">
          <div className="aura-testimonial-carousel">
            <p className="aura-testimonial-text">"Tracking on HerRhythm feels entirely different. Instead of just numbers, it gives me practical lifestyle items for my PCOS symptoms everyday."</p>
            <strong style={{ color: 'var(--color-primary)' }}>— Ananya, Bengaluru</strong>
          </div>
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
              : (type === 'login' ? 'Enter credentials to access HerRhythm.' : 'Create your secure health companion profile.')}
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
    // Calculate user's age
    const today = new Date();
    const dob = user?.dateOfBirth ? new Date(user.dateOfBirth) : null;
    let userAge = 25; // fallback
    if (dob) {
      userAge = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        userAge--;
      }
    }

    const isAdolescent = userAge < 18;
    const isMature = userAge >= 40;

    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState({
      consentProceed: 'yes',
      consentAggregated: false,
      startedPeriods: 'yes',
      menarcheAge: '',
      cycleSettle: 'settle',
      painSchool: 'never',
      familyHistory: [],
      pregnant: 'no',
      postpartum: 'no',
      periodStatus: 'regular',
      periodsStoppedReason: 'gradual',
      ovariesRemoved: 'no',
      menopause12months: 'no',
      hotFlashes: 'never',
      sleepMoodShift: 'none',
      selectedConditions: [],
      reasonForUse: 'wellness',
      contraceptionMethod: 'no',
      cycleStartDate: ''
    });

    const totalSteps = 4;

    const updateAnswer = (key, value) => {
      setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const toggleCondition = (cond) => {
      const current = answers.selectedConditions;
      if (current.includes(cond)) {
        updateAnswer('selectedConditions', current.filter(x => x !== cond));
      } else {
        updateAnswer('selectedConditions', [...current, cond]);
      }
    };

    const toggleFamilyHistory = (cond) => {
      const current = answers.familyHistory;
      if (current.includes(cond)) {
        updateAnswer('familyHistory', current.filter(x => x !== cond));
      } else {
        updateAnswer('familyHistory', [...current, cond]);
      }
    };

    const handleSurveySubmit = async () => {
      // Calculate life stage according to Tier 2 rules
      let computedLifeStage = 'REPRODUCTIVE_REGULAR';
      if (isAdolescent) {
        if (answers.startedPeriods === 'no') {
          computedLifeStage = 'PRE_MENARCHE';
        } else {
          computedLifeStage = 'ADOLESCENT';
        }
      } else {
        if (answers.pregnant === 'yes' || answers.pregnant === 'not_sure') {
          computedLifeStage = 'PREGNANCY';
        } else if (answers.postpartum === 'yes') {
          computedLifeStage = 'POSTPARTUM';
        } else if (answers.periodStatus === 'regular') {
          computedLifeStage = 'REPRODUCTIVE_REGULAR';
        } else if (answers.periodStatus === 'irregular') {
          computedLifeStage = 'REPRODUCTIVE_IRREGULAR';
        } else if (answers.periodStatus === 'stopped') {
          if (answers.periodsStoppedReason === 'surgery') {
            if (answers.ovariesRemoved === 'yes') {
              computedLifeStage = 'SURGICAL_MENOPAUSE';
            } else {
              computedLifeStage = 'NO_BLEED_OVARIES_CYCLING';
            }
          } else {
            if (userAge >= 40) {
              if (answers.menopause12months === 'yes') {
                computedLifeStage = 'MENOPAUSE';
              } else {
                computedLifeStage = 'PERIMENOPAUSE';
              }
            } else {
              computedLifeStage = 'POSSIBLE_POI_FLAG';
            }
          }
        } else if (answers.periodStatus === 'no_periods') {
          computedLifeStage = 'NO_BLEED_OVARIES_CYCLING';
        }
      }

      try {
        const res = await fetch(`${API_BASE}/onboarding/survey`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conditionTags: answers.selectedConditions,
            cycleStartDate: answers.cycleStartDate,
            lifeStage: computedLifeStage,
            surveyAnswers: answers,
            consentAggregated: answers.consentAggregated,
            locale: 'en',
            accessibilityAccommodations: []
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
        showToast('Submission failed. Please try again.');
      }
    };

    return (
      <div className="aura-onboarding-card aura-card anim-slide-in" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Personalizing HerRhythm
          </span>
          <span style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: '700' }}>
            Step {step} of {totalSteps}
          </span>
        </div>
        <div className="aura-onboarding-progress" style={{ marginBottom: '32px' }}>
          <div className="aura-onboarding-bar" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
        </div>

        {/* STEP 1: CONSENT & GENERAL GATES (T0-1, T0-2) */}
        {step === 1 && (
          <div>
            <h2 className="aura-auth-title" style={{ marginBottom: '12px', textAlign: 'left' }}>Let's set up your privacy preferences</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
              HerRhythm asks clinical health questions to personalize daily diet, cycle forecasts, and lifestyle suggestions. Your answers are private by default.
            </p>

            <div className="aura-input-group" style={{ marginBottom: '24px' }}>
              <label className="aura-input-label" style={{ marginBottom: '12px' }}>Do you consent to proceed with clinical personalization?</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => updateAnswer('consentProceed', 'yes')} 
                  className={`aura-btn ${answers.consentProceed === 'yes' ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                  style={{ flexGrow: 1 }}
                >
                  Yes, I consent
                </button>
                <button 
                  type="button"
                  onClick={() => updateAnswer('consentProceed', 'no')} 
                  className={`aura-btn ${answers.consentProceed === 'no' ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                  style={{ flexGrow: 1 }}
                >
                  No, use anonymously
                </button>
              </div>
            </div>

            <div className="aura-card" style={{ padding: '16px', background: 'var(--color-surface)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <input 
                type="checkbox" 
                id="agg-consent"
                checked={answers.consentAggregated}
                onChange={e => updateAnswer('consentAggregated', e.target.checked)}
                style={{ marginTop: '4px', cursor: 'pointer', width: '18px', height: '18px' }}
              />
              <label htmlFor="agg-consent" style={{ fontSize: '13px', color: 'var(--color-text-primary)', cursor: 'pointer', lineHeight: '1.5' }}>
                <strong>Support Women's Health Research (Optional)</strong><br />
                I agree to let HerRhythm share my fully anonymized, aggregated symptom data with medical institutions to improve chronic care research (PCOS, endometriosis). You can change this anytime.
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
              <button 
                onClick={() => setStep(2)} 
                disabled={answers.consentProceed === 'no'}
                className="aura-btn aura-btn-primary"
                style={{ opacity: answers.consentProceed === 'no' ? 0.6 : 1 }}
              >
                Continue <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DYNAMIC BRANCH QUESTIONS BY AGE */}
        {step === 2 && (
          <div>
            {/* ADOLESCENT CLINICAL QUESTIONS */}
            {isAdolescent ? (
              <div>
                <h2 className="aura-auth-title" style={{ marginBottom: '12px', textAlign: 'left' }}>How old are you, and have you started your period?</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>Tailors predictions to your body development phase.</p>

                <div className="aura-input-group" style={{ marginBottom: '20px' }}>
                  <label className="aura-input-label">Have you started getting your period yet?</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button 
                      type="button"
                      onClick={() => updateAnswer('startedPeriods', 'yes')} 
                      className={`aura-btn ${answers.startedPeriods === 'yes' ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                      style={{ flexGrow: 1 }}
                    >
                      Yes, I have
                    </button>
                    <button 
                      type="button"
                      onClick={() => updateAnswer('startedPeriods', 'no')} 
                      className={`aura-btn ${answers.startedPeriods === 'no' ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                      style={{ flexGrow: 1 }}
                    >
                      No, not yet
                    </button>
                  </div>
                </div>

                {answers.startedPeriods === 'yes' && (
                  <div className="aura-input-group">
                    <label className="aura-input-label">At what age did your period start?</label>
                    <input 
                      type="number" 
                      min="8" 
                      max="18" 
                      className="aura-input" 
                      placeholder="e.g. 12" 
                      value={answers.menarcheAge} 
                      onChange={e => updateAnswer('menarcheAge', e.target.value)} 
                    />
                  </div>
                )}
              </div>
            ) : (
              /* ADULT & MATURE SAFETY CLASSIFICATIONS */
              <div>
                <h2 className="aura-auth-title" style={{ marginBottom: '12px', textAlign: 'left' }}>Safety & cycle tracking screening</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>Essential to filter alerts and ensure medical safety.</p>

                <div className="aura-input-group" style={{ marginBottom: '20px' }}>
                  <label className="aura-input-label">Is there any chance you are pregnant right now?</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    {['yes', 'no', 'not_sure'].map(val => (
                      <button 
                        key={val}
                        type="button"
                        onClick={() => updateAnswer('pregnant', val)} 
                        className={`aura-btn ${answers.pregnant === val ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                        style={{ flexGrow: 1, textTransform: 'capitalize' }}
                      >
                        {val === 'not_sure' ? 'Not sure' : val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="aura-input-group">
                  <label className="aura-input-label">Have you been pregnant or given birth in the past 12 months?</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    {['yes', 'no'].map(val => (
                      <button 
                        key={val}
                        type="button"
                        onClick={() => updateAnswer('postpartum', val)} 
                        className={`aura-btn ${answers.postpartum === val ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                        style={{ flexGrow: 1, textTransform: 'capitalize' }}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button onClick={() => setStep(1)} className="aura-btn aura-btn-secondary">Back</button>
              <button onClick={() => setStep(3)} className="aura-btn aura-btn-primary">Next Step <ChevronRight size={16}/></button>
            </div>
          </div>
        )}

        {/* STEP 3: SPECIFIC CYCLE STATUS & SYMPTOMS */}
        {step === 3 && (
          <div>
            {/* ADOLESCENT DYNAMIC CYCLE / PAIN OPTIONS */}
            {isAdolescent ? (
              <div>
                {answers.startedPeriods === 'yes' ? (
                  <div>
                    <h2 className="aura-auth-title" style={{ marginBottom: '12px', textAlign: 'left' }}>Your cycle rhythm & comfort</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>It takes 2–3 years for teen periods to become regular. We account for this.</p>

                    <div className="aura-input-group" style={{ marginBottom: '20px' }}>
                      <label className="aura-input-label">How would you describe your cycle length lately?</label>
                      <select className="aura-input" value={answers.cycleSettle} onChange={e => updateAnswer('cycleSettle', e.target.value)}>
                        <option value="different">Pretty different each time (highly irregular)</option>
                        <option value="settle">Starting to settle into a predictable pattern</option>
                        <option value="not_sure">I'm not sure yet</option>
                      </select>
                    </div>

                    <div className="aura-input-group">
                      <label className="aura-input-label">Does period cramps or pain keep you home from school?</label>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        {['never', 'sometimes', 'often'].map(val => (
                          <button 
                            key={val}
                            type="button"
                            onClick={() => updateAnswer('painSchool', val)} 
                            className={`aura-btn ${answers.painSchool === val ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                            style={{ flexGrow: 1, textTransform: 'capitalize' }}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="aura-auth-title" style={{ marginBottom: '12px', textAlign: 'left' }}>Pre-Menarche Status</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
                      Since you haven't started your period yet, HerRhythm will focus purely on general health tips, body changes, activity habits, and stress management guides.
                    </p>
                    <div className="aura-card" style={{ padding: '16px', background: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>
                      💡 Period tracking, flow logs, and cycle phases will remain hidden until you log your first period.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ADULT & MATURE DYNAMIC CYCLE & MENOPAUSE STATUS */
              <div>
                <h2 className="aura-auth-title" style={{ marginBottom: '12px', textAlign: 'left' }}>Current cycle status & history</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>Staging helps align hormonal and symptom metrics.</p>

                <div className="aura-input-group" style={{ marginBottom: '20px' }}>
                  <label className="aura-input-label">How would you describe your periods right now?</label>
                  <select className="aura-input" value={answers.periodStatus} onChange={e => updateAnswer('periodStatus', e.target.value)}>
                    <option value="regular">Regular (bleeding occurs predictably)</option>
                    <option value="irregular">Irregular (varies significantly month-to-month)</option>
                    <option value="stopped">Stopped (periods have completely ceased)</option>
                    <option value="no_periods">I don't get periods (due to IUD, medication, etc.)</option>
                  </select>
                </div>

                {/* Stopped detail questions (B1, B2, Menopause) */}
                {answers.periodStatus === 'stopped' && (
                  <div className="aura-card" style={{ padding: '20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: '20px' }}>
                    <div className="aura-input-group" style={{ marginBottom: '16px' }}>
                      <label className="aura-input-label">What led to your periods stopping?</label>
                      <select className="aura-input" value={answers.periodsStoppedReason} onChange={e => updateAnswer('periodsStoppedReason', e.target.value)}>
                        <option value="surgery">Surgery or medical treatment (e.g. hysterectomy)</option>
                        <option value="gradual">Gradually, on its own (natural transition)</option>
                      </select>
                    </div>

                    {answers.periodsStoppedReason === 'surgery' ? (
                      <div className="aura-input-group">
                        <label className="aura-input-label">Were your ovaries removed during this treatment?</label>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                          {['yes', 'no'].map(val => (
                            <button 
                              key={val}
                              type="button"
                              onClick={() => updateAnswer('ovariesRemoved', val)} 
                              className={`aura-btn ${answers.ovariesRemoved === val ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                              style={{ flexGrow: 1, textTransform: 'capitalize' }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      isMature && (
                        <div className="aura-input-group">
                          <label className="aura-input-label">Has it been 12 consecutive months since your last period?</label>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            {['yes', 'no'].map(val => (
                              <button 
                                key={val}
                                type="button"
                                onClick={() => updateAnswer('menopause12months', val)} 
                                className={`aura-btn ${answers.menopause12months === val ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                                style={{ flexGrow: 1, textTransform: 'capitalize' }}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Regular or Irregular date picker */}
                {(answers.periodStatus === 'regular' || answers.periodStatus === 'irregular') && (
                  <div className="aura-input-group">
                    <label className="aura-input-label">When did your last period start?</label>
                    <input 
                      type="date" 
                      className="aura-input" 
                      value={answers.cycleStartDate} 
                      onChange={e => updateAnswer('cycleStartDate', e.target.value)} 
                    />
                  </div>
                )}

                {/* Mature / Perimenopause vasomotor symptoms */}
                {isMature && (answers.periodStatus === 'stopped' || answers.periodStatus === 'irregular') && (
                  <div className="aura-card" style={{ padding: '20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="aura-input-group" style={{ marginBottom: '16px' }}>
                      <label className="aura-input-label">Do you experience hot flashes or night sweats?</label>
                      <select className="aura-input" value={answers.hotFlashes} onChange={e => updateAnswer('hotFlashes', e.target.value)}>
                        <option value="never">Never</option>
                        <option value="occasionally">Occasionally</option>
                        <option value="frequently">Frequently</option>
                      </select>
                    </div>

                    <div className="aura-input-group">
                      <label className="aura-input-label">How has your sleep and mood been shifts lately?</label>
                      <select className="aura-input" value={answers.sleepMoodShift} onChange={e => updateAnswer('sleepMoodShift', e.target.value)}>
                        <option value="none">No major shifts</option>
                        <option value="sleep">Mainly sleep issues / night awakenings</option>
                        <option value="mood">Mainly mood swings / anxiety spikes</option>
                        <option value="both">Both sleep issues and mood shifts</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button onClick={() => setStep(2)} className="aura-btn aura-btn-secondary">Back</button>
              <button onClick={() => setStep(4)} className="aura-btn aura-btn-primary">Next Step <ChevronRight size={16}/></button>
            </div>
          </div>
        )}

        {/* STEP 4: DIAGNOSED CONDITIONS & USE REASONS */}
        {step === 4 && (
          <div>
            <h2 className="aura-auth-title" style={{ marginBottom: '12px', textAlign: 'left' }}>Medical history & app objectives</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>This customizes AI suggestions and prevents redundant warnings.</p>

            <div className="aura-input-group" style={{ marginBottom: '24px' }}>
              <label className="aura-input-label" style={{ marginBottom: '12px' }}>Do you currently have any diagnosed condition from this list? (Select all)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['pcos', 'thyroid', 'diabetes', 'endometriosis'].map(cond => (
                  <button 
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    className={`aura-btn ${answers.selectedConditions.includes(cond) ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                    style={{ textTransform: 'uppercase', fontSize: '12px' }}
                  >
                    {cond === 'thyroid' ? 'Thyroid disorder' : cond}
                  </button>
                ))}
              </div>
            </div>

            {isAdolescent ? (
              <div className="aura-input-group">
                <label className="aura-input-label" style={{ marginBottom: '12px' }}>Any family history of PCOS, thyroid issues, or endometriosis?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['pcos', 'thyroid', 'endometriosis'].map(cond => (
                    <button 
                      key={cond}
                      type="button"
                      onClick={() => toggleFamilyHistory(cond)}
                      className={`aura-btn ${answers.familyHistory.includes(cond) ? 'aura-btn-primary' : 'aura-btn-secondary'}`}
                      style={{ textTransform: 'uppercase', fontSize: '12px' }}
                    >
                      {cond === 'thyroid' ? 'Thyroid disorder' : cond}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="aura-input-group" style={{ marginBottom: '20px' }}>
                  <label className="aura-input-label">What brought you to HerRhythm today?</label>
                  <select className="aura-input" value={answers.reasonForUse} onChange={e => updateAnswer('reasonForUse', e.target.value)}>
                    <option value="track">Track my cycle phase</option>
                    <option value="symptom">Understand a symptom</option>
                    <option value="conceive">Trying to conceive (TTC)</option>
                    <option value="avoid">Avoid pregnancy</option>
                    <option value="wellness">General health & wellness</option>
                  </select>
                </div>

                {answers.reasonForUse === 'avoid' && (
                  <div className="aura-input-group">
                    <label className="aura-input-label">Are you using a hormonal method of contraception?</label>
                    <select className="aura-input" value={answers.contraceptionMethod} onChange={e => updateAnswer('contraceptionMethod', e.target.value)}>
                      <option value="yes">Yes, active hormonal method (Pill, IUD, Injection, Implant)</option>
                      <option value="no">No, tracking natural cycle</option>
                      <option value="non_hormonal">Using a non-hormonal method (Copper IUD, barriers)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button onClick={() => setStep(3)} className="aura-btn aura-btn-secondary">Back</button>
              <button onClick={handleSurveySubmit} className="aura-btn aura-btn-primary">Complete Onboarding</button>
            </div>
          </div>
        )}
      </div>
    );
  };
      // 4. Patient Dashboard View is now imported from ./components/PatientDashboard 

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

    const renderCircleGrid = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
      const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

      const days = [];
      // Spacer cells
      for (let i = 0; i < firstDayIndex; i++) {
        days.push({ dayNum: "", class: "", hasFlow: false, isToday: false });
      }
      for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const dayDate = new Date(currentYear, currentMonth, dayNum);
        dayDate.setHours(0, 0, 0, 0);

        let dayClass = '';
        const isToday = dayDate.getTime() === new Date().setHours(0, 0, 0, 0);
        let hasFlow = false;

        cycles.forEach(c => {
          const start = new Date(c.startDate);
          start.setHours(0, 0, 0, 0);
          
          let end = c.endDate ? new Date(c.endDate) : new Date();
          end.setHours(0, 0, 0, 0);

          if (dayDate >= start && dayDate <= end) {
            const diffDays = Math.ceil(Math.abs(dayDate - start) / (1000 * 60 * 60 * 24)) + 1;
            const cycleDay = ((diffDays - 1) % 28) + 1;

            if (cycleDay <= 5) dayClass = 'menstrual';
            else if (cycleDay <= 12) dayClass = 'follicular';
            else if (cycleDay <= 16) dayClass = 'ovulatory';
            else dayClass = 'luteal';

            const flowLog = c.flowIntensity.find(f => {
              const d = new Date(f.date);
              d.setHours(0, 0, 0, 0);
              return d.getTime() === dayDate.getTime();
            });
            if (flowLog) {
              hasFlow = true;
            }
          }
        });

        if (prediction && prediction.predictedNextStart) {
          const pred = new Date(prediction.predictedNextStart);
          pred.setHours(0, 0, 0, 0);
          if (dayDate.getTime() === pred.getTime()) {
            dayClass = 'predicted';
          }
        }

        days.push({ dayNum, class: dayClass, hasFlow, isToday });
      }

      // Fill remaining to keep grid aligned
      const totalCells = Math.ceil(days.length / 7) * 7;
      while (days.length < totalCells) {
        days.push({ dayNum: "", class: "", hasFlow: false, isToday: false });
      }

      return days.map((cell, idx) => {
        const { dayNum, class: cls, hasFlow, isToday } = cell;
        
        let bg = 'none';
        let color = 'var(--color-text-primary)';
        let border = 'none';
        
        if (cls === 'menstrual') {
          bg = 'var(--color-accent-light)';
          color = 'var(--color-primary)';
        } else if (cls === 'follicular') {
          bg = '#E8F5EE';
          color = 'var(--color-success)';
        } else if (cls === 'ovulatory') {
          bg = '#FFF9E6';
          color = 'var(--color-warning)';
        } else if (cls === 'luteal') {
          bg = '#F3EFFB';
          color = 'var(--color-primary-dark)';
        } else if (cls === 'predicted') {
          border = '1px dashed var(--color-accent)';
        }
        
        if (isToday) {
          bg = 'var(--color-primary)';
          color = 'white';
        }

        return (
          <div key={idx} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '11px', 
            fontWeight: dayNum ? '600' : '400', 
            color,
            background: bg,
            border,
            borderRadius: '50%',
            width: '22px',
            height: '22px',
            margin: '0 auto',
            position: 'relative',
            cursor: dayNum ? 'pointer' : 'default'
          }}>
            {dayNum}
            {hasFlow && (
              <span style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: 'var(--color-primary)'
              }}/>
            )}
          </div>
        );
      });
    };


    return (
      <div className="anim-slide-in">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }} className="aura-dashboard-grid-responsive">
          
          {/* Left Column - Cycle Dashboard */}
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '20px', color: 'var(--color-text-primary)' }}>Cycle Dashboard</h2>
            <div className="aura-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
              
              {/* Circular Calendar Wheel */}
              {(() => {
                const currentDay = dashboardData?.cycleDay || 1;
                const angle = (currentDay / 28) * 2 * Math.PI - Math.PI / 2;
                const pointerX = 120 + 110 * Math.cos(angle);
                const pointerY = 120 + 110 * Math.sin(angle);
                
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                const prevMonth = new Date();
                prevMonth.setMonth(prevMonth.getMonth() - 1);
                
                const nextMonthName = nextMonth.toLocaleString('default', { month: 'short' });
                const prevMonthName = prevMonth.toLocaleString('default', { month: 'short' });

                return (
                  <div style={{
                    position: 'relative',
                    width: '240px',
                    height: '240px',
                    borderRadius: '50%',
                    background: 'conic-gradient(var(--color-primary) 0% 18%, var(--color-accent) 18% 43%, var(--color-accent-light) 43% 57%, var(--color-lavender) 57% 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-md)',
                    marginBottom: '24px'
                  }}>
                    {/* Dial pointer indicator dot */}
                    <div style={{
                      position: 'absolute',
                      left: `${pointerX - 6}px`,
                      top: `${pointerY - 6}px`,
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: 'white',
                      border: '2px solid var(--color-primary)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      zIndex: 10
                    }} title={`Current day ${currentDay}`} />

                    {/* Inner white circle masking the ring */}
                    <div style={{
                      width: '216px',
                      height: '216px',
                      borderRadius: '50%',
                      background: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      position: 'relative'
                    }}>
                      {/* Month Label Top */}
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', position: 'absolute', top: '10px', textTransform: 'uppercase' }}>{prevMonthName}</span>
                      
                      {/* Days grid inside wheel */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', width: '100%', marginTop: '16px' }}>
                        {renderCircleGrid()}
                      </div>

                      {/* Month Label Bottom */}
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', position: 'absolute', bottom: '10px', textTransform: 'uppercase' }}>{nextMonthName}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Legends and Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-primary)' }}></span> Menstrual Phase
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-accent)' }}></span> Follicular Phase
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-accent-light)' }}></span> Ovulatory Phase
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-lavender)' }}></span> Luteal Phase
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Current Day</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ background: 'var(--color-primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                        {dashboardData?.cycleDay || 2}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Expected Next</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '600' }}>
                      {prediction?.predictedNextStart ? new Date(prediction.predictedNextStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Oct 3, 2023'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginTop: '20px' }}>
                <button onClick={() => setCurrentView('timeline')} className="aura-btn aura-btn-secondary" style={{ height: '40px', fontSize: '13px', justifyContent: 'center' }}>
                  <Activity size={14} style={{ marginRight: '6px' }}/> Log Symptoms
                </button>
                <button onClick={() => setCurrentView('dashboard')} className="aura-btn aura-btn-secondary" style={{ height: '40px', fontSize: '13px', justifyContent: 'center' }}>
                  Record Mood
                </button>
              </div>

            </div>
          </div>

          {/* Right Column - Loggers */}
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

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');

    const handleDeleteAccountSubmit = async () => {
      setDeleteError('');
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ password: deletePassword })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Account deleted. Logged out.');
          setShowDeleteModal(false);
          setToken(null);
          setUser(null);
          setCurrentView('landing');
        } else {
          setDeleteError(data.error?.message || 'Password incorrect or deletion failed.');
        }
      } catch (err) {
        console.error(err);
        setDeleteError('Server connection failed.');
      }
    };

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

        {/* Account Deletion */}
        <div className="aura-card" style={{ marginTop: '24px', borderColor: 'var(--color-error)', borderLeft: '4px solid var(--color-error)' }}>
          <h3 style={{ color: 'var(--color-error)' }}>Delete Account</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Under Digital Personal Data Protection (DPDP) Act provisions, you have the right to erasure. This will soft-delete your account for a 30-day grace period, after which all records will be permanently erased.
          </p>

          <button 
            type="button" 
            onClick={() => setShowDeleteModal(true)} 
            className="aura-btn aura-btn-danger aura-btn-md"
          >
            Delete Account
          </button>
        </div>

        {showDeleteModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div className="aura-card" style={{ maxWidth: '400px', width: '90%', padding: '24px' }}>
              <h3 style={{ color: 'var(--color-error)', marginBottom: '12px' }}>Confirm Account Deletion</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.4', marginBottom: '16px' }}>
                WARNING: Deleting your account will soft-delete your data for 30 days under Indian DPDP provisions. Re-enter your password to proceed.
              </p>
              
              <div className="aura-input-group">
                <label className="aura-input-label">Password</label>
                <input 
                  required 
                  type="password" 
                  className="aura-input" 
                  placeholder="Enter password"
                  value={deletePassword} 
                  onChange={e => setDeletePassword(e.target.value)}
                />
              </div>

              {deleteError && (
                <div style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '8px' }}>
                  {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError(''); }} 
                  className="aura-btn aura-btn-secondary aura-btn-sm"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleDeleteAccountSubmit} 
                  className="aura-btn aura-btn-danger aura-btn-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

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
      case 'loading':
        return <LunarLoader />;
      case 'landing':
        return <LandingPage/>;
      case 'login':
        return <AuthPage type="login"/>;
      case 'register':
        return <AuthPage type="register"/>;
      case 'onboarding':
        return <OnboardingSurvey/>;
      case 'dashboard':
        return (
          <PatientDashboard
            user={user}
            dashboardData={dashboardData}
            weeklyData={weeklyData}
            redFlagAlert={dashboardData?.redFlagAlert}
            redFlagMessage={dashboardData?.redFlagMessage}
            pendingOtps={pendingOtps}
            token={token}
            API_BASE={API_BASE}
            handleQuickLog={handleQuickLog}
            handleRoutineToggle={handleRoutineToggle}
            handleOtpAction={handleOtpAction}
            setCurrentView={setCurrentView}
            showToast={showToast}
            loadPatientDashboard={loadPatientDashboard}
          />
        );
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

  const userProfileWidget = user ? (
    <div className="aura-sidebar-profile">
      {user.profileImage ? (
        <img src={user.profileImage} alt={user.fullName} />
      ) : (
        <div className="aura-sidebar-profile-avatar">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="aura-sidebar-profile-info">
        <span className="aura-sidebar-profile-name">{user.fullName}</span>
        <span className="aura-sidebar-profile-role">{user.userType}</span>
      </div>
    </div>
  ) : null;

  return (
    <div className="aura-app-layout ambient-morning">
      
      {/* Toast Notifications */}
      {toast && (
        <div className="aura-toast">
          <CheckCircle size={18} style={{ color: 'var(--color-success)' }}/>
          <span>{toast}</span>
        </div>
      )}

      {/* Vertical Sidebar navigation for logged-in users */}
      {user && (
        <aside className={`aura-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ position: 'relative' }}>
          <button 
            onClick={toggleSidebar}
            className="aura-sidebar-toggle-btn"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>

          <div 
            onClick={() => {
              if (user.userType === 'patient') setCurrentView('dashboard');
              else if (user.userType === 'admin') setCurrentView('admin');
              else setCurrentView('sharing');
            }} 
            className="aura-sidebar-logo"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            {sidebarCollapsed ? (
              <img src="/logo.png" alt="HerRhythm" style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/logo.png" alt="HerRhythm Symbol" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }} />
                <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-primary-dark)', fontFamily: 'var(--font-display)' }}>HerRhythm</span>
              </div>
            )}
          </div>

          <nav className="aura-sidebar-nav">
            {renderNav()}
          </nav>

          <div className="aura-sidebar-footer">
            {userProfileWidget}
            <button onClick={handleLogout} className="aura-btn aura-btn-secondary aura-btn-sm" style={{ width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
              <LogOut size={13}/> <span style={{ marginLeft: '8px' }}>Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className={`aura-main-content-wrapper ${user ? (sidebarCollapsed ? 'sidebar-collapsed' : '') : 'no-sidebar'}`}>
        {/* Top Header for Guests Only */}
        {!user && (
          <header className="aura-header">
            <div className="aura-container aura-header-inner">
              <a onClick={() => setCurrentView('landing')} className="aura-logo" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/logo.png" alt="HerRhythm Symbol" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }} />
                <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-primary-dark)', fontFamily: 'var(--font-display)' }}>HerRhythm</span>
              </a>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setCurrentView('login')} className="aura-btn aura-btn-secondary aura-btn-sm">Login</button>
                <button onClick={() => setCurrentView('register')} className="aura-btn aura-btn-primary aura-btn-sm">Get Started</button>
              </div>
            </div>
          </header>
        )}

        <main style={{ flexGrow: 1, padding: '32px 24px', width: '100%', boxSizing: 'border-box' }}>
          {renderView()}
        </main>

        <footer style={{ borderTop: '1px solid var(--color-border)', padding: '24px 0', background: 'var(--color-surface)', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'auto' }}>
          <div className="aura-container">
            <p>© 2026 HerRhythm. All rights reserved. Compliant under provisions of India's DPDP Act.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
              <a style={{ color: 'inherit', textDecoration: 'none' }} href="#">Privacy Policy</a>
              <span>•</span>
              <a style={{ color: 'inherit', textDecoration: 'none' }} href="#">Terms of Service</a>
              <span>•</span>
              <a style={{ color: 'inherit', textDecoration: 'none' }} href="#">Grievance Redressal Officer Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
