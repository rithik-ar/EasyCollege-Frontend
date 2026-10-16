import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, RefreshCw, AlertCircle, CheckCircle2, Wand2, ArrowLeft, Save, TrendingUp } from 'lucide-react';
import './Internals.css';

function Internals() {
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
    }, []);

    const analyzeComponents = (course) => {
        const { table_id, row_data } = course;
        const result = {
            t1: null, t2: null, ap: null, ap1: null, ap2: null, mq1: null, mq2: null,
            ir1: null, ir2: null, plro1: null, plro2: null
        };

        const parse = (val) => {
            if (!val || val === "*" || val === "Pending" || val === "") return null;
            return parseFloat(val);
        };

        if (table_id === '8^1600' || table_id === '8^1601' || table_id === '8^1602') {
            result.ir1 = parse(row_data[2]);
            result.ir2 = parse(row_data[3]);
            result.plro1 = parse(row_data[4]);
            result.plro2 = parse(row_data[5]);
            result.type = 'lab';
        } else if (table_id === '8^2210') {
            // Reverse convert displayed / 0.6 to get raw component
            result.t1 = parse(row_data[2]) !== null ? parse(row_data[2]) / 0.6 : null;
            result.t2 = parse(row_data[3]) !== null ? parse(row_data[3]) / 0.6 : null;
            result.ap = parse(row_data[5]);
            result.mq1 = parse(row_data[6]);
            result.mq2 = parse(row_data[7]);
            result.type = 'theory';
        } else if (table_id === '8^2220') {
            result.t1 = parse(row_data[2]) !== null ? parse(row_data[2]) / 0.6 : null;
            result.t2 = parse(row_data[3]) !== null ? parse(row_data[3]) / 0.6 : null;
            result.ap1 = parse(row_data[5]);
            result.ap2 = parse(row_data[6]);
            result.mq1 = parse(row_data[7]);
            result.mq2 = parse(row_data[8]);
            result.type = 'theory_split';
        }

        return result;
    };

    const calculateTotal = (data) => {
        let testTotal = 0;
        let mcqTotal = 0;
        let apTotal = 0;
        let labTotal = 0;

        const val = (v) => v === null ? 0 : v;

        if (data.type === 'lab') {
            labTotal = val(data.ir1) + val(data.ir2) + val(data.plro1) + val(data.plro2);
            return { raw: labTotal, 50: labTotal, converted: Math.round(labTotal * 1.2), max: 60 };
        } else {
            // Input T1/T2 are now Raw out of 50. Convert to 30 before averaging.
            const t1_displayed = val(data.t1) * 0.6;
            const t2_displayed = val(data.t2) * 0.6;
            testTotal = (t1_displayed + t2_displayed) / 2;

            mcqTotal = (val(data.mq1) + val(data.mq2)) / 2;
            apTotal = data.type === 'theory_split' ? val(data.ap1) + val(data.ap2) : val(data.ap);

            const total50 = testTotal + mcqTotal + apTotal;
            return { raw: total50.toFixed(2), 50: total50, converted: Math.round(total50 * 0.8), max: 40 };
        }
    };

    const handleSimChange = (courseCode, component, value) => {
        setSimData(prev => ({
            ...prev,
            [courseCode]: {
                ...prev[courseCode],
                [component]: value === '' ? null : parseFloat(value)
            }
        }));
    };

    const calculateNeededForNext = (course) => {
        if (!course.total || course.total === "Not Updated Yet") return null;

        // Only show for theory courses
        if (course.is_lab) return null;

        // Check if everything is filled (no * or Pending in row_data)
        const hasPending = course.row_data && course.row_data.some(val =>
            val === "*" || val === "Pending" || val === ""
        );
        if (hasPending) return null;

        const currentTotal = parseFloat(course.total);
        if (isNaN(currentTotal)) return null;

        const current40 = Math.round(currentTotal * 0.8);
        const target40 = current40 + 1;

        const targetThreshold40 = target40 - 0.5;
        const targetTotal50 = targetThreshold40 / 0.8;

        const neededIncreaseTotal = targetTotal50 - currentTotal;

        // Needed increase in test average
        const neededIncreaseAvg = neededIncreaseTotal;

        // Needed increase in sum of T1+T2 (displayed)
        const neededIncreaseSumDisplayed = neededIncreaseAvg * 2;

        // Conversion from raw 50 to displayed 30: Displayed = Raw * 0.6
        const neededIncreaseRaw = neededIncreaseSumDisplayed / 0.6;

        // Ceil to 0.5
        const ceiledIncrease = Math.ceil(neededIncreaseRaw * 2) / 2;

        return {
            target: target40,
            increaseRaw: Math.max(0, ceiledIncrease).toFixed(1)
        };
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
                                        <th>Total (50)</th>
                                        <th>Final Converted</th>
                                        <th>Goal Prediction</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...internalsData]
                                        .sort((a, b) => (a.is_lab === b.is_lab ? 0 : a.is_lab ? 1 : -1))
                                        .map((course, index) => {
                                            const isSimulating = simulatingId === course.course_code;
                                            const currentSimData = simData[course.course_code] || analyzeComponents(course);
                                            const calculated = calculateTotal(currentSimData);
                                            const prediction = calculateNeededForNext(course);

                                            // Helper to get split up display
                                            const components = analyzeComponents(course);
                                            const splitItems = [];
                                            if (components.type === 'lab') {
                                                if (components.ir1 !== null) splitItems.push({ label: 'IR1', val: components.ir1 });
                                                if (components.ir2 !== null) splitItems.push({ label: 'IR2', val: components.ir2 });
                                                if (components.plro1 !== null) splitItems.push({ label: 'PL1', val: components.plro1 });
                                                if (components.plro2 !== null) splitItems.push({ label: 'PL2', val: components.plro2 });
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
                                                                {course.total !== "Not Updated Yet" && <span className="max-mark">/ 50</span>}
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
                                                            <button
                                                                className={`sim-toggle ${isSimulating ? 'active' : ''}`}
                                                                onClick={() => setSimulatingId(isSimulating ? null : course.course_code)}
                                                                title={isSimulating ? "Close Simulator" : "Interactive Simulator"}
                                                            >
                                                                {isSimulating ? <ArrowLeft size={16} /> : <Wand2 size={16} />}
                                                            </button>
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
                                                                                <span>Internal (50): <strong>{calculated.raw}</strong></span>
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
