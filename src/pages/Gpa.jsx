import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '../components/Modal';
import RefreshIcon from '../components/RefreshIcon';
import FeaturePoster from '../components/FeaturePoster';
import { useNavigate } from 'react-router-dom';
import { signInAgain } from '../utils/session';
import { friendlyError } from '../utils/friendlyError';
import { gradePoints, unrecognisedNotice } from '../utils/grading';
import { roundHalfUp } from '../utils/cgpaEstimate';
import RegulationPrompt from '../components/RegulationPrompt';
import './Gpa.css';

// Exclusions follow the course, so they still mean the same thing if a refresh changes the rows
const courseKey = (course) => `${course.sem}|${course.course}|${course.title}`;

function Gpa() {
    const navigate = useNavigate();
    const [gpaData, setGpaData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [excludedKeys, setExcludedKeys] = useState(new Set());
    const excludedRef = useRef(excludedKeys); // the latest selection, for a refresh that answers after a toggle
    const [calculatedGpa, setCalculatedGpa] = useState(null);
    const [calculatedCredits, setCalculatedCredits] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const modalShown = localStorage.getItem('gpa_modal_shown');
        if (!modalShown) {
            setIsModalOpen(true);
        }
    }, []);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        localStorage.setItem('gpa_modal_shown', 'true');
    };

    const recalculate = useCallback((data, excluded) => {
        if (!data || !data.table) return;

        let summation = 0;
        let totalCredits = 0;
        let hasRA = false;

        data.table.forEach((course) => {
            if (excluded.has(courseKey(course))) return;

            const credits = parseInt(course.credits) || 0;
            const grade = course.grade || "";

            if (credits === 0) return;

            if (grade.startsWith("RA") || grade.startsWith("0 ")) {
                hasRA = true;
            } else {
                const points = gradePoints(grade, data.regulation);
                if (points !== null) {
                    summation += credits * points;
                    totalCredits += credits;
                }
            }
        });

        if (hasRA) {
            setCalculatedGpa("RA");
        } else if (totalCredits === 0) {
            setCalculatedGpa("0.00");
        } else {
            setCalculatedGpa(roundHalfUp(summation, totalCredits).toFixed(2));
        }
        setCalculatedCredits(totalCredits);
    }, []);

    const fetchGpa = useCallback(async (forceRefresh = false) => {
        setIsLoading(true);
        const authToken = localStorage.getItem('auth_token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/gpa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: authToken, force_refresh: forceRefresh })
            });
            const data = await response.json();
            if (response.status === 401) return signInAgain(navigate, data.error);
            if (response.ok) {
                setGpaData(data);
                if (excludedRef.current.size > 0) {
                    recalculate(data, excludedRef.current);
                } else {
                    setCalculatedGpa(data.gpa);
                    setCalculatedCredits(data.total_credits);
                }
            } else {
                setError(data.error || 'Failed to fetch GPA data.');
            }
        } catch (err) {
            console.error("GPA API call failed:", err);
            setError('An error occurred while fetching GPA data.');
        } finally {
            setIsLoading(false);
        }
    }, [navigate, recalculate]);

    useEffect(() => {
        fetchGpa(false);
    }, [fetchGpa]);

    const hasData = Boolean(gpaData);

    // A failed refresh leaves the last numbers on screen, so the message says so briefly and then gets out of the way
    useEffect(() => {
        if (!error || !hasData) return undefined;
        const timer = setTimeout(() => setError(''), 6000);
        return () => clearTimeout(timer);
    }, [error, hasData]);

    const toggleExclude = (key) => {
        const newExcluded = new Set(excludedKeys);
        if (newExcluded.has(key)) {
            newExcluded.delete(key);
        } else {
            newExcluded.add(key);
        }
        excludedRef.current = newExcluded;
        setExcludedKeys(newExcluded);
        recalculate(gpaData, newExcluded);
    };

    if (isLoading && !hasData) return <FeaturePoster label="Loading your GPA" />;
    if (error && !hasData) return <div className="error-message">{friendlyError(error)}</div>;
    if (!gpaData) return <p>No GPA data found.</p>;

    const gradeNotice = unrecognisedNotice(gpaData.table || [], gpaData.regulation);

    return (
        <div className="gpa-page-wrapper">
            <Modal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                title="Course Selection Info"
            >
                <p>Please note that the option for <strong>selecting courses</strong> has been enabled to accommodate <strong>fast-track courses</strong> and <strong>open elective courses</strong>. This allows for a more accurate calculation of your GPA based on your specific academic path.</p>
            </Modal>

            <div className="gpa-card">
                {/* Header matching image */}
                <div className="gpa-header-section" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '0', right: '0' }}>
                        <button onClick={() => fetchGpa(true)} disabled={isLoading} aria-busy={isLoading} title="Force fetch from eCampus" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', color: 'var(--text-secondary)', cursor: isLoading ? 'progress' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshIcon size={20} spinning={isLoading} />
                        </button>
                    </div>
                    <div>
                        <h1>GPA Calculator</h1>
                        <p>Track your academic performance across all courses</p>
                        {error ? (
                            <p className="refresh-error" role="alert" style={{ marginTop: '4px' }}>Couldn't refresh. {friendlyError(error)}</p>
                        ) : (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                                Data may be cached for speed. Use the reload button to fetch live from eCampus.
                            </p>
                        )}
                    </div>
                </div>

                {gpaData.regulation_confirmed === false && (
                    <RegulationPrompt suggested={gpaData.regulation} suggestedLabel="Detected" onSaved={() => fetchGpa(false)} />
                )}
                {gradeNotice && <p className="grade-notice" role="status">{gradeNotice}</p>}

                {/* Summary Cards Row */}
                <div className="summary-cards-row refresh-haze" aria-busy={isLoading}>
                    <div className="gpa-summary-card">
                        <div className="summary-label">Total Credits</div>
                        <div className="summary-value">{calculatedCredits}</div>
                    </div>
                    <div className="gpa-summary-card">
                        <div className="summary-label">Current GPA</div>
                        <div className="summary-value gpa-accent">{calculatedGpa}</div>
                    </div>
                    <div className="gpa-summary-card">
                        <div className="summary-label">Total Courses</div>
                        <div className="summary-value courses-accent">
                            {gpaData.table ? gpaData.table.filter(course => !excludedKeys.has(courseKey(course))).length : 0}
                        </div>
                    </div>
                </div>

                {/* Modernized Table */}
                <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                    <h3 style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course Details (Toggle to exclude)</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: '1.4' }}>
                        *While calculating GPA please exclude any additional one credit or fast track or additional open electives you may have done. 
                    </p>
                </div>
                <div className="table-section-glass refresh-haze" aria-busy={isLoading}>
                    <table className="gpa-modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>
                                    <span className="short-text">SEL</span>
                                    <span className="full-text">SELECT</span>
                                </th>
                                <th><span className="full-text">SEMESTER</span><span className="short-text">SEM</span></th>
                                <th><span className="full-text">COURSE CODE</span><span className="short-text">CODE</span></th>
                                <th><span className="full-text">COURSE NAME</span><span className="short-text">NAME</span></th>
                                <th><span className="full-text">CREDITS</span><span className="short-text">CR</span></th>
                                <th><span className="full-text">GRADE</span><span className="short-text">GR</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {gpaData.table && gpaData.table.map((course, index) => (
                                <tr key={index} className={excludedKeys.has(courseKey(course)) ? 'excluded-row' : ''}>
                                    <td className="checkbox-cell" style={{ textAlign: 'center' }} data-label="SELECT">
                                        <label className="modern-checkbox">
                                            <input 
                                                type="checkbox" 
                                                checked={!excludedKeys.has(courseKey(course))}
                                                onChange={() => toggleExclude(courseKey(course))}
                                            />
                                            <span className="checkmark"></span>
                                        </label>
                                    </td>
                                    <td data-label="SEMESTER">
                                        <span className="sem-badge">{course.sem || '5'}</span>
                                    </td>
                                    <td data-label="COURSE CODE" className="course-code-cell">{course.course || '-'}</td>
                                    <td data-label="COURSE NAME" className="course-name-cell">{course.title}</td>
                                    <td data-label="CREDITS">
                                        <span className="credits-badge-modern">{course.credits}</span>
                                    </td>
                                    <td data-label="GRADE" className="grade-cell">
                                        {course.grade === 'Completed' ? (
                                            <span className="completed-badge">Completed</span>
                                        ) : (
                                            course.grade
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Gpa;