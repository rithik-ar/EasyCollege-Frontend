import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Search, User, Calendar, GraduationCap, BarChart3, LogOut, Loader2, AlertCircle } from 'lucide-react';
import './Admin.css';

function Admin() {
    const [adminToken, setAdminToken] = useState(sessionStorage.getItem('admin_token') || '');
    const [adminPassword, setAdminPassword] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [studentData, setStudentData] = useState(null);
    const [studentDetails, setStudentDetails] = useState({
        attendance: null,
        gpa: null,
        cgpa: null,
        internals: null
    });
    const [activeTab, setActiveTab] = useState('attendance');

    const apiUrl = import.meta.env.VITE_API_BASE_URL;

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${apiUrl}/api/admin/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword })
            });
            const data = await response.json();
            if (data.success) {
                setAdminToken(data.token);
                sessionStorage.setItem('admin_token', data.token);
            } else {
                setError(data.error || 'Invalid admin password');
            }
        } catch (err) {
            setError('Failed to connect to backend');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        const normalizedRoll = rollNumber.trim().toUpperCase();
        if (!normalizedRoll) return;

        setError('');
        setIsLoading(true);
        setStudentData(null);
        setStudentDetails({ attendance: null, gpa: null, cgpa: null });

        try {
            const response = await fetch(`${apiUrl}/api/admin/student-info/${normalizedRoll}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const data = await response.json();

            if (data.success) {
                setStudentData(data.student);
                // Now fetch the detailed data using the student_auth_token
                fetchDetailedData(data.student_auth_token);
            } else {
                setError(data.error || 'Student not found');
            }
        } catch (err) {
            setError('Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDetailedData = async (studentToken) => {
        try {
            // Fetch Attendance
            const attRes = await fetch(`${apiUrl}/api/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: studentToken })
            });
            const attData = await attRes.json();

            // Fetch GPA
            const gpaRes = await fetch(`${apiUrl}/api/gpa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: studentToken })
            });
            const gpaData = await gpaRes.json();

            // Fetch CGPA
            const cgpaRes = await fetch(`${apiUrl}/api/cgpa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: studentToken })
            });
            const cgpaData = await cgpaRes.json();

            // Fetch Internals
            const internalsRes = await fetch(`${apiUrl}/api/internals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: studentToken })
            });
            const internalsData = await internalsRes.json();

            setStudentDetails({
                attendance: Array.isArray(attData) ? attData : null,
                gpa: gpaData,
                cgpa: cgpaData,
                internals: Array.isArray(internalsData) ? internalsData : null
            });
        } catch (err) {
            console.error("Failed to fetch detailed student data", err);
        }
    };

    const handleLogout = () => {
        setAdminToken('');
        sessionStorage.removeItem('admin_token');
        setStudentData(null);
    };

    if (!adminToken) {
        return (
            <div className="admin-page-wrapper">
                <motion.div
                    className="admin-main-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="admin-header-section">
                        <h1><ShieldCheck size={40} className="text-primary" /> Admin Portal</h1>
                        <p>Enter administrative credentials to access the student dashboard</p>
                    </div>

                    <form onSubmit={handleAdminLogin} className="admin-auth-container">
                        <div className="form-group">
                            <div className="input-wrapper">
                                <ShieldCheck className="input-icon" size={20} />
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                    placeholder="Admin Password"
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Unlock Dashboard'}
                        </button>
                        {error && <p className="error-message" style={{ color: 'var(--danger)', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="admin-page-wrapper">
            <motion.div
                className="admin-main-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="admin-header-section">
                    <h1><BarChart3 size={40} className="text-primary" /> Admin Dashboard</h1>
                    <p>Search student details by roll number</p>
                </div>

                <div className="admin-search-container">
                    <form onSubmit={handleSearch}>
                        <div className="form-group">
                            <div className="input-wrapper">
                                <Search className="input-icon" size={20} />
                                <input
                                    type="text"
                                    value={rollNumber}
                                    onChange={e => setRollNumber(e.target.value.toUpperCase())}
                                    placeholder="Enter Roll Number (e.g. 23Z301)"
                                    className="input-field"
                                    style={{ textTransform: 'uppercase' }}
                                    required
                                />
                                {isLoading && <Loader2 className="input-icon" size={20} style={{ left: 'auto', right: '1rem', animation: 'spin 1s linear infinite' }} />}
                            </div>
                        </div>
                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading ? 'Searching...' : 'Search Student'}
                        </button>
                    </form>
                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="error-message" style={{ color: 'var(--danger)', marginTop: '1rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <AlertCircle size={16} /> {error}
                        </motion.div>
                    )}
                </div>

                <AnimatePresence>
                    {studentData && (
                        <motion.div
                            className="search-results-container"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="student-summary-card">
                                <div className="student-info-main">
                                    <h2>{studentData.name}</h2>
                                    <p>{studentData.roll_number} • {studentData.department_code} • Batch {studentData.batch_year}</p>
                                    <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Last Login: {new Date(studentData.last_login).toLocaleString()}</p>
                                </div>
                                <div className="admin-stat-card">
                                    <div className="admin-stat-label">Login Count</div>
                                    <div className="admin-stat-value">{studentData.login_count}</div>
                                </div>
                            </div>

                            <div className="student-details-preview">
                                <div className="data-preview-tabs">
                                    <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>Attendance</button>
                                    <button className={`tab-btn ${activeTab === 'internals' ? 'active' : ''}`} onClick={() => setActiveTab('internals')}>Internals</button>
                                    <button className={`tab-btn ${activeTab === 'gpa' ? 'active' : ''}`} onClick={() => setActiveTab('gpa')}>GPA / CGPA</button>
                                </div>

                                {activeTab === 'attendance' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        {studentDetails.attendance ? (
                                            <div className="student-stats-grid">
                                                {studentDetails.attendance.map((course, index) => {
                                                    const perc = parseInt(course.physical_attendance);
                                                    return (
                                                        <div key={index} className="admin-stat-card">
                                                            <div className="admin-stat-label">{course.course_code}</div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.course_name}</div>
                                                            <div className={`admin-stat-value ${perc < 75 ? 'text-danger' : 'text-success'}`}>{course.physical_attendance}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>{course.status}: {course.count}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                                <Loader2 className="animate-spin" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                                                <p>Fetching attendance data...</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'internals' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        {studentDetails.internals ? (
                                            <div className="student-stats-grid">
                                                {studentDetails.internals.map((course, index) => (
                                                    <div key={index} className="admin-stat-card internal-mark-card">
                                                        <div className="admin-stat-label">{course.course_code}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.course_name}</div>
                                                        <div className="admin-internal-split">
                                                            <div className="split-item">
                                                                <span className="split-label">50</span>
                                                                <span className="split-value">{course.total}</span>
                                                            </div>
                                                            <div className="split-item highlight">
                                                                <span className="split-label">{course.target_max}</span>
                                                                <span className="split-value">{course.total_converted}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                                <Loader2 className="animate-spin" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                                                <p>Fetching internals data...</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'gpa' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <div className="student-stats-grid">
                                            <div className="admin-stat-card">
                                                <div className="admin-stat-label">Current GPA</div>
                                                <div className="admin-stat-value large text-primary">{studentDetails.gpa?.gpa || '--'}</div>
                                            </div>
                                            <div className="admin-stat-card">
                                                <div className="admin-stat-label">Overall CGPA</div>
                                                <div className="admin-stat-value large text-success">{studentDetails.cgpa?.cgpa || '--'}</div>
                                            </div>
                                            <div className="admin-stat-card">
                                                <div className="admin-stat-label">Total Credits</div>
                                                <div className="admin-stat-value large">{studentDetails.cgpa?.total_credits || '--'}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button onClick={handleLogout} className="admin-logout-btn">
                    <LogOut size={16} /> Logout Admin
                </button>
            </motion.div>
        </div>
    );
}

export default Admin;
