import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Lock, ChevronRight, BarChart3, TrendingUp, TrendingDown, Minus, Eye, EyeOff, LogOut } from 'lucide-react';
import './AimlDashboard.css';

function AimlDashboard() {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [passInput, setPassInput] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showUser1Pass, setShowUser1Pass] = useState(false);
    const [showUser2Pass, setShowUser2Pass] = useState(false);
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // User credentials
    const [user1, setUser1] = useState({ roll_number: '', password: '', login_type: 'S' });
    const [user2, setUser2] = useState({ roll_number: '', password: '', login_type: 'S' });
    
    const [compareResult, setCompareResult] = useState(null);

    const handleGateSubmit = async (e) => {
        e.preventDefault();
        setIsVerifying(true);
        setError('');
        
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
        try {
            const response = await fetch(`${apiUrl}/api/aiml/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passInput })
            });
            const data = await response.json();
            
            if (response.ok && data.success) {
                setIsAuthorized(true);
                setError('');
            } else {
                setError(data.error || 'Nice try, get out.');
            }
        } catch (err) {
            setError('Server verification failed.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCompare = async () => {
        if (!user1.roll_number || !user1.password || !user2.roll_number || !user2.password) {
            setError('Please fill in credentials for both buddies.');
            return;
        }

        setIsLoading(true);
        setError('');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
        
        try {
            const response = await fetch(`${apiUrl}/api/buddy-compare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user1, user2 })
            });
            const data = await response.json();
            
            if (response.ok) {
                setCompareResult(data);
            } else {
                setError(data.error || 'Failed to fetch comparison data.');
            }
        } catch (err) {
            setError('Server connection failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const getMarkClass = (mark) => {
        const val = parseFloat(mark);
        if (isNaN(val)) return 'na';
        if (val >= 40) return 'high';
        if (val >= 25) return 'med';
        return 'low';
    };

    const calculateMSE = () => {
        if (!compareResult) return null;
        const u1 = compareResult.user1.marks;
        const u2 = compareResult.user2.marks;
        
        let sumSquaredDiff = 0;
        let count = 0;

        u1.forEach(m1 => {
            const m2 = u2.find(m => m.code === m1.code);
            if (m2) {
                const v1 = parseFloat(m1.total);
                const v2 = parseFloat(m2.total);
                if (!isNaN(v1) && !isNaN(v2)) {
                    sumSquaredDiff += Math.pow(v1 - v2, 2);
                    count++;
                }
            }
        });

        return count > 0 ? (sumSquaredDiff / count).toFixed(2) : null;
    };

    const calculateDiff = (m1, m2) => {
        const v1 = parseFloat(m1);
        const v2 = parseFloat(m2);
        if (isNaN(v1) || isNaN(v2)) return null;
        return (v1 - v2).toFixed(1);
    };

    if (!isAuthorized) {
        return (
            <div className="aiml-container">
                <motion.div 
                    className="password-gate"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Lock size={48} color="#f97316" style={{ marginBottom: '1rem' }} />
                    <h2>Smh enter password</h2>
                    <form onSubmit={handleGateSubmit} className="gate-input-group">
                        <div className="gate-input-wrapper">
                            <input 
                                type={showPass ? "text" : "password"} 
                                placeholder="Password" 
                                value={passInput}
                                onChange={(e) => setPassInput(e.target.value)}
                                autoFocus
                            />
                            <button 
                                type="button" 
                                className="gate-pass-toggle"
                                onClick={() => setShowPass(!showPass)}
                            >
                                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <p className="gate-hint">Hint: darshan</p>
                        {error && <p className="error-msg">{error}</p>}
                        <button type="submit" className="gate-btn" disabled={isVerifying}>
                            {isVerifying ? 'Verifying...' : 'Enter'}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="aiml-container">
            <div className="dashboard-content">
                <header className="compare-header">
                    <div className="header-top-actions">
                        <button className="logout-dashboard-btn" onClick={() => {
                            setIsAuthorized(false);
                            setPassInput('');
                            setCompareResult(null);
                        }}>
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                    <motion.h1
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                    >
                        Buddy Compare
                    </motion.h1>
                    <p>Compare internal marks of any two fuckers instantly.</p>
                </header>

                <div className="compare-grid">
                    {/* User 1 */}
                    <div className="buddy-card">
                        <h3>Fucker 1</h3>
                        <div className="form-group">
                            <input 
                                placeholder="Roll Number" 
                                value={user1.roll_number}
                                onChange={e => setUser1({...user1, roll_number: e.target.value})}
                            />
                            <div className="buddy-input-wrapper">
                                <input 
                                    type={showUser1Pass ? "text" : "password"} 
                                    placeholder="Portal Password" 
                                    value={user1.password}
                                    onChange={e => setUser1({...user1, password: e.target.value})}
                                />
                                <button 
                                    type="button" 
                                    className="buddy-pass-toggle"
                                    onClick={() => setShowUser1Pass(!showUser1Pass)}
                                >
                                    {showUser1Pass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* User 2 */}
                    <div className="buddy-card">
                        <h3>Fucker 2</h3>
                        <div className="form-group">
                            <input 
                                placeholder="Roll Number" 
                                value={user2.roll_number}
                                onChange={e => setUser2({...user2, roll_number: e.target.value})}
                            />
                            <div className="buddy-input-wrapper">
                                <input 
                                    type={showUser2Pass ? "text" : "password"} 
                                    placeholder="Portal Password" 
                                    value={user2.password}
                                    onChange={e => setUser2({...user2, password: e.target.value})}
                                />
                                <button 
                                    type="button" 
                                    className="buddy-pass-toggle"
                                    onClick={() => setShowUser2Pass(!showUser2Pass)}
                                >
                                    {showUser2Pass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {error && <div className="error-msg">{error}</div>}

                <div className="compare-action">
                    <button 
                        className="compare-btn" 
                        onClick={handleCompare}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Scanning...' : <><BarChart3 size={20} /> Run Comparison</>}
                    </button>
                </div>

                <AnimatePresence>
                    {compareResult && (
                        <motion.div 
                            className="results-section"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="analytics-overview">
                                <div className="metric-card">
                                    <span className="metric-label">Mean Squared Error (MSE)</span>
                                    <span className="metric-value">{calculateMSE() || 'N/A'}</span>
                                    <span className="metric-desc">Lower value indicates higher similarity.</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-label">GPA Comparison</span>
                                    <span className="metric-value">
                                        <span className="val-alpha">{compareResult.user1.gpa}</span>
                                        <span className="val-vs">vs</span>
                                        <span className="val-beta">{compareResult.user2.gpa}</span>
                                    </span>
                                    <span className="metric-desc">Most Recent Semester GPA</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-label">CGPA Comparison</span>
                                    <span className="metric-value">
                                        <span className="val-alpha">{compareResult.user1.cgpa}</span>
                                        <span className="val-vs">vs</span>
                                        <span className="val-beta">{compareResult.user2.cgpa}</span>
                                    </span>
                                    <span className="metric-desc">Overall Cumulative Grade Point Average</span>
                                </div>
                            </div>

                            <div className="comparison-table-wrapper">
                                <h3>Internal Marks Comparison</h3>
                                <table className="comparison-table">
                                    <thead>
                                        <tr>
                                            <th>Course</th>
                                            <th>{compareResult.user1.name || user1.roll_number}</th>
                                            <th>Difference</th>
                                            <th>Squared Error (SE)</th>
                                            <th>{compareResult.user2.name || user2.roll_number}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {compareResult.user1.marks.map((m1) => {
                                            const m2 = compareResult.user2.marks.find(m => m.code === m1.code);
                                            const diff = m2 ? calculateDiff(m1.total, m2.total) : null;
                                            
                                            return (
                                                <tr key={m1.code}>
                                                    <td>
                                                        <div className="subject-info">
                                                            <span className="sub-code">{m1.code}</span>
                                                            <span className="sub-name">{m1.name}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={`mark-badge ${getMarkClass(m1.total)}`}>
                                                            {m1.total}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {diff !== null ? (
                                                            <div className="diff-container">
                                                                {diff > 0 ? <TrendingUp size={16} className="diff-pos" /> : 
                                                                 diff < 0 ? <TrendingDown size={16} className="diff-neg" /> : <Minus size={16} className="diff-neutral" />}
                                                                <span className={`diff-indicator ${diff > 0 ? 'diff-pos' : diff < 0 ? 'diff-neg' : 'diff-neutral'}`}>
                                                                    {diff > 0 ? `+${diff}` : diff}
                                                                </span>
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                    <td>
                                                        {diff !== null ? (
                                                            <div className="se-badge">
                                                                {(parseFloat(diff) * parseFloat(diff)).toFixed(2)}
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                    <td>
                                                        {m2 ? (
                                                            <div className={`mark-badge ${getMarkClass(m2.total)}`}>
                                                                {m2.total}
                                                            </div>
                                                        ) : 'No Data'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="comparison-table-wrapper" style={{ marginTop: '3rem' }}>
                                <h3>Semester-wise SGPA Comparison</h3>
                                <table className="comparison-table">
                                    <thead>
                                        <tr>
                                            <th>Semester</th>
                                            <th>{compareResult.user1.name || 'User 1'}</th>
                                            <th>Performance</th>
                                            <th>{compareResult.user2.name || 'User 2'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const sems = Array.from(new Set([
                                                ...(compareResult.user1.semwise_history || []).map(s => s.sem),
                                                ...(compareResult.user2.semwise_history || []).map(s => s.sem)
                                            ])).sort((a, b) => a - b);

                                            return sems.map(sem => {
                                                const s1 = (compareResult.user1.semwise_history || []).find(s => s.sem === sem);
                                                const s2 = (compareResult.user2.semwise_history || []).find(s => s.sem === sem);
                                                const sgpa1 = s1 ? s1.sgpa : 0;
                                                const sgpa2 = s2 ? s2.sgpa : 0;
                                                const diff = sgpa1 && sgpa2 ? (sgpa1 - sgpa2).toFixed(2) : null;

                                                return (
                                                    <tr key={sem}>
                                                        <td>Sem {sem}</td>
                                                        <td>
                                                            <div className="mark-badge info">{sgpa1 || 'N/A'}</div>
                                                        </td>
                                                        <td>
                                                            {diff !== null ? (
                                                                <div className="diff-container">
                                                                    {parseFloat(diff) > 0 ? <TrendingUp size={16} className="diff-pos" /> : 
                                                                     parseFloat(diff) < 0 ? <TrendingDown size={16} className="diff-neg" /> : <Minus size={16} className="diff-neutral" />}
                                                                    <span className={`diff-indicator ${parseFloat(diff) > 0 ? 'diff-pos' : parseFloat(diff) < 0 ? 'diff-neg' : 'diff-neutral'}`}>
                                                                        {parseFloat(diff) > 0 ? `+${diff}` : diff}
                                                                    </span>
                                                                </div>
                                                            ) : '—'}
                                                        </td>
                                                        <td>
                                                            <div className="mark-badge info">{sgpa2 || 'N/A'}</div>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default AimlDashboard;
