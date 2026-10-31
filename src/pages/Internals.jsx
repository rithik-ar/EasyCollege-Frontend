import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, RefreshCw, AlertCircle, CheckCircle2, Wand2, ArrowLeft, Save, TrendingUp } from 'lucide-react';
import { SIMULATOR_TABLE_IDS, analyzeComponents, calculateTotal, calculateNeededForNext } from '../utils/internalsSimulation';
import { useNavigate } from 'react-router-dom';
import { signInAgain } from '../utils/session';
import './Internals.css';

function Internals() {
    const navigate = useNavigate();
    const [internalsData, setInternalsData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [simulatingId, setSimulatingId] = useState(null);
    const [simData, setSimData] = useState({});

    const fetchInternals = useCallback(async (forceRefresh = false) => {
        setIsLoading(true);
        const authToken = localStorage.getItem('auth_token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/internals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: authToken, force_refresh: forceRefresh })
            });
            const data = await response.json();
            if (response.status === 401) return signInAgain(navigate, data.error);
            if (response.ok) {
                setInternalsData(data);

                // Initialize simulation data with current values
                const initialSim = {};
                data.forEach(course => {
                    const components = analyzeComponents(course);
                    initialSim[course.course_code] = components;
                });
                setSimData(initialSim);
            } else {
                setError(data.error || 'Failed to fetch internal marks.');
            }
        } catch (err) {
            console.error("Internals API call failed:", err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    const handleSimChange = (courseCode, component, value) => {
        setSimData(prev => ({
            ...prev,
            [courseCode]: {
                ...prev[courseCode],
                [component]: value === '' ? null : parseFloat(value)
            }
        }));
    };

    useEffect(() => {
        fetchInternals(false);
    }, [fetchInternals]);

    const getMarkStatus = (total) => {
        if (total === "Not Updated Yet") return 'pending';
        const mark = parseFloat(total);
        if (isNaN(mark)) return 'default';
        if (mark >= 40) return 'high';
        if (mark >= 25) return 'medium';
        return 'low';
    };

    if (isLoading) return (
        <div className="internals-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <div className="skeleton skeleton-text" style={{ width: '120px', marginBottom: '2rem' }}></div>
            <div className="marks-table-container">
                <div className="table-wrapper">
                    <div className="skeleton skeleton-table-row" style={{ height: '40px', borderRadius: '8px', marginBottom: '16px' }}></div>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton skeleton-table-row" style={{ height: '80px', borderRadius: '12px', marginBottom: '12px' }}></div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="internals-container">
            {!isLoading && !error && (
                <div className="table-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <button className="refresh-btn" onClick={() => fetchInternals(true)} title="Force fetch from eCampus">
                        <RefreshCw size={18} />
                        <span>Sync Marks</span>
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontStyle: 'italic', paddingLeft: '4px' }}>
                        Data may be cached for speed. Use sync to fetch live from eCampus.
                    </span>
                </div>
            )}

            {error ? (
                <motion.div
                    className="error-card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <AlertCircle size={40} />
                    <p>{error}</p>
                    <button onClick={fetchInternals}>Retry</button>
                </motion.div>
            ) : (
                <motion.div
                    className="marks-table-container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {internalsData.length > 0 ? (
                        <div className="table-wrapper">
                            <table className="marks-table">
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Split Up</th>
                                        <th>Total</th>
                                        <th>Final Converted</th>
                                        <th>Goal Prediction</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...internalsData]
                                        .sort((a, b) => (a.is_lab === b.is_lab ? 0 : a.is_lab ? 1 : -1))
                                        .map((course, index) => {
                                            const hasSimulator = SIMULATOR_TABLE_IDS.includes(course.table_id);
                                            const isSimulating = hasSimulator && simulatingId === course.course_code;
                                            const currentSimData = simData[course.course_code] || analyzeComponents(course);
                                            const calculated = calculateTotal(currentSimData);
                                            const prediction = hasSimulator ? calculateNeededForNext(course) : null;

                                            // Helper to get split up display
                                            const components = analyzeComponents(course);
                                            const splitItems = [];
                                            if (components.type === 'lab') {
                                                if (components.ir1 !== null) splitItems.push({ label: 'IR1', val: components.ir1 });
                                                if (components.ir2 !== null) splitItems.push({ label: 'IR2', val: components.ir2 });
                                                if (components.plro1 !== null) splitItems.push({ label: 'PL1', val: components.plro1 });
                                                if (components.plro2 !== null) splitItems.push({ label: 'PL2', val: components.plro2 });
                                            } else if (components.type === 'lab_lt') {
                                                if (components.lt1 !== null) splitItems.push({ label: 'LT1', val: components.lt1 });
                                                if (components.lt2 !== null) splitItems.push({ label: 'LT2', val: components.lt2 });
                                            } else if (components.type === 'theory_mp') {
                                                if (components.t1 !== null) splitItems.push({ label: 'T1', val: `${Math.round(components.t1 * 10) / 10}%` });
                                                if (components.t2 !== null) splitItems.push({ label: 'T2', val: `${Math.round(components.t2 * 10) / 10}%` });
                                                if (components.ap !== null) splitItems.push({ label: 'AP', val: components.ap });
                                                if (components.mp1 !== null) splitItems.push({ label: 'MP1', val: components.mp1 });
                                                if (components.mp2 !== null) splitItems.push({ label: 'MP2', val: components.mp2 });
                                            } else if (components.type === 'theory' || components.type === 'theory_split') {
                                                if (components.t1 !== null) splitItems.push({ label: 'CA1', val: Math.round(components.t1 * 10) / 10 });
                                                if (components.t2 !== null) splitItems.push({ label: 'CA2', val: Math.round(components.t2 * 10) / 10 });

                                                if (components.type === 'theory_split') {
                                                    if (components.ap1 !== null) splitItems.push({ label: 'TUT1', val: components.ap1 });
                                                    if (components.ap2 !== null) splitItems.push({ label: 'TUT2', val: components.ap2 });
                                                } else {
                                                    if (components.ap !== null) splitItems.push({ label: 'AP', val: components.ap });
                                                }

                                                if (components.mq1 !== null) splitItems.push({ label: 'MQ1', val: components.mq1 });
                                                if (components.mq2 !== null) splitItems.push({ label: 'MQ2', val: components.mq2 });
                                            }

                                            // Tables without a hand-written breakdown (e.g. EVS, Activity Points, layouts we haven't seen):
                                            // use the components the backend matched to eCampus's own headings. Pending marks are skipped.
                                            if (splitItems.length === 0 && Array.isArray(course.components)) {
                                                course.components.forEach(({ name, value }) => {
                                                    if (value && value !== '*') splitItems.push({ label: name, val: value });
                                                });
                                            }

                                            return (
                                                <React.Fragment key={index}>
                                                    <tr className={`table-row ${isSimulating ? 'sim-active' : ''}`}>
                                                        <td>
                                                            <div className="subject-cell">
                                                                <span className="subject-code-tag">{course.course_code}</span>
                                                                <span className="subject-name">{course.course_name}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="split-up-container">
                                                                {splitItems.length > 0 ? splitItems.map((item, i) => (
                                                                    <div key={i} className="split-item">
                                                                        <span className="split-label">{item.label}</span>
                                                                        <span className="split-val">{item.val}</span>
                                                                    </div>
                                                                )) : <span className="no-split">No data yet</span>}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="mark-cell-value">
                                                                {course.total}
                                                                {course.total !== "Not Updated Yet" && <span className="max-mark">/ {course.total_max ?? 50}</span>}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="mark-cell-value accent">
                                                                {course.total_converted}
                                                                {course.total_converted !== "Not Updated Yet" && <span className="max-mark">/ {course.target_max}</span>}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {prediction ? (
                                                                <div className="goal-cell">
                                                                    <div className="goal-target">Target: {prediction.target}/40</div>
                                                                    <div className="goal-needed">Need <strong>+{prediction.increaseRaw}</strong> in CA2</div>
                                                                </div>
                                                            ) : (
                                                                <span className="no-goal">—</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {hasSimulator ? (
                                                                <button
                                                                    className={`sim-toggle ${isSimulating ? 'active' : ''}`}
                                                                    onClick={() => setSimulatingId(isSimulating ? null : course.course_code)}
                                                                    title={isSimulating ? "Close Simulator" : "Interactive Simulator"}
                                                                >
                                                                    {isSimulating ? <ArrowLeft size={16} /> : <Wand2 size={16} />}
                                                                </button>
                                                            ) : (
                                                                <span className="no-goal">—</span>
                                                            )}
                                                        </td>
                                                    </tr>

                                                    <AnimatePresence>
                                                        {isSimulating && (
                                                            <tr className="sim-row">
                                                                <td colSpan="6" className="sim-container-cell">
                                                                    <motion.div
                                                                        className="expanded-sim-view"
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                    >
                                                                        <div className="sim-grid">
                                                                            {currentSimData.type === 'lab' ? (
                                                                                <>
                                                                                    <div className="sim-field"><label>IR I (15)</label><input type="number" step="0.1" value={currentSimData.ir1 !== null ? currentSimData.ir1 : ''} onChange={(e) => handleSimChange(course.course_code, 'ir1', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>IR II (15)</label><input type="number" step="0.1" value={currentSimData.ir2 !== null ? currentSimData.ir2 : ''} onChange={(e) => handleSimChange(course.course_code, 'ir2', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>PLRO I (10)</label><input type="number" step="0.1" value={currentSimData.plro1 !== null ? currentSimData.plro1 : ''} onChange={(e) => handleSimChange(course.course_code, 'plro1', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>PLRO II (10)</label><input type="number" step="0.1" value={currentSimData.plro2 !== null ? currentSimData.plro2 : ''} onChange={(e) => handleSimChange(course.course_code, 'plro2', e.target.value)} /></div>
                                                                                </>
                                                                            ) : currentSimData.type === 'lab_lt' ? (
                                                                                <>
                                                                                    <div className="sim-field"><label>LT1 (30)</label><input type="number" step="0.1" value={currentSimData.lt1 !== null ? currentSimData.lt1 : ''} onChange={(e) => handleSimChange(course.course_code, 'lt1', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>LT2 (30)</label><input type="number" step="0.1" value={currentSimData.lt2 !== null ? currentSimData.lt2 : ''} onChange={(e) => handleSimChange(course.course_code, 'lt2', e.target.value)} /></div>
                                                                                </>
                                                                            ) : currentSimData.type === 'theory_mp' ? (
                                                                                <>
                                                                                    <div className="sim-field"><label>T1 (%)</label><input type="number" step="0.1" min="0" max="100" value={currentSimData.t1 !== null ? Math.round(currentSimData.t1 * 10) / 10 : ''} onChange={(e) => handleSimChange(course.course_code, 't1', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>T2 (%)</label><input type="number" step="0.1" min="0" max="100" value={currentSimData.t2 !== null ? Math.round(currentSimData.t2 * 10) / 10 : ''} onChange={(e) => handleSimChange(course.course_code, 't2', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>AP (8)</label><input type="number" step="0.1" value={currentSimData.ap !== null ? currentSimData.ap : ''} onChange={(e) => handleSimChange(course.course_code, 'ap', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>MP / T1 (6)</label><input type="number" step="0.1" value={currentSimData.mp1 !== null ? currentSimData.mp1 : ''} onChange={(e) => handleSimChange(course.course_code, 'mp1', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>MP / T2 (6)</label><input type="number" step="0.1" value={currentSimData.mp2 !== null ? currentSimData.mp2 : ''} onChange={(e) => handleSimChange(course.course_code, 'mp2', e.target.value)} /></div>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <div className="sim-field"><label>CA1 (out of 50)</label><input type="number" step="0.1" value={currentSimData.t1 !== null ? Math.round(currentSimData.t1 * 10) / 10 : ''} onChange={(e) => handleSimChange(course.course_code, 't1', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>CA2 (out of 50)</label><input type="number" step="0.1" value={currentSimData.t2 !== null ? Math.round(currentSimData.t2 * 10) / 10 : ''} onChange={(e) => handleSimChange(course.course_code, 't2', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>MQ1 (10)</label><input type="number" step="0.1" value={currentSimData.mq1 !== null ? currentSimData.mq1 : ''} onChange={(e) => handleSimChange(course.course_code, 'mq1', e.target.value)} /></div>
                                                                                    <div className="sim-field"><label>MQ2 (10)</label><input type="number" step="0.1" value={currentSimData.mq2 !== null ? currentSimData.mq2 : ''} onChange={(e) => handleSimChange(course.course_code, 'mq2', e.target.value)} /></div>
                                                                                    {currentSimData.type === 'theory_split' ? (
                                                                                        <>
                                                                                            <div className="sim-field"><label>TUT1 (5)</label><input type="number" step="0.1" value={currentSimData.ap1 !== null ? currentSimData.ap1 : ''} onChange={(e) => handleSimChange(course.course_code, 'ap1', e.target.value)} /></div>
                                                                                            <div className="sim-field"><label>TUT2 (5)</label><input type="number" step="0.1" value={currentSimData.ap2 !== null ? currentSimData.ap2 : ''} onChange={(e) => handleSimChange(course.course_code, 'ap2', e.target.value)} /></div>
                                                                                        </>
                                                                                    ) : (
                                                                                        <div className="sim-field"><label>AP (10)</label><input type="number" step="0.1" value={currentSimData.ap !== null ? currentSimData.ap : ''} onChange={(e) => handleSimChange(course.course_code, 'ap', e.target.value)} /></div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                        <div className="sim-result">
                                                                            <div className="sim-res-item">
                                                                                <span>Internal ({calculated.outOf ?? 50}): <strong>{calculated.raw}</strong></span>
                                                                            </div>
                                                                            <div className="sim-res-item primary">
                                                                                <span>Final ({calculated.max}): <strong>{calculated.converted}</strong></span>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </AnimatePresence>
                                                </React.Fragment>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-data">No internal marks found yet.</div>
                    )}
                </motion.div>
            )}
        </div>
    );
}

export default Internals;
