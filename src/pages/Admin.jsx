import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { Activity, ArrowRight, CircleAlert, LayoutGrid, Lock, MessageSquare, Search, TriangleAlert, Users } from 'lucide-react';
import useAdminFetch, { API_URL } from './admin/useAdminFetch';
import Overview from './admin/Overview';
import StudentSearch from './admin/StudentSearch';
import FeedbackInbox from './admin/FeedbackInbox';
import Usage from './admin/Usage';
import EventsView from './admin/EventsView';
import WeekRail from './admin/WeekRail';
import UserRings from './admin/UserRings';
import { ADMIN_SPRING, formatNumber, tokenIssuedAt } from './admin/format';
import './Admin.css';

const MotionNav = motion.nav;
const MotionSpan = motion.span;

const SESSION_MS = 12 * 60 * 60 * 1000; // backend ADMIN_TOKEN_TTL_HOURS

const SECTIONS = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid, title: 'Overview' },
    { key: 'search', label: 'Students', icon: Search, title: 'Student lookup' },
    { key: 'feedback', label: 'Feedback', icon: MessageSquare, title: 'Feedback inbox' },
    { key: 'usage', label: 'Usage', icon: Users, title: 'Usage' },
    { key: 'failures', label: 'Failures', icon: TriangleAlert, title: 'Failures' },
    { key: 'activity', label: 'Activity', icon: Activity, title: 'Activity' }
];

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';

const RECENT_KEY = 'admin_recent_rolls';
const RECENT_LIMIT = 5;

// Recent lookups as [{roll, name}]; older sessions stored bare roll numbers
const readRecent = () => {
    try {
        const stored = JSON.parse(sessionStorage.getItem(RECENT_KEY) || '[]');
        if (!Array.isArray(stored)) return [];
        return stored
            .map(item => (typeof item === 'string' ? { roll: item, name: '' } : item))
            .filter(item => item && typeof item.roll === 'string')
            .slice(0, RECENT_LIMIT);
    } catch {
        return [];
    }
};

const sectionFromHash = () => {
    const key = window.location.hash.replace('#', '');
    return SECTIONS.some(s => s.key === key) ? key : 'overview';
};

function Admin() {
    const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('admin_token') || '');
    const [password, setPassword] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [notice, setNotice] = useState('');
    const [section, setSection] = useState(sectionFromHash);
    const [requestedRoll, setRequestedRoll] = useState(null);
    const [recent, setRecent] = useState(readRecent);
    const [now, setNow] = useState(() => Date.now());
    const rollInputRef = useRef(null);
    const navRef = useRef(null);

    // Which way the last section change went (+1 down/right the nav, -1 up/left), so content enters from that side
    const [shown, setShown] = useState({ section, direction: 1 });
    if (shown.section !== section) {
        const indexOf = (key) => SECTIONS.findIndex(s => s.key === key);
        setShown({ section, direction: indexOf(section) >= indexOf(shown.section) ? 1 : -1 });
    }

    // Keep the active pill visible in the phone's scrolling section bar
    useEffect(() => {
        navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [section, adminToken]);

    // No student navbar here, so drop the space body reserves for it while the console is mounted.
    // Layout effect: applied before the first paint, otherwise the page visibly jumps up 80px.
    useLayoutEffect(() => {
        document.body.classList.add('adm-body');
        return () => document.body.classList.remove('adm-body');
    }, []);

    // The console's own type: loaded only on this page, not for every student
    useEffect(() => {
        if (document.querySelector(`link[href="${FONTS_URL}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONTS_URL;
        document.head.appendChild(link);
    }, []);

    const endSession = useCallback((message = '') => {
        setAdminToken('');
        sessionStorage.removeItem('admin_token');
        setNotice(message);
    }, []);

    const expireSession = useCallback(() => endSession('Session expired. Enter the password again.'), [endSession]);

    const issuedAt = adminToken ? tokenIssuedAt(adminToken) : null;
    const remaining = issuedAt ? issuedAt + SESSION_MS - now : null;

    useEffect(() => {
        if (!adminToken) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, [adminToken]);

    useEffect(() => {
        if (remaining !== null && remaining <= 0) expireSession();
    }, [remaining, expireSession]);

    // The section lives in the URL hash, so back/forward and shared links work
    useEffect(() => {
        const onHashChange = () => setSection(sectionFromHash());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const navigate = useCallback((key) => {
        setSection(key);
        if (window.location.hash !== `#${key}`) window.history.pushState(null, '', `#${key}`);
    }, []);

    const rememberStudent = useCallback((student) => {
        setRecent(prev => {
            const next = [student, ...prev.filter(r => r.roll !== student.roll)].slice(0, RECENT_LIMIT);
            try { sessionStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
            return next;
        });
    }, []);

    const openStudent = useCallback((roll) => {
        if (!roll) return;
        navigate('search');
        setRequestedRoll({ roll, at: Date.now() });
    }, [navigate]);

    // 1-6 switch sections, / jumps to the roll number field (not while typing)
    useEffect(() => {
        if (!adminToken) return undefined;
        const onKey = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
            const index = Number(e.key) - 1;
            if (SECTIONS[index]) {
                navigate(SECTIONS[index].key);
            } else if (e.key === '/') {
                e.preventDefault();
                navigate('search');
                setTimeout(() => rollInputRef.current?.focus(), 0);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [adminToken, navigate]);

    // Sidebar signal: failures in the last 24 hours, refreshed every 5 minutes
    const pulse = useAdminFetch('/api/admin/events?kind=failure&hours=24&limit=1', adminToken, expireSession, !!adminToken);
    const { reload: reloadPulse } = pulse;
    useEffect(() => {
        if (!adminToken) return undefined;
        const timer = setInterval(reloadPulse, 5 * 60 * 1000);
        return () => clearInterval(timer);
    }, [adminToken, reloadPulse]);

    const failureCount = pulse.data?.total ?? null;
    const pageChanged = (pulse.data?.counts || []).some(c => c.reason === 'parse');

    const handleUnlock = async (e) => {
        e.preventDefault();
        setIsUnlocking(true);
        setNotice('');
        try {
            const response = await fetch(`${API_URL}/api/admin/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('admin_token', data.token);
                setAdminToken(data.token);
                setPassword('');
                setNow(Date.now());
            } else {
                setNotice(data.error || 'Wrong password');
            }
        } catch {
            setNotice('Could not reach the backend');
        } finally {
            setIsUnlocking(false);
        }
    };

    if (!adminToken) {
        return (
            <div className="adm adm-gate">
                <form className="adm-gate-panel" onSubmit={handleUnlock}>
                    <div className="adm-brand"><span className="adm-brand-mark" aria-hidden="true" />EasyCollege</div>
                    <h1 className="adm-gate-title">Console locked</h1>
                    <div className="adm-field">
                        <label htmlFor="adm-password">Password</label>
                        <div className="adm-lookup-row">
                            <input
                                id="adm-password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                                autoFocus
                            />
                            <button type="submit" className="adm-btn adm-btn-primary" disabled={isUnlocking || !password}>
                                {isUnlocking ? 'Checking' : 'Unlock'} {!isUnlocking && <ArrowRight size={14} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>
                    {notice && <p className="adm-state adm-state-error" role="alert"><Lock size={14} aria-hidden="true" /> {notice}</p>}
                </form>
            </div>
        );
    }

    const current = SECTIONS.find(s => s.key === section);

    return (
        <MotionConfig reducedMotion="user" transition={ADMIN_SPRING}>
        <div className="adm adm-shell">
            <aside className="adm-side">
                <div className="adm-brand"><span className="adm-brand-mark" aria-hidden="true" />EasyCollege</div>
                <MotionNav className="adm-nav" aria-label="Admin sections" ref={navRef} layoutScroll>
                    {SECTIONS.map((s, index) => {
                        const Icon = s.icon;
                        return (
                            <button
                                key={s.key}
                                type="button"
                                className={`adm-nav-item ${section === s.key ? 'is-active' : ''}`}
                                aria-current={section === s.key ? 'page' : undefined}
                                onClick={() => navigate(s.key)}
                            >
                                {/* One indicator that slides between items instead of jumping */}
                                {section === s.key && <MotionSpan layoutId="adm-nav-active" className="adm-nav-active" aria-hidden="true" />}
                                <Icon size={16} aria-hidden="true" />
                                <span className="adm-nav-label">{s.label}</span>
                                {s.key === 'failures' && failureCount > 0 && (
                                    <span className={`adm-badge ${pageChanged ? 'is-alarm' : ''}`} title={pageChanged ? 'Includes page-changed failures' : 'Failures, last 24 hours'}>
                                        {formatNumber(failureCount)}
                                    </span>
                                )}
                                <kbd className="adm-nav-key" aria-hidden="true">{index + 1}</kbd>
                            </button>
                        );
                    })}
                </MotionNav>
                <UserRings token={adminToken} onExpired={expireSession} onOpen={() => navigate('usage')} />
                <div className="adm-side-foot">
                    <WeekRail token={adminToken} onExpired={expireSession} onOpen={() => navigate('failures')} />
                    <button type="button" className="adm-lock" onClick={() => endSession()} aria-label="Lock console">
                        <Lock size={16} aria-hidden="true" />
                        <span className="adm-lock-label">Lock</span>
                    </button>
                </div>
            </aside>

            <main className="adm-main" style={{ '--adm-dir': shown.direction }}>
                <header className="adm-head" key={`head-${section}`}>
                    <p className="adm-kicker">0{SECTIONS.indexOf(current) + 1} / {current.label}</p>
                    <h1 className="adm-title">{current.title}</h1>
                </header>

                {pulse.error && (
                    <p className="adm-state adm-state-error" role="alert"><CircleAlert size={14} aria-hidden="true" /> {pulse.error}</p>
                )}

                {section === 'overview' && <Overview token={adminToken} onExpired={expireSession} onNavigate={navigate} onOpenStudent={openStudent} />}
                {/* Kept mounted so a looked-up student survives switching sections */}
                <div hidden={section !== 'search'}>
                    <StudentSearch
                        token={adminToken}
                        onExpired={expireSession}
                        requestedRoll={requestedRoll}
                        inputRef={rollInputRef}
                        recent={recent}
                        onRemember={rememberStudent}
                    />
                </div>
                {section === 'feedback' && <FeedbackInbox token={adminToken} onExpired={expireSession} onOpenStudent={openStudent} />}
                {section === 'usage' && <Usage token={adminToken} onExpired={expireSession} />}
                {section === 'failures' && <EventsView key="events-failure" kind="failure" token={adminToken} onExpired={expireSession} onOpenStudent={openStudent} />}
                {section === 'activity' && <EventsView key="events-activity" kind="activity" token={adminToken} onExpired={expireSession} onOpenStudent={openStudent} />}
            </main>
        </div>
        </MotionConfig>
    );
}

export default Admin;
