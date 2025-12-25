
import { Link, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import List from './pages/List';
import New from './pages/New';
import Details from './pages/Details';
import Stats from './pages/Stats';
import Login from './pages/Login';
import Register from './pages/Register';
import BackgroundCanvas from './components/BackgroundCanvas';
import { list } from './services/jobApplications';
import { isAuthenticated, getUser, logout } from './services/auth';
import type { JobApplication } from './types';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
}

function MiniStats() {
  const [items, setItems] = useState<JobApplication[]>([]);
  useEffect(() => { list().then(setItems).catch(() => {}); }, []);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.status, (m.get(i.status) ?? 0) + 1);
    return m;
  }, [items]);

  const applied = counts.get('Applied') ?? 0;
  const interview = counts.get('Interview') ?? 0;
  const offers = counts.get('Offer') ?? 0;

  return (
    <div className="chips">
      <span className="chip" title="Sve nove prijave">📥 {applied} Applied</span>
      <span className="chip" title="Razgovori zakazani/odrađeni">🎤 {interview} Interview</span>
      <span className="chip" title="Ponude">🎯 {offers} Offer</span>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isActive = (p: string) => (pathname === p ? 'active' : '');
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!isAuthenticated() && !isAuthPage) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container"> 
      <BackgroundCanvas />
      <div className="bg-noise" />

      {!isAuthPage && (
        <header className={`header neon-hover ${scrolled ? 'shrink' : ''}`}>
          <h1>Job Application Tracker</h1>
          <nav>
            <Link className={isActive('/')} to="/">Lista</Link>
            <Link className={isActive('/new')} to="/new">Nova prijava</Link>
            <Link className={isActive('/stats')} to="/stats">Statistika</Link>
          </nav>
          <MiniStats />
          {user && (
            <div className="user-menu">
              <button 
                className="user-avatar-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                title={`${user.firstName} ${user.lastName}`}
              >
                {user.firstName[0]}{user.lastName[0]}
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <button 
                    className="dropdown-item logout-item"
                    onClick={() => { logout(); window.location.href = '/login'; }}
                  >
                    Odjava
                  </button>
                </div>
              )}
            </div>
          )}
        </header>
      )}

      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><List /></PrivateRoute>} />
          <Route path="/new" element={<PrivateRoute><New /></PrivateRoute>} />
          <Route path="/app/:id" element={<PrivateRoute><Details /></PrivateRoute>} />
          <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
        </Routes>
      </main>
    </div>
  );
}
