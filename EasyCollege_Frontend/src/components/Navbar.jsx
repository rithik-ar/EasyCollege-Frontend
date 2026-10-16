import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LogOut, Info, Mail, LayoutDashboard, User, Zap, Menu, X, MessageSquarePlus, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


function Navbar() {
    const navigate = useNavigate();
    const storedUser = localStorage.getItem('user');
    const isLoggedIn = !!storedUser;

    const SERVER_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    const [isFastMode, setIsFastMode] = useState(localStorage.getItem('fastMode') === 'true');
    const [showTooltip, setShowTooltip] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState('General Feedback');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (!feedbackMessage.trim()) return;
        setIsSubmittingFeedback(true);
        try {
            const authToken = localStorage.getItem('auth_token');
            const res = await fetch(`${SERVER_URL}/api/submit-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: authToken, type: feedbackType, message: feedbackMessage })
            });
            if (res.ok) {
                setFeedbackMessage('');
                setIsFeedbackModalOpen(false);
                alert('Feedback submitted successfully! Thank you.');
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || 'Failed to submit feedback'}`);
            }
        } catch (err) {
            console.error('Feedback submit error:', err);
            alert('Failed to submit feedback due to a network error.');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const toggleFastMode = async () => {
        const newValue = !isFastMode;
        setIsFastMode(newValue);
        localStorage.setItem('fastMode', newValue);

        try {
            const response = await fetch(`${SERVER_URL}/api/settings/opt-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auth_token: localStorage.getItem('auth_token'),
                    opt_in: newValue
                })
            });
            const data = await response.json();
            if (!data.success) {
                setIsFastMode(!newValue);
                localStorage.setItem('fastMode', !newValue);
            }
        } catch (error) {
            setIsFastMode(!newValue);
            localStorage.setItem('fastMode', !newValue);
        }
    };

    let userName = '';
    if (isLoggedIn) {
        try {
            userName = JSON.parse(storedUser);
        } catch (e) {
            userName = storedUser;
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('credentials'); // Keep for backward compatibility cleanup
        localStorage.removeItem('auth_token');
        localStorage.removeItem('login_type');
        navigate('/');
    };

    const contactUrl = "https://mail.google.com/mail/u/0/?view=cm&to=23z362@psgtech.ac.in&su=Contact%20from%20Easy%20College&body=Hello,%0D%0A%0D%0AI'm%20contacting%20you%20regarding%20Easy%20College.%0D%0A%0D%0ARegards,%0D%0A[Your%20Name]";

    return (
        <>
            <motion.nav
                className="navbar"
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="title-container">
                    <Link to={isLoggedIn ? "/dashboard" : "/"} className="logo">
                        Easy College
                    </Link>
                </div>

                <div className="navbar-links">
                    {isLoggedIn && (
                        <div className="user-greeting" title={userName}>
                            <User size={16} />
                            <span>{userName}</span>
                        </div>
                    )}

                    {isLoggedIn && (
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
                            <LayoutDashboard size={18} />
                            <span className="hide-mobile">Dashboard</span>
                        </NavLink>
                    )}

                    {isLoggedIn && (
                        <div
                            style={{ position: 'relative' }}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <button
                                onClick={toggleFastMode}
                                className={isFastMode ? "active-fast-mode" : ""}
                                style={{
                                    color: isFastMode ? '#fb923c' : 'var(--text-secondary)',
                                    background: isFastMode ? 'rgba(251, 146, 60, 0.1)' : 'transparent',
                                    border: isFastMode ? '1px solid rgba(251, 146, 60, 0.3)' : 'none',
                                }}
                            >
                                <Zap size={18} fill={isFastMode ? '#fb923c' : 'none'} color={isFastMode ? '#fb923c' : 'currentColor'} />
                                <span className="hide-mobile">Fast Mode</span>
                            </button>

                            <AnimatePresence>
                                {showTooltip && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        style={{
                                            position: 'absolute',
                                            top: '120%',
                                            right: 0,
                                            width: '240px',
                                            background: 'rgba(20, 20, 20, 0.95)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            backdropFilter: 'blur(16px)',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            color: '#e2e8f0',
                                            fontSize: '0.85rem',
                                            lineHeight: '1.4',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                            zIndex: 9999,
                                            pointerEvents: 'none',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ color: '#fb923c', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Zap size={14} fill="#fb923c" /> Fast Loading Mode
                                        </div>
                                        By enabling this, you agree to let us securely cache your college data for a faster experience.
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                        <Mail size={18} />
                        <span className="hide-mobile">Contact</span>
                    </a>

                    {isLoggedIn && (
                        <>
                            <button
                                onClick={() => setIsFeedbackModalOpen(true)}
                                title="Give Feedback"
                            >
                                <MessageSquarePlus size={18} />
                                <span className="hide-mobile">Feedback</span>
                            </button>
                            <NavLink to="/about" className={({ isActive }) => isActive ? "active" : ""}>
                                <Info size={18} />
                                <span className="hide-mobile">About</span>
                            </NavLink>
                            <button onClick={handleLogout}>
                                <LogOut size={18} />
                                <span className="hide-mobile">Logout</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile Helper Text - In between Logo and Actions */}
                {isLoggedIn && (
                    <div className="mobile-fast-mode-text" style={{ flex: 1, padding: '0 8px', display: 'none', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.1 }}>Fast Mode</span>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', lineHeight: 1.1, marginTop: '2px' }}>By enabling, you agree to cache data for speed.</span>
                    </div>
                )}

                <div className="mobile-nav-actions">
                    {/* Mobile Fast Mode Toggle (Inside Nav) */}
                    {isLoggedIn && (
                        <div
                            onClick={toggleFastMode}
                            style={{
                                width: '40px',
                                height: '22px',
                                background: isFastMode ? '#fb923c' : 'rgba(255,255,255,0.2)',
                                borderRadius: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px',
                                cursor: 'pointer',
                                transition: 'background 0.3s ease',
                                flexShrink: 0
                            }}
                        >
                            <motion.div
                                animate={{ x: isFastMode ? 18 : 0 }}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }}
                            />
                        </div>
                    )}

                    {/* Hamburger Button */}
                    <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu size={24} />
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay - OUTSIDE nav to escape stacking context */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            style={{
                                position: 'fixed',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.5)',
                                zIndex: 9998
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, x: '100%' }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: '80%',
                                maxWidth: '300px',
                                background: 'rgba(10, 10, 15, 0.98)',
                                backdropFilter: 'blur(20px)',
                                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                                zIndex: 10000,
                                padding: '2rem 1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.5rem'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {isLoggedIn && (
                                <div style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    Hello, {userName}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {isLoggedIn && (
                                    <NavLink to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem' }}>
                                        <LayoutDashboard size={20} /> Dashboard
                                    </NavLink>
                                )}

                                <a href={contactUrl} target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem' }}>
                                    <Mail size={20} /> Contact
                                </a>

                                {isLoggedIn && (
                                    <>
                                        <NavLink to="/about" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem' }}>
                                            <Info size={20} /> About
                                        </NavLink>
                                        <button
                                            onClick={() => { setIsMobileMenuOpen(false); setIsFeedbackModalOpen(true); }}
                                            style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                                        >
                                            <MessageSquarePlus size={20} /> Feedback
                                        </button>
                                        <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} style={{ color: '#ef4444', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                                            <LogOut size={20} /> Logout
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Feedback Modal */}
            <AnimatePresence>
                {isFeedbackModalOpen && (
                    <div className="feedback-modal-overlay" onClick={() => setIsFeedbackModalOpen(false)}>
                        <motion.div
                            className="feedback-modal"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="feedback-header">
                                <h2>Submit Feedback</h2>
                                <button className="feedback-close" onClick={() => setIsFeedbackModalOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleFeedbackSubmit}>
                                <select
                                    className="feedback-type-select"
                                    value={feedbackType}
                                    onChange={(e) => setFeedbackType(e.target.value)}
                                >
                                    <option value="Bug Report">Bug Report</option>
                                    <option value="Feature Request">Feature Request</option>
                                    <option value="General Feedback">General Feedback</option>
                                </select>
                                <textarea
                                    className="feedback-textarea"
                                    placeholder="Tell us what's on your mind..."
                                    value={feedbackMessage}
                                    onChange={(e) => setFeedbackMessage(e.target.value)}
                                    required
                                />
                                <button type="submit" className="feedback-submit" disabled={isSubmittingFeedback || !feedbackMessage.trim()}>
                                    {isSubmittingFeedback ? <Loader2 size={20} className="bunk-spinner" /> : <Send size={20} />}
                                    {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

export default Navbar;