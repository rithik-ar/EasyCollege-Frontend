import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import Modal from '../components/Modal';
import { RefreshCw, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Cgpa.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function Cgpa() {
    const [cgpaData, setCgpaData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [excludedIds, setExcludedIds] = useState(new Set());
    const [displayData, setDisplayData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const modalShown = localStorage.getItem('cgpa_modal_shown');
        if (!modalShown) {
            setIsModalOpen(true);
        }
    }, []);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        localStorage.setItem('cgpa_modal_shown', 'true');
    };

    const gradesMap = { 'O': 10, 'S': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'D': 4, 'E': 3 };

    const recalculate = useCallback((data, excluded) => {
        if (!data || !data.all_subjects) return;

        const semData = {};
        let totalCredits = 0;
        let totalCreditPoints = 0;
        let hasIncludedRA = false;

        data.all_subjects.forEach((subject, index) => {
            if (excluded.has(index)) return;

            const grade = subject.grade;
            const credits = parseInt(subject.credits) || 0;
            const sem = parseInt(subject.sem);

            if (grade === "RA") {
                hasIncludedRA = true;
                return;
            }

            const gradePoints = gradesMap[grade] || 0;
            totalCredits += credits;
            totalCreditPoints += gradePoints * credits;

            if (!semData[sem]) semData[sem] = [];
            semData[sem].push({ gradePoints, credits });
        });

        const semwise_data = [];
        let cumulativeCP = 0;
        let cumulativeCredits = 0;

        Object.keys(semData).sort((a, b) => a - b).forEach(semKey => {
            const gradesList = semData[semKey];
            const semCP = gradesList.reduce((sum, item) => sum + item.gradePoints * item.credits, 0);
            const semCredits = gradesList.reduce((sum, item) => sum + item.credits, 0);

            cumulativeCP += semCP;
            cumulativeCredits += semCredits;

            semwise_data.push({
                sem: parseInt(semKey),
                sgpa: semCredits ? (semCP / semCredits).toFixed(2) : "0.00",
                cgpa: cumulativeCredits ? (cumulativeCP / cumulativeCredits).toFixed(2) : "0.00"
            });
        });

        setDisplayData({
            cgpa: hasIncludedRA ? "RA" : (semwise_data.length ? semwise_data[semwise_data.length - 1].cgpa : "0.00"),
            total_credits: totalCredits,
            credit_points_total: totalCreditPoints,
            semwise_data
        });
    }, []);

    const fetchCgpa = useCallback(async (forceRefresh = false) => {
        setIsLoading(true);
        const authToken = localStorage.getItem('auth_token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/cgpa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: authToken, force_refresh: forceRefresh })
            });
            const data = await response.json();
            if (response.ok) {
                setCgpaData(data);
                recalculate(data, new Set());
            } else {
                setError(data.error || 'Failed to fetch CGPA data.');
            }
        } catch (err) {
            console.error("CGPA API call failed:", err);
            setError('An error occurred while fetching CGPA data.');
        } finally {
            setIsLoading(false);
        }
    }, [recalculate]);

    useEffect(() => {
        fetchCgpa(false);
    }, [fetchCgpa]);

    const toggleExclude = (index) => {
        const newExcluded = new Set(excludedIds);
        if (newExcluded.has(index)) {
            newExcluded.delete(index);
        } else {
            newExcluded.add(index);
        }
        setExcludedIds(newExcluded);
        recalculate(cgpaData, newExcluded);
    };

    if (isLoading) return (
        <div className="cgpa-page-wrapper">
            <div className="cgpa-card" style={{ padding: '2rem' }}>
                <div className="cgpa-summary" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    <div className="skeleton skeleton-title" style={{ width: '200px', margin: '0' }}></div>
                    <div className="skeleton skeleton-title" style={{ width: '250px', margin: '0' }}></div>
                    <div className="skeleton skeleton-title" style={{ width: '220px', margin: '0' }}></div>
                </div>
                <div className="cgpa-content-grid" style={{ marginTop: '2rem' }}>
                    <div className="table-section">
                        <div className="skeleton skeleton-title" style={{ width: '180px' }}></div>
                        <div className="skeleton skeleton-table-row" style={{ height: '40px', borderRadius: '8px', marginBottom: '8px' }}></div>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="skeleton skeleton-table-row" style={{ height: '40px', borderRadius: '8px', marginBottom: '8px' }}></div>
                        ))}
                    </div>
                    <div className="subjects-section">
                        <div className="skeleton skeleton-title" style={{ width: '250px' }}></div>
                        <div className="skeleton skeleton-table-row" style={{ height: '40px', borderRadius: '8px', marginBottom: '8px' }}></div>
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="skeleton skeleton-table-row" style={{ height: '45px', borderRadius: '8px', marginBottom: '8px' }}></div>
                        ))}
                    </div>
                </div>
                <div className="chart-section" style={{ marginTop: '2rem' }}>
                    <div className="skeleton skeleton-title" style={{ width: '300px' }}></div>
                    <div className="skeleton skeleton-card" style={{ height: '300px', borderRadius: '16px' }}></div>
                </div>
            </div>
        </div>
    );
    if (error) return <div className="error-message">{error}</div>;
    if (!cgpaData || !displayData) {
        return <p>No CGPA data available to display.</p>;
    }

    // Performance colors from image
    const pink = '#FF5CBE';
    const cyan = '#4DD0E1';

    const chartData = {
        labels: displayData.semwise_data.map(d => `${d.sem}`),
        datasets: [
            {
                label: 'SGPA',
                data: displayData.semwise_data.map(d => d.sgpa),
                borderColor: pink,
                backgroundColor: pink,
                fill: false,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: pink,
                pointBorderWidth: 2,
            },
            {
                label: 'CGPA',
                data: displayData.semwise_data.map(d => d.cgpa),
                borderColor: cyan,
                backgroundColor: cyan,
                fill: false,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: cyan,
                pointBorderWidth: 2,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'center',
                labels: {
                    color: 'white',
                    font: { size: 14, family: 'Outfit', weight: '500' },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 25,
                }
            },
            tooltip: {
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                titleFont: { size: 14, family: 'Outfit' },
                bodyFont: { size: 13, family: 'Outfit' },
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
            }
        },
        scales: {
            x: {
                ticks: { color: '#94a3b8', font: { size: 12, family: 'Outfit' } },
                grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                title: {
                    display: false
                }
            },
            y: {
                ticks: {
                    color: '#94a3b8',
                    font: { size: 12, family: 'Outfit' },
                    padding: 10,
                },
                grid: { color: 'rgba(255,255,255,0.1)', drawBorder: false },
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Grade Points',
                    color: '#fff',
                    font: { size: 14, family: 'Outfit', weight: '600' }
                }
            }
        },
    };

    return (
        <div className="cgpa-page-wrapper">
            <Modal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                title="Course Selection Info"
            >
                <p>Please note that the option for <strong>selecting courses</strong> has been enabled to accommodate <strong>fast-track courses</strong> and <strong>open elective courses</strong>. This allows for a more accurate calculation of your CGPA based on your specific academic path.</p>
            </Modal>

            <div className="cgpa-card">
                {/* Summary Section */}
                <div className="cgpa-summary" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                        <button onClick={() => fetchCgpa(true)} title="Force fetch from eCampus" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw size={20} />
                        </button>
                    </div>
                    <h2>Total Credits: {displayData.total_credits}</h2>
                    <h2>Total Credit Points: {displayData.credit_points_total}</h2>
                    <h2 className={displayData.cgpa === "RA" ? "text-error" : ""}>
                        Overall CGPA: {displayData.cgpa}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '12px', fontStyle: 'italic', fontWeight: 'normal' }}>
                        Data may be cached for speed. Use the reload button to fetch live from eCampus.
                    </p>
                </div>

                <div className="cgpa-content-grid">
                    {/* Table Section */}
                    <div className="table-section">
                        <h3 className="section-title">Semester-wise Summary</h3>
                        <table className="cgpa-table">
                            <thead>
                                <tr>
                                    <th>SEM</th>
                                    <th>SGPA</th>
                                    <th>CGPA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayData.semwise_data.map((sem, index) => (
                                    <tr key={index}>
                                        <td data-label="SEMESTER">{sem.sem}</td>
                                        <td data-label="SGPA">{sem.sgpa}</td>
                                        <td data-label="CGPA">{sem.cgpa}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Subjects Section */}
                    <div className="subjects-section">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>Course Details (Toggle to exclude)</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: '1.4' }}>
                                *While calculating CGPA please exclude any one credit or fast track or additional open electives you may have done. Only include that while calculating final CGPA at end of college
                            </p>
                        </div>
                        <div className="subjects-scroll-area">
                            <table className="subjects-table">
                                <thead>
                                    <tr>
                                        <th>SEL</th>
                                        <th>SEM</th>
                                        <th>CODE</th>
                                        <th>COURSE NAME</th>
                                        <th>CR</th>
                                        <th>GR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cgpaData.all_subjects && cgpaData.all_subjects.map((subject, index) => (
                                        <tr key={index} className={excludedIds.has(index) ? 'excluded-row' : ''}>
                                            <td>
                                                <label className="modern-checkbox">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!excludedIds.has(index)} 
                                                        onChange={() => toggleExclude(index)}
                                                    />
                                                    <span className="checkmark"></span>
                                                </label>
                                            </td>
                                            <td>{subject.sem}</td>
                                            <td className="course-code">{subject.course}</td>
                                            <td className="course-title">{subject.title}</td>
                                            <td>{subject.credits}</td>
                                            <td className={`grade-cell ${subject.grade === 'RA' ? 'grade-ra' : ''}`}>
                                                {subject.grade}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="chart-section">
                    <h2 className="chart-title">Academic Performance Trends</h2>
                    <div className="chart-container">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Cgpa;