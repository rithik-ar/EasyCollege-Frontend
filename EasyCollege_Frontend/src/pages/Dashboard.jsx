import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Calculator, MessageSquare, GraduationCap, BookOpen, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const DAY_MAP = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${m.toString().padStart(2, '0')} ${suffix}`;
};

// Parse "S SHASHWATH ( 23Z362 )" → "Shashwath"
const parseName = (raw) => {
    if (!raw) return '';
    let name = String(raw).replace(/\s*\(.*\)\s*$/, '').trim(); // strip roll number
    // Title case and remove single-letter initials
    const parts = name.split(/\s+/).filter(p => p.length > 1);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
};

function Dashboard() {
    const user = JSON.parse(localStorage.getItem('user'));
    const userName = parseName(user);

    const [classesInfo, setClassesInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const computeTodayClasses = (timetableData, attendanceData) => {
        const now = new Date();
        const dayName = DAY_MAP[now.getDay()];
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const todaySchedule = timetableData.schedule[dayName];
        if (!todaySchedule) {
            return { type: 'no_classes', message: dayName === 'SUN' || dayName === 'SAT' ? 'Enjoy your weekend!' : 'No classes scheduled today.' };
        }

        const remaining = todaySchedule.filter(p => {
            if (!p.course_code) return false;
            const [endH, endM] = p.end.split(':').map(Number);
            return endH * 60 + endM > currentTime;
        });

        if (remaining.length === 0) {
            return { type: 'done', message: 'All classes done for today!' };
        }

        // Group consecutive periods of the same course
        const blocks = [];
        let currentBlock = null;
        for (const period of remaining) {
            if (currentBlock && currentBlock.courseCode === period.course_code) {
                currentBlock.periods.push(period);
                currentBlock.endTime = period.end;
            } else {
                currentBlock = {
                    courseCode: period.course_code,
                    courseName: timetableData.courses[period.course_code] || period.course_code,
                    startTime: period.start,
                    endTime: period.end,
                    periods: [period]
                };
                blocks.push(currentBlock);
            }
        }

        const enrichedBlocks = blocks.map((block, idx) => {
            let canBunk = null;
            let bunkCount = 0;
            let attendStatus = null;

            if (attendanceData && Array.isArray(attendanceData)) {
                const match = attendanceData.find(a => a.course_code === block.courseCode);
                if (match) {
                    attendStatus = match.status;
                    bunkCount = match.count;
                    canBunk = match.status === 'Remaining bunks' ? bunkCount > 0 : false;
                }
            }

            const [sH, sM] = block.startTime.split(':').map(Number);
            const isInProgress = idx === 0 && currentTime >= sH * 60 + sM;

            return {
                ...block,
                canBunk,
                bunkCount,
                attendStatus,
                isInProgress,
                periodsCount: block.periods.length
            };
        });

        return { type: 'classes', blocks: enrichedBlocks };
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            const authToken = localStorage.getItem('auth_token');
            if (!authToken) { setLoading(false); return; }
            const SERVER_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
            try {
                const [timetableRes, attendanceRes] = await Promise.all([
                    fetch(`${SERVER_URL}/api/timetable`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ auth_token: authToken })
                    }),
                    fetch(`${SERVER_URL}/api/attendance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ auth_token: authToken })
                    })
                ]);
                const timetableData = await timetableRes.json();
                const attendanceData = attendanceRes.ok ? await attendanceRes.json() : null;
                if (timetableRes.ok && timetableData.schedule) {
                    setClassesInfo(computeTodayClasses(timetableData, attendanceData));
                }
            } catch (err) {
                console.error('Dashboard info error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    const renderScheduleWidget = () => {
        if (loading) {
            return (
                <motion.div className="schedule-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="schedule-card-header">
                        <Loader2 size={16} className="bunk-spinner" />
                        <span>Checking your schedule...</span>
                    </div>
                </motion.div>
            );
        }

        if (!classesInfo) return null;

        if (classesInfo.type === 'no_classes' || classesInfo.type === 'done') {
            return (
                <motion.div className="schedule-card schedule-free" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="schedule-card-header">
                        <CheckCircle size={16} />
                        <span>{classesInfo.message}</span>
                    </div>
                </motion.div>
            );
        }

        return (
            <motion.div className="schedule-card" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="schedule-card-header">
                    <Clock size={14} />
                    <span>Today's Schedule</span>
                    <span className="schedule-count">{classesInfo.blocks.length} class{classesInfo.blocks.length !== 1 ? 'es' : ''} left</span>
                </div>
                <div className="schedule-rows">
                    {classesInfo.blocks.map((block, idx) => (
                        <div
                            key={`${block.courseCode}-${idx}`}
                            className={`schedule-row ${block.isInProgress ? 'schedule-row-active' : ''}`}
                        >
                            <div className="schedule-row-indicator">
                                <div className={`schedule-dot ${block.isInProgress ? 'dot-active' : ''}`} />
                                {idx < classesInfo.blocks.length - 1 && <div className="schedule-line" />}
                            </div>
                            <div className="schedule-row-content">
                                <div className="schedule-row-top">
                                    <span className="schedule-row-name">{block.courseName}</span>
                                    <span className={`schedule-bunk-badge ${block.canBunk === true ? 'badge-safe' : block.canBunk === false ? 'badge-danger' : 'badge-neutral'}`}>
                                        {block.canBunk === true && (
                                            <><CheckCircle size={12} /> {block.bunkCount} bunk{block.bunkCount !== 1 ? 's' : ''}</>
                                        )}
                                        {block.canBunk === false && block.attendStatus === 'Remaining bunks' && (
                                            <><AlertTriangle size={12} /> No bunks</>
                                        )}
                                        {block.canBunk === false && block.attendStatus === 'Classes to attend' && (
                                            <><AlertTriangle size={12} /> Need {block.bunkCount}</>
                                        )}
                                        {block.canBunk === null && '—'}
                                    </span>
                                </div>
                                <div className="schedule-row-time">
                                    {formatTime(block.startTime)} — {formatTime(block.endTime)}
                                    {block.periodsCount > 1 && <span className="schedule-row-periods"> · {block.periodsCount} periods</span>}
                                    {block.isInProgress && <span className="schedule-row-live">NOW</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="dashboard-container">
            <motion.div
                className="dashboard-greeting"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <h1>{getGreeting()}, {userName}</h1>
                <p>What would you like to do today?</p>
            </motion.div>

            {renderScheduleWidget()}

            <motion.div
                className="dashboard-options"
                variants={container}
                initial="hidden"
                animate="show"
            >
                <motion.div variants={item}>
                    <Link to="/attendance" className="dashboard-card">
                        <div className="dashboard-icon-wrapper">
                            <BarChart3 size={32} strokeWidth={1.5} />
                        </div>
                        <div className="dashboard-title">Attendance</div>
                        <div className="dashboard-description">Track your class attendance and stay on top of daily requirements.</div>
                    </Link>
                </motion.div>

                <motion.div variants={item}>
                    <Link to="/gpa" className="dashboard-card">
                        <div className="dashboard-icon-wrapper">
                            <Calculator size={32} strokeWidth={1.5} />
                        </div>
                        <div className="dashboard-title">GPA Calculator</div>
                        <div className="dashboard-description">Calculate your semester GPA with ease and precision.</div>
                    </Link>
                </motion.div>

                <motion.div variants={item}>
                    <Link to="/cgpa" className="dashboard-card">
                        <div className="dashboard-icon-wrapper">
                            <GraduationCap size={32} strokeWidth={1.5} />
                        </div>
                        <div className="dashboard-title">CGPA Calculator</div>
                        <div className="dashboard-description">Monitor your cumulative grade point average across all semesters.</div>
                    </Link>
                </motion.div>

                <motion.div variants={item}>
                    <Link to="/internals" className="dashboard-card">
                        <div className="dashboard-icon-wrapper">
                            <BookOpen size={32} strokeWidth={1.5} />
                        </div>
                        <div className="dashboard-title">Internal Marks</div>
                        <div className="dashboard-description">View your CA marks and track your internal assessment performance.</div>
                    </Link>
                </motion.div>

                <motion.div variants={item}>
                    <Link to="/feedback" className="dashboard-card">
                        <div className="dashboard-icon-wrapper">
                            <MessageSquare size={32} strokeWidth={1.5} />
                        </div>
                        <div className="dashboard-title">Feedback</div>
                        <div className="dashboard-description">Automate the feedback form process done in our college.</div>
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}

export default Dashboard;