import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import ElectionTimeline from './pages/ElectionTimeline';
import DocumentAnalyzer from './pages/DocumentAnalyzer';
import PollingBoothFinder from './pages/PollingBoothFinder';
import FraudReportCenter from './pages/FraudReportCenter';
import QuizArena from './pages/QuizArena';
import ElectionChatbot from './pages/ElectionChatbot';
import { initGA4 } from './utils/analytics';
import LanguageSelector from './components/LanguageSelector';


const NAV_ITEMS = [
  { path: '/', label: 'Election Timeline', icon: '📅' },
  { path: '/chatbot', label: 'AI Chatbot', icon: '🤖' },
  { path: '/document-analyzer', label: 'Document Analyzer', icon: '📄' },
  { path: '/polling-booths', label: 'Polling Booths', icon: '🗺️' },
  { path: '/fraud-report', label: 'Fraud Report', icon: '🚨' },
  { path: '/quiz', label: 'Quiz Arena', icon: '🧠' },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('vv-theme') || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('vv-lang') || 'en');
  const [appError, setAppError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Load GA4 config from backend
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => { if (cfg.ga4MeasurementId) initGA4(cfg.ga4MeasurementId); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vv-theme', theme);
  }, [theme]);

  useEffect(() => { setSidebarOpen(false); }, [location]);

  const cycleTheme = () => {
    const order = ['dark', 'light', 'high-contrast'];
    setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  };

  const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🔳';

  useEffect(() => {
    const handleError = (e) => {
      console.error('CRITICAL APP ERROR:', e);
      setAppError(e.message || 'Unknown app error');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (appError) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: 'red', color: 'white', height: '100vh', zIndex: 99999, position: 'relative' }}>
        <h1 style={{ fontSize: '3rem' }}>🚨 CRITICAL ERROR 🚨</h1>
        <p style={{ fontSize: '1.5rem', margin: '20px 0' }}>{appError}</p>
        <button className="btn btn-primary" onClick={() => { localStorage.clear(); window.location.reload(); }}>Reset & Reload</button>
      </div>
    );
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(o => !o)}
        aria-label="Toggle navigation menu">☰</button>

      <div className="app-layout">
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Main navigation">
          <div className="sidebar-brand">
            <span className="sidebar-brand-icon">🗳️</span>
            <h1>VoterVerse</h1>
          </div>
          <div className="sidebar-nav" role="list">
            {NAV_ITEMS.map(item => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                role="listitem">
                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="sidebar-footer">
            <button className="btn-icon" onClick={cycleTheme}
              aria-label={`Switch theme (current: ${theme})`} title={`Theme: ${theme}`}>
              {themeIcon}
            </button>
          </div>
        </nav>

        <main className="main-content" id="main-content">
          <Routes>
            <Route path="/" element={<ElectionTimeline />} />
            <Route path="/chatbot" element={<ElectionChatbot />} />
            <Route path="/document-analyzer" element={<DocumentAnalyzer />} />
            <Route path="/polling-booths" element={<PollingBoothFinder />} />
            <Route path="/fraud-report" element={<FraudReportCenter />} />
            <Route path="/quiz" element={<QuizArena />} />
          </Routes>
        </main>
        <LanguageSelector onLanguageChange={setLang} />
      </div>
    </>
  );
}
