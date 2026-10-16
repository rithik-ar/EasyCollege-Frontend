import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';
import { RefreshCw } from 'lucide-react';
import './Gpa.css';

function Gpa() {
    const [gpaData, setGpaData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [excludedIndices, setExcludedIndices] = useState(new Set());
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
            if (response.ok) {
                setGpaData(data);
                setCalculatedGpa(data.gpa);
                setCalculatedCredits(data.total_credits);
            } else {
                setError(data.error || 'Failed to fetch GPA data.');
            }
        } catch (err) {
            console.error("GPA API call failed:", err);
            setError('An error occurred while fetching GPA data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGpa(false);
    }, [fetchGpa]);

    const toggleExclude = (index) => {
        const newExcluded = new Set(excludedIndices);
        if (newExcluded.has(index)) {
            newExcluded.delete(index);
        } else {
            newExcluded.add(index);
        }
        setExcludedIndices(newExcluded);
        recalculate(newExcluded);
    };

    const recalculate = (excluded) => {
        if (!gpaData || !gpaData.table) return;

        let summation = 0;
        let totalCredits = 0;
        let hasRA = false;

        gpaData.table.forEach((course, index) => {
            if (excluded.has(index)) return;

            const credits = parseInt(course.credits) || 0;
            const grade = course.grade || "";

            if (credits === 0) return;

            if (grade.startsWith("RA") || grade.startsWith("0 ")) {
                hasRA = true;
            } else {
                try {
                    let gradePoints = parseInt(grade.substring(0, 2));
                    if (isNaN(gradePoints)) {
                        const gMap = { 'O': 10, 'S': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'D': 4, 'E': 3 };
                        gradePoints = gMap[grade.trim()];
                    }
                    if (!isNaN(gradePoints) && gradePoints !== undefined) {
                        summation += credits * gradePoints;
                        totalCredits += credits;
                    }
                } catch (e) {
                    console.error("Error parsing grade:", grade);
                }
            }
        });

        if (hasRA) {
            setCalculatedGpa("RA");
        } else if (totalCredits === 0) {
            setCalculatedGpa("0.00");
        } else {
            setCalculatedGpa((summation / totalCredits).toFixed(2));
        }
        setCalculatedCredits(totalCredits);
    };

    if (isLoading) return (
        <div className="gpa-page-wrapper">
            <div className="gpa-card" style={{ padding: '2rem' }}>
                <div className="gpa-header-section">
                    <div className="skeleton skeleton-title" style={{ width: '250px' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '400px', maxWidth: '100%' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '300px', maxWidth: '80%', marginTop: '4px' }}></div>
                </div>
                <div className="summary-cards-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem', marginTop: '2rem' }}>
                    <div className="skeleton skeleton-card" style={{ height: '120px', borderRadius: '16px' }}></div>
                    <div className="skeleton skeleton-card" style={{ height: '120px', borderRadius: '16px' }}></div>
                    <div className="skeleton skeleton-card" style={{ height: '120px', borderRadius: '16px' }}></div>
                </div>
                <div className="table-section-glass" style={{ border: 'none', background: 'transparent' }}>
                    <div className="skeleton skeleton-table-row" style={{ height: '40px', borderRadius: '8px', marginBottom: '12px' }}></div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton skeleton-table-row" style={{ height: '50px', borderRadius: '8px', marginBottom: '8px' }}></div>
                    ))}
                </div>
            </div>
        </div>
    );
    if (error) return <div className="error-message">{error}</div>;
    if (!gpaData) return <p>No GPA data found.</p>;

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
                        <button onClick={() => fetchGpa(true)} title="Force fetch from eCampus" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw size={20} />
                        </button>
                    </div>
                    <div>
                        <h1>GPA Calculator</h1>
                        <p>Track your academic performance across all courses</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                            Data may be cached for speed. Use the reload button to fetch live from eCampus.
                        </p>
                    </div>
                </div>

                {/* Summary Cards Row */}
                <div className="summary-cards-row">
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
                            {gpaData.table ? gpaData.table.length - excludedIndices.size : 0}
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
                <div className="table-section-glass">
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
                                <tr key={index} className={excludedIndices.has(index) ? 'excluded-row' : ''}>
                                    <td className="checkbox-cell" style={{ textAlign: 'center' }} data-label="SELECT">
                                        <label className="modern-checkbox">
                                            <input 
                                                type="checkbox" 
                                                checked={!excludedIndices.has(index)} 
                                                onChange={() => toggleExclude(index)}
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